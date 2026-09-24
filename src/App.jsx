import { Routes, Route, Navigate } from 'react-router-dom';
import MercadoApp from './mercado/MercadoApp';
import LandingPortal from './pages/LandingPortal';
import AsesoriaCreacionEmpresa from './pages/AsesoriaCreacionEmpresa';
import FacturacionDTEPage from './pages/FacturacionDTEPage';

function App() {
  const isSanMiguelito = typeof window !== 'undefined' && window.location.hostname.includes('sanmiguelito');

  return (
    <Routes>
      <Route path="/" element={isSanMiguelito ? <MercadoApp /> : <LandingPortal />} />
      <Route path="/portal" element={<LandingPortal />} />
      <Route path="/mercado" element={<MercadoApp />} />
      <Route path="/facturacion-dte" element={<FacturacionDTEPage />} />
      <Route path="/crear-empresa" element={<AsesoriaCreacionEmpresa />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
