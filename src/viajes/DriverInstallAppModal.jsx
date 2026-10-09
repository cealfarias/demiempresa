import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Flame
} from 'lucide-react';
import RumboLogo from './RumboLogo';

export default function DriverInstallAppModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => (typeof window !== 'undefined' ? window.deferredPwaInstallPrompt : null));
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detectar si ya está en modo standalone / instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    if (window.deferredPwaInstallPrompt) {
      setDeferredPrompt(window.deferredPwaInstallPrompt);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.deferredPwaInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePromptReady = () => {
      if (window.deferredPwaInstallPrompt) {
        setDeferredPrompt(window.deferredPwaInstallPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa:installprompt_ready', handlePromptReady);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa:installprompt_ready', handlePromptReady);
    };
  }, []);

  // Si se abre el modal y el navegador tiene el prompt de instalación listo, lanzarlo automáticamente
  useEffect(() => {
    if (isOpen && deferredPrompt) {
      // Pequeño delay para asegurar renderizado visual
      const timer = setTimeout(() => {
        try {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choice) => {
            if (choice && choice.outcome === 'accepted') {
              setIsInstalled(true);
              if (onClose) onClose();
            }
          }).catch(() => {});
        } catch (err) {
          console.warn('Auto prompt install error:', err);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, deferredPrompt, onClose]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        if (onClose) onClose();
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 animate-pop-bounce relative max-h-[90vh] overflow-y-auto overscroll-contain my-auto text-left">
        
        {/* Header con botón de cerrar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-black text-white">Instalar App Rumbo Conductor</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Hero badge */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shrink-0">
            🚖
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-black text-white">Consola de Conductor en tu Celular</h4>
            <p className="text-[11px] text-amber-200/90 leading-tight">
              Instálala como app nativa: 0 descargas pesadas de tienda, alerta de carreras al instante y pantalla completa.
            </p>
          </div>
        </div>

        {/* Beneficios clave de instalar la app */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-[11px]">Respuesta Rápida a Solicitudes:</strong>
              <span className="text-slate-300 text-[10.5px]">Se abre en 1 segundo directo desde tu pantalla de inicio, sin pasar por el navegador.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <Flame className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-[11px]">Ahorro de Batería y Megas:</strong>
              <span className="text-slate-300 text-[10.5px]">Optimizado para consumir hasta 90% menos recursos que las apps pesadas tradicionales.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-[11px]">GPS y Radar Persistente:</strong>
              <span className="text-slate-300 text-[10.5px]">No pierdes carreras si bloqueas la pantalla o cambias de ventana.</span>
            </div>
          </div>
        </div>

        {/* Botón directo si el navegador soporta prompt automático */}
        {deferredPrompt && (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Rumbo Conductor Ahora</span>
            </button>
          </div>
        )}

        {/* Guía visual según sistema operativo */}
        <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            {isIOS ? '🍎 Cómo instalar en iPhone o iPad (Safari):' : '🤖 Cómo instalar en Android (Chrome / Edge / Samsung):'}
          </span>

          {isIOS ? (
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">1</span>
                <span>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha <Share2 className="w-3.5 h-3.5 inline text-sky-400" />) en la barra inferior de Safari.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">2</span>
                <span>Desliza hacia abajo y presiona <strong>"Agregar a pantalla de inicio"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />).</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">3</span>
                <span>Presiona <strong>"Agregar"</strong> arriba a la derecha. ¡El icono aparecerá en tu teléfono!</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">1</span>
                <span>Toca el menú de <strong>tres puntos</strong> (<MoreVertical className="w-3.5 h-3.5 inline text-slate-400" />) en la esquina superior derecha del navegador.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">2</span>
                <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">3</span>
                <span>Confirma <strong>"Instalar"</strong>. Se añadirá el acceso directo de conductor a tu pantalla.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl cursor-pointer text-xs transition-colors"
          >
            Entendido, continuar en la web
          </button>
        </div>

      </div>
    </div>
  );
}
