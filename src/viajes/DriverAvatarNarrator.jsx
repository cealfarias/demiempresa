import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  TrendingUp,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Award,
  Zap,
  Heart,
  Share2,
  Copy,
  Users,
  Check,
  HeartHandshake,
  Car
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { requestScreenWakeLock, releaseScreenWakeLock, safelyResetSpeech } from './audioWakeLockService';

/**
 * Avatar Narrador Emocional del Conductor con:
 * 1. Arquitectura por Frases (Micro-chunks): evita al 100% el bug de congelamiento de Chrome/Android tras 15s
 * 2. Temporizador Watchdog: si un navegador móvil no dispara onend, avanza automáticamente sin trabarse
 * 3. Screen Wake Lock: mantiene la pantalla activa mientras habla
 * 4. Memoria de Interrupción: si la pantalla se bloquea, cancela de inmediato y permite reanudar sin trabas
 * 5. Selector de Capítulos Directos: 1 toque para oír cualquier fase sin repetir todo
 */
export default function DriverAvatarNarrator({ onStartRegistration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('IDLE'); // 'IDLE' | 'DRAMATIC' | 'EUPHORIC' | 'SOLEMN'
  const [activeSpeechText, setActiveSpeechText] = useState('');
  const [currentSentenceText, setCurrentSentenceText] = useState('');
  const [interruptedPhase, setInterruptedPhase] = useState(null);
  const [audioSupported, setAudioSupported] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);

  // Definición de las 3 Fases con guión segmentado en oraciones cortas (3-5s cada una)
  const PHASES_DATA = {
    DRAMATIC: {
      id: 'DRAMATIC',
      num: 1,
      name: 'La Cruda Realidad',
      tag: '🔥 Fase 1: La Cruda Realidad',
      shortTitle: 'Gasolina $5.13 y comisiones abusivas',
      badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      rate: 0.90,
      pitch: 0.90,
      soundEffect: 'GONG',
      sentences: [
        "Amigo conductor... analicemos la realidad que vives todos los días en la calle.",
        "La Gasolina Especial está a cinco dólares con trece centavos por galón.",
        "Pasas más de una hora atrapado en las trabazones de San Salvador, desgastando tu auto...",
        "y pagando cien dólares semanales de alquiler del vehículo o cuota de financiamiento.",
        "¿Y encima de todo ese sacrificio... las otras aplicaciones te quitan hasta el veintiocho por ciento de comisión?",
        "¡Hicimos los números de un viaje real de sesenta y seis minutos!",
        "Tras pagar la comisión, la gasolina a cinco trece y la cuota del auto... ¡el chofer se llevó apenas setenta y un centavos a su casa!",
        "¡Setenta y un centavos por más de una hora de tu vida! ¡Eso tiene que terminar hoy!"
      ],
      summary: "⚠️ La Cruda Realidad (Gasolina a $5.13 y comisiones que ahogan tu bolsillo)"
    },
    EUPHORIC: {
      id: 'EUPHORIC',
      num: 2,
      name: 'Victoria 0% Comisión',
      tag: '🚀 Fase 2: Victoria Rumbo',
      shortTitle: '0% Comisión y 1ª semana gratis',
      badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      rate: 0.95,
      pitch: 0.98,
      soundEffect: 'NONE',
      sentences: [
        "¡Pero aquí es donde cambia tu Destino!",
        "¡Por eso nació Rumbo a mi Destino!",
        "¡Escúchalo bien: CERO POR CIENTO DE COMISIÓN! ¡Cero! ¡Ni un solo centavo te quitamos!",
        "Cada dólar que te pague el pasajero entra íntegro y limpio en efectivo a tu propia bolsa.",
        "¡Y para darte la bienvenida al equipo, tu primera semana es completamente GRATIS, con cero cuota!",
        "Protegemos tu tiempo con tarifas que compensan el tráfico y te damos un radar en vivo para encontrar la gasolina más barata.",
        "¡El dinero que antes te quitaban ahora es para ti, para tu auto y para el futuro de tu familia!",
        "¡Toma el control y regístrate hoy mismo!"
      ],
      summary: "🎉 ¡La Revolución Rumbo! 0% Comisión y 100% de Ganancia en tu Mano"
    },
    SOLEMN: {
      id: 'SOLEMN',
      num: 3,
      name: 'Alianza y Paciencia',
      tag: '🤝 Fase 3: Mensaje Institucional',
      shortTitle: 'Paciencia en inicio y enlaces para crecer',
      badgeColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
      rate: 0.88,
      pitch: 0.92,
      soundEffect: 'NONE',
      sentences: [
        "Y finalmente, un mensaje muy especial con absoluta seriedad:",
        "Agradecemos profundamente tu paciencia y tu comprensión, ya que nuestra aplicación se encuentra en su fase inicial de lanzamiento.",
        "Para consolidar esta alternativa y romper juntos las comisiones abusivas, te pedimos de corazón tu colaboración compartiendo los enlaces de Rumbo.",
        "Compártelos con viajeros para dinamizar tus carreras, y también con otros conductores colegas.",
        "Entre más crezcamos en las calles, más nos beneficiaremos todos. ¡Caminemos juntos hacia tu destino!"
      ],
      summary: "🤝 Mensaje Institucional: Gracias por tu paciencia. ¡Comparte los enlaces para beneficiarnos todos!"
    }
  };

  // Motor Interno de Reproducción Secuencial (Refs para evitar cierres de estado obsoletos)
  const engineRef = useRef({
    isPlaying: false,
    isPaused: false,
    phaseKey: 'IDLE',
    isChained: false,
    sentenceIndex: 0,
    sentences: [],
    rate: 1.0,
    pitch: 1.0,
    watchdogTimer: null,
    nextSentenceTimer: null
  });

  // Pre-carga de voces disponibles en el navegador
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioSupported(false);
      return;
    }

    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) setVoices(v);
      } catch {}
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Monitoreo de Visibilidad: si la pantalla del celular se apaga
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (engineRef.current.isPlaying) {
          // Guardar fase para reanudar sin trabas
          const phaseToSave = engineRef.current.phaseKey;
          setInterruptedPhase(phaseToSave);
          stopNarrative(false); // Detener audio de inmediato para no desincronizar con el SO
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopNarrative(false);
    };
  }, []);

  const getBestSpanishVoice = () => {
    const list = voices.length > 0 ? voices : (typeof window !== 'undefined' && window.speechSynthesis?.getVoices()) || [];
    return (
      list.find(v => v.lang === 'es-SV' || v.lang === 'es_SV') ||
      list.find(v => v.lang.startsWith('es-419')) ||
      list.find(v => v.lang.startsWith('es-MX')) ||
      list.find(v => v.lang.startsWith('es-US')) ||
      list.find(v => v.lang.startsWith('es')) ||
      null
    );
  };

  // Sonidos sintéticos Web Audio API
  const playEuphoricChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.12);
        osc.stop(ctx.currentTime + index * 0.12 + 0.65);
      });
    } catch {}
  };

  const playDramaticGong = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110.0, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(65.41, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch {}
  };

  // Detener la narración por completo y limpiar timers
  const stopNarrative = (resetInterrupted = true) => {
    clearTimeout(engineRef.current.watchdogTimer);
    clearTimeout(engineRef.current.nextSentenceTimer);
    safelyResetSpeech();
    releaseScreenWakeLock();

    engineRef.current.isPlaying = false;
    engineRef.current.isPaused = false;
    engineRef.current.phaseKey = 'IDLE';
    engineRef.current.sentenceIndex = 0;

    setIsPlaying(false);
    setIsPaused(false);
    setCurrentPhase('IDLE');
    setActiveSpeechText('');
    setCurrentSentenceText('');
    if (resetInterrupted) {
      setInterruptedPhase(null);
    }
  };

  // Pausar / Reanudar sin usar el método roto speechSynthesis.pause() de Android
  const togglePauseResume = () => {
    if (!engineRef.current.isPlaying) return;

    if (engineRef.current.isPaused) {
      // Reanudar: volver a reproducir desde la oración actual
      engineRef.current.isPaused = false;
      setIsPaused(false);
      requestScreenWakeLock();
      speakSentence(engineRef.current.sentenceIndex);
    } else {
      // Pausar: detener utterance actual pero recordar el índice de la oración
      clearTimeout(engineRef.current.watchdogTimer);
      clearTimeout(engineRef.current.nextSentenceTimer);
      safelyResetSpeech();
      releaseScreenWakeLock();
      engineRef.current.isPaused = true;
      setIsPaused(true);
    }
  };

  // Reproductor de una oración específica
  const speakSentence = (index) => {
    if (!engineRef.current.isPlaying || engineRef.current.isPaused) return;

    const sentences = engineRef.current.sentences;
    if (index >= sentences.length) {
      // Fase actual completada
      clearTimeout(engineRef.current.watchdogTimer);
      if (engineRef.current.isChained) {
        if (engineRef.current.phaseKey === 'DRAMATIC') {
          engineRef.current.nextSentenceTimer = setTimeout(() => playPhase('EUPHORIC', true, 0), 600);
        } else if (engineRef.current.phaseKey === 'EUPHORIC') {
          engineRef.current.nextSentenceTimer = setTimeout(() => playPhase('SOLEMN', false, 0), 700);
        } else {
          stopNarrative(true);
          setActiveSpeechText('¡Gracias por escuchar! Rumbo nació para cambiar tu Destino.');
        }
      } else {
        stopNarrative(true);
      }
      return;
    }

    engineRef.current.sentenceIndex = index;
    const text = sentences[index];
    setCurrentSentenceText(text);

    // Cancelar cualquier síntesis previa para no atascar la cola
    safelyResetSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-SV';
    utterance.rate = engineRef.current.rate;
    utterance.pitch = engineRef.current.pitch;
    utterance.volume = 1.0;

    const voice = getBestSpanishVoice();
    if (voice) utterance.voice = voice;

    // Watchdog Timer de Seguridad (10 segundos máx por frase corta)
    // Si el navegador móvil se congela o no llama a onend, el watchdog rescata el flujo
    clearTimeout(engineRef.current.watchdogTimer);
    engineRef.current.watchdogTimer = setTimeout(() => {
      console.warn('Watchdog rescató la síntesis de voz tras 10s');
      advanceToNextSentence(index + 1);
    }, 10000);

    utterance.onend = () => {
      clearTimeout(engineRef.current.watchdogTimer);
      advanceToNextSentence(index + 1);
    };

    utterance.onerror = (err) => {
      clearTimeout(engineRef.current.watchdogTimer);
      console.warn('Speech error en frase, avanzando:', err);
      advanceToNextSentence(index + 1);
    };

    // Anclar la referencia en window para evitar que el Garbage Collector de V8 la destruya a mitad de audio
    window.__rumbo_active_utterance = utterance;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Error al ejecutar speak:', e);
      advanceToNextSentence(index + 1);
    }
  };

  const advanceToNextSentence = (nextIndex) => {
    if (!engineRef.current.isPlaying || engineRef.current.isPaused) return;
    engineRef.current.sentenceIndex = nextIndex;
    // Pausa natural breve entre oraciones (160ms)
    engineRef.current.nextSentenceTimer = setTimeout(() => {
      speakSentence(nextIndex);
    }, 160);
  };

  // Iniciar una fase
  const playPhase = (phaseKey, isChained = false, startSentenceIndex = 0) => {
    const data = PHASES_DATA[phaseKey];
    if (!data) return;

    // Limpieza de cualquier audio previo
    stopNarrative(false);

    engineRef.current = {
      isPlaying: true,
      isPaused: false,
      phaseKey,
      isChained,
      sentenceIndex: startSentenceIndex,
      sentences: data.sentences,
      rate: data.rate,
      pitch: data.pitch,
      watchdogTimer: null,
      nextSentenceTimer: null
    };

    setIsPlaying(true);
    setIsPaused(false);
    setCurrentPhase(phaseKey);
    setActiveSpeechText(data.summary);
    setInterruptedPhase(null);

    // Mantener la pantalla encendida
    requestScreenWakeLock();

    // Efectos de sonido/confetti
    if (startSentenceIndex === 0) {
      if (data.soundEffect === 'GONG') playDramaticGong();
      if (phaseKey === 'EUPHORIC') {
        try {
          confetti({ particleCount: 75, spread: 85, origin: { y: 0.6 } });
        } catch {}
      }
    }

    // Comenzar la secuencia de oraciones
    speakSentence(startSentenceIndex);
  };

  const handleShareLink = async (type) => {
    const isPassenger = type === 'passenger';
    const title = isPassenger 
      ? 'Viaja Seguro con Rumbo a tu Destino'
      : 'Súmate como Conductor a Rumbo a tu Destino';
    const text = isPassenger
      ? '¡Hola! Te invito a viajar seguro con tarifas justas, conductores salvadoreños 100% verificados y bonos de descuento en cada carrera en Rumbo:'
      : '¡Colega conductor! Te invito a registrarte en Rumbo a mi Destino. 100% de ganancia en efectivo en tu mano, 0% de comisión, primera semana gratis y solicitudes confirmadas a 1 km a la redonda:';
    const url = isPassenger 
      ? 'https://viajes.demiempresa.online'
      : 'https://viajes.demiempresa.online?ref=conductor';

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {}
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyLink = (type) => {
    const url = type === 'passenger' 
      ? 'https://viajes.demiempresa.online'
      : 'https://viajes.demiempresa.online?ref=conductor';
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${
      currentPhase === 'DRAMATIC'
        ? 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/50 shadow-2xl shadow-rose-950/40'
        : currentPhase === 'EUPHORIC'
        ? 'bg-gradient-to-b from-amber-950/50 via-emerald-950/30 to-slate-950 border-emerald-400/60 shadow-2xl shadow-emerald-950/50'
        : currentPhase === 'SOLEMN'
        ? 'bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 border-sky-400/50 shadow-2xl shadow-sky-950/40'
        : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-amber-500/30 shadow-xl'
    } p-4 sm:p-6 text-center space-y-4`}>
      
      {/* Luces de ambientación dinámica */}
      {currentPhase === 'DRAMATIC' && (
        <div className="absolute inset-0 bg-rose-500/10 pointer-events-none animate-pulse" />
      )}
      {currentPhase === 'EUPHORIC' && (
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse" />
      )}
      {currentPhase === 'SOLEMN' && (
        <div className="absolute inset-0 bg-sky-500/10 pointer-events-none animate-pulse" />
      )}

      {/* BANNER DE RECUPERACIÓN INTELIGENTE (Si se apagó la pantalla) */}
      {interruptedPhase && !isPlaying && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-left">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-300 block">¿Se apagó tu pantalla?</span>
              <span className="text-slate-300 text-[11px]">
                Toca para continuar directamente en la fase donde estabas.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => playPhase(interruptedPhase, true, 0)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors shadow shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Reanudar en {PHASES_DATA[interruptedPhase]?.name}</span>
          </button>
        </div>
      )}

      {/* 1. SELECTOR DE CAPÍTULOS / FASES DIRECTAS (Nunca te obliga a oír todo desde cero) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-2xl border border-slate-800">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
          <span>Capítulos:</span>
        </span>
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
          {Object.values(PHASES_DATA).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => playPhase(p.id, false, 0)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                currentPhase === p.id && isPlaying
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-400/50'
              }`}
            >
              <span>{p.num}. {p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. EL AVATAR CON GESTOS Y EXPRESIONES VIVAS */}
      <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
        {/* Halo de animación exterior */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          currentPhase === 'DRAMATIC'
            ? 'bg-rose-500/30 blur-xl animate-ping'
            : currentPhase === 'EUPHORIC'
            ? 'bg-gradient-to-r from-amber-400 to-emerald-400 blur-xl animate-spin'
            : currentPhase === 'SOLEMN'
            ? 'bg-sky-400/30 blur-xl animate-pulse'
            : isPlaying
            ? 'bg-amber-400/20 blur-md animate-pulse'
            : 'bg-slate-800/40 blur-sm'
        }`} />

        {/* Rostro / Ilustración SVG animada del Conductor */}
        <div className={`relative w-full h-full rounded-full border-2 overflow-hidden flex items-center justify-center transition-all transform ${
          currentPhase === 'DRAMATIC'
            ? 'border-rose-400 bg-slate-950 scale-105'
            : currentPhase === 'EUPHORIC'
            ? 'border-amber-300 bg-slate-900 scale-110 shadow-lg shadow-emerald-400/30'
            : currentPhase === 'SOLEMN'
            ? 'border-sky-400 bg-slate-900 scale-105 shadow-lg shadow-sky-500/30'
            : 'border-slate-700 bg-slate-900'
        }`}>
          {currentPhase === 'DRAMATIC' ? (
            /* Rostro Dramático / Grave / Frustrado */
            <div className="flex flex-col items-center justify-center text-rose-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">😠</span>
                <Flame className="w-5 h-5 text-rose-400 animate-bounce" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 font-mono">
                ¡Indignante!
              </span>
            </div>
          ) : currentPhase === 'EUPHORIC' ? (
            /* Rostro Eufórico / Victorioso / Celebración */
            <div className="flex flex-col items-center justify-center text-amber-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🤩</span>
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 font-mono">
                ¡0% Comisión!
              </span>
            </div>
          ) : currentPhase === 'SOLEMN' ? (
            /* Rostro Solemne / Respeto / Seriedad */
            <div className="flex flex-col items-center justify-center text-sky-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">🤝</span>
                <HeartHandshake className="w-5 h-5 text-sky-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 font-mono">
                Alianza
              </span>
            </div>
          ) : (
            /* Rostro Amigable en Espera */
            <div className="flex flex-col items-center justify-center text-amber-400 space-y-1">
              <span className="text-3xl">👨‍✈️</span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider">Asesor Rumbo</span>
            </div>
          )}
        </div>

        {/* Indicador de altavoz activo */}
        {isPlaying && (
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-900 border border-amber-400 text-amber-400 shadow-md">
            {isPaused ? <Pause className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
          </div>
        )}
      </div>

      {/* 3. TITULAR Y ESTADO NARRATIVO */}
      <div className="space-y-1.5 max-w-lg mx-auto">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${
          currentPhase === 'DRAMATIC'
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            : currentPhase === 'EUPHORIC'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : currentPhase === 'SOLEMN'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          {currentPhase === 'DRAMATIC' && <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />}
          {currentPhase === 'EUPHORIC' && <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
          {currentPhase === 'SOLEMN' && <HeartHandshake className="w-3.5 h-3.5 text-sky-400 animate-pulse" />}
          {currentPhase === 'IDLE' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
          <span>
            {currentPhase === 'DRAMATIC'
              ? 'Fase 1: La Cruda Realidad de las Apps'
              : currentPhase === 'EUPHORIC'
              ? 'Fase 2: La Victoria del Conductor con Rumbo'
              : currentPhase === 'SOLEMN'
              ? 'Fase 3: Alianza, Paciencia y Colaboración'
              : 'Avatar Asesor de Conductores'}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
          {currentPhase === 'DRAMATIC' ? (
            <span className="text-rose-300">¿Trabajas para las apps o para tu familia?</span>
          ) : currentPhase === 'EUPHORIC' ? (
            <span className="text-emerald-400">¡Cero Comisión! 100% de la Ganancia en tu Mano</span>
          ) : currentPhase === 'SOLEMN' ? (
            <span className="text-sky-300">Gracias por tu Confianza: Crecemos Juntos</span>
          ) : (
            <span>Conoce la Realidad y Cómo Cambiamos tu Destino</span>
          )}
        </h2>

        {/* Subtítulo dinámico / Oración en vivo */}
        {isPlaying && currentSentenceText ? (
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs sm:text-sm text-slate-200 font-medium italic min-h-[50px] flex items-center justify-center shadow-inner">
            "{currentSentenceText}"
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-400">
            {activeSpeechText || 'Escucha el análisis real de los costos en calle y la propuesta de Rumbo:'}
          </p>
        )}
      </div>

      {/* 4. ONDAS DE AUDIO SIMULADAS */}
      {isPlaying && !isPaused && (
        <div className="flex items-center justify-center gap-1.5 h-6">
          {[40, 75, 100, 60, 90, 45, 80, 50, 95, 70].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full animate-pulse transition-all ${
                currentPhase === 'DRAMATIC' 
                  ? 'bg-rose-400' 
                  : currentPhase === 'SOLEMN' 
                  ? 'bg-sky-400' 
                  : 'bg-emerald-400'
              }`}
              style={{
                height: `${h}%`,
                animationDelay: `${i * 0.08}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}
        </div>
      )}

      {/* 5. CONTROLES PRINCIPALES: REPRODUCIR COMPLETO / PAUSA / DETENER */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
        {!isPlaying ? (
          <button
            onClick={() => playPhase('DRAMATIC', true, 0)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/40 flex items-center gap-2 cursor-pointer transition-transform transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Escuchar Todo Completo (Dramática, Eufórica y Alianza)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePauseResume}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-amber-500/30"
            >
              {isPaused ? <Play className="w-4 h-4 fill-amber-300" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
            </button>

            <button
              onClick={() => stopNarrative(true)}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-rose-500/30"
            >
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span>Detener</span>
            </button>
          </div>
        )}

        <button
          onClick={onStartRegistration}
          className="px-5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 hover:border-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>Ir Directo al Registro</span>
          <Award className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* 6. ENLACES COLABORATIVOS: PASAJEROS Y CONDUCTORES */}
      <div className="pt-3 border-t border-slate-800/80 text-left space-y-2">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />
          <h4 className="text-xs font-black text-amber-300">
            Comparte Rumbo a tu Destino (Fase Inicial de Despliegue)
          </h4>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Agradecemos tu paciencia y comprensión en este inicio. Tu colaboración compartiendo los enlaces con viajeros y otros conductores fortalece la red para beneficiarnos todos:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Compartir a Pasajeros */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-sky-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="text-[11px]">
                <strong className="text-white block font-bold">1. Enlace para Pasajeros</strong>
                <span className="text-slate-400 text-[10px]">Tarifas justas y bonos de $1.00</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleShareLink('passenger')}
                className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer shadow"
                title="Compartir enlace de pasajeros por WhatsApp"
              >
                <Share2 className="w-3 h-3" />
                <span>Compartir</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyLink('passenger')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-[11px] transition-colors cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink === 'passenger' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Compartir a Conductores */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px]">
                <strong className="text-white block font-bold">2. Enlace para Conductores</strong>
                <span className="text-slate-400 text-[10px]">0% comisión y 1ª semana gratis</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleShareLink('driver')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer shadow"
                title="Compartir enlace de conductores por WhatsApp"
              >
                <Share2 className="w-3 h-3" />
                <span>Compartir</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyLink('driver')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-[11px] transition-colors cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink === 'driver' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
