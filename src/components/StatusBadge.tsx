import type { VerificationStatus } from '../lib/types';
import { Badge } from './ui/badge';

const MAP: Record<VerificationStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  approved:  { label: 'Approuvé',   variant: 'success' },
  pending:   { label: 'En attente', variant: 'warning' },
  rejected:  { label: 'Refusé',     variant: 'danger'  },
  suspended: { label: 'Suspendu',   variant: 'muted'   },
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const { label, variant } = MAP[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}
