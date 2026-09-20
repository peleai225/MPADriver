import {
  LogOut, Truck, Star, Award, MapPin, Pencil, ChevronRight,
  Wallet, Settings, HelpCircle, FileText, Bike, Car, WifiOff, Wifi,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import type { VerificationStatus } from '../lib/types';
import { formatFCFA, resolvePhotoUrl } from '../lib/format';

const STATUS_VARIANT: Record<VerificationStatus, 'success' | 'warning' | 'destructive' | 'muted'> = {
  approved:  'success',
  pending:   'warning',
  rejected:  'destructive',
  suspended: 'muted',
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  approved:  'Approuve',
  pending:   'En attente',
  rejected:  'Refuse',
  suspended: 'Suspendu',
};

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  moto: Bike,
  velo: Bike,
  voiture: Car,
};

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto',
  velo: 'Velo',
  voiture: 'Voiture',
};

export function ProfilePage() {
  const { driver, logout } = useAuth();
  const { go, push } = useNav();

  const handleLogout = async () => { await logout(); go({ name: 'login' }); };

  if (!driver) return null;

  const level = driver.total_deliveries > 100 ? 'Expert' : driver.total_deliveries > 50 ? 'Pro' : 'Junior';
  const levelVariant = level === 'Expert' ? 'warning' : level === 'Pro' ? 'default' : 'muted';
  const ratingNum = driver.rating != null ? Number(driver.rating) : 5.0;
  const photoUrl = resolvePhotoUrl(driver.photo_url);
  const VehicleIcon = VEHICLE_ICONS[driver.vehicle_type] ?? Car;

  return (
    <div className="min-h-screen pb-28 bg-background">

      <PageHeader title="Profil" />

      <div className="px-5 mt-3 space-y-3">

        {/* PROFILE CARD */}
        <Card className="overflow-hidden border-0 gradient-hero shadow-pop">
          <CardContent className="p-5 relative">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none bg-white/10" />

            <Button
              variant="secondary"
              size="sm"
              onClick={() => push({ name: 'edit-profile' })}
              className="absolute top-4 right-4 bg-white/20 text-white hover:bg-white/30 rounded-full text-xs border-0"
            >
              <Pencil size={11} /> Modifier
            </Button>

            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20 rounded-3xl border-2 border-white/40">
                  {photoUrl
                    ? <AvatarImage src={`${photoUrl}?v=${driver.id}`} alt={driver.name} />
                    : null}
                  <AvatarFallback className="rounded-3xl bg-white/25 text-white font-extrabold text-3xl">
                    {driver.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-primary ${driver.is_available ? 'bg-success-500' : 'bg-muted-foreground'}`}
                />
              </div>

              <div>
                <h2 className="text-white font-extrabold text-xl leading-tight">{driver.name}</h2>
                <p className="text-white/60 text-xs mt-0.5">{driver.phone}</p>
                {driver.email && <p className="text-white/50 text-xs">{driver.email}</p>}
                <div className="mt-2">
                  <Badge variant={STATUS_VARIANT[driver.verification_status]} dot className="bg-white/20 text-white border-0">
                    {STATUS_LABELS[driver.verification_status]}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STATS */}
        <Card className="shadow-xs">
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-2">
              <StatCell icon={<Truck size={18} className="text-primary" />} value={String(driver.total_deliveries)} label="Livraisons" />
              <StatCell
                icon={<Star size={18} className="text-primary" />}
                value={ratingNum.toFixed(1)}
                label="Note"
                sub={
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={8} fill={i <= Math.round(ratingNum) ? 'currentColor' : 'none'} className="text-primary" />
                    ))}
                  </div>
                }
              />
              <StatCell icon={<Award size={18} className="text-primary" />} value={level} label="Niveau" sub={<Badge variant={levelVariant} className="mt-1 text-[10px]">{level}</Badge>} />
            </div>
          </CardContent>
        </Card>

        {/* BALANCE */}
        <Card className="shadow-xs">
          <CardContent className="p-0">
            <button onClick={() => go({ name: 'earnings' })} className="w-full px-4 py-3 flex items-center gap-3 tap">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                <Wallet size={20} className="text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-muted-foreground">Total cumule</p>
                <p className="font-extrabold text-xl tabular text-foreground">{formatFCFA(driver.total_earnings_xof)}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground/50" />
            </button>
          </CardContent>
        </Card>

        {/* INFO */}
        <Card className="overflow-hidden shadow-xs">
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-2">
              <p className="font-bold text-sm text-foreground">Informations</p>
            </div>
            <InfoRow icon={<MapPin size={15} className="text-primary" />} label="Ville" value={`${driver.city}${driver.zone ? ` — ${driver.zone}` : ''}`} />
            <InfoRow icon={<VehicleIcon size={15} className="text-primary" />} label="Vehicule" value={VEHICLE_LABELS[driver.vehicle_type] ?? driver.vehicle_type} />
            {driver.vehicle_plate && <InfoRow icon={<FileText size={15} className="text-primary" />} label="Plaque" value={driver.vehicle_plate} />}
            <InfoRow
              icon={driver.is_available ? <Wifi size={15} className="text-success-600" /> : <WifiOff size={15} className="text-muted-foreground" />}
              label="Statut"
              value={driver.is_available ? 'En ligne' : 'Hors ligne'}
              last
            />
          </CardContent>
        </Card>

        {/* MENU */}
        <Card className="overflow-hidden shadow-xs">
          <CardContent className="p-0">
            <MenuRow icon={Settings} label="Parametres" onPress={() => push({ name: 'edit-profile' })} />
            <MenuRow icon={HelpCircle} label="Aide & Support" onPress={() => window.open('tel:+2250501862640')} />
            <MenuRow icon={FileText} label="Conditions d'utilisation" onPress={() => window.open('https://menupro.ci/conditions')} last />
          </CardContent>
        </Card>

        {/* LOGOUT */}
        <Button
          variant="dark"
          size="lg"
          onClick={handleLogout}
          className="w-full rounded-full"
        >
          <LogOut size={18} />
          Se deconnecter
        </Button>

      </div>
    </div>
  );
}

function StatCell({ icon, value, label, sub }: {
  icon: React.ReactNode; value: string; label: string; sub?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-primary/10">
        {icon}
      </div>
      <p className="font-extrabold text-xl tabular text-foreground">{value}</p>
      <p className="text-xs mt-0.5 text-muted-foreground">{label}</p>
      {sub}
    </div>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!last ? 'border-b border-border/60' : ''}`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate text-foreground">{value}</p>
      </div>
      <ChevronRight size={15} className="text-muted-foreground/50" />
    </div>
  );
}

function MenuRow({ icon: Icon, label, onPress, last }: { icon: React.ElementType; label: string; onPress: () => void; last?: boolean }) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-3 px-4 py-3.5 tap ${!last ? 'border-b border-border/60' : ''}`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
        <Icon size={16} className="text-foreground" />
      </div>
      <p className="flex-1 text-sm font-semibold text-left text-foreground">{label}</p>
      <ChevronRight size={15} className="text-muted-foreground/50" />
    </button>
  );
}
