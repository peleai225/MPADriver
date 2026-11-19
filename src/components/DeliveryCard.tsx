import { MapPin, ChevronRight, ClipboardList, Package, CheckCircle2, Banknote } from 'lucide-react';
import type { Delivery } from '../lib/types';
import { formatFCFA } from '../lib/format';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface Props {
  delivery: Delivery;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
  /** Acceptation impossible (une course, repas ou colis, est déjà en cours). */
  blockedReason?: string | null;
}

/**
 * Course disponible. Depuis la mise à jour serveur, une course n'apparaît ici qu'une fois la commande
 * ACCEPTÉE par le restaurant : on le dit clairement au livreur.
 * (L'ancien compte à rebours de 3 min était purement local : il bloquait « Accepter » alors que la
 * course restait disponible côté serveur. Retiré.)
 */
export function DeliveryCard({ delivery, onAccept, onDecline, loading, blockedReason }: Props) {
  const order = delivery.order;
  if (!order) return null;

  const restaurant = order.restaurant;
  const isCash = order.payment_method === 'cash_on_delivery';

  return (
    <Card className="overflow-hidden animate-fade-up border-2">

      <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap">
        <Badge variant="default" dot pulse>NOUVELLE COURSE</Badge>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-success-700">
          <CheckCircle2 size={14} /> Acceptée par le restaurant
        </span>
      </div>

      <div className="px-4 pb-3 flex gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/8 overflow-hidden">
          {restaurant?.logo_url
            ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
            : <Package size={20} className="text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-base leading-tight truncate text-foreground">{restaurant?.name || 'Restaurant'}</p>
          {restaurant?.address && <p className="text-sm text-muted-foreground truncate">{restaurant.address}</p>}

          <div className="flex items-start gap-1.5 mt-1.5">
            <MapPin size={15} className="text-success-700 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-foreground line-clamp-2">
              {order.delivery_address?.split(',')[0] || 'Client'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <ClipboardList size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              #{order.reference} · {order.items?.length ?? 0} article{(order.items?.length ?? 0) > 1 ? 's' : ''} · {formatFCFA(order.total)}
            </span>
          </div>
          {isCash && (
            <div className="flex items-center gap-1.5 mt-1 text-warning-700">
              <Banknote size={14} />
              <span className="text-xs font-bold">Cash à collecter : {formatFCFA(order.total)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {delivery.driver_earning_estimate != null && (
            <div className="flex flex-col items-center px-2.5 py-2 rounded-2xl bg-primary/10">
              <p className="text-[11px] font-semibold text-muted-foreground">Gain</p>
              <p className="font-extrabold text-xl leading-tight text-primary tabular">
                {formatFCFA(delivery.driver_earning_estimate)}
              </p>
            </div>
          )}
          {delivery.distance_km != null && (
            <div className="flex flex-col items-center px-2.5 py-1.5 rounded-2xl bg-muted">
              <p className="font-extrabold text-sm leading-tight text-foreground tabular">
                {Number(delivery.distance_km).toFixed(1)} km
              </p>
              <p className="text-[11px] text-muted-foreground">du resto</p>
            </div>
          )}
        </div>
      </div>

      {blockedReason && (
        <p className="mx-4 mb-2 text-xs font-semibold text-warning-700">{blockedReason}</p>
      )}

      {/* Actions : cibles ≥ 48 px */}
      <div className="px-3 pb-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-full text-base"
          onClick={onDecline}
          disabled={loading}
        >
          Ignorer
        </Button>
        <Button
          className="flex-[2] h-12 rounded-full text-base font-extrabold"
          onClick={onAccept}
          disabled={loading || !!blockedReason}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>Accepter <ChevronRight size={18} /></>
          )}
        </Button>
      </div>
    </Card>
  );
}
