import { useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, CheckCircle2, User, Phone, Lock, MapPin, Truck } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Daloa', 'Gagnoa'];
const VEHICLES = [
  { value: 'moto',    label: 'Moto',    emoji: '🏍️', desc: 'Idéal en ville' },
  { value: 'velo',    label: 'Vélo',    emoji: '🚲', desc: 'Eco-friendly' },
  { value: 'voiture', label: 'Voiture', emoji: '🚗', desc: 'Grande capacité' },
];

const STEPS = [
  { label: 'Infos',     icon: '👤' },
  { label: 'Véhicule',  icon: '🏍️' },
  { label: 'Documents', icon: '📄' },
];

export function RegisterPage() {
  const { go, pop } = useNav();
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Abidjan');
  const [zone, setZone] = useState('');
  const [vehicleType, setVehicleType] = useState('moto');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [cniNumber, setCniNumber] = useState('');
  const [cniPhoto, setCniPhoto] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);

  const nextStep = () => {
    if (step === 0) {
      if (!name || !phone || !password) { show('Remplissez tous les champs obligatoires.', 'error'); return; }
      if (password.length < 6) { show('Mot de passe : minimum 6 caractères.', 'error'); return; }
    }
    if (step === 1) {
      if (!vehiclePlate) { show('Entrez la plaque du véhicule.', 'error'); return; }
      if (!cniNumber) { show('Entrez votre numéro CNI.', 'error'); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!cniPhoto || !licensePhoto || !vehiclePhoto) {
      show('Uploadez les 3 photos requises.', 'error'); return;
    }
    setLoading(true);
    try {
      const [compressedCni, compressedLicense, compressedVehicle] = await Promise.all([
        compressImage(cniPhoto, 800, 800, 0.8),
        compressImage(licensePhoto, 800, 800, 0.8),
        compressImage(vehiclePhoto, 800, 800, 0.8),
      ]);
      const form = new FormData();
      form.append('name', name);
      form.append('phone', phone);
      form.append('password', password);
      form.append('city', city);
      form.append('zone', zone);
      form.append('vehicle_type', vehicleType);
      form.append('vehicle_plate', vehiclePlate);
      form.append('cni_number', cniNumber);
      form.append('cni_photo', compressedCni, compressedCni.name);
      form.append('license_photo', compressedLicense, compressedLicense.name);
      form.append('vehicle_photo', compressedVehicle, compressedVehicle.name);
      await api.register(form);
      go({ name: 'pending' });
    } catch (err: any) {
      show(err.message || "Erreur lors de l'inscription.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F6F5' }}>
      {/* Header fixe */}
      <div
        className="flex items-center gap-3 px-4 pb-4 safe-top"
        style={{ background: '#1C1C1C' }}
      >
        <button
          onClick={step === 0 ? pop : () => setStep(s => s - 1)}
          className="w-10 h-10 rounded-full flex items-center justify-center tap shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        <div className="flex-1 flex justify-center">
          <img src="/logo.png" alt="MENUPRO" className="h-8 object-contain" />
        </div>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: 'rgba(255,97,0,0.2)' }}
        >
          {step + 1}/3
        </div>
      </div>

      {/* Stepper */}
      <div style={{ background: '#1C1C1C' }} className="px-5 pb-5">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    i < step  ? 'text-white' : i === step ? 'text-white' : 'text-white/30',
                  )}
                  style={{
                    background: i < step ? '#22C55E' : i === step ? '#FF6100' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {i < step ? '✓' : s.icon}
                </div>
                <span
                  className={cn('text-[10px] font-semibold', i === step ? 'text-white' : 'text-white/30')}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="h-0.5 flex-1 mx-1 mb-5 rounded-full transition-all"
                  style={{ background: i < step ? '#22C55E' : 'rgba(255,255,255,0.15)' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contenu formulaire */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-32 space-y-4">

          {/* ── Étape 1 : Infos personnelles ── */}
          {step === 0 && (
            <>
              <div>
                <h2 className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>Informations personnelles</h2>
                <p className="text-sm mt-1" style={{ color: '#A0A0A0' }}>Commençons avec vos coordonnées de base.</p>
              </div>

              <FieldGroup icon={<User size={17} />} label="Nom complet *">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Kouamé Brou"
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  style={{ color: '#1C1C1C' }}
                />
              </FieldGroup>

              <FieldGroup icon={<Phone size={17} />} label="Téléphone *">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0701234567"
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  style={{ color: '#1C1C1C' }}
                />
              </FieldGroup>

              <FieldGroup icon={<Lock size={17} />} label="Mot de passe * (min. 6 caractères)">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  style={{ color: '#1C1C1C' }}
                />
              </FieldGroup>

              <FieldGroup icon={<MapPin size={17} />} label="Ville de base *">
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  style={{ color: '#1C1C1C' }}
                >
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FieldGroup>

              <FieldGroup icon={<MapPin size={17} />} label="Commune / Zone">
                <input
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                  placeholder="Ex: Cocody, Plateau..."
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  style={{ color: '#1C1C1C' }}
                />
              </FieldGroup>
            </>
          )}

          {/* ── Étape 2 : Véhicule ── */}
          {step === 1 && (
            <>
              <div>
                <h2 className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>Votre véhicule</h2>
                <p className="text-sm mt-1" style={{ color: '#A0A0A0' }}>Quel type de véhicule utilisez-vous ?</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {VEHICLES.map(v => (
                  <button
                    key={v.value}
                    onClick={() => setVehicleType(v.value)}
                    className={cn('flex flex-col items-center gap-2 p-3 rounded-2xl border-2 tap transition-all')}
                    style={{
                      background: vehicleType === v.value ? 'rgba(255,97,0,0.06)' : '#FFFFFF',
                      borderColor: vehicleType === v.value ? '#FF6100' : '#E4E4E4',
                    }}
                  >
                    <span className="text-3xl">{v.emoji}</span>
                    <span className="text-xs font-bold" style={{ color: vehicleType === v.value ? '#FF6100' : '#1C1C1C' }}>
                      {v.label}
                    </span>
                    <span className="text-[10px]" style={{ color: '#A0A0A0' }}>{v.desc}</span>
                  </button>
                ))}
              </div>

              <FieldGroup icon={<Truck size={17} />} label="Plaque d'immatriculation *">
                <input
                  value={vehiclePlate}
                  onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="AA-123-CI"
                  className="flex-1 bg-transparent text-sm font-medium outline-none uppercase"
                  style={{ color: '#1C1C1C' }}
                />
              </FieldGroup>

              <FieldGroup icon={<User size={17} />} label="Numéro CNI *">
                <input
                  value={cniNumber}
                  onChange={e => setCniNumber(e.target.value)}
                  placeholder="CI123456789"
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  style={{ color: '#1C1C1C' }}
                />
              </FieldGroup>
            </>
          )}

          {/* ── Étape 3 : Documents ── */}
          {step === 2 && (
            <>
              <div>
                <h2 className="font-extrabold text-xl" style={{ color: '#1C1C1C' }}>Pièces justificatives</h2>
                <p className="text-sm mt-1" style={{ color: '#A0A0A0' }}>
                  Photos claires requises. Vérification sous 24–48h par l'équipe MENUPRO.
                </p>
              </div>

              {/* Récap infos */}
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,97,0,0.06)', border: '1px solid rgba(255,97,0,0.15)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#FF6100' }}>Récapitulatif</p>
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: '#717171' }}>👤 {name} · {phone}</p>
                  <p className="text-xs" style={{ color: '#717171' }}>📍 {city}{zone ? ` — ${zone}` : ''}</p>
                  <p className="text-xs" style={{ color: '#717171' }}>🚗 {VEHICLES.find(v => v.value === vehicleType)?.label} · {vehiclePlate}</p>
                </div>
              </div>

              <FileUpload
                label="CNI — recto/verso"
                hint="Carte Nationale d'Identité valide"
                file={cniPhoto}
                onChange={setCniPhoto}
              />
              <FileUpload
                label="Permis de conduire"
                hint="Permis valide correspondant au véhicule"
                file={licensePhoto}
                onChange={setLicensePhoto}
              />
              <FileUpload
                label="Photo du véhicule"
                hint="Vue de face ou de côté, plaque visible"
                file={vehiclePhoto}
                onChange={setVehiclePhoto}
              />
            </>
          )}
        </div>
      </div>

      {/* CTA fixe en bas */}
      <div className="fixed bottom-0 inset-x-0 px-4 py-4 safe-bottom" style={{ background: '#F8F6F5', borderTop: '1px solid #E4E4E4' }}>
        <button
          onClick={step < 2 ? nextStep : handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-2xl font-bold text-white text-base tap disabled:opacity-60 flex items-center justify-center gap-2 gradient-flame shadow-pop"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Envoi en cours...
            </>
          ) : step < 2 ? (
            <>Suivant <ChevronRight size={18} /></>
          ) : (
            '✓ Soumettre mon dossier'
          )}
        </button>
      </div>
    </div>
  );
}

function FieldGroup({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: '#717171' }}>{label}</p>
      <div
        className="flex items-center gap-3 rounded-2xl px-4 h-14 border"
        style={{ background: '#FFFFFF', borderColor: '#E4E4E4' }}
      >
        <span style={{ color: '#A0A0A0' }} className="shrink-0">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function FileUpload({ label, hint, file, onChange }: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: '#717171' }}>{label} *</p>
      <label
        className={cn(
          'flex items-center gap-3 rounded-2xl p-4 cursor-pointer tap transition-all border-2 border-dashed',
        )}
        style={{
          background: file ? 'rgba(34,197,94,0.06)' : '#FFFFFF',
          borderColor: file ? '#22C55E' : '#E4E4E4',
        }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
        />
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: file ? 'rgba(34,197,94,0.1)' : '#F8F8F8' }}
        >
          {file
            ? <CheckCircle2 size={22} style={{ color: '#22C55E' }} />
            : <Upload size={22} style={{ color: '#A0A0A0' }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: file ? '#16A34A' : '#1C1C1C' }}>
            {file ? file.name : 'Appuyer pour photographier'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
            {file ? `✓ Photo ajoutée` : hint}
          </p>
        </div>
      </label>
    </div>
  );
}
