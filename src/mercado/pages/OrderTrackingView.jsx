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
      <div className="text-center py-16 text-zinc-400 text-xs">
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
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCatalog}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
        </button>
        <span className="text-xs text-zinc-500 font-semibold">Rastreo GPS & Estado en Vivo</span>
      </div>

      {/* Main Tracking Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl space-y-6 p-6">
        
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-amber-400">{currentOrder.id}</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {currentOrder.paymentMethod}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {currentOrder.deliveryType === 'pickup' ? (
                <strong className="text-amber-400">Modalidad: Retiro en Punto (Pickup en Mercado San Miguelito)</strong>
              ) : (
                <>Dirección: <strong className="text-zinc-200">{currentOrder.address}</strong></>
              )}
            </p>
          </div>

          {/* ETA Badge */}
          <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-3 text-right shrink-0">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Tiempo Est. de Llegada</span>
            <span className="text-xl font-black text-amber-400 flex items-center justify-end gap-1">
              <Clock className="w-5 h-5 animate-spin text-amber-500" /> ~{currentOrder.etaMinutes || 15} min
            </span>
          </div>
        </div>

        {/* Canceled Alert Banner if Canceled */}
        {currentOrder.status === 'Cancelado' && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-300 space-y-1">
            <span className="font-black text-sm flex items-center gap-1.5 text-rose-400">
              <XCircle className="w-5 h-5" /> Orden Cancelada
            </span>
            <p>Se aplicó el <strong>20% de cargo administrativo (${currentOrder.cancellationPenalty?.toFixed(2)})</strong>.</p>
            <p>Monto reembolsado a la pasarela original: <strong>${currentOrder.refundAmount?.toFixed(2)}</strong>.</p>
          </div>
        )}

        {/* Dynamic Progress Bar */}
        {currentOrder.status !== 'Cancelado' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-amber-400 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Estado: {currentOrder.status}
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
        )}

        {/* PICKUP QR CODE DISPLAY */}
        {currentOrder.deliveryType === 'pickup' && currentOrder.status !== 'Cancelado' && (
          <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl p-5 text-center space-y-3 max-w-sm mx-auto">
            <span className="text-xs font-black text-amber-400 block uppercase tracking-wider">
              Código QR para Retiro en Acopio (Pickup)
            </span>
            <div className="w-40 h-40 bg-white p-2 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <QrCode className="w-36 h-36 text-zinc-950" />
            </div>
            <p className="text-xs font-bold text-zinc-100 font-mono">{currentOrder.qrCode}</p>
            <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[11px] text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 inline mr-1" />
              Límite de espera: <strong>48 horas</strong> tras el pago.
            </div>
          </div>
        )}

        {/* Simulated Interactive Live Map View (If Delivery) */}
        {currentOrder.deliveryType === 'domicilio' && currentOrder.status !== 'Cancelado' && (
          <div className="relative h-56 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex flex-col justify-between p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            <div className="absolute top-1/2 left-12 right-12 h-1 bg-amber-500/30 border-t border-dashed border-amber-400 animate-pulse" />

            <div className="relative z-10 flex justify-between items-center h-full px-4">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black shadow-lg border-2 border-zinc-900">
                  🏬
                </div>
                <span className="text-[11px] font-bold text-amber-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                  Mercado San Miguelito
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 text-center animate-bounce">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-zinc-100 flex items-center justify-center font-black shadow-lg border-2 border-blue-400">
                  <Bike className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-blue-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                  Radio 5 km
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-lg border-2 border-zinc-900">
                  🏠
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                  Tu Dirección
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Team Cards (Driver & Collector) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                <Bike className="w-4 h-4" /> Despachador Asignado
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded">
                {currentOrder.dispatcherTipo || 'moto'}
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
                <p className="text-xs text-zinc-400">Recorre los puestos asignados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Emergency & Cancellation */}
        {currentOrder.status !== 'Cancelado' && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Cancelar Pedido (Cargo 20%)
              </button>
            )}

            <button
              onClick={() => setShowIncidentModal(true)}
              className="flex-1 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <AlertOctagon className="w-4 h-4" /> Protocolo de Emergencias / Incidente
            </button>
          </div>
        )}

      </div>

      {/* EMERGENCY INCIDENT MODAL */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-base text-zinc-100 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-amber-400" /> Reportar Incidente a Supervisor
            </h3>
            <p className="text-xs text-zinc-400">
              Notificación inmediata a la mesa de acopio. Se activará un runner/repartidor de respaldo si es necesario.
            </p>

            <form onSubmit={handleIncidentSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Describe la emergencia o problema con el pedido..."
                value={incidentText}
                onChange={(e) => setIncidentText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 text-zinc-950 rounded-xl text-xs font-black"
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
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-black text-base text-rose-400 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> ¿Confirmar Cancelación del Pedido?
            </h3>
            <p className="text-zinc-300">
              Monto del pedido: <strong>${currentOrder.total.toFixed(2)}</strong>
            </p>
            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 space-y-1 text-rose-300">
              <p>• <strong>Cargo administrativo (20%)</strong>: ${(currentOrder.total * 0.20).toFixed(2)}</p>
              <p>• <strong>Reembolso a pasarela (80%)</strong>: ${(currentOrder.total * 0.80).toFixed(2)}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
              >
                No, mantener pedido
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-zinc-100 rounded-xl text-xs font-black"
              >
                Sí, cancelar pedido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
