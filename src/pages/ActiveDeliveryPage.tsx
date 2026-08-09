import { useEffect, useState, useRef } from 'react';
import { MapPin, Phone, Navigation, CheckCircle2, Truck, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { formatFCFA, DELIVERY_STATUS_LABELS } from '../lib/format';
import { startTracking, stopTracking, openInMaps } from '../lib/geo';
import { listenDeliveryStatus } from '../lib/echo';
import { vibrate, notify } from '../lib/alert';
import type { Delivery } from '../lib/types';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';

export function ActiveDeliveryPage() {
  const { go } = useNav();
  const { show } = useToast();
  const { driver } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashDebt, setCashDebt] = useState<{amount_owed: number; restaurant: string} | null>(null);

  useEffect(() => {
    api.getActiveDelivery().then(d => { setDelivery(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Rafraîchissement GPS
  useEffect(() => {
    if (!delivery) return;
    startTracking(async (lat, lng) => {
      try { await api.updateLocation(lat, lng); } catch { /* ignore */ }
    });
    return () => stopTracking();
  }, [delivery?.id]);

  // Pusher : écoute les changements de statut côté serveur (annulation, etc.)
  useEffect(() => {
    if (!driver?.id) return;
    let active = true;
    let unsub: (() => void) | null = null;

    listenDeliveryStatus(driver.id, (data: any) => {
      if (!active) return;
      const newStatus: string = data?.new_status;
      if (newStatus === 'cancelled') {
        vibrate([500, 200, 500]);
        notify('⚠️ Course annulée', 'La commande a été annulée.', () => go({ name: 'deliveries' }));
        show('Course annulée.', 'error');
        setDelivery(null);
        stopTracking();
        go({ name: 'deliveries' });
        return;
      }
      // Rafraîchir les données de la livraison active
      api.getActiveDelivery().then(d => { if (active) setDelivery(d); }).catch(() => {});
    }).then(u => { if (active) unsub = u; });

    return () => {
      active = false;
      unsub?.();
    };
  }, [driver?.id, go, show]);

  const advance = async () => {
    if (!delivery) return;
    setUpdating(true);
    try {
      const next = delivery.status === 'assigned' ? 'heading_to_restaurant'
        : delivery.status === 'heading_to_restaurant' ? 'picked_up'
        : delivery.status === 'picked_up' ? 'delivering'
        : 'delivered';

      const updated = await api.updateDeliveryStatus(delivery.id, next);
      if (next === 'delivered') {
        stopTracking();
        if (delivery.order?.payment_method === 'cash_on_delivery') {
          setShowCashModal(true);
          setDone(false); // don't show done yet
          return;
        }
        setDone(true);
        return;
      }
      setDelivery(updated);
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!delivery && !done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-ink-100 grid place-items-center mb-5">
        <Truck size={36} className="text-ink-300" />
      </div>
      <p className="font-bold text-ink-900 text-lg">Aucune course active</p>
      <p className="text-ink-400 text-sm mt-2">Acceptez une course pour commencer.</p>
      <Button onClick={() => go({ name: 'deliveries' })} className="mt-6">
        Voir les courses
      </Button>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-success-500/15 border border-success-500/20 grid place-items-center mb-6 animate-scale-in">
        <CheckCircle2 size={44} className="text-success-400" />
      </div>
      <h1 className="text-white font-extrabold text-2xl mb-2">Livraison effectuée !</h1>
      <p className="text-ink-400 text-sm mb-10">Votre gain a été ajouté à votre solde.</p>
      <Button onClick={() => go({ name: 'dashboard' })} size="lg" className="px-10">
        Retour à l'accueil
      </Button>
    </div>
  );

  const { order } = delivery!;
  const isPickingUp = delivery!.status === 'assigned' || delivery!.status === 'heading_to_restaurant';
  const targetLat   = isPickingUp ? order.restaurant.latitude : order.delivery_latitude;
  const targetLng   = isPickingUp ? order.restaurant.longitude : order.delivery_longitude;
  const targetLabel = isPickingUp ? order.restaurant.address : order.delivery_address;

  const actionLabel =
    delivery!.status === 'assigned' || delivery!.status === 'heading_to_restaurant'
      ? "Arrivé au restaurant"
      : delivery!.status === 'picked_up'
      ? "En route vers le client"
      : "Livraison effectuée ✓";

  // Progress steps
  const STEPS = ['assigned', 'heading_to_restaurant', 'picked_up', 'delivering', 'delivered'];
  const stepIdx = STEPS.indexOf(delivery!.status);

  return (
    <div className="min-h-screen flex flex-col pb-24">
      {/* Header */}
      <div className="bg-ink-950 px-4 pt-safe pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-ink-400 text-xs">Course en cours</p>
            <h1 className="text-white font-bold text-lg">{order.reference}</h1>
          </div>
          {delivery!.driver_earning_estimate != null && (
            <div className="text-right">
              <p className="text-ink-400 text-xs">Gain estimé</p>
              <p className="text-brand-400 font-bold text-base">{formatFCFA(delivery!.driver_earning_estimate)}</p>
            </div>
          )}
        </div>
        <Badge variant="dark" dot pulse>
          {DELIVERY_STATUS_LABELS[delivery!.status] ?? delivery!.status}
        </Badge>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mt-3">
          {STEPS.slice(0, 4).map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-500',
                i <= stepIdx ? 'bg-brand-500' : 'bg-white/20',
              )}
            />
          ))}
        </div>
      </div>

      {/* Carte */}
      <div className="h-52 bg-ink-200 relative">
        <DeliveryMap
          restaurantLat={order.restaurant.latitude}
          restaurantLng={order.restaurant.longitude}
          clientLat={order.delivery_latitude}
          clientLng={order.delivery_longitude}
        />
        <button
          onClick={() => openInMaps(targetLat, targetLng, targetLabel)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white rounded-full px-3 py-2 shadow-card text-xs font-bold text-brand-600 tap"
        >
          <Navigation size={13} />
          Naviguer
        </button>
      </div>

      <div className="px-4 space-y-3 mt-4">
        {/* Adresse cible */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-xl grid place-items-center shrink-0', isPickingUp ? 'bg-brand-50' : 'bg-success-50')}>
                <MapPin size={16} className={isPickingUp ? 'text-brand-500' : 'text-success-500'} />
              </div>
              <p className="text-xs font-semibold text-ink-500">{isPickingUp ? 'Récupérer chez' : 'Livrer à'}</p>
            </div>
            <div>
              {isPickingUp && <p className="font-bold text-ink-900">{order.restaurant.name}</p>}
              <p className="text-ink-500 text-sm">{targetLabel}</p>
            </div>
            {isPickingUp && order.restaurant.phone && (
              <a href={`tel:${order.restaurant.phone}`}
                className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 text-xs font-semibold px-3 py-2 rounded-xl tap hover:bg-brand-100 transition-colors">
                <Phone size={13} /> Appeler le restaurant
              </a>
            )}
            {!isPickingUp && order.delivery_phone && (
              <a href={`tel:${order.delivery_phone}`}
                className="inline-flex items-center gap-2 bg-success-50 text-success-600 text-xs font-semibold px-3 py-2 rounded-xl tap hover:bg-success-100 transition-colors">
                <Phone size={13} /> Appeler le client
              </a>
            )}
          </CardContent>
        </Card>

        {/* Commande */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs font-semibold text-ink-400">Commande</p>
            {order.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-ink-100 grid place-items-center text-xs font-bold text-ink-600 shrink-0">
                  {item.quantity}
                </span>
                <p className="text-sm text-ink-700">{item.name}</p>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-xs text-ink-400">+{order.items.length - 3} autre{order.items.length - 3 > 1 ? 's' : ''} article{order.items.length - 3 > 1 ? 's' : ''}</p>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-500">
                {order.payment_method === 'cash_on_delivery' ? '💵 Paiement à la livraison' : '📱 Payé en ligne'}
              </span>
              <span className="font-bold text-ink-900">{formatFCFA(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        {order.delivery_instructions && (
          <div className="bg-warning-50 border border-warning-200 rounded-2xl p-3.5 flex gap-2.5">
            <span className="text-lg shrink-0">📝</span>
            <p className="text-sm text-warning-700 leading-relaxed">{order.delivery_instructions}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white/95 backdrop-blur-sm border-t border-ink-100 safe-bottom">
        <Button
          onClick={advance}
          disabled={updating}
          className="w-full h-13 gap-2"
        >
          {updating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Mise à jour...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {actionLabel}
              <ArrowRight size={16} />
            </span>
          )}
        </Button>
      </div>

      {/* Cash collection modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">Confirmer la collecte cash</h2>
            <p className="text-sm text-neutral-500">
              Entrez le montant total reçu du client (plat + livraison).
            </p>
            <div>
              <label className="text-sm font-medium">Montant collecté (FCFA)</label>
              <input
                type="number"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                placeholder={delivery?.order?.total?.toString() ?? ''}
                className="w-full mt-1 px-4 py-3 border rounded-xl text-lg font-bold"
                autoFocus
              />
            </div>
            {cashDebt && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-800">
                  Tu dois reverser {cashDebt.amount_owed.toLocaleString('fr-FR')} F à {cashDebt.restaurant}
                </p>
              </div>
            )}
            <button
              onClick={async () => {
                const amount = parseInt(cashAmount);
                if (!amount) { show('Entrez le montant collecté.', 'error'); return; }
                setUpdating(true);
                try {
                  const result = await api.confirmCashCollected(delivery!.id, amount);
                  setCashDebt({ amount_owed: result.amount_owed, restaurant: result.restaurant });
                  if (result.amount_owed === 0) {
                    show('Livraison terminée !', 'success');
                    setShowCashModal(false);
                    setDone(true);
                  } else {
                    show(`Tu dois reverser ${result.amount_owed.toLocaleString('fr-FR')} F à ${result.restaurant}`, 'info');
                    setShowCashModal(false);
                    setDone(true);
                  }
                } catch (e: any) {
                  show(e.message || 'Erreur', 'error');
                } finally {
                  setUpdating(false);
                }
              }}
              disabled={updating}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl text-base disabled:opacity-50"
            >
              {updating ? 'Confirmation...' : "J'ai collecté l'argent"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryMap({ restaurantLat, restaurantLng, clientLat, clientLng }: {
  restaurantLat: number; restaurantLng: number;
  clientLat: number; clientLng: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Flag pour annuler l'init si le composant est démonté avant que l'import se résout
    let active = true;

    import('leaflet').then(L => {
      // Double-garde : si démonté entre-temps OU si une autre instance a déjà été créée
      if (!active || !mapRef.current || mapInstance.current) return;

      import('leaflet/dist/leaflet.css');
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false });
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const rIcon = L.divIcon({ html: '<div style="background:#F97316;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14] });
      const cIcon = L.divIcon({ html: '<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14] });

      L.marker([restaurantLat, restaurantLng], { icon: rIcon }).addTo(map);
      L.marker([clientLat, clientLng], { icon: cIcon }).addTo(map);

      const bounds = L.latLngBounds([[restaurantLat, restaurantLng], [clientLat, clientLng]]);
      map.fitBounds(bounds, { padding: [40, 40] });
    });

    return () => {
      active = false;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
}
