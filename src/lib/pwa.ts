import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Enregistrement du service worker et mises à jour de l'app.
 *
 * registerType « prompt » : une nouvelle version se télécharge en arrière-plan puis attend.
 * Elle ne s'applique que lorsque le livreur touche « Mettre à jour » (bannière masquée pendant une
 * course), ou d'elle-même à la prochaine ouverture complète de l'app. Jamais de rechargement surprise.
 */

let needRefresh = false;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

const UPDATE_CHECK_MS = 30 * 60 * 1000;

export function initPwa(): void {
  if (updateSW || typeof window === 'undefined') return;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      listeners.forEach(l => { try { l(); } catch {} });
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // L'app reste souvent ouverte des heures : on vérifie régulièrement s'il y a une nouvelle version.
      const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    },
  });
}

export function usePwaNeedRefresh(): boolean {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => needRefresh,
    () => false,
  );
}

/** Active la nouvelle version (le service worker en attente prend la main) puis recharge la page. */
export function applyPwaUpdate(): void {
  if (updateSW) updateSW(true).catch(() => window.location.reload());
  else window.location.reload();
}
