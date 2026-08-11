import { useEffect, useState, useRef } from 'react';
import { MapPin, Phone, Navigation, CheckCircle2, ArrowRight, ClipboardList } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { formatFCFA, DELIVERY_STATUS_LABELS } from '../lib/format';
import { startTracking, stopTracking, openInMaps } from '../lib/geo';
import { listenDeliveryStatus } from '../lib/echo';
import { vibrate, notify } from '../lib/alert';
import type { Delivery } from '../lib/types';

const BG = '#F5F0EB';
const ORANGE = '#FF6100';

const STEPS = ['assigned', 'heading_to_restaurant', 'picked_up', 'delivering'];
const STEP_LABELS = ['Assigné', 'En route', 'Récupéré', 'En livraison'];
const STEP_ICONS = ['📋', '🏍️', '📦', '🏠'];

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
  const [cashDebt, setCashDebt] = useState<{ amount_owed: number; restaurant: string } | null>(null);

  useEffect(() => {
    api.getActiveDelivery().then(d => { setDelivery(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!delivery) return;
    startTracking(async (lat, lng) => {
      try { await api.updateLocation(lat, lng); } catch { }
    });
    return () => stopTracking();
  }, [delivery?.id]);

  useEffect(() => {
    if (!driver?.id) return;
    let active = true;
    let unsub: (() => void) | null = null;
    listenDeliveryStatus(driver.id, (data: any) => {
      if (!active) return;
      if (data?.new_status === 'cancelled') {
        vibrate([500, 200, 500]);
        notify('⚠️ Course annulée', 'La commande a été annulée.', () => go({ name: 'deliveries' }));
        show('Course annulée.', 'error');
        setDelivery(null); stopTracking(); go({ name: 'deliveries' });
        return;
      }
      api.getActiveDelivery().then(d => { if (active) setDelivery(d); }).catch(() => {});
    }).then(u => { if (active) unsub = u; });
    return () => { active = false; unsub?.(); };
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
        if (delivery.order?.payment_method === 'cash_on_delivery') { setShowCashModal(true); return; }
        setDone(true); return;
      }
      setDelivery(updated);
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setUpdating(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: ORANGE, borderTopColor: 'transparent' }} />
    </div>
  );

  if (!delivery && !done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: BG }}>
      <span className="text-7xl mb-5">🛵</span>
      <p className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>Aucune course active</p>
      <p className="text-sm mt-2" style={{ color: '#A0A0A0' }}>Acceptez une course pour commencer.</p>
      <button
        onClick={() => go({ name: 'deliveries' })}
        className="mt-6 px-8 h-13 rounded-full text-white font-bold tap gradient-flame"
        style={{ boxShadow: '0 8px 24px rgba(255,97,0,.35)' }}
      >
        Voir les courses
      </button>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#1C1C1C' }}>
      {cashDebt && cashDebt.amount_owed > 0 && (
        <div className="mb-6 w-full max-w-xs rounded-3xl p-4 text-left" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="font-bold text-sm" style={{ color: '#92400E' }}>⚠️ Argent à reverser</p>
          <p className="font-extrabold text-xl mt-1" style={{ color: '#D97706' }}>{formatFCFA(cashDebt.amount_owed)}</p>
          <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>à {cashDebt.restaurant}</p>
        </div>
      )}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-scale-in"
        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        <CheckCircle2 size={44} className="text-green-400" />
      </div>
      <h1 className="text-white font-extrabold text-3xl mb-2">Livraison effectuée !</h1>
      <p className="text-white/50 text-sm mb-10">Votre gain a été ajouté à votre solde.</p>
      <button
        onClick={() => go({ name: 'dashboard' })}
        className="px-10 h-14 rounded-full text-white font-bold tap gradient-flame"
        style={{ boxShadow: '0 8px 24px rgba(255,97,0,.35)' }}
      >
        Retour à l'accueil
      </button>
    </div>
  );

  const { order } = delivery!;
  const isPickingUp = delivery!.status === 'assigned' || delivery!.status === 'heading_to_restaurant';
  const targetLat = isPickingUp ? order.restaurant.latitude : order.delivery_latitude;
  const targetLng = isPickingUp ? order.restaurant.longitude : order.delivery_longitude;
  const targetLabel = isPickingUp ? order.restaurant.address : order.delivery_address;
  const stepIdx = STEPS.indexOf(delivery!.status);

  const actionLabel =
    delivery!.status === 'assigned' ? "Je pars au restaurant →"
    : delivery!.status === 'heading_to_restaurant' ? "Arrivé au restaurant →"
    : delivery!.status === 'picked_up' ? "En route vers le client →"
    : "Livraison effectuée ✓";

  return (
    <div className="min-h-screen flex flex-col pb-28" style={{ background: BG }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-5 pb-4" style={{ background: '#1C1C1C' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/40 text-xs">Course en cours</p>
            <h1 className="text-white font-extrabold text-xl">{order.reference}</h1>
          </div>
          {delivery!.driver_earning_estimate != null && (
            <div
              className="px-3 py-2 rounded-2xl text-right"
              style={{ background: 'rgba(255,97,0,0.2)' }}
            >
              <p className="text-[10px]" style={{ color: ORANGE }}>Gain estimé</p>
              <p className="font-extrabold text-lg" style={{ color: ORANGE }}>{formatFCFA(delivery!.driver_earning_estimate)}</p>
            </div>
          )}
        </div>

        {/* Status pill */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
          style={{ background: 'rgba(255,97,0,0.2)', color: ORANGE }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ORANGE }} />
          {DELIVERY_STATUS_LABELS[delivery!.status] ?? delivery!.status}
        </div>

        {/* Steps visuels */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                  style={{
                    background: i < stepIdx ? '#22C55E' : i === stepIdx ? ORANGE : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {i < stepIdx ? '✓' : STEP_ICONS[i]}
                </div>
                <p className="text-[9px] mt-1 font-medium" style={{ color: i <= stepIdx ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }}>
                  {STEP_LABELS[i]}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-0.5 flex-1 mb-5" style={{ background: i < stepIdx ? '#22C55E' : 'rgba(255,255,255,0.15)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CARTE ── */}
      <div className="h-48 relative">
        <DeliveryMap
          restaurantLat={order.restaurant.latitude}
          restaurantLng={order.restaurant.longitude}
          clientLat={order.delivery_latitude}
          clientLng={order.delivery_longitude}
        />
        <button
          onClick={() => openInMaps(targetLat, targetLng, targetLabel)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white rounded-full px-3 py-2 shadow-card text-xs font-bold tap"
          style={{ color: ORANGE }}
        >
          <Navigation size={13} /> Naviguer
        </button>
      </div>

      <div className="px-5 mt-4 space-y-3">

        {/* ── ADRESSE CIBLE ── */}
        <div className="rounded-3xl p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: isPickingUp ? 'rgba(255,97,0,0.1)' : '#F0FDF4' }}>
              <MapPin size={16} style={{ color: isPickingUp ? ORANGE : '#22C55E' }} />
            </div>
            <p className="text-sm font-bold" style={{ color: '#A0A0A0' }}>{isPickingUp ? 'Récupérer chez' : 'Livrer à'}</p>
          </div>
          {isPickingUp && <p className="font-extrabold text-base mb-0.5" style={{ color: '#1C1C1C' }}>{order.restaurant.name}</p>}
          <p className="text-sm" style={{ color: '#717171' }}>{targetLabel}</p>

          {isPickingUp && order.restaurant.phone && (
            <a href={`tel:${order.restaurant.phone}`} className="mt-3 inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-full tap" style={{ background: 'rgba(255,97,0,0.1)', color: ORANGE }}>
              <Phone size={13} /> Appeler le restaurant
            </a>
          )}
          {!isPickingUp && order.delivery_phone && (
            <a href={`tel:${order.delivery_phone}`} className="mt-3 inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-full tap bg-green-50 text-green-600">
              <Phone size={13} /> Appeler le client
            </a>
          )}
        </div>

        {/* ── COMMANDE ── */}
        <div className="rounded-3xl p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} style={{ color: ORANGE }} />
            <p className="font-bold text-sm" style={{ color: '#1C1C1C' }}>Commande <span style={{ color: ORANGE }}>#{order.reference}</span></p>
          </div>
          <div className="space-y-1.5 mb-3">
            {order.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: ORANGE }}>
                  {item.quantity}
                </span>
                <p className="text-sm" style={{ color: '#717171' }}>{item.name}</p>
              </div>
            ))}
            {order.items.length > 3 && <p className="text-xs" style={{ color: '#A0A0A0' }}>+{order.items.length - 3} autres articles</p>}
          </div>
          <div className="h-px mb-3" style={{ background: '#F1F1F1' }} />
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#A0A0A0' }}>
              {order.payment_method === 'cash_on_delivery' ? '💵 Paiement à la livraison' : '📱 Payé en ligne'}
            </span>
            <span className="font-extrabold text-lg" style={{ color: '#1C1C1C' }}>{formatFCFA(order.total)}</span>
          </div>
        </div>

        {order.delivery_instructions && (
          <div className="rounded-2xl p-3.5 flex gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <span className="text-lg shrink-0">📝</span>
            <p className="text-sm" style={{ color: '#92400E' }}>{order.delivery_instructions}</p>
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      <div className="fixed bottom-0 inset-x-0 px-5 py-4 safe-bottom" style={{ background: 'rgba(255,255,255,0.97)', borderTop: '1px solid #F1F1F1' }}>
        <button
          onClick={advance}
          disabled={updating}
          className="w-full h-14 rounded-full text-white font-bold text-base tap disabled:opacity-60 flex items-center justify-center gap-2 gradient-flame"
          style={{ boxShadow: '0 8px 24px rgba(255,97,0,.4)' }}
        >
          {updating ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><span>{actionLabel}</span><ArrowRight size={18} /></>}
        </button>
      </div>

      {/* ── CASH MODAL ── */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 safe-bottom">
            <h2 className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>Collecte cash</h2>
            <p className="text-sm" style={{ color: '#717171' }}>Entrez le montant total reçu du client.</p>
            <input
              type="number"
              value={cashAmount}
              onChange={e => setCashAmount(e.target.value)}
              placeholder={String(delivery?.order?.total ?? '')}
              className="w-full px-4 py-4 rounded-2xl text-2xl font-extrabold outline-none"
              style={{ background: '#F8F8F8', color: '#1C1C1C' }}
              autoFocus
            />
            {cashDebt && cashDebt.amount_owed > 0 && (
              <div className="rounded-2xl p-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-sm font-bold" style={{ color: '#92400E' }}>Tu dois reverser {formatFCFA(cashDebt.amount_owed)} à {cashDebt.restaurant}</p>
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
                  setShowCashModal(false); setDone(true);
                  show(result.amount_owed > 0 ? `Reverse ${formatFCFA(result.amount_owed)} à ${result.restaurant}` : 'Livraison terminée !', result.amount_owed > 0 ? 'info' : 'success');
                } catch (e: any) {
                  show(e.message || 'Erreur', 'error');
                } finally { setUpdating(false); }
              }}
              disabled={updating}
              className="w-full h-14 rounded-full text-white font-bold tap disabled:opacity-50 gradient-flame"
            >
              {updating ? '...' : "Confirmer la collecte"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryMap({ restaurantLat, restaurantLng, clientLat, clientLng }: {
  restaurantLat: number; restaurantLng: number; clientLat: number; clientLng: number;
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
      map.fitBounds(L.latLngBounds([[restaurantLat, restaurantLng], [clientLat, clientLng]]), { padding: [40, 40] });
    });
    return () => { active = false; mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);
  return <div ref={mapRef} className="w-full h-full" />;
}
