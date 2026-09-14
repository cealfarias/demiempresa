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
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-blue-500/20 via-indigo-600/10 to-zinc-900 border border-blue-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/40">
            <Sparkles className="w-3.5 h-3.5" /> App del Despachador (Motorista)
          </div>
          <h2 className="text-xl md:text-2xl font-black text-zinc-100 mt-2">
            Entregas a Domicilio desde Acopio
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Recoge paquetes listos en el Mercado San Miguelito y entrega al cliente.
          </p>
        </div>

        {/* Tip Counter Widget */}
        <div className="bg-zinc-950/80 border border-blue-500/40 rounded-xl p-3.5 text-right flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Tu Propina Acumulada</span>
            <span className="text-xl font-black text-blue-400">${totalDispatcherTips.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Pedidos Listos para Entregar ({readyOrders.length})
        </h3>

        {readyOrders.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-xs">
            No hay paquetes empacados en el centro de acopio por el momento.
          </div>
        ) : (
          readyOrders.map((order) => (
            <div
              key={order.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg p-5 space-y-4 hover:border-zinc-700 transition-all"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-amber-400">{order.id}</span>
                    <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {order.date}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 font-bold">Cliente: {order.customerName}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">Propina motorista:</span>
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-black px-2.5 py-1 rounded-lg">
                    +${order.tipDispatcher.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Dirección de Entrega:</span>
                  <div className="flex items-start gap-2 text-zinc-100 font-semibold">
                    <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>{order.address}</span>
                  </div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Contacto & Pago:</span>
                  <div className="flex items-center gap-2 text-zinc-100 font-semibold">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{order.phone}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    Pago: <strong className="text-emerald-400">{order.paymentMethod} (Anticipado)</strong>
                  </span>
                </div>
              </div>

              {/* Order Package Contents Summary */}
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold block uppercase">Paquete de Mercado ({order.items.length} productos):</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {order.items.map((i, idx) => (
                    <span key={idx} className="bg-zinc-900 text-zinc-300 text-[11px] px-2 py-1 rounded-lg border border-zinc-800">
                      {i.quantity}x {i.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-1">
                {order.status === 'En Centro Acopio' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'En Camino')}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-zinc-100 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Navigation className="w-4 h-4" /> Recoger Paquete e Iniciar Ruta de Entrega
                  </button>
                )}

                {order.status === 'En Camino' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'Entregado')}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Entrega Realizada al Cliente
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
