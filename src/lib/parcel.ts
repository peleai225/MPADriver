import { compressImage } from './imageUtils';
import type { Parcel } from './types';

/** Numéro de l'assistance (même numéro que le bouton « Aide » et la feuille « Signaler un problème »). */
export const SUPPORT_PHONE = '+2250501862640';

export const PARCEL_STATUS_LABELS: Record<string, string> = {
  pending_payment:  'Paiement en attente',
  searching_driver: 'Disponible',
  assigned:         'Aller au ramassage',
  picked_up:        'Colis ramassé',
  delivering:       'En livraison',
  delivered:        'Livré',
  cancelled:        'Annulé',
  failed:           'Échec',
};

export const PARCEL_SIZE_LABELS: Record<string, string> = {
  small:  'Petit',
  medium: 'Moyen',
  large:  'Grand',
};

export const PARCEL_SIZE_HINTS: Record<string, string> = {
  small:  'enveloppe, sachet',
  medium: 'carton à chaussures',
  large:  'carton, sac de voyage',
};

export function parcelSizeLabel(p: Pick<Parcel, 'size'>): string {
  return PARCEL_SIZE_LABELS[p.size] ?? p.size;
}

export function isCashParcel(p: Pick<Parcel, 'payment_method' | 'cash_to_collect'>): boolean {
  return p.payment_method === 'cash' && (p.cash_to_collect ?? 0) > 0;
}

export function parcelPaymentLabel(p: Pick<Parcel, 'payment_method'>): string {
  if (p.payment_method === 'cash') return 'Espèces au ramassage';
  if (p.payment_method === 'jeko') return 'Payé (Mobile Money)';
  if (p.payment_method === 'partner_billing') return 'Payé (partenaire)';
  return 'Payé';
}

/** Motifs proposés dans « Signaler un problème » (le livreur peut aussi écrire le sien). */
export const PARCEL_FAIL_REASONS_BEFORE_PICKUP = [
  'Expéditeur injoignable',
  'Adresse de ramassage introuvable',
  'Colis trop grand ou non conforme',
  "L'expéditeur n'a plus le colis",
  'Problème de moto / accident',
];

export const PARCEL_FAIL_REASONS_AFTER_PICKUP = [
  'Destinataire injoignable',
  'Destinataire absent',
  'Adresse de livraison introuvable',
  'Le destinataire refuse le colis',
  'Colis endommagé',
  'Accident / incident',
];

const MAX_UPLOAD_BYTES = 1024 * 1024; // ~1 Mo : passe en 3G sans attendre une minute
const SERVER_MAX_BYTES = 6 * 1024 * 1024; // limite du serveur

/**
 * Compresse la photo du colis pour l'envoi (≤ ~1 Mo). On réduit la qualité puis la taille jusqu'à passer
 * sous la limite. Lève une erreur lisible si l'image ne peut pas être lue et dépasse la limite serveur.
 */
export async function compressParcelPhoto(file: File): Promise<File> {
  const attempts: Array<[number, number]> = [[1600, 0.8], [1280, 0.72], [1024, 0.65], [800, 0.6]];
  let out = file;
  for (const [max, q] of attempts) {
    out = await compressImage(file, max, max, q);
    if (out.size <= MAX_UPLOAD_BYTES && out.type === 'image/jpeg') break;
  }
  if (!/^image\/(jpeg|png|webp)$/.test(out.type) || out.size > SERVER_MAX_BYTES) {
    throw new Error('Photo illisible ou trop lourde. Reprenez la photo avec l\'appareil photo.');
  }
  const name = /\.jpe?g$/i.test(out.name) ? out.name : 'colis.jpg';
  return out.name === name ? out : new File([out], name, { type: out.type, lastModified: Date.now() });
}

/** Code d'erreur métier renvoyé par l'API colis ({ error_code }). */
export function parcelErrorCode(err: unknown): string | null {
  const e = err as { data?: { error_code?: string } } | null;
  return e?.data?.error_code ?? null;
}
