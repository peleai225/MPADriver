import { useEffect, useState, useCallback } from 'react';
import { Bell, RefreshCw, MapPin, Clock, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { listenNewDelivery } from '../lib/echo';
import { vibrate, playAlert } from '../lib/alert';
import { DeliveryCard } from '../components/DeliveryCard';
import type { Delivery } from '../lib/types';
import { formatFCFA, DELIVERY_STATUS_LABELS } from '../lib/format';

type Tab = 'available' | 'active' | 'done';

const BG = '#F5F0EB';
const ORANGE = '#FF6100';

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function CompletedCard({ delivery }: { delivery: Delivery }) {
  const { order } = delivery;
  const statusLabel = DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status;
  const isDone = delivery.status === 'delivered';
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #F1F1F1' }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,97,0,0.08)' }}>
          {order.restaurant.logo_url
            ? <img src={order.restaurant.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            : <span className="text-2xl">🏪</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: '#1C1C1C' }}>{order.restaurant.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} style={{ color: '#A0A0A0' }} />
            <p className="text-xs truncate" style={{ color: '#A0A0A0' }}>{order.delivery_address.split(',')[0]}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: isDone ? '#F0FDF4' : '#FEF2F2', color: isDone ? '#16A34A' : '#DC2626' }}
          >
            {statusLabel}
          </span>
          {delivery.driver_earning_estimate != null && (
            <p className="text-sm font-extrabold mt-1" style={{ color: ORANGE }}>
              {formatFCFA(delivery.driver_earning_estimate)}
            </p>
          )}
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-4 border-t" style={{ borderColor: '#F5F5F5' }}>
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: '#A0A0A0' }}>#{order.reference}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: '#A0A0A0' }}>{order.items.length} article{order.items.length > 1 ? 's' : ''}</span>
        </div>
        {delivery.distance_km != null && (
          <div className="flex items-center gap-1">
            <MapPin size={10} style={{ color: '#A0A0A0' }} />
            <span className="text-xs" style={{ color: '#A0A0A0' }}>{Number(delivery.distance_km).toFixed(1)} km</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveDeliveryBanner({ delivery, onGo }: { delivery: Delivery; onGo: () => void }) {
  return (
    <button
      onClick={onGo}
      className="w-full rounded-3xl overflow-hidden text-left tap"
      style={{ background: `linear-gradient(135deg, #FF3301, ${ORANGE})`, boxShadow: '0 8px 24px rgba(255,97,0,.35)' }}
    >
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <span className="text-3xl">🛵</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">Course en cours</p>
          <p className="text-white font-extrabold text-base leading-tight mt-0.5 truncate">
            {delivery.order.restaurant.name}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Clock size={11} className="text-white/70" />
            <p className="text-white/70 text-xs">{DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {delivery.driver_earning_estimate != null && (
            <p className="text-white font-extrabold text-lg">{formatFCFA(delivery.driver_earning_estimate)}</p>
          )}
          <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
            <span className="text-white text-xs font-bold">Continuer</span>
            <ChevronRight size={13} className="text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}

export function DeliveriesPage() {
  const { go } = useNav();
  const { show } = useToast();
  const { driver } = useAuth();
  const [pending, setPending] = useState<Delivery[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('available');

  const loadPending = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getPendingDeliveries();
      setPending(data);
    } catch {
      if (!silent) show('Impossible de charger les courses.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [show]);

  const loadActive = useCallback(async () => {
    try {
      const d = await api.getActiveDelivery();
      setActiveDelivery(d);
    } catch {}
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await api.getDeliveryHistory();
      setHistory(r.data);
    } catch {
      show('Impossible de charger l\'historique.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [show]);

  // Chargement initial
  useEffect(() => {
    loadPending();
    loadActive();
    const interval = setInterval(() => { loadPending(true); loadActive(); }, 20000);
    return () => clearInterval(interval);
  }, [loadPending, loadActive]);

  // Charger historique quand on clique sur l'onglet
  useEffect(() => {
    if (tab === 'done' && history.length === 0) loadHistory();
  }, [tab, history.length, loadHistory]);

  // Echo — nouvelle course
  useEffect(() => {
    if (!driver?.city) return;
    let active = true;
    let unsub: (() => void) | null = null;
    listenNewDelivery(driver.city, () => {
      if (!active) return;
      loadPending(true); vibrate([100, 50, 100]); playAlert();
    }).then(u => { if (active) unsub = u; });
    return () => { active = false; unsub?.(); };
  }, [driver?.city, loadPending]);

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
      setPending(d => d.filter(x => x.id !== id));
      show('Course refusée.', 'info');
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setActionId(null); }
  };

  const TABS = [
    { key: 'available' as Tab, label: 'Disponibles', icon: '📦', count: pending.length },
    { key: 'active'    as Tab, label: 'En cours',    icon: '🛵', count: activeDelivery ? 1 : 0 },
    { key: 'done'      as Tab, label: 'Terminées',   icon: '✓',  count: history.length },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-5 pb-2 flex items-start justify-between">
        <div>
          <h1 className="font-extrabold text-3xl leading-tight" style={{ color: '#1C1C1C' }}>Courses</h1>
          <p className="text-sm mt-1" style={{ color: '#A0A0A0' }}>📅 Aujourd'hui, {todayLabel()}</p>
        </div>
        <div className="relative mt-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center tap" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Bell size={20} style={{ color: '#1C1C1C' }} />
          </div>
          {pending.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: ORANGE }} />
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="px-5 mt-4">
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {TABS.map(t => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl tap transition-all"
                style={{ background: isActive ? '#FFF4EE' : 'transparent' }}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="text-[10px] font-bold leading-none" style={{ color: isActive ? ORANGE : '#A0A0A0' }}>
                  {t.label}
                </span>
                {t.count > 0 && (
                  <span className="text-[9px] font-extrabold px-1.5 rounded-full" style={{ background: isActive ? ORANGE : '#E4E4E4', color: isActive ? '#FFF' : '#717171' }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">

        {/* ── TAB : DISPONIBLES ── */}
        {tab === 'available' && (
          <>
            {loading && pending.length === 0 ? (
              [0, 1].map(i => <div key={i} className="h-52 rounded-3xl" style={{ background: '#E8E0D8', animation: 'pulse 1.5s infinite' }} />)
            ) : pending.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: ORANGE }} />
                  <p className="font-extrabold text-base" style={{ color: '#1C1C1C' }}>
                    {pending.length} course{pending.length > 1 ? 's' : ''} disponible{pending.length > 1 ? 's' : ''}
                  </p>
                </div>
                {pending.map(d => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    loading={actionId === d.id}
                    onAccept={() => handleAccept(d.id)}
                    onDecline={() => handleDecline(d.id)}
                  />
                ))}
              </>
            ) : (
              <div className="rounded-3xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                <div className="flex items-center justify-center pt-6 pb-4" style={{ background: 'linear-gradient(180deg, #FFF4EE 0%, #FFFFFF 100%)' }}>
                  <span className="text-8xl select-none">🛵</span>
                </div>
                <div className="px-5 pb-5">
                  <p className="font-extrabold text-base mb-1" style={{ color: '#1C1C1C' }}>Aucune course disponible</p>
                  <p className="text-sm mb-4" style={{ color: '#A0A0A0' }}>Nous recherchons des courses près de vous.</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-full flex-1 justify-center"
                      style={{ background: driver?.is_available ? 'rgba(34,197,94,0.1)' : 'rgba(160,160,160,0.1)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: driver?.is_available ? '#22C55E' : '#A0A0A0' }} />
                      <span className="text-xs font-semibold" style={{ color: driver?.is_available ? '#16A34A' : '#717171' }}>
                        {driver?.is_available ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
                      </span>
                    </div>
                    <button onClick={() => loadPending()} disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full tap border"
                      style={{ borderColor: ORANGE, color: ORANGE }}>
                      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                      <span className="text-xs font-semibold">Actualiser</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB : EN COURS ── */}
        {tab === 'active' && (
          <>
            {activeDelivery ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
                  <p className="font-extrabold text-base" style={{ color: '#1C1C1C' }}>Votre course active</p>
                </div>
                <ActiveDeliveryBanner delivery={activeDelivery} onGo={() => go({ name: 'active-delivery' })} />
              </>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl">✅</span>
                <p className="font-extrabold text-base mt-4" style={{ color: '#1C1C1C' }}>Aucune course en cours</p>
                <p className="text-sm mt-1" style={{ color: '#A0A0A0' }}>Acceptez une course pour commencer.</p>
                <button onClick={() => setTab('available')} className="mt-4 px-5 py-2 rounded-full font-bold text-sm tap"
                  style={{ background: ORANGE, color: '#FFF' }}>
                  Voir les courses
                </button>
              </div>
            )}
          </>
        )}

        {/* ── TAB : TERMINÉES ── */}
        {tab === 'done' && (
          <>
            {historyLoading ? (
              [0,1,2].map(i => <div key={i} className="h-24 rounded-3xl" style={{ background: '#E8E0D8', animation: 'pulse 1.5s infinite' }} />)
            ) : history.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-base" style={{ color: '#1C1C1C' }}>Historique</p>
                  <button onClick={loadHistory} className="tap" style={{ color: ORANGE }}>
                    <RefreshCw size={15} className={historyLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
                {history.map(d => <CompletedCard key={d.id} delivery={d} />)}
              </>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl">📋</span>
                <p className="font-extrabold text-base mt-4" style={{ color: '#1C1C1C' }}>Aucune course terminée</p>
                <p className="text-sm mt-1" style={{ color: '#A0A0A0' }}>Votre historique apparaîtra ici.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
