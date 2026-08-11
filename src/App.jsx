import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPortal from './pages/LandingPortal';
import AsesoriaCreacionEmpresa from './pages/AsesoriaCreacionEmpresa';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPortal />} />
      <Route path="/portal" element={<LandingPortal />} />
      <Route path="/crear-empresa" element={<AsesoriaCreacionEmpresa />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
