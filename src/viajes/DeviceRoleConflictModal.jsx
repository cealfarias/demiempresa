import React from 'react';
import { Car, User, AlertTriangle, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import RumboLogo from './RumboLogo';

/**
 * DeviceRoleConflictModal - Pantalla de Resolución de Conflicto de Rol en Dispositivo
 * 
 * Se muestra cuando:
 * 1. Un usuario entra a Modo Pasajero pero el dispositivo tiene sesión de Conductor activa.
 * 2. Un usuario entra a Modo Conductor pero el dispositivo tiene sesión de Pasajero activa.
 * 
 * Regla:
 * Se puede cambiar de rol cerrando la sesión del rol opuesto de forma limpia,
 * SIEMPRE QUE no tenga un viaje activo o subasta en ejecución.
 */
export default function DeviceRoleConflictModal({
  currentAttemptedRole, // 'PASSENGER' | 'DRIVER'
  existingActiveRole,   // 'DRIVER' | 'PASSENGER'
  pendingActivity,      // { hasActiveTrip: boolean, reason: string | null }
  onConfirmSwitch,      // Callback cuando decide cambiar de rol (purga rol viejo)
  onStayCurrentRole     // Callback para volver a la pantalla de su rol activo
}) {
  const isSwitchingToPassenger = currentAttemptedRole === 'PASSENGER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left">
        {/* Header con Badge de Exclusividad */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <RumboLogo textClassName="text-xl" />
          <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            1 Dispositivo • 1 Rol
          </span>
        </div>

        {/* Iconografía y Estado Actual */}
        <div className="py-5 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-white">
            {isSwitchingToPassenger
              ? 'Sesión de Conductor Activa'
              : 'Sesión de Pasajero Activa'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isSwitchingToPassenger
              ? 'Este dispositivo está configurado actualmente en modo Conductor.'
              : 'Este dispositivo está configurado actualmente en modo Pasajero.'}
          </p>
        </div>

        {/* Bloque de Explicación de Mutua Exclusión */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2 mb-5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              Por transparencia, seguridad y para evitar auto-asignaciones, una misma persona <strong className="text-white">no puede tener activas ambas aplicaciones al mismo tiempo en el mismo teléfono</strong>.
            </p>
          </div>
          {pendingActivity?.hasActiveTrip ? (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 mt-2">
              <strong className="block font-bold mb-0.5 text-rose-200">⚠️ No es posible cambiar en este momento:</strong>
              <span>{pendingActivity.reason || 'Tienes un viaje o subasta en ejecución.'}</span>
              <p className="text-[11px] text-rose-300/80 mt-1">
                Debes concluir o cancelar dicha carrera antes de poder cambiar de rol.
              </p>
            </div>
          ) : (
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              💡 {isSwitchingToPassenger
                ? 'Al presionar "Cambiar a Pasajero", se cerrará tu sesión de conductor de forma limpia y segura.'
                : 'Al presionar "Cambiar a Conductor", se cerrará tu sesión de pasajero de forma limpia y segura.'}
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="space-y-2.5">
          {/* Botón de Cambiar de Rol (Deshabilitado si hay carrera activa) */}
          <button
            type="button"
            disabled={pendingActivity?.hasActiveTrip}
            onClick={onConfirmSwitch}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
              pendingActivity?.hasActiveTrip
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isSwitchingToPassenger
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-emerald-950/40'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-950/40'
            }`}
          >
            {isSwitchingToPassenger ? (
              <>
                <User className="w-4 h-4" />
                <span>Cambiar a Pasajero (Cerrar Conductor)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Car className="w-4 h-4" />
                <span>Cambiar a Conductor (Cerrar Pasajero)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Botón para permanecer en su Rol actual */}
          <button
            type="button"
            onClick={onStayCurrentRole}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {isSwitchingToPassenger
                ? 'Permanecer en Modo Conductor'
                : 'Permanecer en Modo Pasajero'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
