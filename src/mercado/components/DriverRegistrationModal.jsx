import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { TIPOS_TRANSPORTE } from '../data/mockData';
import { X, Bike, Car, Footprints, CheckCircle2, UserPlus, ShieldCheck } from 'lucide-react';

export default function DriverRegistrationModal({ isOpen, onClose }) {
  const { registrarRepartidor } = useMercado();

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    tipoTransporte: 'moto',
    vehiculo: '',
    placa: '',
  });

  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const vehiculoDetalle =
      form.tipoTransporte === 'apie'
        ? 'Runner Interno Mercado (A pie)'
        : `${form.vehiculo || 'Vehículo particular'} ${form.placa ? `- Placa ${form.placa}` : ''}`;

    registrarRepartidor({
      nombre: form.nombre,
      telefono: form.telefono,
      tipoTransporte: form.tipoTransporte,
      vehiculo: vehiculoDetalle,
    });

    setSubmitted(true);
  };

  const getTransportIcon = (id) => {
    if (id === 'apie') return <Footprints className="w-4 h-4 text-emerald-400" />;
    if (id === 'bicicleta') return <Bike className="w-4 h-4 text-orange-400" />;
    if (id === 'moto') return <Bike className="w-4 h-4 text-cyan-400" />;
    return <Car className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#131B29] border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-100">¡Registro Exitoso!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Te has registrado correctamente en el equipo de despacho del Mercado San Miguelito.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 font-black text-xs px-5 py-2 rounded-xl hover:brightness-110 transition-all shadow-glow-emerald"
            >
              Entendido / Ir al Panel
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-100">Registro de Conductor / Repartidor</h3>
                <p className="text-[11px] text-slate-400">Únete a la red de despacho del Mercado San Miguelito</p>
              </div>
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-0.5">
                <label className="text-[11px] font-bold text-slate-300">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Carlos Mendoza"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[11px] font-bold text-slate-300">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  placeholder="ej. 7890-1234"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Vehicle Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tipo de Transporte / Medios de Despacho
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TIPOS_TRANSPORTE.map((t) => (
                  <label
                    key={t.id}
                    onClick={() => setForm({ ...form, tipoTransporte: t.id })}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2 ${
                      form.tipoTransporte === t.id
                        ? 'bg-cyan-500/15 border-cyan-500 text-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transporte"
                      checked={form.tipoTransporte === t.id}
                      onChange={() => setForm({ ...form, tipoTransporte: t.id })}
                      className="mt-0.5 accent-cyan-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100">
                        {getTransportIcon(t.id)}
                        <span>{t.label}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Vehicle Details (If not 'apie') */}
            {form.tipoTransporte !== 'apie' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-300">Marca y Modelo</label>
                  <input
                    type="text"
                    placeholder="Honda Cargo 150"
                    value={form.vehiculo}
                    onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-300">Placa</label>
                  <input
                    type="text"
                    placeholder="M-123456"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-slate-100 font-black text-xs rounded-xl hover:brightness-110 transition-all shadow-md"
            >
              Completar Registro de Transporte
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
