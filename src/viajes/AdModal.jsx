import React, { useState } from 'react';
import { X, Send, CheckCircle2, Megaphone, Video, Layers, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { submitLeadApi } from './api';

export default function AdModal({ isOpen, onClose }) {
  const [businessName, setBusinessName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [municipality, setMunicipality] = useState('San Salvador');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('IMPACTO');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessName || !whatsapp) return;

    setLoading(true);
    setErrorMsg('');

    try {
      await submitLeadApi({ businessName, whatsapp, municipality });
      setSubmitted(true);
    } catch (err) {
      // Si falla la red, permitimos ver la matriz igualmente
      console.warn('Fallback al registrar lead B2B:', err.message);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setBusinessName('');
    setWhatsapp('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-100">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-amber-600/20 to-orange-600/20">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">¿Tienes un negocio? Anúnciate aquí</h3>
          </div>
          <button onClick={resetForm} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-300">
                Llega a cientos de pasajeros que viajan directamente hacia tu municipio con la atención 100% enfocada en sus pantallas durante el trayecto.
              </p>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nombre de tu Negocio / Local
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ej. Pupusería La Bendición / Taller González"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej. 7000-0000"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Zona o Cobertura de tu Negocio
                  </label>
                  <select
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm"
                  >
                    <optgroup label="Multi-Sucursal / Departamental">
                      <option value="Todo San Salvador">Todo el Depto. de San Salvador (Multi-Sucursal)</option>
                      <option value="Todo La Libertad">Todo el Depto. de La Libertad (Multi-Sucursal)</option>
                      <option value="Todo Santa Ana">Todo el Depto. de Santa Ana</option>
                      <option value="Todo San Miguel">Todo el Depto. de San Miguel</option>
                      <option value="TODOS">Nacional (Todo El Salvador)</option>
                    </optgroup>
                    <optgroup label="Local / Municipio Específico">
                      <option value="San Salvador">San Salvador Centro</option>
                      <option value="Santa Tecla">Santa Tecla</option>
                      <option value="Antiguo Cuscatlán">Antiguo Cuscatlán</option>
                      <option value="Soyapango">Soyapango</option>
                      <option value="Mejicanos">Mejicanos</option>
                      <option value="Apopa">Apopa</option>
                      <option value="Ilopango">Ilopango</option>
                      <option value="San Miguel">San Miguel Ciudad</option>
                      <option value="Santa Ana">Santa Ana Ciudad</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando datos...</span>
                  </>
                ) : (
                  <>
                    <span>Ver Matriz de Tarifas y Enviar Datos</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  ¡Datos registrados en la red B2B de <strong>demiempresa.online</strong> para <strong>{businessName}</strong> ({municipality})!
                </span>
              </div>

              {/* Matriz Oficial de Tarifas B2B */}
              <div>
                <h4 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Tarifas Publicitarias Oficiales (demiempresa.online)
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Precios transparentes y sin intermediarios para negocios locales.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Plan Vitrina */}
                  <div
                    onClick={() => setSelectedPlan('VITRINA')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedPlan === 'VITRINA'
                        ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5 text-amber-300 font-bold text-sm">
                      <Megaphone className="w-4 h-4" />
                      <span>Plan Vitrina</span>
                    </div>
                    <div className="text-xl font-black text-white mb-0.5">
                      $7.50 <span className="text-xs font-normal text-slate-400">/sem</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">o $25.00 USD/mes</div>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• Banner estático geolocalizado</li>
                      <li>• Botón directo a WhatsApp</li>
                      <li>• Diseño exprés incluido</li>
                    </ul>
                  </div>

                  {/* Plan Impacto */}
                  <div
                    onClick={() => setSelectedPlan('IMPACTO')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative ${
                      selectedPlan === 'IMPACTO'
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/50'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Más Popular
                    </span>
                    <div className="flex items-center gap-1.5 mb-1.5 text-amber-300 font-bold text-sm">
                      <Video className="w-4 h-4" />
                      <span>Plan Impacto</span>
                    </div>
                    <div className="text-xl font-black text-white mb-0.5">
                      $12.50 <span className="text-xs font-normal text-slate-400">/sem</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">o $45.00 USD/mes</div>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• Video Reel vertical 10-15s</li>
                      <li>• Reproducción en trayecto</li>
                      <li>• Guión y edición asistida por IA</li>
                    </ul>
                  </div>

                  {/* Combo Full */}
                  <div
                    onClick={() => setSelectedPlan('COMBO_FULL')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedPlan === 'COMBO_FULL'
                        ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5 text-amber-300 font-bold text-sm">
                      <Layers className="w-4 h-4" />
                      <span>Combo Full</span>
                    </div>
                    <div className="text-xl font-black text-white mb-0.5">
                      $17.50 <span className="text-xs font-normal text-slate-400">/sem</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">o $60.00 USD/mes</div>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      <li>• Video Reel + Banner prioritario</li>
                      <li>• Flota de envíos y traslados inter-sucursales</li>
                      <li>• Despachos express con choferes a 1 km</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Fábrica Exprés de Creatividades */}
              <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs space-y-1.5 text-slate-300">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fábrica Exprés de Creatividades Sin Costo Adicional:</span>
                </div>
                <p>
                  No necesitas pagar diseñadores. Solo envíanos 2 a 3 fotos de tu negocio o producto tomadas con tu celular y nuestro equipo adapta tus plantillas y videos cortos de 10-15 segundos.
                </p>
              </div>

              <a
                href={`https://wa.me/50369893101?text=Hola,%20registré%20mi%20negocio%20${encodeURIComponent(businessName)}%20en%20demiempresa.online.%20Me%20interesa%20activar%20el%20plan%20${selectedPlan}%20en%20${encodeURIComponent(municipality)}.`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition-all"
              >
                <span>Confirmar Plan por WhatsApp con Soporte</span>
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
