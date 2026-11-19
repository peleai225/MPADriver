import { useEffect } from 'react';
import { useCachedActiveDelivery } from '../lib/activeDelivery';
import { useCachedActiveParcel } from '../lib/activeParcel';
import { startTracking, stopTracking } from '../lib/geo';
import { sendLocation } from '../lib/outbox';
import { useWakeLock } from '../lib/wakeLock';
import { api } from '../lib/api';

/**
 * Monté en permanence (livreur connecté). Tant qu'une course est active (repas OU colis), quel que soit l'écran :
 *  - la position GPS est envoyée (et mise en file si le réseau coupe) : pour un colis, c'est la même
 *    position livreur que l'expéditeur voit dans son suivi ;
 *  - l'écran reste allumé.
 * Auparavant le suivi s'arrêtait dès que le livreur quittait l'écran « course en cours ».
 */
export function CourseKeeper() {
  const active = useCachedActiveDelivery();
  const parcel = useCachedActiveParcel();
  const courseKey = active ? `meal:${active.id}` : parcel ? `parcel:${parcel.reference}` : null;

  // La course gardée sur le téléphone peut être périmée (annulée ou terminée app fermée) :
  // on la revérifie au démarrage et à chaque retour au premier plan.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      api.getActiveDelivery().catch(() => {});
      api.getActiveParcel().catch(() => {});
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  useEffect(() => {
    if (courseKey == null) return;
    startTracking(pos => { sendLocation(pos); });
    return () => stopTracking();
  }, [courseKey]);

  useWakeLock(courseKey != null);

  return null;
}
