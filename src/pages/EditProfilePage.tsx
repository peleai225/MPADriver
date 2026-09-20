import { useState } from 'react';
import { ChevronLeft, Camera, CheckCircle2, Bike, Car } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { compressImage } from '../lib/imageUtils';
import { resolvePhotoUrl } from '../lib/format';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';

const CITIES = ['Abidjan', 'Bouake', 'Yamoussoukro', 'San-Pedro', 'Korhogo', 'Man', 'Daloa', 'Gagnoa'];
const VEHICLES = [
  { value: 'moto',    label: 'Moto',    Icon: Bike },
  { value: 'velo',    label: 'Velo',    Icon: Bike },
  { value: 'voiture', label: 'Voiture', Icon: Car },
];

export function EditProfilePage() {
  const { driver, setDriver, refresh } = useAuth();
  const { pop } = useNav();
  const { show } = useToast();

  const [name, setName] = useState(driver?.name ?? '');
  const [city, setCity] = useState(driver?.city ?? 'Abidjan');
  const [zone, setZone] = useState(driver?.zone ?? '');
  const [vehicleType, setVehicleType] = useState<'moto' | 'velo' | 'voiture'>(driver?.vehicle_type ?? 'moto');
  const [vehiclePlate, setVehiclePlate] = useState(driver?.vehicle_plate ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!driver) return null;

  const handleSubmit = async () => {
    setLoading(true);
    const form = new FormData();
    form.append('name', name);
    form.append('city', city);
    form.append('zone', zone);
    form.append('vehicle_type', vehicleType);
    form.append('vehicle_plate', vehiclePlate);
    if (photo) {
      const compressed = await compressImage(photo, 800, 800, 0.8);
      form.append('photo', compressed, compressed.name);
    }
    try {
      const res = await api.updateProfile(form);
      if (res) setDriver(res);
      await refresh();
      show('Profil mis a jour !', 'success');
      pop();
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = photo ? URL.createObjectURL(photo) : resolvePhotoUrl(driver.photo_url);

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 pb-4 safe-top pt-4 bg-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={pop}
          className="rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <ChevronLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-white font-extrabold text-lg">Modifier le profil</h1>
          <p className="text-white/40 text-xs">Mettez vos informations a jour</p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">

        {/* AVATAR */}
        <div className="flex flex-col items-center py-8">
          <label className="cursor-pointer tap relative">
            <input
              type="file" accept="image/*" capture="user" className="hidden"
              onChange={e => e.target.files?.[0] && setPhoto(e.target.files[0])}
            />
            <Avatar className="h-24 w-24 rounded-3xl gradient-brand shadow-pop">
              {avatarSrc
                ? <AvatarImage src={avatarSrc} alt="avatar" className="rounded-3xl" />
                : null}
              <AvatarFallback className="rounded-3xl bg-transparent text-white font-extrabold text-4xl">
                {driver.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-card bg-primary shadow-md">
              <Camera size={14} className="text-white" />
            </div>
          </label>

          {photo ? (
            <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-success-600">
              <CheckCircle2 size={13} /> Nouvelle photo selectionnee
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Appuyez pour changer la photo</p>
          )}
        </div>

        <div className="space-y-4">

          <div className="space-y-1.5">
            <Label>Nom complet *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Kouame Brou" />
          </div>

          <div className="space-y-1.5">
            <Label>Ville de base *</Label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full h-13 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Commune / Zone</Label>
            <Input value={zone} onChange={e => setZone(e.target.value)} placeholder="Ex: Cocody, Plateau..." />
          </div>

          <div>
            <Label className="mb-2">Type de vehicule *</Label>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLES.map(v => (
                <Card
                  key={v.value}
                  className={cn(
                    'cursor-pointer tap border-2 transition-all',
                    vehicleType === v.value ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                  onClick={() => setVehicleType(v.value as 'moto' | 'velo' | 'voiture')}
                >
                  <CardContent className="flex flex-col items-center gap-1.5 py-4 px-2">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      vehicleType === v.value ? 'bg-primary/10' : 'bg-muted',
                    )}>
                      <v.Icon size={24} className={vehicleType === v.value ? 'text-primary' : 'text-muted-foreground'} />
                    </div>
                    <span className={cn('text-xs font-bold', vehicleType === v.value ? 'text-primary' : 'text-muted-foreground')}>
                      {v.label}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Plaque d'immatriculation</Label>
            <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} placeholder="AA-123-CI" className="uppercase" />
          </div>

        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 px-5 py-4 safe-bottom bg-card/97 border-t border-border">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="lg"
          className="w-full rounded-full"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
          ) : 'Enregistrer les modifications'}
        </Button>
      </div>
    </div>
  );
}
