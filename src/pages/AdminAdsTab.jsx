import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  PlusCircle,
  Sparkles,
  Eye,
  MousePointerClick,
  Share2,
  Copy,
  Check,
  Trash2,
  Edit3,
  ExternalLink,
  MessageCircle,
  Tag,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  Zap,
  DollarSign
} from 'lucide-react';
import {
  fetchAdminAdsApi,
  createAdminAdApi,
  updateAdminAdApi,
  deleteAdminAdApi
} from '../viajes/api';
import RumboInTripAdModal from '../viajes/RumboInTripAdModal';

const MUNICIPALITIES_SV = [
  'TODOS',
  'San Salvador',
  'Santa Tecla',
  'Antiguo Cuscatlán',
  'Soyapango',
  'Ilopango',
  'San Marcos',
  'Mejicanos',
  'Apopa',
  'Ciudad Delgado',
  'Cuscatancingo',
  'San Martín',
  'Santa Ana',
  'San Miguel',
  'La Libertad (Surf City)',
  'Colón / Lourdes',
  'Zacatecoluca',
  'Sonsonate',
  'Ahuachapán'
];

export default function AdminAdsTab() {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState({
    totalAds: 0,
    activeAds: 0,
    totalImpressions: 0,
    totalClicks: 0
  });
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('LIST'); // 'LIST' | 'PROPOSAL' | 'CREATE'
  const [previewAd, setPreviewAd] = useState(null);
  const [copiedPitch, setCopiedPitch] = useState(false);

  // Formulario de Creación / Edición
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    businessName: '',
    whatsapp: '',
    phone: '',
    title: '',
    description: '',
    mediaUrl: '',
    creativeType: 'INTERSTITIAL_POPUP',
    targetLink: '',
    targetMunicipality: 'TODOS',
    ctaText: 'Pedir por WhatsApp',
    couponCode: '',
    planType: 'IMPACTO',
    triggerDelaySeconds: 3,
    displayDurationSeconds: 10,
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  const loadAds = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminAdsApi();
      if (res.success) {
        setAds(res.ads || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Error cargando pautas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      businessName: '',
      whatsapp: '',
      phone: '',
      title: '',
      description: '',
      mediaUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      creativeType: 'INTERSTITIAL_POPUP',
      targetLink: '',
      targetMunicipality: 'TODOS',
      ctaText: 'Pedir por WhatsApp',
      couponCode: 'RUMBO10',
      planType: 'IMPACTO',
      triggerDelaySeconds: 3,
      displayDurationSeconds: 10,
      isActive: true
    });
    setFormMsg(null);
    setSubTab('CREATE');
  };

  const handleOpenEdit = (ad) => {
    setEditingId(ad.id);
    setForm({
      businessName: ad.business_name || '',
      whatsapp: ad.whatsapp || '',
      phone: ad.phone || '',
      title: ad.title || '',
      description: ad.description || '',
      mediaUrl: ad.media_url || '',
      creativeType: ad.creative_type || 'INTERSTITIAL_POPUP',
      targetLink: ad.target_link || '',
      targetMunicipality: ad.target_municipality || 'TODOS',
      ctaText: ad.cta_text || 'Pedir por WhatsApp',
      couponCode: ad.coupon_code || '',
      planType: ad.plan_type || 'IMPACTO',
      triggerDelaySeconds: ad.trigger_delay_seconds || 3,
      displayDurationSeconds: ad.display_duration_seconds || 10,
      isActive: ad.is_active !== false
    });
    setFormMsg(null);
    setSubTab('CREATE');
  };

  const handleToggleActive = async (ad) => {
    try {
      const nextActive = !ad.is_active;
      await updateAdminAdApi(ad.id, { isActive: nextActive });
      setAds(prev => prev.map(item => item.id === ad.id ? { ...item, is_active: nextActive } : item));
    } catch (err) {
      console.error('Error al alternar pauta:', err);
    }
  };

  const handleDelete = async (adId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta pauta publicitaria?')) return;
    try {
      await deleteAdminAdApi(adId);
      setAds(prev => prev.filter(item => item.id !== adId));
    } catch (err) {
      console.error('Error al eliminar pauta:', err);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.businessName || !form.title || !form.mediaUrl) {
      setFormMsg({ type: 'error', text: 'Nombre del comercio, título y URL de imagen son obligatorios' });
      return;
    }

    setSaving(true);
    setFormMsg(null);

    try {
      if (editingId) {
        const res = await updateAdminAdApi(editingId, form);
        if (res.success) {
          setFormMsg({ type: 'success', text: 'Pauta publicitaria actualizada con éxito' });
          loadAds();
          setTimeout(() => setSubTab('LIST'), 1500);
        } else {
          setFormMsg({ type: 'error', text: res.error || 'Error al actualizar' });
        }
      } else {
        const res = await createAdminAdApi(form);
        if (res.success) {
          setFormMsg({ type: 'success', text: 'Pauta publicitaria creada y activada con éxito' });
          loadAds();
          setTimeout(() => setSubTab('LIST'), 1500);
        } else {
          setFormMsg({ type: 'error', text: res.error || 'Error al crear pauta' });
        }
      }
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Propuesta Comercial Formateada para WhatsApp
  const COMMERCIAL_PITCH = `📢 *PROPUESTA DE PAUTA PUBLICITARIA EN TRAYECTO - RUMBO A TU DESTINO* 🇸🇻\n\n¿Sabías que un pasajero en San Salvador pasa entre *15 y 30 minutos* viendo la pantalla de su celular mientras viaja en su carrera?\n\nEn *Rumbo a tu Destino* ofrecemos pautas comerciales de alto impacto que se despliegan automáticamente a los *3 segundos* de iniciar el viaje, garantizando la atención del cliente cuando va camino a tu zona comercial.\n\n✨ *VENTAJAS EXCLUSIVAS PARA TU NEGOCIO:*\n1. *Momento de Máxima Atención:* Despliegue interactivo a los 3 segundos de arrancar el vehículo (pantalla completa o pop-up).\n2. *Geosegmentación Exacta:* Tu anuncio solo aparece para pasajeros cuyo destino es tu municipio o colonia.\n3. *Conversión Directa:* El pasajero toca 1 botón y te escribe directo a tu WhatsApp con cupón de descuento precargado.\n4. *Medición Real:* Estadísticas de impresiones y clicks reales en tu consola.\n\n💼 *PLANES DISPONIBLES EN EL SALVADOR:*\n🔹 *Plan Vitrina:* $7.50 / semana ($25.00 al mes)\n   - Banner publicitario en el feed de ruta de destino\n   - Enlace directo a tu WhatsApp o llamada\n\n🔥 *Plan Impacto 3-Segundos (Recomendado):* $12.50 / semana ($45.00 al mes)\n   - Despliegue prioritario en pantalla completa a los 3s de viaje\n   - Código de cupón exclusivo para medir ventas\n   - Geocercado por municipio objetivo\n\n👑 *Combo Full + Envíos Locales:* $17.50 / semana ($60.00 al mes)\n   - Despliegue prioritario + presencia en arcade\n   - Canal de encomiendas con choferes a menos de 1 km\n\n¿Te gustaría activar una prueba piloto esta semana?\nEscríbenos para configurar el arte de tu negocio hoy mismo. 🚀`;

  const handleCopyPitch = () => {
    navigator.clipboard?.writeText(COMMERCIAL_PITCH);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white font-sans">
      
      {/* ================= HEADER DEL MÓDULO ================= */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">Publicidad & Pautas en Trayecto (Spot 3 Segundos)</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                Activo en Trayecto
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Configura los anuncios de comercios que se desplegarán 3 segundos después de que el conductor inicie el viaje hacia el destino final, mientras el pasajero juega, navega en la red o mira la ruta.
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadAds}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Refrescar pautas"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setSubTab('PROPOSAL')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'PROPOSAL'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Propuesta para Comercios</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('LIST')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'LIST'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <span>Ver Pautas ({ads.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Pauta</span>
          </button>
        </div>
      </div>

      {/* ================= TARJETAS KPI DE IMPACTO ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Pautas</span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">{stats.totalAds}</div>
          <span className="text-[11px] text-amber-400 font-bold">{stats.activeAds} activas en rotación</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Momento de Disparo</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">3.0 s</div>
          <span className="text-[11px] text-slate-400">Tras arranque de carrera</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Impresiones en Ruta</span>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">{stats.totalImpressions}</div>
          <span className="text-[11px] text-slate-400">Pasajeros impactados</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clicks a WhatsApp</span>
          <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">{stats.totalClicks}</div>
          <span className="text-[11px] text-purple-300 font-bold">
            CTR: {stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
      </div>

      {/* ================= CONTENIDO: PESTAÑA LISTADO ================= */}
      {subTab === 'LIST' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Pautas Publicitarias en Circulación ({ads.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Disparo sincronizado a los 3 segundos del trayecto
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
              <p className="text-xs">Cargando catálogo publicitario...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No hay pautas publicitarias registradas</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Crea el primer anuncio de un restaurante o comercio local para desplegarse a los 3 segundos de iniciado el viaje.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="py-2 px-4 rounded-xl bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear Primera Pauta</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className={`p-4 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between space-y-3 ${
                    ad.is_active ? 'border-slate-800 hover:border-amber-400/40 shadow-xl' : 'border-slate-800/40 opacity-60'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Media Thumbnail */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img
                        src={ad.media_url}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[9px] font-black text-amber-300">
                        ⏱️ Disparo: {ad.trigger_delay_seconds || 3}s
                      </div>

                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[9px] font-black text-sky-300">
                        📍 {ad.target_municipality}
                      </div>

                      {ad.coupon_code && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black shadow">
                          🏷️ {ad.coupon_code}
                        </div>
                      )}
                    </div>

                    {/* Información del Comercio */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-amber-400 flex items-center gap-1">
                          {ad.business_name}
                          <ShieldCheck className="w-3 h-3 text-sky-400 inline" />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {ad.plan_type || 'IMPACTO'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white leading-snug line-clamp-2">
                        {ad.title}
                      </h4>
                      {ad.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {ad.description}
                        </p>
                      )}
                    </div>

                    {/* Métricas del Anuncio */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Impresiones</span>
                        <span className="font-mono font-bold text-white">👁️ {ad.impressions_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Clicks WhatsApp</span>
                        <span className="font-mono font-bold text-emerald-400">👆 {ad.clicks_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Acciones */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(ad)}
                      className={`py-1 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        ad.is_active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ad.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{ad.is_active ? 'Activa' : 'Pausada'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewAd(ad)}
                        title="Previsualizar modal del pasajero"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ad)}
                        title="Editar pauta"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(ad.id)}
                        title="Eliminar pauta"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= CONTENIDO: FORMULARIO CREAR / EDITAR ================= */}
      {subTab === 'CREATE' && (
        <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-5 max-w-2xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white">
                {editingId ? 'Editar Pauta Comercial' : 'Nueva Pauta Publicitaria (Spot 3 Segundos)'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSubTab('LIST')}
              className="text-xs text-slate-400 hover:text-white font-bold"
            >
              Cancelar
            </button>
          </div>

          {formMsg && (
            <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 font-bold ${
              formMsg.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre del Comercio / Negocio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pupusería La Ceiba"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">WhatsApp Comercial (para pedidos/canje)</label>
                <input
                  type="tel"
                  placeholder="Ej. 7000-1234"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Título de la Promoción / Gancho *</label>
              <input
                type="text"
                required
                placeholder="Ej. ¡15% de Descuento mostrando tu viaje en Rumbo!"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Descripción / Beneficio detallado</label>
              <textarea
                rows={2}
                placeholder="Ej. Especialidad en mariscadas, carnes y café gourmet. Ubicados a solo 5 minutos de tu punto de llegada."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">URL de la Imagen / Arte Promocional (Banner 16:9) *</label>
              <input
                type="url"
                required
                placeholder="https://images.unsplash.com/photo-..."
                value={form.mediaUrl}
                onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-amber-400 outline-none"
              />
              {form.mediaUrl && (
                <div className="mt-2 aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-w-xs mx-auto">
                  <img src={form.mediaUrl} alt="Vista previa" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Municipio Objetivo</label>
                <select
                  value={form.targetMunicipality}
                  onChange={(e) => setForm({ ...form, targetMunicipality: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold focus:border-amber-400 outline-none"
                >
                  {MUNICIPALITIES_SV.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Código de Cupón</label>
                <input
                  type="text"
                  placeholder="Ej. RUMBO15"
                  value={form.couponCode}
                  onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-mono font-bold focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Plan Tarifario</label>
                <select
                  value={form.planType}
                  onChange={(e) => setForm({ ...form, planType: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold focus:border-amber-400 outline-none"
                >
                  <option value="VITRINA">Plan Vitrina ($7.50/sem)</option>
                  <option value="IMPACTO">Plan Impacto ($12.50/sem)</option>
                  <option value="COMBO_FULL">Combo Full ($17.50/sem)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Retardo de Despliegue (Segundos)</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={form.triggerDelaySeconds}
                  onChange={(e) => setForm({ ...form, triggerDelaySeconds: parseInt(e.target.value, 10) || 3 })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                />
                <span className="text-[10px] text-amber-400 block mt-0.5">Por defecto: 3 segundos tras iniciar la carrera</span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Texto del Botón CTA</label>
                <input
                  type="text"
                  placeholder="Ej. Pedir por WhatsApp"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chk-is-active"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-amber-400 bg-slate-800 border-slate-700"
              />
              <label htmlFor="chk-is-active" className="text-slate-200 font-bold cursor-pointer">
                Pauta activa de inmediato en rotación de viajes
              </label>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubTab('LIST')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingId ? 'Actualizar Pauta' : 'Guardar y Publicar'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= CONTENIDO: PROPUESTA Y TARIFARIO COMERCIAL ================= */}
      {subTab === 'PROPOSAL' && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
          {/* Header de la Propuesta */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Pautas en Trayecto Rumbo &bull; Modelo de Ingresos B2B
              </span>
              <button
                type="button"
                onClick={handleCopyPitch}
                className="py-1.5 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
              >
                {copiedPitch ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>¡Copiado al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Propuesta para WhatsApp</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white">
              Por qué anunciarse en Rumbo a tu Destino supera a las redes sociales tradicionales
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              En Facebook o Instagram, el usuario hace scroll rápido y pasa de largo. En <b>Rumbo a tu Destino</b>, el pasajero está físicamente sentado en el auto durante <b>15 a 35 minutos</b>. A los 3 segundos exactos de arrancar hacia su destino, la app despliega tu oferta en el momento cumbre de mayor atención.
            </p>
          </div>

          {/* Cuadrícula de Planes Comerciales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* PLAN 1: VITRINA */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">Nivel Básico</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Feed Local</span>
                </div>
                <h4 className="text-base font-black text-white">Plan Vitrina</h4>
                <div className="space-y-0.5">
                  <div className="text-2xl font-black text-white font-mono">$7.50 <span className="text-xs font-normal text-slate-400">/ semana</span></div>
                  <span className="text-[11px] text-emerald-400 font-bold block">o $25.00 USD al mes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Banner en feed de destino</li>
                  <li className="flex items-center gap-2">✓ Geosegmentado por municipio</li>
                  <li className="flex items-center gap-2">✓ Enlace directo a tu WhatsApp</li>
                  <li className="flex items-center gap-2">✓ Métricas básicas de clicks</li>
                </ul>
              </div>
            </div>

            {/* PLAN 2: IMPACTO 3 SEGUNDOS (ESTRELLA) */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-400 shadow-xl space-y-4 flex flex-col justify-between relative">
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
                ⭐ Más Vendido
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">Máxima Conversión</span>
                </div>
                <h4 className="text-base font-black text-white">Plan Impacto Spot</h4>
                <div className="space-y-0.5">
                  <div className="text-2xl font-black text-white font-mono">$12.50 <span className="text-xs font-normal text-slate-400">/ semana</span></div>
                  <span className="text-[11px] text-amber-300 font-bold block">o $45.00 USD al mes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-200 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2 font-bold text-amber-300">🔥 Despliegue automático a los 3s</li>
                  <li className="flex items-center gap-2">✓ Pop-up interactivo en pantalla completa</li>
                  <li className="flex items-center gap-2">✓ Código de cupón exclusivo</li>
                  <li className="flex items-center gap-2">✓ Conexión en 1 toque a WhatsApp</li>
                  <li className="flex items-center gap-2">✓ Reporte semanal de impresiones</li>
                </ul>
              </div>
            </div>

            {/* PLAN 3: COMBO FULL ÉLITE */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-purple-500/40 space-y-4 flex flex-col justify-between hover:border-purple-400 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400">Todo Incluido</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">B2B + Logística</span>
                </div>
                <h4 className="text-base font-black text-white">Combo Full Élite</h4>
                <div className="space-y-0.5">
                  <div className="text-2xl font-black text-white font-mono">$17.50 <span className="text-xs font-normal text-slate-400">/ semana</span></div>
                  <span className="text-[11px] text-purple-300 font-bold block">o $60.00 USD al mes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Todo lo del Plan Impacto (3s)</li>
                  <li className="flex items-center gap-2 font-bold text-purple-300">✓ Presencia en Arcade y Minijuegos</li>
                  <li className="flex items-center gap-2">✓ Canal de distribución y entregas con choferes a 1 km</li>
                  <li className="flex items-center gap-2">✓ Soporte VIP prioritario</li>
                </ul>
              </div>
            </div>

          </div>

          {/* Argumentario de Ventas para Comerciantes */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 text-xs leading-relaxed text-slate-300">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Puntos Clave para Cerrar Comerciantes en El Salvador:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="font-black text-white block">1. Cero Desperdicio de Presupuesto:</span>
                <p className="text-slate-400">Si vendes pupusas o comida en Santa Tecla, solo pagas cuando un pasajero va rumbo a Santa Tecla. No pagas por usuarios al otro lado del país.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="font-black text-white block">2. Cupón con Medición Real:</span>
                <p className="text-slate-400">Cada cliente que llegue a tu local con el cupón de la app te demuestra de inmediato que tu inversión en la pauta está generando ventas en caja.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="font-black text-white block">3. Pasajero con Dinero en Efectivo:</span>
                <p className="text-slate-400">El pasajero de Rumbo lleva cambio en efectivo para pagar su carrera, por lo que está listo para comprar o consumir en tu negocio.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="font-black text-white block">4. Flexibilidad Semanal:</span>
                <p className="text-slate-400">No hay contratos forzosos. Puedes probar 1 semana por $7.50 o $12.50 y renovar según tus resultados.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE PREVISUALIZACIÓN ================= */}
      {previewAd && (
        <RumboInTripAdModal
          isOpen={Boolean(previewAd)}
          onClose={() => setPreviewAd(null)}
          ad={previewAd}
          tripId="preview-trip"
          userId="admin-preview"
        />
      )}

    </div>
  );
}
