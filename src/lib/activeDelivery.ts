import { useSyncExternalStore } from 'react';
import type { Delivery } from './types';

/**
 * Dernière course active connue, partagée par toute l'app et conservée sur le téléphone.
 *  - hors ligne, l'écran « course en cours » reste utilisable (au lieu d'afficher « aucune course ») ;
 *  - la bannière de mise à jour et le maintien de l'écran allumé savent qu'une course est en cours.
 */

const KEY = 'mpa_active_delivery';
const ACTIVE_STATUSES = ['assigned', 'heading_to_restaurant', 'picked_up', 'delivering'];

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): Delivery | null {
  try {
    const raw = localStorage.getItem(KEY);
    const d = raw ? (JSON.parse(raw) as Delivery) : null;
    return d && ACTIVE_STATUSES.includes(d.status) ? d : null;
  } catch { return null; }
}

let current: Delivery | null = typeof localStorage === 'undefined' ? null : read();

export function getCachedActiveDelivery(): Delivery | null { return current; }

export function setCachedActiveDelivery(d: Delivery | null): void {
  const next = d && ACTIVE_STATUSES.includes(d.status) ? d : null;
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach(l => { try { l(); } catch {} });
}

/** Met à jour le statut localement (action enregistrée hors ligne, en attente d'envoi). */
export function patchCachedActiveDelivery(id: number, patch: Partial<Delivery>): Delivery | null {
  if (!current || current.id !== id) return current;
  setCachedActiveDelivery({ ...current, ...patch });
  return current;
}

export function subscribeActiveDelivery(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Course active connue (null si aucune). */
export function useCachedActiveDelivery(): Delivery | null {
  return useSyncExternalStore(subscribeActiveDelivery, getCachedActiveDelivery, () => null);
}

export function isActiveStatus(status: string | undefined | null): boolean {
  return !!status && ACTIVE_STATUSES.includes(status);
}
