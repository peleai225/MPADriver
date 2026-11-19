import { api, getToken } from './api';
import { isNetworkError, subscribeNetwork, isOnline } from './network';
import { patchCachedActiveDelivery, getCachedActiveDelivery, setCachedActiveDelivery } from './activeDelivery';
import { patchCachedActiveParcel, getCachedActiveParcel, setCachedActiveParcel } from './activeParcel';
import {
  enqueue, getOutbox, removeFromOutbox, bumpAttempts, hasPendingFor, hasPendingForParcel,
  type DeliveryStep, type OutboxItem, type ParcelStep,
} from './outboxStore';
import type { Delivery, Parcel } from './types';

/**
 * Envoi fiable des actions critiques de course, même avec un réseau intermittent.
 *
 *  - Avec réseau : l'action part tout de suite, comme avant.
 *  - Sans réseau (ou réseau qui ne répond pas) : elle est mise en file sur le téléphone, l'écran avance
 *    quand même, et elle est rejouée dans l'ordre dès que la connexion revient.
 *
 * Idempotence au rejeu : si le serveur a déjà appliqué l'action (réponse perdue en route), il répond
 * 422 (« transition non autorisée », « collecte déjà confirmée ») ou 404 (course plus active) :
 * l'action est alors retirée de la file sans être renvoyée. Les erreurs réseau, 429 et 5xx gardent
 * l'action pour un nouvel essai, sans jamais doubler les suivantes (envoi strictement dans l'ordre).
 */

export const OUTBOX_SYNCED_EVENT = 'mpa:outbox-synced';
export const OUTBOX_DROPPED_EVENT = 'mpa:outbox-dropped';
export const CASH_SYNCED_EVENT = 'mpa:cash-synced';

/** Position trop ancienne pour être utile au suivi client : on ne la rejoue pas. */
const LOCATION_MAX_AGE_MS = 5 * 60 * 1000;

export interface SendResult<T> { queued: boolean; data?: T }

function emit(name: string, detail?: unknown): void {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

/** Changement d'étape de course (en route, récupérée, en livraison, livrée). */
export async function sendDeliveryStatus(deliveryId: number, status: DeliveryStep): Promise<SendResult<Delivery>> {
  // Des actions de cette course attendent déjà : on passe derrière elles pour garder l'ordre.
  if (!hasPendingFor(deliveryId)) {
    try {
      const data = await api.updateDeliveryStatus(deliveryId, status);
      return { queued: false, data };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  enqueue({ kind: 'status', deliveryId, status });
  if (status === 'delivered') {
    // Course terminée côté livreur : plus de suivi GPS ni d'écran maintenu allumé.
    if (getCachedActiveDelivery()?.id === deliveryId) setCachedActiveDelivery(null);
  } else {
    patchCachedActiveDelivery(deliveryId, { status });
  }
  scheduleFlush();
  return { queued: true };
}

/** Confirmation du cash collecté auprès du client. */
export async function sendCashCollected(
  deliveryId: number, amount: number,
): Promise<SendResult<{ message: string; amount_owed: number; restaurant: string }>> {
  if (!hasPendingFor(deliveryId)) {
    try {
      const data = await api.confirmCashCollected(deliveryId, amount);
      return { queued: false, data };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  enqueue({ kind: 'cash', deliveryId, amount });
  scheduleFlush();
  return { queued: true };
}

/**
 * Colis : « démarrer la livraison » ou « signaler un échec ». Sans réseau, l'action est mise en file
 * et l'écran avance quand même (démarrer → en livraison ; échec → plus de course active).
 */
export async function sendParcelStep(
  reference: string, step: ParcelStep, reason?: string,
): Promise<SendResult<Parcel | { message: string; status: string }>> {
  if (!hasPendingForParcel(reference)) {
    try {
      const data = step === 'start'
        ? await api.startParcel(reference)
        : await api.failParcel(reference, reason ?? '');
      return { queued: false, data };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  enqueue({ kind: 'parcel', reference, step, reason });
  if (step === 'fail') {
    if (getCachedActiveParcel()?.reference === reference) setCachedActiveParcel(null);
  } else {
    patchCachedActiveParcel(reference, { status: 'delivering' });
  }
  scheduleFlush();
  return { queued: true };
}

/** Position GPS : on n'en garde qu'une en file (la plus récente). */
export async function sendLocation(pos: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number }): Promise<void> {
  try {
    await api.updateLocation(pos.lat, pos.lng, pos.accuracy, pos.speed, pos.heading);
    // Une position plus récente vient de passer : l'ancienne en file n'a plus d'intérêt.
    if (getOutbox().some(i => i.kind === 'location')) removeFromOutbox('location');
  } catch (e) {
    if (isNetworkError(e)) enqueue({ kind: 'location', ...pos });
    // 429 (trop fréquent) ou autre refus : la position suivante prendra le relais.
  }
}

// ── Rejeu ─────────────────────────────────────────────────────────────────────

let flushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(delayMs = 1500): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flushOutbox(); }, delayMs);
}

async function sendItem(item: OutboxItem): Promise<void> {
  if (item.kind === 'status') {
    await api.updateDeliveryStatus(item.deliveryId, item.status);
  } else if (item.kind === 'cash') {
    const r = await api.confirmCashCollected(item.deliveryId, item.amount);
    emit(CASH_SYNCED_EVENT, { deliveryId: item.deliveryId, ...r });
  } else if (item.kind === 'parcel') {
    if (item.step === 'start') await api.startParcel(item.reference);
    else await api.failParcel(item.reference, item.reason ?? 'Problème signalé hors ligne');
  } else {
    await api.updateLocation(item.lat, item.lng, item.accuracy, item.speed, item.heading);
  }
}

/** Ordre d'envoi : actions de course d'abord (dans l'ordre où elles ont été faites), position ensuite. */
function nextItem(skip: Set<string>): OutboxItem | undefined {
  const list = getOutbox().filter(i => !skip.has(i.key));
  return list.find(i => i.kind !== 'location') ?? list.find(i => i.kind === 'location');
}

export async function flushOutbox(): Promise<void> {
  if (flushing || !getToken() || getOutbox().length === 0) return;
  flushing = true;
  let synced = 0;
  const skip = new Set<string>();
  try {
    for (let item = nextItem(skip); item; item = nextItem(skip)) {
      if (item.kind === 'location' && Date.now() - item.createdAt > LOCATION_MAX_AGE_MS) {
        removeFromOutbox(item.key);
        continue;
      }
      try {
        await sendItem(item);
        removeFromOutbox(item.key);
        synced++;
      } catch (e: any) {
        if (isNetworkError(e)) break;                     // toujours pas de réseau : on réessaiera
        const status = Number(e?.status) || 0;
        if (status === 401) break;                        // session expirée : la file est vidée à la déconnexion
        if (status === 429 || status >= 500) {            // serveur saturé : nouvel essai plus tard, sans doubler
          bumpAttempts(item.key);
          break;
        }
        // 404 / 409 / 422… : déjà appliquée ou refusée définitivement → retirée de la file.
        removeFromOutbox(item.key);
        if (item.kind === 'location') continue;
        const alreadyDone = status === 422 || status === 404;
        if (!alreadyDone || item.kind === 'cash') {
          emit(OUTBOX_DROPPED_EVENT, { item, status, message: e?.message as string | undefined });
        }
        skip.add(item.key);
      }
    }
  } finally {
    flushing = false;
  }
  if (synced > 0) {
    // Resynchronise l'écran avec l'état réel du serveur.
    await Promise.all([
      api.getActiveDelivery().catch(() => null),
      api.getActiveParcel().catch(() => null),
    ]);
    emit(OUTBOX_SYNCED_EVENT, { synced });
  }
  if (getOutbox().length > 0 && isOnline()) scheduleFlush(15000);
}

let started = false;

/** À appeler une fois au démarrage : rejoue la file à l'ouverture, au retour du réseau et au premier plan. */
export function startOutbox(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  flushOutbox();
  subscribeNetwork(() => { if (isOnline()) scheduleFlush(500); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleFlush(500);
  });
  // Filet de sécurité : navigator.onLine ne signale pas toujours le retour du réseau mobile.
  setInterval(() => { if (getOutbox().length > 0) flushOutbox(); }, 20000);
}
