import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken, API_BASE } from './api';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

window.Pusher = Pusher;

let echoInstance: InstanceType<typeof Echo> | null = null;

export async function getEcho(): Promise<InstanceType<typeof Echo> | null> {
  if (echoInstance) return echoInstance;

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
}

export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
