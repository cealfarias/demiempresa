import React, { useState } from 'react';
import { MercadoProvider, useMercado } from './context/MercadoContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import ClientView from './pages/ClientView';
import CollectorView from './pages/CollectorView';
import DispatcherView from './pages/DispatcherView';
import AdminView from './pages/AdminView';
import OrderTrackingView from './pages/OrderTrackingView';

function MercadoContent() {
  const { currentRole } = useMercado();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackingView, setIsTrackingView] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Navigation */}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingView(true)}
      />

      {/* Main Role Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {isTrackingView ? (
          <OrderTrackingView onBackToCatalog={() => setIsTrackingView(false)} />
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
