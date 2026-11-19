import { useSyncExternalStore } from 'react';
import type { Parcel } from './types';

/**
 * Dernière course colis active connue, conservée sur le téléphone (même principe que activeDelivery.ts) :
 *  - hors ligne, l'écran du colis reste utilisable ;
 *  - le suivi GPS, l'écran allumé et la bannière de mise à jour savent qu'une course est en cours.
 */

const KEY = 'mpa_active_parcel';
const ACTIVE_STATUSES = ['assigned', 'picked_up', 'delivering'];

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): Parcel | null {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as Parcel) : null;
    return p && ACTIVE_STATUSES.includes(p.status) ? p : null;
  } catch { return null; }
}

let current: Parcel | null = typeof localStorage === 'undefined' ? null : read();

export function getCachedActiveParcel(): Parcel | null { return current; }

export function setCachedActiveParcel(p: Parcel | null): void {
  const next = p && ACTIVE_STATUSES.includes(p.status) ? p : null;
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach(l => { try { l(); } catch {} });
}

export function patchCachedActiveParcel(reference: string, patch: Partial<Parcel>): Parcel | null {
  if (!current || current.reference !== reference) return current;
  setCachedActiveParcel({ ...current, ...patch });
  return current;
}

export function subscribeActiveParcel(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useCachedActiveParcel(): Parcel | null {
  return useSyncExternalStore(subscribeActiveParcel, getCachedActiveParcel, () => null);
}

export function isActiveParcelStatus(status: string | undefined | null): boolean {
  return !!status && ACTIVE_STATUSES.includes(status);
}
