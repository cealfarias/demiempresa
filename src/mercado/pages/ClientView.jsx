import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { DEPARTAMENTOS, LINEAS_POR_DEPTO, MERCADOS_DISPONIBLES } from '../data/mockData';
import { Utensils, Apple, Beef, ShoppingBag, Search, Plus, MapPin, Sparkles, Store, Sprout, Smartphone, ShieldCheck, Tag } from 'lucide-react';

export default function ClientView({ onOpenCart }) {
  const { addToCart, cart, selectedMarket, setSelectedMarket, products } = useMercado();
  const [selectedDepto, setSelectedDepto] = useState('agromercado-mag');
  const [selectedLinea, setSelectedLinea] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const getDeptoIcon = (iconName) => {
    if (iconName === 'Sprout') return <Sprout className="w-4 h-4" />;
    if (iconName === 'Utensils') return <Utensils className="w-4 h-4" />;
    if (iconName === 'Apple') return <Apple className="w-4 h-4" />;
    if (iconName === 'Beef') return <Beef className="w-4 h-4" />;
    if (iconName === 'Smartphone') return <Smartphone className="w-4 h-4 text-white" />;
    return <ShoppingBag className="w-4 h-4" />;
  };

  const currentLines = LINEAS_POR_DEPTO[selectedDepto] || [];

  const filteredProducts = (products || []).filter((p) => {
    // Market filter: if 'todos', show all markets; otherwise match marketId or allow MAG products if MAG selected
    const matchMarket = selectedMarket === 'todos' || !p.mercadoId || p.mercadoId === selectedMarket || (selectedMarket.startsWith('agromercado') && p.mercadoType === 'mag');
    const matchDepto = selectedDepto === 'todos' || p.departamentoId === selectedDepto;
    const matchLinea = selectedLinea === 'todos' || p.lineaId === selectedLinea;
    const matchQuery =
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.puestoName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.badge || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchMarket && matchDepto && matchLinea && matchQuery;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 font-sans">
      
      {/* Market Selector Bar */}
      <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl bg-[#00D09C]/20 text-[#00D09C] flex items-center justify-center font-bold shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Mercado u Origen Seleccionado</span>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full sm:w-auto bg-slate-100 dark:bg-[#0A1120] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-[#00D09C] font-black focus:outline-none cursor-pointer"
            >
              {MERCADOS_DISPONIBLES.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.activo}>
                  {m.name} ({m.ciudad}) {!m.activo ? '- Próximamente' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <span className="bg-[#00D09C]/15 text-[#00D09C] border border-[#00D09C]/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5" /> Red Nacional (14 Departamentos)
          </span>
        </div>
      </div>

      {/* AgroMercado MAG Banner Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-[#0A1120] border border-[#00D09C]/40 p-4 sm:p-6 text-white shadow-lg">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00D09C]/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D09C] text-[#0A1120] text-xs font-black tracking-wide">
            <Sprout className="w-4 h-4" /> 🟢 OFICIAL: AGROMERCADOS MAG - PRODUCTOR DIRECTO
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Canasta Básica a Precios Justos: <span className="text-[#00D09C]">Combos de $1.00</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Abastécete con productos agrícolas sin intermediarios: 25 tomates x $1.00, 10 cebollas x $1.00, Frijol de Seda a $0.75/lb y cartón de huevos frescos directo a tu puerta.
          </p>
        </div>
      </div>

      {/* Department Selector */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Departamentos & Rubros</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {DEPARTAMENTOS.map((dept) => {
            const isSelected = selectedDepto === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDepto(dept.id);
                  setSelectedLinea('todos');
                }}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-[#00D09C]/15 border-[#00D09C] shadow-glow-mint ring-1 ring-[#00D09C]/50'
                    : 'bg-white dark:bg-[#111C2E] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
                }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${dept.color} text-slate-950 font-bold shrink-0`}>
                  {getDeptoIcon(dept.icon)}
                </div>
                <div className="min-w-0">
                  <h4 className={`font-bold text-xs truncate ${isSelected ? 'text-[#00D09C]' : 'text-slate-800 dark:text-slate-200'}`}>
                    {dept.name}
                  </h4>
                  <p className="text-[9px] text-slate-400 truncate">
                    {LINEAS_POR_DEPTO[dept.id]?.length || 0} líneas
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar & Sublines Filter */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en la red nacional (tomates $1.00, pupusas, audífonos Hula Hula, frijoles...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#00D09C] shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedLinea('todos')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedLinea === 'todos'
                ? 'bg-[#00D09C] text-[#0A1120] font-black'
                : 'bg-white dark:bg-[#111C2E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
            }`}
          >
            Todas las líneas
          </button>
          {currentLines.map((linea) => (
            <button
              key={linea.id}
              onClick={() => setSelectedLinea(linea.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedLinea === linea.id
                  ? 'bg-[#00D09C] text-[#0A1120] font-black'
                  : 'bg-white dark:bg-[#111C2E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
              }`}
            >
              {linea.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            Catálogo de la Red de Abasto
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold px-2 py-0.5 rounded-full">
              {filteredProducts.length} disponibes
            </span>
          </h3>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs shadow-sm">
            No se encontraron productos para esta búsqueda en el mercado seleccionado.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((i) => i.id === product.id);
              const isMag = product.mercadoType === 'mag' || product.departamentoId === 'agromercado-mag';
              return (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-[#111C2E] border rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#00D09C] transition-all group shadow-sm hover:shadow-md ${
                    isMag ? 'border-emerald-500/40 dark:border-emerald-500/30' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="relative h-28 sm:h-36 overflow-hidden bg-slate-100 dark:bg-[#0A1120]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.badge && (
                        <div className="absolute top-1.5 left-1.5 bg-[#00D09C] text-[#0A1120] font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                          {product.badge}
                        </div>
                      )}
                      <div className="absolute bottom-1.5 right-1.5 bg-[#0A1120]/90 border border-[#00D09C]/40 text-[#00D09C] font-black text-xs px-2 py-0.5 rounded-md backdrop-blur-md">
                        ${product.price.toFixed(2)}{' '}
                        <span className="text-[9px] font-normal text-slate-400">/{product.unit}</span>
                      </div>
                    </div>

                    <div className="p-2.5 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#00D09C]">
                        <MapPin className="w-3 h-3 shrink-0 text-[#00D09C]" />
                        <span className="truncate text-slate-700 dark:text-slate-300">
                          {product.mercadoName || 'Mercado Nacional'} • {product.puestoName}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#00D09C] transition-colors line-clamp-2 leading-tight">
                        {product.name}
                      </h4>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">{product.description}</p>
                      
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#0A1120] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800/80 inline-block font-mono">
                        {product.pasillo}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 pt-0">
                    <button
                      onClick={() => addToCart(product)}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                        inCartItem
                          ? 'bg-[#00D09C]/20 text-[#00D09C] border border-[#00D09C]/40 hover:bg-[#00D09C]/30'
                          : 'bg-[#00D09C] text-[#0A1120] hover:bg-[#10E3B2] shadow-glow-mint'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {inCartItem ? `(${inCartItem.quantity})` : 'Agregar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
