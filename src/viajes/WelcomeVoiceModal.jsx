import React, { useState } from 'react';
import {
  MapPin,
  Mic,
  Volume2,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
  Accessibility
} from 'lucide-react';
import { unlockAudioAndSpeech, requestMicrophonePermission, speakAssistantMessage } from './voiceAssistantService';

/**
 * Modal Unificado de Bienvenida y Permisos (GPS + Micrófono/Audio)
 * Diseñado con estándares W3C/WCAG 2.1 AA para máxima accesibilidad y soporte TalkBack / VoiceOver.
 * Addendums 14, 15 y 16.
 */
export default function WelcomeVoiceModal({
  isOpen,
  onComplete,
  reverseGeocodeAddress
}) {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [stepStatus, setStepStatus] = useState(''); // Estado informativo para lectores de pantalla

  // Flujo Principal: User Gesture para desbloquear AudioContext + GPS + Micrófono
  const handleStartWithVoiceAssistant = async () => {
    setIsLoading(true);
    setStepStatus('Iniciando sistema de audio y solicitando permisos...');

    // 1. DESBLOQUEO CRÍTICO DE AUDIO EN EL USER GESTURE (Click/Tap)
    unlockAudioAndSpeech();

    let obtainedCoords = null;
    let obtainedAddress = 'Mi Ubicación';

    // 2. SOLICITAR GPS (Primer orden de permisos nativos)
    try {
      setStepStatus('Obteniendo ubicación satelital...');
      const gpsPosition = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalización no soportada'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 9000,
          enableHighAccuracy: true
        });
      });

      if (gpsPosition && gpsPosition.coords) {
        obtainedCoords = {
          lat: gpsPosition.coords.latitude,
          lng: gpsPosition.coords.longitude
        };
        if (reverseGeocodeAddress) {
          obtainedAddress = await reverseGeocodeAddress(
            gpsPosition.coords.latitude,
            gpsPosition.coords.longitude
          );
        }
      }
    } catch (gpsErr) {
      console.warn('[WelcomeModal] Aviso GPS:', gpsErr.message);
      // Fallback a San Salvador si se rechaza o expira
      obtainedCoords = { lat: 13.7013, lng: -89.2244 };
      obtainedAddress = 'San Salvador, El Salvador';
    }

    // 3. SOLICITAR MICRÓFONO / AUDIO (Segundo orden)
    let micGranted = false;
    try {
      setStepStatus('Activando micrófono para dictado...');
      micGranted = await requestMicrophonePermission();
    } catch (micErr) {
      console.warn('[WelcomeModal] Aviso Micrófono:', micErr.message);
      micGranted = false;
    }

    // 4. GUARDAR PERSISTENCIA EN LOCALSTORAGE
    try {
      localStorage.setItem('rumbo_welcome_completed', 'true');
      localStorage.setItem('rumbo_assistant_mode', micGranted ? 'voice' : 'visual');
    } catch {}

    // 5. SALUDO DE VOZ DEL AVATAR (Addendum 15) SI SE CONCEDIÓ MICRÓFONO
    if (micGranted) {
      setStepStatus('Asistente de voz activado con éxito.');
      speakAssistantMessage(
        'Hola, te saluda tu asistente de viaje. Puedes decirme a dónde deseas ir o escribir tu destino.'
      );
    }

    setIsLoading(false);
    onComplete({
      voiceEnabled: micGranted,
      coords: obtainedCoords,
      address: obtainedAddress
    });
  };

  // Flujo Secundario: Modo Visual / Táctil (Degradación Suave)
  const handleContinueVisualOnly = async () => {
    setIsLoading(true);
    setStepStatus('Configurando modo visual...');

    let obtainedCoords = null;
    let obtainedAddress = 'Mi Ubicación';

    // Se solicita únicamente GPS para cumplir con la detección obligatoria de conductores
    try {
      const gpsPosition = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalización no soportada'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          enableHighAccuracy: true
        });
      });

      if (gpsPosition && gpsPosition.coords) {
        obtainedCoords = {
          lat: gpsPosition.coords.latitude,
          lng: gpsPosition.coords.longitude
        };
        if (reverseGeocodeAddress) {
          obtainedAddress = await reverseGeocodeAddress(
            gpsPosition.coords.latitude,
            gpsPosition.coords.longitude
          );
        }
      }
    } catch (gpsErr) {
      obtainedCoords = { lat: 13.7013, lng: -89.2244 };
      obtainedAddress = 'San Salvador, El Salvador';
    }

    // Persistencia: Guardar modo visual (standby para voz)
    try {
      localStorage.setItem('rumbo_welcome_completed', 'true');
      localStorage.setItem('rumbo_assistant_mode', 'visual');
    } catch {}

    setIsLoading(false);
    onComplete({
      voiceEnabled: false,
      coords: obtainedCoords,
      address: obtainedAddress
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      aria-describedby="welcome-modal-desc"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 space-y-5 max-h-[94vh] overflow-y-auto">
        
        {/* Cabecera Accesible */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
            <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Accesibilidad Universal & Movilidad Directa</span>
          </div>

          <h2
            id="welcome-modal-title"
            className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug"
          >
            Bienvenido a tu plataforma de viajes
          </h2>

          <p
            id="welcome-modal-desc"
            className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto"
          >
            Para conectarte con conductores cercanos en tiempo real y ofrecerte la mejor experiencia adaptada a ti, requerimos los siguientes permisos:
          </p>
        </div>

        {/* Tarjetas Informativas de Permisos (Alto Contraste WCAG) */}
        <div className="space-y-3" role="list">
          
          {/* Permiso A: Ubicación GPS */}
          <div
            className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-start gap-3.5 transition-colors hover:border-slate-700"
            role="listitem"
          >
            <div
              className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold flex-shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Ubicación (GPS)</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Esencial
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Necesaria para detectar conductores a menos de 1 km y fijar tu punto de recogida exacto para que no gastes tiempo ni dinero extra.
              </p>
            </div>
          </div>

          {/* Permiso B: Asistente de Voz (Micrófono y Audio) */}
          <div
            className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-start gap-3.5 transition-colors hover:border-slate-700"
            role="listitem"
          >
            <div
              className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold flex-shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <Mic className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Asistente de Voz (Micrófono y Audio)</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Accesible
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Diseñado para personas con dificultad visual o que prefieran pedir su viaje dictando por voz sin tener que teclear.
              </p>
            </div>
          </div>

        </div>

        {/* Estado para lectores de pantalla en vivo */}
        {stepStatus && (
          <div
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {stepStatus}
          </div>
        )}

        {/* Botones de Acción Accesibles (Área táctil >= 48px de altura) */}
        <div className="space-y-3 pt-2">
          
          {/* Botón Principal: Comenzar y Activar Asistente */}
          <button
            type="button"
            onClick={handleStartWithVoiceAssistant}
            disabled={isLoading}
            aria-label="Comenzar y activar asistente de voz y ubicación"
            className="w-full min-h-[50px] py-3.5 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-lime-400 hover:from-amber-400 hover:to-lime-300 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" aria-hidden="true" />
                <span>CONFIGURANDO ACCESIBILIDAD...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                <span>COMENZAR Y ACTIVAR ASISTENTE</span>
              </>
            )}
          </button>

          {/* Enlace Secundario: Modo Visual / Táctil */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleContinueVisualOnly}
              disabled={isLoading}
              aria-label="Continuar solo en modo visual o táctil sin asistente de voz"
              className="min-h-[44px] py-2 px-4 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none disabled:opacity-50"
            >
              Continuar solo en modo visual / táctil
            </button>
          </div>

        </div>

        {/* Nota de Privacidad y Resiliencia */}
        <p className="text-[11px] text-center text-slate-500 pt-1">
          Tus datos de ubicación y voz no son grabados ni compartidos con terceros. Se usan únicamente para coordinar tu viaje.
        </p>

      </div>
    </div>
  );
}
