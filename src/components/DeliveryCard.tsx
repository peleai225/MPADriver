import { useEffect, useState } from 'react';
import { MapPin, Clock, ChevronRight, ClipboardList } from 'lucide-react';
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
}

const EXPIRE_SECONDS = 180;

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  return { label: `${m}:${s}`, pct: remaining / seconds, expired: remaining === 0 };
}

export function DeliveryCard({ delivery, onAccept, onDecline, loading }: Props) {
  const { order } = delivery;
  const { label: timer, expired } = useCountdown(EXPIRE_SECONDS);

  return (
    <Card className="overflow-hidden animate-fade-up">

      {/* ── TAG NOUVELLE COURSE ── */}
      <div className="px-4 pt-3 pb-2">
        <Badge variant="default" dot pulse>NOUVELLE COURSE</Badge>
      </div>

      {/* ── BODY ── */}
      <div className="px-4 pb-3 flex gap-3">
        {/* Logo restaurant */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/8 overflow-hidden">
          {order.restaurant.logo_url
            ? <img src={order.restaurant.logo_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-3xl">🏪</span>}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-extrabold text-base leading-tight truncate text-foreground">
              {order.restaurant.address || order.restaurant.name}
            </p>
            <ChevronRight size={14} className="text-primary shrink-0" />
            <p className="font-extrabold text-base leading-tight truncate text-foreground">
              {order.delivery_address.split(',')[0]}
            </p>
          </div>
          <p className="text-xs mb-1 text-muted-foreground">Restaurant / vendeur</p>
          <p className="text-sm font-bold text-foreground">{order.restaurant.name}</p>

          <div className="flex items-center gap-1.5 mt-1.5">
            <ClipboardList size={13} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Commande <span className="text-primary">#{order.reference}</span>
            </span>
          </div>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {order.items.length} article{order.items.length > 1 ? 's' : ''} · {formatFCFA(order.total)}
          </p>
        </div>

        {/* Distance + Gain */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {delivery.distance_km != null && (
            <div className="flex flex-col items-center px-2.5 py-2 rounded-2xl bg-muted">
              <MapPin size={14} className="text-primary" />
              <p className="font-extrabold text-sm leading-tight mt-0.5 text-foreground">
                {Number(delivery.distance_km).toFixed(1)} km
              </p>
              <p className="text-[10px] text-muted-foreground">Distance</p>
            </div>
          )}
          {delivery.driver_earning_estimate != null && (
            <div className="flex flex-col items-center px-2.5 py-2 rounded-2xl bg-muted">
              <p className="text-[10px] text-muted-foreground">Gain</p>
              <p className="font-extrabold text-xl leading-tight text-primary">
                {formatFCFA(delivery.driver_earning_estimate)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER : timer + boutons ── */}
      <div className="px-3 pb-3 space-y-2">
        {/* Timer */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full w-full justify-center bg-muted">
          <Clock size={13} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Expire dans </span>
          <span className={`text-xs font-extrabold ${expired ? 'text-destructive' : 'text-primary'}`}>
            {timer}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="pill"
            className="flex-1"
            onClick={onDecline}
            disabled={loading || expired}
          >
            Refuser
          </Button>
          <Button
            size="pill"
            className="flex-[2]"
            onClick={onAccept}
            disabled={loading || expired}
            style={expired ? { background: undefined } : undefined}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            ) : expired ? (
              'Expirée'
            ) : (
              <>Accepter <ChevronRight size={15} /></>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
