import { useEffect, useRef } from 'react';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';
import { vibrate, playAlert } from '../lib/alert';
import { onForegroundMessage } from '../lib/firebase';
import { emitDeliveryCancelled } from '../lib/deliveryEvents';
import { getCachedActiveParcel, setCachedActiveParcel } from '../lib/activeParcel';

/**
 * Monté en permanence (livreur connecté) : réagit au push `type: 'delivery_cancelled'` reçu
 * app ouverte, quel que soit l'écran affiché.
 *  - alerte claire (toast + vibration + son) ;
 *  - diffuse DELIVERY_CANCELLED_EVENT pour que les écrans rechargent la course active ;
 *  - si l'écran « course en cours » est affiché et concerne cette course (ou qu'il n'y a plus
 *    de course active), retour au tableau de bord.
 * App fermée, c'est la notification système (lien /?open=dashboard) qui prend le relais.
 */
export function DeliveryCancelledWatcher() {
  const { stack, go } = useNav();
  const { show } = useToast();
  const stackRef = useRef(stack);
  stackRef.current = stack;

  useEffect(() => {
    return onForegroundMessage((payload: any) => {
      // Course colis annulée par l'expéditeur ou l'admin (push `parcel_cancelled`).
      if (payload?.data?.type === 'parcel_cancelled') {
        const ref = String(payload?.data?.parcel_reference ?? '');
        const body = payload?.notification?.body || payload?.data?.body;
        show(body ? `Course colis annulée — ${body}` : 'Course colis annulée par l\'expéditeur.', 'error');
        vibrate([500, 200, 500, 200, 500]);
        playAlert();
        if (!ref || getCachedActiveParcel()?.reference === ref) setCachedActiveParcel(null);
        emitDeliveryCancelled(null);
        const cur = stackRef.current[stackRef.current.length - 1];
        if (cur?.name === 'active-parcel') {
          api.getActiveParcel()
            .then(active => { if (!active || active.reference === ref) go({ name: 'dashboard' }); })
            .catch(() => go({ name: 'dashboard' }));
        }
        return;
      }

      if (payload?.data?.type !== 'delivery_cancelled') return;

      const raw = Number.parseInt(String(payload?.data?.delivery_id ?? ''), 10);
      const deliveryId = Number.isFinite(raw) ? raw : null;
      const body = payload?.notification?.body || payload?.data?.body;

      show(body ? `Course annulée — ${body}` : 'Course annulée par le restaurant ou le client.', 'error');
      vibrate([500, 200, 500, 200, 500]);
      playAlert();
      emitDeliveryCancelled(deliveryId);

      const current = stackRef.current[stackRef.current.length - 1];
      if (current?.name !== 'active-delivery') return;

      api.getActiveDelivery()
        .then(active => {
          if (!active || active.id === deliveryId) go({ name: 'dashboard' });
        })
        .catch(() => go({ name: 'dashboard' }));
    });
  }, [go, show]);

  return null;
}
