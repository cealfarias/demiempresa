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
    if (id === 'apie') return <Footprints className="w-5 h-5 text-emerald-400" />;
    if (id === 'bicicleta') return <Bike className="w-5 h-5 text-amber-400" />;
    if (id === 'moto') return <Bike className="w-5 h-5 text-blue-400" />;
    return <Car className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-black text-zinc-100">¡Registro Exitoso como Transportista!</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Te has registrado correctamente en el equipo de despacho del Mercado San Miguelito. Ya puedes recibir rutas según tu tipo de vehículo.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="bg-emerald-500 text-zinc-950 font-extrabold text-xs px-6 py-2.5 rounded-xl hover:bg-emerald-400 transition-all"
            >
              Entendido / Ir al Panel
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-100">Registro de Conductor / Repartidor</h3>
                <p className="text-xs text-zinc-400">Únete a la red de despacho del Mercado San Miguelito</p>
              </div>
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Carlos Mendoza"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  placeholder="ej. 7890-1234"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Vehicle Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                Tipo de Transporte / Medios de Despacho
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TIPOS_TRANSPORTE.map((t) => (
                  <label
                    key={t.id}
                    onClick={() => setForm({ ...form, tipoTransporte: t.id })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      form.tipoTransporte === t.id
                        ? 'bg-blue-500/10 border-blue-500 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transporte"
                      checked={form.tipoTransporte === t.id}
                      onChange={() => setForm({ ...form, tipoTransporte: t.id })}
                      className="mt-1 accent-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-100">
                        {getTransportIcon(t.id)}
                        <span>{t.label}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Vehicle Details (If not 'apie') */}
            {form.tipoTransporte !== 'apie' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300">Marca y Modelo del Vehículo</label>
                  <input
                    type="text"
                    placeholder="ej. Honda Cargo 150 / Nissan March"
                    value={form.vehiculo}
                    onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300">Número de Placa</label>
                  <input
                    type="text"
                    placeholder="ej. M-123456 / P-789012"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-zinc-100 font-extrabold text-xs rounded-xl hover:brightness-110 transition-all shadow-lg"
            >
              Completar Registro de Transporte
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
