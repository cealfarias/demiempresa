import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  Gift,
  ExternalLink,
  MessageCircle,
  Phone,
  Scale,
  FileText,
  ShoppingCart,
  Briefcase,
  HeartPulse,
  Wrench,
  Flame,
  Award,
  CheckCircle2,
  Share2,
  Zap,
  Tag
} from 'lucide-react';

/**
 * Catálogo Maestro de Contenido y Publicidad "En la Llaga":
 * Mezcla orgánica de:
 * 1. Soluciones directas a dolores de la PEA (Legal, Impuestos/DTE, Canasta Básica, Empleo/Crédito, Salud, Mecánica).
 * 2. Anzuelos de Retención (Rifas de Celulares, Días de Transporte Gratis, Gadgets).
 * 3. Ofertas de Comercios Locales segmentados por municipio de destino.
 */
export const PEA_TOPICS = [
  { id: 'legal', label: '⚖️ Legal y Notaría', desc: 'Herencias, traspasos, divorcios y contratos' },
  { id: 'dte_tax', label: '🏛️ Hacienda, DTE e IVA', desc: 'Factura electrónica, solvencias y contabilidad' },
  { id: 'canasta_basica', label: '🛒 Canasta Básica Barata', desc: 'AgroMercado MAG y compras al centavo' },
  { id: 'credito_empleo', label: '💼 Préstamos y Empleo', desc: 'Créditos cooperativos con interés justo y trabajo' },
  { id: 'salud', label: '🩺 Salud y Medicamentos', desc: 'Farmacias económicas y clínicas populares' },
  { id: 'mecanica', label: '🚗 Talleres y Repuestos', desc: 'Llanterías, lubricentros y auxilio vial' }
];

export const IN_TRIP_FEED_ITEMS = [
  // 1. ANZUELO VIRAL / RECOMPENSA DE ATENCIÓN (Gamificación de la PEA)
  {
    id: 'promo-rifa-celular',
    category: 'recompensas',
    tag: '🎁 SORTEO EXCLUSIVO PEA',
    title: '¡Gánate un Smartphone Nuevo o 1 Semana de Transporte Gratis!',
    hook: 'En Rumbo no te cobramos comisiones abusivas: te premiamos por tu atención.',
    details: 'Participas automáticamente en nuestra rifa mensual de smartphones de última generación y semanas de pasajes gratis (2 viajes diarios ida y vuelta a tu trabajo).',
    actionText: 'Participar y Ver Bases',
    actionType: 'INCENTIVE_MODAL',
    bgGradient: 'from-amber-900/60 via-slate-900 to-amber-950/80',
    borderColor: 'border-amber-400/50',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    icon: Gift
  },

  // 2. DOLOR: CANASTA BÁSICA & COMIDA AL CENTAVO
  {
    id: 'pea-canasta-basica',
    category: 'canasta_basica',
    tag: '🛒 ALIVIO AL BOLSILLO',
    title: 'Canasta Básica al Costo: Combos de $1.00 en AgroMercado Directo',
    hook: '¿Cansado de los precios inflados de los súper tradicionales?',
    details: 'Conoce los puntos oficiales de distribución donde consigues huevos, frijol de seda, arroz y hortalizas frescas traídas directo del productor salvadoreño sin intermediarios abusivos.',
    actionText: 'Ver Precios y Puntos MAG',
    actionType: 'LINK',
    actionUrl: 'https://sanmiguelito.demiempresa.online/mercado',
    bgGradient: 'from-emerald-950/60 via-slate-900 to-teal-950/80',
    borderColor: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    icon: ShoppingCart
  },

  // 3. DOLOR: ASUNTOS LEGALES & NOTARIALES
  {
    id: 'pea-legal-notaria',
    category: 'legal',
    tag: '⚖️ DERECHO Y NOTARIADO',
    title: '¿Traspaso de Vehículo, Herencia o Carta Poder Pendiente?',
    hook: 'Evita filas y cobros exorbitantes con asesoría jurídica directa en El Salvador.',
    details: 'Redacción de compraventas de vehículos, contratos de arrendamiento blindados, trámites ante el CNR y solvencias legales con abogados certificados de nuestra red demiempresa.online.',
    actionText: 'Consultar por WhatsApp con Abogado',
    actionType: 'WHATSAPP',
    whatsappMessage: 'Hola, vi la asesoría legal en Rumbo durante mi viaje y necesito cotizar un trámite notarial/legal.',
    bgGradient: 'from-sky-950/60 via-slate-900 to-blue-950/80',
    borderColor: 'border-sky-500/40',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    icon: Scale
  },

  // 4. DOLOR: HACIENDA, DTE Y FACTURACIÓN ELECTRÓNICA OBLIGATORIA
  {
    id: 'pea-dte-hacienda',
    category: 'dte_tax',
    tag: '🏛️ HACIENDA Y NEGOCIOS',
    title: '¿Ya emites Factura Electrónica (DTE) o temes multas de Hacienda?',
    hook: 'Todo negocio, taller o profesional independiente debe facturar electrónicamente.',
    details: 'Solución Grado Tributario A+ avalada por el Ministerio de Hacienda: emite DTE en segundos desde tu celular, declara IVA con un toque y duerme tranquilo sin miedo a auditorías fiscales.',
    actionText: 'Activar Facturación DTE Móvil',
    actionType: 'LINK',
    actionUrl: '/facturacion-dte',
    bgGradient: 'from-purple-950/60 via-slate-900 to-indigo-950/80',
    borderColor: 'border-purple-500/40',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    icon: FileText
  },

  // 5. DOLOR: CRÉDITOS Y EMPLEO
  {
    id: 'pea-credito-empleo',
    category: 'credito_empleo',
    tag: '💼 FINANZAS POPULARES',
    title: '¿Necesitas Capital de Trabajo sin Intereses Usureros?',
    hook: 'Las cooperativas de ahorro y crédito salvadoreñas te prestan con interés solidario.',
    details: 'Accede a microcréditos para emprendedores, consolidación de deudas y oportunidades de empleo formal en empresas asociadas de la red demiempresa.',
    actionText: 'Conocer Cooperativas Afiliadas',
    actionType: 'LINK',
    actionUrl: '/crear-empresa',
    bgGradient: 'from-amber-950/60 via-slate-900 to-yellow-950/80',
    borderColor: 'border-yellow-500/40',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
    icon: Briefcase
  },

  // 6. DOLOR: SALUD Y MEDICAMENTOS
  {
    id: 'pea-salud-familias',
    category: 'salud',
    tag: '🩺 SALUD FAMILIAR',
    title: 'Medicinas con Descuento Directo y Consultas Médicas a Tu Alcance',
    hook: 'No pagues el triple por tus recetas médicas cotidianas.',
    details: 'Red de farmacias locales y clínicas aliadas que aceptan cupones de Rumbo para medicamentos genéricos de calidad, exámenes de laboratorio y chequeos generales.',
    actionText: 'Ver Descuentos en Farmacias',
    actionType: 'WHATSAPP',
    whatsappMessage: 'Hola, vi los convenios de salud en Rumbo durante mi viaje y me gustaría conocer farmacias y clínicas aliadas.',
    bgGradient: 'from-rose-950/60 via-slate-900 to-red-950/80',
    borderColor: 'border-rose-500/40',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    icon: HeartPulse
  },

  // 7. DOLOR: TALLERES Y REPUESTOS MECÁNICOS
  {
    id: 'pea-talleres-mecanica',
    category: 'mecanica',
    tag: '🚗 MANTENIMIENTO VIAL',
    title: '¿Problemas con tu vehículo o moto familiar?',
    hook: 'Talleres mecánicos honrados, llanterías 24/7 y repuestos garantizados.',
    details: 'Talleres certificados en la zona metropolitana con precios justos para frenos, afinados, cambio de aceite y baterías con garantía real.',
    actionText: 'Contactar Red Mecánica',
    actionType: 'WHATSAPP',
    whatsappMessage: 'Hola, vi la red de talleres de Rumbo y deseo cotizar un servicio mecánico.',
    bgGradient: 'from-orange-950/60 via-slate-900 to-slate-950',
    borderColor: 'border-orange-500/40',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    icon: Wrench
  }
];

/**
 * Componente: InTripSocialFeed
 * Renderiza el feed vertical interactivo tipo "Reel/TikTok/Red Social"
 * Se activa tras los primeros 2 minutos de viaje o con un toque en pantalla.
 */
export default function InTripSocialFeed({
  passengerInterests = [],
  destinationMunicipality = 'San Salvador',
  onOpenAdModal,
  onOpenIncentiveModal
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedItems, setFeedItems] = useState(IN_TRIP_FEED_ITEMS);
  const containerRef = useRef(null);

  // Priorizar las tarjetas según los intereses elegidos por el pasajero
  useEffect(() => {
    if (!passengerInterests || passengerInterests.length === 0) {
      setFeedItems(IN_TRIP_FEED_ITEMS);
      return;
    }

    const prioritized = [...IN_TRIP_FEED_ITEMS].sort((a, b) => {
      const aMatches = passengerInterests.includes(a.category);
      const bMatches = passengerInterests.includes(b.category);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });

    setFeedItems(prioritized);
  }, [passengerInterests]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % feedItems.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + feedItems.length) % feedItems.length);
  };

  const currentItem = feedItems[currentIndex] || feedItems[0];
  const IconComponent = currentItem.icon || Sparkles;

  return (
    <section className="w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all animate-fade-in text-left">
      {/* Glow de ambientación */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header del Feed */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
            Rumbo Feed • En tu Trayecto a {destinationMunicipality}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span>{currentIndex + 1}/{feedItems.length}</span>
          <div className="flex gap-1 ml-1">
            <button
              type="button"
              onClick={handlePrev}
              title="Tarjeta anterior"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Deslizar siguiente tarjeta"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta de Contenido Activo (Deslizable Verticalmente) */}
      <div
        key={currentItem.id}
        ref={containerRef}
        className={`mt-3 p-4 rounded-2xl bg-gradient-to-br ${currentItem.bgGradient} border ${currentItem.borderColor} space-y-3 shadow-xl transition-all animate-pop-bounce`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${currentItem.badgeBg}">
            <IconComponent className="w-3 h-3 text-amber-400" />
            <span>{currentItem.tag}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Desliza para más ›</span>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm sm:text-base font-black text-white leading-snug">
            {currentItem.title}
          </h4>
          <p className="text-xs font-bold text-amber-300/90 leading-tight">
            "{currentItem.hook}"
          </p>
          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            {currentItem.details}
          </p>
        </div>

        {/* Botón de Acción Principal Directo a la Llaga */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          {currentItem.actionType === 'WHATSAPP' && (
            <a
              href={`https://wa.me/50369893101?text=${encodeURIComponent(currentItem.whatsappMessage)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{currentItem.actionText}</span>
            </a>
          )}

          {currentItem.actionType === 'LINK' && (
            <a
              href={currentItem.actionUrl}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{currentItem.actionText}</span>
            </a>
          )}

          {currentItem.actionType === 'INCENTIVE_MODAL' && (
            <button
              type="button"
              onClick={onOpenIncentiveModal}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>{currentItem.actionText}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-700"
          >
            <span>Ver Siguiente</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Micro-Enlace para Anunciar Comercios en el Feed */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <button
          type="button"
          onClick={onOpenIncentiveModal}
          className="text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
        >
          <Gift className="w-3 h-3" />
          <span>Rifas y Viajes Gratis PEA</span>
        </button>
        <button
          type="button"
          onClick={onOpenAdModal}
          className="text-emerald-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
        >
          <span>¿Tienes negocio? Anúnciate aquí</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </section>
  );
}
