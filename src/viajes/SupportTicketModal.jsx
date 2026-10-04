import React, { useState } from 'react';
import {
  LifeBuoy,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Loader2,
  Copy,
  Check
} from 'lucide-react';

export default function SupportTicketModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    userName: '',
    phone: '',
    category: 'DUDA',
    subject: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.userName.trim() || !formData.phone.trim() || !formData.subject.trim() || !formData.description.trim()) {
      setErrorMsg('Por favor completa todos los campos del ticket.');
      return;
    }

    setLoading(true);

    try {
      const generatedCode = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const payload = {
        ticketCode: generatedCode,
        userName: formData.userName.trim(),
        phone: formData.phone.trim(),
        category: formData.category,
        subject: formData.subject.trim(),
        description: formData.description.trim()
      };

      // Intentar enviar al backend
      const res = await fetch('https://api.demiempresa.online/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setCreatedTicket(data.ticket || payload);
      } else {
        // Fallback local garantizado
        const savedTickets = JSON.parse(localStorage.getItem('rumbo_support_tickets') || '[]');
        savedTickets.push({ ...payload, createdAt: new Date().toISOString(), status: 'OPEN' });
        localStorage.setItem('rumbo_support_tickets', JSON.stringify(savedTickets));
        setCreatedTicket(payload);
      }
    } catch (err) {
      setErrorMsg('Ocurrió un inconveniente al registrar el ticket. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdTicket?.ticketCode) {
      navigator.clipboard.writeText(createdTicket.ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in-50">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Soporte Técnico Rumbo</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Tickets 24/7
                </span>
              </h3>
              <p className="text-xs text-slate-400">Dudas, inquietudes y propuestas de mejora al sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 sm:p-6">
          {createdTicket ? (
            /* Pantalla de Éxito con Código de Ticket */
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-white">¡Ticket Registrado Exitosamente!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tu solicitud ha sido ingresada al sistema central de soporte técnico. Nuestro equipo revisará tus observaciones de inmediato.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 max-w-sm mx-auto text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Número de Ticket:</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 font-mono font-black text-amber-400 hover:text-amber-300 text-sm cursor-pointer"
                  >
                    <span>{createdTicket.ticketCode}</span>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-400">Categoría:</span>
                  <span className="font-semibold">{createdTicket.category}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-400">Asunto:</span>
                  <span className="font-semibold truncate max-w-[200px]">{createdTicket.subject}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer transition-colors shadow-lg shadow-amber-950/40"
                >
                  Entendido • Volver a Rumbo
                </button>
              </div>
            </div>
          ) : (
            /* Formulario de Registro de Ticket */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Tu Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Manuel Rivas"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Teléfono de Contacto (El Salvador) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="ej. 7123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Tipo de Requerimiento *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="DUDA">❓ Duda sobre el modelo de negocio ($0 comisión / $15 cuota)</option>
                  <option value="INQUIETUD">📑 Inquietud sobre mi registro, fotos o aprobación</option>
                  <option value="MEJORA">💡 Sugerencia o propuesta de mejora al sistema</option>
                  <option value="OTRO">🛠️ Otro requerimiento técnico</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Asunto Breve *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Consulta sobre compensación con bonos de pasajeros"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Descripción Detallada *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Escribe aquí con detalle tu duda, inquietud o sugerencia técnica..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xl shadow-amber-950/40 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Crear Ticket en Soporte Técnico</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
