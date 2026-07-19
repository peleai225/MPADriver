import { MapPin, Clock, Banknote, Store, ArrowRight } from 'lucide-react';
import type { Delivery } from '../lib/types';
import { formatFCFA } from '../lib/format';
import { Button } from './ui/button';

interface Props {
  delivery: Delivery;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function DeliveryCard({ delivery, onAccept, onDecline, loading }: Props) {
  const { order } = delivery;

  return (
    <div className="bg-white rounded-3xl shadow-card border border-ink-50 overflow-hidden animate-fade-up">
      {/* Header restaurant */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shrink-0 shadow-sm overflow-hidden">
          {order.restaurant.logo_url
            ? <img src={order.restaurant.logo_url} alt={order.restaurant.name} className="w-full h-full object-cover" />
            : <span className="text-white font-extrabold text-base">{order.restaurant.name[0].toUpperCase()}</span>
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink-900 truncate">{order.restaurant.name}</p>
          <p className="text-xs text-ink-400 truncate">{order.restaurant.address}</p>
        </div>
        <Store size={15} className="text-ink-300 shrink-0" />
      </div>

      {/* Destination */}
      <div className="mx-4 mb-3">
        <div className="bg-ink-50 rounded-2xl px-3 py-2.5 flex items-center gap-2">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="w-px h-3 bg-ink-300" />
            <span className="w-2 h-2 rounded-full bg-success-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-ink-400 mb-0.5">Livraison</p>
            <p className="text-sm text-ink-700 truncate">{order.delivery_address}</p>
          </div>
          <ArrowRight size={14} className="text-ink-300 shrink-0" />
        </div>
      </div>

      {/* Méta */}
      <div className="px-4 pb-3 flex items-center gap-3">
        {delivery.distance_km != null && (
          <div className="flex items-center gap-1 bg-ink-50 rounded-xl px-2.5 py-1.5">
            <MapPin size={12} className="text-ink-400" />
            <span className="text-xs text-ink-600 font-semibold">{Number(delivery.distance_km).toFixed(1)} km</span>
          </div>
        )}
        {delivery.estimated_minutes != null && (
          <div className="flex items-center gap-1 bg-ink-50 rounded-xl px-2.5 py-1.5">
            <Clock size={12} className="text-ink-400" />
            <span className="text-xs text-ink-600 font-semibold">~{delivery.estimated_minutes} min</span>
          </div>
        )}
        {delivery.driver_earning_estimate != null && (
          <div className="ml-auto flex items-center gap-1 bg-success-50 rounded-xl px-2.5 py-1.5">
            <Banknote size={12} className="text-success-600" />
            <span className="text-xs text-success-700 font-bold">{formatFCFA(delivery.driver_earning_estimate)}</span>
          </div>
        )}
      </div>

      {/* Nb articles */}
      {order.items.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-ink-400">
            {order.items.length} article{order.items.length > 1 ? 's' : ''} · {order.items.slice(0, 2).map(i => i.name).join(', ')}{order.items.length > 2 ? '…' : ''}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2 border-t border-ink-50 pt-3">
        <Button
          onClick={onDecline}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Refuser
        </Button>
        <Button
          onClick={onAccept}
          disabled={loading}
          size="sm"
          className="flex-[2] gap-1.5"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              Accepter
              <span className="w-4 h-4 rounded-full bg-white/20 grid place-items-center text-[10px]">✓</span>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
