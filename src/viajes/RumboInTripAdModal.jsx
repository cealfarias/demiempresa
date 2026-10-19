import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  X,
  ExternalLink,
  MessageCircle,
  Phone,
  Tag,
  Copy,
  Check,
  Sparkles,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { trackAdInteractionApi } from './api';

export default function RumboInTripAdModal({ isOpen, onClose, ad, tripId, userId }) {
  const [countdown, setCountdown] = useState(5);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [canClose, setCanClose] = useState(false);

  // Registro de impresión y contador de seguridad
  useEffect(() => {
    if (isOpen && ad?.id) {
      trackAdInteractionApi({
        creativeId: ad.id,
        action: 'IMPRESSION',
        tripId,
        userId
      });

      setCountdown(5);
      setCanClose(false);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanClose(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, ad?.id, tripId, userId]);

  if (!isOpen || !ad) return null;

  const handleCtaClick = () => {
    trackAdInteractionApi({
      creativeId: ad.id,
      action: 'CLICK',
      tripId,
      userId
    });

    if (ad.whatsapp) {
      const cleanPhone = ad.whatsapp.replace(/[^0-9]/g, '');
      const finalPhone = cleanPhone.startsWith('503') ? cleanPhone : '503' + cleanPhone;
      const text = `¡Hola ${ad.business_name}! Vi su anuncio en mi viaje en Rumbo a mi Destino. Me interesa aprovechar su promoción: "${ad.title}" ${ad.coupon_code ? `(Cupón: ${ad.coupon_code})` : ''}`;
      window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else if (ad.target_link) {
      window.open(ad.target_link, '_blank');
    } else if (ad.phone) {
      window.open(`tel:${ad.phone}`, '_self');
    }
  };

  const handleCopyCoupon = () => {
    if (ad.coupon_code) {
      navigator.clipboard?.writeText(ad.coupon_code);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in font-sans">
      <div className="w-full max-w-md bg-slate-900 border-2 border-amber-400/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white relative animate-pop-bounce">
        
        {/* Cabecera con temporizador */}
        <div className="p-3 bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                Comercio en tu Ruta &bull; {ad.target_municipality === 'TODOS' ? 'El Salvador' : ad.target_municipality}
              </span>
              <h4 className="text-xs font-black text-white leading-tight flex items-center gap-1">
                {ad.business_name}
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400 inline" />
              </h4>
            </div>
          </div>

          <div>
            {canClose ? (
              <button
                type="button"
                onClick={onClose}
                className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>Cerrar</span>
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="py-1 px-2.5 rounded-xl bg-slate-800/80 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                <span>{countdown}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Imagen / Video Creativo */}
        <div className="relative w-full aspect-[16/9] bg-slate-950 overflow-hidden group">
          <img
            src={ad.media_url}
            alt={ad.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
          
          {ad.coupon_code && (
            <div className="absolute top-3 right-3 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-xl font-black text-[11px] shadow-lg flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cupón: {ad.coupon_code}</span>
            </div>
          )}
        </div>

        {/* Contenido y Beneficio */}
        <div className="p-4 sm:p-5 space-y-3.5 text-left">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {ad.title}
            </h3>
            {ad.description && (
              <p className="text-xs text-slate-300 leading-relaxed">
                {ad.description}
              </p>
            )}
          </div>

          {/* Cupón canjeable rápido */}
          {ad.coupon_code && (
            <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Código Exclusivo de Carrera</span>
                  <span className="text-xs font-black font-mono text-amber-300">{ad.coupon_code}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCoupon}
                className="py-1 px-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedCoupon ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Acciones principales */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleCtaClick}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer transition-all transform active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>{ad.cta_text || 'Pedir por WhatsApp con Descuento'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Continuar con mi viaje o juego ›
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
