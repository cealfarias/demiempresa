// voiceAssistantService.js
// Servicio de Accesibilidad por Voz (WCAG / W3C): Síntesis de voz y Reconocimiento de voz para pasajeros
// Conversational Voice Agent para Addendums 14, 15 y 16

let activeAudioContext = null;
let activeRecognition = null;

/**
 * Desbloquea de forma inmediata el contexto de audio y síntesis
 * dentro del User Gesture obligatorio del navegador (click / tap).
 */
export const unlockAudioAndSpeech = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !activeAudioContext) {
      activeAudioContext = new AudioContextClass();
    }
    if (activeAudioContext && activeAudioContext.state === 'suspended') {
      activeAudioContext.resume().catch(() => {});
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const silentWarmUp = new SpeechSynthesisUtterance('');
      silentWarmUp.volume = 0;
      window.speechSynthesis.speak(silentWarmUp);
    }
  } catch (err) {
    console.warn('[AudioContext] Pre-warm notice:', err);
  }
};

/**
 * Detiene cualquier voz en reproducción
 */
export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
};

/**
 * Detiene la escucha activa del micrófono
 */
export const stopVoiceDictation = () => {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {}
    activeRecognition = null;
  }
};

/**
 * Reproduce el mensaje del Asistente de Viaje y ejecuta onEnd al terminar.
 * IMPORTANTE: Apaga el micrófono mientras habla para evitar retroalimentación (eco).
 */
export const speakAssistantMessage = (message, onEnd, onStart) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    // 1. Apagar micrófono para que no se auto-escuche
    stopVoiceDictation();

    // 2. Destrabar sintetizador si está en pausa (bug común de Chrome/Edge)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-SV';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(
          v => v.lang === 'es-SV' || v.lang === 'es_SV' || v.lang.startsWith('es-419') || v.lang.startsWith('es-MX') || v.lang.startsWith('es')
        );
        if (esVoice) {
          utterance.voice = esVoice;
        }

        let hasEnded = false;
        utterance.onstart = () => {
          if (onStart) onStart();
        };
        const handleDone = () => {
          if (hasEnded) return;
          hasEnded = true;
          if (onEnd) {
            setTimeout(() => {
              onEnd();
            }, 250);
          }
        };

        utterance.onend = handleDone;
        utterance.onerror = (e) => {
          console.warn('[SpeechSynthesis] Error en locución:', e);
          handleDone();
        };

        // Resguardo temporal contra congelamiento de síntesis en Chromium
        const safetyTimer = setTimeout(() => {
          if (!hasEnded) {
            handleDone();
          }
        }, Math.max(message.length * 85, 2500));

        let keepAliveTimer = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(keepAliveTimer);
          } else {
            window.speechSynthesis.resume();
          }
        }, 300);

        const originalHandleDone = handleDone;
        utterance.onend = () => {
          clearInterval(keepAliveTimer);
          clearTimeout(safetyTimer);
          originalHandleDone();
        };

        window.speechSynthesis.speak(utterance);

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (innerErr) {
        console.warn('[SpeechSynthesis] Error al emitir:', innerErr);
        if (onEnd) onEnd();
      }
    };

    let hasSpoken = false;
    const triggerOnce = () => {
      if (hasSpoken) return;
      hasSpoken = true;
      doSpeak();
    };

    const currentVoices = window.speechSynthesis.getVoices();
    if (currentVoices.length === 0 && 'onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        triggerOnce();
      };
      setTimeout(triggerOnce, 180);
    } else {
      triggerOnce();
    }
  } catch (err) {
    console.warn('[SpeechSynthesis] Error al reproducir voz:', err);
    if (onEnd) onEnd();
  }
};

/**
 * Solicita permiso nativo de micrófono
 */
export const requestMicrophonePermission = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.warn('[Microphone] Permiso denegado o no disponible:', err);
    return false;
  }
};

/**
 * Inicializa y escucha comandos de voz por dictado
 */
export const startVoiceDictation = ({ onResult, onListeningChange, onError }) => {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    if (onError) onError('Tu navegador no soporta dictado por voz.');
    return null;
  }

  try {
    if (activeRecognition) {
      activeRecognition.stop();
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'es-SV'; // Español El Salvador / es-419
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (onListeningChange) onListeningChange(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult && transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition] Error:', event.error);
      if (onListeningChange) onListeningChange(false);
      if (onError) onError(event.error);
    };

    recognition.onend = () => {
      if (onListeningChange) onListeningChange(false);
    };

    recognition.start();
    activeRecognition = recognition;
    return recognition;
  } catch (err) {
    console.warn('[SpeechRecognition] Fallo al iniciar:', err);
    if (onListeningChange) onListeningChange(false);
    if (onError) onError(err.message);
    return null;
  }
};

/**
 * Función compuesta: Habla un mensaje y, al terminar de hablar,
 * enciende automáticamente el micrófono para escuchar la respuesta del pasajero.
 */
export const speakAndThenListen = (message, { onResult, onListeningChange, onError, onStart }) => {
  unlockAudioAndSpeech();
  speakAssistantMessage(
    message,
    () => {
      startVoiceDictation({
        onResult,
        onListeningChange,
        onError
      });
    },
    onStart
  );
};

/**
 * Extractor inteligente de números hablados en español salvadoreño
 * E.g. "tres dólares", "3.50", "dos con cincuenta", "cuatro", "un"
 */
export const parseNumberFromSpanish = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // 1. Números arábigos directos: "$3.50", "2,50", "4"
  const digitMatch = lower.match(/\$?\s*(\d+(?:[\.,]\d+)?)/);
  if (digitMatch) {
    return parseFloat(digitMatch[1].replace(',', '.'));
  }

  // 2. Números en palabras
  const wordMap = {
    'un': 1, 'uno': 1, 'una': 1,
    'dos': 2,
    'tres': 3,
    'cuatro': 4,
    'cinco': 5,
    'seis': 6,
    'siete': 7,
    'ocho': 8,
    'nueve': 9,
    'diez': 10
  };

  for (const [word, val] of Object.entries(wordMap)) {
    const reg = new RegExp(`\\b${word}\\b`, 'i');
    if (reg.test(lower)) {
      if (/cincuenta|medio|y medio|con cincuenta/.test(lower)) {
        return val + 0.50;
      }
      if (/veinticinco|con veinticinco/.test(lower)) {
        return val + 0.25;
      }
      if (/setenta y cinco/.test(lower)) {
        return val + 0.75;
      }
      return val;
    }
  }

  return null;
};

/**
 * Clasificador de intenciones conversacionales para Rumbo
 */
export const classifyUserVoiceIntent = (text) => {
  if (!text) return { type: 'UNKNOWN', raw: '' };
  const lower = text.toLowerCase().trim();

  // Intención de confirmación positiva: "sí", "claro", "dale", "buscar conductor", etc.
  if (/\b(s[ií]|claro|por favor|dale|buscar|b[uú]sca|b[uú]scalo|afirmativo|de acuerdo|va|ok|bueno|perfecto|adelante|listo|ya|s[ií] por favor)\b/i.test(lower)) {
    // Si además menciona cambiar algo explícito en la misma frase:
    if (/\b(pero cambia|pero pon|con aire|sin aire|mascota)\b/i.test(lower)) {
      // cae en ajustes
    } else {
      return { type: 'CONFIRM_SEARCH', raw: text };
    }
  }

  // Intención negativa: "no", "espera", "todavía no", "detente", "cancelar"
  if (/\b(no|espera|todav[ií]a no|a[uú]n no|detente|para|esp[eé]rate|no todav[ií]a|no quiero|cancelar)\b/i.test(lower)) {
    return { type: 'DECLINE_SEARCH', raw: text };
  }

  // Ajuste de Tarifa / Precio
  if (/\b(tarifa|precio|cuota|d[oó]lar|d[oó]lares|plata|cobro|costo)\b/i.test(lower)) {
    const amount = parseNumberFromSpanish(lower);
    return { type: 'CHANGE_FARE', amount, raw: text };
  }

  // Ajuste de Pasajeros
  if (/\b(pasajero|pasajeros|persona|personas|vamos|somos|gente|cupo)\b/i.test(lower)) {
    const count = parseNumberFromSpanish(lower) || 2;
    return { type: 'CHANGE_PASSENGERS', count: Math.min(6, Math.max(1, Math.round(count))), raw: text };
  }

  // Ajuste de Aire Acondicionado
  if (/\b(aire|clima|ac|acondicionado|fr[ií]o)\b/i.test(lower)) {
    const enabled = !/\b(sin|apaga|quitar|no quiero|sin aire)\b/i.test(lower);
    return { type: 'CHANGE_AC', enabled, raw: text };
  }

  // Ajuste de Mascotas
  if (/\b(mascota|mascotas|perro|perrita|perrito|gato|gatito|animal)\b/i.test(lower)) {
    const enabled = !/\b(sin|no llevo|no traigo|quitar)\b/i.test(lower);
    return { type: 'CHANGE_PETS', enabled, raw: text };
  }

  // Ajuste de Equipaje
  if (/\b(equipaje|maleta|maletas|bulto|bultos|carga|ba[uú]l)\b/i.test(lower)) {
    const enabled = !/\b(sin|no llevo|quitar)\b/i.test(lower);
    return { type: 'CHANGE_LUGGAGE', enabled, raw: text };
  }

  // Ajuste de Tipo de Transporte: Auto / Carro vs Moto
  if (/\b(en moto|moto|motocicleta|mototaxi|en mototaxi)\b/i.test(lower)) {
    return { type: 'CHANGE_TRANSPORT', transportType: 'MOTO', raw: text };
  }
  if (/\b(en carro|carro|en auto|auto|autom[oó]vil|veh[ií]culo)\b/i.test(lower)) {
    return { type: 'CHANGE_TRANSPORT', transportType: 'CAR', raw: text };
  }

  // Si dice directamente una cifra: ej. "3 dólares", "4", "2.50"
  const standaloneAmount = parseNumberFromSpanish(lower);
  if (standaloneAmount !== null && standaloneAmount > 0) {
    return { type: 'STANDALONE_NUMBER', amount: standaloneAmount, raw: text };
  }

  return { type: 'GENERAL_SPEECH', raw: text };
};
