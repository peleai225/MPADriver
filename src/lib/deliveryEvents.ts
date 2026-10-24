/**
 * Événement interne diffusé quand le serveur signale l'annulation d'une course
 * (push FCM `type: 'delivery_cancelled'` reçu app ouverte). Les écrans qui affichent
 * des courses s'y abonnent pour se recharger.
 */
export const DELIVERY_CANCELLED_EVENT = 'mpa:delivery-cancelled';

export interface DeliveryCancelledDetail {
  deliveryId: number | null;
}

export function emitDeliveryCancelled(deliveryId: number | null): void {
  try {
    window.dispatchEvent(new CustomEvent<DeliveryCancelledDetail>(DELIVERY_CANCELLED_EVENT, { detail: { deliveryId } }));
  } catch {}
}
