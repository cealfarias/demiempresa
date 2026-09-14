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
    <div className="min-h-screen bg-[#0A1120] text-slate-100 font-sans selection:bg-[#00D09C] selection:text-[#0A1120]">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#0A1120]/95 backdrop-blur-xl border-b border-[#00D09C]/20 px-3 py-3 sm:px-6 sm:py-4 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo & Concatenated Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center p-1 shadow-glow-mint">
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-extrabold text-xs sm:text-base md:text-lg text-white tracking-tight">
                  Mercados Nacionales <span className="text-[#00D09C]">Delivery</span> <span className="text-slate-300 font-mono text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">{BUILD_INFO.tag}</span>
                </h1>
              </div>
              <p className="text-[10px] sm:text-xs text-[#00D09C]/90 font-mono tracking-wide">San Miguelito • sanmiguelito.demiempresa.online</p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenLogin}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" /> <span className="hidden sm:inline">Acceder /</span> Registro
            </button>
            <button
              onClick={onOpenPWA}
              className="px-3 py-1.5 sm:px-5 sm:py-2 bg-[#00D09C] hover:bg-[#10E3B2] text-[#0A1120] font-black rounded-xl text-[11px] sm:text-xs transition-all flex items-center gap-1.5 shadow-glow-mint active:scale-95"
            >
              <span>Ver Catálogo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20 px-4">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[#00D09C]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-5 w-64 h-64 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          
          {/* Trademark-Safe Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-[#00D09C]/30 text-white text-[10px] sm:text-xs font-bold shadow-inner">
            <span className="bg-[#00D09C] text-[#0A1120] font-black px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">PLATAFORMA</span>
            <span>Mercados Nacionales Delivery</span>
          </div>

          {/* Trademark-Safe Heading */}
          <h1 className="text-2xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-snug sm:leading-tight max-w-3xl mx-auto">
            Mercados Nacionales <br />
            <span className="text-[#00D09C]">Delivery</span> <span className="text-slate-300 font-mono text-base sm:text-2xl font-bold">{BUILD_INFO.tag}</span>
          </h1>

          <p className="text-xs sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
            Plataforma de encargo y delivery centralizado para el <strong>Mercado San Miguelito</strong>. Pupusas, sopas, verduras y carnes en una sola orden con rastreo GPS.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={onOpenPWA}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-[#00D09C] text-[#0A1120] font-black rounded-xl text-xs sm:text-sm hover:bg-[#10E3B2] transition-all flex items-center justify-center gap-2 shadow-glow-mint active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Explorar Catálogo & Ordenar</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>Iniciar Sesión / Registro</span>
            </button>
          </div>

          {/* Payment Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="font-bold text-slate-300">Pagos Seguros:</span>
            <span className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 font-bold text-[#00D09C]">
              <Building2 className="w-3.5 h-3.5" /> Davivienda (6989-3101)
            </span>
            <span className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 font-bold text-cyan-400">
              <Wallet className="w-3.5 h-3.5" /> Chivo Wallet (USD/BTC)
            </span>
            <span className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 font-bold text-indigo-400">
              <CreditCard className="w-3.5 h-3.5" /> El Cubo (Tarjetas)
            </span>
          </div>

        </div>
      </section>

      {/* CORE FEATURES */}
      <section className="py-12 px-4 bg-slate-900/50 border-y border-[#00D09C]/10">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-[11px] font-extrabold text-[#00D09C] uppercase tracking-widest">Modelo Logístico Centralizado</h2>
            <p className="text-xl sm:text-2xl font-black text-white">
              Diseñado para la dinámica real del Mercado San Miguelito
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111C2E] border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-[#00D09C]/40 transition-all shadow-lg group">
              <div className="w-10 h-10 rounded-xl bg-[#00D09C]/20 text-[#00D09C] flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                🛍️
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Carrito Multi-Puesto</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pide pupusas del Pasillo 3, sopas del Pasillo 2 y frutas del Pasillo 1 en un solo pedido consolidado.
              </p>
            </div>

            <div className="bg-[#111C2E] border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-[#00D09C]/40 transition-all shadow-lg group">
              <div className="w-10 h-10 rounded-xl bg-[#00D09C]/20 text-[#00D09C] flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                🏃
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Runners en Mercado</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Runners internos navegan local por local juntando tus productos antes de empacarlos en la Mesa de Acopio.
              </p>
            </div>

            <div className="bg-[#111C2E] border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-cyan-500/40 transition-all shadow-lg group">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                🛵
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Despacho & Retiro QR</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recibe a domicilio dentro de 5 km con GPS, o retira personalmente en Acopio con tu QR único (48h).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section className="py-12 px-4 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-[11px] font-extrabold text-[#00D09C] uppercase tracking-widest">Preguntas Frecuentes</h2>
          <p className="text-lg sm:text-xl font-black text-white">Todo lo que necesitas saber antes de ordenar</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[#111C2E] border border-slate-800 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-4 py-3 text-left font-bold text-xs sm:text-sm text-slate-200 flex items-center justify-between gap-3 hover:text-[#00D09C] transition-colors"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="w-4 h-4 text-[#00D09C] shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-3 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center text-xs text-slate-500 space-y-2 bg-[#0A1120]">
        <div className="flex justify-center items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-0.5">
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
          <span className="font-extrabold text-white text-xs sm:text-sm">Mercados Nacionales <span className="text-[#00D09C]">Delivery</span> - San Miguelito <span className="text-slate-400 font-mono text-xs">{BUILD_INFO.tag}</span></span>
        </div>
        <p className="font-mono text-[11px] text-[#00D09C]">sanmiguelito.demiempresa.online</p>

        <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
          Servicio de logística y encargo centralizado de Mercados Nacionales Delivery. Cobertura 5 km en San Salvador.
        </p>
        <p className="text-[10px] text-slate-600 pt-2 border-t border-slate-900">
          © 2026 Operado por Demiempresa. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

