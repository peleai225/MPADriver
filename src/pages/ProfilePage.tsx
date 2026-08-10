import { LogOut, Truck, Star, Award, MapPin, User, Pencil, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import type { VerificationStatus } from '../lib/types';
import { cn } from '../lib/utils';

const STATUS_MAP: Record<VerificationStatus, { label: string; color: string; bg: string }> = {
  approved:  { label: 'Approuvé',   color: '#22C55E', bg: '#F0FDF4' },
  pending:   { label: 'En attente', color: '#F59E0B', bg: '#FFFBEB' },
  rejected:  { label: 'Refusé',     color: '#EF4444', bg: '#FEF2F2' },
  suspended: { label: 'Suspendu',   color: '#888888', bg: '#F8F8F8' },
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

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F6F5' }}>
      {/* Header charcoal */}
      <div className="px-4 pt-safe pb-10" style={{ background: '#1C1C1C' }}>
        <div className="flex items-center justify-end mb-4 mt-1">
          <button
            onClick={() => push({ name: 'edit-profile' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/70 text-xs font-semibold tap"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <Pencil size={12} /> Modifier
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Avatar avec ring orange */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF3301, #FF6100)', border: '3px solid #FF6100' }}
            >
              {driver.photo_url
                ? <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-2xl">{driver.name[0].toUpperCase()}</span>
              }
            </div>
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2',
                driver.is_available ? 'bg-success-500' : 'bg-ink-500',
              )}
              style={{ borderColor: '#1C1C1C' }}
            />
          </div>

          <div>
            <h1 className="text-white font-extrabold text-xl leading-tight">{driver.name}</h1>
            <p className="text-white/40 text-xs mt-0.5">{driver.phone}</p>
            {driver.email && <p className="text-white/30 text-xs">{driver.email}</p>}
            <div
              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusInfo.color }} />
              {statusInfo.label}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-3">
        {/* Stats card */}
        <div className="bg-white rounded-3xl p-4 shadow-soft border border-ink-100">
          <div className="grid grid-cols-3 divide-x divide-ink-100">
            <ProfileStat
              icon={<Truck size={16} style={{ color: '#FF6100' }} />}
              iconBg="rgba(255,97,0,0.1)"
              value={String(driver.total_deliveries)}
              label="Livraisons"
            />
            <ProfileStat
              icon={<Star size={16} className="text-warning-500" />}
              iconBg="#FFFBEB"
              value={driver.rating != null ? Number(driver.rating).toFixed(1) : '5.0'}
              label="Note"
            />
            <ProfileStat
              icon={<Award size={16} className="text-ink-400" />}
              iconBg="#F8F8F8"
              value={level}
              label="Niveau"
            />
          </div>
        </div>

        {/* Infos card */}
        <div className="bg-white rounded-3xl p-4 shadow-soft border border-ink-100 space-y-3">
          <p className="font-bold text-ink-900 text-sm">Informations</p>
          <div className="w-full h-px bg-ink-100" />
          <InfoRow
            icon={<MapPin size={15} style={{ color: '#FF6100' }} />}
            iconBg="rgba(255,97,0,0.1)"
            label="Ville"
            value={`${driver.city}${driver.zone ? ` — ${driver.zone}` : ''}`}
          />
          <InfoRow
            icon={<span className="text-sm">{vehicleInfo?.emoji ?? '🚗'}</span>}
            iconBg="#F8F8F8"
            label="Véhicule"
            value={vehicleInfo?.label ?? driver.vehicle_type}
          />
          {driver.vehicle_plate && (
            <InfoRow
              icon={<span className="text-xs font-bold text-ink-500">🪪</span>}
              iconBg="#F8F8F8"
              label="Plaque"
              value={driver.vehicle_plate}
            />
          )}
          <InfoRow
            icon={<User size={15} style={{ color: '#FF6100' }} />}
            iconBg="rgba(255,97,0,0.1)"
            label="Statut"
            value={driver.is_available ? 'En ligne' : 'Hors ligne'}
          />
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full h-13 rounded-2xl text-white font-bold text-base tap flex items-center justify-center gap-2"
          style={{ background: '#0D0D0D' }}
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function ProfileStat({ icon, iconBg, value, label }: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center px-2">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <p className="font-extrabold text-ink-900 text-base">{value}</p>
      <p className="text-ink-400 text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({ icon, iconBg, label, value }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-sm font-semibold text-ink-900 truncate">{value}</p>
      </div>
      <ChevronRight size={16} className="text-ink-200 shrink-0" />
    </div>
  );
}
