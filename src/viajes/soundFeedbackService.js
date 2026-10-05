// soundFeedbackService.js
// Feedback psicológico y de accesibilidad sonoro y táctil para Rumbo (W3C / WCAG)
// Diseñado para personas con discapacidad visual y respuesta táctil inmediata (0ms de latencia)
// Generación mediante Web Audio API de alta presencia + Patrones de Vibración Háptica firmes

let audioCtx = null;

export const getAudioContext = () => {
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

export const resumeAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

/**
 * Vibración háptica contundente para máxima accesibilidad
 */
export const vibrate = (pattern = 70) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
};

/**
 * Sonido 1: Click/Pop mecánico nítido con presencia acústica real (Botones estándar)
 * Escuchable claramente en parlantes de teléfonos móviles, tabletas y audífonos
 */
export const playTapSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Cuerpo principal: caída percusiva nítida (880Hz -> 300Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.08);

    gain1.gain.setValueAtTime(0.65, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // 2. Transitorio de ataque de alta frecuencia para penetración acústica (1400Hz -> 500Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1400, now);
    osc2.frequency.exponentialRampToValueAtTime(500, now + 0.035);

    gain2.gain.setValueAtTime(0.45, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.09);
    osc2.start(now);
    osc2.stop(now + 0.045);
  } catch (err) {
    console.warn('[AudioFeedback] err:', err);
  }
};

/**
 * Feedback para botones generales:
 * Pulso háptico perceptible (70ms) + click audible
 */
export const triggerButtonFeedback = () => {
  vibrate(70);
  playTapSound();
};

/**
 * Feedback para botones de selección (Auto/Moto, Billetes, Tarifas rápidas, Mapa, Pasajeros):
 * Doble pulso háptico tipo trinquete [60ms, 40ms, 85ms] + doble tono musical ascendente ("bip-bip")
 */
export const triggerSelectionFeedback = () => {
  // Doble pulso háptico claramente palpable
  vibrate([60, 40, 85]);

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tono 1 (580Hz -> 760Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(580, now);
    osc1.frequency.exponentialRampToValueAtTime(760, now + 0.06);

    gain1.gain.setValueAtTime(0.60, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.07);

    // Tono 2 (880Hz -> 1180Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    const t2 = now + 0.075;
    osc2.frequency.setValueAtTime(880, t2);
    osc2.frequency.exponentialRampToValueAtTime(1180, t2 + 0.09);

    gain2.gain.setValueAtTime(0.70, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.095);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.10);
  } catch (err) {
    console.warn('[SelectionFeedback] err:', err);
  }
};

/**
 * Feedback psicológico contundente para "Buscar Conductor":
 * Vibración larga y rítmica reforzada [140ms vibración, 60ms pausa, 280ms vibración]
 * + Impacto grave de confirmación (Punch) y acorde triunfal ascendente
 */
export const triggerSearchLaunchFeedback = () => {
  // Secuencia de vibración contundente imposible de pasar por alto
  vibrate([140, 60, 280]);

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Golpe de bajos de confirmación (Sub-bass impact punch)
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(180, now);
    bass.frequency.exponentialRampToValueAtTime(60, now + 0.30);

    bassGain.gain.setValueAtTime(0.80, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.31);

    // 2. Acorde armónico ascendente de despegue (A4: 440, C#5: 554, E5: 659, A5: 880)
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const noteTime = now + (idx * 0.075);
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.75, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.30);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.32);
    });
  } catch (err) {
    console.warn('[SearchLaunchFeedback] err:', err);
  }
};

/**
 * Sonido 4: Caja Registradora / Moneda de Dólar Abonado ("Cha-Ching")
 * Sonido inconfundible de recompensa monetaria: gatillo mecánico + campana armónica metálica + tintineo de moneda
 */
export const playCashRegisterSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Gatillo mecánico de apertura de caja
    const click1 = ctx.createOscillator();
    const clickGain1 = ctx.createGain();
    click1.type = 'square';
    click1.frequency.setValueAtTime(800, now);
    click1.frequency.exponentialRampToValueAtTime(200, now + 0.04);
    clickGain1.gain.setValueAtTime(0.45, now);
    clickGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    click1.connect(clickGain1);
    clickGain1.connect(ctx.destination);
    click1.start(now);
    click1.stop(now + 0.05);

    // 2. Campana brillante metálica principal ("Ching" a 2093Hz - C7)
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    const bellTime = now + 0.055;
    bell.frequency.setValueAtTime(2093, bellTime);
    bellGain.gain.setValueAtTime(0.75, bellTime);
    bellGain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.85);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(bellTime);
    bell.stop(bellTime + 0.9);

    // 3. Armónico de campana superior (3136Hz - G7)
    const harmonic = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(3136, bellTime);
    harmonicGain.gain.setValueAtTime(0.4, bellTime);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.55);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(ctx.destination);
    harmonic.start(bellTime);
    harmonic.stop(bellTime + 0.6);

    // 4. Tintineo de moneda cayendo en la bandeja metálica
    const coin = ctx.createOscillator();
    const coinGain = ctx.createGain();
    coin.type = 'triangle';
    const coinTime = now + 0.12;
    coin.frequency.setValueAtTime(4186, coinTime); // C8
    coinGain.gain.setValueAtTime(0.45, coinTime);
    coinGain.gain.exponentialRampToValueAtTime(0.001, coinTime + 0.38);
    coin.connect(coinGain);
    coinGain.connect(ctx.destination);
    coin.start(coinTime);
    coin.stop(coinTime + 0.42);
  } catch (err) {
    console.warn('[CashRegisterSound] err:', err);
  }
};

/**
 * Feedback para acreditación de bonos y recompensas:
 * Vibración rítmica [80ms, 40ms, 120ms] + Sonido de caja registradora ("Cha-Ching")
 */
export const triggerCashRewardFeedback = () => {
  vibrate([80, 40, 120]);
  playCashRegisterSound();
};

/**
 * Sonido 5: Chime Ascendente de Micrófono Activo (Accesibilidad para Baja Visión)
 * Tono dual cristalino (750Hz -> 1050Hz) que notifica de inmediato: "El micrófono está escuchando"
 */
export const playListeningStartChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tono 1 (750Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(750, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.5, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.095);

    // Tono 2 (1050Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    const t2 = now + 0.07;
    osc2.frequency.setValueAtTime(1050, t2);
    gain2.gain.setValueAtTime(0, t2);
    gain2.gain.linearRampToValueAtTime(0.65, t2 + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.16);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.17);
  } catch (err) {
    console.warn('[ListeningStartChime] err:', err);
  }
};

export const triggerListeningStartFeedback = () => {
  vibrate([60, 30, 90]);
  playListeningStartChime();
};

/**
 * Sonido 6: Chime de Cierre de Micrófono / Captura Exitosa
 */
export const playListeningEndChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.1);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (err) {}
};

export const triggerListeningEndFeedback = () => {
  vibrate(50);
  playListeningEndChime();
};

/**
 * Sonido 7: Tono de Error de Micrófono o Dirección No Encontrada
 * Doble tono grave descendente para que el usuario con discapacidad visual sepa que no se capturó
 */
export const playListeningErrorChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);
  } catch (err) {}
};

export const triggerListeningErrorFeedback = () => {
  vibrate([120, 60, 120]);
  playListeningErrorChime();
};

