import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Fuel,
  DollarSign,
  Car,
  Clock,
  Sparkles,
  CheckCircle2,
  Percent,
  Coins,
  Store,
  Users,
  ChevronRight,
  Calculator,
  ArrowRight,
  HeartHandshake,
  MessageCircle,
  AlertCircle,
  LifeBuoy,
  Navigation,
  LogIn,
  Smartphone,
  Radio,
  RefreshCw,
  Zap,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import RumboLogo from './RumboLogo';
import DriverAvatarNarrator from './DriverAvatarNarrator';
import SupportTicketModal from './SupportTicketModal';
import TermsAndConditionsModal from '../components/TermsAndConditionsModal';
import {
  requestPhoneOtpApi,
  loginDriverWithPhoneApi,
  sendMagicLinkApi,
  verifyMagicTokenApi,
  checkMagicTokenStatusApi
} from './api';

export default function DriverLandingView({ onStartRegistration, onCheckStatus, onDriverLoggedIn }) {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Estados del flujo: 'PHONE' | 'NOT_REGISTERED' | 'PENDING_APPROVAL' | 'PASS_ISSUED'
  const [loginStep, setLoginStep] = useState('PHONE');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isRequestingPass, setIsRequestingPass] = useState(false);
  const [isVerifyingPass, setIsVerifyingPass] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [verifiedDriver, setVerifiedDriver] = useState(null); // { id, fullName, vehiclePlate, phone }
  const [unregisteredPhone, setUnregisteredPhone] = useState('');
  const [pendingDriverData, setPendingDriverData] = useState(null); // { fullName, phone, message }
  const [passData, setPassData] = useState(null); // { whatsappWebLink, magicLinkUrl, expiresInSeconds }
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [workInvitation, setWorkInvitation] = useState(null);

  const autoDetectTimerRef = React.useRef(null);

  // Cerrar y limpiar modal
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setLoginStep('PHONE');
    setPhoneInput('');
    setPasswordInput('');
    setShowPassword(false);
    setIsLoggingIn(false);
    setOtpCode('');
    setIsRequestingPass(false);
    setIsVerifyingPass(false);
    setVerifiedDriver(null);
    setUnregisteredPhone('');
    setPendingDriverData(null);
    setPassData(null);
    setIsCopiedLink(false);
    setLoginError('');
    setWorkInvitation(null);
    if (autoDetectTimerRef.current) {
      clearInterval(autoDetectTimerRef.current);
      clearTimeout(autoDetectTimerRef.current);
    }
  };

  // Login tradicional y directo: Teléfono + Contraseña / Clave
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    const clean = phoneInput.replace(/\D/g, '').slice(-8);
    if (clean.length < 8) {
      setLoginError('Por favor ingresa un número de celular salvadoreño válido de 8 dígitos (ej. 7890-1234).');
      return;
    }
    if (!passwordInput.trim()) {
      setLoginError('Por favor ingresa tu contraseña o clave de acceso.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');
    setWorkInvitation(null);

    try {
      const res = await loginDriverWithPhoneApi({
        phone: clean,
        password: passwordInput.trim()
      });

      if (res && res.success && res.driverProfile) {
        localStorage.setItem('rumbo_driver_profile', JSON.stringify(res.driverProfile));
        handleCloseLoginModal();
        if (onDriverLoggedIn) {
          onDriverLoggedIn(res.driverProfile);
        }
      } else {
        setLoginError(res?.error || 'No se pudo iniciar sesión. Por favor verifica tus datos.');
      }
    } catch (err) {
      console.log('Driver login response:', err);
      if (err.code === 'DRIVER_NOT_REGISTERED') {
        setUnregisteredPhone(clean);
        setLoginStep('NOT_REGISTERED');
      } else if (err.code === 'DRIVER_PENDING_APPROVAL') {
        setPendingDriverData({
          fullName: err.driverName || 'Conductor',
          phone: clean,
          message: err.message || 'Tu solicitud de ingreso está actualmente en revisión y auditoría documental.'
        });
        setLoginStep('PENDING_APPROVAL');
      } else if (err.code === 'INVALID_PASSWORD') {
        setLoginError('La contraseña o clave de acceso ingresada es incorrecta. Por favor verifícala e intenta nuevamente.');
      } else if (err.code === 'DRIVER_REJECTED') {
        setUnregisteredPhone(clean);
        setLoginError(err.message || 'Tu expediente no fue aprobado por administración.');
        setLoginStep('NOT_REGISTERED');
      } else if (err.code === 'DRIVER_SUSPENDED') {
        setLoginError(err.message || 'Tu cuenta se encuentra suspendida o inactiva.');
      } else {
        setLoginError(err.message || 'Error al conectar con la plataforma.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Tocar la puerta del backend: Solicitar Pase de Acceso (WhatsApp o SMS)
  const handleRequestPass = async (e, method = 'WHATSAPP') => {
    if (e) e.preventDefault();
    const clean = phoneInput.replace(/\D/g, '').slice(-8);
    if (clean.length < 8) {
      setLoginError('Por favor ingresa un número de celular salvadoreño válido de 8 dígitos (ej. 7890-1234).');
      return;
    }

    setIsRequestingPass(true);
    setLoginError('');
    setWorkInvitation(null);

    try {
      // El teléfono toca la puerta del backend con su número
      const res = method === 'SMS'
        ? await requestPhoneOtpApi({ phone: clean })
        : await sendMagicLinkApi({ phone: clean });

      if (res && res.success) {
        // Conductor verificado y aprobado: El backend emitió el pase
        setVerifiedDriver(res.driver || null);
        setPassData(res);
        setOtpCode('');
        setLoginStep('PASS_ISSUED');

        // Escuchar en segundo plano si el enlace se abrió desde WhatsApp en el celular
        if (autoDetectTimerRef.current) clearInterval(autoDetectTimerRef.current);
        const poll = setInterval(async () => {
          try {
            const status = await checkMagicTokenStatusApi({ phone: clean });
            if (status && status.verified) {
              clearInterval(poll);
              const authRes = await verifyMagicTokenApi({ phone: clean, token: res.token || 'VALID' });
              if (authRes && authRes.success && authRes.driverProfile) {
                localStorage.setItem('rumbo_driver_profile', JSON.stringify(authRes.driverProfile));
                handleCloseLoginModal();
                if (onDriverLoggedIn) onDriverLoggedIn(authRes.driverProfile);
              }
            }
          } catch {}
        }, 2500);
        autoDetectTimerRef.current = poll;

      } else {
        setLoginError(res?.error || 'No se pudo generar el pase de acceso. Intenta nuevamente.');
      }
    } catch (err) {
      console.log('Driver gate response:', err);
      if (err.code === 'DRIVER_NOT_REGISTERED') {
        // La plataforma no lo tiene en su lista de conductores aprobados
        setUnregisteredPhone(clean);
        setLoginStep('NOT_REGISTERED');
      } else if (err.code === 'DRIVER_PENDING_APPROVAL') {
        // Está registrado pero pendiente de aprobación
        setPendingDriverData({
          fullName: err.driverName || 'Conductor',
          phone: clean,
          message: err.message || 'Tu expediente está en proceso de revisión administrativa.'
        });
        setLoginStep('PENDING_APPROVAL');
      } else if (err.code === 'DRIVER_REJECTED') {
        setUnregisteredPhone(clean);
        setLoginError(err.message || 'Tu expediente no cumple con los requisitos de validación.');
        setLoginStep('NOT_REGISTERED');
      } else {
        setLoginError(err.message || 'Error de conexión al verificar el expediente del conductor.');
      }
    } finally {
      setIsRequestingPass(false);
    }
  };

  // Validar Pase de Acceso e Ingresar a la Consola
  const handleVerifyPass = async (codeToVerify) => {
    const finalCode = (codeToVerify || otpCode).trim();
    if (!finalCode || finalCode.length < 4) {
      setLoginError('Por favor ingresa el código de acceso recibido.');
      return;
    }
    const clean = phoneInput.replace(/\D/g, '').slice(-8);
    setIsVerifyingPass(true);
    setLoginError('');

    try {
      let res;
      try {
        res = await verifyMagicTokenApi({ phone: clean, token: finalCode });
      } catch (tokenErr) {
        // Fallback a login por SMS si vino vía SMS
        res = await loginDriverWithPhoneApi({ phone: clean, otpCode: finalCode });
      }

      if (res && res.success && res.driverProfile) {
        localStorage.setItem('rumbo_driver_profile', JSON.stringify(res.driverProfile));
        handleCloseLoginModal();
        if (onDriverLoggedIn) {
          onDriverLoggedIn(res.driverProfile);
        }
      } else {
        setLoginError(res?.error || 'Pase de acceso incorrecto o expirado.');
      }
    } catch (err) {
      const isSharedOrDup = err?.isSharedOrDuplicate || err?.message?.includes('utilizado') || err?.message?.includes('compartido') || err?.message?.includes('expirado');
      if (isSharedOrDup) {
        setWorkInvitation(err?.workInvitation || {
          title: '¿Necesitas trabajar en la plataforma?',
          message: 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión'
        });
      }
      setLoginError(err.message || 'Error al validar el pase de acceso.');
    } finally {
      setIsVerifyingPass(false);
    }
  };


  // Calculadora interactiva de ganancia semanal estimada
  const [tripsPerDay, setTripsPerDay] = useState(12);
  const [avgFare, setAvgFare] = useState(4.50);
  const [daysWorking, setDaysWorking] = useState(6);
  const [hasCarRentalOrLoan, setHasCarRentalOrLoan] = useState(true); // Alquiler del carro o cuota de financiamiento (~$100 semanales)

  const weeklyGross = tripsPerDay * avgFare * daysWorking;
  const carRentalCost = hasCarRentalOrLoan ? 100.00 : 0.00;

  // En plataformas tradicionales quitan entre 25% y 30%
  const traditionalCommissionRate = 0.28; // 28% promedio
  const traditionalCommissionLost = weeklyGross * traditionalCommissionRate;
  const traditionalNetWeekly = Math.max(0, weeklyGross - traditionalCommissionLost - carRentalCost);

  // En Rumbo: 0% de comisión. Cuota fija de $15 (y $0 en su primera semana de bienvenida)
  const rumboFeeFirstWeek = 0.00; // Semana de bienvenida bonificada
  const rumboNetFirstWeek = Math.max(0, weeklyGross - rumboFeeFirstWeek - carRentalCost);
  const weeklyExtraInPocket = traditionalCommissionLost; // Lo que antes te quitaban ahora va a tu bolsa
  const monthlyExtraInPocket = weeklyExtraInPocket * 4;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 1. BARRA SUPERIOR ELEGANTE */}
      <header className="border-b border-slate-850 bg-slate-900/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <RumboLogo textClassName="text-xl" />
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
            Comunidad de Conductores
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupportModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 hover:text-white hover:bg-slate-850 border border-amber-500/30 transition-colors cursor-pointer"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
            <span>Soporte Técnico</span>
          </button>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Ingresar a mi Consola</span>
          </button>
          <button
            onClick={onStartRegistration}
            className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-950/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Unirme Gratis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. HERO: EL MENSAJE REAL Y EMPATÍA PSICOLÓGICA */}
      <section className="relative px-4 sm:px-8 pt-10 pb-12 sm:pt-16 sm:pb-18 max-w-5xl mx-auto w-full text-center space-y-6">
        
        {/* Glow de Fondo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black tracking-wide uppercase">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>🎁 Prelanzamiento: 30 Días Gratis para los Primeros 100 Conductores ($0 Cuota • Vence 31 Oct 2026)</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
          El auto es tuyo. El volante es tuyo.<br />
          <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
            El 100% de tu dinero también debe ser tuyo.
          </span>
        </h1>

        <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Sabemos lo duro que es lidiar con el tráfico diario, el desgaste de tu vehículo, 
          <strong className="text-amber-300 font-semibold"> el alza desmesurada de la gasolina</strong> y el compromiso implacable del 
          <strong className="text-amber-300 font-semibold"> alquiler del carro o la cuota de financiamiento (~$100 semanales)</strong>. 
          No tiene sentido que sobre todo eso, una aplicación te quite el 25% o 30% de cada viaje que sudas en la calle. 
          <strong className="text-white font-black"> Rumbo nació para cambiar tu Destino.</strong>
        </p>

        {/* CTA Principal Hero */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onStartRegistration}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 transition-all transform active:scale-98 cursor-pointer"
          >
            <span>Activar mis 14 Días Gratis • Registrarme</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-amber-500/40 text-amber-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-950/30"
          >
            <LogIn className="w-4 h-4 text-amber-400" />
            <span>Ya estoy Inscrito • Entrar a mi Consola</span>
          </button>
        </div>

        {/* Acceso Rápido para conductores ya inscritos */}
        <div className="pt-1 text-xs text-slate-400">
          ¿Ya enviaste tus documentos?{' '}
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="text-amber-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
          >
            <span>Ingresa con tu DUI o Placa a tu Consola aquí</span>
          </button>
        </div>

        {/* Mini Badges de Confianza */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>0% Comisión por carrera</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% Efectivo en tu bolsa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sin contratos forzosos</span>
          </div>
        </div>

        {/* 2.1 EL AVATAR NARRADOR INTERACTIVO (DRAMÁTICO Y EUFÓRICO) */}
        <div className="pt-2 max-w-3xl mx-auto">
          <DriverAvatarNarrator onStartRegistration={onStartRegistration} />
        </div>
      </section>

      {/* 3. COMPARATIVA REAL DE INGRESOS (SIN NOMBRAR A LA COMPETENCIA) */}
      <section className="px-4 sm:px-8 py-10 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Cuentas Claras • Números Reales
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              ¿Cuánto dinero dejas sobre la mesa cada semana?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Compara el modelo tradicional de porcentajes agresivos frente a la transparencia de Rumbo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Tarjeta Tradicional */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Otras Plataformas (Modelo Tradicional)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[11px] font-bold">
                  13.34% a 28%+ Comisión
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Total generado en la semana:</span>
                  <span className="font-bold text-white">${weeklyGross.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-rose-400 font-bold">
                  <span>Comisión por viaje (13.34% a 28%):</span>
                  <span>-${traditionalCommissionLost.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-rose-300">
                  <span>Alquiler del carro o cuota financiamiento:</span>
                  <span className="font-mono font-bold">-$100.00 USD/sem</span>
                </div>
                <div className="flex justify-between py-1.5 text-slate-400">
                  <span>Recargas previas obligatorias:</span>
                  <span className="text-slate-300">De tu dinero anticipado</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Te queda libre para tu familia:</span>
                <span className="text-xl sm:text-2xl font-black text-rose-300">
                  ${Math.max(0, traditionalNetWeekly).toFixed(2)} USD
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Incluso en apps que dicen cobrar "pagos bajos", te descuentan el <strong className="text-rose-400">13.34%</strong> de tu saldo prepagado. Al sumar el alquiler y la gasolina, prácticamente trabajas para otros.
              </p>
            </div>

            {/* Tarjeta Rumbo a mi Destino */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-950/30 to-slate-900 border-2 border-amber-500/50 space-y-4 relative overflow-hidden shadow-xl shadow-amber-950/30">
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-bl-xl">
                Revolución Colaborativa
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  En Rumbo a mi Destino
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black">
                  0% Comisión
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Total generado en la semana:</span>
                  <span className="font-bold text-white">${weeklyGross.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-emerald-400 font-bold">
                  <span>Comisión por viaje:</span>
                  <span>$0.00 (0% Comisión)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-amber-300 font-bold">
                  <span>Tus Primeros 14 Días de Bienvenida:</span>
                  <span className="uppercase">GRATIS ($0.00 Cuota)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span>Alquiler / Financiamiento semanal:</span>
                  <span className="font-mono font-bold text-emerald-300">-$100.00 (Cubierto con holgura)</span>
                </div>
                <div className="flex justify-between py-1.5 text-slate-400">
                  <span>Sin recargas prepagadas:</span>
                  <span className="text-emerald-400 font-bold">Nunca te bloqueamos por saldo</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Te queda libre en mano (1ª sem):</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  ${rumboNetFirstWeek.toFixed(2)} USD
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                <span>¡Extra en tu bolsillo al mes!</span>
                <span className="text-sm font-black text-emerald-400">+${monthlyExtraInPocket.toFixed(2)} USD</span>
              </div>
            </div>
          </div>

          {/* CASO REAL DE LA CALLE: LA DURA REALIDAD DEL CONDUCTOR */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">La Realidad de la Calle: Análisis de un Viaje Real en San Salvador</h4>
                  <p className="text-[11px] text-slate-400">Recibo auténtico de viaje: Calle San José a Av. Olímpica</p>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                13.34% Comisión Real
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Distancia Recorrida</span>
                <span className="text-sm font-black text-slate-200">10.8 km</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Tiempo en Tráfico</span>
                <span className="text-sm font-black text-amber-400">66 min (1h 06m)</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Tarifa del Pasajero</span>
                <span className="text-sm font-black text-white">$5.20 USD</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-rose-500/30">
                <span className="text-rose-400 block text-[10px] uppercase font-bold">Comisión App (13.34%)</span>
                <span className="text-sm font-black text-rose-400">-$0.69 USD</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Ingreso que le quedó al chofer tras la comisión de la app ($0.69):</span>
                <span className="font-bold text-white">$4.51 USD</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>Gasolina consumida en 66 min de tráfico a marcha lenta (Gasolina Especial $5.13/gal):</span>
                <span className="font-bold text-amber-200">-$1.80 USD (0.35 gal)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Saldo en mano tras pagar el combustible:</span>
                <span className="font-bold text-white">$2.71 USD</span>
              </div>
              <div className="flex justify-between text-rose-300 font-bold pt-1.5 border-t border-amber-500/20">
                <span>Proporcional del alquiler / financiamiento del carro (~$100/sem ≈ $2.00/hr):</span>
                <span>-$2.00 USD</span>
              </div>
              <div className="flex justify-between text-rose-400 font-black text-sm pt-1 border-t border-rose-500/30">
                <span>Lo que realmente le quedó limpio al chofer por 66 minutos de su vida:</span>
                <span className="text-base text-rose-400">$0.71 USD</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              👉 ¡Con la <strong>Gasolina Especial a $5.13 por galón</strong> y la comisión del 13.34%, el chofer se mató en el tráfico durante más de una hora para llevarse <strong>setenta y un centavos</strong> a su casa!  
              En <strong>Rumbo a mi Destino</strong> la comisión es <strong>$0.00</strong>: los $5.20 entran íntegros a tu bolsa, la tarifa protege tu tiempo en tráfico y el radar de gasolina te ayuda a encontrar las estaciones con mejor precio para cuidar cada centavo.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CALCULADORA DINÁMICA DE GANANCIA */}
      <section className="px-4 sm:px-8 py-10 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white">Calcula tu Ganancia Real en Rumbo</h3>
            <p className="text-xs text-slate-400">Ajusta los deslizadores según tu ritmo de trabajo habitual</p>
          </div>
        </div>

        {/* Selector de Gasto de Alquiler / Financiamiento del Auto */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasCarRentalOrLoan}
              onChange={(e) => setHasCarRentalOrLoan(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded bg-slate-950 border-slate-700 cursor-pointer focus:ring-0"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                ¿Pagas alquiler del vehículo o cuota de financiamiento semanal?
              </span>
              <span className="text-[11px] text-slate-400">
                Calculado con base en el promedio real de El Salvador: $100.00 USD semanales ($400/mes)
              </span>
            </div>
          </label>
          <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl ${hasCarRentalOrLoan ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
            {hasCarRentalOrLoan ? '-$100.00 USD/sem' : '$0.00 (Auto propio sin deuda)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6">
          {/* Slider 1: Carreras por día */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">Carreras por día:</span>
              <span className="text-amber-400 font-black text-sm">{tripsPerDay} viajes</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              value={tripsPerDay}
              onChange={(e) => setTripsPerDay(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>5 min</span>
              <span>25 max</span>
            </div>
          </div>

          {/* Slider 2: Tarifa promedio */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">Tarifa promedio:</span>
              <span className="text-amber-400 font-black text-sm">${avgFare.toFixed(2)} USD</span>
            </div>
            <input
              type="range"
              min={2.50}
              max={8.00}
              step={0.25}
              value={avgFare}
              onChange={(e) => setAvgFare(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>$2.50</span>
              <span>$8.00</span>
            </div>
          </div>

          {/* Slider 3: Días trabajados */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">Días por semana:</span>
              <span className="text-amber-400 font-black text-sm">{daysWorking} días</span>
            </div>
            <input
              type="range"
              min={4}
              max={7}
              value={daysWorking}
              onChange={(e) => setDaysWorking(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>4 días</span>
              <span>7 días</span>
            </div>
          </div>
        </div>

        {/* Resultado Destacado */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/40 border border-emerald-500/30 text-center space-y-1">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
            Ingreso Neto Estimado para tu bolsillo en tu 1ª Semana {hasCarRentalOrLoan ? '(después de pagar los $100 del auto)' : ''}:
          </span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400">
            ${rumboNetFirstWeek.toFixed(2)} USD <span className="text-xs text-slate-400 font-normal">en efectivo limpio</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Frente al modelo tradicional de comisiones, te ahorras <strong className="text-emerald-300">${weeklyExtraInPocket.toFixed(2)} USD semanales</strong> que van directos a tu hogar.
          </p>
        </div>
      </section>

      {/* 5. EL ECOSISTEMA: CÓMO CALCULAMOS LA TARIFA, BONOS Y COMERCIOS AFILIADOS */}
      <section className="px-4 sm:px-8 py-10 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Transparencia Absoluta
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              ¿Cómo Funciona el Ecosistema Rumbo?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Diseñado minuciosamente para redistribuir el valor y proteger la economía del conductor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Pilar 1: Cálculo de Tarifa Justa */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">1. Tarifa Justa y Transparente</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculamos la tarifa basándonos en <strong>kilómetros reales, tiempo estimado y consumo de gasolina</strong>. Ni tarifas absurdas que desanimen al usuario, ni tarifas bajas que te hagan perder dinero. Tú siempre ves la tarifa y el destino antes de aceptar.
              </p>
            </div>

            {/* Pilar 2: Los Bonos de Pasajero y Canje con Conductores */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">2. Bonos que Pagan tu Cuota</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inyectamos bonos de <strong>$1.00 USD</strong> a los pasajeros para que viajen más seguido. Cuando un pasajero te entrega su bono en una carrera, <strong>lo acumulas para liquidar tu cuota semanal de $15.00</strong>. ¡Con 15 bonos recibidos, tu semana te sale a $0.00!
              </p>
            </div>

            {/* Pilar 3: Comercios Afiliados y Alianzas */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">3. Alianzas Automotrices Locales</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ¿Acumulaste más de 15 bonos en la semana? El excedente no se pierde: podrás <strong>canjearlo por descuentos en talleres, repuestos, llanterías y lubricentros aliados</strong> que forman parte de la red comercial de Rumbo.
              </p>
            </div>

            {/* Pilar 4: Despacho a 1 km a la Redonda • Cero Solicitudes Fantasma */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-500/10 to-slate-900/90 border border-amber-500/30 space-y-3 shadow-lg shadow-amber-950/20">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>4. Radio 1 km • Cero Viajes Fantasma</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                En otras apps abundan las <strong>solicitudes fantasma</strong>: viajes que aceptas y de inmediato dicen <em>"ya fue tomada"</em> para forzar falsa demanda. En Rumbo, <strong>todas las solicitudes están 100% confirmadas a máximo 1 km a la redonda</strong>. Pasajeros reales esperando en la acera, sin engaños.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. COLABORACIÓN ANTE EL COMBUSTIBLE: RADAR DE GASOLINERAS */}
      <section className="px-4 sm:px-8 py-10 max-w-4xl mx-auto w-full">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Fuel className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Pacto Colaborativo de Conductores
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Frente al Combustible Caro, Nos Cuidamos Juntos
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Rumbo no es una empresa lejana ni una app fría: <strong>nació como una plataforma colaborativa pensada desde el dolor real del conductor</strong>. 
            El combustible sube constantemente y cada centavo cuenta. Por eso, integramos en tu pantalla de chofer un 
            <strong className="text-amber-300"> Radar de Gasolineras en Tiempo Real</strong>.
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">
                <strong>Confirmación comunitaria:</strong> Cuando cargas combustible, confirmas el precio con un toque en pantalla. Así alertamos a los demás choferes dónde comprar más barato.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">
                <strong>Ahorro acumulado:</strong> Ahorrar $0.10 a $0.15 por galón representa hasta <strong>$40 a $60 dólares extra al mes</strong> que se quedan en el bolsillo de tu familia.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. LLAMADO FINAL A LA ACCIÓN (FOOTER CONVERTIDOR) */}
      <section className="px-4 sm:px-8 py-12 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800 text-center space-y-5">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Únete a la Nueva Era del Transporte en El Salvador
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Regístrate en menos de 3 minutos, sube tu DUI y placas, y aprovecha tus 
            <strong className="text-amber-300"> 14 días iniciales totalmente gratis</strong> sin compromiso.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onStartRegistration}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Comenzar Registro Ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onCheckStatus}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-sm cursor-pointer transition-colors"
          >
            Ya envié mi solicitud • Ver estatus
          </button>
        </div>

        <div className="pt-8 text-[11px] text-slate-500 border-t border-slate-900 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Rumbo a mi Destino • demiempresa.online</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Términos & Políticas</span>
            </button>
            <button
              onClick={() => setShowSupportModal(true)}
              className="text-slate-400 hover:text-white font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Soporte Técnico</span>
            </button>
          </div>
        </div>
      </section>

      {/* Modal Oficial de Términos de Referencia & Políticas */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Modal de Soporte Técnico y Creación de Tickets */}
      <SupportTicketModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* MODAL DE INGRESO Y VERIFICACIÓN ESTRICTA DE CONDUCTORES */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400/70 rounded-3xl p-6 shadow-2xl space-y-4 animate-pop-bounce relative">
            <button
              type="button"
              onClick={handleCloseLoginModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-bold p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* CASO 1: INGRESO TRADICIONAL (TELÉFONO + CONTRASEÑA / CLAVE) */}
            {loginStep === 'PHONE' && (
              <>
                <div className="text-center space-y-1.5 pt-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shadow-amber-500/20">
                    <LogIn className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-white">
                    Acceso a Consola de Conductor
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ingresa con tu número de teléfono salvadoreño y tu clave de acceso autorizada.
                  </p>
                </div>

                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Número de Celular (El Salvador)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
                        <span>🇸🇻</span>
                        <span>+503</span>
                      </div>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Ej. 7890-1234"
                        autoFocus
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 tracking-wider font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Contraseña / Clave de Acceso
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSupportModal(true)}
                        className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                      >
                        ¿Olvidaste tu clave?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Ingresa tu clave"
                        required
                        className="w-full px-3.5 py-2.5 pr-11 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                        <span>Verificando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Ingresar a mi Consola</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* CASO 2: NÚMERO NO REGISTRADO O NO ENCONTRADO EN LA LISTA */}
            {loginStep === 'NOT_REGISTERED' && (
              <div className="space-y-4 pt-2 text-center animate-fade-in">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/15 border-2 border-rose-500/40 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 uppercase tracking-wider inline-block mb-1.5">
                    Acceso Restringido
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Número No Registrado
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    El número <strong className="text-amber-300 font-mono">+503 {unregisteredPhone}</strong> no se encuentra en nuestra lista de conductores aprobados.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Para ingresar y trabajar en la plataforma con <strong>0% de comisión</strong>, debes completar tu registro formal como conductor.
                  </p>
                </div>

                {/* BOTÓN PRINCIPAL: REGISTRARSE COMO CONDUCTOR */}
                <button
                  type="button"
                  onClick={() => {
                    handleCloseLoginModal();
                    onStartRegistration();
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
                >
                  <Car className="w-4 h-4" />
                  <span>Inscribirme como Conductor Ahora</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('PHONE');
                      setLoginError('');
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Intentar con otro número de celular</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASO 3: EXPEDIENTE EN AUDITORÍA / PENDIENTE DE APROBACIÓN */}
            {loginStep === 'PENDING_APPROVAL' && (
              <div className="space-y-4 pt-2 text-center animate-fade-in">
                <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/15 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 uppercase tracking-wider inline-block mb-1.5">
                    Expediente en Auditoría
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Revisión Administrativa
                  </h3>
                  <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                    Estimado(a) <strong>{pendingDriverData?.fullName || 'Conductor'}</strong>, tu documentación fue recibida y se encuentra en proceso de validación oficial.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Te notificaremos tan pronto como administración apruebe tu expediente para que puedas ingresar con tu pase de acceso.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('PHONE');
                      setLoginError('');
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a intentar con otro número</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASO 4: CONDUCTOR APROBADO -> PASE DE ACCESO EMITIDO */}
            {loginStep === 'PASS_ISSUED' && (
              <div className="space-y-4 pt-1 animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('PHONE');
                      if (autoDetectTimerRef.current) clearInterval(autoDetectTimerRef.current);
                    }}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cambiar número</span>
                  </button>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    🇸🇻 +503 {phoneInput.replace(/\D/g, '').slice(-8)}
                  </span>
                </div>

                <div className="text-center py-2 space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <ShieldCheck className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white">
                      ¡Pase de Acceso Emitido!
                    </h4>
                    {verifiedDriver && (
                      <div className="mt-1.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-left text-xs space-y-0.5">
                        <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Conductor Aprobado: {verifiedDriver.fullName}</span>
                        </div>
                        {verifiedDriver.vehiclePlate && (
                          <div className="text-slate-400 text-[11px] pl-5">
                            Vehículo: <span className="text-slate-200 font-mono font-bold">{verifiedDriver.vehiclePlate}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Abre el enlace directo enviado a tu WhatsApp o ingresa tu código de 6 dígitos a continuación para entrar a tu consola.
                    </p>
                  </div>
                </div>

                {/* BOTÓN ABRIR WHATSAPP SI ESTÁ DISPONIBLE */}
                {passData?.whatsappWebLink && (
                  <a
                    href={passData.whatsappWebLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>👉 Abrir en mi WhatsApp y Entrar</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </a>
                )}

                {/* INGRESO MANUAL DE CÓDIGO */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-300 text-center">
                    O ingresa tu código de acceso (6 dígitos):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full text-center py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-lg font-black tracking-[0.4em] text-amber-300 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyPass(otpCode)}
                      disabled={isVerifyingPass || otpCode.length < 4}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-colors shrink-0"
                    >
                      {isVerifyingPass ? 'Validando...' : 'Entrar'}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{loginError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                ¿Deseas registrar un nuevo expediente?{' '}
                <button
                  type="button"
                  onClick={() => {
                    handleCloseLoginModal();
                    onStartRegistration();
                  }}
                  className="text-amber-400 hover:underline font-bold cursor-pointer"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
