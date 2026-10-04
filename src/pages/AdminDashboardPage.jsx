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
  Filter
} from 'lucide-react';
import RumboLogo from '../viajes/RumboLogo';
import {
  loginAdminGoogleApi,
  fetchAdminStatsApi,
  fetchAdminDriversApi,
  updateDriverAuthorizationApi,
  fetchInboxTicketsApi,
  updateInboxTicketStatusApi
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

  const [loginEmail, setLoginEmail] = useState('cealfarias@gmail.com');
  const [loginPin, setLoginPin] = useState('');
  const [loginStep, setLoginStep] = useState(1); // 1: Google Account Check, 2: 2FA PIN
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Navegación de Pestañas del Panel
  const [activeTab, setActiveTab] = useState('STATS'); // 'STATS' | 'DRIVERS' | 'INBOX'

  // Datos del Dashboard
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

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

  // Cargar datos cuando está autenticado
  useEffect(() => {
    if (adminSession) {
      loadDashboardData();
    }
  }, [adminSession]);

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      const [statsData, driversData, ticketsData] = await Promise.all([
        fetchAdminStatsApi(),
        fetchAdminDriversApi(),
        fetchInboxTicketsApi()
      ]);
      setStats(statsData);
      setDrivers(driversData || []);
      setTickets(ticketsData || []);
    } catch (err) {
      console.warn('Error loading admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Manejo de Inicio de Sesión Doble Factor
  const handleProceedToPin = (e) => {
    e.preventDefault();
    setLoginError('');
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (cleanEmail !== 'cealfarias@gmail.com') {
      setLoginError('ACCESO DENEGADO: Esta terminal administrativa es de acceso exclusivo para la cuenta cealfarias@gmail.com.');
      return;
    }
    setLoginStep(2);
  };

  const handleVerify2FAPin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await loginAdminGoogleApi({
        email: loginEmail.trim().toLowerCase(),
        pinCode: loginPin.trim()
      });

      if (res && res.success) {
        setAdminSession(res.admin);
        localStorage.setItem('rumbo_admin_session', JSON.stringify(res.admin));
      } else {
        throw new Error(res?.error || 'PIN de seguridad de 2do factor incorrecto.');
      }
    } catch (err) {
      setLoginError(err.message || 'Error en la verificación de seguridad.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminSession(null);
    localStorage.removeItem('rumbo_admin_session');
    setLoginStep(1);
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
  // PANTALLA 1: ACCESO ADMINISTRATIVO RESTRINGIDO (cealfarias@gmail.com + 2FA)
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

          {/* PASO 1: Validación de Cuenta Google Autorizada */}
          {loginStep === 1 && (
            <form onSubmit={handleProceedToPin} className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Acceso Exclusivo por Cuenta Google</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Solo la cuenta maestra autorizada por el servidor (<strong className="text-amber-300">cealfarias@gmail.com</strong>) cuenta con permisos para operar esta terminal.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Correo Electrónico de Administrador:
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    placeholder="cealfarias@gmail.com"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                  <div className="absolute right-3 top-3 text-[10px] text-emerald-400 font-bold font-mono">
                    AUTORIZADO
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
              >
                <span>Continuar al Segundo Factor (2FA)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* PASO 2: Segundo Factor de Seguridad (PIN de Seguridad) */}
          {loginStep === 2 && (
            <form onSubmit={handleVerify2FAPin} className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Cuenta Verificada:</span>
                  <strong className="text-amber-300 font-mono">{loginEmail}</strong>
                </div>
                <div className="flex items-center gap-2 text-slate-300 font-bold pt-1">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Doble Seguridad: Ingresa tu PIN de Autorización</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  PIN Maestro de Seguridad (6 Dígitos):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  required
                  autoFocus
                  placeholder="••••••"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-mono text-center tracking-widest text-lg font-black focus:border-amber-400 focus:outline-none"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLoginStep(1)}
                  className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {loginLoading ? (
                    <span>Validando 2FA...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Desbloquear Terminal de Control</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

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
              Operador: <span className="text-amber-300 font-bold">{adminSession.email}</span>
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
      </nav>

      {/* 3. CONTENEDOR DE PESTAÑAS */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* ================================================================== */}
        {/* PESTAÑA A: ESTADÍSTICAS & KPIS EN TIEMPO REAL */}
        {/* ================================================================== */}
        {activeTab === 'STATS' && (
          <div className="space-y-6 animate-fade-in">
            {/* Grid de Métricas Clave */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Pasajeros Registrados</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats?.totalPassengers || 48}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold">
                  +12 esta semana
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Conductores Activos</span>
                  <Car className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {stats?.approvedDrivers || 12}
                </div>
                <div className="text-[11px] text-slate-400">
                  {stats?.pendingDrivers || 4} pendientes de aprobar
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Viajes Completados</span>
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats?.completedTrips || 154}
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
                  {stats?.pendingTicketsCount || tickets.filter(t => t.status === 'PENDING').length}
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
                  Los conductores pagan <strong>$10.00 semanales</strong> o <strong>$3.00 diarios</strong> mediante bonos o transferencias por Transfer365 Móvil Davivienda al 69893101 y Cubo Pago.
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
          </div>
        )}

        {/* ================================================================== */}
        {/* PESTAÑA B: AUTORIZACIÓN DE CONDUCTORES */}
        {/* ================================================================== */}
        {activeTab === 'DRIVERS' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">
                  Expedientes de Conductores para Autorización
                </h2>
                <p className="text-xs text-slate-400">
                  Revisa DUI, Licencia, antecedentes y fotos del auto para habilitar al conductor en la app.
                </p>
              </div>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                Total: {drivers.length} Conductores
              </span>
            </div>

            {/* Lista de Conductores */}
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

      </main>

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

    </div>
  );
}
