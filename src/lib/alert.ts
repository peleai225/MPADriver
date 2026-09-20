/** Vibre le téléphone (motif court-long pour une nouvelle course) */
export function vibrate(pattern: number[] = [200, 100, 200]): void {
  try { navigator.vibrate?.(pattern); } catch {}
}

/** Notification système navigateur (fonctionne même app en arrière-plan) */
export function notify(title: string, body: string, onClick?: () => void): void {
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'driver-alert',
      requireInteraction: true,
    });
    if (onClick) n.onclick = () => { window.focus(); n.close(); onClick(); };
  } catch {}
}

/** Demande la permission notifications si pas encore accordée */
export async function requestNotificationPermission(): Promise<void> {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

let alertAudio: HTMLAudioElement | null = null;

export function playAlert(): void {
  try {
    if (!alertAudio) {
      alertAudio = new Audio('/sounds/new-order.mp3');
      alertAudio.preload = 'auto';
    }
    alertAudio.currentTime = 0;
    alertAudio.play().catch(() => {});
  } catch {}
}
