import { useEffect, useState, useCallback } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { listenNewDelivery } from '../lib/echo';
import { vibrate, playAlert } from '../lib/alert';
import { DeliveryCard } from '../components/DeliveryCard';
import type { Delivery } from '../lib/types';

type Tab = 'available' | 'active' | 'done' | 'all';

const BG = '#F5F0EB';
const ORANGE = '#FF6100';

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function DeliveriesPage() {
  const { go } = useNav();
  const { show } = useToast();
  const { driver } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('available');

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
    const interval = setInterval(() => load(true), 20000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!driver?.city) return;
    let active = true;
    let unsub: (() => void) | null = null;
    listenNewDelivery(driver.city, () => {
      if (!active) return;
      load(true); vibrate([100, 50, 100]); playAlert();
    }).then(u => { if (active) unsub = u; });
    return () => { active = false; unsub?.(); };
  }, [driver?.city, load]);

  const handleAccept = async (id: number) => {
    setActionId(id);
    try {
      await api.acceptDelivery(id);
      show('Course acceptée !', 'success');
      go({ name: 'active-delivery' });
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setActionId(null); }
  };

  const handleDecline = async (id: number) => {
    setActionId(id);
    try {
      await api.declineDelivery(id);
      setDeliveries(d => d.filter(x => x.id !== id));
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setActionId(null); }
  };

  const TABS: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'available', label: 'Disponibles', icon: '📦', count: deliveries.length },
    { key: 'active',    label: 'En cours',    icon: '🛵', count: 0 },
    { key: 'done',      label: 'Terminées',   icon: '✓',  count: 0 },
    { key: 'all',       label: 'Toutes',      icon: '⊞',  count: 0 },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-5 pb-2 flex items-start justify-between">
        <div>
          <h1 className="font-extrabold text-3xl leading-tight" style={{ color: '#1C1C1C' }}>Courses</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-base">📅</span>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>
              Aujourd'hui, {todayLabel()}
            </p>
          </div>
        </div>
        <div className="relative mt-1">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center tap"
            style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
          >
            <Bell size={20} style={{ color: '#1C1C1C' }} />
          </div>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: ORANGE }} />
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="px-5 mt-4">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl tap transition-all"
                style={{ background: active ? '#FFF4EE' : 'transparent' }}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span
                  className="text-[10px] font-bold leading-none"
                  style={{ color: active ? ORANGE : '#A0A0A0' }}
                >
                  {t.label}
                </span>
                {t.count > 0 && (
                  <span
                    className="text-[9px] font-extrabold px-1 rounded-full"
                    style={{ background: active ? ORANGE : '#E4E4E4', color: active ? '#FFF' : '#717171' }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">

        {/* ── SECTION TITRE ── */}
        {tab === 'available' && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: ORANGE }} />
            <div>
              <p className="font-extrabold text-base" style={{ color: '#1C1C1C' }}>Courses disponibles</p>
              <p className="text-xs" style={{ color: '#A0A0A0' }}>Choisissez une course à livrer</p>
            </div>
          </div>
        )}

        {/* ── LISTE ── */}
        {loading && deliveries.length === 0 ? (
          [0, 1].map(i => <div key={i} className="h-52 rounded-3xl skeleton" />)
        ) : tab === 'available' && deliveries.length > 0 ? (
          deliveries.map(d => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              loading={actionId === d.id}
              onAccept={() => handleAccept(d.id)}
              onDecline={() => handleDecline(d.id)}
            />
          ))
        ) : (
          /* ── EMPTY STATE ── */
          <>
            {tab === 'available' && (
              <div className="flex items-center gap-2 mb-3 mt-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ORANGE }} />
                <p className="font-extrabold text-base" style={{ color: '#1C1C1C' }}>Aucune course disponible ?</p>
              </div>
            )}
            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
            >
              {/* Moto illustration area */}
              <div
                className="flex items-center justify-center pt-6 pb-4"
                style={{ background: 'linear-gradient(180deg, #FFF4EE 0%, #FFFFFF 100%)' }}
              >
                <span className="text-8xl select-none">🛵</span>
              </div>

              <div className="px-5 pb-5">
                <p className="font-extrabold text-base mb-1" style={{ color: '#1C1C1C' }}>
                  Aucune course disponible
                </p>
                <p className="text-sm mb-4" style={{ color: '#A0A0A0' }}>
                  Nous recherchons des courses près de vous.
                </p>

                <div className="flex items-center gap-2">
                  {/* Statut en ligne */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full flex-1 justify-center"
                    style={{ background: driver?.is_available ? 'rgba(34,197,94,0.1)' : 'rgba(160,160,160,0.1)' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: driver?.is_available ? '#22C55E' : '#A0A0A0' }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: driver?.is_available ? '#16A34A' : '#717171' }}
                    >
                      {driver?.is_available ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
                    </span>
                  </div>

                  {/* Bouton actualiser */}
                  <button
                    onClick={() => load()}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full tap border"
                    style={{ borderColor: ORANGE, color: ORANGE }}
                  >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    <span className="text-xs font-semibold">Actualiser</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
