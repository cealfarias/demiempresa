import React from 'react';
import { useMercado } from '../context/MercadoContext';
import { CheckCircle2, Circle, MapPin, PackageCheck, HeartHandshake, Sparkles, Clock } from 'lucide-react';

export default function CollectorView() {
  const { orders, toggleItemCollected, updateOrderStatus } = useMercado();

  // Active orders assigned for collection
  const activeOrders = orders.filter((o) => o.status === 'En Recolección' || o.status === 'En Centro Acopio');

  // Total tips earned today by collector
  const totalCollectorTips = orders.reduce((sum, o) => sum + (o.tipCollector || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-500/20 via-teal-600/10 to-zinc-900 border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
            <Sparkles className="w-3.5 h-3.5" /> App del Recolector (Runner Mercado)
          </div>
          <h2 className="text-xl md:text-2xl font-black text-zinc-100 mt-2">
            Ruta de Compra Puesto por Puesto
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Organizada por pasillos dentro del Mercado San Miguelito para optimizar tu caminata.
          </p>
        </div>

        {/* Tip Counter Widget */}
        <div className="bg-zinc-950/80 border border-emerald-500/40 rounded-xl p-3.5 text-right flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Tu Propina Acumulada</span>
            <span className="text-xl font-black text-emerald-400">${totalCollectorTips.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Pedidos Activos en Recolección ({activeOrders.length})
        </h3>

        {activeOrders.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-xs">
            No hay pedidos pendientes de recolección en este momento.
          </div>
        ) : (
          activeOrders.map((order) => {
            const allItemsCollected = order.items.every((i) => i.collected);
            return (
              <div
                key={order.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg space-y-4 p-5 hover:border-zinc-700 transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-400">{order.id}</span>
                      <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {order.date}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">Cliente: {order.customerName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">Propina asignada:</span>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black px-2.5 py-1 rounded-lg">
                      +${order.tipCollector.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items Checklist by Stall */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Lista de Compras ({order.items.filter((i) => i.collected).length}/{order.items.length} ítems listos)
                  </h4>

                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItemCollected(order.id, item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          item.collected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-100 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.collected ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${item.collected ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                              {item.quantity}x {item.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-amber-400 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0 text-amber-500" />
                              <span className="truncate">{item.puestoName} ({item.pasillo})</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-zinc-200">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-2">
                  {order.status === 'En Recolección' ? (
                    <button
                      disabled={!allItemsCollected}
                      onClick={() => updateOrderStatus(order.id, 'En Centro Acopio')}
                      className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
                        allItemsCollected
                          ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-lg cursor-pointer'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                      }`}
                    >
                      <PackageCheck className="w-4 h-4" />
                      {allItemsCollected
                        ? 'Entregar Paquete Completo en Centro de Acopio'
                        : 'Marca todos los productos recolectados para continuar'}
                    </button>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold p-3 rounded-xl text-center flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Entregado en Centro de Acopio - En espera de motorista
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
