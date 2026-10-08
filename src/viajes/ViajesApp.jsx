import React, { useState, useEffect, useRef } from 'react';
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
  ShieldAlert,
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
  Gift,
  LogOut,
  Inbox,
  Globe,
  FileText,
  Search,
  Check,
  Compass,
  Star,
  LogIn,
  UserPlus,
  Bell,
  BellRing
} from 'lucide-react';
import { isPushSupported, getPushPermissionState, subscribeUserToPush, testPushNotification } from './pushManager';
import RumboLogo from './RumboLogo';
import AdModal from './AdModal';
import RumboInboxModal from './RumboInboxModal';
import PickupMapModal from './PickupMapModal';
import DestinationMapModal from './DestinationMapModal';
import TripPreferencesModal from './TripPreferencesModal';
import LocationPermissionModal from './LocationPermissionModal';
import WelcomeVoiceModal from './WelcomeVoiceModal';
import TermsAndConditionsModal from '../components/TermsAndConditionsModal';
import ExitIntentRescueModal from './ExitIntentRescueModal';
import { getSharePayload } from './whatsappShareService';
import {
  unlockAudioAndSpeech,
  speakAssistantMessage,
  stopSpeaking,
  startVoiceDictation,
  stopVoiceDictation,
  speakAndThenListen,
  classifyUserVoiceIntent,
  parseNumberFromSpanish,
  isSpeechRecognitionSupported,
  setVoiceMuted,
  getVoiceMuted
} from './voiceAssistantService';
import {
  triggerButtonFeedback,
  triggerSelectionFeedback,
  triggerSearchLaunchFeedback,
  triggerCashRewardFeedback,
  triggerListeningStartFeedback,
  triggerListeningEndFeedback,
  triggerListeningErrorFeedback,
  resumeAudioContext
} from './soundFeedbackService';
import confetti from 'canvas-confetti';
import { calculateRoadDistance, calculateSuggestedFare, PASSENGER_WEIGHT_PROFILES, OFFICIAL_GOV_PRICES } from './fuelService';
import {
  socket,
  registerUserApi,
  loginUserApi,
  fetchUserCreditsApi,
  fetchAdFeedApi,
  checkContactRegisteredApi,
  dismissReferralNoticeApi,
  initSessionTelemetry
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

export function calculateBearing(origCoords, destCoords) {
  if (!origCoords || !destCoords) return 90.0;
  const radLat1 = (origCoords.lat * Math.PI) / 180;
  const radLat2 = (destCoords.lat * Math.PI) / 180;
  const dLng = ((destCoords.lng - origCoords.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(radLat2);
  const x = Math.cos(radLat1) * Math.sin(radLat2) - Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(dLng);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;
  return Number(bearing.toFixed(1));
}

export function getAngularDifference(b1, b2) {
  return Math.abs(((b1 - b2 + 180) % 360) - 180);
}

export function calculateCorridor(origCoords, destCoords) {
  if (!origCoords || !destCoords) {
    return {
      corridorCode: 'ESTE_EJERCITO',
      direction: 'ESTE',
      directionLabel: 'De Este a Este',
      corridorName: 'Corredor Oriente - Bulevar del Ejército (Soyapango / Ilopango / San Martín)',
      straightLineKm: 5.0,
      bearing: 90.0
    };
  }
  const deltaLat = destCoords.lat - origCoords.lat;
  const deltaLng = destCoords.lng - origCoords.lng;
  const straightLineKm = Math.sqrt(
    Math.pow(deltaLat * 111, 2) +
    Math.pow(deltaLng * 111 * Math.cos((origCoords.lat * Math.PI) / 180), 2)
  );
  const bearing = calculateBearing(origCoords, destCoords);

  let corridorCode = 'ESTE_EJERCITO';
  let direction = 'ESTE';
  let directionLabel = 'De Este a Este';
  let corridorName = 'Corredor Oriente - Bulevar del Ejército (Soyapango / Ilopango / San Martín)';

  // Clasificación por cuadrantes geográficos y discriminación de ejes viales
  if (Math.abs(deltaLng) >= Math.abs(deltaLat)) {
    if (deltaLng > 0) {
      direction = 'ESTE';
      directionLabel = 'De Este a Este';
      // Diferenciación de Carretera de Oro vs Bulevar del Ejército
      if (destCoords.lat >= 13.715) {
        corridorCode = 'ESTE_ORO';
        corridorName = 'Corredor Oriente - Carretera de Oro (Altavista / Tonacatepeque / Delgado Norte)';
      } else {
        corridorCode = 'ESTE_EJERCITO';
        corridorName = 'Corredor Oriente - Bulevar del Ejército (Soyapango / Ilopango / San Martín)';
      }
    } else {
      direction = 'OESTE';
      directionLabel = 'De Oeste a Oeste';
      // Diferenciación de Carretera al Puerto (Zaragoza / Nuevo Cuscatlán) vs Panamericana (Santa Tecla / Lourdes)
      if (destCoords.lat <= 13.655) {
        corridorCode = 'OESTE_PUERTO';
        corridorName = 'Corredor Poniente - Carretera al Puerto (Zaragoza / Nuevo Cuscatlán / San José V.)';
      } else {
        corridorCode = 'OESTE_PANAMERICANA';
        corridorName = 'Corredor Poniente - Panamericana (Santa Tecla / Antiguo Cuscatlán / Lourdes)';
      }
    }
  } else {
    if (deltaLat > 0) {
      direction = 'NORTE';
      directionLabel = 'De Norte a Norte';
      // Diferenciación de Constitución vs Troncal del Norte
      if (destCoords.lng <= -89.225) {
        corridorCode = 'NORTE_CONSTITUCION';
        corridorName = 'Corredor Norte - Constitución (Nejapa / Quezaltepeque)';
      } else {
        corridorCode = 'NORTE_TRONCAL';
        corridorName = 'Corredor Norte - Troncal del Norte (Ciudad Delgado / Apopa / Guazapa / Aguilares)';
      }
    } else {
      direction = 'SUR';
      directionLabel = 'De Sur a Sur';
      // DISCRIMINACIÓN CRÍTICA DEL CORREDOR SUR (EVITA ZONAS DISPAREJAS):
      // Autopista a Comalapa (San Marcos / Sto. Tomás / Santiago Texacuangos) vs Carretera a Los Planes (Planes / Panchimalco / Rosario de Mora)
      // Separadas topográficamente por la cordillera y el Cerro San Jacinto
      if (destCoords.lng > -89.205) {
        corridorCode = 'SUR_COMALAPA';
        corridorName = 'Corredor Sur - Autopista Comalapa (San Marcos / Sto. Tomás / Santiago Texacuangos)';
      } else {
        corridorCode = 'SUR_PANCHIMALCO';
        corridorName = 'Corredor Sur - Carretera Los Planes (Planes de Renderos / Panchimalco / Rosario de Mora)';
      }
    }
  }

  return {
    corridorCode,
    direction,
    directionLabel,
    corridorName,
    straightLineKm: Number(straightLineKm.toFixed(1)),
    bearing
  };
}

// Catálogo Oficial de Avatares Predefinidos de Pasajeros Rumbo (Livianos, Amigables y Privados)
export const PASSENGER_AVATARS = [
  { id: 'w1', emoji: '👩‍💼', label: 'Ejecutiva', colors: ['#8B5CF6', '#6D28D9'] },
  { id: 'm1', emoji: '👨‍💼', label: 'Ejecutivo', colors: ['#3B82F6', '#1D4ED8'] },
  { id: 'w2', emoji: '👩', label: 'Urbana', colors: ['#EC4899', '#BE185D'] },
  { id: 'm2', emoji: '👨', label: 'Urbano', colors: ['#10B981', '#047857'] },
  { id: 'w3', emoji: '👧', label: 'Joven', colors: ['#F59E0B', '#B45309'] },
  { id: 'm3', emoji: '👦', label: 'Joven', colors: ['#06B6D4', '#0E7490'] },
  { id: 'stu', emoji: '🧑‍🎓', label: 'Estudiante', colors: ['#6366F1', '#4338CA'] },
  { id: 'hjb', emoji: '🧕', label: 'Moderna', colors: ['#14B8A6', '#0F766E'] },
  { id: 'trv', emoji: '🕶️', label: 'Viajero', colors: ['#64748B', '#334155'] },
  { id: 'str', emoji: '⭐', label: 'Rumbo', colors: ['#EAB308', '#CA8A04'] }
];

export const createAvatarSvgDataUri = (emoji, [c1, c2]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#g)"/><text x="50" y="65" font-size="52" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export default function ViajesApp() {
  // 1. Leer borrador guardado y sesión de viaje activa para resistir recargas y F5 sin perder datos
  const initialDraft = (() => {
    try {
      if (typeof window === 'undefined') return {};
      return JSON.parse(localStorage.getItem('rumbo_passenger_draft') || '{}');
    } catch {
      return {};
    }
  })();

  const initialActiveTripSession = (() => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('rumbo_passenger_active_session');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Blindaje de auto-expiración contra pestañas congeladas:
      // Si la sesión no tiene savedAt (versión anterior huérfana de 3 días) o tiene > 4 horas, se purga de raíz
      const sessionAgeMs = parsed.savedAt ? (Date.now() - parsed.savedAt) : Infinity;
      const MAX_TRIP_SESSION_AGE_MS = 4 * 60 * 60 * 1000; // 4 horas máximo
      if (!parsed.savedAt || sessionAgeMs > MAX_TRIP_SESSION_AGE_MS) {
        console.warn('🧹 Purgando sesión huérfana de viaje caducada (> 4h o sin timestamp):', parsed);
        localStorage.removeItem('rumbo_passenger_active_session');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('rumbo_passenger_active_session');
      return null;
    }
  })();

  // Máquina de Estados: 'DECOY_FORM' | 'AUCTION' | 'IN_TRIP_HUB'
  const [appState, setAppState] = useState(() => initialActiveTripSession?.appState || 'DECOY_FORM');
  // Modalidad del Viaje: 'UNDECIDED' | 'PRIVATE' | 'SHARED'
  const [rideMode, setRideMode] = useState(() => initialActiveTripSession?.rideMode || 'UNDECIDED');
  const rideModeRef = useRef(rideMode);
  useEffect(() => {
    rideModeRef.current = rideMode;
  }, [rideMode]);
  const [sharedPoolGenderFilter, setSharedPoolGenderFilter] = useState('ALL'); // 'ALL' | 'WOMEN_ONLY'
  const [poolStatus, setPoolStatus] = useState(null);
  const [isJoinedToPool, setIsJoinedToPool] = useState(false);
  const [showSharedRegisterPrompt, setShowSharedRegisterPrompt] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [tripRating, setTripRating] = useState(5);
  const [driverTip, setDriverTip] = useState(0);
  const [serviceType, setServiceType] = useState(() => initialActiveTripSession?.serviceType || initialDraft.serviceType || 'PASSENGER'); // 'PASSENGER' | 'PACKAGE'
  const [transportType, setTransportType] = useState(() => initialActiveTripSession?.transportType || initialDraft.transportType || 'CAR'); // 'CAR' | 'MOTO'

  // Tema de la Aplicación: 'dark' | 'light' (mutuamente excluyente)
  const [theme, setTheme] = useState(() => localStorage.getItem('rumbo_theme') || 'dark');
  const isLight = theme === 'light';

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('rumbo_theme', newTheme);
  };

  // Control de Silencio del Asistente de Voz (Icono de Mono tapándose la boca 🙊)
  const [isVoiceMuted, setIsVoiceMuted] = useState(() => getVoiceMuted());

  const handleToggleVoiceMute = () => {
    const nextMuted = !isVoiceMuted;
    setIsVoiceMuted(nextMuted);
    setVoiceMuted(nextMuted);
  };

  // Control de Notificaciones Push Web en segundo plano
  const [pushPermission, setPushPermission] = useState(() => getPushPermissionState());
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);

  const handleTogglePushNotifications = async () => {
    if (!isPushSupported()) {
      alert('Tu navegador no soporta notificaciones push. Te sugerimos usar Google Chrome en Android o Safari añadiendo la app a la pantalla de inicio en iOS.');
      return;
    }
    if (pushPermission === 'denied') {
      alert('Las notificaciones están bloqueadas en los permisos de tu navegador. Puedes habilitarlas tocando el icono de candado o configuración en la barra de direcciones.');
      return;
    }
    setIsSubscribingPush(true);
    try {
      const res = await subscribeUserToPush({
        userId: userProfile?.id,
        userType: 'PASSENGER'
      });
      if (res.success) {
        setPushPermission('granted');
        speakAssistantMessage('Notificaciones activadas. Te avisaremos cuando tu conductor llegue o se complete tu colectivo.');
        await testPushNotification({ userId: userProfile?.id, userType: 'PASSENGER' });
      } else if (res.reason === 'DENIED') {
        setPushPermission('denied');
      }
    } catch (err) {
      console.warn('Error activando notificaciones push:', err);
    } finally {
      setIsSubscribingPush(false);
    }
  };

  // Inicializar Telemetría Automática de Sesión y Permanencia (Pasajeros)
  useEffect(() => {
    const cleanup = initSessionTelemetry('PASSENGER');
    return cleanup;
  }, []);

  // Datos del Viaje (interactivos y persistidos contra recargas)
  const [origin, setOrigin] = useState(() => initialActiveTripSession?.origin || initialDraft.origin || '');
  const [originCoords, setOriginCoords] = useState(() => initialActiveTripSession?.originCoords || initialDraft.originCoords || null);
  const [destination, setDestination] = useState(() => initialActiveTripSession?.destination || initialDraft.destination || '');
  const [destinationCoords, setDestinationCoords] = useState(() => initialActiveTripSession?.destinationCoords || initialDraft.destinationCoords || null);
  const [destinationMunicipality, setDestinationMunicipality] = useState(() => initialActiveTripSession?.destinationMunicipality || initialDraft.destinationMunicipality || 'San Salvador');
  const [proposedFare, setProposedFare] = useState(() => initialActiveTripSession?.proposedFare || initialDraft.proposedFare || '2.50');
  const [hasCustomFare, setHasCustomFare] = useState(false);
  const [applyBonus, setApplyBonus] = useState(() => initialActiveTripSession?.applyBonus ?? initialDraft?.applyBonus ?? false);
  const [packageDetails, setPackageDetails] = useState('');
  const [paymentTiming, setPaymentTiming] = useState('AT_ORIGIN');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDestMapModal, setShowDestMapModal] = useState(false);
  const [cashBill, setCashBill] = useState(() => initialActiveTripSession?.cashBill || initialDraft.cashBill || '10'); // 'EXACT' | '5' | '10' | '20' | '50+'

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

  // Estado y accesibilidad para Punto de Recogida (Origen Manual y por Voz)
  const [originError, setOriginError] = useState('');
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isListeningOriginVoice, setIsListeningOriginVoice] = useState(false);
  const isOriginConfirmed = Boolean(originCoords?.lat && origin?.trim());

  // Geocodificar y confirmar punto de recogida (Origen)
  const handleGeocodeManualOrigin = async (textToSearch = origin) => {
    const query = (textToSearch || origin).trim();
    if (!query) return null;
    setIsSearchingOrigin(true);
    setOriginError('');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ', El Salvador'
        )}&countrycodes=sv&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          const oCoords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          setOriginCoords(oCoords);

          const formattedOrigin = formatResolvedDestination(data[0]);
          if (formattedOrigin) {
            setOrigin(formattedOrigin);
          }

          setIsSearchingOrigin(false);
          triggerSelectionFeedback();
          speakAssistantMessage(`Punto de recogida confirmado: ${formattedOrigin || query}`);
          return oCoords;
        }
      }
    } catch (err) {
      console.warn('Geocodificación manual origen err:', err);
    }

    setOriginError(`No se encontró "${query}". Indica otra referencia o abre el mapa.`);
    setIsSearchingOrigin(false);
    triggerListeningErrorFeedback();
    speakAssistantMessage(`No encontramos la ubicación de recogida para ${query}. Puedes indicar otra referencia o tocar el mapa.`);
    return null;
  };

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
          triggerSelectionFeedback();
          speakAssistantMessage(`Rumbo confirmado hacia: ${formattedDest || query}.`);
          return;
        }
      }
    } catch (err) {
      console.warn('Geocodificación manual err:', err);
    }

    setDestinationError(`No se encontró "${query}". Indica otra referencia o abre el mapa.`);
    setIsSearchingDest(false);
    triggerListeningErrorFeedback();
    speakAssistantMessage(`No encontramos el destino ${query}. Por favor indica otra referencia o toca el mapa.`);
  };

  // Preferencias Especiales del Viaje (A/C, Mascotas, Pasajeros, Equipaje, Contextura/Peso, Ida y Vuelta)
  const [tripPreferences, setTripPreferences] = useState({
    airConditioning: false,
    petFriendly: false,
    passengers: 1,
    weightProfile: 'NORMAL',
    needsVanOrMicrobus: false,
    extraLuggage: false,
    isRoundTrip: false,
    roundTripWaitMinutes: 0
  });
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);

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
    OFFICIAL_GOV_PRICES.regular,
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

  // El billete marcado en la zona de cambio siempre debe ser estrictamente mayor a la oferta en efectivo
  useEffect(() => {
    const fareVal = parseFloat(proposedFare) || 0;
    const effectiveCashFare = applyBonus ? Math.max(1.00, fareVal - 1.00) : fareVal;
    if (cashBill === 'EXACT') return;

    const currentVal = cashBill === '50+' ? 50 : (parseFloat(cashBill) || 0);
    if (cashBill !== '50+' && currentVal <= effectiveCashFare) {
      if (effectiveCashFare < 10) {
        setCashBill('10');
      } else if (effectiveCashFare < 20) {
        setCashBill('20');
      } else {
        setCashBill('50+');
      }
    }
  }, [proposedFare, applyBonus, cashBill]);

  const calculateChange = (fare = proposedFare) => {
    if (cashBill === 'EXACT') return '0.00';
    const fareVal = parseFloat(fare) || 0;
    const effectiveCashFare = applyBonus
      ? Math.max(1.00, fareVal - 1.00)
      : fareVal;
    if (cashBill === '50+') {
      return Math.max(0, 50 - effectiveCashFare).toFixed(2);
    }
    const billVal = parseFloat(cashBill);
    return Math.max(0, billVal - effectiveCashFare).toFixed(2);
  };

  // Frase guiada del cambio en voz: refleja fielmente el descuento por bonos con énfasis en la promesa de Rumbo
  const getChangeVoiceText = (currentFare = proposedFare, isBonusActive = applyBonus) => {
    const fareNum = parseFloat(currentFare) || 2.50;
    const effectiveCash = isBonusActive ? Math.max(1.00, fareNum - 1.00) : fareNum;
    if (cashBill === 'EXACT') {
      return isBonusActive
        ? `¡Lo prometido es deuda! Y el conductor te dará tu bono de bienvenida o referido, pagando únicamente ${effectiveCash.toFixed(2)} dólares exactos en efectivo.`
        : `Pagas con tarifa exacta de ${fareNum.toFixed(2)} dólares, no requieres cambio.`;
    }
    const billNum = cashBill === '50+' ? 50 : (parseFloat(cashBill) || 10);
    const changeAmt = Math.max(0, billNum - effectiveCash).toFixed(2);
    if (isBonusActive) {
      return `¡Lo prometido es deuda! Y el conductor te dará tu bono de bienvenida o referido, llevándote ${changeAmt} dólares de cambio para tu billete de ${billNum} dólares, es decir, un dólar más de vuelto para ti.`;
    }
    return `Al pagar con billete de ${billNum} dólares, el conductor te llevará ${changeAmt} dólares de cambio.`;
  };

  // Lista de precios sugeridos ordenados hacia arriba (iniciando por la mínima recomendada)
  const quickFareOptions = (() => {
    const minVal = parseFloat(suggestedFareInfo?.minimumRecommended) || (isMotoMode ? 1.50 : 2.50);
    const sugVal = parseFloat(suggestedFareInfo?.suggestedFare) || (isMotoMode ? 2.00 : 3.00);
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

  // Manejo de Selección de Transporte (Auto vs Moto) con Recálculo y Locución
  const handleSelectTransportType = (type) => {
    if (transportType === type) return; // Si ya está establecido, no hacer ni decir nada
    setTransportType(type);
    const isMoto = type === 'MOTO';
    const nextPrefs = isMoto
      ? { ...tripPreferences, airConditioning: false, passengers: 1, extraLuggage: false }
      : { ...tripPreferences };
    setTripPreferences(nextPrefs);

    const recalculated = calculateSuggestedFare(
      roadDistanceKm,
      isMoto ? 115.0 : 42.0,
      OFFICIAL_GOV_PRICES.regular,
      trafficInfo.delayMinutes,
      { ...nextPrefs, transportType: type }
    );
    const newFare = recalculated?.suggestedFare || (isMoto ? '1.50' : '2.50');
    setProposedFare(newFare);
    setHasCustomFare(false);

    if (isMoto) {
      speakAssistantMessage(`Se ha establecido viaje en moto. La nueva tarifa es de ${newFare} dólares.`);
    } else {
      speakAssistantMessage(`Se ha establecido viaje en vehículo. La nueva tarifa es de ${newFare} dólares.`);
    }
  };

  // Manejo de Selección de Servicio: Pasajero vs Entrega de Paquetes
  // Si es entrega de paquetes, se deshabilita el aire acondicionado
  const handleSelectServiceType = (type) => {
    if (serviceType === type) return; // Si ya está establecido, no hacer ni decir nada
    setServiceType(type);
    if (type === 'PACKAGE') {
      const nextPrefs = { ...tripPreferences, airConditioning: false };
      setTripPreferences(nextPrefs);
      const recalculated = calculateSuggestedFare(
        roadDistanceKm,
        isMotoMode ? 115.0 : 42.0,
        OFFICIAL_GOV_PRICES.regular,
        trafficInfo.delayMinutes,
        { ...nextPrefs, transportType }
      );
      const newFare = recalculated?.suggestedFare || '2.50';
      setProposedFare(newFare);
      setHasCustomFare(false);
      speakAssistantMessage(
        `Se ha establecido la entrega de paquetes. El aire acondicionado no es aplicable y ha sido desactivado. La nueva tarifa es de ${newFare} dólares.`
      );
    } else {
      const nextPrefs = { ...tripPreferences };
      setTripPreferences(nextPrefs);
      const recalculated = calculateSuggestedFare(
        roadDistanceKm,
        isMotoMode ? 115.0 : 42.0,
        OFFICIAL_GOV_PRICES.regular,
        trafficInfo.delayMinutes,
        { ...nextPrefs, transportType }
      );
      const newFare = recalculated?.suggestedFare || '2.50';
      setProposedFare(newFare);
      setHasCustomFare(false);
      speakAssistantMessage(`Se ha establecido viaje de pasajeros. La nueva tarifa es de ${newFare} dólares.`);
    }
  };

  // Manejo de Modalidad: Solo Ida vs Ida y Vuelta
  const handleToggleRoundTrip = (enableRoundTrip) => {
    if (Boolean(tripPreferences.isRoundTrip) === Boolean(enableRoundTrip)) {
      return; // Si ya está establecido, no hacer ni decir nada
    }
    const nextPrefs = { ...tripPreferences, isRoundTrip: enableRoundTrip };
    setTripPreferences(nextPrefs);

    const recalculated = calculateSuggestedFare(
      roadDistanceKm,
      isMotoMode ? 115.0 : 42.0,
      OFFICIAL_GOV_PRICES.regular,
      trafficInfo.delayMinutes,
      { ...nextPrefs, transportType }
    );
    const newFare = recalculated?.suggestedFare || '2.50';
    setProposedFare(newFare);
    setHasCustomFare(false);

    if (enableRoundTrip) {
      speakAssistantMessage(`Se ha establecido la carrera de ida y vuelta. La nueva tarifa es de ${newFare} dólares.`);
    } else {
      speakAssistantMessage(`Se ha establecido viaje de solo ida. La nueva tarifa es de ${newFare} dólares.`);
    }
  };

  // Manejo de Billete de Cambio con Locución Condicional
  const handleSelectCashBill = (billId) => {
    if (cashBill === billId) {
      return; // Si ya está establecido el mismo billete, no decir nada
    }
    triggerSelectionFeedback();
    setCashBill(billId);

    const baseFare = parseFloat(proposedFare) || 2.50;
    const effectiveCash = applyBonus ? Math.max(1.00, baseFare - 1.00) : baseFare;

    if (billId === 'EXACT') {
      if (applyBonus) {
        speakAssistantMessage(`Has seleccionado pago con tarifa exacta. ¡Lo prometido es deuda! Y el conductor te dará tu bono de bienvenida o referido, pagando únicamente ${effectiveCash.toFixed(2)} dólares en efectivo.`);
      } else {
        speakAssistantMessage(`Has seleccionado pago con tarifa exacta de ${baseFare.toFixed(2)} dólares, no requieres cambio.`);
      }
    } else {
      const billNum = billId === '50+' ? 50 : parseFloat(billId);
      const changeAmt = Math.max(0, billNum - effectiveCash).toFixed(2);
      if (applyBonus) {
        speakAssistantMessage(`Se ha solicitado cambio para billete de ${billNum} dólares. ¡Lo prometido es deuda! Y el conductor te dará tu bono de bienvenida o referido, llevándote ${changeAmt} dólares de cambio, es decir, un dólar más de vuelto para ti.`);
      } else {
        speakAssistantMessage(`Se ha solicitado cambio para billete de ${billNum} dólares. El conductor te llevará ${changeAmt} dólares de cambio.`);
      }
    }
  };

  // Manejo de Aire Acondicionado y Recálculo Dinámico de Tarifa:
  // La tarifa base se calcula como la mínima sin aire acondicionado.
  // Al activar A/C se recalcula e incrementa automáticamente cubriendo consumo y climatización.
  const handleToggleAirConditioning = () => {
    if (serviceType === 'PACKAGE') {
      speakAssistantMessage('El aire acondicionado no es aplicable para la entrega de paquetes.');
      return;
    }
    if (isMotoMode) {
      speakAssistantMessage('El servicio en motocicleta no cuenta con aire acondicionado.');
      return;
    }

    const nextState = !tripPreferences.airConditioning;
    const nextPreferences = { ...tripPreferences, airConditioning: nextState };
    setTripPreferences(nextPreferences);

    const recalculated = calculateSuggestedFare(
      roadDistanceKm,
      isMotoMode ? 115.0 : 42.0,
      OFFICIAL_GOV_PRICES.regular,
      trafficInfo.delayMinutes,
      { ...nextPreferences, transportType }
    );
    const newFare = recalculated?.suggestedFare || '2.50';
    setProposedFare(newFare);
    setHasCustomFare(false);

    const changeText = getChangeVoiceText(newFare, applyBonus);
    if (nextState) {
      if (applyBonus) {
        const discounted = Math.max(1.00, parseFloat(newFare) - 1.00).toFixed(2);
        speakAssistantMessage(`Se ha establecido el aire acondicionado. La nueva tarifa es de ${newFare} dólares. Aplicando tu bono te queda en ${discounted} dólares en efectivo. ${changeText}`);
      } else {
        speakAssistantMessage(`Se ha establecido el aire acondicionado. La nueva tarifa es de ${newFare} dólares. ${changeText}`);
      }
    } else {
      if (applyBonus) {
        const discounted = Math.max(1.00, parseFloat(newFare) - 1.00).toFixed(2);
        speakAssistantMessage(`Se ha desactivado el aire acondicionado. La nueva tarifa es de ${newFare} dólares. Aplicando tu bono te queda en ${discounted} dólares en efectivo. ${changeText}`);
      } else {
        speakAssistantMessage(`Se ha desactivado el aire acondicionado. La nueva tarifa es de ${newFare} dólares. ${changeText}`);
      }
    }
  };

  const handleEnableAcWithSuggestedFare = () => {
    if (serviceType === 'PACKAGE') {
      speakAssistantMessage('El aire acondicionado no es aplicable para la entrega de paquetes.');
      return;
    }
    if (isMotoMode) return;
    if (tripPreferences.airConditioning) return; // Ya está activo
    const nextPreferences = { ...tripPreferences, airConditioning: true };
    setTripPreferences(nextPreferences);

    const recalculated = calculateSuggestedFare(
      roadDistanceKm,
      isMotoMode ? 115.0 : 42.0,
      OFFICIAL_GOV_PRICES.regular,
      trafficInfo.delayMinutes,
      { ...nextPreferences, transportType }
    );
    const newFare = recalculated?.suggestedFare || '2.50';
    setProposedFare(newFare);
    setHasCustomFare(false);

    const changeText = getChangeVoiceText(newFare, applyBonus);
    if (applyBonus) {
      const discounted = Math.max(1.00, parseFloat(newFare) - 1.00).toFixed(2);
      speakAssistantMessage(`Se ha establecido el aire acondicionado. La nueva tarifa es de ${newFare} dólares. Con tu bono aplicado te queda en ${discounted} dólares en efectivo. ${changeText}`);
    } else {
      speakAssistantMessage(`Se ha establecido el aire acondicionado. La nueva tarifa es de ${newFare} dólares. ${changeText}`);
    }
  };

  const handleFareInputChange = (val) => {
    setProposedFare(val);
    setHasCustomFare(true);
    // Preservar siempre la elección del usuario sobre el aire acondicionado sin desactivarlo silenciosamente
  };

  const handleSelectQuickFare = (amt, isMin = false) => {
    if (proposedFare === amt) {
      return; // Si ya está establecida, no decir nada
    }
    setProposedFare(amt);
    setHasCustomFare(true);
    // Preservar siempre la elección del usuario sobre el aire acondicionado sin desactivarlo silenciosamente

    const numAmt = parseFloat(amt) || (isMotoMode ? 1.50 : 2.50);
    const discountedFare = Math.max(1.00, numAmt - 1.00).toFixed(2);
    const isGuest = !userProfile || userProfile.isGuest || !userProfile.id;

    if (isMin) {
      if (applyBonus) {
        const changeText = getChangeVoiceText(amt, true);
        if (isGuest) {
          speakAssistantMessage(`Has establecido la tarifa mínima de ${numAmt.toFixed(2)} dólares. Aplicando los bonos, tu tarifa en efectivo te queda en ${discountedFare} dólares. ${changeText} Inscríbete para tener más beneficios.`);
        } else {
          speakAssistantMessage(`Has establecido la tarifa mínima de ${numAmt.toFixed(2)} dólares. Aplicando los bonos, tu tarifa en efectivo te queda en ${discountedFare} dólares. ${changeText}`);
        }
      } else {
        const changeText = getChangeVoiceText(amt, false);
        speakAssistantMessage(`Has establecido la tarifa mínima de ${numAmt.toFixed(2)} dólares. ${changeText}`);
      }
    } else {
      if (applyBonus) {
        const changeText = getChangeVoiceText(amt, true);
        speakAssistantMessage(`Has establecido una tarifa de ${numAmt.toFixed(2)} dólares. Aplicando los bonos, tu tarifa en efectivo es de ${discountedFare} dólares. ${changeText}`);
      } else {
        const changeText = getChangeVoiceText(amt, false);
        speakAssistantMessage(`Has establecido una tarifa de ${numAmt.toFixed(2)} dólares. ${changeText}`);
      }
    }
  };

  const handleUseSuggestedFare = () => {
    const sugFare = suggestedFareInfo?.suggestedFare || '2.50';
    if (proposedFare === sugFare) {
      return; // Si ya está establecida, no decir nada
    }
    setProposedFare(sugFare);
    setHasCustomFare(false);

    const numAmt = parseFloat(sugFare) || 2.50;
    const changeText = getChangeVoiceText(sugFare, applyBonus);
    if (applyBonus) {
      const discountedFare = Math.max(1.00, numAmt - 1.00).toFixed(2);
      speakAssistantMessage(`Has establecido la tarifa sugerida de ${numAmt.toFixed(2)} dólares. Con tu bono de un dólar aplicado, tu tarifa en efectivo te queda en ${discountedFare} dólares. ${changeText}`);
    } else {
      speakAssistantMessage(`Has establecido la tarifa sugerida de ${numAmt.toFixed(2)} dólares. ${changeText}`);
    }
  };

  // Perfil del Pasajero & Punto de Inflexión
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('demiempresa_passenger');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Purgar perfiles mock / dummy antiguos para que siempre aparezca el botón oficial de Google si no es auténtico
      if (
        !parsed ||
        parsed.id === 'google-usr-1' ||
        parsed.id === 'google-usr-2' ||
        parsed.id === 'demo-passenger' ||
        parsed.isGuest
      ) {
        localStorage.removeItem('demiempresa_passenger');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('REGISTER'); // 'REGISTER' | 'LOGIN'
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showGuestInviteModal, setShowGuestInviteModal] = useState(false);
  const [showPassengerRevokedModal, setShowPassengerRevokedModal] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(
    () =>
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem('demiempresa_google_client_id') ||
      '585734148629-tdmrqos1msedm3hg0p4593fj55uhttle.apps.googleusercontent.com'
  );
  const [showGoogleConfigModal, setShowGoogleConfigModal] = useState(false);
  const [configClientIdInput, setConfigClientIdInput] = useState('');
  const googleButtonContainerRef = React.useRef(null);
  const headerGoogleButtonRef = React.useRef(null);
  const voiceAdjustmentAttemptsRef = React.useRef(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDui, setRegDui] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [referrerCode, setReferrerCode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref') || params.get('codigo') || params.get('referral');
        if (refParam === 'conductor') {
          window.location.replace('/conductor');
          return '';
        }
        if (refParam) {
          localStorage.setItem('rumbo_referrer_code', refParam);
          return refParam;
        }
        return localStorage.getItem('rumbo_referrer_code') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [duiError, setDuiError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [googleDuiStep, setGoogleDuiStep] = useState(false);
  const [googleTempUser, setGoogleTempUser] = useState(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(null);
  const [showAccountAvatarPicker, setShowAccountAvatarPicker] = useState(false);

  // Estados de Cumplimiento Legal y Términos de Referencia
  const [docType, setDocType] = useState('DUI'); // 'DUI' | 'PASSPORT'
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [geoConsent, setGeoConsent] = useState(true);
  const [micConsent, setMicConsent] = useState(true);
  const [adsConsent, setAdsConsent] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsTab, setTermsTab] = useState('ALL');

  // Celebración de Bienvenida, Confetti y Bonos ($1.00 por 7 días y Referidos)
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationName, setCelebrationName] = useState('');
  const [showMoreBonusesPrompt, setShowMoreBonusesPrompt] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [refContactName, setRefContactName] = useState('');
  const [refContactPhone, setRefContactPhone] = useState('');
  const [referralBonusAwarded, setReferralBonusAwarded] = useState(false);
  const [showBonusesAccountModal, setShowBonusesAccountModal] = useState(false);
  const [dopamineBonusModal, setDopamineBonusModal] = useState(null);
  const [alreadyRegisteredNoticeModal, setAlreadyRegisteredNoticeModal] = useState(null);
  const [contactCheckStatus, setContactCheckStatus] = useState(null); // { isRegistered, fullName, phone, message }
  const [checkingContact, setCheckingContact] = useState(false);
  const [celebrationStep, setCelebrationStep] = useState(1); // 1: Bienvenida | 2: Enviar dólar a tu amigo | 3: Dólar enviado
  const [referredByHostName, setReferredByHostName] = useState('');

  // Verificar en tiempo real si el teléfono ingresado ya pertenece a un usuario existente (evitar falsas expectativas)
  useEffect(() => {
    const cleanPhone = (refContactPhone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 8) {
      setCheckingContact(true);
      const timer = setTimeout(() => {
        checkContactRegisteredApi({ phone: cleanPhone })
          .then((res) => {
            setContactCheckStatus(res);
          })
          .catch(() => {
            setContactCheckStatus(null);
          })
          .finally(() => {
            setCheckingContact(false);
          });
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setContactCheckStatus(null);
      setCheckingContact(false);
    }
  }, [refContactPhone]);

  // Formatear cuenta regresiva exacta de 7 días para el bono de referido
  const getCountdownString = (registeredDate) => {
    const regTime = registeredDate ? new Date(registeredDate).getTime() : Date.now();
    const deadline = regTime + 7 * 24 * 60 * 60 * 1000;
    const diff = deadline - Date.now();
    if (diff <= 0) return '0d 0h restantes';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h restantes`;
  };

  // Calcular días restantes de un bono a partir de su fecha ISO (7 días)
  const getDaysRemaining = (isoDate) => {
    if (!isoDate) return 7;
    const diff = new Date(isoDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatBonusDate = (isoDate) => {
    if (!isoDate) return '';
    try {
      return new Date(isoDate).toLocaleDateString('es-SV', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Subasta y Ofertas (TTL 10s)
  const [activeOffers, setActiveOffers] = useState([]);
  const [pendingAcceptOffer, setPendingAcceptOffer] = useState(null);
  const [tripId, setTripId] = useState(() => initialActiveTripSession?.tripId || null);

  // Viaje Asignado / Hub Comercial
  const [assignedTrip, setAssignedTrip] = useState(() => initialActiveTripSession?.assignedTrip || null);
  const [tripStatus, setTripStatus] = useState(() => initialActiveTripSession?.tripStatus || 'DRIVER_EN_ROUTE');
  const [creditDiscountApplied, setCreditDiscountApplied] = useState(() => initialActiveTripSession?.creditDiscountApplied || initialActiveTripSession?.applyBonus || false);
  const [driverEtaMinutes, setDriverEtaMinutes] = useState(4);
  const [driverDistanceKm, setDriverDistanceKm] = useState(null);
  const [driverLiveLocation, setDriverLiveLocation] = useState(null);

  // Estados de Cancelación por Mutuo Acuerdo (Carrera en Ejecución)
  const [showMutualCancelModal, setShowMutualCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Inconveniente de fuerza mayor');
  const [waitingCancelPeerResponse, setWaitingCancelPeerResponse] = useState(false);
  const [incomingPeerCancelRequest, setIncomingPeerCancelRequest] = useState(null);
  const [cancelNoticeMsg, setCancelNoticeMsg] = useState(null);

  // Persistir borrador del formulario cuando el usuario está cotizando
  useEffect(() => {
    if (appState === 'DECOY_FORM') {
      try {
        const draft = {
          origin,
          originCoords,
          destination,
          destinationCoords,
          destinationMunicipality,
          proposedFare,
          applyBonus,
          serviceType,
          transportType,
          cashBill
        };
        localStorage.setItem('rumbo_passenger_draft', JSON.stringify(draft));
      } catch (err) {
        console.warn('Error guardando borrador del pasajero:', err);
      }
    }
  }, [appState, origin, originCoords, destination, destinationCoords, destinationMunicipality, proposedFare, applyBonus, serviceType, transportType, cashBill]);

  // Persistir estado activo del viaje para resistir F5 / recargas accidentales
  useEffect(() => {
    if (appState === 'AUCTION' || appState === 'IN_TRIP_HUB') {
      try {
        const activeSession = {
          savedAt: Date.now(),
          appState,
          tripId,
          origin,
          originCoords,
          destination,
          destinationCoords,
          destinationMunicipality,
          proposedFare,
          applyBonus,
          creditDiscountApplied,
          serviceType,
          transportType,
          rideMode,
          cashBill,
          assignedTrip,
          tripStatus
        };
        localStorage.setItem('rumbo_passenger_active_session', JSON.stringify(activeSession));
      } catch (err) {
        console.warn('Error guardando sesión activa del pasajero:', err);
      }
    } else if (appState === 'DECOY_FORM') {
      localStorage.removeItem('rumbo_passenger_active_session');
    }
  }, [appState, rideMode, tripId, origin, originCoords, destination, destinationCoords, destinationMunicipality, proposedFare, applyBonus, creditDiscountApplied, serviceType, transportType, cashBill, assignedTrip, tripStatus]);

  // Prevenir recargas accidentales si hay un viaje o búsqueda en curso
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (appState === 'AUCTION' || appState === 'IN_TRIP_HUB') {
        e.preventDefault();
        e.returnValue = 'Tienes un viaje o solicitud en curso. Si recargas, tus datos se mantendrán pero podrías perder conexión momentánea.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [appState]);

  // Reconectar viaje activo al montar el componente si hubo recarga de página
  useEffect(() => {
    const savedSession = initialActiveTripSession;
    if (savedSession?.tripId && (savedSession.appState === 'AUCTION' || savedSession.appState === 'IN_TRIP_HUB')) {
      console.log('🔄 Reconectando sesión de viaje del pasajero tras recarga:', savedSession.tripId);
      socket.emit('trip:reconnect', { tripId: savedSession.tripId, role: 'PASSENGER' }, (res) => {
        if (!res || !res.success) {
          console.warn('No se pudo reconectar viaje en el servidor (viaje no encontrado o inválido):', res?.error);
          localStorage.removeItem('rumbo_passenger_active_session');
          setAppState('DECOY_FORM');
          setAssignedTrip(null);
          setTripId(null);
          return;
        }
        if (res.isFinished) {
          console.log('El viaje ya había finalizado o sido cancelado.');
          localStorage.removeItem('rumbo_passenger_active_session');
          setAppState('DECOY_FORM');
          setAssignedTrip(null);
          setTripId(null);
        } else if (res.trip) {
          console.log('✅ Viaje reconectado con éxito:', res.trip);
          if (res.trip.driver) {
            setAssignedTrip((prev) => ({
              ...prev,
              ...res.trip,
              driver: res.trip.driver,
              cashToPay: res.trip.cashToCollect || res.trip.agreedFare,
              agreedFare: res.trip.agreedFare
            }));
            setAppState('IN_TRIP_HUB');
            if (res.trip.status === 'ARRIVED') setTripStatus('DRIVER_ARRIVED');
            else if (res.trip.status === 'IN_TRANSIT') setTripStatus('IN_TRANSIT');
            else if (res.trip.status === 'COMPLETED') setTripStatus('COMPLETED');
          }
        }
      });
    }
  }, []);

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

    // Escuchar ofertas entrantes de conductores en tiempo real (Vigencia 30s)
    socket.on('passenger:offer_received', (offer) => {
      setActiveOffers((prev) => {
        const exists = prev.find((o) => o.driverProfileId === offer.driverProfileId);
        if (exists) return prev;
        return [...prev, { ...offer, timeLeft: offer.expiresInSeconds || 30 }];
      });
    });

    // Escuchar confirmación de viaje asignado
    socket.on('trip:confirmed', (data) => {
      if (data?.tripId) {
        setTripId(data.tripId);
      }
      const driverObj = data.driver || {
        id: data.driverId,
        name: data.driverName || 'Conductor Autorizado',
        vehiclePlate: data.vehiclePlate || 'EN CAMINO',
        vehicleBrand: data.vehicleBrand || '',
        vehicleModel: data.vehicleModel || 'Vehículo Autorizado',
        vehicleColor: data.vehicleColor || '',
        photo: data.photoUrl || null,
        photoUrl: data.photoUrl || null,
        phone: data.driverPhone || ''
      };
      setAssignedTrip((prev) => ({
        ...prev,
        ...data,
        tripId: data.tripId || prev?.tripId || tripId,
        driver: driverObj,
        cashToPay: data.isSharedPool
          ? (data.stops?.find(s => s.passengerId === userProfile?.id)?.finalFare || (parseFloat(proposedFare || '5.00') * 0.70).toFixed(2))
          : (data.cashToCollect || data.agreedFare || prev?.cashToPay || proposedFare)
      }));
      setAppState('IN_TRIP_HUB');
      setTripStatus('DRIVER_EN_ROUTE');
      setCreditDiscountApplied(applyBonus || Boolean(parseFloat(data.creditApplied || '0') > 0));
      setDriverEtaMinutes(4);
      triggerSelectionFeedback();
      speakAssistantMessage('¡Conductor asignado! Se dirige hacia tu punto de recogida.');
    });

    // Escuchar posición GPS y tiempo de llegada en vivo del conductor
    socket.on('trip:driver_location', (data) => {
      if (data?.etaMinutes !== undefined) {
        setDriverEtaMinutes(data.etaMinutes);
      }
      if (data?.distanceKm !== undefined) {
        setDriverDistanceKm(data.distanceKm);
      }
      if (data?.lat && data?.lng) {
        setDriverLiveLocation({ lat: data.lat, lng: data.lng });
      }
    });

    // Escuchar estado en vivo del colectivo compartido
    socket.on('pool:status', (statusData) => {
      setPoolStatus(statusData);
    });

    // Escuchar notificación de colectivo completado y despachado
    socket.on('pool:dispatched', () => {
      speakAssistantMessage('¡Cupos completos! Despachando conductor cercano para este colectivo.');
    });

    // Escuchar viaje cancelado (fase de búsqueda)
    socket.on('trip:canceled', () => {
      localStorage.removeItem('rumbo_passenger_active_session');
      setActiveOffers([]);
      setAssignedTrip(null);
      setTripId(null);
      setAppState('DECOY_FORM');
      speakAssistantMessage('La búsqueda de viaje ha sido cancelada.');
    });

    // Escuchar solicitud de cancelación por mutuo acuerdo recibida del conductor
    socket.on('trip:cancel_requested_by_peer', (data) => {
      console.log('Solicitud de cancelación por mutuo acuerdo del chofer:', data);
      setIncomingPeerCancelRequest(data);
    });

    // Escuchar confirmación de cancelación por mutuo acuerdo
    socket.on('trip:mutual_cancellation_confirmed', () => {
      localStorage.removeItem('rumbo_passenger_active_session');
      setActiveOffers([]);
      setAssignedTrip(null);
      setTripId(null);
      setAppState('DECOY_FORM');
      setIncomingPeerCancelRequest(null);
      setShowMutualCancelModal(false);
      setWaitingCancelPeerResponse(false);
      speakAssistantMessage('La carrera ha sido cancelada de mutuo acuerdo.');
    });

    // Escuchar rechazo de cancelación por mutuo acuerdo
    socket.on('trip:mutual_cancellation_declined', () => {
      setWaitingCancelPeerResponse(false);
      setShowMutualCancelModal(false);
      setCancelNoticeMsg('El conductor no aceptó cancelar. La carrera continúa hasta su destino.');
      setTimeout(() => setCancelNoticeMsg(null), 6000);
      speakAssistantMessage('El conductor no aceptó cancelar. La carrera continúa.');
    });

    // Escuchar cambios de estado del viaje
    socket.on('trip:status_changed', ({ status }) => {
      if (status === 'ARRIVED') {
        setTripStatus('DRIVER_ARRIVED');
        speakAssistantMessage('¡Tu conductor ha llegado al punto de recogida!');
      }
      if (status === 'IN_TRANSIT') {
        setTripStatus('IN_TRANSIT');
        speakAssistantMessage('En trayecto hacia tu destino. Conoce las promociones exclusivas en tu ruta.');
      }
      if (status === 'COMPLETED') {
        setTripStatus('COMPLETED');
        setShowRatingModal(true);
        speakAssistantMessage('Has llegado a tu destino. ¡Gracias por viajar con Rumbo!');
      }
    });

    // Regla de Dispositivo Único Implacable para Pasajeros
    socket.on('passenger_session_revoked', (ev) => {
      const myDui = userProfile?.dui ? String(userProfile.dui).trim() : '';
      const myPhone = userProfile?.phone ? String(userProfile.phone).replace(/\D/g, '').slice(-8) : '';
      const isMe = (myDui && ev?.dui && ev.dui === myDui) || (myPhone && ev?.phone && ev.phone === myPhone);
      if (isMe && ev?.activeSessionId && ev.activeSessionId !== userProfile?.sessionToken) {
        localStorage.removeItem('demiempresa_passenger');
        localStorage.removeItem('rumbo_passenger_active_session');
        setUserProfile(null);
        setAppState('PICKUP_SELECTION');
        setShowPassengerRevokedModal(true);
      }
    });

    return () => {
      socket.off('passenger:offer_received');
      socket.off('trip:confirmed');
      socket.off('trip:driver_location');
      socket.off('pool:status');
      socket.off('pool:dispatched');
      socket.off('trip:canceled');
      socket.off('trip:cancel_requested_by_peer');
      socket.off('trip:mutual_cancellation_confirmed');
      socket.off('trip:mutual_cancellation_declined');
      socket.off('trip:status_changed');
      socket.off('passenger_session_revoked');
    };
  }, [userProfile]);

  // Verificación de Dopamina: Notificar al referente si un amigo se registró con su enlace y hacer sonar dinero
  useEffect(() => {
    if (!userProfile) return;
    const userId = userProfile.id || userProfile.dui;
    if (!userId) return;

    fetchUserCreditsApi(userId).then((data) => {
      // 1. Verificar si hay un nuevo referido para celebrar con dopamina y sonido de dinero
      if (data && data.referrals && data.referrals.length > 0) {
        try {
          const storageKey = `rumbo_celebrated_refs_${userId}`;
          const celebratedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
          
          // Buscar el primer referido que aún no ha sido celebrado
          const uncelebrated = data.referrals.find((r) => !celebratedIds.includes(r.id.toString()));
          if (uncelebrated) {
            celebratedIds.push(uncelebrated.id.toString());
            localStorage.setItem(storageKey, JSON.stringify(celebratedIds));

            // Retardo para máxima sorpresa tras abrir la app
            setTimeout(() => {
              triggerCashRewardFeedback();
              try {
                confetti({
                  particleCount: 110,
                  spread: 80,
                  origin: { y: 0.55 },
                  colors: ['#F59E0B', '#10B981', '#FBBF24', '#34D399', '#FCD34D'],
                  zIndex: 99999
                });
              } catch {}
              setDopamineBonusModal({
                name: uncelebrated.referred_name || 'Un amigo invitado',
                phone: uncelebrated.referred_phone || '',
                amount: '1.00',
                date: uncelebrated.registered_at
              });
            }, 800);
          }
        } catch (e) {
          console.warn('Error en verificación de dopamina de referidos:', e);
        }
      }

      // 2. Verificar avisos de contactos comunes que ya estaban registrados (para no generar expectativa)
      if (data && data.alreadyRegisteredNotices && data.alreadyRegisteredNotices.length > 0) {
        try {
          const noticeStorageKey = `rumbo_notified_already_reg_${userId}`;
          const notifiedNoticeIds = JSON.parse(localStorage.getItem(noticeStorageKey) || '[]');
          const unnotified = data.alreadyRegisteredNotices.find((n) => !n.is_read && !notifiedNoticeIds.includes(n.id.toString()));
          if (unnotified) {
            notifiedNoticeIds.push(unnotified.id.toString());
            localStorage.setItem(noticeStorageKey, JSON.stringify(notifiedNoticeIds));
            setTimeout(() => {
              setAlreadyRegisteredNoticeModal(unnotified);
            }, 1400);
          }
        } catch (err) {
          console.warn('Error al procesar avisos de contactos ya registrados:', err);
        }
      }
    });
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

  // Formato estricto para DUI salvadoreño (00000000-0) o Pasaporte/Carné extranjero
  const handleDuiChange = (e) => {
    if (docType === 'PASSPORT') {
      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-\.]/g, '').slice(0, 20);
      setRegDui(val);
      if (val.length >= 6) setDuiError('');
      return;
    }
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

  // 0. Selección de Modalidad (Privado vs Compartido) por Voz o Clic con locución guiada
  const handleSelectRideMode = (mode, coords) => {
    triggerSelectionFeedback();
    const activeCoords = coords || originCoords || { lat: 13.7013, lng: -89.2244 };
    if (mode === 'PRIVATE') {
      setRideMode('PRIVATE');
      setVoiceDialogueStep('AWAITING_DESTINATION');
      speakAndThenListen('Has seleccionado viaje privado. Dime, ¿cuál es tu destino?', {
        onListeningChange: (listening) => setIsListeningVoice(listening),
        onResult: (spokenText) => processVoiceDestination(spokenText, activeCoords),
        onError: () => {
          setIsListeningVoice(false);
          setVoiceDialogueStep('IDLE');
        }
      });
    } else if (mode === 'SHARED') {
      if (!userProfile) {
        setShowSharedRegisterPrompt(true);
        speakAssistantMessage('Para viajar en colectivo compartido debes registrarte o iniciar sesión.');
        return;
      }
      setRideMode('SHARED');
      speakAndThenListen('Has seleccionado colectivo compartido con descuento del 30%. Dime, ¿cuál es tu destino?', {
        onListeningChange: (listening) => setIsListeningVoice(listening),
        onResult: (spokenText) => handleProcessSharedVoiceDestination(spokenText),
        onError: () => {
          setIsListeningVoice(false);
        }
      });
    }
  };

  const handleVoiceSelectRideMode = (spokenText, coords) => {
    const text = (spokenText || '').toLowerCase();
    if (
      text.includes('compartid') ||
      text.includes('colectiv') ||
      text.includes('grupo') ||
      text.includes('junt') ||
      text.includes('barat') ||
      text.includes('descuent')
    ) {
      handleSelectRideMode('SHARED', coords);
    } else if (
      text.includes('privad') ||
      text.includes('solo') ||
      text.includes('carro') ||
      text.includes('taxi') ||
      text.includes('rápido') ||
      text.includes('directo')
    ) {
      handleSelectRideMode('PRIVATE', coords);
    } else {
      speakAndThenListen('¿Prefieres viaje privado o colectivo compartido?', {
        onListeningChange: (listening) => setIsListeningVoice(listening),
        onResult: (ans) => handleVoiceSelectRideMode(ans, coords),
        onError: () => setIsListeningVoice(false)
      });
    }
  };

  // Procesar destino en colectivo compartido: geocodificar, calcular tarifa y locutar descuento del 30%
  const handleProcessSharedVoiceDestination = async (spokenText) => {
    setDestination(spokenText);
    unlockAudioAndSpeech();
    triggerListeningEndFeedback();
    setIsListeningVoice(false);

    try {
      const oCoords = originCoords || { lat: 13.7013, lng: -89.2244 };
      const viewboxParam = `&viewbox=${oCoords.lng - 0.25},${oCoords.lat + 0.25},${oCoords.lng + 0.25},${oCoords.lat - 0.25}&bounded=0`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          spokenText + ', El Salvador'
        )}&countrycodes=sv&limit=1&addressdetails=1${viewboxParam}`,
        { headers: { 'Accept-Language': 'es' } }
      );
      let dCoords = null;
      let resolvedText = spokenText;
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          dCoords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          const formatted = formatResolvedDestination(data[0]);
          if (formatted) resolvedText = formatted;
        }
      }

      if (!dCoords) {
        speakAndThenListen(`No logré encontrar "${spokenText}". Por favor, dime otra referencia o colonia.`, {
          onListeningChange: (l) => setIsListeningVoice(l),
          onResult: (t) => handleProcessSharedVoiceDestination(t),
          onError: () => setIsListeningVoice(false)
        });
        return;
      }

      setDestinationCoords(dCoords);
      setDestination(resolvedText);

      // Calcular ruta real por carretera
      const routeRes = await calculateRoadDistance(oCoords, dCoords);
      const distKm = routeRes?.distanceKm || 5.0;
      setRoadDistanceKm(distKm);

      // Calcular tarifa base con fuelService
      const fareData = calculateSuggestedFare(
        distKm,
        42.0,
        OFFICIAL_GOV_PRICES.regular,
        routeRes?.delayMinutes || 0,
        { ...tripPreferences, transportType: 'CAR' }
      );
      const normalFareNum = parseFloat(fareData?.suggestedFare || '5.00');
      const discount30Val = Number((normalFareNum * 0.30).toFixed(2));
      const finalFareVal = Number((normalFareNum * 0.70).toFixed(2));
      setProposedFare(normalFareNum.toFixed(2));

      // Locución estricta solicitada por el usuario:
      // "la tarifa normal es de $$ tu descuento es de $$ pagaras al conductor en efectivo $$$"
      const speechMsg = `La tarifa normal es de ${normalFareNum.toFixed(2)} dólares. Tu descuento del 30% es de ${discount30Val.toFixed(2)} dólares. Pagarás al conductor en efectivo ${finalFareVal.toFixed(2)} dólares.`;
      speakAssistantMessage(speechMsg);

    } catch (err) {
      console.warn('handleProcessSharedVoiceDestination error:', err);
      speakAssistantMessage('No pude calcular la ruta para el colectivo. Intenta dictar nuevamente.');
    }
  };

  // Dictado directo por voz para destino en Colectivo Compartido con feedback visual
  const handleDictateSharedDestination = () => {
    if (isListeningVoice) {
      stopVoiceDictation();
      stopSpeaking();
      setIsListeningVoice(false);
      triggerListeningEndFeedback();
      return;
    }

    unlockAudioAndSpeech();
    triggerListeningStartFeedback();
    setIsListeningVoice(true);

    startVoiceDictation({
      onListeningChange: (listening) => setIsListeningVoice(listening),
      onResult: (spokenText) => {
        handleProcessSharedVoiceDestination(spokenText);
      },
      onError: (errType, userMsg) => {
        setIsListeningVoice(false);
        triggerListeningErrorFeedback();
        speakAssistantMessage(userMsg || 'No logré escucharte. Toca de nuevo el micrófono para dictar tu destino.');
      }
    });
  };

  // Solicitar ubicación interactiva del pasajero cada vez que entra a la app (si ya completó la bienvenida)
  useEffect(() => {
    const isWelcomeCompleted = typeof window !== 'undefined' && localStorage.getItem('rumbo_welcome_completed');
    if (!isWelcomeCompleted) return; // Se delega al User Gesture de WelcomeVoiceModal

    // Iniciar flujo inmediato por voz para usuarios recurrentes con permisos ya otorgados
    let speechActuallyStarted = false;

    const startReturningVoiceGreeting = () => {
      if (speechActuallyStarted) return;
      unlockAudioAndSpeech();
      const currentMode = rideModeRef.current;
      if (currentMode === 'UNDECIDED') {
        speakAndThenListen('Hola, bienvenido a Rumbo. ¿Deseas viaje privado o colectivo compartido?', {
          onStart: () => {
            speechActuallyStarted = true;
          },
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (spokenText) => handleVoiceSelectRideMode(spokenText),
          onError: (err) => {
            console.warn('Returning voice dialogue err:', err);
            setIsListeningVoice(false);
            setVoiceDialogueStep('IDLE');
          }
        });
      } else if (currentMode === 'PRIVATE') {
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
      } else if (currentMode === 'SHARED') {
        speakAndThenListen('Dime, ¿cuál es tu destino en el colectivo compartido?', {
          onStart: () => {
            speechActuallyStarted = true;
          },
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (spokenText) => handleProcessSharedVoiceDestination(spokenText),
          onError: (err) => {
            console.warn('Shared voice dialogue err:', err);
            setIsListeningVoice(false);
          }
        });
      }
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
    const currentMode = rideModeRef.current;
    if (currentMode === 'UNDECIDED') {
      speakAndThenListen(
        'Hola, bienvenido a Rumbo. ¿Deseas viaje privado o colectivo compartido?',
        {
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (spokenText) => handleVoiceSelectRideMode(spokenText, coords || originCoords),
          onError: (errType, userMsg) => {
            console.warn('Voice dialogue error:', errType);
            setIsListeningVoice(false);
          }
        }
      );
    } else if (currentMode === 'PRIVATE') {
      setVoiceDialogueStep('AWAITING_DESTINATION');
      speakAndThenListen(
        'Hola, dime ¿cuál es tu rumbo?',
        {
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (spokenText) => processVoiceDestination(spokenText, coords || originCoords),
          onError: (errType, userMsg) => {
            console.warn('Voice dialogue error:', errType);
            setIsListeningVoice(false);
            setVoiceDialogueStep('IDLE');
            triggerListeningErrorFeedback();
            speakAssistantMessage(userMsg || 'No logré escucharte. Toca el micrófono para intentar de nuevo.');
          }
        }
      );
    } else {
      speakAndThenListen(
        'Dime, ¿cuál es tu destino en el colectivo compartido?',
        {
          onListeningChange: (listening) => setIsListeningVoice(listening),
          onResult: (spokenText) => handleProcessSharedVoiceDestination(spokenText),
          onError: () => {
            setIsListeningVoice(false);
          }
        }
      );
    }
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
      let resolvedDestinationText = spokenText;
      const oCoords = currentOriginCoords || originCoords || { lat: 13.7013, lng: -89.2244 };
      if (!originCoords) {
        setOriginCoords(oCoords);
      }
      if (!origin) {
        setOrigin('Mi Ubicación Actual');
      }

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

      // Calcular tarifa mínima base exacta
      const fareData = calculateSuggestedFare(
        distKm,
        transportType === 'MOTO' ? 115.0 : 42.0,
        OFFICIAL_GOV_PRICES.regular,
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
        airConditioning: !!tripPreferences.airConditioning,
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

    // Locución profesional: Tarifa mínima sin aire acondicionado
    const acSpeechClause = calcResult.airConditioning
      ? 'con aire acondicionado incluido'
      : 'calculada sin aire acondicionado';
    const speechPrompt = `Encontré la ruta a tu destino en ${calcResult.resolvedDestinationText}. Está a ${calcResult.distKm} kilómetros de distancia y tardarás aproximadamente ${calcResult.durMin} minutos. La tarifa mínima estimada es de ${calcResult.calculatedFare} dólares, ${acSpeechClause}. ¿Deseas buscar conductor?`;

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
      voiceAdjustmentAttemptsRef.current = 0;
      setVoiceDialogueStep('IDLE');
      setIsListeningVoice(false);
      stopVoiceDictation();
      speakAssistantMessage('Excelente. Buscando conductor cercano.');
      handleSearchDrivers();
      return;
    }

    if (intent.type === 'DECLINE_SEARCH') {
      voiceAdjustmentAttemptsRef.current = 0;
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
      voiceAdjustmentAttemptsRef.current = 0;
      setVoiceDialogueStep('IDLE');
      setIsListeningVoice(false);
      stopVoiceDictation();
      speakAssistantMessage('Excelente. Buscando conductor cercano.');
      handleSearchDrivers();
      return;
    }

    if (intent.type === 'DECLINE_SEARCH') {
      voiceAdjustmentAttemptsRef.current = 0;
      setVoiceDialogueStep('IDLE');
      setIsListeningVoice(false);
      stopVoiceDictation();
      speakAssistantMessage('De acuerdo. Toca Buscar Conductor cuando estés listo.');
      return;
    }

    const applyVoiceFareWithAcPolicy = (newFare) => {
      voiceAdjustmentAttemptsRef.current = 0;
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
      voiceAdjustmentAttemptsRef.current = 0;
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
      voiceAdjustmentAttemptsRef.current = 0;
      const newFare = intent.amount.toFixed(2);
      applyVoiceFareWithAcPolicy(newFare);
      return;
    }

    if (intent.type === 'CHANGE_PASSENGERS') {
      voiceAdjustmentAttemptsRef.current = 0;
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
      voiceAdjustmentAttemptsRef.current = 0;
      if (serviceType === 'PACKAGE') {
        askConfirmationAfterAdjustment('El aire acondicionado no es aplicable para la entrega de paquetes.');
        return;
      }
      if (isMotoMode) {
        askConfirmationAfterAdjustment('El servicio en motocicleta no cuenta con aire acondicionado.');
        return;
      }
      const nextEnabled = !!intent.enabled;
      const nextPrefs = { ...tripPreferences, airConditioning: nextEnabled };
      setTripPreferences(nextPrefs);

      const recalculated = calculateSuggestedFare(
        roadDistanceKm,
        isMotoMode ? 115.0 : 42.0,
        OFFICIAL_GOV_PRICES.regular,
        trafficInfo.delayMinutes,
        { ...nextPrefs, transportType }
      );
      const newFare = recalculated?.suggestedFare || '2.50';
      setProposedFare(newFare);
      setHasCustomFare(false);

      if (nextEnabled) {
        askConfirmationAfterAdjustment(
          `Se ha establecido el aire acondicionado. La nueva tarifa es de ${newFare} dólares.`
        );
      } else {
        askConfirmationAfterAdjustment(
          `Se ha desactivado el aire acondicionado. La nueva tarifa es de ${newFare} dólares.`
        );
      }
      return;
    }

    if (intent.type === 'CHANGE_PETS') {
      voiceAdjustmentAttemptsRef.current = 0;
      setTripPreferences((prev) => ({
        ...prev,
        petFriendly: intent.enabled
      }));
      const petStatus = intent.enabled ? 'activado' : 'desactivado';
      askConfirmationAfterAdjustment(`Viaje con mascota ${petStatus}.`);
      return;
    }

    if (intent.type === 'CHANGE_LUGGAGE') {
      voiceAdjustmentAttemptsRef.current = 0;
      setTripPreferences((prev) => ({
        ...prev,
        extraLuggage: intent.enabled
      }));
      const lugStatus = intent.enabled ? 'agregado' : 'removido';
      askConfirmationAfterAdjustment(`Equipaje extra ${lugStatus}.`);
      return;
    }

    if (intent.type === 'CHANGE_TRANSPORT') {
      voiceAdjustmentAttemptsRef.current = 0;
      const isMoto = intent.transportType === 'MOTO';
      setTransportType(intent.transportType);
      const nextPrefs = isMoto
        ? {
            ...tripPreferences,
            airConditioning: false,
            passengers: 1,
            extraLuggage: false
          }
        : { ...tripPreferences };
      setTripPreferences(nextPrefs);

      const recalculated = calculateSuggestedFare(
        roadDistanceKm,
        isMoto ? 115.0 : 42.0,
        OFFICIAL_GOV_PRICES.regular,
        trafficInfo.delayMinutes,
        { ...nextPrefs, transportType: intent.transportType }
      );
      const newFare = recalculated?.suggestedFare || (isMoto ? '1.50' : '2.50');
      setProposedFare(newFare);
      setHasCustomFare(false);

      if (isMoto) {
        askConfirmationAfterAdjustment(`Se ha establecido viaje en moto. La nueva tarifa es de ${newFare} dólares.`);
      } else {
        askConfirmationAfterAdjustment(`Se ha establecido viaje en vehículo. La nueva tarifa es de ${newFare} dólares.`);
      }
      return;
    }

    if (intent.type === 'CHANGE_ROUND_TRIP') {
      voiceAdjustmentAttemptsRef.current = 0;
      const nextPrefs = { ...tripPreferences, isRoundTrip: intent.enabled };
      setTripPreferences(nextPrefs);

      const recalculated = calculateSuggestedFare(
        roadDistanceKm,
        isMotoMode ? 115.0 : 42.0,
        OFFICIAL_GOV_PRICES.regular,
        trafficInfo.delayMinutes,
        { ...nextPrefs, transportType }
      );
      const newFare = recalculated?.suggestedFare || '2.50';
      setProposedFare(newFare);
      setHasCustomFare(false);

      if (intent.enabled) {
        askConfirmationAfterAdjustment(`Se ha establecido la carrera de ida y vuelta. La nueva tarifa es de ${newFare} dólares.`);
      } else {
        askConfirmationAfterAdjustment(`Se ha establecido viaje de solo ida. La nueva tarifa es de ${newFare} dólares.`);
      }
      return;
    }

    if (intent.type === 'CHANGE_SERVICE') {
      voiceAdjustmentAttemptsRef.current = 0;
      const isPackage = intent.serviceType === 'PACKAGE';
      setServiceType(intent.serviceType);
      const nextPrefs = isPackage
        ? { ...tripPreferences, airConditioning: false }
        : { ...tripPreferences };
      setTripPreferences(nextPrefs);

      const recalculated = calculateSuggestedFare(
        roadDistanceKm,
        isMotoMode ? 115.0 : 42.0,
        OFFICIAL_GOV_PRICES.regular,
        trafficInfo.delayMinutes,
        { ...nextPrefs, transportType }
      );
      const newFare = recalculated?.suggestedFare || '2.50';
      setProposedFare(newFare);
      setHasCustomFare(false);

      if (isPackage) {
        askConfirmationAfterAdjustment(
          `Se ha establecido la entrega de paquetes. El aire acondicionado no es aplicable y ha sido desactivado. La nueva tarifa es de ${newFare} dólares.`
        );
      } else {
        askConfirmationAfterAdjustment(
          `Se ha establecido viaje de pasajeros. La nueva tarifa es de ${newFare} dólares.`
        );
      }
      return;
    }

    // Comando no reconocido en ajustes: prevenir bucle infinito
    voiceAdjustmentAttemptsRef.current += 1;
    if (voiceAdjustmentAttemptsRef.current >= 2) {
      voiceAdjustmentAttemptsRef.current = 0;
      setVoiceDialogueStep('IDLE');
      setIsListeningVoice(false);
      stopVoiceDictation();
      speakAssistantMessage('No logré captar la indicación. Puedes ajustar las opciones en pantalla o tocar Buscar Conductor.');
      return;
    }

    // Re-preguntar guiando al usuario sin asumir entendimiento ficticio
    askConfirmationAfterAdjustment('No alcancé a captar la indicación.');
  };

  // Re-preguntar al pasajero si desea buscar conductor tras un ajuste
  const askConfirmationAfterAdjustment = (prefixNotice) => {
    setVoiceDialogueStep('CONFIRMING_SEARCH');
    speakAndThenListen(`${prefixNotice} ¿Deseas buscar conductor ahora?`, {
      onListeningChange: (listening) => setIsListeningVoice(listening),
      onResult: (ans) => {
        const reIntent = classifyUserVoiceIntent(ans);
        if (reIntent.type === 'CONFIRM_SEARCH') {
          voiceAdjustmentAttemptsRef.current = 0;
          setVoiceDialogueStep('IDLE');
          setIsListeningVoice(false);
          stopVoiceDictation();
          speakAssistantMessage('Excelente. Buscando conductor cercano.');
          handleSearchDrivers();
        } else if (reIntent.type === 'DECLINE_SEARCH') {
          // El pasajero no desea buscar conductor en este momento: cerrar diálogo amablemente sin bucle
          voiceAdjustmentAttemptsRef.current = 0;
          setVoiceDialogueStep('IDLE');
          setIsListeningVoice(false);
          stopVoiceDictation();
          speakAssistantMessage('De acuerdo, los cambios quedaron guardados. Toca Buscar Conductor cuando gustes iniciar tu viaje.');
        } else {
          handleAdjustmentAnswer(ans);
        }
      },
      onError: () => {
        setIsListeningVoice(false);
        setVoiceDialogueStep('IDLE');
      }
    });
  };

  // Dictado directo por voz para Punto de Destino (Invocación directa e instantánea)
  const handleDictateDestination = () => {
    if (isListeningVoice) {
      stopVoiceDictation();
      stopSpeaking();
      setIsListeningVoice(false);
      setVoiceDialogueStep('IDLE');
      triggerListeningEndFeedback();
      return;
    }

    unlockAudioAndSpeech();
    triggerListeningStartFeedback();
    setIsListeningVoice(true);
    setVoiceDialogueStep('AWAITING_DESTINATION');
    setDestinationError('');

    startVoiceDictation({
      onListeningChange: (listening) => setIsListeningVoice(listening),
      onResult: (spokenText) => {
        triggerListeningEndFeedback();
        setDestination(spokenText);
        processVoiceDestination(spokenText, originCoords);
      },
      onError: (errType, userMsg) => {
        setIsListeningVoice(false);
        setVoiceDialogueStep('IDLE');
        triggerListeningErrorFeedback();
        setDestinationError(userMsg || 'Error en el micrófono.');
        speakAssistantMessage(userMsg || 'No logré escucharte. Toca de nuevo el micrófono para dictar tu destino.');
      }
    });
  };

  // Dictado directo por voz para Punto de Recogida (Origen)
  const handleDictateOrigin = () => {
    if (isListeningOriginVoice) {
      stopVoiceDictation();
      stopSpeaking();
      setIsListeningOriginVoice(false);
      triggerListeningEndFeedback();
      return;
    }

    unlockAudioAndSpeech();
    triggerListeningStartFeedback();
    setIsListeningOriginVoice(true);
    setOriginError('');

    startVoiceDictation({
      onListeningChange: (listening) => setIsListeningOriginVoice(listening),
      onResult: (spokenText) => {
        triggerListeningEndFeedback();
        setIsListeningOriginVoice(false);
        setOrigin(spokenText);
        handleGeocodeManualOrigin(spokenText);
      },
      onError: (errType, userMsg) => {
        setIsListeningOriginVoice(false);
        triggerListeningErrorFeedback();
        setOriginError(userMsg || 'Error en el micrófono.');
        speakAssistantMessage(userMsg || 'No logré escucharte. Toca de nuevo el micrófono de origen.');
      }
    });
  };

  // Activar / Detener asistente conversacional por voz (Botón cabecera)
  const handleToggleVoiceDictation = () => {
    if (isListeningVoice || isListeningOriginVoice) {
      stopVoiceDictation();
      stopSpeaking();
      setIsListeningVoice(false);
      setIsListeningOriginVoice(false);
      setVoiceDialogueStep('IDLE');
      triggerListeningEndFeedback();
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

  // Ejecución directa del despacho y subasta
  const executeSearchDrivers = () => {
    triggerSearchLaunchFeedback();

    // Detener cualquier escucha o diálogo de voz pendiente
    stopVoiceDictation();
    setIsListeningVoice(false);
    setVoiceDialogueStep('IDLE');

    // Asegurar coordenadas de origen (GPS o default metropolitano)
    const effectiveOriginCoords = originCoords || { lat: 13.7013, lng: -89.2244 };
    if (!originCoords) {
      setOriginCoords(effectiveOriginCoords);
    }
    const effectiveOrigin = origin?.trim() || 'Mi Ubicación Actual';
    if (!origin) {
      setOrigin(effectiveOrigin);
    }

    const effectiveDestination = destination?.trim();
    if (!effectiveDestination) {
      console.warn('handleSearchDrivers: No hay destino definido');
      return;
    }

    // TRANSICIÓN INMEDIATA A LA PANTALLA DE SUBASTA
    setAppState('AUCTION');

    const generatedTripId = `trip-${Date.now()}`;
    setTripId(generatedTripId);

    const oLat = effectiveOriginCoords.lat;
    const oLng = effectiveOriginCoords.lng;
    const dLat = destinationCoords?.lat || 13.6738;
    const dLng = destinationCoords?.lng || -89.2789;

    // Emitir solicitud al WebSocket Gateway (Despacho a Conductores Reales)
    socket.emit('trip:request', {
      passengerId: userProfile?.id || 'guest-passenger',
      passengerName: (userProfile?.fullName || userProfile?.full_name || userProfile?.name || 'Pasajero Invitado').trim(),
      passengerPhoto: userProfile?.photoUrl || null,
      passengerRating: userProfile?.rating || 5.0,
      passengerTrips: userProfile?.tripsCompleted || 1,
      isGuest: !Boolean(userProfile?.fullName || userProfile?.full_name),
      passengerPhone: userProfile?.phone || '',
      serviceType,
      transportType,
      originAddress: effectiveOrigin,
      originLat: oLat,
      originLng: oLng,
      destinationAddress: effectiveDestination,
      destinationLat: dLat,
      destinationLng: dLng,
      destinationMunicipality: destinationMunicipality || 'San Salvador',
      distanceKm: roadDistanceKm || 5.0,
      durationMinutes: estimatedDurationMin || 14,
      proposedFare: parseFloat(proposedFare || 3.50).toFixed(2),
      suggestedFare: suggestedFareInfo?.suggestedFare || '3.50',
      delayMinutes: trafficInfo?.delayMinutes || 0,
      trafficLevel: trafficInfo?.trafficLevel || 'FLUID',
      trafficLabel: trafficInfo?.trafficLabel || 'Tráfico Fluido',
      trafficColor: trafficInfo?.trafficColor || '#10B981',
      cashBill,
      changeNeeded: calculateChange(),
      preferences: tripPreferences,
      isRoundTrip: Boolean(tripPreferences.isRoundTrip),
      roundTripWaitMinutes: parseInt(tripPreferences.roundTripWaitMinutes) || 0,
      packageDetails,
      paymentTiming,
      creditApplied: applyBonus ? 1.00 : 0.00,
      hasBonusDiscount: applyBonus
    }, (res) => {
      if (res?.success && res.trip?.id) {
        setTripId(res.trip.id);
        socket.emit('trip:reconnect', { tripId: res.trip.id, role: 'PASSENGER', passengerId: userProfile?.id || null });
      }
    });
  };

  // 1. Iniciar Búsqueda (Detección de invitado e invitación exclusiva a registrarse)
  const handleSearchDrivers = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Detectar si la sesión es de invitado (no ha iniciado sesión)
    const isGuest = !userProfile || userProfile.isGuest || !userProfile.id;
    if (isGuest) {
      speakAssistantMessage(
        'Detectamos que estás en modo invitado. Te invitamos a registrarte para tener beneficios exclusivos con cuotas inferiores al mínimo.'
      );
      setShowGuestInviteModal(true);
      return;
    }

    executeSearchDrivers();
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
    const hasCredit = applyBonus || creditDiscountApplied;
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
        phone: offer.phone || offer.driverPhone || ''
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
  const handleCompleteRegistrationWithBonus = (profileData, hostName = '') => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const fullProfile = {
      ...profileData,
      hasBonus: true,
      bonusAmount: '1.00',
      bonusExpiresAt: expiresAt,
      bonuses: [
        {
          id: `bonus-welcome-${Date.now()}`,
          title: 'Bono de Bienvenida',
          amount: '1.00',
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt,
          status: 'ACTIVE',
          description: 'Acreditado por registro oficial con Google y DUI'
        }
      ]
    };
    setUserProfile(fullProfile);
    localStorage.setItem('demiempresa_passenger', JSON.stringify(fullProfile));
    setShowRegisterModal(false);
    setGoogleDuiStep(false);

    setCelebrationName(profileData.fullName || 'Pasajero');
    setReferredByHostName(hostName || referrerCode || '');
    setCelebrationStep(1);
    setShowCelebrationModal(true);

    // Disparar fuegos artificiales y papelitos volando
    triggerCelebrationConfetti();

    // Sonido de caja registradora / dólar acreditado
    triggerCashRewardFeedback();

    // Locución con tono alegre anunciando bono de $1.00
    speakAssistantMessage(
      `¡Felicidades ${profileData.fullName}! Te has inscrito exitosamente a nuestra plataforma. Has recibido un bono de bienvenida de un dólar que será usado en tu próximo viaje.`
    );
  };

  // Enviar dólar de recompensa al amigo con sonido de dinero y confeti
  const handleSendDollarToFriend = () => {
    triggerCashRewardFeedback(); // Cha-Ching!
    try {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#059669', '#34D399', '#F59E0B', '#FCD34D'],
        zIndex: 99999
      });
    } catch {}
    setCelebrationStep(3);
  };

  // Guardar datos de seguridad (Registro opcional con todos los datos: nombre, dui, email)
  const handleSaveProfileAndAccept = async (e) => {
    e.preventDefault();
    if (docType === 'DUI' && !/^\d{8}-\d{1}$/.test(regDui)) {
      setDuiError('DUI inválido. Debe tener el formato estricto 00000000-0');
      return;
    }
    if (docType === 'PASSPORT' && (!regDui || regDui.trim().length < 6)) {
      setDuiError('Ingresa un número de pasaporte o carné de residencia válido (mínimo 6 caracteres).');
      return;
    }
    if (!termsAccepted) {
      setDuiError('Debes aceptar los Términos de Referencia y Condiciones del Servicio.');
      return;
    }

    setRegistering(true);
    setDuiError('');

    const emailToSave = regEmail || (googleTempUser ? googleTempUser.email : `${regDui.replace(/[^A-Za-z0-9]/g, '')}@demiempresa.online`);

    try {
      const regRes = await registerUserApi({
        fullName: regFullName,
        phone: regPhone || '',
        dui: regDui,
        documentType: docType === 'PASSPORT' ? 'PASSPORT_RESIDENCE' : 'DUI',
        role: 'PASSENGER',
        referrerCode,
        termsAccepted: true,
        consents: {
          geo: geoConsent,
          mic: micConsent,
          ads: adsConsent
        }
      });

      const effectivePhoto = googleTempUser?.photoUrl || selectedAvatarUrl || null;
      const safeReferralCode = regRes?.wallet?.referralCode || regRes?.user?.referralCode || (regRes?.user?.id ? `RMB${String(regRes.user.id).replace(/\D/g, '').slice(-6)}` : null);
      const profile = {
        id: regRes?.user?.id || googleTempUser?.id || `usr-${Date.now()}`,
        fullName: regFullName,
        email: emailToSave,
        dui: regDui,
        phone: regPhone || '',
        photoUrl: effectivePhoto,
        referralCode: safeReferralCode,
        provider: googleTempUser ? 'google' : 'manual',
        isVerified: true,
        sessionToken: regRes?.sessionToken || regRes?.user?.sessionToken || null
      };

      if (regRes?.isExistingUser) {
        // El usuario ya formaba parte de la comunidad previamente
        setUserProfile(profile);
        localStorage.setItem('demiempresa_passenger', JSON.stringify(profile));
        setShowRegisterModal(false);
        setGoogleDuiStep(false);
        alert(`¡Bienvenido de vuelta, ${profile.fullName}! Has iniciado sesión con tu cuenta existente. Como ya estabas registrado previamente en Rumbo, no aplica nuevo bono de referido para evitar falsas expectativas.`);
        return;
      }

      const hostName = regRes?.referrer?.name || referrerCode || '';
      handleCompleteRegistrationWithBonus(profile, hostName);
    } catch (err) {
      console.warn('Fallback local al registrar:', err.message);
      const effectivePhoto = googleTempUser?.photoUrl || selectedAvatarUrl || null;
      const fallbackProfile = {
        id: googleTempUser?.id || `usr-${Date.now()}`,
        fullName: regFullName,
        email: emailToSave,
        dui: regDui,
        phone: regPhone || '',
        photoUrl: effectivePhoto,
        provider: googleTempUser ? 'google' : 'manual',
        isVerified: true
      };
      handleCompleteRegistrationWithBonus(fallbackProfile, referrerCode || '');
    } finally {
      setRegistering(false);
    }
  };

  // Iniciar Sesión de Pasajero Registrado (por DUI o Teléfono)
  const handleLoginPassenger = async (e) => {
    if (e) e.preventDefault();
    if (!loginIdentifier || !loginIdentifier.trim()) {
      setLoginError('Por favor ingresa tu DUI o número de teléfono registrado.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await loginUserApi({ identifier: loginIdentifier.trim() });
      if (res?.success && res.user) {
        const profile = {
          id: res.user.id,
          fullName: res.user.full_name,
          email: res.user.email || `${res.user.dui.replace(/\D/g, '')}@demiempresa.online`,
          dui: res.user.dui,
          phone: res.user.phone || '',
          photoUrl: res.user.photo_url || null,
          referralCode: res.wallet?.referralCode || null,
          provider: 'login',
          isVerified: true,
          sessionToken: res.sessionToken || res.user.sessionToken || null
        };
        setUserProfile(profile);
        localStorage.setItem('demiempresa_passenger', JSON.stringify(profile));
        setShowRegisterModal(false);
        setLoginIdentifier('');
        triggerSelectionFeedback();
        speakAssistantMessage(`¡Bienvenido de vuelta, ${res.user.full_name}!`);
      }
    } catch (err) {
      setLoginError(err.message || 'No encontramos ninguna cuenta con ese DUI o teléfono. Verifica o regístrate.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Manejar Autenticación con Google (Obtener Nombre, Email y solicitar DUI)
  const handleSelectGoogleAccount = (account) => {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);

      // Guardamos datos de Google (Nombre y Email)
      setRegFullName(account.name);
      setRegEmail(account.email);
      setGoogleTempUser(account);

      // Como requerimos todos los datos completos (nombre, dui, email), solicitamos el DUI
      setGoogleDuiStep(true);
      setShowRegisterModal(true);
    }, 400);
  };

  // Inicializar botón oficial de Google Identity Services en el DOM (En Encabezado y en Modal)
  useEffect(() => {
    const clientId = googleClientId;
    if (!clientId) return;

    const renderOfficialGsiButton = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response?.credential) {
                try {
                  const base64Url = response.credential.split('.')[1];
                  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                  const jsonPayload = decodeURIComponent(
                    atob(base64)
                      .split('')
                      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                      .join('')
                  );
                  const user = JSON.parse(jsonPayload);
                  handleSelectGoogleAccount({
                    id: user.sub || `google-${Date.now()}`,
                    name: user.name || 'Usuario Google',
                    email: user.email,
                    photoUrl: user.picture
                  });
                } catch (e) {
                  console.error('Error al decodificar credencial de Google:', e);
                }
              }
            },
            auto_select: false
          });

          // Renderizar botón oficial GSI en el encabezado si no hay usuario logueado
          if (headerGoogleButtonRef.current && !userProfile) {
            headerGoogleButtonRef.current.innerHTML = '';
            const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
            window.google.accounts.id.renderButton(headerGoogleButtonRef.current, {
              type: 'standard',
              theme: isLight ? 'outline' : 'filled_blue',
              size: 'medium',
              text: 'signin',
              shape: 'pill',
              logo_alignment: 'left',
              width: isSmallScreen ? 125 : 180
            });
          }

          // Renderizar botón oficial GSI en el modal de registro si está visible
          if (showRegisterModal && !googleDuiStep && googleButtonContainerRef.current) {
            googleButtonContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: authModalTab === 'LOGIN' ? 'signin_with' : 'continue_with',
              shape: 'pill',
              logo_alignment: 'left',
              width: 320
            });
          }

          // Desplegar Google One Tap prompt si no está autenticado
          if (!userProfile) {
            window.google.accounts.id.prompt();
          }
        } catch (err) {
          console.warn('Error inicializando Google Identity Services:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderOfficialGsiButton();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          renderOfficialGsiButton();
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [showRegisterModal, googleDuiStep, googleClientId, userProfile, isLight, authModalTab]);

  // Abrir Google Identity Services real / Ventana emergente oficial de Google
  const handleGoogleSignInClick = () => {
    const clientId = googleClientId;
    if (!clientId) {
      // Si aún no está configurado el Client ID de Google Cloud, solicitarlo para abrir accounts.google.com
      setShowGoogleConfigModal(true);
      return;
    }

    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
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

    // Si GSI está disponible en el navegador, invocar el selector nativo oficial
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }
  };

  // Enviar invitación de referido por WhatsApp
  const handleSendWhatsAppReferral = () => {
    const cleanPhone = (refContactPhone || '').replace(/\D/g, '');
    const myCode = userProfile?.referralCode || (userProfile?.id ? `RMB${String(userProfile.id).replace(/\D/g, '').slice(-6)}` : '');
    const { text } = getSharePayload('passenger', myCode);
    const waUrl = cleanPhone && cleanPhone.length >= 8
      ? `https://wa.me/503${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
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

    // Registrar nuevo bono de referido en el perfil del usuario
    setUserProfile((prev) => {
      const current = prev || {
        fullName: 'Pasajero',
        email: '',
        dui: '',
        bonusAmount: '0.00',
        bonuses: []
      };
      const existingBonuses = current.bonuses || [];
      const newRefBonus = {
        id: `bonus-ref-${Date.now()}`,
        title: `Referido: ${refContactName || 'Invitado WhatsApp'}`,
        amount: '1.00',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING_TRIP',
        condition: 'Válido 7 días al completar viaje de $3.00+'
      };
      const updatedTotal = (parseFloat(current.bonusAmount || '0') + 1.00).toFixed(2);
      const updated = {
        ...current,
        hasBonus: true,
        bonusAmount: updatedTotal,
        bonuses: [...existingBonuses, newRefBonus]
      };
      localStorage.setItem('demiempresa_passenger', JSON.stringify(updated));
      return updated;
    });

    // 3. Locución del asistente
    speakAssistantMessage(
      '¡Excelente! Se ha abonado un dólar a tu cuenta con una vigencia de 7 días, siempre y cuando tu referido realice un viaje pagado por un mínimo de 3 dólares en los próximos 7 días.'
    );
  };

  // Simulación del trayecto y ETA (Solo en modo demo sin chofer real conectado)
  useEffect(() => {
    if (appState !== 'IN_TRIP_HUB') return;

    const tEta = setInterval(() => {
      setDriverEtaMinutes((prev) => (prev > 1 ? prev - 1 : 1));
    }, 25000);

    // Si es un viaje con conductor real conectado vía WebSocket o asignado, el conductor controla los estados
    if (assignedTrip?.driver?.id || assignedTrip?.tripId || assignedTrip?.isSharedPool) {
      return () => {
        clearInterval(tEta);
      };
    }

    const tArrived = setTimeout(() => setTripStatus('DRIVER_ARRIVED'), 7000);
    const tTransit = setTimeout(() => setTripStatus('IN_TRANSIT'), 14000);

    return () => {
      clearInterval(tEta);
      clearTimeout(tArrived);
      clearTimeout(tTransit);
    };
  }, [appState, assignedTrip?.driver?.id]);

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

  // Unirse al Colectivo Compartido en Tiempo Real
  const handleJoinSharedPoolClient = () => {
    if (!userProfile) {
      setShowSharedRegisterPrompt(true);
      return;
    }
    const currentOrigin = originCoords || { lat: 13.7013, lng: -89.2244 };
    const currentDest = destinationCoords || { lat: 13.6738, lng: -89.2789 };
    const corridor = calculateCorridor(currentOrigin, currentDest);
    const normalFareNum = parseFloat(proposedFare || '5.00');

    setIsJoinedToPool(true);
    const safePassengerId = userProfile.id || (userProfile.email ? userProfile.email : `usr-${Date.now()}`);

    // Activar o asegurar suscripción Push para alertas de cupos y despacho en segundo plano
    if (isPushSupported() && Notification.permission !== 'denied') {
      subscribeUserToPush({
        userId: safePassengerId,
        userType: 'PASSENGER'
      }).then((subRes) => {
        if (subRes.success) setPushPermission('granted');
      }).catch(() => {});
    }

    socket.emit('pool:join', {
      passengerId: safePassengerId,
      passengerName: userProfile.fullName || 'Pasajero',
      phone: userProfile.phone || '',
      genderFilter: sharedPoolGenderFilter,
      originAddress: origin || 'Punto de partida',
      originLat: currentOrigin.lat,
      originLng: currentOrigin.lng,
      destinationAddress: destination || 'Punto de destino',
      destinationLat: currentDest.lat,
      destinationLng: currentDest.lng,
      corridorCode: corridor.corridorCode,
      corridorName: corridor.corridorName,
      direction: corridor.direction,
      bearing: corridor.bearing,
      distanceKm: roadDistanceKm || 5.0,
      normalFare: normalFareNum
    }, (res) => {
      if (res && res.stops) {
        setPoolStatus((prev) => ({
          ...prev,
          poolId: res.poolId,
          seatsFilled: res.seatsFilled,
          stops: res.stops
        }));
      }
    });

    triggerCashRewardFeedback();
    speakAssistantMessage(`Te has unido al colectivo compartido en ${corridor.corridorName}. Esperando completar los 4 asientos.`);
  };

  // Salir del Colectivo Compartido
  const handleLeaveSharedPoolClient = () => {
    if (poolStatus?.poolId) {
      const safePassengerId = userProfile?.id || (userProfile?.email ? userProfile.email : `usr-${Date.now()}`);
      socket.emit('pool:leave', {
        poolId: poolStatus.poolId,
        passengerId: safePassengerId
      });
    }
    setIsJoinedToPool(false);
    setPoolStatus(null);
    speakAssistantMessage('Has salido del colectivo compartido.');
  };

  // Forzar restablecimiento de pantalla si un viaje quedó congelado o huérfano
  const handleForceResetStuckTrip = () => {
    if (confirm('¿Deseas restablecer la pantalla y cancelar esta carrera? Usa esta opción si la pantalla quedó congelada o el conductor no responde.')) {
      if (tripId) {
        socket.emit('trip:cancel_orphan', { tripId });
      }
      localStorage.removeItem('rumbo_passenger_active_session');
      setAppState('DECOY_FORM');
      setTripId(null);
      setAssignedTrip(null);
      setTripStatus('DRIVER_EN_ROUTE');
      setShowMutualCancelModal(false);
      setWaitingCancelPeerResponse(false);
      speakAssistantMessage('Pantalla restablecida con éxito. Puedes solicitar un nuevo viaje.');
    }
  };

  // Cerrar Sesión del Pasajero y Regresar a la Pantalla de Inicio
  const handleLogoutPassenger = () => {
    // Si hay un viaje en curso o búsqueda activa, NO permitir cerrar sesión para proteger los datos
    const isTripInProgress = Boolean(
      (appState === 'IN_TRIP_HUB' && assignedTrip) ||
      (appState === 'AUCTION' && tripId)
    );

    if (isTripInProgress) {
      speakAssistantMessage('No puedes cerrar sesión mientras tienes un viaje o solicitud en ejecución.');
      alert('⚠️ No es posible cerrar sesión con un viaje o solicitud en curso. Por tu seguridad y para mantener la conexión en tiempo real con tu conductor, debes esperar a que el viaje finalice.');
      return;
    }

    if (confirm('¿Deseas cerrar sesión en este dispositivo?')) {
      if (isJoinedToPool) {
        handleLeaveSharedPoolClient();
      }
      setUserProfile(null);
      localStorage.removeItem('demiempresa_passenger');
      localStorage.removeItem('rumbo_passenger_active_session');
      localStorage.removeItem('rumbo_passenger_draft');
      setShowBonusesAccountModal(false);
      setRideMode('UNDECIDED');
      setAppState('DECOY_FORM');
      setIsJoinedToPool(false);
      setPoolStatus(null);
      setTripId(null);
      setAssignedTrip(null);
      triggerSelectionFeedback();
      speakAssistantMessage('Has cerrado sesión. Bienvenido nuevamente a Rumbo.');
    }
  };

  // Actualizar avatar del pasajero directamente desde Mi Cuenta
  const handleSelectUserProfileAvatar = (avatarDataUri) => {
    if (!userProfile) return;
    const updated = { ...userProfile, photoUrl: avatarDataUri };
    setUserProfile(updated);
    try {
      localStorage.setItem('demiempresa_passenger', JSON.stringify(updated));
    } catch {}
    triggerSelectionFeedback();
  };

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans transition-colors duration-200 ${
      isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Barra Superior Oficial Rumbo */}
      <header className={`border-b backdrop-blur sticky top-0 z-40 px-2.5 sm:px-4 py-2 sm:py-3 flex items-center justify-between transition-colors w-full max-w-full overflow-hidden ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex-shrink-0">
          <RumboLogo />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Avatar Oficial del Asistente de Voz (Ámbar y Blanco) */}
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            title={
              (isListeningVoice || isListeningOriginVoice)
                ? 'Asistente escuchando... Toca para pausar'
                : 'Asistente de Voz Rumbo (Toca para dictar tu rumbo)'
            }
            aria-label={
              (isListeningVoice || isListeningOriginVoice)
                ? 'Asistente escuchando tu ubicación, presiona para pausar'
                : 'Activar asistente de voz Rumbo'
            }
            className={`p-1 sm:pl-1.5 sm:pr-2.5 rounded-full border flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none flex-shrink-0 ${
              (isListeningVoice || isListeningOriginVoice)
                ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 border-slate-700/80 hover:border-amber-400/50 hover:bg-slate-800'
            }`}
          >
            {/* Avatar Orb Ámbar y Blanco */}
            <div className={`relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center overflow-hidden transition-transform shadow-md ${
              (isListeningVoice || isListeningOriginVoice)
                ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 scale-105'
                : 'bg-gradient-to-tr from-amber-500 to-amber-400'
            }`}>
              {(isListeningVoice || isListeningOriginVoice) && (
                <span className="absolute inset-0 rounded-full bg-white/40 animate-ping pointer-events-none" />
              )}
              <Mic className={`w-3.5 h-3.5 text-white drop-shadow-sm ${(isListeningVoice || isListeningOriginVoice) ? 'animate-bounce' : ''}`} />
            </div>

            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="text-[11px] font-black text-white">
                Asistente
              </span>
              <span className="text-[9px] font-bold text-amber-400 mt-0.5">
                {(isListeningVoice || isListeningOriginVoice) ? 'Escuchando...' : 'Voz activa'}
              </span>
            </div>
          </button>

          {/* Estado dinámico del Asistente por Voz */}
          {(voiceDialogueStep !== 'IDLE' || isListeningVoice || isListeningOriginVoice) && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>
                {isListeningOriginVoice ? 'Escuchando recogida...' : isListeningVoice ? 'Escuchando rumbo...' : 'Hablando...'}
              </span>
            </div>
          )}

          {/* Icono Minimalista de Inbox para Pasajeros (SIN LETRAS) */}
          <button
            type="button"
            onClick={() => setShowInboxModal(true)}
            title="Buzón / Inbox"
            aria-label="Abrir buzón de mensajes"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer relative flex-shrink-0 ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-slate-800/90 border-slate-700 text-amber-400 hover:text-amber-300 hover:bg-slate-700'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </button>

          {/* Selector de Tema Compacto */}
          <button
            type="button"
            onClick={() => toggleTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label="Cambiar tema de color"
            className={`p-1.5 sm:p-2 rounded-full border transition-all cursor-pointer flex-shrink-0 ${
              isLight
                ? 'bg-amber-100/90 border-amber-300 text-amber-800 hover:bg-amber-200'
                : 'bg-slate-800/90 border-slate-700 text-lime-400 hover:bg-slate-700'
            }`}
          >
            {isLight ? <Sun className="w-4 h-4 text-amber-600" /> : <Moon className="w-4 h-4 text-lime-400" />}
          </button>

          {/* Botón de Silencio de Voz Asistente (Ícono de Mono tapándose la boca 🙊) */}
          <button
            type="button"
            onClick={handleToggleVoiceMute}
            title={isVoiceMuted ? 'Activar voz del asistente' : 'Silenciar voz del asistente'}
            aria-label={isVoiceMuted ? 'Activar voz del asistente' : 'Silenciar voz del asistente'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 text-base sm:text-lg select-none ${
              isVoiceMuted
                ? 'bg-rose-500/20 border-rose-500/60 ring-2 ring-rose-500/40 shadow-sm'
                : isLight
                ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 opacity-90 hover:opacity-100'
                : 'bg-slate-800/90 border-slate-700 hover:bg-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            <span role="img" aria-label="mono tapándose la boca">🙊</span>
          </button>

          {/* Botón de Notificaciones Push Web (PWA en segundo plano) */}
          <button
            type="button"
            onClick={handleTogglePushNotifications}
            disabled={isSubscribingPush}
            title={
              pushPermission === 'granted'
                ? 'Notificaciones push activadas (Te avisaremos cuando tu chofer llegue o se llene tu colectivo)'
                : 'Activar notificaciones para saber cuando tu chofer llegue o se complete tu colectivo'
            }
            aria-label="Notificaciones Push"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 text-sm select-none relative ${
              pushPermission === 'granted'
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-sm'
                : isLight
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {pushPermission === 'granted' ? (
              <BellRing className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              </>
            )}
          </button>

          {/* BOTÓN ENCABEZADO SUPERIOR DERECHO: INGRESO OFICIAL CON GOOGLE O INICIAR SESIÓN */}
          {!userProfile ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                ref={headerGoogleButtonRef}
                className="min-h-[36px] flex items-center justify-end rounded-full overflow-hidden shadow-sm flex-shrink-0"
              />
              {/* Fallback de respaldo en caso de bloqueo de script o sin conexión */}
              {!window.google?.accounts?.id && (
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  title="Ingresa con Google y obtén tu bono de $1.00 USD"
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-full flex items-center gap-1.5 shadow-sm transition-all cursor-pointer group active:scale-95 flex-shrink-0"
                >
                  <svg className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                    <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z" />
                  </svg>
                  <div className="flex items-center gap-1 leading-none">
                    <span className="text-[11px] font-bold text-slate-800">
                      Ingresar
                    </span>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-1 py-0.5 rounded-full border border-amber-200">
                      +$1
                    </span>
                  </div>
                </button>
              )}

              {/* Botón directo para Iniciar Sesión con DUI o Teléfono */}
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab('LOGIN');
                  setShowRegisterModal(true);
                }}
                title="Iniciar sesión con tu cuenta registrada"
                className="px-2.5 sm:px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-xs font-bold active:scale-95 flex-shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">Iniciar Sesión</span>
                <span className="xs:hidden">Entrar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowBonusesAccountModal(true)}
              title="Ver crédito de bonos, vencimiento y referir amigos"
              className="px-2 sm:px-3 py-1 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 hover:from-amber-500/25 hover:to-yellow-500/25 border border-amber-400/50 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all cursor-pointer active:scale-95 flex-shrink-0"
            >
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.fullName || 'Usuario'}
                  className="w-5 h-5 rounded-full object-cover border border-amber-400 flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                  {userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'G'}
                </div>
              )}
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[11px] font-bold text-white hidden sm:inline truncate max-w-[85px]">
                  {userProfile.fullName?.split(' ')[0] || 'Mi Cuenta'}
                </span>
                <span className="text-[11px] font-black text-amber-300 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1">
                  <Gift className="w-3 h-3 text-amber-400" />
                  <span>${userProfile.bonusAmount || '1.00'}</span>
                </span>
              </div>
            </button>
          )}

          {/* ACCESO DIRECTO AL MODO CONDUCTOR */}
          <a
            href="/conductor"
            title="Ir a la Consola y Radar del Conductor"
            className="px-2 sm:px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all shadow-sm flex-shrink-0"
          >
            <Car className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Soy Conductor</span>
          </a>
        </div>
      </header>

      {/* ============================================================== */}
      {/* FASE 1: SEÑUELO MINIMALISTA (Captura limpia y sin distracciones) */}
      {/* ============================================================== */}
      {appState === 'DECOY_FORM' && rideMode === 'UNDECIDED' && (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-center animate-fade-in">
          <div className={`border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-center transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/60 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className="space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                <Compass className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                ¿Cómo deseas viajar hoy?
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Selecciona la modalidad para tu traslado directo en El Salvador.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-1 text-left">
              {/* OPCIÓN 1: VIAJE PRIVADO */}
              <button
                type="button"
                onClick={() => handleSelectRideMode('PRIVATE')}
                className="p-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-amber-400 text-left transition-all group cursor-pointer shadow-lg active:scale-95 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shrink-0 shadow">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-amber-300 flex items-center gap-1.5">
                      <span>🚗 Viaje Privado</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Vehículo exclusivo para ti. Ruta directa a tu destino sin paradas compartidas.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 shrink-0 ml-2" />
              </button>

              {/* OPCIÓN 2: COLECTIVO COMPARTIDO CON DESCUENTO DEL 30% */}
              <button
                type="button"
                onClick={() => handleSelectRideMode('SHARED')}
                className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 hover:border-emerald-400 border-2 border-emerald-500/50 text-left transition-all group cursor-pointer shadow-xl active:scale-95 flex items-center justify-between relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                  Descuento del 30%
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform shrink-0 shadow">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                      <span>👥 Colectivo Compartido</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Comparte ruta en tu mismo corredor (radio 1 km). 4 pasajeros en línea recta, despacho por distancia.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* MODALIDAD PRIVADA */}
      {appState === 'DECOY_FORM' && rideMode === 'PRIVATE' && (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-center animate-fade-in">
          
          <div className={`border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/60 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>

            {/* Selector rápido para cambiar modalidad */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setRideMode('UNDECIDED')}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>← Cambiar a selección</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!userProfile) {
                    setShowSharedRegisterPrompt(true);
                  } else {
                    setRideMode('SHARED');
                  }
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 cursor-pointer text-[11px]"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Colectivo (-30%)</span>
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

              {/* Origen con botón GPS real, dictado por voz, búsqueda manual y Mapa Interactivo */}
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
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      if (originCoords) setOriginCoords(null);
                      if (originError) setOriginError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGeocodeManualOrigin(origin);
                      }
                    }}
                    placeholder={isGettingGps ? "Detectando tu ubicación GPS..." : "¿Dónde te recogen? (o dicta con el micrófono)"}
                    className="w-full pl-3 pr-28 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {/* Dictar Origen con Micrófono */}
                    <button
                      type="button"
                      aria-label={isListeningOriginVoice ? "Escuchando tu punto de recogida... Toca para pausar" : "Dictar punto de recogida por voz"}
                      title={isListeningOriginVoice ? "Escuchando... Toca para pausar" : "Dictar punto de recogida con voz"}
                      onClick={handleDictateOrigin}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isListeningOriginVoice
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-pulse'
                          : 'text-amber-400 hover:text-amber-300 hover:bg-slate-700'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    {/* Buscar y Confirmar Dirección Escrita */}
                    <button
                      type="button"
                      title="Buscar y confirmar punto de recogida"
                      disabled={isSearchingOrigin}
                      onClick={() => handleGeocodeManualOrigin(origin)}
                      className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSearchingOrigin ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                    {/* GPS Real */}
                    <button
                      type="button"
                      title="Obtener ubicación GPS actual"
                      disabled={isGettingGps}
                      onClick={handleGetGpsLocation}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isGettingGps ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : (
                        <Navigation className="w-4 h-4" />
                      )}
                    </button>
                    {/* Mapa */}
                    <button
                      type="button"
                      title="Fijar en mapa con pin arrastrable"
                      onClick={() => setShowMapModal(true)}
                      className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notificación si el origen no es encontrado */}
                {originError && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span className="leading-tight font-medium text-[11px] sm:text-xs">
                        {originError}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      Fijar en Mapa
                    </button>
                  </div>
                )}

                {/* Botón para Confirmar Origen Manual si aún no tiene coordenadas */}
                {!isOriginConfirmed && origin.trim().length > 1 && (
                  <div className="mt-2.5 animate-fade-in">
                    <button
                      type="button"
                      disabled={isSearchingOrigin}
                      onClick={() => handleGeocodeManualOrigin(origin)}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isSearchingOrigin ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Buscando punto de recogida...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirmar Punto de Recogida</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

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

              {/* Destino con botón de Micrófono instantáneo, Búsqueda y Mapa Interactivo */}
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
                    className="w-full pl-3 pr-24 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 text-sm"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {/* Dictar Destino por Voz */}
                    <button
                      type="button"
                      aria-label={isListeningVoice ? "Escuchando tu destino... Toca para pausar" : "Dictar destino por voz"}
                      title={isListeningVoice ? "Escuchando... Toca para pausar" : "Dictar destino con voz"}
                      onClick={handleDictateDestination}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isListeningVoice
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                          : 'text-amber-400 hover:text-amber-300 hover:bg-slate-700'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    {/* Buscar y Confirmar Rumbo */}
                    <button
                      type="button"
                      title="Buscar y confirmar rumbo escrito"
                      disabled={isSearchingDest}
                      onClick={() => handleGeocodeManualDestination(destination)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSearchingDest ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                    {/* Mapa */}
                    <button
                      type="button"
                      title="Fijar destino en el mapa"
                      onClick={() => setShowDestMapModal(true)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition-colors cursor-pointer"
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
                      onClick={() => handleSelectServiceType('PASSENGER')}
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
                      onClick={() => handleSelectServiceType('PACKAGE')}
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
                      onClick={() => handleToggleRoundTrip(false)}
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
                      onClick={() => handleToggleRoundTrip(true)}
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
                    {tripPreferences.airConditioning ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold whitespace-nowrap">
                        ❄️ Con A/C
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium whitespace-nowrap">
                        💨 Sin A/C (Mínima)
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

              {/* Monto Ofrecido en Efectivo con Tarifa Mínima / Sugerida Inteligente */}
              <div>
                {/* Control Directo de Aire Acondicionado (Un solo toque) */}
                {!isMotoMode && (
                  <div className={`mb-2.5 p-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 shadow-sm transition-colors ${serviceType === 'PACKAGE' ? 'opacity-65' : 'hover:border-slate-700/80'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        serviceType === 'PACKAGE'
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : tripPreferences.airConditioning
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        <Wind className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>
                            {serviceType === 'PACKAGE'
                              ? 'Aire Acondicionado No Aplicable'
                              : tripPreferences.airConditioning
                                ? 'Aire Acondicionado Activo'
                                : 'Sin Aire Acondicionado'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            serviceType === 'PACKAGE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : tripPreferences.airConditioning
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {serviceType === 'PACKAGE' ? 'Envío Paquete' : tripPreferences.airConditioning ? 'Climatizado' : 'Tarifa Mínima'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {serviceType === 'PACKAGE'
                            ? 'No aplicable en entrega de paquetes'
                            : tripPreferences.airConditioning
                              ? 'Tarifa calculada con climatización'
                              : 'Tarifa base mínima del servicio'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={serviceType === 'PACKAGE'}
                      onClick={handleToggleAirConditioning}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                        serviceType === 'PACKAGE'
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                          : tripPreferences.airConditioning
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-cyan-500/20 cursor-pointer'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 cursor-pointer'
                      }`}
                      title={
                        serviceType === 'PACKAGE'
                          ? "El aire acondicionado no aplica en servicio de entrega de paquetes"
                          : tripPreferences.airConditioning
                            ? "Desactivar A/C y volver a la tarifa mínima"
                            : "Activar A/C e incrementar tarifa automáticamente"
                      }
                    >
                      <span>
                        {serviceType === 'PACKAGE'
                          ? '📦 No aplica'
                          : tripPreferences.airConditioning
                            ? '❄️ Con A/C'
                            : '❄️ Activar A/C'}
                      </span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tu Oferta en Efectivo (USD)</span>
                  </label>

                  {/* Chip de Tarifa Sugerida Calculada en Vivo */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">
                      {tripPreferences.airConditioning ? 'Sugerida (con A/C):' : 'Sugerida (sin A/C):'}
                    </span>
                    <button
                      type="button"
                      onClick={handleUseSuggestedFare}
                      className="px-2 py-0.5 rounded-lg bg-lime-500/15 border border-lime-500/40 text-lime-300 font-extrabold text-xs flex items-center gap-1 hover:bg-lime-500/25 transition-all cursor-pointer shadow-sm group"
                      title={tripPreferences.airConditioning ? "Tarifa calculada con aire acondicionado" : "Tarifa base recomendada sin aire acondicionado"}
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
                      onClick={() => handleSelectQuickFare(amt, idx === 0)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border font-mono transition-all cursor-pointer ${
                        proposedFare === amt
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${amt}
                      {idx === 0 && <span className="block text-[9px] font-sans opacity-70">mínima</span>}
                      {idx === 1 && <span className="block text-[9px] font-sans opacity-70">sugerida</span>}
                    </button>
                  ))}
                </div>

                {/* BOTÓN DE OPCIÓN: APLICAR BONOS ($1.00 USD) */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !applyBonus;
                      setApplyBonus(nextState);
                      const baseNum = parseFloat(proposedFare || '2.50');
                      const newCashFare = Math.max(1.00, baseNum - 1.00).toFixed(2);
                      const changeText = getChangeVoiceText(proposedFare, nextState);
                      triggerSelectionFeedback();
                      if (nextState) {
                        speakAssistantMessage(`¡Lo prometido es deuda! Y el conductor te dará tu bono de bienvenida o referido. Tu nueva tarifa a pagar en efectivo te queda en ${newCashFare} dólares. ${changeText}`);
                      } else {
                        speakAssistantMessage(`Bono deseleccionado. Tu tarifa a pagar es de ${baseNum.toFixed(2)} dólares en efectivo. ${changeText}`);
                      }
                    }}
                    className={`w-full p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 shadow-sm cursor-pointer ${
                      applyBonus
                        ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/40 border-emerald-500/70 shadow-emerald-500/20 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow transition-colors ${
                        applyBonus
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-amber-400 border border-slate-700'
                      }`}>
                        🎁
                      </div>
                      <div>
                        <div className="text-xs font-black flex items-center gap-1.5 text-white">
                          <span>Aplicar Bonos</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            applyBonus
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}>
                            -$1.00 USD
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {applyBonus ? (
                            <span className="text-emerald-300 font-semibold">
                              ¡Lo prometido es deuda! El conductor te dará tu bono de bienvenida/referido: pagas en efectivo <strong className="text-white font-mono">${Math.max(1.00, parseFloat(proposedFare || '2.50') - 1.00).toFixed(2)} USD</strong> y llevará +$1.00 más de cambio.
                            </span>
                          ) : (
                            <span>🎁 ¡Lo prometido es deuda! Aplica tu bono de bienvenida o referido de $1.00 USD</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                        applyBonus
                          ? 'bg-emerald-500 text-slate-950 font-black shadow'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {applyBonus ? '✓ APLICADO' : 'APLICAR'}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Política Estricta de A/C: Solo se muestra si el vehículo permite A/C y el usuario no lo ha activado */}
                {!isMotoMode && serviceType !== 'PACKAGE' && !tripPreferences.airConditioning && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-2 text-[11px] text-cyan-300 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-cyan-400/70 flex-shrink-0" />
                      <span className="leading-tight text-[11px]">
                        Tarifa base sin climatización. Puedes activar aire acondicionado por solo ${suggestedFareInfo.suggestedFare}.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleEnableAcWithSuggestedFare}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] whitespace-nowrap cursor-pointer transition-all shadow-sm"
                    >
                      Activar A/C (${suggestedFareInfo.suggestedFare})
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
                    const effectiveCashToPay = applyBonus ? Math.max(1.00, fareNum - 1.00) : fareNum;
                    const isDisabled = bill.val > 0 && bill.id !== '50+' ? bill.val <= effectiveCashToPay : (bill.id === '50+' ? effectiveCashToPay >= 100 : false);
                    return (
                      <button
                        key={bill.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            handleSelectCashBill(bill.id);
                          }
                        }}
                        className={`py-2 px-1 rounded-xl text-center transition-all ${
                          isDisabled
                            ? 'opacity-30 cursor-not-allowed bg-slate-900 border border-slate-800 text-slate-600 line-through'
                            : cashBill === bill.id
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-black cursor-pointer'
                            : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer'
                        }`}
                        title={isDisabled ? `El billete debe ser mayor a lo que pagarás en efectivo ($${effectiveCashToPay.toFixed(2)})` : ''}
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
                      ✅ {applyBonus
                        ? `Pagarás exactamente $${Math.max(1.00, parseFloat(proposedFare || '2.50') - 1.00).toFixed(2)} en efectivo con tu bono aplicado (no requieres cambio).`
                        : `Pagarás la tarifa exacta en efectivo (no requieres cambio).`}
                    </span>
                  ) : cashBill === '50+' ? (
                    <>
                      <span>
                        Pagas con: <strong className="text-white">Billete grande ($50 / $100)</strong>
                        {applyBonus && (
                          <span className="ml-1 text-[10px] text-emerald-400 font-bold">
                            (Pagas en efectivo: ${Math.max(1.00, parseFloat(proposedFare || '2.50') - 1.00).toFixed(2)})
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-amber-300">
                        👉 Chofer llevará cambio para billete grande {applyBonus && '(+$1.00 por tu bono)'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Pagas con: <strong className="text-white">${parseFloat(cashBill).toFixed(2)}</strong>
                        {applyBonus && (
                          <span className="ml-1 text-[10px] text-emerald-400 font-bold">
                            (Pagas en efectivo: ${Math.max(1.00, parseFloat(proposedFare || '2.50') - 1.00).toFixed(2)})
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-amber-300">
                        👉 Chofer llevará <strong>${calculateChange()}</strong> de vuelto
                        {applyBonus && (
                          <span className="ml-1 text-[10px] text-emerald-300 font-medium">
                            (🎁 ¡Lo prometido es deuda! Chofer te dará tu bono en vuelto)
                          </span>
                        )}
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
                <div className="text-center space-y-1 mt-2.5">
                  <p className="text-[11px] text-slate-400">
                    Conexión directa con conductores en un radio de 1 km • 100% Efectivo
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                    <span>Cero permisos abusivos • Procesamiento 100% honesto y transparente</span>
                  </p>
                </div>
              </div>

            </div>
          )}

        </form>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* MODALIDAD COLECTIVO COMPARTIDO: VISTA DEDICADA CON DESCUENTO 30% */}
      {/* ============================================================== */}
      {appState === 'DECOY_FORM' && rideMode === 'SHARED' && (() => {
        const currentOrigin = originCoords || { lat: 13.7013, lng: -89.2244 };
        const currentDest = destinationCoords || { lat: 13.6738, lng: -89.2789 };
        const corridor = calculateCorridor(currentOrigin, currentDest);
        const normalFareVal = parseFloat(proposedFare || '5.00');
        const discount30Val = Number((normalFareVal * 0.30).toFixed(2));
        const finalFareVal = Number((normalFareVal * 0.70).toFixed(2));

        return (
          <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-center animate-fade-in space-y-4">
            <div className={`border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-slate-200/60 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              
              {/* Cabecera Colectivo con botón para volver a privada */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (isJoinedToPool) handleLeaveSharedPoolClient();
                    setRideMode('UNDECIDED');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>← Cambiar a selección</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  Descuento del 30%
                </span>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-white flex items-center justify-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Colectivo Compartido</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Comparte ruta en tu mismo corredor con hasta 4 pasajeros (radio 1 km).
                </p>
              </div>

              {/* Punto de Recogida (Origen) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tu Punto de Recogida (Radio ≤ 1 km)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Mapa</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="¿Dónde te recogen en tu corredor?"
                    className="w-full pl-3 pr-24 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-sm"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDictateOrigin}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      title="Dictar por voz"
                    >
                      <Mic className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      title="Detectar GPS"
                    >
                      <Navigation className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Punto de Llegada (Destino en el Corredor) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-400" />
                    <span>Destino en tu Corredor</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDestMapModal(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Mapa</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGeocodeManualDestination(destination);
                      }
                    }}
                    placeholder="¿Hacia dónde vas? (Ej. Soyapango, San Martín...)"
                    className="w-full pl-3 pr-20 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-sm"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDictateSharedDestination}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        isListeningVoice
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                          : 'text-amber-400 hover:text-amber-300 hover:bg-slate-700'
                      }`}
                      title={isListeningVoice ? "Escuchando... Toca para pausar" : "Dictar destino por voz"}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGeocodeManualDestination(destination)}
                      className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 cursor-pointer"
                      title="Buscar"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Corredor y Línea Recta */}
              <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-emerald-500/30 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Corredor en Línea Recta:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                    {corridor.directionLabel}
                  </span>
                </div>
                <div className="font-bold text-white text-sm">
                  {corridor.corridorName}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Ruta aproximada en línea recta</span>
                  <span className="font-mono text-amber-300 font-bold">~{roadDistanceKm} km</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-semibold">Tolerancia de desvío:</span>
                  <span className="text-slate-300 font-mono font-bold">≤ 1.0 km por pasajero</span>
                </div>
              </div>

              {/* Filtro de Seguridad / Género */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Filtro de Compañía a Bordo:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSharedPoolGenderFilter('ALL');
                      triggerSelectionFeedback();
                      speakAssistantMessage('Has seleccionado compañía sin preferencia.');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer border ${
                      sharedPoolGenderFilter === 'ALL'
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md font-black'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    👥 Sin preferencia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSharedPoolGenderFilter('WOMEN_ONLY');
                      triggerSelectionFeedback();
                      speakAssistantMessage('Has seleccionado la compañía solo de mujeres.');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer border ${
                      sharedPoolGenderFilter === 'WOMEN_ONLY'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 border-pink-400 text-white shadow-md font-black'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    👩 Solo Mujeres
                  </button>
                </div>
              </div>

              {/* Desglose de Tarifa Estricto según Requerimiento del Usuario */}
              <div className="p-4 bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 rounded-2xl border-2 border-emerald-500/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Tarifa normal:</span>
                  <span className="line-through font-mono text-sm">${normalFareVal.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span>Tu Descuento del 30%:</span>
                  <span className="font-mono text-sm">-${discount30Val.toFixed(2)} USD</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                  <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                    PAGARÁS AL CONDUCTOR:
                  </span>
                  <div className="text-3xl font-black text-white font-mono text-right">
                    ${finalFareVal.toFixed(2)} <span className="text-xs font-sans text-emerald-400 font-bold">USD</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                  💡 <strong>Promoción directa:</strong> En viajes colectivos ya cuentas con tu descuento del 30%. Tus créditos de $1.00 USD quedan guardados para tus viajes privados.
                </div>
              </div>

              {/* BURBUJA DE PARADAS ORDENADA POR ORDEN DE DISTANCIA (QUIÉN DESPACHA PRIMERO) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>Burbuja del Colectivo (4 Pasajeros)</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {poolStatus?.seatsFilled || (isJoinedToPool ? 1 : 0)} / 4 cupos
                  </span>
                </div>

                <div className="space-y-1.5 bg-slate-950/80 rounded-2xl p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                    <span>Orden de despacho por cercanía:</span>
                    <span className="text-emerald-400 font-bold">Desvío máximo ≤ 1 km</span>
                  </div>

                  {/* Asientos / Paradas 1 a 4 */}
                  {[1, 2, 3, 4].map((seatNum) => {
                    const assignedStop = poolStatus?.stops?.find(s => s.seatNumber === seatNum);
                    const isMe = assignedStop && (assignedStop.passengerId === (userProfile?.id || userProfile?.email));
                    const isOccupied = Boolean(assignedStop || (seatNum === 1 && isJoinedToPool));
                    const stopDest = assignedStop?.destinationAddress || (seatNum === 1 && isJoinedToPool ? destination || 'Tu destino' : null);
                    const stopDist = assignedStop?.distanceKm || (seatNum === 1 && isJoinedToPool ? roadDistanceKm : null);

                    return (
                      <div
                        key={seatNum}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                          isOccupied
                            ? isMe || (seatNum === 1 && isJoinedToPool)
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                            : 'bg-slate-950 border-dashed border-slate-800 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isOccupied ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {seatNum}
                          </span>
                          <div className="truncate">
                            <div className="font-bold truncate text-[11px] flex items-center gap-1.5">
                              <span>
                                {isOccupied
                                  ? (isMe || (seatNum === 1 && isJoinedToPool) ? 'Tú (Tu Parada)' : 'Otro pasajero')
                                  : `Esperando pasajero ${seatNum}...`}
                              </span>
                              {(isMe || (seatNum === 1 && isJoinedToPool)) && isOccupied && (
                                <span className="font-mono text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  Pagarás: ${finalFareVal.toFixed(2)} USD
                                </span>
                              )}
                            </div>
                            {isOccupied && stopDest && (
                              <div className="text-[10px] text-slate-400 truncate">
                                {stopDest} {stopDist ? `(~${stopDist} km)` : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {seatNum === 1 && isOccupied && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              1º en despachar
                            </span>
                          )}
                          {seatNum === 2 && isOccupied && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              2º en despachar
                            </span>
                          )}
                          {seatNum === 3 && isOccupied && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              3º en despachar
                            </span>
                          )}
                          {seatNum === 4 && isOccupied && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Destino final
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Acciones de Unión al Colectivo */}
              <div className="pt-2">
                {!isJoinedToPool ? (
                  <button
                    type="button"
                    onClick={handleJoinSharedPoolClient}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 border border-emerald-400"
                  >
                    <Users className="w-5 h-5" />
                    <span>Unirme al Colectivo (Descuento del 30%)</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-pulse">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Esperando 4 pasajeros para despacho automático...</span>
                      </div>
                      <span className="font-mono font-bold text-amber-300">
                        {poolStatus?.seatsFilled || 1}/4
                      </span>
                    </div>

                    {/* Alerta de Notificaciones en Segundo Plano para Colectivo */}
                    <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-2xl flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <Bell className={`w-4 h-4 shrink-0 ${pushPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span className="text-slate-300">
                          {pushPermission === 'granted'
                            ? 'Notificaciones activadas: Te avisaremos con sonido cuando se completen los 4 cupos aunque bloquees el celular.'
                            : 'Recibe aviso con vibración al llenarse los 4 cupos aunque apagues la pantalla.'}
                        </span>
                      </div>
                      {pushPermission !== 'granted' && (
                        <button
                          type="button"
                          onClick={handleTogglePushNotifications}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shrink-0 text-[11px] cursor-pointer"
                        >
                          Activar
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleLeaveSharedPoolClient}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Salir del Colectivo
                    </button>
                  </div>
                )}
              </div>

            </div>
          </main>
        );
      })()}

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
                if (tripId) {
                  socket.emit('trip:cancel', { tripId });
                }
                setActiveOffers([]);
                localStorage.removeItem('rumbo_passenger_active_session');
                setTripId(null);
                setAppState('DECOY_FORM');
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              Cancelar Búsqueda
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Ofertas de choferes en tiempo real</span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                TTL 30s por tarjeta
              </span>
            </div>

            {activeOffers.length === 0 ? (
              <div className="p-6 sm:p-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto"></div>
                <p className="text-sm text-slate-300 font-medium">
                  Notificando a choferes activos dentro de 1 km...
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Las ofertas de los conductores aparecerán aquí y se mantendrán durante 30 segundos para que puedas comparar y elegir con calma.
                </p>

                {/* Aviso Profesional de Prelanzamiento y Promoción 200% */}
                <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 border border-amber-500/30 rounded-2xl text-left space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Promoción Prelanzamiento: Bono 200% ($2.00 USD)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      100 Primeros • Vence 31 Oct
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Estamos en despliegue piloto en El Salvador. Los primeros 100 viajeros reciben <strong>$2.00 USD de bienvenida</strong> y <strong>$2.00 USD por cada amigo referido</strong> (vence 31 de octubre de 2026). Si en tu zona aún no hay choferes disponibles al instante, ¡te invitamos a invitar a tus amigos y conductores conocidos para activar la cobertura local!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const shareMsg = `🚗 ¡Aprovecha la Súper Promoción de Prelanzamiento en Rumbo a mi Destino! Bono del 200% ($2.00 USD de bienvenida y $2.00 por referir para los primeros 100 usuarios, vence 31 Octubre 2026): https://viajes.demiempresa.online/viajes`;
                      if (navigator.share) {
                        navigator.share({ title: 'Rumbo a mi Destino - Bono 200%', text: shareMsg, url: 'https://viajes.demiempresa.online/viajes' }).catch(() => {});
                      } else {
                        window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:brightness-110 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Invitar Amigos y Conductores por WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : (
              activeOffers.map((offer) => (
                <div
                  key={offer.driverProfileId}
                  className="bg-slate-900 border border-emerald-500/60 ring-1 ring-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden transition-all"
                >
                  {/* Barra de progreso de TTL (30s para comparar y decidir) */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(offer.timeLeft / 30) * 100}%` }}
                    ></div>
                  </div>

                  {/* Identificación de Conductor */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Conductor en Línea</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-bold">
                      Expira en {offer.timeLeft}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {offer.photoUrl ? (
                        <img
                          src={offer.photoUrl}
                          alt={offer.driverName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold text-sm">
                          {offer.driverName ? offer.driverName.charAt(0).toUpperCase() : <User className="w-6 h-6 text-slate-400" />}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-white text-sm">{offer.driverName || 'Conductor Rumbo'}</h4>
                        <div className="text-xs text-slate-400">
                          {offer.vehicleModel || 'Vehículo Registrado'} • <span className="text-amber-300 font-bold">{offer.vehiclePlate || 'En camino'}</span>
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          {offer.distanceMeters ? `A ${offer.distanceMeters} m de recogida` : 'Cerca de ti'}
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
      {/* MODAL INVITACIÓN: BENEFICIOS EXCLUSIVOS PARA USUARIO INVITADO  */}
      {/* ============================================================== */}
      {showGuestInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 text-center animate-pop-bounce max-h-[88vh] overflow-y-auto overscroll-contain my-auto">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
              <Gift className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block">
                Invitación Exclusiva
              </span>
              <h3 className="font-black text-lg text-white">¡Viaja con Cuotas Inferiores al Mínimo!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Detectamos que no has iniciado sesión. Regístrate en 30 segundos y accede a beneficios exclusivos que los invitados no tienen:
              </p>
            </div>

            <div className="p-3 bg-slate-800/70 rounded-2xl border border-slate-700/70 text-xs space-y-2.5 text-left">
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold text-sm">🏷️</span>
                <div>
                  <span className="font-bold text-white block">Cuotas Inferiores al Mínimo</span>
                  <span className="text-[11px] text-slate-300">Desbloquea ofertas preferenciales por debajo de la cuota base normal.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold text-sm">🎁</span>
                <div>
                  <span className="font-bold text-white block">Bono de Bienvenida de $1.00</span>
                  <span className="text-[11px] text-slate-300">Descuento aplicado directamente en tu trayecto.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-blue-400 font-bold text-sm">🛡️</span>
                <div>
                  <span className="font-bold text-white block">Perfil Verificado y Seguro</span>
                  <span className="text-[11px] text-slate-300">Prioridad con conductores y resguardo en cada viaje.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold text-sm">🔋</span>
                <div>
                  <span className="font-bold text-white block">Ahorro Extremo de Batería y Datos</span>
                  <span className="text-[11px] text-slate-300">Conexión persistente de túnel ultra rápido: tu celular no se calienta y ahorras hasta 95% de megas.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-purple-400 font-bold text-sm">🔒</span>
                <div>
                  <span className="font-bold text-white block">Cero Permisos Abusivos & Honestidad Total</span>
                  <span className="text-[11px] text-slate-300">Sin acceso a fotos, contactos o micrófono. Sin algoritmos oscuros ni cobros escondidos tras bastidores.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowGuestInviteModal(false);
                  setShowRegisterModal(true);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Registrarme y Obtener Beneficios</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowGuestInviteModal(false);
                  executeSearchDrivers();
                }}
                className="w-full py-2.5 text-slate-400 hover:text-white font-bold text-xs rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Continuar como Invitado por ahora ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TRANQUILO: PERFIL DE SEGURIDAD Y BONOS (EN TRAYECTO)     */}
      {/* ============================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                {authModalTab === 'LOGIN' ? (
                  <LogIn className="w-5 h-5 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="text-lg font-bold text-white">
                  {authModalTab === 'LOGIN' ? 'Iniciar Sesión en Rumbo' : 'Perfil de Seguridad y Bonos'}
                </h3>
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

            {/* Pestañas: Crear Cuenta / Iniciar Sesión */}
            {!googleDuiStep && (
              <div className="grid grid-cols-2 p-1 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs font-bold shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab('REGISTER');
                    setLoginError('');
                  }}
                  className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    authModalTab === 'REGISTER'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Cuenta</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab('LOGIN');
                    setLoginError('');
                  }}
                  className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    authModalTab === 'LOGIN'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión</span>
                </button>
              </div>
            )}

            {/* Garantía de Privacidad y Cero Privilegios Abusivos */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-white block">Cero Privilegios Abusivos & Honestidad Total:</strong>
                No accedemos a tus fotos, contactos ni micrófono. Solo requerimos tu ubicación activa para coordinar tu viaje con choferes cercanos. Cero algoritmos oscuros tras bastidores.
              </div>
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
                  Para completar los 3 datos oficiales (<strong>Nombre</strong>, <strong>Email</strong> y <strong>Documento</strong>) y liberar de inmediato tu <strong>bono de bienvenida de $1.00 USD</strong>, confirma tu identificación:
                </div>

                <form onSubmit={handleSaveProfileAndAccept} className="space-y-3.5">
                  {/* Selector de Tipo de Documento: DUI o Extranjero */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('DUI');
                        setRegDui('');
                        setDuiError('');
                      }}
                      className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        docType === 'DUI'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🇸🇻 DUI El Salvador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('PASSPORT');
                        setRegDui('');
                        setDuiError('');
                      }}
                      className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        docType === 'PASSPORT'
                          ? 'bg-sky-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Extranjero (Pasaporte)</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {docType === 'DUI' ? 'Número de DUI (00000000-0)' : 'Pasaporte o Carné de Residencia (DGME)'}
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={regDui}
                      onChange={handleDuiChange}
                      placeholder={docType === 'DUI' ? '01234567-8' : 'ej. A12345678 o Carné DGME'}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-wider text-center"
                    />
                    {duiError && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
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

                  {/* Bloque de Cumplimiento Legal y Consentimientos */}
                  <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-amber-500 rounded bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span>
                        He leído y acepto los{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setTermsTab('ALL');
                            setShowTermsModal(true);
                          }}
                          className="text-amber-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          Términos de Referencia & Políticas
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        , reconociendo que Rumbo es intermediario tecnológico (0% comisión, libre oferta y demanda) y no responde por objetos extraviados, conductas ni sustancias ilícitas.
                      </span>
                    </label>

                    <div className="pt-1.5 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-400">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={geoConsent}
                          onChange={(e) => setGeoConsent(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        <span>📍 Autorizo geolocalización GPS en tiempo real para seguridad y cálculo de rutas.</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={micConsent}
                          onChange={(e) => setMicConsent(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        <span>🎙️ Autorizo acceso al micrófono como protocolo de seguridad y grabación preventiva en cabina.</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adsConsent}
                          onChange={(e) => setAdsConsent(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        <span>📢 Autorizo despliegue de publicidad geosegmentada y comercios aliados durante el viaje.</span>
                      </label>
                    </div>
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
            ) : authModalTab === 'LOGIN' ? (
              /* VISTA DE INICIO DE SESIÓN */
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Accede con tu cuenta de Google o ingresa con tu DUI o teléfono registrado en Rumbo.
                </p>

                {/* BOTÓN OFICIAL DE GOOGLE PARA INICIAR SESIÓN */}
                <div className="space-y-2 pt-1">
                  <div ref={googleButtonContainerRef} className="flex justify-center w-full min-h-[44px]" />

                  {!window.google?.accounts?.id && (
                    <button
                      type="button"
                      onClick={handleGoogleSignInClick}
                      className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200 group"
                    >
                      <svg className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" />
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                        <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9 shadow-none" />
                        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z" />
                      </svg>
                      <span>Iniciar Sesión con Google</span>
                    </button>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Conexión oficial protegida por Google Identity Services</span>
                  </div>
                </div>

                {/* Separador */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full"></div>
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-bold tracking-wider">o con tu documento o teléfono</span>
                  <div className="border-t border-slate-800 w-full"></div>
                </div>

                {/* Formulario de Login */}
                <form onSubmit={handleLoginPassenger} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      DUI o Teléfono Registrado
                    </label>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      placeholder="ej. 01234567-8 o 7000-0000"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-wide"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Ingresa el DUI o número de teléfono con el que te diste de alta.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(false)}
                      className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verificando...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Entrar a mi Cuenta</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Switch a registro */}
                  <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
                    ¿Aún no tienes cuenta registrada?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalTab('REGISTER');
                        setLoginError('');
                      }}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Crear cuenta y ganar $1.00
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

                {/* BOTÓN ÚNICO OFICIAL: CONTINUAR CON GOOGLE */}
                <div className="space-y-2 pt-1">
                  {/* Contenedor oficial donde Google Identity Services inyecta su botón nativo de iframe */}
                  <div ref={googleButtonContainerRef} className="flex justify-center w-full min-h-[44px]" />

                  {/* Botón de respaldo SOLO si Google Identity Services no ha cargado en el navegador */}
                  {!window.google?.accounts?.id && (
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
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Conexión oficial protegida por Google Identity Services</span>
                  </div>
                </div>

                {/* Separador */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full"></div>
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-bold tracking-wider">o ingresa tus datos</span>
                  <div className="border-t border-slate-800 w-full"></div>
                </div>

                <form onSubmit={handleSaveProfileAndAccept} className="space-y-3.5">
                  {/* Selector de Avatar Amigable y Privado (100% Opcional) */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span>👤</span>
                        <span>Elige tu avatar <span className="text-slate-400 font-normal text-[11px]">(Opcional)</span></span>
                      </span>
                      {selectedAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedAvatarUrl(null)}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                        >
                          Usar inicial
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar">
                      {PASSENGER_AVATARS.map((av) => {
                        const uri = createAvatarSvgDataUri(av.emoji, av.colors);
                        const isSelected = selectedAvatarUrl === uri;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvatarUrl(isSelected ? null : uri)}
                            title={av.label}
                            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg transition-all cursor-pointer shadow-md relative ${
                              isSelected
                                ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110 shadow-amber-500/30'
                                : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                            style={{ background: `linear-gradient(135deg, ${av.colors[0]}, ${av.colors[1]})` }}
                          >
                            <span>{av.emoji}</span>
                            {isSelected && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-black shadow">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

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

                  {/* Selector de Tipo de Documento: DUI o Extranjero */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('DUI');
                        setRegDui('');
                        setDuiError('');
                      }}
                      className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        docType === 'DUI'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🇸🇻 DUI El Salvador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('PASSPORT');
                        setRegDui('');
                        setDuiError('');
                      }}
                      className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        docType === 'PASSPORT'
                          ? 'bg-sky-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Extranjero (Pasaporte)</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      {docType === 'DUI' ? 'DUI (El Salvador: 00000000-0)' : 'Pasaporte o Carné de Residencia (DGME)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={regDui}
                      onChange={handleDuiChange}
                      placeholder={docType === 'DUI' ? '01234567-8' : 'ej. A12345678 o Carné DGME'}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-wider"
                    />
                    {duiError && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
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

                  {/* Bloque de Cumplimiento Legal y Consentimientos */}
                  <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-amber-500 rounded bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span>
                        He leído y acepto los{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setTermsTab('ALL');
                            setShowTermsModal(true);
                          }}
                          className="text-amber-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          Términos de Referencia & Políticas
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        , reconociendo la intermediación pura de Rumbo y exención de responsabilidad por objetos, conductas y sustancias prohibidas.
                      </span>
                    </label>

                    <div className="pt-1.5 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-400">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={geoConsent}
                          onChange={(e) => setGeoConsent(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        <span>📍 Autorizo geolocalización GPS en tiempo real para seguridad y asignación.</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={micConsent}
                          onChange={(e) => setMicConsent(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        <span>🎙️ Autorizo acceso al micrófono como protocolo de grabación preventiva en cabina.</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adsConsent}
                          onChange={(e) => setAdsConsent(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        <span>📢 Autorizo despliegue de publicidad geosegmentada de comercios locales.</span>
                      </label>
                    </div>
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

                  {/* Switch a inicio de sesión */}
                  <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
                    ¿Ya tienes una cuenta registrada en Rumbo?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalTab('LOGIN');
                        setLoginError('');
                      }}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Iniciar Sesión aquí
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE VINCULACIÓN CON GOOGLE CLOUD (SI CLIENT ID NO ESTÁ)   */}
      {/* ============================================================== */}
      {showGoogleConfigModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-blue-400 font-bold">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                  <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z" />
                </svg>
                <h3 className="text-base font-bold text-white">Vincular Pantalla Oficial de Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleConfigModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Para desplegar la ventana emergente oficial de Google (<strong>accounts.google.com</strong>), ingresa el <strong>Google OAuth 2.0 Client ID</strong> de tu proyecto en Google Cloud:
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                Google Client ID (termina en .apps.googleusercontent.com)
              </label>
              <input
                type="text"
                value={configClientIdInput}
                onChange={(e) => setConfigClientIdInput(e.target.value)}
                placeholder="ej. 123456789-abc.apps.googleusercontent.com"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
              />
            </div>

            <div className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-3 text-[11px] text-blue-200 space-y-1">
              <p className="font-semibold text-blue-300">¿Cómo habilitarlo en Google Cloud Console?</p>
              <p>1. Ingresa a <strong>console.cloud.google.com</strong> ➔ Credenciales.</p>
              <p>2. En "ID de cliente de OAuth 2.0" ➔ "Orígenes de JavaScript autorizados", agrega <code>https://viajes.demiempresa.online</code> y <code>https://demiempresa.online</code></p>
              <p>3. Pega el ID aquí para activar la conexión oficial de Google al instante.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGoogleConfigModal(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (configClientIdInput.trim()) {
                    const cleanId = configClientIdInput.trim();
                    setGoogleClientId(cleanId);
                    localStorage.setItem('demiempresa_google_client_id', cleanId);
                    setShowGoogleConfigModal(false);
                    setTimeout(() => handleGoogleSignInClick(), 300);
                  }
                }}
                className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-blue-600/30"
              >
                Guardar y Conectar con Google
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL REBOTÓN: CELEBRACIÓN Y SHOW DE RECIPROCIDAD DEL DÓLAR   */}
      {/* ============================================================== */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-pop-bounce relative overflow-hidden">
            {/* Resplandor decorativo */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* PASO 1: CELEBRACIÓN DE BIENVENIDA */}
            {celebrationStep === 1 && (
              <div className="space-y-4">
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

                {referredByHostName ? (
                  <button
                    type="button"
                    onClick={() => setCelebrationStep(2)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 cursor-pointer transition-transform active:scale-95 flex items-center justify-center gap-2 border border-emerald-400"
                  >
                    <span>Siguiente: Recompensar a tu amigo</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCelebrationModal(false)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 cursor-pointer transition-transform active:scale-95"
                  >
                    ¡Excelente, gracias!
                  </button>
                )}
              </div>
            )}

            {/* PASO 2: EL AVISO DE RECIPROCIDAD Y EL BOTÓN CON BILLETE VERDE */}
            {celebrationStep === 2 && (
              <div className="space-y-4">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <span className="text-4xl">🤝</span>
                  </div>
                  <span className="absolute -top-1 -right-1 text-2xl animate-bounce">🎁</span>
                  <span className="absolute -bottom-1 -left-1 text-2xl animate-pulse">💵</span>
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>¡Gesto de Amistad y Recompensa!</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                    Envíale un dólar a tu amigo
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tu amigo(a) <strong className="text-amber-300 font-bold">{referredByHostName || 'quien te invitó'}</strong> pensó en ti y te compartió su enlace para que hoy ganaras este primer dólar.
                  </p>
                  <p className="text-xs text-emerald-300 font-medium pt-1">
                    ¡Ahora te toca a ti tener ese gran gesto! Envíale su dólar de bonificación por haberte recomendado.
                  </p>
                </div>

                {/* BOTÓN CON BILLETE VERDE Y SONIDO DE DINERO */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSendDollarToFriend}
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black text-sm sm:text-base shadow-2xl shadow-emerald-500/40 cursor-pointer transition-transform transform active:scale-95 flex items-center justify-center gap-2.5 border-2 border-amber-300"
                  >
                    <span className="text-3xl animate-bounce">💵</span>
                    <span className="tracking-tight">
                      ¡Enviar $1.00 a {referredByHostName ? referredByHostName.split(' ')[0] : 'mi amigo'}!
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: CONFIRMACIÓN Y EXPECTATIVA PSICOLÓGICA */}
            {celebrationStep === 3 && (
              <div className="space-y-4">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-400 to-emerald-400 flex items-center justify-center shadow-xl shadow-amber-500/40 animate-bounce">
                    <span className="text-4xl">💰</span>
                  </div>
                  <span className="absolute -top-1 -right-2 text-2xl animate-spin">✨</span>
                  <span className="absolute -bottom-1 -left-2 text-2xl animate-pulse">💵</span>
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>¡Dólar Enviado con Éxito!</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    ¡Qué gran detalle has tenido!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Le has enviado su dólar de bonificación a <strong className="text-amber-300 font-bold">{referredByHostName || 'tu amigo'}</strong>.
                  </p>
                </div>

                {/* TARJETA DE EXPECTATIVA PSICOLÓGICA */}
                <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-3.5 text-left space-y-2 shadow-inner">
                  <div className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>¿Y a ti, cuándo te enviarán dólares?</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    ¡Cada vez que compartas tu propio enlace con amigos y familiares, <strong>serán ellos quienes te envíen dólares a ti</strong> al momento de registrarse!
                  </p>
                  <p className="text-[11px] text-slate-400">
                    🎁 Entre más personas invites, más dólares acumularás para viajar gratis o pagar mucho menos por cada carrera.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCelebrationModal(false);
                      const myCode = userProfile?.referralCode || (userProfile?.id ? `RMB${String(userProfile.id).replace(/\D/g, '').slice(-6)}` : '');
                      const { text } = getSharePayload('passenger', myCode);
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="w-full py-3.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/30 cursor-pointer transition-transform active:scale-95 flex items-center justify-center gap-2 border border-emerald-400"
                  >
                    <Share2 className="w-4 h-4 text-slate-950" />
                    <span>¡Compartir mi enlace y empezar a recibir dólares!</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCelebrationModal(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Ir a la App
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE DOPAMINA: ¡SONIDO DE DINERO POR NUEVO REFERIDO!      */}
      {/* ============================================================== */}
      {dopamineBonusModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/60 border-2 border-amber-400 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/30 text-center space-y-4 animate-pop-bounce relative overflow-hidden">
            {/* Destellos de fondo */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/25 rounded-full blur-2xl pointer-events-none" />

            {/* Ícono de bolsa de dinero / moneda rebotona */}
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-400 to-emerald-400 flex items-center justify-center shadow-xl shadow-amber-500/40 animate-bounce">
                <span className="text-4xl">💰</span>
              </div>
              <span className="absolute -top-1 -right-2 text-2xl animate-spin">✨</span>
              <span className="absolute -bottom-1 -left-2 text-2xl animate-pulse">💵</span>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>¡Recompensa de Referido Ganada!</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                ¡Has ganado $1.00 USD!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-300 font-bold text-sm block mb-0.5">{dopamineBonusModal.name}</strong>
                se acaba de registrar en Rumbo a tu Destino usando tu enlace y te ha enviado tu dólar de bonificación.
              </p>
            </div>

            {/* Tarjeta del saldo y condición de activación (7 días / viaje $4) */}
            <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 text-left space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Bono de Referencia
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  +$1.00 USD
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1 text-xs">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Vigencia de 7 Días para Activarse</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Para que este dólar se active en tu saldo disponible, tu amigo(a) <strong>{dopamineBonusModal.name}</strong> debe realizar su primer viaje de al menos <strong>$4.00 USD</strong>.
                </p>
                <div className="pt-1.5 flex items-center justify-between text-[11px] font-bold text-rose-300 border-t border-amber-500/20">
                  <span>⏳ Cuenta Regresiva:</span>
                  <span className="font-mono text-white bg-slate-900 px-2.5 py-0.5 rounded border border-rose-500/40 shadow-inner">
                    {getCountdownString(dopamineBonusModal.date)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic leading-snug">
                💡 ¡Se activará justo cuando tu referido complete su viaje! Escríbele a tu amigo para recordarle su viaje y asegurar tu dólar.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const phone = (dopamineBonusModal.phone || '').replace(/\D/g, '');
                  const greeting = `¡Hola ${dopamineBonusModal.name.split(' ')[0]}! Vi que te registraste en Rumbo a tu Destino. Recuerda que tienes $1.00 de bono esperándote para tu próximo viaje de $4 o más. ¡Aprovechémoslo! https://viajes.demiempresa.online`;
                  const waUrl = phone && phone.length >= 8
                    ? `https://wa.me/503${phone}?text=${encodeURIComponent(greeting)}`
                    : `https://wa.me/?text=${encodeURIComponent(greeting)}`;
                  window.open(waUrl, '_blank');
                }}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Saludar a {dopamineBonusModal.name.split(' ')[0]} por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setDopamineBonusModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                <span>¡Genial, gracias!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* AVISO AL REFERENTE: CONTACTO COMÚN YA REGISTRADO (SIN EXPECTATIVA) */}
      {/* ============================================================== */}
      {alreadyRegisteredNoticeModal && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/50 border-2 border-amber-400/80 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-pop-bounce relative overflow-hidden">
            {/* Destello sutil */}
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />

            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl shadow-inner">
              👥
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Aviso de Contacto Común</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Contacto ya registrado previamente
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu conocido(a) <strong className="text-amber-300 font-bold">{alreadyRegisteredNoticeModal.contact_name}</strong> abrió tu enlace de invitación, pero <strong>ya contaba con registro activo en Rumbo a tu Destino</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 text-left space-y-1.5 text-xs shadow-inner">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>ℹ️ Para no generar falsas expectativas:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Como {alreadyRegisteredNoticeModal.contact_name} ya formaba parte de nuestra comunidad, <strong>no se acreditó bono de nuevo referido</strong>. Los bonos de $1.00 aplican exclusivamente para usuarios que se registran por primera vez.
              </p>
              <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                💡 ¡Prueba compartiendo tu enlace con otros amigos o familiares que aún no conozcan Rumbo!
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (alreadyRegisteredNoticeModal.id) {
                    dismissReferralNoticeApi({ noticeId: alreadyRegisteredNoticeModal.id });
                  }
                  setAlreadyRegisteredNoticeModal(null);
                }}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/30 transition-transform active:scale-95"
              >
                ¡Entendido, muchas gracias!
              </button>

              <button
                type="button"
                onClick={() => {
                  if (alreadyRegisteredNoticeModal.id) {
                    dismissReferralNoticeApi({ noticeId: alreadyRegisteredNoticeModal.id });
                  }
                  setAlreadyRegisteredNoticeModal(null);
                  setShowReferralModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Invitar a otro amigo de mis contactos
              </button>
            </div>
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
      {/* RECUADRO MÁGICO DE REFERIDOS POR WHATSAPP (REGLA 7 DÍAS / $4)  */}
      {/* ============================================================== */}
      {showReferralModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 border-2 border-emerald-400/50 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4 animate-pop-bounce relative overflow-hidden">
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => {
                setShowReferralModal(false);
                setContactCheckStatus(null);
              }}
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

                {/* Estado de verificación en vivo del contacto */}
                {checkingContact && (
                  <div className="text-[11px] text-amber-300/80 flex items-center gap-2 px-1">
                    <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>Comprobando si este contacto ya forma parte de Rumbo...</span>
                  </div>
                )}

                {/* ALERTA: Contacto ya registrado previamente (Círculos entrelazados) */}
                {contactCheckStatus?.isRegistered && (
                  <div className="p-3.5 bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl space-y-2 animate-fade-in text-left">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Contacto ya registrado en la comunidad</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      <strong>{contactCheckStatus.fullName || refContactName || 'Este contacto'}</strong> ya cuenta con registro en Rumbo a tu Destino.
                    </p>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/25 text-[11px] text-amber-200/90 leading-snug">
                      ℹ️ <strong>Para no generar falsas expectativas:</strong> Como este contacto ya forma parte de nuestro ecosistema, los bonos de $1.00 aplican exclusivamente para <em>nuevos registros</em>. No se generará bono de referido por este contacto.
                    </div>
                  </div>
                )}

                {/* AVISO: Contacto nuevo disponible */}
                {!checkingContact && !contactCheckStatus?.isRegistered && (refContactPhone || '').replace(/\D/g, '').length >= 8 && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2 text-left">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>¡Contacto nuevo disponible! Al registrarse y realizar su viaje de $4+, se activará tu $1.00 USD.</span>
                  </div>
                )}

                {/* Mensaje oficial predeterminado */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 space-y-1.5">
                  <div className="font-semibold text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Mensaje oficial con Bonos y Logo:</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      ref={userProfile?.referralCode || (userProfile?.id ? `RMB${String(userProfile.id).replace(/\D/g, '').slice(-6)}` : 'RUMBO')}
                    </span>
                  </div>
                  <p className="italic text-[11px] text-emerald-100/90 bg-black/40 p-2.5 rounded-lg leading-relaxed">
                    🚖 <strong>RUMBO A MI DESTINO</strong>: Paga menos por carrera con tus Bonos de Referencia ($1.00 USD por cada amigo invitado). Tu contacto se registrará con tu enlace personalizado y ambos recibirán bonos inmediatos.
                  </p>
                </div>

                {/* Botón condicional: Saludar contacto existente vs Enviar invitación a nuevo usuario */}
                {contactCheckStatus?.isRegistered ? (
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPhone = (refContactPhone || '').replace(/\D/g, '');
                      const greeting = `¡Hola ${contactCheckStatus.fullName ? contactCheckStatus.fullName.split(' ')[0] : (refContactName || '')}! Vi que ya eres parte de la comunidad Rumbo a tu Destino. ¡Qué genial encontrarte por acá! Compartamos viajes: https://viajes.demiempresa.online`;
                      const waUrl = cleanPhone && cleanPhone.length >= 8
                        ? `https://wa.me/503${cleanPhone}?text=${encodeURIComponent(greeting)}`
                        : `https://wa.me/?text=${encodeURIComponent(greeting)}`;
                      window.open(waUrl, '_blank');
                      setShowReferralModal(false);
                      setContactCheckStatus(null);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Saludar por WhatsApp (Contacto existente - Sin bono)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendWhatsAppReferral}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Enviar por WhatsApp</span>
                  </button>
                )}
              </div>
            ) : (
              /* Recuadro de confirmación y acreditación */
              <div className="bg-slate-950/80 border border-emerald-400/50 rounded-2xl p-5 text-center space-y-3 animate-pop-bounce">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>

                <div className="space-y-1">
                  <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                    🚀 Invitación Enviada con Éxito
                  </div>
                  <p className="text-xs text-slate-200 font-medium">
                    ¡Enlace oficial enviado a {refContactName || 'tu contacto'}!
                  </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 text-left space-y-1.5 text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Activación del Bono de $1.00 USD:</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Tiene una <strong>vigencia de 7 días</strong>. Se activará automáticamente y se abonará a tu saldo disponible cuando tu referido complete su registro y realice un viaje de al menos <strong>$4.00 USD</strong>.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReferralBonusAwarded(false);
                      setRefContactName('');
                      setRefContactPhone('');
                      setContactCheckStatus(null);
                    }}
                    className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Invitar a otro amigo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReferralModal(false);
                      setContactCheckStatus(null);
                    }}
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
      {/* MODAL MI CUENTA, CRÉDITOS POR BONOS Y VENCIMIENTO DE CADA DÓLAR*/}
      {/* ============================================================== */}
      {showBonusesAccountModal && userProfile && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 animate-pop-bounce relative max-h-[88vh] overflow-y-auto overscroll-contain my-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  {userProfile.photoUrl ? (
                    <img
                      src={userProfile.photoUrl}
                      alt={userProfile.fullName || 'Usuario'}
                      onClick={() => setShowAccountAvatarPicker(!showAccountAvatarPicker)}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md cursor-pointer hover:opacity-90"
                    />
                  ) : (
                    <div
                      onClick={() => setShowAccountAvatarPicker(!showAccountAvatarPicker)}
                      className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-md cursor-pointer hover:opacity-90"
                    >
                      {userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'G'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAccountAvatarPicker(!showAccountAvatarPicker)}
                    title="Cambiar avatar"
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 border border-slate-700 text-amber-400 rounded-full flex items-center justify-center text-[10px] cursor-pointer hover:bg-slate-700 shadow"
                  >
                    ✏️
                  </button>
                </div>
                <div>
                  <div className="font-bold text-white text-base flex items-center gap-1.5">
                    <span>{userProfile.fullName || 'Pasajero Rumbo'}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                      Google
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {userProfile.email || 'Cuenta conectada'}
                  </div>
                  {userProfile.dui && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>DUI: {userProfile.dui.replace(/^(\d{4})\d{4}(-\d)$/, '$1****$2')}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBonusesAccountModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selector desplegable de avatar en Mi Cuenta */}
            {showAccountAvatarPicker && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Elige tu avatar de pasajero:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectUserProfileAvatar(null);
                      setShowAccountAvatarPicker(false);
                    }}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Restaurar inicial
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar">
                  {PASSENGER_AVATARS.map((av) => {
                    const uri = createAvatarSvgDataUri(av.emoji, av.colors);
                    const isSelected = userProfile.photoUrl === uri;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          handleSelectUserProfileAvatar(uri);
                          setShowAccountAvatarPicker(false);
                        }}
                        title={av.label}
                        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg transition-all cursor-pointer shadow-md relative ${
                          isSelected
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110 shadow-amber-500/30'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ background: `linear-gradient(135deg, ${av.colors[0]}, ${av.colors[1]})` }}
                      >
                        <span>{av.emoji}</span>
                        {isSelected && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-black shadow">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Saldo de Crédito Total */}
            <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-2 border-amber-400/40 rounded-2xl p-4 text-center space-y-1 shadow-inner relative overflow-hidden">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                Crédito Total en Bonos para Viajar
              </span>
              <div className="text-4xl font-black text-amber-400 font-mono tracking-tight drop-shadow-sm">
                ${userProfile.bonusAmount || '1.00'} <span className="text-lg font-bold text-amber-200">USD</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Se aplicará automáticamente como descuento en tu próximo viaje
              </p>
            </div>

            {/* Vencimiento de cada Dólar (Lista de Bonos) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vencimiento de cada Dólar (Vigencia 7 días)</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {(userProfile.bonuses?.length || 1)} {userProfile.bonuses?.length === 1 ? 'bono' : 'bonos'}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(userProfile.bonuses && userProfile.bonuses.length > 0
                  ? userProfile.bonuses
                  : [
                      {
                        id: 'bonus-default-welcome',
                        title: 'Bono de Bienvenida',
                        amount: '1.00',
                        expiresAt: userProfile.bonusExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        description: 'Acreditado por registro oficial con Google y DUI'
                      }
                    ]
                ).map((b, idx) => {
                  const daysLeft = getDaysRemaining(b.expiresAt);
                  const formattedExp = formatBonusDate(b.expiresAt);
                  return (
                    <div
                      key={b.id || idx}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{b.title || 'Bono de Viaje'}</span>
                          <span className="text-[10px] font-black text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            +${b.amount || '1.00'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.condition || b.description || 'Válido para descuento en viaje'}
                        </div>
                        {formattedExp && (
                          <div className="text-[10px] text-slate-500">
                            Vence el: {formattedExp}
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${
                            daysLeft <= 2
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{daysLeft === 0 ? 'Vence hoy' : `${daysLeft}d restantes`}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN DESTACADA: REFIERE MÁS CLIENTES PARA INCREMENTAR CRÉDITO */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>¿Quieres que tu crédito siga incrementando?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Refiere a más amigos y familiares. Obtienes <strong className="text-amber-300">+$1.00 USD adicional</strong> por cada persona referida a la plataforma.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowBonusesAccountModal(false);
                  setReferralBonusAwarded(false);
                  setShowReferralModal(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Referir más clientes (+ $1.00 por amigo)</span>
              </button>
            </div>

            {/* Footer con Cerrar Sesión */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-800 text-xs">
              {(appState === 'IN_TRIP_HUB' && assignedTrip) || (appState === 'AUCTION' && tripId) ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Viaje en curso: Cierre protegido</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLogoutPassenger}
                  className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowBonusesAccountModal(false)}
                className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl cursor-pointer text-xs"
              >
                Listo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FASE 2: HUB COMERCIAL POST-ACEPTACIÓN (En Espera y Trayecto)   */}
      {/* ============================================================== */}
      {appState === 'IN_TRIP_HUB' && !assignedTrip && (
        <main className="flex-1 max-w-lg mx-auto w-full p-6 space-y-4 animate-fade-in flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-400">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <h4 className="text-base font-bold text-white mt-2">Conectando detalles de tu viaje...</h4>
          <p className="text-xs text-slate-400 max-w-xs">Estamos sincronizando la información del vehículo y conductor asignado.</p>
        </main>
      )}

      {appState === 'IN_TRIP_HUB' && assignedTrip && (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4 animate-fade-in flex flex-col">
          
          {/* BARRA SUPERIOR DE CONTROL OPERATIVO */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            
            {/* Estado del Conductor & ETA */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {tripStatus === 'DRIVER_EN_ROUTE' && (
                    <>
                      Conductor en camino • {driverDistanceKm ? `A ${driverDistanceKm} km • ` : ''}ETA: ~{driverEtaMinutes} min
                    </>
                  )}
                  {tripStatus === 'DRIVER_ARRIVED' && '¡El conductor ha llegado al punto de recogida!'}
                  {tripStatus === 'IN_TRANSIT' && (
                    <>
                      En trayecto al destino • {driverDistanceKm ? `A ${driverDistanceKm} km • ` : ''}ETA: ~{driverEtaMinutes} min
                    </>
                  )}
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
                  {assignedTrip.driver?.vehiclePlate || 'EN CAMINO'}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {assignedTrip.driver?.vehicleModel ? `${assignedTrip.driver.vehicleModel}${assignedTrip.driver?.vehicleColor ? ` • ${assignedTrip.driver.vehicleColor}` : ''}` : 'Vehículo Asignado'}
                </div>
              </div>

              <div className="text-right">
                {assignedTrip.driver?.photo ? (
                  <img
                    src={assignedTrip.driver.photo}
                    alt={assignedTrip.driver?.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500 shadow-md ml-auto"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-amber-500 shadow-md ml-auto flex items-center justify-center text-amber-400 font-bold text-lg">
                    {assignedTrip.driver?.name ? assignedTrip.driver.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
                <div className="text-xs font-bold text-white mt-1">
                  {assignedTrip.driver?.name || 'Conductor Rumbo'}
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
                  {assignedTrip.cashBill === 'EXACT'
                    ? 'Efectivo exacto'
                    : (!isNaN(parseFloat(assignedTrip.cashBill)) && parseFloat(assignedTrip.cashBill) > 0)
                      ? `Billete de $${parseFloat(assignedTrip.cashBill).toFixed(2)}`
                      : 'Efectivo'}
                </strong>
              </div>
              <div className="text-right">
                {assignedTrip.cashBill !== 'EXACT' && !isNaN(parseFloat(assignedTrip.changeNeeded)) && parseFloat(assignedTrip.changeNeeded) >= 0 ? (
                  <>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">👉 Chofer te entregará:</span>
                    <strong className="text-amber-300 font-black text-sm">${parseFloat(assignedTrip.changeNeeded).toFixed(2)} de vuelto</strong>
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

            {/* Aviso de solicitud de cancelación por mutuo acuerdo */}
            {cancelNoticeMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center font-medium animate-fade-in">
                {cancelNoticeMsg}
              </div>
            )}

            {/* Protocolo de Mutuo Acuerdo y Botón de Rescate de Viaje Huérfano */}
            {tripStatus !== 'COMPLETED' && (
              <div className="pt-2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMutualCancelModal(true)}
                  className="text-[11px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer"
                >
                  ¿Inconveniente? Solicitar Cancelación por Mutuo Acuerdo
                </button>
                <button
                  type="button"
                  onClick={handleForceResetStuckTrip}
                  className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30 shadow-sm mt-0.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>¿Viaje congelado o chofer no responde? Salir y restablecer pantalla</span>
                </button>
              </div>
            )}

            {/* Acción de finalización para el pasajero */}
            {tripStatus === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('rumbo_passenger_active_session');
                  setAppState('DECOY_FORM');
                  setTripId(null);
                  setAssignedTrip(null);
                  setTripStatus('DRIVER_EN_ROUTE');
                }}
                className="w-full mt-3 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>¡Viaje Finalizado! Iniciar Nuevo Viaje</span>
              </button>
            )}
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

            {adFeed && adFeed.length > 0 ? (
              adFeed.map((ad, idx) => (
                <div key={ad.id || idx} className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 border border-amber-500/30 p-4 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      Patrocinado en {destinationMunicipality}
                    </span>
                  </div>
                  <h4 className="font-black text-lg text-white leading-tight">
                    {ad.businessName || ad.title}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {ad.description || ad.copy}
                  </p>
                  {ad.whatsapp && (
                    <a
                      href={`https://wa.me/503${ad.whatsapp.replace(/\D/g, '')}?text=Hola,%20vi%20su%20anuncio%20en%20Rumbo.`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs items-center gap-1.5 shadow"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Contactar por WhatsApp</span>
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-lg space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-base text-white">
                    Espacio Publicitario para Negocios en {destinationMunicipality}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Promociona tu comercio ante pasajeros que se trasladan en este momento. Máxima visibilidad y contacto directo por WhatsApp.
                  </p>
                </div>
                <button
                  onClick={() => setShowAdModal(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Anunciar mi Negocio Aquí</span>
                </button>
              </div>
            )}

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
              OFFICIAL_GOV_PRICES.regular,
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
            OFFICIAL_GOV_PRICES.regular,
            delayMin,
            { ...tripPreferences, transportType }
          );
          setProposedFare(fareData.suggestedFare);

          // Confirmación por audio requerida al ubicar el pin en el mapa
          const acClause = tripPreferences.airConditioning
            ? 'con aire acondicionado incluido'
            : 'calculada sin aire acondicionado';
          const speechMsg = `Pin colocado en ${address}, a ${distKm} kilómetros de distancia y ${durMin} minutos de llegada. La tarifa mínima estimada es de ${fareData.suggestedFare} dólares, ${acClause}.`;
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
        serviceType={serviceType}
        onRequireSuggestedFare={handleEnableAcWithSuggestedFare}
        onChange={(newPrefs) => {
          if (newPrefs.airConditioning !== tripPreferences.airConditioning) {
            handleToggleAirConditioning();
          } else if (newPrefs.isRoundTrip !== tripPreferences.isRoundTrip) {
            handleToggleRoundTrip(newPrefs.isRoundTrip);
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

      {/* Modal de Buzón Oficial / Inbox de Pasajero (Multitema: Sugerencias, Quejas, Soporte, Pagos) */}
      <RumboInboxModal
        isOpen={showInboxModal}
        onClose={() => setShowInboxModal(false)}
        role="PASSENGER"
        userProfile={userProfile}
      />

      {/* Modal de Regla de Dispositivo Único Implacable para Pasajeros */}
      {showPassengerRevokedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4 my-auto text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 inline-block uppercase">
                Regla de Dispositivo Único
              </span>
              <h3 className="text-base font-black text-white">
                Sesión Cerrada en este Celular
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu cuenta de pasajero ha sido iniciada en otro dispositivo móvil.
              </p>
              <p className="text-[11px] text-amber-400 font-medium">
                Por seguridad de tu cuenta y protección de tus créditos, Rumbo solo permite <strong>1 dispositivo activo a la vez</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPassengerRevokedModal(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition-transform active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Oficial de Términos de Referencia, Exenciones y Políticas de Privacidad */}
      {showMutualCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Cancelar por Mutuo Acuerdo</h3>
              <p className="text-xs text-slate-400">
                Una vez asignada la carrera no puede cancelarse de forma unilateral. El conductor debe aprobar la solicitud.
              </p>
            </div>

            {waitingCancelPeerResponse ? (
              <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl text-center space-y-3">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-xs font-bold text-amber-300">Solicitud enviada al conductor</div>
                <p className="text-[11px] text-slate-400">Esperando que el conductor acepte o rechace desde su teléfono...</p>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <p className="text-[10px] text-slate-400">¿El conductor no responde o no está disponible?</p>
                  <button
                    type="button"
                    onClick={handleForceResetStuckTrip}
                    className="w-full py-2 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Forzar cancelación de viaje inactivo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMutualCancelModal(false);
                      setWaitingCancelPeerResponse(false);
                    }}
                    className="w-full py-1.5 text-slate-400 hover:text-white text-[11px] cursor-pointer"
                  >
                    Volver a la carrera
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Motivo de la solicitud:</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Emergencia personal de fuerza mayor">Emergencia personal de fuerza mayor</option>
                    <option value="Inconveniente con la ruta o tiempo">Inconveniente con la ruta o tiempo</option>
                    <option value="Acuerdo directo presencial con el chofer">Acuerdo directo presencial con el chofer</option>
                    <option value="Error involuntario de destino">Error involuntario de destino</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMutualCancelModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Volver a la Carrera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tripId) {
                        socket.emit('trip:request_mutual_cancel', {
                          tripId,
                          requestedBy: 'PASSENGER',
                          reason: cancelReason
                        });
                        setWaitingCancelPeerResponse(true);
                      }
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow cursor-pointer"
                  >
                    Enviar Solicitud
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Solicitud de Cancelación Entrante desde el Conductor */}
      {incomingPeerCancelRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 inline-block uppercase">
                Solicitud de Cancelación
              </span>
              <h3 className="text-base font-black text-white">El Conductor Solicita Cancelar</h3>
              <p className="text-xs text-slate-300">
                Motivo: <strong className="text-rose-300">{incomingPeerCancelRequest.reason || 'Fuerza mayor'}</strong>
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                ¿Aceptas cancelar esta carrera de mutuo acuerdo? Si no aceptas, el viaje continúa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  socket.emit('trip:respond_mutual_cancel', {
                    tripId: incomingPeerCancelRequest.tripId || tripId,
                    accepted: false,
                    respondedBy: 'PASSENGER'
                  });
                  setIncomingPeerCancelRequest(null);
                }}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Rechazar (Continuar)
              </button>
              <button
                type="button"
                onClick={() => {
                  socket.emit('trip:respond_mutual_cancel', {
                    tripId: incomingPeerCancelRequest.tripId || tripId,
                    accepted: true,
                    respondedBy: 'PASSENGER'
                  });
                  setIncomingPeerCancelRequest(null);
                }}
                className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow cursor-pointer"
              >
                Aceptar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Oficial de Términos de Referencia, Exenciones y Políticas de Privacidad */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        initialTab={termsTab}
      />

      {/* Modal de Rescate Anti-Abandono: $50 en Viajes y Referidos */}
      <ExitIntentRescueModal
        role="PASSENGER"
        userProfile={userProfile}
        onOpenRegister={() => setShowWelcomeModal(true)}
        onOpenReferral={() => setShowReferralModal(true)}
      />

      {/* Modal Requisito de Usuario Verificado para Colectivo Compartido */}
      {showSharedRegisterPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 text-center animate-pop-bounce max-h-[88vh] overflow-y-auto overscroll-contain my-auto">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block">
                Seguridad Colectivo Rumbo
              </span>
              <h3 className="font-black text-lg text-white">Requisito de Usuario Verificado</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Para viajar en <strong>Colectivo Compartido</strong> se requiere usuario verificado con DUI y teléfono por seguridad y tranquilidad de todos los pasajeros a bordo.
              </p>
            </div>

            <div className="p-3 bg-slate-800/70 rounded-2xl border border-slate-700/70 text-xs text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span>✓</span>
                <span>Descuento directo del 30% en cada colectivo</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span>🎁</span>
                <span>Bono de bienvenida de $1.00 USD adicional</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span>🛡️</span>
                <span>Comunidad segura con identidad validada</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSharedRegisterPrompt(false);
                  setAuthModalTab('REGISTER');
                  setShowRegisterModal(true);
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Registrarme con Google y DUI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSharedRegisterPrompt(false);
                  setAuthModalTab('LOGIN');
                  setShowRegisterModal(true);
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ya tengo cuenta • Iniciar Sesión</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSharedRegisterPrompt(false);
                  setRideMode('PRIVATE');
                }}
                className="w-full py-2.5 text-slate-400 hover:text-white font-bold text-xs rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Continuar en Viaje Privado ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calificación de Viaje (Fase 6: Finalizado) */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4 text-center animate-pop-bounce">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
              <Star className="w-8 h-8 fill-amber-400" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-lg text-white">¡Has llegado a tu destino!</h3>
              <p className="text-xs text-slate-300">
                ¿Cómo estuvo tu experiencia con {assignedTrip?.driver?.name || 'tu conductor'}?
              </p>
            </div>

            {/* 5 Estrellas */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setTripRating(star)}
                  className="p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= tripRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Propina voluntaria */}
            <div className="space-y-1.5 pt-1 text-left">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Propina voluntaria para el conductor:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { val: 0, label: '$0.00' },
                  { val: 0.50, label: '+$0.50' },
                  { val: 1.00, label: '+$1.00' }
                ].map((tip) => (
                  <button
                    key={tip.val}
                    type="button"
                    onClick={() => setDriverTip(tip.val)}
                    className={`py-2 rounded-xl text-center font-bold font-mono transition-all cursor-pointer border ${
                      driverTip === tip.val
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-black'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {tip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRatingModal(false);
                  localStorage.removeItem('rumbo_passenger_active_session');
                  setAppState('DECOY_FORM');
                  setRideMode('UNDECIDED');
                  setTripId(null);
                  setAssignedTrip(null);
                  setTripStatus('DRIVER_EN_ROUTE');
                  triggerCashRewardFeedback();
                  speakAssistantMessage('¡Gracias por calificar tu viaje con Rumbo!');
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <span>Finalizar y Enviar Calificación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
