import { useSyncExternalStore } from 'react';

/**
 * Proposition d'installation de l'app sur l'écran d'accueil.
 *  - Android / Chrome : on intercepte `beforeinstallprompt` pour l'afficher au bon moment (bandeau discret).
 *  - iPhone (Safari) : pas d'événement, on affiche les instructions « Partager → Sur l'écran d'accueil ».
 * Un refus est mémorisé 30 jours.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'mpa_install_dismissed_at';
const DISMISS_DAYS = 30;

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => { try { l(); } catch {} });

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // on choisit nous-mêmes le moment (pas de mini-barre Chrome au démarrage)
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 3600 * 1000;
  } catch { return false; }
}

export function dismissInstall(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  notify();
}

export type InstallMode = 'none' | 'prompt' | 'ios';

function computeMode(): InstallMode {
  if (installed || isStandalone() || recentlyDismissed()) return 'none';
  if (deferred) return 'prompt';
  if (isIosSafari()) return 'ios';
  return 'none';
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    computeMode,
    () => 'none' as InstallMode,
  );
}

/** Ouvre la boîte d'installation du système. Renvoie true si le livreur a accepté. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'dismissed') dismissInstall();
    notify();
    return outcome === 'accepted';
  } catch {
    notify();
    return false;
  }
}
