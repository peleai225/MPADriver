import { MapPin, CircleDot, Wallet, Box, FileText, Phone, Navigation, CheckCircle2, XCircle, Banknote, Smartphone, ChevronRight } from 'lucide-react';
import type { Parcel } from '../lib/types';
import { formatFCFA, formatDate, resolvePhotoUrl } from '../lib/format';
import { openInMaps } from '../lib/geo';
import {
  PARCEL_STATUS_LABELS, parcelSizeLabel, PARCEL_SIZE_HINTS, isCashParcel, parcelPaymentLabel,
} from '../lib/parcel';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetCloseButton } from './ui/sheet';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

/**
 * Fiche d'un colis : course disponible (contacts masqués par le serveur avant acceptation)
 * ou course de l'historique.
 */
export function ParcelDetailSheet({ parcel, onClose, onAccept, accepting, blockedReason }: {
  parcel: Parcel | null;
  onClose: () => void;
  onAccept?: () => void;
  accepting?: boolean;
  blockedReason?: string | null;
}) {
  const p = parcel;
  const isDone = p?.status === 'delivered';
  const isFailed = p?.status === 'failed' || p?.status === 'cancelled';
  const cash = p ? isCashParcel(p) : false;

  return (
    <Sheet open={!!p} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto">
        {p && (
          <>
            <SheetHeader>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-info-500 text-white">
                    <Box size={12} strokeWidth={2.5} /> COLIS
                  </span>
                  <SheetTitle className="truncate tabular">{p.reference}</SheetTitle>
                </div>
                <Badge variant={isDone ? 'success' : isFailed ? 'destructive' : 'muted'} className="mt-1">
                  {PARCEL_STATUS_LABELS[p.status] ?? p.status_label ?? p.status}
                </Badge>
              </div>
              <SheetCloseButton />
            </SheetHeader>

            <div className="px-6 pb-5 space-y-4">
              {/* Gain */}
              <div className="rounded-2xl bg-primary/10 p-4 flex items-center gap-3">
                <Wallet size={22} className="text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">{isDone ? 'Votre gain' : 'Gain pour cette course'}</p>
                  <p className="text-2xl font-extrabold tabular text-primary">{formatFCFA(p.driver_earning_estimate)}</p>
                  <p className="text-xs text-muted-foreground tabular">
                    Prix de la course {formatFCFA(p.price)}{p.distance_km != null ? ` · ${Number(p.distance_km).toFixed(1)} km` : ''}
                  </p>
                </div>
              </div>

              {/* Paiement */}
              <div className={`rounded-2xl p-3.5 flex items-center gap-3 ${cash ? 'bg-warning-50 border border-warning-200' : 'bg-muted/60'}`}>
                {cash ? <Banknote size={20} className="text-warning-700 shrink-0" /> : <Smartphone size={20} className="text-muted-foreground shrink-0" />}
                <div>
                  <p className={`text-sm font-bold ${cash ? 'text-warning-700' : 'text-foreground'}`}>
                    {cash ? `Encaisser ${formatFCFA(p.cash_to_collect)} au ramassage` : parcelPaymentLabel(p)}
                  </p>
                  {cash && <p className="text-xs text-warning-700">L'expéditeur paie en espèces. Vous gardez votre part, la commission est à reverser à MenuPro.</p>}
                </div>
              </div>

              {/* Trajet */}
              <div className="space-y-3">
                <Stop
                  icon={<CircleDot size={18} className="text-primary" />}
                  tone="bg-primary/10"
                  label="Départ (ramassage)"
                  address={p.pickup.address}
                  contact={p.pickup.contact_name}
                  phone={p.pickup.contact_phone}
                  onRoute={() => openInMaps(p.pickup.latitude, p.pickup.longitude, p.pickup.address)}
                />
                <Stop
                  icon={<MapPin size={18} className="text-success-700" />}
                  tone="bg-success-50"
                  label="Arrivée (destinataire)"
                  address={p.dropoff.address}
                  contact={p.dropoff.recipient_name}
                  phone={p.dropoff.recipient_phone}
                  onRoute={() => openInMaps(p.dropoff.latitude, p.dropoff.longitude, p.dropoff.address)}
                />
              </div>

              <Separator />

              {/* Colis */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Colis</p>
                <p className="text-sm font-bold text-foreground">
                  {parcelSizeLabel(p)}{PARCEL_SIZE_HINTS[p.size] ? ` (${PARCEL_SIZE_HINTS[p.size]})` : ''}
                </p>
                {p.description && <p className="text-sm text-foreground">{p.description}</p>}
                {p.note && (
                  <div className="rounded-xl bg-warning-50 border border-warning-200 px-3 py-2 flex gap-2">
                    <FileText size={15} className="text-warning-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-warning-700">{p.note}</p>
                  </div>
                )}
              </div>

              {p.pickup_photo_url && (
                <img src={resolvePhotoUrl(p.pickup_photo_url) ?? ''} alt="Photo du colis au ramassage" className="w-full max-h-56 object-cover rounded-2xl border border-border" />
              )}

              {/* Chronologie */}
              {(p.created_at || p.picked_up_at || p.delivered_at) && (
                <div className="space-y-2 text-sm">
                  {p.created_at && <Row icon={Box} label="Demande créée" value={formatDate(p.created_at)} />}
                  {p.picked_up_at && <Row icon={CheckCircle2} label="Ramassé" value={formatDate(p.picked_up_at)} />}
                  {p.delivered_at && <Row icon={CheckCircle2} label="Livré" value={formatDate(p.delivered_at)} />}
                  {isFailed && <Row icon={XCircle} label={p.status === 'failed' ? 'Échec' : 'Annulé'} value="" />}
                </div>
              )}

              {onAccept && (
                <div className="pt-1">
                  {blockedReason && <p className="text-xs font-semibold text-warning-700 mb-2">{blockedReason}</p>}
                  <Button size="lg" className="w-full h-14 rounded-full text-base font-extrabold" onClick={onAccept} disabled={accepting || !!blockedReason}>
                    {accepting
                      ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                      : <>Accepter la course <ChevronRight size={18} /></>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">Les numéros de téléphone s'affichent après acceptation.</p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stop({ icon, tone, label, address, contact, phone, onRoute }: {
  icon: React.ReactNode; tone: string; label: string; address: string;
  contact?: string | null; phone?: string | null; onRoute: () => void;
}) {
  return (
    <div className="flex gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{address}</p>
        {contact && <p className="text-sm text-muted-foreground">{contact}</p>}
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" className="h-11 rounded-full" onClick={onRoute}>
            <Navigation size={15} /> Itinéraire
          </Button>
          {phone && (
            <Button variant="outline" size="sm" className="h-11 rounded-full" asChild>
              <a href={`tel:${phone}`}><Phone size={15} /> Appeler</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold text-foreground tabular">{value}</span>
    </div>
  );
}
