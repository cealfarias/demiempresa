import React from 'react';
import { ShoppingBag, Utensils, Bike, Building2, Wallet, CreditCard, ShieldCheck, Sparkles, HeartHandshake, ArrowRight, CheckCircle2, User, Footprints, Store } from 'lucide-react';

export default function LandingPage({ onOpenPWA, onOpenLogin }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Logo & Subdomain Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 font-black text-xl shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-zinc-100 tracking-tight">
                  Mercado San Miguelito
                </h1>
                <span className="hidden sm:inline-flex bg-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/30 items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Delivery Centralizado
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">sanmiguelito.demiempresa.online</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <User className="w-4 h-4 text-amber-400" /> Iniciar Sesión
            </button>
            <button
              onClick={onOpenPWA}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-zinc-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <span>Ver Catálogo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-amber-500/40 text-amber-400 text-xs font-bold shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>PWA Oficial sin descargas para el Mercado San Miguelito</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-zinc-100 tracking-tight leading-tight max-w-4xl mx-auto">
            Los mejores puestos del <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">Mercado San Miguelito</span> a tu puerta
          </h1>

          <p className="text-sm md:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Pupusas recién hechas, sopas de gallina india, carnes frescas, frutas y lácteos de múltiples comederos en una sola orden con pago anticipado seguro y rastreo GPS.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={onOpenPWA}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 font-black rounded-2xl text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Explorar Productos y Hacer Pedido</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4 text-amber-400" />
              <span>Ingresar / Registrarme</span>
            </button>
          </div>

          {/* Payment Gateways Strip */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
            <span className="font-bold text-zinc-300">Pago Anticipado Seguro con:</span>
            <span className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 font-semibold text-emerald-400">
              <Building2 className="w-4 h-4" /> Transfer365 Móvil
            </span>
            <span className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 font-semibold text-blue-400">
              <Wallet className="w-4 h-4" /> Chivo Wallet
            </span>
            <span className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 font-semibold text-purple-400">
              <CreditCard className="w-4 h-4" /> Cubo Pago (Tarjetas)
            </span>
          </div>

        </div>
      </section>

      {/* VALUE PROPOSITIONS */}
      <section className="py-16 px-4 bg-zinc-900/50 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">¿Por qué elegirnos?</h2>
            <p className="text-2xl md:text-3xl font-black text-zinc-100">
              Un modelo diseñado exclusivamente para la dinámica del Mercado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Prop 1 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-amber-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                🛍️
              </div>
              <h3 className="font-extrabold text-base text-zinc-100">Carrito Multi-Puesto</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Combina en un solo envío pupusas del Pasillo 3, sopa de gallina del Pasillo 2 y aguacates del Pasillo 1. Un solo pago y una sola tarifa de envío.
              </p>
            </div>

            {/* Prop 2 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl">
                🏃
              </div>
              <h3 className="font-extrabold text-base text-zinc-100">Recolección Centralizada</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Nuestros *runners* internos navegan los pasillos del mercado juntando tus compras puesto por puesto antes de entregarlas al centro de acopio.
              </p>
            </div>

            {/* Prop 3 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-blue-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl">
                🛵
              </div>
              <h3 className="font-extrabold text-base text-zinc-100">Reparto por Vehículo & GPS</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Despachadores en moto, carro o bici según la distancia y volumen del paquete, con seguimiento en vivo y estimación exacta de tiempo.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS (STEP BY STEP) */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Paso a Paso</h2>
            <p className="text-2xl md:text-3xl font-black text-zinc-100">¿Cómo funciona la orden?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2 relative">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center">1</span>
              <h4 className="font-bold text-sm text-zinc-100">Eliges tus productos</h4>
              <p className="text-xs text-zinc-400">Navegas por departamentos y líneas seleccionando puestos del mercado.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2 relative">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center">2</span>
              <h4 className="font-bold text-sm text-zinc-100">Pago Anticipado</h4>
              <p className="text-xs text-zinc-400">Pagas al instante con Transfer365, Chivo o Tarjeta con propina compartida.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2 relative">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center">3</span>
              <h4 className="font-bold text-sm text-zinc-100">Recolección Interna</h4>
              <p className="text-xs text-zinc-400">El runner busca tus compras en los pasillos y arma tu paquete en acopio.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2 relative">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center">4</span>
              <h4 className="font-bold text-sm text-zinc-100">Entrega a Domicilio</h4>
              <p className="text-xs text-zinc-400">El motorista asignado lleva tu pedido hasta la puerta de tu hogar o trabajo.</p>
            </div>

          </div>
        </div>
      </section>

      {/* PARTNERS & DRIVERS CALLOUT */}
      <section className="py-16 px-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-3 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
              <Bike className="w-3.5 h-3.5" /> Red de Aliados & Transportistas
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-zinc-100">
              ¿Tienes un puesto en el Mercado o tu propio vehículo?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Registra tu comedero o puesto para recibir ventas digitales, o regístrate como repartidor (A pie, Moto, Carro, Bici) para ganar propinas y tarifas de despacho.
            </p>
          </div>

          <button
            onClick={onOpenLogin}
            className="w-full md:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-zinc-100 font-extrabold rounded-2xl text-xs transition-all whitespace-nowrap shadow-lg shrink-0"
          >
            Registrarme como Aliado / Transportista
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-8 px-4 text-center text-xs text-zinc-500 space-y-2">
        <p className="font-bold text-zinc-300">Mercado San Miguelito Delivery</p>
        <p className="font-mono text-[11px] text-zinc-400">sanmiguelito.demiempresa.online</p>
        <p>© 2026 Todos los derechos reservados. Operado por Demiempresa.</p>
      </footer>
    </div>
  );
}
