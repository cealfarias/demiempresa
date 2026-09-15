import React, { useState, useEffect } from 'react';
import { MercadoProvider, useMercado } from './context/MercadoContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import LoginModal from './components/LoginModal';
import LandingPage from './pages/LandingPage';
import ClientView from './pages/ClientView';
import CollectorView from './pages/CollectorView';
import DispatcherView from './pages/DispatcherView';
import AdminView from './pages/AdminView';
import OrderTrackingView from './pages/OrderTrackingView';

function MercadoContent() {
  const { currentRole } = useMercado();
  const [viewState, setViewState] = useState('pwa'); // 'pwa' (instant store) | 'tracking'
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    document.title = "Mercados Nacionales Delivery | Mercado San Miguelito - De tu mercado a tu puerta";
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A1120] text-slate-900 dark:text-slate-100 font-sans transition-colors selection:bg-[#00D09C] selection:text-[#0A1120]">
      {/* Navigation */}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setViewState('tracking')}
        onGoHome={() => setViewState('landing')}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Main Role Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {viewState === 'tracking' ? (
          <OrderTrackingView onBackToCatalog={() => setViewState('pwa')} />
        ) : (
          <>
            {currentRole === 'cliente' && <ClientView onOpenCart={() => setIsCartOpen(true)} />}
            {currentRole === 'recolector' && <CollectorView />}
            {currentRole === 'despachador' && <DispatcherView />}
            {currentRole === 'admin' && <AdminView />}
          </>
        )}
      </main>

      {/* Cart & Checkout Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => setViewState('pwa')}
      />
    </div>
  );
}

export default function MercadoApp() {
  return (
    <MercadoProvider>
      <MercadoContent />
    </MercadoProvider>
  );
}
