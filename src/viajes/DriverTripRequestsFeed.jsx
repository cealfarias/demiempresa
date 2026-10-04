import React, { useState, useEffect } from 'react';
import {
  Star,
  MoreVertical,
  Navigation,
  MapPin,
  Clock,
  Radio,
  Sparkles,
  Check,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Phone,
  User,
  LogOut,
  FileText,
  Inbox,
  Share2
} from 'lucide-react';
import { triggerCashRewardFeedback } from './soundFeedbackService';

export default function DriverTripRequestsFeed({
  driverOnline,
  onToggleOnline,
  onAcceptRequest,
  onSendOffer,
  incomingRequest,
  onOpenSettings,
  onOpenExpediente,
  onOpenInbox,
  onOpenAccountStatement,
  onLogout
}) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [activeRequests, setActiveRequests] = useState([]);

  // Si entra una solicitud real por WebSockets, insertarla al inicio
  useEffect(() => {
    if (incomingRequest) {
      setActiveRequests((prev) => {
        const exists = prev.find((r) => r.id === incomingRequest.id);
        if (exists) return prev;
        const newReq = {
          id: incomingRequest.id,
          passengerName: incomingRequest.passengerName || 'Pasajero Rumbo',
          passengerPhoto: incomingRequest.passengerPhoto || null,
          rating: incomingRequest.passengerRating || 5.0,
          ratingCount: incomingRequest.passengerTrips || 1,
          timeAgo: 'Reciente',
          price: parseFloat(incomingRequest.offeredFare || incomingRequest.suggestedFare || 4.00),
          priceLabel: incomingRequest.priceLabel || 'Oferta directa',
          pickupDistanceMeters: Math.round((incomingRequest.distanceKm || 0.6) * 1000),
          tripDistanceKm: parseFloat(incomingRequest.roadDistanceKm || incomingRequest.distanceKm || 5.0),
          origin: incomingRequest.origin || incomingRequest.originAddress || 'Origen del Pasajero',
          destination: incomingRequest.destination || incomingRequest.destinationAddress || 'Destino Rumbo',
          delayMinutes: incomingRequest.delayMinutes || 0
        };
        return [newReq, ...prev];
      });
    }
  }, [incomingRequest]);

  const handleOpenAction = (req) => {
    setSelectedRequest(req);
    setCounterOfferAmount(req.price.toFixed(2));
  };

  const handleAcceptOffer = (req, finalPrice) => {
    triggerCashRewardFeedback();
    if (onAcceptRequest) {
      onAcceptRequest(req, finalPrice);
    } else if (onSendOffer) {
      onSendOffer(finalPrice, 3);
    }
    // Remover de la lista
    setActiveRequests((prev) => prev.filter((r) => r.id !== req.id));
    setSelectedRequest(null);
  };

  return (
    <div className="space-y-2 pb-24 text-slate-100">
      
      {/* 1. BARRA SUPERIOR CON ACCESOS DIRECTOS Y CIERRE DE SESIÓN:
          [☰] [📄 Estado de Cuenta] [📥 Inbox]   [ Ocupado / En línea ]   [⚙] [🚪 Salir] */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onOpenExpediente}
            title="Menú y Expediente de Conductor"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="text-xl leading-none">☰</span>
          </button>

          {/* Acceso a Estado de Cuenta Oficial */}
          {onOpenAccountStatement && (
            <button
              type="button"
              onClick={onOpenAccountStatement}
              title="Ver Estado de Cuenta, Cuotas y Bonos"
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          {/* Acceso a Buzón / Inbox Minimalista */}
          {onOpenInbox && (
            <button
              type="button"
              onClick={onOpenInbox}
              title="Buzón / Inbox"
              aria-label="Buzón de entrada"
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer relative"
            >
              <Inbox className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </button>
          )}
        </div>

        {/* Cápsula de Conexión: Ocupado (Rojo) / En línea (Verde) */}
        <button
          type="button"
          onClick={onToggleOnline}
          className={`px-3.5 sm:px-5 py-1.5 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md cursor-pointer active:scale-95 ${
            driverOnline
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
              : 'bg-rose-500/90 hover:bg-rose-500 text-white shadow-rose-500/30'
          }`}
        >
          <span>{driverOnline ? 'En línea' : 'Ocupado'}</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configuración de auto y rendimiento"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative cursor-pointer"
          >
            <span className="text-lg">⚙</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900"></span>
          </button>

          {/* Botón de Cerrar Sesión del Conductor */}
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión de conductor"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Indicador de cercanía garantizada: 1 km a la redonda */}
      <div className="px-4 py-2 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            Radio: <strong>1 km a la redonda</strong> • 100% confirmado sin solicitudes fantasma
          </span>
        </div>
        <span className="font-mono font-bold text-amber-300">
          {activeRequests.length} disponibles
        </span>
      </div>

      {/* 2. LISTA SCROLLABLE DE SOLICITUDES IDÉNTICA AL SCREENSHOT */}
      <div className="divide-y divide-slate-800/80 bg-slate-950">
        {activeRequests.map((req) => (
          <div
            key={req.id}
            onClick={() => handleOpenAction(req)}
            className="p-3.5 hover:bg-slate-900/60 active:bg-slate-900 transition-colors cursor-pointer flex items-start gap-3.5 select-none"
          >
            {/* Columna Izquierda: Foto, Nombre, Rating y Tiempo */}
            <div className="flex flex-col items-center text-center w-16 shrink-0 space-y-1">
              {req.passengerPhoto ? (
                <img
                  src={req.passengerPhoto}
                  alt={req.passengerName}
                  className="w-12 h-12 rounded-full object-cover border border-slate-700 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold text-sm shadow-sm">
                  {req.passengerName ? req.passengerName.charAt(0).toUpperCase() : <User className="w-6 h-6 text-slate-400" />}
                </div>
              )}
              <span className="text-xs font-bold text-white truncate max-w-full">
                {req.passengerName}
              </span>
              <div className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                <span>{req.rating}</span>
              </div>
              <span className="text-[9px] text-slate-500">
                ({req.ratingCount})
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {req.timeAgo}
              </span>
            </div>

            {/* Columna Central: Precio, Distancias y Direcciones */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Precio y etiqueta */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono tracking-tight">
                  ${req.price % 1 === 0 ? req.price : req.price.toFixed(2)}
                </span>
                {req.priceLabel && (
                  <span className="text-[11px] font-bold text-fuchsia-300 flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 rounded-full border border-fuchsia-400 text-center leading-none text-[9px]">
                      ^
                    </span>
                    <span>{req.priceLabel}</span>
                  </span>
                )}
              </div>

              {/* Distancia de recogida y Distancia del viaje */}
              <div className="flex items-center gap-3 text-[11px] text-slate-300">
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[9px] flex items-center justify-center border border-slate-700">
                    A
                  </span>
                  <span>~{req.pickupDistanceMeters} metro</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-slate-500">⚲</span>
                  <span>~{req.tripDistanceKm.toFixed(1).replace('.', ',')} km</span>
                </div>
              </div>

              {/* Origen */}
              <div className="text-xs font-semibold text-white line-clamp-1">
                {req.origin}
              </div>

              {/* Destino */}
              <div className="text-xs text-slate-400 line-clamp-1">
                {req.destination}
              </div>
            </div>

            {/* Botón Acción Lateral (3 puntos ⋮) */}
            <div className="shrink-0 pt-2">
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {activeRequests.length === 0 && (
          <div className="p-8 sm:p-10 text-center space-y-3">
            <div className={`w-16 h-16 mx-auto rounded-full border flex items-center justify-center ${
              driverOnline
                ? 'bg-amber-500/10 border-amber-500/30 animate-pulse'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <Radio className={`w-8 h-8 ${driverOnline ? 'text-amber-400' : 'text-slate-600'}`} />
            </div>
            <h4 className="text-sm font-bold text-white">
              {driverOnline
                ? 'Buscando solicitudes en tu radio de 1 km...'
                : 'Estás en modo Ocupado'}
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {driverOnline
                ? 'Cuando un pasajero cercano pida viaje, aparecerá inmediatamente aquí con su tarifa propuesta.'
                : 'Activa el botón "En línea" arriba para comenzar a recibir solicitudes de viajes cercanos.'}
            </p>

            {driverOnline && (
              <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/15 border border-amber-500/30 rounded-2xl text-left space-y-2 max-w-sm mx-auto animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Promoción Prelanzamiento: 30 Días Gratis</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    100 Primeros • Vence 31 Oct
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Rumbo a mi Destino está en despliegue piloto. Los primeros 100 conductores inscritos reciben <strong>30 DÍAS GRATIS de prueba ($0 cuota)</strong> hasta el 31 de octubre de 2026 (a partir del 1 de noviembre aplica periodo normal de 14 días). ¡Invita a colegas conductores y a tus pasajeros para multiplicar los viajes en tu zona!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const shareMsg = `🚘 ¡Aprovecha la Súper Promoción de Rumbo Conductor en El Salvador! 30 DÍAS GRATIS ($0 cuota) para los primeros 100 conductores inscritos hasta el 31 de Octubre de 2026: https://viajes.demiempresa.online/conductor`;
                    if (navigator.share) {
                      navigator.share({ title: 'Rumbo Conductor - 30 Días Gratis', text: shareMsg, url: 'https://viajes.demiempresa.online/conductor' }).catch(() => {});
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:brightness-110 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartir con Colegas por WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. MODAL DRAWER PARA TOMAR SOLICITUD O CONTRAOFERTAR */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-t-2 sm:border-2 border-amber-400 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-pop-bounce">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {selectedRequest.passengerPhoto ? (
                  <img
                    src={selectedRequest.passengerPhoto}
                    alt={selectedRequest.passengerName}
                    className="w-10 h-10 rounded-full object-cover border border-amber-400"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-amber-400 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {selectedRequest.passengerName ? selectedRequest.passengerName.charAt(0).toUpperCase() : <User className="w-5 h-5 text-slate-400" />}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedRequest.passengerName}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{selectedRequest.rating} ({selectedRequest.ratingCount} viajes)</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Detalles de Ruta */}
            <div className="bg-slate-950/80 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-800">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                  A
                </span>
                <div>
                  <span className="text-[10px] text-slate-400 block">Punto de Recogida (~{selectedRequest.pickupDistanceMeters} metros):</span>
                  <span className="text-white font-medium">{selectedRequest.origin}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                  B
                </span>
                <div>
                  <span className="text-[10px] text-slate-400 block">Punto de Destino (~{selectedRequest.tripDistanceKm} km):</span>
                  <span className="text-white font-medium">{selectedRequest.destination}</span>
                </div>
              </div>
            </div>

            {/* Opciones de Tarifa y Contraoferta */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Elige tu oferta para este viaje (100% Efectivo):
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[
                  selectedRequest.price,
                  selectedRequest.price + 0.50,
                  selectedRequest.price + 1.00,
                  selectedRequest.price + 1.50
                ].map((val, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCounterOfferAmount(val.toFixed(2))}
                    className={`py-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer ${
                      parseFloat(counterOfferAmount) === parseFloat(val.toFixed(2))
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    ${val.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleAcceptOffer(selectedRequest, parseFloat(counterOfferAmount))}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <Check className="w-5 h-5" />
                <span>Aceptar viaje por ${counterOfferAmount} USD</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Declinar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
