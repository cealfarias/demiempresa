import React from 'react';
import { Megaphone, Sparkles } from 'lucide-react';

export default function MerchantAdPill({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Conoce las tarifas de publicidad y paga con Transferencia 365 Móvil"
      className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/60 text-amber-300 hover:text-amber-200 text-[11px] font-black shadow-lg shadow-amber-500/10 transition-all cursor-pointer group active:scale-95 ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
      <Megaphone className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
      <span>¿Quieres anunciarte? Haz clic aquí</span>
      <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform">➔</span>
    </button>
  );
}
