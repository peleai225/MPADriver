import {
  LogOut, Truck, Star, Award, MapPin, Pencil, ChevronRight,
  Wallet, HelpCircle, FileText, Bike, Car, WifiOff, Wifi,
  Shield, MessageCircle, Bell, BellOff, FileCheck, AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
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
  approved:  'Approuvé',
  pending:   'En attente',
  rejected:  'Refusé',
  suspended: 'Suspendu',
};

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  moto: Bike,
  velo: Bike,
  voiture: Car,
};

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto',
  velo: 'Vélo',
  voiture: 'Voiture',
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function ProfilePage() {
  const { driver, logout } = useAuth();
  const { go, push } = useNav();
  const [pushEnabled, setPushEnabled] = useState(() =>
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const handleLogout = async () => { await logout(); go({ name: 'login' }); };

  const togglePush = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setPushEnabled(false);
    } else {
      const result = await Notification.requestPermission();
      setPushEnabled(result === 'granted');
    }
  };

  if (!driver) return null;

  const level = driver.total_deliveries > 100 ? 'Expert' : driver.total_deliveries > 50 ? 'Pro' : 'Junior';
  const levelVariant = level === 'Expert' ? 'warning' : level === 'Pro' ? 'default' : 'muted';
  const ratingNum = driver.rating != null ? Number(driver.rating) : 5.0;
  const photoUrl = resolvePhotoUrl(driver.photo_url);
  const VehicleIcon = VEHICLE_ICONS[driver.vehicle_type] ?? Car;

  const isApproved = driver.verification_status === 'approved';
  const docIcon = isApproved ? FileCheck : AlertCircle;
  const docColor = isApproved ? 'text-success-600' : 'text-warning-500';
  const docBg = isApproved ? 'bg-success-500/10' : 'bg-warning-50';

  return (
    <div className="min-h-screen pb-28 bg-background">

      <PageHeader title="Profil" />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-5 mt-3 space-y-3"
      >

        {/* PROFILE CARD */}
        <motion.div variants={fadeUp}>
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
        </motion.div>

        {/* STATS */}
        <motion.div variants={fadeUp}>
          <Card className="shadow-xs">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-2">
                <StatCell icon={<Truck size={18} className="text-primary" />} value={String(driver.total_deliveries)} label="Livraisons" />
                <StatCell
                  icon={<Star size={18} className="text-primary" />}
                  value={ratingNum.toFixed(1)}
                  label="Note"
                  bordered
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
        </motion.div>

        {/* BALANCE */}
        <motion.div variants={fadeUp}>
          <Card className="shadow-xs">
            <CardContent className="p-0">
              <button onClick={() => go({ name: 'earnings' })} className="w-full px-4 py-3 flex items-center gap-3 tap">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                  <Wallet size={20} className="text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-semibold text-muted-foreground">Total cumulé</p>
                  <p className="font-extrabold text-xl tabular text-foreground">{formatFCFA(driver.total_earnings_xof)}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground/50" />
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* DOCUMENTS */}
        <motion.div variants={fadeUp}>
          <Card className="shadow-xs">
            <CardContent className="p-0">
              <div className="px-4 pt-4 pb-2">
                <p className="font-bold text-sm text-foreground">Documents</p>
              </div>
              <div className="px-4 pb-3 space-y-2">
                <DocRow icon={docIcon} color={docColor} bg={docBg} label="CNI / Pièce d'identité" status={isApproved ? 'Vérifié' : 'En vérification'} />
                <DocRow icon={docIcon} color={docColor} bg={docBg} label="Permis de conduire" status={isApproved ? 'Vérifié' : 'En vérification'} />
                <DocRow icon={docIcon} color={docColor} bg={docBg} label="Photo du véhicule" status={isApproved ? 'Vérifié' : 'En vérification'} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* INFO */}
        <motion.div variants={fadeUp}>
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
        </motion.div>

        {/* MENU */}
        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden shadow-xs">
            <CardContent className="p-0">
              <MenuRow icon={pushEnabled ? Bell : BellOff} label="Notifications push" onPress={togglePush} trailing={
                <span className={`text-xs font-medium ${pushEnabled ? 'text-success-600' : 'text-muted-foreground'}`}>
                  {pushEnabled ? 'Activé' : 'Désactivé'}
                </span>
              } />
              <MenuRow icon={MessageCircle} label="Signaler un problème" onPress={() => window.open('tel:+2250501862640')} />
              <MenuRow icon={Shield} label="Conditions d'utilisation" onPress={() => window.open('https://menupro.ci/conditions')} />
              <MenuRow icon={HelpCircle} label="Aide & Support" onPress={() => window.open('tel:+2250501862640')} last />
            </CardContent>
          </Card>
        </motion.div>

        {/* LOGOUT */}
        <motion.div variants={fadeUp}>
          <Button
            variant="dark"
            size="lg"
            onClick={handleLogout}
            className="w-full rounded-full"
          >
            <LogOut size={18} />
            Se déconnecter
          </Button>
        </motion.div>

        {/* VERSION */}
        <motion.div variants={fadeUp}>
          <p className="text-center text-xs text-muted-foreground/50 pb-2">
            MENUPRO Livraison v1.0.0
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}

function StatCell({ icon, value, label, sub, bordered }: {
  icon: React.ReactNode; value: string; label: string; sub?: React.ReactNode; bordered?: boolean;
}) {
  return (
    <div className={`text-center ${bordered ? 'border-x border-border' : ''}`}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-primary/10">
        {icon}
      </div>
      <p className="font-extrabold text-xl tabular text-foreground">{value}</p>
      <p className="text-xs mt-0.5 text-muted-foreground">{label}</p>
      {sub}
    </div>
  );
}

function DocRow({ icon: Icon, color, bg, label, status }: {
  icon: React.ElementType; color: string; bg: string; label: string; status: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={14} className={color} />
      </div>
      <p className="flex-1 text-sm text-foreground">{label}</p>
      <span className={`text-xs font-medium ${color}`}>{status}</span>
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
    </div>
  );
}

function MenuRow({ icon: Icon, label, onPress, last, trailing }: {
  icon: React.ElementType; label: string; onPress: () => void; last?: boolean; trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-3 px-4 py-3.5 tap ${!last ? 'border-b border-border/60' : ''}`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
        <Icon size={16} className="text-foreground" />
      </div>
      <p className="flex-1 text-sm font-semibold text-left text-foreground">{label}</p>
      {trailing ?? <ChevronRight size={15} className="text-muted-foreground/50" />}
    </button>
  );
}
