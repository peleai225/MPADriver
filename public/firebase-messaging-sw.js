/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCAtE67l5tUyTXcmlNLOru38xb0DtkKFZ4',
  authDomain: 'menuprodelivr.firebaseapp.com',
  projectId: 'menuprodelivr',
  storageBucket: 'menuprodelivr.firebasestorage.app',
  messagingSenderId: '588623912053',
  // TODO: remplacer par l'appId web
  appId: '1:588623912053:web:REPLACE_ME',
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
