import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { METODOS_PAGO } from '../data/mockData';
import { X, Trash2, Plus, Minus, CreditCard, Building2, Wallet, HeartHandshake, CheckCircle2, MapPin, Sparkles, ArrowRight } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose }) {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    subtotal,
    deliveryFee,
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
    if (id === 'transfer365') return <Building2 className="w-5 h-5 text-emerald-400" />;
    if (id === 'chivo') return <Wallet className="w-5 h-5 text-blue-400" />;
    return <CreditCard className="w-5 h-5 text-purple-400" />;
  };

  // Extract unique stalls/puestos in cart
  const uniquePuestos = [...new Set(cart.map((item) => item.puestoName))];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="font-bold text-lg text-zinc-100">
              {activeStep === 'cart' && 'Tu Carrito del Mercado'}
              {activeStep === 'checkout' && 'Confirmar & Pago Anticipado'}
              {activeStep === 'success' && '¡Pedido Recibido!'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* STEP 1: CART ITEMS */}
          {activeStep === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-zinc-300 font-semibold text-base">Tu carrito está vacío</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Explora los departamentos del Mercado San Miguelito e agrega productos de tus puestos favoritos.
                  </p>
                </div>
              ) : (
                <>
                  {/* Multi-Puesto Info Banner */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Compra Multi-Puesto Centralizada</p>
                      <p className="text-amber-200/80 mt-0.5">
                        Estás pidiendo productos de <strong>{uniquePuestos.length} puesto(s)</strong> diferente(s). Nuestro recolector los juntará en un solo envío.
                      </p>
                    </div>
                  </div>

                  {/* Item List */}
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex gap-3 items-center hover:border-zinc-700 transition-all"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 object-cover rounded-lg border border-zinc-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-zinc-100 truncate">{item.name}</h4>
                          <p className="text-[11px] text-amber-400 font-medium truncate">{item.puestoName}</p>
                          <p className="text-[10px] text-zinc-500">{item.pasillo}</p>
                          <p className="text-xs font-extrabold text-zinc-200 mt-1">
                            ${(item.price * item.quantity).toFixed(2)}{' '}
                            <span className="text-[10px] font-normal text-zinc-400">(${item.price.toFixed(2)} c/u)</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-zinc-100">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center font-bold text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Box */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal productos:</span>
                      <span className="font-semibold text-zinc-200">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Tarifa de recolección & envío:</span>
                      <span className="font-semibold text-zinc-200">${deliveryFee.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT & PAYMENT */}
          {activeStep === 'checkout' && (
            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              
              {/* Delivery Address */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" /> Dirección de Entrega en San Salvador
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Payment Methods (Transfer365, Chivo, Cubo) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Método de Pago Anticipado</label>
                <div className="space-y-2">
                  {METODOS_PAGO.map((m) => (
                    <label
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-amber-500/10 border-amber-500 text-zinc-100'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="mt-1 accent-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(m.id)}
                          <span className="font-bold text-xs text-zinc-100">{m.name}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{m.subtitle}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 italic">{m.details}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tip Split Selector */}
              <div className="bg-zinc-950 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-zinc-100">Propina para el Equipo</span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400">${tipAmount.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  La propina se divide automáticamente al 50% entre el recolector en el mercado y el motorista.
                </p>

                {/* Quick amount chips */}
                <div className="grid grid-cols-4 gap-2">
                  {[0.50, 1.00, 2.00, 3.00].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTipAmount(amount)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        tipAmount === amount
                          ? 'bg-amber-500 text-zinc-950 shadow-md'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      ${amount.toFixed(2)}
                    </button>
                  ))}
                </div>

                {/* Tip Split Breakdown Card */}
                <div className="bg-zinc-900 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-[11px] border border-zinc-800">
                  <div className="bg-zinc-950/60 p-2 rounded border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold block">🏃 Recolector (Mercado)</span>
                    <span className="text-zinc-200 font-extrabold">${tipCollector.toFixed(2)}</span>
                    <span className="text-[9px] text-zinc-500 block">Junta tus productos</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2 rounded border border-blue-500/20">
                    <span className="text-blue-400 font-bold block">🛵 Motorista (Despacho)</span>
                    <span className="text-zinc-200 font-extrabold">${tipDispatcher.toFixed(2)}</span>
                    <span className="text-[9px] text-zinc-500 block">Entrega a domicilio</span>
                  </div>
                </div>
              </div>

              {/* Grand Total Breakdown */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal:</span>
                  <span className="text-zinc-200 font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Envío & Recolección:</span>
                  <span className="text-zinc-200 font-semibold">${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Propina Compartida:</span>
                  <span className="text-amber-400 font-semibold">${tipAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-zinc-800 pt-2 flex justify-between text-sm font-extrabold text-zinc-100">
                  <span>Total a Pagar Anticipado:</span>
                  <span className="text-amber-400">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 py-3 rounded-xl font-black text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Confirmar y Pagar ${grandTotal.toFixed(2)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESS & TRACKING */}
          {activeStep === 'success' && lastCreatedOrder && (
            <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-100">¡Pago Confirmado!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Tu orden <span className="font-bold text-amber-400">{lastCreatedOrder.id}</span> ha sido enviada al recolector del Mercado San Miguelito.
                </p>
              </div>

              {/* Live Order Timeline */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-left space-y-3">
                <h4 className="text-xs font-bold text-zinc-300">Estado en Tiempo Real:</h4>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100">Pago Anticipado Procesado</p>
                      <p className="text-[10px] text-zinc-400">{lastCreatedOrder.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-bold text-xs animate-pulse">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-amber-400">En Recolección por Pasillos</p>
                      <p className="text-[10px] text-zinc-400">
                        {lastCreatedOrder.collectorName} visitando los puestos asignados.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 opacity-40">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-zinc-300">Empacado en Acopio</p>
                      <p className="text-[10px] text-zinc-400">Revisión final de peso y bolsas.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 opacity-40">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <p className="font-bold text-zinc-300">En Camino a tu Domicilio</p>
                      <p className="text-[10px] text-zinc-400">{lastCreatedOrder.dispatcherName}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveStep('cart');
                  onClose();
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-xl font-bold text-xs transition-all"
              >
                Volver al Catálogo
              </button>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        {cart.length > 0 && activeStep === 'cart' && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950">
            <button
              onClick={() => setActiveStep('checkout')}
              className="w-full bg-amber-500 text-zinc-950 py-3 rounded-xl font-black text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg"
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
