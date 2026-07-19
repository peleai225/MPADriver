import { useState } from 'react';
import { ChevronLeft, Camera, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { cn } from '../lib/utils';

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Daloa', 'Gagnoa'];
const VEHICLES = [
  { value: 'moto',    label: 'Moto',    emoji: '🏍️' },
  { value: 'velo',    label: 'Vélo',    emoji: '🚲' },
  { value: 'voiture', label: 'Voiture', emoji: '🚗' },
];

export function EditProfilePage() {
  const { driver, setDriver } = useAuth();
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
    if (name !== driver.name) form.append('name', name);
    if (city !== driver.city) form.append('city', city);
    if (zone !== (driver.zone ?? '')) form.append('zone', zone);
    if (vehicleType !== driver.vehicle_type) form.append('vehicle_type', vehicleType);
    if (vehiclePlate !== (driver.vehicle_plate ?? '')) form.append('vehicle_plate', vehiclePlate);
    if (photo) form.append('photo', photo);

    try {
      const updated = await api.updateProfile(form);
      setDriver(updated);
      show('Profil mis à jour !', 'success');
      pop();
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-ink-950 px-4 pt-safe pb-4 flex items-center gap-3">
        <button onClick={pop} className="w-9 h-9 rounded-full bg-white/10 grid place-items-center tap">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-base">Modifier le profil</h1>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5 pb-32">
        {/* Photo */}
        <div className="flex flex-col items-center gap-3">
          <label className="cursor-pointer tap">
            <input type="file" accept="image/*" capture="user" className="hidden"
              onChange={e => e.target.files?.[0] && setPhoto(e.target.files[0])} />
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-brand-500 grid place-items-center shadow-pop overflow-hidden">
                {photo
                  ? <img src={URL.createObjectURL(photo)} className="w-full h-full object-cover" />
                  : driver.photo_url
                  ? <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-extrabold text-3xl">{driver.name[0].toUpperCase()}</span>
                }
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-500 border-2 border-white grid place-items-center shadow-sm">
                <Camera size={13} className="text-white" />
              </div>
            </div>
          </label>
          {photo && (
            <div className="flex items-center gap-1.5 text-xs text-success-600 font-semibold">
              <CheckCircle2 size={13} /> Nouvelle photo sélectionnée
            </div>
          )}
          <p className="text-xs text-ink-400">Appuyez pour changer la photo</p>
        </div>

        {/* Nom */}
        <div><Label htmlFor="name">Nom complet *</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Ville */}
        <div>
          <Label htmlFor="city">Ville de base *</Label>
          <select id="city" value={city} onChange={e => setCity(e.target.value)}
            className="w-full h-12 rounded-2xl px-4 text-sm border border-ink-200 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm">
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Zone */}
        <div><Label htmlFor="zone">Commune / Zone</Label>
          <Input id="zone" value={zone} onChange={e => setZone(e.target.value)} placeholder="Ex: Cocody, Plateau..." />
        </div>

        {/* Véhicule */}
        <div>
          <Label>Type de véhicule *</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {VEHICLES.map(v => (
              <button key={v.value} type="button" onClick={() => setVehicleType(v.value as 'moto' | 'velo' | 'voiture')}
                className={cn(
                  'py-3.5 rounded-2xl text-sm font-semibold border-2 tap flex flex-col items-center gap-1.5 transition-all',
                  vehicleType === v.value ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-ink-200 text-ink-500',
                )}>
                <span className="text-2xl">{v.emoji}</span>{v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plaque */}
        <div><Label htmlFor="plate">Plaque d'immatriculation</Label>
          <Input id="plate" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="AA-123-CI" className="uppercase" />
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-ink-100 safe-bottom">
        <Button onClick={handleSubmit} disabled={loading} className="w-full h-13">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Enregistrement...
            </span>
          ) : 'Enregistrer les modifications'}
        </Button>
      </div>
    </div>
  );
}
