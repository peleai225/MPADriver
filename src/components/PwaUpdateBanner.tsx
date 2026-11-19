import { useState } from 'react';
import { Download } from 'lucide-react';
import { usePwaNeedRefresh, applyPwaUpdate } from '../lib/pwa';
import { useCachedActiveDelivery } from '../lib/activeDelivery';
import { useCachedActiveParcel } from '../lib/activeParcel';
import { useOutboxCount } from '../lib/outboxStore';

/**
 * « Nouvelle version disponible ». La mise à jour ne se fait qu'au toucher du livreur.
 * Masquée pendant une course active ou tant que des actions attendent d'être envoyées :
 * aucun rechargement ne doit interrompre une livraison.
 */
export function PwaUpdateBanner() {
  const needRefresh = usePwaNeedRefresh();
  const active = useCachedActiveDelivery();
  const parcel = useCachedActiveParcel();
  const pending = useOutboxCount();
  const [updating, setUpdating] = useState(false);

  if (!needRefresh || active || parcel || pending > 0) return null;

  return (
    <div className="fixed inset-x-0 z-[95] px-3 pointer-events-none" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="pointer-events-auto mx-auto max-w-md flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 shadow-elevated animate-fade-up">
        <Download size={20} className="text-primary shrink-0" />
        <p className="flex-1 text-white text-sm font-semibold">Nouvelle version disponible</p>
        <button
          onClick={() => { setUpdating(true); applyPwaUpdate(); }}
          disabled={updating}
          className="min-h-12 px-4 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm tap disabled:opacity-60"
        >
          {updating ? 'Mise à jour…' : 'Mettre à jour'}
        </button>
      </div>
    </div>
  );
}
