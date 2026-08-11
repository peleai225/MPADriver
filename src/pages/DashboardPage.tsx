import { useEffect, useState, useRef, useCallback } from 'react';
import { TrendingUp, Wallet, Package, Bell, Star, ChevronRight, Truck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';
import { formatFCFA } from '../lib/format';
import { listenNewDelivery, listenDriverAssigned } from '../lib/echo';
import { vibrate, notify, playAlert, requestNotificationPermission } from '../lib/alert';
import type { EarningsSummary, Delivery } from '../lib/types';

const BG = '#F5F0EB';
const ORANGE = '#FF6100';

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

  useEffect(() => {
    api.getEarnings().then(setEarnings).catch(() => {});
    api.getActiveDelivery().then(setActiveDelivery).catch(() => {});
    loadPending(true);
    requestNotificationPermission();
    const poll = setInterval(() => loadPending(true), 15000);
    return () => clearInterval(poll);
  }, [loadPending]);

  useEffect(() => {
    if (!driver?.city || !driver?.is_available) return;
    let active = true;
    const unsubs: Array<() => void> = [];
    listenNewDelivery(driver.city, () => {
      if (!active) return;
      loadPending(true); vibrate([200,100,200,100,200]); playAlert();
      notify('🛵 Nouvelle course !', 'Une course est disponible dans votre zone.', () => go({ name: 'deliveries' }));
      show('🛵 Nouvelle course disponible !', 'success');
    }).then(u => { if (active) unsubs.push(u); });
    if (driver?.id) {
      listenDriverAssigned(driver.id, (data: any) => {
        if (!active) return;
        api.getActiveDelivery().then(d => setActiveDelivery(d)).catch(() => {});
        vibrate([300,100,300,100,500]); playAlert();
        notify('✅ Course assignée !', `Commande ${data?.order_ref ?? ''} — allez chercher la commande.`, () => go({ name: 'active-delivery' }));
        show('✅ Course assignée — démarrez !', 'success');
      }).then(u => { if (active) unsubs.push(u); });
    }
    unsubsRef.current = unsubs;
    return () => { active = false; unsubsRef.current.forEach(u => u()); unsubsRef.current = []; };
  }, [driver?.id, driver?.city, driver?.is_available, go, show, loadPending]);

  const toggleOnline = async () => {
    if (!driver) return;
    setTogglingOnline(true);
    try {
      await api.setOnline(!driver.is_available);
      await refresh();
      show(driver.is_available ? 'Vous êtes hors ligne.' : 'Vous êtes en ligne !', driver.is_available ? 'info' : 'success');
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setTogglingOnline(false);
    }
  };

  const isOnline = driver?.is_available ?? false;
  const ratingNum = driver?.rating != null ? Number(driver.rating) : 5.0;
  const ratingDisplay = ratingNum.toFixed(1);

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-4 pb-2">
        <div className="flex items-center justify-between">
          {/* Avatar + greeting */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF3301, #FF6100)' }}
            >
              <span className="text-white font-extrabold text-xl">
                {driver?.name?.[0]?.toUpperCase() ?? 'L'}
              </span>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#A0A0A0' }}>Bonjour 👋</p>
              <p className="font-extrabold text-xl leading-tight" style={{ color: '#1C1C1C' }}>
                {driver?.name?.split(' ')[0] || 'Livreur'}
              </p>
            </div>
          </div>

          {/* Bell */}
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center tap"
              style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              <Bell size={20} style={{ color: '#1C1C1C' }} />
            </div>
            <span
              className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{ background: ORANGE }}
            />
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-3">
        {/* Gains aujourd'hui — orange */}
        <div
          className="rounded-3xl p-4 overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #FF6100, #FF3301)', minHeight: '140px' }}
        >
          {/* Icône */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.25)' }}>
            <TrendingUp size={18} className="text-white" />
          </div>
          <p className="text-white/80 text-xs mb-1">Gains aujourd'hui</p>
          <p className="text-white font-extrabold text-2xl leading-tight">{formatFCFA(earnings?.today ?? 0)}</p>
          <p className="text-white/60 text-[11px] mt-1">
            {earnings?.deliveries_today ?? 0} course{(earnings?.deliveries_today ?? 0) !== 1 ? 's' : ''}
          </p>
          {/* Wave déco */}
          <svg className="absolute bottom-0 left-0 right-0 w-full" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
            <path d="M0,20 Q25,5 50,20 T100,20 T150,20 T200,20 L200,40 L0,40 Z" fill="rgba(255,255,255,0.1)" />
          </svg>
        </div>

        {/* Solde disponible — violet foncé */}
        <div
          className="rounded-3xl p-4 overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #3B2D8F, #2D1F6E)', minHeight: '140px' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Wallet size={18} className="text-white" />
          </div>
          <p className="text-white/70 text-xs mb-1">Solde disponible</p>
          <p className="text-white font-extrabold text-2xl leading-tight">{formatFCFA(earnings?.balance_available ?? 0)}</p>
          <p className="text-white/50 text-[11px] mt-1">
            {earnings?.deliveries_today ?? 0} courses aujourd'hui
          </p>
          {/* Wallet déco */}
          <div className="absolute bottom-3 right-3 opacity-20">
            <Wallet size={44} className="text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 mt-3 space-y-3">

        {/* ── TOGGLE EN LIGNE ── */}
        <button
          onClick={toggleOnline}
          disabled={togglingOnline || !!activeDelivery}
          className="w-full rounded-3xl p-4 flex items-center gap-3 tap disabled:opacity-60 overflow-hidden relative"
          style={{
            background: isOnline
              ? 'linear-gradient(135deg, #FF6100, #FF8C00)'
              : '#FFFFFF',
            boxShadow: isOnline ? '0 8px 24px rgba(255,97,0,.3)' : '0 2px 12px rgba(0,0,0,0.06)',
            border: isOnline ? 'none' : '1px solid #EEEEEE',
          }}
        >
          {/* Dot status */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: isOnline ? 'rgba(255,255,255,0.25)' : '#F1F1F1' }}
          >
            <span
              className="w-4 h-4 rounded-full"
              style={{
                background: isOnline ? '#22C55E' : '#CBCBCB',
                boxShadow: isOnline ? '0 0 0 3px rgba(34,197,94,0.3)' : 'none',
              }}
            />
          </div>

          <div className="flex-1 text-left">
            <p className="font-extrabold text-base" style={{ color: isOnline ? '#FFFFFF' : '#1C1C1C' }}>
              {togglingOnline ? 'Mise à jour...' : isOnline ? 'En ligne' : 'Hors ligne'}
            </p>
            <p className="text-sm" style={{ color: isOnline ? 'rgba(255,255,255,0.75)' : '#A0A0A0' }}>
              {isOnline ? 'Vous recevez des courses' : 'Appuyez pour passer en ligne'}
            </p>
          </div>

          {/* Moto emoji déco */}
          {isOnline && (
            <span className="text-4xl absolute right-16 top-1/2 -translate-y-1/2 opacity-90 select-none">🛵</span>
          )}

          {/* Toggle switch */}
          <div
            className="w-13 h-7 rounded-full relative shrink-0 transition-all"
            style={{ background: isOnline ? 'rgba(255,255,255,0.35)' : '#E4E4E4', width: '52px', height: '28px' }}
          >
            <div
              className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: isOnline ? '24px' : '2px' }}
            />
          </div>
        </button>

        {/* ── COURSE ACTIVE ── */}
        {activeDelivery && (
          <button
            onClick={() => go({ name: 'active-delivery' })}
            className="w-full rounded-3xl p-4 flex items-center gap-3 tap"
            style={{ background: '#1C1C1C', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,97,0,0.2)' }}>
              <Truck size={22} style={{ color: ORANGE }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Course en cours</p>
              <p className="text-white/50 text-xs truncate">{activeDelivery.order.restaurant.name} → client</p>
            </div>
            <ChevronRight size={18} className="text-white/40" />
          </button>
        )}

        {/* ── COURSES DISPONIBLES ── */}
        {!activeDelivery && (
          <button
            onClick={() => isOnline ? go({ name: 'deliveries' }) : undefined}
            className="w-full rounded-3xl p-4 flex items-center gap-3 tap"
            style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 relative"
              style={{ background: 'rgba(255,97,0,0.1)' }}
            >
              <Package size={21} style={{ color: ORANGE }} />
              {pendingCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                  style={{ background: ORANGE }}
                >
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-base" style={{ color: '#1C1C1C' }}>Courses disponibles</p>
              <p className="text-sm" style={{ color: '#A0A0A0' }}>
                {pendingCount > 0
                  ? `${pendingCount} course${pendingCount > 1 ? 's' : ''} en attente`
                  : 'Aucune course pour le moment'}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#F5F0EB' }}
            >
              <ChevronRight size={16} style={{ color: '#A0A0A0' }} />
            </div>
          </button>
        )}

        {/* ── CETTE SEMAINE ── */}
        <div
          className="rounded-3xl p-4"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="font-extrabold text-base" style={{ color: '#1C1C1C' }}>Cette semaine</p>
            <div
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: '#F5F0EB', color: '#717171' }}
            >
              7 jours <ChevronRight size={12} className="rotate-90" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Courses */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,97,0,0.1)' }}>
                <Truck size={20} style={{ color: ORANGE }} />
              </div>
              <p className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>{earnings?.deliveries_today ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>Courses</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: ORANGE }}>Auj.</p>
            </div>

            {/* Gains */}
            <div className="text-center border-x" style={{ borderColor: '#F1F1F1' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,97,0,0.1)' }}>
                <TrendingUp size={20} style={{ color: ORANGE }} />
              </div>
              <p className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>{formatFCFA(earnings?.this_week ?? 0)}</p>
              <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>Gains</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: ORANGE }}>Semaine</p>
            </div>

            {/* Note */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,97,0,0.1)' }}>
                <Star size={20} style={{ color: ORANGE }} />
              </div>
              <p className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>{ratingDisplay}</p>
              <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>Note moyenne</p>
              {/* Stars */}
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={9}
                    fill={i <= Math.round(ratingNum) ? ORANGE : 'none'}
                    style={{ color: ORANGE }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── MOTIVATION BANNER ── */}
        <div
          className="rounded-3xl p-4 flex items-center gap-3"
          style={{ background: '#FFF4EE', border: '1px solid rgba(255,97,0,0.15)' }}
        >
          <span className="text-3xl shrink-0">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm" style={{ color: '#1C1C1C' }}>Excellent travail !</p>
            <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
              Continuez ainsi pour débloquer plus d'avantages.
            </p>
          </div>
          <button
            onClick={() => go({ name: 'earnings' })}
            className="shrink-0 px-3 py-2 rounded-xl text-white text-xs font-bold tap"
            style={{ background: 'linear-gradient(135deg, #FF3301, #FF6100)' }}
          >
            Voir mes stats
          </button>
        </div>

      </div>
    </div>
  );
}
