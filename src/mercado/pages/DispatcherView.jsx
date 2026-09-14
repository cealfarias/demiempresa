import React from 'react';
import { useMercado } from '../context/MercadoContext';
import { Bike, MapPin, Phone, CheckCircle2, HeartHandshake, Sparkles, Navigation, Clock } from 'lucide-react';

export default function DispatcherView() {
  const { orders, updateOrderStatus } = useMercado();

  // Orders available for dispatcher (En Centro Acopio or En Camino)
  const readyOrders = orders.filter((o) => o.status === 'En Centro Acopio' || o.status === 'En Camino');

  // Total tips earned today by dispatcher
  const totalDispatcherTips = orders.reduce((sum, o) => sum + (o.tipDispatcher || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-500/20 via-cyan-600/10 to-[#131B29] border border-cyan-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] sm:text-xs font-bold border border-cyan-500/40">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Despachador (Motorista Delivery)
          </div>
          <h2 className="text-base sm:text-xl font-black text-slate-100 mt-1">
            Entregas a Domicilio desde Acopio
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Recoge paquetes listos en el Mercado San Miguelito y entrega al cliente.
          </p>
        </div>

        {/* Tip Counter Widget */}
        <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-2.5 sm:p-3 text-right flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Tu Propina Acumulada</span>
            <span className="text-base sm:text-lg font-black text-cyan-400">${totalDispatcherTips.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
          Pedidos Listos para Entregar ({readyOrders.length})
        </h3>

        {readyOrders.length === 0 ? (
          <div className="bg-[#131B29] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            No hay paquetes empacados en el centro de acopio por el momento.
          </div>
        ) : (
          readyOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#131B29] border border-slate-800 rounded-xl overflow-hidden shadow-lg p-4 space-y-3 hover:border-slate-700 transition-all"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-orange-400">{order.id}</span>
                    <span className="bg-slate-950 text-slate-300 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-800">
                      <Clock className="w-3 h-3 text-cyan-400" /> {order.date}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 font-bold">Cliente: {order.customerName}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Propina:</span>
                  <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-black px-2 py-0.5 rounded-lg">
                    +${order.tipDispatcher.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Dirección de Entrega:</span>
                  <div className="flex items-start gap-1.5 text-slate-100 font-semibold text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{order.address}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Contacto & Pago:</span>
                  <div className="flex items-center gap-1.5 text-slate-100 font-semibold text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{order.phone}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Pago: <strong className="text-emerald-400">{order.paymentMethod} (Anticipado)</strong>
                  </span>
                </div>
              </div>

              {/* Order Package Contents Summary */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs space-y-1">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Paquete de Mercado ({order.items.length} productos):</span>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {order.items.map((i, idx) => (
                    <span key={idx} className="bg-slate-900 text-slate-300 text-[10px] px-2 py-0.5 rounded-lg border border-slate-800 font-medium">
                      {i.quantity}x {i.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-0.5">
                {order.status === 'En Centro Acopio' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'En Camino')}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Navigation className="w-4 h-4" /> Recoger Paquete e Iniciar Ruta
                  </button>
                )}

                {order.status === 'En Camino' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'Entregado')}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 rounded-xl font-black text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-glow-emerald"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Entrega Realizada
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
