// Service Worker oficial de Rumbo (demiempresa.online)
// Soporte para Notificaciones Push Web en segundo plano (PWA)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escuchar evento push entrante desde el servidor backend
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Rumbo a mi Destino',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Rumbo a mi Destino';
  const options = {
    body: data.body || 'Tienes una nueva actualización en tu viaje.',
    icon: data.icon || '/rumbo-logo.png',
    badge: data.badge || '/favicon.svg',
    image: data.image || undefined,
    tag: data.tag || 'rumbo-alert',
    renotify: true,
    requireInteraction: data.requireInteraction !== false, // Mantener en pantalla hasta que el usuario interactúe
    vibrate: data.vibrate || [300, 100, 300, 100, 300],
    data: {
      url: data.data?.url || data.url || '/viajes',
      timestamp: Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Ver en Rumbo' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejar clic en la notificación: enfocar ventana abierta o abrir una nueva
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/viajes';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestaña abierta de demiempresa, enfocarla
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url.includes('/viajes') || client.url.includes('/conductor')) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Si no hay ninguna abierta, abrir una nueva ventana
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
