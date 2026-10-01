import React, { useState } from 'react';
import {
  X,
  Fuel,
  TrendingDown,
  CheckCircle2,
  Award,
  Sparkles,
  MapPin,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { OFFICIAL_GOV_PRICES, DEFAULT_GAS_STATIONS } from './fuelService';

export default function GasModal({
  isOpen,
  onClose,
  stations = DEFAULT_GAS_STATIONS,
  onPriceReported
}) {
  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id || '');
  const [fuelType, setFuelType] = useState('REGULAR');
  const [reportedPrice, setReportedPrice] = useState('3.75');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Intentar enviar al backend
      const res = await fetch('https://api.demiempresa.online/api/gas/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStationId,
          fuelType,
          reportedPrice: parseFloat(reportedPrice)
        })
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Reporte enviado:', data);
      }
    } catch (err) {
      console.warn('Fallback local para reporte de gasolina:', err);
    } finally {
      setIsSubmitting(false);
      setSuccessMessage(true);
      if (onPriceReported) {
        onPriceReported({
          stationId: selectedStationId,
          fuelType,
          price: parseFloat(reportedPrice)
        });
      }
      setTimeout(() => {
        setSuccessMessage(false);
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <span>Radar de Gasolina El Salvador</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Al Centavo
                </span>
              </h3>
              <p className="text-xs text-slate-400">Precios oficiales DGEHM vs Estaciones más baratas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          
          {/* Tarjeta de Precios Oficiales DGEHM */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Precios Oficiales DGEHM (Zona Central)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Quincena Vigente</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Regular</div>
                <div className="text-sm font-extrabold text-white">${OFFICIAL_GOV_PRICES.regular.toFixed(2)}</div>
              </div>
              <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-rose-400 uppercase font-bold">Especial</div>
                <div className="text-sm font-extrabold text-white">${OFFICIAL_GOV_PRICES.especial.toFixed(2)}</div>
              </div>
              <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-amber-400 uppercase font-bold">Diésel</div>
                <div className="text-sm font-extrabold text-white">${OFFICIAL_GOV_PRICES.diesel.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Formulario de Confirmación / Crowdsourcing por el Conductor */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Confirmar Precio al Recargar</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>Gana Reputación</span>
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Gasolinera donde recargaste:
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.municipality})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tipo de Gasolina:</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="ESPECIAL">Especial</option>
                    <option value="DIESEL">Diésel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Precio por Galón ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="2.50"
                    max="6.00"
                    required
                    value={reportedPrice}
                    onChange={(e) => setReportedPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {successMessage ? (
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>¡Precio confirmado! Gracias por apoyar a los conductores.</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>CONFIRMAR Y ACTUALIZAR PRECIO</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Ranking de Estaciones Más Económicas */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>Estaciones Recomendadas (Mayor Ahorro)</span>
            </h4>

            <div className="space-y-2">
              {stations.map((st) => (
                <div
                  key={st.id}
                  className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-xs">
                      {st.brand}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{st.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{st.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-extrabold text-emerald-400 font-mono">
                      ${st.regular.toFixed(2)}/gal
                    </div>
                    <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      -${st.savingsRegular.toFixed(2)} vs oficial
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
