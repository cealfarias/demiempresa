import { Routes, Route, Navigate } from 'react-router-dom';
import MercadoApp from './mercado/MercadoApp';
import LandingPortal from './pages/LandingPortal';
import AsesoriaCreacionEmpresa from './pages/AsesoriaCreacionEmpresa';
import FacturacionDTEPage from './pages/FacturacionDTEPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MercadoApp />} />
      <Route path="/mercado" element={<MercadoApp />} />
      <Route path="/portal" element={<LandingPortal />} />
      <Route path="/facturacion-dte" element={<FacturacionDTEPage />} />
      <Route path="/crear-empresa" element={<AsesoriaCreacionEmpresa />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
