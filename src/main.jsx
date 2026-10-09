import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Registro de Service Worker para Notificaciones Push y PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('⚠️ Error registrando Service Worker:', err);
    });
  });
}

// Captura global de PWA install prompt para que esté disponible instantáneamente
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPwaInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa:installprompt_ready'));
});

