import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { useOnline } from '../lib/network';
import { useOutboxCount } from '../lib/outboxStore';
import { OUTBOX_DROPPED_EVENT, OUTBOX_SYNCED_EVENT, flushOutbox } from '../lib/outbox';
import { useToast } from '../lib/toast';

/**
 * Bandeau d'état du réseau, toujours visible en haut de l'écran quand il y a quelque chose à dire :
 *  - hors ligne (jaune, texte noir : lisible en plein soleil) + nombre d'actions en attente ;
 *  - envoi des actions en attente au retour du réseau ;
 *  - « Connexion rétablie » pendant 3 s.
 */
export function NetworkStatusBar() {
  const online = useOnline();
  const pending = useOutboxCount();
  const { show } = useToast();
  const [justBack, setJustBack] = useState(false);
  const wasOnline = useRef(online);

  useEffect(() => {
    if (online && !wasOnline.current) {
      setJustBack(true);
      const t = setTimeout(() => setJustBack(false), 3000);
      wasOnline.current = online;
      return () => clearTimeout(t);
    }
    wasOnline.current = online;
  }, [online]);

  useEffect(() => {
    const onSynced = (e: Event) => {
      const n = (e as CustomEvent<{ synced: number }>).detail?.synced ?? 0;
      if (n > 0) show(n > 1 ? `${n} actions envoyées au serveur.` : 'Action envoyée au serveur.', 'success');
    };
    const onDropped = (e: Event) => {
      const d = (e as CustomEvent<{ item: { kind: string }; message?: string }>).detail;
      const what = d?.item?.kind === 'cash' ? 'Collecte cash' : 'Action';
      show(`${what} refusée par le serveur${d?.message ? ` : ${d.message}` : '.'}`, 'error');
    };
    window.addEventListener(OUTBOX_SYNCED_EVENT, onSynced);
    window.addEventListener(OUTBOX_DROPPED_EVENT, onDropped);
    return () => {
      window.removeEventListener(OUTBOX_SYNCED_EVENT, onSynced);
      window.removeEventListener(OUTBOX_DROPPED_EVENT, onDropped);
    };
  }, [show]);

  const pendingLabel = pending > 0
    ? `${pending} action${pending > 1 ? 's' : ''} en attente d'envoi`
    : null;

  if (!online) {
    return (
      <div role="status" aria-live="polite" className="sticky top-0 z-[90] bg-warning-500 text-black">
        <div className="flex items-center gap-2 px-4 py-2 min-h-10">
          <WifiOff size={18} strokeWidth={2.5} className="shrink-0" />
          <p className="text-sm font-extrabold">Hors ligne</p>
          <p className="text-sm font-semibold truncate">
            {pendingLabel ? `· ${pendingLabel}` : '· vos actions seront envoyées au retour du réseau'}
          </p>
        </div>
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div role="status" aria-live="polite" className="sticky top-0 z-[90] bg-info-700 text-white">
        <button onClick={() => flushOutbox()} className="w-full flex items-center gap-2 px-4 py-2 min-h-10 text-left">
          <RefreshCw size={16} strokeWidth={2.5} className="shrink-0 animate-spin" />
          <p className="text-sm font-bold truncate">Envoi en cours · {pendingLabel}</p>
        </button>
      </div>
    );
  }

  if (justBack) {
    return (
      <div role="status" aria-live="polite" className="sticky top-0 z-[90] bg-success-700 text-white">
        <div className="flex items-center gap-2 px-4 py-2 min-h-10">
          <Wifi size={16} strokeWidth={2.5} className="shrink-0" />
          <p className="text-sm font-bold">Connexion rétablie</p>
        </div>
      </div>
    );
  }

  return null;
}
