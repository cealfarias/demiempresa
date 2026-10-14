import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, Clock, Shield, Search, RefreshCw, Smartphone, Send, Copy, AlertTriangle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://api.demiempresa.online';

export default function AntigravityAdminPage() {
  const [licencias, setLicencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hwid, setHwid] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dias, setDias] = useState('30');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [filtro, setFiltro] = useState('');

  const fetchLicencias = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/antigravity/licencias`);
      const data = await res.json();
      if (data.success) {
        setLicencias(data.licencias);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicencias();
  }, []);

  const handleActivar = async (e) => {
    e.preventDefault();
    if (!pin) {
      setFeedback({ type: 'error', text: 'Debes ingresar tu PIN de seguridad.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/antigravity/activar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hwid,
          cliente_nombre: clienteNombre,
          telefono,
          dias: parseInt(dias),
          pin
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', text: `¡Licencia activada con éxito para ${data.licencia.cliente_nombre}!` });
        setHwid('');
        setClienteNombre('');
        setTelefono('');
        setPin('');
        fetchLicencias();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Error al activar' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = licencias.filter(l => 
    (l.hwid && l.hwid.toLowerCase().includes(filtro.toLowerCase())) ||
    (l.cliente_nombre && l.cliente_nombre.toLowerCase().includes(filtro.toLowerCase())) ||
    (l.telefono && l.telefono.includes(filtro))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Encabezado */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Panel de Licencias Antigravity
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  demiempresa.online
                </span>
              </h1>
              <p className="text-xs text-slate-400">Activación remota en tiempo real • Davivienda 365</p>
            </div>
          </div>

          <button onClick={fetchLicencias} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </header>

        {/* Alerta de feedback */}
        {feedback && (
          <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {feedback.text}
          </div>
        )}

        {/* Formulario de Activación */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
            <Key className="w-4 h-4" /> Activar Licencia por Davivienda 365
          </h2>

          <form onSubmit={handleActivar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">HWID del Cliente *</label>
              <input
                type="text"
                required
                value={hwid}
                onChange={(e) => setHwid(e.target.value.toUpperCase())}
                placeholder="AGY-1DF4-0875-FCF2"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-indigo-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cliente / Taller</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej. Taller Santa Tecla"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 7000-0000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Pagado</label>
              <select
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="30">Mensual (30 Días) - $24.99</option>
                <option value="7">Semanal (7 Días) - $9.99</option>
                <option value="365">Anual (365 Días) - $149.00</option>
                <option value="36500">Vitalicia Permanente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">PIN Secreto *</label>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN (6957)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Activando...' : 'Habilitar Licencia'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Listado de Licencias */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Licencias en la Base de Datos ({filtered.length})
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por HWID o Cliente..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">HWID / Equipo</th>
                    <th className="py-3 px-4">Cliente / Lead</th>
                    <th className="py-3 px-4">Contacto (Tel / Email)</th>
                    <th className="py-3 px-4 text-center">Tipo / Plan</th>
                    <th className="py-3 px-4 text-center">Publicidad</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Vencimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        No se encontraron licencias ni registros.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((lic) => {
                      const isActive = lic.estado === 'ACTIVA';
                      const exp = lic.fecha_expiracion ? new Date(lic.fecha_expiracion).toLocaleDateString() : 'Sin activar';
                      const isTrial = lic.es_prueba_gratis || lic.metodo_pago === 'PRUEBA_GRATIS_24H';
                      return (
                        <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-300">{lic.hwid}</td>
                          <td className="py-3 px-4 text-slate-200 font-semibold">{lic.cliente_nombre || 'Sin nombre'}</td>
                          <td className="py-3 px-4">
                            <div className="text-white">{lic.telefono || '-'}</div>
                            {lic.email && <div className="text-[10px] text-cyan-400 font-mono">{lic.email}</div>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isTrial ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                🎁 Prueba 24H
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ⭐ Comercial ({lic.dias_validez || 30}d)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {lic.acepta_publicidad !== false ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Aceptado ✔
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">No</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {lic.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">{exp}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
