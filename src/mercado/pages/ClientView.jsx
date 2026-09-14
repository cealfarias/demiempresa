import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { DEPARTAMENTOS, LINEAS_POR_DEPTO, PRODUCTOS, MERCADOS_DISPONIBLES } from '../data/mockData';
import { Utensils, Apple, Beef, ShoppingBag, Search, Plus, MapPin, Sparkles, Store, ShieldCheck } from 'lucide-react';

export default function ClientView({ onOpenCart }) {
  const { addToCart, cart, selectedMarket, setSelectedMarket } = useMercado();
  const [selectedDepto, setSelectedDepto] = useState('comida');
  const [selectedLinea, setSelectedLinea] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const getDeptoIcon = (iconName) => {
    if (iconName === 'Utensils') return <Utensils className="w-4 h-4" />;
    if (iconName === 'Apple') return <Apple className="w-4 h-4" />;
    if (iconName === 'Beef') return <Beef className="w-4 h-4" />;
    return <ShoppingBag className="w-4 h-4" />;
  };

  const currentLines = LINEAS_POR_DEPTO[selectedDepto] || [];

  const filteredProducts = PRODUCTOS.filter((p) => {
    const matchDepto = p.departamentoId === selectedDepto;
    const matchLinea = selectedLinea === 'todos' || p.lineaId === selectedLinea;
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.puestoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDepto && matchLinea && matchQuery;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      
      {/* Market Selector Bar */}
      <div className="bg-[#111C2E] border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00D09C]/20 text-[#00D09C] flex items-center justify-center font-bold">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Mercado de Origen</span>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="bg-[#0A1120] border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-[#00D09C] font-bold focus:outline-none"
            >
              {MERCADOS_DISPONIBLES.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.activo}>
                  {m.name} ({m.ciudad}) {!m.activo ? '- Próximamente' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="bg-[#00D09C]/15 text-[#00D09C] border border-[#00D09C]/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Radio Cobertura 5 km
          </span>
        </div>
      </div>

      {/* PWA Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#00D09C]/20 via-[#00D09C]/10 to-[#111C2E] border border-[#00D09C]/30 p-4 sm:p-6">
        <div className="max-w-2xl space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00D09C]/20 text-[#10E3B2] text-[10px] sm:text-xs font-bold border border-[#00D09C]/40">
            <Sparkles className="w-3 h-3 text-[#00D09C]" /> Recolección Centralizada & Retiro Pickup QR (48h)
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight">
            Tus puestos favoritos del Mercado San Miguelito a tu puerta
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300">
            Pupusas, sopas, verduras y carnes en una sola orden con pago seguro (Envío 5 km o Retiro Pickup).
          </p>
        </div>
      </div>

      {/* Department Selector */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Departamentos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    : 'bg-[#111C2E] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${dept.color} text-zinc-950 font-bold shrink-0`}>
                  {getDeptoIcon(dept.icon)}
                </div>
                <div className="min-w-0">
                  <h4 className={`font-bold text-xs truncate ${isSelected ? 'text-[#00D09C]' : 'text-slate-200'}`}>
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
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar pupusas, queso, aguacates, puestos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#111C2E] border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00D09C]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedLinea('todos')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedLinea === 'todos'
                ? 'bg-[#00D09C] text-[#0A1120] font-black'
                : 'bg-[#111C2E] text-slate-400 border border-slate-800 hover:text-slate-200'
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
                  : 'bg-[#111C2E] text-slate-400 border border-slate-800 hover:text-slate-200'
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
          <h3 className="text-xs sm:text-sm font-bold text-slate-200">Catálogo de Productos</h3>
          <span className="text-[10px] text-slate-500">{filteredProducts.length} disponibles</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-[#111C2E] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            No se encontraron productos para esta búsqueda en el Mercado.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((i) => i.id === product.id);
              return (
                <div
                  key={product.id}
                  className="bg-[#111C2E] border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#00D09C]/40 transition-all group"
                >
                  <div>
                    <div className="relative h-28 sm:h-32 overflow-hidden bg-[#0A1120]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-1.5 right-1.5 bg-[#0A1120]/90 border border-[#00D09C]/40 text-[#00D09C] font-black text-xs px-2 py-0.5 rounded-md backdrop-blur-md">
                        ${product.price.toFixed(2)}{' '}
                        <span className="text-[9px] font-normal text-slate-400">/{product.unit}</span>
                      </div>
                    </div>

                    <div className="p-2.5 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#00D09C]">
                        <MapPin className="w-3 h-3 shrink-0 text-[#00D09C]" />
                        <span className="truncate text-slate-300">{product.puestoName}</span>
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-100 group-hover:text-[#00D09C] transition-colors line-clamp-1">
                        {product.name}
                      </h4>

                      <p className="text-[10px] text-slate-400 line-clamp-1">{product.description}</p>
                      
                      <div className="text-[9px] text-slate-400 bg-[#0A1120] px-1.5 py-0.5 rounded border border-slate-800/80 inline-block font-mono">
                        Ubicación: {product.pasillo}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 pt-0">
                    <button
                      onClick={() => addToCart(product)}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                        inCartItem
                          ? 'bg-[#00D09C]/20 text-[#10E3B2] border border-[#00D09C]/40 hover:bg-[#00D09C]/30'
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

