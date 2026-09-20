import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, MapPin, Clock, ChevronRight, Package, Truck,
  CheckCircle2, Search, Inbox,
} from 'lucide-react';
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

function CompletedCard({ delivery }: { delivery: Delivery }) {
  const order = delivery.order;
  const statusLabel = DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status;
  const isDone = delivery.status === 'delivered';
  const restaurant = order?.restaurant;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/8 overflow-hidden">
            {restaurant?.logo_url
              ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-muted"><Package size={18} className="text-muted-foreground" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-foreground">{restaurant?.name ?? 'Restaurant'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-muted-foreground" />
              <p className="text-xs truncate text-muted-foreground">{order?.delivery_address?.split(',')[0] ?? '—'}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <Badge variant={isDone ? 'success' : 'destructive'}>{statusLabel}</Badge>
            {delivery.driver_earning_estimate != null && (
              <p className="text-sm font-extrabold mt-1 tabular text-primary">
                {formatFCFA(delivery.driver_earning_estimate)}
              </p>
            )}
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center gap-4 border-t border-border/60">
          <span className="text-xs text-muted-foreground tabular">#{order?.reference ?? '—'}</span>
          <span className="text-xs text-muted-foreground">{order?.items?.length ?? 0} article{(order?.items?.length ?? 0) > 1 ? 's' : ''}</span>
          {delivery.distance_km != null && (
            <div className="flex items-center gap-1">
              <MapPin size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground tabular">{Number(delivery.distance_km).toFixed(1)} km</span>
            </div>
          )}
        </div>
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
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Course en cours</p>
            <p className="text-white font-bold text-sm leading-tight mt-0.5 truncate">
              {delivery.order?.restaurant?.name ?? 'Course'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={11} className="text-white/50" />
              <p className="text-white/50 text-xs">{DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}</p>
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

  useEffect(() => {
    loadPending();
    loadActive();
    const interval = setInterval(() => { loadPending(true); loadActive(); }, 20000);
    return () => clearInterval(interval);
  }, [loadPending, loadActive]);

  useEffect(() => {
    if (tab === 'done' && history.length === 0) loadHistory();
  }, [tab, history.length, loadHistory]);

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
      show('Course acceptee !', 'success');
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
      show('Course refusee.', 'info');
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setActionId(null); }
  };

  return (
    <div className="min-h-screen pb-28 bg-background">

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
              <span>Termin.</span>
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
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                        <Search size={28} className="text-muted-foreground" />
                      </div>
                      <p className="font-bold text-base text-foreground">Aucune course disponible</p>
                      <p className="text-sm mt-1 text-muted-foreground max-w-[240px]">
                        Nous recherchons des courses pres de vous. Restez en ligne.
                      </p>
                      <div className="flex items-center gap-2 mt-5">
                        <Badge variant={driver?.is_available ? 'success' : 'muted'} dot className="py-1.5 px-3 rounded-full">
                          {driver?.is_available ? 'En ligne' : 'Hors ligne'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => loadPending()} disabled={loading} className="rounded-full">
                          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                          Actualiser
                        </Button>
                      </div>
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
                    <Button variant="ghost" size="icon" onClick={loadHistory} disabled={historyLoading} className="h-8 w-8">
                      <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} />
                    </Button>
                  </motion.div>
                  {history.map(d => (
                    <motion.div key={d.id} variants={fadeUp}>
                      <CompletedCard delivery={d} />
                    </motion.div>
                  ))}
                </>
              ) : (
                <motion.div variants={fadeUp}>
                  <Card>
                    <CardContent className="py-12 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                        <Inbox size={28} className="text-muted-foreground" />
                      </div>
                      <p className="font-bold text-base text-foreground">Aucune course terminee</p>
                      <p className="text-sm mt-1 text-muted-foreground">Votre historique apparaitra ici.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
