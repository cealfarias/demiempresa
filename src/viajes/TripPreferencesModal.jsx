import React from 'react';
import {
  X,
  Wind,
  Dog,
  Users,
  Briefcase,
  Check,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';
import { PASSENGER_WEIGHT_PROFILES, calculateCabinWeight } from './fuelService';

export default function TripPreferencesModal({
  isOpen,
  onClose,
  preferences,
  onChange,
  suggestedFare,
  proposedFare,
  onRequireSuggestedFare
}) {
  if (!isOpen) return null;

  const {
    airConditioning = true,
    petFriendly = false,
    passengers = 1, // 1 a 4 o 5+
    weightProfile = 'NORMAL',
    extraLuggage = false
  } = preferences;

  const isMoreThan4 = passengers > 4;
  const cabinWeight = calculateCabinWeight(passengers, weightProfile, extraLuggage);

  const handleToggleAc = () => {
    const nextState = !airConditioning;
    if (nextState) {
      // Política: El A/C activa automáticamente la tarifa sugerida
      if (onRequireSuggestedFare) {
        onRequireSuggestedFare();
      }
      onChange({ ...preferences, airConditioning: true });
    } else {
      onChange({ ...preferences, airConditioning: false });
    }
  };

  const handleTogglePet = () => {
    onChange({ ...preferences, petFriendly: !petFriendly });
  };

  const handleSetPassengers = (count) => {
    onChange({
      ...preferences,
      passengers: count,
      needsVanOrMicrobus: count > 4
    });
  };

  const handleSetWeightProfile = (profileKey) => {
    onChange({
      ...preferences,
      weightProfile: profileKey
    });
  };

  const handleToggleLuggage = () => {
    onChange({ ...preferences, extraLuggage: !extraLuggage });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Preferencias del Viaje</h3>
              <p className="text-[11px] text-slate-400">Calibración justa para chofer y pasajero</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Opciones */}
        <div className="space-y-3 text-xs">
          
          {/* Opción 1: Aire Acondicionado con Política Estricta */}
          <div
            onClick={handleToggleAc}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
              airConditioning
                ? 'bg-cyan-950/30 border-cyan-500/50 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  airConditioning ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-500'
                }`}>
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>Aire Acondicionado (A/C)</span>
                    <span className="text-[10px] text-cyan-400 font-normal">(+15% motor)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Viaje fresco con ventilación/clima encendido</div>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                airConditioning ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black' : 'border-slate-700 bg-slate-900'
              }`}>
                {airConditioning && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* Política Clara del A/C */}
            <div className="pt-2 border-t border-slate-800/80 text-[10px] leading-tight flex items-start gap-1.5 text-cyan-300 font-medium">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400 mt-0.5" />
              <span>
                <strong>Política:</strong> El A/C solo aplica con tarifa sugerida (${suggestedFare || '2.50'}) o superior. Al activarlo, se habilita automáticamente la tarifa sugerida.
              </span>
            </div>
          </div>

          {/* Opción 2: Cantidad de Pasajeros (>4 requiere Camioneta o Microbús) */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-lime-400" />
                <span className="font-bold text-white text-xs">Cantidad de Pasajeros</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                isMoreThan4 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'
              }`}>
                {isMoreThan4 ? '5+ (Camioneta / Microbús)' : `${passengers} persona(s)`}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSetPassengers(num)}
                  className={`py-2 rounded-xl font-bold transition-all text-xs cursor-pointer border ${
                    passengers === num
                      ? 'bg-lime-500 text-slate-950 border-lime-400 shadow-md font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}

              {/* Botón especial para más de 4 personas */}
              <button
                type="button"
                onClick={() => handleSetPassengers(5)}
                className={`py-2 rounded-xl font-bold transition-all text-xs cursor-pointer border col-span-1 ${
                  isMoreThan4
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-md font-black'
                    : 'bg-slate-900 border-slate-800 text-amber-400 hover:border-amber-500/50'
                }`}
              >
                5+
              </button>
            </div>

            {/* Aviso especial cuando son más de 4 personas */}
            {isMoreThan4 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2 animate-fade-in">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Vehículo Especial Requerido:</strong> Despacharemos tu solicitud exclusivamente a conductores con <strong>camioneta SUV grande de 3 filas o microbús</strong> para que viajen cómodos.
                </span>
              </div>
            )}
          </div>

          {/* Opción 3: Contextura / Peso Promedio de los Pasajeros */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs">Contextura de Pasajeros</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {PASSENGER_WEIGHT_PROFILES[weightProfile]?.label || 'Estándar'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Permite calcular el esfuerzo del motor en pendientes y la gasolina exacta.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
              {[
                { key: 'LIGHT', label: 'Delgada', sub: '~58 kg', icon: '🏃' },
                { key: 'NORMAL', label: 'Normal', sub: '~75 kg', icon: '🚶' },
                { key: 'HEAVY', label: 'Robusta', sub: '~100 kg', icon: '🏋️' },
                { key: 'OBESE', label: 'Pesada', sub: '~125 kg', icon: '⚖️' }
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSetWeightProfile(opt.key)}
                  className={`p-2 rounded-xl transition-all cursor-pointer border text-left flex flex-col justify-between ${
                    weightProfile === opt.key
                      ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold ring-1 ring-emerald-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="text-base mb-1">{opt.icon}</div>
                  <div className="text-xs font-bold leading-tight">{opt.label}</div>
                  <div className="text-[10px] text-slate-500">{opt.sub}</div>
                </button>
              ))}
            </div>

            {/* Píldora de Carga Total Estimada */}
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span>⚖️ Carga estimada:</span>
                <strong className="text-white font-mono">~{cabinWeight.totalWeightKg} kg</strong>
                {extraLuggage && <span className="text-purple-400">(incluye baúl)</span>}
              </span>
              <span className={`font-mono font-bold ${cabinWeight.excessWeightKg > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {cabinWeight.excessWeightKg > 0
                  ? `+${((cabinWeight.weightConsumptionFactor - 1) * 100).toFixed(1)}% gas`
                  : 'Carga estándar'}
              </span>
            </div>
          </div>

          {/* Opción 4: Equipaje o Cargas Extras */}
          <div
            onClick={handleToggleLuggage}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              extraLuggage
                ? 'bg-purple-950/30 border-purple-500/50 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                extraLuggage ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-900 text-slate-500'
              }`}>
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-xs">Equipaje Extra o Baúl Lleno (+35 kg)</div>
                <div className="text-[11px] text-slate-400">Maletas grandes, compras o bultos pesados</div>
              </div>
            </div>

            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              extraLuggage ? 'bg-purple-500 border-purple-400 text-slate-950 font-black' : 'border-slate-700 bg-slate-900'
            }`}>
              {extraLuggage && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>

          {/* Opción 5: Mascota (Pet Friendly) */}
          <div
            onClick={handleTogglePet}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              petFriendly
                ? 'bg-amber-950/30 border-amber-500/50 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                petFriendly ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-500'
              }`}>
                <Dog className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-xs">Viajo con Mascota (Pet Friendly)</div>
                <div className="text-[11px] text-slate-400">Perro o gato en transportadora o en falda</div>
              </div>
            </div>

            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              petFriendly ? 'bg-amber-500 border-amber-400 text-slate-950 font-black' : 'border-slate-700 bg-slate-900'
            }`}>
              {petFriendly && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>

        </div>

        {/* Botón Confirmar */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-lime-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>GUARDAR PREFERENCIAS</span>
        </button>

      </div>
    </div>
  );
}
