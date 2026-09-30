import React, { useState } from 'react';
import { X, Send, CheckCircle2, Megaphone, Video, Layers, Sparkles } from 'lucide-react';

export default function AdModal({ isOpen, onClose }) {
  const [businessName, setBusinessName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [municipality, setMunicipality] = useState('San Salvador');
  const [submitted, setSubmitted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('IMPACTO');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!businessName || !whatsapp) return;
    setSubmitted(true);
  };

  const resetForm = () => {
    setSubmitted(false);
    setBusinessName('');
    setWhatsapp('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-100">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-amber-600/20 to-orange-600/20">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">¿Tienes un negocio? Anúnciate aquí</h3>
          </div>
          <button onClick={resetForm} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-300">
                Llega a cientos de pasajeros que viajan directamente hacia tu municipio con la atención 100% enfocada en sus pantallas.
              </p>

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
                    Municipio de Cobertura
                  </label>
                  <select
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm"
                  >
                    <option value="San Salvador">San Salvador</option>
                    <option value="Soyapango">Soyapango</option>
                    <option value="Santa Tecla">Santa Tecla</option>
                    <option value="Mejicanos">Mejicanos</option>
                    <option value="Apopa">Apopa</option>
                    <option value="Ilopango">Ilopango</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="Santa Ana">Santa Ana</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Ver Matriz de Tarifas y Enviar Datos</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  ¡Datos registrados para <strong>{businessName}</strong>! Te contactaremos al WhatsApp <strong>{whatsapp}</strong>.
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
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedPlan === 'VITRINA'
                        ? 'bg-amber-500/10 border-amber-400'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 text-amber-300 font-bold text-sm">
                      <Megaphone className="w-4 h-4" />
                      <span>Plan Vitrina</span>
                    </div>
                    <div className="text-lg font-black text-white mb-1">
                      $7.50 <span className="text-xs font-normal text-slate-400">/sem</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">o $25.00 USD/mes</div>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• Banner estático geolocalizado</li>
                      <li>• Botón directo a WhatsApp</li>
                      <li>• Diseño exprés incluido</li>
                    </ul>
                  </div>

                  {/* Plan Impacto */}
                  <div
                    onClick={() => setSelectedPlan('IMPACTO')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                      selectedPlan === 'IMPACTO'
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Más Popular
                    </span>
                    <div className="flex items-center gap-2 mb-1.5 text-amber-300 font-bold text-sm">
                      <Video className="w-4 h-4" />
                      <span>Plan Impacto</span>
                    </div>
                    <div className="text-lg font-black text-white mb-1">
                      $12.50 <span className="text-xs font-normal text-slate-400">/sem</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">o $45.00 USD/mes</div>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• Video Reel vertical 10-15s</li>
                      <li>• Reproducción en trayecto</li>
                      <li>• Guión y edición asistida por IA</li>
                    </ul>
                  </div>

                  {/* Combo Full */}
                  <div
                    onClick={() => setSelectedPlan('COMBO_FULL')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedPlan === 'COMBO_FULL'
                        ? 'bg-amber-500/10 border-amber-400'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 text-amber-300 font-bold text-sm">
                      <Layers className="w-4 h-4" />
                      <span>Combo Full</span>
                    </div>
                    <div className="text-lg font-black text-white mb-1">
                      $17.50 <span className="text-xs font-normal text-slate-400">/sem</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">o $60.00 USD/mes</div>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• Video Reel + Banner</li>
                      <li>• Red de envíos con choferes a 1km</li>
                      <li>• Máxima visibilidad</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Fábrica Exprés de Creatividades */}
              <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs space-y-1 text-slate-300">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fábrica Exprés de Creatividades Sin Costo Adicional:</span>
                </div>
                <p>
                  No necesitas pagar diseñadores caros. Solo envíanos 2 a 3 fotos de tu negocio o producto tomadas con tu celular a nuestro WhatsApp oficial y nuestro equipo adapta tus plantillas y videos cortos de 10-15 segundos.
                </p>
              </div>

              <a
                href={`https://wa.me/50370000000?text=Hola,%20registré%20mi%20negocio%20${encodeURIComponent(businessName)}%20en%20demiempresa.online.%20Me%20interesa%20el%20plan%20${selectedPlan}.`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
              >
                <span>Confirmar Plan por WhatsApp Ahora</span>
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
