import React from 'react';
import {
  X,
  Wind,
  Dog,
  Users,
  Briefcase,
  Check,
  Sparkles,
  Info
} from 'lucide-react';

export default function TripPreferencesModal({
  isOpen,
  onClose,
  preferences,
  onChange
}) {
  if (!isOpen) return null;

  const {
    airConditioning = true,
    petFriendly = false,
    passengers = 1, // 1 a 4 o 5+
    extraLuggage = false
  } = preferences;

  const isMoreThan4 = passengers > 4;

  const handleToggleAc = () => {
    onChange({ ...preferences, airConditioning: !airConditioning });
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

  const handleToggleLuggage = () => {
    onChange({ ...preferences, extraLuggage: !extraLuggage });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Preferencias del Viaje</h3>
              <p className="text-[11px] text-slate-400">Personaliza tu viaje sin costo oculto</p>
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
          
          {/* Opción 1: Aire Acondicionado */}
          <div
            onClick={handleToggleAc}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              airConditioning
                ? 'bg-cyan-950/30 border-cyan-500/50 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                airConditioning ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-500'
              }`}>
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-xs">Aire Acondicionado (A/C)</div>
                <div className="text-[11px] text-slate-400">Viaje fresco con ventilación/clima encendido</div>
              </div>
            </div>

            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              airConditioning ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black' : 'border-slate-700 bg-slate-900'
            }`}>
              {airConditioning && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>

          {/* Opción 2: Mascota (Pet Friendly) */}
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

          {/* Opción 3: Cantidad de Pasajeros (>4 requiere Camioneta o Microbús) */}
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
                <div className="font-bold text-white text-xs">Equipaje Extra o Baúl Lleno</div>
                <div className="text-[11px] text-slate-400">Maletas grandes, compras o bultos volumétricos</div>
              </div>
            </div>

            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              extraLuggage ? 'bg-purple-500 border-purple-400 text-slate-950 font-black' : 'border-slate-700 bg-slate-900'
            }`}>
              {extraLuggage && <Check className="w-4 h-4 stroke-[3]" />}
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
