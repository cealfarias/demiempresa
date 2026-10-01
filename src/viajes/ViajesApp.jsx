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
  Pause,
  Map,
  SlidersHorizontal,
  Wind,
  Dog,
  Users,
  Briefcase,
  Sun,
  Moon,
  AlertTriangle,
  MapPinOff,
  Mic,
  MicOff
} from 'lucide-react';
import RumboLogo from './RumboLogo';
import AdModal from './AdModal';
import PickupMapModal from './PickupMapModal';
import DestinationMapModal from './DestinationMapModal';
import TripPreferencesModal from './TripPreferencesModal';
import LocationPermissionModal from './LocationPermissionModal';
import WelcomeVoiceModal from './WelcomeVoiceModal';
import {
  unlockAudioAndSpeech,
  speakAssistantMessage,
  stopSpeaking,
  startVoiceDictation,
  stopVoiceDictation,
  speakAndThenListen,
  classifyUserVoiceIntent,
  parseNumberFromSpanish
} from './voiceAssistantService';
import { calculateRoadDistance, calculateSuggestedFare, PASSENGER_WEIGHT_PROFILES } from './fuelService';
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

  // Tema de la Aplicación: 'dark' | 'light' (mutuamente excluyente)
  const [theme, setTheme] = useState(() => localStorage.getItem('rumbo_theme') || 'dark');
  const isLight = theme === 'light';

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('rumbo_theme', newTheme);
  };

  // Datos del Viaje (interactivos por GPS al entrar a la app)
  const [origin, setOrigin] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [destinationMunicipality, setDestinationMunicipality] = useState('San Salvador');
  const [proposedFare, setProposedFare] = useState('2.50');
  const [hasCustomFare, setHasCustomFare] = useState(false);
  const [packageDetails, setPackageDetails] = useState('');
  const [paymentTiming, setPaymentTiming] = useState('AT_ORIGIN');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDestMapModal, setShowDestMapModal] = useState(false);
  const [cashBill, setCashBill] = useState('10'); // 'EXACT' | '5' | '10' | '20' | '50+'

  // Modal Unificado de Bienvenida y Accesibilidad por Voz (Addendums 14, 15, 16)
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('rumbo_welcome_completed');
  });
  const [voiceAssistantMode, setVoiceAssistantMode] = useState(() => {
    if (typeof window === 'undefined') return 'visual';
    return localStorage.getItem('rumbo_assistant_mode') || 'visual';
  });
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceDialogueStep, setVoiceDialogueStep] = useState('IDLE');

  // Preferencias Especiales del Viaje (A/C, Mascotas, Pasajeros, Equipaje, Contextura/Peso)
  const [tripPreferences, setTripPreferences] = useState({
    airConditioning: true,
    petFriendly: false,
    passengers: 1,
    weightProfile: 'NORMAL',
    needsVanOrMicrobus: false,
    extraLuggage: false
  });
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  const [roadDistanceKm, setRoadDistanceKm] = useState(8.4);
  const [estimatedDurationMin, setEstimatedDurationMin] = useState(16);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [trafficInfo, setTrafficInfo] = useState({
    trafficLevel: 'FLUID',
    trafficColor: '#10B981',
    trafficLabel: 'Tráfico Fluido',
    delayMinutes: 0,
    rushHourContext: 'Horario Normal'
  });

  // Calcular distancia real por carretera, tráfico dinámico y duración estimada
  useEffect(() => {
    if (originCoords?.lat && destinationCoords?.lat) {
      setIsCalculatingRoute(true);
      calculateRoadDistance(originCoords, destinationCoords).then((res) => {
        if (res && res.distanceKm) {
          setRoadDistanceKm(res.distanceKm);
          setEstimatedDurationMin(res.durationMinutes);
          setTrafficInfo({
            trafficLevel: res.trafficLevel || 'FLUID',
            trafficColor: res.trafficColor || '#10B981',
            trafficLabel: res.trafficLabel || 'Tráfico Fluido',
            delayMinutes: res.delayMinutes || 0,
            rushHourContext: res.rushHourContext || 'Horario Normal'
          });
        }
        setIsCalculatingRoute(false);
      });
    }
  }, [originCoords, destinationCoords]);

  // Algoritmo de Tarifa Sugerida en Tiempo Real (Gasolina + Tráfico + A/C + Peso)
  const suggestedFareInfo = calculateSuggestedFare(
    roadDistanceKm,
    42.0,
    3.80,
    trafficInfo.delayMinutes,
    tripPreferences
  );

  // Sincronizar dinámicamente la tarifa sugerida cuando cambia la ruta o preferencias
  useEffect(() => {
    if (suggestedFareInfo?.suggestedFare) {
      setProposedFare(suggestedFareInfo.suggestedFare);
      setHasCustomFare(false);
    }
  }, [roadDistanceKm, trafficInfo.delayMinutes, tripPreferences]);

  const calculateChange = (fare = proposedFare) => {
    if (cashBill === 'EXACT') return '0.00';
    if (cashBill === '50+') {
      const fareVal = parseFloat(fare) || 0;
      return Math.max(0, 50 - fareVal).toFixed(2);
    }
    const billVal = parseFloat(cashBill);
    const fareVal = parseFloat(fare) || 0;
    return Math.max(0, billVal - fareVal).toFixed(2);
  };

  // Lista de precios sugeridos ordenados hacia arriba (iniciando por la mínima recomendada)
  const quickFareOptions = (() => {
    const minVal = parseFloat(suggestedFareInfo?.minimumRecommended) || 2.50;
    const sugVal = parseFloat(suggestedFareInfo?.suggestedFare) || 3.00;
    const opts = [minVal];
    if (sugVal > minVal) {
      opts.push(sugVal);
    }
    let nextVal = Math.round((opts[opts.length - 1] + 0.50) * 4) / 4;
    while (opts.length < 4) {
      opts.push(nextVal);
      nextVal = Math.round((nextVal + 0.50) * 4) / 4;
    }
    return opts.map((n) => n.toFixed(2));
  })();

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
    document.title = "Rumbo | Movilidad Directa 100% Efectivo";
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

  // Geocodificación inversa para obtener calle/colonia real en El Salvador
  const reverseGeocodeAddress = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'es' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          const parts = data.display_name.split(',');
          return parts.slice(0, 3).join(',').trim();
        }
      }
    } catch {
      // fallback
    }
    return `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  // Escuchar reactivamente permisos del navegador para ubicación
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (status.state === 'denied') {
          setLocationPermissionDenied(true);
        } else if (status.state === 'granted') {
          setLocationPermissionDenied(false);
        }
        status.onchange = () => {
          if (status.state === 'granted') {
            setLocationPermissionDenied(false);
            setShowLocationPermissionModal(false);
            handleGetGpsLocation();
          } else if (status.state === 'denied') {
            setLocationPermissionDenied(true);
          }
        };
      }).catch(() => {});
    }
  }, []);

  // Solicitar ubicación interactiva del pasajero cada vez que entra a la app (si ya completó la bienvenida)
  useEffect(() => {
    const isWelcomeCompleted = typeof window !== 'undefined' && localStorage.getItem('rumbo_welcome_completed');
    if (!isWelcomeCompleted) return; // Se delega al User Gesture de WelcomeVoiceModal

    if (navigator.geolocation) {
      setIsGettingGps(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setOriginCoords({ lat: latitude, lng: longitude });
          const addr = await reverseGeocodeAddress(latitude, longitude);
          setOrigin(addr);
          setLocationPermissionDenied(false);
          setShowLocationPermissionModal(false);
          setIsGettingGps(false);
        },
        (err) => {
          if (err && err.code === 1) {
            // PERMISSION_DENIED
            setLocationPermissionDenied(true);
            setShowLocationPermissionModal(true);
          }
          setOrigin('Mi Ubicación');
          setOriginCoords({ lat: 13.7013, lng: -89.2244 });
          setIsGettingGps(false);
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    }
  }, []);

  // Completar Onboarding Unificado de Bienvenida y Permisos (Addendum 14, 15, 16)
  const handleWelcomeComplete = ({ voiceEnabled, coords, address, startVoiceDialogue }) => {
    setShowWelcomeModal(false);
    setVoiceAssistantMode(voiceEnabled ? 'voice' : 'visual');
    let activeCoords = originCoords;
    if (coords) {
      setOriginCoords(coords);
      activeCoords = coords;
    }
    if (address) {
      setOrigin(address);
    }
    if (startVoiceDialogue) {
      setTimeout(() => {
        initiateVoiceDialogue(activeCoords);
      }, 400);
    }
  };

  // 1. Iniciar Diálogo Conversacional por Voz
  const initiateVoiceDialogue = (coords) => {
    setVoiceDialogueStep('AWAITING_DESTINATION');
    speakAndThenListen(
      'Hola, te saluda tu asistente de viaje de Rumbo. ¿A dónde deseas viajar hoy?',
      {
        onListeningChange: (listening) => setIsListeningVoice(listening),
        onResult: (spokenText) => processVoiceDestination(spokenText, coords || originCoords),
        onError: (err) => {
          console.warn('Voice dialogue error:', err);
          setIsListeningVoice(false);
          setVoiceDialogueStep('IDLE');
        }
      }
    );
  };

  // 2. Procesar Destino Dictado, Geocodificar y Calcular Ruta y Tarifa
  const processVoiceDestination = async (spokenText, currentOriginCoords) => {
    setDestination(spokenText);
    setVoiceDialogueStep('CALCULATING_ROUTE');

    let dCoords = null;
    let dMunicipality = 'San Salvador';

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          spokenText + ', El Salvador'
        )}&countrycodes=sv&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          dCoords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          setDestinationCoords(dCoords);
          if (data[0].address) {
            const mun = data[0].address.city || data[0].address.town || data[0].address.municipality;
            if (mun) {
              setDestinationMunicipality(mun);
              dMunicipality = mun;
            }
          }
        }
      }
    } catch (geoErr) {
      console.warn('Geocodificación voz:', geoErr);
    }

    if (!dCoords) {
      dCoords = { lat: 13.6738, lng: -89.2789 };
      setDestinationCoords(dCoords);
    }

    const oCoords = currentOriginCoords || originCoords || { lat: 13.7013, lng: -89.2244 };

    // Calcular ruta real por carretera, tiempo y tráfico
    const routeRes = await calculateRoadDistance(oCoords, dCoords);
    const distKm = routeRes?.distanceKm || 5.0;
    const durMin = routeRes?.durationMinutes || 14;
    const delayMin = routeRes?.delayMinutes || 0;

    setRoadDistanceKm(distKm);
    setEstimatedDurationMin(durMin);
    setTrafficInfo({
      trafficLevel: routeRes?.trafficLevel || 'FLUID',
      trafficColor: routeRes?.trafficColor || '#10B981',
      trafficLabel: routeRes?.trafficLabel || 'Tráfico Fluido',
      delayMinutes: delayMin,
      rushHourContext: routeRes?.rushHourContext || 'Horario Normal'
    });

    // Calcular tarifa sugerida exacta
    const fareData = calculateSuggestedFare(distKm, 42.0, 3.80, delayMin, tripPreferences);
    const calculatedFare = fareData.suggestedFare;
    setProposedFare(calculatedFare);

    // Locución obligatoria: Distancia, Tiempo, Tarifa y Pregunta de Búsqueda
    const speechPrompt = `Tu destino está a ${distKm} kilómetros, aproximadamente ${durMin} minutos. La tarifa sugerida es de ${calculatedFare} dólares. ¿Deseas buscar conductor?`;

    setVoiceDialogueStep('CONFIRMING_SEARCH');
    speakAndThenListen(speechPrompt, {
      onListeningChange: (listening) => setIsListeningVoice(listening),
      onResult: (answer) => handleVoiceAnswer(answer),
      onError: (err) => {
        console.warn('Error al escuchar respuesta:', err);
        setIsListeningVoice(false);
        setVoiceDialogueStep('IDLE');
      }
    });
  };

  // 3. Evaluar Respuesta del Pasajero sobre "¿Deseas buscar conductor?"
  const handleVoiceAnswer = (answer) => {
    const intent = classifyUserVoiceIntent(answer);

    if (intent.type === 'CONFIRM_SEARCH') {
      setVoiceDialogueStep('IDLE');
      speakAssistantMessage('Excelente. Buscando conductor cercano.', () => {
        setIsListeningVoice(false);
        handleSearchDrivers();
      });
      return;
    }

    if (intent.type === 'DECLINE_SEARCH') {
      setVoiceDialogueStep('AWAITING_ADJUSTMENT');
      speakAndThenListen(
        '¿Deseas cambiar la tarifa sugerida o ajustar detalles del viaje como aire acondicionado, pasajeros o mascotas?',
        {
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (adjustAnswer) => handleAdjustmentAnswer(adjustAnswer),
          onError: () => {
            setIsListeningVoice(false);
            setVoiceDialogueStep('IDLE');
          }
        }
      );
      return;
    }

    // Si el pasajero dictó directamente el ajuste en lugar de sí/no
    handleAdjustmentAnswer(answer);
  };

  // 4. Manejar Ajustes Conversacionales (Tarifa, Pasajeros, A/C, Mascotas, Equipaje)
  const handleAdjustmentAnswer = (answer) => {
    const intent = classifyUserVoiceIntent(answer);

    if (intent.type === 'CONFIRM_SEARCH') {
      setVoiceDialogueStep('IDLE');
      speakAssistantMessage('Excelente. Buscando conductor cercano.', () => {
        setIsListeningVoice(false);
        handleSearchDrivers();
      });
      return;
    }

    if (intent.type === 'CHANGE_FARE') {
      if (intent.amount && intent.amount > 0) {
        const newFare = intent.amount.toFixed(2);
        setProposedFare(newFare);
        setHasCustomFare(true);
        askConfirmationAfterAdjustment(`Tarifa ajustada a ${newFare} dólares.`);
      } else {
        setVoiceDialogueStep('AWAITING_FARE_INPUT');
        speakAndThenListen('¿Qué tarifa en dólares deseas proponer?', {
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (fareAnswer) => {
            const amount = parseNumberFromSpanish(fareAnswer);
            if (amount && amount > 0) {
              const newFare = amount.toFixed(2);
              setProposedFare(newFare);
              setHasCustomFare(true);
              askConfirmationAfterAdjustment(`Tarifa ajustada a ${newFare} dólares.`);
            } else {
              askConfirmationAfterAdjustment('No alcancé a captar la cantidad.');
            }
          },
          onError: () => setIsListeningVoice(false)
        });
      }
      return;
    }

    if (intent.type === 'STANDALONE_NUMBER') {
      const newFare = intent.amount.toFixed(2);
      setProposedFare(newFare);
      setHasCustomFare(true);
      askConfirmationAfterAdjustment(`Tarifa ajustada a ${newFare} dólares.`);
      return;
    }

    if (intent.type === 'CHANGE_PASSENGERS') {
      const count = intent.count;
      setTripPreferences((prev) => ({
        ...prev,
        passengers: count,
        needsVanOrMicrobus: count > 4
      }));
      askConfirmationAfterAdjustment(`Ajustado a ${count} ${count === 1 ? 'pasajero' : 'pasajeros'}.`);
      return;
    }

    if (intent.type === 'CHANGE_AC') {
      setTripPreferences((prev) => ({
        ...prev,
        airConditioning: intent.enabled
      }));
      const acStatus = intent.enabled ? 'activado' : 'desactivado';
      askConfirmationAfterAdjustment(`Aire acondicionado ${acStatus}.`);
      return;
    }

    if (intent.type === 'CHANGE_PETS') {
      setTripPreferences((prev) => ({
        ...prev,
        petFriendly: intent.enabled
      }));
      const petStatus = intent.enabled ? 'activado' : 'desactivado';
      askConfirmationAfterAdjustment(`Viaje con mascota ${petStatus}.`);
      return;
    }

    if (intent.type === 'CHANGE_LUGGAGE') {
      setTripPreferences((prev) => ({
        ...prev,
        extraLuggage: intent.enabled
      }));
      const lugStatus = intent.enabled ? 'agregado' : 'removido';
      askConfirmationAfterAdjustment(`Equipaje extra ${lugStatus}.`);
      return;
    }

    // Comando no reconocido: re-confirmar búsqueda
    askConfirmationAfterAdjustment('Entendido.');
  };

  // Re-preguntar al pasajero si desea buscar conductor tras un ajuste
  const askConfirmationAfterAdjustment = (prefixNotice) => {
    setVoiceDialogueStep('CONFIRMING_SEARCH');
    speakAndThenListen(`${prefixNotice} ¿Deseas buscar conductor ahora?`, {
      onListeningChange: (listening) => setIsListeningVoice(listening),
      onResult: (ans) => {
        const reIntent = classifyUserVoiceIntent(ans);
        if (reIntent.type === 'CONFIRM_SEARCH') {
          setVoiceDialogueStep('IDLE');
          speakAssistantMessage('Excelente. Buscando conductor cercano.', () => {
            setIsListeningVoice(false);
            handleSearchDrivers();
          });
        } else if (reIntent.type === 'DECLINE_SEARCH') {
          handleVoiceAnswer('no');
        } else {
          handleAdjustmentAnswer(ans);
        }
      },
      onError: () => setIsListeningVoice(false)
    });
  };

  // Activar / Detener asistente conversacional por voz (Botón micrófono / cabecera)
  const handleToggleVoiceDictation = () => {
    if (isListeningVoice) {
      stopVoiceDictation();
      stopSpeaking();
      setIsListeningVoice(false);
      setVoiceDialogueStep('IDLE');
    } else {
      unlockAudioAndSpeech();
      initiateVoiceDialogue();
    }
  };

  // Obtener geolocalización GPS real del dispositivo al pulsar botón de mira o reintentar
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setOriginCoords({ lat: latitude, lng: longitude });
        const addr = await reverseGeocodeAddress(latitude, longitude);
        setOrigin(addr);
        setLocationPermissionDenied(false);
        setShowLocationPermissionModal(false);
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('Error GPS:', err.message);
        if (err && err.code === 1) {
          // Permiso bloqueado explícitamente por el usuario o navegador
          setLocationPermissionDenied(true);
          setShowLocationPermissionModal(true);
        }
        setOrigin((prev) => prev || 'Mi Ubicación Actual');
        setIsGettingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 1. Iniciar Búsqueda (Fase Señuelo -> Subasta en 1 km)
  const handleSearchDrivers = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (locationPermissionDenied || !originCoords) {
      setShowLocationPermissionModal(true);
      return;
    }
    if (!origin || !destination) return;

    setAppState('AUCTION');

    const generatedTripId = `trip-${Date.now()}`;
    setTripId(generatedTripId);

    const oLat = originCoords?.lat || 13.7013;
    const oLng = originCoords?.lng || -89.2244;
    const dLat = destinationCoords?.lat || 13.6738;
    const dLng = destinationCoords?.lng || -89.2789;

    // Emitir solicitud al WebSocket Gateway
    socket.emit('trip:request', {
      passengerId: userProfile?.id || 'guest-passenger',
      serviceType,
      originAddress: origin,
      originLat: oLat,
      originLng: oLng,
      destinationAddress: destination,
      destinationLat: dLat,
      destinationLng: dLng,
      destinationMunicipality,
      distanceKm: roadDistanceKm,
      durationMinutes: estimatedDurationMin,
      proposedFare: parseFloat(proposedFare).toFixed(2),
      suggestedFare: suggestedFareInfo.suggestedFare,
      delayMinutes: trafficInfo.delayMinutes,
      trafficLevel: trafficInfo.trafficLevel,
      trafficLabel: trafficInfo.trafficLabel,
      trafficColor: trafficInfo.trafficColor,
      cashBill,
      changeNeeded: calculateChange(),
      preferences: tripPreferences,
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
      cashBill,
      changeNeeded: calculateChange(fare),
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
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Barra Superior Oficial Rumbo */}
      <header className={`border-b backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between transition-colors ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <RumboLogo />

        <div className="flex items-center gap-2">
          {/* Botón Accesible Asistente de Voz (WCAG / Dictado) */}
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            title={
              isListeningVoice
                ? 'Escuchando... Toca para pausar'
                : voiceAssistantMode === 'voice'
                ? 'Asistente de Voz Activo (Toca para dictar destino)'
                : 'Activar dictado por voz'
            }
            aria-label={
              isListeningVoice
                ? 'Escuchando destino por voz, presiona para pausar'
                : 'Activar asistente de voz o dictar destino'
            }
            className={`min-h-[36px] px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
              isListeningVoice
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse'
                : voiceAssistantMode === 'voice'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className={`w-3.5 h-3.5 ${isListeningVoice ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {isListeningVoice ? 'Escuchando...' : 'Asistente'}
            </span>
          </button>

          {/* Selector Mutuamente Excluyente de Tema: Solecito / Media Luna */}
          <div className={`flex items-center p-0.5 rounded-full border transition-all ${
            isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-800/90 border-slate-700'
          }`}>
            <button
              type="button"
              onClick={() => toggleTheme('light')}
              title="Tema Claro"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => toggleTheme('dark')}
              title="Tema Oscuro"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-lime-500 text-slate-950 shadow-md font-black scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] font-bold text-lime-400 bg-lime-500/10 border border-lime-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
            <span>100% Efectivo</span>
          </span>
        </div>
      </header>

      {/* ============================================================== */}
      {/* FASE 1: SEÑUELO MINIMALISTA (Captura limpia y sin distracciones) */}
      {/* ============================================================== */}
      {appState === 'DECOY_FORM' && (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-center animate-fade-in">
          
          <div className={`border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/60 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            
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
              
              {/* Alerta Inteligente de Ubicación Bloqueada */}
              {locationPermissionDenied && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2.5 text-xs text-amber-300 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="leading-tight text-[11px] sm:text-xs">
                      Permiso de ubicación bloqueado. Se requiere para que el conductor no se pierda.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationPermissionModal(true)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Activar
                  </button>
                </div>
              )}

              {/* Asistente de Voz Activo en Tiempo Real */}
              {(voiceDialogueStep !== 'IDLE' || isListeningVoice) && (
                <div className="p-3 bg-gradient-to-r from-amber-500/20 via-lime-500/15 to-emerald-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-200 animate-fade-in shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                        <Mic className="w-4 h-4 animate-bounce" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-xs">
                        {isListeningVoice ? 'Asistente de Voz Escuchando...' : 'Asistente Procesando...'}
                      </p>
                      <p className="text-[11px] text-amber-300/80">
                        {voiceDialogueStep === 'AWAITING_DESTINATION' && 'Dicta tu destino (ej. Metrocentro)...'}
                        {voiceDialogueStep === 'CALCULATING_ROUTE' && 'Calculando distancia y tarifa...'}
                        {voiceDialogueStep === 'CONFIRMING_SEARCH' && 'Responde: "Sí" para buscar o "No" para ajustar...'}
                        {voiceDialogueStep === 'AWAITING_ADJUSTMENT' && 'Menciona qué deseas cambiar (tarifa, aire, pasajeros, mascotas)...'}
                        {voiceDialogueStep === 'AWAITING_FARE_INPUT' && 'Di la tarifa en dólares (ej. 3 dólares)...'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleVoiceDictation}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    Pausar
                  </button>
                </div>
              )}

              {/* Origen con botón GPS real y Mapa Interactivo */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Punto de Recogida (Origen)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Abrir Mapa</span>
                  </button>
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder={isGettingGps ? "Detectando tu ubicación GPS..." : "¿Dónde te recogen? (o toca el mapa)"}
                    className="w-full pl-3 pr-20 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      title="Obtener ubicación GPS actual"
                      disabled={isGettingGps}
                      onClick={handleGetGpsLocation}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      {isGettingGps ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : (
                        <Navigation className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Fijar en mapa con pin arrastrable"
                      onClick={() => setShowMapModal(true)}
                      className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-700 transition-colors"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 px-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="text-amber-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <span>Mover pin en el mapa para ubicar tu puerta</span>
                  </button>
                  <span className="text-slate-500 font-mono text-[10px]">
                    Radio 1 km
                  </span>
                </div>
              </div>

              {/* Destino con botón de Mapa Interactivo */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Punto de Llegada (Escoge tu rumbo...)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDestMapModal(true)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Abrir Mapa</span>
                  </button>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Escoge tu rumbo... (Ej. Metrocentro, Multiplaza, Colonia...)"
                    className="w-full pl-3 pr-20 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 text-sm"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={isListeningVoice ? "Escuchando tu destino... Toca para pausar" : "Dictar destino por voz"}
                      title={isListeningVoice ? "Escuchando... Toca para pausar" : "Dictar destino con voz"}
                      onClick={handleToggleVoiceDictation}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isListeningVoice
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                          : 'text-amber-400 hover:text-amber-300 hover:bg-slate-700'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Fijar destino en el mapa"
                      onClick={() => setShowDestMapModal(true)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition-colors"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 px-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowDestMapModal(true)}
                    className="text-rose-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <span>Mover pin en el mapa para ubicar destino exacto</span>
                  </button>
                </div>
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

              {/* Distancia Real en Carretera, Estado del Tráfico & Tiempo Estimado */}
              <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Ruta por Carretera
                    </span>
                    <span className="font-black text-white text-sm font-mono">
                      {isCalculatingRoute ? 'Calculando...' : destination ? `${roadDistanceKm} km` : 'Escoge tu rumbo'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: trafficInfo.trafficColor }}
                    />
                    <span
                      className="text-[10px] uppercase font-extrabold tracking-wider"
                      style={{ color: trafficInfo.trafficColor }}
                    >
                      {trafficInfo.trafficLabel}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="font-black text-white text-sm font-mono">
                      {isCalculatingRoute ? '...' : destination ? `~${estimatedDurationMin} min` : '-- min'}
                    </span>
                    {trafficInfo.delayMinutes > 0 && destination && (
                      <span className="text-[10px] text-rose-400 font-bold font-mono">
                        (+{trafficInfo.delayMinutes}m trabazón)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón Minimalista: Preferencias del Viaje (A/C, Mascotas, Pasajeros, Peso) */}
              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="w-full py-2.5 px-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between text-xs transition-all cursor-pointer group shadow-inner"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <SlidersHorizontal className="w-4 h-4 text-lime-400 flex-shrink-0" />
                  <span className="font-bold text-slate-200">Preferencias:</span>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {tripPreferences.airConditioning && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold whitespace-nowrap">
                        ❄️ Con A/C
                      </span>
                    )}
                    {tripPreferences.passengers > 4 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 font-semibold whitespace-nowrap">
                        🚐 Camioneta (+4)
                      </span>
                    ) : tripPreferences.passengers > 1 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold whitespace-nowrap">
                        👥 {tripPreferences.passengers} pers.
                      </span>
                    ) : null}
                    {tripPreferences.weightProfile && tripPreferences.weightProfile !== 'NORMAL' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold whitespace-nowrap">
                        {tripPreferences.weightProfile === 'LIGHT' ? '🏃 Delgada' : tripPreferences.weightProfile === 'HEAVY' ? '🏋️ Robusta' : '⚖️ Pesada'}
                      </span>
                    )}
                    {tripPreferences.extraLuggage && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold whitespace-nowrap">
                        🧳 Maletas
                      </span>
                    )}
                    {tripPreferences.petFriendly && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold whitespace-nowrap">
                        🐾 Mascota
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] text-lime-400 group-hover:text-lime-300 font-bold ml-2 whitespace-nowrap">
                  Ajustar ›
                </span>
              </button>

              {/* Monto Ofrecido en Efectivo con Tarifa Sugerida Inteligente */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tu Oferta en Efectivo (USD)</span>
                  </label>

                  {/* Chip de Tarifa Sugerida Calculada en Vivo */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Sugerida:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProposedFare(suggestedFareInfo.suggestedFare);
                        setHasCustomFare(false);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-lime-500/15 border border-lime-500/40 text-lime-300 font-extrabold text-xs flex items-center gap-1 hover:bg-lime-500/25 transition-all cursor-pointer shadow-sm group"
                      title="Tarifa calculada por consumo de gasolina, tráfico, A/C y carga de pasajeros"
                    >
                      <span className="font-mono">${suggestedFareInfo.suggestedFare}</span>
                      <span className="text-[9px] uppercase tracking-wider bg-lime-500 text-slate-950 px-1 py-0.5 rounded font-black group-hover:scale-105 transition-transform">
                        Usar
                      </span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-lg font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1.50"
                    required
                    value={proposedFare}
                    onChange={(e) => {
                      setProposedFare(e.target.value);
                      setHasCustomFare(true);
                    }}
                    className="w-full pl-8 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-extrabold text-xl focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Botones de Selección Rápida: Mínima recomendada y siguientes tarifas hacia arriba */}
                <div className="flex gap-2 mt-2">
                  {quickFareOptions.map((amt, idx) => (
                    <button
                      key={`${amt}-${idx}`}
                      type="button"
                      onClick={() => {
                        setProposedFare(amt);
                        setHasCustomFare(true);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border font-mono transition-all cursor-pointer ${
                        proposedFare === amt
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${amt}
                      {idx === 0 && <span className="block text-[9px] font-sans opacity-70">mínimo</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* DIAMANTE ROJO: ¿Necesitas cambio? */}
              <div className="p-3.5 bg-gradient-to-r from-rose-950/30 via-slate-900 to-amber-950/20 border border-rose-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>💎 ¿Necesitas cambio?</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ¿Con qué billete pagarás?
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">Chofer sabrá llevar cambio listo</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-xs font-bold">
                  {[
                    { id: 'EXACT', label: 'Exacto' },
                    { id: '5', label: '$5' },
                    { id: '10', label: '$10' },
                    { id: '20', label: '$20' },
                    { id: '50+', label: '$50+' }
                  ].map((bill) => (
                    <button
                      key={bill.id}
                      type="button"
                      onClick={() => setCashBill(bill.id)}
                      className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                        cashBill === bill.id
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-black'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      {bill.label}
                    </button>
                  ))}
                </div>

                {/* Mensaje de cálculo en vivo */}
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] flex items-center justify-between text-slate-300">
                  {cashBill === 'EXACT' ? (
                    <span className="text-emerald-400 font-medium">
                      ✅ Pagarás la tarifa exacta en efectivo (no requieres cambio).
                    </span>
                  ) : cashBill === '50+' ? (
                    <>
                      <span>
                        Pagas con: <strong className="text-white">Billete grande ($50 / $100)</strong>
                      </span>
                      <span className="font-bold text-amber-300">
                        👉 Chofer llevará cambio para billete grande
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Pagas con: <strong className="text-white">${parseFloat(cashBill).toFixed(2)}</strong>
                      </span>
                      <span className="font-bold text-amber-300">
                        👉 Chofer llevará <strong>${calculateChange()}</strong> de vuelto
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Beneficio de Referido 7+7 */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-400">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Bono de Bienvenida:</strong> Recibe $1.00 de descuento en tu próximo viaje si eres referido verificado.
                </span>
              </div>

              {/* Botón de Despacho */}
              <div>
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-lime-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Buscar Conductor</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2">
                  Conexión directa con conductores en un radio de 1 km • 100% Efectivo
                </p>
              </div>

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

            {/* DIAMANTE ROJO: Aviso de Billete y Vuelto */}
            <div className="p-3 bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">💎 Tu forma de pago:</span>
                <strong className="text-rose-300 font-bold">
                  {assignedTrip.cashBill === 'EXACT' ? 'Efectivo exacto' : `Billete de $${parseFloat(assignedTrip.cashBill).toFixed(2)}`}
                </strong>
              </div>
              <div className="text-right">
                {assignedTrip.cashBill !== 'EXACT' ? (
                  <>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">👉 Chofer te entregará:</span>
                    <strong className="text-amber-300 font-black text-sm">${assignedTrip.changeNeeded} de vuelto</strong>
                  </>
                ) : (
                  <span className="text-emerald-400 font-medium">Pago exacto (sin vuelto)</span>
                )}
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

      {/* Modal Interactivo de Mapa Leaflet con Pin y Radio 1 km */}
      <PickupMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialCoords={originCoords || { lat: 13.7013, lng: -89.2244 }}
        initialAddress={origin}
        onConfirm={({ address, lat, lng }) => {
          setOrigin(address);
          setOriginCoords({ lat, lng });
        }}
      />

      {/* Modal Interactivo de Destino con Pin Rojo y Detección de Municipio */}
      <DestinationMapModal
        isOpen={showDestMapModal}
        onClose={() => setShowDestMapModal(false)}
        initialCoords={destinationCoords || { lat: 13.6738, lng: -89.2789 }}
        initialAddress={destination}
        onConfirm={({ address, lat, lng, municipality }) => {
          setDestination(address);
          setDestinationCoords({ lat, lng });
          if (municipality) {
            setDestinationMunicipality(municipality);
          }
        }}
      />

      {/* Modal de Preferencias del Viaje (A/C, Mascotas, Pasajeros, Equipaje) */}
      <TripPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        preferences={tripPreferences}
        onChange={setTripPreferences}
      />

      {/* Modal de Permiso de Ubicación Inteligente Rumbo */}
      <LocationPermissionModal
        isOpen={showLocationPermissionModal}
        onClose={() => setShowLocationPermissionModal(false)}
        onRetry={handleGetGpsLocation}
        onOpenMap={() => setShowMapModal(true)}
        isRetrying={isGettingGps}
      />

      {/* Modal Unificado de Bienvenida y Accesibilidad por Voz (Addendums 14, 15, 16) */}
      <WelcomeVoiceModal
        isOpen={showWelcomeModal}
        onComplete={handleWelcomeComplete}
        reverseGeocodeAddress={reverseGeocodeAddress}
      />

    </div>
  );
}
