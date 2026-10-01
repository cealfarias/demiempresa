import React, { useState, useEffect } from 'react';
import {
  Car,
  Package,
  MapPin,
  Navigation,
  DollarSign,
  Clock,
  Phone,
  MessageCircle,
  Share2,
  CheckCircle,
  Megaphone,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Loader2,
  Play,
  Pause
} from 'lucide-react';
import AdModal from './AdModal';
import {
  socket,
  registerUserApi,
  fetchUserCreditsApi,
  fetchAdFeedApi
} from './api';

export default function ViajesApp() {
  // Máquina de Estados: 'DECOY_FORM' | 'AUCTION' | 'IN_TRIP_HUB'
  const [appState, setAppState] = useState('DECOY_FORM');
  const [serviceType, setServiceType] = useState('PASSENGER'); // 'PASSENGER' | 'PACKAGE'

  // Datos del Viaje
  const [origin, setOrigin] = useState('Metrocentro San Salvador');
  const [originCoords, setOriginCoords] = useState({ lat: 13.7013, lng: -89.2244 });
  const [destination, setDestination] = useState('Plaza Merliot, Santa Tecla');
  const [destinationCoords, setDestinationCoords] = useState({ lat: 13.6738, lng: -89.2789 });
  const [destinationMunicipality, setDestinationMunicipality] = useState('Santa Tecla');
  const [proposedFare, setProposedFare] = useState('3.50');
  const [packageDetails, setPackageDetails] = useState('');
  const [paymentTiming, setPaymentTiming] = useState('AT_ORIGIN');
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Perfil del Pasajero & Punto de Inflexión
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('demiempresa_passenger');
    return saved ? JSON.parse(saved) : null;
  });
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regDui, setRegDui] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [duiError, setDuiError] = useState('');
  const [registering, setRegistering] = useState(false);

  // Subasta y Ofertas (TTL 10s)
  const [activeOffers, setActiveOffers] = useState([]);
  const [pendingAcceptOffer, setPendingAcceptOffer] = useState(null);
  const [tripId, setTripId] = useState(null);

  // Viaje Asignado / Hub Comercial
  const [assignedTrip, setAssignedTrip] = useState(null);
  const [tripStatus, setTripStatus] = useState('DRIVER_EN_ROUTE');
  const [creditDiscountApplied, setCreditDiscountApplied] = useState(false);
  const [driverEtaMinutes, setDriverEtaMinutes] = useState(4);

  // Feed Publicitario B2B
  const [adFeed, setAdFeed] = useState([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlayingReel, setIsPlayingReel] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Establecer título dinámico de la pestaña del navegador para viajes
  useEffect(() => {
    document.title = "demiempresa.online | Viajes Directos & Envíos 100% Efectivo";
  }, []);

  // Inicializar Socket y Eventos
  useEffect(() => {
    if (userProfile?.id) {
      socket.emit('client:register', { userId: userProfile.id, role: 'PASSENGER' });
    }

    // Escuchar ofertas entrantes de conductores en tiempo real
    socket.on('passenger:offer_received', (offer) => {
      setActiveOffers((prev) => {
        const exists = prev.find((o) => o.driverProfileId === offer.driverProfileId);
        if (exists) return prev;
        return [...prev, { ...offer, timeLeft: offer.expiresInSeconds || 10 }];
      });
    });

    // Escuchar confirmación de viaje asignado
    socket.on('trip:confirmed', (data) => {
      setAssignedTrip((prev) => ({
        ...prev,
        ...data
      }));
      setAppState('IN_TRIP_HUB');
    });

    // Escuchar cambios de estado del viaje
    socket.on('trip:status_changed', ({ status }) => {
      if (status === 'ARRIVED') setTripStatus('DRIVER_ARRIVED');
      if (status === 'IN_TRANSIT') setTripStatus('IN_TRANSIT');
      if (status === 'COMPLETED') setTripStatus('COMPLETED');
    });

    return () => {
      socket.off('passenger:offer_received');
      socket.off('trip:confirmed');
      socket.off('trip:status_changed');
    };
  }, [userProfile]);

  // Cargar feed publicitario según municipio de destino
  useEffect(() => {
    if (appState === 'IN_TRIP_HUB') {
      fetchAdFeedApi(destinationMunicipality).then((creatives) => {
        if (creatives && creatives.length > 0) {
          setAdFeed(creatives);
        }
      });
    }
  }, [appState, destinationMunicipality]);

  // Formato estricto para DUI salvadoreño (00000000-0)
  const handleDuiChange = (e) => {
    let val = e.target.value.replace(/[^\d]/g, '');
    if (val.length > 9) val = val.slice(0, 9);
    if (val.length > 8) {
      val = `${val.slice(0, 8)}-${val.slice(8)}`;
    }
    setRegDui(val);
    if (val.length === 10) {
      setDuiError('');
    }
  };

  // Obtener geolocalización GPS real del dispositivo
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setOriginCoords({ lat: latitude, lng: longitude });
        setOrigin(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('Error GPS:', err.message);
        setOrigin('Mi Ubicación Actual');
        setIsGettingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 1. Iniciar Búsqueda (Fase Señuelo -> Subasta en 1 km)
  const handleSearchDrivers = (e) => {
    e.preventDefault();
    if (!origin || !destination) return;

    setAppState('AUCTION');

    const generatedTripId = `trip-${Date.now()}`;
    setTripId(generatedTripId);

    // Emitir solicitud al WebSocket Gateway
    socket.emit('trip:request', {
      passengerId: userProfile?.id || 'guest-passenger',
      serviceType,
      originAddress: origin,
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      destinationAddress: destination,
      destinationLat: destinationCoords.lat,
      destinationLng: destinationCoords.lng,
      destinationMunicipality,
      proposedFare: parseFloat(proposedFare).toFixed(2),
      packageDetails,
      paymentTiming
    });

    // Simulación complementaria de recepción de choferes dentro de 1 km
    setTimeout(() => {
      setActiveOffers((current) => {
        if (current.length > 0) return current;
        return [
          {
            driverProfileId: 'drv-sv-1',
            driverName: 'Carlos Mendoza',
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            vehiclePlate: 'P-584-912',
            vehicleModel: 'Toyota Corolla 2021',
            vehicleColor: 'Gris Plata',
            distanceMeters: 380,
            proposedFare: parseFloat(proposedFare).toFixed(2),
            timeLeft: 10
          },
          {
            driverProfileId: 'drv-sv-2',
            driverName: 'Roberto Henríquez',
            photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            vehiclePlate: 'P-910-334',
            vehicleModel: 'Nissan Versa 2020',
            vehicleColor: 'Blanco',
            distanceMeters: 620,
            proposedFare: (parseFloat(proposedFare) + 0.50).toFixed(2),
            timeLeft: 10
          }
        ];
      });
    }, 1800);
  };

  // Contador de TTL de 10 segundos para cada oferta activa
  useEffect(() => {
    if (appState !== 'AUCTION' || activeOffers.length === 0) return;

    const interval = setInterval(() => {
      setActiveOffers((prevOffers) =>
        prevOffers
          .map((offer) => ({
            ...offer,
            timeLeft: offer.timeLeft - 1
          }))
          .filter((offer) => offer.timeLeft > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [appState, activeOffers.length]);

  // Manejar Aceptación de Tarifa (Punto de Inflexión)
  const handleSelectOffer = (offer) => {
    if (!userProfile) {
      setPendingAcceptOffer(offer);
      setShowRegisterModal(true);
      return;
    }
    confirmOfferAssignment(offer);
  };

  // Confirmar Asignación Atómica
  const confirmOfferAssignment = (offer) => {
    const fare = parseFloat(offer.proposedFare);
    const hasCredit = true; // Crédito de $1.00 USD
    const discount = hasCredit ? 1.00 : 0.00;
    const cashToPay = Math.max(0.00, fare - discount);

    setCreditDiscountApplied(hasCredit);
    setAssignedTrip({
      driver: {
        name: offer.driverName,
        photo: offer.photoUrl,
        vehiclePlate: offer.vehiclePlate,
        vehicleModel: offer.vehicleModel,
        vehicleColor: offer.vehicleColor,
        phone: '7123-4567'
      },
      agreedFare: fare.toFixed(2),
      cashToPay: cashToPay.toFixed(2),
      origin,
      destination,
      destinationMunicipality,
      serviceType
    });

    // Enviar evento de aceptación atómica al servidor
    socket.emit('passenger:accept_offer', {
      tripId: tripId || 'trip-1',
      driverProfileId: offer.driverProfileId,
      agreedFare: fare.toFixed(2)
    });

    setAppState('IN_TRIP_HUB');
    setShowRegisterModal(false);
  };

  // Guardar datos en modal de inflexión (Registro con API)
  const handleSaveProfileAndAccept = async (e) => {
    e.preventDefault();
    if (!/^\d{8}-\d{1}$/.test(regDui)) {
      setDuiError('DUI inválido. Debe tener el formato estricto 00000000-0');
      return;
    }

    setRegistering(true);
    setDuiError('');

    try {
      const data = await registerUserApi({
        fullName: regFullName,
        phone: regPhone,
        dui: regDui,
        role: 'PASSENGER',
        referrerCode
      });

      const profile = {
        id: data.user?.id || `usr-${Date.now()}`,
        fullName: regFullName,
        dui: regDui,
        phone: regPhone,
        referrerCode
      };

      setUserProfile(profile);
      localStorage.setItem('demiempresa_passenger', JSON.stringify(profile));

      if (pendingAcceptOffer) {
        confirmOfferAssignment(pendingAcceptOffer);
      }
    } catch (err) {
      console.warn('Fallback local al registrar:', err.message);
      const fallbackProfile = {
        id: `usr-${Date.now()}`,
        fullName: regFullName,
        dui: regDui,
        phone: regPhone
      };
      setUserProfile(fallbackProfile);
      localStorage.setItem('demiempresa_passenger', JSON.stringify(fallbackProfile));
      if (pendingAcceptOffer) {
        confirmOfferAssignment(pendingAcceptOffer);
      }
    } finally {
      setRegistering(false);
    }
  };

  // Simulación del trayecto y ETA
  useEffect(() => {
    if (appState !== 'IN_TRIP_HUB') return;

    const tEta = setInterval(() => {
      setDriverEtaMinutes((prev) => (prev > 1 ? prev - 1 : 1));
    }, 25000);

    const tArrived = setTimeout(() => setTripStatus('DRIVER_ARRIVED'), 7000);
    const tTransit = setTimeout(() => setTripStatus('IN_TRANSIT'), 14000);

    return () => {
      clearInterval(tEta);
      clearTimeout(tArrived);
      clearTimeout(tTransit);
    };
  }, [appState]);

  // Compartir viaje en tiempo real
  const handleShareTrip = () => {
    const shareUrl = `https://viajes.demiempresa.online/track/${tripId || 'demo'}`;
    if (navigator.share) {
      navigator.share({
        title: 'Mi viaje en tiempo real - demiempresa.online',
        text: `Sigue mi viaje hacia ${destination} en el auto placa ${assignedTrip?.driver?.vehiclePlate}:`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Barra Superior Minimalista */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-950 text-lg">
            D
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight">demiempresa<span className="text-amber-400">.online</span></span>
            <span className="block text-[10px] text-slate-400 -mt-1">Viajes Directos & Envíos 100% Efectivo</span>
          </div>
        </div>

        {/* Micro-enlace de captación B2B siempre visible */}
        <button
          onClick={() => setShowAdModal(true)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">¿Tienes un negocio?</span>
          <span>Anúnciate aquí</span>
        </button>
      </header>

      {/* ============================================================== */}
      {/* FASE 1: SEÑUELO MINIMALISTA (Captura limpia y sin distracciones) */}
      {/* ============================================================== */}
      {appState === 'DECOY_FORM' && (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-center animate-fade-in">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            
            {/* Selector de Servicio: Pasajero vs Encomienda */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setServiceType('PASSENGER')}
                className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  serviceType === 'PASSENGER'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Viaje Pasajero</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceType('PACKAGE')}
                className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  serviceType === 'PACKAGE'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Envío Paquete</span>
              </button>
            </div>

            <form onSubmit={handleSearchDrivers} className="space-y-4">
              
              {/* Origen con botón GPS real */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Punto de Recogida (Origen)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="¿Dónde te recogen?"
                    className="w-full pl-3 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  />
                  <button
                    type="button"
                    title="Obtener ubicación GPS actual"
                    disabled={isGettingGps}
                    onClick={handleGetGpsLocation}
                    className="absolute right-2.5 top-2.5 p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {isGettingGps ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Destino</span>
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="¿A dónde vas?"
                  className="w-full px-3 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm mb-2"
                />

                {/* Municipio para geocerca publicitaria de destino */}
                <select
                  value={destinationMunicipality}
                  onChange={(e) => setDestinationMunicipality(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                >
                  <option value="Santa Tecla">Municipio: Santa Tecla</option>
                  <option value="San Salvador">Municipio: San Salvador</option>
                  <option value="Antiguo Cuscatlán">Municipio: Antiguo Cuscatlán</option>
                  <option value="Soyapango">Municipio: Soyapango</option>
                  <option value="Mejicanos">Municipio: Mejicanos</option>
                  <option value="Apopa">Municipio: Apopa</option>
                </select>
              </div>

              {/* Campos específicos si es envío de paquete */}
              {serviceType === 'PACKAGE' && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2.5 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">
                      Descripción del Paquete / Mercadería
                    </label>
                    <input
                      type="text"
                      required
                      value={packageDetails}
                      onChange={(e) => setPackageDetails(e.target.value)}
                      placeholder="Ej. Caja de zapatos, sobre con documentos, repuesto"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">
                      Momento del Cobro en Efectivo
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setPaymentTiming('AT_ORIGIN')}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          paymentTiming === 'AT_ORIGIN'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Cobro en Origen
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentTiming('ON_DELIVERY')}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          paymentTiming === 'ON_DELIVERY'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Contra Entrega
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Monto Ofrecido en Efectivo */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tu Oferta en Efectivo (USD)</span>
                  </span>
                  <span className="text-[11px] text-amber-400 font-normal">Tú propones la tarifa</span>
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-lg font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1.50"
                    required
                    value={proposedFare}
                    onChange={(e) => setProposedFare(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-extrabold text-xl focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  {['2.50', '3.00', '3.50', '4.50'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setProposedFare(amt)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold border ${
                        proposedFare === amt
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Beneficio de Referido 7+7 */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-400">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Bono de Bienvenida:</strong> Recibe $1.00 de descuento en tu próximo viaje si eres referido verificado.
                </span>
              </div>

              {/* Botón de Despacho (1 KM) */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>BUSCAR CONDUCTORES (RADIO 1 KM)</span>
                <ArrowRight className="w-5 h-5" />
              </button>

            </form>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* FASE SUBASTA EN VIVO: OFERTAS CON TTL ESTRICTO DE 10 SEGUNDOS */}
      {/* ============================================================== */}
      {appState === 'AUCTION' && (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4 animate-fade-in">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold">Buscando choferes a 1 km a la redonda...</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Tu oferta inicial: <strong>${proposedFare} USD</strong></span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveOffers([]);
                setAppState('DECOY_FORM');
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Ofertas de choferes en tiempo real</span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                TTL 10s por tarjeta
              </span>
            </div>

            {activeOffers.length === 0 ? (
              <div className="p-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto"></div>
                <p className="text-sm text-slate-300 font-medium">
                  Notificando a choferes activos dentro de 1 km...
                </p>
                <p className="text-xs text-slate-500">
                  Las ofertas de los conductores aparecerán aquí con una vigencia de 10 segundos exactos.
                </p>
              </div>
            ) : (
              activeOffers.map((offer) => (
                <div
                  key={offer.driverProfileId}
                  className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden transition-all"
                >
                  {/* Barra de progreso de TTL (10s exactos) */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(offer.timeLeft / 10) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <img
                        src={offer.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={offer.driverName}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                      />
                      <div>
                        <h4 className="font-bold text-white text-sm">{offer.driverName}</h4>
                        <div className="text-xs text-slate-400">
                          {offer.vehicleModel} • <span className="text-amber-300 font-bold">{offer.vehiclePlate}</span>
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          A {offer.distanceMeters || '400'} m de recogida
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Tarifa</div>
                      <div className="text-2xl font-black text-white">
                        ${offer.proposedFare}
                      </div>
                      <span className="text-[10px] text-rose-400 font-semibold">
                        Expira en {offer.timeLeft}s
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSelectOffer(offer)}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>ACEPTAR TARIFA</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* PUNTO DE INFLEXIÓN: MODAL DE VALIDACIÓN Y REGISTRO (DUI ÚNICO) */}
      {/* ============================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Confirmación de Seguridad</h3>
            </div>
            <p className="text-xs text-slate-400">
              Para garantizar seguridad y el pago directo en efectivo, requerimos tus datos oficiales una única vez.
            </p>

            <form onSubmit={handleSaveProfileAndAccept} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Ej. Juan Carlos García"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  DUI (El Salvador: 00000000-0)
                </label>
                <input
                  type="text"
                  required
                  value={regDui}
                  onChange={handleDuiChange}
                  placeholder="01234567-8"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                {duiError && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {duiError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Teléfono Móvil
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="7000-0000"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ¿Tienes código de referido? (Opcional)
                </label>
                <input
                  type="text"
                  value={referrerCode}
                  onChange={(e) => setReferrerCode(e.target.value)}
                  placeholder="DUI o código de quien te invitó"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2"
                >
                  {registering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <span>Confirmar y Viajar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FASE 2: HUB COMERCIAL POST-ACEPTACIÓN (En Espera y Trayecto)   */}
      {/* ============================================================== */}
      {appState === 'IN_TRIP_HUB' && assignedTrip && (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4 animate-fade-in flex flex-col">
          
          {/* BARRA SUPERIOR DE CONTROL OPERATIVO */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            
            {/* Estado del Conductor & ETA */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {tripStatus === 'DRIVER_EN_ROUTE' && `Conductor en camino • ETA: ~${driverEtaMinutes} min`}
                  {tripStatus === 'DRIVER_ARRIVED' && '¡El conductor ha llegado al punto!'}
                  {tripStatus === 'IN_TRANSIT' && 'En trayecto hacia el destino'}
                  {tripStatus === 'COMPLETED' && 'Viaje Finalizado'}
                </span>
              </div>

              <button
                onClick={handleShareTrip}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{copiedLink ? '¡Enlace copiado!' : 'Compartir'}</span>
              </button>
            </div>

            {/* Placa en Grande y Datos del Auto */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Placa del Vehículo</div>
                <div className="text-3xl font-black text-white tracking-widest bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 inline-block font-mono text-amber-400">
                  {assignedTrip.driver?.vehiclePlate || 'P-584-912'}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {assignedTrip.driver?.vehicleModel || 'Toyota Corolla'} • {assignedTrip.driver?.vehicleColor || 'Gris'}
                </div>
              </div>

              <div className="text-right">
                <img
                  src={assignedTrip.driver?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={assignedTrip.driver?.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500 shadow-md ml-auto"
                />
                <div className="text-xs font-bold text-white mt-1">
                  {assignedTrip.driver?.name || 'Carlos Mendoza'}
                </div>
              </div>
            </div>

            {/* MONTO EN EFECTIVO GIGANTE */}
            <div className="p-3.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-300">TOTAL EN EFECTIVO A PAGAR</div>
                {creditDiscountApplied && (
                  <div className="text-[10px] text-emerald-400">
                    Bono de referido de $1.00 USD aplicado con éxito
                  </div>
                )}
              </div>
              <div className="text-3xl font-black text-white font-mono">
                ${assignedTrip.cashToPay} <span className="text-xs font-medium text-slate-400 font-sans">USD</span>
              </div>
            </div>

            {/* Botones de Contacto Directo */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${assignedTrip.driver?.phone || '70000000'}`}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Llamar al Chofer</span>
              </a>
              <a
                href={`https://wa.me/503${(assignedTrip.driver?.phone || '70000000').replace(/\D/g, '')}?text=Hola,%20soy%20tu%20pasajero%20de%20demiempresa.online`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* ============================================================== */}
          {/* FEED PUBLICITARIO COMERCIAL (REELS Y BANNERS EN TRAYECTO)     */}
          {/* ============================================================== */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">
                  Comercios Locales en {destinationMunicipality}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlayingReel(!isPlayingReel)}
                  className="p-1 text-slate-400 hover:text-white"
                  title={isPlayingReel ? 'Pausar video' : 'Reproducir'}
                >
                  {isPlayingReel ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 text-slate-400 hover:text-white"
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Reel Vertical 10-15s en Trayecto */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 border border-amber-500/30 aspect-[16/10] flex flex-col justify-end p-4 shadow-lg group">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
                alt="Comercio local"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                  isPlayingReel ? 'opacity-40 scale-105' : 'opacity-25'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>

              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    Reel Patrocinado en Trayecto
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    12s
                  </span>
                </div>

                <h4 className="font-black text-lg text-white leading-tight">
                  Tacos & Pupusas Don Toño
                </h4>
                <p className="text-xs text-slate-300 line-clamp-2">
                  ¡Haz tu pedido para recoger al llegar a {destinationMunicipality}! 2x1 en combos especiales mostrando tu viaje en demiempresa.online.
                </p>

                <div className="flex gap-2 pt-1">
                  <a
                    href={`https://wa.me/50369893101?text=Hola,%20vi%20su%20promoción%20en%20demiempresa.online%20mientras%20viajaba%20hacia%20${encodeURIComponent(destinationMunicipality)}.`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Pedir por WhatsApp</span>
                  </a>
                  <button
                    onClick={() => setShowAdModal(true)}
                    className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1"
                  >
                    <span>Anunciarse</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Banners Adicionales (Plan Vitrina) */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-sm">
                  TG
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs">Taller González & Asociados</h5>
                  <p className="text-[11px] text-slate-400">Mantenimiento preventivo en {destinationMunicipality}</p>
                </div>
              </div>
              <a
                href="https://wa.me/50369893101?text=Hola,%20vi%20su%20banner%20en%20demiempresa.online."
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 whitespace-nowrap"
              >
                Contactar
              </a>
            </div>

            {/* Micro-Enlace de Captación en Caliente al pie */}
            <div className="text-center pt-2">
              <button
                onClick={() => setShowAdModal(true)}
                className="text-xs text-amber-400 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>¿Quieres que los pasajeros vean tu local aquí? Toca aquí</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </main>
      )}

      {/* Modal B2B Captación en Caliente */}
      <AdModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} />

    </div>
  );
}
