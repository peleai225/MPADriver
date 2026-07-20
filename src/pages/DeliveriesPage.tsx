import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, PackageSearch } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { getEcho } from '../lib/echo';
import { DeliveryCard } from '../components/DeliveryCard';
import type { Delivery } from '../lib/types';

export function DeliveriesPage() {
  const { go } = useNav();
  const { show } = useToast();
  const { driver } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const channelRef = useRef<any>(null);

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
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Écoute Pusher : nouvelle course disponible dans la ville du livreur
  useEffect(() => {
    if (!driver?.city) return;
    let active = true;

    getEcho().then(echo => {
      if (!active || !echo) return;
      const city = driver.city.toLowerCase().replace(/\s+/g, '-');
      channelRef.current = echo.channel(`drivers.city.${city}`);
      channelRef.current.listen('.delivery.available', () => {
        load(true);
      });
    });

    return () => {
      active = false;
      if (channelRef.current) {
        channelRef.current.stopListening('.delivery.available');
        channelRef.current = null;
      }
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
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-ink-950 px-4 pt-safe pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg">Courses disponibles</h1>
          <p className="text-ink-400 text-xs mt-0.5">
            {loading ? 'Chargement...' : `${deliveries.length} course${deliveries.length !== 1 ? 's' : ''} en attente`}
          </p>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-white/10 grid place-items-center tap disabled:opacity-50 hover:bg-white/20 transition-colors"
        >
          <RefreshCw size={16} className={`text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Barre de rafraîchissement auto */}
      {!loading && deliveries.length > 0 && (
        <div className="px-4 pt-3 pb-0">
          <p className="text-xs text-ink-400 text-center">Mise à jour en temps réel</p>
        </div>
      )}

      <div className="px-4 space-y-3 mt-4">
        {loading && deliveries.length === 0 ? (
          [0, 1, 2].map(i => <div key={i} className="h-44 rounded-3xl skeleton" />)
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-ink-100 grid place-items-center mb-5">
              <PackageSearch size={32} className="text-ink-400" />
            </div>
            <p className="font-bold text-ink-900 text-base">Aucune course disponible</p>
            <p className="text-ink-400 text-sm mt-1.5 max-w-xs">Restez en ligne pour être notifié dès qu'une course est disponible.</p>
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
