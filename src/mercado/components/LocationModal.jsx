import React, { useState, useEffect } from 'react';
import { useMercado } from '../context/MercadoContext';
import { DEPARTAMENTOS_ELSALVADOR } from '../data/locationData';
import { MERCADOS_DISPONIBLES } from '../data/mockData';
import { MapPin, X, Check, Store, Sprout, Compass } from 'lucide-react';

export default function LocationModal({ isOpen, onClose }) {
  const { userLocation, setUserLocation, selectedMarket, setSelectedMarket } = useMercado();

  const [selectedDeptId, setSelectedDeptId] = useState(userLocation?.departamentoId || 'san-salvador');
  const [selectedDistrito, setSelectedDistrito] = useState(userLocation?.distrito || 'San Salvador Centro (Distritos 1-6)');
  const [chosenMarketId, setChosenMarketId] = useState(selectedMarket || 'sanmiguelito');

  const currentDeptObj = DEPARTAMENTOS_ELSALVADOR.find(d => d.id === selectedDeptId) || DEPARTAMENTOS_ELSALVADOR[0];
  const distritosList = currentDeptObj.distritos || [];

  // Filter markets matching the selected department or general national markets
  const nearbyMarkets = MERCADOS_DISPONIBLES.filter(m => {
    if (m.id === 'todos') return true;
    if (m.departamentoId === selectedDeptId) {
      return true;
    }
    return false;
  }).sort((a, b) => {
    // Sort district matches first
    const distClean = (selectedDistrito || '').toLowerCase();
    const aMatch = (a.distrito || '').toLowerCase().includes(distClean) || distClean.includes((a.distrito || '').toLowerCase());
    const bMatch = (b.distrito || '').toLowerCase().includes(distClean) || distClean.includes((b.distrito || '').toLowerCase());
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  // Handle department change -> reset district to first available
  const handleDeptChange = (e) => {
    const newDeptId = e.target.value;
    setSelectedDeptId(newDeptId);
    const deptObj = DEPARTAMENTOS_ELSALVADOR.find(d => d.id === newDeptId);
    if (deptObj && deptObj.distritos.length > 0) {
      setSelectedDistrito(deptObj.distritos[0]);
    }
  };

  // If nearbyMarkets has active matches and current chosenMarket isn't in nearbyMarkets, select first available match
  useEffect(() => {
    const match = nearbyMarkets.find(m => m.id === chosenMarketId);
    if (!match && nearbyMarkets.length > 0) {
      setChosenMarketId(nearbyMarkets[0].id);
    }
  }, [selectedDeptId, selectedDistrito]);

  if (!isOpen) return null;

  const handleSave = () => {
    setUserLocation({
      departamentoId: selectedDeptId,
      departamentoName: currentDeptObj.name,
      distrito: selectedDistrito
    });
    setSelectedMarket(chosenMarketId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#111C2E]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00D09C]/20 text-[#00D09C] flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Selecciona tu Ubicación en El Salvador
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Puntos de Venta Directos MAG y Mercados Municipales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* STEP 1: Departamento & Distrito */}
          <div className="space-y-3 bg-slate-100 dark:bg-[#0A1120] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#00D09C]" /> 1. Tu Departamento y Distrito
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Departamento Select */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Departamento
                </label>
                <select
                  value={selectedDeptId}
                  onChange={handleDeptChange}
                  className="w-full bg-white dark:bg-[#111C2E] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00D09C]"
                >
                  {DEPARTAMENTOS_ELSALVADOR.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Distrito Select */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Distrito
                </label>
                <select
                  value={selectedDistrito}
                  onChange={(e) => setSelectedDistrito(e.target.value)}
                  className="w-full bg-white dark:bg-[#111C2E] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00D09C]"
                >
                  {distritosList.map((dist, idx) => (
                    <option key={idx} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Mercados y AgroMercados Cercanos Disponibles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[#00D09C]" /> 2. Mercados & AgroMercados MAG Cercanos
              </h4>
              <span className="text-[10px] font-mono text-[#00D09C] bg-[#00D09C]/10 px-2 py-0.5 rounded border border-[#00D09C]/30">
                {nearbyMarkets.length} disponibles
              </span>
            </div>

            {nearbyMarkets.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-[#111C2E] rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                No hay un mercado registrado directamente en este distrito, pero puedes seleccionar la <strong>Red Nacional Completa</strong>.
              </div>
            ) : (
              <div className="space-y-2">
                {nearbyMarkets.map((m) => {
                  const isSelected = chosenMarketId === m.id;
                  const isMag = m.tipo === 'mag';
                  return (
                    <div
                      key={m.id}
                      onClick={() => setChosenMarketId(m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#00D09C]/15 border-[#00D09C] shadow-glow-mint'
                          : 'bg-white dark:bg-[#111C2E] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isMag ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {isMag ? <Sprout className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {m.name}
                          </h5>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {m.ubicacion ? `📍 ${m.ubicacion} (${m.distrito})` : `${m.ciudad || m.departamento} • ${m.distrito}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {m.badge && (
                          <span className="hidden sm:inline-block bg-[#00D09C] text-[#0A1120] font-black text-[9px] px-1.5 py-0.5 rounded">
                            {m.badge}
                          </span>
                        )}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'bg-[#00D09C] border-[#00D09C] text-[#0A1120]' : 'border-slate-400'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111C2E] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-black bg-[#00D09C] hover:bg-[#10E3B2] text-[#0A1120] transition-colors shadow-glow-mint flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Confirmar Ubicación y Mercado
          </button>
        </div>

      </div>
    </div>
  );
}
