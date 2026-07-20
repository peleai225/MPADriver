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

/** Son d'alerte : bip bip via Web Audio API */
export function playAlert(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beep = (start: number, freq: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(0, 880, 0.15);
    beep(0.2, 1100, 0.15);
    beep(0.4, 880, 0.25);
  } catch {}
}
