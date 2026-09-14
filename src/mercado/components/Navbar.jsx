import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { BUILD_INFO } from '../data/mockData';
import { ShoppingCart, Sparkles, Navigation, UserPlus, Home, User, Sun, Moon } from 'lucide-react';
import DriverRegistrationModal from './DriverRegistrationModal';

export default function Navbar({ onOpenCart, onOpenTracking, onGoHome, onOpenLogin }) {
  const { currentRole, setCurrentRole, cart, theme, toggleTheme } = useMercado();
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const roles = [
    { id: 'cliente', label: '🛒 Cliente (PWA)', color: 'border-amber-500 text-amber-400' },
    { id: 'recolector', label: '🏃 Recolector (Mercado)', color: 'border-emerald-500 text-emerald-400' },
    { id: 'despachador', label: '🛵 Despachador (Motorista)', color: 'border-blue-500 text-blue-400' },
    { id: 'admin', label: '⚙️ Admin (Acopio)', color: 'border-purple-500 text-purple-400' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B0F17]/95 dark:bg-[#0B0F17]/95 light:bg-white/95 backdrop-blur-xl border-b border-emerald-500/20 dark:border-emerald-500/20 light:border-slate-200 px-3 py-2.5 sm:px-4 sm:py-3 shadow-xl transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* Brand with Concatenated Build Tag */}
          <div className="flex items-center justify-between">
            <div
              onClick={onGoHome}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-orange-500 flex items-center justify-center text-zinc-950 font-black text-lg sm:text-xl shadow-glow-emerald group-hover:scale-105 transition-transform">
                M
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="font-extrabold text-xs sm:text-sm md:text-base text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight group-hover:text-emerald-400 transition-colors">
                    Mercado San Miguelito <span className="text-orange-400 dark:text-orange-400 light:text-orange-600 font-mono text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">{BUILD_INFO.tag}</span>
                  </h1>
                </div>
                <p className="text-[10px] sm:text-xs text-emerald-400/80 dark:text-emerald-400/80 light:text-emerald-700 font-mono font-medium">sanmiguelito.demiempresa.online</p>
              </div>
            </div>

            {/* Mobile Actions (Cart, Theme, Tracking) */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Cambiar a Tema Día (Claro)' : 'Cambiar a Tema Noche (Oscuro)'}
                className="p-1.5 sm:p-2 rounded-lg bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 text-amber-400 border border-slate-800 dark:border-slate-800 light:border-slate-300"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />}
              </button>

              <button
                onClick={onOpenTracking}
                className="p-1.5 sm:p-2 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 transition-all text-[11px] font-bold flex items-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" />
              </button>
              {currentRole === 'cliente' && (
                <button
                  onClick={onOpenCart}
                  className="relative p-2 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-black rounded-lg hover:brightness-110 transition-all shadow-glow-orange"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {totalCartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-slate-950 text-orange-400 border border-orange-500/40 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {totalCartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons & Role Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            
            {/* Theme Toggle Button (Day / Night) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Día (Claro)' : 'Cambiar a Modo Noche (Oscuro)'}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-100 text-slate-300 dark:text-slate-300 light:text-slate-700 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 hover:border-emerald-500"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Modo Día</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-indigo-600" />
                  <span className="hidden sm:inline">Modo Noche</span>
                </>
              )}
            </button>

            <button
              onClick={onGoHome}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-100 text-slate-300 dark:text-slate-300 light:text-slate-700 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 hover:border-emerald-500"
            >
              <Home className="w-3 h-3 text-emerald-400" /> <span className="hidden sm:inline">Inicio</span>
            </button>

            <button
              onClick={onOpenLogin}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-100 text-slate-300 dark:text-slate-300 light:text-slate-700 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 hover:border-cyan-500"
            >
              <User className="w-3 h-3 text-cyan-400" /> Login
            </button>

            <button
              onClick={() => setIsDriverModalOpen(true)}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-500/15 text-indigo-400 dark:text-indigo-300 light:text-indigo-600 border border-indigo-500/30 hover:bg-indigo-500/25 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" /> <span className="hidden sm:inline">Registrar</span> Motorista
            </button>

            <button
              onClick={onOpenTracking}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-cyan-500/15 text-cyan-400 dark:text-cyan-300 light:text-cyan-700 border border-cyan-500/30 hover:bg-cyan-500/25 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" /> Rastrear
            </button>

            <div className="flex items-center gap-0.5 bg-slate-950/90 dark:bg-slate-950/90 light:bg-slate-100 p-1 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-300">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setCurrentRole(r.id)}
                  className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all ${
                    currentRole === r.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 shadow-glow-emerald font-black'
                      : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {currentRole === 'cliente' && (
              <button
                onClick={onOpenCart}
                className="hidden md:flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 rounded-lg text-xs font-black hover:brightness-110 transition-all shadow-glow-orange active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Carrito</span>
                {totalCartCount > 0 && (
                  <span className="bg-slate-950 text-orange-400 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-orange-500/30">
                    {totalCartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <DriverRegistrationModal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
      />
    </>
  );
}
