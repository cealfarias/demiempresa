// voiceAssistantService.js
// Servicio de Accesibilidad por Voz (WCAG / W3C): Síntesis de voz y Reconocimiento de voz para pasajeros

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
      // Disparo de utterance en blanco para precalentar el motor de voz en iOS Safari y Android Chrome
      const silentWarmUp = new SpeechSynthesisUtterance('');
      silentWarmUp.volume = 0;
      window.speechSynthesis.speak(silentWarmUp);
    }
  } catch (err) {
    console.warn('[AudioContext] Pre-warm notice:', err);
  }
};

/**
 * Reproduce el saludo accesible del Asistente de Viaje (Addendum 15)
 */
export const speakAssistantMessage = (message, onEnd) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Detener cualquier locución en curso

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'es-419'; // Español neutro / latinoamericano
    utterance.rate = 1.02; // Cadencia natural y comprensible
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Buscar una voz natural en español si está disponible
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') || v.lang.includes('es-'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[SpeechSynthesis] Error al reproducir voz:', err);
    if (onEnd) onEnd();
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
 * Solicita permiso nativo de micrófono
 */
export const requestMicrophonePermission = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Detener tracks inmediatamente tras confirmar permiso
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

export const stopVoiceDictation = () => {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {}
    activeRecognition = null;
  }
};
