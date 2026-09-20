/* eslint-disable no-undef */
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

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'MENUPRO Livraison';
  const body = payload.notification?.body || 'Nouvelle notification';
  const icon = '/logo.png';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag: 'menupro-delivery',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
