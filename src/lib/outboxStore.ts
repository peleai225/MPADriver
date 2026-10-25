import { useSyncExternalStore } from 'react';
import type { Delivery } from './types';

/**
 * File d'attente persistante des actions critiques faites sans réseau (stockée sur le téléphone,
 * survit à la fermeture de l'app). L'envoi/rejeu est dans outbox.ts.
 *
 * Anti-doublons : chaque action a une clé unique (`status:12:picked_up`, `cash:12`, `location`).
 * Une action déjà en file n'est jamais ajoutée deux fois ; la position GPS ne garde que la plus récente.
 */

export type DeliveryStep = 'heading_to_restaurant' | 'picked_up' | 'delivering' | 'delivered';

export type OutboxItem =
  | { key: string; kind: 'status'; deliveryId: number; status: DeliveryStep; createdAt: number; attempts: number }
  | { key: string; kind: 'cash'; deliveryId: number; amount: number; createdAt: number; attempts: number }
  | {
      key: string; kind: 'location'; lat: number; lng: number;
      accuracy?: number; speed?: number; heading?: number; createdAt: number; attempts: number;
    };

/** Payload d'ajout : la clé, la date et le compteur d'essais sont calculés ici. */
export type NewOutboxItem =
  | { kind: 'status'; deliveryId: number; status: DeliveryStep }
  | { kind: 'cash'; deliveryId: number; amount: number }
  | { kind: 'location'; lat: number; lng: number; accuracy?: number; speed?: number; heading?: number };

const KEY = 'mpa_outbox';
const STEP_ORDER = ['assigned', 'heading_to_restaurant', 'picked_up', 'delivering', 'delivered'];

type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: OutboxItem[] = load();

function load(): OutboxItem[] {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function save(list: OutboxItem[]): void {
  snapshot = list;
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach(l => { try { l(); } catch {} });
}

function keyOf(item: NewOutboxItem): string {
  if (item.kind === 'status') return `status:${item.deliveryId}:${item.status}`;
  if (item.kind === 'cash') return `cash:${item.deliveryId}`;
  return 'location';
}

export function getOutbox(): OutboxItem[] { return snapshot; }

/** Ajoute une action. Renvoie false si elle était déjà en file (doublon ignoré). */
export function enqueue(item: NewOutboxItem): boolean {
  const key = keyOf(item);
  const list = load();
  const full = { ...item, key, createdAt: Date.now(), attempts: 0 } as OutboxItem;
  const idx = list.findIndex(i => i.key === key);
  if (idx >= 0) {
    if (item.kind !== 'location') return false;
    list[idx] = full; // position : on remplace par la plus récente
  } else {
    list.push(full);
  }
  save(list);
  return true;
}

export function removeFromOutbox(key: string): void {
  save(load().filter(i => i.key !== key));
}

export function bumpAttempts(key: string): void {
  save(load().map(i => (i.key === key ? { ...i, attempts: i.attempts + 1 } : i)));
}

export function clearOutbox(): void { save([]); }

/** Actions critiques encore en attente pour cette course (statut, cash). */
export function hasPendingFor(deliveryId: number): boolean {
  return load().some(i => i.kind !== 'location' && i.deliveryId === deliveryId);
}

/**
 * Applique à une course venue du serveur l'étape la plus avancée validée hors ligne et pas encore
 * envoyée : l'écran ne « recule » pas pendant la synchronisation.
 */
export function withPendingStatus(d: Delivery): Delivery {
  let best = STEP_ORDER.indexOf(d.status);
  for (const i of load()) {
    if (i.kind === 'status' && i.deliveryId === d.id) best = Math.max(best, STEP_ORDER.indexOf(i.status));
  }
  const status = STEP_ORDER[best];
  return best >= 0 && status !== d.status ? { ...d, status: status as Delivery['status'] } : d;
}

export function subscribeOutbox(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Nombre d'actions critiques en attente (la position GPS n'est pas comptée). */
export function useOutboxCount(): number {
  const list = useSyncExternalStore(subscribeOutbox, getOutbox, getOutbox);
  return list.filter(i => i.kind !== 'location').length;
}

// Autre onglet de l'app ouvert : garder la même file.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY) {
      snapshot = load();
      listeners.forEach(l => { try { l(); } catch {} });
    }
  });
}
