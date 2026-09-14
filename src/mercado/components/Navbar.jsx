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
      <header className="sticky top-0 z-40 bg-zinc-950/90 dark:bg-zinc-950/90 light:bg-white/90 backdrop-blur-md border-b border-zinc-800 dark:border-zinc-800 light:border-slate-200 px-4 py-3 shadow-lg transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Brand with Concatenated Build Tag */}
          <div className="flex items-center justify-between">
            <div
              onClick={onGoHome}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                M
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-extrabold text-base md:text-lg text-zinc-100 dark:text-zinc-100 light:text-slate-900 tracking-tight group-hover:text-amber-500 transition-colors">
                    Mercado San Miguelito <span className="text-amber-500 dark:text-amber-400 font-mono text-xs font-extrabold">{BUILD_INFO.tag}</span>
                  </h1>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-slate-500 font-mono">sanmiguelito.demiempresa.online</p>
              </div>
            </div>

            {/* Mobile Actions (Cart, Theme, Tracking) */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Cambiar a Tema Día (Claro)' : 'Cambiar a Tema Noche (Oscuro)'}
                className="p-2 rounded-xl bg-zinc-900 dark:bg-zinc-900 light:bg-slate-100 text-amber-400 border border-zinc-800 dark:border-zinc-800 light:border-slate-300"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
              </button>

              <button
                onClick={onOpenTracking}
                className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-bold flex items-center gap-1"
              >
                <Navigation className="w-4 h-4" />
              </button>
              {currentRole === 'cliente' && (
                <button
                  onClick={onOpenCart}
                  className="relative p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {totalCartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-zinc-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                      {totalCartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons & Role Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            
            {/* Theme Toggle Button (Day / Night) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Día (Claro)' : 'Cambiar a Modo Noche (Oscuro)'}
              className="px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-900 light:bg-slate-100 text-zinc-300 dark:text-zinc-300 light:text-slate-700 border border-zinc-800 dark:border-zinc-800 light:border-slate-300 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 hover:border-amber-500"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Día</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Modo Noche</span>
                </>
              )}
            </button>

            <button
              onClick={onGoHome}
              className="px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-900 light:bg-slate-100 text-zinc-300 dark:text-zinc-300 light:text-slate-700 border border-zinc-800 dark:border-zinc-800 light:border-slate-300 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" /> Inicio
            </button>

            <button
              onClick={onOpenLogin}
              className="px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-900 light:bg-slate-100 text-zinc-300 dark:text-zinc-300 light:text-slate-700 border border-zinc-800 dark:border-zinc-800 light:border-slate-300 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5 text-blue-400" /> Iniciar Sesión
            </button>

            <button
              onClick={() => setIsDriverModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 dark:text-blue-300 light:text-blue-600 border border-blue-500/30 hover:bg-blue-600/30 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Registrar Transportista
            </button>

            <button
              onClick={onOpenTracking}
              className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 dark:text-emerald-300 light:text-emerald-600 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" /> Rastrear Pedido
            </button>

            <div className="flex items-center gap-1 bg-zinc-900/80 dark:bg-zinc-900/80 light:bg-slate-100 p-1 rounded-xl border border-zinc-800 dark:border-zinc-800 light:border-slate-300">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setCurrentRole(r.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    currentRole === r.id
                      ? 'bg-zinc-800 dark:bg-zinc-800 light:bg-white text-zinc-100 dark:text-zinc-100 light:text-slate-900 shadow-sm border border-zinc-700 dark:border-zinc-700 light:border-slate-300 font-bold'
                      : 'text-zinc-400 dark:text-zinc-400 light:text-slate-600 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {currentRole === 'cliente' && (
              <button
                onClick={onOpenCart}
                className="hidden md:flex items-center gap-2 ml-1 px-3 py-1.5 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-all shadow-md active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Carrito</span>
                {totalCartCount > 0 && (
                  <span className="bg-zinc-950 text-amber-400 text-xs font-black px-1.5 py-0.5 rounded-full">
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
