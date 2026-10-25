import { useEffect } from 'react';

/**
 * Garde l'écran allumé tant que `active` est vrai (course en cours) : le livreur consulte l'adresse
 * et le téléphone du client sans que l'écran se mette en veille.
 * Le navigateur libère le verrou dès que l'app passe en arrière-plan : on le reprend au retour.
 * Sans support (anciens navigateurs), ne fait rien.
 */

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void>; addEventListener?: (t: string, cb: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!active || !nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      try {
        sentinel = await nav.wakeLock!.request('screen');
        if (cancelled) { sentinel.release().catch(() => {}); sentinel = null; }
      } catch {
        // Refus (batterie faible, mode économie d'énergie…) : sans conséquence.
      }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };

    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
