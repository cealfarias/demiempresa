import React, { useState } from 'react';
import { Gift, Award, Smartphone, CheckCircle2, X, Sparkles, Calendar, ShieldCheck, ArrowRight } from 'lucide-react';

/**
 * PeaIncentivesModal - Modal Explicativo de Rifas y Transporte Gratis para la PEA
 * "En Rumbo premiamos tu lealtad y tu atención mientras viajas"
 */
export default function PeaIncentivesModal({ isOpen, onClose, userProfile }) {
  const [participated, setParticipated] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative space-y-4">
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header con Icono */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
              Programa de Lealtad PEA
            </span>
            <h3 className="text-base font-black text-white mt-0.5">
              Rifas y Transporte Gratis
            </h3>
          </div>
        </div>

        {/* Contenido de Incentivos */}
        <div className="space-y-3 text-xs text-slate-300">
          <p className="leading-relaxed">
            Las grandes aplicaciones tradicionales te cobran tarifas dinámicas abusivas y no te devuelven nada. En <strong className="text-amber-300">Rumbo</strong> premiamos a la <strong>Población Económicamente Activa (PEA)</strong> que mueve a El Salvador:
          </p>

          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/20 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-bold">📱 Sorteos Mensuales de Celulares</strong>
                <span className="text-[11px] text-slate-400">
                  Smartphones nuevos para que continúes trabajando y conectado. Cada viaje completado suma un boleto electrónico.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/20 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-bold">🚍 Semanas de Transporte Gratis al Trabajo</strong>
                <span className="text-[11px] text-slate-400">
                  Premios de hasta 2 carreras diarias gratuitas (ida y vuelta a tu lugar de trabajo) financiadas por la red de anunciantes.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-purple-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-bold">🎧 Gadgets y Tecnología Útil</strong>
                <span className="text-[11px] text-slate-400">
                  Audífonos inalámbricos, power banks y herramientas que potencian tu productividad laboral.
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Participas con tu cuenta oficial de Rumbo {userProfile?.dui ? `(DUI: ${userProfile.dui})` : ''}.</span>
          </div>
        </div>

        {/* Botón de Confirmación */}
        <div className="pt-2">
          {!participated ? (
            <button
              type="button"
              onClick={() => setParticipated(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Award className="w-4 h-4" />
              <span>Confirmar Mi Participación en el Sorteo</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-center font-bold text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Estás inscrito en la rifa de este mes! Mucha suerte.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
