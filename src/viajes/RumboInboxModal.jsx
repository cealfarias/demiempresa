import React, { useState, useEffect, useRef } from 'react';
import {
  Inbox,
  X,
  Send,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lightbulb,
  LifeBuoy,
  CreditCard,
  Building2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  MessageSquare,
  FileText,
  AlertCircle
} from 'lucide-react';
import { createInboxTicketApi, fetchInboxTicketsApi } from './api';

export default function RumboInboxModal({
  isOpen,
  onClose,
  role = 'DRIVER', // 'DRIVER' | 'PASSENGER'
  userProfile = null,
  initialCategory = null,
  prefillPaymentAmount = 10.00
}) {
  const [activeTab, setActiveTab] = useState('COMPOSE'); // 'COMPOSE' | 'HISTORY'
  const [category, setCategory] = useState(initialCategory || (role === 'DRIVER' ? 'PAGOS' : 'SUGERENCIAS'));
  
  // Formulario
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderDui, setSenderDui] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(prefillPaymentAmount || 10.00);
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER365'); // 'TRANSFER365' | 'CUBO'
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  // Estados de proceso
  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Historial de tickets
  const [myTickets, setMyTickets] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);

  // Sincronizar con props cuando se abre
  useEffect(() => {
    if (isOpen) {
      if (initialCategory) {
        setCategory(initialCategory);
      } else {
        setCategory(role === 'DRIVER' ? 'PAGOS' : 'SUGERENCIAS');
      }

      if (prefillPaymentAmount) {
        setPaymentAmount(prefillPaymentAmount);
      }

      if (userProfile) {
        setSenderName(userProfile.fullName || userProfile.name || '');
        setSenderPhone(userProfile.phone || '');
        setSenderDui(userProfile.dui || '');
        setVehiclePlate(userProfile.vehiclePlate || '');
      }
      setSuccessTicket(null);
      setErrorMsg(null);
      loadTicketsHistory();
    }
  }, [isOpen, initialCategory, prefillPaymentAmount, userProfile]);

  const loadTicketsHistory = async () => {
    setLoadingHistory(true);
    try {
      const tickets = await fetchInboxTicketsApi({
        senderRole: role,
        senderDui: userProfile?.dui || '',
        senderPhone: userProfile?.phone || ''
      });
      setMyTickets(tickets || []);
    } catch (e) {
      console.warn('Error loading inbox history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  // Manejo de carga de comprobante o captura
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida (JPG, PNG, WebP) del comprobante de descuento.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!senderName.trim()) {
      setErrorMsg('Por favor indica tu nombre completo.');
      return;
    }

    if (category === 'PAGOS' && !attachmentPreview && !description.trim()) {
      setErrorMsg('Por favor adjunta la captura del comprobante o anota los detalles de tu pago.');
      return;
    }

    if (category !== 'PAGOS' && !description.trim()) {
      setErrorMsg('Por favor describe tu mensaje, sugerencia o queja.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        category,
        senderRole: role,
        senderName: senderName.trim(),
        senderPhone: senderPhone.trim(),
        senderDui: senderDui.trim(),
        vehiclePlate: vehiclePlate.trim(),
        subject: subject.trim() || `${category} - ${senderName.trim()}`,
        description: description.trim(),
        paymentAmount: category === 'PAGOS' ? parseFloat(paymentAmount) : 0,
        paymentMethod: category === 'PAGOS' ? paymentMethod : null,
        attachmentUrl: attachmentPreview || ''
      };

      const res = await createInboxTicketApi(payload);
      if (res && res.success) {
        setSuccessTicket(res.ticket);
        loadTicketsHistory();
        // Reset campos opcionales
        setDescription('');
        setSubject('');
        setAttachmentPreview(null);
      } else {
        throw new Error(res?.error || 'No se pudo enviar el ticket.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al enviar el ticket a la cola de atención.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTicketCode = () => {
    if (successTicket?.ticket_code) {
      navigator.clipboard.writeText(successTicket.ticket_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Temas disponibles según el rol
  const categoryOptions = role === 'DRIVER' ? [
    { id: 'PAGOS', label: '💳 Pagos & Comprobantes', icon: CreditCard, color: 'text-amber-400', border: 'border-amber-500/40' },
    { id: 'SUGERENCIAS', label: '💡 Sugerencias', icon: Lightbulb, color: 'text-emerald-400', border: 'border-emerald-500/40' },
    { id: 'QUEJAS', label: '⚠️ Quejas', icon: AlertTriangle, color: 'text-rose-400', border: 'border-rose-500/40' },
    { id: 'SOPORTE', label: '🛠️ Soporte Técnico', icon: LifeBuoy, color: 'text-sky-400', border: 'border-sky-500/40' }
  ] : [
    { id: 'SUGERENCIAS', label: '💡 Sugerencias', icon: Lightbulb, color: 'text-emerald-400', border: 'border-emerald-500/40' },
    { id: 'QUEJAS', label: '⚠️ Quejas', icon: AlertTriangle, color: 'text-rose-400', border: 'border-rose-500/40' },
    { id: 'SOPORTE', label: '🛠️ Soporte Técnico', icon: LifeBuoy, color: 'text-sky-400', border: 'border-sky-500/40' },
    { id: 'PAGOS', label: '💳 Pagos y Cobros', icon: CreditCard, color: 'text-amber-400', border: 'border-amber-500/40' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 flex flex-col my-auto">
        
        {/* Cabecera con Botón de Atrás e Identificación */}
        <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>Buzón Oficial Rumbo</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {role === 'DRIVER' ? 'CONDUCTOR' : 'PASAJERO'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Atención directa por cola con número de ticket único
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>← Atrás</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selector de Pestañas: Redactar vs Mis Tickets */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 sm:px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('COMPOSE');
              setSuccessTicket(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'COMPOSE'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar Mensaje / Comprobante</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('HISTORY');
              loadTicketsHistory();
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Mis Tickets ({myTickets.length})</span>
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-4 sm:p-6 space-y-4">
          
          {/* PESTAÑA 1: REDACTAR / ENVIAR */}
          {activeTab === 'COMPOSE' && (
            <>
              {/* Pantalla de Éxito al Enviar Ticket */}
              {successTicket ? (
                <div className="space-y-4 text-center py-4 animate-pop-bounce">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      Ticket Registrado en Cola
                    </span>
                    <h4 className="text-lg font-black text-white">
                      ¡Tu solicitud fue enviada exitosamente!
                    </h4>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto">
                      La administración revisará tu comprobante o mensaje a la brevedad. Puedes seguir el avance con tu código.
                    </p>
                  </div>

                  {/* Tarjeta del Código de Ticket */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/40 max-w-sm mx-auto space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      Número de Ticket Oficial
                    </span>
                    <div className="text-2xl font-black text-amber-300 font-mono tracking-wider">
                      {successTicket.ticket_code}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyTicketCode}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
                    </button>
                  </div>

                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('HISTORY')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      Ver Mis Tickets
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      Volver a la App
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Selector de Tema */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      1. Selecciona el Tema de tu Envío:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {categoryOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = category === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setCategory(opt.id)}
                            className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? `bg-slate-950 border-amber-400 ring-2 ring-amber-400/20 shadow-md`
                                : `bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100`
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${opt.color}`} />
                            <span className="text-[11px] font-bold text-white leading-tight">
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CAMPOS ESPECÍFICOS PARA TEMA: PAGOS */}
                  {category === 'PAGOS' && (
                    <div className="p-4 bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wide">
                          Reportar Pago / Notificación de Descuento Bancario
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">
                            Método de Pago Utilizado:
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('TRANSFER365')}
                              className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                                paymentMethod === 'TRANSFER365'
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Transfer365</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('CUBO')}
                              className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                                paymentMethod === 'CUBO'
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Cubo Pago</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">
                            Monto Pagado en Efectivo ($ USD):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="10.00"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Subida del Comprobante Bancario */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                          <span>Captura del Descuento Bancario / Comprobante:</span>
                          <span className="text-[10px] text-amber-400 font-normal">Obligatorio para verificación</span>
                        </label>

                        {attachmentPreview ? (
                          <div className="relative rounded-2xl border border-emerald-500/40 bg-slate-900 p-2 text-center overflow-hidden">
                            <img
                              src={attachmentPreview}
                              alt="Comprobante"
                              className="max-h-48 mx-auto rounded-xl object-contain"
                            />
                            <div className="pt-2 flex items-center justify-between px-2 text-xs">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Imagen cargada</span>
                              </span>
                              <button
                                type="button"
                                onClick={handleRemoveAttachment}
                                className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                              >
                                Cambiar imagen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-2xl p-4 text-center cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition-colors"
                          >
                            <Upload className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                            <div className="text-xs font-bold text-white">
                              Toca aquí para subir foto o captura del comprobante
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Captura de pantalla de la app del banco (Davivienda 69893101) o recibo de Cubo
                            </p>
                          </div>
                        )}

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}

                  {/* DATOS DEL REMITENTE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Tu Nombre Completo:
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        required
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Teléfono / WhatsApp:
                      </label>
                      <input
                        type="tel"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="Ej. 70001234"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {role === 'DRIVER' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Tu DUI:
                        </label>
                        <input
                          type="text"
                          value={senderDui}
                          onChange={(e) => setSenderDui(e.target.value)}
                          placeholder="00000000-0"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Placa de tu Auto:
                        </label>
                        <input
                          type="text"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          placeholder="P 123-456"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase text-xs focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Asunto y Detalle del Mensaje */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Asunto o Referencia:
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={category === 'PAGOS' ? 'Ej. Pago cuota semanal por Transfer365 Davivienda' : 'Ej. Sugerencia de mejora en rutas'}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        {category === 'PAGOS' ? 'Notas del pago o número de referencia bancaria:' : 'Mensaje o Detalle:'}
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={
                          category === 'PAGOS'
                            ? 'Indica aquí el número de confirmación o cualquier detalle de tu transferencia...'
                            : 'Escribe detalladamente tu mensaje para el equipo de Rumbo...'
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Botón de Envío */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Registrando Ticket en la Cola...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-slate-950" />
                          <span>
                            {category === 'PAGOS' ? 'Enviar Comprobante a Cola de Pagos' : 'Enviar Ticket a Cola de Atención'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* PESTAÑA 2: HISTORIAL DE MIS TICKETS */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                  <p className="text-xs">Consultando tus tickets en cola...</p>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No tienes tickets registrados aún</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Cuando envíes comprobantes de pago, sugerencias o dudas, podrás seguir su estado en esta bandeja.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('COMPOSE')}
                    className="mt-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Crear mi primer ticket
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myTickets.map((tkt) => {
                    const isPending = tkt.status === 'PENDING';
                    const isApproved = tkt.status === 'APPROVED' || tkt.status === 'RESOLVED';
                    const isReview = tkt.status === 'IN_REVIEW';

                    return (
                      <div
                        key={tkt.id || tkt.ticket_code}
                        className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-300 text-xs bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              {tkt.ticket_code}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-slate-900 rounded-md">
                              {tkt.category}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isReview
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isApproved ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aprobado / Resuelto</span>
                              </>
                            ) : isReview ? (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>En Revisión</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>En Cola de Espera</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="font-bold text-white text-xs">{tkt.subject}</div>
                          <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                            {tkt.description}
                          </p>
                        </div>

                        {tkt.payment_amount > 0 && (
                          <div className="flex justify-between items-center bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono">
                            <span className="text-slate-400">Monto Reportado:</span>
                            <span className="text-amber-300 font-bold">${parseFloat(tkt.payment_amount).toFixed(2)} USD ({tkt.payment_method})</span>
                          </div>
                        )}

                        {/* Respuesta del Administrador */}
                        {tkt.admin_notes && (
                          <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1 text-[11px]">
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Respuesta de Administración Rumbo:</span>
                            </span>
                            <p className="text-slate-200">{tkt.admin_notes}</p>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 text-right">
                          {new Date(tkt.created_at).toLocaleString('es-SV')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Pie con botón de cerrar / volver al inicio */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>← Atrás</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>🏠 Ir al Inicio</span>
          </button>
        </div>

      </div>
    </div>
  );
}
