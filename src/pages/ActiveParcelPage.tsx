import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Phone, Navigation, CheckCircle2, ArrowRight, Box, Camera, KeyRound, ShieldAlert,
  MessageCircle, X, Check, PartyPopper, Banknote, Smartphone, FileText, CircleDot, Truck,
  RotateCcw, WifiOff, Lock, AlertTriangle, Home,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { useOnline, isNetworkError } from '../lib/network';
import { formatFCFA } from '../lib/format';
import { openInMaps } from '../lib/geo';
import { vibrate } from '../lib/alert';
import { getCachedActiveParcel, setCachedActiveParcel } from '../lib/activeParcel';
import { sendParcelStep, OUTBOX_SYNCED_EVENT } from '../lib/outbox';
import {
  PARCEL_STATUS_LABELS, PARCEL_SIZE_HINTS, PARCEL_FAIL_REASONS_BEFORE_PICKUP, PARCEL_FAIL_REASONS_AFTER_PICKUP,
  SUPPORT_PHONE, parcelSizeLabel, isCashParcel, parcelPaymentLabel, compressParcelPhoto, parcelErrorCode,
} from '../lib/parcel';
import type { Parcel } from '../lib/types';
import { GeoNotice } from '../components/GeoNotice';
import { DeliveryMap } from '../components/DeliveryMap';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const STEPS = ['assigned', 'picked_up', 'delivering'];
const STEP_LABELS = ['Ramassage', 'Ramassé', 'Remise'];
const STEP_ICONS = [CircleDot, Box, Home];

type Phase = 'main' | 'pickup' | 'code' | 'done';

/**
 * Course colis en cours : Accepter → (au départ) photo obligatoire + encaissement si espèces →
 * Démarrer la livraison → (à l'arrivée) code à 4 chiffres → Livré. « Signaler un problème » à chaque étape.
 */
export function ActiveParcelPage() {
  const { go } = useNav();
  const { show } = useToast();
  const { driver } = useAuth();
  const online = useOnline();

  const [parcel, setParcel] = useState<Parcel | null>(() => getCachedActiveParcel());
  const [loading, setLoading] = useState(() => !getCachedActiveParcel());
  const [updating, setUpdating] = useState(false);
  const [phase, setPhase] = useState<Phase>('main');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Ramassage
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Remise
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Fin
  const [doneInfo, setDoneInfo] = useState<{ earning: number | null; cash: boolean; commission: number } | null>(null);

  // Problème
  const [showIssue, setShowIssue] = useState(false);

  const refresh = useCallback(async () => {
    const p = await api.getActiveParcel();
    if (phaseRef.current === 'done') return p;
    setParcel(p);
    if (p?.handover_locked) setLocked(true);
    return p;
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Pas de temps réel pour les colis : on revérifie régulièrement (annulation par l'expéditeur, déblocage du code…).
  useEffect(() => {
    const t = setInterval(() => {
      if (phaseRef.current === 'done') return;
      refresh().then(p => {
        if (!p && phaseRef.current !== 'done' && getCachedActiveParcel() == null) {
          // Course retirée côté serveur (annulée par l'expéditeur ou l'admin).
          show('Cette course colis n\'est plus active (annulée ou réattribuée).', 'info');
          go({ name: 'dashboard' });
        }
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [refresh, go, show]);

  useEffect(() => {
    const onSynced = () => { if (phaseRef.current !== 'done') refresh().catch(() => {}); };
    window.addEventListener(OUTBOX_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(OUTBOX_SYNCED_EVENT, onSynced);
  }, [refresh]);

  // Aperçu de la photo : libère l'URL temporaire quand elle change.
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  // ── Ramassage ──
  const onPhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de reprendre la même photo
    if (!file) return;
    setPickupError(null);
    setCompressing(true);
    try {
      const small = await compressParcelPhoto(file);
      setPhoto(small);
      setPhotoUrl(URL.createObjectURL(small));
    } catch (err: any) {
      setPickupError(err?.message || 'Photo illisible. Reprenez la photo.');
    } finally { setCompressing(false); }
  };

  const confirmPickup = async () => {
    if (!parcel || !photo) return;
    const cash = isCashParcel(parcel);
    if (cash && !cashConfirmed) { setPickupError(`Confirmez avoir encaissé ${formatFCFA(parcel.cash_to_collect)}.`); return; }
    if (!online) { setPickupError('Connexion requise pour envoyer la photo. Réessayez dès que le réseau revient.'); return; }
    setUpdating(true);
    setPickupError(null);
    try {
      const p = await api.pickupParcel(parcel.reference, photo, cash && cashConfirmed);
      setParcel(p);
      setPhase('main');
      setPhoto(null); setPhotoUrl(null); setCashConfirmed(false);
      show(cash ? `Colis ramassé · ${formatFCFA(parcel.cash_to_collect)} encaissés.` : 'Colis ramassé !', 'success');
    } catch (err: any) {
      if (isNetworkError(err)) {
        setPickupError('Connexion requise pour envoyer la photo. Réessayez dès que le réseau revient.');
      } else if (parcelErrorCode(err) === 'invalid_transition') {
        show(err.message, 'error');
        await refresh().catch(() => {});
        setPhase('main');
      } else {
        setPickupError(err?.message || "Échec de l'envoi. Réessayez.");
      }
    } finally { setUpdating(false); }
  };

  // ── Démarrer la livraison (rejouable hors ligne) ──
  const startDelivery = async () => {
    if (!parcel) return;
    setUpdating(true);
    try {
      const r = await sendParcelStep(parcel.reference, 'start');
      if (r.data && 'reference' in r.data) setParcel(r.data);
      else setParcel(p => (p ? { ...p, status: 'delivering' } : p));
      if (r.queued) show('Pas de réseau : départ enregistré, envoi automatique au retour du réseau.', 'info');
      openInMaps(parcel.dropoff.latitude, parcel.dropoff.longitude, parcel.dropoff.address);
    } catch (err: any) {
      show(err?.message || 'Erreur.', 'error');
      if (parcelErrorCode(err) === 'invalid_transition') refresh().catch(() => {});
    } finally { setUpdating(false); }
  };

  // ── Remise avec le code ──
  const submitCode = async () => {
    if (!parcel || code.length !== 4) return;
    if (!online) { setCodeError('Connexion requise pour vérifier le code.'); return; }
    setUpdating(true);
    setCodeError(null);
    try {
      const r = await api.deliverParcel(parcel.reference, code);
      const cash = isCashParcel(parcel);
      const earning = r.earning ?? parcel.driver_earning_estimate ?? null;
      setDoneInfo({ earning, cash, commission: cash ? Math.max(0, parcel.price - (earning ?? 0)) : 0 });
      setPhase('done');
      vibrate([100, 50, 100]);
    } catch (err: any) {
      const codeErr = parcelErrorCode(err);
      if (isNetworkError(err)) {
        setCodeError('Connexion requise pour vérifier le code. Réessayez dès que le réseau revient.');
      } else if (codeErr === 'code_locked' || err?.status === 423) {
        setLocked(true);
        setCachedActiveParcel({ ...parcel, handover_locked: true, handover_attempts_left: 0 });
        vibrate([400, 150, 400]);
      } else if (codeErr === 'invalid_code') {
        const left = Number(err?.data?.attempts_left);
        if (Number.isFinite(left)) setAttemptsLeft(left);
        setCodeError(err?.message || 'Code incorrect.');
        setCode('');
        vibrate([200, 100, 200]);
        codeInputRef.current?.focus();
      } else {
        setCodeError(err?.message || 'Erreur.');
      }
    } finally { setUpdating(false); }
  };

  // ── Problème ──
  const submitIssue = async (reason: string) => {
    if (!parcel) return;
    const r = await sendParcelStep(parcel.reference, 'fail', reason);
    setShowIssue(false);
    if (r.queued) {
      show('Pas de réseau : signalement enregistré, envoi automatique au retour du réseau.', 'info');
    } else {
      const data = r.data as { message?: string; status?: string } | undefined;
      show(data?.message || 'Problème signalé.', data?.status === 'failed' ? 'info' : 'success');
    }
    go({ name: 'dashboard' });
  };

  // ── CHARGEMENT ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── BRAVO ──
  if (phase === 'done') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-foreground">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="w-28 h-28 rounded-full flex items-center justify-center mb-6 bg-success-50 border-2 border-success-200"
      >
        <PartyPopper size={48} className="text-success-500" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-white font-extrabold text-3xl mb-2">
          Colis livré{driver?.name ? `, ${driver.name.split(' ')[0]}` : ''} !
        </h1>
        {doneInfo?.earning != null && (
          <div className="mb-3">
            <p className="text-white/80 text-sm">Votre gain pour cette course</p>
            <p className="text-primary font-extrabold text-4xl tabular mt-1">{formatFCFA(doneInfo.earning)}</p>
            <p className="text-white/70 text-xs mt-1">
              {doneInfo.cash ? 'déjà en main (encaissé en espèces au ramassage)' : 'est maintenant disponible sur votre solde'}
            </p>
          </div>
        )}
      </motion.div>

      {doneInfo?.cash && doneInfo.commission > 0 && (
        <Card className="mb-6 w-full max-w-xs border-warning-200 bg-warning-50">
          <CardContent className="p-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-warning-600" />
              <p className="font-bold text-sm text-warning-700">Commission à reverser</p>
            </div>
            <p className="font-extrabold text-xl mt-1 tabular text-warning-600">{formatFCFA(doneInfo.commission)}</p>
            <p className="text-xs mt-0.5 text-warning-700">à MenuPro · déclarez-la dans « Gains »</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 w-full max-w-xs mt-4">
        <Button variant="outline" size="lg" onClick={() => go({ name: 'earnings' })} className="flex-1 rounded-full border-white/40 text-white hover:bg-white/10">
          Mes gains
        </Button>
        <Button size="lg" onClick={() => go({ name: 'dashboard' })} className="flex-1 rounded-full">
          Accueil
        </Button>
      </div>
    </div>
  );

  // ── AUCUN COLIS ──
  if (!parcel) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-muted">
        <Box size={36} className="text-muted-foreground" />
      </div>
      <p className="font-extrabold text-xl text-foreground">Aucun colis en cours</p>
      <p className="text-sm mt-2 text-muted-foreground">Acceptez une course colis pour commencer.</p>
      <Button onClick={() => go({ name: 'deliveries' })} size="lg" className="mt-6 rounded-full">
        Voir les courses
      </Button>
    </div>
  );

  const p = parcel;
  const cash = isCashParcel(p);
  const beforePickup = p.status === 'assigned';
  const stepIdx = STEPS.indexOf(p.status);
  const isLocked = locked || !!p.handover_locked;
  const issueReasons = beforePickup ? PARCEL_FAIL_REASONS_BEFORE_PICKUP : PARCEL_FAIL_REASONS_AFTER_PICKUP;
  const issueSheet = showIssue && (
    <ParcelIssueSheet
      reasons={issueReasons}
      beforePickup={beforePickup}
      onSubmit={submitIssue}
      onClose={() => setShowIssue(false)}
    />
  );
  const issueButton = (
    <button
      onClick={() => setShowIssue(true)}
      className="w-full min-h-14 flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive/10 border-2 border-destructive/30 tap"
    >
      <ShieldAlert size={20} className="text-danger-700" />
      <p className="text-base font-bold text-danger-700">Signaler un problème</p>
    </button>
  );

  // ── RAMASSAGE : PHOTO + ENCAISSEMENT ──
  if (phase === 'pickup') {
    const canConfirm = !!photo && (!cash || cashConfirmed) && online && !compressing;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PhaseHeader badge="RAMASSAGE" title="Ramasser le colis" subtitle={`${p.reference} · ${p.pickup.contact_name ?? p.pickup.address}`} onBack={() => setPhase('main')} />

        <div className="flex-1 px-5 py-6 space-y-4">
          {/* 1. Photo obligatoire */}
          <Card className={photo ? 'border-success-200' : ''}>
            <CardContent className="p-4">
              <StepTitle done={!!photo} icon={Camera} n={1} title="Photo du colis" hint="Obligatoire : photographiez le colis tel que remis par l'expéditeur." />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhotoChosen}
                className="hidden"
              />
              {photo && photoUrl ? (
                <div className="mt-3">
                  <img src={photoUrl} alt="Aperçu du colis" className="w-full max-h-64 object-cover rounded-2xl border border-border" />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground tabular">Photo prête · {Math.max(1, Math.round(photo.size / 1024))} Ko</p>
                    <Button variant="outline" size="sm" className="h-11 rounded-full" onClick={() => photoInputRef.current?.click()} disabled={updating || compressing}>
                      <RotateCcw size={15} /> Reprendre
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={compressing}
                  className="w-full h-24 mt-3 rounded-2xl border-2 border-dashed text-base flex-col gap-1"
                >
                  {compressing
                    ? <><span className="w-5 h-5 border-2 border-foreground/40 border-t-foreground rounded-full animate-spin" /> Préparation de la photo…</>
                    : <><Camera size={26} /> Prendre la photo du colis</>}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 2. Encaissement (espèces) */}
          {cash && (
            <Card className={cashConfirmed ? 'border-success-200 bg-success-50' : 'border-warning-200 bg-warning-50'}>
              <CardContent className="p-4">
                <StepTitle done={cashConfirmed} icon={Banknote} n={2} title={`Encaisser ${formatFCFA(p.cash_to_collect)}`} hint="L'expéditeur paie la course en espèces, maintenant." />
                <p className="font-extrabold text-4xl tabular text-warning-700 text-center my-3">{formatFCFA(p.cash_to_collect)}</p>
                <button
                  onClick={() => setCashConfirmed(c => !c)}
                  aria-pressed={cashConfirmed}
                  className={`w-full min-h-14 flex items-center gap-3 p-4 rounded-2xl tap border-2 transition-all ${
                    cashConfirmed ? 'bg-success-500 border-success-500 text-white' : 'bg-card border-warning-500 text-foreground'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cashConfirmed ? 'bg-white/25' : 'bg-muted'}`}>
                    {cashConfirmed && <Check size={16} className="text-white" />}
                  </div>
                  <p className="text-base font-extrabold text-left">J'ai encaissé {formatFCFA(p.cash_to_collect)}</p>
                </button>
              </CardContent>
            </Card>
          )}

          {!online && (
            <div className="rounded-2xl bg-warning-500 text-black px-4 py-3 flex gap-3">
              <WifiOff size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">Connexion requise pour envoyer la photo. Gardez l'écran ouvert : vous pourrez confirmer dès le retour du réseau.</p>
            </div>
          )}
          {pickupError && <p role="alert" className="text-sm font-bold text-danger-700">{pickupError}</p>}

          {issueButton}
        </div>

        <div className="px-5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]">
          <Button onClick={confirmPickup} disabled={!canConfirm || updating} size="lg" className="w-full rounded-full h-16 text-lg font-extrabold">
            {updating
              ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              : <>Confirmer le ramassage <ArrowRight size={18} /></>}
          </Button>
        </div>
        {issueSheet}
      </div>
    );
  }

  // ── REMISE : CODE À 4 CHIFFRES ──
  if (phase === 'code') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PhaseHeader badge="REMISE" title="Code du destinataire" subtitle={`${p.reference} · ${p.dropoff.recipient_name ?? p.dropoff.address}`} onBack={() => setPhase('main')} />

        <div className="flex-1 px-5 py-6 space-y-5">
          {isLocked ? (
            <LockedCard />
          ) : (
            <Card>
              <CardContent className="p-5">
                <StepTitle done={false} icon={KeyRound} title="Saisissez le code à 4 chiffres" hint="Le destinataire l'a reçu de l'expéditeur. Ne remettez le colis qu'avec le bon code." />
                <div className="relative mt-5" onClick={() => codeInputRef.current?.focus()}>
                  <div className="flex justify-center gap-3" aria-hidden="true">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`w-16 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl font-extrabold tabular transition-colors ${
                          codeError ? 'border-destructive bg-danger-50' : code.length === i ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                      >
                        {code[i] ?? ''}
                      </div>
                    ))}
                  </div>
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={code}
                    autoFocus
                    aria-label="Code de remise à 4 chiffres"
                    onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setCodeError(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') submitCode(); }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className={`text-center text-sm mt-4 font-semibold ${attemptsLeft != null && attemptsLeft <= 2 ? 'text-danger-700' : 'text-muted-foreground'}`}>
                  {attemptsLeft != null
                    ? `${attemptsLeft} essai${attemptsLeft > 1 ? 's' : ''} restant${attemptsLeft > 1 ? 's' : ''} avant blocage`
                    : `${p.handover_attempts_left ?? 5} essais maximum`}
                </p>
                {codeError && <p role="alert" className="text-center text-sm font-bold text-danger-700 mt-2">{codeError}</p>}
              </CardContent>
            </Card>
          )}

          {!online && !isLocked && (
            <div className="rounded-2xl bg-warning-500 text-black px-4 py-3 flex gap-3">
              <WifiOff size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">Connexion requise pour vérifier le code.</p>
            </div>
          )}

          {p.dropoff.recipient_phone && (
            <Button variant="outline" className="w-full h-12 rounded-full text-base" asChild>
              <a href={`tel:${p.dropoff.recipient_phone}`}><Phone size={18} /> Appeler le destinataire</a>
            </Button>
          )}

          {issueButton}
        </div>

        {!isLocked && (
          <div className="px-5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]">
            <Button onClick={submitCode} disabled={code.length !== 4 || updating || !online} size="lg" className="w-full rounded-full h-16 text-lg font-extrabold">
              {updating
                ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                : <>Valider la remise <CheckCircle2 size={18} /></>}
            </Button>
          </div>
        )}
        {issueSheet}
      </div>
    );
  }

  // ── VUE PRINCIPALE ──
  const target = beforePickup ? p.pickup : p.dropoff;
  const targetName = beforePickup ? p.pickup.contact_name : p.dropoff.recipient_name;
  const targetPhone = beforePickup ? p.pickup.contact_phone : p.dropoff.recipient_phone;
  const actionLabel =
    p.status === 'assigned' ? 'Colis en main : prendre la photo'
    : p.status === 'picked_up' ? 'Démarrer la livraison'
    : isLocked ? 'Code bloqué : voir la marche à suivre'
    : 'Arrivé : saisir le code';
  const onAction = () => {
    if (p.status === 'assigned') setPhase('pickup');
    else if (p.status === 'picked_up') startDelivery();
    else setPhase('code');
  };

  return (
    <div className="min-h-screen flex flex-col pb-28 bg-background">
      {/* EN-TÊTE */}
      <div className="px-5 pt-safe pt-5 pb-4 bg-foreground">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-info-500 text-white">
                <Box size={12} strokeWidth={2.5} /> COLIS
              </span>
              <p className="text-white/75 text-xs font-semibold">Course en cours</p>
            </div>
            <h1 className="text-white font-extrabold text-xl tabular mt-1">{p.reference}</h1>
          </div>
          {p.driver_earning_estimate != null && (
            <Card className="border-0 bg-primary/20">
              <CardContent className="px-3 py-2 text-right">
                <p className="text-[10px] text-primary">Gain</p>
                <p className="font-extrabold text-lg tabular text-primary">{formatFCFA(p.driver_earning_estimate)}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Badge variant="default" dot pulse className="mb-4">
          {PARCEL_STATUS_LABELS[p.status] ?? p.status_label ?? p.status}
        </Badge>

        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i < stepIdx ? 'bg-success-500' : i === stepIdx ? 'bg-primary' : 'bg-white/10'
                  }`}>
                    {i < stepIdx
                      ? <CheckCircle2 size={14} className="text-white" />
                      : <Icon size={14} className={i === stepIdx ? 'text-white' : 'text-white/70'} />}
                  </div>
                  <p className={`text-[11px] leading-tight text-center mt-1 font-semibold ${i <= stepIdx ? 'text-white' : 'text-white/60'}`}>
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

      {/* ESPÈCES À ENCAISSER AU RAMASSAGE */}
      {cash && beforePickup && (
        <div className="px-5 py-3 flex items-center gap-3 border-b border-warning-200 bg-warning-50">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-warning-500 shrink-0">
            <Banknote size={20} className="text-black" />
          </div>
          <div>
            <p className="text-xs font-semibold text-warning-700">Paiement en espèces au ramassage</p>
            <p className="font-extrabold text-lg tabular text-warning-700">Encaisser {formatFCFA(p.cash_to_collect)}</p>
          </div>
        </div>
      )}

      {/* CARTE */}
      <div className="h-48 relative">
        <DeliveryMap
          restaurantLat={p.pickup.latitude}
          restaurantLng={p.pickup.longitude}
          clientLat={p.dropoff.latitude}
          clientLng={p.dropoff.longitude}
        />
        <Button
          variant="dark"
          onClick={() => openInMaps(target.latitude, target.longitude, target.address)}
          className="absolute bottom-3 right-3 z-[400] h-12 px-4 rounded-full shadow-elevated"
        >
          <Navigation size={18} /> Itinéraire
        </Button>
      </div>

      <div className="px-5 mt-4 space-y-3">
        <GeoNotice />

        {isLocked && !beforePickup && <LockedCard />}

        {/* DESTINATION ACTUELLE */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${beforePickup ? 'bg-primary/10' : 'bg-success-50'}`}>
                {beforePickup ? <CircleDot size={16} className="text-primary" /> : <MapPin size={16} className="text-success-600" />}
              </div>
              <p className="text-sm font-bold text-muted-foreground">{beforePickup ? 'Ramasser chez l\'expéditeur' : 'Livrer au destinataire'}</p>
            </div>
            {targetName && <p className="font-extrabold text-base mb-0.5 text-foreground">{targetName}</p>}
            <p className="text-base font-semibold text-foreground">{target.address}</p>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline" className="h-12 text-base" onClick={() => openInMaps(target.latitude, target.longitude, target.address)}>
                <Navigation size={18} /> Itinéraire
              </Button>
              {targetPhone ? (
                <Button className={`h-12 text-base ${beforePickup ? '' : 'bg-success-700 text-white shadow-none hover:bg-success-700/90'}`} asChild>
                  <a href={`tel:${targetPhone}`}><Phone size={18} /> Appeler</a>
                </Button>
              ) : (
                <Button variant="outline" className="h-12 text-base" disabled><Phone size={18} /> Pas de n°</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AUTRE ÉTAPE (pour information) */}
        <Card className="shadow-xs">
          <CardContent className="p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
              {beforePickup ? <MapPin size={16} className="text-success-700" /> : <CircleDot size={16} className="text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">{beforePickup ? 'Ensuite : livrer à' : 'Ramassé chez'}</p>
              <p className="text-sm font-bold text-foreground">{beforePickup ? (p.dropoff.recipient_name ?? '') : (p.pickup.contact_name ?? '')}</p>
              <p className="text-sm text-muted-foreground">{beforePickup ? p.dropoff.address : p.pickup.address}</p>
            </div>
            {!beforePickup && p.pickup.contact_phone && (
              <a href={`tel:${p.pickup.contact_phone}`} aria-label="Appeler l'expéditeur" className="w-12 h-12 rounded-full flex items-center justify-center bg-muted tap shrink-0">
                <Phone size={18} className="text-foreground" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* COLIS */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Box size={16} className="text-info-600" />
              <p className="font-bold text-sm text-foreground">
                Colis {parcelSizeLabel(p).toLowerCase()}
                {PARCEL_SIZE_HINTS[p.size] && <span className="font-semibold text-muted-foreground"> · {PARCEL_SIZE_HINTS[p.size]}</span>}
              </p>
            </div>
            {p.description && <p className="text-base text-foreground">{p.description}</p>}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                {cash ? <Banknote size={14} className="text-muted-foreground" /> : <Smartphone size={14} className="text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">
                  {cash ? (p.cash_collected || !beforePickup ? 'Espèces encaissées au ramassage' : 'Espèces au ramassage') : parcelPaymentLabel(p)}
                </span>
              </div>
              <span className="font-extrabold text-lg tabular text-foreground">{formatFCFA(p.price)}</span>
            </div>
          </CardContent>
        </Card>

        {p.note && (
          <Card className="border-warning-200 bg-warning-50">
            <CardContent className="p-3.5 flex gap-2">
              <FileText size={16} className="text-warning-600 shrink-0 mt-0.5" />
              <p className="text-sm text-warning-700">{p.note}</p>
            </CardContent>
          </Card>
        )}

        {issueButton}
      </div>

      {/* ACTION PRINCIPALE */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] bg-card border-t-2 border-border shadow-elevated">
        <Button onClick={onAction} disabled={updating} size="lg" className="w-full rounded-full h-16 text-lg font-extrabold">
          {updating
            ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            : <>{p.status === 'assigned' ? <Camera size={18} /> : p.status === 'picked_up' ? <Truck size={18} /> : isLocked ? <Lock size={18} /> : <KeyRound size={18} />} {actionLabel} {!isLocked && <ArrowRight size={18} />}</>}
        </Button>
      </div>

      {issueSheet}
    </div>
  );
}

function PhaseHeader({ badge, title, subtitle, onBack }: { badge: string; title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="px-5 pt-safe pt-5 pb-4 bg-foreground">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} aria-label="Retour" className="w-12 h-12 rounded-full flex items-center justify-center bg-white/15 tap">
          <X size={18} className="text-white" />
        </button>
        <Badge variant="default" dot pulse>{badge}</Badge>
        <div className="w-12" />
      </div>
      <h1 className="text-white font-extrabold text-xl">{title}</h1>
      <p className="text-white/80 text-sm mt-1 truncate">{subtitle}</p>
    </div>
  );
}

function StepTitle({ done, icon: Icon, n, title, hint }: { done: boolean; icon: React.ElementType; n?: number; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-success-500' : 'bg-primary/10'}`}>
        {done ? <CheckCircle2 size={20} className="text-white" /> : <Icon size={20} className="text-primary" />}
      </div>
      <div className="min-w-0">
        <p className="font-extrabold text-base text-foreground">{n ? `${n}. ` : ''}{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** Code bloqué après 5 essais : seul le support peut débloquer. */
function LockedCard() {
  return (
    <Card className="border-2 border-destructive/40 bg-danger-50">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-destructive shrink-0">
            <Lock size={20} className="text-white" />
          </div>
          <p className="font-extrabold text-lg text-danger-700">Code bloqué</p>
        </div>
        <p className="text-sm text-foreground">
          5 codes incorrects ont été saisis. <strong>Ne remettez pas le colis.</strong> Contactez le support MenuPro :
          l'équipe a été alertée et va débloquer la situation.
        </p>
        <Button className="w-full h-14 mt-4 rounded-full text-base font-extrabold bg-destructive text-white hover:bg-destructive/90" asChild>
          <a href={`tel:${SUPPORT_PHONE}`}><Phone size={18} /> Contactez le support</a>
        </Button>
      </CardContent>
    </Card>
  );
}

function ParcelIssueSheet({ reasons, beforePickup, onSubmit, onClose }: {
  reasons: string[];
  beforePickup: boolean;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reason = selected === '__other' ? other.trim() : selected;

  const send = async () => {
    if (!reason || reason.length < 3) { setError('Choisissez ou écrivez un motif (3 caractères minimum).'); return; }
    setSending(true);
    setError(null);
    try { await onSubmit(reason.slice(0, 500)); }
    catch (err: any) { setError(err?.message || 'Erreur.'); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-50" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full bg-card rounded-t-3xl pb-[env(safe-area-inset-bottom,0px)] max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-destructive" />
            <h2 className="font-extrabold text-lg text-foreground">Signaler un problème</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-12 h-12 rounded-full flex items-center justify-center bg-muted tap">
            <X size={20} className="text-foreground" />
          </button>
        </div>
        <p className="px-5 pb-3 text-sm text-muted-foreground">
          {beforePickup
            ? 'La course sera libérée et proposée à un autre livreur.'
            : 'La course sera marquée en échec. Gardez le colis : MenuPro vous contactera pour le retour à l\'expéditeur.'}
        </p>
        <div className="px-5 pb-5 space-y-2">
          {[...reasons, '__other'].map(r => (
            <button
              key={r}
              onClick={() => { setSelected(r); setError(null); }}
              disabled={sending}
              className={`w-full min-h-14 flex items-center gap-3 px-4 py-3 rounded-2xl border-2 tap disabled:opacity-50 ${
                selected === r ? 'border-destructive bg-destructive/5' : 'border-border'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === r ? 'border-destructive bg-destructive' : 'border-border'}`}>
                {selected === r && <Check size={13} className="text-white" />}
              </div>
              <p className="text-sm font-semibold text-foreground text-left">{r === '__other' ? 'Autre motif…' : r}</p>
            </button>
          ))}
          {selected === '__other' && (
            <textarea
              value={other}
              onChange={e => setOther(e.target.value)}
              maxLength={500}
              rows={3}
              autoFocus
              placeholder="Décrivez le problème"
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
          {error && <p role="alert" className="text-sm font-bold text-danger-700">{error}</p>}
          <Button
            onClick={send}
            disabled={sending || !selected}
            size="lg"
            className="w-full h-14 rounded-full text-base font-extrabold bg-destructive text-white hover:bg-destructive/90"
          >
            {sending
              ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : beforePickup ? 'Libérer la course' : 'Déclarer l\'échec'}
          </Button>
          <button
            onClick={() => window.open(`tel:${SUPPORT_PHONE}`)}
            className="w-full min-h-14 flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-primary/30 bg-primary/10 tap"
          >
            <MessageCircle size={16} className="text-primary shrink-0" />
            <p className="text-sm font-semibold text-primary text-left">Contacter l'assistance</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
