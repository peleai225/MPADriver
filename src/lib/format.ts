import { API_BASE } from './api';

const API_ORIGIN = new URL(API_BASE).origin;

export function resolvePhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function formatFCFA(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' F';
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending:               'En attente',
  assigned:              'Assignée',
  heading_to_restaurant: 'En route vers le restaurant',
  picked_up:             'Commande récupérée',
  delivering:            'En livraison',
  delivered:             'Livrée',
  cancelled:             'Annulée',
};
