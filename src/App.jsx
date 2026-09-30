import { Routes, Route, Navigate } from 'react-router-dom';
import MercadoApp from './mercado/MercadoApp';
import LandingPortal from './pages/LandingPortal';
import AsesoriaCreacionEmpresa from './pages/AsesoriaCreacionEmpresa';
import FacturacionDTEPage from './pages/FacturacionDTEPage';
import ViajesApp from './viajes/ViajesApp';
import DriverApp from './viajes/DriverApp';

function App() {
  const isSanMiguelito = typeof window !== 'undefined' && window.location.hostname.includes('sanmiguelito');
  const isViajes = typeof window !== 'undefined' && window.location.hostname.includes('viajes');

  const getDefaultRoute = () => {
    if (isViajes) return <ViajesApp />;
    if (isSanMiguelito) return <MercadoApp />;
    return <LandingPortal />;
  };

  return (
    <Routes>
      <Route path="/" element={getDefaultRoute()} />
      <Route path="/viajes" element={<ViajesApp />} />
      <Route path="/conductor" element={<DriverApp />} />
      <Route path="/portal" element={<LandingPortal />} />
      <Route path="/mercado" element={<MercadoApp />} />
      <Route path="/facturacion-dte" element={<FacturacionDTEPage />} />
      <Route path="/crear-empresa" element={<AsesoriaCreacionEmpresa />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
