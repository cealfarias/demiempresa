import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { PUESTOS, PRODUCTOS, METODOS_PAGO } from '../data/mockData';
import { ShieldCheck, DollarSign, HeartHandshake, Store, Edit2, Bike, Car, Footprints, AlertOctagon, QrCode, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AdminView() {
  const { orders, repartidores, updateOrderStatus } = useMercado();
  const [productList, setProductList] = useState(PRODUCTOS);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  const [scannedQR, setScannedQR] = useState('');
  const [qrScanResult, setQrScanResult] = useState(null);

  // Financial Metrics with 10% App Commission
  const totalSales = orders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? o.total : 0), 0);
  const totalAppCommission = orders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? (o.appCommission || 0) : 0), 0);
  const totalTipsShared = orders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? o.tip : 0), 0);

  // Orders with incidents/emergencias reported
  const ordersWithIncidents = orders.filter((o) => o.incidents && o.incidents.length > 0);

  const handlePriceSave = (productId) => {
    const parsed = parseFloat(tempPrice);
    if (!isNaN(parsed) && parsed > 0) {
      setProductList((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: parsed } : p))
      );
    }
    setEditingPriceId(null);
  };

  const handleQRVerify = (e) => {
    e.preventDefault();
    const foundOrder = orders.find(
      (o) => o.qrCode === scannedQR || o.id === scannedQR || `QR-${o.id}` === scannedQR
    );

    if (foundOrder) {
      updateOrderStatus(foundOrder.id, 'Entregado (Pickup Validado)');
      setQrScanResult({ success: true, order: foundOrder });
    } else {
      setQrScanResult({ success: false, message: 'Código QR no encontrado o expirado.' });
    }
  };

  const getVehicleBadge = (tipo) => {
    if (tipo === 'apie') return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Footprints className="w-3 h-3" /> Runner (A pie)</span>;
    if (tipo === 'bicicleta') return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Bici</span>;
    if (tipo === 'moto') return <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Moto</span>;
    return <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Car className="w-3 h-3" /> Carro</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-500/20 via-purple-600/10 to-[#131B29] border border-indigo-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-bold border border-indigo-500/40">
            <ShieldCheck className="w-3 h-3 text-indigo-400" /> Mesa de Acopio & Supervisión
          </div>
          <h2 className="text-base sm:text-xl font-black text-slate-100 mt-1">
            Panel de Control Mercado San Miguelito
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Supervisión de runners, despacho a 5 km, comisión del 10% y protocolo de emergencias.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Ventas Totales</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-base sm:text-xl font-black text-slate-100">${totalSales.toFixed(2)}</p>
          <p className="text-[9px] text-slate-500">Procesado en app</p>
        </div>

        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Ganancia App (10%)</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-base sm:text-xl font-black text-emerald-400">${totalAppCommission.toFixed(2)}</p>
          <p className="text-[9px] text-emerald-300/80">Comisión 10%</p>
        </div>

        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Propinas Equipo</span>
            <HeartHandshake className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-base sm:text-xl font-black text-cyan-400">${totalTipsShared.toFixed(2)}</p>
          <p className="text-[9px] text-slate-500">División 50/50</p>
        </div>

        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Puestos de Mercado</span>
            <Store className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-base sm:text-xl font-black text-slate-100">{PUESTOS.length}</p>
          <p className="text-[9px] text-slate-500">Pasillos 1 al 5</p>
        </div>
      </div>

      {/* EMERGENCY INCIDENT QUEUE FOR SUPERVISOR */}
      {ordersWithIncidents.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/40 rounded-xl p-4 space-y-2">
          <h3 className="font-black text-xs sm:text-sm text-orange-400 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 animate-pulse" /> Emergencias Reportadas ({ordersWithIncidents.length})
          </h3>

          <div className="space-y-1.5">
            {ordersWithIncidents.map((order) => (
              <div key={order.id} className="bg-slate-950 p-2.5 rounded-xl border border-orange-500/30 text-xs space-y-1">
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="text-slate-100">Orden {order.id} - Cliente: {order.customerName}</span>
                  <span className="text-orange-400">Tel: {order.phone}</span>
                </div>
                {order.incidents.map((inc) => (
                  <p key={inc.id} className="text-slate-300 italic bg-slate-900 p-1.5 rounded text-[10px]">
                    "{inc.note}" <span className="text-[9px] text-slate-500 block">({inc.timestamp})</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PICKUP QR SCANNER SIMULATOR FOR HUB */}
      <div className="bg-[#131B29] border border-slate-800 rounded-xl p-4 space-y-2.5">
        <h3 className="font-black text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-emerald-400" /> Validador de Retiro en Punto (Pickup QR)
        </h3>

        <form onSubmit={handleQRVerify} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Escribe o escanea el Código QR (ej. QR-MSM-1001)"
            value={scannedQR}
            onChange={(e) => setScannedQR(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 font-black text-xs rounded-xl hover:brightness-110 transition-all shadow-glow-emerald"
          >
            Validar Retiro
          </button>
        </form>

        {qrScanResult && (
          <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            qrScanResult.success ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
          }`}>
            {qrScanResult.success ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Pedido {qrScanResult.order.id} validado correctamente! Entregado en acopio.</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>{qrScanResult.message}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Registered Drivers Fleet */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Flota de Transportistas Registrados ({repartidores.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {repartidores.map((r) => (
            <div key={r.id} className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1.5 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-100">{r.nombre}</h4>
                {getVehicleBadge(r.tipoTransporte)}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{r.vehiculo}</p>
              <div className="flex items-center justify-between text-[10px] pt-1 text-slate-400 border-t border-slate-800">
                <span>Tel: {r.telefono}</span>
                <span className="text-emerald-400 font-bold">★ {r.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Puesto Price Management */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Gestión de Precios por Puesto del Mercado
          </h3>
        </div>

        <div className="bg-[#131B29] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="p-2.5">Producto</th>
                  <th className="p-2.5">Puesto / Vendedor</th>
                  <th className="p-2.5">Pasillo</th>
                  <th className="p-2.5">Precio</th>
                  <th className="p-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {productList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-bold text-slate-100">{p.name}</td>
                    <td className="p-2.5 text-orange-400 font-bold">{p.puestoName}</td>
                    <td className="p-2.5 text-slate-400">{p.pasillo}</td>
                    <td className="p-2.5 font-black text-emerald-400">
                      {editingPriceId === p.id ? (
                        <input
                          type="number"
                          step="0.05"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="w-16 bg-slate-950 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-emerald-400 focus:outline-none"
                        />
                      ) : (
                        `$${p.price.toFixed(2)} / ${p.unit}`
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      {editingPriceId === p.id ? (
                        <button
                          onClick={() => handlePriceSave(p.id)}
                          className="bg-emerald-500 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded hover:bg-emerald-400"
                        >
                          Guardar
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPriceId(p.id);
                            setTempPrice(p.price.toString());
                          }}
                          className="bg-slate-900 text-slate-300 hover:text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 ml-auto"
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
