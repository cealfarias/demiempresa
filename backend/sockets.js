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
      if (role === 'DRIVER' && driverProfileId) {
        driverSockets.set(driverProfileId, socket.id);
        socket.join(`driver:${driverProfileId}`);
      } else {
        socket.join(`passenger:${userId}`);
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
     * 2. Solicitud de Viaje o Encomienda (Despacho a 1 km)
     */
    socket.on('trip:request', async (tripData, callback) => {
      try {
        const {
          passengerId,
          serviceType = 'PASSENGER',
          originAddress,
          originLat,
          originLng,
          destinationAddress,
          destinationLat,
          destinationLng,
          destinationMunicipality,
          proposedFare,
          packageDetails,
          paymentTiming
        } = tripData;

        const credit = await ReferralService.getAvailableCredit(passengerId);
        const creditApplied = credit ? 1.00 : 0.00;

        const insertRes = await pool.query(`
          INSERT INTO viajes_trips (
            service_type, passenger_id, origin_address, origin_lat, origin_lng,
            destination_address, destination_lat, destination_lng, destination_municipality,
            proposed_fare, credit_applied, package_details, payment_timing, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'REQUESTED')
          RETURNING *;
        `, [
          serviceType, passengerId, originAddress, originLat, originLng,
          destinationAddress, destinationLat, destinationLng, destinationMunicipality || 'SAN SALVADOR',
          proposedFare, creditApplied, packageDetails || null, paymentTiming || 'AT_ORIGIN'
        ]);

        const newTrip = insertRes.rows[0];
        socket.join(`trip:${newTrip.id}`);
        await initTripLock(newTrip.id);

        let nearbyDrivers = await findNearbyDrivers(originLng, originLat, 10.0);
        const notifiedDriverIds = new Set();

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
          originLatObfuscated: Number(parseFloat(originLat).toFixed(2)),
          originLngObfuscated: Number(parseFloat(originLng).toFixed(2)),
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
          passengerName: tripData.passengerName || 'Pasajero Rumbo',
          passengerPhone: tripData.passengerPhone || '',
          packageDetails: newTrip.package_details
        };

        if (nearbyDrivers && nearbyDrivers.length > 0) {
          for (const nearby of nearbyDrivers) {
            if (creditApplied > 0) {
              const canAccept = await ReferralService.canDriverAcceptBonusTrip(nearby.driverId);
              if (!canAccept) continue;
            }

            const targetSocketId = driverSockets.get(nearby.driverId);
            if (targetSocketId) {
              notifiedDriverIds.add(nearby.driverId);
              io.to(targetSocketId).emit('trip:new_request', {
                ...tripPayload,
                distanceKm: nearby.distanceKm
              });
            }
          }
        }

        // Si no se notificó a conductores por geocercanía (ej. conductores online en fase de prueba),
        // notificar a todos los conductores activos conectados para pruebas reales
        if (notifiedDriverIds.size === 0 && driverSockets.size > 0) {
          for (const [drvId, targetSocketId] of driverSockets.entries()) {
            io.to(targetSocketId).emit('trip:new_request', tripPayload);
          }
        }

        if (callback) callback({ success: true, trip: newTrip, creditApplied });
      } catch (err) {
        console.error('Error en trip:request:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * 3. Oferta con TTL de 15 Segundos
     */
    socket.on('driver:offer', async ({ tripId, driverProfileId, proposedFare }) => {
      try {
        await setOfferWithTTL(tripId, driverProfileId, proposedFare, 15);

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
          VALUES ($1, $2, $3, 'PENDING', CURRENT_TIMESTAMP + INTERVAL '15 seconds')
          ON CONFLICT (trip_id, driver_id, created_at) DO NOTHING;
        `, [tripId, driverInfo?.id || driverProfileId, proposedFare]).catch(() => {});

        io.to(`trip:${tripId}`).emit('passenger:offer_received', {
          tripId,
          driverProfileId,
          driverName: driverInfo?.full_name || 'Conductor Rumbo',
          driverPhone: driverInfo?.phone || '',
          vehiclePlate: driverInfo?.vehicle_plate || 'P-584-912',
          vehicleModel: `${driverInfo?.vehicle_brand || 'Toyota'} ${driverInfo?.vehicle_model || 'Corolla'}`,
          vehicleColor: driverInfo?.vehicle_color || 'Gris Plata',
          photoUrl: driverInfo?.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          proposedFare,
          expiresInSeconds: 15
        });
      } catch (err) {
        console.error('Error en driver:offer:', err);
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
        const passenger = passengerRes.rows[0] || { full_name: 'Pasajero Rumbo', phone: '7000-0000' };

        const driverSocketId = driverSockets.get(driverProfileId) || (actualDriverId ? driverSockets.get(actualDriverId.toString()) : null);
        if (driverSocketId) {
          const socketDriver = io.sockets.sockets.get(driverSocketId);
          if (socketDriver) socketDriver.currentTripId = tripId;

          io.to(driverSocketId).emit('trip:assigned', {
            tripId,
            agreedFare,
            cashToCollect: cashToCollect.toFixed(2),
            creditApplied: creditApplied.toFixed(2),
            originAddress: trip.origin_address,
            originLat: trip.origin_lat,
            originLng: trip.origin_lng,
            destinationAddress: trip.destination_address,
            destinationLat: trip.destination_lat,
            destinationLng: trip.destination_lng,
            destinationMunicipality: trip.destination_municipality,
            passengerName: passenger.full_name,
            passengerPhone: passenger.phone,
            whatsappLink: `https://wa.me/503${passenger.phone.replace(/\D/g, '')}?text=Hola,%20soy%20tu%20conductor%20de%20demiempresa.online`,
            wazeUrl: `https://waze.com/ul?ll=${trip.origin_lat},${trip.origin_lng}&navigate=yes`,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${trip.origin_lat},${trip.origin_lng}`
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
          driverPhone: driver.phone,
          destinationMunicipality: trip.destination_municipality
        });

        socket.to(`trip:${tripId}`).emit('offer:rejected_other_won', { tripId });

        if (callback) callback({ success: true, tripId });
      } catch (err) {
        console.error('Error en passenger:accept_offer:', err);
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
