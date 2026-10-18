/* eslint-disable no-undef */
/*
 * Réception des notifications push app fermée.
 * Ce fichier est importé dans le service worker principal (sw.js généré par Workbox, voir
 * vite.config.ts → workbox.importScripts) : c'est ce service worker qui détient l'abonnement push.
 *
 * Les pushs envoyés par le serveur contiennent un bloc `notification` : le SDK Firebase les
 * affiche lui-même (titre, icône, vibration, requireInteraction définis côté serveur) et ouvre
 * le lien `fcm_options.link` au clic (/?open=deliveries ou /?open=active-delivery).
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBzuD3GslwU2eCCksKx5ABB_Izc4AEQ-Z8',
  authDomain: 'menuprodelivr.firebaseapp.com',
  projectId: 'menuprodelivr',
  storageBucket: 'menuprodelivr.firebasestorage.app',
  messagingSenderId: '588623912053',
  appId: '1:588623912053:web:ef957000a57e24f52aac3c',
});

const messaging = firebase.messaging();

// Messages sans bloc `notification` (données seules) : le SDK ne les affiche pas, on s'en charge.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;

  const isNewOrder = payload.data?.type === 'new_delivery';
  self.registration.showNotification(payload.data?.title || 'MENUPRO Livraison', {
    body: payload.data?.body || 'Nouvelle notification',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: payload.data?.delivery_id ? `delivery-${payload.data.delivery_id}` : 'menupro-delivery',
    requireInteraction: true,
    vibrate: isNewOrder ? [0, 500, 300, 500, 300, 500] : [200, 100, 200],
    data: { link: isNewOrder ? '/?open=deliveries' : '/?open=active-delivery' },
  });
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  if (data.FCM_MSG) return; // notification affichée par le SDK : il gère le clic

  event.notification.close();
  const target = new URL(data.link || '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
          return client.navigate(target).then((c) => c && c.focus());
        }
      }
      return clients.openWindow(target);
    })
  );
});
