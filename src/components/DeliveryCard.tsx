import { MapPin, Clock, ArrowRight } from 'lucide-react';
import type { Delivery } from '../lib/types';
import { formatFCFA } from '../lib/format';

interface Props {
  delivery: Delivery;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function DeliveryCard({ delivery, onAccept, onDecline, loading }: Props) {
  const { order } = delivery;

  return (
    <div className="bg-white rounded-3xl shadow-soft border border-ink-100 overflow-hidden animate-fade-up">
      {/* Top row: restaurant name + distance badge */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden gradient-flame"
          >
            {order.restaurant.logo_url
              ? <img src={order.restaurant.logo_url} alt={order.restaurant.name} className="w-full h-full object-cover" />
              : <span className="text-white font-extrabold text-base">{order.restaurant.name[0].toUpperCase()}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="font-bold text-ink-900 truncate">{order.restaurant.name}</p>
            <p className="text-xs text-ink-400 truncate">{order.restaurant.address}</p>
          </div>
        </div>
        {delivery.distance_km != null && (
          <div
            className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-white text-xs font-bold gradient-flame"
          >
            <MapPin size={10} />
            {Number(delivery.distance_km).toFixed(1)} km
          </div>
        )}
      </div>

      {/* Route: Restaurant → Client */}
      <div className="mx-4 mb-3">
        <div className="bg-ink-50 rounded-2xl px-3 py-3 flex items-center gap-2">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ background: '#FF6100' }} />
            <span className="w-px h-4 bg-ink-300" />
            <span className="w-2 h-2 rounded-full bg-success-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-400 truncate">{order.restaurant.name}</p>
            <p className="text-xs font-medium text-ink-700 truncate mt-1">{order.delivery_address}</p>
          </div>
          <ArrowRight size={14} className="text-ink-300 shrink-0" />
        </div>
      </div>

      {/* Meta: time + amount */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {delivery.estimated_minutes != null && (
          <div className="flex items-center gap-1 bg-ink-50 rounded-xl px-2.5 py-1.5">
            <Clock size={11} className="text-ink-400" />
            <span className="text-xs text-ink-600 font-semibold">~{delivery.estimated_minutes} min</span>
          </div>
        )}
        {order.items.length > 0 && (
          <p className="text-xs text-ink-400 flex-1 truncate">
            {order.items.length} art. · {order.items.slice(0, 2).map(i => i.name).join(', ')}{order.items.length > 2 ? '…' : ''}
          </p>
        )}
        {delivery.driver_earning_estimate != null && (
          <p className="font-extrabold text-lg ml-auto" style={{ color: '#FF6100' }}>
            {formatFCFA(delivery.driver_earning_estimate)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2 border-t border-ink-100 pt-3">
        <button
          onClick={onDecline}
          disabled={loading}
          className="flex-1 h-11 rounded-2xl border border-ink-200 text-ink-600 text-sm font-semibold tap disabled:opacity-50"
        >
          Refuser
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex-[2] h-11 rounded-2xl text-white text-sm font-bold tap disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#0D0D0D' }}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ...
            </>
          ) : (
            <>
              Accepter
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
