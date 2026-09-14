import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { X, User, Phone, Lock, Store, Bike, ArrowRight, CheckCircle2 } from 'lucide-react';

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
    // Simulated Google OAuth login
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-lg font-black text-zinc-100">
              {tab === 'login' ? '¡Sesión Iniciada!' : '¡Cuenta Creada con Éxito!'}
            </h3>
            <p className="text-xs text-zinc-400">Accediendo a la plataforma del Mercado San Miguelito...</p>
          </div>
        ) : (
          <>
            <div className="flex border-b border-zinc-800 pb-3 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setTab('login')}
                  className={`text-sm font-bold pb-1 border-b-2 transition-all ${
                    tab === 'login'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => setTab('register')}
                  className={`text-sm font-bold pb-1 border-b-2 transition-all ${
                    tab === 'register'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                JWT / Google OAuth
              </span>
            </div>

            {/* Google OAuth Login Button */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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

            <div className="relative text-center my-2">
              <span className="bg-zinc-900 px-2 text-[10px] text-zinc-500 uppercase">o con tu correo y contraseña</span>
              <div className="absolute inset-0 top-1/2 -z-10 border-t border-zinc-800" />
            </div>

            {/* Role Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Rol de Usuario:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRoleSelection('cliente')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                    roleSelection === 'cliente'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <User className="w-4 h-4" /> Cliente
                </button>

                <button
                  type="button"
                  onClick={() => setRoleSelection('repartidor')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                    roleSelection === 'repartidor'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Bike className="w-4 h-4" /> Repartidor
                </button>

                <button
                  type="button"
                  onClick={() => setRoleSelection('comerciante')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                    roleSelection === 'comerciante'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Store className="w-4 h-4" /> Puesto Mercado
                </button>
              </div>
            </div>

            {/* LOGIN FORM */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@ejemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-amber-500 text-zinc-950 font-black text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Carlos Morales"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="ej. correo@mail.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Teléfono</label>
                    <input
                      type="tel"
                      required
                      placeholder="ej. 7700-8899"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {roleSelection === 'repartidor' && (
                  <div className="space-y-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400">Tipo de Transporte</label>
                      <select
                        value={form.tipoTransporte}
                        onChange={(e) => setForm({ ...form, tipoTransporte: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100"
                      >
                        <option value="apie">A Pie (Runner Mercado)</option>
                        <option value="bicicleta">Bicicleta</option>
                        <option value="moto">Motocicleta</option>
                        <option value="carro">Automóvil / Carro</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Vehículo (ej. Honda 150)"
                        value={form.vehiculo}
                        onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
                      />
                      <input
                        type="text"
                        placeholder="Placa (ej. M-123456)"
                        value={form.placa}
                        onChange={(e) => setForm({ ...form, placa: e.target.value })}
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-amber-500 text-zinc-950 font-black text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Crear Cuenta</span>
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
