import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Navigation, CheckCircle, Loader2, Search } from 'lucide-react';
import { evaluateSalvadoranTraffic, calculateRoadDistance } from './fuelService';

export default function DestinationMapModal({
  isOpen,
  onClose,
  initialCoords = { lat: 13.6738, lng: -89.2789 },
  initialAddress = '',
  originCoords = null,
  onConfirm
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [currentCoords, setCurrentCoords] = useState(initialCoords);
  const [address, setAddress] = useState(initialAddress || 'Santa Tecla, La Libertad');
  const [detectedMunicipality, setDetectedMunicipality] = useState('Santa Tecla');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [routeDistanceInfo, setRouteDistanceInfo] = useState({ distanceKm: null, durationMinutes: null });

  // Inicializar o destruir el mapa Leaflet
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialCoords.lat, initialCoords.lng],
        zoom: 16,
        zoomControl: false
      });

      // Capa de mapa oficial de OpenStreetMap (100% gratuita, sin API key)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      map.on('click', (e) => {
        map.panTo(e.latlng);
      });

      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentCoords({ lat: center.lat, lng: center.lng });
        fetchReverseGeocode(center.lat, center.lng);
      });

      mapInstanceRef.current = map;
      fetchReverseGeocode(initialCoords.lat, initialCoords.lng);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Geocodificación inversa con Nominatim
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
        const city = data.address?.city || data.address?.town || data.address?.municipality || 'Santa Tecla';
        const county = data.address?.county || '';

        let formatted = [street, suburb, city].filter(Boolean).join(', ');
        if (!formatted) formatted = data.display_name.split(',').slice(0, 3).join(',');

        setAddress(formatted);

        // Detectar municipio salvadoreño para el feed publicitario B2B
        const rawTown = `${city} ${suburb} ${county} ${data.display_name}`.toLowerCase();
        if (rawTown.includes('tecla')) {
          setDetectedMunicipality('Santa Tecla');
        } else if (rawTown.includes('antiguo') || rawTown.includes('cuscatl')) {
          setDetectedMunicipality('Antiguo Cuscatlán');
        } else if (rawTown.includes('soyapango')) {
          setDetectedMunicipality('Soyapango');
        } else if (rawTown.includes('mejicanos')) {
          setDetectedMunicipality('Mejicanos');
        } else if (rawTown.includes('apopa')) {
          setDetectedMunicipality('Apopa');
        } else if (rawTown.includes('ilopango')) {
          setDetectedMunicipality('Ilopango');
        } else {
          setDetectedMunicipality('San Salvador');
        }

        // Calcular distancia y tiempo real en carretera desde originCoords
        const effectiveOrigin = originCoords || { lat: 13.7013, lng: -89.2244 };
        calculateRoadDistance(effectiveOrigin, { lat, lng })
          .then((route) => {
            if (route) {
              setRouteDistanceInfo({
                distanceKm: route.distanceKm,
                durationMinutes: route.durationMinutes
              });
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.warn('Error en reverse geocode destino:', err);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Buscar lugar por texto en El Salvador (Nominatim Search)
  const handleSearchPlace = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', El Salvador'
        )}&limit=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const { lat, lon } = results[0];
          mapInstanceRef.current.setView([parseFloat(lat), parseFloat(lon)], 16);
        }
      }
    } catch (err) {
      console.warn('Error al buscar destino:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Botón centrar en GPS
  const handleCenterGps = () => {
    if (!navigator.geolocation) return;
    setIsGettingGps(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
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
      lng: currentCoords.lng,
      municipality: detectedMunicipality,
      distanceKm: routeDistanceInfo.distanceKm,
      durationMinutes: routeDistanceInfo.durationMinutes
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full h-full sm:h-[85vh] sm:max-w-2xl bg-slate-900 border border-slate-800 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Cabecera Flotante */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
          
          <div className="flex items-center justify-between gap-2">
            {/* Tarjeta de dirección de destino detectada */}
            <div className="bg-slate-900/95 border border-slate-700 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto flex-1 flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <div className="overflow-hidden flex-1">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">
                  Punto de Destino ({detectedMunicipality})
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {isLoadingAddress ? 'Detectando destino...' : address}
                </p>
              </div>
              {isLoadingAddress && <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin flex-shrink-0" />}
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-slate-300 hover:text-white pointer-events-auto shadow-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Búsqueda Rápida de Destino */}
          <form onSubmit={handleSearchPlace} className="pointer-events-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lugar (ej. Metrocentro, Plaza Merliot, Hospital Bloom)..."
                className="w-full pl-9 pr-10 py-2 bg-slate-900/95 border border-slate-700 backdrop-blur-md rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-400 shadow-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 top-1 px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ir'}
              </button>
            </div>
          </form>

        </div>

        {/* Contenedor del Mapa Leaflet */}
        <div className="relative flex-1 w-full h-full">
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

          {/* PIN CENTRAL FIJO ROJO (Destino) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[999] flex flex-col items-center">
            <div className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-rose-500 shadow-lg whitespace-nowrap mb-1 flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Punto de Destino</span>
            </div>
            {/* Ícono de Pin Rose */}
            <div className="relative">
              <MapPin className="w-10 h-10 text-rose-500 fill-rose-500 filter drop-shadow-md" />
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full absolute top-2 left-[15px]"></div>
            </div>
            <div className="w-3 h-1 bg-black/40 rounded-full blur-[1px]"></div>
          </div>

          {/* Botón Flotante: Mi Ubicación GPS */}
          <button
            onClick={handleCenterGps}
            disabled={isGettingGps}
            title="Centrar en mi ubicación"
            className="absolute bottom-24 right-4 z-[1000] p-3 rounded-2xl bg-slate-900/95 border border-slate-700 text-slate-200 hover:text-rose-400 shadow-2xl transition-all cursor-pointer flex items-center justify-center"
          >
            {isGettingGps ? (
              <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Barra Inferior de Confirmación & Estado del Tráfico */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 sm:p-5 z-[1000] space-y-2">
          {(() => {
            const trafficStatus = evaluateSalvadoranTraffic(originCoords, currentCoords, routeDistanceInfo.durationMinutes || 15);
            return (
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Municipio: <strong className="text-rose-400">{detectedMunicipality}</strong></span>
                {routeDistanceInfo.distanceKm ? (
                  <span className="font-bold text-amber-300">
                    📍 {routeDistanceInfo.distanceKm} km • ~{routeDistanceInfo.durationMinutes} min
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5 font-bold" style={{ color: trafficStatus.trafficColor }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: trafficStatus.trafficColor }} />
                  <span>{trafficStatus.trafficLabel}</span>
                </span>
              </div>
            );
          })()}

          <button
            onClick={handleConfirm}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>CONFIRMAR ESTE DESTINO</span>
          </button>
        </div>

      </div>
    </div>
  );
}
