import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Share2, Sparkles, X, ArrowRight, CheckCircle2, MessageCircle, DollarSign, Users, Award } from 'lucide-react';
import { sendTelemetryEventApi } from './api';

export default function ExitIntentRescueModal({
  isOpenExternal,
  onCloseExternal,
  role = 'PASSENGER', // 'PASSENGER' | 'DRIVER'
  userProfile = null,
  onOpenRegister = () => {},
  onOpenReferral = () => {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generar enlace viral de referencia
  const referralCode = userProfile?.referralCode || userProfile?.dui?.replace(/\D/g, '') || '50VIAJES';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://viajes.demiempresa.online';
  const referralShareUrl = `${siteUrl}${role === 'DRIVER' ? '/conductor' : ''}?ref=${referralCode}`;

  const viralMessage = `🚗 *¡Gana más de $50 en viajes gratis con Rumbo a mi Destino!* 🎁\n\nEstán regalando *$2.00 USD de bienvenida* y *$2.00 USD por cada amigo que invites* durante su prelanzamiento en El Salvador.\n\n👉 Inscríbete aquí antes de que se agoten los primeros 100 cupos:\n${referralShareUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(viralMessage)}`;

  // Función para abrir el modal de rescate
  const triggerRescueModal = useCallback(() => {
    // Si ya se mostró en esta sesión, no ser invasivo
    if (typeof window !== 'undefined' && sessionStorage.getItem('rumbo_exit_intent_shown') === 'true') {
      return;
    }

    setIsOpen(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('rumbo_exit_intent_shown', 'true');
    }

    // Registrar en telemetría
    sendTelemetryEventApi({
      eventType: 'EXIT_INTENT_SHOWN',
      role,
      metadata: { referrer: typeof document !== 'undefined' ? document.referrer : '', path: window.location.pathname }
    });
  }, [role]);

  // Listener de Exit-Intent en Computadora (Mouse sale hacia la barra de pestañas / cerrar)
  useEffect(() => {
    const handleMouseLeave = (e) => {
      // Disparar si el puntero sube hacia arriba (e.clientY <= 20)
      if (e.clientY <= 20) {
        triggerRescueModal();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [triggerRescueModal]);

  // Listener para Celulares Móviles (inactividad o botón atrás)
  useEffect(() => {
    let inactivityTimer;

    // Disparar si pasa más de 20 segundos leyendo sin interactuar
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        triggerRescueModal();
      }, 25000);
    };

    resetTimer();
    window.addEventListener('scroll', resetTimer, { passive: true });
    window.addEventListener('touchstart', resetTimer, { passive: true });

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [triggerRescueModal]);

  // Soporte para apertura controlada externamente
  useEffect(() => {
    if (typeof isOpenExternal === 'boolean') {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  const handleClose = (reason = 'DISMISSED') => {
    setIsOpen(false);
    if (onCloseExternal) onCloseExternal();

    sendTelemetryEventApi({
      eventType: reason === 'CONVERT_REGISTER' ? 'EXIT_INTENT_CONVERTED_REGISTER' :
                 reason === 'CONVERT_WHATSAPP' ? 'EXIT_INTENT_CONVERTED_WHATSAPP' : 'EXIT_INTENT_DISMISSED',
      role,
      metadata: { reason }
    });
  };

  const handleRegisterAction = () => {
    handleClose('CONVERT_REGISTER');
    if (userProfile?.id) {
      if (onOpenReferral) onOpenReferral();
    } else {
      if (onOpenRegister) onOpenRegister();
    }
  };

  const handleWhatsAppAction = () => {
    sendTelemetryEventApi({
      eventType: 'EXIT_INTENT_CONVERTED_WHATSAPP',
      role,
      metadata: { referralCode }
    });
    window.open(whatsappShareUrl, '_blank');
    handleClose('CONVERT_WHATSAPP');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 space-y-5 my-auto overflow-hidden">
        
        {/* Destello decorativo de fondo */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botón Cerrar Discreto */}
        <button
          type="button"
          onClick={() => handleClose('CLOSE_ICON')}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabecera del Gancho */}
        <div className="text-center space-y-2 pt-1 relative">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 text-3xl font-black transform animate-bounce">
            🎁
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fase de Prelanzamiento El Salvador</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            ¡Espera! Puedes ganar más de <span className="text-amber-400 font-mono underline decoration-amber-400/50 decoration-wavy">$50.00</span> en viajes
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Te diremos cómo: te premiamos con saldo real en tu billetera.
          </p>
        </div>

        {/* Los 3 Puntos Matemáticos de la Promoción */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5 text-xs text-slate-200">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              ✓
            </div>
            <span>
              <strong>$2.00 USD de Bienvenida</strong> acreditados hoy en tu cuenta (cupo primeros 100).
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              ✓
            </div>
            <span>
              <strong>$2.00 USD por cada amigo</strong> que refieras con tu enlace personal.
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              ✓
            </div>
            <span className="text-emerald-300 font-semibold">
              ¡Invita a 25 amigos y acumulas <strong>más de $50.00 GRATIS</strong> para viajar en El Salvador!
            </span>
          </div>
        </div>

        {/* Botones Principales de Acción */}
        <div className="space-y-2.5 pt-1">
          {/* BOTÓN 1: Obtener Mi Enlace y Registrarme Ahora */}
          <button
            type="button"
            onClick={handleRegisterAction}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 transition-transform active:scale-95"
          >
            <span>🚀 OBTENER MI ENLACE Y REGISTRARME AHORA</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* BOTÓN 2: Compartir Promo por WhatsApp Directo */}
          <button
            type="button"
            onClick={handleWhatsAppAction}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>📲 Compartir Promo por WhatsApp Directo</span>
          </button>
        </div>

        {/* Descarte Discreto */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => handleClose('DISMISS_LINK')}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            ✕ No gracias, prefiero pagar mis viajes completos
          </button>
        </div>

      </div>
    </div>
  );
}
