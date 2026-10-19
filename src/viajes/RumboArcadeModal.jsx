import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2,
  X,
  Trophy,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RotateCw,
  Gift,
  ShieldCheck,
  Zap,
  Play
} from 'lucide-react';
import { fetchGameStreakApi, recordGameStreakSessionApi } from './api';

const ARCADE_GAMES = [
  // JUEGOS MODERNOS
  {
    id: 'turbo-drift',
    name: 'Turbo Drift Neo',
    tag: 'CARRERAS 80s',
    category: 'retro',
    icon: '🏎️',
    gradient: 'from-fuchsia-600 to-rose-600',
    desc: 'Autopista Synthwave, esquiva tráfico, recoge bidones y activa el Nitro a 300 km/h.'
  },
  {
    id: 'cosmic-fusion',
    name: 'Cosmic Fusion',
    tag: 'FUSIÓN PLANETARIA',
    category: 'modern',
    icon: '🪐',
    gradient: 'from-purple-600 to-indigo-600',
    desc: 'Física elástica gravitatoria tipo Suika 2048. Fusiona planetas hasta la Supernova.'
  },
  {
    id: 'neon-survivor',
    name: 'Neon Survivor',
    tag: 'ROGUELITE',
    category: 'modern',
    icon: '⚡',
    gradient: 'from-emerald-600 to-teal-600',
    desc: 'Sobrevive a oleadas masivas con disparos automáticos y subidas de nivel continuas.'
  },
  {
    id: 'crown-clash',
    name: 'Crown Clash',
    tag: 'ESTRATEGIA 1v1',
    category: 'modern',
    icon: '👑',
    gradient: 'from-amber-500 to-yellow-600',
    desc: 'Despliega tropas, defiende tus 3 torres y destruye al rey rival estilo Clash Royale.'
  },
  {
    id: 'cyber-katana',
    name: 'Cyber Katana',
    tag: 'CORTE LÁSER',
    category: 'modern',
    icon: '⚔️',
    gradient: 'from-pink-600 to-rose-700',
    desc: 'Rebana núcleos de datos y orbes con tu sable láser táctil antes de que caigan.'
  },
  {
    id: 'galaxy-clash',
    name: 'Galaxy Clash',
    tag: 'TÁCTICA ESPACIAL',
    category: 'modern',
    icon: '🚀',
    gradient: 'from-blue-600 to-cyan-600',
    desc: 'Estrategia de bases e incursiones galácticas en cuadrícula.'
  },
  {
    id: 'hexa-defense',
    name: 'Hexa Defense',
    tag: 'TOWER DEFENSE',
    category: 'modern',
    icon: '🛡️',
    gradient: 'from-amber-600 to-orange-600',
    desc: 'Torretas defensivas tácticas en una matriz de rejilla hexagonal neón.'
  },
  // JUEGOS RETRO
  {
    id: 'chomp-neo',
    name: 'Chomp Neo',
    tag: 'PAC-MAN NEÓN',
    category: 'retro',
    icon: '🟡',
    gradient: 'from-yellow-500 to-amber-600',
    desc: 'El devorador del laberinto clásico con pastillas de poder y fantasmas inteligentes.'
  },
  {
    id: 'new-rally-x',
    name: 'New Rally-X',
    tag: 'NAMCO 1981',
    category: 'retro',
    icon: '🏁',
    gradient: 'from-sky-600 to-blue-700',
    desc: 'El clásico de banderas con radar en tiempo real y cortina de humo defensiva.'
  },
  {
    id: 'star-raider',
    name: 'Star Raider',
    tag: 'ARCADE SHOOTER',
    category: 'retro',
    icon: '🛸',
    gradient: 'from-indigo-600 to-violet-700',
    desc: 'Disparador vertical galáctico retro con armas dobles y jefes de nivel.'
  },
  {
    id: 'tetro-blocks',
    name: 'Tetro Blocks',
    tag: 'TETRIS NEO',
    category: 'retro',
    icon: '🧱',
    gradient: 'from-teal-600 to-emerald-700',
    desc: 'Apila piezas geométricas, limpia líneas y compite por el récord de velocidad.'
  },
  {
    id: 'cyber-pong',
    name: 'Cyber Pong',
    tag: 'PADDLE RETRO',
    category: 'retro',
    icon: '🏓',
    gradient: 'from-violet-600 to-fuchsia-700',
    desc: 'Duelo de reflejos a alta velocidad contra la IA con efectos synthwave.'
  },
  {
    id: 'bridge-builder',
    name: 'Bridge Builder',
    tag: 'FÍSICA & INGENIO',
    category: 'retro',
    icon: '🌉',
    gradient: 'from-stone-600 to-slate-700',
    desc: 'Construye puentes estructurales y pon a prueba su tensión con vehículos pesados.'
  }
];

export default function RumboArcadeModal({ isOpen, onClose, userProfile }) {
  const [activeGame, setActiveGame] = useState(null);
  const [streakData, setStreakData] = useState({
    streak: 0,
    daysRemaining: 7,
    playedToday: false,
    bonusActive: false,
    bonusExpiresAt: null,
    totalStreaksCompleted: 0
  });
  const [loadingStreak, setLoadingStreak] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');

  const userId = userProfile?.id || userProfile?.userId || localStorage.getItem('rumbo_user_id') || 'demo-user';

  // 1. Cargar estado de la racha desde el servidor
  const loadStreakStatus = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingStreak(true);
      const res = await fetchGameStreakApi(userId);
      if (res.success) {
        setStreakData({
          streak: res.streak || 0,
          daysRemaining: res.daysRemaining ?? Math.max(0, 7 - (res.streak || 0)),
          playedToday: !!res.playedToday,
          bonusActive: !!res.bonusActive,
          bonusExpiresAt: res.bonusExpiresAt,
          totalStreaksCompleted: res.totalStreaksCompleted || 0,
          currentBonusAmount: res.currentBonusAmount || '0.00'
        });
      }
    } catch (err) {
      console.error('Error cargando racha de juegos:', err);
    } finally {
      setLoadingStreak(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadStreakStatus();
    }
  }, [isOpen, loadStreakStatus]);

  // 2. Escuchar eventos del bridge dentro del iframe (60s o 1,000 pts)
  useEffect(() => {
    const handleBridgeMessage = async (event) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'RUMBO_CLOSE_ARCADE') {
        if (activeGame) {
          setActiveGame(null);
        } else {
          onClose();
        }
      }

      if (event.data.type === 'RUMBO_GAME_QUALIFIED') {
        const { durationSeconds, score, gameId } = event.data;
        try {
          const res = await recordGameStreakSessionApi({
            userId,
            gameId: gameId || activeGame?.id || 'arcade-hub',
            durationSeconds,
            score
          });

          if (res.success && res.qualified) {
            setToastMessage(res.message);
            loadStreakStatus();
            setTimeout(() => setToastMessage(null), 6000);
          }
        } catch (e) {
          console.error('Error grabando calificación de juego:', e);
        }
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, [activeGame, userId, loadStreakStatus, onClose]);

  if (!isOpen) return null;

  // Filtrado de juegos
  const filteredGames = ARCADE_GAMES.filter((g) => {
    if (filterCategory === 'modern') return g.category === 'modern';
    if (filterCategory === 'retro') return g.category === 'retro';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center sm:p-4 overflow-hidden animate-fade-in font-sans">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 sm:rounded-3xl shadow-2xl flex flex-col h-[95vh] sm:h-[88vh] overflow-hidden relative">
        
        {/* ================= HEADER DEL MODAL ================= */}
        <header className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {activeGame ? (
              <button
                type="button"
                onClick={() => setActiveGame(null)}
                className="py-1 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                ◀ Todos los Juegos
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                <Gamepad2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                {activeGame ? activeGame.name : 'Arcade DemiEmpresa & Wallet'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  13 Minijuegos
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Juega 60s al día &bull; Racha de 7 días = Bono de $1.00 USD para tus viajes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadStreakStatus}
              title="Actualizar racha"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loadingStreak ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= WIDGET DE RACHA 7 DÍAS ================= */}
        <section className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-b border-slate-800 p-3 sm:p-4 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center">
                <Flame className="w-4 h-4 fill-amber-400 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  Racha Semanal de Lealtad (Ciclo 7/7)
                  {streakData.playedToday && (
                    <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ✓ Hoy completado
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-400">
                  {streakData.playedToday
                    ? '¡Tu partida de hoy ya contó! Sigue practicando o vuelve mañana para sumar el siguiente día.'
                    : 'Juega al menos 60 segundos o suma 1,000 puntos hoy para avanzar tu racha.'}
                </p>
              </div>
            </div>

            {/* Bono Activo Notificación */}
            {streakData.bonusActive && (
              <div className="py-1 px-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                <Gift className="w-3.5 h-3.5" />
                <span>Bono Activo: $1.00 USD Disponible</span>
              </div>
            )}
          </div>

          {/* Barra de Progreso de 7 Días */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
              const isChecked = streakData.streak >= dayNum;
              const isCurrent = streakData.streak + 1 === dayNum && !streakData.playedToday;
              const isJackpot = dayNum === 7;

              let style = 'bg-slate-900/80 border-slate-800 text-slate-500';
              if (isChecked) {
                style = 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-md shadow-emerald-950/40';
              } else if (isCurrent) {
                style = 'bg-amber-500/20 border-amber-400/80 text-amber-300 ring-2 ring-amber-400/30 animate-pulse';
              } else if (isJackpot) {
                style = 'bg-purple-950/40 border-purple-500/40 text-purple-300';
              }

              return (
                <div
                  key={dayNum}
                  className={`p-1.5 sm:p-2 rounded-2xl border text-center transition-all ${style}`}
                >
                  <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-75">
                    Día {dayNum}
                  </span>
                  <div className="my-0.5 flex items-center justify-center">
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isJackpot ? (
                      <span className="text-xs sm:text-sm">🎁</span>
                    ) : (
                      <span className="text-xs font-mono font-bold">{dayNum}</span>
                    )}
                  </div>
                  <span className="block text-[9px] font-extrabold truncate">
                    {isJackpot ? '$1.00 USD' : isChecked ? 'Listo' : isCurrent ? 'Hoy' : 'Pend.'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Toast Notificación de Calificación */}
        {toastMessage && (
          <div className="bg-emerald-500 text-slate-950 px-4 py-2 font-black text-xs flex items-center justify-between shadow-lg animate-pop-bounce shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="font-bold underline text-[11px]"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* ================= CONTENIDO PRINCIPAL: IFRAME O CATÁLOGO ================= */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-3 sm:p-5">
          {activeGame ? (
            /* Vista del Juego Embebido en Iframe */
            <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-black relative">
              <iframe
                title={activeGame.name}
                src={`/juegos/games/${activeGame.id}/index.html?userId=${encodeURIComponent(userId)}&gameId=${activeGame.id}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            /* Catálogo de 13 Minijuegos */
            <div className="space-y-4">
              {/* Filtros de Categoría */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterCategory('ALL')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterCategory === 'ALL'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos (13)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterCategory('modern')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterCategory === 'modern'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    ✨ Modernos (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterCategory('retro')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterCategory === 'retro'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    🕹️ Clásicos Retro (7)
                  </button>
                </div>

                <a
                  href="/juegos/index.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hidden sm:flex"
                >
                  <span>Portal Web Completo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Grid de Tarjetas de Juegos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => setActiveGame(game)}
                    className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 shadow-xl hover:shadow-amber-500/10 space-y-3 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${game.gradient} text-white flex items-center justify-center text-2xl shadow-lg`}>
                        {game.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {game.tag}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                        <span>{game.name}</span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {game.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Válido para Racha (60s)
                      </span>
                      <button
                        type="button"
                        className="py-1 px-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 group-hover:bg-amber-300 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-slate-950" />
                        <span>Jugar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Informativo */}
        <footer className="p-3 bg-slate-900/60 border-t border-slate-800/80 text-center text-[11px] text-slate-400 shrink-0">
          <span>⚡ Racha 7/7: Juega mínimo 60 segundos por día. El bono de $1.00 USD tiene una vigencia de 7 días (168h) en tu billetera.</span>
        </footer>

      </div>
    </div>
  );
}
