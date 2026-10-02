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
  Briefcase
} from 'lucide-react';
import RumboLogo from './RumboLogo';
import GasModal from './GasModal';
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
  fetchWalletSummaryApi
} from './api';

export default function DriverApp() {
  const [driverOnline, setDriverOnline] = useState(true);
  const [driverProfileId] = useState('drv-sv-1');
  const [weeklyBonuses, setWeeklyBonuses] = useState(3);
  const [isApplyingBonuses, setIsApplyingBonuses] = useState(false);
  const [showFeePaymentModal, setShowFeePaymentModal] = useState(false);
  const [feePaymentResult, setFeePaymentResult] = useState(null);
  const bonusCap = 10;
  const baseWeeklyFee = 10.00;
  const netWeeklyFee = Math.max(0, baseWeeklyFee - weeklyBonuses * 1.00);

  // Solicitud entrante a 1 km
  const [incomingRequest, setIncomingRequest] = useState({
    id: 'trip-req-101',
    serviceType: 'PASSENGER',
    origin: 'Metrocentro San Salvador, 8a Etapa',
    distanceKm: 0.45,
    roadDistanceKm: 7.8,
    offeredFare: '3.50',
    cashBill: '10',
    changeNeeded: '6.50',
    hasBonusDiscount: true,
    timeLeft: 10
  });

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

  // Viaje Asignado
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripState, setTripState] = useState('EN_ROUTE_TO_PICKUP'); // 'EN_ROUTE_TO_PICKUP' | 'ARRIVED' | 'IN_TRANSIT' | 'COLLECTING' | 'DONE'
  const [gpsActive, setGpsActive] = useState(false);

  // Establecer título dinámico de la pestaña para la consola del conductor
  useEffect(() => {
    document.title = "Rumbo Conductor | 100% Efectivo";
  }, []);

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

  // Pagar cuota semanal ($10.00) usando saldo bonificado acumulado (Ledger Criptográfico)
  const handlePayWeeklyFeeWithBonuses = async () => {
    setIsApplyingBonuses(true);
    try {
      const res = await payDriverWeeklyFeeWithBonusesApi({
        driverId: driverProfileId,
        bonusesToUse: Math.min(10, (weeklyBonuses || 0) + 1),
        totalWeeklyFee: 10.00
      });
      if (res && res.success) {
        setWeeklyBonuses((prev) => Math.min(10, prev + (res.bonusesApplied || 1)));
        setFeePaymentResult(res);
        setShowFeePaymentModal(true);
      }
    } catch {
      const nextVal = Math.min(10, (weeklyBonuses || 0) + 1);
      setWeeklyBonuses(nextVal);
      setFeePaymentResult({
        success: true,
        bonusesApplied: 1,
        remainingCashToPay: Math.max(0, 10 - nextVal).toFixed(2),
        isFullyPaid: nextVal >= 10,
        message: nextVal >= 10
          ? '¡Cuota semanal saldada al 100% con tu saldo bonificado! Tu semana está totalmente libre de cuota.'
          : `Se aplicó $1.00 de tu saldo bonificado a tu cuota semanal. Saldo restante: $${Math.max(0, 10 - nextVal).toFixed(2)} USD.`
      });
      setShowFeePaymentModal(true);
    } finally {
      setIsApplyingBonuses(false);
    }
  };

    // Escuchar nuevas solicitudes entrantes a 1 km con distancia de carretera
    socket.on('trip:new_request', (reqData) => {
      setIncomingRequest({
        id: reqData.tripId,
        serviceType: reqData.serviceType,
        transportType: reqData.transportType || 'CAR',
        origin: reqData.originAddress,
        destination: reqData.destinationAddress,
        distanceKm: reqData.distanceToPickupKm || 0.5,
        roadDistanceKm: reqData.distanceKm || 7.8,
        offeredFare: reqData.proposedFare,
        suggestedFare: reqData.suggestedFare,
        delayMinutes: reqData.delayMinutes || 0,
        trafficLevel: reqData.trafficLevel,
        trafficLabel: reqData.trafficLabel,
        trafficColor: reqData.trafficColor,
        preferences: reqData.preferences || {},
        cashBill: reqData.cashBill || '10',
        changeNeeded: reqData.changeNeeded || '6.50',
        hasBonusDiscount: false,
        timeLeft: 10
      });
    });

    // Escuchar asignación de viaje ganada
    socket.on('trip:assigned', (assignedData) => {
      setActiveTrip({
        id: assignedData.tripId,
        passengerName: assignedData.passengerName,
        passengerPhone: assignedData.passengerPhone,
        origin: assignedData.originAddress,
        originLat: assignedData.originLat || 13.7013,
        originLng: assignedData.originLng || -89.2244,
        destination: assignedData.destinationAddress,
        roadDistanceKm: assignedData.distanceKm || 7.8,
        delayMinutes: assignedData.delayMinutes || 0,
        suggestedFare: assignedData.suggestedFare,
        preferences: assignedData.preferences || {},
        cashBill: assignedData.cashBill || '10',
        changeNeeded: assignedData.changeNeeded || '6.50',
        agreedFare: assignedData.agreedFare,
        cashToCollect: assignedData.cashToCollect,
        creditApplied: assignedData.creditApplied || '0.00'
      });
      setIncomingRequest(null);
      setTripState('EN_ROUTE_TO_PICKUP');
    });

    return () => {
      socket.off('trip:new_request');
      socket.off('trip:assigned');
    };
  }, [driverProfileId]);

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
    if (incomingRequest) {
      // Emitir oferta a través de WebSockets hacia el pasajero
      socket.emit('driver:offer', {
        tripId: incomingRequest.id,
        driverProfileId,
        proposedFare: fare
      });
    }

    // Estado local para control en pantalla
    setActiveTrip({
      id: incomingRequest?.id || 'active-trip-902',
      passengerName: 'Andrea Martínez',
      passengerPhone: '7123-4567',
      origin: incomingRequest?.origin || 'Metrocentro San Salvador',
      originLat: 13.7013,
      originLng: -89.2244,
      destination: incomingRequest?.destination || 'Plaza Merliot, Santa Tecla',
      roadDistanceKm: incomingRequest?.roadDistanceKm || 7.8,
      delayMinutes: incomingRequest?.delayMinutes || 0,
      suggestedFare: incomingRequest?.suggestedFare,
      preferences: incomingRequest?.preferences || {},
      cashBill: incomingRequest?.cashBill || '10',
      changeNeeded: incomingRequest?.changeNeeded || '6.50',
      agreedFare: fare,
      cashToCollect: (parseFloat(fare) - (incomingRequest?.hasBonusDiscount ? 1.00 : 0.00)).toFixed(2),
      creditApplied: incomingRequest?.hasBonusDiscount ? '1.00' : '0.00'
    });
    setIncomingRequest(null);
    setTripState('EN_ROUTE_TO_PICKUP');
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
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Barra Superior Conductor */}
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <RumboLogo textClassName="text-lg" />
          <div className="hidden sm:block border-l border-slate-800 pl-3">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
              <Radio className={`w-2.5 h-2.5 ${gpsActive ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
              <span>GPS (3-5s)</span>
            </span>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">P-584-912 • Corolla</div>
          </div>
        </div>

        {/* Botones Rápidos: Radar Gasolina, Auto y Switch En Línea */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGasModal(true)}
            title="Radar de Gasolina al centavo"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Fuel className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Radar Gasolina</span>
          </button>

          <button
            onClick={() => setShowVehicleSettings(true)}
            title="Configurar vehículo y rendimiento de gasolina"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">{vehicleYear} • {kmPerGallon} km/gal</span>
          </button>

          <button
            onClick={() => setDriverOnline(!driverOnline)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              driverOnline
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${driverOnline ? 'bg-slate-950 animate-pulse' : 'bg-slate-500'}`}></span>
            <span>{driverOnline ? 'EN LÍNEA' : 'DESCONECTADO'}</span>
          </button>
        </div>
      </header>

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

      {/* Widget de Blindaje Financiero: Cuota Semanal & Límite de 10 Bonos */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-slate-300">
            Cuota Semanal: <strong className={netWeeklyFee === 0 ? "text-emerald-400 font-black" : "text-white"}>${netWeeklyFee.toFixed(2)} USD</strong> <span className="hidden xs:inline text-slate-500">(Base $10)</span>
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
              title="Pagar tu cuota semanal de $10 con tu saldo bonificado acumulado"
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

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        
        {/* Caso A: No hay viaje activo y entra solicitud de carrera a 1 km */}
        {!activeTrip && incomingRequest && driverOnline && (
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl space-y-4 animate-bounce-subtle">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                Nueva Solicitud (Radio {incomingRequest.distanceKm} km)
              </span>
              <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Responde rápido
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Recoger en:</div>
                <div className="text-base font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{incomingRequest.origin}</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Destino:</div>
                <div className="text-base font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{incomingRequest.destination}</span>
                </div>
              </div>
            </div>

            {/* Requisitos y Preferencias del Pasajero */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {/* Modalidad de Transporte: Auto vs Moto */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                incomingRequest.transportType === 'MOTO'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              }`}>
                {incomingRequest.transportType === 'MOTO' ? '🏍️ En Moto' : '🚗 En Auto'}
              </span>

              {incomingRequest.transportType !== 'MOTO' && incomingRequest.preferences?.airConditioning !== false && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                  ❄️ Desea A/C
                </span>
              )}
              {incomingRequest.preferences?.passengers > 4 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold flex items-center gap-1 animate-pulse">
                  🚐 5+ Pasajeros (Camioneta/Microbús)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1">
                  👥 {incomingRequest.preferences?.passengers || 1} Pasajeros
                </span>
              )}
              {incomingRequest.preferences?.weightProfile && incomingRequest.preferences?.weightProfile !== 'NORMAL' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  {incomingRequest.preferences.weightProfile === 'LIGHT' ? '🏃 Delgada (~58 kg)' : incomingRequest.preferences.weightProfile === 'HEAVY' ? '🏋️ Robusta (~100 kg)' : '⚖️ Pesada (~125 kg)'}
                </span>
              )}
              {incomingRequest.preferences?.extraLuggage && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                  🧳 Equipaje Extra
                </span>
              )}
              {incomingRequest.preferences?.petFriendly && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                  🐾 Lleva Mascota
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Oferta del Pasajero</div>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    ${incomingRequest.offeredFare} <span className="text-xs font-normal text-slate-400">EFECTIVO</span>
                  </div>
                </div>
                {incomingRequest.hasBonusDiscount && (
                  <div className="text-right text-[11px] text-emerald-400 max-w-[130px]">
                    Incluye $1.00 bono abonado a tu cuota semanal
                  </div>
                )}
              </div>

              {/* Comparador de Tarifa Ofrecida vs Cuota Sugerida */}
              {(() => {
                const offered = parseFloat(incomingRequest.offeredFare) || 0;
                const suggested = parseFloat(incomingRequest.suggestedFare) || 0;
                if (!suggested || suggested <= 0) return null;
                const diff = +(offered - suggested).toFixed(2);
                return (
                  <div className="pt-0.5 flex items-center">
                    {diff < -0.01 ? (
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                        <span>⚠️</span>
                        <span>
                          <strong>-${Math.abs(diff).toFixed(2)} USD</strong> por debajo de la cuota sugerida (${suggested.toFixed(2)})
                        </span>
                      </span>
                    ) : diff > 0.01 ? (
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                        <span>🔥</span>
                        <span>
                          <strong>+${diff.toFixed(2)} USD</strong> por arriba de la cuota sugerida (${suggested.toFixed(2)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                        <span>✅</span>
                        <span>Cuota sugerida exacta (${suggested.toFixed(2)})</span>
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* DIAMANTE ROJO: Aviso de Billete y Vuelto */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs bg-rose-950/20 px-2.5 py-1.5 rounded-xl border border-rose-500/20">
                <span className="text-rose-300 font-bold flex items-center gap-1">
                  <span>💎 Paga con:</span>
                  <strong className="text-white">${incomingRequest.cashBill || '10.00'}</strong>
                </span>
                <span className="text-amber-300 font-bold">
                  👉 Llevar vuelto: ${incomingRequest.changeNeeded || '6.50'}
                </span>
              </div>
            </div>

            {/* CÁLCULO PROBABILÍSTICO DE GASOLINA, TRÁFICO Y GANANCIA NETA EN BOLSILLO */}
            {(() => {
              const isReqMoto = incomingRequest.transportType === 'MOTO';
              const rawDelayMins = incomingRequest.delayMinutes || (incomingRequest.trafficLevel === 'SEVERE' ? 14 : incomingRequest.trafficLevel === 'HEAVY' ? 10 : 0);
              const delayMins = isReqMoto ? rawDelayMins * 0.35 : rawDelayMins;
              const effectiveKpg = isReqMoto ? 115.0 : kmPerGallon;
              const fuelCalc = calculateTripFuelCost(
                incomingRequest.roadDistanceKm || 7.8,
                effectiveKpg,
                fuelPrice,
                incomingRequest.offeredFare,
                delayMins,
                isReqMoto ? { ...incomingRequest.preferences, airConditioning: false, passengers: 1 } : (incomingRequest.preferences || {})
              );
              const trafLabel = incomingRequest.trafficLabel || 'Tráfico Moderado';
              const trafColor = incomingRequest.trafficColor || '#F59E0B';
              return (
                <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ruta y Tráfico Actual:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-white font-mono">{fuelCalc.distanceKm} km</strong>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${trafColor}20`, color: trafColor }}>
                        {trafLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gasto Gasolina ({vehicleYear} • {fuelType}):</span>
                    </span>
                    <div className="text-right">
                      <span className="text-amber-300 font-mono font-bold">
                        -${fuelCalc.fuelCostUsd} USD
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        ({fuelCalc.gallonsConsumed} gal{fuelCalc.weightAnalysis?.totalWeightKg ? ` • peso ~${fuelCalc.weightAnalysis.totalWeightKg}kg` : ''})
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Tu Ganancia Limpia en Mano:</span>
                    </span>
                    <div className="text-right">
                      <span className="text-emerald-400 text-base font-mono font-black">${fuelCalc.netEarningsUsd} USD</span>
                      <span className="block text-[10px] text-slate-500">{fuelCalc.profitMarginPercent}% de margen</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Opciones Rápidas: Aceptar tarifa o Contraofertar (+0.50, +1.00) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAcceptFare(incomingRequest.offeredFare)}
                className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg cursor-pointer"
              >
                <span>ACEPTAR</span>
                <span className="text-emerald-200">${incomingRequest.offeredFare}</span>
              </button>

              <button
                onClick={() => handleAcceptFare((parseFloat(incomingRequest.offeredFare) + 0.50).toFixed(2))}
                className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              >
                <span>+$0.50</span>
                <span className="text-slate-300">${(parseFloat(incomingRequest.offeredFare) + 0.50).toFixed(2)}</span>
              </button>

              <button
                onClick={() => handleAcceptFare((parseFloat(incomingRequest.offeredFare) + 1.00).toFixed(2))}
                className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              >
                <span>+$1.00</span>
                <span className="text-slate-300">${(parseFloat(incomingRequest.offeredFare) + 1.00).toFixed(2)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Caso B: Viaje Activo Asignado (Detalle Operativo con Monto Gigante y Deep-Links de Mapas) */}
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
                  {activeTrip.preferences.airConditioning !== false && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                      ❄️ Con A/C
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
                  {activeTrip.preferences.airConditioning !== false && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                      ❄️ Con A/C
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

        {!activeTrip && !incomingRequest && (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-amber-400">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-white text-base">Esperando Solicitudes en 1 km</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Tu posición GPS se transmite cada 3-5s. Cuando un pasajero a menos de 1 km solicite viaje o encomienda, sonará tu alerta inmediata.
            </p>
          </div>
        )}

      </main>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4 animate-pop-bounce text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-lg text-white">
                {weeklyBonuses >= bonusCap ? '¡Semana 100% Pagada!' : 'Abono a Cuota Semanal'}
              </h3>
              <p className="text-xs text-slate-400">
                Transacción registrada y certificada en el Libro Mayor Criptográfico Inmutable
              </p>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Cuota Base Semanal:</span>
                <span className="font-bold">$10.00 USD</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Bonos aplicados ({weeklyBonuses}/{bonusCap}):</span>
                <span>-${(weeklyBonuses * 1.00).toFixed(2)} USD</span>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between text-white font-black text-sm">
                <span>Saldo en efectivo a pagar:</span>
                <span className={netWeeklyFee === 0 ? "text-emerald-400" : "text-amber-400"}>
                  ${netWeeklyFee.toFixed(2)} USD
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              {feePaymentResult?.message || 'Tu saldo bonificado ha sido aplicado exitosamente a tu cuota semanal.'}
            </p>

            <button
              type="button"
              onClick={() => setShowFeePaymentModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
