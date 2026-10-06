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
 * Comprueba si el navegador actual soporta la API de reconocimiento de voz
 */
export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
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
 * Compatible con iOS Safari (webkitSpeechRecognition) y Google Chrome (Android & Desktop)
 */
export const startVoiceDictation = ({ onResult, onListeningChange, onError, lang = 'es-419' }) => {
  const SpeechRecognitionClass = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  if (!SpeechRecognitionClass) {
    if (onListeningChange) onListeningChange(false);
    if (onError) onError('UNSUPPORTED_BROWSER', 'Tu navegador no soporta reconocimiento de voz. Te sugerimos abrir la web en Google Chrome o Safari.');
    return null;
  }

  try {
    // 1. Detener de manera segura cualquier reconocimiento previo
    if (activeRecognition) {
      try {
        activeRecognition.onstart = null;
        activeRecognition.onresult = null;
        activeRecognition.onerror = null;
        activeRecognition.onend = null;
        activeRecognition.abort();
      } catch {}
      activeRecognition = null;
    }

    const recognition = new SpeechRecognitionClass();
    
    // Configurar idioma universalmente soportado en iOS y Android:
    // Apple Safari rechaza 'es-SV', pero soporta perfectamente 'es-419' o 'es-MX'.
    recognition.lang = lang || 'es-419';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let hasReceivedResult = false;

    recognition.onstart = () => {
      if (onListeningChange) onListeningChange(true);
    };

    recognition.onresult = (event) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = (event.results[0][0].transcript || '').trim();
        if (transcript) {
          hasReceivedResult = true;
          if (onResult) {
            onResult(transcript);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      const errType = event.error || 'unknown';
      console.warn('[SpeechRecognition] Error capturado:', errType);
      if (onListeningChange) onListeningChange(false);

      let userMsg = 'No logré escucharte con claridad.';
      if (errType === 'not-allowed') {
        userMsg = 'El acceso al micrófono fue bloqueado en tu navegador. Por favor permite el micrófono para dictar tu ubicación.';
      } else if (errType === 'no-speech') {
        userMsg = 'No se detectó voz. Toca nuevamente el micrófono y di tu rumbo.';
      } else if (errType === 'audio-capture') {
        userMsg = 'No se encontró ningún micrófono conectado o disponible en tu dispositivo.';
      } else if (errType === 'network') {
        userMsg = 'Hubo un error de conexión con el servicio de reconocimiento de voz.';
      }

      if (onError) onError(errType, userMsg);
    };

    recognition.onend = () => {
      if (onListeningChange) onListeningChange(false);
      activeRecognition = null;
    };

    recognition.start();
    activeRecognition = recognition;
    return recognition;
  } catch (err) {
    console.warn('[SpeechRecognition] Fallo al iniciar:', err);
    if (onListeningChange) onListeningChange(false);
    if (onError) onError('START_FAILED', err.message || 'No se pudo activar el micrófono.');
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
 * Normaliza texto hablado: minúsculas, remueve tildes y signos de puntuación
 */
export const normalizeVoiceText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Clasificador de intenciones conversacionales para Rumbo
 */
export const classifyUserVoiceIntent = (text) => {
  if (!text) return { type: 'UNKNOWN', raw: '' };
  const norm = normalizeVoiceText(text);
  if (!norm) return { type: 'UNKNOWN', raw: '' };
  const padded = ' ' + norm + ' ';

  // 1. Intención negativa: "no", "espera", "todavía no", "detente", "cancelar"
  if (/(^|\s)(no|espera|todavia no|aun no|detente|para|esperate|no todavia|no quiero|cancelar)(\s|$)/i.test(padded)) {
    return { type: 'DECLINE_SEARCH', raw: text };
  }

  // 2. Intención de confirmación positiva: "sí", "claro", "dale", "buscar conductor", "búscalo", etc.
  if (
    /(^|\s)(si|claro|por favor|dale|dale pues|buscar|busca|buscalo|buscale|buscame|buscar conductor|busca conductor|buscame un conductor|afirmativo|de acuerdo|va|vaya|ok|okay|bueno|perfecto|adelante|listo|ya|simon|aja|correcto|asi es|si quiero|si claro|si dale|si por favor)(\s|$)/i.test(
      padded
    )
  ) {
    // Si además menciona cambiar algo explícito en la misma frase:
    if (/(^|\s)(pero cambia|pero pon|con aire|sin aire|mascota|otra tarifa)(\s|$)/i.test(padded)) {
      // cae en ajustes posteriores
    } else {
      return { type: 'CONFIRM_SEARCH', raw: text };
    }
  }

  // 3. Ajuste de Tarifa / Precio
  if (/(^|\s)(tarifa|precio|cuota|dolar|dolares|plata|cobro|costo)(\s|$)/i.test(padded)) {
    const amount = parseNumberFromSpanish(norm);
    return { type: 'CHANGE_FARE', amount, raw: text };
  }

  // 4. Ajuste de Pasajeros
  if (/(^|\s)(pasajero|pasajeros|persona|personas|vamos|somos|gente|cupo)(\s|$)/i.test(padded)) {
    const count = parseNumberFromSpanish(norm) || 2;
    return { type: 'CHANGE_PASSENGERS', count: Math.min(6, Math.max(1, Math.round(count))), raw: text };
  }

  // 5. Ajuste de Aire Acondicionado
  if (/(^|\s)(aire|clima|ac|acondicionado|frio)(\s|$)/i.test(padded)) {
    const enabled = !/(^|\s)(sin|apaga|quitar|no quiero|sin aire)(\s|$)/i.test(padded);
    return { type: 'CHANGE_AC', enabled, raw: text };
  }

  // 6. Ajuste de Mascotas
  if (/(^|\s)(mascota|mascotas|perro|perrita|perrito|gato|gatito|animal)(\s|$)/i.test(padded)) {
    const enabled = !/(^|\s)(sin|no llevo|no traigo|quitar)(\s|$)/i.test(padded);
    return { type: 'CHANGE_PETS', enabled, raw: text };
  }

  // 7. Ajuste de Equipaje
  if (/(^|\s)(equipaje|maleta|maletas|bulto|bultos|carga|baul)(\s|$)/i.test(padded)) {
    const enabled = !/(^|\s)(sin|no llevo|quitar)(\s|$)/i.test(padded);
    return { type: 'CHANGE_LUGGAGE', enabled, raw: text };
  }

  // 8. Ajuste de Tipo de Transporte: Auto / Carro vs Moto
  if (/(^|\s)(en moto|moto|motocicleta|mototaxi|en mototaxi)(\s|$)/i.test(padded)) {
    return { type: 'CHANGE_TRANSPORT', transportType: 'MOTO', raw: text };
  }
  if (/(^|\s)(en carro|carro|en auto|auto|automovil|vehiculo)(\s|$)/i.test(padded)) {
    return { type: 'CHANGE_TRANSPORT', transportType: 'CAR', raw: text };
  }

  // 9. Ajuste de Ida y Vuelta / Viaje Redondo
  if (/(^|\s)(ida y vuelta|viaje redondo|con regreso|de regreso|redondo|y vuelta|con vuelta|vuelta)(\s|$)/i.test(padded)) {
    const enabled = !/(^|\s)(solo ida|sin regreso|quitar vuelta|no redondo|sin vuelta)(\s|$)/i.test(padded);
    return { type: 'CHANGE_ROUND_TRIP', enabled, raw: text };
  }

  // 10. Ajuste de Tipo de Servicio: Pasajero vs Encomienda / Paquete
  if (/(^|\s)(paquete|paquetes|encomienda|encomiendas|entrega|envio|mandado|paqueteria)(\s|$)/i.test(padded)) {
    return { type: 'CHANGE_SERVICE', serviceType: 'PACKAGE', raw: text };
  }
  if (/(^|\s)(pasajero|pasajeros|viaje de pasajero|viajar)(\s|$)/i.test(padded) && !/(^|\s)(cuantos pasajeros|cantidad|somos)(\s|$)/i.test(padded)) {
    return { type: 'CHANGE_SERVICE', serviceType: 'PASSENGER', raw: text };
  }

  // 11. Si dice directamente una cifra: ej. "3 dólares", "4", "2.50"
  const standaloneAmount = parseNumberFromSpanish(norm);
  if (standaloneAmount !== null && standaloneAmount > 0) {
    return { type: 'STANDALONE_NUMBER', amount: standaloneAmount, raw: text };
  }

  return { type: 'GENERAL_SPEECH', raw: text };
};
