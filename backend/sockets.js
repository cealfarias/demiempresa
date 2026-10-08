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
import { PushService } from './services/pushService.js';

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
    socket.on('driver:location_update', async ({ tripId, driverProfileId, lng, lat }) => {
      try {
        if (!driverProfileId || !lng || !lat) return;
        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);
        if (isNaN(numLat) || isNaN(numLng)) return;

        await updateDriverLocation(driverProfileId, numLng, numLat);

        const targetTripId = tripId || socket.currentTripId;
        if (targetTripId) {
          socket.currentTripId = targetTripId;

          // Recuperar datos de viaje para calcular distancia precisa y ETA
          let tripInfo = null;
          try {
            const tripRes = await pool.query(
              'SELECT id, passenger_id, origin_lat, origin_lng, destination_lat, destination_lng, status FROM viajes_trips WHERE id::text = $1',
              [targetTripId]
            );
            tripInfo = tripRes.rows[0];
          } catch (e) {
            // Silencioso si falla la consulta
          }

          let distanceKm = null;
          let etaMinutes = 3;

          if (tripInfo) {
            const isEnRoute = tripInfo.status === 'ACCEPTED' || tripInfo.status === 'DRIVER_EN_ROUTE';
            const targetLat = isEnRoute ? parseFloat(tripInfo.origin_lat) : parseFloat(tripInfo.destination_lat);
            const targetLng = isEnRoute ? parseFloat(tripInfo.origin_lng) : parseFloat(tripInfo.destination_lng);

            if (!isNaN(targetLat) && !isNaN(targetLng)) {
              // Cálculo Haversine de distancia geodésica
              const R = 6371;
              const dLat = (targetLat - numLat) * Math.PI / 180;
              const dLon = (targetLng - numLng) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(numLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const straightDist = R * c;
              distanceKm = +(straightDist * 1.35).toFixed(1); // Factor de ruta urbana real
              etaMinutes = Math.max(1, Math.round((distanceKm / 26) * 60)); // 26 km/h promedio urbano
            }
          }

          const locationPayload = {
            tripId: targetTripId,
            driverProfileId,
            lat: numLat,
            lng: numLng,
            distanceKm,
            etaMinutes,
            status: tripInfo?.status || 'DRIVER_EN_ROUTE'
          };

          io.to(`trip:${targetTripId}`).emit('trip:driver_location', locationPayload);
          if (tripInfo?.passenger_id) {
            io.to(`passenger:${tripInfo.passenger_id}`).emit('trip:driver_location', locationPayload);
          }
          io.to('passengers_channel').emit('trip:driver_location', locationPayload);
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
        if (tripData.creditApplied !== undefined && parseFloat(tripData.creditApplied) > 0) {
          creditApplied = parseFloat(tripData.creditApplied);
        } else if (tripData.hasBonusDiscount) {
          creditApplied = 1.00;
        } else if (isUUID(passengerId)) {
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

        // 3. Notificación Push Web en segundo plano a conductores registrados
        PushService.sendNotificationToDrivers({
          title: '🚗 Nueva Solicitud de Viaje',
          body: `Viaje hacia ${tripPayload.destinationMunicipality || tripPayload.destination || 'destino'} por $${tripPayload.proposedFare} USD. Toca para ver la ruta.`,
          url: '/conductor'
        }).catch(() => {});

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
        const isSharedPool = String(tripId).startsWith('pool-');
        if (isSharedPool) {
          const rawPoolId = tripId;
          const poolData = activeSharedPools.get(rawPoolId);
          if (!poolData) {
            if (callback) callback({ success: false, reason: 'El colectivo ya fue asignado o finalizó.' });
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
          const vBrand = driver?.vehicle_brand || '';
          const vModel = driver?.vehicle_model || '';
          const fullModel = (vBrand || vModel) ? `${vBrand} ${vModel}`.trim() : 'Vehículo Autorizado';

          const driverObj = {
            id: actualDriverId,
            name: driver?.full_name || 'Conductor Autorizado',
            vehiclePlate: driver?.vehicle_plate || 'EN CAMINO',
            vehicleBrand: vBrand,
            vehicleModel: fullModel,
            vehicleColor: driver?.vehicle_color || '',
            photo: driver?.photo_url || null,
            photoUrl: driver?.photo_url || null,
            phone: driver?.phone ? String(driver.phone) : ''
          };

          const totalDriverFare = poolData.passengers.reduce((sum, p) => sum + parseFloat(p.finalFare), 0).toFixed(2);

          // Emitir a todos los pasajeros en la sala del colectivo
          io.to(`pool:${rawPoolId}`).emit('trip:confirmed', {
            tripId: rawPoolId,
            serviceType: 'SHARED_POOL',
            isSharedPool: true,
            driver: driverObj,
            driverName: driverObj.name,
            vehiclePlate: driverObj.vehiclePlate,
            vehicleBrand: driverObj.vehicleBrand,
            vehicleModel: driverObj.vehicleModel,
            vehicleColor: driverObj.vehicleColor,
            photoUrl: driverObj.photoUrl,
            driverPhone: driverObj.phone,
            destinationMunicipality: 'Ruta Compartida (4 Paradas)'
          });

          // Notificar al conductor asignado
          const driverSocketId = driverSockets.get(driverProfileId) || (actualDriverId ? driverSockets.get(actualDriverId.toString()) : null);
          if (driverSocketId) {
            const socketDriver = io.sockets.sockets.get(driverSocketId);
            if (socketDriver) socketDriver.currentTripId = rawPoolId;

            io.to(driverSocketId).emit('trip:assigned', {
              tripId: rawPoolId,
              serviceType: 'SHARED_POOL',
              isSharedPool: true,
              agreedFare: totalDriverFare,
              cashToCollect: totalDriverFare,
              creditApplied: '0.00',
              passengerCount: poolData.passengers.length,
              originAddress: poolData.originAddress,
              originLat: poolData.originLat,
              originLng: poolData.originLng,
              destinationAddress: poolData.passengers[poolData.passengers.length - 1].destinationAddress,
              destinationLat: poolData.passengers[poolData.passengers.length - 1].destinationLat,
              destinationLng: poolData.passengers[poolData.passengers.length - 1].destinationLng,
              destinationMunicipality: 'Ruta Compartida (4 Paradas)',
              passengerName: 'Colectivo Compartido (4 Pasajeros)',
              passengerPhone: '',
              roadDistanceKm: poolData.passengers[poolData.passengers.length - 1].distanceKm,
              stops: poolData.passengers.map((p, idx) => ({
                seatNumber: idx + 1,
                destinationAddress: p.destinationAddress,
                distanceKm: p.distanceKm,
                finalFare: p.finalFare,
                passengerPhone: p.phone,
                label: `Parada ${idx + 1} (${p.distanceKm} km)`
              }))
            });
          }

          io.to('drivers_channel').emit('offer:rejected_other_won', { tripId: rawPoolId });

          // Notificación Push a los 4 pasajeros del colectivo con los datos del conductor asignado
          try {
            const poolPassengerIds = poolData.passengers.map(p => String(p.passengerId));
            PushService.sendNotificationToPoolPassengers(poolPassengerIds, {
              title: '🚗 ¡Conductor Asignado a tu Colectivo!',
              body: `${driverObj.name} viene por el grupo en ${driverObj.vehicleModel} (${driverObj.vehiclePlate}).`,
              url: '/viajes',
              vibrate: [300, 150, 300]
            }).catch(() => {});
          } catch (e) {
            console.warn('Error push colectivo driver assigned:', e);
          }

          if (callback) callback({ success: true, tripId: rawPoolId });
          return;
        }

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

        const vBrand = driver?.vehicle_brand || '';
        const vModel = driver?.vehicle_model || '';
        const fullModel = (vBrand || vModel) ? `${vBrand} ${vModel}`.trim() : 'Vehículo Autorizado';

        const driverObj = {
          id: actualDriverId,
          name: driver?.full_name || 'Conductor Autorizado',
          vehiclePlate: driver?.vehicle_plate || 'EN CAMINO',
          vehicleBrand: vBrand,
          vehicleModel: fullModel,
          vehicleColor: driver?.vehicle_color || '',
          photo: driver?.photo_url || null,
          photoUrl: driver?.photo_url || null,
          phone: driver?.phone ? String(driver.phone) : ''
        };

        const confirmedPayload = {
          tripId,
          agreedFare: effectiveFare.toFixed(2),
          cashToCollect: cashToCollect.toFixed(2),
          driver: driverObj,
          driverName: driverObj.name,
          vehiclePlate: driverObj.vehiclePlate,
          vehicleBrand: driverObj.vehicleBrand,
          vehicleModel: driverObj.vehicleModel,
          vehicleColor: driverObj.vehicleColor,
          photoUrl: driverObj.photoUrl,
          driverPhone: driverObj.phone,
          destinationMunicipality: trip?.destination_municipality || 'San Salvador',
          passengerId: trip?.passenger_id
        };

        io.to(`trip:${tripId}`).emit('trip:confirmed', confirmedPayload);
        if (trip?.passenger_id) {
          io.to(`passenger:${trip.passenger_id}`).emit('trip:confirmed', confirmedPayload);
        }
        io.to('passengers_channel').emit('trip:confirmed', confirmedPayload);

        socket.to(`trip:${tripId}`).emit('offer:rejected_other_won', { tripId });
        io.to('drivers_channel').emit('offer:rejected_other_won', { tripId });

        // Notificación Push al pasajero con los datos del conductor en camino
        if (trip?.passenger_id) {
          PushService.sendNotificationToUser(trip.passenger_id, {
            title: '🚗 ¡Conductor en Camino!',
            body: `${driverObj.name} aceptó tu viaje en ${driverObj.vehicleModel} (${driverObj.vehiclePlate}). Va en camino a recogerte.`,
            url: '/viajes',
            vibrate: [250, 100, 250]
          }).catch(() => {});
        }

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

        const vBrand = driver?.vehicle_brand || '';
        const vModel = driver?.vehicle_model || '';
        const fullModel = (vBrand || vModel) ? `${vBrand} ${vModel}`.trim() : 'Vehículo Autorizado';

        const driverObj = {
          id: actualDriverId,
          name: driver?.full_name || 'Conductor Autorizado',
          vehiclePlate: driver?.vehicle_plate || 'EN CAMINO',
          vehicleBrand: vBrand,
          vehicleModel: fullModel,
          vehicleColor: driver?.vehicle_color || '',
          photo: driver?.photo_url || null,
          photoUrl: driver?.photo_url || null,
          phone: driver?.phone ? String(driver.phone) : ''
        };

        const confirmedPayload = {
          tripId,
          agreedFare,
          cashToCollect: cashToCollect.toFixed(2),
          driver: driverObj,
          driverName: driverObj.name,
          vehiclePlate: driverObj.vehiclePlate,
          vehicleBrand: driverObj.vehicleBrand,
          vehicleModel: driverObj.vehicleModel,
          vehicleColor: driverObj.vehicleColor,
          photoUrl: driverObj.photoUrl,
          driverPhone: driverObj.phone,
          destinationMunicipality: trip.destination_municipality,
          passengerId: trip?.passenger_id
        };

        io.to(`trip:${tripId}`).emit('trip:confirmed', confirmedPayload);
        if (trip?.passenger_id) {
          io.to(`passenger:${trip.passenger_id}`).emit('trip:confirmed', confirmedPayload);
        }
        io.to('passengers_channel').emit('trip:confirmed', confirmedPayload);

        socket.to(`trip:${tripId}`).emit('offer:rejected_other_won', { tripId });
        io.to('drivers_channel').emit('offer:rejected_other_won', { tripId });

        // Notificación Push al conductor ganador
        if (actualDriverId) {
          PushService.sendNotificationToUser(actualDriverId, {
            title: '🎉 ¡Oferta Aceptada!',
            body: `El pasajero confirmó tu oferta por $${agreedFare} USD. Dirígete a recogerlo.`,
            url: '/conductor',
            vibrate: [300, 100, 300]
          }).catch(() => {});
        }

        // Notificación Push al pasajero
        if (trip?.passenger_id) {
          PushService.sendNotificationToUser(trip.passenger_id, {
            title: '🚗 ¡Conductor en Camino!',
            body: `Tu conductor ${driverObj.name} viene por ti en ${driverObj.vehicleModel} (${driverObj.vehiclePlate}).`,
            url: '/viajes',
            vibrate: [250, 100, 250]
          }).catch(() => {});
        }

        if (callback) callback({ success: true, tripId });
      } catch (err) {
        console.error('Error en passenger:accept_offer:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 4.1 Cancelación de Viaje (Permitido en búsqueda o si la carrera está huérfana/stale > 2h o forzada)
     */
    socket.on('trip:cancel', async ({ tripId, force }, callback) => {
      try {
        if (!tripId) {
          if (callback) callback({ success: false, error: 'tripId requerido' });
          return;
        }

        const tripRes = await pool.query(
          "SELECT id, status, driver_id, created_at FROM viajes_trips WHERE id::text = $1",
          [tripId]
        );
        const trip = tripRes.rows[0];
        if (!trip) {
          if (callback) callback({ success: true });
          return;
        }

        const tripAgeHours = (Date.now() - new Date(trip.created_at).getTime()) / (1000 * 60 * 60);
        const isStale = tripAgeHours > 2;

        // Regla: Si ya hay un conductor asignado o el viaje está en ejecución reciente, requiere mutuo acuerdo
        // A MENOS que sea forzado explícitamente o tenga más de 2 horas inactivo
        if (!force && !isStale && trip.driver_id && trip.status !== 'REQUESTED' && trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED') {
          console.warn(`⚠️ [trip:cancel] Intento de cancelación unilateral en carrera activa reciente #${tripId}. Denegado.`);
          if (callback) {
            callback({
              success: false,
              inProgress: true,
              error: 'Una carrera en ejecución no puede cancelarse unilateralmente. Debe solicitar cancelación por mutuo acuerdo.'
            });
          }
          return;
        }

        // Cancelar el viaje en la base de datos
        await pool.query("UPDATE viajes_trips SET status = 'CANCELLED' WHERE id::text = $1", [tripId]).catch(() => {});
        if (trip.driver_id) {
          await releaseDriverLock(trip.driver_id, tripId);
        }
        io.to(`trip:${tripId}`).emit('trip:canceled', { tripId, reason: force || isStale ? 'Cancelación por inactividad prolongada' : 'Cancelado por el usuario' });
        io.to('drivers_channel').emit('trip:canceled', { tripId });
        console.log(`🛑 [trip:cancel] Viaje #${tripId} cancelado exitosamente.`);
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error en trip:cancel:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 4.1.0 Cancelación Forzada de Viaje Huérfano / Atascado (Escudo de Rescate)
     */
    socket.on('trip:cancel_orphan', async ({ tripId }, callback) => {
      try {
        if (!tripId) {
          if (callback) callback({ success: false, error: 'tripId requerido' });
          return;
        }
        console.log(`🧹 [trip:cancel_orphan] Usuario fuerza liberación de viaje huérfano #${tripId}`);
        const tripRes = await pool.query("SELECT id, driver_id FROM viajes_trips WHERE id::text = $1", [tripId]);
        const trip = tripRes.rows[0];
        if (trip) {
          await pool.query("UPDATE viajes_trips SET status = 'CANCELLED' WHERE id::text = $1", [tripId]).catch(() => {});
          if (trip.driver_id) {
            await releaseDriverLock(trip.driver_id, tripId);
          }
          io.to(`trip:${tripId}`).emit('trip:canceled', { tripId, reason: 'Viaje huérfano cancelado por usuario' });
          io.to('drivers_channel').emit('trip:canceled', { tripId });
        }
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error en trip:cancel_orphan:', err);
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

        let trip = tripRes.rows[0];
        if (!trip && role === 'PASSENGER' && passengerId) {
          const fallbackRes = await pool.query(`
            SELECT t.*, 
                   dp.vehicle_plate, dp.vehicle_brand, dp.vehicle_model, dp.vehicle_color, dp.photo_url as driver_photo,
                   du.full_name as driver_name, du.phone as driver_phone,
                   pu.full_name as passenger_name, pu.phone as passenger_phone
            FROM viajes_trips t
            LEFT JOIN viajes_driver_profiles dp ON t.driver_id = dp.id
            LEFT JOIN viajes_users du ON dp.user_id = du.id
            LEFT JOIN viajes_users pu ON t.passenger_id = pu.id
            WHERE t.passenger_id::text = $1 AND t.status IN ('REQUESTED', 'ACCEPTED', 'IN_TRANSIT')
            ORDER BY t.created_at DESC LIMIT 1
          `, [passengerId]);
          trip = fallbackRes.rows[0];
          if (trip) {
            tripId = trip.id;
            socket.join(`trip:${trip.id}`);
            socket.currentTripId = trip.id;
          }
        }
        if (!trip) {
          if (callback) callback({ success: false, error: 'Viaje no encontrado' });
          return;
        }

        // Si el viaje ya finalizó o fue cancelado
        if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
          if (callback) callback({ success: true, isFinished: true, status: trip.status });
          return;
        }

        // Blindaje contra viajes huérfanos / zombies antiguos (> 4 horas sin finalizar)
        const tripCreatedAt = new Date(trip.created_at || Date.now()).getTime();
        const tripAgeHours = (Date.now() - tripCreatedAt) / (1000 * 60 * 60);
        if (tripAgeHours > 4) {
          console.log(`🧹 [trip:reconnect] Viaje #${tripId} tiene ${tripAgeHours.toFixed(1)} horas sin finalizar. Marcando como CANCELLED.`);
          await pool.query("UPDATE viajes_trips SET status = 'CANCELLED' WHERE id::text = $1", [tripId]).catch(() => {});
          if (trip.driver_id) {
            await releaseDriverLock(trip.driver_id, tripId);
          }
          if (callback) callback({ success: true, isFinished: true, status: 'CANCELLED', reason: 'Viaje expirado automáticamente por inactividad prolongada' });
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
        const normalizedStatus = (newStatus === 'DONE' ? 'COMPLETED' : newStatus);
        const updateRes = await pool.query(`
          UPDATE viajes_trips
          SET status = $1,
              completed_at = CASE WHEN $1 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id::text = $2
          RETURNING *;
        `, [normalizedStatus, tripId]);

        const updatedTrip = updateRes.rows[0];

        if (normalizedStatus === 'COMPLETED' && updatedTrip) {
          try {
            await ReferralService.processTripCompletionForReferral(
              tripId,
              updatedTrip.passenger_id,
              updatedTrip.agreed_fare
            );
          } catch (refErr) {
            console.warn('Referral completion notice:', refErr.message);
          }
          if (driverProfileId) {
            await releaseDriverLock(driverProfileId, tripId).catch(() => {});
          }
        }

        const statusPayload = {
          tripId,
          status: normalizedStatus,
          passengerId: updatedTrip?.passenger_id
        };

        io.to(`trip:${tripId}`).emit('trip:status_changed', statusPayload);
        if (updatedTrip?.passenger_id) {
          io.to(`passenger:${updatedTrip.passenger_id}`).emit('trip:status_changed', statusPayload);
        }
        io.to('passengers_channel').emit('trip:status_changed', statusPayload);

        // Notificaciones Push según el estado operativo
        if (updatedTrip?.passenger_id) {
          if (normalizedStatus === 'ARRIVED') {
            PushService.sendNotificationToUser(updatedTrip.passenger_id, {
              title: '📍 ¡Tu conductor ya está afuera!',
              body: 'El vehículo ha llegado al punto de recogida. Por favor dirígete a abordarlo.',
              url: '/viajes',
              vibrate: [300, 100, 300, 100, 300]
            }).catch(() => {});
          } else if (normalizedStatus === 'IN_TRANSIT') {
            PushService.sendNotificationToUser(updatedTrip.passenger_id, {
              title: '🚕 ¡Viaje en Curso!',
              body: `En camino hacia ${updatedTrip.destination_address || 'tu destino'}. ¡Buen viaje!`,
              url: '/viajes'
            }).catch(() => {});
          } else if (normalizedStatus === 'COMPLETED') {
            PushService.sendNotificationToUser(updatedTrip.passenger_id, {
              title: '🏁 ¡Has llegado a tu destino!',
              body: 'Viaje finalizado con éxito. ¡Gracias por preferir Rumbo!',
              url: '/viajes'
            }).catch(() => {});
          }
        }

        if (callback) callback({ success: true, trip: updatedTrip });
      } catch (err) {
        console.error('Error en trip:update_status:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 6. Colectivo Compartido: Gestión de Pools por Corredor
     */
    socket.on('pool:join', (payload, callback) => {
      try {
        const result = handleJoinSharedPool(payload, socket, io);
        if (callback) callback(result);
      } catch (err) {
        console.error('Error en pool:join:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('pool:leave', ({ poolId, passengerId }, callback) => {
      try {
        handleLeaveSharedPool(poolId, passengerId, socket, io);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) connectedUsers.delete(socket.userId);
      if (socket.driverProfileId) driverSockets.delete(socket.driverProfileId);
      if (socket.currentPoolId && socket.userId) {
        handleLeaveSharedPool(socket.currentPoolId, socket.userId, socket, io);
      }
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

const activeSharedPools = new Map();

/**
 * Calcula la distancia perpendicular (desvío lateral en km) de un destino P
 * respecto a la línea directriz entre el origen O y el destino de un pool existente.
 * Garantiza que nunca se mezclen colonias lejanas del mismo municipio (ej. Sierra Morena vs Las Margaritas).
 */
function calculateCrossTrackDistanceKm(originLat, originLng, destLat, destLng, pointLat, pointLng) {
  const avgLatRad = (originLat * Math.PI) / 180;
  const cosLat = Math.cos(avgLatRad);

  const dx = (destLng - originLng) * 111 * cosLat;
  const dy = (destLat - originLat) * 111;
  const L = Math.sqrt(dx * dx + dy * dy);

  if (L < 0.2) {
    const px = (pointLng - destLng) * 111 * cosLat;
    const py = (pointLat - destLat) * 111;
    return Math.sqrt(px * px + py * py);
  }

  const px = (pointLng - originLng) * 111 * cosLat;
  const py = (pointLat - originLat) * 111;

  return Math.abs(dx * py - dy * px) / L;
}

function handleJoinSharedPool(payload, socket, io) {
  const {
    passengerId,
    passengerName = 'Pasajero',
    genderFilter = 'ALL',
    phone = '',
    originAddress = 'Origen',
    originLat = 13.7013,
    originLng = -89.2244,
    destinationAddress = 'Destino',
    destinationLat = 13.6738,
    destinationLng = -89.2789,
    corridorCode = 'ESTE_EJERCITO',
    corridorName = 'Corredor Oriente',
    direction = 'ESTE',
    bearing = 90.0,
    distanceKm = 5.0,
    normalFare = 5.00
  } = payload;

  const normalFareNum = parseFloat(normalFare || 5.00);
  const discountAmount = Number((normalFareNum * 0.30).toFixed(2));
  const finalFare = Number((normalFareNum * 0.70).toFixed(2));
  const numBearing = parseFloat(bearing) || 90.0;

  // Buscar un pool abierto compatible dentro de radio de 1.5 km en el mismo corredor vial y rumbo continuo
  let targetPool = null;
  for (const [, p] of activeSharedPools.entries()) {
    if (p.passengers.length >= 4) continue;

    // Validación de dirección general y sub-eje vial específico (evita zonas topográficamente separadas)
    if (p.direction !== direction) continue;
    if (p.corridorCode && corridorCode && p.corridorCode !== corridorCode) continue;

    // Control angular de bearing: ruta paralela o continua con desviación máxima de 28 grados
    if (p.bearing != null && numBearing != null) {
      const angularDiff = Math.abs(((numBearing - p.bearing + 180) % 360) - 180);
      if (angularDiff > 28) continue;
    }

    // Filtro de seguridad de género
    if (genderFilter === 'WOMEN_ONLY' || p.genderFilter === 'WOMEN_ONLY') {
      if (p.genderFilter !== genderFilter) continue;
    }

    // Radio de origen (recogida de pasajeros): <= 1.5 km
    const distToPoolOrigin = Math.sqrt(
      Math.pow((originLat - p.originLat) * 111, 2) +
      Math.pow((originLng - p.originLng) * 111 * Math.cos(originLat * Math.PI / 180), 2)
    );
    if (distToPoolOrigin > 1.5) continue;

    // REGLA DE ORO DE DESPACHO: Desvío lateral máximo <= 1.0 km por pasajero
    // Si el nuevo pasajero va a una colonia alejada de la trayectoria (ej. Las Margaritas cuando el pool va a Sierra Morena),
    // equivale a otro viaje y no se debe mezclar.
    if (p.passengers.length > 0) {
      const refDest = p.passengers[p.passengers.length - 1];
      const lateralDevKm = calculateCrossTrackDistanceKm(
        p.originLat,
        p.originLng,
        refDest.destinationLat,
        refDest.destinationLng,
        destinationLat,
        destinationLng
      );
      if (lateralDevKm > 1.0) {
        continue; // Desvío superior a 1 km: se abrirá un nuevo viaje colectivo
      }
    }

    targetPool = p;
    break;
  }

  if (!targetPool) {
    const poolId = `pool-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    targetPool = {
      id: poolId,
      corridorCode,
      corridorName,
      direction,
      bearing: numBearing,
      genderFilter,
      originLat: parseFloat(originLat),
      originLng: parseFloat(originLng),
      originAddress,
      passengers: [],
      createdAt: Date.now()
    };
    activeSharedPools.set(poolId, targetPool);
  }

  // Quitar pasajero si ya estaba en el pool
  targetPool.passengers = targetPool.passengers.filter(p => p.passengerId !== passengerId);

  // Agregar nuevo pasajero
  targetPool.passengers.push({
    passengerId,
    passengerName,
    phone,
    genderFilter,
    pickupAddress: originAddress,
    pickupLat: parseFloat(originLat),
    pickupLng: parseFloat(originLng),
    destinationAddress,
    destinationLat: parseFloat(destinationLat),
    destinationLng: parseFloat(destinationLng),
    distanceKm: parseFloat(distanceKm || 5.0),
    normalFare: normalFareNum.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    finalFare: finalFare.toFixed(2),
    socketId: socket.id
  });

  socket.join(`pool:${targetPool.id}`);
  socket.currentPoolId = targetPool.id;

  // ORDENAR ESTRICTAMENTE POR ORDEN DE DISTANCIA DESDE EL ORIGEN (QUIÉN BAJA PRIMERO)
  targetPool.passengers.sort((a, b) => a.distanceKm - b.distanceKm);

  // STOPS PARA PASAJEROS: CONFIDENCIALIDAD TOTAL. No se comparten las tarifas personales ajenas.
  const stopsForPassengers = targetPool.passengers.map((p, idx) => ({
    seatNumber: idx + 1,
    passengerId: p.passengerId,
    destinationAddress: p.destinationAddress,
    distanceKm: p.distanceKm,
    label: `Parada ${idx + 1} (~${p.distanceKm} km)`
  }));

  // STOPS PARA EL CONDUCTOR: Desglose completo de cobro y recaudación por cada asiento
  const stopsForDriver = targetPool.passengers.map((p, idx) => ({
    seatNumber: idx + 1,
    passengerId: p.passengerId,
    passengerName: p.passengerName,
    phone: p.phone,
    destinationAddress: p.destinationAddress,
    distanceKm: p.distanceKm,
    normalFare: p.normalFare,
    discountAmount: p.discountAmount,
    finalFare: p.finalFare,
    label: `Parada ${idx + 1} (${p.distanceKm} km) - $${p.finalFare} USD`
  }));

  const isComplete = targetPool.passengers.length >= 4;

  const poolStatusPayload = {
    poolId: targetPool.id,
    corridorCode: targetPool.corridorCode,
    corridorName: targetPool.corridorName,
    direction: targetPool.direction,
    bearing: targetPool.bearing,
    seatsFilled: targetPool.passengers.length,
    totalSeats: 4,
    isComplete,
    stops: stopsForPassengers
  };

  io.to(`pool:${targetPool.id}`).emit('pool:status', poolStatusPayload);

  // Notificación Push a los pasajeros que ya estaban esperando cuando se une un nuevo compañero
  const currentCount = targetPool.passengers.length;
  const otherPassengerIds = targetPool.passengers
    .filter(p => String(p.passengerId) !== String(passengerId))
    .map(p => String(p.passengerId));

  if (!isComplete && otherPassengerIds.length > 0) {
    const seatMsg = currentCount === 3
      ? `🔥 ¡Casi listos! Ya van 3 de 4 asientos hacia ${targetPool.corridorName}. Falta solo 1 persona para arrancar.`
      : `👥 ¡Un pasajero más se unió a tu ruta! Ya van ${currentCount} de 4 asientos ocupados.`;
    PushService.sendNotificationToPoolPassengers(otherPassengerIds, {
      title: 'Rumbo Colectivo 👥',
      body: seatMsg,
      url: '/viajes'
    }).catch(() => {});
  }

  // Si se completaron los 4 pasajeros, DESPACHO INMEDIATO AL CANAL DE CONDUCTORES
  if (isComplete) {
    const totalDriverFare = targetPool.passengers.reduce((sum, p) => sum + parseFloat(p.finalFare), 0).toFixed(2);
    const poolTripPayload = {
      id: targetPool.id,
      tripId: targetPool.id,
      serviceType: 'SHARED_POOL',
      corridorCode: targetPool.corridorCode,
      corridorName: targetPool.corridorName,
      passengerCount: 4,
      origin: targetPool.originAddress,
      originLat: targetPool.originLat,
      originLng: targetPool.originLng,
      destination: targetPool.passengers[3].destinationAddress,
      destinationLat: targetPool.passengers[3].destinationLat,
      destinationLng: targetPool.passengers[3].destinationLng,
      destinationMunicipality: 'Ruta Compartida',
      offeredFare: totalDriverFare,
      proposedFare: totalDriverFare,
      suggestedFare: totalDriverFare,
      roadDistanceKm: targetPool.passengers[3].distanceKm,
      trafficLabel: 'Colectivo Completo (4 Pasajeros)',
      timeLeft: 30,
      stops: stopsForDriver
    };

    io.to('drivers_channel').emit('trip:new_request', poolTripPayload);
    io.to(`pool:${targetPool.id}`).emit('pool:dispatched', {
      poolId: targetPool.id,
      totalFare: totalDriverFare,
      message: '¡4 cupos completos! Buscando conductor cercano.'
    });

    // Notificación Push a los 4 pasajeros del colectivo
    const allPassengerIds = targetPool.passengers.map(p => String(p.passengerId));
    PushService.sendNotificationToPoolPassengers(allPassengerIds, {
      title: '🎉 ¡Colectivo Completo (4/4)!',
      body: `Cupos llenos en ${targetPool.corridorName}. Despachando conductor de inmediato. Prepárate en tu punto de recogida.`,
      url: '/viajes',
      vibrate: [300, 150, 300, 150, 300]
    }).catch(() => {});

    // Notificación Push a los conductores disponibles
    PushService.sendNotificationToDrivers({
      title: '💰 ¡Colectivo Completo (4 Pasajeros)!',
      body: `Colectivo en ${targetPool.corridorName} listo para despacho. Ganancia total: $${totalDriverFare} USD.`,
      url: '/conductor',
      vibrate: [250, 100, 250]
    }).catch(() => {});
  }

  return { success: true, poolId: targetPool.id, stops: stopsForPassengers, seatsFilled: targetPool.passengers.length };
}

function handleLeaveSharedPool(poolId, passengerId, socket, io) {
  const pool = activeSharedPools.get(poolId);
  if (!pool) return;
  pool.passengers = pool.passengers.filter(p => p.passengerId !== passengerId);
  socket.leave(`pool:${poolId}`);
  if (pool.passengers.length === 0) {
    activeSharedPools.delete(poolId);
  } else {
    pool.passengers.sort((a, b) => a.distanceKm - b.distanceKm);
    const stopsForPassengers = pool.passengers.map((p, idx) => ({
      seatNumber: idx + 1,
      passengerId: p.passengerId,
      destinationAddress: p.destinationAddress,
      distanceKm: p.distanceKm,
      label: `Parada ${idx + 1} (~${p.distanceKm} km)`
    }));
    io.to(`pool:${poolId}`).emit('pool:status', {
      poolId: pool.id,
      corridorCode: pool.corridorCode,
      corridorName: pool.corridorName,
      direction: pool.direction,
      bearing: pool.bearing,
      seatsFilled: pool.passengers.length,
      totalSeats: 4,
      isComplete: false,
      stops: stopsForPassengers
    });
  }
}
