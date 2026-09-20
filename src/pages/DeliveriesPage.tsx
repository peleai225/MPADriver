import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, MapPin, Clock, ChevronRight } from 'lucide-react';
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

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function CompletedCard({ delivery }: { delivery: Delivery }) {
  const { order } = delivery;
  const statusLabel = DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status;
  const isDone = delivery.status === 'delivered';
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/8 overflow-hidden">
            {order.restaurant.logo_url
              ? <img src={order.restaurant.logo_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-2xl">🏪</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-foreground">{order.restaurant.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-muted-foreground" />
              <p className="text-xs truncate text-muted-foreground">{order.delivery_address.split(',')[0]}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <Badge variant={isDone ? 'success' : 'destructive'}>{statusLabel}</Badge>
            {delivery.driver_earning_estimate != null && (
              <p className="text-sm font-extrabold mt-1 text-primary">
                {formatFCFA(delivery.driver_earning_estimate)}
              </p>
            )}
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center gap-4 border-t border-border/60">
          <span className="text-xs text-muted-foreground">#{order.reference}</span>
          <span className="text-xs text-muted-foreground">{order.items.length} article{order.items.length > 1 ? 's' : ''}</span>
          {delivery.distance_km != null && (
            <div className="flex items-center gap-1">
              <MapPin size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{Number(delivery.distance_km).toFixed(1)} km</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveDeliveryBanner({ delivery, onGo }: { delivery: Delivery; onGo: () => void }) {
  return (
    <Card className="overflow-hidden border-0 gradient-brand shadow-pop">
      <CardContent className="p-0">
        <button onClick={onGo} className="w-full text-left tap px-5 py-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white/20">
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
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              Continuer <ChevronRight size={13} />
            </Badge>
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

  return (
    <div className="min-h-screen pb-28 bg-background">

      <PageHeader
        title="Courses"
        subtitle={`📅 Aujourd'hui, ${todayLabel()}`}
        badgeCount={pending.length}
      />

      {/* ── TABS ── */}
      <div className="px-5 mt-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="available" className="flex-col gap-1">
              <span className="text-lg leading-none">📦</span>
              <span>Disponibles</span>
              {pending.length > 0 && (
                <Badge variant={tab === 'available' ? 'default' : 'muted'} className="text-[9px] px-1.5 py-0 h-4">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-col gap-1">
              <span className="text-lg leading-none">🛵</span>
              <span>En cours</span>
              {activeDelivery && (
                <Badge variant={tab === 'active' ? 'default' : 'muted'} className="text-[9px] px-1.5 py-0 h-4">
                  1
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="done" className="flex-col gap-1">
              <span className="text-lg leading-none">✓</span>
              <span>Terminées</span>
              {history.length > 0 && (
                <Badge variant={tab === 'done' ? 'default' : 'muted'} className="text-[9px] px-1.5 py-0 h-4">
                  {history.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <div className="space-y-4">
              {loading && pending.length === 0 ? (
                <>
                  <Skeleton className="h-52 rounded-3xl" />
                  <Skeleton className="h-52 rounded-3xl" />
                </>
              ) : pending.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <p className="font-extrabold text-base text-foreground">
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
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-center pt-6 pb-4 bg-gradient-to-b from-primary/5 to-card">
                      <span className="text-8xl select-none">🛵</span>
                    </div>
                    <div className="px-5 pb-5">
                      <p className="font-extrabold text-base mb-1 text-foreground">Aucune course disponible</p>
                      <p className="text-sm mb-4 text-muted-foreground">Nous recherchons des courses près de vous.</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={driver?.is_available ? 'success' : 'muted'} dot className="flex-1 justify-center py-2 rounded-full">
                          {driver?.is_available ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
                        </Badge>
                        <Button variant="outline" size="pill" onClick={() => loadPending()} disabled={loading}>
                          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                          Actualiser
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <div className="space-y-4">
              {activeDelivery ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-success-500" />
                    <p className="font-extrabold text-base text-foreground">Votre course active</p>
                  </div>
                  <ActiveDeliveryBanner delivery={activeDelivery} onGo={() => go({ name: 'active-delivery' })} />
                </>
              ) : (
                <div className="text-center py-12">
                  <span className="text-6xl">✅</span>
                  <p className="font-extrabold text-base mt-4 text-foreground">Aucune course en cours</p>
                  <p className="text-sm mt-1 text-muted-foreground">Acceptez une course pour commencer.</p>
                  <Button size="pill" className="mt-4" onClick={() => setTab('available')}>
                    Voir les courses
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="done">
            <div className="space-y-4">
              {historyLoading ? (
                <>
                  <Skeleton className="h-24 rounded-3xl" />
                  <Skeleton className="h-24 rounded-3xl" />
                  <Skeleton className="h-24 rounded-3xl" />
                </>
              ) : history.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-base text-foreground">Historique</p>
                    <Button variant="ghost" size="icon" onClick={loadHistory} disabled={historyLoading}>
                      <RefreshCw size={15} className={historyLoading ? 'animate-spin' : ''} />
                    </Button>
                  </div>
                  {history.map(d => <CompletedCard key={d.id} delivery={d} />)}
                </>
              ) : (
                <div className="text-center py-12">
                  <span className="text-6xl">📋</span>
                  <p className="font-extrabold text-base mt-4 text-foreground">Aucune course terminée</p>
                  <p className="text-sm mt-1 text-muted-foreground">Votre historique apparaîtra ici.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
