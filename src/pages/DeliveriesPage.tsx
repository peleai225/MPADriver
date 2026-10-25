import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, MapPin, Clock, ChevronRight, Package, Truck,
  CheckCircle2, Search, Inbox, WifiOff, Power,
} from 'lucide-react';
import { HistoryDetailSheet } from '../components/HistoryDetailSheet';
import { useOnline, isNetworkError } from '../lib/network';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { listenNewDelivery } from '../lib/echo';
import { vibrate, playAlert } from '../lib/alert';
import { DeliveryCard } from '../components/DeliveryCard';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { usePullToRefresh } from '../lib/usePullToRefresh';
import { clearBadge } from '../lib/badge';
import { DELIVERY_CANCELLED_EVENT } from '../lib/deliveryEvents';
import type { Delivery } from '../lib/types';
import { formatFCFA, DELIVERY_STATUS_LABELS } from '../lib/format';

type Tab = 'available' | 'active' | 'done';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function CompletedCard({ delivery, onOpen }: { delivery: Delivery; onOpen: () => void }) {
  // L'endpoint history retourne les champs à plat (restaurant, order_ref, earning)
  // L'endpoint active retourne order.restaurant, order.reference, driver_earning_estimate
  const restaurant = delivery.restaurant ?? delivery.order?.restaurant;
  const reference = delivery.order_ref ?? delivery.order?.reference;
  const earning = delivery.earning?.net_amount ?? delivery.driver_earning_estimate;
  const address = delivery.customer?.address ?? delivery.order?.delivery_address;
  const statusLabel = DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status;
  const isDone = delivery.status === 'delivered';
  const isCancelled = delivery.status === 'cancelled';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button type="button" onClick={onOpen} className="w-full text-left tap block">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/8 overflow-hidden">
            {restaurant?.logo_url
              ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-muted"><Package size={18} className="text-muted-foreground" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-foreground">{restaurant?.name ?? 'Restaurant inconnu'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-muted-foreground" />
              <p className="text-xs truncate text-muted-foreground">
                {address ? address.split(',')[0] : (restaurant?.address ?? '—')}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <Badge variant={isDone ? 'success' : isCancelled ? 'destructive' : 'muted'}>{statusLabel}</Badge>
            {isDone && earning != null && earning > 0 && (
              <p className="text-sm font-extrabold mt-1 tabular text-primary">
                +{formatFCFA(earning)}
              </p>
            )}
          </div>
        </div>
        <div className="px-4 py-2.5 flex items-center gap-4 border-t border-border/60">
          <span className="text-xs text-muted-foreground tabular">
            {reference ? `#${reference}` : '—'}
          </span>
          {isCancelled && delivery.cancellation_reason && (
            <span className="text-xs text-destructive/70 truncate flex-1">{delivery.cancellation_reason}</span>
          )}
          {delivery.distance_km != null && (
            <div className="flex items-center gap-1 ml-auto">
              <MapPin size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground tabular">{Number(delivery.distance_km).toFixed(1)} km</span>
            </div>
          )}
          <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0" />
        </div>
        </button>
      </CardContent>
    </Card>
  );
}

function ActiveDeliveryBanner({ delivery, onGo }: { delivery: Delivery; onGo: () => void }) {
  return (
    <Card className="overflow-hidden border-0 gradient-dark shadow-elevated">
      <CardContent className="p-0">
        <button onClick={onGo} className="w-full text-left tap px-4 py-3.5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/15">
            <Truck size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Course en cours</p>
            <p className="text-white font-bold text-sm leading-tight mt-0.5 truncate">
              {delivery.order?.restaurant?.name ?? 'Course'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={11} className="text-white/75" />
              <p className="text-white/75 text-xs">{DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {delivery.driver_earning_estimate != null && (
              <p className="text-white font-extrabold text-lg tabular">{formatFCFA(delivery.driver_earning_estimate)}</p>
            )}
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10">
              <ChevronRight size={16} className="text-white" />
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
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
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [historyMoreLoading, setHistoryMoreLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [detail, setDetail] = useState<Delivery | null>(null);
  const online = useOnline();
  const [actionId, setActionId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('available');

  const loadPending = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getPendingDeliveries();
      setPending(data);
    } catch (e) {
      // Hors ligne : le bandeau réseau et l'état vide le disent déjà, pas de toast en plus.
      if (!silent && !isNetworkError(e)) show('Impossible de charger les courses.', 'error');
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
      const r = await api.getDeliveryHistory(1);
      setHistory(r.data);
      setHistoryPage(1);
      setHistoryLastPage(r.meta?.last_page ?? 1);
      setHistoryLoaded(true);
    } catch {
      show('Impossible de charger l\'historique.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [show]);

  // Pagination de l'historique (20 courses par page côté API).
  const loadMoreHistory = async () => {
    const next = historyPage + 1;
    setHistoryMoreLoading(true);
    try {
      const r = await api.getDeliveryHistory(next);
      setHistory(h => [...h, ...r.data.filter(d => !h.some(x => x.id === d.id))]);
      setHistoryPage(next);
      setHistoryLastPage(r.meta?.last_page ?? next);
    } catch (err: any) {
      show(err.message || 'Impossible de charger la suite.', 'error');
    } finally {
      setHistoryMoreLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadPending(), loadActive()]);
    if (tab === 'done') await loadHistory();
  }, [loadPending, loadActive, loadHistory, tab]);
  const pullIndicator = usePullToRefresh(handleRefresh);

  useEffect(() => {
    loadPending();
    loadActive();
    const interval = setInterval(() => { loadPending(true); loadActive(); }, 20000);
    return () => clearInterval(interval);
  }, [loadPending, loadActive]);

  // Le livreur consulte ses courses : le compteur de l'icône n'a plus lieu d'être.
  useEffect(() => { clearBadge(); }, []);

  // Course annulée (push reçu au premier plan) : on rafraîchit les listes.
  useEffect(() => {
    const onCancelled = () => { loadPending(true); loadActive(); };
    window.addEventListener(DELIVERY_CANCELLED_EVENT, onCancelled);
    return () => window.removeEventListener(DELIVERY_CANCELLED_EVENT, onCancelled);
  }, [loadPending, loadActive]);

  useEffect(() => {
    if (tab === 'done' && !historyLoaded) loadHistory();
  }, [tab, historyLoaded, loadHistory]);

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
      // 409 : prise par un autre livreur. On la retire et on rafraîchit la liste.
      if (err?.status === 409) {
        setPending(d => d.filter(x => x.id !== id));
        loadPending(true);
      }
    } finally { setActionId(null); }
  };

  const handleDecline = async (id: number) => {
    setActionId(id);
    try {
      await api.declineDelivery(id);
      setPending(d => d.filter(x => x.id !== id));
      show('Course ignorée.', 'info');
    } catch (err: any) {
      if (isNetworkError(err)) setPending(d => d.filter(x => x.id !== id));
      else show(err.message || 'Erreur.', 'error');
    } finally { setActionId(null); }
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div ref={pullIndicator} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-8 h-8 rounded-full bg-card shadow-card border border-border flex items-center justify-center opacity-0 transition-transform" style={{ pointerEvents: 'none' }}>
        <RefreshCw size={16} className="text-primary" />
      </div>

      <PageHeader
        title="Courses"
        badgeCount={pending.length}
      />

      <div className="px-5 mt-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="available" className="gap-1.5">
              <Package size={15} />
              <span>Disponibles</span>
              {pending.length > 0 && (
                <Badge variant={tab === 'available' ? 'default' : 'muted'} className="text-[9px] px-1.5 py-0 h-4 ml-1">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">
              <Truck size={15} />
              <span>En cours</span>
              {activeDelivery && (
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="done" className="gap-1.5">
              <CheckCircle2 size={15} />
              <span>Terminées</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
              {loading && pending.length === 0 ? (
                <>
                  <Skeleton className="h-52 rounded-2xl" />
                  <Skeleton className="h-52 rounded-2xl" />
                </>
              ) : pending.length > 0 ? (
                <>
                  <motion.div variants={fadeUp} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <p className="font-bold text-sm text-foreground">
                      {pending.length} course{pending.length > 1 ? 's' : ''} disponible{pending.length > 1 ? 's' : ''}
                    </p>
                  </motion.div>
                  {pending.map(d => (
                    <motion.div key={d.id} variants={fadeUp}>
                      <DeliveryCard
                        delivery={d}
                        loading={actionId === d.id}
                        onAccept={() => handleAccept(d.id)}
                        onDecline={() => handleDecline(d.id)}
                      />
                    </motion.div>
                  ))}
                </>
              ) : (
                <motion.div variants={fadeUp}>
                  <Card>
                    <CardContent className="py-10 flex flex-col items-center text-center">
                      {!online ? (
                        <>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-warning-100">
                            <WifiOff size={28} className="text-warning-700" />
                          </div>
                          <p className="font-bold text-base text-foreground">Pas de connexion</p>
                          <p className="text-sm mt-1 text-muted-foreground max-w-[260px]">
                            Impossible de voir les nouvelles courses sans réseau. La liste se mettra à jour au retour du réseau.
                          </p>
                        </>
                      ) : !driver?.is_available ? (
                        <>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                            <Power size={28} className="text-muted-foreground" />
                          </div>
                          <p className="font-bold text-base text-foreground">Vous êtes hors ligne</p>
                          <p className="text-sm mt-1 text-muted-foreground max-w-[260px]">
                            Passez en ligne depuis l'accueil pour voir et recevoir les courses.
                          </p>
                          <Button className="mt-5 h-12 rounded-full" onClick={() => go({ name: 'dashboard' })}>
                            Passer en ligne
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                            <Search size={28} className="text-muted-foreground" />
                          </div>
                          <p className="font-bold text-base text-foreground">Aucune course pour le moment</p>
                          <p className="text-sm mt-1 text-muted-foreground max-w-[260px]">
                            Une course apparaît dès qu'un restaurant de {driver?.city ?? 'votre ville'} accepte une commande.
                            Restez en ligne : vous serez alerté.
                          </p>
                        </>
                      )}
                      {online && (
                        <div className="flex items-center gap-2 mt-5">
                          {driver?.is_available && (
                            <Badge variant="success" dot className="py-1.5 px-3 rounded-full">En ligne</Badge>
                          )}
                          <Button variant="outline" onClick={() => loadPending()} disabled={loading} className="h-12 rounded-full">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Actualiser
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="active">
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
              {activeDelivery ? (
                <>
                  <motion.div variants={fadeUp} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse bg-success-500" />
                    <p className="font-bold text-sm text-foreground">Votre course active</p>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <ActiveDeliveryBanner delivery={activeDelivery} onGo={() => go({ name: 'active-delivery' })} />
                  </motion.div>
                </>
              ) : (
                <motion.div variants={fadeUp}>
                  <Card>
                    <CardContent className="py-12 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-success-50">
                        <CheckCircle2 size={28} className="text-success-500" />
                      </div>
                      <p className="font-bold text-base text-foreground">Aucune course en cours</p>
                      <p className="text-sm mt-1 text-muted-foreground">Acceptez une course pour commencer.</p>
                      <Button size="sm" className="mt-5 rounded-full" onClick={() => setTab('available')}>
                        Voir les courses
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="done">
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
              {historyLoading ? (
                <>
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </>
              ) : history.length > 0 ? (
                <>
                  <motion.div variants={fadeUp} className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground">Historique</p>
                    <Button variant="ghost" size="icon" aria-label="Actualiser" onClick={loadHistory} disabled={historyLoading} className="h-12 w-12">
                      <RefreshCw size={18} className={historyLoading ? 'animate-spin' : ''} />
                    </Button>
                  </motion.div>
                  {history.map(d => (
                    <motion.div key={d.id} variants={fadeUp}>
                      <CompletedCard delivery={d} onOpen={() => setDetail(d)} />
                    </motion.div>
                  ))}
                  {historyPage < historyLastPage && (
                    <Button
                      variant="outline"
                      onClick={loadMoreHistory}
                      disabled={historyMoreLoading}
                      className="w-full h-12 rounded-full"
                    >
                      {historyMoreLoading
                        ? <span className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                        : 'Voir plus de courses'}
                    </Button>
                  )}
                </>
              ) : (
                <motion.div variants={fadeUp}>
                  <Card>
                    <CardContent className="py-12 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                        <Inbox size={28} className="text-muted-foreground" />
                      </div>
                      <p className="font-bold text-base text-foreground">Aucune course terminée</p>
                      <p className="text-sm mt-1 text-muted-foreground">Votre historique apparaîtra ici.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <HistoryDetailSheet delivery={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
