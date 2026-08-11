import { useEffect, useState } from 'react';
import { MapPin, Clock, ChevronRight, ClipboardList } from 'lucide-react';
import type { Delivery } from '../lib/types';
import { formatFCFA } from '../lib/format';

interface Props {
  delivery: Delivery;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

const ORANGE = '#FF6100';
const EXPIRE_SECONDS = 180; // 3 minutes par défaut

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function DeliveryCard({ delivery, onAccept, loading }: Props) {
  const { order } = delivery;
  const timer = useCountdown(EXPIRE_SECONDS);
  const expired = timer === '00:00';

  return (
    <div
      className="rounded-3xl overflow-hidden animate-fade-up"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #F1F1F1' }}
    >
      {/* ── TAG NOUVELLE COURSE ── */}
      <div className="px-4 pt-3 pb-2">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide"
          style={{ background: 'rgba(255,97,0,0.1)', color: ORANGE }}
        >
          ⚡ NOUVELLE COURSE
        </span>
      </div>

      {/* ── BODY ── */}
      <div className="px-4 pb-3 flex gap-3">
        {/* Icône restaurant */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,97,0,0.08)' }}
        >
          {order.restaurant.logo_url
            ? <img src={order.restaurant.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            : <span className="text-3xl">🏪</span>}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          {/* Route */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-extrabold text-base leading-tight truncate" style={{ color: '#1C1C1C' }}>
              {order.restaurant.address || order.restaurant.name}
            </p>
            <ChevronRight size={14} style={{ color: ORANGE }} className="shrink-0" />
            <p className="font-extrabold text-base leading-tight truncate" style={{ color: '#1C1C1C' }}>
              {order.delivery_address.split(',')[0]}
            </p>
          </div>
          <p className="text-xs mb-1" style={{ color: '#A0A0A0' }}>Restaurant / vendeur</p>
          <p className="text-sm font-bold" style={{ color: '#1C1C1C' }}>{order.restaurant.name}</p>

          {/* Commande */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <ClipboardList size={13} style={{ color: '#A0A0A0' }} />
            <span className="text-xs font-semibold" style={{ color: '#1C1C1C' }}>
              Commande <span style={{ color: ORANGE }}>#{order.reference}</span>
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
            {order.items.length} article{order.items.length > 1 ? 's' : ''} · {formatFCFA(order.total)}
          </p>
        </div>

        {/* Distance + Gain — colonne droite */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {delivery.distance_km != null && (
            <div
              className="flex flex-col items-center px-2.5 py-2 rounded-2xl"
              style={{ background: '#F5F0EB' }}
            >
              <MapPin size={14} style={{ color: ORANGE }} />
              <p className="font-extrabold text-sm leading-tight mt-0.5" style={{ color: '#1C1C1C' }}>
                {Number(delivery.distance_km).toFixed(1)} km
              </p>
              <p className="text-[10px]" style={{ color: '#A0A0A0' }}>Distance</p>
            </div>
          )}
          {delivery.driver_earning_estimate != null && (
            <div
              className="flex flex-col items-center px-2.5 py-2 rounded-2xl"
              style={{ background: '#F5F0EB' }}
            >
              <p className="text-[10px]" style={{ color: '#A0A0A0' }}>Gain livraison</p>
              <p className="font-extrabold text-xl leading-tight" style={{ color: ORANGE }}>
                {formatFCFA(delivery.driver_earning_estimate)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER : timer + bouton ── */}
      <div
        className="flex items-center gap-2 px-3 pb-3"
      >
        {/* Timer */}
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-full flex-1"
          style={{ background: '#F5F0EB' }}
        >
          <Clock size={13} style={{ color: '#A0A0A0' }} />
          <span className="text-xs font-medium" style={{ color: '#717171' }}>Expire dans </span>
          <span
            className="text-xs font-extrabold"
            style={{ color: expired ? '#EF4444' : ORANGE }}
          >
            {timer}
          </span>
        </div>

        {/* Bouton accepter */}
        <button
          onClick={onAccept}
          disabled={loading || expired}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full tap disabled:opacity-50 flex-[1.8]"
          style={{
            background: expired ? '#E4E4E4' : `linear-gradient(135deg, ${ORANGE}, #FF3301)`,
            boxShadow: expired ? 'none' : '0 4px 16px rgba(255,97,0,.35)',
          }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-white text-sm font-bold">
                {expired ? 'Expirée' : 'Accepter la course'}
              </span>
              {!expired && <ChevronRight size={15} className="text-white" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
