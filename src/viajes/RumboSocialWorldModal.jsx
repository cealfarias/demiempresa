import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  MapPin,
  Heart,
  Share2,
  Users,
  Compass,
  Gamepad2,
  Navigation,
  X,
  MessageCircle,
  Award,
  CheckCircle2,
  Clock,
  PlusCircle,
  Eye,
  EyeOff,
  Flame,
  ArrowRight,
  Gift,
  Car,
  ChevronDown,
  RotateCw,
  Trophy,
  Zap,
  Tag
} from 'lucide-react';
import {
  fetchSocialCommunitiesApi,
  fetchSocialFeedApi,
  createSocialPostApi,
  toggleSocialLikeApi,
  fetchUserContactsApi,
  playArcadeGameApi,
  fetchArcadeBalanceApi
} from './api';

// Categorías por defecto si el backend no responde
const FALLBACK_COMMUNITIES = [
  { id: 'ALL', name: '🌟 Todo', icon: 'Sparkles', tagline: 'Lo más destacado' },
  { id: 'turismo-interno', name: '🏖️ Turismo & Playas', icon: 'MapPin', tagline: 'Rutas y paseos' },
  { id: 'gastronomia', name: '🍔 Cenas & Cafés', icon: 'Utensils', tagline: 'Sabor local y 2x1' },
  { id: 'vida-nocturna', name: '🎉 Noches & Fiestas', icon: 'PartyPopper', tagline: 'Bares y eventos' },
  { id: 'escapadas-parejas', name: '🤫 Escapadas & Parejas', icon: 'Heart', tagline: 'Privacidad y confort' },
  { id: 'distracciones', name: '⚡ Distracciones', icon: 'Zap', tagline: 'Cines, ferias y diversión' }
];

// Preguntas Trivia Guanaca Express
const TRIVIA_QUESTIONS = [
  {
    q: '¿Qué volcán de El Salvador fue conocido mundialmente como "El Faro del Pacífico"?',
    options: ['Volcán de San Salvador', 'Volcán de Izalco', 'Volcán de Santa Ana', 'Volcán Conchagua'],
    answer: 1
  },
  {
    q: '¿En qué municipio se celebra tradicionalmente el Día Nacional de la Pupusa de Arroz?',
    options: ['Olocuilta', 'Antiguo Cuscatlán', 'Santa Tecla', 'Apastepeque'],
    answer: 0
  },
  {
    q: '¿Cómo se le llama popularmente al clima fresco y neblina en Los Planes de Renderos?',
    options: ['Chubasco', 'Chipi-chipi', 'Clima de montaña', 'Rumbo fresco'],
    answer: 1
  },
  {
    q: '¿Cuál es el lago volcánico más grande y visitado de El Salvador?',
    options: ['Lago de Suchitlán', 'Lago de Coatepeque', 'Lago de Ilopango', 'Laguna de Alegría'],
    answer: 2
  }
];

export default function RumboSocialWorldModal({
  isOpen,
  onClose,
  tripInfo = null,
  userProfile = null,
  onSelectDestination = null
}) {
  const [activeTab, setActiveTab] = useState('FEED'); // 'FEED' | 'CONTACTS' | 'ARCADE'
  const [selectedCommunity, setSelectedCommunity] = useState('ALL');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'CONTACTS'
  const [communities, setCommunities] = useState(FALLBACK_COMMUNITIES);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Estado de Gamificación / Arcade
  const [arcadePoints, setArcadePoints] = useState(250);
  const [arcadeBalance, setArcadeBalance] = useState({ points: 250, recentRewards: [] });
  const [spinning, setSpinning] = useState(false);
  const [wheelDegree, setWheelDegree] = useState(0);
  const [wheelReward, setWheelReward] = useState(null);

  // Trivia Express
  const [currentTriviaIndex, setCurrentTriviaIndex] = useState(0);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState(null);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [triviaRewardMessage, setTriviaRewardMessage] = useState(null);

  // Formulario de Nuevo Spot
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostLocation, setNewPostLocation] = useState('');
  const [newPostMunicipality, setNewPostMunicipality] = useState('San Salvador');
  const [newPostCommunity, setNewPostCommunity] = useState('gastronomia');
  const [newPostDescription, setNewPostDescription] = useState('');
  const [newPostHook, setNewPostHook] = useState('');
  const [newPostPrivacy, setNewPostPrivacy] = useState('PUBLIC'); // 'PUBLIC' | 'CONTACTS_ONLY' | 'ANONYMOUS'
  const [newPostAlias, setNewPostAlias] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  const effUserId = userProfile?.id || localStorage.getItem('rumbo_guest_passenger_id') || null;

  // Cargar comunidades al abrir
  useEffect(() => {
    if (!isOpen) return;

    fetchSocialCommunitiesApi().then((res) => {
      if (res.success && res.communities?.length > 0) {
        setCommunities([
          { id: 'ALL', name: '🌟 Todo', icon: 'Sparkles', tagline: 'Lo más destacado' },
          ...res.communities
        ]);
      }
    });

    if (effUserId) {
      fetchArcadeBalanceApi(effUserId).then((res) => {
        if (res.success) {
          setArcadePoints(res.points || 0);
          setArcadeBalance(res);
        }
      });
    }
  }, [isOpen, effUserId]);

  // Cargar feed de posts
  useEffect(() => {
    if (!isOpen || activeTab !== 'FEED') return;
    loadFeed();
  }, [isOpen, activeTab, selectedCommunity, filterMode]);

  const loadFeed = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetchSocialFeedApi({
        communityId: selectedCommunity,
        municipality: tripInfo?.destinationMunicipality || '',
        userId: effUserId,
        filter: filterMode
      });
      if (res.success && res.posts?.length > 0) {
        setPosts(res.posts);
      } else {
        // Semillas de muestra si la base de datos aún no tiene registros
        setPosts([
          {
            id: 'mock-1',
            community_id: 'gastronomia',
            community_name: '🍔 Cenas & Cafés',
            title: 'Pupusas Gourmet y Café de Altura en El Boquerón',
            hook: 'La mejor vista nocturna del Gran San Salvador con clima de 19°C',
            description: 'Pupusas de masa de arroz con camarón, loroco y queso morolique. Excelente atención y parqueo privado.',
            location_name: 'Café Mirador El Boquerón',
            municipality: 'Santa Tecla',
            author_display_name: 'Elena Ramos (Referida de tu Red)',
            likes_count: 42,
            user_has_liked: false,
            privacy: 'PUBLIC'
          },
          {
            id: 'mock-2',
            community_id: 'turismo-interno',
            community_name: '🏖️ Rutas & Turismo',
            title: 'Atardecer de Ensueño en Playa El Zonte',
            hook: 'Surf, fogata y comida del mar al mejor precio',
            description: 'Punto perfecto para pasar la tarde con amigos. Viaje tranquilo por la autopista con retorno seguro.',
            location_name: 'Playa El Zonte, La Libertad',
            municipality: 'La Libertad',
            author_display_name: 'Carlos Mendoza',
            likes_count: 79,
            user_has_liked: true,
            privacy: 'PUBLIC'
          },
          {
            id: 'mock-3',
            community_id: 'escapadas-parejas',
            community_name: '🤫 Escapadas & Parejas',
            title: 'Cabaña Romántica con Jacuzzi y Vista al Valle',
            hook: 'Máxima discreción, entrada directa y pago 100% en efectivo',
            description: 'Habitaciones climatizadas con cortinas blackout, música ambiental y servicio directo sin intermediarios.',
            location_name: 'Zona Residencial Los Planes',
            municipality: 'Panchimalco',
            author_display_name: '🤫 Viajero Discreto',
            likes_count: 31,
            user_has_liked: false,
            privacy: 'ANONYMOUS'
          }
        ]);
      }
    } catch (e) {
      console.warn('Error cargando feed:', e);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Cargar contactos
  useEffect(() => {
    if (!isOpen || activeTab !== 'CONTACTS' || !effUserId) return;
    setLoadingContacts(true);
    fetchUserContactsApi(effUserId).then((res) => {
      if (res.success) {
        setContacts(res.contacts || []);
      }
    }).finally(() => setLoadingContacts(false));
  }, [isOpen, activeTab, effUserId]);

  // Manejar Like
  const handleLike = async (postId) => {
    if (!effUserId) return;
    try {
      const res = await toggleSocialLikeApi(postId, effUserId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const newLiked = res.liked;
              const newCount = newLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 1) - 1);
              return { ...p, user_has_liked: newLiked, likes_count: newCount };
            }
            return p;
          })
        );
      }
    } catch (e) {
      console.warn('Error en like:', e);
    }
  };

  // Compartir en WhatsApp con link de referido
  const handleShareToWhatsApp = (post) => {
    const refCode = userProfile?.referralCode || localStorage.getItem('rumbo_referral_code') || 'RUMBO2026';
    const text = `¡Mira este lugar en Rumbo! 🚗✨\n*${post.title}*\n📍 ${post.location_name} (${post.municipality})\n"${post.hook || ''}"\n\nRegístrate con mi enlace, conéctate a mi red y recibe $1.00 de bono para tu viaje:\nhttps://demiempresa.online/viajes?ref=${refCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Pedir viaje hacia este lugar
  const handleRideHere = (post) => {
    if (onSelectDestination) {
      onSelectDestination({
        address: post.location_name,
        municipality: post.municipality,
        lat: post.location_lat,
        lng: post.location_lng
      });
    }
    onClose();
  };

  // Crear Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostLocation.trim()) return;

    setSubmittingPost(true);
    try {
      const res = await createSocialPostApi({
        authorId: effUserId,
        communityId: newPostCommunity,
        title: newPostTitle.trim(),
        description: newPostDescription.trim(),
        hook: newPostHook.trim(),
        locationName: newPostLocation.trim(),
        municipality: newPostMunicipality,
        privacy: newPostPrivacy,
        anonymousAlias: newPostPrivacy === 'ANONYMOUS' ? (newPostAlias.trim() || 'Viajero de Ruta') : null
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewPostTitle('');
        setNewPostLocation('');
        setNewPostDescription('');
        setNewPostHook('');
        loadFeed();
      }
    } catch (err) {
      console.error('Error creando post:', err);
    } finally {
      setSubmittingPost(false);
    }
  };

  // Girar Ruleta de Ruta en Arcade
  const handleSpinWheel = async () => {
    if (spinning) return;
    setSpinning(true);
    setWheelReward(null);

    // Giro aleatorio visual (entre 5 y 8 vueltas completas + ángulo)
    const extraDegrees = Math.floor(Math.random() * 360);
    const totalRotation = wheelDegree + (360 * 6) + extraDegrees;
    setWheelDegree(totalRotation);

    try {
      const res = await playArcadeGameApi({
        userId: effUserId || 'guest_user',
        tripId: tripInfo?.id || null,
        gameType: 'WHEEL_OF_FORTUNE'
      });

      setTimeout(() => {
        setSpinning(false);
        if (res.success && res.outcome) {
          setWheelReward(res.outcome.reward);
          setArcadePoints(res.outcome.totalPoints);
        } else {
          // Fallback visual
          setWheelReward({
            reward_description: '¡Ganaste 150 Puntos de Ruta!',
            points_won: 150,
            bonus_amount: 0
          });
          setArcadePoints((prev) => prev + 150);
        }
      }, 3500);
    } catch (e) {
      setTimeout(() => {
        setSpinning(false);
        setWheelReward({
          reward_description: '¡Tiro Certero! Ganaste 100 Puntos de Ruta',
          points_won: 100,
          bonus_amount: 0
        });
        setArcadePoints((prev) => prev + 100);
      }, 3500);
    }
  };

  // Responder Trivia Guanaca
  const handleAnswerTrivia = (optionIndex) => {
    if (triviaAnswered) return;
    setSelectedTriviaOption(optionIndex);
    setTriviaAnswered(true);

    const isCorrect = optionIndex === TRIVIA_QUESTIONS[currentTriviaIndex].answer;
    if (isCorrect) {
      setTriviaRewardMessage('¡EXCELENTE! Respuesta correcta. Sumas +100 Puntos de Ruta a tu cuenta 🌟');
      setArcadePoints((prev) => prev + 100);
    } else {
      setTriviaRewardMessage('¡Casi! La respuesta correcta era: ' + TRIVIA_QUESTIONS[currentTriviaIndex].options[TRIVIA_QUESTIONS[currentTriviaIndex].answer]);
    }
  };

  const handleNextTrivia = () => {
    setCurrentTriviaIndex((prev) => (prev + 1) % TRIVIA_QUESTIONS.length);
    setSelectedTriviaOption(null);
    setTriviaAnswered(false);
    setTriviaRewardMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fade-in overflow-hidden">
      {/* 1. HUD STICKY SUPERIOR: Estado del Viaje Siempre Visible */}
      <header className="w-full bg-slate-900/95 border-b border-amber-500/30 px-3 sm:px-6 py-2.5 backdrop-blur-md shadow-xl flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                Rumbo a mi Destino
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium truncate max-w-[200px] sm:max-w-md">
              {tripInfo?.destinationAddress ? `En camino a: ${tripInfo.destinationAddress}` : 'Explora spots, amigos y juegos en ruta'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Puntos de Arcade */}
          <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-black text-amber-300 font-mono">{arcadePoints} Pts</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Minimizar y ver mapa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. BARRA DE NAVEGACIÓN DE PESTAÑAS PRINCIPALES */}
      <nav className="w-full bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('FEED')}
          className={`flex-1 max-w-[160px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'FEED'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Muro Spots</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONTACTS')}
          className={`flex-1 max-w-[160px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'CONTACTS'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Mi Red ({contacts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ARCADE')}
          className={`flex-1 max-w-[160px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'ARCADE'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30 font-black'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Gamepad2 className="w-4 h-4 text-purple-300 animate-bounce" />
          <span>Juegos & Bonos</span>
        </button>
      </nav>

      {/* 3. CONTENIDO PRINCIPAL SCROLLEABLE */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 max-w-4xl mx-auto w-full">
        {/* ================= PESTAÑA 1: MURO DE SPOTS ================= */}
        {activeTab === 'FEED' && (
          <div className="space-y-4 animate-fade-in">
            {/* Carrusel de Comunidades Afines */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {communities.map((comm) => (
                <button
                  key={comm.id}
                  type="button"
                  onClick={() => setSelectedCommunity(comm.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedCommunity === comm.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {comm.name}
                </button>
              ))}
            </div>

            {/* Selector de Filtro: Todos vs Mi Red de Contactos */}
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    filterMode === 'ALL'
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔥 Todo El Salvador
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('CONTACTS')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    filterMode === 'CONTACTS'
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👥 Solo mi Red de Amigos
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="py-1 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Recomendar</span>
              </button>
            </div>

            {/* Listado de Spots / Posts */}
            {loadingPosts ? (
              <div className="py-12 text-center space-y-2">
                <RotateCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Explorando spots y recomendaciones en tu ruta...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
                <Compass className="w-10 h-10 text-amber-400/60 mx-auto" />
                <h4 className="text-sm font-bold text-white">No hay spots en esta comunidad todavía</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Sé el primero en recomendar un restaurante, mirador o rincón salvadoreño a tu red de contactos.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="py-2 px-4 rounded-xl bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar Recomendación</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 shadow-xl space-y-3 transition-all relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {post.community_name || 'Comunidad Rumbo'}
                      </span>
                      <span className="flex items-center gap-1">
                        {post.privacy === 'ANONYMOUS' ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Users className="w-3 h-3 text-slate-500" />}
                        {post.author_display_name}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-black text-white leading-snug">
                        {post.title}
                      </h3>
                      {post.hook && (
                        <p className="text-xs font-semibold text-amber-300/90 italic">
                          "{post.hook}"
                        </p>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">
                        {post.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{post.location_name} • {post.municipality}</span>
                    </div>

                    {/* Acciones de la Tarjeta */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleLike(post.id)}
                          className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                            post.user_has_liked
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${post.user_has_liked ? 'fill-rose-400 text-rose-400' : ''}`} />
                          <span>{post.likes_count || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareToWhatsApp(post)}
                          title="Compartir por WhatsApp con bono de $1.00"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-all cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRideHere(post)}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Ir a este Lugar</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= PESTAÑA 2: MI RED DE CONTACTOS ================= */}
        {activeTab === 'CONTACTS' && (
          <div className="space-y-4 animate-fade-in">
            {/* Banner de Invitación Viral */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-400/40 shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Construye tu Red de Ruta
                    </h3>
                    <p className="text-xs text-amber-300 font-medium">
                      Ganas $1.00 por cada amigo que viaje contigo
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Cada persona que invitas queda vinculada a tu lista de amigos. Verás sus recomendaciones en tu muro y ambos recibirán bonos para pagar carreras en efectivo.
              </p>

              <button
                type="button"
                onClick={() => {
                  const refCode = userProfile?.referralCode || localStorage.getItem('rumbo_referral_code') || 'RUMBO2026';
                  const text = `¡Ey! Te invito a Rumbo, la app de viajes en efectivo sin comisiones abusivas. 🚗💨\n\nRegístrate con mi enlace, únete a mi Red de Ruta y recibe $1.00 USD de regalo para tu primer viaje:\nhttps://demiempresa.online/viajes?ref=${refCode}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Invitar Amigos por WhatsApp (+ $1.00 USD)</span>
              </button>
            </div>

            {/* Listado de Contactos en la Red */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
                Amigos Vinculados a tu Red ({contacts.length})
              </h4>

              {loadingContacts ? (
                <div className="py-8 text-center">
                  <RotateCw className="w-5 h-5 text-amber-400 animate-spin mx-auto" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Aún no tienes contactos en tu red. Comparte tu código de referido para empezar a armar tu comunidad de viajes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.user_id}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-300">
                          {contact.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{contact.full_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{contact.masked_phone}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          contact.referral_status === 'ACTIVATED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {contact.referral_status === 'ACTIVATED' ? '✓ Viaje Activo' : '⏳ Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PESTAÑA 3: ARCADE & MINIJUEGOS ================= */}
        {activeTab === 'ARCADE' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header de Balance de Gamificación */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-950 to-slate-900 border border-purple-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center font-black">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                    Arcade DemiEmpresa
                  </span>
                  <h3 className="text-lg font-black text-white font-mono">
                    {arcadePoints} Puntos Acumulados
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium">Equivalente aprox:</span>
                <p className="text-xs font-black text-emerald-400">
                  ${(arcadePoints / 1000).toFixed(2)} USD en Bonos
                </p>
              </div>
            </div>

            {/* BANNER DESTACADO: SUITE DE 13 MINIJUEGOS ARCADE & RACHA 7 DÍAS */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border-2 border-purple-500/50 shadow-2xl space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/30 border border-purple-400 text-purple-200 flex items-center justify-center text-xl shadow-lg">
                    🕹️
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      NUEVO • 13 MINIJUEGOS
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white mt-1">
                      Arcade Hub & Racha Semanal 7/7
                    </h4>
                    <p className="text-xs text-purple-200/80">
                      Juega 60s al día &bull; 7 días seguidos = <b className="text-amber-300">$1.00 USD</b> directo a tu Billetera (válido 7 días)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span>🏎️ Turbo Drift</span>
                  <span>&bull;</span>
                  <span>🪐 Cosmic Fusion</span>
                  <span>&bull;</span>
                  <span>⚡ Neon Survivor</span>
                  <span>&bull;</span>
                  <span>🟡 Chomp</span>
                </div>
                <a
                  href="/juegos/index.html"
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-purple-950/50 transition-all"
                >
                  <span>Abrir Juegos</span>
                  <span>➔</span>
                </a>
              </div>
            </div>

            {/* JUEGO 1: LA RULETA DE LA SUERTE DE RUTA */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-4 text-center relative overflow-hidden">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Trophy className="w-3 h-3" />
                  <span>1 Giro Gratis por Trayecto</span>
                </div>
                <h3 className="text-base font-black text-white">
                  La Ruleta de la Suerte de Ruta
                </h3>
                <p className="text-xs text-slate-400">
                  Gira mientras viajas y gana bonos de $0.50, $1.00 o cientos de puntos para tu siguiente carrera.
                </p>
              </div>

              {/* Rueda Interactiva */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
                {/* Puntero Superior */}
                <div className="absolute -top-3 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-md" />

                <div
                  className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl relative overflow-hidden transition-all duration-[3500ms] ease-out flex items-center justify-center"
                  style={{
                    transform: `rotate(${wheelDegree}deg)`,
                    background: 'conic-gradient(#f59e0b 0deg 60deg, #8b5cf6 60deg 120deg, #10b981 120deg 180deg, #3b82f6 180deg 240deg, #ec4899 240deg 300deg, #eab308 300deg 360deg)'
                  }}
                >
                  <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center font-black text-xs text-amber-300 shadow-inner z-10">
                    RUMBO
                  </div>
                </div>
              </div>

              {/* Recompensa de la Ruleta */}
              {wheelReward && (
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs animate-pop-bounce">
                  🎉 {wheelReward.reward_description}
                </div>
              )}

              <button
                type="button"
                onClick={handleSpinWheel}
                disabled={spinning}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {spinning ? '¡Girando la Ruleta...!' : '🎰 Girar Ruleta de Ruta'}
              </button>
            </div>

            {/* JUEGO 2: TRIVIA GUANACA EXPRESS */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
                  Trivia Guanaca • Pregunta {currentTriviaIndex + 1} de {TRIVIA_QUESTIONS.length}
                </span>
                <span className="text-[10px] font-bold text-amber-400">+100 Pts</span>
              </div>

              <h4 className="text-sm font-bold text-white">
                {TRIVIA_QUESTIONS[currentTriviaIndex].q}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {TRIVIA_QUESTIONS[currentTriviaIndex].options.map((opt, idx) => {
                  let btnColor = 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700';
                  if (triviaAnswered) {
                    if (idx === TRIVIA_QUESTIONS[currentTriviaIndex].answer) {
                      btnColor = 'bg-emerald-500 text-slate-950 font-black border-emerald-400';
                    } else if (idx === selectedTriviaOption) {
                      btnColor = 'bg-rose-500/40 text-rose-200 border-rose-500';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={triviaAnswered}
                      onClick={() => handleAnswerTrivia(idx)}
                      className={`p-2.5 rounded-xl text-xs text-left border transition-all cursor-pointer ${btnColor}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {triviaRewardMessage && (
                <div className="p-2.5 rounded-xl bg-slate-800 border border-teal-500/40 text-xs text-teal-300 font-bold flex items-center justify-between">
                  <span>{triviaRewardMessage}</span>
                  <button
                    type="button"
                    onClick={handleNextTrivia}
                    className="underline text-amber-400 hover:text-amber-300 ml-2"
                  >
                    Siguiente ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CREACIÓN DE NUEVO SPOT */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>Recomendar un Spot / Plan</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Comunidad:</label>
                <select
                  value={newPostCommunity}
                  onChange={(e) => setNewPostCommunity(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  <option value="gastronomia">🍔 Cenas, Almuerzos & Cafés</option>
                  <option value="turismo-interno">🏖️ Rutas & Turismo Interno</option>
                  <option value="vida-nocturna">🎉 Noches & Fiestas</option>
                  <option value="escapadas-parejas">🤫 Escapadas & Parejas</option>
                  <option value="distracciones">⚡ Distracciones & Eventos</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Título del Spot:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Las Mejores Pupusas de Chicharrón"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Frase Gancho / Tip:</label>
                <input
                  type="text"
                  placeholder="Ej: 'Pide la salsa de la casa que es buenísima'"
                  value={newPostHook}
                  onChange={(e) => setNewPostHook(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nombre del Local / Lugar:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pupusería El Triángulo"
                    value={newPostLocation}
                    onChange={(e) => setNewPostLocation(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Municipio:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Santa Tecla"
                    value={newPostMunicipality}
                    onChange={(e) => setNewPostMunicipality(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Descripción / Reseña:</label>
                <textarea
                  rows={2}
                  placeholder="Cuéntale a tu red qué tal la experiencia, precios y ambiente..."
                  value={newPostDescription}
                  onChange={(e) => setNewPostDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Privacidad de la publicación:</label>
                <select
                  value={newPostPrivacy}
                  onChange={(e) => setNewPostPrivacy(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  <option value="PUBLIC">🌐 Pública (Todo El Salvador)</option>
                  <option value="CONTACTS_ONLY">👥 Solo Amigos de mi Red</option>
                  <option value="ANONYMOUS">🤫 Anónimo (Total discreción)</option>
                </select>
              </div>

              {newPostPrivacy === 'ANONYMOUS' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Alias Anónimo:</label>
                  <input
                    type="text"
                    placeholder="Ej: Viajero Nocturno"
                    value={newPostAlias}
                    onChange={(e) => setNewPostAlias(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              )}

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
                  disabled={submittingPost}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black"
                >
                  {submittingPost ? 'Publicando...' : 'Publicar Spot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
