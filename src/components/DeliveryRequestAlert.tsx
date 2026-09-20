import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, Package, ChevronRight, ClipboardList,
  Banknote, Truck, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { vibrate, playAlert, notify } from '../lib/alert';
import { formatFCFA } from '../lib/format';
import type { Delivery } from '../lib/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const TIMEOUT_SECONDS = 30;
const FRESHNESS_MS = 3 * 60 * 1000;

export function DeliveryRequestAlert() {
  const { driver } = useAuth();
  const { go } = useNav();
  const { show } = useToast();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [remaining, setRemaining] = useState(TIMEOUT_SECONDS);
  const [loading, setLoading] = useState(false);
  const shownIdsRef = useRef(new Set<number>());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(() => {
    setDelivery(null);
    setRemaining(TIMEOUT_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const checkPending = useCallback(async () => {
    if (!driver?.is_available) return;
    try {
      const list = await api.getPendingDeliveries();
      const now = Date.now();
      const fresh = list.find(d =>
        !shownIdsRef.current.has(d.id) &&
        d.assigned_at &&
        now - new Date(d.assigned_at).getTime() < FRESHNESS_MS
      );
      if (fresh) {
        shownIdsRef.current.add(fresh.id);
        setDelivery(fresh);
        setRemaining(TIMEOUT_SECONDS);
        vibrate([0, 500, 300, 500, 300, 500]);
        playAlert();
        notify('Nouvelle course !', 'Ouvrez l\'application pour accepter.');
      }
    } catch {}
  }, [driver?.is_available]);

  useEffect(() => {
    if (!driver?.is_available) return;
    checkPending();
    pollRef.current = setInterval(checkPending, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [driver?.is_available, checkPending]);

  useEffect(() => {
    if (!delivery) return;
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          handleDecline(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [delivery?.id]);

  const handleAccept = async () => {
    if (!delivery) return;
    setLoading(true);
    try {
      await api.acceptDelivery(delivery.id);
      show('Course acceptée !', 'success');
      dismiss();
      go({ name: 'active-delivery' });
    } catch (err: any) {
      show(err.message || 'Erreur', 'error');
    } finally { setLoading(false); }
  };

  const handleDecline = async (auto = false) => {
    if (!delivery) return;
    const id = delivery.id;
    dismiss();
    try {
      await api.declineDelivery(id);
      if (auto) show('Course expirée — refus automatique.', 'info');
      else show('Course refusée.', 'info');
    } catch {}
  };

  const order = delivery?.order;
  const restaurant = order?.restaurant;
  const pct = remaining / TIMEOUT_SECONDS;
  const timerColor = remaining > 15 ? 'text-success-600' : remaining > 8 ? 'text-warning-600' : 'text-destructive';
  const barColor = remaining > 15 ? 'bg-success-500' : remaining > 8 ? 'bg-warning-500' : 'bg-destructive';
  const isCash = order?.payment_method === 'cash_on_delivery';

  return (
    <AnimatePresence>
      {delivery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 flex items-end"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full bg-card rounded-t-3xl safe-bottom max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <Badge variant="default" dot pulse className="text-sm">
                NOUVELLE COURSE
              </Badge>
              <button onClick={() => handleDecline(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-muted tap">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Timer bar */}
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className={timerColor} />
                  <span className={`text-sm font-extrabold tabular ${timerColor}`}>
                    {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Expire bientôt</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>

            {/* Restaurant */}
            {restaurant && (
              <div className="mx-5 mb-3 p-3.5 rounded-2xl bg-muted/50 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 overflow-hidden">
                    {restaurant.logo_url
                      ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
                      : <Package size={18} className="text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Restaurant</p>
                    <p className="font-bold text-sm truncate text-foreground">{restaurant.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{restaurant.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Client */}
            {order && (
              <div className="mx-5 mb-3 p-3.5 rounded-2xl bg-muted/50 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-success-50">
                    <MapPin size={18} className="text-success-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Livrer à</p>
                    <p className="font-bold text-sm truncate text-foreground">{order.delivery_address?.split(',')[0]}</p>
                    {order.delivery_instructions && (
                      <p className="text-xs text-warning-600 mt-0.5 truncate">{order.delivery_instructions}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="mx-5 mb-3 grid grid-cols-3 gap-2">
              {delivery.driver_earning_estimate != null && (
                <div className="flex flex-col items-center py-2.5 rounded-2xl bg-primary/5 border border-primary/10">
                  <Truck size={14} className="text-primary mb-1" />
                  <p className="font-extrabold text-base tabular text-primary">{formatFCFA(delivery.driver_earning_estimate)}</p>
                  <p className="text-[10px] text-muted-foreground">Gain</p>
                </div>
              )}
              {order && (
                <div className="flex flex-col items-center py-2.5 rounded-2xl bg-muted/50 border border-border/60">
                  <ClipboardList size={14} className="text-muted-foreground mb-1" />
                  <p className="font-extrabold text-base tabular text-foreground">{order.items?.length ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Article{(order.items?.length ?? 0) > 1 ? 's' : ''}</p>
                </div>
              )}
              {delivery.distance_km != null && (
                <div className="flex flex-col items-center py-2.5 rounded-2xl bg-muted/50 border border-border/60">
                  <MapPin size={14} className="text-muted-foreground mb-1" />
                  <p className="font-extrabold text-base tabular text-foreground">{Number(delivery.distance_km).toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">km</p>
                </div>
              )}
            </div>

            {/* Cash banner */}
            {isCash && order && (
              <div className="mx-5 mb-4 px-4 py-3 rounded-2xl bg-warning-50 border border-warning-200 flex items-center gap-3">
                <Banknote size={18} className="text-warning-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-warning-700">Collecter en espèces</p>
                  <p className="text-xs text-warning-600 tabular">{formatFCFA(order.total)}</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="px-5 pb-5 flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 rounded-full"
                onClick={() => handleDecline(false)}
                disabled={loading}
              >
                Refuser
              </Button>
              <Button
                size="lg"
                className="flex-[2] rounded-full"
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>Accepter <ChevronRight size={16} /></>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
