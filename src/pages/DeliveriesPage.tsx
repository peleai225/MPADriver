import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, PackageSearch } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { listenNewDelivery } from '../lib/echo';
import { vibrate, playAlert } from '../lib/alert';
import { DeliveryCard } from '../components/DeliveryCard';
import type { Delivery } from '../lib/types';

export function DeliveriesPage() {
  const { go } = useNav();
  const { show } = useToast();
  const { driver } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getPendingDeliveries();
      setDeliveries(data);
    } catch {
      if (!silent) show('Impossible de charger les courses.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
    // Polling fallback 20s si Pusher indisponible
    const interval = setInterval(() => load(true), 20000);
    return () => clearInterval(interval);
  }, [load]);

  // Écoute Pusher temps réel
  useEffect(() => {
    if (!driver?.city) return;
    let active = true;
    let unsub: (() => void) | null = null;

    listenNewDelivery(driver.city, () => {
      if (!active) return;
      load(true);
      vibrate([100, 50, 100]);
      playAlert();
    }).then(u => { if (active) unsub = u; });

    return () => {
      active = false;
      unsub?.();
    };
  }, [driver?.city, load]);

  const handleAccept = async (id: number) => {
    setActionId(id);
    try {
      await api.acceptDelivery(id);
      show('Course acceptée !', 'success');
      go({ name: 'active-delivery' });
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (id: number) => {
    setActionId(id);
    try {
      await api.declineDelivery(id);
      setDeliveries(d => d.filter(x => x.id !== id));
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F6F5' }}>
      {/* Header */}
      <div className="px-4 pt-safe pb-5 flex items-center justify-between" style={{ background: '#1C1C1C' }}>
        <div>
          <h1 className="text-white font-extrabold text-xl">Courses disponibles</h1>
          <p className="text-white/40 text-xs mt-0.5">
            {loading ? 'Chargement...' : `${deliveries.length} course${deliveries.length !== 1 ? 's' : ''} en attente`}
          </p>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="w-10 h-10 rounded-full flex items-center justify-center tap disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <RefreshCw size={16} className={`text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 space-y-3 mt-4">
        {loading && deliveries.length === 0 ? (
          [0, 1, 2].map(i => <div key={i} className="h-44 rounded-3xl skeleton" />)
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center mb-5">
              <PackageSearch size={32} className="text-ink-400" />
            </div>
            {driver?.is_available === false ? (
              <>
                <p className="font-bold text-ink-900 text-base">Vous êtes hors ligne</p>
                <p className="text-ink-400 text-sm mt-1.5 max-w-xs">Passez en ligne pour recevoir des courses.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-ink-900 text-base">Aucune course disponible</p>
                <p className="text-ink-400 text-sm mt-1.5 max-w-xs">Vous serez alerté dès qu'une course arrive.</p>
              </>
            )}
          </div>
        ) : (
          deliveries.map(d => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              loading={actionId === d.id}
              onAccept={() => handleAccept(d.id)}
              onDecline={() => handleDecline(d.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
