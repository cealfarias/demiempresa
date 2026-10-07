import { Server } from 'socket.io';
import {
  updateDriverLocation,
  findNearbyDrivers,
  setOfferWithTTL,
  atomicAcceptTrip,
  initTripLock,
  releaseDriverLock
} from './redis.js';
import { pool } from './db.js';
import { ReferralService } from './services/referralService.js';

export function initializeWebSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingInterval: 25000,
    pingTimeout: 30000
  });

  const connectedUsers = new Map();
  const driverSockets = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    socket.on('client:register', ({ userId, role, driverProfileId }) => {
      socket.userId = userId;
      socket.role = role;
      socket.driverProfileId = driverProfileId;

      connectedUsers.set(userId, socket.id);
      if (role === 'DRIVER') {
        if (driverProfileId) {
          driverSockets.set(driverProfileId, socket.id);
          socket.join(`driver:${driverProfileId}`);
        }
        socket.join('drivers_channel');
        console.log(`🚖 Conductor suscrito al canal de despacho: ${socket.id}`);
      } else {
        socket.join(`passenger:${userId}`);
        socket.join('passengers_channel');
      }
    });

    /**
     * 1. Foreground Service Conductor: GPS cada 3-5s
     */
    socket.on('driver:location_update', async ({ driverProfileId, lng, lat }) => {
      try {
        if (!driverProfileId || !lng || !lat) return;
        await updateDriverLocation(driverProfileId, lng, lat);
        if (socket.currentTripId) {
          io.to(`trip:${socket.currentTripId}`).emit('trip:driver_location', {
            driverProfileId,
            lng,
            lat
          });
        }
      } catch (err) {
        console.error('Error en location_update:', err.message);
      }
    });

    /**
     * 2. Solicitud de Viaje o Encomienda (Despacho a Conductores)
     */
    socket.on('trip:request', async (tripData, callback) => {
      try {
        const {
          passengerId,
          serviceType = 'PASSENGER',
          originAddress = '',
          originLat,
          originLng,
          destinationAddress = '',
          destinationLat,
          destinationLng,
          destinationMunicipality = 'San Salvador',
          proposedFare,
          packageDetails,
          paymentTiming
        } = tripData;

        const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

        // Si el pasajero aún no ha iniciado sesión o es invitado, asignar UUID de invitado
        let effectivePassengerId = passengerId;
        if (!effectivePassengerId || !isUUID(effectivePassengerId)) {
          let guestRes = await pool.query(
            "SELECT id FROM viajes_users WHERE full_name = 'Pasajero Invitado' OR phone = '0000-0000' LIMIT 1"
          );
          if (guestRes.rows.length === 0) {
            guestRes = await pool.query(
              "INSERT INTO viajes_users (full_name, phone, role) VALUES ('Pasajero Invitado', '0000-0000', 'PASSENGER') RETURNING id"
            );
          }
          effectivePassengerId = guestRes.rows[0].id;
        }

        let creditApplied = 0.00;
        if (isUUID(passengerId)) {
          try {
            const credit = await ReferralService.getAvailableCredit(passengerId);
            creditApplied = credit ? 1.00 : 0.00;
          } catch {
            creditApplied = 0.00;
          }
        }

        const safeOriginLat = parseFloat(originLat) || 13.7013;
        const safeOriginLng = parseFloat(originLng) || -89.2244;
        const safeDestLat = parseFloat(destinationLat) || 13.6738;
        const safeDestLng = parseFloat(destinationLng) || -89.2789;
        const safeFare = (parseFloat(proposedFare) || 3.50).toFixed(2);
        const finalOrigin = (originAddress || tripData.origin || 'Ubicación de partida').trim();
        const finalDest = (destinationAddress || tripData.destination || 'Punto de destino').trim();

        const insertRes = await pool.query(`
          INSERT INTO viajes_trips (
            service_type, passenger_id, origin_address, origin_lat, origin_lng,
            destination_address, destination_lat, destination_lng, destination_municipality,
            proposed_fare, credit_applied, package_details, payment_timing, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'REQUESTED')
          RETURNING *;
        `, [
          serviceType, effectivePassengerId, finalOrigin, safeOriginLat, safeOriginLng,
          finalDest, safeDestLat, safeDestLng, destinationMunicipality,
          safeFare, creditApplied, packageDetails || null, paymentTiming || 'AT_ORIGIN'
        ]);

        const newTrip = insertRes.rows[0];
        socket.join(`trip:${newTrip.id}`);
        await initTripLock(newTrip.id);

        const tripPayload = {
          tripId: newTrip.id,
          serviceType: newTrip.service_type,
          transportType: tripData.transportType || 'CAR',
          isRoundTrip: Boolean(tripData.isRoundTrip),
          roundTripWaitMinutes: parseInt(tripData.roundTripWaitMinutes) || 0,
          origin: newTrip.origin_address,
          originAddress: newTrip.origin_address,
          originLat: newTrip.origin_lat,
          originLng: newTrip.origin_lng,
          originLatObfuscated: Number(parseFloat(safeOriginLat).toFixed(2)),
          originLngObfuscated: Number(parseFloat(safeOriginLng).toFixed(2)),
          destination: newTrip.destination_address,
          destinationAddress: newTrip.destination_address,
          destinationLat: newTrip.destination_lat,
          destinationLng: newTrip.destination_lng,
          destinationMunicipality: newTrip.destination_municipality,
          offeredFare: newTrip.proposed_fare,
          proposedFare: newTrip.proposed_fare,
          suggestedFare: tripData.suggestedFare || newTrip.proposed_fare,
          distanceKm: 0.5,
          roadDistanceKm: tripData.distanceKm || 5.0,
          delayMinutes: tripData.delayMinutes || 0,
          trafficLevel: tripData.trafficLevel || 'FLUID',
          trafficLabel: tripData.trafficLabel || 'Tráfico Fluido',
          trafficColor: tripData.trafficColor || '#10B981',
          preferences: tripData.preferences || {},
          cashBill: tripData.cashBill || '10',
          changeNeeded: tripData.changeNeeded || '0.00',
          hasBonusDiscount: creditApplied > 0,
          timeLeft: 20,
          passengerName: (tripData.passengerName || 'Pasajero Invitado').trim(),
          passengerPhoto: tripData.passengerPhoto || null,
          passengerRating: tripData.passengerRating || 5.0,
          passengerTrips: tripData.passengerTrips || 1,
          isGuest: Boolean(tripData.isGuest),
          passengerPhone: tripData.passengerPhone || '',
          packageDetails: newTrip.package_details
        };

        // 1. Emitir a todos los conductores en la sala 'drivers_channel'
        io.to('drivers_channel').emit('trip:new_request', tripPayload);

        // 2. Emitir directamente a cada conductor registrado en el mapa de sockets
        for (const [drvId, targetSocketId] of driverSockets.entries()) {
          io.to(targetSocketId).emit('trip:new_request', tripPayload);
        }

        console.log(`📡 [trip:request] Solicitud #${newTrip.id} enviada exitosamente a conductores.`);

        if (callback) callback({ success: true, trip: newTrip, creditApplied });
      } catch (err) {
        console.error('Error en trip:request:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 3. Oferta del Conductor con Vigencia de 30 Segundos para el Pasajero
     */
    socket.on('driver:offer', async ({ tripId, driverProfileId, proposedFare }) => {
      try {
        await setOfferWithTTL(tripId, driverProfileId, proposedFare, 30);

        const driverInfoRes = await pool.query(`
          SELECT dp.*, u.full_name, u.phone
          FROM viajes_driver_profiles dp
          JOIN viajes_users u ON dp.user_id = u.id
          WHERE dp.id::text = $1 OR dp.vehicle_plate = $1;
        `, [driverProfileId]);

        let driverInfo = driverInfoRes.rows[0];
        if (!driverInfo) {
          const fallbackRes = await pool.query(`
            SELECT dp.*, u.full_name, u.phone
            FROM viajes_driver_profiles dp
            JOIN viajes_users u ON dp.user_id = u.id
            ORDER BY dp.created_at ASC
            LIMIT 1;
          `);
          driverInfo = fallbackRes.rows[0];
        }

        await pool.query(`
          INSERT INTO viajes_trip_offers (trip_id, driver_id, proposed_fare, status, expires_at)
          VALUES ($1, $2, $3, 'PENDING', CURRENT_TIMESTAMP + INTERVAL '30 seconds')
          ON CONFLICT (trip_id, driver_id, created_at) DO NOTHING;
        `, [tripId, driverInfo?.id || driverProfileId, proposedFare]).catch(() => {});

        const vBrand = driverInfo?.vehicle_brand || '';
        const vModel = driverInfo?.vehicle_model || '';
        const fullModel = (vBrand || vModel) ? `${vBrand} ${vModel}`.trim() : 'Vehículo Autorizado';

        io.to(`trip:${tripId}`).emit('passenger:offer_received', {
          tripId,
          driverProfileId,
          driverName: driverInfo?.full_name || 'Conductor Autorizado',
          driverPhone: driverInfo?.phone || '',
          vehiclePlate: driverInfo?.vehicle_plate || '',
          vehicleModel: fullModel,
          vehicleColor: driverInfo?.vehicle_color || '',
          photoUrl: driverInfo?.photo_url || null,
          proposedFare,
          expiresInSeconds: 30
        });
      } catch (err) {
        console.error('Error en driver:offer:', err);
      }
    });

    /**
     * 3.1 Conductor Acepta Directamente la Solicitud (Match Inmediato Atómico)
     */
    socket.on('driver:accept_trip', async ({ tripId, driverProfileId, agreedFare }, callback) => {
      try {
        const lockResult = await atomicAcceptTrip(tripId, driverProfileId);
        if (!lockResult.success) {
          if (callback) callback({ success: false, reason: lockResult.reason });
          return;
        }

        const driverRes = await pool.query(`
          SELECT dp.*, u.full_name, u.phone
          FROM viajes_driver_profiles dp
          JOIN viajes_users u ON dp.user_id = u.id
          WHERE dp.id::text = $1 OR dp.vehicle_plate = $1;
        `, [driverProfileId]);

        let driver = driverRes.rows[0];
        if (!driver) {
          const fallbackRes = await pool.query(`
            SELECT dp.*, u.full_name, u.phone
            FROM viajes_driver_profiles dp
            JOIN viajes_users u ON dp.user_id = u.id
            ORDER BY dp.created_at ASC
            LIMIT 1;
          `);
          driver = fallbackRes.rows[0];
        }

        const actualDriverId = driver?.id;
        const tripRes = await pool.query('SELECT * FROM viajes_trips WHERE id::text = $1', [tripId]);
        const trip = tripRes.rows[0];
        const effectiveFare = parseFloat(agreedFare || trip?.proposed_fare || 4.00);
        const creditApplied = parseFloat(trip?.credit_applied || 0.00);
        const cashToCollect = Math.max(0.00, effectiveFare - creditApplied);

        await pool.query(`
          UPDATE viajes_trips
          SET driver_id = $1,
              agreed_fare = $2,
              cash_to_collect = $3,
              status = 'ACCEPTED',
              accepted_at = CURRENT_TIMESTAMP
          WHERE id::text = $4;
        `, [actualDriverId, effectiveFare.toFixed(2), cashToCollect.toFixed(2), tripId]);

        if (creditApplied > 0 && trip?.passenger_id) {
          const credit = await ReferralService.getAvailableCredit(trip.passenger_id);
          if (credit && actualDriverId) {
            await ReferralService.redeemCredit(credit.id, tripId, actualDriverId);
          }
        }

        const passengerRes = await pool.query('SELECT * FROM viajes_users WHERE id::text = $1', [trip?.passenger_id]);
        const passenger = passengerRes.rows[0] || { full_name: 'Pasajero', phone: '' };

        const driverSocketId = driverSockets.get(driverProfileId) || (actualDriverId ? driverSockets.get(actualDriverId.toString()) : null);
        if (driverSocketId) {
          const socketDriver = io.sockets.sockets.get(driverSocketId);
          if (socketDriver) socketDriver.currentTripId = tripId;

          const cleanPassPhone = passenger.phone ? String(passenger.phone).replace(/\D/g, '') : '';
          const waMsg = encodeURIComponent('Hola, soy tu conductor de Rumbo, voy en camino a recogerte.');
          const whatsappLink = cleanPassPhone ? `https://wa.me/503${cleanPassPhone}?text=${waMsg}` : '';

          io.to(driverSocketId).emit('trip:assigned', {
            tripId,
            agreedFare: effectiveFare.toFixed(2),
            cashToCollect: cashToCollect.toFixed(2),
            creditApplied: creditApplied.toFixed(2),
            originAddress: trip?.origin_address || 'Ubicación de partida',
            originLat: trip?.origin_lat || 13.7013,
            originLng: trip?.origin_lng || -89.2244,
            destinationAddress: trip?.destination_address || 'Punto de destino',
            destinationLat: trip?.destination_lat || 13.6738,
            destinationLng: trip?.destination_lng || -89.2789,
            destinationMunicipality: trip?.destination_municipality || 'San Salvador',
            passengerName: passenger.full_name || 'Pasajero',
            passengerPhone: passenger.phone ? String(passenger.phone) : '',
            whatsappLink,
            roadDistanceKm: parseFloat(trip?.distance_km || 5.0),
            suggestedFare: trip?.proposed_fare || effectiveFare.toFixed(2),
            preferences: trip?.package_details?.preferences || {},
            cashBill: trip?.payment_timing === 'EXACT' ? 'EXACT' : '10',
            changeNeeded: '0.00',
            wazeUrl: `https://waze.com/ul?ll=${trip?.origin_lat || 13.7013},${trip?.origin_lng || -89.2244}&navigate=yes`,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${trip?.origin_lat || 13.7013},${trip?.origin_lng || -89.2244}`
          });
        }

        io.to(`trip:${tripId}`).emit('trip:confirmed', {
          tripId,
          agreedFare: effectiveFare.toFixed(2),
          cashToCollect: cashToCollect.toFixed(2),
          driverName: driver?.full_name || 'Conductor Autorizado',
          vehiclePlate: driver?.vehicle_plate || '',
          vehicleBrand: driver?.vehicle_brand || '',
          vehicleModel: driver?.vehicle_model || '',
          vehicleColor: driver?.vehicle_color || '',
          photoUrl: driver?.photo_url || null,
          driverPhone: driver?.phone ? String(driver?.phone) : '',
          destinationMunicipality: trip?.destination_municipality || 'San Salvador'
        });

        socket.to(`trip:${tripId}`).emit('offer:rejected_other_won', { tripId });
        io.to('drivers_channel').emit('offer:rejected_other_won', { tripId });

        if (callback) callback({ success: true, tripId });
      } catch (err) {
        console.error('Error en driver:accept_trip:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 4. Asignación Atómica
     */
    socket.on('passenger:accept_offer', async ({ tripId, driverProfileId, agreedFare }, callback) => {
      try {
        const lockResult = await atomicAcceptTrip(tripId, driverProfileId);
        if (!lockResult.success) {
          if (callback) callback({ success: false, reason: lockResult.reason });
          return;
        }

        const driverRes = await pool.query(`
          SELECT dp.*, u.full_name, u.phone
          FROM viajes_driver_profiles dp
          JOIN viajes_users u ON dp.user_id = u.id
          WHERE dp.id::text = $1 OR dp.vehicle_plate = $1;
        `, [driverProfileId]);

        let driver = driverRes.rows[0];
        if (!driver) {
          const fallbackRes = await pool.query(`
            SELECT dp.*, u.full_name, u.phone
            FROM viajes_driver_profiles dp
            JOIN viajes_users u ON dp.user_id = u.id
            ORDER BY dp.created_at ASC
            LIMIT 1;
          `);
          driver = fallbackRes.rows[0];
        }

        const actualDriverId = driver?.id;

        const tripRes = await pool.query('SELECT * FROM viajes_trips WHERE id::text = $1', [tripId]);
        const trip = tripRes.rows[0];
        const creditApplied = parseFloat(trip?.credit_applied || 0.00);
        const cashToCollect = Math.max(0.00, parseFloat(agreedFare) - creditApplied);

        await pool.query(`
          UPDATE viajes_trips
          SET driver_id = $1,
              agreed_fare = $2,
              cash_to_collect = $3,
              status = 'ACCEPTED',
              accepted_at = CURRENT_TIMESTAMP
          WHERE id::text = $4;
        `, [actualDriverId, agreedFare, cashToCollect, tripId]);

        if (creditApplied > 0 && trip?.passenger_id) {
          const credit = await ReferralService.getAvailableCredit(trip.passenger_id);
          if (credit && actualDriverId) {
            await ReferralService.redeemCredit(credit.id, tripId, actualDriverId);
          }
        }

        const passengerRes = await pool.query('SELECT * FROM viajes_users WHERE id::text = $1', [trip?.passenger_id]);
        const passenger = passengerRes.rows[0] || { full_name: 'Pasajero', phone: '' };

        const driverSocketId = driverSockets.get(driverProfileId) || (actualDriverId ? driverSockets.get(actualDriverId.toString()) : null);
        if (driverSocketId) {
          const socketDriver = io.sockets.sockets.get(driverSocketId);
          if (socketDriver) socketDriver.currentTripId = tripId;

          const cleanPassPhone = passenger.phone ? String(passenger.phone).replace(/\D/g, '') : '';
          const waMsg = encodeURIComponent('Hola, soy tu conductor de Rumbo, voy en camino a recogerte.');
          const whatsappLink = cleanPassPhone ? `https://wa.me/503${cleanPassPhone}?text=${waMsg}` : '';

          io.to(driverSocketId).emit('trip:assigned', {
            tripId,
            agreedFare,
            cashToCollect: cashToCollect.toFixed(2),
            creditApplied: creditApplied.toFixed(2),
            originAddress: trip?.origin_address || 'Ubicación de partida',
            originLat: trip?.origin_lat || 13.7013,
            originLng: trip?.origin_lng || -89.2244,
            destinationAddress: trip?.destination_address || 'Punto de destino',
            destinationLat: trip?.destination_lat || 13.6738,
            destinationLng: trip?.destination_lng || -89.2789,
            destinationMunicipality: trip?.destination_municipality || 'San Salvador',
            passengerName: passenger.full_name || 'Pasajero',
            passengerPhone: passenger.phone ? String(passenger.phone) : '',
            whatsappLink,
            roadDistanceKm: parseFloat(trip?.distance_km || 5.0),
            suggestedFare: trip?.proposed_fare || agreedFare,
            preferences: trip?.package_details?.preferences || {},
            cashBill: trip?.payment_timing === 'EXACT' ? 'EXACT' : '10',
            changeNeeded: '0.00',
            wazeUrl: `https://waze.com/ul?ll=${trip?.origin_lat || 13.7013},${trip?.origin_lng || -89.2244}&navigate=yes`,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${trip?.origin_lat || 13.7013},${trip?.origin_lng || -89.2244}`
          });
        }

        io.to(`trip:${tripId}`).emit('trip:confirmed', {
          tripId,
          agreedFare,
          cashToCollect: cashToCollect.toFixed(2),
          driverName: driver.full_name,
          vehiclePlate: driver.vehicle_plate,
          vehicleBrand: driver.vehicle_brand,
          vehicleModel: driver.vehicle_model,
          vehicleColor: driver.vehicle_color,
          photoUrl: driver.photo_url,
          driverPhone: driver.phone ? String(driver.phone) : '',
          destinationMunicipality: trip.destination_municipality
        });

        socket.to(`trip:${tripId}`).emit('offer:rejected_other_won', { tripId });
        io.to('drivers_channel').emit('offer:rejected_other_won', { tripId });

        if (callback) callback({ success: true, tripId });
      } catch (err) {
        console.error('Error en passenger:accept_offer:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 4.1 Cancelación de Viaje (Solo permitido en fase de Búsqueda sin Conductor Asignado)
     */
    socket.on('trip:cancel', async ({ tripId }, callback) => {
      try {
        if (!tripId) {
          if (callback) callback({ success: false, error: 'tripId requerido' });
          return;
        }

        const tripRes = await pool.query(
          "SELECT id, status, driver_id FROM viajes_trips WHERE id::text = $1",
          [tripId]
        );
        const trip = tripRes.rows[0];

        // Regla Implacable: Si ya hay un conductor asignado o el viaje está en ejecución, NO se puede cancelar unilateralmente
        if (trip && trip.driver_id && trip.status !== 'REQUESTED' && trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED') {
          console.warn(`⚠️ [trip:cancel] Intento de cancelación unilateral en carrera activa #${tripId}. Denegado.`);
          if (callback) {
            callback({
              success: false,
              inProgress: true,
              error: 'Una carrera en ejecución no puede cancelarse unilateralmente. Debe solicitar cancelación por mutuo acuerdo.'
            });
          }
          return;
        }

        // Si aún está en subasta/búsqueda (REQUESTED) sin chofer asignado, se cancela la búsqueda
        await pool.query("UPDATE viajes_trips SET status = 'CANCELLED' WHERE id::text = $1", [tripId]).catch(() => {});
        io.to(`trip:${tripId}`).emit('trip:canceled', { tripId });
        io.to('drivers_channel').emit('trip:canceled', { tripId });
        console.log(`🛑 [trip:cancel] Solicitud de búsqueda #${tripId} cancelada limpiamente antes de asignar chofer.`);
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error en trip:cancel:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 4.1.1 Solicitud de Cancelación por Mutuo Acuerdo (Para Carreras en Ejecución)
     */
    socket.on('trip:request_mutual_cancel', async ({ tripId, requestedBy, reason }, callback) => {
      try {
        if (!tripId) {
          if (callback) callback({ success: false, error: 'tripId requerido' });
          return;
        }

        const tripRes = await pool.query(
          "SELECT id, status, driver_id FROM viajes_trips WHERE id::text = $1",
          [tripId]
        );
        const trip = tripRes.rows[0];
        if (!trip || trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
          if (callback) callback({ success: false, error: 'El viaje ya no está activo' });
          return;
        }

        console.log(`🤝 [trip:request_mutual_cancel] Solicitud de mutuo acuerdo para viaje #${tripId} por ${requestedBy}: ${reason}`);

        // Notificar a la contraparte en la sala del viaje
        socket.to(`trip:${tripId}`).emit('trip:cancel_requested_by_peer', {
          tripId,
          requestedBy, // 'PASSENGER' | 'DRIVER'
          reason: reason || 'Motivo de fuerza mayor'
        });

        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error en trip:request_mutual_cancel:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 4.1.2 Respuesta a la Solicitud de Cancelación por Mutuo Acuerdo
     */
    socket.on('trip:respond_mutual_cancel', async ({ tripId, accepted, respondedBy }, callback) => {
      try {
        if (!tripId) {
          if (callback) callback({ success: false, error: 'tripId requerido' });
          return;
        }

        const tripRes = await pool.query(
          "SELECT id, status, driver_id FROM viajes_trips WHERE id::text = $1",
          [tripId]
        );
        const trip = tripRes.rows[0];
        if (!trip) {
          if (callback) callback({ success: false, error: 'Viaje no encontrado' });
          return;
        }

        if (accepted) {
          // Ambas partes acordaron cancelar
          await pool.query("UPDATE viajes_trips SET status = 'CANCELLED' WHERE id::text = $1", [tripId]);
          if (trip.driver_id) {
            await releaseDriverLock(trip.driver_id, tripId);
          }
          io.to(`trip:${tripId}`).emit('trip:mutual_cancellation_confirmed', {
            tripId,
            message: 'La carrera fue cancelada de mutuo acuerdo por ambas partes.'
          });
          io.to('drivers_channel').emit('trip:canceled', { tripId });
          console.log(`✅ [trip:respond_mutual_cancel] Carrera #${tripId} CANCELADA de mutuo acuerdo.`);
        } else {
          // La contraparte rechazó cancelar, la carrera continúa
          io.to(`trip:${tripId}`).emit('trip:mutual_cancellation_declined', {
            tripId,
            respondedBy,
            message: 'La solicitud de cancelación fue rechazada. La carrera continúa hasta su destino.'
          });
          console.log(`❌ [trip:respond_mutual_cancel] Solicitud de cancelación en viaje #${tripId} RECHAZADA por ${respondedBy}.`);
        }

        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error en trip:respond_mutual_cancel:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 4.2 Reconexión Resiliente de Pasajero o Conductor (Previene pérdida de viaje por F5 o recarga)
     */
    socket.on('trip:reconnect', async ({ tripId, role, driverProfileId }, callback) => {
      try {
        if (!tripId) {
          if (callback) callback({ success: false, error: 'tripId requerido' });
          return;
        }

        // Unir este socket reconectado a la sala del viaje
        socket.join(`trip:${tripId}`);
        socket.currentTripId = tripId;

        // Consultar estado real del viaje en la base de datos
        const tripRes = await pool.query(`
          SELECT t.*, 
                 dp.vehicle_plate, dp.vehicle_brand, dp.vehicle_model, dp.vehicle_color, dp.photo_url as driver_photo,
                 du.full_name as driver_name, du.phone as driver_phone,
                 pu.full_name as passenger_name, pu.phone as passenger_phone
          FROM viajes_trips t
          LEFT JOIN viajes_driver_profiles dp ON t.driver_id = dp.id
          LEFT JOIN viajes_users du ON dp.user_id = du.id
          LEFT JOIN viajes_users pu ON t.passenger_id = pu.id
          WHERE t.id::text = $1
        `, [tripId]);

        const trip = tripRes.rows[0];
        if (!trip) {
          if (callback) callback({ success: false, error: 'Viaje no encontrado' });
          return;
        }

        // Si el viaje ya finalizó o fue cancelado
        if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
          if (callback) callback({ success: true, isFinished: true, status: trip.status });
          return;
        }

        const vBrand = trip.vehicle_brand || '';
        const vModel = trip.vehicle_model || '';
        const fullVehicleModel = (vBrand || vModel) ? `${vBrand} ${vModel}`.trim() : 'Vehículo Rumbo';

        if (callback) {
          callback({
            success: true,
            isFinished: false,
            trip: {
              id: trip.id,
              status: trip.status,
              originAddress: trip.origin_address,
              originLat: trip.origin_lat,
              originLng: trip.origin_lng,
              destinationAddress: trip.destination_address,
              destinationLat: trip.destination_lat,
              destinationLng: trip.destination_lng,
              destinationMunicipality: trip.destination_municipality,
              proposedFare: trip.proposed_fare,
              agreedFare: trip.agreed_fare || trip.proposed_fare,
              cashToCollect: trip.cash_to_collect || trip.agreed_fare || trip.proposed_fare,
              creditApplied: trip.credit_applied || '0.00',
              driver: trip.driver_id ? {
                id: trip.driver_id,
                name: trip.driver_name || 'Conductor Autorizado',
                phone: trip.driver_phone || '',
                vehiclePlate: trip.vehicle_plate || '',
                vehicleModel: fullVehicleModel,
                vehicleColor: trip.vehicle_color || '',
                photo: trip.driver_photo || null
              } : null,
              passenger: {
                name: trip.passenger_name || 'Pasajero',
                phone: trip.passenger_phone || ''
              }
            }
          });
        }
      } catch (err) {
        console.error('Error en trip:reconnect:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 5. Actualización de Estados Operativos
     */
    socket.on('trip:update_status', async ({ tripId, newStatus, driverProfileId }, callback) => {
      try {
        const updateRes = await pool.query(`
          UPDATE viajes_trips
          SET status = $1,
              completed_at = CASE WHEN $1 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id = $2 AND driver_id = $3
          RETURNING *;
        `, [newStatus, tripId, driverProfileId]);

        const updatedTrip = updateRes.rows[0];

        if (newStatus === 'COMPLETED' && updatedTrip) {
          await ReferralService.processTripCompletionForReferral(
            tripId,
            updatedTrip.passenger_id,
            updatedTrip.agreed_fare
          );
          await releaseDriverLock(driverProfileId, tripId);
        }

        io.to(`trip:${tripId}`).emit('trip:status_changed', {
          tripId,
          status: newStatus
        });

        if (callback) callback({ success: true, trip: updatedTrip });
      } catch (err) {
        console.error('Error en trip:update_status:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) connectedUsers.delete(socket.userId);
      if (socket.driverProfileId) driverSockets.delete(socket.driverProfileId);
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}
