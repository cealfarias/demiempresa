import React, { useState, useMemo } from 'react';
import {
  FileText,
  X,
  ArrowLeft,
  Home,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  Building2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Gift,
  HelpCircle,
  Inbox,
  LogOut
} from 'lucide-react';

export default function DriverAccountStatementModal({
  isOpen,
  onClose,
  onGoHome,
  driverProfile,
  weeklyBonuses = 0,
  onPayWeeklyFeeWithBonuses,
  onPayDailyPass,
  isApplyingBonuses = false,
  onOpenInbox,
  onLogout
}) {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [selectedPaymentTab, setSelectedPaymentTab] = useState('TRANSFER365'); // 'TRANSFER365' | 'CUBO'
  const [showCuboModal, setShowCuboModal] = useState(false);
  const [cuboSuccess, setCuboSuccess] = useState(false);

  // 1. Cálculo de 14 Días de Uso Gratis al Registrarse
  const { isFreeTrialActive, trialDaysLeft, trialHoursLeft, trialEndDateFormatted } = useMemo(() => {
    // Si el perfil no tiene fecha de registro o trial, inicializar a 14 días desde hoy o fecha guardada
    let trialEnds = null;
    if (driverProfile?.trialEndsAt) {
      trialEnds = new Date(driverProfile.trialEndsAt).getTime();
    } else if (driverProfile?.createdAt) {
      trialEnds = new Date(driverProfile.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000;
    } else {
      // Default: 14 días a partir del registro inicial en el dispositivo
      const storedTrial = localStorage.getItem('rumbo_driver_trial_ends_at');
      if (storedTrial) {
        trialEnds = parseInt(storedTrial, 10);
      } else {
        trialEnds = Date.now() + 14 * 24 * 60 * 60 * 1000;
        localStorage.setItem('rumbo_driver_trial_ends_at', trialEnds.toString());
      }
    }

    const diffMs = trialEnds - Date.now();
    const isActive = diffMs > 0;
    const hours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    const days = Math.ceil(hours / 24);
    const dateFormatted = new Date(trialEnds).toLocaleDateString('es-SV', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      isFreeTrialActive: isActive,
      trialDaysLeft: days,
      trialHoursLeft: hours,
      trialEndDateFormatted: dateFormatted
    };
  }, [driverProfile]);

  // 2. Cálculo de Vencimiento de Periodo y Recordatorios de 48h y 24h
  const { hoursUntilDeadline, is48hReminder, is24hReminder, isExpired, deadlineFormatted } = useMemo(() => {
    // Si está en free trial, la fecha límite de pago es 48 horas antes de que venza el trial
    // Si ya no está en free trial, vence el próximo Domingo a las 23:59
    let deadlineMs = 0;
    if (isFreeTrialActive) {
      const storedTrial = localStorage.getItem('rumbo_driver_trial_ends_at');
      deadlineMs = storedTrial ? parseInt(storedTrial, 10) : Date.now() + 14 * 24 * 60 * 60 * 1000;
    } else {
      // Fin de la semana actual (Domingo 23:59:59)
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Domingo
      const daysUntilSunday = (7 - currentDay) % 7;
      const nextSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59);
      deadlineMs = nextSunday.getTime();
    }

    const diffMs = deadlineMs - Date.now();
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    const expired = hours <= 0;
    const reminder24 = hours > 0 && hours <= 24;
    const reminder48 = hours > 24 && hours <= 48;

    const formatted = new Date(deadlineMs).toLocaleDateString('es-SV', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      hoursUntilDeadline: hours,
      is48hReminder: reminder48,
      is24hReminder: reminder24,
      isExpired: expired,
      deadlineFormatted: formatted
    };
  }, [isFreeTrialActive]);

  // 3. Cálculo de Cuota Semanal y Bonos
  const baseWeeklyFee = 15.00;
  const bonosToApplyWeekly = Math.min(15, weeklyBonuses);
  const remainingWeeklyCash = Math.max(0, baseWeeklyFee - bonosToApplyWeekly);

  // 4. Copiar Celular Transfer365 Móvil
  const handleCopyAccount = () => {
    navigator.clipboard.writeText('69893101');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 flex flex-col my-auto">
        
        {/* Cabecera con Botón de Atrás / Inicio */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              title="Volver atrás"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-sm sm:text-base text-white">Estado de Cuenta Oficial</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onGoHome) onGoHome();
                onClose();
              }}
              title="Ir a Inicio / Consola"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Identificación del Conductor */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-black text-white text-sm">{driverProfile?.fullName || 'Conductor Registrado'}</div>
              <div className="text-slate-400 mt-0.5">
                DUI: <span className="font-mono text-slate-300">{driverProfile?.dui || 'Registrado'}</span> • Placa: <span className="font-mono text-amber-300 font-bold">{driverProfile?.vehiclePlate || 'Registrada'}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
              {driverProfile?.approvalStatus === 'APPROVED' ? 'Verificado Oficial' : 'Activo'}
            </span>
          </div>

          {/* 1. BENEFICIO DE 14 DÍAS GRATIS AL INSCRIBIRSE */}
          {isFreeTrialActive ? (
            <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-amber-950/40 border-2 border-emerald-500/60 rounded-3xl space-y-2.5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <Gift className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Beneficio de Bienvenida Activo</span>
                </span>
                <span className="font-mono font-black text-emerald-400 text-xs">
                  {trialDaysLeft} DÍAS RESTANTES
                </span>
              </div>

              <div>
                <h4 className="text-base font-black text-white">
                  🎉 14 Días de Uso Gratis al 100%
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Por inscribirte en Rumbo tienes <strong>14 días completos de cortesía sin cuota semanal</strong>. Todos tus ingresos en efectivo son 100% tuyos sin pagar comisiones ni cuotas.
                </p>
              </div>

              <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs flex items-center justify-between font-mono">
                <span className="text-slate-400">Vigencia del periodo gratuito:</span>
                <span className="text-emerald-300 font-bold">Hasta {trialEndDateFormatted}</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Periodo de bienvenida de 14 días completado.</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Cuota activa</span>
            </div>
          )}

          {/* 2. RECORDATORIOS DE 48 HORAS Y 24 HORAS CON REGLA DE ANTICIPACIÓN */}
          {is24hReminder && (
            <div className="p-4 bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border-2 border-rose-500/80 rounded-2xl space-y-2 text-xs animate-pulse">
              <div className="flex items-center gap-2 text-rose-300 font-black uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>🚨 Recordatorio 2 URGENTE (Faltan {hoursUntilDeadline}h)</span>
              </div>
              <p className="text-slate-200 leading-relaxed">
                Tu periodo vence en menos de 24 horas (<strong>{deadlineFormatted}</strong>). Por política operativa, el pago semanal debe realizarse con 48h de anticipación para garantizar que tu servicio no sufra pausas ni desconexiones.
              </p>
            </div>
          )}

          {is48hReminder && !is24hReminder && (
            <div className="p-4 bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border-2 border-amber-500/70 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-black uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>⚠️ Recordatorio 1 (Faltan {hoursUntilDeadline}h para el corte)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Faltan 48 horas para el vencimiento de tu periodo (<strong>{deadlineFormatted}</strong>). Recuerda anticipar tu pago para mantener tu acceso ilimitado 24/7 sin interrupciones.
              </p>
            </div>
          )}

          {/* Regla Operativa de 48h Informativa */}
          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Regla de 48 Horas de Anticipación:</strong> El pago semanal debe realizarse con 48 horas de anticipación a la fecha de vencimiento. La plataforma emite un primer recordatorio a las 48h y un recordatorio final a las 24h.
            </div>
          </div>

          {/* 3. RESUMEN DE SALDO BONIFICADO ACUMULADO */}
          <div className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billetera de Conductor</span>
                <h4 className="text-lg font-black text-white">Saldo Bonificado Acumulado</h4>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-amber-400 font-mono">{weeklyBonuses}</div>
                <div className="text-[10px] text-slate-400 font-semibold">{weeklyBonuses === 1 ? 'Bono ($1.00 USD)' : `Bonos ($${weeklyBonuses}.00 USD)`}</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2">
              💰 Los bonos se acumulan automáticamente por carreras completadas con pasajeros que usan Rumbo. <strong>Cada bono vale $1.00 USD exacto</strong> aplicable a tu cuota semanal o pase diario.
            </p>
          </div>

          {/* 4. PAGO CON BONOS DE UN SOLO GOLPE */}
          <div className="p-4 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-3xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase border border-emerald-500/40">
                  🔥 Pago Inmediato de un Solo Clic
                </span>
                <h4 className="font-black text-base text-white mt-1">Cuota Semanal ($15.00 USD)</h4>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-slate-400">Total Cuota</div>
                <div className="text-xl font-black text-white">$15.00</div>
              </div>
            </div>

            {/* Desglose de Pago de un Solo Golpe */}
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Cuota semanal base:</span>
                <span>$15.00 USD</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Bonos a descontar de un solo golpe:</span>
                <span>-{bonosToApplyWeekly} {bonosToApplyWeekly === 1 ? 'Bono' : 'Bonos'} (-${bonosToApplyWeekly.toFixed(2)} USD)</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between font-black text-sm">
                <span className="text-white">Saldo pendiente en efectivo:</span>
                <span className={remainingWeeklyCash === 0 ? "text-emerald-400" : "text-amber-400"}>
                  ${remainingWeeklyCash.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Botón de Acción de un Solo Golpe */}
            {weeklyBonuses >= 15 ? (
              <button
                type="button"
                onClick={() => onPayWeeklyFeeWithBonuses(15)}
                disabled={isApplyingBonuses}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isApplyingBonuses ? 'Procesando en Blockchain...' : '¡Pagar Cuota Semanal al 100% con 15 Bonos ($0.00 Efectivo)!'}</span>
              </button>
            ) : weeklyBonuses > 0 ? (
              <button
                type="button"
                onClick={() => onPayWeeklyFeeWithBonuses(weeklyBonuses)}
                disabled={isApplyingBonuses}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isApplyingBonuses ? 'Aplicando...' : `Aplicar mis ${weeklyBonuses} Bonos de un solo golpe (-$${weeklyBonuses}.00 USD) • Restante: $${remainingWeeklyCash.toFixed(2)}`}</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                <span>No tienes bonos disponibles actualmente. Cancela el saldo completo ($15.00) mediante Cubo o Transfer365 abajo.</span>
              </div>
            )}

            {/* Alternativa: Pase Diario ($3.00) */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">¿Solo trabajas hoy?</span>
                <span className="text-slate-400 block text-[11px]">Pase de 24 horas por $3.00 o 3 bonos.</span>
              </div>
              <button
                type="button"
                onClick={onPayDailyPass}
                disabled={isApplyingBonuses}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Pagar Pase 24h ({weeklyBonuses >= 3 ? 'Con 3 Bonos' : `$${Math.max(0, 3 - weeklyBonuses).toFixed(2)} USD`})
              </button>
            </div>
          </div>

          {/* 5. MÉTODOS DE PAGO DEL SALDO PENDIENTE (CUBO Y TRANSFER365 MÓVIL) */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h4 className="font-black text-sm text-white">Métodos de Pago del Saldo Pendiente</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Paga tu cuota en dinero real a través de los canales bancarios oficiales de El Salvador.
              </p>
            </div>

            {/* Selector de Pestañas: Transfer365 Móvil vs Cubo Pago */}
            <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPaymentTab('TRANSFER365')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedPaymentTab === 'TRANSFER365'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Transfer365 Móvil</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentTab('CUBO')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedPaymentTab === 'CUBO'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cubo Pago (Tarjeta)</span>
              </button>
            </div>

            {/* CANAL A: TRANSFER365 MÓVIL */}
            {selectedPaymentTab === 'TRANSFER365' && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Banco Destino:</span>
                    <strong className="text-white">DAVIVIENDA El Salvador</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Modalidad Transfer365:</span>
                    <strong className="text-white">Transfer365 Móvil (Celular)</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Titular Registrado:</span>
                    <strong className="text-white">Cesar Arias</strong>
                  </div>
                  
                  {/* Número de celular Transfer365 con botón copiar */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Número Transfer365 Móvil:</span>
                      <span className="text-amber-300 font-black text-base tracking-wider font-mono">69893101</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedAccount ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-1 text-[11px] font-sans text-slate-400">
                    📌 <strong>Concepto a colocar en tu app bancaria:</strong> Placa: <span className="text-white font-mono font-bold">{driverProfile?.vehiclePlate || 'Tu Placa'}</span>
                  </div>
                </div>

                {/* Botón para enviar comprobante por la App */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenInbox) onOpenInbox('PAGOS', remainingWeeklyCash);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Inbox className="w-4 h-4 text-slate-950" />
                  <span>Subir Comprobante a la App (Buzón Oficial Rumbo)</span>
                </button>

                {/* Enlace directo a WhatsApp para reportar comprobante */}
                <a
                  href={`https://wa.me/50369893101?text=${encodeURIComponent(`Hola Rumbo, he realizado mi pago de cuota semanal por Transfer365 Móvil.\n\n• Conductor: ${driverProfile?.fullName || 'Conductor'}\n• Placa: ${driverProfile?.vehiclePlate || 'No especificada'}\n• Monto: $${remainingWeeklyCash.toFixed(2)} USD\n\nAdjunto captura del comprobante.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Reportar también por WhatsApp Directo</span>
                </a>
              </div>
            )}

            {/* CANAL B: CUBO PAGO (PASARELA DE TARJETA EN LÍNEA) */}
            {selectedPaymentTab === 'CUBO' && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Pasarela Cubo Pago El Salvador</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">100% Seguro</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Paga al instante con cualquier tarjeta de débito o crédito (Visa / Mastercard) emitida por bancos de El Salvador mediante Cubo Pago.
                  </p>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center font-mono">
                    <span className="text-slate-400">Monto a cargar con Cubo:</span>
                    <strong className="text-amber-300 font-bold text-sm">${remainingWeeklyCash.toFixed(2)} USD</strong>
                  </div>
                </div>

                <a
                  href={`https://pagos.cubopago.com/demiempresa-rumbo?amount=${remainingWeeklyCash.toFixed(2)}&ref=${encodeURIComponent(driverProfile?.vehiclePlate ? `PLACA-${driverProfile.vehiclePlate}` : `CHOFER-${driverProfile?.id || 'RUMBO'}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pagar Ahora con Cubo Pago (Enlace Seguro)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenInbox) onOpenInbox('PAGOS', remainingWeeklyCash);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Inbox className="w-4 h-4 text-amber-400" />
                  <span>Notificar Comprobante de Cubo a la App</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. HISTORIAL DE MOVIMIENTOS Y AUDITORÍA */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Historial de Movimientos del Estado de Cuenta</span>
              <span className="text-[10px] text-slate-500 font-mono">Blockchain SHA-256</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Registro de Bienvenida 14 Días */}
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-400">🎁 Bienvenida: 14 Días Gratis de Uso</div>
                  <div className="text-[10px] text-slate-400">Exoneración oficial de cuota para nuevos conductores</div>
                </div>
                <span className="text-emerald-400 font-mono font-bold">$0.00 USD</span>
              </div>

              {/* Registro si aplicó bonos */}
              {weeklyBonuses > 0 && (
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-300">Acreditación por Carreras de Pasajeros</div>
                    <div className="text-[10px] text-slate-400">{weeklyBonuses} Bonos acumulados a favor</div>
                  </div>
                  <span className="text-amber-300 font-mono font-bold">+${weeklyBonuses.toFixed(2)} USD</span>
                </div>
              )}
            </div>
          </div>

          {/* Opción de Cierre de Sesión Seguro */}
          {onLogout && (
            <div className="pt-1 pb-1 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1.5 mx-auto py-1.5 px-3 rounded-xl bg-slate-900/80 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Cerrar Sesión de Conductor</span>
              </button>
            </div>
          )}

        </div>

        {/* Pie con Navegación: Volver Atrás e Ir a Inicio */}
        <div className="sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Consola</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onGoHome) onGoHome();
              onClose();
            }}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Ir a Inicio de Conductor</span>
          </button>
        </div>

      </div>
    </div>
  );
}
