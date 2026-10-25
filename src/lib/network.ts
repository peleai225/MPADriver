import { useSyncExternalStore } from 'react';

/**
 * État de connexion « réel ».
 * navigator.onLine ne suffit pas (Wi-Fi sans Internet, data épuisée, 2G qui ne répond plus) :
 * on le combine avec le résultat des appels API — un appel qui échoue faute de réseau passe
 * l'app « hors ligne », la première réponse du serveur la repasse « en ligne ».
 */

type Listener = () => void;

let online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
const listeners = new Set<Listener>();

function set(next: boolean): void {
  if (online === next) return;
  online = next;
  listeners.forEach(l => { try { l(); } catch {} });
}

export function markOnline(): void { set(true); }
export function markOffline(): void { set(false); }
export function isOnline(): boolean { return online; }

export function subscribeNetwork(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => set(true));
  window.addEventListener('offline', () => set(false));
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeNetwork, isOnline, () => true);
}

/** Erreur levée par fetch faute de réseau (ou délai dépassé), par opposition à une réponse HTTP d'erreur. */
export function isNetworkError(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { network?: boolean }).network === true;
}
