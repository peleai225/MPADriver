import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Phone, Navigation, CheckCircle2, ArrowRight,
  ClipboardList, Truck, Package, Home, FileText, Banknote, Smartphone,
  AlertTriangle, Camera, KeyRound, ShieldAlert, MessageCircle, X,
  Check, ChevronRight, PartyPopper,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { formatFCFA, DELIVERY_STATUS_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../lib/format';
import { startTracking, stopTracking, openInMaps } from '../lib/geo';
import { listenDeliveryStatus, listenOrderStatus } from '../lib/echo';
import { vibrate, notify, playAlert } from '../lib/alert';
import type { Delivery, IssueType, OrderStatus } from '../lib/types';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';

const STEPS = ['assigned', 'heading_to_restaurant', 'picked_up', 'delivering'];
const STEP_LABELS = ['Assigné', 'En route', 'Récupéré', 'En livraison'];
const STEP_ICONS = [ClipboardList, Truck, Package, Home];

const RESTAURANT_ISSUES: { type: IssueType; label: string }[] = [
  { type: 'restaurant_closed', label: 'Restaurant fermé' },
  { type: 'order_not_ready', label: 'Commande pas prête' },
  { type: 'items_missing', label: 'Articles manquants' },
  { type: 'order_cancelled_by_restaurant', label: 'Annulée par le restaurant' },
];

const CLIENT_ISSUES: { type: IssueType; label: string }[] = [
  { type: 'client_absent', label: 'Client absent' },
  { type: 'address_not_found', label: 'Adresse introuvable' },
  { type: 'order_refused', label: 'Commande refusée' },
  { type: 'order_damaged', label: 'Commande endommagée' },
  { type: 'accident', label: 'Accident / Incident' },
];

type FlowPhase = 'main' | 'pickup' | 'verify' | 'done';

export function ActiveDeliveryPage() {
  const { go } = useNav();
  const { show } = useToast();
  const { driver } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [phase, setPhase] = useState<FlowPhase>('main');

  // Pickup checklist
  const [pickupChecks, setPickupChecks] = useState([false, false, false]);

  // Delivery verification
  const [verifyCode, setVerifyCode] = useState('');
  const [codeValid, setCodeValid] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [proofUploaded, setProofUploaded] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Cash
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashDebt, setCashDebt] = useState<{ amount_owed: number; restaurant: string } | null>(null);

  // Order status from restaurant
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);

  // Issue reporting
  const [showIssueSheet, setShowIssueSheet] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);

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
        notify('Course annulée', 'La commande a été annulée.', () => go({ name: 'deliveries' }));
        show('Course annulée.', 'error');
        setDelivery(null); stopTracking(); go({ name: 'deliveries' });
        return;
      }
      api.getActiveDelivery().then(d => { if (active) setDelivery(d); }).catch(() => {});
    }).then(u => { if (active) unsub = u; });
    return () => { active = false; unsub?.(); };
  }, [driver?.id, go, show]);

  // Listen to restaurant order status changes via tracking token
  useEffect(() => {
    const token = delivery?.tracking_token;
    if (!token) return;
    setOrderStatus((delivery?.order_status as OrderStatus) ?? null);
    let active = true;
    let unsub: (() => void) | null = null;
    listenOrderStatus(token, (data: any) => {
      if (!active) return;
      const newStatus = data?.new_status as OrderStatus | undefined;
      if (newStatus) {
        setOrderStatus(newStatus);
        if (newStatus === 'ready') {
          vibrate([200, 100, 200]);
          playAlert();
          notify('Commande prête !', 'Le restaurant a terminé la préparation.');
          show('Le restaurant a préparé la commande !', 'success');
        } else if (newStatus === 'cancelled') {
          vibrate([500, 200, 500]);
          notify('Commande annulée par le restaurant', 'La commande a été annulée.');
          show('Commande annulée par le restaurant.', 'error');
        }
      }
    }).then(u => { if (active) unsub = u; });
    return () => { active = false; unsub?.(); };
  }, [delivery?.tracking_token, delivery?.order_status, show]);

  // #5 — Navigation Google Maps on status transitions
  const advance = async () => {
    if (!delivery || !delivery.order) return;
    const order = delivery.order;
    setUpdating(true);
    try {
      if (delivery.status === 'assigned') {
        const updated = await api.updateDeliveryStatus(delivery.id, 'heading_to_restaurant');
        setDelivery(updated);
        openInMaps(order.restaurant.latitude, order.restaurant.longitude, order.restaurant.name);
      } else if (delivery.status === 'heading_to_restaurant') {
        // #2 — Show pickup checklist instead of directly advancing
        setPhase('pickup');
      } else if (delivery.status === 'picked_up') {
        const updated = await api.updateDeliveryStatus(delivery.id, 'delivering');
        setDelivery(updated);
        openInMaps(order.delivery_latitude, order.delivery_longitude, order.delivery_address);
      } else if (delivery.status === 'delivering') {
        // #3 — Show verification screen instead of directly marking delivered
        setPhase('verify');
      }
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setUpdating(false); }
  };

  // #2 — Pickup confirm after checklist
  const confirmPickup = async () => {
    if (!delivery) return;
    setUpdating(true);
    try {
      const updated = await api.updateDeliveryStatus(delivery.id, 'picked_up');
      setDelivery(updated);
      setPhase('main');
      setPickupChecks([false, false, false]);
      show('Commande récupérée !', 'success');
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setUpdating(false); }
  };

  // #3 — Verify code
  const handleVerifyCode = async () => {
    if (!delivery || verifyCode.length !== 4) return;
    setUpdating(true);
    try {
      const r = await api.verifyDeliveryCode(delivery.id, verifyCode);
      if (r.valid) {
        setCodeValid(true);
        show('Code valide !', 'success');
      } else {
        show(r.message || 'Code incorrect.', 'error');
      }
    } catch (err: any) {
      show(err.message || 'Code incorrect.', 'error');
    } finally { setUpdating(false); }
  };

  // #3 — Upload proof photo
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !delivery) return;
    setProofPhoto(file);
    setUpdating(true);
    try {
      await api.uploadDeliveryProof(delivery.id, file);
      setProofUploaded(true);
      show('Photo envoyée !', 'success');
    } catch (err: any) {
      show(err.message || 'Erreur envoi photo..', 'error');
      setProofPhoto(null);
    } finally { setUpdating(false); }
  };

  // #3 — Final confirm after code + photo
  const confirmDelivery = async () => {
    if (!delivery) return;
    setUpdating(true);
    try {
      await api.updateDeliveryStatus(delivery.id, 'delivered');
      stopTracking();
      if (delivery.order?.payment_method === 'cash_on_delivery') {
        setShowCashModal(true);
      } else {
        setPhase('done');
      }
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setUpdating(false); }
  };

  // #4 — Report issue
  const handleReportIssue = async (issueType: IssueType) => {
    if (!delivery) return;
    setIssueLoading(true);
    try {
      await api.reportIssue(delivery.id, issueType);
      show('Problème signalé à l\'équipe.', 'success');
      setShowIssueSheet(false);
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setIssueLoading(false); }
  };

  // ── LOADING ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── NO DELIVERY ──
  if (!delivery && phase !== 'done') return (
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

  // ── #6 CONFIRMATION "BRAVO" ──
  if (phase === 'done') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-foreground">
      {cashDebt && cashDebt.amount_owed > 0 && (
        <Card className="mb-6 w-full max-w-xs border-warning-200 bg-warning-50">
          <CardContent className="p-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-warning-600" />
              <p className="font-bold text-sm text-warning-700">Argent à reverser</p>
            </div>
            <p className="font-extrabold text-xl mt-1 tabular text-warning-600">{formatFCFA(cashDebt.amount_owed)}</p>
            <p className="text-xs mt-0.5 text-warning-700">à {cashDebt.restaurant}</p>
          </CardContent>
        </Card>
      )}

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="w-28 h-28 rounded-full flex items-center justify-center mb-6 bg-success-50 border-2 border-success-200"
      >
        <PartyPopper size={48} className="text-success-500" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-white font-extrabold text-3xl mb-2">
          Bravo{driver?.name ? `, ${driver.name.split(' ')[0]}` : ''} !
        </h1>
        {delivery?.driver_earning_estimate != null && (
          <div className="mb-3">
            <p className="text-white/50 text-sm">Votre gain pour cette course</p>
            <p className="text-primary font-extrabold text-4xl tabular mt-1">{formatFCFA(delivery.driver_earning_estimate)}</p>
            <p className="text-white/40 text-xs mt-1">est maintenant disponible sur votre solde</p>
          </div>
        )}
        <p className="text-white/50 text-sm mb-8">Livraison effectuée avec succès !</p>
      </motion.div>

      <div className="flex gap-3 w-full max-w-xs">
        <Button variant="outline" onClick={() => go({ name: 'earnings' })} className="flex-1 rounded-full border-white/20 text-white hover:bg-white/10">
          Mes gains
        </Button>
        <Button onClick={() => go({ name: 'dashboard' })} className="flex-1 rounded-full">
          Accueil
        </Button>
      </div>
    </div>
  );

  const order = delivery!.order;
  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-muted">
        <Truck size={36} className="text-muted-foreground" />
      </div>
      <p className="font-extrabold text-xl text-foreground">Chargement de la commande...</p>
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
  const issues = isPickingUp ? RESTAURANT_ISSUES : CLIENT_ISSUES;

  const actionLabel =
    delivery!.status === 'assigned' ? 'Naviguer vers le restaurant'
    : delivery!.status === 'heading_to_restaurant' ? 'Arrivé au restaurant'
    : delivery!.status === 'picked_up' ? 'Naviguer vers le client'
    : 'Confirmer la livraison';

  // ── #2 PICKUP CHECKLIST ──
  if (phase === 'pickup') {
    const allChecked = pickupChecks.every(Boolean);
    const CHECKLIST = [
      'Commande prête et reçue',
      'Nombre d\'articles vérifié',
      'Sac bien fermé et sécurisé',
    ];
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-5 pt-safe pt-5 pb-4 bg-foreground">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPhase('main')} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 tap">
              <X size={18} className="text-white" />
            </button>
            <Badge variant="default" dot pulse>RECUPERATION</Badge>
            <div className="w-9" />
          </div>
          <h1 className="text-white font-extrabold text-xl">Vérifiez la commande</h1>
          <p className="text-white/50 text-sm mt-1">#{order.reference} · {order.restaurant.name}</p>
        </div>

        <div className="flex-1 px-5 py-6 space-y-3">
          {CHECKLIST.map((text, i) => (
            <button
              key={i}
              onClick={() => setPickupChecks(c => { const n = [...c]; n[i] = !n[i]; return n; })}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl tap transition-all border ${
                pickupChecks[i]
                  ? 'bg-success-50 border-success-200'
                  : 'bg-card border-border'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                pickupChecks[i] ? 'bg-success-500' : 'bg-muted'
              }`}>
                {pickupChecks[i] && <Check size={14} className="text-white" />}
              </div>
              <p className={`text-sm font-semibold text-left ${pickupChecks[i] ? 'text-success-700' : 'text-foreground'}`}>
                {text}
              </p>
            </button>
          ))}

          <button
            onClick={() => setShowIssueSheet(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive/5 border border-destructive/15 tap mt-4"
          >
            <ShieldAlert size={16} className="text-destructive" />
            <p className="text-sm font-semibold text-destructive">Signaler un problème</p>
          </button>
        </div>

        <div className="px-5 pb-5 safe-bottom">
          <Button
            onClick={confirmPickup}
            disabled={!allChecked || updating}
            size="lg"
            className="w-full rounded-full"
          >
            {updating
              ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              : <>Commande récupérée <ArrowRight size={18} /></>
            }
          </Button>
        </div>

        {showIssueSheet && <IssueSheet issues={issues} onSelect={handleReportIssue} onClose={() => setShowIssueSheet(false)} loading={issueLoading} />}
      </div>
    );
  }

  // ── #3 DELIVERY VERIFICATION ──
  if (phase === 'verify') {
    const canFinish = codeValid && proofUploaded;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-5 pt-safe pt-5 pb-4 bg-foreground">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPhase('main')} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 tap">
              <X size={18} className="text-white" />
            </button>
            <Badge variant="default" dot pulse>VERIFICATION</Badge>
            <div className="w-9" />
          </div>
          <h1 className="text-white font-extrabold text-xl">Confirmer la livraison</h1>
          <p className="text-white/50 text-sm mt-1">#{order.reference}</p>
        </div>

        <div className="flex-1 px-5 py-6 space-y-5">
          {/* Step 1: Code */}
          <Card className={codeValid ? 'border-success-200 bg-success-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${codeValid ? 'bg-success-500' : 'bg-primary/10'}`}>
                  {codeValid ? <CheckCircle2 size={18} className="text-white" /> : <KeyRound size={18} className="text-primary" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Code client</p>
                  <p className="text-xs text-muted-foreground">Demandez le code 4 chiffres au client</p>
                </div>
              </div>
              {!codeValid && (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    className="text-center text-2xl font-extrabold h-14 tracking-[0.5em] flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={handleVerifyCode}
                    disabled={verifyCode.length !== 4 || updating}
                    className="h-14 px-5"
                  >
                    {updating ? <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> : 'Vérifier'}
                  </Button>
                </div>
              )}
              {codeValid && <p className="text-sm font-semibold text-success-700">Code vérifié</p>}
            </CardContent>
          </Card>

          {/* Step 2: Photo */}
          <Card className={proofUploaded ? 'border-success-200 bg-success-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${proofUploaded ? 'bg-success-500' : 'bg-primary/10'}`}>
                  {proofUploaded ? <CheckCircle2 size={18} className="text-white" /> : <Camera size={18} className="text-primary" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Photo de preuve</p>
                  <p className="text-xs text-muted-foreground">Prenez une photo de la livraison</p>
                </div>
              </div>
              {!proofUploaded ? (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={updating}
                    className="w-full"
                  >
                    {updating ? <span className="w-4 h-4 border-2 border-foreground/40 border-t-foreground rounded-full animate-spin" /> : <><Camera size={16} /> Prendre une photo</>}
                  </Button>
                  {proofPhoto && !proofUploaded && (
                    <p className="text-xs text-muted-foreground mt-2">Envoi en cours...</p>
                  )}
                </>
              ) : (
                <p className="text-sm font-semibold text-success-700">Photo envoyée</p>
              )}
            </CardContent>
          </Card>

          <button
            onClick={() => setShowIssueSheet(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive/5 border border-destructive/15 tap"
          >
            <ShieldAlert size={16} className="text-destructive" />
            <p className="text-sm font-semibold text-destructive">Signaler un problème</p>
          </button>
        </div>

        <div className="px-5 pb-5 safe-bottom">
          <Button
            onClick={confirmDelivery}
            disabled={!canFinish || updating}
            size="lg"
            className="w-full rounded-full"
          >
            {updating
              ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              : <>Confirmer la livraison <CheckCircle2 size={18} /></>
            }
          </Button>
        </div>

        {showIssueSheet && <IssueSheet issues={CLIENT_ISSUES} onSelect={handleReportIssue} onClose={() => setShowIssueSheet(false)} loading={issueLoading} />}
      </div>
    );
  }

  // ── MAIN DELIVERY VIEW ──
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
                <p className="text-[10px] text-primary">Gain estimé</p>
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

      {/* ORDER STATUS BANNER */}
      {orderStatus && isPickingUp && ORDER_STATUS_LABELS[orderStatus] && (
        <div className={`px-5 py-3 flex items-center gap-3 border-b border-border ${ORDER_STATUS_COLORS[orderStatus]?.bg ?? 'bg-muted/50'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${orderStatus === 'ready' ? 'bg-success-500' : 'bg-white/80'}`}>
            {orderStatus === 'ready'
              ? <CheckCircle2 size={16} className="text-white" />
              : orderStatus === 'preparing'
                ? <Package size={16} className="text-warning-600" />
                : <ClipboardList size={16} className="text-info-600" />
            }
          </div>
          <div>
            <p className={`text-xs font-semibold ${ORDER_STATUS_COLORS[orderStatus]?.text ?? 'text-muted-foreground'}`}>
              Statut commande
            </p>
            <p className={`font-bold text-sm ${ORDER_STATUS_COLORS[orderStatus]?.text ?? 'text-foreground'}`}>
              {ORDER_STATUS_LABELS[orderStatus]}
            </p>
          </div>
          {orderStatus === 'ready' && (
            <Badge variant="success" className="ml-auto animate-pulse">PRETE</Badge>
          )}
        </div>
      )}

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
              <p className="text-sm font-bold text-muted-foreground">{isPickingUp ? 'Récupérer chez' : 'Livrer à'}</p>
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
                  {order.payment_method === 'cash_on_delivery' ? 'Paiement à la livraison' : 'Payé en ligne'}
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

        {/* #4 — Issue report button */}
        <button
          onClick={() => setShowIssueSheet(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive/5 border border-destructive/15 tap"
        >
          <ShieldAlert size={16} className="text-destructive" />
          <p className="text-sm font-semibold text-destructive">Signaler un problème</p>
        </button>
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
              <p className="text-sm text-muted-foreground">Entrez le montant total reçu du client.</p>
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
                    <p className="text-sm font-bold text-warning-700">Tu dois reverser {formatFCFA(cashDebt.amount_owed)} à {cashDebt.restaurant}</p>
                  </CardContent>
                </Card>
              )}
              <Button
                onClick={async () => {
                  const amount = parseInt(cashAmount);
                  if (!amount) { show('Entrez le montant collecté.', 'error'); return; }
                  setUpdating(true);
                  try {
                    const result = await api.confirmCashCollected(delivery!.id, amount);
                    setCashDebt({ amount_owed: result.amount_owed, restaurant: result.restaurant });
                    setShowCashModal(false);
                    setPhase('done');
                    show(result.amount_owed > 0 ? `Reversez ${formatFCFA(result.amount_owed)} à ${result.restaurant}` : 'Livraison terminée !', result.amount_owed > 0 ? 'info' : 'success');
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

      {/* #4 ISSUE SHEET */}
      {showIssueSheet && <IssueSheet issues={issues} onSelect={handleReportIssue} onClose={() => setShowIssueSheet(false)} loading={issueLoading} />}
    </div>
  );
}

// ── ISSUE REPORTING SHEET ──
function IssueSheet({ issues, onSelect, onClose, loading }: {
  issues: { type: IssueType; label: string }[];
  onSelect: (type: IssueType) => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-50" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full bg-card rounded-t-3xl safe-bottom"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-destructive" />
            <h2 className="font-extrabold text-lg text-foreground">Signaler un problème</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-muted tap">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {issues.map(issue => (
            <button
              key={issue.type}
              onClick={() => onSelect(issue.type)}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border tap hover:bg-muted/50 disabled:opacity-50"
            >
              <AlertTriangle size={16} className="text-destructive shrink-0" />
              <p className="text-sm font-semibold text-foreground text-left">{issue.label}</p>
              <ChevronRight size={14} className="text-muted-foreground ml-auto" />
            </button>
          ))}
          <button
            onClick={() => window.open('tel:+2250501862640')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-primary/20 bg-primary/5 tap"
          >
            <MessageCircle size={16} className="text-primary shrink-0" />
            <p className="text-sm font-semibold text-primary text-left">Contacter l'assistance</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── DELIVERY MAP ──
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
