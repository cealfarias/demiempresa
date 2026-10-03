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

/**
 * Avatar Narrador Emocional del Conductor
 * Alterna dinámicamente entre un tono DRAMÁTICO (al exponer la dura realidad de la gasolina a $5.13,
 * el tráfico asfixiante y las comisiones abusivas), un tono EUFÓRICO (al revelar la libertad de Rumbo,
 * 0% de comisión, primera semana gratis y ganancias 100% en efectivo), y un tono SOLEMNE/SERIEDAD
 * (de agradecimiento por paciencia en fase inicial e invitación a compartir enlaces colaborativos).
 */
export default function DriverAvatarNarrator({ onStartRegistration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('IDLE'); // 'IDLE' | 'DRAMATIC' | 'EUPHORIC' | 'SOLEMN'
  const [activeSpeechText, setActiveSpeechText] = useState('');
  const [audioSupported, setAudioSupported] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);
  const utteranceRef = useRef(null);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioSupported(false);
    }
    return () => {
      stopNarrative();
    };
  }, []);

  // Sonido de fanfarria triunfal sintética con Web Audio API al pasar a la fase eufórica
  const playEuphoricChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Acorde Mayor triunfal)
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

  // Sonido sombrío dramático para la cruda realidad
  const playDramaticGong = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110.0, ctx.currentTime); // A2 bajo
      osc.frequency.exponentialRampToValueAtTime(65.41, ctx.currentTime + 1.2); // C2
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch {}
  };

  const getBestSpanishVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find(v => v.lang === 'es-SV' || v.lang === 'es_SV') ||
      voices.find(v => v.lang.startsWith('es-419')) ||
      voices.find(v => v.lang.startsWith('es-MX')) ||
      voices.find(v => v.lang.startsWith('es-US')) ||
      voices.find(v => v.lang.startsWith('es')) ||
      null
    );
  };

  const stopNarrative = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentPhase('IDLE');
    setActiveSpeechText('');
  };

  // Texto y Modulación por Fases
  const startNarrative = () => {
    if (!audioSupported) {
      alert('Tu navegador no soporta síntesis de voz interactiva.');
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(true);

    // ==================== FASE 1: DRAMÁTICA ====================
    playDramaticGong();
    setCurrentPhase('DRAMATIC');
    const dramaticScript = 
      "Amigo conductor... analicemos la realidad que vives todos los días en la calle. " +
      "La Gasolina Especial está a cinco dólares con trece centavos por galón... " +
      "Pasas más de una hora atrapado en las trabazones de San Salvador, desgastando tu auto... " +
      "y pagando cien dólares semanales de alquiler del vehículo o cuota de financiamiento. " +
      "Y encima de todo ese sacrificio... ¿las otras aplicaciones te quitan hasta el veintiocho por ciento de comisión? " +
      "¡Hicimos los números de un viaje real de sesenta y seis minutos! " +
      "Tras pagar la comisión, la gasolina a cinco trece y la cuota del auto... " +
      "¡el chofer se llevó apenas setenta y un centavos a su casa! " +
      "¡Setenta y un centavos por más de una hora de tu vida! ¡Eso tiene que terminar hoy!";

    setActiveSpeechText("⚠️ Fase 1: La Cruda Realidad (Gasolina a $5.13 y comisiones que ahogan tu bolsillo)");

    const utt1 = new SpeechSynthesisUtterance(dramaticScript);
    utt1.lang = 'es-SV';
    utt1.rate = 0.88; // Cadencia lenta, deliberada y dramática
    utt1.pitch = 0.90; // Tono más grave y sombrío
    utt1.volume = 1.0;
    const voice1 = getBestSpanishVoice();
    if (voice1) utt1.voice = voice1;

    utt1.onend = () => {
      // Breve pausa dramática de 700ms antes de la explosión de euforia
      setTimeout(() => {
        // ==================== FASE 2: EUFÓRICA ====================
        playEuphoricChime();
        try {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.6 }
          });
        } catch {}

        setCurrentPhase('EUPHORIC');
        const euphoricScript = 
          "¡Pero aquí es donde cambia tu Destino! " +
          "¡Por eso nació Rumbo a mi Destino! " +
          "¡Escúchalo bien: CERO POR CIENTO DE COMISIÓN! ¡Cero! ¡Ni un solo centavo te quitamos! " +
          "Cada dólar que te pague el pasajero entra íntegro y limpio en efectivo a tu propia bolsa. " +
          "¡Y para darte la bienvenida al equipo, tu primera semana es completamente GRATIS, con cero cuota! " +
          "Protegemos tu tiempo con tarifas que compensan el tráfico y te damos un radar en vivo para encontrar la gasolina más barata. " +
          "¡El dinero que antes te quitaban ahora es para ti, para tu auto y para el futuro de tu familia! " +
          "¡Toma el control y regístrate hoy mismo!";

        setActiveSpeechText("🎉 Fase 2: ¡La Revolución Rumbo! 0% Comisión y 100% de Ganancia en tu Mano");

        const utt2 = new SpeechSynthesisUtterance(euphoricScript);
        utt2.lang = 'es-SV';
        utt2.rate = 1.08; // Ritmo ágil, lleno de optimismo y energía
        utt2.pitch = 1.15; // Tono brillante y eufórico
        utt2.volume = 1.0;
        const voice2 = getBestSpanishVoice();
        utt2.onend = () => {
          setTimeout(() => {
            // ==================== FASE 3: SOLEMNE / SERIEDAD & ALIANZA ====================
            setCurrentPhase('SOLEMN');
            const solemnScript = 
              "Y finalmente, un mensaje muy especial con absoluta seriedad: " +
              "Agradecemos profundamente tu paciencia y tu comprensión, ya que nuestra aplicación se encuentra en su fase inicial de lanzamiento. " +
              "Para consolidar esta alternativa y romper juntos las comisiones abusivas, te pedimos de corazón tu colaboración compartiendo los enlaces de Rumbo, tanto con viajeros para dinamizar tus carreras, como con otros conductores colegas. " +
              "Entre más crezcamos en las calles, más nos beneficiaremos todos. ¡Caminemos juntos hacia tu destino!";

            setActiveSpeechText("🤝 Fase 3: Mensaje Institucional (Paciencia en fase inicial e invitación a compartir enlaces)");

            const utt3 = new SpeechSynthesisUtterance(solemnScript);
            utt3.lang = 'es-SV';
            utt3.rate = 0.88; // Voz de seriedad, pausada y respetuosa
            utt3.pitch = 0.92; // Tono solemne y formal
            utt3.volume = 1.0;
            const voice3 = getBestSpanishVoice();
            if (voice3) utt3.voice = voice3;

            utt3.onend = () => {
              setIsPlaying(false);
              setCurrentPhase('IDLE');
              setActiveSpeechText('¡Gracias por tu apoyo! Comparte los enlaces oficiales con pasajeros y conductores.');
            };

            utt3.onerror = () => {
              setIsPlaying(false);
              setCurrentPhase('IDLE');
            };

            utteranceRef.current = utt3;
            window.speechSynthesis.speak(utt3);
          }, 800);
        };

        utt2.onerror = () => {
          setIsPlaying(false);
          setCurrentPhase('IDLE');
        };

        utteranceRef.current = utt2;
        window.speechSynthesis.speak(utt2);
      }, 700);
    };

    utt1.onerror = () => {
      setIsPlaying(false);
      setCurrentPhase('IDLE');
    };

    utteranceRef.current = utt1;
    window.speechSynthesis.speak(utt1);
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${
      currentPhase === 'DRAMATIC'
        ? 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/50 shadow-2xl shadow-rose-950/40'
        : currentPhase === 'EUPHORIC'
        ? 'bg-gradient-to-b from-amber-950/50 via-emerald-950/30 to-slate-950 border-emerald-400/60 shadow-2xl shadow-emerald-950/50'
        : currentPhase === 'SOLEMN'
        ? 'bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 border-sky-400/50 shadow-2xl shadow-sky-950/40'
        : 'bg-slate-900/90 border-slate-800'
    } p-5 sm:p-7 space-y-5 text-center`}>

      {/* Partículas y resplandor contextual */}
      {currentPhase === 'DRAMATIC' && (
        <div className="absolute inset-0 bg-rose-500/5 pointer-events-none animate-pulse" />
      )}
      {currentPhase === 'EUPHORIC' && (
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse" />
      )}
      {currentPhase === 'SOLEMN' && (
        <div className="absolute inset-0 bg-sky-500/10 pointer-events-none animate-pulse" />
      )}

      {/* 1. EL AVATAR CON GESTOS Y EXPRESIONES VIVAS */}
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
            <Volume2 className="w-4 h-4 animate-bounce" />
          </div>
        )}
      </div>

      {/* 2. TITULAR Y ESTADO NARRATIVO */}
      <div className="space-y-1.5 max-w-lg mx-auto">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${
          currentPhase === 'DRAMATIC'
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            : currentPhase === 'EUPHORIC'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : currentPhase === 'SOLEMN'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
        }`}>
          {currentPhase === 'DRAMATIC' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
          {currentPhase === 'EUPHORIC' && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
          {currentPhase === 'SOLEMN' && <HeartHandshake className="w-3.5 h-3.5 text-sky-400" />}
          {currentPhase === 'IDLE' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
          <span>
            {currentPhase === 'DRAMATIC'
              ? 'Tono Dramático: La Cruda Realidad de las Apps'
              : currentPhase === 'EUPHORIC'
              ? 'Tono Eufórico: La Victoria del Conductor con Rumbo'
              : currentPhase === 'SOLEMN'
              ? 'Voz de Seriedad: Alianza, Paciencia y Colaboración'
              : 'Avatar Asesor de Conductores'}
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-black text-white">
          {currentPhase === 'DRAMATIC' ? (
            <span className="text-rose-300">"¿Trabajar más de una hora para ganar $0.71 centavos limpios?"</span>
          ) : currentPhase === 'EUPHORIC' ? (
            <span className="text-emerald-300">"¡0% Comisión! Cada centavo del pasajero es 100% tuyo"</span>
          ) : currentPhase === 'SOLEMN' ? (
            <span className="text-sky-300">"Alianza Comunitaria: Gracias por tu Paciencia y Colaboración"</span>
          ) : (
            <span>Escucha el Mensaje que las Otras Apps No Quieren que Oigas</span>
          )}
        </h3>

        {activeSpeechText && (
          <p className="text-xs text-slate-300 font-medium px-4 py-2 bg-slate-950/80 rounded-xl border border-slate-800 animate-in fade-in-50">
            {activeSpeechText}
          </p>
        )}
      </div>

      {/* 3. ONDAS DE AUDIO SIMULADAS CUANDO ESTÁ HABLANDO */}
      {isPlaying && (
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

      {/* 4. BOTONES DE ACCIÓN PARA EL CONDUCTOR */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        {!isPlaying ? (
          <button
            onClick={startNarrative}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/40 flex items-center gap-2 cursor-pointer transition-transform transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Escuchar con Voz del Avatar (Dramática, Eufórica y Alianza)</span>
          </button>
        ) : (
          <button
            onClick={stopNarrative}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs flex items-center gap-2 cursor-pointer border border-rose-500/30"
          >
            <VolumeX className="w-4 h-4 text-rose-400" />
            <span>Detener Narración</span>
          </button>
        )}

        <button
          onClick={onStartRegistration}
          className="px-5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 hover:border-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>Ir Directo al Registro</span>
          <Award className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* 5. ENLACES COLABORATIVOS: PASAJEROS Y CONDUCTORES */}
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
              <span className="text-xs font-bold text-white">Enlace para Pasajeros</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleShareLink('passenger')}
                className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>Compartir</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyLink('passenger')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                title="Copiar"
              >
                {copiedLink === 'passenger' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Compartir a Conductores */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-white">Enlace para Conductores</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleShareLink('driver')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>Compartir</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyLink('driver')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                title="Copiar"
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
