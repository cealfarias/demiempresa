import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Navigation, CheckCircle, Loader2, Info } from 'lucide-react';

export default function PickupMapModal({
  isOpen,
  onClose,
  initialCoords = { lat: 13.7013, lng: -89.2244 },
  initialAddress = '',
  onConfirm
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleRef = useRef(null);

  const [currentCoords, setCurrentCoords] = useState(initialCoords);
  const [address, setAddress] = useState(initialAddress || 'San Salvador, El Salvador');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Inicializar o destruir el mapa Leaflet
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Evitar reinicializar si ya existe
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialCoords.lat, initialCoords.lng],
        zoom: 16,
        zoomControl: false
      });

      // Capa de mapa moderna CartoDB Voyager / OpenStreetMap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(map);

      // Círculo visual de 1 km (Radio estricto de despacho)
      const circle = L.circle([initialCoords.lat, initialCoords.lng], {
        color: '#F59E0B',      // Ámbar
        fillColor: '#F59E0B',
        fillOpacity: 0.12,
        radius: 1000           // 1 km exacto en metros
      }).addTo(map);
      circleRef.current = circle;

      // Al mover el mapa, actualizar centro y radio
      map.on('move', () => {
        const center = map.getCenter();
        circle.setLatLng(center);
      });

      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentCoords({ lat: center.lat, lng: center.lng });
        fetchReverseGeocode(center.lat, center.lng);
      });

      mapInstanceRef.current = map;
      // Iniciar primera geocodificación
      fetchReverseGeocode(initialCoords.lat, initialCoords.lng);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        circleRef.current = null;
      }
    };
  }, [isOpen]);

  // Geocodificación inversa con Nominatim OpenStreetMap
  const fetchReverseGeocode = async (lat, lng) => {
    setIsLoadingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        const street = data.address?.road || data.address?.pedestrian || data.address?.neighbourhood || '';
        const suburb = data.address?.suburb || data.address?.residential || data.address?.city_district || '';
        const city = data.address?.city || data.address?.town || data.address?.municipality || 'San Salvador';

        let formatted = [street, suburb, city].filter(Boolean).join(', ');
        if (!formatted) formatted = data.display_name.split(',').slice(0, 3).join(',');

        setAddress(formatted);
      }
    } catch (err) {
      console.warn('Error en reverse geocode:', err);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Botón centrar en GPS del teléfono
  const handleCenterGps = () => {
    if (!navigator.geolocation) return;
    setIsGettingGps(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);
        }
        setIsGettingGps(false);
      },
      () => {
        setIsGettingGps(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    onConfirm({
      address,
      lat: currentCoords.lat,
      lng: currentCoords.lng
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full h-full sm:h-[85vh] sm:max-w-2xl bg-slate-900 border border-slate-800 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Cabecera */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
          {/* Tarjeta de dirección actual detectada */}
          <div className="bg-slate-900/95 border border-slate-700 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto max-w-[80%] flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Punto de Recogida
              </span>
              <p className="text-xs font-bold text-white truncate">
                {isLoadingAddress ? 'Detectando dirección...' : address}
              </p>
            </div>
            {isLoadingAddress && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />}
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-slate-300 hover:text-white pointer-events-auto shadow-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor del Mapa Leaflet */}
        <div className="relative flex-1 w-full h-full">
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

          {/* PIN CENTRAL FIJO (Estilo inDriver / Uber) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[999] flex flex-col items-center">
            <div className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500 shadow-lg whitespace-nowrap mb-1 flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Punto de Recogida</span>
            </div>
            {/* Ícono de Pin con sombra */}
            <div className="relative">
              <MapPin className="w-10 h-10 text-amber-500 fill-amber-500 filter drop-shadow-md" />
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full absolute top-2 left-[15px]"></div>
            </div>
            <div className="w-3 h-1 bg-black/40 rounded-full blur-[1px]"></div>
          </div>

          {/* Botón Flotante: Mi Ubicación GPS */}
          <button
            onClick={handleCenterGps}
            disabled={isGettingGps}
            title="Ubicarme con GPS"
            className="absolute bottom-28 right-4 z-[1000] p-3 rounded-2xl bg-slate-900/95 border border-slate-700 text-slate-200 hover:text-amber-400 shadow-2xl transition-all cursor-pointer flex items-center justify-center"
          >
            {isGettingGps ? (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Barra Inferior de Acción y Regla de 1 km */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 sm:p-5 z-[1000] space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              El círculo ámbar indica el <strong>radio de 1 km</strong> donde buscaremos choferes disponibles para evitar gasto excesivo de combustible.
            </span>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>CONFIRMAR ESTE PUNTO DE RECOGIDA</span>
          </button>
        </div>

      </div>
    </div>
  );
}
