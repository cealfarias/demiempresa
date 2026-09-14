import React, { useState } from 'react';
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
  const [viewState, setViewState] = useState('landing'); // 'landing' | 'pwa' | 'tracking'
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // If user opens landing, show LandingPage
  if (viewState === 'landing') {
    return (
      <>
        <LandingPage
          onOpenPWA={() => setViewState('pwa')}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={() => setViewState('pwa')}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
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
