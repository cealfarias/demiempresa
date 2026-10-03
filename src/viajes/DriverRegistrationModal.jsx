import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  RotateCw,
  Sparkles,
  Smartphone,
  CreditCard,
  Building,
  CheckCircle2,
  Wind,
  ShieldCheck,
  LifeBuoy,
  Loader2,
  Share2,
  Copy,
  Users,
  HeartHandshake,
  Volume2,
  VolumeX
} from 'lucide-react';
import { registerDriverApi, fetchDriverStatusApi } from './api';
import {
  VEHICLE_BRANDS,
  VEHICLE_MODELS_BY_BRAND,
  VEHICLE_COLORS,
  calculateVehicleFuelEfficiency
} from './vehicleCatalog';
import {
  validateDocumentImage,
  rotateImage90Degrees,
  compressImage
} from './documentValidatorService';
import SupportTicketModal from './SupportTicketModal';
import { requestScreenWakeLock, releaseScreenWakeLock } from './audioWakeLockService';
import { shareToWhatsAppOrNative, copyShareLink, RUMBO_LOGO_URL } from './whatsappShareService';

// Anuncio de voz eufórico de bienvenida al completar el registro
const speakWelcomeMessage = async (driverName) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      await requestScreenWakeLock();
      const text = `¡Felicidades ${driverName || ''}! Bienvenido con euforia a la comunidad de conductores de Rumbo a tu destino. Tu solicitud fue presentada exitosamente. En Rumbo el cien por ciento de la ganancia es dinero en efectivo en tu mano y tu primera semana es totalmente gratis sin comisión.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.onend = () => {
        releaseScreenWakeLock();
      };
      utterance.onerror = () => {
        releaseScreenWakeLock();
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
      releaseScreenWakeLock();
    }
  }
};

// Mensaje institucional con voz de seriedad, alianza y colaboración
const speakInstitutionalMessage = async (onEndCallback) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      await requestScreenWakeLock();
      const text = "Agradecemos sinceramente tu paciencia y tu comprensión, ya que esta aplicación se encuentra en su fase inicial de lanzamiento. Te pedimos de todo corazón tu valiosa colaboración al compartir nuestros enlaces oficiales, tanto con viajeros para aumentar tus solicitudes de viajes, como con otros conductores colegas para hacer más fuerte nuestra red colaborativa. Cuantos más seamos, más nos beneficiaremos todos. Juntos cambiamos tu destino.";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-SV';
      utterance.rate = 0.88; // Tono solemne, reflexivo y serio
      utterance.pitch = 0.92; // Tono grave, formal y de respeto
      utterance.onend = () => {
        releaseScreenWakeLock();
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = () => {
        releaseScreenWakeLock();
        if (onEndCallback) onEndCallback();
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
      releaseScreenWakeLock();
      if (onEndCallback) onEndCallback();
    }
  }
};

export default function DriverRegistrationModal({ isOpen, onClose, onDriverRegistered, existingDriverId }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [lookupDui, setLookupDui] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [docValidations, setDocValidations] = useState({});
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isPlayingInstitutional, setIsPlayingInstitutional] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const modalScrollRef = useRef(null);

  const handleShareLink = async (type) => {
    await shareToWhatsAppOrNative(type);
  };

  const handleCopyLink = async (type) => {
    await copyShareLink(type);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Auto-scroll al inicio del modal cada vez que cambia el paso
  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  // Limpieza al desmontar o cerrar modal (detener voz y liberar WakeLock)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      releaseScreenWakeLock();
    };
  }, []);

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
    hasAirConditioning: true,
    fuelType: 'REGULAR',
    fuelKmPerGallon: 37.0,
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

  // Handlers para Combos Dinámicos de Marca, Modelo, Año y Clima
  const handleBrandChange = (newBrand) => {
    const models = VEHICLE_MODELS_BY_BRAND[newBrand] || ['Modelo Estándar'];
    const newModel = models[0];
    const eff = calculateVehicleFuelEfficiency(newBrand, newModel, form.vehicleYear, form.hasAirConditioning);
    setForm((prev) => ({
      ...prev,
      vehicleBrand: newBrand,
      vehicleModel: newModel,
      fuelKmPerGallon: eff.acKpg
    }));
  };

  const handleModelChange = (newModel) => {
    const eff = calculateVehicleFuelEfficiency(form.vehicleBrand, newModel, form.vehicleYear, form.hasAirConditioning);
    setForm((prev) => ({
      ...prev,
      vehicleModel: newModel,
      fuelKmPerGallon: eff.acKpg
    }));
  };

  const handleYearChange = (newYear) => {
    const eff = calculateVehicleFuelEfficiency(form.vehicleBrand, form.vehicleModel, newYear, form.hasAirConditioning);
    setForm((prev) => ({
      ...prev,
      vehicleYear: newYear,
      fuelKmPerGallon: eff.acKpg
    }));
  };

  const handleAirConditioningToggle = (hasAc) => {
    const eff = calculateVehicleFuelEfficiency(form.vehicleBrand, form.vehicleModel, form.vehicleYear, hasAc);
    setForm((prev) => ({
      ...prev,
      hasAirConditioning: hasAc,
      fuelKmPerGallon: hasAc ? eff.acKpg : eff.nominalKpg
    }));
  };

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

  // Subida de Archivo con Compresión Automática y Validación
  const handleFileUpload = (field, e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      let dataUrl = reader.result;
      try {
        dataUrl = await compressImage(dataUrl, 1280, 0.82);
      } catch (err) {
        console.warn('Compress image error:', err);
      }
      setForm((prev) => ({ ...prev, [field]: dataUrl }));

      if (docType) {
        const report = await validateDocumentImage(dataUrl, docType, {
          dui: form.dui,
          fullName: form.fullName,
          licenseNumber: form.licenseNumber,
          vehiclePlate: form.vehiclePlate,
          vehicleBrand: form.vehicleBrand
        });
        setDocValidations((prev) => ({ ...prev, [field]: report }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Rotación de foto 90° en canvas para corregir fotos de cabeza o de lado
  const handleRotateDocument = async (field, docType) => {
    const currentUrl = form[field];
    if (!currentUrl) return;
    const rotated = await rotateImage90Degrees(currentUrl);
    setForm((prev) => ({ ...prev, [field]: rotated }));
    if (docType) {
      const report = await validateDocumentImage(rotated, docType, {
        dui: form.dui,
        fullName: form.fullName,
        licenseNumber: form.licenseNumber,
        vehiclePlate: form.vehiclePlate,
        vehicleBrand: form.vehicleBrand
      });
      setDocValidations((prev) => ({ ...prev, [field]: report }));
    }
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
      const msg = 'Debes marcar la casilla para aceptar los términos y condiciones de Rumbo antes de enviar.';
      setErrorMsg(msg);
      alert(msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        dui: form.dui.trim(),
        emergencyContactName: form.emergencyContactName?.trim() || '',
        emergencyContactPhone: form.emergencyContactPhone?.trim() || '',
        licenseNumber: form.licenseNumber.trim().toUpperCase(),
        vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
        vehicleBrand: form.vehicleBrand || 'Toyota',
        vehicleModel: form.vehicleModel || 'Corolla',
        vehicleYear: parseInt(form.vehicleYear, 10) || 2018,
        vehicleColor: form.vehicleColor || 'Gris Plata',
        fuelType: form.fuelType || 'REGULAR',
        fuelKmPerGallon: parseFloat(form.fuelKmPerGallon) || 40.0,
        photoUrl: form.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        duiFrontUrl: form.duiFrontUrl || '',
        duiBackUrl: form.duiBackUrl || '',
        licenseFrontUrl: form.licenseFrontUrl || '',
        licenseBackUrl: form.licenseBackUrl || '',
        circulationCardUrl: form.circulationCardUrl || '',
        policeRecordUrl: form.policeRecordUrl || '',
        criminalRecordUrl: form.criminalRecordUrl || '',
        vehiclePhotoFront: form.vehiclePhotoFront || '',
        vehiclePhotoInside: form.vehiclePhotoInside || ''
      };

      const res = await registerDriverApi(payload);
      if (res && res.success) {
        const profile = res.driverProfile || res;
        setSuccessData(profile);
        localStorage.setItem('rumbo_driver_profile', JSON.stringify(profile));
        speakWelcomeMessage(profile.fullName || form.fullName);
        if (modalScrollRef.current) {
          modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (onDriverRegistered) {
          onDriverRegistered(profile);
        }
      } else {
        throw new Error(res?.error || 'No se pudo completar el registro del expediente.');
      }
    } catch (err) {
      const msg = err.message || 'Error al enviar el expediente de registro.';
      setErrorMsg(msg);
      alert(`⚠️ Atención: ${msg}`);
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={modalScrollRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-start sm:items-center justify-center pt-20 sm:pt-8 pb-16 px-3 sm:px-5"
    >
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-7 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-200 mt-2 sm:mt-0">
        
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pantalla de Estado Post-Envío: BIENVENIDA EUFÓRICA */}
        {successData ? (
          <div className="space-y-6 text-center py-2 sm:py-4 animate-in zoom-in-95 duration-300">
            {/* Cabecera Eufórica con destellos */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 to-emerald-500/30 animate-ping opacity-60" />
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 p-0.5 shadow-2xl shadow-emerald-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-[#0f172a] rounded-[22px] flex items-center justify-center text-amber-400">
                  <Sparkles className="w-10 h-10 animate-bounce" />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>¡SOLICITUD PRESENTADA CON ÉXITO!</span>
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                🎉 ¡Bienvenido a la Comunidad de Conductores Rumbo a tu Destino!
              </h2>

              <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                <strong className="text-amber-400 font-bold">{successData.fullName}</strong>, tu expediente ha sido recibido y está en la cola de activación preferencial. ¡Tu esfuerzo vale el 100%!
              </p>
            </div>

            {/* Tarjetas de Beneficios Confirmados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-1">
                <span className="text-emerald-400 font-black text-sm block">100% Efectivo</span>
                <p className="text-[10px] text-slate-400">Cero comisiones abusivas. Todo el dinero es tuyo.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-1">
                <span className="text-amber-400 font-black text-sm block">1ª Semana $0.00</span>
                <p className="text-[10px] text-slate-400">Cuota 100% bonificada de bienvenida.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-1">
                <span className="text-sky-400 font-black text-sm block">Radio 1 km</span>
                <p className="text-[10px] text-slate-400">Cero viajes fantasma. Pasajeros reales listos.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-1">
                <span className="text-purple-400 font-black text-sm block">Gasolina $5.13</span>
                <p className="text-[10px] text-slate-400">Tarifa indexada que protege tu economía.</p>
              </div>
            </div>

            {/* Resumen del Expediente */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Conductor</span>
                <span className="font-bold text-slate-200 truncate block">{successData.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DUI</span>
                <span className="font-bold text-slate-200 font-mono">{successData.dui}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Vehículo</span>
                <span className="font-bold text-slate-200 truncate block">{successData.vehicleBrand} {successData.vehicleModel}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Placa Oficial</span>
                <span className="font-black text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 inline-block">
                  {successData.vehiclePlate}
                </span>
              </div>
            </div>

            {/* Mensaje de Activación */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-black text-amber-300">Tiempo Estimado de Activación: 2 a 12 Horas</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Nuestro equipo administrativo coteja tu solvencia y tarjeta de circulación. Recibirás tu confirmación y podrás encender el radar para tomar tus primeras carreras en vivo.
                </p>
              </div>
            </div>

            {/* Mensaje Institucional del Avatar con Voz de Seriedad y Enlaces Colaborativos */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 text-left space-y-3.5 shadow-xl shadow-amber-950/20">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30 shrink-0">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <span>Alianza Comunitaria • Rumbo a tu Destino</span>
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">Fase Inicial</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Mensaje del Equipo Fundador para conductores registrados
                    </p>
                  </div>
                </div>

                {/* Botón para Escuchar con Voz de Seriedad */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPlayingInstitutional) {
                      window.speechSynthesis?.cancel();
                      releaseScreenWakeLock();
                      setIsPlayingInstitutional(false);
                    } else {
                      setIsPlayingInstitutional(true);
                      speakInstitutionalMessage(() => setIsPlayingInstitutional(false));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer ${
                    isPlayingInstitutional
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isPlayingInstitutional ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Detener Voz</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Escuchar Avatar (Voz de Seriedad)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                <p>
                  <strong className="text-white">Agradecemos sinceramente tu paciencia, tu confianza y tu comprensión.</strong> Esta aplicación se encuentra actualmente en su fase inicial de lanzamiento en El Salvador y ha nacido para devolver la dignidad a tu economía ante la constante alza de los combustibles.
                </p>
                <p className="text-slate-400 text-[11px]">
                  Para consolidar esta estructura colaborativa y que todos nos beneficiemos al máximo, <strong className="text-amber-300">te pedimos tu colaboración compartiendo los enlaces oficiales</strong> tanto con viajeros como con otros colegas conductores. Cuantos más seamos en las calles, mayores serán los viajes para ti y para toda la comunidad.
                </p>
              </div>

              {/* Los Dos Botones de Enlace (Pasajeros y Conductores) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Botón 1: Enlace para Pasajeros */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-sky-500/40 flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs text-white">1. Enlace para Pasajeros / Viajeros</h4>
                      <p className="text-[11px] text-sky-300 font-semibold">
                        🎁 Paga menos por carrera con tus Bonos de Referencia
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Ganas $1.00 de bono de viaje por cada persona invitada que se descuenta directo de tu tarifa.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => handleShareLink('passenger')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                      title="Enviar por WhatsApp con logo y bonos de referencia"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Enviar por WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink('passenger')}
                      title="Copiar enlace"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                    >
                      {copiedLink === 'passenger' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Botón 2: Enlace para Conductores */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs text-white">2. Enlace para Conductores Colegas</h4>
                      <p className="text-[11px] text-amber-300 font-semibold">
                        💰 0% Comisión y 1ª Semana 100% Gratis
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        El 100% de la ganancia en efectivo en tu mano ante la gasolina a $5.13 y radio de 1 km sin viajes fantasma.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => handleShareLink('driver')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                      title="Enviar por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Enviar por WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink('driver')}
                      title="Copiar enlace"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                    >
                      {copiedLink === 'driver' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>¡Entendido! Ir al Radar Rumbo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors border border-slate-700 cursor-pointer"
              >
                <LifeBuoy className="w-4 h-4 text-amber-400" />
                <span>Ticket de Soporte Técnico</span>
              </button>
            </div>
          </div>
        ) : (
          /* Formulario Paso a Paso */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header del Modal con Barra de Seguimiento (Baja la pantalla operativa para evitar ser tapada por la barra del navegador) */}
            <div className="border-b border-slate-800 pb-3 mb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30 shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                      <span>Rumbo a mi Destino</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Conductores
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Registro Oficial • 100% Efectivo • 0% Comisión
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-amber-400 font-mono">
                    {step === 1 ? '25%' : step === 2 ? '50%' : step === 3 ? '75%' : '100%'}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400">
                    Paso {step} de 4
                  </span>
                </div>
              </div>

              {/* Barra de Seguimiento Gráfica Dinámica */}
              <div className="w-full bg-slate-900 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>

              {/* Indicadores de Pasos con Nombre */}
              <div className="grid grid-cols-4 gap-1 mt-2.5">
                {[
                  { num: 1, label: 'Identidad' },
                  { num: 2, label: 'Vehículo' },
                  { num: 3, label: 'Documentos' },
                  { num: 4, label: 'Términos' }
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < step) setStep(s.num);
                    }}
                    className={`text-center py-1 px-1 rounded-lg transition-all ${
                      s.num < step ? 'cursor-pointer hover:bg-slate-800 text-emerald-400 font-medium' : ''
                    } ${
                      step === s.num
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold'
                        : step < s.num
                        ? 'text-slate-400 opacity-60'
                        : ''
                    }`}
                  >
                    <span className="text-[10px] block leading-tight truncate">
                      {s.num}. {s.label}
                    </span>
                  </button>
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

                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">Foto de Perfil (Selfie de seguridad) *</label>
                      {form.photoUrl && (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Foto cargada
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2.5 items-center bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                      {form.photoUrl && (
                        <div className="relative shrink-0">
                          <img
                            src={form.photoUrl}
                            alt="Selfie"
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                          />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                        {/* Botón Cámara Frontal */}
                        <label className="cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-bold flex items-center justify-center gap-2 transition-colors text-center shadow-sm">
                          <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Tomar Selfie (Cámara)</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            className="hidden"
                            onChange={(e) => handleFileUpload('photoUrl', e)}
                          />
                        </label>

                        {/* Botón Galería */}
                        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-semibold flex items-center justify-center gap-2 transition-colors text-center">
                          <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Elegir de Galería</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload('photoUrl', e)}
                          />
                        </label>
                      </div>
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 inline-flex items-center justify-center text-[10px] font-black border border-amber-400/40">1</span>
                      <span>Número de Licencia de Conducir (VMT / SERTRACEN) *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. 0614-120590-101-2 o tu DUI"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <p className="text-[10px] text-slate-400">
                      En El Salvador tu licencia suele coincidir con tu formato de NIT o tu DUI.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 inline-flex items-center justify-center text-[10px] font-black border border-amber-400/40">2</span>
                      <span>Número de Placa Oficial *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. P-584-912 o P-123456"
                      value={form.vehiclePlate}
                      onChange={handlePlateChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-black tracking-wider font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <p className="text-[10px] text-slate-400">
                      Placa salvadoreña según tu tarjeta de circulación (P, C, A, etc.).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Marca del Vehículo *</label>
                    <select
                      value={form.vehicleBrand}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400 transition-colors"
                    >
                      {VEHICLE_BRANDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Modelo *</label>
                    <select
                      value={form.vehicleModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400 transition-colors"
                    >
                      {(VEHICLE_MODELS_BY_BRAND[form.vehicleBrand] || ['Modelo Estándar']).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Año de Fabricación *</label>
                    <select
                      value={form.vehicleYear}
                      onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 transition-colors"
                    >
                      {Array.from({ length: 22 }, (_, i) => 2026 - i).map((yr) => (
                        <option key={yr} value={yr}>
                          Año {yr} {yr >= 2018 ? '✨ (Óptimo)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Color del Vehículo *</label>
                    <select
                      value={form.vehicleColor}
                      onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 transition-colors"
                    >
                      {VEHICLE_COLORS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pregunta de Aire Acondicionado & Rendimiento de Combustible Automático */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-slate-200">
                        ¿Tiene Aire Acondicionado 100% Funcional?
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAirConditioningToggle(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          form.hasAirConditioning
                            ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-950/40'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        ✓ Sí, Funcional
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAirConditioningToggle(false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          !form.hasAirConditioning
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        Sin Aire
                      </button>
                    </div>
                  </div>

                  {/* Tarjeta de Cálculo Automático de Rendimiento de Combustible */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Rendimiento Estimado Automático de Fábrica:</span>
                      </span>
                      <span className="font-mono font-black text-white text-sm">
                        {form.fuelKmPerGallon} km/gal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 Investigado y calculado según parámetros oficiales de <strong>{form.vehicleBrand} {form.vehicleModel} ({form.vehicleYear})</strong> {form.hasAirConditioning ? 'con A/C activo en ciudad' : 'sin clima'}. No tienes que adivinarlo: Rumbo lo usa para calcular el gasto exacto de tu viaje.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Tipo de Combustible Recomendado</label>
                      <select
                        value={form.fuelType}
                        onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                      >
                        <option value="REGULAR">Gasolina Regular ($4.75)</option>
                        <option value="ESPECIAL">Gasolina Especial ($5.13)</option>
                        <option value="DIESEL">Diésel ($4.25)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Ajuste Manual si difiere (km/gal)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.fuelKmPerGallon}
                        onChange={(e) => setForm({ ...form, fuelKmPerGallon: parseFloat(e.target.value) || 40 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: DOCUMENTACIÓN Y FOTOS DE RESPALDO */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Paso 3: Expediente Digital con Validación Fotográfica</span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-[11px] text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Control de Calidad, Orientación y Legibilidad Automática</span>
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Sube fotos nítidas con buena luz. El sistema valida resolución, orientación (puedes rotarla si queda de lado o de cabeza) y coteja que los documentos pertenezcan a <strong>{form.fullName || 'ti'}</strong> y al vehículo placa <strong>{form.vehiclePlate || 'registrado'}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* DUI Frente */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">DUI (Frente)</span>
                      {form.duiFrontUrl && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRotateDocument('duiFrontUrl', 'DUI_FRONT')}
                            title="Rotar foto 90° si está de lado o de cabeza"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotar 90°</span>
                          </button>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {form.duiFrontUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-24 bg-black flex items-center justify-center">
                        <img src={form.duiFrontUrl} alt="DUI Frente" className="max-h-24 object-contain" />
                      </div>
                    )}
                    {docValidations.duiFrontUrl?.error && (
                      <p className="text-[10px] text-rose-400 font-semibold">{docValidations.duiFrontUrl.error}</p>
                    )}
                    {docValidations.duiFrontUrl?.orientationWarning && (
                      <p className="text-[10px] text-amber-400 font-medium">{docValidations.duiFrontUrl.orientationWarning}</p>
                    )}
                    {docValidations.duiFrontUrl?.valid && (
                      <p className="text-[10px] text-emerald-400 font-medium">
                        ✓ Legible ({docValidations.duiFrontUrl.width}x{docValidations.duiFrontUrl.height}px) • Asociado a {form.dui || 'DUI'}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-bold transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Cámara</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload('duiFrontUrl', e, 'DUI_FRONT')} />
                      </label>
                      <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Galería</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('duiFrontUrl', e, 'DUI_FRONT')} />
                      </label>
                    </div>
                  </div>

                  {/* DUI Reverso */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">DUI (Reverso)</span>
                      {form.duiBackUrl && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRotateDocument('duiBackUrl', 'DUI_BACK')}
                            title="Rotar foto 90°"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotar 90°</span>
                          </button>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {form.duiBackUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-24 bg-black flex items-center justify-center">
                        <img src={form.duiBackUrl} alt="DUI Reverso" className="max-h-24 object-contain" />
                      </div>
                    )}
                    {docValidations.duiBackUrl?.error && (
                      <p className="text-[10px] text-rose-400 font-semibold">{docValidations.duiBackUrl.error}</p>
                    )}
                    {docValidations.duiBackUrl?.valid && (
                      <p className="text-[10px] text-emerald-400 font-medium">✓ Reverso Legible y Verificado</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-bold transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Cámara</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload('duiBackUrl', e, 'DUI_BACK')} />
                      </label>
                      <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Galería</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('duiBackUrl', e, 'DUI_BACK')} />
                      </label>
                    </div>
                  </div>

                  {/* Licencia de Conducir Frente */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Licencia (Frente)</span>
                      {form.licenseFrontUrl && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRotateDocument('licenseFrontUrl', 'LICENSE_FRONT')}
                            title="Rotar foto 90°"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotar 90°</span>
                          </button>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {form.licenseFrontUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-24 bg-black flex items-center justify-center">
                        <img src={form.licenseFrontUrl} alt="Licencia Frente" className="max-h-24 object-contain" />
                      </div>
                    )}
                    {docValidations.licenseFrontUrl?.error && (
                      <p className="text-[10px] text-rose-400 font-semibold">{docValidations.licenseFrontUrl.error}</p>
                    )}
                    {docValidations.licenseFrontUrl?.valid && (
                      <p className="text-[10px] text-emerald-400 font-medium">✓ Licencia {form.licenseNumber || 'Verificada'}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-bold transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Cámara</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload('licenseFrontUrl', e, 'LICENSE_FRONT')} />
                      </label>
                      <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Galería</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('licenseFrontUrl', e, 'LICENSE_FRONT')} />
                      </label>
                    </div>
                  </div>

                  {/* Tarjeta de Circulación SERTRACEN */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Tarjeta Circulación (SERTRACEN)</span>
                      {form.circulationCardUrl && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRotateDocument('circulationCardUrl', 'CIRCULATION')}
                            title="Rotar foto 90°"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotar 90°</span>
                          </button>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {form.circulationCardUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-24 bg-black flex items-center justify-center">
                        <img src={form.circulationCardUrl} alt="Tarjeta Circulación" className="max-h-24 object-contain" />
                      </div>
                    )}
                    {docValidations.circulationCardUrl?.valid && (
                      <p className="text-[10px] text-emerald-400 font-medium">✓ Placa {form.vehiclePlate || 'SERTRACEN'}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-bold transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Cámara</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload('circulationCardUrl', e, 'CIRCULATION')} />
                      </label>
                      <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Galería</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('circulationCardUrl', e, 'CIRCULATION')} />
                      </label>
                    </div>
                  </div>

                  {/* Solvencia PNC */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Solvencia PNC (Vigente &lt; 90 días)</span>
                      {form.policeRecordUrl && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRotateDocument('policeRecordUrl', 'POLICE')}
                            title="Rotar foto 90°"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotar 90°</span>
                          </button>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {form.policeRecordUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-24 bg-black flex items-center justify-center">
                        <img src={form.policeRecordUrl} alt="Solvencia PNC" className="max-h-24 object-contain" />
                      </div>
                    )}
                    {docValidations.policeRecordUrl?.valid && (
                      <p className="text-[10px] text-emerald-400 font-medium">✓ Solvencia Legible para {form.fullName || 'Titular'}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-bold transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Cámara</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload('policeRecordUrl', e, 'POLICE')} />
                      </label>
                      <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Galería</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('policeRecordUrl', e, 'POLICE')} />
                      </label>
                    </div>
                  </div>

                  {/* Foto Frontal del Vehículo con Placa */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Foto Vehículo (Placa visible)</span>
                      {form.vehiclePhotoFront && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRotateDocument('vehiclePhotoFront', 'VEHICLE_FRONT')}
                            title="Rotar foto 90°"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotar 90°</span>
                          </button>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {form.vehiclePhotoFront && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-24 bg-black flex items-center justify-center">
                        <img src={form.vehiclePhotoFront} alt="Foto Vehículo" className="max-h-24 object-contain" />
                      </div>
                    )}
                    {docValidations.vehiclePhotoFront?.valid && (
                      <p className="text-[10px] text-emerald-400 font-medium">✓ Vehículo {form.vehicleBrand} • Placa {form.vehiclePlate}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-bold transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Cámara</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload('vehiclePhotoFront', e, 'VEHICLE_FRONT')} />
                      </label>
                      <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Galería</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('vehiclePhotoFront', e, 'VEHICLE_FRONT')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: MODELO DE NEGOCIO & TÉRMINOS CON MEDIOS DE PAGO OFICIALES */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  <span>Paso 4: Modelo Operativo Rumbo & Medios de Pago</span>
                </div>

                <div className="space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold border border-emerald-500/30">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">100% Efectivo en tu Mano (0% Comisión)</h4>
                      <p className="text-slate-400 text-[11px]">
                        Rumbo no descuenta porcentajes por carrera. Todo el dinero cobrado al pasajero es íntegramente tuyo en tu bolsillo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold border border-amber-500/30">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">Membresía Semanal Fija de $10.00 USD</h4>
                      <p className="text-slate-400 text-[11px]">
                        Tu 1ª semana es 100% bonificada ($0.00 cuota). En las semanas siguientes, cada bono de $1.00 de pasajero descuenta tu cuota hasta dejarla en $0.00 (con 10 bonos recibidos, tu semana te sale gratis).
                      </p>
                    </div>
                  </div>

                  {/* CANALES OFICIALES DE CANCELACIÓN DE CUOTA EN CASO DE EFECTIVO */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-amber-300 text-xs">
                        Medios Autorizados para Cancelar la Cuota Semanal ($10 USD)
                      </h4>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      En caso de ser necesario cancelar los $10.00 en efectivo o saldo remanente (si no se liquida completamente con los bonos de pasajeros), el pago se realizará exclusivamente a través de:
                    </p>
                    <div className="space-y-2 pt-1 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                        <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">1. Transferencia 365 Móvil:</strong>
                          <div className="text-slate-300">
                            Banco: <strong className="text-white">DAVIVIENDA</strong> • Celular: <strong className="text-amber-300 font-mono">69893101</strong>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            A nombre de: <strong className="text-slate-200">Cesar Arias</strong>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                        <CreditCard className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">2. Enlace de Pago Electrónico:</strong>
                          <div className="text-slate-300">
                            A través de link oficial seguro de <strong className="text-sky-300">CUBO Pago</strong> con tarjeta de débito o crédito salvadoreña.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={form.termsAccepted}
                    onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    He leído y acepto el modelo de membresía semanal fija de $10.00 USD (pagadera mediante compensación de bonos de pasajeros, transferencia 365 móvil Davivienda al 69893101 a nombre de Cesar Arias o link Cubo Pago), y declaro bajo juramento que los documentos subidos y datos del vehículo corresponden a mi persona y son 100% verídicos y vigentes en El Salvador.
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
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  {errorMsg && (
                    <span className="text-[11px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                      {errorMsg}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Enviando Expediente...</span>
                      </>
                    ) : (
                      <>
                        <span>Enviar Solicitud a Aprobación</span>
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Modal de Tickets de Soporte Técnico */}
      <SupportTicketModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </div>
  );
}
