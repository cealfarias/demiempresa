import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
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
  FileText
} from 'lucide-react';

export default function DriverEarningsView({
  driverProfile,
  fuelPrice = 5.13,
  kmPerGallon = 40
}) {
  const [timeframe, setTimeframe] = useState('TODAY'); // 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Estadísticas según el periodo exacto solicitado por el usuario:
  // Hoy: Eje X = Horas del día
  // Semana: Eje X = Días de la semana
  // Mes: Eje X = Fechas del mes
  // Año: Eje X = Meses del año
  const datasets = {
    TODAY: {
      title: 'Ingresos de Hoy',
      subtitle: 'Evolución por horas del día (06:00 a 22:00)',
      totalEarned: 58.50,
      totalTrips: 11,
      totalKm: 52.4,
      points: [
        { label: '06:00', amount: 8.50, trips: 2 },
        { label: '08:00', amount: 14.00, trips: 3 },
        { label: '10:00', amount: 9.50, trips: 2 },
        { label: '12:00', amount: 12.00, trips: 2 },
        { label: '14:00', amount: 0.00, trips: 0 },
        { label: '16:00', amount: 7.50, trips: 1 },
        { label: '18:00', amount: 7.00, trips: 1 },
        { label: '20:00', amount: 0.00, trips: 0 },
        { label: '22:00', amount: 0.00, trips: 0 }
      ],
      recentTrips: [
        {
          id: 'trip-1',
          passengerName: 'Isaias M.',
          passengerRating: 4.91,
          photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
          time: 'Hoy, 18:14',
          origin: '6a Avenida Norte 1702 (San Salvador)',
          destination: 'C. a Monserrat 1238 (San Salvador)',
          distanceKm: 4.6,
          fare: 4.00,
          paymentMethod: '100% Efectivo',
          commissionSaved: 1.12
        },
        {
          id: 'trip-2',
          passengerName: 'Giselle R.',
          passengerRating: 4.68,
          photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
          time: 'Hoy, 16:22',
          origin: 'Mercado San Miguelito (Avenida España)',
          destination: 'Imprime-T Mas (Soyapango)',
          distanceKm: 10.0,
          fare: 7.50,
          paymentMethod: '100% Efectivo',
          commissionSaved: 2.10
        },
        {
          id: 'trip-3',
          passengerName: 'Gloria C.',
          passengerRating: 4.69,
          photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
          time: 'Hoy, 12:45',
          origin: 'Calle y (San Salvador)',
          destination: 'Distrito Municipal Ciudad Delgado',
          distanceKm: 3.7,
          fare: 3.80,
          paymentMethod: '100% Efectivo',
          commissionSaved: 1.06
        },
        {
          id: 'trip-4',
          passengerName: 'Rafael H.',
          passengerRating: 4.85,
          photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
          time: 'Hoy, 08:30',
          origin: 'Colonia Miramonte',
          destination: 'Metrocentro San Salvador',
          distanceKm: 3.2,
          fare: 4.50,
          paymentMethod: '100% Efectivo',
          commissionSaved: 1.26
        }
      ]
    },
    WEEK: {
      title: 'Ingresos de esta Semana',
      subtitle: 'Evolución por días de la semana (Lunes a Domingo)',
      totalEarned: 384.50,
      totalTrips: 76,
      totalKm: 368.0,
      points: [
        { label: 'Lun', amount: 48.00, trips: 9 },
        { label: 'Mar', amount: 52.50, trips: 10 },
        { label: 'Mié', amount: 61.00, trips: 12 },
        { label: 'Jue', amount: 55.00, trips: 11 },
        { label: 'Vie', amount: 78.50, trips: 15 },
        { label: 'Sáb', amount: 84.00, trips: 16 },
        { label: 'Dom', amount: 45.50, trips: 9 }
      ],
      recentTrips: [
        {
          id: 'trip-w1',
          passengerName: 'Carlos M.',
          passengerRating: 4.95,
          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
          time: 'Ayer, 21:10',
          origin: 'Plaza Futura, Escalón',
          destination: 'Santa Elena, Antiguo Cuscatlán',
          distanceKm: 6.8,
          fare: 7.00,
          paymentMethod: '100% Efectivo',
          commissionSaved: 1.96
        },
        {
          id: 'trip-w2',
          passengerName: 'Marcela V.',
          passengerRating: 4.88,
          photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          time: 'Viernes, 19:40',
          origin: 'Multiplaza San Salvador',
          destination: 'Colonia Médica',
          distanceKm: 8.2,
          fare: 8.50,
          paymentMethod: '100% Efectivo',
          commissionSaved: 2.38
        }
      ]
    },
    MONTH: {
      title: 'Ingresos de este Mes',
      subtitle: 'Evolución por fechas del mes (Día 1 al 31)',
      totalEarned: 1620.00,
      totalTrips: 312,
      totalKm: 1540.0,
      points: [
        { label: 'Día 1', amount: 54.00, trips: 11 },
        { label: 'Día 5', amount: 62.00, trips: 12 },
        { label: 'Día 10', amount: 58.50, trips: 11 },
        { label: 'Día 15', amount: 74.00, trips: 15 },
        { label: 'Día 20', amount: 49.00, trips: 10 },
        { label: 'Día 25', amount: 66.50, trips: 13 },
        { label: 'Día 30', amount: 82.00, trips: 16 }
      ],
      recentTrips: []
    },
    YEAR: {
      title: 'Ingresos de este Año',
      subtitle: 'Evolución por meses del año (Enero a Diciembre)',
      totalEarned: 17450.00,
      totalTrips: 3420,
      totalKm: 16800.0,
      points: [
        { label: 'Ene', amount: 1320, trips: 260 },
        { label: 'Feb', amount: 1390, trips: 275 },
        { label: 'Mar', amount: 1480, trips: 290 },
        { label: 'Abr', amount: 1420, trips: 280 },
        { label: 'May', amount: 1510, trips: 298 },
        { label: 'Jun', amount: 1460, trips: 285 },
        { label: 'Jul', amount: 1530, trips: 300 },
        { label: 'Ago', amount: 1560, trips: 305 },
        { label: 'Sep', amount: 1490, trips: 292 },
        { label: 'Oct', amount: 1620, trips: 318 },
        { label: 'Nov', amount: 1680, trips: 325 },
        { label: 'Dic', amount: 1990, trips: 390 }
      ],
      recentTrips: []
    }
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
                    <img
                      src={trip.photo}
                      alt={trip.passengerName}
                      className="w-9 h-9 rounded-full object-cover border border-amber-400/60"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{trip.passengerName}</span>
                        <span className="flex items-center text-[10px] text-amber-400 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{trip.passengerRating}</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{trip.time}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-emerald-400 font-mono">
                      +${trip.fare.toFixed(2)}
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {trip.paymentMethod}
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
                    Ahorraste ${trip.commissionSaved.toFixed(2)} de comisión
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto mb-2" />
            <p className="font-semibold text-slate-200">
              Registros consolidados para este periodo
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Todos tus viajes se procesan con 0% de comisión y pago directo en efectivo.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
