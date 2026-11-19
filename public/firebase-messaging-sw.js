/* eslint-disable no-undef */
/*
 * Réception des notifications push app fermée.
 * Ce fichier est importé dans le service worker principal (sw.js généré par Workbox, voir
 * vite.config.ts → workbox.importScripts) : c'est ce service worker qui détient l'abonnement push.
 *
 * Les pushs envoyés par le serveur contiennent un bloc `notification` : le SDK Firebase les
 * affiche lui-même (titre, icône, vibration, requireInteraction définis côté serveur) et ouvre
 * le lien `fcm_options.link` au clic (/?open=deliveries, /?open=active-delivery,
 * /?open=dashboard pour une course annulée, /?open=parcels pour une nouvelle course colis).
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

/*
 * Compteur sur l'icône de l'app (comme WhatsApp), mis à jour app fermée.
 * n = data.badge envoyé par le serveur (courses disponibles / à traiter pour ce livreur) ;
 * à défaut, nombre de notifications MenuPro encore affichées. 0 → on efface.
 * L'app efface le compteur quand elle revient au premier plan (src/lib/badge.ts).
 */
async function updateAppBadge(payload) {
  try {
    if (!self.navigator || typeof self.navigator.setAppBadge !== 'function') return;
    let n = parseInt(payload && payload.data ? payload.data.badge : '', 10);
    if (!Number.isFinite(n) || n < 0) {
      // Le SDK a déjà affiché (await) la notification avant d'appeler onBackgroundMessage.
      const shown = await self.registration.getNotifications();
      n = shown.length;
    }
    if (n > 0) await self.navigator.setAppBadge(n);
    else if (typeof self.navigator.clearAppBadge === 'function') await self.navigator.clearAppBadge();
  } catch (e) {
    // Badging API absente ou refusée : sans conséquence.
  }
}

function linkForType(type) {
  if (type === 'new_delivery') return '/?open=deliveries';
  if (type === 'delivery_cancelled') return '/?open=dashboard';
  // Colis : même liens que ceux envoyés par le serveur (ParcelDriverNotification).
  if (type === 'new_parcel') return '/?open=parcels';
  if (type === 'parcel_cancelled') return '/?open=deliveries';
  return '/?open=active-delivery';
}

// Appelé pour TOUS les messages reçus app en arrière-plan / fermée, y compris ceux qui ont un
// bloc `notification` (déjà affichés par le SDK : on ne les réaffiche pas, on met juste le badge à jour).
// Le SDK attend (await) la promesse retournée : le service worker reste éveillé jusqu'au bout.
messaging.onBackgroundMessage(async (payload) => {
  const data = payload.data || {};

  if (!payload.notification) {
    // Données seules : le SDK ne les affiche pas, on s'en charge.
    const isNewOrder = data.type === 'new_delivery' || data.type === 'new_parcel';
    const isCancelled = data.type === 'delivery_cancelled' || data.type === 'parcel_cancelled';
    const isParcel = data.kind === 'parcel' || /parcel/.test(data.type || '');
    const fallbackTitle = isCancelled
      ? (isParcel ? 'Course colis annulée' : 'Course annulée')
      : (data.type === 'new_parcel' ? 'Nouvelle course colis' : 'MENUPRO Livraison');
    try {
      await self.registration.showNotification(data.title || fallbackTitle, {
        body: data.body || (isCancelled ? 'Une course a été annulée.' : 'Nouvelle notification'),
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        tag: data.parcel_reference
          ? `parcel-${data.parcel_reference}`
          : (data.delivery_id ? `delivery-${data.delivery_id}` : 'menupro-delivery'),
        renotify: true,
        requireInteraction: true,
        vibrate: isNewOrder || isCancelled ? [0, 500, 300, 500, 300, 500] : [200, 100, 200],
        data: { link: linkForType(data.type) },
      });
    } catch (e) {}
  }

  await updateAppBadge(payload);
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
