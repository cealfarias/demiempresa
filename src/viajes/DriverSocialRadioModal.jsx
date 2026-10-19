import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  AlertTriangle,
  Zap,
  Wrench,
  LifeBuoy,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  PlusCircle,
  X,
  RotateCw,
  Car,
  ThumbsUp,
  Volume2,
  VolumeX,
  Lock,
  Users,
  Send,
  Search,
  UserPlus
} from 'lucide-react';
import {
  fetchDriverSocialPostsApi,
  createDriverSocialPostApi,
  confirmDriverSocialAlertApi,
  fetchDriverBuddiesApi,
  addDriverBuddyApi,
  searchDriverBuddiesApi,
  fetchDriverPrivateMessagesApi,
  sendDriverPrivateMessageApi
} from './api';
import { speakAssistantMessage, stopSpeaking } from './voiceAssistantService';

const DRIVER_CATEGORIES = [
  { id: 'ALL', name: '📻 Todo el Radio', icon: Radio },
  { id: 'ALERTA_VIAL', name: '🚨 Retenes & Tráfico', icon: AlertTriangle },
  { id: 'ALTA_DEMANDA', name: '⚡ Puntos con Carreras', icon: Zap },
  { id: 'AUXILIO_SOS', name: '🆘 Auxilio SOS', icon: LifeBuoy },
  { id: 'TALLER_LLANTERIA', name: '🔧 Talleres & Llanterías', icon: Wrench }
];

const MUNICIPALITIES = [
  'ALL',
  'San Salvador',
  'Santa Tecla',
  'Antiguo Cuscatlán',
  'Soyapango',
  'Mejicanos',
  'Apopa',
  'Ilopango',
  'Ciudad Delgado',
  'Panchimalco',
  'La Libertad'
];

// Respuestas Rápidas de Un Toque para Choferes al Volante
const QUICK_DRIVER_RESPONSES = [
  '👍 Copiado colega',
  '🚗 Voy en carrera ahorita',
  '⏳ Llego en 5 minutos',
  '📍 ¿Por dónde andas?',
  '✅ Todo despejado por acá',
  '⛽ Voy cargando gasolina'
];

export default function DriverSocialRadioModal({
  isOpen,
  onClose,
  driverProfile = null,
  driverCoords = null,
  activeDestinationMunicipality = null
}) {
  const [activeMainTab, setActiveMainTab] = useState('PUBLIC_RADIO'); // 'PUBLIC_RADIO' | 'PRIVATE_FREQUENCY'
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedMunicipality, setSelectedMunicipality] = useState('ALL');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(5); // 3 | 5 | 10 | 999 (Sin límite)
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modo Manos Libres / Voz al Volante
  const [handsFreeVoice, setHandsFreeVoice] = useState(true);
  const [speakingPostId, setSpeakingPostId] = useState(null);

  // Frecuencia Privada & Colegas
  const [buddies, setBuddies] = useState([]);
  const [loadingBuddies, setLoadingBuddies] = useState(false);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showAddBuddyModal, setShowAddBuddyModal] = useState(false);
  const [buddySearchQuery, setBuddySearchQuery] = useState('');
  const [buddySearchResults, setBuddySearchResults] = useState([]);
  const [searchingBuddies, setSearchingBuddies] = useState(false);

  // Formulario de Reporte Público
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('ALERTA_VIAL');
  const [reportSubType, setReportSubType] = useState('RETEN');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportMunicipality, setReportMunicipality] = useState('San Salvador');
  const [reportUrgency, setReportUrgency] = useState('NORMAL');
  const [submitting, setSubmitting] = useState(false);

  const messagesEndRef = useRef(null);

  const effDriverId = driverProfile?.id || localStorage.getItem('rumbo_driver_profile_id') || null;
  const driverName = driverProfile?.fullName || 'Colega Rumbo';
  const vehicleInfo = driverProfile?.vehiclePlate ? `${driverProfile.vehicleModel || 'Vehículo'} (${driverProfile.vehiclePlate})` : null;

  // Cargar alertas del radio público con radar geolocalizado
  useEffect(() => {
    if (!isOpen || activeMainTab !== 'PUBLIC_RADIO') return;
    loadDriverPosts();
  }, [isOpen, activeMainTab, activeCategory, selectedMunicipality, selectedRadiusKm, driverCoords?.lat, driverCoords?.lng, activeDestinationMunicipality]);

  // Cargar frecuencia privada y colegas
  useEffect(() => {
    if (!isOpen || activeMainTab !== 'PRIVATE_FREQUENCY' || !effDriverId) return;
    loadPrivateFrequency();
  }, [isOpen, activeMainTab, effDriverId]);

  const loadDriverPosts = async () => {
    setLoading(true);
    try {
      const res = await fetchDriverSocialPostsApi({
        category: activeCategory,
        municipality: selectedMunicipality,
        driverId: effDriverId,
        driverLat: driverCoords?.lat || null,
        driverLng: driverCoords?.lng || null,
        radiusKm: selectedRadiusKm,
        destinationMunicipality: activeDestinationMunicipality || null
      });
      if (res.success && res.posts?.length > 0) {
        setPosts(res.posts);
      } else {
        setPosts([
          {
            id: 'mock-d1',
            category: 'ALERTA_VIAL',
            sub_type: 'RETEN',
            urgency: 'HIGH',
            title: 'Control vehicular y revisión en Bulevar Romero',
            description: 'Paso a desnivel hacia Santa Tecla. Revisión de documentos y extintor. Tráfico lento pero avanzando.',
            location_name: 'Bulevar Monseñor Romero, sentido occidente',
            municipality: 'Santa Tecla',
            driver_name: 'Don Manuel (Chofer #12)',
            vehicle_info: 'Nissan Versa (P-782190)',
            confirmations_count: 6,
            driver_has_confirmed: false,
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-d2',
            category: 'ALTA_DEMANDA',
            sub_type: 'DEMANDA',
            urgency: 'NORMAL',
            title: 'Alta demanda de pasajeros en salida de centro comercial',
            description: 'Salida peatonal con bastante gente solicitando carreras en efectivo hacia Soyapango e Ilopango.',
            location_name: 'Plaza Mundo Soyapango, salida peatonal',
            municipality: 'Soyapango',
            driver_name: 'Roberto Gómez',
            vehicle_info: 'Toyota Corolla (P-443912)',
            confirmations_count: 9,
            driver_has_confirmed: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-d3',
            category: 'AUXILIO_SOS',
            sub_type: 'BATERIA_SOS',
            urgency: 'CRITICAL_SOS',
            title: 'Batería muerta, ¿alguien cerca con cables?',
            description: 'Me quedé sin carga al esperar pasajero frente a gasolinera. Traigo cables propios, solo necesito corriente.',
            location_name: 'Frente a Texaco Los Héroes',
            municipality: 'San Salvador',
            driver_name: 'Marvin Lemus',
            driver_phone: '50378901234',
            vehicle_info: 'Hyundai Elantra (P-902341)',
            confirmations_count: 2,
            driver_has_confirmed: false,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (e) {
      console.warn('Error cargando alertas de conductores:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPrivateFrequency = async () => {
    setLoadingBuddies(true);
    try {
      const [buddiesRes, messagesRes] = await Promise.all([
        fetchDriverBuddiesApi(effDriverId),
        fetchDriverPrivateMessagesApi(effDriverId)
      ]);

      if (buddiesRes.success) setBuddies(buddiesRes.buddies || []);
      if (messagesRes.success && messagesRes.messages?.length > 0) {
        setPrivateMessages(messagesRes.messages);
      } else {
        // Semillas demostrativas para canal privado
        setPrivateMessages([
          {
            id: 'm1',
            sender_driver_id: 'col-1',
            sender_name: 'Don Manuel',
            sender_vehicle: 'Nissan Versa (P-782190)',
            message_text: '¿Qué tal la jornada hoy colegas? Por la Escalón está tranquilo el tráfico.',
            created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          },
          {
            id: 'm2',
            sender_driver_id: effDriverId,
            sender_name: driverName,
            sender_vehicle: vehicleInfo,
            message_text: 'Copiado don Manuel, saliendo de Santa Tecla con carrera de $4.50 en efectivo.',
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
          }
        ]);
      }
    } catch (err) {
      console.warn('Error cargando frecuencia privada:', err);
    } finally {
      setLoadingBuddies(false);
    }
  };

  // NARRACIÓN POR VOZ MANOS LIBRES CON PROXIMIDAD Y CORREDOR
  const playAlertVoice = (post) => {
    stopSpeaking();
    setSpeakingPostId(post.id);

    let prefix = 'Atención colegas.';
    if (post.category === 'AUXILIO_SOS') prefix = 'ALERTA DE AUXILIO SOLIDARIO.';
    else if (post.category === 'ALTA_DEMANDA' || post.category === 'ZONA_CALIENTE') prefix = 'Punto de alta demanda de pasajeros con carreras en efectivo.';
    else if (post.sub_type === 'RETEN') prefix = 'Aviso de control vial.';

    let distanceNotice = '';
    if (post.is_in_route_corridor) {
      distanceNotice = `En tu ruta hacia ${post.municipality}.`;
    } else if (post.distance_km !== null && post.distance_km !== undefined) {
      distanceNotice = `A ${post.distance_km} kilómetros de tu posición.`;
    }

    const textToSpeak = `${prefix} ${distanceNotice} ${post.title}. En ${post.location_name}, ${post.municipality}. ${post.description}. Reportado por ${post.driver_name}.`;

    speakAssistantMessage(textToSpeak, () => {
      setSpeakingPostId(null);
    });
  };

  const playMessageVoice = (msg) => {
    stopSpeaking();
    const textToSpeak = `Mensaje de ${msg.sender_name}: ${msg.message_text}`;
    speakAssistantMessage(textToSpeak);
  };

  // Confirmar alerta ("A mí también me consta")
  const handleConfirmAlert = async (postId) => {
    if (!effDriverId) return;
    try {
      const res = await confirmDriverSocialAlertApi(postId, effDriverId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                driver_has_confirmed: true,
                confirmations_count: res.confirmationsCount || (p.confirmations_count + 1)
              };
            }
            return p;
          })
        );
        if (handsFreeVoice) {
          speakAssistantMessage('Confirmación registrada. Gracias colega por mantener informado al grupo.');
        }
      }
    } catch (e) {
      console.warn('Error confirmando alerta:', e);
    }
  };

  // Enviar reporte público con GPS
  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportLocation.trim()) return;

    setSubmitting(true);
    try {
      const res = await createDriverSocialPostApi({
        driverId: effDriverId,
        driverName,
        vehicleInfo,
        category: reportCategory,
        subType: reportSubType,
        title: reportTitle.trim(),
        description: reportDescription.trim(),
        locationName: reportLocation.trim(),
        municipality: reportMunicipality,
        locationLat: driverCoords?.lat || null,
        locationLng: driverCoords?.lng || null,
        urgency: reportUrgency,
        driverPhone: driverProfile?.phone || null
      });

      if (res.success) {
        setShowCreateModal(false);
        setReportTitle('');
        setReportDescription('');
        setReportLocation('');
        loadDriverPosts();
        if (handsFreeVoice) {
          speakAssistantMessage('Tu alerta fue transmitida exitosamente con tu ubicación a los colegas de Rumbo.');
        }
      }
    } catch (err) {
      console.error('Error enviando reporte:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar mensaje en canal privado
  const handleSendPrivateMessage = async (textToSend) => {
    const text = (textToSend || newMessageText).trim();
    if (!text || !effDriverId) return;

    setSendingMessage(true);
    try {
      const res = await sendDriverPrivateMessageApi({
        senderDriverId: effDriverId,
        recipientDriverId: null,
        senderName: driverName,
        senderVehicle: vehicleInfo,
        messageText: text
      });

      const newMsgObj = res.success && res.message ? res.message : {
        id: `local-${Date.now()}`,
        sender_driver_id: effDriverId,
        sender_name: driverName,
        sender_vehicle: vehicleInfo,
        message_text: text,
        created_at: new Date().toISOString()
      };

      setPrivateMessages((prev) => [...prev, newMsgObj]);
      setNewMessageText('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Error enviando mensaje privado:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Buscar colegas para agregar
  const handleSearchBuddies = async (e) => {
    e.preventDefault();
    if (!buddySearchQuery.trim()) return;
    setSearchingBuddies(true);
    try {
      const res = await searchDriverBuddiesApi(buddySearchQuery.trim(), effDriverId);
      if (res.success) setBuddySearchResults(res.drivers || []);
    } catch (err) {
      console.warn('Error buscando chofer:', err);
    } finally {
      setSearchingBuddies(false);
    }
  };

  // Agregar colega
  const handleAddBuddy = async (buddyDriverId) => {
    try {
      const res = await addDriverBuddyApi(effDriverId, buddyDriverId);
      if (res.success) {
        setShowAddBuddyModal(false);
        setBuddySearchQuery('');
        setBuddySearchResults([]);
        loadPrivateFrequency();
        if (handsFreeVoice) {
          speakAssistantMessage('Colega agregado a tu frecuencia privada.');
        }
      }
    } catch (err) {
      console.warn('Error agregando colega:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fade-in overflow-hidden">
      {/* 1. HEADER: Radio de Ruta con Control de Voz Manos Libres */}
      <header className="w-full bg-slate-900/95 border-b border-amber-500/30 px-3 sm:px-6 py-2.5 backdrop-blur-md shadow-xl flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                Radio de Ruta • La Hermandad del Volante
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium truncate max-w-[190px] sm:max-w-md">
              {activeMainTab === 'PUBLIC_RADIO' ? 'Alertas viales, retenes y auxilio solidario' : 'Frecuencia Privada entre Amigos de Ruta'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Manos Libres de Voz */}
          <button
            type="button"
            onClick={() => {
              const next = !handsFreeVoice;
              setHandsFreeVoice(next);
              if (next) speakAssistantMessage('Modo manos libres activado. Las alertas se narrarán en voz alta.');
              else stopSpeaking();
            }}
            title={handsFreeVoice ? 'Voz activada: Las alertas se leen solas' : 'Voz desactivada'}
            className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              handsFreeVoice
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {handsFreeVoice ? <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{handsFreeVoice ? 'Voz Activa' : 'Voz Silenciada'}</span>
          </button>

          {activeMainTab === 'PUBLIC_RADIO' ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="py-1.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:bg-amber-300 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Lanzar Alerta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddBuddyModal(true)}
              className="py-1.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:bg-amber-300 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar Colega</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Cerrar Radio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. SELECTOR DE MODALIDAD: RADIO PÚBLICO VS FRECUENCIA PRIVADA */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveMainTab('PUBLIC_RADIO')}
          className={`flex-1 max-w-xs py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'PUBLIC_RADIO'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Radio de Ruta (Público)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('PRIVATE_FREQUENCY')}
          className={`flex-1 max-w-xs py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'PRIVATE_FREQUENCY'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Frecuencia Privada ({buddies.length} Colegas)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: RADIO PÚBLICO (Alertas, Retenes, Puntos con Carreras)  */}
      {/* ============================================================== */}
      {activeMainTab === 'PUBLIC_RADIO' && (
        <>
          {/* Barra de Filtros y Municipio */}
          <nav className="w-full bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5">
              {DRIVER_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 shrink-0"
            >
              <option value="ALL">📍 Todo El Salvador</option>
              {MUNICIPALITIES.filter((m) => m !== 'ALL').map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </nav>

          {/* BARRA DE RADAR Y CORREDOR DE RUTA */}
          <div className="w-full bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-amber-400">📡 Alcance:</span>
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                {[
                  { r: 3, label: '3 km' },
                  { r: 5, label: '5 km (Urbano)' },
                  { r: 10, label: '10 km' },
                  { r: 999, label: 'Sin límite' }
                ].map((item) => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => setSelectedRadiusKm(item.r)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedRadiusKm === item.r
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {activeDestinationMunicipality && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] font-black">
                <span>🚗 Corredor hacia: {activeDestinationMunicipality}</span>
              </div>
            )}
          </div>

          {/* Listado de Alertas del Radio */}
          <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3.5 max-w-3xl mx-auto w-full">
            {loading ? (
              <div className="py-12 text-center space-y-2">
                <RotateCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Sintonizando frecuencia de choferes...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
                <Radio className="w-10 h-10 text-amber-400/60 mx-auto" />
                <h4 className="text-sm font-bold text-white">Frecuencia despejada en este radio</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No hay alertas ni novedades a {selectedRadiusKm === 999 ? 'nivel nacional' : `${selectedRadiusKm} km a la redonda`}.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="py-2 px-4 rounded-xl bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Reportar Novedad en Ruta</span>
                </button>
              </div>
            ) : (
              posts.map((post) => {
                const isSos = post.category === 'AUXILIO_SOS' || post.urgency === 'CRITICAL_SOS';
                const isReten = post.sub_type === 'RETEN';
                const isHighDemand = post.category === 'ALTA_DEMANDA' || post.category === 'ZONA_CALIENTE';
                const isSpeakingThis = speakingPostId === post.id;

                return (
                  <article
                    key={post.id}
                    className={`p-4 rounded-3xl bg-slate-900 border transition-all space-y-3 shadow-xl ${
                      isSos
                        ? 'border-rose-500/70 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 animate-pulse'
                        : isReten
                        ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900'
                        : isHighDemand
                        ? 'border-teal-500/50 bg-gradient-to-br from-teal-950/30 via-slate-900 to-slate-900'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Header de la Alerta */}
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider text-[10px] border ${
                          isSos
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : isReten
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            : isHighDemand
                            ? 'bg-teal-500/20 text-teal-300 border-teal-400/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {isSos ? '🆘 AUXILIO SOS' : isReten ? '🚨 RETÉN / CONTROL' : isHighDemand ? '⚡ PUNTOS CON CARRERAS' : '🔧 TALLER / RUTA'}
                        </span>

                        {/* Badge de Distancia o Corredor de Ruta */}
                        {post.is_in_route_corridor ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] font-black animate-pulse">
                            🎯 En tu Ruta ({post.municipality})
                          </span>
                        ) : post.distance_km !== null && post.distance_km !== undefined ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                            📍 A {post.distance_km} km
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Botón de Voz de 1 Toque para el Conductor */}
                        <button
                          type="button"
                          onClick={() => playAlertVoice(post)}
                          title="Escuchar alerta con voz"
                          className={`p-1.5 rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
                            isSpeakingThis
                              ? 'bg-amber-400 text-slate-950 border-amber-300 animate-bounce'
                              : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black">Escuchar</span>
                        </button>

                        <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-slate-500" />
                          {post.driver_name}
                        </span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {post.description}
                      </p>
                    </div>

                    {/* Ubicación */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{post.location_name} • <strong className="text-white">{post.municipality}</strong></span>
                    </div>

                    {/* Acciones y Confirmación Solidaria */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmAlert(post.id)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          post.driver_has_confirmed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${post.driver_has_confirmed ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                        <span>Confirmado ({post.confirmations_count || 1})</span>
                      </button>

                      {isSos && post.driver_phone && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${post.driver_phone}`}
                            className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Llamar</span>
                          </a>
                          <a
                            href={`https://wa.me/${post.driver_phone.replace(/\D/g, '')}?text=Hola+colega,+vi+tu+alerta+SOS+en+el+Radio+de+Rumbo.+Voy+cerca,+¿te+apoyo?`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </main>
        </>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: FRECUENCIA PRIVADA (Chat entre Colegas de Confianza)   */}
      {/* ============================================================== */}
      {activeMainTab === 'PRIVATE_FREQUENCY' && (
        <div className="flex-1 flex flex-col overflow-hidden max-w-3xl mx-auto w-full">
          {/* Barra de Colegas Conectados */}
          <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                Colegas ({buddies.length}):
              </span>
              {buddies.length === 0 ? (
                <span className="text-xs text-amber-300 italic">No tienes colegas agregados aún</span>
              ) : (
                buddies.map((b) => (
                  <div
                    key={b.buddy_driver_id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold whitespace-nowrap text-white"
                  >
                    <span className={`w-2 h-2 rounded-full ${b.is_online ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>{b.buddy_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({b.vehicle_plate})</span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAddBuddyModal(true)}
              className="py-1 px-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Agregar</span>
            </button>
          </div>

          {/* Muro de Mensajes Privados */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {privateMessages.map((msg) => {
              const isMe = msg.sender_driver_id === effDriverId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                    <span className="font-bold text-amber-300">{isMe ? 'Tú' : msg.sender_name}</span>
                    {msg.sender_vehicle && <span className="text-[10px] font-mono">({msg.sender_vehicle})</span>}
                    <button
                      type="button"
                      onClick={() => playMessageVoice(msg)}
                      title="Escuchar mensaje con voz"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-md ${
                      isMe
                        ? 'bg-amber-400 text-slate-950 rounded-br-none font-bold'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                    }`}
                  >
                    {msg.message_text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de Respuestas Rápidas (1 Toque al Volante) */}
          <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] font-black uppercase text-amber-400 whitespace-nowrap pl-1">
              ⚡ 1 Toque:
            </span>
            {QUICK_DRIVER_RESPONSES.map((quick, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendPrivateMessage(quick)}
                className="py-1 px-2.5 rounded-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 text-xs font-bold text-slate-200 whitespace-nowrap transition-all cursor-pointer"
              >
                {quick}
              </button>
            ))}
          </div>

          {/* Input de Mensaje de Texto */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrivateMessage();
            }}
            className="p-2 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Mensaje privado a tus colegas..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessageText.trim()}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL 1: TRANSMITIR ALERTA PÚBLICA */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400" />
                <span>Transmitir en Radio de Conductores</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Tipo de Transmisión:</label>
                <select
                  value={reportCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setReportCategory(cat);
                    if (cat === 'AUXILIO_SOS') setReportUrgency('CRITICAL_SOS');
                    else setReportUrgency('NORMAL');
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  <option value="ALERTA_VIAL">🚨 Alerta Vial (Retén, Accidente, Obras)</option>
                  <option value="ALTA_DEMANDA">⚡ Puntos con Carreras (Alta Demanda de Pasajeros)</option>
                  <option value="AUXILIO_SOS">🆘 Pedido de Auxilio SOS entre Colegas</option>
                  <option value="TALLER_LLANTERIA">🔧 Recomendación de Taller / Llantería 24/7</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Título de la Alerta:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Retén policial carril derecho subiendo a Santa Tecla"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Ubicación / Punto:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Frente a Gasolinera DLC"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Municipio:</label>
                  <select
                    value={reportMunicipality}
                    onChange={(e) => setReportMunicipality(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    {MUNICIPALITIES.filter((m) => m !== 'ALL').map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Detalle para los colegas:</label>
                <textarea
                  rows={2}
                  placeholder="Explica qué está pasando o qué auxilio necesitas..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black"
                >
                  {submitting ? 'Transmitiendo...' : 'Transmitir Alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BUSCAR Y AGREGAR COLEGA A FRECUENCIA PRIVADA */}
      {showAddBuddyModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>Agregar Colega a Frecuencia Privada</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBuddyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Busca a tu colega por su <strong>número de teléfono, placa o nombre</strong> para conectarlo a tu canal privado de mensajes.
            </p>

            <form onSubmit={handleSearchBuddies} className="flex gap-2">
              <input
                type="text"
                placeholder="Placa (ej: P-123456) o teléfono..."
                value={buddySearchQuery}
                onChange={(e) => setBuddySearchQuery(e.target.value)}
                className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
              <button
                type="submit"
                disabled={searchingBuddies}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>
            </form>

            <div className="max-h-52 overflow-y-auto space-y-2">
              {searchingBuddies ? (
                <div className="py-4 text-center">
                  <RotateCw className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
                </div>
              ) : buddySearchResults.length > 0 ? (
                buddySearchResults.map((driver) => (
                  <div
                    key={driver.id}
                    className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{driver.full_name}</p>
                      <p className="text-[11px] text-amber-300 font-mono">
                        {driver.vehicle_plate} • {driver.vehicle_model}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddBuddy(driver.id)}
                      className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
                    >
                      + Agregar
                    </button>
                  </div>
                ))
              ) : buddySearchQuery ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  No se encontraron conductores con esos datos.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
