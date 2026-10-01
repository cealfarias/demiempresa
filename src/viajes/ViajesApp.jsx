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
  MicOff,
  Bike,
  RotateCcw,
  User,
  Gift
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
import {
  triggerButtonFeedback,
  triggerSelectionFeedback,
  triggerSearchLaunchFeedback,
  triggerCashRewardFeedback,
  resumeAudioContext
} from './soundFeedbackService';
import confetti from 'canvas-confetti';
import { calculateRoadDistance, calculateSuggestedFare, PASSENGER_WEIGHT_PROFILES } from './fuelService';
import {
  socket,
  registerUserApi,
  fetchUserCreditsApi,
  fetchAdFeedApi
} from './api';

// Formatear destino resuelto por geocodificador para la cajita de punto de llegada
export const formatResolvedDestination = (place) => {
  if (!place) return '';

  const addr = place.address || {};
  const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
  const state = addr.state || '';

  const mainName = (place.name || '').trim();

  if (place.display_name) {
    const parts = place.display_name
      .split(',')
      .map((p) => p.trim())
      .filter((p) => {
        const lower = p.toLowerCase();
        return lower !== 'el salvador' && !/^\d{4,5}$/.test(p);
      });

    if (mainName) {
      const mentionsCity = city && mainName.toLowerCase().includes(city.toLowerCase());
      const mentionsState = state && mainName.toLowerCase().includes(state.toLowerCase());
      if (mentionsCity || mentionsState) {
        return mainName;
      }
      if (city) {
        return `${mainName}, ${city}`;
      }
      if (parts.length >= 2) {
        return parts.slice(0, 2).join(', ');
      }
      return mainName;
    }

    if (parts.length >= 3) {
      return parts.slice(0, 3).join(', ');
    }
    if (parts.length >= 1) {
      return parts.join(', ');
    }
  }

  if (mainName) {
    return city ? `${mainName}, ${city}` : mainName;
  }

  return place.display_name || '';
};

export default function ViajesApp() {
  // Máquina de Estados: 'DECOY_FORM' | 'AUCTION' | 'IN_TRIP_HUB'
  const [appState, setAppState] = useState('DECOY_FORM');
  const [serviceType, setServiceType] = useState('PASSENGER'); // 'PASSENGER' | 'PACKAGE'
  const [transportType, setTransportType] = useState('CAR'); // 'CAR' | 'MOTO'

  const handleSelectTransportType = (type) => {
    setTransportType(type);
    if (type === 'MOTO') {
      setTripPreferences((prev) => ({
        ...prev,
        airConditioning: false,
        passengers: 1,
        extraLuggage: false
      }));
    }
  };

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
  const [destinationError, setDestinationError] = useState('');
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const isDestinationConfirmed = Boolean(destinationCoords?.lat && destination?.trim());

  const handleGeocodeManualDestination = async (textToSearch = destination) => {
    const query = (textToSearch || destination).trim();
    if (!query) return;
    setIsSearchingDest(true);
    setDestinationError('');

    try {
      const oCoords = originCoords || { lat: 13.7013, lng: -89.2244 };
      const viewboxParam = `&viewbox=${oCoords.lng - 0.25},${oCoords.lat + 0.25},${oCoords.lng + 0.25},${oCoords.lat - 0.25}&bounded=0`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ', El Salvador'
        )}&countrycodes=sv&limit=1&addressdetails=1${viewboxParam}`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          const dCoords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          setDestinationCoords(dCoords);

          // Actualizar inmediatamente la cajita de punto de llegada con el destino específico encontrado
          const formattedDest = formatResolvedDestination(data[0]);
          if (formattedDest) {
            setDestination(formattedDest);
          }

          if (data[0].address) {
            const mun = data[0].address.city || data[0].address.town || data[0].address.municipality;
            if (mun) setDestinationMunicipality(mun);
          }
          setIsSearchingDest(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Geocodificación manual err:', err);
    }

    setDestinationError(`No se encontró "${query}". Indica otra referencia o abre el mapa.`);
    setIsSearchingDest(false);
  };

  // Preferencias Especiales del Viaje (A/C, Mascotas, Pasajeros, Equipaje, Contextura/Peso, Ida y Vuelta)
  const [tripPreferences, setTripPreferences] = useState({
    airConditioning: true,
    petFriendly: false,
    passengers: 1,
    weightProfile: 'NORMAL',
    needsVanOrMicrobus: false,
    extraLuggage: false,
    isRoundTrip: false,
    roundTripWaitMinutes: 0
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

  // Algoritmo de Tarifa Sugerida en Tiempo Real (Gasolina + Tráfico + A/C + Peso + Auto/Moto)
  const isMotoMode = transportType === 'MOTO';
  const suggestedFareInfo = calculateSuggestedFare(
    roadDistanceKm,
    isMotoMode ? 115.0 : 42.0,
    3.80,
    trafficInfo.delayMinutes,
    { ...tripPreferences, transportType }
  );

  // Sincronizar dinámicamente la tarifa sugerida cuando cambia la ruta, preferencias o transporte
  useEffect(() => {
    if (suggestedFareInfo?.suggestedFare) {
      setProposedFare(suggestedFareInfo.suggestedFare);
      setHasCustomFare(false);
    }
  }, [roadDistanceKm, trafficInfo.delayMinutes, tripPreferences, transportType]);

  // El billete marcado en la zona de cambio siempre debe ser estrictamente mayor a la oferta
  useEffect(() => {
    const fareVal = parseFloat(proposedFare) || 0;
    if (cashBill === 'EXACT') return;

    const currentVal = cashBill === '50+' ? 50 : (parseFloat(cashBill) || 0);
    if (cashBill !== '50+' && currentVal <= fareVal) {
      if (fareVal < 10) {
        setCashBill('10');
      } else if (fareVal < 20) {
        setCashBill('20');
      } else {
        setCashBill('50+');
      }
    }
  }, [proposedFare, cashBill]);

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

  // Política Estricta de Aire Acondicionado:
  // Solo se activa si la tarifa es la sugerida o superior. Al activarlo, se habilita la sugerida.
  const handleEnableAcWithSuggestedFare = () => {
    const sugFare = suggestedFareInfo?.suggestedFare || '2.50';
    setProposedFare(sugFare);
    setHasCustomFare(false);
    setTripPreferences((prev) => ({ ...prev, airConditioning: true }));
  };

  const handleFareInputChange = (val) => {
    setProposedFare(val);
    setHasCustomFare(true);
    const numVal = parseFloat(val);
    const sugVal = parseFloat(suggestedFareInfo?.suggestedFare);
    if (numVal && sugVal && numVal < sugVal && tripPreferences.airConditioning) {
      setTripPreferences((prev) => ({ ...prev, airConditioning: false }));
    }
  };

  const handleSelectQuickFare = (amt) => {
    setProposedFare(amt);
    setHasCustomFare(true);
    const numVal = parseFloat(amt);
    const sugVal = parseFloat(suggestedFareInfo?.suggestedFare);
    if (numVal && sugVal && numVal < sugVal && tripPreferences.airConditioning) {
      setTripPreferences((prev) => ({ ...prev, airConditioning: false }));
    }
  };

  // Perfil del Pasajero & Punto de Inflexión
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('demiempresa_passenger');
    return saved ? JSON.parse(saved) : null;
  });
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDui, setRegDui] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [duiError, setDuiError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [googleDuiStep, setGoogleDuiStep] = useState(false);
  const [googleTempUser, setGoogleTempUser] = useState(null);

  // Celebración de Bienvenida, Confetti y Bonos ($1.00 por 7 días y Referidos)
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationName, setCelebrationName] = useState('');
  const [showMoreBonusesPrompt, setShowMoreBonusesPrompt] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [refContactName, setRefContactName] = useState('');
  const [refContactPhone, setRefContactPhone] = useState('');
  const [referralBonusAwarded, setReferralBonusAwarded] = useState(false);

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
    document.title = "Rumbo a mi destino | 100% Efectivo";

    // Ocultar widget flotante duplicado para usar exclusivamente el avatar ámbar y blanco de Rumbo
    const globalAvatar = document.getElementById('demiempresa-avatar-container');
    if (globalAvatar) {
      globalAvatar.style.display = 'none';
    }
    return () => {
      if (globalAvatar) {
        globalAvatar.style.display = '';
      }
    };
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

  // Feedback psicológico auditivo y táctil accesible para TODOS los botones
  useEffect(() => {
    let lastFeedbackTimestamp = 0;

    const handleFeedbackEvent = (e) => {
      const btn = e.target.closest('button, [role="button"], input[type="submit"]');
      if (!btn) return;

      const now = Date.now();
      // Debounce para evitar doble disparo en dispositivos que emiten pointerdown y click sucesivamente
      if (now - lastFeedbackTimestamp < 140) return;
      lastFeedbackTimestamp = now;

      // Asegurar desbloqueo activo de Web Audio API en el gesto
      resumeAudioContext();

      const btnText = (btn.innerText || btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();

      // 1. Botón principal de búsqueda de conductor
      if (btnText.includes('buscar conductor') || (btn.type === 'submit' && btnText.includes('buscar'))) {
        triggerSearchLaunchFeedback();
        return;
      }

      // 2. Botones de selección (Auto/Moto, Billetes, Tarifas rápidas, Mapa, Pasajeros, etc.)
      if (
        btn.dataset?.role === 'selection' ||
        btnText.includes('$') ||
        btnText.includes('auto') ||
        btnText.includes('moto') ||
        btnText.includes('mapa') ||
        btn.getAttribute('role') === 'tab' ||
        btn.getAttribute('role') === 'switch'
      ) {
        triggerSelectionFeedback();
      } else {
        triggerButtonFeedback();
      }
    };

    // Usar pointerdown para respuesta táctil instantánea (0ms de latencia) al tocar la pantalla
    document.addEventListener('pointerdown', handleFeedbackEvent, true);
    // Fallback para clicks tradicionales
    document.addEventListener('click', handleFeedbackEvent, true);

    return () => {
      document.removeEventListener('pointerdown', handleFeedbackEvent, true);
      document.removeEventListener('click', handleFeedbackEvent, true);
    };
  }, []);

  // Solicitar ubicación interactiva del pasajero cada vez que entra a la app (si ya completó la bienvenida)
  useEffect(() => {
    const isWelcomeCompleted = typeof window !== 'undefined' && localStorage.getItem('rumbo_welcome_completed');
    if (!isWelcomeCompleted) return; // Se delega al User Gesture de WelcomeVoiceModal

    // Iniciar flujo inmediato por voz para usuarios recurrentes con permisos ya otorgados
    let speechActuallyStarted = false;

    const startReturningVoiceGreeting = () => {
      if (speechActuallyStarted) return;
      unlockAudioAndSpeech();
      setVoiceDialogueStep('AWAITING_DESTINATION');
      speakAndThenListen('Hola, dime ¿cuál es tu rumbo?', {
        onStart: () => {
          speechActuallyStarted = true;
        },
        onListeningChange: (listening) => setIsListeningVoice(listening),
        onResult: (spokenText) => processVoiceDestination(spokenText),
        onError: (err) => {
          console.warn('Returning voice dialogue err:', err);
          setIsListeningVoice(false);
          setVoiceDialogueStep('IDLE');
        }
      });
    };

    // Disparar desde el primer milisegundo que el usuario llega
    const timer = setTimeout(() => {
      startReturningVoiceGreeting();
    }, 400);

    // Resiliencia para políticas de autoplay en navegadores móviles (iOS Safari / Android Chrome):
    // Si el navegador bloqueó el audio sin interacción previa, el primer tap en la pantalla lo dispara de inmediato
    const handleFirstInteraction = () => {
      if (!speechActuallyStarted) {
        startReturningVoiceGreeting();
      }
    };
    window.addEventListener('click', handleFirstInteraction, { once: true, capture: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });

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

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleFirstInteraction, { capture: true });
      window.removeEventListener('touchstart', handleFirstInteraction, { capture: true });
    };
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
    setTimeout(() => {
      initiateVoiceDialogue(activeCoords);
    }, 350);
  };

  // 1. Iniciar Diálogo Conversacional por Voz
  const initiateVoiceDialogue = (coords) => {
    setVoiceDialogueStep('AWAITING_DESTINATION');
    speakAndThenListen(
      'Hola, dime ¿cuál es tu rumbo?',
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

    // 1. Locución al iniciar la búsqueda: "Iniciando la búsqueda para el destino X"
    const speechPromise = new Promise((resolve) => {
      speakAssistantMessage(`Iniciando la búsqueda para el destino ${spokenText}.`, resolve);
    });

    // 2. Cálculo geográfico y de ruta en paralelo
    const calculationPromise = (async () => {
      let dCoords = null;
      let dMunicipality = 'San Salvador';
      let resolvedDestinationText = spokenText;
      const oCoords = currentOriginCoords || originCoords || { lat: 13.7013, lng: -89.2244 };

      try {
        const viewboxParam = `&viewbox=${oCoords.lng - 0.25},${oCoords.lat + 0.25},${oCoords.lng + 0.25},${oCoords.lat - 0.25}&bounded=0`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            spokenText + ', El Salvador'
          )}&countrycodes=sv&limit=1&addressdetails=1${viewboxParam}`,
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

            // Actualizar inmediatamente la cajita de punto de llegada con el destino específico encontrado
            const formattedDest = formatResolvedDestination(data[0]);
            if (formattedDest) {
              resolvedDestinationText = formattedDest;
              setDestination(formattedDest);
            }

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
        return { success: false, spokenText };
      }

      setDestinationError('');

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
      const fareData = calculateSuggestedFare(
        distKm,
        transportType === 'MOTO' ? 115.0 : 42.0,
        3.80,
        delayMin,
        { ...tripPreferences, transportType }
      );
      const calculatedFare = fareData.suggestedFare;
      setProposedFare(calculatedFare);

      return {
        success: true,
        distKm,
        durMin,
        calculatedFare,
        resolvedDestinationText,
        currentOriginCoords
      };
    })();

    // Esperar a que la primera frase termine de hablarse y el cálculo esté listo
    const [, calcResult] = await Promise.all([speechPromise, calculationPromise]);

    if (!calcResult.success) {
      // Notificar por escrito y por audio que no se encontró el lugar, y solicitar de nuevo la dirección
      const errorMsg = `No se encontró "${spokenText}". Por favor, indica otra referencia o colonia.`;
      setDestinationError(errorMsg);
      setDestinationCoords(null);
      setVoiceDialogueStep('AWAITING_DESTINATION');

      const speechPrompt = `No logré encontrar "${spokenText}". Por favor, dime otra referencia, calle o punto conocido.`;
      speakAndThenListen(speechPrompt, {
        onListeningChange: (listening) => setIsListeningVoice(listening),
        onResult: (newSpokenText) => processVoiceDestination(newSpokenText, currentOriginCoords),
        onError: (err) => {
          console.warn('Error al reintentar destino:', err);
          setIsListeningVoice(false);
          setVoiceDialogueStep('IDLE');
        }
      });
      return;
    }

    // Locución obligatoria: "Encontré la ruta a tu destino en [ubicación]. Está a [Y] km de distancia, tardarás en llegar [Z] minutos..."
    const speechPrompt = `Encontré la ruta a tu destino en ${calcResult.resolvedDestinationText}. Está a ${calcResult.distKm} kilómetros de distancia, tardarás en llegar ${calcResult.durMin} minutos. La tarifa sugerida es de ${calcResult.calculatedFare} dólares. ¿Deseas buscar conductor?`;

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

    const applyVoiceFareWithAcPolicy = (newFare) => {
      setProposedFare(newFare);
      setHasCustomFare(true);
      const isBelowSuggested = parseFloat(newFare) < parseFloat(suggestedFareInfo?.suggestedFare);
      if (isBelowSuggested && tripPreferences.airConditioning) {
        setTripPreferences((prev) => ({ ...prev, airConditioning: false }));
        askConfirmationAfterAdjustment(
          `Tarifa ajustada a ${newFare} dólares. Por política, como es menor a la sugerida, el aire acondicionado no aplica y ha sido desactivado.`
        );
      } else {
        askConfirmationAfterAdjustment(`Tarifa ajustada a ${newFare} dólares.`);
      }
    };

    if (intent.type === 'CHANGE_FARE') {
      if (intent.amount && intent.amount > 0) {
        const newFare = intent.amount.toFixed(2);
        applyVoiceFareWithAcPolicy(newFare);
      } else {
        setVoiceDialogueStep('AWAITING_FARE_INPUT');
        speakAndThenListen('¿Qué tarifa en dólares deseas proponer?', {
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (fareAnswer) => {
            const amount = parseNumberFromSpanish(fareAnswer);
            if (amount && amount > 0) {
              const newFare = amount.toFixed(2);
              applyVoiceFareWithAcPolicy(newFare);
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
      applyVoiceFareWithAcPolicy(newFare);
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
      if (intent.enabled) {
        // Política de Rumbo: A/C solo aplica con tarifa sugerida o superior. Al activarlo, se habilita automáticamente la tarifa sugerida.
        setTripPreferences((prev) => ({
          ...prev,
          airConditioning: true
        }));
        const sugFare = suggestedFareInfo?.suggestedFare || '2.50';
        setProposedFare(sugFare);
        setHasCustomFare(false);
        askConfirmationAfterAdjustment(
          `Aire acondicionado activado. Por política, se habilitó la tarifa sugerida de ${sugFare} dólares.`
        );
      } else {
        setTripPreferences((prev) => ({
          ...prev,
          airConditioning: false
        }));
        askConfirmationAfterAdjustment('Aire acondicionado desactivado.');
      }
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

    if (intent.type === 'CHANGE_TRANSPORT') {
      const isMoto = intent.transportType === 'MOTO';
      setTransportType(intent.transportType);
      if (isMoto) {
        setTripPreferences((prev) => ({
          ...prev,
          airConditioning: false,
          passengers: 1,
          extraLuggage: false
        }));
        askConfirmationAfterAdjustment('Modo viaje en Moto seleccionado. Tarifa económica y filtro de tráfico aplicados.');
      } else {
        askConfirmationAfterAdjustment('Modo viaje en Carro seleccionado.');
      }
      return;
    }

    if (intent.type === 'CHANGE_ROUND_TRIP') {
      setTripPreferences((prev) => ({
        ...prev,
        isRoundTrip: intent.enabled
      }));
      const roundStatus = intent.enabled ? 'activado' : 'desactivado';
      askConfirmationAfterAdjustment(`Viaje de ida y vuelta ${roundStatus}.`);
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
    triggerSearchLaunchFeedback();
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
      transportType,
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
      isRoundTrip: Boolean(tripPreferences.isRoundTrip),
      roundTripWaitMinutes: parseInt(tripPreferences.roundTripWaitMinutes) || 0,
      packageDetails,
      paymentTiming
    });

    // Simulación complementaria de recepción de choferes dentro de 1 km (Modo Demo / Prueba)
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
            timeLeft: 10,
            isMock: true
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
            timeLeft: 10,
            isMock: true
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

  // Manejar Aceptación de Tarifa (Instantánea, sin fricción ni modales bloqueantes)
  const handleSelectOffer = (offer) => {
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

  // Explosión de fuegos artificiales y lluvia constante de papelitos de arriba hacia abajo
  const triggerCelebrationConfetti = () => {
    try {
      // 1. Fuegos artificiales multidireccionales iniciales
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        zIndex: 99999
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.7 },
          zIndex: 99999
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.7 },
          zIndex: 99999
        });
      }, 250);

      // 2. Lluvia constante de papelitos de arriba hacia abajo (5 segundos continuos)
      const end = Date.now() + 5000;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          return clearInterval(interval);
        }
        confetti({
          particleCount: 30,
          startVelocity: 15,
          ticks: 250,
          origin: { x: Math.random(), y: -0.05 },
          gravity: 0.9,
          scalar: 1.25,
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#8B5CF6', '#FBBF24'],
          zIndex: 99999
        });
      }, 200);
    } catch (cErr) {
      console.warn('Confetti error:', cErr);
    }
  };

  // Completar inscripción con todos los datos (nombre, dui, email) y disparar celebración de bono
  const handleCompleteRegistrationWithBonus = (profileData) => {
    const fullProfile = {
      ...profileData,
      hasBonus: true,
      bonusAmount: '1.00',
      bonusExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    setUserProfile(fullProfile);
    localStorage.setItem('demiempresa_passenger', JSON.stringify(fullProfile));
    setShowRegisterModal(false);
    setShowGoogleAuthModal(false);
    setGoogleDuiStep(false);

    setCelebrationName(profileData.fullName || 'Pasajero');
    setShowCelebrationModal(true);

    // Disparar fuegos artificiales y papelitos volando
    triggerCelebrationConfetti();

    // Sonido de caja registradora / dólar acreditado
    triggerCashRewardFeedback();

    // Locución con tono de contenta anunciando bono de $1.00 válido por 7 días
    speakAssistantMessage(
      `¡Felicidades ${profileData.fullName}! Te has inscrito exitosamente a nuestra plataforma. Has recibido un bono de bienvenida de un dólar que será usado en tu próximo viaje, con una caducidad de 7 días.`
    );

    // Unos 10 segundos más tarde: "¿Quieres más bonos?"
    setTimeout(() => {
      setShowCelebrationModal(false);
      setShowMoreBonusesPrompt(true);
      speakAssistantMessage('¿Quieres más bonos?');
    }, 10000);
  };

  // Guardar datos de seguridad (Registro opcional con todos los datos: nombre, dui, email)
  const handleSaveProfileAndAccept = async (e) => {
    e.preventDefault();
    if (!/^\d{8}-\d{1}$/.test(regDui)) {
      setDuiError('DUI inválido. Debe tener el formato estricto 00000000-0');
      return;
    }

    setRegistering(true);
    setDuiError('');

    const emailToSave = regEmail || (googleTempUser ? googleTempUser.email : `${regDui.replace('-', '')}@demiempresa.online`);

    try {
      await registerUserApi({
        fullName: regFullName,
        phone: regPhone || '7000-0000',
        dui: regDui,
        role: 'PASSENGER',
        referrerCode
      });

      const profile = {
        id: googleTempUser?.id || `usr-${Date.now()}`,
        fullName: regFullName,
        email: emailToSave,
        dui: regDui,
        phone: regPhone || '7000-0000',
        photoUrl: googleTempUser?.photoUrl || null,
        provider: googleTempUser ? 'google' : 'manual',
        isVerified: true
      };

      handleCompleteRegistrationWithBonus(profile);
    } catch (err) {
      console.warn('Fallback local al registrar:', err.message);
      const fallbackProfile = {
        id: googleTempUser?.id || `usr-${Date.now()}`,
        fullName: regFullName,
        email: emailToSave,
        dui: regDui,
        phone: regPhone || '7000-0000',
        photoUrl: googleTempUser?.photoUrl || null,
        provider: googleTempUser ? 'google' : 'manual',
        isVerified: true
      };
      handleCompleteRegistrationWithBonus(fallbackProfile);
    } finally {
      setRegistering(false);
    }
  };

  // Manejar Autenticación con Google (Obtener Nombre, Email y solicitar DUI)
  const handleSelectGoogleAccount = (account) => {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);
      setShowGoogleAuthModal(false);

      // Guardamos datos de Google (Nombre y Email)
      setRegFullName(account.name);
      setRegEmail(account.email);
      setGoogleTempUser(account);

      // Como requerimos todos los datos completos (nombre, dui, email), solicitamos el DUI
      setGoogleDuiStep(true);
      setShowRegisterModal(true);
    }, 500);
  };

  // Abrir Google Identity Services real o modal interactivo
  const handleGoogleSignInClick = () => {
    const gClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (window.google?.accounts?.oauth2 && gClientId) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: gClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                if (res.ok) {
                  const googleUser = await res.json();
                  handleSelectGoogleAccount({
                    id: googleUser.sub || `google-${Date.now()}`,
                    name: googleUser.name || 'Usuario Google',
                    email: googleUser.email,
                    photoUrl: googleUser.picture
                  });
                  return;
                }
              } catch (err) {
                console.warn('Error fetching google userinfo:', err);
              }
            }
          }
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('Error en Google tokenClient:', err);
      }
    }

    // Modal oficial interactivo de Google
    setShowGoogleAuthModal(true);
  };

  // Enviar invitación de referido por WhatsApp
  const handleSendWhatsAppReferral = () => {
    const cleanPhone = (refContactPhone || '70000000').replace(/\D/g, '');
    const msg = "Te invito a utilizar la plataforma de Rumbo a tu destino: https://demiempresa.online/viajes";
    const waUrl = `https://wa.me/503${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    // 1. Sonido de caja registradora ("Cha-Ching" / moneda)
    triggerCashRewardFeedback();

    // 2. Confetti de monedas doradas
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#FBBF24'],
        zIndex: 99999
      });
    } catch {}

    setReferralBonusAwarded(true);

    // 3. Locución del asistente
    speakAssistantMessage(
      '¡Excelente! Se ha abonado un dólar a tu cuenta con una vigencia de 7 días, siempre y cuando tu referido realice un viaje pagado por un mínimo de 3 dólares en los próximos 7 días.'
    );
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
          {/* Avatar Oficial del Asistente de Voz (Ámbar y Blanco) */}
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            title={
              isListeningVoice
                ? 'Asistente escuchando... Toca para pausar'
                : 'Asistente de Voz Rumbo (Toca para dictar tu rumbo)'
            }
            aria-label={
              isListeningVoice
                ? 'Asistente escuchando tu destino, presiona para pausar'
                : 'Activar asistente de voz Rumbo'
            }
            className={`p-1 pl-1.5 pr-2.5 rounded-full border flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
              isListeningVoice
                ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 border-slate-700/80 hover:border-amber-400/50 hover:bg-slate-800'
            }`}
          >
            {/* Avatar Orb Ámbar y Blanco */}
            <div className={`relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center overflow-hidden transition-transform shadow-md ${
              isListeningVoice
                ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 scale-105'
                : 'bg-gradient-to-tr from-amber-500 to-amber-400'
            }`}>
              {isListeningVoice && (
                <span className="absolute inset-0 rounded-full bg-white/40 animate-ping pointer-events-none" />
              )}
              <Mic className={`w-3.5 h-3.5 text-white drop-shadow-sm ${isListeningVoice ? 'animate-bounce' : ''}`} />
            </div>

            <div className="flex flex-col text-left leading-none">
              <span className="text-[11px] font-black text-white">
                Asistente
              </span>
              <span className="text-[9px] font-bold text-amber-400 mt-0.5">
                {isListeningVoice ? 'Escuchando...' : 'Voz activa'}
              </span>
            </div>
          </button>

          {/* Estado dinámico del Asistente por Voz */}
          {(voiceDialogueStep !== 'IDLE' || isListeningVoice) && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>{isListeningVoice ? 'Escuchando rumbo...' : 'Hablando...'}</span>
            </div>
          )}

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
                    onChange={(e) => {
                      setDestination(e.target.value);
                      if (destinationCoords) setDestinationCoords(null);
                      if (destinationError) setDestinationError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGeocodeManualDestination(destination);
                      }
                    }}
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

                {/* Notificación visual por escrito si el destino no es encontrado */}
                {destinationError && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span className="leading-tight font-medium text-[11px] sm:text-xs">
                        {destinationError}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDestMapModal(true)}
                      className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black rounded-lg text-[10px] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      Fijar en Mapa
                    </button>
                  </div>
                )}

                {/* Botón para Confirmar Destino Manual si aún no tiene coordenadas */}
                {!isDestinationConfirmed && destination.trim().length > 1 && (
                  <div className="mt-2.5 animate-fade-in">
                    <button
                      type="button"
                      disabled={isSearchingDest}
                      onClick={() => handleGeocodeManualDestination(destination)}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isSearchingDest ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Confirmando rumbo...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmar Rumbo</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

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

              {/* ========================================================= */}
              {/* BLOQUE PROGRESIVO: Solo se revela tras confirmar destino */}
              {/* ========================================================= */}
              {isDestinationConfirmed && (
                <div className="space-y-4 pt-3 border-t border-slate-800/80 animate-fade-in">

                  {/* Selector de Tipo de Transporte: Auto / Carro vs Moto */}
                  <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectTransportType('CAR')}
                      className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        transportType === 'CAR'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Car className="w-4 h-4 flex-shrink-0" />
                      <div className="text-left leading-tight">
                        <span className="block text-xs font-bold">Auto / Carro</span>
                        <span className="block text-[10px] opacity-75 font-normal">Hasta 4 pax • Con A/C</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTransportType('MOTO')}
                      className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        transportType === 'MOTO'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Bike className="w-4 h-4 flex-shrink-0" />
                      <div className="text-left leading-tight">
                        <span className="block text-xs font-bold">Moto</span>
                        <span className="block text-[10px] opacity-75 font-normal">Económico • Rápido</span>
                      </div>
                    </button>
                  </div>

                  {/* Selector de Servicio: Pasajero vs Encomienda */}
                  <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setServiceType('PASSENGER')}
                      className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                      className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        serviceType === 'PACKAGE'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Envío Paquete</span>
                    </button>
                  </div>

                  {/* Selector de Modalidad: Solo Ida vs Ida y Vuelta */}
                  <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold gap-1">
                    <button
                      type="button"
                      data-role="selection"
                      onClick={() => setTripPreferences((prev) => ({ ...prev, isRoundTrip: false }))}
                      className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !tripPreferences.isRoundTrip
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Solo Ida</span>
                    </button>
                    <button
                      type="button"
                      data-role="selection"
                      onClick={() => setTripPreferences((prev) => ({ ...prev, isRoundTrip: true }))}
                      className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        tripPreferences.isRoundTrip
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ida y Vuelta</span>
                    </button>
                  </div>

                  {/* Selector de Tiempo de Espera en Destino para Ida y Vuelta */}
                  {tripPreferences.isRoundTrip && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 animate-fade-in text-xs">
                      <div className="flex items-center justify-between text-amber-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Espera en destino para el retorno:</span>
                        </span>
                        <span className="text-[10px] text-amber-400/90 bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                          +$0.05/min
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold">
                        {[
                          { min: 0, label: 'Inmediato' },
                          { min: 15, label: '15 min' },
                          { min: 30, label: '30 min' },
                          { min: 60, label: '1 hora' }
                        ].map((opt) => (
                          <button
                            key={opt.min}
                            type="button"
                            data-role="selection"
                            onClick={() => setTripPreferences((prev) => ({ ...prev, roundTripWaitMinutes: opt.min }))}
                            className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                              tripPreferences.roundTripWaitMinutes === opt.min
                                ? 'bg-amber-500 border-amber-400 text-slate-950 font-black'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                    onChange={(e) => handleFareInputChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-extrabold text-xl focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Botones de Selección Rápida: Mínima recomendada y siguientes tarifas hacia arriba */}
                <div className="flex gap-2 mt-2">
                  {quickFareOptions.map((amt, idx) => (
                    <button
                      key={`${amt}-${idx}`}
                      type="button"
                      onClick={() => handleSelectQuickFare(amt)}
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

                {/* Política Estricta de A/C: Si la tarifa actual es menor a la sugerida */}
                {parseFloat(proposedFare) < parseFloat(suggestedFareInfo?.suggestedFare) && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-2 text-[11px] text-cyan-300 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-cyan-400/70 flex-shrink-0" />
                      <span className="leading-tight text-[11px]">
                        A/C no aplica con tarifa menor a la sugerida (${suggestedFareInfo.suggestedFare}).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleEnableAcWithSuggestedFare}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] whitespace-nowrap cursor-pointer transition-all shadow-sm"
                    >
                      Activar con A/C (${suggestedFareInfo.suggestedFare})
                    </button>
                  </div>
                )}
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
                    { id: 'EXACT', label: 'Exacto', val: 0 },
                    { id: '5', label: '$5', val: 5 },
                    { id: '10', label: '$10', val: 10 },
                    { id: '20', label: '$20', val: 20 },
                    { id: '50+', label: '$50+', val: 50 }
                  ].map((bill) => {
                    const fareNum = parseFloat(proposedFare) || 0;
                    const isDisabled = bill.val > 0 && bill.id !== '50+' ? bill.val <= fareNum : (bill.id === '50+' ? fareNum >= 100 : false);
                    return (
                      <button
                        key={bill.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            triggerSelectionFeedback();
                            setCashBill(bill.id);
                          }
                        }}
                        className={`py-2 px-1 rounded-xl text-center transition-all ${
                          isDisabled
                            ? 'opacity-30 cursor-not-allowed bg-slate-900 border border-slate-800 text-slate-600 line-through'
                            : cashBill === bill.id
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-black cursor-pointer'
                            : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer'
                        }`}
                        title={isDisabled ? `El billete debe ser mayor a la oferta ($${fareNum.toFixed(2)})` : ''}
                      >
                        {bill.label}
                      </button>
                    );
                  })}
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

            </div>
          )}

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
                  className={`bg-slate-900 border ${
                    offer.isMock ? 'border-amber-500/40' : 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                  } rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden transition-all`}
                >
                  {/* Barra de progreso de TTL (10s exactos) */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(offer.timeLeft / 10) * 100}%` }}
                    ></div>
                  </div>

                  {/* Viñeta Visual: Identificación de Prueba vs Chofer Real */}
                  <div className="flex items-center justify-between pt-1">
                    {offer.isMock ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Simulación de Prueba</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Chofer Real en Línea</span>
                      </span>
                    )}
                    <span className="text-[10px] text-rose-400 font-bold">
                      Expira en {offer.timeLeft}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
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
                      <div className="text-2xl font-black text-white font-mono">
                        ${offer.proposedFare}
                      </div>
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
      {/* MODAL TRANQUILO: PERFIL DE SEGURIDAD Y BONOS (EN TRAYECTO)     */}
      {/* ============================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Perfil de Seguridad y Bonos</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRegisterModal(false);
                  setGoogleDuiStep(false);
                }}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {googleDuiStep ? (
              /* PASO 2 TRAS GOOGLE: COMPLETAR DUI Y TELÉFONO */
              <div className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {googleTempUser?.photoUrl ? (
                      <img src={googleTempUser.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {regFullName ? regFullName[0].toUpperCase() : 'G'}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{regFullName}</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">Google</span>
                      </div>
                      <div className="text-xs text-slate-400">{regEmail}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleDuiStep(false);
                      setGoogleTempUser(null);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>

                <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed">
                  Para completar los 3 datos oficiales (<strong>Nombre</strong>, <strong>Email</strong> y <strong>DUI</strong>) y liberar de inmediato tu <strong>bono de bienvenida de $1.00 USD</strong>, ingresa tu documento salvadoreño:
                </div>

                <form onSubmit={handleSaveProfileAndAccept} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      DUI (El Salvador: 00000000-0)
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={regDui}
                      onChange={handleDuiChange}
                      placeholder="01234567-8"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-wider text-center"
                    />
                    {duiError && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {duiError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Teléfono Móvil (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="7000-0000"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 text-center"
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
                      onClick={() => {
                        setShowRegisterModal(false);
                        setGoogleDuiStep(false);
                      }}
                      className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={registering}
                      className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      {registering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verificando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>¡Completar y Ganar $1.00!</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* PASO INICIAL: GOOGLE SIGN-IN O REGISTRO MANUAL COMPLETO */
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Ahora que tu viaje ya está asegurado y en camino, valida tu cuenta una única vez para activar tus créditos y viajar con máxima tranquilidad.
                </p>

                {/* BOTÓN DESTACADO: CONTINUAR CON GOOGLE */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200 group"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9 shadow-none"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                      />
                    </svg>
                    <span>Continuar con Google</span>
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Validación oficial protegida por Google Security</span>
                  </div>
                </div>

                {/* Separador */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full"></div>
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-bold tracking-wider">o ingresa tus datos</span>
                  <div className="border-t border-slate-800 w-full"></div>
                </div>

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
                      Correo Electrónico (Email)
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
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
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-wider"
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
                      className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                    >
                      Completar Luego
                    </button>
                    <button
                      type="submit"
                      disabled={registering}
                      className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      {registering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <span>Guardar y Ganar $1.00</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PANTALLA OFICIAL DE GOOGLE: "ACCEDER CON GOOGLE"                */}
      {/* ============================================================== */}
      {showGoogleAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-white text-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header Google */}
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <svg className="w-9 h-9" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                  <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-slate-900 tracking-tight">Acceder con Google</h3>
              <p className="text-xs text-slate-500">
                Selecciona una cuenta para continuar a <strong className="text-slate-800">demiempresa.online</strong>
              </p>
            </div>

            {/* Cuentas de Google */}
            <div className="divide-y divide-slate-100 border-y border-slate-100 -mx-6 px-6">
              {[
                {
                  id: 'google-usr-1',
                  name: 'Carlos Alfaro',
                  email: 'cealfarias@gmail.com',
                  photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
                  initial: 'C',
                  bgColor: 'bg-blue-600'
                },
                {
                  id: 'google-usr-2',
                  name: 'Usuario DemiEmpresa',
                  email: 'pasajero.salvador@gmail.com',
                  photoUrl: null,
                  initial: 'U',
                  bgColor: 'bg-emerald-600'
                }
              ].map((acc) => (
                <button
                  key={acc.id}
                  disabled={googleLoading}
                  onClick={() => handleSelectGoogleAccount(acc)}
                  className="w-full py-3 flex items-center justify-between hover:bg-slate-50 -mx-3 px-3 rounded-xl transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    {acc.photoUrl ? (
                      <img src={acc.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${acc.bgColor} text-white font-bold flex items-center justify-center text-sm shadow-sm`}>
                        {acc.initial}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{acc.name}</div>
                      <div className="text-xs text-slate-500">{acc.email}</div>
                    </div>
                  </div>
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              ))}

              <button
                type="button"
                disabled={googleLoading}
                onClick={() => {
                  const customName = prompt('Introduce tu nombre para acceder con Google:') || 'Usuario Google';
                  const customEmail = prompt('Introduce tu correo de Gmail:') || 'usuario@gmail.com';
                  handleSelectGoogleAccount({
                    id: `google-${Date.now()}`,
                    name: customName,
                    email: customEmail,
                    initial: customName[0].toUpperCase(),
                    bgColor: 'bg-purple-600'
                  });
                }}
                className="w-full py-3 flex items-center gap-3 text-slate-700 hover:bg-slate-50 -mx-3 px-3 rounded-xl transition-all cursor-pointer text-xs font-semibold"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <span>Usar otra cuenta</span>
              </button>
            </div>

            {/* Disclaimer legal Google */}
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Para continuar, Google compartirá tu nombre, dirección de correo electrónico y foto de perfil con demiempresa.online.
            </p>

            {/* Botón Cancelar */}
            <button
              type="button"
              onClick={() => setShowGoogleAuthModal(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-50 cursor-pointer transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL REBOTÓN: CELEBRACIÓN CON FUEGOS ARTIFICIALES Y BONO $1.00*/}
      {/* ============================================================== */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-pop-bounce relative overflow-hidden">
            {/* Resplandor decorativo */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Ícono de celebración rebotón */}
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sparkles className="w-10 h-10 text-slate-950" />
              </div>
              <span className="absolute -top-1 -right-1 text-2xl animate-bounce">🎉</span>
              <span className="absolute -bottom-1 -left-1 text-2xl animate-pulse">✨</span>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>¡Inscripción Exitosa!</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                ¡Felicidades, {celebrationName}!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Te has registrado exitosamente en la plataforma de <strong className="text-amber-400">Rumbo a tu destino</strong> con tus datos oficiales completos.
              </p>
            </div>

            {/* Tarjeta del Bono de $1.00 USD */}
            <div className="bg-slate-950/90 border border-amber-400/50 rounded-2xl p-4 space-y-2 shadow-inner">
              <div className="text-[11px] font-semibold text-amber-300/90 uppercase tracking-wider">
                Has recibido un bono de bienvenida
              </div>
              <div className="text-4xl font-black text-amber-400 font-mono tracking-wider drop-shadow-md">
                +$1.00 <span className="text-lg font-bold text-amber-200">USD</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Será usado automáticamente en tu próximo viaje
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span>Caducidad: 7 días a partir de hoy</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCelebrationModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 cursor-pointer transition-transform active:scale-95"
            >
              ¡Excelente, gracias!
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PREGUNTA TRAS 10 SEGUNDOS: "¿QUIERES MÁS BONOS?"               */}
      {/* ============================================================== */}
      {showMoreBonusesPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-pop-bounce">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Gift className="w-8 h-8 text-amber-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white tracking-tight">
                ¿Quieres más bonos?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ¡Puedes ganar saldo adicional en dólares para tus próximos viajes en <strong className="text-amber-400">Rumbo a tu destino</strong> recomendando amigos!
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowMoreBonusesPrompt(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Declinar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreBonusesPrompt(false);
                  setReferralBonusAwarded(false);
                  setShowReferralModal(true);
                }}
                className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Aceptar más bonos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RECUADRO MÁGICO DE REFERIDOS POR WHATSAPP (REGLA 7 DÍAS / $3)  */}
      {/* ============================================================== */}
      {showReferralModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 border-2 border-emerald-400/50 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4 animate-pop-bounce relative overflow-hidden">
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => setShowReferralModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>

            {/* Cabecera mágica */}
            <div className="text-center space-y-1.5 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>¡Bono por Referidos!</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Gana $1.00 por cada persona referida
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Obtén otro dólar de bonificación por cada persona que refieras a la app. Ingresa su nombre y número de WhatsApp para enviarle la invitación oficial.
              </p>
            </div>

            {!referralBonusAwarded ? (
              <div className="space-y-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre de tu referido
                  </label>
                  <input
                    type="text"
                    value={refContactName}
                    onChange={(e) => setRefContactName(e.target.value)}
                    placeholder="Ej. María Santos"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Número de WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={refContactPhone}
                    onChange={(e) => setRefContactPhone(e.target.value)}
                    placeholder="7000-0000"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Mensaje oficial predeterminado */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 space-y-1">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Mensaje que se enviará:</span>
                  </div>
                  <p className="italic text-[11px] text-emerald-100/90 bg-black/30 p-2 rounded-lg font-mono">
                    "Te invito a utilizar la plataforma de Rumbo a tu destino: https://demiempresa.online/viajes"
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendWhatsAppReferral}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <Phone className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            ) : (
              /* Recuadro de confirmación y acreditación */
              <div className="bg-slate-950/80 border border-emerald-400/50 rounded-2xl p-5 text-center space-y-3 animate-pop-bounce">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>

                <div className="space-y-1">
                  <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                    +$1.00 USD Abonado a tu cuenta
                  </div>
                  <p className="text-xs text-slate-200 font-medium">
                    ¡Mensaje de invitación enviado con éxito a {refContactName || 'tu referido'}!
                  </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 text-left space-y-1.5 text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Regla de vigencia y canje:</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Tiene una <strong>vigencia de 7 días</strong> para su uso, siempre y cuando el referido haya hecho un viaje pagado por un <strong>mínimo de $3.00 USD</strong> en los próximos 7 días.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReferralBonusAwarded(false);
                      setRefContactName('');
                      setRefContactPhone('');
                    }}
                    className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Invitar a otro amigo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReferralModal(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}
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

          {/* Perfil de Seguridad y Bono en Trayecto (Sin Prisa ni Estrés) */}
          {!userProfile ? (
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-4 shadow-xl space-y-2 animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Perfil de Seguridad y Bono de $1.00 USD</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ya vas seguro y en camino. Valida con Google en 1 toque para asegurar tu identidad y futuros descuentos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl whitespace-nowrap cursor-pointer transition-all shadow-md shadow-amber-500/20"
                >
                  Validar Perfil
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3 shadow-lg flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                {userProfile.photoUrl ? (
                  <img src={userProfile.photoUrl} alt="" className="w-8 h-8 rounded-full border border-emerald-400 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    {userProfile.fullName?.[0] || 'G'}
                  </div>
                )}
                <div>
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <span>{userProfile.fullName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ✓ Verificado
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {userProfile.email || 'Perfil activo con bono de $1.00 USD'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  Bono $1.00 Activo
                </span>
              </div>
            </div>
          )}

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
        onConfirm={async ({ address, lat, lng }) => {
          setOrigin(address);
          const oCoords = { lat, lng };
          setOriginCoords(oCoords);

          if (destinationCoords) {
            const routeRes = await calculateRoadDistance(oCoords, destinationCoords);
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
            const fareData = calculateSuggestedFare(
              distKm,
              transportType === 'MOTO' ? 115.0 : 42.0,
              3.80,
              delayMin,
              { ...tripPreferences, transportType }
            );
            setProposedFare(fareData.suggestedFare);
            const speechMsg = `Pin de recogida colocado en ${address}, a ${distKm} kilómetros de tu destino y tiempo de llegada aproximado en ${durMin} minutos.`;
            speakAssistantMessage(speechMsg);
          } else {
            speakAssistantMessage(`Pin de recogida colocado en ${address}.`);
          }
        }}
      />

      {/* Modal Interactivo de Destino con Pin Rojo y Detección de Municipio */}
      <DestinationMapModal
        isOpen={showDestMapModal}
        onClose={() => setShowDestMapModal(false)}
        originCoords={originCoords}
        initialCoords={destinationCoords || { lat: 13.6738, lng: -89.2789 }}
        initialAddress={destination}
        onConfirm={async ({ address, lat, lng, municipality, distanceKm, durationMinutes }) => {
          setDestination(address);
          const dCoords = { lat, lng };
          setDestinationCoords(dCoords);
          if (municipality) {
            setDestinationMunicipality(municipality);
          }

          const oCoords = originCoords || { lat: 13.7013, lng: -89.2244 };
          const routeRes = await calculateRoadDistance(oCoords, dCoords);
          const distKm = routeRes?.distanceKm || distanceKm || 5.0;
          const durMin = routeRes?.durationMinutes || durationMinutes || 14;
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

          const fareData = calculateSuggestedFare(
            distKm,
            transportType === 'MOTO' ? 115.0 : 42.0,
            3.80,
            delayMin,
            { ...tripPreferences, transportType }
          );
          setProposedFare(fareData.suggestedFare);

          // Confirmación por audio requerida al ubicar el pin en el mapa
          const speechMsg = `Pin colocado en ${address}, que está ubicado a ${distKm} kilómetros y tiempo de llegada aproximado en ${durMin} minutos. La tarifa sugerida es de ${fareData.suggestedFare} dólares.`;
          speakAssistantMessage(speechMsg);
        }}
      />

      {/* Modal de Preferencias del Viaje (A/C, Mascotas, Pasajeros, Equipaje) */}
      <TripPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        preferences={tripPreferences}
        suggestedFare={suggestedFareInfo.suggestedFare}
        proposedFare={proposedFare}
        transportType={transportType}
        onRequireSuggestedFare={handleEnableAcWithSuggestedFare}
        onChange={(newPrefs) => {
          if (newPrefs.airConditioning && !tripPreferences.airConditioning) {
            handleEnableAcWithSuggestedFare();
          } else {
            setTripPreferences(newPrefs);
          }
        }}
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
