import React, { useState } from 'react';
import { useMercado } from '../context/MercadoContext';
import { PUESTOS, DEPARTAMENTOS, LINEAS_POR_DEPTO } from '../data/mockData';
import { apiService } from '../services/apiService';
import { ShieldCheck, DollarSign, HeartHandshake, Store, Edit2, Bike, Car, Footprints, AlertOctagon, QrCode, CheckCircle2, AlertTriangle, Plus, Trash2, Download, Upload, RefreshCw, Database } from 'lucide-react';

export default function AdminView() {
  const { orders, repartidores, updateOrderStatus, products, addProduct, updateProduct, deleteProduct, refreshDataFromService } = useMercado();
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  const [scannedQR, setScannedQR] = useState('');
  const [qrScanResult, setQrScanResult] = useState(null);

  // New product form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    puestoName: 'Pupusería Doña Chilo',
    pasillo: 'Pasillo 3, Puesto #42',
    departamentoId: 'comida',
    lineaId: 'pupusas',
    price: '',
    unit: 'unidad',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
    description: ''
  });

  // Export / Import state
  const [importJson, setImportJson] = useState('');
  const [jsonMessage, setJsonMessage] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiConfig, setApiConfig] = useState(() => apiService.getApiConfig());

  // Financial Metrics with 10% App Commission
  const totalSales = orders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? o.total : 0), 0);
  const totalAppCommission = orders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? (o.appCommission || 0) : 0), 0);
  const totalTipsShared = orders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? o.tip : 0), 0);

  // Orders with incidents/emergencias reported
  const ordersWithIncidents = orders.filter((o) => o.incidents && o.incidents.length > 0);

  const handlePriceSave = (productId) => {
    const parsed = parseFloat(tempPrice);
    if (!isNaN(parsed) && parsed > 0) {
      const prodToUpdate = products.find(p => p.id === productId);
      if (prodToUpdate) {
        updateProduct({ ...prodToUpdate, price: parsed });
      }
    }
    setEditingPriceId(null);
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price) return;
    addProduct({
      ...newProd,
      price: parseFloat(newProd.price) || 0
    });
    setNewProd({
      name: '',
      puestoName: 'Pupusería Doña Chilo',
      pasillo: 'Pasillo 3, Puesto #42',
      departamentoId: 'comida',
      lineaId: 'pupusas',
      price: '',
      unit: 'unidad',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
      description: ''
    });
    setShowAddModal(false);
  };

  const handleExportData = () => {
    const jsonStr = apiService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mercado-san-miguelito-datos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    if (!importJson.trim()) return;
    const res = apiService.importAllData(importJson);
    setJsonMessage(res);
    if (res.success) {
      refreshDataFromService();
      setTimeout(() => setJsonMessage(null), 4000);
    }
  };

  const handleSaveApiConfig = (e) => {
    e.preventDefault();
    apiService.setApiConfig(apiConfig);
    setShowConfigModal(false);
  };

  const handleQRVerify = (e) => {
    e.preventDefault();
    const foundOrder = orders.find(
      (o) => o.qrCode === scannedQR || o.id === scannedQR || `QR-${o.id}` === scannedQR
    );

    if (foundOrder) {
      updateOrderStatus(foundOrder.id, 'Entregado (Pickup Validado)');
      setQrScanResult({ success: true, order: foundOrder });
    } else {
      setQrScanResult({ success: false, message: 'Código QR no encontrado o expirado.' });
    }
  };

  const getVehicleBadge = (tipo) => {
    if (tipo === 'apie') return <span className="bg-[#00D09C]/20 text-[#00D09C] border border-[#00D09C]/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Footprints className="w-3 h-3" /> Runner (A pie)</span>;
    if (tipo === 'bicicleta') return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Bici</span>;
    if (tipo === 'moto') return <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Bike className="w-3 h-3" /> Moto</span>;
    return <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Car className="w-3 h-3" /> Carro</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-500/20 via-purple-600/10 to-[#111C2E] border border-indigo-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-bold border border-indigo-500/40">
            <ShieldCheck className="w-3 h-3 text-indigo-400" /> Mesa de Acopio & Supervisión
          </div>
          <h2 className="text-base sm:text-xl font-black text-slate-100 mt-1">
            Panel de Control Mercado San Miguelito
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Supervisión de inventario real, runners, despacho a 5 km y sincronización API.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportData}
            className="px-3 py-1.5 bg-[#111C2E] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#00D09C]" /> Exportar JSON
          </button>
          <button
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="px-3 py-1.5 bg-[#00D09C]/15 hover:bg-[#00D09C]/25 border border-[#00D09C]/40 text-[#00D09C] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Database className="w-3.5 h-3.5" /> API / Config
          </button>
        </div>
      </div>

      {/* API Config Modal / Drawer */}
      {showConfigModal && (
        <div className="bg-[#111C2E] border border-[#00D09C]/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#00D09C]" /> Conexión a API & Backend Server
            </h3>
            <button onClick={() => setShowConfigModal(false)} className="text-xs text-slate-400 hover:text-white">✕ Cerrar</button>
          </div>
          <form onSubmit={handleSaveApiConfig} className="space-y-2.5">
            <div>
              <label className="text-[10px] text-slate-400 block font-bold mb-1">Base URL de API (REST / Supabase / Express)</label>
              <input
                type="text"
                placeholder="https://api.demiempresa.online/v1/mercado"
                value={apiConfig.baseUrl}
                onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#00D09C]"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block font-bold mb-1">API Key / Authorization Token</label>
              <input
                type="password"
                placeholder="Bearer msm_sec_..."
                value={apiConfig.apiKey}
                onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#00D09C]"
              />
            </div>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#00D09C] text-[#0A1120] font-black text-xs rounded-lg hover:bg-[#10E3B2] transition-all"
              >
                Guardar Conexión API
              </button>
            </div>
          </form>

          {/* Import JSON Area */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-300">Importar Carga Masiva (JSON)</h4>
            <textarea
              rows={2}
              placeholder="Pegar JSON de datos guardados..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="w-full bg-[#0A1120] border border-slate-700 rounded-lg p-2 text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            {jsonMessage && (
              <p className={`text-[10px] font-bold ${jsonMessage.success ? 'text-[#00D09C]' : 'text-rose-400'}`}>
                {jsonMessage.message}
              </p>
            )}
            <button
              type="button"
              onClick={handleImportData}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition-all"
            >
              Cargar Datos
            </button>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-[#111C2E] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Ventas Totales</span>
            <DollarSign className="w-3.5 h-3.5 text-[#00D09C]" />
          </div>
          <p className="text-base sm:text-xl font-black text-slate-100">${totalSales.toFixed(2)}</p>
          <p className="text-[9px] text-slate-500">Procesado en app</p>
        </div>

        <div className="bg-[#111C2E] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Ganancia App (10%)</span>
            <DollarSign className="w-3.5 h-3.5 text-[#00D09C]" />
          </div>
          <p className="text-base sm:text-xl font-black text-[#00D09C]">${totalAppCommission.toFixed(2)}</p>
          <p className="text-[9px] text-[#00D09C]/80">Comisión 10%</p>
        </div>

        <div className="bg-[#111C2E] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Propinas Equipo</span>
            <HeartHandshake className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-base sm:text-xl font-black text-cyan-400">${totalTipsShared.toFixed(2)}</p>
          <p className="text-[9px] text-slate-500">División 50/50</p>
        </div>

        <div className="bg-[#111C2E] border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Productos Activos</span>
            <Store className="w-3.5 h-3.5 text-[#00D09C]" />
          </div>
          <p className="text-base sm:text-xl font-black text-slate-100">{products.length}</p>
          <p className="text-[9px] text-[#00D09C]">En inventario real</p>
        </div>
      </div>

      {/* Protocol Incident Alerts */}
      {ordersWithIncidents.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
            <AlertOctagon className="w-4 h-4" /> Alertas de Emergencias e Incidencias en Ruta ({ordersWithIncidents.length})
          </div>
          <div className="space-y-1.5">
            {ordersWithIncidents.map((order) => (
              <div key={order.id} className="bg-[#0A1120] p-2.5 rounded-xl border border-amber-500/30 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-200">Orden #{order.id} ({order.customerName})</span>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded">Atención Requerida</span>
                </div>
                {order.incidents.map((inc) => (
                  <p key={inc.id} className="text-[11px] text-slate-300 font-mono">
                    • [{inc.timestamp}] {inc.note}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pickup QR Validation Station */}
      <div className="bg-[#111C2E] border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-[#00D09C]" /> Validador de Retiro en Punto (Pickup QR)
        </h3>

        <form onSubmit={handleQRVerify} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Escanear o ingresar código QR (Ej: QR-MSM-1001)"
            value={scannedQR}
            onChange={(e) => setScannedQR(e.target.value)}
            className="flex-1 bg-[#0A1120] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#00D09C]"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-[#00D09C] text-[#0A1120] font-black text-xs rounded-xl hover:bg-[#10E3B2] transition-all shadow-glow-mint"
          >
            Validar Entrega
          </button>
        </form>

        {qrScanResult && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            qrScanResult.success ? 'bg-[#00D09C]/10 border-[#00D09C]/40 text-[#00D09C]' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
          }`}>
            {qrScanResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>
              {qrScanResult.success
                ? `¡Validación Exitosa! Orden #${qrScanResult.order.id} entregada al cliente ${qrScanResult.order.customerName}.`
                : qrScanResult.message}
            </span>
          </div>
        )}
      </div>

      {/* Puesto Price & Product Management */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Inventario Real de Puestos del Mercado San Miguelito ({products.length})
          </h3>
          <button
            onClick={() => setShowAddModal(!showAddModal)}
            className="px-2.5 py-1 bg-[#00D09C] hover:bg-[#10E3B2] text-[#0A1120] font-black text-xs rounded-lg flex items-center gap-1 transition-all shadow-glow-mint"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Producto Real
          </button>
        </div>

        {/* Add Product Form Modal */}
        {showAddModal && (
          <form onSubmit={handleCreateProduct} className="bg-[#111C2E] border border-[#00D09C]/40 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-extrabold text-[#00D09C] uppercase tracking-wider">Nuevo Producto de Puesto Real</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sopa de Pata con Verduras"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Puesto / Comerciante</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Comedero Doña Mary"
                  value={newProd.puestoName}
                  onChange={(e) => setNewProd({ ...newProd, puestoName: e.target.value })}
                  className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Ubicación / Pasillo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pasillo 2, Puesto #14"
                  value={newProd.pasillo}
                  onChange={(e) => setNewProd({ ...newProd, pasillo: e.target.value })}
                  className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Precio ($ USD)</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  placeholder="3.50"
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                  className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Unidad de Medida</label>
                <input
                  type="text"
                  placeholder="plato, lb, unidad, mano"
                  value={newProd.unit}
                  onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                  className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Departamento</label>
                <select
                  value={newProd.departamentoId}
                  onChange={(e) => setNewProd({ ...newProd, departamentoId: e.target.value })}
                  className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none"
                >
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block font-bold mb-0.5">URL Imagen del Producto</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={newProd.image}
                onChange={(e) => setNewProd({ ...newProd, image: e.target.value })}
                className="w-full bg-[#0A1120] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 bg-slate-900 text-slate-400 text-xs font-bold rounded-lg border border-slate-700 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-[#00D09C] text-[#0A1120] font-black text-xs rounded-lg hover:bg-[#10E3B2] transition-all"
              >
                Guardar en Inventario Real
              </button>
            </div>
          </form>
        )}

        <div className="bg-[#111C2E] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#0A1120] text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="p-2.5">Producto</th>
                  <th className="p-2.5">Puesto / Vendedor</th>
                  <th className="p-2.5">Pasillo</th>
                  <th className="p-2.5">Precio</th>
                  <th className="p-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-bold text-slate-100 flex items-center gap-2">
                      {p.image && <img src={p.image} alt={p.name} className="w-6 h-6 rounded object-cover" />}
                      <span>{p.name}</span>
                    </td>
                    <td className="p-2.5 text-[#00D09C] font-bold">{p.puestoName}</td>
                    <td className="p-2.5 text-slate-400">{p.pasillo}</td>
                    <td className="p-2.5 font-black text-[#00D09C]">
                      {editingPriceId === p.id ? (
                        <input
                          type="number"
                          step="0.05"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="w-16 bg-[#0A1120] border border-[#00D09C] rounded px-1.5 py-0.5 text-xs text-[#00D09C] focus:outline-none"
                        />
                      ) : (
                        `$${p.price.toFixed(2)} / ${p.unit || 'unidad'}`
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {editingPriceId === p.id ? (
                          <button
                            onClick={() => handlePriceSave(p.id)}
                            className="bg-[#00D09C] text-[#0A1120] text-[10px] font-black px-2 py-0.5 rounded hover:bg-[#10E3B2]"
                          >
                            Guardar
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPriceId(p.id);
                              setTempPrice(p.price.toString());
                            }}
                            className="bg-slate-900 text-slate-300 hover:text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Editar
                          </button>
                        )}
                        <button
                          onClick={() => deleteProduct(p.id)}
                          title="Eliminar producto de inventario"
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
