import React, { useState } from 'react';
import {
  MapPinOff,
  Navigation,
  RotateCcw,
  Map,
  X,
  Smartphone,
  Apple,
  Globe,
  CheckCircle,
  Loader2,
  ShieldAlert
} from 'lucide-react';

export default function LocationPermissionModal({
  isOpen,
  onClose,
  onRetry,
  onOpenMap,
  isRetrying = false
}) {
  if (!isOpen) return null;

  // Detectar plataforma del usuario para priorizar la pestaña correcta
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  const [activeTab, setActiveTab] = useState(isIOS ? 'ios' : 'android');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Cabecera */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold flex-shrink-0 animate-pulse">
              <MapPinOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">
                Tu Ubicación es Imprescindible
              </h3>
              <p className="text-[11px] text-amber-300/90 font-medium">
                Para que el conductor llegue directo a tu puerta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Explicación Amigable */}
        <p className="text-xs text-slate-300 leading-relaxed">
          En <strong>Rumbo</strong> no usamos direcciones aproximadas: el conductor necesita saber exactamente dónde esperas para no hacerte esperar ni gastar gasolina de más.
        </p>

        {/* Guía Visual Paso a Paso con Pestañas */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">¿Cómo reactivar el permiso?</span>
            <div className="flex gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Apple className="w-3 h-3" />
                <span>iPhone</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pc')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'pc'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>PC</span>
              </button>
            </div>
          </div>

          {/* Pasos para Android / Chrome */}
          {activeTab === 'android' && (
            <div className="space-y-2 text-xs text-slate-300 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
                <span>Toca el <strong>ícono de ajustes o candado 🔒</strong> en la barra superior junto a <em>viajes.demiempresa.online</em>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
                <span>Selecciona <strong>Permisos</strong> ➔ <strong>Ubicación</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
                <span>Elige <strong>Permitir siempre</strong> o <strong>Permitir al usar la app</strong>.</span>
              </div>
            </div>
          )}

          {/* Pasos para iPhone / Safari */}
          {activeTab === 'ios' && (
            <div className="space-y-2 text-xs text-slate-300 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
                <span>Toca las letras <strong>aA</strong> en la barra de direcciones de Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
                <span>Toca <strong>Configuración del sitio web</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
                <span>Cambia <strong>Ubicación</strong> a <strong>Permitir</strong>.</span>
              </div>
            </div>
          )}

          {/* Pasos para PC / Navegador escritorio */}
          {activeTab === 'pc' && (
            <div className="space-y-2 text-xs text-slate-300 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
                <span>Haz clic en el <strong>candado 🔒</strong> junto a la URL en tu navegador.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
                <span>Activa el interruptor de <strong>Ubicación</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
                <span>Presiona el botón de reintentar abajo.</span>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="space-y-2 pt-1">
          {/* Botón Principal: Reintentar GPS */}
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full py-3.5 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-lime-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>SOLICITANDO PERMISO GPS...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>REINTENTAR Y ACTIVAR UBICACIÓN</span>
              </>
            )}
          </button>

          {/* Opción B: Fijar en el mapa manualmente si el GPS físico falla */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenMap) onOpenMap();
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Map className="w-4 h-4 text-amber-400" />
            <span>Fijar mi puerta con el mapa interactivo</span>
          </button>
        </div>

      </div>
    </div>
  );
}
