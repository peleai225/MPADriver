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
          setDone(false);
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F6F5' }}>
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6100', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!delivery && !done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#F8F6F5' }}>
      <div className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center mb-5">
        <Truck size={36} className="text-ink-300" />
      </div>
      <p className="font-bold text-ink-900 text-lg">Aucune course active</p>
      <p className="text-ink-400 text-sm mt-2">Acceptez une course pour commencer.</p>
      <button
        onClick={() => go({ name: 'deliveries' })}
        className="mt-6 px-8 h-12 rounded-2xl text-white font-bold text-sm tap gradient-flame"
        style={{ boxShadow: '0 8px 24px rgba(255,97,0,.35)' }}
      >
        Voir les courses
      </button>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#1C1C1C' }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-scale-in" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <CheckCircle2 size={44} className="text-success-400" />
      </div>
      <h1 className="text-white font-extrabold text-2xl mb-2">Livraison effectuée !</h1>
      <p className="text-white/50 text-sm mb-10">Votre gain a été ajouté à votre solde.</p>
      <button
        onClick={() => go({ name: 'dashboard' })}
        className="px-10 h-13 rounded-2xl text-white font-bold text-base tap gradient-flame"
        style={{ boxShadow: '0 8px 24px rgba(255,97,0,.35)' }}
      >
        Retour à l'accueil
      </button>
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
  const STEP_LABELS = ['Assigné', 'En route', 'Récupéré', 'Livraison', 'Terminé'];
  const stepIdx = STEPS.indexOf(delivery!.status);

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: '#F8F6F5' }}>
      {/* Header charcoal */}
      <div className="px-4 pt-safe pb-5" style={{ background: '#1C1C1C' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/40 text-xs">Course en cours</p>
            <h1 className="text-white font-extrabold text-xl">{order.reference}</h1>
          </div>
          {delivery!.driver_earning_estimate != null && (
            <div className="text-right">
              <p className="text-white/40 text-xs">Gain estimé</p>
              <p className="font-extrabold text-lg" style={{ color: '#FF6100' }}>{formatFCFA(delivery!.driver_earning_estimate)}</p>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,97,0,0.2)', color: '#FF6100' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FF6100' }} />
          {DELIVERY_STATUS_LABELS[delivery!.status] ?? delivery!.status}
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-1.5 mt-4">
          {STEPS.slice(0, 4).map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full h-1 rounded-full transition-all duration-500"
                style={{ background: i <= stepIdx ? '#FF6100' : 'rgba(255,255,255,0.15)' }}
              />
              <p className="text-[9px] font-medium" style={{ color: i <= stepIdx ? '#FF6100' : 'rgba(255,255,255,0.3)' }}>
                {STEP_LABELS[i]}
              </p>
            </div>
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
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white rounded-full px-3 py-2 shadow-card text-xs font-bold tap"
          style={{ color: '#FF6100' }}
        >
          <Navigation size={13} />
          Naviguer
        </button>
      </div>

      <div className="px-4 space-y-3 mt-4">
        {/* Adresse cible */}
        <div className="bg-white rounded-3xl p-4 shadow-soft border border-ink-100 space-y-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isPickingUp ? 'rgba(255,97,0,0.1)' : '#F0FDF4' }}
            >
              <MapPin size={16} style={{ color: isPickingUp ? '#FF6100' : '#22C55E' }} />
            </div>
            <p className="text-xs font-semibold text-ink-500">{isPickingUp ? 'Récupérer chez' : 'Livrer à'}</p>
          </div>
          <div>
            {isPickingUp && <p className="font-bold text-ink-900">{order.restaurant.name}</p>}
            <p className="text-ink-500 text-sm">{targetLabel}</p>
          </div>
          {isPickingUp && order.restaurant.phone && (
            <a
              href={`tel:${order.restaurant.phone}`}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl tap"
              style={{ background: 'rgba(255,97,0,0.1)', color: '#FF6100' }}
            >
              <Phone size={13} /> Appeler le restaurant
            </a>
          )}
          {!isPickingUp && order.delivery_phone && (
            <a
              href={`tel:${order.delivery_phone}`}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl tap bg-success-50 text-success-600"
            >
              <Phone size={13} /> Appeler le client
            </a>
          )}
        </div>

        {/* Commande */}
        <div className="bg-white rounded-3xl p-4 shadow-soft border border-ink-100 space-y-2">
          <p className="text-xs font-semibold text-ink-400">Commande</p>
          <div className="w-full h-px bg-ink-100" />
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-ink-100 flex items-center justify-center text-xs font-bold text-ink-600 shrink-0">
                {item.quantity}
              </span>
              <p className="text-sm text-ink-700">{item.name}</p>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-ink-400">+{order.items.length - 3} autre{order.items.length - 3 > 1 ? 's' : ''} article{order.items.length - 3 > 1 ? 's' : ''}</p>
          )}
          <div className="w-full h-px bg-ink-100" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-500">
              {order.payment_method === 'cash_on_delivery' ? '💵 Paiement à la livraison' : '📱 Payé en ligne'}
            </span>
            <span className="font-bold text-ink-900">{formatFCFA(order.total)}</span>
          </div>
        </div>

        {/* Instructions */}
        {order.delivery_instructions && (
          <div className="rounded-2xl p-3.5 flex gap-2.5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <span className="text-lg shrink-0">📝</span>
            <p className="text-sm text-warning-700 leading-relaxed">{order.delivery_instructions}</p>
          </div>
        )}
      </div>

      {/* CTA button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white/95 backdrop-blur-sm border-t border-ink-100 safe-bottom">
        <button
          onClick={advance}
          disabled={updating}
          className="w-full h-13 rounded-2xl text-white font-bold text-base tap disabled:opacity-60 flex items-center justify-center gap-2 gradient-flame"
          style={{ boxShadow: '0 8px 24px rgba(255,97,0,.4)' }}
        >
          {updating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Mise à jour...
            </>
          ) : (
            <>
              {actionLabel}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Cash collection modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-ink-950">Confirmer la collecte cash</h2>
            <p className="text-sm text-ink-500">
              Entrez le montant total reçu du client (plat + livraison).
            </p>
            <div>
              <label className="text-sm font-semibold text-ink-700">Montant collecté (FCFA)</label>
              <input
                type="number"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                placeholder={delivery?.order?.total?.toString() ?? ''}
                className="w-full mt-2 px-4 py-3 rounded-xl text-lg font-bold outline-none"
                style={{ background: '#F8F8F8' }}
                autoFocus
              />
            </div>
            {cashDebt && (
              <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
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
              className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 tap gradient-flame"
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

    let active = true;

    import('leaflet').then(L => {
      if (!active || !mapRef.current || mapInstance.current) return;

      import('leaflet/dist/leaflet.css');
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false });
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const rIcon = L.divIcon({ html: '<div style="background:#FF6100;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14] });
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
