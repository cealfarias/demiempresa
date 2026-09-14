import React, { useState } from 'react';
import { BUILD_INFO } from '../data/mockData';
import { ShoppingBag, Utensils, Bike, Building2, Wallet, CreditCard, ShieldCheck, Sparkles, HeartHandshake, ArrowRight, CheckCircle2, User, Footprints, Store, MapPin, Clock, ChevronDown, ChevronUp, Tag } from 'lucide-react';

export default function LandingPage({ onOpenPWA, onOpenLogin }) {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: '¿Cómo funciona la compra multi-puesto en el Mercado San Miguelito?',
      a: 'Puedes agregar productos de diferentes puestos (ej. pupusas de un comedero, sopas de otro puesto y verduras de la sección de frescos) en un mismo carrito. Un runner interno recolecta todo local por local y te lo entregamos en una sola orden.'
    },
    {
      q: '¿Cuáles son las formas de pago aceptadas?',
      a: 'Aceptamos Transfer365 Móvil (Banco Davivienda al 6989-3101), Chivo Wallet (USD / Bitcoin), El Cubo para tarjetas de crédito/débito y Pago en Efectivo contra entrega.'
    },
    {
      q: '¿Cómo funciona el retiro en punto de venta (Pickup)?',
      a: 'Si prefieres retirar personalmente sin costo de envío, seleccionas "Retiro en Punto" al pagar. La app generará un código QR único. Tienes hasta 48 horas para retirar tu pedido en la Mesa de Acopio del Mercado.'
    },
    {
      q: '¿Cuál es la política de cancelación de pedidos?',
      a: 'Puedes cancelar tu pedido sin problema antes de que el runner inicie la recolección en el mercado. Se aplicará un 20% de cargo administrativo por gastos operativos iniciales y se te reembolsará el 80% restante.'
    },
    {
      q: '¿Cómo se reparten las propinas?',
      a: 'El 100% de la propina voluntaria que agregues al pagar se divide equitativamente (50% / 50%) entre el runner que junta los productos en el mercado y el motorista que realiza el delivery.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3.5 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo & Badges */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-zinc-950 font-black text-xl shadow-lg ring-2 ring-amber-500/30">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-zinc-100 tracking-tight">
                  Mercado San Miguelito
                </h1>
                <span className="hidden sm:inline-flex bg-amber-500/10 text-amber-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 items-center gap-1">
                  <Tag className="w-3 h-3" /> {BUILD_INFO.tag}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono tracking-wide">sanmiguelito.demiempresa.online</p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <User className="w-4 h-4 text-amber-400" /> Acceder / Registro
            </button>
            <button
              onClick={onOpenPWA}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-zinc-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <span>Ver Catálogo PWA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/30 text-amber-400 text-xs font-extrabold shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Versión Oficial en Producción: <strong className="font-mono underline">{BUILD_INFO.tag}</strong></span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-zinc-100 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Los mejores puestos del <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
              Mercado San Miguelito
            </span> a tu puerta
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Pupusas tradicionales, sopas de gallina india, carnes frescas, verduras y lácteos de múltiples comederos en una sola orden con pago anticipado seguro y rastreo GPS (Radio de 5 km en San Salvador).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={onOpenPWA}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-zinc-950 font-black rounded-2xl text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2.5 shadow-2xl shadow-amber-500/25 active:scale-95"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Explorar Catálogo & Ordenar</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 font-extrabold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <User className="w-4.5 h-4.5 text-amber-400" />
              <span>Iniciar Sesión / Registro</span>
            </button>
          </div>

          <div className="pt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
            <span className="font-bold text-zinc-300">Pagos Seguros:</span>
            <span className="flex items-center gap-1.5 bg-zinc-900/90 px-3.5 py-2 rounded-xl border border-zinc-800 font-semibold text-emerald-400 shadow-sm">
              <Building2 className="w-4 h-4" /> Transfer365 (Davivienda 6989-3101)
            </span>
            <span className="flex items-center gap-1.5 bg-zinc-900/90 px-3.5 py-2 rounded-xl border border-zinc-800 font-semibold text-blue-400 shadow-sm">
              <Wallet className="w-4 h-4" /> Chivo Wallet (USD/BTC)
            </span>
            <span className="flex items-center gap-1.5 bg-zinc-900/90 px-3.5 py-2 rounded-xl border border-zinc-800 font-semibold text-purple-400 shadow-sm">
              <CreditCard className="w-4 h-4" /> El Cubo (Tarjetas)
            </span>
          </div>

        </div>
      </section>

      {/* CORE FEATURES */}
      <section className="py-16 px-4 bg-zinc-900/60 border-y border-zinc-800/80">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Modelo Logístico Exclusivo</h2>
            <p className="text-2xl sm:text-3xl font-black text-zinc-100">
              Diseñado para la dinámica real del Mercado San Miguelito
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3.5 hover:border-amber-500/40 transition-all shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform">
                🛍️
              </div>
              <h3 className="font-extrabold text-base text-zinc-100">Carrito Multi-Puesto</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pide pupusas del Pasillo 3, sopas de gallina india del Pasillo 2 y frutas frescas del Pasillo 1 en un solo pedido con una tarifa unificada.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3.5 hover:border-emerald-500/40 transition-all shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform">
                🏃
              </div>
              <h3 className="font-extrabold text-base text-zinc-100">Runners & Acopio</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Compradores internos (*runners*) navegan local por local consolidando tus productos antes de empacarlos en la Mesa de Acopio del Mercado.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/40 transition-all shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform">
                🛵
              </div>
              <h3 className="font-extrabold text-base text-zinc-100">Despacho & Retiro Pickup</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Recibe a domicilio dentro del radio de 5 km con seguimiento GPS en vivo, o retira personalmente en acopio con tu Código QR (48h).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER WITH VISIBLE BUILD TAG */}
      <footer className="border-t border-zinc-800/80 py-10 px-4 text-center text-xs text-zinc-500 space-y-3 bg-zinc-950">
        <div className="flex justify-center items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-zinc-950 font-black flex items-center justify-center text-xs">
            M
          </div>
          <span className="font-extrabold text-zinc-300 text-sm">Mercado San Miguelito Delivery</span>
        </div>
        <p className="font-mono text-[11px] text-zinc-400">sanmiguelito.demiempresa.online</p>

        {/* Visible Build Version Badge in Footer */}
        <div className="inline-flex items-center gap-1 bg-zinc-900 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full font-mono text-[11px] font-bold shadow-inner">
          <Tag className="w-3 h-3" /> {BUILD_INFO.tag}
        </div>

        <p className="text-[11px] text-zinc-600 max-w-lg mx-auto">
          Servicio oficial de logística y encargo centralizado en San Salvador, El Salvador. Cobertura de 5 km.
        </p>
        <p className="text-[10px] text-zinc-600 pt-2 border-t border-zinc-900">
          © 2026 Operado por Demiempresa. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
