import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { BUILD_INFO, DEPARTAMENTOS, MERCADOS_DISPONIBLES } from '../data/mockData';
import { ShoppingCart, Search, Navigation, UserPlus, Home, User, Sun, Moon, LogOut, MapPin, Menu, ChevronDown, PhoneCall, Truck, Store, Sprout, Compass } from 'lucide-react';
import DriverRegistrationModal from './DriverRegistrationModal';
import LocationModal from './LocationModal';

export default function Navbar({ onOpenCart, onOpenTracking, onGoHome, onOpenLogin, onSearch }) {
  const {
    currentRole,
    setCurrentRole,
    cart,
    subtotal,
    theme,
    toggleTheme,
    currentUser,
    logoutUser,
    selectedMarket,
    setSelectedMarket,
    userLocation,
    isLocationModalOpen,
    setIsLocationModalOpen
  } = useMercado();

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const activeMarketObj = MERCADOS_DISPONIBLES.find(m => m.id === selectedMarket) || MERCADOS_DISPONIBLES[1];

  const roles = [
    { id: 'cliente', label: '🛒 Cliente', color: 'border-amber-500 text-amber-400' },
    { id: 'recolector', label: '🏃 Recolector', color: 'border-emerald-500 text-emerald-400' },
    { id: 'despachador', label: '🛵 Motorista', color: 'border-blue-500 text-blue-400' },
    { id: 'admin', label: '⚙️ Admin Acopio', color: 'border-purple-500 text-purple-400' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery, selectedCategory);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full shadow-md font-sans">
        
        {/* TOP ANNOUNCEMENT BAR */}
        <div className="bg-[#0A1120] text-slate-200 text-[11px] py-1.5 px-3 sm:px-6 border-b border-slate-800 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2 truncate">
            <span className="bg-[#00D09C] text-[#0A1120] font-black px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Truck className="w-3 h-3" /> RED NACIONAL
            </span>
            <span className="truncate text-slate-300">
              Cobertura 14 Departamentos • Mercados Municipales & AgroMercados MAG • Retiro Pickup (48h)
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:flex items-center gap-1 text-[#00D09C] font-bold">
              <PhoneCall className="w-3 h-3" /> WhatsApp: 7700-9900
            </span>
            
            <button
              onClick={() => setIsDriverModalOpen(true)}
              className="hidden sm:flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Registro Motorista
            </button>

            {/* Theme Toggle (Modo Día Blanco / Modo Noche) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Fondo Blanco (Modo Día)' : 'Cambiar a Fondo Oscuro (Modo Noche)'}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all text-[10px] font-bold"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>Fondo Blanco</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>Fondo Noche</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* MAIN E-COMMERCE WHITE HEADER BAR */}
        <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 sm:px-6 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
            
            {/* 1. BRAND LOGO */}
            <div
              onClick={onGoHome}
              className="flex items-center gap-2 cursor-pointer shrink-0 group"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#0A1120] border border-slate-700 flex items-center justify-center p-1 shadow-md group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 36 H12" stroke="#00D09C" strokeWidth="4" strokeLinecap="round" />
                  <path d="M2 46 H10" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
                  <path d="M6 56 H12" stroke="#00D09C" strokeWidth="4" strokeLinecap="round" />
                  <rect x="16" y="24" width="26" height="26" rx="5" fill="#00D09C" />
                  <path d="M22 37 H36" stroke="#0A1120" strokeWidth="3.5" strokeLinecap="round" />
                  <circle cx="32" cy="70" r="14" stroke="#CBD5E1" strokeWidth="6" fill="none" />
                  <circle cx="32" cy="70" r="5" fill="#00D09C" />
                  <circle cx="76" cy="70" r="14" stroke="#CBD5E1" strokeWidth="6" fill="none" />
                  <circle cx="76" cy="70" r="5" fill="#00D09C" />
                  <path d="M42 54 H58 L70 38 H84" stroke="#00D09C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M54 54 L72 70" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" />
                  <path d="M34 70 L46 42" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" />
                  <path d="M42 42 H56" stroke="#00D09C" strokeWidth="5" strokeLinecap="round" />
                  <path d="M84 38 L92 39" stroke="#10E3B2" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>

              <div>
                <h1 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-[#00D09C] transition-colors">
                  Mercados Nacionales <span className="text-[#00D09C]">Delivery</span>
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-0.5 flex items-center gap-1">
                  Red Nacional <span className="font-mono text-[9px] text-[#00D09C]">{BUILD_INFO.tag}</span>
                </p>
              </div>
            </div>

            {/* 2. DYNAMIC LOCATION & MARKET SELECTOR PILL */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden lg:flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:border-[#00D09C] bg-slate-50 dark:bg-[#111C2E] px-3 py-1.5 rounded-xl text-left transition-all shrink-0 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#00D09C]/15 text-[#00D09C] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-[11px] leading-tight">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                  Ubicación: <strong className="text-[#00D09C]">{userLocation?.departamentoName}</strong> • {userLocation?.distrito}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-black text-xs block truncate max-w-[200px]">
                  {activeMarketObj.name}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00D09C] transition-colors" />
            </button>

            {/* 3. CENTER SEARCH BAR WITH CATEGORY SELECTOR */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl items-center bg-slate-100 dark:bg-[#0A1120] border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-[#00D09C] transition-colors shadow-inner">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todas las categorías</option>
                <option value="agromercado-mag">🟢 Precios Justos MAG $1.00</option>
                <option value="comida">Comida Preparada</option>
                <option value="frutas-verduras">Frutas y Verduras</option>
                <option value="carnes-mariscos">Carnes y Mariscos</option>
                <option value="abarrotes">Abarrotes y Lácteos</option>
                <option value="tecnologia-ropa">Tecnología y Bazares</option>
              </select>

              <input
                type="text"
                placeholder="¿Qué estás buscando? (tomates $1.00, pupusas, queso, audífonos...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />

              <button
                type="submit"
                className="bg-[#00D09C] hover:bg-[#10E3B2] text-[#0A1120] px-4 py-2 text-xs font-black transition-colors flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* 4. RIGHT USER ACTIONS (Account, Orders, Cart) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Account / User */}
              {currentUser ? (
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-[#00D09C] text-[#0A1120] flex items-center justify-center font-black text-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-[11px] leading-tight">
                    <span className="text-[9px] text-slate-400 block">Hola,</span>
                    <strong className="text-slate-900 dark:text-[#00D09C] truncate max-w-[90px] block font-bold">
                      {currentUser.name}
                    </strong>
                  </div>
                  <button
                    onClick={logoutUser}
                    title="Cerrar Sesión"
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors ml-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  <User className="w-4 h-4 text-[#00D09C]" />
                  <div className="text-left leading-tight hidden sm:block">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Bienvenido</span>
                    <span className="text-xs">Inicia sesión / Cuenta</span>
                  </div>
                </button>
              )}

              {/* Rastrear Pedidos */}
              <button
                onClick={onOpenTracking}
                title="Seguimiento de pedidos en vivo"
                className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[#00D09C]/15 text-[#00D09C] hover:bg-[#00D09C]/25 border border-[#00D09C]/30 rounded-xl text-xs font-bold transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span className="hidden sm:inline">Rastrear</span>
              </button>

              {/* Shopping Cart Button */}
              {currentRole === 'cliente' && (
                <button
                  onClick={onOpenCart}
                  className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#00D09C] hover:bg-[#10E3B2] text-[#0A1120] rounded-xl text-xs font-black transition-all shadow-glow-mint active:scale-95"
                >
                  <div className="relative">
                    <ShoppingCart className="w-4 h-4" />
                    {totalCartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-[#0A1120] text-[#00D09C] border border-[#00D09C] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {totalCartCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline">${subtotal.toFixed(2)}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Location & Search Bar */}
          <div className="flex flex-col md:hidden mt-2.5 gap-2">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center justify-between bg-slate-100 dark:bg-[#0A1120] border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#00D09C] shrink-0" />
                <span className="truncate">
                  {userLocation?.departamentoName} ({userLocation?.distrito}) • <strong className="text-[#00D09C]">{activeMarketObj.name}</strong>
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            <form onSubmit={handleSearchSubmit} className="flex items-center bg-slate-100 dark:bg-[#0A1120] border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
              <input
                type="text"
                placeholder="Buscar tomates $1.00, pupusas, sopas, verduras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              <button type="submit" className="bg-[#00D09C] text-[#0A1120] px-3 py-1.5 text-xs font-black">
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* SECONDARY CATEGORY MENU SUB-NAVBAR */}
        <div className="bg-[#0A1120] text-white py-1.5 px-3 sm:px-6 shadow-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            
            {/* Category Quick Links */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold whitespace-nowrap">
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-[#00D09C] text-[#0A1120] font-black flex items-center gap-1 hover:bg-[#10E3B2] transition-colors"
              >
                <Compass className="w-3.5 h-3.5" /> Cambiar Ubicación
              </button>

              <button onClick={onGoHome} className="px-2.5 py-1 rounded-lg bg-[#00D09C]/20 hover:bg-[#00D09C]/30 text-[#00D09C] border border-[#00D09C]/40 transition-colors flex items-center gap-1">
                <Sprout className="w-3.5 h-3.5" /> 🟢 AgroMercado MAG $1.00
              </button>

              <button onClick={onGoHome} className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-1">
                🍲 Comida Preparada
              </button>

              <button onClick={onGoHome} className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-1">
                🍎 Frutas y Verduras
              </button>

              <button onClick={onGoHome} className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-1">
                🥩 Carnes y Mariscos
              </button>

              <button onClick={onGoHome} className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-1">
                🧀 Abarrotes y Lácteos
              </button>

              <button onClick={onGoHome} className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-1">
                📱 Tecnología y Bazares
              </button>
            </div>

            {/* Role Switcher Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setCurrentRole(r.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-all ${
                    currentRole === r.id
                      ? 'bg-[#00D09C] text-[#0A1120] font-black shadow-glow-mint'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

          </div>
        </div>

      </header>

      <DriverRegistrationModal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </>
  );
}
