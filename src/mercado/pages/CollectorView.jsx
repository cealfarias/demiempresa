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
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-500/20 via-teal-600/10 to-[#131B29] border border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold border border-emerald-500/40">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Runner de Mercado (Recolector)
          </div>
          <h2 className="text-base sm:text-xl font-black text-slate-100 mt-1">
            Ruta de Compra Puesto por Puesto
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Organizada por pasillos dentro del Mercado San Miguelito.
          </p>
        </div>

        {/* Tip Counter Widget */}
        <div className="bg-slate-950/80 border border-emerald-500/40 rounded-xl p-2.5 sm:p-3 text-right flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Tu Propina Acumulada</span>
            <span className="text-base sm:text-lg font-black text-emerald-400">${totalCollectorTips.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
          Pedidos Activos en Recolección ({activeOrders.length})
        </h3>

        {activeOrders.length === 0 ? (
          <div className="bg-[#131B29] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            No hay pedidos pendientes de recolección en este momento.
          </div>
        ) : (
          activeOrders.map((order) => {
            const allItemsCollected = order.items.every((i) => i.collected);
            return (
              <div
                key={order.id}
                className="bg-[#131B29] border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-3 p-4 hover:border-slate-700 transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-orange-400">{order.id}</span>
                      <span className="bg-slate-950 text-slate-300 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-800">
                        <Clock className="w-3 h-3 text-emerald-400" /> {order.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Cliente: {order.customerName}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Propina:</span>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black px-2 py-0.5 rounded-lg">
                      +${order.tipCollector.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items Checklist by Stall */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Lista de Compras ({order.items.filter((i) => i.collected).length}/{order.items.length} listos)
                  </h4>

                  <div className="space-y-1.5">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItemCollected(order.id, item.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          item.collected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-300'
                            : 'bg-slate-950 border-slate-800 text-slate-100 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.collected ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${item.collected ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                              {item.quantity}x {item.name}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-orange-400 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.puestoName} ({item.pasillo})</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-200">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-1">
                  {order.status === 'En Recolección' ? (
                    <button
                      disabled={!allItemsCollected}
                      onClick={() => updateOrderStatus(order.id, 'En Centro Acopio')}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                        allItemsCollected
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 hover:brightness-110 shadow-glow-emerald cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      <PackageCheck className="w-4 h-4" />
                      {allItemsCollected
                        ? 'Entregar Paquete en Acopio'
                        : 'Recolecta todos los ítems para continuar'}
                    </button>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold p-2.5 rounded-xl text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Entregado en Acopio - En espera de motorista
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
