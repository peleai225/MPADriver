import { useEffect, useState, useRef, useCallback } from 'react';
import { Truck, Banknote, TrendingUp, Star, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';
import { formatFCFA } from '../lib/format';
import { listenNewDelivery, listenDriverAssigned } from '../lib/echo';
import { vibrate, notify, playAlert, requestNotificationPermission } from '../lib/alert';
import type { EarningsSummary, Delivery } from '../lib/types';
import { Card, CardContent } from '../components/ui/card';
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
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="relative bg-ink-950 overflow-hidden safe-top">
        <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,.25) 0%, transparent 65%)' }} />

        <div className="relative px-4 pt-4 pb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-ink-400 text-xs mb-0.5">Bonjour 👋</p>
              <p className="text-white font-extrabold text-xl leading-tight">
                {driver?.name?.split(' ')[0] || 'Livreur'}
              </p>
              {driver?.city && <p className="text-ink-500 text-xs mt-0.5">{driver.city}</p>}
            </div>

            <button
              onClick={toggleOnline}
              disabled={togglingOnline || !!activeDelivery}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tap disabled:opacity-50 transition-colors',
                isOnline
                  ? 'bg-success-500 text-white shadow-[0_4px_14px_rgba(34,197,94,.4)]'
                  : 'bg-white/10 text-white/70 border border-white/10',
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-white animate-pulse' : 'bg-white/40')} />
              {togglingOnline ? '...' : isOnline ? 'En ligne' : 'Hors ligne'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-3.5">
              <p className="text-ink-400 text-xs mb-1">Gains aujourd'hui</p>
              <p className="text-white font-extrabold text-xl">{formatFCFA(earnings?.today ?? 0)}</p>
              <p className="text-ink-500 text-[10px] mt-0.5">
                {earnings?.deliveries_today ?? 0} course{(earnings?.deliveries_today ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-brand-500/20 border border-brand-500/20 rounded-2xl p-3.5">
              <p className="text-ink-400 text-xs mb-1">Solde disponible</p>
              <p className="text-brand-400 font-extrabold text-xl">{formatFCFA(earnings?.balance_available ?? 0)}</p>
              <p className="text-ink-500 text-[10px] mt-0.5">Disponible</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 mt-4">
        {/* Course active */}
        {activeDelivery && (
          <button
            onClick={() => go({ name: 'active-delivery' })}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-3xl p-4 flex items-center gap-3 shadow-pop tap"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/20 grid place-items-center shrink-0">
              <Truck size={22} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Course en cours</p>
              <p className="text-white/70 text-xs truncate">{activeDelivery.order.restaurant.name} → client</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 grid place-items-center">
              <ChevronRight size={16} className="text-white" />
            </div>
          </button>
        )}

        {/* Courses disponibles */}
        {!activeDelivery && isOnline && (
          <button
            onClick={() => go({ name: 'deliveries' })}
            className="w-full bg-white rounded-3xl p-4 shadow-card flex items-center gap-3 tap border border-ink-100"
          >
            <div className="w-11 h-11 rounded-2xl bg-brand-50 grid place-items-center shrink-0 relative">
              <Truck size={21} className="text-brand-600" />
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[9px] font-bold grid place-items-center shadow-sm">
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
          <div className="bg-white rounded-3xl p-4 shadow-card flex items-center gap-3 border border-ink-100">
            <div className="w-11 h-11 rounded-2xl bg-ink-50 grid place-items-center shrink-0">
              <AlertCircle size={20} className="text-ink-400" />
            </div>
            <div>
              <p className="font-semibold text-ink-700 text-sm">Vous êtes hors ligne</p>
              <p className="text-ink-400 text-xs mt-0.5">Passez en ligne pour recevoir des courses.</p>
            </div>
          </div>
        )}

        {/* Stats semaine */}
        <Card>
          <CardContent className="pt-4">
            <p className="font-bold text-ink-900 text-sm mb-4">Cette semaine</p>
            <div className="grid grid-cols-3 gap-2">
              <StatCell
                icon={<Truck size={16} className="text-brand-600" />}
                bg="bg-brand-50"
                value={String(earnings?.deliveries_today ?? 0)}
                label="Auj."
              />
              <StatCell
                icon={<Banknote size={16} className="text-success-600" />}
                bg="bg-success-50"
                value={formatFCFA(earnings?.this_week ?? 0)}
                label="Semaine"
              />
              <StatCell
                icon={<Star size={16} className="text-warning-500" />}
                bg="bg-warning-50"
                value={ratingDisplay}
                label="Note"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lien gains */}
        <button
          onClick={() => go({ name: 'earnings' })}
          className="w-full bg-white rounded-3xl p-4 shadow-card flex items-center gap-3 tap border border-ink-100"
        >
          <div className="w-11 h-11 rounded-2xl bg-success-50 grid place-items-center shrink-0">
            <TrendingUp size={21} className="text-success-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-ink-900 text-sm">Total cumulé</p>
            <p className="text-success-600 font-extrabold text-base">{formatFCFA(earnings?.total_lifetime ?? 0)}</p>
          </div>
          <ChevronRight size={18} className="text-ink-300" />
        </button>
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
      <div className={cn('w-10 h-10 rounded-2xl grid place-items-center mx-auto mb-2', bg)}>
        {icon}
      </div>
      <p className="font-extrabold text-ink-900 text-base leading-tight">{value}</p>
      <p className="text-ink-400 text-[10px] mt-0.5">{label}</p>
    </div>
  );
}
