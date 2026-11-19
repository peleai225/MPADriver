import { MapPin, ChevronRight, Box, Banknote, Smartphone, Navigation, CircleDot } from 'lucide-react';
import type { Parcel } from '../lib/types';
import { formatFCFA } from '../lib/format';
import { parcelSizeLabel, isCashParcel, parcelPaymentLabel, PARCEL_SIZE_HINTS } from '../lib/parcel';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Props {
  parcel: Parcel;
  onAccept: () => void;
  onOpen?: () => void;
  loading?: boolean;
  /** Raison pour laquelle l'acceptation est impossible (course déjà en cours). */
  blockedReason?: string | null;
}

/**
 * Course colis disponible, affichée avec les courses repas. Badge « Colis » bleu pour la distinguer
 * au premier coup d'œil des repas (orange). Pas de bouton « Ignorer » : l'API colis n'a pas de refus,
 * la course reste simplement proposée aux autres livreurs.
 */
export function ParcelCard({ parcel, onAccept, onOpen, loading, blockedReason }: Props) {
  const cash = isCashParcel(parcel);

  return (
    <Card className="overflow-hidden animate-fade-up border-2 border-info-500/30">
      <button type="button" onClick={onOpen} className="w-full text-left tap block" aria-label={`Détails du colis ${parcel.reference}`}>
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold bg-info-500 text-white">
            <Box size={13} strokeWidth={2.5} /> COLIS
          </span>
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-info-50 text-info-700">
            {parcelSizeLabel(parcel)}{PARCEL_SIZE_HINTS[parcel.size] ? ` · ${PARCEL_SIZE_HINTS[parcel.size]}` : ''}
          </span>
        </div>

        <div className="px-4 pb-3 flex gap-3">
          <div className="flex-1 min-w-0">
            {/* Trajet départ → arrivée */}
            <div className="flex items-start gap-2">
              <CircleDot size={15} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Départ</p>
                <p className="text-sm font-bold text-foreground line-clamp-2">{parcel.pickup.address}</p>
              </div>
            </div>
            <div className="ml-[7px] h-3 border-l-2 border-dashed border-border" />
            <div className="flex items-start gap-2">
              <MapPin size={15} className="text-success-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Arrivée</p>
                <p className="text-sm font-bold text-foreground line-clamp-2">{parcel.dropoff.address}</p>
              </div>
            </div>

            {parcel.description && (
              <p className="text-xs text-muted-foreground mt-2 truncate">« {parcel.description} »</p>
            )}

            <div className={`flex items-center gap-1.5 mt-1.5 ${cash ? 'text-warning-700' : 'text-muted-foreground'}`}>
              {cash ? <Banknote size={14} /> : <Smartphone size={14} />}
              <span className="text-xs font-bold">
                {cash ? `Encaisser ${formatFCFA(parcel.cash_to_collect)} au départ` : parcelPaymentLabel(parcel)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {parcel.driver_earning_estimate != null && (
              <div className="flex flex-col items-center px-2.5 py-2 rounded-2xl bg-primary/10">
                <p className="text-[11px] font-semibold text-muted-foreground">Gain</p>
                <p className="font-extrabold text-xl leading-tight text-primary tabular">
                  {formatFCFA(parcel.driver_earning_estimate)}
                </p>
              </div>
            )}
            {parcel.distance_km != null && (
              <div className="flex flex-col items-center px-2.5 py-1.5 rounded-2xl bg-muted">
                <p className="font-extrabold text-sm leading-tight text-foreground tabular">
                  {Number(parcel.distance_km).toFixed(1)} km
                </p>
                <p className="text-[11px] text-muted-foreground">trajet</p>
              </div>
            )}
            {parcel.distance_to_pickup_km != null && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground tabular">
                <Navigation size={11} /> {Number(parcel.distance_to_pickup_km).toFixed(1)} km de vous
              </div>
            )}
          </div>
        </div>
      </button>

      {blockedReason && (
        <p className="mx-4 mb-2 text-xs font-semibold text-warning-700">{blockedReason}</p>
      )}

      {/* Actions : cibles ≥ 48 px */}
      <div className="px-3 pb-3 flex gap-2">
        {onOpen && (
          <Button variant="outline" className="flex-1 h-12 rounded-full text-base" onClick={onOpen} disabled={loading}>
            Détails
          </Button>
        )}
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
