/**
 * Compteur sur l'icône de l'app (Badging API, PWA installée — Chrome/Edge Android & desktop, Safari iOS 16.4+).
 * Le service worker (public/firebase-messaging-sw.js) le met à jour quand l'app est fermée ;
 * l'app l'efface dès qu'elle revient au premier plan ou que le livreur ouvre l'écran des courses.
 */

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

const nav = (): BadgeNavigator | null =>
  typeof navigator === 'undefined' ? null : (navigator as BadgeNavigator);

/** Affiche `count` sur l'icône (0 ou moins → efface). */
export function setBadge(count: number): void {
  try {
    const n = nav();
    if (!n?.setAppBadge) return;
    if (count > 0) n.setAppBadge(count).catch(() => {});
    else n.clearAppBadge?.().catch(() => {});
  } catch {}
}

export function clearBadge(): void {
  try {
    nav()?.clearAppBadge?.().catch(() => {});
  } catch {}
}

let autoClearInstalled = false;

/** Efface le badge maintenant et à chaque retour de l'app au premier plan. Idempotent. */
export function installBadgeAutoClear(): void {
  if (autoClearInstalled || typeof document === 'undefined') return;
  autoClearInstalled = true;
  if (document.visibilityState === 'visible') clearBadge();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') clearBadge();
  });
}
