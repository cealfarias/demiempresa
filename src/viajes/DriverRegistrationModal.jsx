import React, { useState, useEffect } from 'react';
import {
  Car,
  User,
  Shield,
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Phone,
  Camera,
  X,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Fuel,
  Info,
  ExternalLink,
  MessageCircle,
  Check
} from 'lucide-react';
import { registerDriverApi, fetchDriverStatusApi } from './api';

export default function DriverRegistrationModal({ isOpen, onClose, onDriverRegistered, existingDriverId }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [lookupDui, setLookupDui] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const handleLookupByDui = async () => {
    if (!lookupDui.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);
    try {
      const data = await fetchDriverStatusApi(lookupDui.trim());
      if (data && !data.error && data.id) {
        setSuccessData(data);
        localStorage.setItem('rumbo_driver_profile', JSON.stringify(data));
        if (onDriverRegistered) onDriverRegistered(data);
      } else {
        setLookupError('No se encontró expediente con ese DUI. Puedes iniciar tu registro abajo.');
      }
    } catch {
      setLookupError('No se encontró expediente registrado con ese DUI.');
    } finally {
      setIsLookingUp(false);
    }
  };

  // Form State
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    dui: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    licenseNumber: '',
    vehiclePlate: '',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2018,
    vehicleColor: 'Gris Plata',
    fuelType: 'REGULAR',
    fuelKmPerGallon: 42.0,
    photoUrl: '',
    duiFrontUrl: '',
    duiBackUrl: '',
    licenseFrontUrl: '',
    licenseBackUrl: '',
    circulationCardUrl: '',
    policeRecordUrl: '',
    criminalRecordUrl: '',
    vehiclePhotoFront: '',
    vehiclePhotoInside: '',
    termsAccepted: false
  });

  // Pre-cargar si ya existe un perfil en local o consulta
  useEffect(() => {
    if (existingDriverId) {
      setLoading(true);
      fetchDriverStatusApi(existingDriverId)
        .then((data) => {
          if (data && !data.error) {
            setForm((prev) => ({
              ...prev,
              fullName: data.fullName || '',
              phone: data.phone || '',
              dui: data.dui || '',
              licenseNumber: data.licenseNumber || '',
              vehiclePlate: data.vehiclePlate || '',
              vehicleBrand: data.vehicleBrand || 'Toyota',
              vehicleModel: data.vehicleModel || 'Corolla',
              vehicleYear: data.vehicleYear || 2018,
              vehicleColor: data.vehicleColor || 'Gris Plata',
              photoUrl: data.photoUrl || ''
            }));
            if (data.approvalStatus === 'PENDING' || data.approvalStatus === 'REJECTED' || data.approvalStatus === 'APPROVED') {
              setSuccessData(data);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [existingDriverId]);

  if (!isOpen) return null;

  // Formato automático de DUI: 00000000-0
  const handleDuiChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 9);
    if (val.length > 8) {
      val = `${val.slice(0, 8)}-${val.slice(8)}`;
    }
    setForm({ ...form, dui: val });
  };

  // Formato automático de Placa: P-XXXXXX o A-XXXXXX
  const handlePlateChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    setForm({ ...form, vehiclePlate: val });
  };

  // Conversión de archivo local a base64 / DataURL para previsualización inmediata
  const handleFileUpload = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (!form.fullName.trim()) return 'Ingresa tu nombre completo como aparece en tu DUI.';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 8) return 'Ingresa un número telefónico de El Salvador válido (8 dígitos).';
    if (!/^\d{8}-\d{1}$/.test(form.dui)) return 'El DUI debe tener el formato salvadoreño oficial (ej. 01234567-8).';
    return null;
  };

  const validateStep2 = () => {
    if (!form.licenseNumber.trim()) return 'Ingresa el número de tu licencia de conducir salvadoreña.';
    if (!form.vehiclePlate.trim()) return 'Ingresa el número de placa de tu vehículo (ej. P-123456).';
    if (!form.vehicleBrand.trim() || !form.vehicleModel.trim()) return 'Ingresa la marca y modelo del vehículo.';
    return null;
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.termsAccepted) {
      setErrorMsg('Debes aceptar los términos y condiciones del modelo operativo de Rumbo.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        dui: form.dui.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        licenseNumber: form.licenseNumber.trim().toUpperCase(),
        vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
        vehicleBrand: form.vehicleBrand,
        vehicleModel: form.vehicleModel,
        vehicleYear: parseInt(form.vehicleYear, 10),
        vehicleColor: form.vehicleColor,
        fuelType: form.fuelType,
        fuelKmPerGallon: parseFloat(form.fuelKmPerGallon),
        photoUrl: form.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        duiFrontUrl: form.duiFrontUrl,
        duiBackUrl: form.duiBackUrl,
        licenseFrontUrl: form.licenseFrontUrl,
        licenseBackUrl: form.licenseBackUrl,
        circulationCardUrl: form.circulationCardUrl,
        policeRecordUrl: form.policeRecordUrl,
        criminalRecordUrl: form.criminalRecordUrl,
        vehiclePhotoFront: form.vehiclePhotoFront,
        vehiclePhotoInside: form.vehiclePhotoInside
      };

      const res = await registerDriverApi(payload);
      if (res && res.success) {
        setSuccessData(res.driverProfile || res);
        localStorage.setItem('rumbo_driver_profile', JSON.stringify(res.driverProfile || res));
        if (onDriverRegistered) {
          onDriverRegistered(res.driverProfile || res);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al enviar el expediente de registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pantalla de Estado Post-Envío / Consulta */}
        {successData ? (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg transition-transform">
              {successData.approvalStatus === 'APPROVED' ? (
                <div className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 w-full h-full rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-9 h-9" />
                </div>
              ) : successData.approvalStatus === 'REJECTED' ? (
                <div className="bg-rose-500/20 text-rose-400 border-rose-500/40 w-full h-full rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-9 h-9" />
                </div>
              ) : (
                <div className="bg-amber-500/20 text-amber-400 border-amber-500/40 w-full h-full rounded-2xl flex items-center justify-center">
                  <Clock className="w-9 h-9 animate-pulse" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                successData.approvalStatus === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : successData.approvalStatus === 'REJECTED'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {successData.approvalStatus === 'APPROVED'
                  ? 'Conductor Aprobado'
                  : successData.approvalStatus === 'REJECTED'
                  ? 'Expediente Rechazado / Observado'
                  : 'Expediente en Revisión Administrativa'}
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                {successData.approvalStatus === 'APPROVED'
                  ? `¡Bienvenido, ${successData.fullName}!`
                  : successData.approvalStatus === 'REJECTED'
                  ? 'Tu solicitud requiere correcciones'
                  : 'Tu solicitud ha sido recibida'}
              </h2>

              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {successData.approvalStatus === 'APPROVED'
                  ? 'Tu perfil, documentación y vehículo han sido verificados. Ya puedes encender el radar para recibir carreras en vivo con 100% de ganancia en efectivo.'
                  : successData.approvalStatus === 'REJECTED'
                  ? successData.rejectionReason || 'Uno o más documentos no son legibles o requieren actualización. Revisa y vuelve a enviar.'
                  : 'El equipo administrativo de Rumbo está validando tu DUI, antecedentes policiales y tarjeta de circulación. El tiempo estimado es de 2 a 12 horas.'}
              </p>
            </div>

            {/* Resumen de Datos Registrados */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Conductor</span>
                <span className="font-bold text-slate-200">{successData.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">DUI</span>
                <span className="font-bold text-slate-200">{successData.dui}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Vehículo</span>
                <span className="font-bold text-slate-200">{successData.vehicleBrand} {successData.vehicleModel} ({successData.vehicleYear || '2018'})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Placa</span>
                <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                  {successData.vehiclePlate}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href={`https://wa.me/50369893101?text=Hola,%20acabo%20de%20registrarme%20como%20conductor%20en%20Rumbo.%20Mi%20DUI%20es%20${encodeURIComponent(successData.dui || '')}%20y%20mi%20placa%20es%20${encodeURIComponent(successData.vehiclePlate || '')}.%20Quisiera%20agilizar%20la%20aprobacion.`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-emerald-950/40"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Agilizar por WhatsApp (Soporte Oficial)</span>
              </a>

              {successData.approvalStatus === 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setStep(1);
                  }}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
                >
                  Corregir y Reenviar
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        ) : (
          /* Formulario Paso a Paso */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header del Formulario */}
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Registro de Conductor • Rumbo</h2>
                  <p className="text-xs text-slate-400">100% Efectivo para ti • Cuota semanal de $10 USD con saldo bonificado</p>
                </div>
              </div>

              {/* Indicador de Pasos */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { num: 1, label: 'Identidad' },
                  { num: 2, label: 'Vehículo' },
                  { num: 3, label: 'Documentos' },
                  { num: 4, label: 'Términos' }
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`h-1.5 rounded-full transition-all ${
                      step >= s.num ? 'bg-amber-400' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PASO 1: DATOS PERSONALES E IDENTIDAD */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Consulta Rápida por DUI */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">¿Ya te habías registrado anteriormente?</span>
                    <span className="text-amber-400 font-semibold">Acceso rápido</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ingresa tu DUI (00000000-0)"
                      value={lookupDui}
                      onChange={(e) => setLookupDui(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleLookupByDui}
                      disabled={isLookingUp}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isLookingUp ? 'Buscando...' : 'Consultar'}
                    </button>
                  </div>
                  {lookupError && <p className="text-[10px] text-rose-400 font-medium">{lookupError}</p>}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider pt-1">
                  <User className="w-4 h-4" />
                  <span>Paso 1: Datos Personales del Conductor</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Nombre Completo (como en DUI) *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Carlos Eduardo Alfaro"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Teléfono WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="ej. 7890-1234"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Número de DUI (El Salvador) *</label>
                    <input
                      type="text"
                      required
                      placeholder="00000000-0"
                      maxLength={10}
                      value={form.dui}
                      onChange={handleDuiChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Foto de Perfil (Selfie de seguridad)</label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-amber-400 rounded-xl px-3 py-2 text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>{form.photoUrl ? 'Cambiar foto' : 'Subir o tomar selfie'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload('photoUrl', e)}
                        />
                      </label>
                      {form.photoUrl && (
                        <img
                          src={form.photoUrl}
                          alt="Selfie"
                          className="w-9 h-9 rounded-xl object-cover border border-amber-400/40"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Contacto de Emergencia (Opcional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre del familiar / contacto"
                      value={form.emergencyContactName}
                      onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono de emergencia"
                      value={form.emergencyContactPhone}
                      onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PASO 2: LICENCIA Y VEHÍCULO */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Car className="w-4 h-4" />
                  <span>Paso 2: Licencia & Datos del Vehículo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Número de Licencia de Conducir *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. 0123-120590-101-2"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Número de Placa Oficial *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. P-584-912 o P-123456"
                      value={form.vehiclePlate}
                      onChange={handlePlateChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-black tracking-wider font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Marca del Vehículo *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Toyota, Nissan, Hyundai, Kia"
                      value={form.vehicleBrand}
                      onChange={(e) => setForm({ ...form, vehicleBrand: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Modelo *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Corolla, Sentra, Accent, Rio"
                      value={form.vehicleModel}
                      onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Año de Fabricación *</label>
                    <select
                      value={form.vehicleYear}
                      onChange={(e) => setForm({ ...form, vehicleYear: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 transition-colors"
                    >
                      {Array.from({ length: 15 }, (_, i) => 2026 - i).map((yr) => (
                        <option key={yr} value={yr}>
                          Año {yr} {yr >= 2018 ? '✨ (Óptimo)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Color del Vehículo *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Gris Plata, Blanco, Negro, Azul"
                      value={form.vehicleColor}
                      onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Tipo de Combustible</label>
                    <select
                      value={form.fuelType}
                      onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                    >
                      <option value="REGULAR">Gasolina Regular</option>
                      <option value="ESPECIAL">Gasolina Especial (Super)</option>
                      <option value="DIESEL">Diésel</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Rendimiento (km/galón aprox)</label>
                    <input
                      type="number"
                      value={form.fuelKmPerGallon}
                      onChange={(e) => setForm({ ...form, fuelKmPerGallon: parseFloat(e.target.value) || 40 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: DOCUMENTACIÓN Y FOTOS DE RESPALDO */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Paso 3: Expediente Digital (Fotos de Documentos)</span>
                </div>

                <p className="text-xs text-slate-400">
                  Sube fotos nítidas de tus documentos salvadoreños para verificación en el registro oficial.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* DUI Frente */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">DUI (Frente)</span>
                      {form.duiFrontUrl && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <label className="cursor-pointer bg-slate-950 hover:bg-slate-800/80 border border-dashed border-slate-700 rounded-xl p-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{form.duiFrontUrl ? 'Cambiar archivo' : 'Subir foto'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('duiFrontUrl', e)} />
                    </label>
                  </div>

                  {/* DUI Reverso */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">DUI (Reverso)</span>
                      {form.duiBackUrl && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <label className="cursor-pointer bg-slate-950 hover:bg-slate-800/80 border border-dashed border-slate-700 rounded-xl p-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{form.duiBackUrl ? 'Cambiar archivo' : 'Subir foto'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('duiBackUrl', e)} />
                    </label>
                  </div>

                  {/* Licencia de Conducir Frente */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Licencia (Frente)</span>
                      {form.licenseFrontUrl && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <label className="cursor-pointer bg-slate-950 hover:bg-slate-800/80 border border-dashed border-slate-700 rounded-xl p-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{form.licenseFrontUrl ? 'Cambiar archivo' : 'Subir foto'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('licenseFrontUrl', e)} />
                    </label>
                  </div>

                  {/* Tarjeta de Circulación SERTRACEN */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Tarjeta de Circulación (SERTRACEN)</span>
                      {form.circulationCardUrl && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <label className="cursor-pointer bg-slate-950 hover:bg-slate-800/80 border border-dashed border-slate-700 rounded-xl p-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{form.circulationCardUrl ? 'Cambiar archivo' : 'Subir foto'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('circulationCardUrl', e)} />
                    </label>
                  </div>

                  {/* Solvencia PNC */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Solvencia PNC (Vigente &lt; 90 días)</span>
                      {form.policeRecordUrl && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <label className="cursor-pointer bg-slate-950 hover:bg-slate-800/80 border border-dashed border-slate-700 rounded-xl p-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{form.policeRecordUrl ? 'Cambiar archivo' : 'Subir foto'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('policeRecordUrl', e)} />
                    </label>
                  </div>

                  {/* Foto Frontal del Vehículo con Placa */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Foto Vehículo (Placa visible)</span>
                      {form.vehiclePhotoFront && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <label className="cursor-pointer bg-slate-950 hover:bg-slate-800/80 border border-dashed border-slate-700 rounded-xl p-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>{form.vehiclePhotoFront ? 'Cambiar foto' : 'Subir foto'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('vehiclePhotoFront', e)} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: MODELO DE NEGOCIO & TÉRMINOS */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  <span>Paso 4: Modelo de Negocio Rumbo & Términos</span>
                </div>

                <div className="space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold border border-emerald-500/30">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">100% Efectivo en tu Mano</h4>
                      <p className="text-slate-400 text-[11px]">
                        Rumbo no descuenta comisiones por viaje (0% comisión). Todo el efectivo cobrado al pasajero es íntegramente tuyo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold border border-amber-500/30">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">Cuota Semanal Fija de $10.00 USD</h4>
                      <p className="text-slate-400 text-[11px]">
                        Pagas solo $10 por semana para operar. Además, cada bono de $1.00 recibido en carreras descuenta $1.00 de tu cuota (10 bonos = cuota en $0.00).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold border border-sky-500/30">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">Cortafuegos y Separación Estricta de Roles</h4>
                      <p className="text-slate-400 text-[11px]">
                        Los conductores no acumulan bonos por invitar amigos ni tienen código de referido. Al aprobarte, tu wallet de chofer iniciará con balance transparente y seguro.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={form.termsAccepted}
                    onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    He leído y acepto el modelo de membresía semanal fija de $10.00 USD y declaro bajo juramento que los documentos y datos de vehículo presentados son verídicos y vigentes en El Salvador.
                  </span>
                </label>
              </div>
            )}

            {/* Controles Inferiores de Navegación */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-950/40"
                >
                  <span>Continuar</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Enviando Expediente...' : 'Enviar Solicitud a Aprobación'}
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
