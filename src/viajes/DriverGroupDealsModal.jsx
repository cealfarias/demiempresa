import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Wrench,
  Scale,
  Car,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  TrendingDown,
  Users,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  Percent,
  Sparkles
} from 'lucide-react';
import {
  fetchGroupDealsApi,
  createDealOrderApi,
  fetchDriverDealOrdersApi,
  submitDriverDemandApi,
  fetchDemandSummaryApi
} from './api';

export default function DriverGroupDealsModal({ isOpen, onClose, driverProfile }) {
  const [activeTab, setActiveTab] = useState('deals'); // 'deals' | 'demand' | 'my-orders'
  const [deals, setDeals] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [demandSummary, setDemandSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Modal de Pago por Transfer365 Móvil
  const [selectedDealForPayment, setSelectedDealForPayment] = useState(null);
  const [transferRef, setTransferRef] = useState('');
  const [vehiclePlateInput, setVehiclePlateInput] = useState(driverProfile?.vehicle_plate || '');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState(null);

  // Formulario de Encuesta de Demanda
  const [demandCategory, setDemandCategory] = useState('REPUESTOS');
  const [demandVehicleInfo, setDemandVehicleInfo] = useState(
    driverProfile?.vehicle_model ? `${driverProfile.vehicle_model} (${driverProfile.vehicle_plate || ''})` : ''
  );
  const [demandDescription, setDemandDescription] = useState('');
  const [demandUrgency, setDemandUrgency] = useState('ESTA_SEMANA');
  const [submittingDemand, setSubmittingDemand] = useState(false);
  const [demandSuccessMessage, setDemandSuccessMessage] = useState(null);

  const driverId = driverProfile?.id || driverProfile?.driver_id || '00000000-0000-0000-0000-000000000000';
  const driverName = driverProfile?.full_name || 'Conductor Rumbo';

  // Cargar datos al abrir modal
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsRes, ordersRes, summaryRes] = await Promise.all([
        fetchGroupDealsApi(),
        fetchDriverDealOrdersApi(driverId),
        fetchDemandSummaryApi()
      ]);

      if (dealsRes.deals) setDeals(dealsRes.deals);
      if (ordersRes.orders) setMyOrders(ordersRes.orders);
      if (summaryRes.summary) setDemandSummary(summaryRes.summary);
    } catch (err) {
      console.error('Error cargando compras colectivas:', err);
      setError('No se pudieron cargar los lotes del club en este momento.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleOpenPayment = (deal) => {
    setSelectedDealForPayment(deal);
    setTransferRef('');
    setPaymentSuccessOrder(null);
    setVehiclePlateInput(driverProfile?.vehicle_plate || '');
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!transferRef.trim()) {
      alert('Ingresa el número de referencia o confirmación del pago Transfer365 Móvil.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await createDealOrderApi({
        dealId: selectedDealForPayment.id,
        driverId,
        driverName,
        vehiclePlate: vehiclePlateInput.trim().toUpperCase() || 'RUMBO',
        amountPaid: selectedDealForPayment.group_price,
        transferReference: transferRef.trim()
      });

      if (res.success && res.order) {
        setPaymentSuccessOrder(res.order);
        // Refrescar órdenes y lotes
        loadInitialData();
      } else {
        alert(res.error || 'Hubo un error al registrar el pago.');
      }
    } catch (err) {
      console.error('Error enviando pago prepago:', err);
      alert('No se pudo confirmar la compra. Intenta de nuevo.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSubmitDemand = async (e) => {
    e.preventDefault();
    if (!demandDescription.trim()) {
      alert('Por favor especifica qué repuesto, servicio o trámite necesitas.');
      return;
    }

    setSubmittingDemand(true);
    try {
      const res = await submitDriverDemandApi({
        driverId,
        driverName,
        vehicleInfo: demandVehicleInfo.trim(),
        category: demandCategory,
        itemDescription: demandDescription.trim(),
        urgency: demandUrgency
      });

      if (res.success) {
        setDemandSuccessMessage('¡Solicitud registrada con éxito! Tu necesidad se sumará al volumen de cotización mayorista.');
        setDemandDescription('');
        loadInitialData();
        setTimeout(() => setDemandSuccessMessage(null), 6000);
      } else {
        alert(res.error || 'Error al enviar solicitud');
      }
    } catch (err) {
      console.error('Error enviando demanda:', err);
      alert('Error de conexión al enviar.');
    } finally {
      setSubmittingDemand(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* ENCABEZADO */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 p-4 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Club de Compras Colectivas
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Precios de Mayorista
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Poder colectivo: Compramos en lote para ahorrar hasta un 40% en repuestos, llantas y taller
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="grid grid-cols-3 bg-slate-950/80 border-b border-slate-800 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => { setActiveTab('deals'); setSelectedDealForPayment(null); }}
            className={`py-3 px-2 flex items-center justify-center gap-2 transition border-b-2 ${
              activeTab === 'deals'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Lotes de la Semana</span>
          </button>

          <button
            onClick={() => { setActiveTab('demand'); setSelectedDealForPayment(null); }}
            className={`py-3 px-2 flex items-center justify-center gap-2 transition border-b-2 ${
              activeTab === 'demand'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>¿Qué Necesitas?</span>
          </button>

          <button
            onClick={() => { setActiveTab('my-orders'); setSelectedDealForPayment(null); }}
            className={`py-3 px-2 flex items-center justify-center gap-2 transition border-b-2 ${
              activeTab === 'my-orders'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Mis Cupones ({myOrders.length})</span>
          </button>
        </div>

        {/* CUERPO PRINCIPAL CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* TAB 1: LOTES ACTIVOS DE LA SEMANA */}
          {activeTab === 'deals' && !selectedDealForPayment && (
            <div className="space-y-4">
              
              {/* Banner de Garantía y Pago Anticipado */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">Regla de Oro del Club de Compras:</span>
                  Para asegurar precios de importador directo sin intermediarios, las compras se confirman con 
                  <strong className="text-emerald-300"> pago por anticipado mediante Transfer365 Móvil</strong>. 
                  Así Rumbo responde con total seriedad ante los proveedores y tu cupón de servicio queda 100% garantizado.
                </div>
              </div>

              {loading && (
                <div className="text-center py-10 text-slate-400">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full mb-2"></div>
                  <p className="text-xs">Cargando ofertas colectivas de la semana...</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs">
                  {error}
                </div>
              )}

              {!loading && deals.length === 0 && (
                <div className="text-center py-12 bg-slate-950/50 rounded-xl border border-slate-800 p-6">
                  <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-semibold mb-1">No hay lotes abiertos en este momento</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Los domingos cerramos pedidos de la semana y los lunes abrimos nuevos combos según las necesidades que nos envíes en la pestaña "¿Qué Necesitas?".
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.map((deal) => {
                  const discountPct = Math.round(((deal.normal_price - deal.group_price) / deal.normal_price) * 100);
                  const progressPct = Math.min(100, Math.round((deal.current_paid_count / deal.min_participants) * 100));

                  return (
                    <div
                      key={deal.id}
                      className="bg-slate-800/70 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between transition shadow-lg relative overflow-hidden"
                    >
                      {/* Badge de Descuento */}
                      <div className="absolute top-3 right-3 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        -{discountPct}% Ahorro
                      </div>

                      <div>
                        <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          {deal.category === 'MANTENIMIENTO' && <Wrench className="w-3.5 h-3.5" />}
                          {deal.category === 'LLANTAS' && <Car className="w-3.5 h-3.5" />}
                          {deal.category === 'LEGAL' && <Scale className="w-3.5 h-3.5" />}
                          <span>{deal.category}</span>
                        </div>

                        <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                          {deal.title}
                        </h3>

                        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                          {deal.description}
                        </p>

                        {/* Proveedor y Taller */}
                        <div className="bg-slate-900/60 rounded-lg p-2.5 text-xs text-slate-400 space-y-1 mb-3">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-semibold text-slate-200">Taller Aliado:</span>
                            <span>{deal.supplier_name}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Ubicación:</span>
                            <span className="truncate max-w-[180px]">{deal.supplier_address}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Fecha de Entrega/Servicio:</span>
                            <span className="text-emerald-400 font-semibold">{deal.delivery_date}</span>
                          </div>
                        </div>

                        {/* Barra de progreso de participantes */}
                        <div className="space-y-1.5 mb-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              Conductores confirmados:
                            </span>
                            <span className="font-bold text-white">
                              {deal.current_paid_count} / {deal.min_participants} min.
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-700">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(5, progressPct)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Precios y Botón de Acción */}
                      <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-400 line-through">
                            Normal: ${deal.normal_price}
                          </div>
                          <div className="text-xl font-black text-emerald-400">
                            ${deal.group_price}{' '}
                            <span className="text-xs font-normal text-slate-300">c/u</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenPayment(deal)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                        >
                          <span>Pagar y Apartar</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-MODAL: PROCESO DE PAGO ANTICIPADO TRANSFER365 MÓVIL */}
          {activeTab === 'deals' && selectedDealForPayment && !paymentSuccessOrder && (
            <div className="bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-5 space-y-4 max-w-xl mx-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                  <span className="text-xs text-emerald-400 font-semibold uppercase">Paso 2 de 2: Pago Previo 100% Garantizado</span>
                  <h3 className="text-base font-bold text-white">
                    {selectedDealForPayment.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDealForPayment(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Total a pagar */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-emerald-500/30 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Monto con descuento colectivo:</span>
                <span className="text-2xl font-black text-emerald-400">
                  ${selectedDealForPayment.group_price} <span className="text-xs font-normal text-slate-400">USD</span>
                </span>
              </div>

              {/* Tarjeta de Datos de Transfer365 Móvil */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 rounded-xl p-4 border border-emerald-400/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-emerald-300 font-bold border-b border-slate-800 pb-2">
                  <span>TRANSFER365 MÓVIL (Inmediata y Gratis)</span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Banco Davivienda</span>
                </div>

                {/* Número de Teléfono Transfer365 */}
                <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Número Móvil Asociado:</span>
                    <span className="text-base font-mono font-bold text-white tracking-wider">69893101</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard('69893101', 'phone')}
                    className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition"
                  >
                    {copiedKey === 'phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'phone' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                {/* Titular de la Cuenta */}
                <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Titular de la Cuenta:</span>
                    <span className="text-sm font-semibold text-white">Cesar Arias</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard('Cesar Arias', 'holder')}
                    className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition"
                  >
                    {copiedKey === 'holder' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'holder' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 leading-tight">
                  💡 Abre la app de tu banco (Cuscatlán, Agrícola, BAC, Davivienda, etc.), entra a <strong>Transfer365 Móvil</strong>, envía los <strong>${selectedDealForPayment.group_price}</strong> al número <strong>69893101</strong> e ingresa el número de referencia aquí abajo.
                </div>
              </div>

              {/* Formulario de confirmación */}
              <form onSubmit={handleConfirmTransfer} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Número de Comprobante / Referencia de Transferencia: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: REF-9821734 o 8734912"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Placa del Vehículo que recibirá el servicio:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: P123456"
                    value={vehiclePlateInput}
                    onChange={(e) => setVehiclePlateInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl p-2.5 text-sm text-white focus:outline-none uppercase"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDealForPayment(null)}
                    className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
                  >
                    {submittingPayment ? (
                      <span>Validando y Registrando...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirmar Pago y Emitir Cupón</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ÉXITO EN EL PAGO: MUESTRA EL CUPÓN Y CÓDIGO DE RETIRO */}
          {paymentSuccessOrder && (
            <div className="bg-slate-800 border border-emerald-400/60 rounded-2xl p-6 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1">¡Cupón de Canje Generado!</h3>
                <p className="text-xs text-slate-300">
                  Tu participación ha sido registrada y respaldada con tu transferencia anticipada.
                </p>
              </div>

              {/* TICKET / CÓDIGO */}
              <div className="bg-slate-950 border-2 border-dashed border-emerald-500/50 rounded-xl p-4 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Código de Retiro / Taller</span>
                <div className="text-2xl font-mono font-black text-emerald-400 tracking-wider">
                  {paymentSuccessOrder.redemption_code}
                </div>
                <div className="text-xs text-slate-400">
                  Presenta este código en el taller o proveedor aliado.
                </div>
                <button
                  onClick={() => copyToClipboard(paymentSuccessOrder.redemption_code, 'order_code')}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  {copiedKey === 'order_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'order_code' ? 'Código Copiado' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 text-left bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Detalles de la Compra:</div>
                <div>• Referencia Transfer365: <span className="text-white font-mono">{paymentSuccessOrder.transfer_reference}</span></div>
                <div>• Total Pagado: <span className="text-emerald-400 font-bold">${paymentSuccessOrder.amount_paid} USD</span></div>
                <div>• Placa Registrada: <span className="text-white font-mono">{paymentSuccessOrder.vehicle_plate}</span></div>
              </div>

              <button
                onClick={() => {
                  setPaymentSuccessOrder(null);
                  setSelectedDealForPayment(null);
                  setActiveTab('my-orders');
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Ver en "Mis Cupones"
              </button>
            </div>
          )}

          {/* TAB 2: ¿QUÉ NECESITAS PARA TU AUTO? (ENCUESTA DE DEMANDA Y VOLUMEN) */}
          {activeTab === 'demand' && (
            <div className="space-y-4 max-w-xl mx-auto">
              
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Economía de Escala: Cuéntanos qué repuesto o servicio necesitas
                </div>
                Multiplica tu necesidad por 50, 100 o 200 conductores que necesitan lo mismo esta semana. 
                Rumbo toma este consolidado de demanda, cotiza directo con las distribuidoras e importadoras mayoristas, 
                y pum... conseguimos precios insuperables para todos y monetización para sostener la app.
              </div>

              {/* Resumen en vivo de lo que piden otros conductores */}
              {demandSummary.length > 0 && (
                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-2 tracking-wider">
                    Demanda acumulada de la hermandad esta semana:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {demandSummary.map((item, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs flex items-center gap-1.5">
                        <span className="text-slate-300 font-medium">{item.category}:</span>
                        <span className="bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[11px]">
                          {item.count} choferes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {demandSuccessMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{demandSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmitDemand} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1">
                    Tipo de necesidad:
                  </label>
                  <select
                    value={demandCategory}
                    onChange={(e) => setDemandCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="REPUESTOS">Repuestos de Motor / Suspensión / Frenos</option>
                    <option value="MANTENIMIENTO">Mantenimiento Preventivo (Aceite, Filtros, Bujías)</option>
                    <option value="LLANTAS">Llantas y Baterías</option>
                    <option value="LEGAL">Asistencia Legal (Traspasos, Multas, Poderes, Tránsito)</option>
                    <option value="CARROCERIA">Carrocería, Pintura o Aire Acondicionado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1">
                    Datos de tu vehículo (Marca, Modelo, Año):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Toyota Corolla 2014, 1.8L"
                    value={demandVehicleInfo}
                    onChange={(e) => setDemandVehicleInfo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1">
                    ¿Exactamente qué pieza o servicio necesitas? *
                  </label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Ej: 2 amortiguadores delanteros marca KYB o similar, o 4 llantas medida 185/65 R15..."
                    value={demandDescription}
                    onChange={(e) => setDemandDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1">
                    ¿Para cuándo lo necesitas?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ESTA_SEMANA', label: 'Esta Semana' },
                      { id: 'PROXIMA_SEMANA', label: 'Próxima Semana' },
                      { id: 'ESTE_MES', label: 'En el Mes' }
                    ].map((urg) => (
                      <button
                        type="button"
                        key={urg.id}
                        onClick={() => setDemandUrgency(urg.id)}
                        className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition ${
                          demandUrgency === urg.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {urg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingDemand}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    {submittingDemand ? (
                      <span>Registrando tu solicitud...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Sumar mi pedido a la cotización masiva</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MIS COMPRAS & CUPONES DE RETIRO */}
          {activeTab === 'my-orders' && (
            <div className="space-y-4">
              {myOrders.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/50 rounded-xl border border-slate-800 p-6">
                  <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-semibold mb-1">No tienes cupones de compra activos</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Cuando adquieras un combo colectivo de mantenimiento o llantas pagado por Transfer365 Móvil, aquí verás tus códigos de canje para presentar en el taller.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                            {order.deal_category || 'COMPRA COLECTIVA'}
                          </span>
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {order.deal_title}
                          </h4>
                        </div>
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                          {order.status === 'PAID_VERIFIED' ? 'Pagado & Verificado' : order.status}
                        </span>
                      </div>

                      {/* Código de canje principal */}
                      <div className="bg-slate-950 border border-dashed border-emerald-400/50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">CÓDIGO DE RETIRO:</span>
                          <span className="text-lg font-mono font-black text-emerald-400 tracking-wider">
                            {order.redemption_code}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(order.redemption_code, `code_${order.id}`)}
                          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
                        >
                          {copiedKey === `code_${order.id}` ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Información de entrega / Taller */}
                      <div className="bg-slate-900/60 rounded-lg p-2.5 text-xs text-slate-300 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Taller Proveedor:</span>
                          <span className="font-semibold text-white">{order.supplier_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dirección:</span>
                          <span className="truncate max-w-[180px]">{order.supplier_address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Fecha de Retiro:</span>
                          <span className="text-emerald-400 font-semibold">{order.delivery_date}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                          <span>Ref. Transfer365:</span>
                          <span className="font-mono text-slate-300">{order.transfer_reference}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Respaldo Rumbo El Salvador • Pagos Transfer365 Móvil verificados</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
