import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { PUESTOS, PRODUCTOS, METODOS_PAGO } from '../data/mockData';
import { ShieldCheck, DollarSign, HeartHandshake, Store, Edit2, Bike, Car, Footprints, UserPlus } from 'lucide-react';

export default function AdminView() {
  const { orders, repartidores } = useMercado();
  const [productList, setProductList] = useState(PRODUCTOS);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');

  // Financial Metrics
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalTipsShared = orders.reduce((sum, o) => sum + o.tip, 0);
  const totalCollectorTips = orders.reduce((sum, o) => sum + o.tipCollector, 0);
  const totalDispatcherTips = orders.reduce((sum, o) => sum + o.tipDispatcher, 0);

  const handlePriceSave = (productId) => {
    const parsed = parseFloat(tempPrice);
    if (!isNaN(parsed) && parsed > 0) {
      setProductList((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: parsed } : p))
      );
    }
    setEditingPriceId(null);
  };

  const getVehicleBadge = (tipo) => {
    if (tipo === 'apie') return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Footprints className="w-3 h-3" /> A Pie / Runner</span>;
    if (tipo === 'bicicleta') return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Bicicleta</span>;
    if (tipo === 'moto') return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Motocicleta</span>;
    return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Car className="w-3 h-3" /> Automóvil / Carro</span>;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-purple-500/20 via-pink-600/10 to-zinc-900 border border-purple-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/40">
            <ShieldCheck className="w-3.5 h-3.5" /> Panel de Control y Centro de Acopio
          </div>
          <h2 className="text-xl md:text-2xl font-black text-zinc-100 mt-2">
            Gestión Centralizada del Mercado San Miguelito
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Monitoreo de ventas, flota de repartidores por vehículo y pasarelas de pago.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Ventas Totales</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-zinc-100">${totalSales.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500">Cobrado vía pago anticipado</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Propinas Repartidas</span>
            <HeartHandshake className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">${totalTipsShared.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-400">
            Runner: ${totalCollectorTips.toFixed(2)} | Motorista: ${totalDispatcherTips.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Puestos Registrados</span>
            <Store className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-zinc-100">{PUESTOS.length}</p>
          <p className="text-[10px] text-zinc-500">En pasillos 1 al 5 del Mercado</p>
        </div>
      </div>

      {/* Registered Drivers Fleet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Flota de Transportistas Registrados ({repartidores.length})
          </h3>
          <span className="text-xs text-zinc-500">Asignación por tipo de vehículo (A pie, Moto, Carro)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {repartidores.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition-all">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-100">{r.nombre}</h4>
                {getVehicleBadge(r.tipoTransporte)}
              </div>
              <p className="text-xs text-zinc-400 truncate">{r.vehiculo}</p>
              <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400 border-t border-zinc-800">
                <span>Tel: {r.telefono}</span>
                <span className="text-emerald-400 font-bold">★ {r.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Gateway Status Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pasarelas de Pago Activas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {METODOS_PAGO.map((m) => (
            <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-100">{m.name}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-zinc-400">{m.subtitle}</p>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                Estado: Operativo (Pago Anticipado)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Puesto Price Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Gestión de Precios por Puesto del Mercado
          </h3>
          <span className="text-xs text-zinc-500">Permite ajustar variaciones de precio por vendedor</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-bold">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Puesto / Vendedor</th>
                  <th className="p-3">Ubicación Pasillo</th>
                  <th className="p-3">Precio Actual</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-200">
                {productList.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 font-semibold text-zinc-100">{p.name}</td>
                    <td className="p-3 text-amber-400 font-medium">{p.puestoName}</td>
                    <td className="p-3 text-zinc-400">{p.pasillo}</td>
                    <td className="p-3 font-extrabold text-zinc-100">
                      {editingPriceId === p.id ? (
                        <input
                          type="number"
                          step="0.05"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="w-20 bg-zinc-950 border border-amber-500 rounded px-2 py-1 text-xs text-amber-400 focus:outline-none"
                        />
                      ) : (
                        `$${p.price.toFixed(2)} / ${p.unit}`
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editingPriceId === p.id ? (
                        <button
                          onClick={() => handlePriceSave(p.id)}
                          className="bg-emerald-500 text-zinc-950 text-[11px] font-bold px-2.5 py-1 rounded hover:bg-emerald-400"
                        >
                          Guardar
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPriceId(p.id);
                            setTempPrice(p.price.toString());
                          }}
                          className="bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-[11px] font-semibold px-2.5 py-1 rounded border border-zinc-700 flex items-center gap-1 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
