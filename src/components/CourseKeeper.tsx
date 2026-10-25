import { useEffect } from 'react';
import { useCachedActiveDelivery } from '../lib/activeDelivery';
import { startTracking, stopTracking } from '../lib/geo';
import { sendLocation } from '../lib/outbox';
import { useWakeLock } from '../lib/wakeLock';
import { api } from '../lib/api';

/**
 * Monté en permanence (livreur connecté). Tant qu'une course est active, quel que soit l'écran :
 *  - la position GPS est envoyée (et mise en file si le réseau coupe) ;
 *  - l'écran reste allumé.
 * Auparavant le suivi s'arrêtait dès que le livreur quittait l'écran « course en cours ».
 */
export function CourseKeeper() {
  const active = useCachedActiveDelivery();
  const activeId = active?.id ?? null;

  // La course gardée sur le téléphone peut être périmée (annulée ou terminée app fermée) :
  // on la revérifie au démarrage et à chaque retour au premier plan.
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') api.getActiveDelivery().catch(() => {}); };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  useEffect(() => {
    if (activeId == null) return;
    startTracking(pos => { sendLocation(pos); });
    return () => stopTracking();
  }, [activeId]);

  useWakeLock(activeId != null);

  return null;
}
