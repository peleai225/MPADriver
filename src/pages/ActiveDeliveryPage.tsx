import { useEffect, useState, useRef } from 'react';
import {
  MapPin, Phone, Navigation, CheckCircle2, ArrowRight,
  ClipboardList, Truck, Package, Home, FileText, Banknote, Smartphone,
  AlertTriangle,
} from 'lucide-react';
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
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';

const STEPS = ['assigned', 'heading_to_restaurant', 'picked_up', 'delivering'];
const STEP_LABELS = ['Assigne', 'En route', 'Recupere', 'En livraison'];
const STEP_ICONS = [ClipboardList, Truck, Package, Home];

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
    startTracking(async (pos) => {
      try { await api.updateLocation(pos.lat, pos.lng, pos.accuracy, pos.speed, pos.heading); } catch { }
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
        notify('Course annulee', 'La commande a ete annulee.', () => go({ name: 'deliveries' }));
        show('Course annulee.', 'error');
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!delivery && !done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-muted">
        <Truck size={36} className="text-muted-foreground" />
      </div>
      <p className="font-extrabold text-xl text-foreground">Aucune course active</p>
      <p className="text-sm mt-2 text-muted-foreground">Acceptez une course pour commencer.</p>
      <Button onClick={() => go({ name: 'deliveries' })} size="lg" className="mt-6 rounded-full">
        Voir les courses
      </Button>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-foreground">
      {cashDebt && cashDebt.amount_owed > 0 && (
        <Card className="mb-6 w-full max-w-xs border-warning-200 bg-warning-50">
          <CardContent className="p-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-warning-600" />
              <p className="font-bold text-sm text-warning-700">Argent a reverser</p>
            </div>
            <p className="font-extrabold text-xl mt-1 tabular text-warning-600">{formatFCFA(cashDebt.amount_owed)}</p>
            <p className="text-xs mt-0.5 text-warning-700">a {cashDebt.restaurant}</p>
          </CardContent>
        </Card>
      )}
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-scale-in bg-success-50 border border-success-200">
        <CheckCircle2 size={44} className="text-success-500" />
      </div>
      <h1 className="text-white font-extrabold text-3xl mb-2">Livraison effectuee !</h1>
      <p className="text-white/50 text-sm mb-10">Votre gain a ete ajoute a votre solde.</p>
      <Button onClick={() => go({ name: 'dashboard' })} size="lg" className="rounded-full">
        Retour a l'accueil
      </Button>
    </div>
  );

  const order = delivery!.order;
  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-muted">
        <Truck size={36} className="text-muted-foreground" />
      </div>
      <p className="font-extrabold text-xl text-foreground">Chargement de la commande...</p>
      <p className="text-sm mt-2 text-muted-foreground">Les details arrivent.</p>
      <Button onClick={() => { api.getActiveDelivery().then(d => setDelivery(d)).catch(() => {}); }} size="lg" className="mt-6 rounded-full">
        Recharger
      </Button>
    </div>
  );
  const isPickingUp = delivery!.status === 'assigned' || delivery!.status === 'heading_to_restaurant';
  const targetLat = isPickingUp ? order.restaurant.latitude : order.delivery_latitude;
  const targetLng = isPickingUp ? order.restaurant.longitude : order.delivery_longitude;
  const targetLabel = isPickingUp ? order.restaurant.address : order.delivery_address;
  const stepIdx = STEPS.indexOf(delivery!.status);

  const actionLabel =
    delivery!.status === 'assigned' ? 'Je pars au restaurant'
    : delivery!.status === 'heading_to_restaurant' ? 'Arrive au restaurant'
    : delivery!.status === 'picked_up' ? 'En route vers le client'
    : 'Livraison effectuee';

  return (
    <div className="min-h-screen flex flex-col pb-28 bg-background">

      {/* HEADER */}
      <div className="px-5 pt-safe pt-5 pb-4 bg-foreground">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/40 text-xs">Course en cours</p>
            <h1 className="text-white font-extrabold text-xl tabular">{order.reference}</h1>
          </div>
          {delivery!.driver_earning_estimate != null && (
            <Card className="border-0 bg-primary/20">
              <CardContent className="px-3 py-2 text-right">
                <p className="text-[10px] text-primary">Gain estime</p>
                <p className="font-extrabold text-lg tabular text-primary">{formatFCFA(delivery!.driver_earning_estimate)}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Badge variant="default" dot pulse className="mb-4">
          {DELIVERY_STATUS_LABELS[delivery!.status] ?? delivery!.status}
        </Badge>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    i < stepIdx ? 'bg-success-500' : i === stepIdx ? 'bg-primary' : 'bg-white/10'
                  }`}>
                    {i < stepIdx
                      ? <CheckCircle2 size={14} className="text-white" />
                      : <Icon size={14} className={i === stepIdx ? 'text-white' : 'text-white/40'} />
                    }
                  </div>
                  <p className={`text-[9px] mt-1 font-medium ${i <= stepIdx ? 'text-white' : 'text-white/30'}`}>
                    {STEP_LABELS[i]}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-5 ${i < stepIdx ? 'bg-success-500' : 'bg-white/15'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MAP */}
      <div className="h-48 relative">
        <DeliveryMap
          restaurantLat={order.restaurant.latitude}
          restaurantLng={order.restaurant.longitude}
          clientLat={order.delivery_latitude}
          clientLng={order.delivery_longitude}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openInMaps(targetLat, targetLng, targetLabel)}
          className="absolute bottom-3 right-3 shadow-card"
        >
          <Navigation size={13} /> Naviguer
        </Button>
      </div>

      <div className="px-5 mt-4 space-y-3">

        {/* TARGET ADDRESS */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPickingUp ? 'bg-primary/10' : 'bg-success-50'}`}>
                <MapPin size={16} className={isPickingUp ? 'text-primary' : 'text-success-600'} />
              </div>
              <p className="text-sm font-bold text-muted-foreground">{isPickingUp ? 'Recuperer chez' : 'Livrer a'}</p>
            </div>
            {isPickingUp && <p className="font-extrabold text-base mb-0.5 text-foreground">{order.restaurant.name}</p>}
            <p className="text-sm text-muted-foreground">{targetLabel}</p>

            {isPickingUp && order.restaurant.phone && (
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a href={`tel:${order.restaurant.phone}`}>
                  <Phone size={13} /> Appeler le restaurant
                </a>
              </Button>
            )}
            {!isPickingUp && order.delivery_phone && (
              <Button variant="outline" size="sm" className="mt-3 border-success-200 text-success-600 hover:bg-success-50" asChild>
                <a href={`tel:${order.delivery_phone}`}>
                  <Phone size={13} /> Appeler le client
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ORDER DETAILS */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={16} className="text-primary" />
              <p className="font-bold text-sm text-foreground">Commande <span className="text-primary tabular">#{order.reference}</span></p>
            </div>
            <div className="space-y-1.5 mb-3">
              {order.items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge className="w-6 h-6 p-0 justify-center text-xs">{item.quantity}</Badge>
                  <p className="text-sm text-muted-foreground">{item.name}</p>
                </div>
              ))}
              {order.items.length > 3 && <p className="text-xs text-muted-foreground">+{order.items.length - 3} autres articles</p>}
            </div>
            <Separator className="mb-3" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {order.payment_method === 'cash_on_delivery'
                  ? <Banknote size={14} className="text-muted-foreground" />
                  : <Smartphone size={14} className="text-muted-foreground" />
                }
                <span className="text-xs text-muted-foreground">
                  {order.payment_method === 'cash_on_delivery' ? 'Paiement a la livraison' : 'Paye en ligne'}
                </span>
              </div>
              <span className="font-extrabold text-lg tabular text-foreground">{formatFCFA(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {order.delivery_instructions && (
          <Card className="border-warning-200 bg-warning-50">
            <CardContent className="p-3.5 flex gap-2">
              <FileText size={16} className="text-warning-600 shrink-0 mt-0.5" />
              <p className="text-sm text-warning-700">{order.delivery_instructions}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 px-5 py-4 safe-bottom bg-card/97 border-t border-border">
        <Button
          onClick={advance}
          disabled={updating}
          size="lg"
          className="w-full rounded-full"
        >
          {updating
            ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            : <>{actionLabel} <ArrowRight size={18} /></>
          }
        </Button>
      </div>

      {/* CASH MODAL */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <Card className="w-full rounded-t-3xl rounded-b-none border-0 safe-bottom">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-extrabold text-xl text-foreground">Collecte cash</h2>
              <p className="text-sm text-muted-foreground">Entrez le montant total recu du client.</p>
              <Input
                type="number"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                placeholder={String(delivery?.order?.total ?? '')}
                className="text-2xl font-extrabold h-16"
                autoFocus
              />
              {cashDebt && cashDebt.amount_owed > 0 && (
                <Card className="border-warning-200 bg-warning-50">
                  <CardContent className="p-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warning-600 shrink-0" />
                    <p className="text-sm font-bold text-warning-700">Tu dois reverser {formatFCFA(cashDebt.amount_owed)} a {cashDebt.restaurant}</p>
                  </CardContent>
                </Card>
              )}
              <Button
                onClick={async () => {
                  const amount = parseInt(cashAmount);
                  if (!amount) { show('Entrez le montant collecte.', 'error'); return; }
                  setUpdating(true);
                  try {
                    const result = await api.confirmCashCollected(delivery!.id, amount);
                    setCashDebt({ amount_owed: result.amount_owed, restaurant: result.restaurant });
                    setShowCashModal(false); setDone(true);
                    show(result.amount_owed > 0 ? `Reverse ${formatFCFA(result.amount_owed)} a ${result.restaurant}` : 'Livraison terminee !', result.amount_owed > 0 ? 'info' : 'success');
                  } catch (e: any) {
                    show(e.message || 'Erreur', 'error');
                  } finally { setUpdating(false); }
                }}
                disabled={updating}
                size="lg"
                className="w-full rounded-full"
              >
                {updating ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> : 'Confirmer la collecte'}
              </Button>
            </CardContent>
          </Card>
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
      const rIcon = L.divIcon({ html: '<div style="background:hsl(24.6,95%,53.1%);width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14] });
      const cIcon = L.divIcon({ html: '<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>', iconSize: [14, 14] });
      L.marker([restaurantLat, restaurantLng], { icon: rIcon }).addTo(map);
      L.marker([clientLat, clientLng], { icon: cIcon }).addTo(map);
      map.fitBounds(L.latLngBounds([[restaurantLat, restaurantLng], [clientLat, clientLng]]), { padding: [40, 40] });
    });
    return () => { active = false; mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);
  return <div ref={mapRef} className="w-full h-full" />;
}
