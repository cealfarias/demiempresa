// soundFeedbackService.js
// Feedback psicológico sonoro y táctil (Web Audio API + navigator.vibrate) para Rumbo
// Generación de audio sintetizado sin latencia y sin dependencias externas

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Vibración táctil resiliente
 */
export const vibrate = (pattern = 20) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
};

/**
 * Sonido sutil de micro-tap para botones generales
 */
export const playTapSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {}
};

/**
 * Feedback estándar en cada botón: sonido táctil y micro-vibración
 */
export const triggerButtonFeedback = () => {
  vibrate(22);
  playTapSound();
};

/**
 * Feedback para botones de selección (Auto/Moto, Billetes, Tarifas rápidas, Mapa)
 */
export const triggerSelectionFeedback = () => {
  vibrate(30);
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  } catch {}
};

/**
 * Feedback psicológico extendido para el botón principal "Buscar Conductor":
 * Vibración más larga y contundente + acorde musical ascendente de despegue
 */
export const triggerSearchLaunchFeedback = () => {
  // Vibración más larga: patrón rítmico reforzado [80ms vibración, 40ms pausa, 140ms vibración]
  vibrate([80, 40, 140]);

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Arpegio armónico ascendente de despegue / conexión con conductores
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const noteTime = now + (idx * 0.065);
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.22, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.26);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.27);
    });
  } catch {}
};
