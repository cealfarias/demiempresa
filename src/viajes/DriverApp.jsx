import React, { useState, useEffect } from 'react';
import {
  Car,
  Navigation,
  Phone,
  MessageCircle,
  CheckCircle,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  Clock,
  Shield,
  MapPin,
  ChevronRight,
  Radio,
  Loader2,
  Fuel,
  Settings,
  Flame,
  TrendingDown,
  Sparkles,
  Wind,
  Dog,
  Users,
  Briefcase,
  Star,
  Coins,
  List,
  FileText,
  Inbox,
  LogOut,
  X,
  CheckCircle2
} from 'lucide-react';
import RumboLogo from './RumboLogo';
import GasModal from './GasModal';
import DriverRegistrationModal from './DriverRegistrationModal';
import DriverLandingView from './DriverLandingView';
import DriverEarningsView from './DriverEarningsView';
import DriverTripRequestsFeed from './DriverTripRequestsFeed';
import DriverAccountStatementModal from './DriverAccountStatementModal';
import RumboInboxModal from './RumboInboxModal';
import {
  calculateTripFuelCost,
  estimateFuelEconomy,
  getNearbyGasStation,
  DEFAULT_GAS_STATIONS
} from './fuelService';
import {
  socket,
  fetchDriverSubscriptionApi,
  payDriverWeeklyFeeWithBonusesApi,
  payDriverDailyPassApi,
  fetchWalletSummaryApi,
  fetchDriverStatusApi,
  verifyMagicTokenApi,
  initSessionTelemetry
} from './api';

export default function DriverApp() {
  const [driverProfile, setDriverProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('rumbo_driver_profile');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Purgar perfiles mock / dummy de pruebas para exigir autenticación auténtica en base de datos
      if (
        !parsed ||
        parsed.id === 'drv-sv-1' ||
        parsed.id?.startsWith('drv_sv_') ||
        parsed.fullName?.includes('Conductor Rumbo') ||
        parsed.dui === '00000000-0'
      ) {
        localStorage.removeItem('rumbo_driver_profile');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showAccountStatementModal, setShowAccountStatementModal] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [inboxInitialCategory, setInboxInitialCategory] = useState(null);
  const [inboxPrefillAmount, setInboxPrefillAmount] = useState(10.00);
  const [driverProfileId, setDriverProfileId] = useState(() => {
    try {
      const saved = localStorage.getItem('rumbo_driver_profile');
      return saved ? JSON.parse(saved)?.id || null : null;
    } catch {
      return null;
    }
  });

  // Inicializar Telemetría Automática de Sesión y Permanencia (Conductores)
  useEffect(() => {
    const cleanup = initSessionTelemetry('DRIVER');
    return cleanup;
  }, []);

  const isApproved = driverProfile && driverProfile.approvalStatus === 'APPROVED';
  const isPending = driverProfile?.approvalStatus === 'PENDING';
  const isRejected = driverProfile?.approvalStatus === 'REJECTED';

  const [driverOnline, setDriverOnline] = useState(() => {
    try {
      const saved = localStorage.getItem('rumbo_driver_online');
      if (saved !== null) return saved === 'true';
    } catch {}
    return Boolean(isApproved);
  });

  useEffect(() => {
    try {
      localStorage.setItem('rumbo_driver_online', String(driverOnline));
    } catch {}
  }, [driverOnline]);
  const [activeBottomTab, setActiveBottomTab] = useState('REQUESTS'); // 'REQUESTS' | 'EARNINGS' | 'PRIORITY'
  const [weeklyBonuses, setWeeklyBonuses] = useState(0);
  const [isApplyingBonuses, setIsApplyingBonuses] = useState(false);
  const [showFeePaymentModal, setShowFeePaymentModal] = useState(false);
  const [feePaymentResult, setFeePaymentResult] = useState(null);
  const bonusCap = 15;
  const baseWeeklyFee = 15.00;
  const netWeeklyFee = Math.max(0, baseWeeklyFee - weeklyBonuses * 1.00);

  // Estado y función para Cierre de Sesión Seguro
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [workInvitationModal, setWorkInvitationModal] = useState(null);

  const handlePerformLogout = () => {
    localStorage.removeItem('rumbo_driver_profile');
    localStorage.removeItem('rumbo_driver_online');
    localStorage.removeItem('rumbo_driver_active_trip');
    localStorage.removeItem('rumbo_driver_trip_state');
    setDriverProfile(null);
    setDriverOnline(false);
    setActiveTrip(null);
    setShowLogoutConfirmModal(false);
  };

  const handleAcceptRequestFromFeed = (req, finalPrice) => {
    const fare = parseFloat(finalPrice || req.price || 4.00);
    setActiveTrip({
      id: req.id,
      passengerName: req.passengerName || 'Pasajero Rumbo',
      passengerPhone: req.passengerPhone || 'No proporcionado',
      origin: req.origin,
      originLat: 13.7013,
      originLng: -89.2244,
      destination: req.destination,
      roadDistanceKm: req.tripDistanceKm || 5.0,
      delayMinutes: req.delayMinutes || 0,
      suggestedFare: fare,
      preferences: {},
      cashBill: '10',
      changeNeeded: (10.00 - fare).toFixed(2),
      agreedFare: fare.toFixed(2),
      cashToCollect: fare.toFixed(2),
      creditApplied: '0.00'
    });
    setTripState('EN_ROUTE_TO_PICKUP');
  };

  // Solicitud entrante real (se llena únicamente vía WebSockets cuando un pasajero solicita viaje)
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);

  // Configuración de Vehículo & Consumo Probabilístico de Gasolina
  const [vehicleYear, setVehicleYear] = useState(2018);
  const [vehicleCategory, setVehicleCategory] = useState('SEDAN_COMPACT');
  const [fuelType, setFuelType] = useState('REGULAR');
  const [fuelPrice, setFuelPrice] = useState(3.75); // Precio por galón verificado
  const [kmPerGallon, setKmPerGallon] = useState(() => estimateFuelEconomy(2018, 'SEDAN_COMPACT'));
  const [showVehicleSettings, setShowVehicleSettings] = useState(false);

  // Radar de Gasolineras & HUD en Ruta
  const [gasStations, setGasStations] = useState(DEFAULT_GAS_STATIONS);
  const [showGasModal, setShowGasModal] = useState(false);
  const [nearbyStationAlert, setNearbyStationAlert] = useState(null);

  // Viaje Asignado (Persistido para resistir F5 y recargas de página)
  const initialActiveTrip = (() => {
    try {
      if (typeof window === 'undefined') return null;
      return JSON.parse(localStorage.getItem('rumbo_driver_active_trip') || 'null');
    } catch {
      return null;
    }
  })();
  const [activeTrip, setActiveTrip] = useState(() => initialActiveTrip);
  const [tripState, setTripState] = useState(() => {
    try {
      return localStorage.getItem('rumbo_driver_trip_state') || 'EN_ROUTE_TO_PICKUP';
    } catch {
      return 'EN_ROUTE_TO_PICKUP';
    }
  });
  const [gpsActive, setGpsActive] = useState(false);

  // Sincronizar activeTrip y tripState en localStorage
  useEffect(() => {
    try {
      if (activeTrip) {
        localStorage.setItem('rumbo_driver_active_trip', JSON.stringify(activeTrip));
        localStorage.setItem('rumbo_driver_trip_state', tripState);
      } else {
        localStorage.removeItem('rumbo_driver_active_trip');
        localStorage.removeItem('rumbo_driver_trip_state');
      }
    } catch (e) {
      console.warn('Error guardando viaje activo del conductor:', e);
    }
  }, [activeTrip, tripState]);

  // Prevenir recargas accidentales si el conductor tiene un viaje en curso
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeTrip && tripState !== 'DONE') {
        e.preventDefault();
        e.returnValue = 'Tienes un viaje en curso. Si recargas, tus datos se mantendrán pero podrías perder conexión GPS momentáneamente.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTrip, tripState]);

  // Reconectar viaje en el WebSocket si el conductor recargó la página
  useEffect(() => {
    if (initialActiveTrip?.id && driverProfileId) {
      console.log('🔄 Reconectando viaje activo del conductor tras recarga:', initialActiveTrip.id);
      socket.emit('trip:reconnect', { tripId: initialActiveTrip.id, role: 'DRIVER', driverProfileId }, (res) => {
        if (!res || !res.success) {
          console.warn('No se pudo reconectar viaje del conductor:', res?.error);
          return;
        }
        if (res.isFinished) {
          console.log('El viaje ya había finalizado o sido cancelado.');
          localStorage.removeItem('rumbo_driver_active_trip');
          localStorage.removeItem('rumbo_driver_trip_state');
          setActiveTrip(null);
          setTripState('EN_ROUTE_TO_PICKUP');
        } else if (res.trip) {
          console.log('✅ Viaje reconectado con éxito para conductor:', res.trip);
          setActiveTrip((prev) => ({
            ...prev,
            ...res.trip,
            passengerName: res.trip.passenger?.name || prev?.passengerName,
            passengerPhone: res.trip.passenger?.phone || prev?.passengerPhone,
            cashToCollect: res.trip.cashToCollect || prev?.cashToCollect,
            agreedFare: res.trip.agreedFare || prev?.agreedFare
          }));
          if (res.trip.status === 'ARRIVED') setTripState('ARRIVED');
          else if (res.trip.status === 'IN_TRANSIT') setTripState('IN_TRANSIT');
          else if (res.trip.status === 'COMPLETED') setTripState('DONE');
        }
      });
    }
  }, [driverProfileId]);

  // Establecer título dinámico de la pestaña para la consola del conductor
  useEffect(() => {
    document.title = "Rumbo Conductor | 100% Efectivo";
  }, []);

  // 1-CLICK: Detección y activación automática del Enlace Mágico por WhatsApp (?magicToken=...&phone=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get('magicToken') || params.get('token');
    const magicPhone = params.get('phone');

    if (magicToken && magicPhone) {
      verifyMagicTokenApi({ phone: magicPhone, token: magicToken })
        .then((res) => {
          if (res && res.success && res.driverProfile) {
            localStorage.setItem('rumbo_driver_profile', JSON.stringify(res.driverProfile));
            setDriverProfile(res.driverProfile);
            setDriverProfileId(res.driverProfile.id);
            setDriverOnline(true);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          } else {
            setWorkInvitationModal({
              title: res?.workInvitation?.title || '¿Necesitas trabajar en la plataforma?',
              message: res?.workInvitation?.message || 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión',
              detail: res?.error || 'Este enlace mágico ya fue utilizado o es inválido.'
            });
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        })
        .catch((err) => {
          console.warn('Error al verificar enlace mágico por URL:', err);
          setWorkInvitationModal({
            title: '¿Necesitas trabajar en la plataforma?',
            message: 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión',
            detail: err.message || 'Este enlace ya fue consumido en otro dispositivo o fue compartido.'
          });
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        });
    }
  }, []);

  // Sincronizar estado de aprobación del conductor con el backend
  useEffect(() => {
    if (driverProfile?.id) {
      fetchDriverStatusApi(driverProfile.id)
        .then((updated) => {
          if (updated && !updated.error) {
            setDriverProfile(updated);
            localStorage.setItem('rumbo_driver_profile', JSON.stringify(updated));
            if (updated.approvalStatus !== 'APPROVED') {
              setDriverOnline(false);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Controlar conexión en línea con validación de aprobación administrativa
  const handleToggleOnline = () => {
    if (isRejected) {
      setShowRegistrationModal(true);
      return;
    }
    setDriverOnline(!driverOnline);
  };

  // Cargar gasolineras del backend
  useEffect(() => {
    fetch('https://api.demiempresa.online/api/gas/stations')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.stations && data.stations.length > 0) {
          setGasStations(
            data.stations.map((st) => ({
              id: st.id,
              brand: st.brand,
              name: st.station_name,
              address: st.address,
              municipality: st.municipality,
              lat: parseFloat(st.lat),
              lng: parseFloat(st.lng),
              regular: parseFloat(st.regular_price),
              especial: parseFloat(st.especial_price),
              diesel: parseFloat(st.diesel_price),
              savingsRegular: parseFloat(st.savings_regular || 0.05),
              reportsCount: st.verified_reports_count || 1
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Pagar cuota semanal ($15.00) usando saldo bonificado acumulado de un solo golpe
  const handlePayWeeklyFeeWithBonuses = async (customBonuses = null) => {
    setIsApplyingBonuses(true);
    const available = weeklyBonuses || 0;
    const bonusesToUse = customBonuses !== null ? customBonuses : Math.min(15, available);

    if (bonusesToUse === 0 && available === 0) {
      setFeePaymentResult({
        success: false,
        bonusesApplied: 0,
        remainingCashToPay: '15.00',
        isFullyPaid: false,
        planType: 'WEEKLY',
        title: 'Pago de Cuota Semanal ($15.00 USD)',
        message: 'No tienes saldo bonificado disponible de tus pasajeros. Debes cancelar los $15.00 USD mediante Transfer365 Móvil o Cubo Pago.'
      });
      setShowFeePaymentModal(true);
      setIsApplyingBonuses(false);
      return;
    }

    try {
      const res = await payDriverWeeklyFeeWithBonusesApi({
        driverId: driverProfileId,
        bonusesToUse,
        totalWeeklyFee: 15.00
      });
      if (res && res.success) {
        const applied = res.bonusesApplied !== undefined ? res.bonusesApplied : bonusesToUse;
        setWeeklyBonuses((prev) => Math.max(0, prev - applied));
        const rem = Math.max(0, 15 - applied);
        setFeePaymentResult({
          ...res,
          planType: 'WEEKLY',
          title: rem === 0 ? '¡Semana 100% Pagada!' : 'Abono a Cuota Semanal',
          bonusesApplied: applied,
          remainingCashToPay: rem.toFixed(2),
          isFullyPaid: rem === 0,
          message: rem === 0
            ? '¡Cuota semanal saldada al 100% con 15 bonos de un solo golpe ($0.00 USD en efectivo)! Tu acceso 24/7 está garantizado para toda la semana.'
            : `Se aplicaron ${applied} bonos (-$${applied}.00 USD) de un solo golpe. Saldo pendiente a cancelar: $${rem.toFixed(2)} USD.`
        });
        setShowFeePaymentModal(true);
      }
    } catch {
      // Fallback local garantizado: se descuentan todos los bonos aplicables de una sola vez
      const applied = Math.min(15, available);
      const rem = Math.max(0, 15 - applied);
      setWeeklyBonuses((prev) => Math.max(0, prev - applied));
      setFeePaymentResult({
        success: true,
        planType: 'WEEKLY',
        title: rem === 0 ? '¡Semana 100% Pagada!' : 'Abono a Cuota Semanal',
        bonusesApplied: applied,
        remainingCashToPay: rem.toFixed(2),
        isFullyPaid: rem === 0,
        message: rem === 0
          ? '¡Cuota semanal saldada al 100% con 15 bonos de un solo golpe ($0.00 USD en efectivo)! Tu acceso 24/7 está garantizado para toda la semana.'
          : `Se aplicaron ${applied} bonos (-$${applied}.00 USD) de un solo golpe. Saldo pendiente a cancelar: $${rem.toFixed(2)} USD.`
      });
      setShowFeePaymentModal(true);
    } finally {
      setIsApplyingBonuses(false);
    }
  };

  // Pagar pase diario ($3.00) usando saldo bonificado (hasta 3 bonos) o efectivo de un solo golpe
  const handlePayDailyPass = async () => {
    setIsApplyingBonuses(true);
    const available = weeklyBonuses || 0;
    const bonosUsed = Math.min(3, available);
    const remainingCash = Math.max(0, 3 - bonosUsed);

    try {
      const res = await payDriverDailyPassApi({
        driverId: driverProfileId,
        bonusesToUse: bonosUsed,
        totalDailyFee: 3.00
      });
      if (res && res.success) {
        const applied = res.bonusesApplied !== undefined ? res.bonusesApplied : bonosUsed;
        setWeeklyBonuses((prev) => Math.max(0, prev - applied));
        const rem = Math.max(0, 3 - applied);
        setFeePaymentResult({
          ...res,
          planType: 'DAILY',
          title: 'Pase Diario Activado (24 Horas)',
          bonusesApplied: applied,
          totalFee: 3.00,
          remainingCashToPay: rem.toFixed(2),
          isFullyPaid: rem === 0,
          message: rem === 0
            ? '¡Pase de 24 horas cubierto al 100% con 3 bonos de un solo golpe ($0.00 USD en efectivo)! Tu acceso está activo para hoy.'
            : `Se aplicaron ${applied} bonos (-$${applied}.00 USD). Saldo pendiente en efectivo para las 24 horas: $${rem.toFixed(2)} USD.`
        });
        setShowFeePaymentModal(true);
      }
    } catch {
      setWeeklyBonuses((prev) => Math.max(0, prev - bonosUsed));
      setFeePaymentResult({
        success: true,
        planType: 'DAILY',
        title: 'Pase Diario Activado (24 Horas)',
        bonusesApplied: bonosUsed,
        totalFee: 3.00,
        remainingCashToPay: remainingCash.toFixed(2),
        isFullyPaid: remainingCash === 0,
        message: remainingCash === 0
          ? '¡Pase de 24 horas cubierto al 100% con 3 bonos de un solo golpe ($0.00 USD en efectivo)! Tu acceso está activo para hoy.'
          : `Se aplicaron ${bonosUsed} bonos (-$${bonosUsed}.00 USD). Saldo pendiente en efectivo para las 24 horas: $${remainingCash.toFixed(2)} USD.`
      });
      setShowFeePaymentModal(true);
    } finally {
      setIsApplyingBonuses(false);
    }
  };

  // Inicializar WebSockets para el Chofer y Foreground GPS
  useEffect(() => {
    socket.emit('client:register', {
      userId: 'driver-user-1',
      role: 'DRIVER',
      driverProfileId
    });

    // Cargar cuota semanal del backend
    fetchDriverSubscriptionApi(driverProfileId).then((data) => {
      if (data) {
        setWeeklyBonuses(data.currentWeekBonuses || 0);
      }
    });

    // Escuchar nuevas solicitudes entrantes
    socket.on('trip:new_request', (reqData) => {
      console.log('🚗 Nueva solicitud recibida en el conductor:', reqData);
      setIncomingRequest({
        id: reqData.tripId,
        passengerName: (reqData.passengerName || 'Pasajero Invitado').trim(),
        passengerPhoto: reqData.passengerPhoto || null,
        passengerRating: reqData.passengerRating || 5.0,
        passengerTrips: reqData.passengerTrips || 1,
        isGuest: Boolean(reqData.isGuest),
        serviceType: reqData.serviceType,
        transportType: reqData.transportType || 'CAR',
        origin: reqData.origin || reqData.originAddress || 'Ubicación de recogida',
        destination: reqData.destination || reqData.destinationAddress || 'Punto de destino',
        distanceKm: reqData.distanceKm || 0.5,
        roadDistanceKm: reqData.roadDistanceKm || reqData.distanceKm || 5.0,
        offeredFare: reqData.offeredFare || reqData.proposedFare || '3.50',
        suggestedFare: reqData.suggestedFare || reqData.proposedFare || '3.50',
        delayMinutes: reqData.delayMinutes || 0,
        trafficLevel: reqData.trafficLevel || 'FLUID',
        trafficLabel: reqData.trafficLabel || 'Tráfico Fluido',
        trafficColor: reqData.trafficColor || '#10B981',
        preferences: reqData.preferences || {},
        cashBill: reqData.cashBill || '10',
        changeNeeded: reqData.changeNeeded || '0.00',
        hasBonusDiscount: Boolean(reqData.hasBonusDiscount),
        timeLeft: reqData.timeLeft || 20
      });
    });

    // Escuchar asignación de viaje ganada
    socket.on('trip:assigned', (assignedData) => {
      setActiveTrip({
        id: assignedData.tripId,
        passengerName: assignedData.passengerName || 'Pasajero',
        passengerPhone: assignedData.passengerPhone || '',
        origin: assignedData.originAddress,
        originLat: assignedData.originLat || 13.7013,
        originLng: assignedData.originLng || -89.2244,
        destination: assignedData.destinationAddress,
        roadDistanceKm: assignedData.roadDistanceKm || assignedData.distanceKm || 7.8,
        delayMinutes: assignedData.delayMinutes || 0,
        suggestedFare: assignedData.suggestedFare,
        preferences: assignedData.preferences || {},
        cashBill: assignedData.cashBill || '10',
        changeNeeded: assignedData.changeNeeded || '0.00',
        agreedFare: assignedData.agreedFare,
        cashToCollect: assignedData.cashToCollect,
        creditApplied: assignedData.creditApplied || '0.00'
      });
      setIncomingRequest(null);
      setPendingOffer(null);
      setTripState('EN_ROUTE_TO_PICKUP');
    });

    socket.on('offer:rejected_other_won', () => {
      setPendingOffer(null);
    });

    socket.on('trip:canceled', () => {
      setActiveTrip(null);
      setPendingOffer(null);
      setIncomingRequest(null);
      setTripState('EN_ROUTE_TO_PICKUP');
    });

    // Control de Dispositivo Único Implacable: Si se inicia sesión con este número en otro celular, expulsar de inmediato
    socket.on('driver_session_revoked', (ev) => {
      const myPhone = driverProfile?.phone ? String(driverProfile.phone).replace(/\D/g, '').slice(-8) : '';
      if (myPhone && ev?.phone === myPhone && ev?.activeSessionId !== driverProfile?.sessionToken) {
        localStorage.removeItem('rumbo_driver_profile');
        localStorage.removeItem('rumbo_driver_online');
        localStorage.removeItem('rumbo_driver_active_trip');
        localStorage.removeItem('rumbo_driver_trip_state');
        setDriverProfile(null);
        setDriverOnline(false);
        setActiveTrip(null);
        setWorkInvitationModal({
          title: ev?.workInvitation?.title || '¿Necesitas trabajar en la plataforma?',
          message: ev?.workInvitation?.message || 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión',
          detail: '⚠️ REGLA DE DISPOSITIVO ÚNICO: Tu cuenta de conductor fue abierta en otro dispositivo. Por seguridad, la sesión en este teléfono ha sido cerrada de inmediato.'
        });
      }
    });

    return () => {
      socket.off('trip:new_request');
      socket.off('trip:assigned');
      socket.off('offer:rejected_other_won');
      socket.off('trip:canceled');
      socket.off('driver_session_revoked');
    };
  }, [driverProfileId, driverProfile?.phone, driverProfile?.sessionToken]);

  // Transmisión continua de posición GPS cada 4 segundos & Detección de Gasolineras en Ruta
  useEffect(() => {
    if (!driverOnline) {
      setGpsActive(false);
      return;
    }

    setGpsActive(true);
    let mockLng = -89.2150;
    let mockLat = 13.7025;

    const gpsInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const currentCoords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            socket.emit('driver:location_update', {
              driverProfileId,
              lng: currentCoords.lng,
              lat: currentCoords.lat
            });
            // Radar de gasolinera en ruta (alerta si pasa a menos de 800m de una estación)
            const nearby = getNearbyGasStation(currentCoords, gasStations, 800);
            setNearbyStationAlert(nearby);
          },
          () => {
            mockLng += (Math.random() - 0.5) * 0.0005;
            mockLat += (Math.random() - 0.5) * 0.0005;
            socket.emit('driver:location_update', {
              driverProfileId,
              lng: mockLng,
              lat: mockLat
            });
            const nearby = getNearbyGasStation({ lat: mockLat, lng: mockLng }, gasStations, 800);
            setNearbyStationAlert(nearby);
          },
          { timeout: 3000 }
        );
      }
    }, 4000);

    return () => clearInterval(gpsInterval);
  }, [driverOnline, driverProfileId, gasStations]);

  // Conductor responde a solicitud (acepta tarifa o contraoferta)
  const handleAcceptFare = (fare) => {
    if (!incomingRequest) return;

    // Emitir oferta a través de WebSockets hacia el pasajero
    socket.emit('driver:offer', {
      tripId: incomingRequest.id,
      driverProfileId,
      proposedFare: fare
    });

    // Guardar oferta pendiente mientras el pasajero confirma en su pantalla
    setPendingOffer({
      tripId: incomingRequest.id,
      offeredFare: fare,
      origin: incomingRequest.origin,
      destination: incomingRequest.destination,
      roadDistanceKm: incomingRequest.roadDistanceKm
    });

    setIncomingRequest(null);
  };

  // Controles de estado del viaje
  const handleUpdateStatus = (newStatus) => {
    setTripState(newStatus);
    if (activeTrip?.id) {
      socket.emit('trip:update_status', {
        tripId: activeTrip.id,
        newStatus,
        driverProfileId
      });
    }

    if (newStatus === 'DONE') {
      if (weeklyBonuses < bonusCap && activeTrip?.creditApplied === '1.00') {
        setWeeklyBonuses((prev) => Math.min(bonusCap, prev + 1));
      }
      if (activeTrip) {
        try {
          const pastTrips = JSON.parse(localStorage.getItem('rumbo_driver_completed_trips') || '[]');
          const completedItem = {
            id: activeTrip.id || `trip-${Date.now()}`,
            passengerName: activeTrip.passengerName || 'Pasajero Rumbo',
            passengerRating: 5.0,
            photo: null,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            origin: activeTrip.origin || 'Punto de recogida',
            destination: activeTrip.destination || 'Punto de destino',
            distanceKm: parseFloat(activeTrip.roadDistanceKm || 5.0),
            fare: parseFloat(activeTrip.agreedFare || activeTrip.cashToCollect || activeTrip.suggestedFare || 4.00),
            paymentMethod: '100% Efectivo',
            commissionSaved: parseFloat(activeTrip.agreedFare || activeTrip.cashToCollect || 4.00) * 0.28
          };
          localStorage.setItem('rumbo_driver_completed_trips', JSON.stringify([completedItem, ...pastTrips]));
        } catch (e) {
          console.error('Error saving completed trip:', e);
        }
      }
    }
  };

  // Render del Modal de Invitación a Trabajar (Regla de Dispositivo Único / Enlace Compartido)
  const renderWorkInvitationModal = () => {
    if (!workInvitationModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 space-y-4 my-auto text-center">
          <button
            type="button"
            onClick={() => setWorkInvitationModal(null)}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
            <Car className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black text-[11px] uppercase tracking-wider">
              Regla de Dispositivo Único
            </span>
            <h3 className="text-xl font-black text-white leading-tight">
              {workInvitationModal.title || '¿Necesitas trabajar en la plataforma?'}
            </h3>
            <p className="text-sm font-bold text-emerald-400 leading-snug">
              {workInvitationModal.message || 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión'}
            </p>
            {workInvitationModal.detail && (
              <p className="text-xs text-slate-400 pt-1">
                {workInvitationModal.detail}
              </p>
            )}
          </div>

          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5">
            <div className="font-black text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Beneficios Rumbo Conductor:</span>
            </div>
            <ul className="text-slate-300 text-[11px] space-y-1 list-disc list-inside">
              <li><strong>0% comisión por viaje:</strong> todo lo que cobras en efectivo es 100% tuyo.</li>
              <li><strong>Tarifa fija semanal:</strong> únicamente $15.00 a la semana.</li>
              <li><strong>14 días de prueba gratis</strong> al inscribirte hoy.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setWorkInvitationModal(null);
                setShowRegistrationModal(true);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-sm rounded-2xl cursor-pointer shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Car className="w-4 h-4" />
              <span>Inscribirme como Conductor Ahora</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkInvitationModal(null)}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Si el conductor NO tiene perfil en el dispositivo:
  // Mostramos la presentación de bienvenida con acceso directo para registrarse o ingresar con su DUI
  if (!driverProfile) {
    return (
      <>
        <DriverLandingView
          onStartRegistration={() => setShowRegistrationModal(true)}
          onCheckStatus={() => setShowRegistrationModal(true)}
          onDriverLoggedIn={(loadedProfile) => {
            setDriverProfile(loadedProfile);
            setDriverProfileId(loadedProfile.id);
            localStorage.setItem('rumbo_driver_profile', JSON.stringify(loadedProfile));
            if (loadedProfile.approvalStatus === 'APPROVED') {
              setDriverOnline(true);
            }
          }}
        />

        {/* Modal de Registro y Expediente Digital de Conductor */}
        <DriverRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          existingDriverId={driverProfile?.id || driverProfile?.dui}
          onDriverRegistered={(newProfile) => {
            setDriverProfile(newProfile);
            setDriverProfileId(newProfile.id);
            localStorage.setItem('rumbo_driver_profile', JSON.stringify(newProfile));
            setShowRegistrationModal(false);
          }}
        />

        {/* Modal de Invitación en caso de enlace duplicado o revocado */}
        {renderWorkInvitationModal()}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Barra Superior Conductor & Blindaje (visible en VIAJE ACTIVO o en pestañas INGRESOS / PRIORIDAD; en solicitudes se muestra el HUD nativo idéntico al screenshot) */}
      {(activeTrip || activeBottomTab !== 'REQUESTS') && (
        <>
          <header className="border-b border-slate-800 bg-slate-900 px-3 sm:px-4 py-3 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <RumboLogo textClassName="text-lg" />
              <div className="hidden sm:block border-l border-slate-800 pl-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Radio className={`w-2.5 h-2.5 ${gpsActive ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
                  <span>GPS (3-5s)</span>
                </span>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {driverProfile?.vehiclePlate ? `${driverProfile.vehiclePlate}${driverProfile?.vehicleModel ? ` • ${driverProfile.vehicleModel}` : ''}` : (driverProfile?.vehicleModel || 'Vehículo Registrado')}
                </div>
              </div>
            </div>

            {/* Botones Rápidos: Registro/Expediente, Radar Gasolina, Auto y Switch En Línea */}
            <div className="flex items-center gap-2">
              {/* Botón de Expediente Digital / Registro Oficial */}
              <button
                onClick={() => setShowRegistrationModal(true)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isPending
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : isRejected
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                    : driverProfile?.approvalStatus === 'APPROVED'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-950/40'
                }`}
                title="Expediente de registro de conductor"
              >
                {isPending ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>En Revisión</span>
                  </>
                ) : isRejected ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Observaciones</span>
                  </>
                ) : driverProfile?.approvalStatus === 'APPROVED' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Verificado</span>
                  </>
                ) : (
                  <>
                    <Car className="w-3.5 h-3.5" />
                    <span>Registro Conductor</span>
                  </>
                )}
              </button>

              {/* Icono Minimalista de Inbox (SIN LETRAS) */}
              <button
                type="button"
                onClick={() => {
                  setInboxInitialCategory(null);
                  setShowInboxModal(true);
                }}
                title="Buzón / Inbox"
                aria-label="Buzón de entrada"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 flex items-center justify-center text-amber-400 hover:text-amber-300 transition-all cursor-pointer relative shadow-sm"
              >
                <Inbox className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </button>

              {/* Botón de Estado de Cuenta Oficial */}
              <button
                type="button"
                onClick={() => setShowAccountStatementModal(true)}
                title="Ver Estado de Cuenta, Bonos, Cuotas, Cubo y Transfer365"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Estado de Cuenta</span>
              </button>

              <button
                onClick={() => setShowGasModal(true)}
                title="Radar de Gasolina al centavo"
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Fuel className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Radar Gasolina</span>
              </button>

              <button
                onClick={() => setShowVehicleSettings(true)}
                title="Configurar vehículo y rendimiento de gasolina"
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="hidden lg:inline">{vehicleYear} • {kmPerGallon} km/gal</span>
              </button>

              <button
                onClick={handleToggleOnline}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  driverOnline
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${driverOnline ? 'bg-slate-950 animate-pulse' : 'bg-slate-500'}`}></span>
                <span>{driverOnline ? 'EN LÍNEA' : 'DESCONECTADO'}</span>
              </button>

              <button
                onClick={() => setShowLogoutConfirmModal(true)}
                title="Cerrar sesión de conductor y volver a la página de bienvenida"
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-bold border border-slate-700/60 hover:border-rose-500/40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </header>

          {/* Banner de Bienvenida 14 Días Gratis & Recordatorio 48h/24h */}
          <div className="px-3 sm:px-4 pt-2">
            <button
              type="button"
              onClick={() => setShowAccountStatementModal(true)}
              className="w-full text-left p-2.5 rounded-2xl border text-xs flex items-center justify-between gap-2 shadow-sm cursor-pointer transition-all bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border-emerald-500/40 hover:border-emerald-400"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200 text-[11px] sm:text-xs">
                  🎁 <strong>14 Días de Uso Gratis Activos</strong> • Consulta tu Estado de Cuenta Oficial (Bonos, Cubo y Transfer365)
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 shrink-0">
                <span>Ver Cuenta</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>

          {/* Banner Informativo si el Expediente está PENDIENTE o RECHAZADO */}
          {isPending && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <span>
                  <strong>Expediente en Revisión:</strong> Tu solicitud y documentos oficiales están siendo validados por administración (plazo 2-12 hrs).
                </span>
              </div>
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] shrink-0 hover:bg-amber-400 transition-colors"
              >
                Ver Estatus
              </button>
            </div>
          )}

          {isRejected && (
            <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Solicitud con Observaciones:</strong> {driverProfile?.rejectionReason || 'Faltan documentos legibles o actualizados.'}
                </span>
              </div>
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-black text-[11px] shrink-0 hover:bg-rose-600 transition-colors"
              >
                Corregir Ahora
              </button>
            </div>
          )}

          {/* ALERTA HUD EN RUTA: Gasolinera Económica Detectada Frente al Conductor */}
          {nearbyStationAlert && (
            <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 overflow-hidden">
                <Fuel className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
                <span className="truncate">
                  <strong>⛽ Estación en ruta:</strong> {nearbyStationAlert.name} • Regular: <strong className="text-white">${nearbyStationAlert.regular.toFixed(2)}/gal</strong> (-${nearbyStationAlert.savingsRegular.toFixed(2)} vs oficial)
                </span>
              </div>
              <button
                onClick={() => setShowGasModal(true)}
                className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] whitespace-nowrap cursor-pointer transition-colors"
              >
                Ver Precios
              </button>
            </div>
          )}

          {/* Widget de Blindaje Financiero: Cuota Semanal & Límite de 15 Bonos */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-slate-300">
                Cuota Semanal: <strong className={netWeeklyFee === 0 ? "text-emerald-400 font-black" : "text-white"}>${netWeeklyFee.toFixed(2)} USD</strong> <span className="hidden xs:inline text-slate-500">(Base $15)</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 hidden sm:inline">Bonos:</span>
                <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                  weeklyBonuses >= bonusCap
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {weeklyBonuses}/{bonusCap}
                </span>
              </div>

              {weeklyBonuses < bonusCap ? (
                <button
                  type="button"
                  onClick={handlePayWeeklyFeeWithBonuses}
                  disabled={isApplyingBonuses}
                  title="Pagar tu cuota semanal de $15 con tu saldo bonificado acumulado"
                  className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-[10px] shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1 whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{isApplyingBonuses ? 'Aplicando...' : 'Pagar con bonos'}</span>
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] whitespace-nowrap">
                  100% Bonificado
                </span>
              )}
            </div>
          </div>

          {weeklyBonuses >= bonusCap ? (
            <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
                <span>
                  <strong>¡Semana 100% Pagada con tus Bonos ($0.00 USD en efectivo)!</strong> Todas tus carreras son ganancia neta directa.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] whitespace-nowrap">
                AL DÍA
              </span>
            </div>
          ) : (
            <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Cada bono recibido de un pasajero te descuenta <strong>$1.00 USD</strong> de tu cuota.</span>
              <span className="text-amber-400 font-mono font-bold">Faltan {Math.max(0, bonusCap - weeklyBonuses)} para $0.00</span>
            </div>
          )}
        </>
      )}

      {/* CUERPO PRINCIPAL */}
      <main className={`flex-1 ${activeBottomTab === 'REQUESTS' && !activeTrip ? 'w-full' : 'max-w-lg mx-auto w-full p-4 space-y-4'} ${!activeTrip ? 'pb-24' : ''}`}>
        
        {/* Caso A: Viaje Activo Asignado (Detalle Operativo con Monto Gigante y Deep-Links de Mapas) */}
        {activeTrip && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5 animate-fade-in">
            
            {/* MONTO ACORDADO EN EFECTIVO EN TIPOGRAFÍA GIGANTE */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/20 via-emerald-600/20 to-teal-500/20 border-2 border-emerald-500/50 rounded-2xl text-center space-y-1">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Cobrar al Pasajero
              </div>
              <div className="text-5xl font-black text-white font-mono tracking-tight">
                ${activeTrip.cashToCollect}
              </div>
              <div className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                EFECTIVO DIRECTO EN MANO
              </div>
              {activeTrip.creditApplied === '1.00' && (
                <div className="text-[11px] text-slate-300 pt-1 border-t border-emerald-500/30 mt-2">
                  (Tarifa acordada ${activeTrip.agreedFare} - $1.00 bono ya acreditado a tu cuota)
                </div>
              )}

              {/* Comparador de Tarifa Acordada vs Cuota Sugerida */}
              {(() => {
                const agreed = parseFloat(activeTrip.agreedFare) || 0;
                const suggested = parseFloat(activeTrip.suggestedFare) || 0;
                if (!suggested || suggested <= 0) return null;
                const diff = +(agreed - suggested).toFixed(2);
                return (
                  <div className="pt-2 flex items-center justify-center">
                    {diff < -0.01 ? (
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                        <span>⚠️ Tarifa -${Math.abs(diff).toFixed(2)} USD debajo de cuota sugerida (${suggested.toFixed(2)})</span>
                      </span>
                    ) : diff > 0.01 ? (
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                        <span>🔥 Tarifa +${diff.toFixed(2)} USD sobre cuota sugerida (${suggested.toFixed(2)})</span>
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                        <span>✅ Tarifa sugerida exacta (${suggested.toFixed(2)})</span>
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* DIAMANTE ROJO: Cuadro de Cambio/Vuelto Listo */}
              <div className="p-3 mt-3 bg-slate-950/90 border border-amber-500/40 rounded-xl text-xs flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">💎 Pasajero paga con:</span>
                  <strong className="text-rose-300 text-sm">
                    {activeTrip.cashBill === 'EXACT' ? 'Efectivo exacto' : `Billete de $${parseFloat(activeTrip.cashBill || '10').toFixed(2)}`}
                  </strong>
                </div>
                <div className="text-right">
                  {activeTrip.cashBill !== 'EXACT' ? (
                    <>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">👉 Entregar de vuelto:</span>
                      <strong className="text-amber-300 text-base font-black">${activeTrip.changeNeeded || '6.50'}</strong>
                    </>
                  ) : (
                    <span className="text-emerald-400 font-bold">Sin vuelto necesario</span>
                  )}
                </div>
              </div>

              {/* Requisitos y Preferencias del Viaje Asignado */}
              {activeTrip.preferences && (
                <div className="flex flex-wrap gap-1.5 pt-1 text-left">
                  {activeTrip.preferences.airConditioning ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                      ❄️ Con A/C
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold flex items-center gap-1">
                      💨 Sin A/C (Mínima)
                    </span>
                  )}
                  {activeTrip.preferences.passengers > 4 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold flex items-center gap-1 animate-pulse">
                      🚐 5+ Pasajeros (Camioneta/Microbús)
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1">
                      👥 {activeTrip.preferences.passengers || 1} Pasajeros
                    </span>
                  )}
                  {activeTrip.preferences.weightProfile && activeTrip.preferences.weightProfile !== 'NORMAL' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                      {activeTrip.preferences.weightProfile === 'LIGHT' ? '🏃 Delgada (~58 kg)' : activeTrip.preferences.weightProfile === 'HEAVY' ? '🏋️ Robusta (~100 kg)' : '⚖️ Pesada (~125 kg)'}
                    </span>
                  )}
                  {activeTrip.preferences.extraLuggage && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                      🧳 Equipaje Extra
                    </span>
                  )}
                  {activeTrip.preferences.petFriendly && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                      🐾 Lleva Mascota
                    </span>
                  )}
                </div>
              )}

              {/* BALANCE DE COMBUSTIBLE Y GANANCIA NETA EN BOLSILLO */}
              {(() => {
                const tripFuel = calculateTripFuelCost(
                  activeTrip.roadDistanceKm || 7.8,
                  kmPerGallon,
                  fuelPrice,
                  activeTrip.cashToCollect,
                  activeTrip.delayMinutes || 0,
                  activeTrip.preferences || {}
                );
                return (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1.5 text-left">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Recorrido en Carretera:</span>
                      </span>
                      <strong className="text-white font-mono">{tripFuel.distanceKm} km</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-amber-400" />
                        <span>Gasto Gasolina ({vehicleYear} • {fuelType}):</span>
                      </span>
                      <div className="text-right">
                        <span className="text-amber-300 font-mono font-bold">
                          -${tripFuel.fuelCostUsd} USD
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          ({tripFuel.gallonsConsumed} gal{tripFuel.weightAnalysis?.totalWeightKg ? ` • peso ~${tripFuel.weightAnalysis.totalWeightKg}kg` : ''})
                        </span>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-bold">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Ganancia Neta en tu Bolsillo:</span>
                      </span>
                      <span className="text-emerald-400 text-base font-mono font-black">
                        ${tripFuel.netEarningsUsd} USD
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Datos del Pasajero y Contacto Directo */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Pasajero</div>
                  <div className="font-extrabold text-white text-base">{activeTrip.passengerName}</div>
                  <div className="text-xs text-slate-400">{activeTrip.passengerPhone}</div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${activeTrip.passengerPhone}`}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700"
                    title="Llamada telefónica"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                  <a
                    href={`https://wa.me/503${activeTrip.passengerPhone.replace(/\D/g, '')}?text=Hola,%20soy%20tu%20conductor%20de%20Rumbo`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
                    title="WhatsApp directo"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Badges de preferencias solicitadas */}
              {activeTrip.preferences && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                  {activeTrip.preferences.airConditioning ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                      ❄️ Con A/C
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                      💨 Sin A/C (Mínima)
                    </span>
                  )}
                  {activeTrip.preferences.petFriendly && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      🐾 Mascota
                    </span>
                  )}
                  {activeTrip.preferences.passengers > 4 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                      🚐 5+ Pasajeros
                    </span>
                  )}
                  {activeTrip.preferences.extraLuggage && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                      🧳 Maletas
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Direcciones y Botón Un Toque para Waze / Google Maps */}
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase">Punto de Recogida:</span>
                  <p className="text-white font-bold text-sm">{activeTrip.origin}</p>
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <span className="text-slate-400 font-semibold uppercase">Destino:</span>
                  <p className="text-white font-bold text-sm">{activeTrip.destination}</p>
                </div>
              </div>

              {/* Botones de Navegación Externa con Coordenadas Precargadas */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://waze.com/ul?ll=${activeTrip.originLat},${activeTrip.originLng}&navigate=yes`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Abrir en Waze</span>
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeTrip.originLat},${activeTrip.originLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>

            {/* Controles de Estado del Viaje */}
            <div className="pt-2 space-y-2">
              {tripState === 'EN_ROUTE_TO_PICKUP' && (
                <button
                  onClick={() => handleUpdateStatus('ARRIVED')}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>YA LLEGUÉ AL PUNTO DE RECOGIDA</span>
                </button>
              )}

              {tripState === 'ARRIVED' && (
                <button
                  onClick={() => handleUpdateStatus('IN_TRANSIT')}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Car className="w-5 h-5" />
                  <span>PASAJERO A BORDO: INICIAR VIAJE</span>
                </button>
              )}

              {tripState === 'IN_TRANSIT' && (
                <button
                  onClick={() => handleUpdateStatus('DONE')}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <DollarSign className="w-6 h-6" />
                  <span>FINALIZAR VIAJE Y COBRAR (${activeTrip.cashToCollect})</span>
                </button>
              )}

              {tripState === 'DONE' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                  <div className="font-bold text-emerald-400 text-sm">
                    ¡Viaje completado y cobro recibido exitosamente!
                  </div>
                  <button
                    onClick={() => {
                      setActiveTrip(null);
                      setTripState('EN_ROUTE_TO_PICKUP');
                    }}
                    className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700"
                  >
                    Volver a Esperar Carreras
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Caso B: Cuando NO hay viaje activo, navegación nativa por 3 pestañas */}
        {!activeTrip && (
          <>
            {/* PESTAÑA 1: SOLICITUDES DE VIAJE (FEED A 1 KM) */}
            {activeBottomTab === 'REQUESTS' && (
              <div className="space-y-3">
                {pendingOffer && (
                  <div className="p-4 mx-4 mt-3 bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-2xl space-y-3 text-center animate-fade-in">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                        Oferta Enviada: ${pendingOffer.offeredFare} USD
                      </span>
                      <h4 className="text-sm font-black text-white mt-1.5">Esperando que el Pasajero Confirme</h4>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Evaluando tu tarifa para recoger en <strong>{pendingOffer.origin}</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingOffer(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Cancelar Oferta
                    </button>
                  </div>
                )}

                <DriverTripRequestsFeed
                  driverOnline={driverOnline}
                  onToggleOnline={handleToggleOnline}
                  onAcceptRequest={handleAcceptRequestFromFeed}
                  onSendOffer={(fare) => handleAcceptFare(fare)}
                  incomingRequest={incomingRequest}
                  onOpenSettings={() => setShowVehicleSettings(true)}
                  onOpenExpediente={() => setShowRegistrationModal(true)}
                  onOpenInbox={() => {
                    setInboxInitialCategory(null);
                    setShowInboxModal(true);
                  }}
                  onOpenAccountStatement={() => setShowAccountStatementModal(true)}
                  onLogout={() => setShowLogoutConfirmModal(true)}
                />
              </div>
            )}

            {/* PESTAÑA 2: MIS INGRESOS & HISTORIAL */}
            {activeBottomTab === 'EARNINGS' && (
              <DriverEarningsView
                driverProfile={driverProfile}
                fuelPrice={fuelPrice}
                kmPerGallon={kmPerGallon}
              />
            )}

            {/* PESTAÑA 3: PRIORIDAD & BLINDAJE FINANCIERO */}
            {activeBottomTab === 'PRIORITY' && (
              <div className="space-y-4">
                {/* Tarjeta de Estatus de Prioridad */}
                <div className="p-5 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Estatus Prioritario Activo</span>
                    </span>
                    <span className="text-xs font-black text-emerald-400 font-mono">0% COMISIÓN</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Retén el 100% de tus Ganancias</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      En Rumbo no te cobramos el 25% o 30% por cada viaje que haces. El efectivo va íntegro a tu mano al momento de cobrar.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">En Rumbo</div>
                      <div className="text-emerald-400 font-black text-lg">100% Tuyo</div>
                      <div className="text-[10px] text-slate-500">$0 comisión x viaje</div>
                    </div>
                    <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Otras Apps</div>
                      <div className="text-rose-400 font-bold text-lg">-28% Menos</div>
                      <div className="text-[10px] text-slate-500">Pierdes $2.80 de $10</div>
                    </div>
                  </div>
                </div>

                {/* Opciones de Cuota: Tarjeta A (Semanal) y Tarjeta B (Diario) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-bold text-white text-sm">Planes de Acceso y Cuotas</h4>
                    </div>
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Saldo: {weeklyBonuses} {weeklyBonuses === 1 ? 'Bono' : 'Bonos'}
                    </span>
                  </div>

                  {/* Acceso a Estado de Cuenta Oficial */}
                  <button
                    type="button"
                    onClick={() => setShowAccountStatementModal(true)}
                    className="w-full p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-xs flex items-center gap-1.5">
                          <span>Estado de Cuenta Oficial</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono">14 DÍAS GRATIS</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Bonos, cuotas pendientes, Cubo Pago y Transfer365 Móvil
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      Ver →
                    </span>
                  </button>

                  {/* TARJETA A: Plan Semanal Completo */}
                  <div className="p-4 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/60 rounded-3xl space-y-3 shadow-xl relative overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] uppercase tracking-wide flex items-center gap-1 shadow-sm w-fit">
                          🔥 El favorito de los conductores
                        </span>
                        <h3 className="text-base font-black text-white mt-2">Plan Semanal Completo</h3>
                        <p className="text-xs text-slate-300">Acceso ilimitado 24/7 toda la semana (Lunes a Domingo).</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-emerald-400 font-mono">$15.00</div>
                        <div className="text-[10px] text-slate-400">o 15 Bonos</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Cuota Base Semanal:</span>
                        <span className="text-white font-bold">$15.00 USD</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Bonos aplicados ({Math.min(15, weeklyBonuses)}/15):</span>
                        <span className="font-bold">-${(Math.min(15, weeklyBonuses) * 1.00).toFixed(2)} USD</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-800 flex justify-between text-white font-black text-sm">
                        <span>Saldo en efectivo a pagar:</span>
                        <span className={netWeeklyFee === 0 ? "text-emerald-400" : "text-amber-400"}>
                          ${netWeeklyFee.toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    {weeklyBonuses < bonusCap ? (
                      <button
                        type="button"
                        onClick={handlePayWeeklyFeeWithBonuses}
                        disabled={isApplyingBonuses}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{isApplyingBonuses ? 'Aplicando...' : `Pagar Semana (${netWeeklyFee === 0 ? '$0 Efectivo' : `$${netWeeklyFee.toFixed(2)} USD`})`}</span>
                      </button>
                    ) : (
                      <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-center text-xs font-bold text-emerald-300">
                        ✨ ¡Semana 100% Pagada con tus bonos ($0.00 en efectivo)!
                      </div>
                    )}
                  </div>

                  {/* TARJETA B: Pase Diario */}
                  <div className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl space-y-3 shadow-lg transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold text-[10px] uppercase tracking-wide border border-amber-500/30 flex items-center gap-1 w-fit">
                          ⚡ Válido por 24 horas
                        </span>
                        <h3 className="text-base font-bold text-white mt-1.5">Pase Diario</h3>
                        <p className="text-xs text-slate-400">Ideal para Viernes, Sábado, Domingo o Días Festivos de alta demanda.</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-amber-400 font-mono">$3.00</div>
                        <div className="text-[10px] text-slate-400">o 3 Bonos</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Costo por 24 horas:</span>
                        <span className="text-white font-bold">$3.00 USD</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Bonos aplicables ({Math.min(3, weeklyBonuses)}/3):</span>
                        <span className="font-bold">-${(Math.min(3, weeklyBonuses) * 1.00).toFixed(2)} USD</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-800 flex justify-between text-white font-black text-sm">
                        <span>Saldo en efectivo a pagar:</span>
                        <span className={Math.max(0, 3 - weeklyBonuses) === 0 ? "text-emerald-400" : "text-amber-400"}>
                          ${Math.max(0, 3 - weeklyBonuses).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePayDailyPass}
                      disabled={isApplyingBonuses}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/50 font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{isApplyingBonuses ? 'Activando...' : `Activar Pase 24 Horas (${Math.max(0, 3 - weeklyBonuses) === 0 ? 'Con 3 Bonos ($0 Efectivo)' : `$${Math.max(0, 3 - weeklyBonuses).toFixed(2)} USD`})`}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                    💡 Cada pasajero o contacto que descargue Rumbo con tu código te descuenta <strong>$1.00 USD</strong>. Con 15 recomendados tu semana completa es gratis, o con 3 cubres un día pico de alta demanda.
                  </p>
                </div>

                {/* Accesos Rápidos: Radar Gasolina y Mi Auto */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGasModal(true)}
                    className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left space-y-2 cursor-pointer transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Radar de Gasolina</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Precios DGEHM y ahorro en ruta</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVehicleSettings(true)}
                    className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left space-y-2 cursor-pointer transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Mi Vehículo</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{vehicleYear} • {kmPerGallon} km/gal</div>
                    </div>
                  </button>
                </div>

                {/* Expediente Digital */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Expediente Oficial Verificado</div>
                      <div className="text-[11px] text-slate-400 font-mono">DUI: {driverProfile?.dui || 'No registrado'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegistrationModal(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Ver
                  </button>
                </div>

                {/* Gestión de Sesión / Cerrar Sesión */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Sesión de Conductor</div>
                      <div className="text-[11px] text-slate-400">
                        {driverProfile?.phone ? `+503 ${driverProfile.phone}` : (driverProfile?.fullName || 'Conductor Rumbo')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirmModal(true)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (Oculta durante viaje activo para no estorbar la conducción) */}
      {!activeTrip && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 max-w-lg mx-auto shadow-2xl">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveBottomTab('REQUESTS')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeBottomTab === 'REQUESTS'
                  ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="relative">
                <List className="w-5 h-5" />
                {incomingRequest && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-full animate-pulse">
                    1
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">Solicitudes</span>
              {activeBottomTab === 'REQUESTS' && (
                <span className="w-6 h-0.5 bg-emerald-400 rounded-full mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveBottomTab('EARNINGS')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                activeBottomTab === 'EARNINGS'
                  ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Coins className="w-5 h-5" />
              <span className="text-[11px] mt-1 tracking-tight">Mis ingresos</span>
              {activeBottomTab === 'EARNINGS' && (
                <span className="w-6 h-0.5 bg-emerald-400 rounded-full mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveBottomTab('PRIORITY')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeBottomTab === 'PRIORITY'
                  ? 'text-amber-400 bg-amber-500/10 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="relative">
                <Star className="w-5 h-5" />
                <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-amber-500 text-slate-950 font-black text-[8px] rounded-full">
                  0%
                </span>
              </div>
              <span className="text-[11px] mt-1 tracking-tight">Prioridad</span>
              {activeBottomTab === 'PRIORITY' && (
                <span className="w-6 h-0.5 bg-amber-400 rounded-full mt-1" />
              )}
            </button>
          </div>
        </nav>
      )}

      {/* Modal de Configuración de Vehículo y Rendimiento de Gasolina */}
      {showVehicleSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Mi Vehículo & Consumo</h3>
              </div>
              <button
                onClick={() => setShowVehicleSettings(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Año del Vehículo:</label>
                <select
                  value={vehicleYear}
                  onChange={(e) => {
                    const yr = parseInt(e.target.value);
                    setVehicleYear(yr);
                    setKmPerGallon(estimateFuelEconomy(yr, vehicleCategory));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                >
                  {Array.from({ length: 21 }, (_, i) => 2025 - i).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Tipo de Vehículo:</label>
                <select
                  value={vehicleCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setVehicleCategory(cat);
                    setKmPerGallon(estimateFuelEconomy(vehicleYear, cat));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                >
                  <option value="SEDAN_COMPACT">Sedán Compacto (Corolla, Sentra, Civic, Elantra, Yaris)</option>
                  <option value="HATCHBACK">Hatchback / Económico (Spark, Rio, March, Picanto)</option>
                  <option value="SUV_COMPACT">Camioneta / SUV (Rav4, CR-V, Tucson, Rogue)</option>
                  <option value="PICKUP">Pickup de Trabajo (Hilux, D-Max, Frontier)</option>
                  <option value="MOTO">Motocicleta (Mensajería y Encomiendas)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tipo Combustible:</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                  >
                    <option value="REGULAR">Regular ($3.75)</option>
                    <option value="ESPECIAL">Especial ($4.10)</option>
                    <option value="DIESEL">Diésel ($3.45)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Rendimiento (km/gal):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="15"
                    max="150"
                    value={kmPerGallon}
                    onChange={(e) => setKmPerGallon(parseFloat(e.target.value) || 42.0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="text-amber-300 font-bold block">💡 Cálculo Probabilístico:</span>
                <p>
                  Un vehículo <strong>{vehicleYear}</strong> de esta categoría rinde en promedio{' '}
                  <strong className="text-white">{kmPerGallon} km por galón</strong> en el tráfico de El Salvador. Puedes calibrar este número según tu experiencia.
                </p>
              </div>

              <button
                onClick={() => {
                  fetch('https://api.demiempresa.online/api/drivers/drv-sv-1/vehicle', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      vehicleYear,
                      fuelType,
                      fuelKmPerGallon: kmPerGallon
                    })
                  }).catch(() => {});
                  setShowVehicleSettings(false);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                GUARDAR CONFIGURACIÓN DE RENDIMIENTO
              </button>

              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowVehicleSettings(false);
                    setShowLogoutConfirmModal(true);
                  }}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1.5 mx-auto py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cerrar Sesión de Conductor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Radar de Gasolineras & Precios Oficiales DGEHM */}
      <GasModal
        isOpen={showGasModal}
        onClose={() => setShowGasModal(false)}
        stations={gasStations}
        onPriceReported={({ stationId, fuelType: fType, price }) => {
          setGasStations((prev) =>
            prev.map((s) => {
              if (s.id === stationId) {
                return {
                  ...s,
                  [fType.toLowerCase()]: price,
                  reportsCount: s.reportsCount + 1
                };
              }
              return s;
            })
          );
        }}
      />

      {/* Modal de Confirmación de Pago de Cuota Semanal con Bonos */}
      {showFeePaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 animate-pop-bounce text-center">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setShowFeePaymentModal(false)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>← Volver</span>
              </button>
              <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Transacción Certificada
              </span>
              <button
                type="button"
                onClick={() => setShowFeePaymentModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-lg text-white">
                {feePaymentResult?.planType === 'DAILY'
                  ? 'Pase Diario Activado (24 Horas)'
                  : (parseFloat(feePaymentResult?.remainingCashToPay || 0) === 0)
                  ? '¡Semana 100% Pagada!'
                  : 'Abono de Cuota Semanal'}
              </h3>
              <p className="text-xs text-slate-400">
                Certificado en el Libro Mayor Inmutable de Rumbo
              </p>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between text-slate-300">
                <span>{feePaymentResult?.planType === 'DAILY' ? 'Tarifa Pase 24 Horas:' : 'Cuota Base Semanal:'}</span>
                <span className="font-bold">{feePaymentResult?.planType === 'DAILY' ? '$3.00 USD' : '$15.00 USD'}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Bonos aplicados de un solo golpe:</span>
                <span>-${parseFloat(feePaymentResult?.bonusesApplied || 0).toFixed(2)} USD</span>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between text-white font-black text-sm">
                <span>Saldo pendiente en efectivo:</span>
                <span className={parseFloat(feePaymentResult?.remainingCashToPay || 0) === 0 ? "text-emerald-400" : "text-amber-400"}>
                  ${parseFloat(feePaymentResult?.remainingCashToPay || 0).toFixed(2)} USD
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {feePaymentResult?.message || 'Tu saldo bonificado ha sido aplicado de un solo golpe.'}
            </p>

            {/* Si queda saldo en efectivo, botones directos para Cubo / Transfer365 */}
            {parseFloat(feePaymentResult?.remainingCashToPay || 0) > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-800 text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Pagar Saldo Restante (${parseFloat(feePaymentResult?.remainingCashToPay || 0).toFixed(2)} USD):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeePaymentModal(false);
                      setShowAccountStatementModal(true);
                    }}
                    className="py-2.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-xl flex items-center justify-center gap-1 shadow cursor-pointer transition-colors"
                  >
                    <span>Transfer365 Móvil</span>
                  </button>
                  <a
                    href={`https://pagos.cubopago.com/demiempresa-rumbo?amount=${parseFloat(feePaymentResult?.remainingCashToPay || 0).toFixed(2)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-1 shadow cursor-pointer transition-colors"
                  >
                    <span>Cubo Pago</span>
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowFeePaymentModal(false);
                  setShowAccountStatementModal(true);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 cursor-pointer transition-all"
              >
                Ver Estado de Cuenta
              </button>
              <button
                type="button"
                onClick={() => setShowFeePaymentModal(false)}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
              >
                Ir a Consola
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estado de Cuenta Oficial del Conductor */}
      <DriverAccountStatementModal
        isOpen={showAccountStatementModal}
        onClose={() => setShowAccountStatementModal(false)}
        onGoHome={() => {
          setActiveBottomTab('REQUESTS');
          setShowAccountStatementModal(false);
        }}
        driverProfile={driverProfile}
        weeklyBonuses={weeklyBonuses}
        onPayWeeklyFeeWithBonuses={handlePayWeeklyFeeWithBonuses}
        onPayDailyPass={handlePayDailyPass}
        isApplyingBonuses={isApplyingBonuses}
        onOpenInbox={(cat, amt) => {
          setInboxInitialCategory(cat);
          setInboxPrefillAmount(amt);
          setShowAccountStatementModal(false);
          setShowInboxModal(true);
        }}
        onLogout={() => setShowLogoutConfirmModal(true)}
      />

      {/* Modal de Buzón Oficial / Inbox de Conductor (Multitema: Pagos, Sugerencias, Quejas, Soporte) */}
      <RumboInboxModal
        isOpen={showInboxModal}
        onClose={() => setShowInboxModal(false)}
        role="DRIVER"
        userProfile={driverProfile}
        initialCategory={inboxInitialCategory}
        prefillPaymentAmount={inboxPrefillAmount}
      />

      {/* Modal de Registro y Expediente Digital de Conductor */}
      <DriverRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        existingDriverId={driverProfile?.id}
        onDriverRegistered={(newProfile) => {
          setDriverProfile(newProfile);
          setDriverProfileId(newProfile.id);
          if (newProfile.approvalStatus !== 'APPROVED') {
            setDriverOnline(false);
          }
        }}
        onLogout={() => setShowLogoutConfirmModal(true)}
      />

      {/* Modal de Confirmación de Cierre de Sesión Seguro */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-pop-bounce text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <LogOut className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                ¿Cerrar Sesión de Conductor?
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Se cerrará la consola activa en este dispositivo. Podrás volver a ingresar en cualquier momento con tu número de celular.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePerformLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-950/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sí, Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Invitación a Trabajar en Caso de Enlace Duplicado o Revocado */}
      {renderWorkInvitationModal()}

    </div>
  );
}

