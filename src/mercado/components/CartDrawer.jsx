import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { METODOS_PAGO } from '../data/mockData';
import { X, Trash2, Plus, Minus, CreditCard, Building2, Wallet, Banknote, HeartHandshake, CheckCircle2, MapPin, Sparkles, ArrowRight, Store, QrCode, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose }) {
  const {
    cart,
    updateQuantity,
    subtotal,
    appCommission,
    deliveryFee,
    deliveryType,
    setDeliveryType,
    tipAmount,
    setTipAmount,
    tipCollector,
    tipDispatcher,
    grandTotal,
    paymentMethod,
    setPaymentMethod,
    customerAddress,
    setCustomerAddress,
    createOrder
  } = useMercado();

  const [activeStep, setActiveStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
  const [lastCreatedOrder, setLastCreatedOrder] = useState(null);

  if (!isOpen) return null;

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    const newOrder = createOrder();
    if (newOrder) {
      setLastCreatedOrder(newOrder);
      setActiveStep('success');
    }
  };

  const getPaymentIcon = (id) => {
    if (id === 'transfer365') return <Building2 className="w-4 h-4 text-emerald-400" />;
    if (id === 'chivo') return <Wallet className="w-4 h-4 text-cyan-400" />;
    if (id === 'cubo') return <CreditCard className="w-4 h-4 text-indigo-400" />;
    return <Banknote className="w-4 h-4 text-orange-400" />;
  };

  const uniquePuestos = [...new Set(cart.map((item) => item.puestoName))];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex justify-end">
      <div className="w-full max-w-md bg-[#0B0F17] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#131B29]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-extrabold text-sm sm:text-base text-slate-100">
              {activeStep === 'cart' && 'Tu Carrito del Mercado'}
              {activeStep === 'checkout' && 'Confirmar & Pago'}
              {activeStep === 'success' && '¡Pedido Recibido!'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          
          {/* STEP 1: CART ITEMS & DELIVERY TYPE TOGGLE */}
          {activeStep === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-2.5">
                  <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
                    <Trash2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-slate-300 font-bold text-sm">Tu carrito está vacío</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Explora los puestos del Mercado San Miguelito e agrega pupusas, sopas, carnes o verduras.
                  </p>
                </div>
              ) : (
                <>
                  {/* Delivery Type Selector (Domicilio vs Pickup) */}
                  <div className="bg-[#131B29] p-1 rounded-xl border border-slate-800 grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setDeliveryType('domicilio')}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                        deliveryType === 'domicilio'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 font-black shadow-glow-emerald'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" /> Domicilio (5 km)
                    </button>
                    <button
                      onClick={() => setDeliveryType('pickup')}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                        deliveryType === 'pickup'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 font-black shadow-glow-emerald'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" /> Retiro Pickup
                    </button>
                  </div>

                  {/* Multi-Puesto Info Banner */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <p className="font-bold">Compra Multi-Puesto Centralizada</p>
                      <p className="text-emerald-200/80 mt-0.5">
                        Estás pidiendo de <strong>{uniquePuestos.length} puesto(s)</strong>. Nuestro runner los recolectará local por local.
                      </p>
                    </div>
                  </div>

                  {/* Item List */}
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#131B29] border border-slate-800 rounded-xl p-2.5 flex gap-2.5 items-center hover:border-slate-700 transition-all"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-100 truncate">{item.name}</h4>
                          <p className="text-[10px] text-orange-400 font-bold truncate">{item.puestoName}</p>
                          <p className="text-[9px] text-slate-400">{item.pasillo}</p>
                          <p className="text-xs font-black text-emerald-400 mt-0.5">
                            ${(item.price * item.quantity).toFixed(2)}{' '}
                            <span className="text-[9px] font-normal text-slate-400">(${item.price.toFixed(2)} c/u)</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-extrabold text-slate-100">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Box including 10% App Commission */}
                  <div className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Subtotal productos:</span>
                      <span className="font-semibold text-slate-200">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Comisión de la App (10%):</span>
                      <span className="font-bold text-emerald-400">${appCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Tarifa de entrega:</span>
                      <span className="font-semibold text-slate-200">
                        {deliveryType === 'pickup' ? '$0.00 (Pickup)' : `$${deliveryFee.toFixed(2)} (5 km)`}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT & PAYMENT METHOD */}
          {activeStep === 'checkout' && (
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              
              {/* Delivery Address or Pickup Info */}
              {deliveryType === 'domicilio' ? (
                <div className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Dirección de Entrega (Radio 5 km)
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              ) : (
                <div className="bg-[#131B29] border border-emerald-500/30 rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                    <Store className="w-3.5 h-3.5" /> Retiro en Punto de Venta (Pickup)
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Retiras en la Mesa de Acopio del Mercado San Miguelito con tu Código QR.
                  </p>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded text-[10px] text-emerald-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>Límite de retiro: <strong>48 horas</strong>.</span>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Método de Pago</label>
                <div className="space-y-1.5">
                  {METODOS_PAGO.map((m) => (
                    <label
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-slate-100'
                          : 'bg-[#131B29] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {getPaymentIcon(m.id)}
                          <span className="font-extrabold text-xs text-slate-100">{m.name}</span>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{m.subtitle}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{m.details}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Transfer365 Davivienda Box Notice if selected */}
              {paymentMethod === 'transfer365' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 space-y-0.5 text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <Building2 className="w-3.5 h-3.5" /> Transfer365 Móvil:
                  </span>
                  <p className="text-slate-200 text-[11px]">Banco: <strong>Davivienda</strong> | Tel: <strong className="text-orange-400">6989-3101</strong></p>
                </div>
              )}

              {/* Tip Split Selector */}
              <div className="bg-[#131B29] border border-emerald-500/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-200">Propina Equipo (50/50)</span>
                  </div>
                  <span className="text-xs font-black text-emerald-400">${tipAmount.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[0.50, 1.00, 2.00, 3.00].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTipAmount(amount)}
                      className={`py-1 rounded-lg text-xs font-bold transition-all ${
                        tipAmount === amount
                          ? 'bg-emerald-500 text-zinc-950 font-black shadow-glow-emerald'
                          : 'bg-slate-950 text-slate-300 border border-slate-800'
                      }`}
                    >
                      ${amount.toFixed(2)}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-950 rounded-lg p-2 grid grid-cols-2 gap-1.5 text-[10px] border border-slate-800">
                  <div className="bg-slate-900 p-1.5 rounded border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold block">🏃 Runner (50%)</span>
                    <span className="text-slate-200 font-black">${tipCollector.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-cyan-500/20">
                    <span className="text-cyan-400 font-bold block">🛵 Motorista (50%)</span>
                    <span className="text-slate-200 font-black">${tipDispatcher.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation Policy Notice */}
              <div className="text-[9px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="font-bold text-orange-400 block">Política de Cancelación:</span>
                <p>Permitida antes de la recolección con 20% de cargo administrativo.</p>
              </div>

              {/* Breakdown */}
              <div className="bg-[#131B29] border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="text-slate-200 font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Comisión App (10%):</span>
                  <span className="text-emerald-400 font-bold">${appCommission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Envío:</span>
                  <span className="text-slate-200 font-semibold">${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Propina:</span>
                  <span className="text-emerald-400 font-bold">${tipAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between text-xs font-black text-slate-100">
                  <span>Total a Pagar:</span>
                  <span className="text-orange-400 text-sm">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 py-2.5 rounded-xl font-black text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-glow-orange"
              >
                <span>Confirmar Pedido (${grandTotal.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESS & QR CODE FOR PICKUP */}
          {activeStep === 'success' && lastCreatedOrder && (
            <div className="text-center py-4 space-y-3 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">¡Pedido Recibido!</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orden <span className="font-bold text-orange-400">{lastCreatedOrder.id}</span>
                </p>
              </div>

              {/* QR Code for Pickup */}
              {lastCreatedOrder.deliveryType === 'pickup' && (
                <div className="bg-[#131B29] border border-emerald-500/40 rounded-xl p-4 space-y-2 max-w-xs mx-auto">
                  <span className="text-xs font-extrabold text-emerald-400 block uppercase">Código QR de Retiro en Acopio</span>
                  <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto flex items-center justify-center">
                    <QrCode className="w-28 h-28 text-slate-950" />
                  </div>
                  <p className="text-[11px] text-slate-200 font-mono font-bold">{lastCreatedOrder.qrCode}</p>
                  <p className="text-[9px] text-emerald-300 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                    Presenta este código en Acopio durante las próximas 48 horas.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setActiveStep('cart');
                  onClose();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl font-bold text-xs transition-all"
              >
                Volver al Catálogo
              </button>
            </div>
          )}

        </div>

        {cart.length > 0 && activeStep === 'cart' && (
          <div className="p-3 border-t border-slate-800 bg-[#131B29]">
            <button
              onClick={() => setActiveStep('checkout')}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 py-2.5 rounded-xl font-black text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-glow-orange"
            >
              <span>Ir a Pagar ${subtotal.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
