import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken, API_BASE } from './api';

declare global {
  interface Window { Pusher: typeof Pusher; }
}
window.Pusher = Pusher;

let echoInstance: InstanceType<typeof Echo> | null = null;
let initPromise: Promise<InstanceType<typeof Echo> | null> | null = null;

export async function getEcho(): Promise<InstanceType<typeof Echo> | null> {
  if (echoInstance) return echoInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (!res.ok) return null;
      const data = await res.json();
      const pusherKey = data?.pusher?.key;
      const pusherCluster = data?.pusher?.cluster ?? 'ap2';
      if (!pusherKey) return null;

      echoInstance = new Echo({
        broadcaster: 'pusher',
        key: pusherKey,
        cluster: pusherCluster,
        forceTLS: true,
        authEndpoint: `${API_BASE}/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        },
      });
      return echoInstance;
    } catch {
      return null;
    }
  })();

  return initPromise;
}

export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
    initPromise = null;
  }
}

function reconnectEcho(): void {
  if (!echoInstance) return;
  try {
    const connector = echoInstance.connector as any;
    const pusher = connector?.pusher;
    if (pusher && typeof pusher.connect === 'function') {
      if (pusher.connection?.state !== 'connected') {
        pusher.connect();
      }
    }
  } catch {}
}

function refreshAuthHeaders(): void {
  if (!echoInstance) return;
  try {
    const token = getToken();
    if (!token) return;
    const connector = echoInstance.connector as any;
    if (connector?.pusher?.config?.auth?.headers) {
      connector.pusher.config.auth.headers.Authorization = `Bearer ${token}`;
    }
    if ((echoInstance.options as any)?.auth?.headers) {
      (echoInstance.options as any).auth.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshAuthHeaders();
      reconnectEcho();
    }
  });

  window.addEventListener('online', () => {
    refreshAuthHeaders();
    reconnectEcho();
  });
}

export async function listenNewDelivery(city: string, cb: () => void): Promise<() => void> {
  const echo = await getEcho();
  if (!echo) return () => {};
  const slug = city.toLowerCase().replace(/\s+/g, '-');
  const ch = echo.channel(`drivers.city.${slug}`);
  ch.listen('.delivery.available', cb);
  return () => ch.stopListening('.delivery.available', cb);
}

export async function listenDriverAssigned(driverId: number, cb: (data: any) => void): Promise<() => void> {
  const echo = await getEcho();
  if (!echo) return () => {};
  const ch = echo.private(`driver.${driverId}`);
  ch.listen('.driver.assigned', cb);
  return () => ch.stopListening('.driver.assigned', cb);
}

export async function listenDeliveryStatus(driverId: number, cb: (data: any) => void): Promise<() => void> {
  const echo = await getEcho();
  if (!echo) return () => {};
  const ch = echo.private(`driver.${driverId}`);
  ch.listen('.delivery.status_changed', cb);
  return () => ch.stopListening('.delivery.status_changed', cb);
}
