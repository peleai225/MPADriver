import { LogOut, Truck, Star, Award, MapPin, User, Pencil, Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import type { VerificationStatus } from '../lib/types';
import { formatFCFA } from '../lib/format';

const BG = '#F5F0EB';
const ORANGE = '#FF6100';

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

  const handleLogout = async () => { await logout(); go({ name: 'login' }); };

  if (!driver) return null;

  const statusInfo = STATUS_MAP[driver.verification_status];
  const vehicleInfo = VEHICLE_LABELS[driver.vehicle_type];
  const level = driver.total_deliveries > 100 ? 'Expert' : driver.total_deliveries > 50 ? 'Pro' : 'Junior';
  const levelColor = level === 'Expert' ? '#F59E0B' : level === 'Pro' ? ORANGE : '#A0A0A0';
  const ratingNum = driver.rating != null ? Number(driver.rating) : 5.0;

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-5 pb-2 flex items-center justify-between">
        <h1 className="font-extrabold text-3xl" style={{ color: '#1C1C1C' }}>Profil</h1>
        <div className="relative">
          <div className="w-11 h-11 rounded-full flex items-center justify-center tap" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Bell size={20} style={{ color: '#1C1C1C' }} />
          </div>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: ORANGE }} />
        </div>
      </div>

      <div className="px-5 mt-3 space-y-3">

        {/* ── CARTE PROFIL ── */}
        <div
          className="rounded-3xl p-5 overflow-hidden relative"
          style={{ background: `linear-gradient(135deg, #FF3301, ${ORANGE})`, boxShadow: '0 8px 32px rgba(255,97,0,.3)' }}
        >
          {/* Déco */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.1)' }} />

          {/* Bouton modifier */}
          <button
            onClick={() => push({ name: 'edit-profile' })}
            className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-white/80 text-xs font-semibold tap"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <Pencil size={11} /> Modifier
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)' }}
              >
                {driver.photo_url
                  ? <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-extrabold text-3xl">{driver.name[0].toUpperCase()}</span>}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2"
                style={{ background: driver.is_available ? '#22C55E' : '#A0A0A0', borderColor: ORANGE }}
              />
            </div>

            <div>
              <h2 className="text-white font-extrabold text-xl leading-tight">{driver.name}</h2>
              <p className="text-white/60 text-xs mt-0.5">{driver.phone}</p>
              {driver.email && <p className="text-white/50 text-xs">{driver.email}</p>}
              <div
                className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusInfo.color }} />
                {statusInfo.label}
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div
          className="rounded-3xl p-4"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}
        >
          <div className="grid grid-cols-3 gap-2">
            <StatCell icon={<Truck size={18} style={{ color: ORANGE }} />} bg="rgba(255,97,0,0.1)" value={String(driver.total_deliveries)} label="Livraisons" />
            <StatCell
              icon={<Star size={18} style={{ color: ORANGE }} />}
              bg="rgba(255,97,0,0.1)"
              value={ratingNum.toFixed(1)}
              label="Note"
              sub={
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={8} fill={i <= Math.round(ratingNum) ? ORANGE : 'none'} style={{ color: ORANGE }} />
                  ))}
                </div>
              }
            />
            <StatCell icon={<Award size={18} style={{ color: levelColor }} />} bg="rgba(255,97,0,0.1)" value={level} label="Niveau" />
          </div>
        </div>

        {/* ── SOLDE ── */}
        <div
          className="rounded-3xl p-4 flex items-center gap-3"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,97,0,0.1)' }}>
            <span className="text-2xl">💰</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>Total cumulé</p>
            <p className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>{formatFCFA(driver.total_earnings_xof)}</p>
          </div>
          <ChevronRight size={18} style={{ color: '#CBCBCB' }} />
        </div>

        {/* ── INFOS ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}
        >
          <div className="px-4 pt-4 pb-2">
            <p className="font-extrabold text-sm" style={{ color: '#1C1C1C' }}>Informations</p>
          </div>
          <InfoRow icon={<MapPin size={15} style={{ color: ORANGE }} />} label="Ville" value={`${driver.city}${driver.zone ? ` — ${driver.zone}` : ''}`} />
          <InfoRow icon={<span className="text-base">{vehicleInfo?.emoji ?? '🚗'}</span>} label="Véhicule" value={vehicleInfo?.label ?? driver.vehicle_type} />
          {driver.vehicle_plate && <InfoRow icon={<span className="text-sm">🪪</span>} label="Plaque" value={driver.vehicle_plate} />}
          <InfoRow icon={<User size={15} style={{ color: ORANGE }} />} label="Statut" value={driver.is_available ? '🟢 En ligne' : '⚪ Hors ligne'} last />
        </div>

        {/* ── MENU ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}
        >
          <MenuRow icon="⚙️" label="Paramètres" onPress={() => {}} />
          <MenuRow icon="❓" label="Aide & Support" onPress={() => {}} />
          <MenuRow icon="📄" label="Conditions d'utilisation" onPress={() => {}} last />
        </div>

        {/* ── DÉCONNEXION ── */}
        <button
          onClick={handleLogout}
          className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-white tap"
          style={{ background: '#1C1C1C', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function StatCell({ icon, bg, value, label, sub }: {
  icon: React.ReactNode; bg: string; value: string; label: string; sub?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: bg }}>
        {icon}
      </div>
      <p className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>{label}</p>
      {sub}
    </div>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!last ? 'border-b' : ''}`} style={{ borderColor: '#F1F1F1' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F5F0EB' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: '#A0A0A0' }}>{label}</p>
        <p className="text-sm font-semibold truncate" style={{ color: '#1C1C1C' }}>{value}</p>
      </div>
      <ChevronRight size={15} style={{ color: '#CBCBCB' }} />
    </div>
  );
}

function MenuRow({ icon, label, onPress, last }: { icon: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-3 px-4 py-3.5 tap ${!last ? 'border-b' : ''}`}
      style={{ borderColor: '#F1F1F1' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: '#F5F0EB' }}>
        {icon}
      </div>
      <p className="flex-1 text-sm font-semibold text-left" style={{ color: '#1C1C1C' }}>{label}</p>
      <ChevronRight size={15} style={{ color: '#CBCBCB' }} />
    </button>
  );
}
