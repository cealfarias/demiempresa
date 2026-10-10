import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MercadoApp from './mercado/MercadoApp';
import LandingPortal from './pages/LandingPortal';
import AsesoriaCreacionEmpresa from './pages/AsesoriaCreacionEmpresa';
import FacturacionDTEPage from './pages/FacturacionDTEPage';
import ViajesApp from './viajes/ViajesApp';
import DriverApp from './viajes/DriverApp';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { sendTelemetryEventApi } from './viajes/api';

function GlobalTelemetryTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return;

    let role = 'VISITOR';
    if (path.startsWith('/conductor')) role = 'DRIVER';
    else if (path.startsWith('/viajes') || (typeof window !== 'undefined' && window.location.hostname.includes('viajes'))) role = 'PASSENGER';

    sendTelemetryEventApi({
      eventType: 'PAGE_VIEW',
      role,
      durationSeconds: 0,
      metadata: { path, search: location.search }
    });
  }, [location.pathname]);

  return null;
}

function App() {
  const isSanMiguelito = typeof window !== 'undefined' && window.location.hostname.includes('sanmiguelito');
  const isViajes = typeof window !== 'undefined' && window.location.hostname.includes('viajes');

  const getDefaultRoute = () => {
    if (isViajes) return <ViajesApp />;
    if (isSanMiguelito) return <MercadoApp />;
    return <LandingPortal />;
  };

  return (
    <>
      <GlobalTelemetryTracker />
      <Routes>
      <Route path="/" element={getDefaultRoute()} />
      <Route path="/viajes" element={<ViajesApp />} />
      <Route path="/conductor" element={<DriverApp />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/portal" element={<LandingPortal />} />
      <Route path="/mercado" element={<MercadoApp />} />
      <Route path="/facturacion-dte" element={<FacturacionDTEPage />} />
      <Route path="/crear-empresa" element={<AsesoriaCreacionEmpresa />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
