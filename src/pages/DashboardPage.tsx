import { useEffect, useState, useRef, useCallback } from 'react';
import { TrendingUp, Wallet, Package, Star, ChevronRight, Truck } from 'lucide-react';
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
import { Badge } from '../components/ui/badge';

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
  const photoUrl = resolvePhotoUrl(driver?.photo_url);

  return (
    <div className="min-h-screen pb-28 bg-background">

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 gradient-flame">
              {photoUrl ? (
                <AvatarImage src={photoUrl} />
              ) : null}
              <AvatarFallback className="bg-transparent text-white font-extrabold text-xl">
                {driver?.name?.[0]?.toUpperCase() ?? 'L'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Bonjour 👋</p>
              <p className="font-extrabold text-xl leading-tight text-foreground">
                {driver?.name?.split(' ')[0] || 'Livreur'}
              </p>
            </div>
          </div>

          <div className="relative">
            <Button variant="outline" size="icon" className="rounded-full h-11 w-11 shadow-soft">
              <span className="text-xl">🔔</span>
            </Button>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-background bg-primary" />
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-3">
        <Card className="overflow-hidden border-0 gradient-brand" style={{ minHeight: '140px' }}>
          <CardContent className="p-4 relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 bg-white/25">
              <TrendingUp size={18} className="text-white" />
            </div>
            <p className="text-white/80 text-xs mb-1">Gains aujourd'hui</p>
            <p className="text-white font-extrabold text-2xl leading-tight">{formatFCFA(earnings?.today ?? 0)}</p>
            <p className="text-white/60 text-[11px] mt-1">
              {earnings?.deliveries_today ?? 0} course{(earnings?.deliveries_today ?? 0) !== 1 ? 's' : ''}
            </p>
            <svg className="absolute bottom-0 left-0 right-0 w-full" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d="M0,20 Q25,5 50,20 T100,20 T150,20 T200,20 L200,40 L0,40 Z" fill="rgba(255,255,255,0.1)" />
            </svg>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-foreground" style={{ minHeight: '140px' }}>
          <CardContent className="p-4 relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 bg-white/15">
              <Wallet size={18} className="text-white" />
            </div>
            <p className="text-white/70 text-xs mb-1">Solde disponible</p>
            <p className="text-white font-extrabold text-2xl leading-tight">{formatFCFA(earnings?.balance_available ?? 0)}</p>
            <p className="text-white/50 text-[11px] mt-1">{earnings?.deliveries_today ?? 0} courses aujourd'hui</p>
            <div className="absolute bottom-3 right-3 opacity-20">
              <Wallet size={44} className="text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-5 mt-3 space-y-3">

        {/* ── TOGGLE EN LIGNE ── */}
        <Card className={isOnline ? 'border-0 gradient-brand shadow-pop' : ''}>
          <CardContent className="p-4">
            <button
              onClick={toggleOnline}
              disabled={togglingOnline || !!activeDelivery}
              className="w-full flex items-center gap-3 tap disabled:opacity-60"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isOnline ? 'bg-white/25' : 'bg-muted'}`}>
                <span className={`w-4 h-4 rounded-full ${isOnline ? 'bg-success-500 shadow-[0_0_0_3px_rgba(34,197,94,0.3)]' : 'bg-muted-foreground'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-extrabold text-base ${isOnline ? 'text-white' : 'text-foreground'}`}>
                  {togglingOnline ? 'Mise à jour...' : isOnline ? 'En ligne' : 'Hors ligne'}
                </p>
                <p className={`text-sm ${isOnline ? 'text-white/75' : 'text-muted-foreground'}`}>
                  {isOnline ? 'Vous recevez des courses' : 'Appuyez pour passer en ligne'}
                </p>
              </div>
              {isOnline && <span className="text-4xl opacity-90 select-none">🛵</span>}
              <Switch
                checked={isOnline}
                disabled={togglingOnline || !!activeDelivery}
                className={isOnline ? 'bg-white/35' : ''}
              />
            </button>
          </CardContent>
        </Card>

        {/* ── COURSE ACTIVE ── */}
        {activeDelivery && (
          <Button
            variant="dark"
            size="lg"
            onClick={() => go({ name: 'active-delivery' })}
            className="w-full rounded-3xl justify-start gap-3"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-primary/20">
              <Truck size={22} className="text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Course en cours</p>
              <p className="text-white/50 text-xs truncate">{activeDelivery.order.restaurant.name} → client</p>
            </div>
            <ChevronRight size={18} className="text-white/40" />
          </Button>
        )}

        {/* ── COURSES DISPONIBLES ── */}
        {!activeDelivery && (
          <Card>
            <CardContent className="p-0">
              <button
                onClick={() => isOnline ? go({ name: 'deliveries' }) : undefined}
                className="w-full px-4 py-3 flex items-center gap-3 tap"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 relative">
                  <Package size={21} className="text-primary" />
                  {pendingCount > 0 && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 justify-center text-[9px]">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-base text-foreground">Courses disponibles</p>
                  <p className="text-sm text-muted-foreground">
                    {pendingCount > 0
                      ? `${pendingCount} course${pendingCount > 1 ? 's' : ''} en attente`
                      : 'Aucune course pour le moment'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {/* ── CETTE SEMAINE ── */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-extrabold text-base text-foreground">Cette semaine</p>
              <Badge variant="muted">
                7 jours <ChevronRight size={12} className="rotate-90 ml-0.5" />
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-primary/10">
                  <Truck size={20} className="text-primary" />
                </div>
                <p className="font-extrabold text-xl text-foreground">{earnings?.deliveries_today ?? 0}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">Courses</p>
                <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 h-4 text-primary border-primary/30">Auj.</Badge>
              </div>

              <div className="text-center border-x border-border">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-primary/10">
                  <TrendingUp size={20} className="text-primary" />
                </div>
                <p className="font-extrabold text-xl text-foreground">{formatFCFA(earnings?.this_week ?? 0)}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">Gains</p>
                <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 h-4 text-primary border-primary/30">Semaine</Badge>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-primary/10">
                  <Star size={20} className="text-primary" />
                </div>
                <p className="font-extrabold text-xl text-foreground">{ratingDisplay}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">Note</p>
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={9} fill={i <= Math.round(ratingNum) ? 'currentColor' : 'none'} className="text-primary" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── MOTIVATION BANNER ── */}
        <Card className="border-primary/15 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-3xl shrink-0">🏆</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm text-foreground">Excellent travail !</p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                Continuez ainsi pour débloquer plus d'avantages.
              </p>
            </div>
            <Button size="sm" onClick={() => go({ name: 'earnings' })} className="shrink-0">
              Voir mes stats
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
