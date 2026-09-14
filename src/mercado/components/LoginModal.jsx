import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { X, User, Phone, Lock, Store, Bike, ArrowRight, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const { setCurrentRole, registrarRepartidor } = useMercado();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [roleSelection, setRoleSelection] = useState('cliente'); // 'cliente' | 'comerciante' | 'repartidor'

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    password: '',
    puestoNombre: '',
    pasillo: '',
    tipoTransporte: 'moto',
    vehiculo: '',
    placa: ''
  });

  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const userRole = roleSelection === 'comerciante' ? 'admin' : roleSelection;
    setCurrentRole(userRole);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      if (onLoginSuccess) onLoginSuccess(userRole);
    }, 1000);
  };

  const handleGoogleLogin = () => {
    const userRole = roleSelection === 'comerciante' ? 'admin' : roleSelection;
    setCurrentRole(userRole);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      if (onLoginSuccess) onLoginSuccess(userRole);
    }, 1000);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (roleSelection === 'repartidor') {
      registrarRepartidor({
        nombre: form.nombre,
        telefono: form.telefono,
        tipoTransporte: form.tipoTransporte,
        vehiculo: `${form.vehiculo || 'Vehículo particular'} ${form.placa ? `- Placa ${form.placa}` : ''}`
      });
    }

    const userRole = roleSelection === 'comerciante' ? 'admin' : roleSelection;
    setCurrentRole(userRole);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      if (onLoginSuccess) onLoginSuccess(userRole);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#131B29] border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-2.5">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-base font-black text-slate-100">
              {tab === 'login' ? '¡Sesión Iniciada!' : '¡Cuenta Creada!'}
            </h3>
            <p className="text-xs text-slate-400">Accediendo al Mercado San Miguelito...</p>
          </div>
        ) : (
          <>
            {/* Header Tabs */}
            <div className="flex border-b border-slate-800 pb-2.5 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setTab('login')}
                  className={`text-xs font-extrabold pb-1 border-b-2 transition-all ${
                    tab === 'login'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => setTab('register')}
                  className={`text-xs font-extrabold pb-1 border-b-2 transition-all ${
                    tab === 'register'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                OAuth / JWT
              </span>
            </div>

            {/* Google OAuth Login Button */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-100 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9 shadow-none"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="relative text-center my-0.5">
              <span className="bg-[#131B29] px-2 text-[9px] text-slate-500 uppercase font-bold tracking-wider">o con correo</span>
              <div className="absolute inset-0 top-1/2 -z-10 border-t border-slate-800" />
            </div>

            {/* Role Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Selecciona tu Rol:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoleSelection('cliente')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-0.5 ${
                    roleSelection === 'cliente'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Cliente
                </button>

                <button
                  type="button"
                  onClick={() => setRoleSelection('repartidor')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-0.5 ${
                    roleSelection === 'repartidor'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" /> Repartidor
                </button>

                <button
                  type="button"
                  onClick={() => setRoleSelection('comerciante')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-0.5 ${
                    roleSelection === 'comerciante'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" /> Acopio/Puesto
                </button>
              </div>
            </div>

            {/* LOGIN FORM */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-2.5 pt-0.5">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold text-slate-300">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@ejemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold text-slate-300">Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-1.5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-zinc-950 font-black text-xs rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-glow-emerald active:scale-95"
                >
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-2.5 pt-0.5">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold text-slate-300">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Carlos Morales"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-bold text-slate-300">Correo</label>
                    <input
                      type="email"
                      required
                      placeholder="correo@mail.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[11px] font-bold text-slate-300">Teléfono</label>
                    <input
                      type="tel"
                      required
                      placeholder="7700-8899"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold text-slate-300">Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {roleSelection === 'repartidor' && (
                  <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400">Tipo de Transporte</label>
                      <select
                        value={form.tipoTransporte}
                        onChange={(e) => setForm({ ...form, tipoTransporte: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                      >
                        <option value="apie">A Pie (Runner Mercado)</option>
                        <option value="bicicleta">Bicicleta</option>
                        <option value="moto">Motocicleta</option>
                        <option value="carro">Automóvil / Carro</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Vehículo (ej. Moto 150)"
                        value={form.vehiculo}
                        onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        placeholder="Placa (M-123456)"
                        value={form.placa}
                        onChange={(e) => setForm({ ...form, placa: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-1.5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-zinc-950 font-black text-xs rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-glow-emerald active:scale-95"
                >
                  <span>Crear Cuenta Gratis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
