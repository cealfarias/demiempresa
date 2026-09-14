import React, { useState, useEffect } from 'react';
import { useMercado } from '../context/MercadoContext';
import { MapPin, Phone, CheckCircle2, Clock, Navigation, HeartHandshake, ShieldCheck, Bike, Sparkles, ArrowLeft } from 'lucide-react';

export default function OrderTrackingView({ onBackToCatalog }) {
  const { orders, activeTrackingOrderId } = useMercado();

  const currentOrder = orders.find((o) => o.id === activeTrackingOrderId) || orders[0];

  // Dynamic progress percentage based on status
  const getProgressPercentage = (status) => {
    if (status === 'Pago Confirmado') return 20;
    if (status === 'En Recolección') return 45;
    if (status === 'En Centro Acopio') return 70;
    if (status === 'En Camino') return 90;
    if (status === 'Entregado') return 100;
    return 30;
  };

  const progressPercent = getProgressPercentage(currentOrder?.status);

  if (!currentOrder) {
    return (
      <div className="text-center py-16 text-zinc-400 text-xs">
        No hay pedidos activos para rastrear. Realiza una compra desde el catálogo.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCatalog}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
        </button>
        <span className="text-xs text-zinc-500 font-semibold">Rastreo GPS en Vivo</span>
      </div>

      {/* Main Tracking Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl space-y-6 p-6">
        
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-amber-400">{currentOrder.id}</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {currentOrder.paymentMethod} (Pago Confirmado)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Dirección: <strong className="text-zinc-200">{currentOrder.address}</strong>
            </p>
          </div>

          {/* ETA Badge */}
          <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-3 text-right shrink-0">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Tiempo Est. de Entrega</span>
            <span className="text-xl font-black text-amber-400 flex items-center justify-end gap-1">
              <Clock className="w-5 h-5 animate-spin text-amber-500" /> ~{currentOrder.etaMinutes || 15} min
            </span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-amber-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Estado Actual: {currentOrder.status}
            </span>
            <span className="text-zinc-400">{progressPercent}% completado</span>
          </div>

          <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Simulated Interactive Live Map View */}
        <div className="relative h-56 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex flex-col justify-between p-4">
          
          {/* Map Grid Pattern background */}
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

          {/* Route path line */}
          <div className="absolute top-1/2 left-12 right-12 h-1 bg-amber-500/30 border-t border-dashed border-amber-400 animate-pulse" />

          {/* Map Pins */}
          <div className="relative z-10 flex justify-between items-center h-full px-4">
            
            {/* Origin Pin: Mercado San Miguelito */}
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black shadow-lg border-2 border-zinc-900">
                🏬
              </div>
              <span className="text-[11px] font-bold text-amber-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                Mercado San Miguelito
              </span>
            </div>

            {/* Moving Driver Marker */}
            <div className="flex flex-col items-center gap-1 text-center animate-bounce">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-zinc-100 flex items-center justify-center font-black shadow-lg border-2 border-blue-400">
                <Bike className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                En ruta
              </span>
            </div>

            {/* Destination Pin: Customer */}
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-lg border-2 border-zinc-900">
                🏠
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                Tu Dirección
              </span>
            </div>
          </div>

          <div className="relative z-10 text-[10px] text-zinc-400 bg-zinc-950/80 p-1.5 rounded border border-zinc-800 flex items-center justify-between">
            <span>GPS San Salvador Activo</span>
            <span className="text-emerald-400 font-bold">● Actualizado hace 5 seg</span>
          </div>
        </div>

        {/* Assigned Team Cards (Driver & Collector) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Assigned Driver / Motorista */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                <Bike className="w-4 h-4" /> Despachador Asignado
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded">
                Vehículo: {currentOrder.dispatcherTipo || 'moto'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg border border-blue-500/40">
                🛵
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-100">{currentOrder.dispatcherName}</h4>
                <p className="text-xs text-zinc-400">{currentOrder.dispatcherVehicle}</p>
              </div>
            </div>

            <a
              href={`tel:${currentOrder.dispatcherPhone}`}
              className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-3.5 h-3.5" /> Llamar al Motorista ({currentOrder.dispatcherPhone})
            </a>
          </div>

          {/* Assigned Collector / Runner */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Recolector del Mercado
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                Runner Interno
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-500/40">
                🏃
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-100">{currentOrder.collectorName}</h4>
                <p className="text-xs text-zinc-400">Juntó tus productos puesto por puesto</p>
              </div>
            </div>

            <div className="bg-zinc-900 p-2 rounded-lg text-[11px] text-zinc-400 border border-zinc-800 flex items-center justify-between">
              <span>Propina compartida:</span>
              <span className="text-emerald-400 font-bold">${currentOrder.tipCollector.toFixed(2)} / cada uno</span>
            </div>
          </div>
        </div>

        {/* Order Items Breakdown */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Detalle del Paquete ({currentOrder.items.length} productos)
          </h4>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl divide-y divide-zinc-800 text-xs">
            {currentOrder.items.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-100">{item.quantity}x {item.name}</span>
                  <p className="text-[11px] text-amber-400">{item.puestoName} ({item.pasillo})</p>
                </div>
                <span className="font-extrabold text-zinc-200">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
