import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Wallet, Package, Star, ChevronRight, Truck,
  Bell, Zap, ArrowUpRight, Clock, MapPin,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';
import { formatFCFA, resolvePhotoUrl } from '../lib/format';
import { listenNewDelivery, listenDriverAssigned } from '../lib/echo';
import { vibrate, notify, playAlert, requestNotificationPermission } from '../lib/alert';
import type { EarningsSummary, Delivery } from '../lib/types';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
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

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-11 w-11 ring-2 ring-card shadow-soft">
                {photoUrl ? <AvatarImage src={photoUrl} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-base">
                  {driver?.name?.[0]?.toUpperCase() ?? 'L'}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${isOnline ? 'bg-success-500' : 'bg-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bonjour</p>
              <p className="font-bold text-base leading-tight text-foreground">
                {driver?.name?.split(' ')[0] || 'Livreur'}
              </p>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-card shadow-xs">
            <Bell size={18} strokeWidth={2} className="text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          </Button>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-5 space-y-3"
      >

        {/* ── TOGGLE EN LIGNE ── */}
        <motion.div variants={fadeUp}>
          <Card
            className={`overflow-hidden transition-all duration-300 ${
              isOnline
                ? 'border-success-500/30 bg-success-50 shadow-soft'
                : 'border-border'
            }`}
          >
            <CardContent className="p-4">
              <button
                onClick={toggleOnline}
                disabled={togglingOnline || !!activeDelivery}
                className="w-full flex items-center gap-3.5 tap disabled:opacity-60"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isOnline ? 'bg-success-500' : 'bg-muted'
                }`}>
                  <Zap size={20} strokeWidth={2.5} className={isOnline ? 'text-white' : 'text-muted-foreground'} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm text-foreground">
                    {togglingOnline ? 'Mise à jour...' : isOnline ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isOnline ? 'Vous recevez des courses' : 'Activez pour recevoir des courses'}
                  </p>
                </div>
                <Switch
                  checked={isOnline}
                  disabled={togglingOnline || !!activeDelivery}
                  className={isOnline ? 'bg-success-500' : ''}
                />
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── COURSE ACTIVE ── */}
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
                    <p className="text-white/50 text-xs truncate mt-0.5">{activeDelivery.order.restaurant.name}</p>
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
                    <span className="text-white/70 text-xs">
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
                  <Zap size={16} className="text-primary" />
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
            <Card className="shadow-xs">
              <CardContent className="p-0">
                <button
                  onClick={() => isOnline ? go({ name: 'deliveries' }) : undefined}
                  className="w-full px-4 py-3.5 flex items-center gap-3 tap"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 relative">
                    <Package size={18} className="text-primary" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm text-foreground">Courses disponibles</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pendingCount > 0
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

        {/* ── PERFORMANCE ── */}
        <motion.div variants={fadeUp}>
          <Card className="shadow-xs">
            <CardContent className="p-4">
              <p className="font-bold text-sm text-foreground mb-3">Performance</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 bg-primary/10">
                    <Truck size={16} className="text-primary" />
                  </div>
                  <p className="font-bold text-lg tabular text-foreground leading-tight">{dailyDone}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Courses</p>
                </div>

                <div className="text-center border-x border-border">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 bg-primary/10">
                    <TrendingUp size={16} className="text-primary" />
                  </div>
                  <p className="font-bold text-lg tabular text-foreground leading-tight">
                    {formatFCFA(earnings?.this_week ?? 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Semaine</p>
                </div>

                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 bg-warning-50">
                    <Star size={16} className="text-warning-500" />
                  </div>
                  <p className="font-bold text-lg tabular text-foreground leading-tight">{ratingNum.toFixed(1)}</p>
                  <div className="flex items-center justify-center gap-px mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={8} fill={i <= Math.round(ratingNum) ? 'currentColor' : 'none'} className="text-warning-500" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── QUICK ACTIONS ── */}
        <motion.div variants={fadeUp}>
          <Card className="shadow-xs border-primary/10 bg-primary/[0.03]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                <MapPin size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">Zone active</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {driver?.city ?? 'Non définie'}{driver?.zone ? ` · ${driver.zone}` : ''}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => go({ name: 'earnings' })} className="shrink-0 text-xs">
                Mes stats
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
