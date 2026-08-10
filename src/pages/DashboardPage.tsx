import { useEffect, useState, useRef, useCallback } from 'react';
import { Truck, Banknote, Star, ChevronRight, AlertCircle, Bell } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';
import { formatFCFA } from '../lib/format';
import { listenNewDelivery, listenDriverAssigned } from '../lib/echo';
import { vibrate, notify, playAlert, requestNotificationPermission } from '../lib/alert';
import type { EarningsSummary, Delivery } from '../lib/types';
import { cn } from '../lib/utils';

export function DashboardPage() {
  const { driver, refresh } = useAuth();
  const { go } = useNav();
  const { show } = useToast();

  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const unsubsRef = useRef<Array<() => void>>([]);

  const loadPending = useCallback(async (silent = false) => {
    try {
      const d = await api.getPendingDeliveries();
      setPendingCount(d.length);
      if (!silent && d.length > 0) show(`${d.length} course${d.length > 1 ? 's' : ''} disponible${d.length > 1 ? 's' : ''} !`, 'success');
    } catch {}
  }, [show]);

  // Chargement initial
  useEffect(() => {
    api.getEarnings().then(setEarnings).catch(() => {});
    api.getActiveDelivery().then(setActiveDelivery).catch(() => {});
    loadPending(true);
    requestNotificationPermission();
  }, [loadPending]);

  // Souscriptions Pusher
  useEffect(() => {
    if (!driver?.city || !driver?.is_available) return;
    let active = true;
    const unsubs: Array<() => void> = [];

    // Canal ville : nouvelle course disponible
    listenNewDelivery(driver.city, () => {
      if (!active) return;
      loadPending(true);
      vibrate([200, 100, 200, 100, 200]);
      playAlert();
      notify('🛵 Nouvelle course !', 'Une course est disponible dans votre zone.', () => go({ name: 'deliveries' }));
      show('🛵 Nouvelle course disponible !', 'success');
    }).then(unsub => { if (active) unsubs.push(unsub); });

    // Canal privé livreur : assignation automatique
    if (driver?.id) {
      listenDriverAssigned(driver.id, (data: any) => {
        if (!active) return;
        api.getActiveDelivery().then(d => { setActiveDelivery(d); }).catch(() => {});
        vibrate([300, 100, 300, 100, 500]);
        playAlert();
        notify('✅ Course assignée !', `Commande ${data?.order_ref ?? ''} — allez chercher la commande.`, () => go({ name: 'active-delivery' }));
        show('✅ Course assignée — démarrez !', 'success');
      }).then(unsub => { if (active) unsubs.push(unsub); });
    }

    unsubsRef.current = unsubs;
    return () => {
      active = false;
      unsubsRef.current.forEach(u => u());
      unsubsRef.current = [];
    };
  }, [driver?.id, driver?.city, driver?.is_available, go, show, loadPending]);

  const toggleOnline = async () => {
    if (!driver) return;
    setTogglingOnline(true);
    try {
      await api.setOnline(!driver.is_available);
      await refresh();
      show(
        driver.is_available ? 'Vous êtes hors ligne.' : 'Vous êtes en ligne !',
        driver.is_available ? 'info' : 'success',
      );
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setTogglingOnline(false);
    }
  };

  const isOnline = driver?.is_available ?? false;
  const ratingDisplay = driver?.rating != null ? Number(driver.rating).toFixed(1) : '5.0';

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F6F5' }}>
      {/* Header charcoal */}
      <div className="safe-top" style={{ background: '#1C1C1C' }}>
        <div className="px-4 pt-4 pb-6">
          {/* Top row */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 gradient-flame"
              >
                <span className="text-white font-extrabold text-base">
                  {driver?.name?.[0]?.toUpperCase() ?? 'L'}
                </span>
              </div>
              <div>
                <p className="text-white/50 text-xs">Bonjour 👋</p>
                <p className="text-white font-extrabold text-lg leading-tight">
                  {driver?.name?.split(' ')[0] || 'Livreur'}
                </p>
              </div>
            </div>
            <button className="w-10 h-10 rounded-full flex items-center justify-center tap" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Bell size={18} className="text-white/70" />
            </button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white/50 text-xs mb-1">Gains aujourd'hui</p>
              <p className="text-white font-extrabold text-xl">{formatFCFA(earnings?.today ?? 0)}</p>
              <p className="text-white/30 text-[10px] mt-0.5">
                {earnings?.deliveries_today ?? 0} course{(earnings?.deliveries_today ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,97,0,0.18)', border: '1px solid rgba(255,97,0,0.25)' }}>
              <p className="text-white/50 text-xs mb-1">Courses auj.</p>
              <p className="font-extrabold text-xl" style={{ color: '#FF6100' }}>{earnings?.deliveries_today ?? 0}</p>
              <p className="text-white/30 text-[10px] mt-0.5">Solde: {formatFCFA(earnings?.balance_available ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 mt-4">
        {/* Toggle Online/Offline */}
        <button
          onClick={toggleOnline}
          disabled={togglingOnline || !!activeDelivery}
          className={cn(
            'w-full rounded-2xl p-4 flex items-center justify-between tap disabled:opacity-50 transition-all',
          )}
          style={isOnline
            ? { background: 'linear-gradient(135deg, #FF3301, #FF6100)', boxShadow: '0 8px 24px rgba(255,97,0,.35)' }
            : { background: '#FFFFFF', border: '1px solid #E4E4E4' }
          }
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: isOnline ? 'rgba(255,255,255,0.2)' : '#F1F1F1' }}
            >
              <span
                className={cn('w-3 h-3 rounded-full', isOnline ? 'bg-white animate-pulse' : 'bg-ink-400')}
              />
            </div>
            <div className="text-left">
              <p className={cn('font-bold text-sm', isOnline ? 'text-white' : 'text-ink-900')}>
                {togglingOnline ? 'Mise à jour...' : isOnline ? 'En ligne ●' : 'Hors ligne'}
              </p>
              <p className={cn('text-xs', isOnline ? 'text-white/70' : 'text-ink-400')}>
                {isOnline ? 'Vous recevez des courses' : 'Appuyez pour passer en ligne'}
              </p>
            </div>
          </div>
          <div
            className="w-12 h-6 rounded-full relative transition-all"
            style={{ background: isOnline ? 'rgba(255,255,255,0.3)' : '#E4E4E4' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-sm"
              style={{ left: isOnline ? '26px' : '2px' }}
            />
          </div>
        </button>

        {/* Course active */}
        {activeDelivery && (
          <button
            onClick={() => go({ name: 'active-delivery' })}
            className="w-full rounded-3xl p-4 flex items-center gap-3 tap"
            style={{ background: '#1C1C1C', borderLeft: '4px solid #FF6100' }}
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,97,0,0.2)' }}>
              <Truck size={22} style={{ color: '#FF6100' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Course en cours</p>
              <p className="text-white/50 text-xs truncate">{activeDelivery.order.restaurant.name} → client</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ChevronRight size={16} className="text-white" />
            </div>
          </button>
        )}

        {/* Courses disponibles */}
        {!activeDelivery && isOnline && (
          <button
            onClick={() => go({ name: 'deliveries' })}
            className="w-full bg-white rounded-3xl p-4 shadow-soft flex items-center gap-3 tap border border-ink-100"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 relative" style={{ background: 'rgba(255,97,0,0.1)' }}>
              <Truck size={21} style={{ color: '#FF6100' }} />
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-sm gradient-flame">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-ink-900 text-sm">Courses disponibles</p>
              <p className="text-ink-500 text-xs">
                {pendingCount > 0
                  ? `${pendingCount} course${pendingCount > 1 ? 's' : ''} en attente`
                  : 'Aucune course pour le moment'}
              </p>
            </div>
            <ChevronRight size={18} className="text-ink-300" />
          </button>
        )}

        {!activeDelivery && !isOnline && (
          <div className="bg-white rounded-3xl p-4 shadow-soft flex items-center gap-3 border border-ink-100">
            <div className="w-11 h-11 rounded-2xl bg-ink-50 flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-ink-400" />
            </div>
            <div>
              <p className="font-semibold text-ink-700 text-sm">Vous êtes hors ligne</p>
              <p className="text-ink-400 text-xs mt-0.5">Passez en ligne pour recevoir des courses.</p>
            </div>
          </div>
        )}

        {/* Stats semaine */}
        <div className="bg-white rounded-3xl p-4 shadow-soft border border-ink-100">
          <p className="font-bold text-ink-900 text-sm mb-4">Cette semaine</p>
          <div className="grid grid-cols-3 gap-2">
            <StatCell
              icon={<Truck size={16} style={{ color: '#FF6100' }} />}
              bg="rgba(255,97,0,0.1)"
              value={String(earnings?.deliveries_today ?? 0)}
              label="Auj."
            />
            <StatCell
              icon={<Banknote size={16} className="text-success-600" />}
              bg="#F0FDF4"
              value={formatFCFA(earnings?.this_week ?? 0)}
              label="Semaine"
            />
            <StatCell
              icon={<Star size={16} className="text-warning-500" />}
              bg="#FFFBEB"
              value={ratingDisplay}
              label="Note"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ icon, bg, value, label }: {
  icon: React.ReactNode;
  bg: string;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: bg }}>
        {icon}
      </div>
      <p className="font-extrabold text-ink-900 text-base leading-tight">{value}</p>
      <p className="text-ink-400 text-[10px] mt-0.5">{label}</p>
    </div>
  );
}
