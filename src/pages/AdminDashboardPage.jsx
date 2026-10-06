import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  Users,
  Car,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Inbox,
  CreditCard,
  Building2,
  Lightbulb,
  LifeBuoy,
  LogOut,
  RefreshCw,
  Search,
  Eye,
  Check,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  Phone,
  Send,
  ExternalLink,
  ChevronRight,
  Filter,
  MessageCircle,
  QrCode,
  Sparkles,
  Copy,
  Share2,
  Smartphone,
  Trash2,
  Activity,
  BarChart3,
  Timer,
  MousePointerClick,
  Gift,
  TrendingDown
} from 'lucide-react';
import RumboLogo from '../viajes/RumboLogo';
import ExitIntentRescueModal from '../viajes/ExitIntentRescueModal';
import {
  loginAdminSecureApi,
  fetchAdminStatsApi,
  fetchAdminDriversApi,
  updateDriverAuthorizationApi,
  purgeAdminDriversApi,
  fetchInboxTicketsApi,
  updateInboxTicketStatusApi,
  fetchAdminWhatsAppConfigApi,
  saveAdminWhatsAppConfigApi,
  testWhatsAppSendApi,
  resetDatabaseApi,
  fetchAdminTelemetryStatsApi
} from '../viajes/api';

export default function AdminDashboardPage() {
  // Estado de Autenticación Doble Factor
  const [adminSession, setAdminSession] = useState(() => {
    try {
      const saved = localStorage.getItem('rumbo_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Navegación de Pestañas del Panel
  const [activeTab, setActiveTab] = useState('STATS'); // 'STATS' | 'DRIVERS' | 'INBOX' | 'WHATSAPP'

  // Datos del Dashboard
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Configuración de WhatsApp Oficial
  const [waConfig, setWaConfig] = useState({
    adminPhone: '69893101',
    adminName: 'Cesar Arias - Rumbo a tu Destino',
    connectionMode: 'DIRECT_LINK', // 'DIRECT_LINK' | 'WHATSAPP_WEB_QR' | 'META_CLOUD_API'
    messageTemplate: '🚗 *Rumbo a tu Destino - Acceso de Conductor*\n\nHola Conductor, aquí tienes tu enlace directo para entrar a tu consola:\n👉 {MAGIC_LINK}\n\n(O tu código de acceso manual: *{CODE}*)\n\nVálido por 15 minutos.',
    metaPhoneId: '',
    metaWabaId: '',
    metaAccessToken: '',
    isConnected: true
  });
  const [waSaving, setWaSaving] = useState(false);
  const [waSaveSuccess, setWaSaveSuccess] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('69893101');
  const [waTestResult, setWaTestResult] = useState(null);
  const [waTestLoading, setWaTestLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Filtros de Inbox
  const [inboxCategoryFilter, setInboxCategoryFilter] = useState('ALL'); // 'ALL' | 'PAGOS' | 'SUGERENCIAS' | 'QUEJAS' | 'SOPORTE'
  const [inboxRoleFilter, setInboxRoleFilter] = useState('ALL'); // 'ALL' | 'DRIVER' | 'PASSENGER'
  const [inboxStatusFilter, setInboxStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'RESOLVED'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Modal de Detalle de Conductor para Autorización
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [rejectReasonModal, setRejectReasonModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [authActionLoading, setAuthActionLoading] = useState(false);

  // Modal para ver imagen de comprobante o documento ampliado
  const [previewImage, setPreviewImage] = useState(null);

  // Estados de Telemetría y Retención
  const [telemetryStats, setTelemetryStats] = useState(null);
  const [showExitModalPreview, setShowExitModalPreview] = useState(false);

  // Estados y Enlaces Oficiales de Difusión por WhatsApp
  const [copiedTarget, setCopiedTarget] = useState(null);
  const [customPassengerPhone, setCustomPassengerPhone] = useState('');
  const [customDriverPhone, setCustomDriverPhone] = useState('');

  const PASSENGER_URL = 'https://viajes.demiempresa.online/viajes';
  const DRIVER_URL = 'https://viajes.demiempresa.online/conductor';

  const PASSENGER_WA_MESSAGE = `🚗 *¡Súper Promoción de Prelanzamiento con Rumbo a mi Destino!* 🇸🇻\n\n🎁 *¡BONO DEL 200% PARA LOS PRIMEROS 100 PASAJEROS!* (Hasta el 31 de Octubre de 2026):\n✅ *$2.00 USD de Bienvenida* activo de inmediato para tu primera carrera.\n✅ *$2.00 USD por cada amigo que refieras* para seguir viajando con descuento.\n✅ *0% comisiones abusivas:* pagas en efectivo directo la tarifa negociada con tu conductor.\n✅ Calculadora con precios justos MINEC y subasta en tiempo real (< 1 km).\n\n⏳ *Condición de la Promoción:* Válida exclusivamente para los primeros 100 viajeros inscritos o hasta el *31 de octubre de 2026*. A partir del 1 de noviembre aplica la promoción normal ($1.00 USD).\n\n🚀 *Fase de Prelanzamiento y Prueba Piloto:*\nEstamos en despliegue controlado en El Salvador. Si en tu zona aún no encuentras conductor disponible de inmediato, te solicitamos invitar a tus amigos y conductores de confianza para expandir la cobertura en tu localidad.\n\n👉 Aprovecha tus $2.00 y regístrate en 1 toque aquí:\n${PASSENGER_URL}`;

  const DRIVER_WA_MESSAGE = `🚘 *¡Conserva el 100% de tus carreras en tu bolsillo con Rumbo Conductor!* 🇸🇻\n\n🎁 *¡30 DÍAS GRATIS PARA LOS PRIMEROS 100 CONDUCTORES!* (Hasta el 31 de Octubre de 2026):\n🔥 *1 Mes Completo a $0 Cuota:* conserva el 100% del dinero de todas tus carreras sin pagar membresía de plataforma.\n🔥 *0% Comisión por viaje:* todo el dinero que cobres en efectivo va íntegro a tu mano.\n💵 Cuota fija semanal posterior de $15.00 (o pase diario de $3.00), reducible hasta *$0.00* acumulando bonos de pasajeros.\n⛽ Radar de gasolineras baratas en ruta y despacho a menos de 1 km.\n\n⏳ *Condición de la Promoción:* Los *30 días gratis* aplican únicamente a los primeros 100 conductores que completen su expediente hasta el *31 de octubre de 2026*. A partir del 1 de noviembre aplica el periodo normal de 14 días gratis.\n\n🚀 *Fase de Prelanzamiento y Prueba Piloto:*\nEstamos en periodo de prueba piloto oficial. El flujo de solicitudes de pasajeros está aumentando día a día. Inscríbete hoy para asegurar tu mes gratis y construir tu cartera de clientes desde el inicio.\n\n👉 Inscríbete en 3 minutos completando tu expediente aquí:\n${DRIVER_URL}`;

  const handleCopyText = async (text, targetKey) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedTarget(targetKey);
      setTimeout(() => setCopiedTarget(null), 2500);
    } catch {
      alert('Texto copiado al portapapeles');
    }
  };

  const handleSendWhatsApp = (targetPhone, text) => {
    const cleanPhone = (targetPhone || '').replace(/\D/g, '');
    let url = '';
    if (cleanPhone.length >= 8) {
      const fullPhone = cleanPhone.startsWith('503') ? cleanPhone : `503${cleanPhone.slice(-8)}`;
      url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  // Cargar datos cuando está autenticado
  useEffect(() => {
    if (adminSession) {
      loadDashboardData();
    }
  }, [adminSession]);

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      const [statsData, driversData, ticketsData, waData, telemData] = await Promise.all([
        fetchAdminStatsApi(),
        fetchAdminDriversApi(),
        fetchInboxTicketsApi(),
        fetchAdminWhatsAppConfigApi().catch(() => null),
        fetchAdminTelemetryStatsApi().catch(() => null)
      ]);
      setStats(statsData);
      setDrivers(driversData || []);
      setTickets(ticketsData || []);
      if (waData) setWaConfig(waData);
      if (telemData) setTelemetryStats(telemData);
    } catch (err) {
      console.warn('Error loading admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveWhatsAppConfig = async () => {
    setWaSaving(true);
    setWaSaveSuccess(false);
    try {
      const res = await saveAdminWhatsAppConfigApi(waConfig);
      if (res && res.success) {
        setWaSaveSuccess(true);
        setTimeout(() => setWaSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.message || 'Error al guardar configuración');
    } finally {
      setWaSaving(false);
    }
  };

  const handleTestWhatsAppSend = async () => {
    if (!waTestPhone.trim() || waTestPhone.replace(/\D/g, '').length < 8) {
      alert('Por favor ingresa un número de 8 dígitos para la prueba.');
      return;
    }
    setWaTestLoading(true);
    try {
      const res = await testWhatsAppSendApi({ testPhone: waTestPhone });
      if (res && res.success) {
        setWaTestResult(res);
      }
    } catch (err) {
      alert(err.message || 'Error en la prueba');
    } finally {
      setWaTestLoading(false);
    }
  };

  const [resetLoading, setResetLoading] = useState(false);

  const handleResetDatabase = async () => {
    const confirmReset = window.confirm(
      '⚠️ ¿Estás seguro de que deseas REINICIAR TODO A CERO?\n\nEsta acción borrará todos los registros de prueba de pasajeros, conductores, viajes realizados y tickets en la base de datos, dejando los 100 cupos de pasajeros y 100 cupos de conductores totalmente limpios y libres para el prelanzamiento.\n\n¿Deseas continuar?'
    );
    if (!confirmReset) return;

    setResetLoading(true);
    try {
      const res = await resetDatabaseApi();
      alert(res.message || 'Base de datos y memoria reseteadas exitosamente a CERO.');
      await loadDashboardData();
    } catch (err) {
      alert('Error al reiniciar base de datos: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const [purgeDriversLoading, setPurgeDriversLoading] = useState(false);

  const handlePurgeDrivers = async () => {
    const confirmPurge = window.confirm(
      '⚠️ ¿Deseas vaciar todos los expedientes de conductores de prueba?\n\nEsto dejará la bandeja de autorizaciones en CERO expedientes para recibir únicamente solicitudes reales.'
    );
    if (!confirmPurge) return;

    setPurgeDriversLoading(true);
    try {
      const res = await purgeAdminDriversApi();
      setDrivers([]);
      alert(res.message || 'Expedientes reiniciados a CERO.');
      await loadDashboardData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPurgeDriversLoading(false);
    }
  };

  // Manejo de Inicio de Sesión Seguro
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginIdentifier.trim() || !loginPin.trim()) {
      setLoginError('Por favor complete su identificador y la clave de seguridad.');
      return;
    }
    setLoginLoading(true);

    try {
      const res = await loginAdminSecureApi({
        identifier: loginIdentifier.trim(),
        pinCode: loginPin.trim()
      });

      if (res && res.success) {
        setAdminSession(res.admin);
        localStorage.setItem('rumbo_admin_session', JSON.stringify(res.admin));
      } else {
        throw new Error(res?.error || 'Credenciales o clave de seguridad no autorizadas.');
      }
    } catch (err) {
      setLoginError(err.message || 'Error de autenticación. Verifique sus credenciales.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminSession(null);
    localStorage.removeItem('rumbo_admin_session');
    setLoginIdentifier('');
    setLoginPin('');
    setLoginError('');
  };

  // Acciones de Autorización de Conductores
  const handleAuthorizeDriver = async (driverId, newStatus) => {
    setAuthActionLoading(true);
    try {
      const res = await updateDriverAuthorizationApi(driverId, {
        status: newStatus,
        rejectionReason: newStatus === 'REJECTED' ? rejectionReason : null
      });
      if (res && res.success) {
        // Actualizar lista local
        setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, approval_status: newStatus } : d));
        if (selectedDriver?.id === driverId) {
          setSelectedDriver(prev => ({ ...prev, approval_status: newStatus }));
        }
        setRejectReasonModal(false);
        setRejectionReason('');
        loadDashboardData();
      }
    } catch (e) {
      alert('Error al actualizar estatus de conductor: ' + e.message);
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Acciones de Tickets de Inbox
  const handleUpdateTicketStatus = async (ticketId, newStatus, customNotes = null) => {
    setReplyLoading(true);
    try {
      const notes = customNotes || replyText;
      const res = await updateInboxTicketStatusApi(ticketId, {
        status: newStatus,
        adminNotes: notes || (newStatus === 'APPROVED' ? 'Comprobante de pago verificado y acreditado por administración.' : 'Ticket atendido y resuelto con éxito.')
      });
      if (res && res.success) {
        setTickets(prev => prev.map(t => t.id === ticketId || t.ticket_code === ticketId ? { ...t, status: newStatus, admin_notes: notes } : t));
        if (selectedTicket?.id === ticketId || selectedTicket?.ticket_code === ticketId) {
          setSelectedTicket(prev => ({ ...prev, status: newStatus, admin_notes: notes }));
        }
        setReplyText('');
        loadDashboardData();
      }
    } catch (e) {
      alert('Error al actualizar ticket: ' + e.message);
    } finally {
      setReplyLoading(false);
    }
  };

  // Filtrado de tickets
  const filteredTickets = tickets.filter(t => {
    if (inboxCategoryFilter !== 'ALL' && t.category !== inboxCategoryFilter) return false;
    if (inboxRoleFilter !== 'ALL' && t.sender_role !== inboxRoleFilter) return false;
    if (inboxStatusFilter === 'PENDING' && t.status !== 'PENDING') return false;
    if (inboxStatusFilter === 'RESOLVED' && (t.status !== 'RESOLVED' && t.status !== 'APPROVED')) return false;
    return true;
  });

  // Conteo de tickets por tema
  const pendingPagosCount = tickets.filter(t => t.category === 'PAGOS' && t.status === 'PENDING').length;
  const pendingSugerenciasCount = tickets.filter(t => t.category === 'SUGERENCIAS' && t.status === 'PENDING').length;
  const pendingQuejasCount = tickets.filter(t => t.category === 'QUEJAS' && t.status === 'PENDING').length;
  const pendingSoporteCount = tickets.filter(t => t.category === 'SOPORTE' && t.status === 'PENDING').length;

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // PANTALLA 1: ACCESO ADMINISTRATIVO RESTRINGIDO (2FA)
  // --------------------------------------------------------------------------
  if (!adminSession) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Glow de seguridad de fondo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-md w-full bg-[#0b1329] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
          
          {/* Logo y Encabezado de Seguridad */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="pt-2">
              <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🔒 ACCESO PRIVADO DEL SERVIDOR
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Consola de Administración Rumbo
            </h1>
            <p className="text-xs text-slate-400">
              Terminal de Control Central de Pasajeros, Conductores y Auditoría de Pagos
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Acceso Restringido con Doble Factor (2FA)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Terminal protegida criptográficamente. Requiere credenciales de nivel administrativo y llave de seguridad maestro.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Identificador de Administrador Autorizado:
              </label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                autoFocus
                placeholder="Usuario o Identificador Maestro"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Llave de Acceso 2FA (PIN Maestro / Clave):
              </label>
              <input
                type="password"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono text-sm font-bold tracking-wider focus:border-amber-400 focus:outline-none"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
            >
              {loginLoading ? (
                <span>Validando Credenciales 2FA...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Desbloquear Terminal de Control</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-850">
            <a
              href="/conductor"
              className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
            >
              ← Volver a la Consola de Conductor
            </a>
          </div>

        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // PANTALLA 2: PANEL DE ADMINISTRACIÓN PRINCIPAL
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. CABECERA ADMINISTRATIVA */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base text-white">Rumbo Central Control</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                ADMIN 2FA ACTIVO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Operador: <span className="text-amber-300 font-bold">{adminSession.username || 'Super Administrador'}</span>
            </p>
          </div>
        </div>

        {/* Acciones Superiores */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            title="Recargar datos"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleResetDatabase}
            disabled={resetLoading}
            title="Vaciar datos de prueba y reiniciar todo a cero"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer"
          >
            <Trash2 className={`w-3.5 h-3.5 ${resetLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Iniciar a Cero</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DIFUSION')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Difusión WhatsApp</span>
          </button>
          <a
            href="/conductor"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors"
          >
            <Car className="w-3.5 h-3.5" />
            <span>App Conductor</span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión administrativa"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* 2. BARRA DE NAVEGACIÓN DE PESTAÑAS PRINCIPALES */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('STATS')}
          className={`py-3 px-4 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'STATS'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Estadísticas & KPIs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DRIVERS')}
          className={`py-3 px-4 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'DRIVERS'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Autorización de Conductores</span>
          {drivers.filter(d => d.approval_status === 'PENDING').length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
              {drivers.filter(d => d.approval_status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INBOX')}
          className={`py-3 px-4 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'INBOX'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Buzón Central & Cola de Tickets</span>
          {tickets.filter(t => t.status === 'PENDING').length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] animate-pulse">
              {tickets.filter(t => t.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DIFUSION')}
          className={`py-3 px-4 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'DIFUSION'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Share2 className="w-4 h-4 text-emerald-400" />
          <span>Difusión WhatsApp (Viajeros & Choferes)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
            OFICIAL
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WHATSAPP')}
          className={`py-3 px-4 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'WHATSAPP'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Configuración WhatsApp</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('TELEMETRY');
            fetchAdminTelemetryStatsApi().then(data => { if (data) setTelemetryStats(data); }).catch(() => null);
          }}
          className={`py-3 px-4 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'TELEMETRY'
              ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Telemetría & Retención</span>
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white font-black text-[9px] uppercase tracking-wider">
            EN VIVO
          </span>
        </button>
      </nav>

      {/* 3. CONTENEDOR DE PESTAÑAS */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* ================================================================== */}
        {/* PESTAÑA A: ESTADÍSTICAS & KPIS EN TIEMPO REAL */}
        {/* ================================================================== */}
        {activeTab === 'STATS' && (
          <div className="space-y-6 animate-fade-in">
            {/* PANEL DE CONTROL OFICIAL DE PRELANZAMIENTO: BONO 200% & 30 DÍAS GRATIS */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-slate-900 to-emerald-500/10 border-2 border-amber-500/40 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xl shadow">
                    🎁
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-white">
                        Control de Prelanzamiento: Bono 200% & 30 Días Gratis
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                        VENCE 31 OCT 2026
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Promoción exclusiva para los primeros 100 viajeros y primeros 100 conductores inscritos. Desde el 1 de Noviembre de 2026 aplica régimen regular.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:self-center">
                  <span className="text-[11px] text-slate-400 font-medium">Estado:</span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>PROMOCIÓN ACTIVA</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDatabase}
                    disabled={resetLoading}
                    title="Vaciar datos y reiniciar a cero"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${resetLoading ? 'animate-spin' : ''}`} />
                    <span>Reiniciar a Cero</span>
                  </button>
                </div>
              </div>

              {/* Medidores de Cupos: Pasajeros vs Conductores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Medidor 1: Pasajeros (Primeros 100 con Bono 200%) */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Pasajeros • Bono 200% ($2.00 USD)
                      </span>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <span>{stats?.totalPassengers ?? 0} de 100 Inscritos</span>
                        <span className="text-xs text-emerald-400 font-mono font-bold">
                          ({Math.round(((stats?.totalPassengers ?? 0) / 100) * 100)}%)
                        </span>
                      </h4>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      {Math.max(0, 100 - (stats?.totalPassengers ?? 0))} Cupos Restantes
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round(((stats?.totalPassengers ?? 0) / 100) * 100))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">Bono Bienvenida:</span>
                      <strong className="text-emerald-400 font-mono text-sm">$2.00 USD</strong>
                      <span className="text-[9px] text-slate-500 block">(Normal: $1.00 USD)</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">Bono por Referido:</span>
                      <strong className="text-emerald-400 font-mono text-sm">$2.00 USD</strong>
                      <span className="text-[9px] text-slate-500 block">(Normal: $1.00 USD)</span>
                    </div>
                  </div>
                </div>

                {/* Medidor 2: Conductores (Primeros 100 con 30 Días Gratis) */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Conductores • 30 Días Gratis ($0 Cuota)
                      </span>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <span>{stats?.totalDrivers ?? 0} de 100 Inscritos</span>
                        <span className="text-xs text-amber-400 font-mono font-bold">
                          ({Math.round(((stats?.totalDrivers ?? 0) / 100) * 100)}%)
                        </span>
                      </h4>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {Math.max(0, 100 - (stats?.totalDrivers ?? 0))} Cupos Restantes
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round(((stats?.totalDrivers ?? 0) / 100) * 100))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">Periodo Gratuito:</span>
                      <strong className="text-amber-300 font-mono text-sm">30 Días ($0)</strong>
                      <span className="text-[9px] text-slate-500 block">(Normal: 14 Días)</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">Ahorro en Cuotas:</span>
                      <strong className="text-amber-300 font-mono text-sm">~$60.00 USD</strong>
                      <span className="text-[9px] text-slate-500 block">(100% cobro en mano)</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Nota Legal y Fecha de Vencimiento */}
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Condición de Vigencia:</strong> Esta promoción vence impostergablemente el <strong>31 de Octubre de 2026 a las 23:59:59</strong>. A partir del <strong>1 de Noviembre de 2026</strong> la plataforma aplicará los valores normales ($1.00 USD bono viajero y 14 días gratis chofer).
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de Métricas Clave */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Pasajeros Registrados</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats?.totalPassengers ?? 0}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold">
                  Inicio limpio prelanzamiento
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Conductores Activos</span>
                  <Car className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {stats?.approvedDrivers ?? 0}
                </div>
                <div className="text-[11px] text-slate-400">
                  {stats?.pendingDrivers ?? 0} pendientes de aprobar
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Viajes Completados</span>
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats?.completedTrips ?? 0}
                </div>
                <div className="text-[11px] text-sky-400 font-semibold">
                  100% cobro en mano
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Tickets en Cola</span>
                  <Inbox className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                  {stats?.pendingTicketsCount ?? tickets.filter(t => t.status === 'PENDING').length}
                </div>
                <div className="text-[11px] text-amber-300 font-semibold">
                  {pendingPagosCount} comprobantes de pago
                </div>
              </div>
            </div>

            {/* Resumen Financiero y de Membresías */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl space-y-3">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Membresías de Conductores y Pagos</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Los conductores pagan <strong>$15.00 semanales</strong> o <strong>$3.00 diarios</strong> mediante bonos o transferencias por Transfer365 Móvil Davivienda al 69893101 y Cubo Pago.
                </p>
                <div className="grid grid-cols-2 gap-3 font-mono text-xs pt-1">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Volumen de Cuotas:</span>
                    <strong className="text-emerald-400 text-lg">$1,540.00</strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Bonos Circulantes ($1):</span>
                    <strong className="text-amber-400 text-lg">320 Bonos</strong>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-sky-400" />
                  <span>Estado de la Cola del Buzón por Temas</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span>💳 Pagos y Comprobantes Bancarios</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">{pendingPagosCount} pendientes</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <span>💡 Sugerencias de Mejora</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{pendingSugerenciasCount} pendientes</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>⚠️ Quejas de Usuarios / Conductores</span>
                    </span>
                    <span className="font-mono font-bold text-rose-400">{pendingQuejasCount} pendientes</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="flex items-center gap-2">
                      <LifeBuoy className="w-4 h-4 text-sky-400" />
                      <span>🛠️ Soporte Técnico</span>
                    </span>
                    <span className="font-mono font-bold text-sky-400">{pendingSoporteCount} pendientes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acceso Rápido: Enlaces de Difusión WhatsApp */}
            <div className="p-5 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-amber-950/20 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">
                    Compartir Enlaces por WhatsApp
                  </h4>
                  <p className="text-xs text-slate-400">
                    Envía el enlace oficial a nuevos pasajeros (con $1.00 de bono) o a conductores (14 días gratis y 0% comisión).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp('', PASSENGER_WA_MESSAGE)}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition-transform active:scale-95"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Enviar a Pasajeros</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp('', DRIVER_WA_MESSAGE)}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition-transform active:scale-95"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Enviar a Conductores</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('DIFUSION')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Ver Central Completa →</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA B: AUTORIZACIÓN DE CONDUCTORES */}
        {/* ================================================================== */}
        {activeTab === 'DRIVERS' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  Expedientes de Conductores para Autorización
                </h2>
                <p className="text-xs text-slate-400">
                  Revisa DUI, Licencia, antecedentes y fotos del auto para habilitar al conductor en la app.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                  Total: {drivers.length} Conductores
                </span>
                <button
                  type="button"
                  onClick={handlePurgeDrivers}
                  disabled={purgeDriversLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                  title="Eliminar expedientes de prueba"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${purgeDriversLoading ? 'animate-spin' : ''}`} />
                  <span>Vaciar Expedientes</span>
                </button>
              </div>
            </div>

            {/* Si no hay expedientes pendientes */}
            {drivers.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
                  🚗
                </div>
                <h3 className="text-base font-black text-white">No hay expedientes pendientes</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  La bandeja de autorizaciones está completamente limpia a CERO para el prelanzamiento. Cuando los choferes se registren y suban su documentación oficial, sus expedientes aparecerán aquí para revisión.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {drivers.map((drv) => {
                  const isPending = drv.approval_status === 'PENDING';
                  const isApproved = drv.approval_status === 'APPROVED';
                  const isRejected = drv.approval_status === 'REJECTED';

                  return (
                    <div
                      key={drv.id}
                      className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl space-y-3 text-xs transition-all shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{drv.full_name}</h4>
                          <span className="text-slate-400 font-mono text-[11px]">DUI: {drv.dui || 'N/A'}</span>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isRejected
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {drv.approval_status || 'PENDIENTE'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Vehículo:</span>
                          <strong className="text-white">{drv.vehicle_brand} {drv.vehicle_model} ({drv.vehicle_color})</strong>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Placa:</span>
                          <strong className="text-amber-300 font-bold">{drv.vehicle_plate}</strong>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Teléfono:</span>
                          <span className="text-slate-200">{drv.phone}</span>
                        </div>
                      </div>

                      {/* Botón para ver expediente completo */}
                      <button
                        type="button"
                        onClick={() => setSelectedDriver(drv)}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspeccionar Documentos y Autorizar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA C: INBOX CENTRAL MULTITEMA & COLA DE ATENCIÓN */}
        {/* ================================================================== */}
        {activeTab === 'INBOX' && (
          <div className="space-y-4 animate-fade-in">
            {/* Cabecera y Filtros de la Cola */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  Buzón Central de Atención por Cola
                </h2>
                <p className="text-xs text-slate-400">
                  Comprobantes de pago bancario, sugerencias, quejas e incidencias con número de ticket.
                </p>
              </div>

              {/* Filtros por Rol y Estado */}
              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  value={inboxCategoryFilter}
                  onChange={(e) => setInboxCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Todos los Temas</option>
                  <option value="PAGOS">💳 Pagos ({pendingPagosCount})</option>
                  <option value="SUGERENCIAS">💡 Sugerencias ({pendingSugerenciasCount})</option>
                  <option value="QUEJAS">⚠️ Quejas ({pendingQuejasCount})</option>
                  <option value="SOPORTE">🛠️ Soporte Técnico ({pendingSoporteCount})</option>
                </select>

                <select
                  value={inboxRoleFilter}
                  onChange={(e) => setInboxRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Todos los Roles</option>
                  <option value="DRIVER">Conductores</option>
                  <option value="PASSENGER">Pasajeros</option>
                </select>

                <select
                  value={inboxStatusFilter}
                  onChange={(e) => setInboxStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="RESOLVED">Resueltos / Aprobados</option>
                </select>
              </div>
            </div>

            {/* Lista de Tickets en Cola */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredTickets.map((tkt) => {
                const isPending = tkt.status === 'PENDING';
                const isApproved = tkt.status === 'APPROVED' || tkt.status === 'RESOLVED';
                const isPagos = tkt.category === 'PAGOS';

                return (
                  <div
                    key={tkt.id || tkt.ticket_code}
                    className={`p-4 rounded-3xl border text-xs space-y-3 transition-all ${
                      isPending
                        ? 'bg-slate-900 border-amber-500/40 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-300 text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40">
                          {tkt.ticket_code}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-950 text-slate-300">
                          {tkt.category}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {tkt.sender_role === 'DRIVER' ? '🚗 Conductor' : '🚶 Pasajero'}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isApproved ? 'Resuelto' : 'En Espera'}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-white text-sm">{tkt.subject}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        De: <strong className="text-slate-200">{tkt.sender_name}</strong> {tkt.sender_phone ? `• Tel: ${tkt.sender_phone}` : ''} {tkt.vehicle_plate ? `• Placa: ${tkt.vehicle_plate}` : ''}
                      </div>
                      <p className="text-slate-300 text-xs mt-1.5 leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                        {tkt.description}
                      </p>
                    </div>

                    {/* Si es ticket de pago: muestra monto y comprobante */}
                    {isPagos && (
                      <div className="p-3 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2">
                        <div className="flex justify-between items-center font-mono">
                          <span className="text-slate-400">Monto Reportado:</span>
                          <strong className="text-emerald-400 font-bold text-sm">
                            ${parseFloat(tkt.payment_amount || 0).toFixed(2)} USD ({tkt.payment_method})
                          </strong>
                        </div>

                        {tkt.attachment_url && (
                          <div className="pt-1 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Comprobante Bancario:</span>
                            <button
                              type="button"
                              onClick={() => setPreviewImage(tkt.attachment_url)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Captura de Pago</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Respuesta previa de administración si existe */}
                    {tkt.admin_notes && (
                      <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[11px] space-y-0.5">
                        <span className="font-bold text-emerald-400">Respuesta registrada:</span>
                        <p className="text-slate-200">{tkt.admin_notes}</p>
                      </div>
                    )}

                    {/* Botones de Atención y Respuesta Rápida */}
                    <div className="flex gap-2 pt-1 border-t border-slate-800">
                      {isPagos && isPending && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTicketStatus(tkt.id || tkt.ticket_code, 'APPROVED', 'Pago verificado exitosamente por administración. Cuota acreditada y vigencia renovada.')}
                          className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        >
                          <Check className="w-4 h-4 text-slate-950" />
                          <span>Aprobar Pago y Acreditar Cuota</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTicket(tkt)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>Responder Ticket</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 text-right">
                      {new Date(tkt.created_at).toLocaleString('es-SV')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA: DIFUSIÓN Y ENLACES OFICIALES DE WHATSAPP */}
        {/* ================================================================== */}
        {activeTab === 'DIFUSION' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header del Módulo de Difusión */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black shadow">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white">Central de Difusión por WhatsApp</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      PRODUCCIÓN OFICIAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Envía invitaciones directas por WhatsApp a pasajeros y conductores con enlaces y textos optimizados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Canal Emisor:</span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  +503 {waConfig.adminPhone}
                </span>
              </div>
            </div>

            {/* Aviso Oficial de Prelanzamiento y Promoción 200% */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border-2 border-amber-500/40 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                      Fase Oficial de Prelanzamiento • Promoción 200% & 30 Días Gratis
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                      VENCE 31 OCT 2026
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Estamos en despliegue controlado en El Salvador. Para los primeros <strong>100 viajeros</strong> aplicamos <strong>Bono del 200% ($2.00 por inscribirse y $2.00 por referir)</strong> y para los primeros <strong>100 conductores</strong> otorgamos <strong>30 DÍAS GRATIS</strong> ($0 cuota / 1 mes). A partir del 1 de Noviembre de 2026 rigen las condiciones normales.
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <span className="text-[10px] text-slate-400">Cupos Disponibles:</span>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {Math.max(0, 100 - (stats?.totalPassengers ?? 0))} Pasajeros
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {Math.max(0, 100 - (stats?.totalDrivers ?? 0))} Choferes
                  </span>
                </div>
              </div>
            </div>

            {/* Dos Grandes Tarjetas: A) VIAJEROS / PASAJEROS | B) CONDUCTORES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* TARJETA 1: ENLACE PARA VIAJEROS / PASAJEROS */}
              <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Público General</span>
                        <h3 className="text-base font-black text-white">Para Viajeros y Pasajeros</h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black border border-emerald-500/40">
                      Bono 200%: $2.00 USD (100 Primeros)
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Invita a usuarios a registrarse: los primeros 100 viajeros reciben <strong>$2.00 USD de bienvenida</strong> y <strong>$2.00 USD por cada amigo referido</strong> (válido hasta el 31 de octubre de 2026).
                  </p>

                  {/* URL Oficial */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 font-mono text-xs">
                    <span className="text-[10px] text-slate-400 font-sans block">Enlace Oficial de Viajeros:</span>
                    <div className="flex items-center justify-between gap-2 text-emerald-400 font-bold break-all">
                      <span>{PASSENGER_URL}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(PASSENGER_URL, 'PASSENGER_LINK')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer transition-colors"
                        title="Copiar URL"
                      >
                        {copiedTarget === 'PASSENGER_LINK' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Previsualización del Mensaje de WhatsApp */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">Mensaje Prediseñado para WhatsApp:</span>
                    <div className="p-3 bg-[#0b141a] rounded-2xl border border-slate-800 text-slate-200 text-xs font-sans whitespace-pre-line leading-relaxed shadow-inner">
                      {PASSENGER_WA_MESSAGE}
                    </div>
                  </div>

                  {/* Campo de Teléfono Destinatario (Opcional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      Enviar a un número específico (Opcional):
                    </label>
                    <div className="flex rounded-xl bg-slate-950 border border-slate-800 focus-within:border-emerald-500 overflow-hidden text-xs">
                      <span className="px-3 py-2 bg-slate-800 text-slate-300 font-bold font-mono flex items-center">
                        +503
                      </span>
                      <input
                        type="tel"
                        value={customPassengerPhone}
                        onChange={(e) => setCustomPassengerPhone(e.target.value)}
                        placeholder="ej. 78901234 (Dejar vacío para compartir a cualquiera)"
                        className="w-full px-3 py-2 bg-transparent text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones de Envío y Copiado */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(customPassengerPhone, PASSENGER_WA_MESSAGE)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar a Pasajero por WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(PASSENGER_WA_MESSAGE, 'PASSENGER_MSG')}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedTarget === 'PASSENGER_MSG' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Mensaje</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TARJETA 2: ENLACE PARA CONDUCTORES / SOCIOS */}
              <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Oportunidad Laboral</span>
                        <h3 className="text-base font-black text-white">Para Conductores / Choferes</h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black border border-amber-500/40">
                      30 Días Gratis • $0 Cuota (100 Primeros)
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Invita a conductores particulares: los primeros 100 choferes reciben <strong>30 DÍAS GRATIS de prueba</strong> (1 mes completo a $0 cuota), conservando el 100% de su efectivo directo. Cuota fija posterior de $15/semana o $3/día (válido hasta el 31 de octubre de 2026).
                  </p>

                  {/* URL Oficial */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 font-mono text-xs">
                    <span className="text-[10px] text-slate-400 font-sans block">Enlace Oficial de Conductores:</span>
                    <div className="flex items-center justify-between gap-2 text-amber-400 font-bold break-all">
                      <span>{DRIVER_URL}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(DRIVER_URL, 'DRIVER_LINK')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer transition-colors"
                        title="Copiar URL"
                      >
                        {copiedTarget === 'DRIVER_LINK' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Previsualización del Mensaje de WhatsApp */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">Mensaje Prediseñado para WhatsApp:</span>
                    <div className="p-3 bg-[#0b141a] rounded-2xl border border-slate-800 text-slate-200 text-xs font-sans whitespace-pre-line leading-relaxed shadow-inner">
                      {DRIVER_WA_MESSAGE}
                    </div>
                  </div>

                  {/* Campo de Teléfono Destinatario (Opcional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      Enviar a un número específico (Opcional):
                    </label>
                    <div className="flex rounded-xl bg-slate-950 border border-slate-800 focus-within:border-amber-500 overflow-hidden text-xs">
                      <span className="px-3 py-2 bg-slate-800 text-slate-300 font-bold font-mono flex items-center">
                        +503
                      </span>
                      <input
                        type="tel"
                        value={customDriverPhone}
                        onChange={(e) => setCustomDriverPhone(e.target.value)}
                        placeholder="ej. 78901234 (Dejar vacío para compartir a cualquiera)"
                        className="w-full px-3 py-2 bg-transparent text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones de Envío y Copiado */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(customDriverPhone, DRIVER_WA_MESSAGE)}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar a Conductor por WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(DRIVER_WA_MESSAGE, 'DRIVER_MSG')}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedTarget === 'DRIVER_MSG' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Mensaje</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Código QR Compartido en Pantalla */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-bold text-sm text-white flex items-center justify-center sm:justify-start gap-2">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Códigos QR Rápidos para Escaneo Presencial</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Puedes mostrar estos códigos en tu pantalla o imprimirlos para que las personas los escaneen directamente con la cámara de su celular.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="p-2 bg-white rounded-xl inline-block shadow">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(PASSENGER_URL)}`}
                      alt="QR Pasajeros"
                      className="w-20 h-20"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 block mt-1">QR Pasajeros</span>
                </div>

                <div className="text-center p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="p-2 bg-white rounded-xl inline-block shadow">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(DRIVER_URL)}`}
                      alt="QR Conductores"
                      className="w-20 h-20"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 block mt-1">QR Conductores</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA D: CONFIGURACIÓN OFICIAL DE WHATSAPP */}
        {/* ================================================================== */}
        {activeTab === 'WHATSAPP' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header del módulo */}
            <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white">Canal de WhatsApp y Enlace Mágico</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      ACTIVO • EL SALVADOR (+503)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Configura el canal emisor para enviar enlaces de acceso rápido a los conductores sin contraseñas ni demoras.
                  </p>
                </div>
              </div>

              {waSaveSuccess && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Configuración guardada exitosamente</span>
                </div>
              )}
            </div>

            {/* Cuadrícula Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Columna 1: Ajustes de Emisor y Modo de Conexión */}
              <div className="space-y-6">

                {/* 1. Datos del Emisor Oficial */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>1. Datos del Número Oficial de WhatsApp</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Número de Teléfono Emisor (El Salvador)
                      </label>
                      <div className="flex rounded-xl bg-slate-950 border border-slate-800 focus-within:border-emerald-500 overflow-hidden">
                        <span className="px-3 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold font-mono flex items-center">
                          +503
                        </span>
                        <input
                          type="tel"
                          value={waConfig.adminPhone}
                          onChange={(e) => setWaConfig({ ...waConfig, adminPhone: e.target.value })}
                          placeholder="69893101"
                          maxLength={12}
                          className="w-full px-3 py-2.5 bg-transparent text-white text-sm font-mono focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Número del administrador César Arias utilizado para la atención y recepción directa.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Nombre de Contacto / Remitente
                      </label>
                      <input
                        type="text"
                        value={waConfig.adminName}
                        onChange={(e) => setWaConfig({ ...waConfig, adminName: e.target.value })}
                        placeholder="Cesar Arias - Rumbo a tu Destino"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Selector de Modo de Conexión */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>2. Modo de Envío y Conectividad</span>
                  </h3>

                  <div className="space-y-2.5">
                    {/* Opción 1: Enlace Directo (Recomendado) */}
                    <div
                      onClick={() => setWaConfig({ ...waConfig, connectionMode: 'DIRECT_LINK' })}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        waConfig.connectionMode === 'DIRECT_LINK'
                          ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="connectionMode"
                            checked={waConfig.connectionMode === 'DIRECT_LINK'}
                            onChange={() => setWaConfig({ ...waConfig, connectionMode: 'DIRECT_LINK' })}
                            className="text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-black text-white">Enlace Directo WhatsApp (wa.me)</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Recomendado • $0 Costo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 pl-5">
                        El conductor pulsa <strong>"Ingresar con WhatsApp"</strong> y se abre de inmediato su aplicación oficial con el mensaje ya redactado hacia tu número o auto-enviado. Cero costo de SMS y 100% confiable.
                      </p>
                    </div>

                    {/* Opción 2: Puente WhatsApp Web */}
                    <div
                      onClick={() => setWaConfig({ ...waConfig, connectionMode: 'WHATSAPP_WEB_QR' })}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        waConfig.connectionMode === 'WHATSAPP_WEB_QR'
                          ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="connectionMode"
                            checked={waConfig.connectionMode === 'WHATSAPP_WEB_QR'}
                            onChange={() => setWaConfig({ ...waConfig, connectionMode: 'WHATSAPP_WEB_QR' })}
                            className="text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-black text-white">Puente WhatsApp Web (Vinculación QR)</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQrModal(true);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 flex items-center gap-1 hover:bg-blue-500/30 cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>Ver QR</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 pl-5">
                        Conecta un teléfono dedicado mediante escaneo de código QR para despachar mensajes en segundo plano desde el servidor.
                      </p>
                    </div>

                    {/* Opción 3: Meta Cloud API Oficial */}
                    <div
                      onClick={() => setWaConfig({ ...waConfig, connectionMode: 'META_CLOUD_API' })}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        waConfig.connectionMode === 'META_CLOUD_API'
                          ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="connectionMode"
                            checked={waConfig.connectionMode === 'META_CLOUD_API'}
                            onChange={() => setWaConfig({ ...waConfig, connectionMode: 'META_CLOUD_API' })}
                            className="text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-black text-white">Meta Cloud API (WhatsApp Business)</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700">
                          Empresarial
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 pl-5">
                        API oficial de Meta. Requiere cuenta comercial de Meta for Developers verificada y pago por plantilla aprobada.
                      </p>
                    </div>
                  </div>

                  {/* Campos si está en modo Meta Cloud API */}
                  {waConfig.connectionMode === 'META_CLOUD_API' && (
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 animate-fade-in text-xs">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Credenciales Meta Developers</span>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-0.5">Phone Number ID</label>
                        <input
                          type="text"
                          value={waConfig.metaPhoneId || ''}
                          onChange={(e) => setWaConfig({ ...waConfig, metaPhoneId: e.target.value })}
                          placeholder="Ej: 104829104928"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-0.5">WABA ID (WhatsApp Business Account ID)</label>
                        <input
                          type="text"
                          value={waConfig.metaWabaId || ''}
                          onChange={(e) => setWaConfig({ ...waConfig, metaWabaId: e.target.value })}
                          placeholder="Ej: 294820194820"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-0.5">System User Permanent Token</label>
                        <input
                          type="password"
                          value={waConfig.metaAccessToken || ''}
                          onChange={(e) => setWaConfig({ ...waConfig, metaAccessToken: e.target.value })}
                          placeholder="EAAB..."
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Botón Guardar Cambios */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveWhatsAppConfig}
                      disabled={waSaving}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all"
                    >
                      {waSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{waSaving ? 'Guardando en Servidor...' : 'Guardar Configuración de WhatsApp'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Columna 2: Plantilla de Enlace Mágico, Vista Previa y Simulador */}
              <div className="space-y-6">

                {/* 3. Editor de Plantilla */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>3. Plantilla del Enlace Mágico</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Variables: <code className="text-emerald-400 font-bold">{`{MAGIC_LINK}`}</code>, <code className="text-emerald-400 font-bold">{`{CODE}`}</code>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={waConfig.messageTemplate}
                      onChange={(e) => setWaConfig({ ...waConfig, messageTemplate: e.target.value })}
                      placeholder="Escribe el texto que se enviará al conductor..."
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Usa asteriscos para <strong>*negrita*</strong> y guiones para <em>_cursiva_</em> en WhatsApp.</span>
                      <button
                        type="button"
                        onClick={() => setWaConfig({
                          ...waConfig,
                          messageTemplate: '🚗 *Rumbo a tu Destino - Acceso de Conductor*\n\nHola Conductor, aquí tienes tu enlace directo para entrar a tu consola:\n👉 {MAGIC_LINK}\n\n(O tu código de acceso manual: *{CODE}*)\n\nVálido por 15 minutos.'
                        })}
                        className="text-emerald-400 hover:underline cursor-pointer"
                      >
                        Restablecer original
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Vista Previa en Vivo Estilo WhatsApp */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>4. Vista Previa en WhatsApp (Lo que recibe el Conductor)</span>
                  </h3>

                  <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#1f2c34] space-y-2 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center">
                          R
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">{waConfig.adminName || 'Cesar Arias - Rumbo a tu Destino'}</div>
                          <div className="text-[10px] text-emerald-400">+503 {waConfig.adminPhone || '6989-3101'} • Oficial</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">12:30 PM</span>
                    </div>

                    {/* Burbuja de Mensaje */}
                    <div className="max-w-[90%] bg-[#005c4b] text-slate-100 p-3 rounded-2xl rounded-tl-sm text-xs space-y-2 shadow">
                      <p className="whitespace-pre-line text-[11.5px] leading-relaxed">
                        {waConfig.messageTemplate
                          .replace('{MAGIC_LINK}', 'https://demiempresa.online/conductor?magicToken=849201&phone=69893101')
                          .replace('{CODE}', '849201')}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200 font-mono pt-1">
                        <span>12:30 PM</span>
                        <span>✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Laboratorio de Prueba de Envío */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>5. Probador de Envío en Vivo</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        Número de Teléfono a Probar (8 dígitos)
                      </label>
                      <div className="flex gap-2">
                        <div className="flex flex-1 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-emerald-500 overflow-hidden">
                          <span className="px-3 py-2 bg-slate-800 text-slate-300 text-xs font-bold font-mono flex items-center">
                            +503
                          </span>
                          <input
                            type="tel"
                            value={waTestPhone}
                            onChange={(e) => setWaTestPhone(e.target.value)}
                            placeholder="69893101"
                            maxLength={12}
                            className="w-full px-3 py-2 bg-transparent text-white text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleTestWhatsAppSend}
                          disabled={waTestLoading}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all"
                        >
                          {waTestLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Probar Envío</span>
                        </button>
                      </div>
                    </div>

                    {waTestResult && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2 animate-fade-in text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            {waTestResult.message || 'Prueba generada con éxito'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Se generó el enlace directo listo para abrir WhatsApp con el mensaje configurado:
                        </p>
                        <a
                          href={waTestResult.waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer shadow"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Chat en WhatsApp para +503 {waTestResult.testPhone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA E: TELEMETRÍA, RETENCIÓN & HORAS PICO */}
        {/* ================================================================== */}
        {activeTab === 'TELEMETRY' && (
          <div className="space-y-6 animate-fade-in">
            {/* Cabecera del Centro de Telemetría */}
            <div className="p-5 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-xl shadow">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white">
                      Centro de Telemetría, Permanencia & Sensor Anti-Abandono
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider">
                      EN VIVO 24/7
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Monitoreo en vivo de visitantes únicos, tiempo de lectura, horas pico de conexión (El Salvador UTC-6) y efectividad del gancho de $50 en viajes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExitModalPreview(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer transition-transform active:scale-95"
                >
                  <Gift className="w-4 h-4" />
                  <span>Probar Modal $50 (Exit-Intent)</span>
                </button>
              </div>
            </div>

            {/* Tarjetas KPI de Telemetría */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* KPI 1: Visitantes Únicos */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Visitantes Únicos</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {telemetryStats?.uniqueVisitors ?? 0}
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-bold">{telemetryStats?.passengerVisits ?? 0}</span> Pasajeros • <span className="text-amber-400 font-bold">{telemetryStats?.driverVisits ?? 0}</span> Choferes
                </div>
              </div>

              {/* KPI 2: Tiempo Promedio de Sesión */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Tiempo en Página</span>
                  <Timer className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {telemetryStats?.avgDurationFormatted ?? '0s'}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold">
                  {(telemetryStats?.avgDurationSeconds ?? 0) === 0 ? '⚪ Sin sesiones aún' : ((telemetryStats.avgDurationSeconds >= 40) ? '🟢 Alta Retención' : '🟡 Exploración Rápida')}
                </div>
              </div>

              {/* KPI 3: Tasa de Rebote Real (<10s) */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Tasa de Rebote (&lt;10s)</span>
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {telemetryStats?.bounceRate ?? '0%'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {telemetryStats?.bounceSessions ?? 0} sesiones rápidas
                </div>
              </div>

              {/* KPI 4: Rescates Modal $50 */}
              <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-3xl space-y-1 bg-amber-500/5">
                <div className="flex items-center justify-between text-amber-300 text-xs">
                  <span>Rescates Modal $50</span>
                  <Gift className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {telemetryStats?.exitIntent?.converted ?? 0}
                </div>
                <div className="text-[11px] text-slate-300">
                  De {telemetryStats?.exitIntent?.shown ?? 0} mostrados ({telemetryStats?.exitIntent?.rate ?? '0%'})
                </div>
              </div>

              {/* KPI 5: Dispositivos Móviles */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1 col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Celulares (Móvil)</span>
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {telemetryStats?.deviceBreakdown?.mobilePercent ?? 0}%
                </div>
                <div className="text-[11px] text-slate-400">
                  {telemetryStats?.deviceBreakdown?.mobile ?? 0} Móvil • {telemetryStats?.deviceBreakdown?.desktop ?? 0} PC
                </div>
              </div>
            </div>

            {/* Gráfica de 24 Horas: Horas Pico de Conexión en El Salvador */}
            <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span>Curva de 24 Horas: Horas Pico de Mayor Tráfico en El Salvador</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribución de visitas por hora del día (Zona Horaria El Salvador UTC-6). Úsalo para planificar envíos de WhatsApp cuando haya más gente conectada.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  Zona: GMT-6 (El Salvador)
                </span>
              </div>

              {/* Barras Visuales de 24 Horas */}
              {(() => {
                const hourly = Array.isArray(telemetryStats?.hourlyDistribution) && telemetryStats.hourlyDistribution.length === 24
                  ? telemetryStats.hourlyDistribution
                  : new Array(24).fill(0);
                const maxVal = Math.max(...hourly, 0);
                const hasTraffic = maxVal > 0;

                return (
                  <div className="space-y-2 pt-2">
                    <div className="h-44 flex items-end gap-1 sm:gap-2 px-1 pt-6 border-b border-slate-800 pb-2">
                      {hourly.map((count, hr) => {
                        const heightPct = hasTraffic ? Math.round((count / maxVal) * 100) : 0;
                        const isPeak = hasTraffic && count === maxVal && count > 0;

                        return (
                          <div key={hr} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                            {/* Tooltip flotante */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-950 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-slate-700 pointer-events-none z-10 whitespace-nowrap shadow">
                              {hr}:00 → {count} visitas
                            </div>

                            <div
                              className={`w-full rounded-t-md transition-all duration-300 ${
                                isPeak
                                  ? 'bg-gradient-to-t from-amber-500 to-yellow-300 shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                                  : count > 0
                                  ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                                  : 'bg-slate-800/40'
                              }`}
                              style={{ height: count > 0 ? `${Math.max(8, heightPct)}%` : '3px' }}
                            />
                            <span className="text-[9px] sm:text-[10px] font-mono text-slate-400">
                              {hr % 3 === 0 ? `${hr}h` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 pt-1 gap-2">
                      {hasTraffic ? (
                        <div className="flex items-center gap-4 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                            <span>Hora Pico Principal ({maxVal} visitas)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                            <span>Tráfico Regular</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          ⚪ Sin visitas registradas aún en las últimas 24 horas. Los picos subirán en vivo con el tráfico.
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        Total Eventos Registrados: <strong className="text-white">{telemetryStats?.totalEvents ?? 0}</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Estrategia de Retención: El Gancho de $50 en Viajes */}
            <div className="p-5 sm:p-6 bg-slate-900 border-2 border-amber-500/30 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
                    🎁
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Estrategia de Retención Activa: Modal Anti-Abandono ($50 en Viajes)
                    </h3>
                    <p className="text-xs text-slate-300">
                      Disparador inteligente en `/viajes` y `/conductor` que intercepta al usuario cuando intenta cerrar la página.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold shrink-0">
                  ACTIVO EN VIVO
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-semibold">1. Detección Inteligente</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Detecta cuando el mouse sube a la pestaña en PC, o tras 25 segundos de lectura sin interactuar en celulares.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-semibold">2. El Gancho Irresistible</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>"🎁 ¡Espera! Puedes ganar más de $50.00 en viajes, te diremos cómo..."</strong> respaldado por el bono $2+$2.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-semibold">3. Tasa de Conversión Actual</span>
                  <p className="text-amber-300 font-mono font-bold text-sm">
                    {telemetryStats?.exitIntent?.rate ?? '0%'} de Éxito
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {telemetryStats?.exitIntent?.converted ?? 0} usuarios rescatados de {telemetryStats?.exitIntent?.shown ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla de Eventos Recientes en Tiempo Real */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Última Actividad y Sesiones Registradas</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Mostrando últimos {telemetryStats?.recentEvents?.length ?? 0} eventos
                </span>
              </div>

              {(!telemetryStats?.recentEvents || telemetryStats.recentEvents.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aún no hay eventos registrados en este momento. La telemetría capturará en vivo la próxima visita.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950/60 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Hora</th>
                        <th className="py-2.5 px-3">Rol</th>
                        <th className="py-2.5 px-3">Evento</th>
                        <th className="py-2.5 px-3">Dispositivo</th>
                        <th className="py-2.5 px-3">Permanencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {(telemetryStats?.recentEvents || []).map((ev, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/40">
                          <td className="py-2.5 px-3 text-slate-400">
                            {ev?.createdAt ? new Date(ev.createdAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Reciente'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ev?.role === 'DRIVER' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {ev?.role === 'DRIVER' ? 'CONDUCTOR' : 'PASAJERO'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {ev?.eventType || 'VISIT'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {ev?.device || 'MÓVIL'}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">
                            {(ev?.duration ?? 0) > 0 ? `${ev.duration}s` : '0s'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ================================================================== */}
      {/* MODAL QR: VINCULACIÓN PUENTE WHATSAPP WEB */}
      {/* ================================================================== */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4 my-auto text-center">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-white">Vincular Dispositivo WhatsApp Web</h3>
              <p className="text-xs text-slate-400">
                Abre WhatsApp en tu teléfono celular, ve a Dispositivos Vinculados y escanea este código QR para sincronizar el puente emisor.
              </p>
            </div>

            {/* Código QR Ilustrativo */}
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://demiempresa.online/whatsapp-bridge-pair?admin=69893101')}`}
                alt="Código QR WhatsApp"
                className="w-48 h-48 block mx-auto"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Estado de Conexión:</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Número Administrador: <strong className="text-white">+503 {waConfig.adminPhone}</strong>
              </p>
              <p className="text-slate-400 text-[10px]">
                Sesión lista para emitir credenciales automáticas a conductores.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowQrModal(false);
                alert('¡Dispositivo WhatsApp verificado y listo!');
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Confirmar Dispositivo Vinculado
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 1: INSPECCIONAR EXPEDIENTE Y AUTORIZAR CONDUCTOR */}
      {/* ================================================================== */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-black text-base text-white">Expediente Digital de Conductor</h3>
                <span className="text-xs text-amber-400 font-mono">DUI: {selectedDriver.dui || 'N/A'} • Placa: {selectedDriver.vehicle_plate}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos Personales y del Vehículo */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">Conductor</span>
                <strong className="text-white text-sm block">{selectedDriver.full_name}</strong>
                <span className="text-slate-300">Teléfono: {selectedDriver.phone}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">Vehículo Registrado</span>
                <strong className="text-amber-300 text-sm block">{selectedDriver.vehicle_brand} {selectedDriver.vehicle_model}</strong>
                <span className="text-slate-300">Placa: {selectedDriver.vehicle_plate} • Color: {selectedDriver.vehicle_color}</span>
              </div>
            </div>

            {/* Galería de Documentos Cargados */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                Documentos Legales y Fotografías Subidas:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {selectedDriver.dui_front_url && (
                  <div
                    onClick={() => setPreviewImage(selectedDriver.dui_front_url)}
                    className="p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-400/50 cursor-pointer text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 block">DUI Frente</span>
                    <img src={selectedDriver.dui_front_url} alt="DUI Frente" className="h-20 w-full object-cover rounded-lg" />
                  </div>
                )}
                {selectedDriver.dui_back_url && (
                  <div
                    onClick={() => setPreviewImage(selectedDriver.dui_back_url)}
                    className="p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-400/50 cursor-pointer text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 block">DUI Reverso</span>
                    <img src={selectedDriver.dui_back_url} alt="DUI Reverso" className="h-20 w-full object-cover rounded-lg" />
                  </div>
                )}
                {selectedDriver.license_front_url && (
                  <div
                    onClick={() => setPreviewImage(selectedDriver.license_front_url)}
                    className="p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-400/50 cursor-pointer text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 block">Licencia Frente</span>
                    <img src={selectedDriver.license_front_url} alt="Licencia Frente" className="h-20 w-full object-cover rounded-lg" />
                  </div>
                )}
                {selectedDriver.circulation_card_url && (
                  <div
                    onClick={() => setPreviewImage(selectedDriver.circulation_card_url)}
                    className="p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-400/50 cursor-pointer text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 block">Tarjeta Circulación</span>
                    <img src={selectedDriver.circulation_card_url} alt="Circulación" className="h-20 w-full object-cover rounded-lg" />
                  </div>
                )}
                {selectedDriver.vehicle_photo_front && (
                  <div
                    onClick={() => setPreviewImage(selectedDriver.vehicle_photo_front)}
                    className="p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-400/50 cursor-pointer text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 block">Foto Vehículo Frente</span>
                    <img src={selectedDriver.vehicle_photo_front} alt="Vehículo Frente" className="h-20 w-full object-cover rounded-lg" />
                  </div>
                )}
                {selectedDriver.vehicle_photo_inside && (
                  <div
                    onClick={() => setPreviewImage(selectedDriver.vehicle_photo_inside)}
                    className="p-2 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-400/50 cursor-pointer text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 block">Interior Vehículo</span>
                    <img src={selectedDriver.vehicle_photo_inside} alt="Interior" className="h-20 w-full object-cover rounded-lg" />
                  </div>
                )}
              </div>
            </div>

            {/* Botones de Decisión Administrativa */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => handleAuthorizeDriver(selectedDriver.id, 'APPROVED')}
                disabled={authActionLoading}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Aprobar y Autorizar Conductor (14 Días Gratis)</span>
              </button>

              <button
                type="button"
                onClick={() => setRejectReasonModal(true)}
                disabled={authActionLoading}
                className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl cursor-pointer"
              >
                Rechazar / Observar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 2: RESPONDER TICKET DE INBOX */}
      {/* ================================================================== */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-300 text-xs px-2 py-0.5 rounded bg-amber-500/20">
                  {selectedTicket.ticket_code}
                </span>
                <span className="font-bold text-white text-sm">{selectedTicket.category}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400 font-semibold">Remitente: {selectedTicket.sender_name} ({selectedTicket.sender_role})</div>
              <div className="text-white font-bold">{selectedTicket.subject}</div>
              <p className="text-slate-300 leading-relaxed pt-1">{selectedTicket.description}</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-300 block">
                Escribir Respuesta Oficial de Administración:
              </label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escribe la respuesta o resolución que verá el usuario en su buzón..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleUpdateTicketStatus(selectedTicket.id || selectedTicket.ticket_code, 'RESOLVED')}
                disabled={replyLoading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Check className="w-4 h-4" />
                <span>Enviar Respuesta y Marcar Resuelto</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 3: VISOR DE IMAGEN AMPLIADA (COMPROBANTE O DOCUMENTO) */}
      {/* ================================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl border border-slate-700 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 hover:bg-slate-900 rounded-full text-white cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Visualización Ampliada"
              className="max-h-[85vh] max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Modal de Previsualización Exit-Intent para Administrador */}
      <ExitIntentRescueModal
        isOpenExternal={showExitModalPreview}
        onCloseExternal={() => setShowExitModalPreview(false)}
        role="PASSENGER"
      />

    </div>
  );
}
