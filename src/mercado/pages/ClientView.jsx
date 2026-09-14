import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { DEPARTAMENTOS, LINEAS_POR_DEPTO, PRODUCTOS, PUESTOS } from '../data/mockData';
import { Utensils, Apple, Beef, ShoppingBag, Search, Plus, MapPin, Sparkles, Filter, CheckCircle } from 'lucide-react';

export default function ClientView({ onOpenCart }) {
  const { addToCart, cart } = useMercado();
  const [selectedDepto, setSelectedDepto] = useState('comida');
  const [selectedLinea, setSelectedLinea] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Department icon resolver
  const getDeptoIcon = (iconName) => {
    if (iconName === 'Utensils') return <Utensils className="w-5 h-5" />;
    if (iconName === 'Apple') return <Apple className="w-5 h-5" />;
    if (iconName === 'Beef') return <Beef className="w-5 h-5" />;
    return <ShoppingBag className="w-5 h-5" />;
  };

  // Lines available for current department
  const currentLines = LINEAS_POR_DEPTO[selectedDepto] || [];

  // Filter products by department, line, search query
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
    <div className="space-y-6 pb-16">
      
      {/* PWA Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-600/10 to-zinc-900 border border-amber-500/30 p-6 md:p-8">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/40">
            <Sparkles className="w-3.5 h-3.5" /> PWA Directa sin descargas
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-tight">
            Los mejores puestos del Mercado San Miguelito a tu puerta
          </h2>
          <p className="text-xs md:text-sm text-zinc-300">
            Pide pupusas, verduras, carnes y lácteos en una sola orden. Nuestro recolector junta tus compras puesto por puesto y te los enviamos con pago anticipado seguro.
          </p>
        </div>
      </div>

      {/* Department Selector */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Departamentos del Mercado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEPARTAMENTOS.map((dept) => {
            const isSelected = selectedDepto === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDepto(dept.id);
                  setSelectedLinea('todos');
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dept.color} text-zinc-950 font-bold`}>
                  {getDeptoIcon(dept.icon)}
                </div>
                <div>
                  <h4 className={`font-bold text-xs ${isSelected ? 'text-amber-400' : 'text-zinc-200'}`}>
                    {dept.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {LINEAS_POR_DEPTO[dept.id]?.length || 0} líneas de producto
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar & Sublines Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar pupusas, aguacates, queso duro, puestos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Lines Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedLinea('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedLinea === 'todos'
                ? 'bg-zinc-100 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Todas las líneas
          </button>
          {currentLines.map((linea) => (
            <button
              key={linea.id}
              onClick={() => setSelectedLinea(linea.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedLinea === linea.id
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {linea.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-200">Catálogo de Productos</h3>
          <span className="text-xs text-zinc-500">{filteredProducts.length} productos disponibles</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-xs">
            No se encontraron productos para esta búsqueda en el Mercado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((i) => i.id === product.id);
              return (
                <div
                  key={product.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all group"
                >
                  <div>
                    {/* Image & Price Tag */}
                    <div className="relative h-40 overflow-hidden bg-zinc-950">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 right-2 bg-zinc-950/90 border border-amber-500/40 text-amber-400 font-extrabold text-sm px-2.5 py-1 rounded-lg backdrop-blur-md">
                        ${product.price.toFixed(2)}{' '}
                        <span className="text-[10px] font-normal text-zinc-400">/{product.unit}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{product.puestoName}</span>
                      </div>

                      <h4 className="font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">
                        {product.name}
                      </h4>

                      <p className="text-xs text-zinc-400 line-clamp-2">{product.description}</p>
                      
                      <div className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 inline-block">
                        📍 Ubicación: {product.pasillo}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="p-3.5 pt-0">
                    <button
                      onClick={() => addToCart(product)}
                      className={`w-full py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                        inCartItem
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-md'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {inCartItem ? `Agregar otro (${inCartItem.quantity} en carrito)` : 'Agregar al Pedido'}
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
