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
    if (tipo === 'apie') return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Footprints className="w-3 h-3" /> Runner (A pie)</span>;
    if (tipo === 'bicicleta') return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Bicicleta</span>;
    if (tipo === 'moto') return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Moto</span>;
    return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Car className="w-3 h-3" /> Carro</span>;
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-purple-500/20 via-pink-600/10 to-zinc-900 border border-purple-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/40">
            <ShieldCheck className="w-3.5 h-3.5" /> Rol Supervisor / Mesa de Acopio Mercado
          </div>
          <h2 className="text-xl md:text-2xl font-black text-zinc-100 mt-2">
            Panel de Control Mercado San Miguelito
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Supervisión de runners, despacho a 5 km, comisión del 10% y protocolo de accidentes.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Ventas Totales</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-zinc-100">${totalSales.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500">Procesado en plataforma</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Ganancia App (10%)</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">${totalAppCommission.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-400">Comisión de sostenibilidad</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Propinas Equipo</span>
            <HeartHandshake className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">${totalTipsShared.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500">Divididas Runner/Motorista</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Puestos de Mercado</span>
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-zinc-100">{PUESTOS.length}</p>
          <p className="text-[10px] text-zinc-500">Pasillos 1 al 5</p>
        </div>
      </div>

      {/* EMERGENCY INCIDENT QUEUE FOR SUPERVISOR */}
      {ordersWithIncidents.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 space-y-3">
          <h3 className="font-black text-sm text-amber-400 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 animate-pulse" /> Incidentes / Emergencias Reportadas ({ordersWithIncidents.length})
          </h3>

          <div className="space-y-2">
            {ordersWithIncidents.map((order) => (
              <div key={order.id} className="bg-zinc-950 p-3 rounded-xl border border-amber-500/30 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-zinc-100">Orden {order.id} - Cliente: {order.customerName}</span>
                  <span className="text-amber-400">Tel: {order.phone}</span>
                </div>
                {order.incidents.map((inc) => (
                  <p key={inc.id} className="text-zinc-300 italic bg-zinc-900 p-2 rounded">
                    "{inc.note}" <span className="text-[10px] text-zinc-500 block">({inc.timestamp})</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PICKUP QR SCANNER SIMULATOR FOR HUB */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-black text-sm text-zinc-100 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-amber-400" /> Validador de Retiro en Punto (Pickup QR)
        </h3>

        <form onSubmit={handleQRVerify} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Escribe o escanea el Código QR (ej. QR-MSM-1001)"
            value={scannedQR}
            onChange={(e) => setScannedQR(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 text-zinc-950 font-black text-xs rounded-xl hover:bg-amber-400 transition-all"
          >
            Validar Retiro
          </button>
        </form>

        {qrScanResult && (
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            qrScanResult.success ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
          }`}>
            {qrScanResult.success ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>¡Pedido {qrScanResult.order.id} validado correctamente! Entregado en punto acopio.</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                <span>{qrScanResult.message}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Registered Drivers Fleet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Flota de Transportistas Registrados ({repartidores.length})
          </h3>
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

      {/* Puesto Price Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Gestión de Precios por Puesto del Mercado
          </h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-bold">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Puesto / Vendedor</th>
                  <th className="p-3">Pasillo</th>
                  <th className="p-3">Precio</th>
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
