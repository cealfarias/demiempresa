import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { MapPin, Phone, Clock, Bike, Sparkles, ArrowLeft, QrCode, AlertTriangle, AlertOctagon, XCircle, ShieldCheck } from 'lucide-react';

export default function OrderTrackingView({ onBackToCatalog }) {
  const { orders, activeTrackingOrderId, cancelOrder, reportIncident } = useMercado();
  const [incidentText, setIncidentText] = useState('');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const currentOrder = orders.find((o) => o.id === activeTrackingOrderId) || orders[0];

  const getProgressPercentage = (status) => {
    if (status === 'Cancelado') return 0;
    if (status === 'Pago Confirmado') return 20;
    if (status === 'En Recolección') return 45;
    if (status === 'En Centro Acopio' || status === 'Listo en Acopio (Pickup)') return 70;
    if (status === 'En Camino') return 90;
    if (status === 'Entregado') return 100;
    return 30;
  };

  const progressPercent = getProgressPercentage(currentOrder?.status);

  if (!currentOrder) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs">
        No hay pedidos activos para rastrear. Realiza una compra desde el catálogo.
      </div>
    );
  }

  const canCancel = currentOrder.status === 'Pago Confirmado' || currentOrder.status === 'En Recolección';

  const handleCancelConfirm = () => {
    cancelOrder(currentOrder.id);
    setShowCancelModal(false);
  };

  const handleIncidentSubmit = (e) => {
    e.preventDefault();
    if (incidentText.trim()) {
      reportIncident(currentOrder.id, incidentText);
      setIncidentText('');
      setShowIncidentModal(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 max-w-4xl mx-auto">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCatalog}
          className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-[#131B29] border border-slate-800 px-3 py-1.5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
        </button>
        <span className="text-[11px] text-slate-400 font-bold">Rastreo GPS & Estado en Vivo</span>
      </div>

      {/* Main Tracking Card */}
      <div className="bg-[#131B29] border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6">
        
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black text-orange-400">{currentOrder.id}</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                {currentOrder.paymentMethod}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentOrder.deliveryType === 'pickup' ? (
                <strong className="text-emerald-400">Modalidad: Retiro Pickup en Mercado San Miguelito</strong>
              ) : (
                <>Dirección: <strong className="text-slate-200">{currentOrder.address}</strong></>
              )}
            </p>
          </div>

          {/* ETA Badge */}
          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-2.5 text-right shrink-0">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Tiempo Est. Llegada</span>
            <span className="text-base sm:text-lg font-black text-emerald-400 flex items-center justify-end gap-1">
              <Clock className="w-4 h-4 animate-spin text-emerald-400" /> ~{currentOrder.etaMinutes || 15} min
            </span>
          </div>
        </div>

        {/* Canceled Alert Banner if Canceled */}
        {currentOrder.status === 'Cancelado' && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 space-y-0.5">
            <span className="font-black text-xs flex items-center gap-1.5 text-rose-400">
              <XCircle className="w-4 h-4" /> Orden Cancelada
            </span>
            <p className="text-[11px]">Cargo administrativo (20%): <strong>${currentOrder.cancellationPenalty?.toFixed(2)}</strong>.</p>
            <p className="text-[11px]">Monto reembolsado (80%): <strong>${currentOrder.refundAmount?.toFixed(2)}</strong>.</p>
          </div>
        )}

        {/* Dynamic Progress Bar */}
        {currentOrder.status !== 'Cancelado' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5" /> Estado: {currentOrder.status}
              </span>
              <span className="text-slate-400 text-[10px]">{progressPercent}% completado</span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* PICKUP QR CODE DISPLAY */}
        {currentOrder.deliveryType === 'pickup' && currentOrder.status !== 'Cancelado' && (
          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 text-center space-y-2 max-w-xs mx-auto">
            <span className="text-xs font-black text-emerald-400 block uppercase tracking-wider">
              Código QR para Retiro en Acopio
            </span>
            <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto flex items-center justify-center shadow-lg">
              <QrCode className="w-28 h-28 text-slate-950" />
            </div>
            <p className="text-xs font-extrabold text-slate-100 font-mono">{currentOrder.qrCode}</p>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-[10px] text-emerald-300">
              <AlertTriangle className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
              Límite de espera: <strong>48 horas</strong>.
            </div>
          </div>
        )}

        {/* Simulated Interactive Live Map View (If Delivery) */}
        {currentOrder.deliveryType === 'domicilio' && currentOrder.status !== 'Cancelado' && (
          <div className="relative h-44 sm:h-52 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-between p-3">
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-emerald-500/30 border-t border-dashed border-emerald-400 animate-pulse" />

            <div className="relative z-10 flex justify-between items-center h-full px-2">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-zinc-950 flex items-center justify-center font-black shadow-lg">
                  🏬
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                  Mercado
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 text-center animate-bounce">
                <div className="w-9 h-9 rounded-full bg-cyan-500 text-zinc-950 flex items-center justify-center font-black shadow-lg border-2 border-cyan-300">
                  <Bike className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-cyan-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                  5 km GPS
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-zinc-950 flex items-center justify-center font-black shadow-lg">
                  🏠
                </div>
                <span className="text-[10px] font-bold text-orange-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                  Tu Dirección
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Team Cards (Driver & Collector) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <Bike className="w-3.5 h-3.5" /> Motorista Delivery
              </span>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded">
                {currentOrder.dispatcherTipo || 'moto'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-base border border-cyan-500/40">
                🛵
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-100">{currentOrder.dispatcherName}</h4>
                <p className="text-[11px] text-slate-400">{currentOrder.dispatcherVehicle}</p>
              </div>
            </div>

            <a
              href={`tel:${currentOrder.dispatcherPhone}`}
              className="w-full py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Phone className="w-3.5 h-3.5" /> Llamar ({currentOrder.dispatcherPhone})
            </a>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Recolector (Runner)
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                Runner Mercado
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base border border-emerald-500/40">
                🏃
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-100">{currentOrder.collectorName}</h4>
                <p className="text-[11px] text-slate-400">Recolecta en puestos pasillo por pasillo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Emergency & Cancellation */}
        {currentOrder.status !== 'Cancelado' && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancelar Pedido (20% Cargo)
              </button>
            )}

            <button
              onClick={() => setShowIncidentModal(true)}
              className="flex-1 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
            >
              <AlertOctagon className="w-3.5 h-3.5" /> Reportar Emergencia / Incidente
            </button>
          </div>
        )}

      </div>

      {/* EMERGENCY INCIDENT MODAL */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#131B29] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-3">
            <h3 className="font-black text-sm text-slate-100 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-orange-400" /> Reportar Incidente a Acopio
            </h3>
            <p className="text-xs text-slate-400">
              Notificación inmediata a la mesa de acopio del Mercado.
            </p>

            <form onSubmit={handleIncidentSubmit} className="space-y-2.5">
              <textarea
                required
                rows={3}
                placeholder="Describe la emergencia o problema con el pedido..."
                value={incidentText}
                onChange={(e) => setIncidentText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-500 text-zinc-950 rounded-xl text-xs font-black"
                >
                  Enviar Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#131B29] border border-rose-500/30 rounded-xl max-w-md w-full p-5 space-y-3 text-xs">
            <h3 className="font-black text-sm text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> ¿Confirmar Cancelación?
            </h3>
            <p className="text-slate-300">
              Monto del pedido: <strong>${currentOrder.total.toFixed(2)}</strong>
            </p>
            <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 space-y-0.5 text-rose-300">
              <p>• <strong>Cargo administrativo (20%)</strong>: ${(currentOrder.total * 0.20).toFixed(2)}</p>
              <p>• <strong>Reembolso pasarela (80%)</strong>: ${(currentOrder.total * 0.80).toFixed(2)}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-slate-100 rounded-xl text-xs font-black"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

