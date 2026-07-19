import { LogOut, Truck, Star, Award, MapPin, User, Pencil } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import type { VerificationStatus } from '../lib/types';
import { cn } from '../lib/utils';

const STATUS_MAP: Record<VerificationStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  approved:  { label: 'Approuvé',  variant: 'success' },
  pending:   { label: 'En attente', variant: 'warning' },
  rejected:  { label: 'Refusé',    variant: 'danger' },
  suspended: { label: 'Suspendu',  variant: 'muted' },
};

const VEHICLE_LABELS: Record<string, { label: string; emoji: string }> = {
  moto:    { label: 'Moto',    emoji: '🏍️' },
  velo:    { label: 'Vélo',    emoji: '🚲' },
  voiture: { label: 'Voiture', emoji: '🚗' },
};

export function ProfilePage() {
  const { driver, logout } = useAuth();
  const { go, push } = useNav();

  const handleLogout = async () => {
    await logout();
    go({ name: 'login' });
  };

  if (!driver) return null;

  const statusInfo = STATUS_MAP[driver.verification_status];
  const vehicleInfo = VEHICLE_LABELS[driver.vehicle_type];
  const level = driver.total_deliveries > 100 ? 'Expert' : driver.total_deliveries > 50 ? 'Pro' : 'Junior';
  const levelColor = level === 'Expert' ? 'text-warning-500' : level === 'Pro' ? 'text-brand-500' : 'text-ink-400';

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-ink-950 px-4 pt-safe pb-10">
        <div className="flex items-center justify-between mb-3 mt-1">
          <span />
          <button onClick={() => push({ name: 'edit-profile' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold tap hover:bg-white/20 transition-colors">
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="relative shrink-0">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-pop overflow-hidden">
              {driver.photo_url
                ? <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-2xl">{driver.name[0].toUpperCase()}</span>
              }
            </div>
            <div className={cn(
              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-ink-950',
              driver.is_available ? 'bg-success-500' : 'bg-ink-500',
            )} />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl">{driver.name}</h1>
            <p className="text-ink-400 text-xs mt-0.5">{driver.phone}</p>
            {driver.email && <p className="text-ink-500 text-xs">{driver.email}</p>}
            <div className="mt-2">
              <Badge variant={statusInfo.variant} dot>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-3">
        {/* Stats */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 divide-x divide-ink-100">
              <ProfileStat bg="bg-brand-50" value={String(driver.total_deliveries)} label="Livraisons">
                <Truck size={16} className="text-brand-600" />
              </ProfileStat>
              <ProfileStat bg="bg-warning-50" value={driver.rating != null ? Number(driver.rating).toFixed(1) : '5.0'} label="Note">
                <Star size={16} className="text-warning-500" />
              </ProfileStat>
              <ProfileStat bg="bg-ink-50" value={level} label="Niveau">
                <Award size={16} className={levelColor} />
              </ProfileStat>
            </div>
          </CardContent>
        </Card>

        {/* Infos */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="font-bold text-ink-900 text-sm">Informations</p>
            <Separator />
            <InfoRow
              icon={<MapPin size={15} className="text-ink-500" />}
              label="Ville"
              value={`${driver.city}${driver.zone ? ` — ${driver.zone}` : ''}`}
            />
            <InfoRow
              icon={<span className="text-sm">{vehicleInfo?.emoji ?? '🚗'}</span>}
              label="Véhicule"
              value={vehicleInfo?.label ?? driver.vehicle_type}
            />
            {driver.vehicle_plate && (
              <InfoRow
                icon={<span className="text-xs font-bold text-ink-500">🪪</span>}
                label="Plaque"
                value={driver.vehicle_plate}
              />
            )}
            <InfoRow
              icon={<User size={15} className="text-ink-500" />}
              label="Statut"
              value={driver.is_available ? 'En ligne' : 'Hors ligne'}
            />
          </CardContent>
        </Card>

        {/* Déconnexion */}
        <Button
          onClick={handleLogout}
          variant="danger"
          className="w-full h-13 gap-2"
        >
          <LogOut size={18} />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}

function ProfileStat({ bg, value, label, children }: { bg: string; value: string; label: string; children: React.ReactNode }) {
  return (
    <div className="text-center px-2">
      <div className={cn('w-10 h-10 rounded-2xl grid place-items-center mx-auto mb-2', bg)}>
        {children}
      </div>
      <p className="font-extrabold text-ink-900 text-base">{value}</p>
      <p className="text-ink-400 text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-ink-50 grid place-items-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-sm font-semibold text-ink-900 truncate">{value}</p>
      </div>
    </div>
  );
}
