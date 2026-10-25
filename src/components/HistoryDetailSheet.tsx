import { MapPin, Store, Wallet, XCircle, CheckCircle2, Package } from 'lucide-react';
import type { Delivery } from '../lib/types';
import { formatFCFA, formatDate, DELIVERY_STATUS_LABELS } from '../lib/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetCloseButton } from './ui/sheet';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

const EARNING_STATUS: Record<string, string> = {
  pending: 'En attente',
  available: 'Disponible',
  paid: 'Versé',
};

const CANCELLED_BY: Record<string, string> = {
  driver: 'vous',
  restaurant: 'le restaurant',
  customer: 'le client',
  client: 'le client',
  admin: "l'équipe MENUPRO",
  system: 'le système',
};

/** Détail d'une course de l'historique (endpoint /driver/deliveries/history, champs « à plat »). */
export function HistoryDetailSheet({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  const d = delivery;
  const restaurant = d?.restaurant ?? d?.order?.restaurant;
  const reference = d?.order_ref ?? d?.order?.reference;
  const address = d?.customer?.address ?? d?.order?.delivery_address;
  const isDone = d?.status === 'delivered';
  const isCancelled = d?.status === 'cancelled';
  const net = d?.earning?.net_amount ?? d?.driver_earning_estimate ?? 0;
  const gross = d?.earning?.gross_amount ?? 0;

  return (
    <Sheet open={!!d} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent aria-describedby={undefined} className="max-h-[88vh] overflow-y-auto">
        {d && (
          <>
            <SheetHeader>
              <div className="min-w-0">
                <SheetTitle className="truncate">Course {reference ? `#${reference}` : `n° ${d.id}`}</SheetTitle>
                <Badge variant={isDone ? 'success' : isCancelled ? 'destructive' : 'muted'} className="mt-1">
                  {DELIVERY_STATUS_LABELS[d.status] ?? d.status}
                </Badge>
              </div>
              <SheetCloseButton />
            </SheetHeader>

            <div className="px-6 pb-4 space-y-4">
              {/* Gain */}
              {isDone && (
                <div className="rounded-2xl bg-primary/10 p-4 flex items-center gap-3">
                  <Wallet size={22} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground">Votre gain</p>
                    <p className="text-2xl font-extrabold tabular text-primary">{formatFCFA(net)}</p>
                    {gross > 0 && gross !== net && (
                      <p className="text-xs text-muted-foreground tabular">Frais de livraison {formatFCFA(gross)} · commission déduite</p>
                    )}
                  </div>
                  {d.earning?.status && (
                    <Badge variant="muted">{EARNING_STATUS[d.earning.status] ?? d.earning.status}</Badge>
                  )}
                </div>
              )}

              {isCancelled && (
                <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4 flex gap-3">
                  <XCircle size={20} className="text-danger-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-danger-700">
                      Annulée{d.cancelled_by ? ` par ${CANCELLED_BY[d.cancelled_by] ?? d.cancelled_by}` : ''}
                    </p>
                    {d.cancellation_reason && <p className="text-sm text-foreground mt-0.5">{d.cancellation_reason}</p>}
                  </div>
                </div>
              )}

              {/* Trajet */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {restaurant?.logo_url
                      ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
                      : <Store size={18} className="text-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">Restaurant</p>
                    <p className="text-sm font-bold text-foreground">{restaurant?.name || '—'}</p>
                    {restaurant?.address && <p className="text-sm text-muted-foreground">{restaurant.address}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-success-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">Livré à</p>
                    <p className="text-sm font-semibold text-foreground">{address || '—'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Chronologie */}
              <div className="space-y-2 text-sm">
                {d.created_at && (
                  <Row icon={Package} label="Commande créée" value={formatDate(d.created_at)} />
                )}
                {d.delivered_at && (
                  <Row icon={CheckCircle2} label="Livrée" value={formatDate(d.delivered_at)} />
                )}
                {d.cancelled_at && (
                  <Row icon={XCircle} label="Annulée" value={formatDate(d.cancelled_at)} />
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
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
