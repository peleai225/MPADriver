/** Vibre le téléphone (motif court-long pour une nouvelle course) */
export function vibrate(pattern: number[] = [200, 100, 200]): void {
  try { navigator.vibrate?.(pattern); } catch {}
}

/** Notification système navigateur (fonctionne même app en arrière-plan) */
export function notify(title: string, body: string, onClick?: () => void): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const options = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'driver-alert',
    requireInteraction: true,
  };
  try {
    const n = new Notification(title, options);
    if (onClick) n.onclick = () => { window.focus(); n.close(); onClick(); };
  } catch {
    // Android refuse new Notification() : il faut passer par le service worker
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(title, options))
      .catch(() => {});
  }
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
