import React, { useState } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  Megaphone,
  Video,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  CreditCard,
  Building2,
  Smartphone,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
  Clock,
  Zap,
  Tag,
  Bell,
  Moon,
  ChevronDown
} from 'lucide-react';
import { submitLeadApi, scheduleAdReminderApi } from './api';
import { subscribeUserToPush, isPushSupported } from './pushManager';

export default function AdModal({ isOpen, onClose, userId }) {
  const [selectedPlan, setSelectedPlan] = useState('IMPACTO'); // 'VITRINA' | 'IMPACTO' | 'COMBO_FULL'
  const [billingPeriod, setBillingPeriod] = useState('WEEKLY'); // 'WEEKLY' | 'MONTHLY'
  const [businessName, setBusinessName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [municipality, setMunicipality] = useState('San Salvador');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Estados del recordatorio inteligente
  const [showReminderSection, setShowReminderSection] = useState(false);
  const [reminderType, setReminderType] = useState('TONIGHT'); // 'TONIGHT' | 'IN_24_HOURS' | 'NEXT_OPEN'
  const [reminderScheduled, setReminderScheduled] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  if (!isOpen) return null;

  const PLANS = {
    VITRINA: {
      name: 'Plan Vitrina',
      badge: 'Feed y Muro',
      weeklyPrice: 7.50,
      monthlyPrice: 25.00,
      icon: Megaphone,
      features: [
        'Banner en feed de destino y muro social',
        'Geosegmentado por municipio',
        'Enlace directo a tu WhatsApp comercial',
        'Diseño gráfico exprés incluido'
      ]
    },
    IMPACTO: {
      name: 'Plan Impacto Spot 3s',
      badge: '⭐ Más Vendido',
      weeklyPrice: 12.50,
      monthlyPrice: 45.00,
      icon: Video,
      features: [
        'Despliegue a los 3 segundos de iniciar el viaje',
        'Pop-up interactivo en pantalla completa',
        'Cupón de descuento exclusivo de carrera',
        'Atención 100% cautiva de los pasajeros',
        'Reporte de impresiones y clicks reales'
      ]
    },
    COMBO_FULL: {
      name: 'Combo Full Élite',
      badge: 'Pauta + Logística',
      weeklyPrice: 17.50,
      monthlyPrice: 60.00,
      icon: Layers,
      features: [
        'Todo lo del Plan Impacto (Spot 3s)',
        'Presencia destacada en Arcade de 13 juegos',
        'Canal de envíos y distribución con choferes a 1 km',
        'Soporte VIP y cambios de arte semanales'
      ]
    }
  };

  const currentPlan = PLANS[selectedPlan];
  const currentPrice = billingPeriod === 'WEEKLY' ? currentPlan.weeklyPrice : currentPlan.monthlyPrice;

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText('69893101');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  const handleCopyAccount = () => {
    navigator.clipboard?.writeText('69893101');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleSendWhatsApp = (e) => {
    if (e) e.preventDefault();
    const periodText = billingPeriod === 'WEEKLY' ? 'Semanal' : 'Mensual';
    const text = `¡Hola! Me interesa pautar mi negocio en Rumbo a tu Destino.\n\n🏢 *Comercio:* ${businessName || 'Mi Negocio'}\n📍 *Zona:* ${municipality}\n💼 *Plan Elegido:* ${currentPlan.name} (${periodText} - $${currentPrice.toFixed(2)} USD)\n💳 *Método de Pago:* Transferencia 365 Móvil (Davivienda 69893101)\n\nAdjunto los datos y fotos de mi promoción para activar el anuncio. 🚀`;
    window.open(`https://wa.me/50369893101?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!businessName) return;
    setLoading(true);
    try {
      await submitLeadApi({
        businessName,
        whatsapp: whatsapp || '69893101',
        municipality
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleReminder = async () => {
    setReminderLoading(true);
    try {
      // 1. Calcular hora objetivo
      let scheduledAt = null;

      if (reminderType === 'TONIGHT') {
        const target = new Date();
        target.setHours(20, 30, 0, 0); // 8:30 PM
        if (Date.now() >= target.getTime()) {
          target.setDate(target.getDate() + 1); // Mañana si ya pasaron las 8:30 PM
        }
        scheduledAt = target.toISOString();
      } else if (reminderType === 'IN_24_HOURS') {
        const target = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
        scheduledAt = target.toISOString();
      } else {
        scheduledAt = null; // En la próxima apertura
      }

      // 2. Intentar solicitar permiso y registrar suscripción Push si el navegador lo permite
      if (isPushSupported()) {
        try {
          await subscribeUserToPush({ userId: userId || 'anon_' + Date.now() });
        } catch (e) {
          console.warn('Nota Push al agendar recordatorio:', e);
        }
      }

      // 3. Guardar en localStorage para respaldo local
      const reminderObj = {
        id: 'ad_rem_' + Date.now(),
        userId: userId || null,
        planType: selectedPlan,
        billingPeriod,
        businessName: businessName || 'Mi Negocio',
        whatsapp: whatsapp || '',
        municipality,
        reminderType,
        scheduledAt,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('rumbo_ad_reminder', JSON.stringify(reminderObj));

      // 4. Registrar en el backend
      await scheduleAdReminderApi({
        userId,
        businessName,
        whatsapp,
        municipality,
        planType: selectedPlan,
        billingPeriod,
        reminderType,
        scheduledAt
      });

      setReminderScheduled(true);

      // Cierre suave tras 3.2 segundos
      setTimeout(() => {
        onClose();
        setReminderScheduled(false);
        setShowReminderSection(false);
      }, 3200);

    } catch (err) {
      console.error('Error programando recordatorio:', err);
      setReminderScheduled(true);
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-amber-400/60 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-slate-100">
        
        {/* ================= CABECERA ================= */}
        <header className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-600/20 via-slate-900 to-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Publicidad en Trayecto &bull; Rumbo a tu Destino
              </span>
              <h3 className="font-black text-base sm:text-lg text-white leading-tight">
                Pautas Comerciales & Pago Transferencia 365
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ================= CONTENIDO CON SCROLL ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-left text-xs sm:text-sm">
          
          {/* Banner Explicativo de Atención Cautiva */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Llega a miles de pasajeros que viajan directamente hacia tu municipio con la atención 100% enfocada en sus pantallas. Tu anuncio se desplegará <b>a los 3 segundos</b> de que el conductor inicie la carrera.
            </p>
          </div>

          {/* Selector de Período: Semanal vs Mensual */}
          <div className="flex items-center justify-between pt-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              1. Selecciona tu Plan Publicitario:
            </h4>
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setBillingPeriod('WEEKLY')}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                  billingPeriod === 'WEEKLY'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semanal
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('MONTHLY')}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                  billingPeriod === 'MONTHLY'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensual (-20%)
              </button>
            </div>
          </div>

          {/* Tarjetas de Planes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(PLANS).map(([key, plan]) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === key;
              const price = billingPeriod === 'WEEKLY' ? plan.weeklyPrice : plan.monthlyPrice;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow">
                      {plan.badge}
                    </span>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                      <h5 className="font-black text-sm text-white">{plan.name}</h5>
                    </div>

                    <div className="font-mono text-xl sm:text-2xl font-black text-white">
                      ${price.toFixed(2)}
                      <span className="text-xs font-normal text-slate-400">/{billingPeriod === 'WEEKLY' ? 'sem' : 'mes'}</span>
                    </div>

                    <ul className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                      {plan.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`py-1 text-center rounded-lg text-xs font-bold ${
                    isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isSelected ? '✓ Seleccionado' : 'Elegir'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= DATOS DE PAGO: TRANSFERENCIA 365 MÓVIL ================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border-2 border-red-500/40 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    Pago Oficial con Transferencia 365 Móvil
                    <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
                  </h4>
                  <span className="text-[10px] text-red-300 font-semibold">
                    Acreditación inmediata 24/7 sin comisiones bancarias
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-black uppercase">
                DAVIVIENDA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Banco Destino:</span>
                <span className="font-bold text-white block">DAVIVIENDA</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Titular de la Cuenta:</span>
                <span className="font-bold text-white block">Cesar Arias</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-amber-400 text-[10px] uppercase font-bold block">Número Celular 365:</span>
                  <span className="font-mono font-black text-sm text-amber-300">6989-3101</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="py-1 px-2.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPhone ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <b>Concepto de Transferencia:</b> Indica el nombre de tu negocio (ej. <i>Pauta Pupusería La Ceiba</i>) o tu teléfono de contacto.
              </span>
            </div>
          </div>

          {/* Formulario Rápido de Comercio */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              3. Datos de tu Negocio para Activar el Anuncio:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 text-[11px]">Nombre de tu Negocio:</label>
                <input
                  type="text"
                  placeholder="Ej. Taller Eléctrico San Salvador"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 text-[11px]">Tu WhatsApp de Pedidos:</label>
                <input
                  type="tel"
                  placeholder="Ej. 7000-0000"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 text-[11px]">Municipio Objetivo:</label>
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-amber-400"
                >
                  <option value="TODOS">Nacional (Todo El Salvador)</option>
                  <option value="San Salvador">San Salvador</option>
                  <option value="Santa Tecla">Santa Tecla</option>
                  <option value="Antiguo Cuscatlán">Antiguo Cuscatlán</option>
                  <option value="Soyapango">Soyapango</option>
                  <option value="Mejicanos">Mejicanos</option>
                  <option value="Apopa">Apopa</option>
                  <option value="San Miguel">San Miguel</option>
                  <option value="Santa Ana">Santa Ana</option>
                  <option value="La Libertad (Surf City)">La Libertad</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fábrica Exprés de Creatividades Gratuita */}
          <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl text-xs space-y-1 text-slate-300">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              ¿No tienes diseño ni banner publicitario listo?
            </span>
            <p className="text-[11px] text-slate-400">
              No te preocupes. Solo envíanos 2 fotos de tus productos o local por WhatsApp y nuestro equipo de diseño adaptará tus banners para celular sin costo adicional.
            </p>
          </div>

          {/* Botón Principal de Confirmación por WhatsApp */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer transition-all transform active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 fill-slate-950" />
              <span>Enviar Comprobante Transferencia 365 y Activar Pauta (${currentPrice.toFixed(2)} USD)</span>
            </button>

            <p className="text-center text-[10px] text-slate-500">
              Atención directa por WhatsApp (+503 6989-3101) &bull; Activación en menos de 2 horas.
            </p>
          </div>

          {/* ============================================================== */}
          {/* BOTÓN Y SECCIÓN: RECORDAR DESPUÉS / PENSARLO CON CALMA         */}
          {/* ============================================================== */}
          <div className="pt-2 border-t border-slate-800">
            {!showReminderSection ? (
              <div className="text-center space-y-1">
                <button
                  type="button"
                  onClick={() => setShowReminderSection(true)}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>¿Prefieres pensarlo? Recordar más tarde...</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <p className="text-[10px] text-slate-500">
                  Te guardamos la tarifa especial y te avisamos cuando estés relajado.
                </p>
              </div>
            ) : reminderScheduled ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-400/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-white">¡Recordatorio Programado con Éxito!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Guardamos tu tarifa especial de <b>{currentPlan.name} (${currentPrice.toFixed(2)} USD)</b>. 
                  {reminderType === 'TONIGHT' && ' Te avisaremos esta noche a las 8:30 PM para que lo revises con calma.'}
                  {reminderType === 'IN_24_HOURS' && ' Te avisaremos mañana a esta misma hora con tu cupón reservado.'}
                  {reminderType === 'NEXT_OPEN' && ' Te mostraremos la información guardada en tu próxima apertura de Rumbo.'}
                </p>
                <p className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                  <Bell className="w-3.5 h-3.5" />
                  <span>Te enviaremos una notificación a tu pantalla o teléfono si estás fuera de la app.</span>
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-400/50 space-y-3.5 animate-fade-in text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        ¿Cuándo prefieres que te recordemos?
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Te reservamos la tarifa y te enviamos un aviso a tu pantalla o celular.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReminderSection(false)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 Opciones de Recordatorio */}
                <div className="grid grid-cols-1 gap-2">
                  
                  {/* Opción 1: Por la noche (8:30 PM) */}
                  <label
                    onClick={() => setReminderType('TONIGHT')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      reminderType === 'TONIGHT'
                        ? 'bg-amber-400/10 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reminderOption"
                      checked={reminderType === 'TONIGHT'}
                      onChange={() => setReminderType('TONIGHT')}
                      className="mt-1 text-amber-400 accent-amber-400 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <span>🌙 Por la noche (8:30 PM)</span>
                        <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black uppercase">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Cuando ya estés relajado en casa, descansando y sin el ajetreo del día para revisarlo con tranquilidad.
                      </p>
                    </div>
                  </label>

                  {/* Opción 2: Dentro de 24 horas */}
                  <label
                    onClick={() => setReminderType('IN_24_HOURS')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      reminderType === 'IN_24_HOURS'
                        ? 'bg-amber-400/10 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reminderOption"
                      checked={reminderType === 'IN_24_HOURS'}
                      onChange={() => setReminderType('IN_24_HOURS')}
                      className="mt-1 text-amber-400 accent-amber-400 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-black text-xs">
                        ⏱️ Dentro de 24 horas (Mañana a esta misma hora)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Para que puedas consultar tus costos o coordinarlo con tu socio comercial durante el día.
                      </p>
                    </div>
                  </label>

                  {/* Opción 3: Próxima vez que abra la app */}
                  <label
                    onClick={() => setReminderType('NEXT_OPEN')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      reminderType === 'NEXT_OPEN'
                        ? 'bg-amber-400/10 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reminderOption"
                      checked={reminderType === 'NEXT_OPEN'}
                      onChange={() => setReminderType('NEXT_OPEN')}
                      className="mt-1 text-amber-400 accent-amber-400 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-black text-xs">
                        🚀 La próxima vez que ingrese a la app
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        En cuanto vuelvas a abrir Rumbo en tu teléfono o navegador, te recordaremos tu selección.
                      </p>
                    </div>
                  </label>

                </div>

                {/* Aviso sobre notificación si está fuera de la app */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Si no estás dentro de la app en ese momento, te saltará una notificación en tu pantalla para que no pierdas la oferta.
                  </span>
                </div>

                {/* Botón de Confirmación del Recordatorio */}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScheduleReminder}
                    disabled={reminderLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {reminderLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Programando recordatorio...</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        <span>Confirmar y Programar Recordatorio</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowReminderSection(false)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
