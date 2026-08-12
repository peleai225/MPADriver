import { useState } from 'react';
import { ChevronLeft, Camera, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { compressImage } from '../lib/imageUtils';
import { resolvePhotoUrl } from '../lib/format';

const ORANGE = '#FF6100';
const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Daloa', 'Gagnoa'];
const VEHICLES = [
  { value: 'moto',    label: 'Moto',    emoji: '🏍️' },
  { value: 'velo',    label: 'Vélo',    emoji: '🚲' },
  { value: 'voiture', label: 'Voiture', emoji: '🚗' },
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
    if (name !== driver.name) form.append('name', name);
    if (city !== driver.city) form.append('city', city);
    if (zone !== (driver.zone ?? '')) form.append('zone', zone);
    if (vehicleType !== driver.vehicle_type) form.append('vehicle_type', vehicleType);
    if (vehiclePlate !== (driver.vehicle_plate ?? '')) form.append('vehicle_plate', vehiclePlate);
    if (photo) {
      const compressed = await compressImage(photo, 800, 800, 0.8);
      form.append('photo', compressed, compressed.name);
    }
    try {
      const res = await api.updateProfile(form);
      if (res) setDriver(res);
      await refresh();
      show('Profil mis à jour !', 'success');
      pop();
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = photo ? URL.createObjectURL(photo) : resolvePhotoUrl(driver.photo_url);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F0EB' }}>

      {/* ── HEADER ── */}
      <div
        className="flex items-center gap-3 px-5 pb-4 safe-top pt-4"
        style={{ background: '#1C1C1C' }}
      >
        <button
          onClick={pop}
          className="w-10 h-10 rounded-full flex items-center justify-center tap shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-extrabold text-lg">Modifier le profil</h1>
          <p className="text-white/40 text-xs">Mettez vos informations à jour</p>
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">

        {/* AVATAR */}
        <div className="flex flex-col items-center py-8">
          <label className="cursor-pointer tap relative">
            <input
              type="file" accept="image/*" capture="user" className="hidden"
              onChange={e => e.target.files?.[0] && setPhoto(e.target.files[0])}
            />
            <div
              className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, #FF3301, ${ORANGE})`, boxShadow: '0 8px 24px rgba(255,97,0,.35)' }}
            >
              {avatarSrc
                ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-4xl">{driver.name[0].toUpperCase()}</span>}
            </div>
            {/* Badge caméra */}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md"
              style={{ background: ORANGE }}
            >
              <Camera size={14} className="text-white" />
            </div>
          </label>

          {photo ? (
            <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold" style={{ color: '#22C55E' }}>
              <CheckCircle2 size={13} /> Nouvelle photo sélectionnée
            </div>
          ) : (
            <p className="mt-3 text-xs" style={{ color: '#A0A0A0' }}>Appuyez pour changer la photo</p>
          )}
        </div>

        <div className="space-y-4">

          {/* NOM */}
          <FieldGroup label="Nom complet *">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Kouamé Brou"
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{ color: '#1C1C1C' }}
            />
          </FieldGroup>

          {/* VILLE */}
          <FieldGroup label="Ville de base *">
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{ color: '#1C1C1C' }}
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FieldGroup>

          {/* ZONE */}
          <FieldGroup label="Commune / Zone">
            <input
              value={zone}
              onChange={e => setZone(e.target.value)}
              placeholder="Ex: Cocody, Plateau..."
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{ color: '#1C1C1C' }}
            />
          </FieldGroup>

          {/* VÉHICULE */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#717171' }}>Type de véhicule *</p>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLES.map(v => (
                <button
                  key={v.value}
                  onClick={() => setVehicleType(v.value as 'moto' | 'velo' | 'voiture')}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 tap transition-all"
                  style={{
                    background: vehicleType === v.value ? 'rgba(255,97,0,0.06)' : '#FFFFFF',
                    borderColor: vehicleType === v.value ? ORANGE : '#E4E4E4',
                  }}
                >
                  <span className="text-3xl">{v.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: vehicleType === v.value ? ORANGE : '#717171' }}>
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* PLAQUE */}
          <FieldGroup label="Plaque d'immatriculation">
            <input
              value={vehiclePlate}
              onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
              placeholder="AA-123-CI"
              className="flex-1 bg-transparent text-sm font-medium outline-none uppercase"
              style={{ color: '#1C1C1C' }}
            />
          </FieldGroup>

        </div>
      </div>

      {/* ── CTA ── */}
      <div
        className="fixed bottom-0 inset-x-0 px-5 py-4 safe-bottom"
        style={{ background: 'rgba(255,255,255,0.97)', borderTop: '1px solid #F1F1F1' }}
      >
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-full font-bold text-white text-base tap disabled:opacity-60 flex items-center justify-center gap-2 gradient-flame"
          style={{ boxShadow: '0 8px 24px rgba(255,97,0,.4)' }}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: '#717171' }}>{label}</p>
      <div
        className="flex items-center gap-3 px-4 h-14 rounded-2xl border"
        style={{ background: '#FFFFFF', borderColor: '#E4E4E4' }}
      >
        {children}
      </div>
    </div>
  );
}
