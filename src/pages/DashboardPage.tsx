import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Wallet, Package, Star, ChevronRight, Truck,
  Power, ArrowUpRight, Clock, MapPin, History, Headphones,
  AlertTriangle, Banknote,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';
import { formatFCFA, resolvePhotoUrl } from '../lib/format';
import { listenNewDelivery, listenDriverAssigned } from '../lib/echo';
import { vibrate, notify, playAlert, requestNotificationPermission } from '../lib/alert';
import { requestPushToken, onForegroundMessage } from '../lib/firebase';
import { usePullToRefresh } from '../lib/usePullToRefresh';
import type { EarningsSummary, Delivery } from '../lib/types';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Progress } from '../components/ui/progress';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export function DashboardPage() {
  const { driver, refresh } = useAuth();
  const { go } = useNav();
  const { show } = useToast();

  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [cashOwed, setCashOwed] = useState(0);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const unsubsRef = useRef<Array<() => void>>([]);

  const loadPending = useCallback(async (silent = false) => {
    try {
      const d = await api.getPendingDeliveries();
      setPendingCount(d.length);
      if (!silent && d.length > 0) show(`${d.length} course${d.length > 1 ? 's' : ''} disponible${d.length > 1 ? 's' : ''} !`, 'success');
    } catch {}
  }, [show]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      api.getEarnings().then(setEarnings).catch(() => {}),
      api.getActiveDelivery().then(setActiveDelivery).catch(() => {}),
      api.getCashBalance().then(r => setCashOwed(r.total_owed_xof ?? 0)).catch(() => {}),
      loadPending(true),
      refresh(),
    ]);
  }, [loadPending, refresh]);
  const pullIndicator = usePullToRefresh(handleRefresh);

  useEffect(() => {
    api.getEarnings().then(setEarnings).catch(() => {});
    api.getActiveDelivery().then(setActiveDelivery).catch(() => {});
    api.getCashBalance().then(r => setCashOwed(r.total_owed_xof ?? 0)).catch(() => {});
    loadPending(true);
    requestNotificationPermission();
    requestPushToken().catch(() => {});
    const unsubFcm = onForegroundMessage((payload: any) => {
      const title = payload?.notification?.title || 'MENUPRO Livraison';
      const body = payload?.notification?.body || '';
      show(body || title, 'success');
      vibrate([200, 100, 200]);
      playAlert();
      loadPending(true);
    });
    const poll = setInterval(() => loadPending(true), 15000);
    return () => { clearInterval(poll); unsubFcm(); };
  }, [loadPending, show]);

  useEffect(() => {
    if (!driver?.city || !driver?.is_available) return;
    let active = true;
    const unsubs: Array<() => void> = [];
    listenNewDelivery(driver.city, () => {
      if (!active) return;
      loadPending(true); vibrate([200,100,200,100,200]); playAlert();
      notify('Nouvelle course !', 'Une course est disponible dans votre zone.', () => go({ name: 'deliveries' }));
      show('Nouvelle course disponible !', 'success');
    }).then(u => { if (active) unsubs.push(u); });
    if (driver?.id) {
      listenDriverAssigned(driver.id, (data: any) => {
        if (!active) return;
        api.getActiveDelivery().then(d => setActiveDelivery(d)).catch(() => {});
        vibrate([300,100,300,100,500]); playAlert();
        notify('Course assignée !', `Commande ${data?.order_ref ?? ''} — allez chercher la commande.`, () => go({ name: 'active-delivery' }));
        show('Course assignée — démarrez !', 'success');
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
  const photoUrl = resolvePhotoUrl(driver?.photo_url);
  const dailyGoal = 10;
  const dailyDone = earnings?.deliveries_today ?? 0;
  const dailyPct = Math.min(100, (dailyDone / dailyGoal) * 100);

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div ref={pullIndicator} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-8 h-8 rounded-full bg-card shadow-card border border-border flex items-center justify-center opacity-0 transition-transform" style={{ pointerEvents: 'none' }}>
        <Truck size={16} className="text-primary" />
      </div>

      {/* ── HERO HEADER ── */}
      <div className="relative bg-foreground overflow-hidden safe-top">
        <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #EA580C 0%, transparent 65%)' }} />

        <div className="relative px-5 pt-4 pb-5">
          {/* Top bar: logo + city + rating + avatar */}
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white rounded-2xl p-1.5 shadow-soft">
              <img src="/logo.png" alt="MenuPro" className="w-9 h-9 object-contain" />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-white/90 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 font-semibold">
                <MapPin size={13} className="text-primary" />
                {driver?.city ?? 'Ville'}
              </div>

              <div className="inline-flex items-center gap-1 text-xs text-white/90 bg-white/10 border border-white/20 rounded-full px-2.5 py-1.5 font-semibold">
                <Star size={12} fill="currentColor" className="text-warning-500" />
                {ratingNum.toFixed(1)}
              </div>

              <Avatar className="h-9 w-9 ring-2 ring-white/20">
                {photoUrl ? <AvatarImage src={photoUrl} /> : null}
                <AvatarFallback className="bg-primary text-white font-bold text-sm">
                  {driver?.name?.[0]?.toUpperCase() ?? 'L'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Greeting */}
          <div className="mb-4">
            <h1 className="text-[1.6rem] font-extrabold tracking-tight text-white leading-tight">
              {getGreeting()}{driver?.name ? `, ${driver.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-white/50 text-sm mt-0.5">Prêt à livrer aujourd'hui ?</p>
          </div>

          {/* Online toggle */}
          <button
            onClick={toggleOnline}
            disabled={togglingOnline || !!activeDelivery}
            className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 tap transition-all disabled:opacity-60 ${
              isOnline
                ? 'bg-success-500/20 border border-success-500/30'
                : 'bg-white/8 border border-white/15'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isOnline ? 'bg-success-500' : 'bg-white/15'
            }`}>
              <Power size={20} strokeWidth={2.5} className={isOnline ? 'text-white' : 'text-white/50'} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm text-white">
                {togglingOnline ? 'Mise à jour...' : isOnline ? 'En ligne' : 'Hors ligne'}
              </p>
              <p className="text-[11px] text-white/40">
                {isOnline ? 'Vous recevez des courses' : 'Activez pour recevoir des courses'}
              </p>
            </div>
            <div className={`w-12 h-7 rounded-full relative transition-colors ${isOnline ? 'bg-success-500' : 'bg-white/20'}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${isOnline ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-5 space-y-3 pt-4"
      >

        {/* ── CASH ALERT ── */}
        {cashOwed > 0 && (
          <motion.div variants={fadeUp}>
            <button
              onClick={() => go({ name: 'earnings' })}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-destructive/10 border border-destructive/20 tap"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-destructive/15">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-destructive">Cash à reverser</p>
                <p className="text-xs text-destructive/70">{formatFCFA(cashOwed)} en attente</p>
              </div>
              <ChevronRight size={16} className="text-destructive/50" />
            </button>
          </motion.div>
        )}

        {/* ── ACTIVE DELIVERY ── */}
        {activeDelivery && (
          <motion.div variants={fadeUp}>
            <Card className="overflow-hidden border-0 gradient-dark shadow-elevated">
              <CardContent className="p-0">
                <button
                  onClick={() => go({ name: 'active-delivery' })}
                  className="w-full px-4 py-3.5 flex items-center gap-3 tap"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/15">
                    <Truck size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-sm">Course en cours</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                    </div>
                    <p className="text-white/50 text-xs truncate mt-0.5">{activeDelivery.order?.restaurant?.name ?? 'Course'}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10">
                    <ArrowUpRight size={16} className="text-white" />
                  </div>
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── EARNINGS HERO ── */}
        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden border-0 gradient-hero shadow-pop">
            <CardContent className="p-5 relative">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
                      <TrendingUp size={16} className="text-white" />
                    </div>
                    <p className="text-white/80 text-xs font-medium">Gains aujourd'hui</p>
                  </div>
                  <button
                    onClick={() => go({ name: 'earnings' })}
                    className="flex items-center gap-1 text-white/60 text-xs font-medium tap hover:text-white/90"
                  >
                    Détails <ChevronRight size={12} />
                  </button>
                </div>

                <p className="text-white font-extrabold text-3xl tabular leading-none">
                  {formatFCFA(earnings?.today ?? 0)}
                </p>

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Truck size={12} className="text-white/60" />
                    <span className="text-white/70 text-xs tabular">
                      {dailyDone} course{dailyDone !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-white/60" />
                    <span className="text-white/70 text-xs tabular">
                      Semaine : {formatFCFA(earnings?.this_week ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── BALANCE + OBJECTIF ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <Card className="shadow-xs">
            <CardContent className="p-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 bg-muted">
                <Wallet size={16} className="text-foreground" />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Solde</p>
              <p className="font-bold text-lg tabular leading-tight text-foreground mt-0.5">
                {formatFCFA(earnings?.balance_available ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                  <Truck size={16} className="text-primary" />
                </div>
                <span className="text-xs font-bold tabular text-primary">{dailyDone}/{dailyGoal}</span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Objectif du jour</p>
              <Progress value={dailyPct} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        {/* ── COURSES DISPONIBLES ── */}
        {!activeDelivery && (
          <motion.div variants={fadeUp}>
            <Card className={`shadow-xs transition-all ${pendingCount > 0 && isOnline ? 'border-primary/30 bg-primary/[0.03] shadow-card' : ''}`}>
              <CardContent className="p-0">
                <button
                  onClick={() => isOnline ? go({ name: 'deliveries' }) : undefined}
                  className="w-full px-4 py-3.5 flex items-center gap-3 tap"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${pendingCount > 0 && isOnline ? 'bg-primary/15' : 'bg-primary/10'}`}>
                    <Package size={18} className="text-primary" />
                    {pendingCount > 0 && isOnline && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm text-foreground">Courses disponibles</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {!isOnline
                        ? 'Passez en ligne pour voir les courses'
                        : pendingCount > 0
                          ? `${pendingCount} en attente près de vous`
                          : 'Aucune course pour le moment'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── RACCOURCIS ── */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction icon={Wallet} label="Gains" onClick={() => go({ name: 'earnings' })} />
            <QuickAction icon={History} label="Historique" onClick={() => go({ name: 'deliveries' })} />
            <QuickAction icon={Banknote} label="Cash" onClick={() => go({ name: 'earnings' })} accent={cashOwed > 0} />
            <QuickAction icon={Headphones} label="Aide" onClick={() => window.open('tel:+2250501862640')} />
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, accent }: {
  icon: React.ElementType; label: string; onClick: () => void; accent?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 py-3 tap rounded-2xl">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent ? 'bg-destructive/10' : 'bg-muted'}`}>
        <Icon size={18} className={accent ? 'text-destructive' : 'text-foreground'} />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}
