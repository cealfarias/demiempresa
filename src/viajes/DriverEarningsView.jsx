import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Coins,
  Calendar,
  Clock,
  Car,
  Fuel,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Star,
  CheckCircle2,
  Sparkles,
  MapPin,
  FileText,
  User
} from 'lucide-react';

export default function DriverEarningsView({
  driverProfile,
  fuelPrice = 5.13,
  kmPerGallon = 40
}) {
  const [timeframe, setTimeframe] = useState('TODAY'); // 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Obtener viajes completados reales almacenados en el dispositivo
  const completedTrips = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('rumbo_driver_completed_trips') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Construcción dinámica de estadísticas según los 4 ejes requeridos:
  // Hoy: Horas del día (06:00 a 22:00)
  // Semana: Días de la semana (Lun a Dom)
  // Mes: Fechas del mes (Día 1 al 30)
  // Año: Meses del año (Ene a Dic)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Lun, 6 = Dom
  const startOfWeek = new Date(startOfToday - dayOfWeek * 86400000).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  const buildDataset = (title, subtitle, tripFilter, pointsConfig) => {
    const filteredTrips = completedTrips.filter(tripFilter);
    const totalEarned = filteredTrips.reduce((acc, t) => acc + (parseFloat(t.fare) || 0), 0);
    const totalTrips = filteredTrips.length;
    const totalKm = filteredTrips.reduce((acc, t) => acc + (parseFloat(t.distanceKm) || 0), 0);

    const points = pointsConfig.map((cfg) => {
      const bucketTrips = filteredTrips.filter(cfg.match);
      const amount = bucketTrips.reduce((acc, t) => acc + (parseFloat(t.fare) || 0), 0);
      return {
        label: cfg.label,
        amount,
        trips: bucketTrips.length
      };
    });

    return {
      title,
      subtitle,
      totalEarned,
      totalTrips,
      totalKm: Math.round(totalKm * 10) / 10,
      points,
      recentTrips: filteredTrips.slice(0, 15)
    };
  };

  const todayHours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthDays = ['Día 1', 'Día 5', 'Día 10', 'Día 15', 'Día 20', 'Día 25', 'Día 30'];
  const yearMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const datasets = {
    TODAY: buildDataset(
      'Ingresos de Hoy',
      'Evolución por horas del día (06:00 a 22:00)',
      (t) => (t.timestamp || 0) >= startOfToday,
      todayHours.map((h) => {
        const hNum = parseInt(h.split(':')[0], 10);
        return {
          label: h,
          match: (t) => {
            const tHour = new Date(t.timestamp || 0).getHours();
            return tHour >= hNum - 1 && tHour < hNum + 1;
          }
        };
      })
    ),
    WEEK: buildDataset(
      'Ingresos de esta Semana',
      'Evolución por días de la semana (Lunes a Domingo)',
      (t) => (t.timestamp || 0) >= startOfWeek,
      weekDays.map((d, idx) => ({
        label: d,
        match: (t) => {
          const tDay = (new Date(t.timestamp || 0).getDay() + 6) % 7;
          return tDay === idx;
        }
      }))
    ),
    MONTH: buildDataset(
      'Ingresos de este Mes',
      'Evolución por fechas del mes (Día 1 al 31)',
      (t) => (t.timestamp || 0) >= startOfMonth,
      monthDays.map((m) => {
        const dayTarget = parseInt(m.replace('Día ', ''), 10);
        return {
          label: m,
          match: (t) => {
            const tDate = new Date(t.timestamp || 0).getDate();
            return tDate >= dayTarget && tDate < dayTarget + 5;
          }
        };
      })
    ),
    YEAR: buildDataset(
      'Ingresos de este Año',
      'Evolución por meses del año (Enero a Diciembre)',
      (t) => (t.timestamp || 0) >= startOfYear,
      yearMonths.map((m, idx) => ({
        label: m,
        match: (t) => new Date(t.timestamp || 0).getMonth() === idx
      }))
    )
  };

  const current = datasets[timeframe] || datasets.TODAY;
  const maxAmount = Math.max(...current.points.map((p) => p.amount), 1);

  // Estimación de combustible y ahorro con 0% de comisión (28% tradicional)
  const estimatedFuelGallons = current.totalKm / kmPerGallon;
  const estimatedFuelCost = estimatedFuelGallons * fuelPrice;
  const commissionSaved28Percent = current.totalEarned * 0.28;
  const netEarningsPocket = current.totalEarned - estimatedFuelCost;

  return (
    <div className="space-y-4 pb-20 animate-fade-in text-slate-100">
      
      {/* 1. SELECTOR TEMPORAL CON LOS 4 EJES EXACTOS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex gap-1 shadow-md">
        {[
          { id: 'TODAY', label: 'Hoy', desc: 'Horas del día' },
          { id: 'WEEK', label: 'Semana', desc: 'Días' },
          { id: 'MONTH', label: 'Mes', desc: 'Fechas' },
          { id: 'YEAR', label: 'Año', desc: 'Meses' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setTimeframe(tab.id);
              setHoveredPoint(null);
            }}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center leading-tight ${
              timeframe === tab.id
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[9px] font-normal ${timeframe === tab.id ? 'text-slate-900/80 font-semibold' : 'text-slate-500'}`}>
              {tab.desc}
            </span>
          </button>
        ))}
      </div>

      {/* 2. TARJETA PROTAGÓNICA: TOTAL INGRESOS 100% EFECTIVO */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/40 rounded-3xl p-5 shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>{current.title}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {current.totalTrips} viajes completados
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono tracking-tight drop-shadow-md">
            ${current.totalEarned.toFixed(2)}
          </span>
          <span className="text-sm font-bold text-emerald-200 uppercase tracking-wider">
            USD en mano
          </span>
        </div>

        <p className="text-xs text-slate-300">
          💰 <strong>100% de la ganancia en tu bolsa:</strong> En Rumbo no pagas comisiones por viaje.
        </p>

        {/* Tarjetas secundarias: Ahorro 0% vs Gasto Gasolina */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <div className="text-[10px] text-amber-300/80 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Ahorro 0% Comisión</span>
            </div>
            <div className="text-lg font-black text-amber-300 font-mono">
              +${commissionSaved28Percent.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Lo que otras apps te habrían quitado con el 28%.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>Gasolina Estimada</span>
            </div>
            <div className="text-lg font-black text-slate-200 font-mono">
              ~${estimatedFuelCost.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              ~{estimatedFuelGallons.toFixed(1)} gal. ({current.totalKm} km)
            </p>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICA INTERACTIVA SEGÚN EL EJE SELECCIONADO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Curva de Rendimiento</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {current.subtitle}
            </p>
          </div>
          {hoveredPoint && (
            <div className="text-right animate-fade-in bg-slate-950 px-2.5 py-1 rounded-xl border border-amber-500/40">
              <div className="text-xs font-black text-amber-300 font-mono">
                ${hoveredPoint.amount.toFixed(2)}
              </div>
              <div className="text-[9px] text-slate-400">
                {hoveredPoint.label} • {hoveredPoint.trips} viajes
              </div>
            </div>
          )}
        </div>

        {/* Gráfico de Barras SVG con escala dinámica */}
        <div className="pt-4">
          <div className="h-44 w-full flex items-end justify-between gap-1.5 px-2 relative border-b border-slate-800 pb-2">
            {current.points.map((pt, idx) => {
              const heightPct = Math.max(8, Math.round((pt.amount / maxAmount) * 88));
              const isHovered = hoveredPoint?.label === pt.label;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onTouchStart={() => setHoveredPoint(pt)}
                >
                  {/* Tooltip flotante con valor */}
                  <div
                    className={`text-[9px] font-mono font-bold mb-1 transition-opacity ${
                      isHovered || pt.amount > 0 ? 'text-amber-300 opacity-100' : 'text-slate-600 opacity-40'
                    }`}
                  >
                    ${pt.amount > 0 ? pt.amount.toFixed(0) : '0'}
                  </div>

                  {/* Barra */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[34px] rounded-t-lg transition-all duration-300 relative ${
                      isHovered
                        ? 'bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 shadow-lg shadow-amber-500/40 scale-y-105'
                        : pt.amount > 0
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400 hover:from-amber-500 hover:to-yellow-400'
                        : 'bg-slate-800/40'
                    }`}
                  >
                    {pt.amount > 0 && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-lg" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* EJE X: Etiquetas exactas requeridas */}
          <div className="flex justify-between gap-1.5 px-2 pt-2">
            {current.points.map((pt, idx) => (
              <div
                key={idx}
                className={`flex-1 text-center text-[10px] font-mono transition-colors ${
                  hoveredPoint?.label === pt.label
                    ? 'text-amber-400 font-black'
                    : 'text-slate-400'
                }`}
              >
                {pt.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Promedio por viaje: <strong className="text-white">${(current.totalEarned / Math.max(1, current.totalTrips)).toFixed(2)} USD</strong></span>
          <span className="text-emerald-400 font-bold">100% Efectivo</span>
        </div>
      </div>

      {/* 4. HISTORIAL DETALLADO DE VIAJES */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-black text-white">
              Historial de Viajes Realizados
            </h4>
          </div>
          <span className="text-xs text-amber-400 font-bold">
            {current.recentTrips.length > 0 ? `${current.recentTrips.length} carreras` : 'Verificados'}
          </span>
        </div>

        {current.recentTrips.length > 0 ? (
          <div className="space-y-3 pt-1">
            {current.recentTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 space-y-2.5 transition-colors"
              >
                {/* Cabecera del viaje */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {trip.photo ? (
                      <img
                        src={trip.photo}
                        alt={trip.passengerName}
                        className="w-9 h-9 rounded-full object-cover border border-amber-400/60"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-amber-400/60 flex items-center justify-center text-amber-400 font-bold text-xs">
                        {trip.passengerName ? trip.passengerName.charAt(0).toUpperCase() : <User className="w-4 h-4 text-slate-400" />}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{trip.passengerName}</span>
                        <span className="flex items-center text-[10px] text-amber-400 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{trip.passengerRating || 5.0}</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{trip.time}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-emerald-400 font-mono">
                      +${parseFloat(trip.fare).toFixed(2)}
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {trip.paymentMethod || '100% Efectivo'}
                    </span>
                  </div>
                </div>

                {/* Ruta de origen y destino */}
                <div className="bg-slate-900/60 rounded-xl p-2.5 space-y-1.5 text-[11px] border border-slate-800/60">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                      A
                    </span>
                    <span className="text-slate-300 line-clamp-1">{trip.origin}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                      B
                    </span>
                    <span className="text-slate-200 font-medium line-clamp-1">{trip.destination}</span>
                  </div>
                </div>

                {/* Pie de viaje: distancia y ahorro */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>Recorrido: {trip.distanceKm} km</span>
                  </span>
                  <span className="text-amber-400 font-bold">
                    Ahorraste ${parseFloat(trip.commissionSaved || trip.fare * 0.28).toFixed(2)} de comisión
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/70" />
            </div>
            <p className="font-bold text-slate-200 text-sm">
              Sin viajes registrados en este período
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Al completar carreras en línea, tus ganancias, recorridos y comisiones ahorradas se reflejarán automáticamente aquí con 0% de comisión.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
