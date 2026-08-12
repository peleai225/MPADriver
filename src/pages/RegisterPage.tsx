import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Upload, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Daloa', 'Gagnoa'];
const VEHICLES = [
  { value: 'moto',    label: 'Moto',    emoji: '🏍️' },
  { value: 'velo',    label: 'Vélo',    emoji: '🚲' },
  { value: 'voiture', label: 'Voiture', emoji: '🚗' },
];

export function RegisterPage() {
  const { go, pop } = useNav();
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Abidjan');
  const [zone, setZone] = useState('');
  const [vehicleType, setVehicleType] = useState('moto');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [cniNumber, setCniNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [cniPhoto, setCniPhoto] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);

  const nextStep = () => {
    if (step === 0) {
      if (!name || !phone || !password) { show('Remplissez tous les champs.', 'error'); return; }
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
      const compressions = [
        compressImage(cniPhoto, 800, 800, 0.8),
        compressImage(licensePhoto, 800, 800, 0.8),
        compressImage(vehiclePhoto, 800, 800, 0.8),
      ];
      if (profilePhoto) compressions.push(compressImage(profilePhoto, 600, 600, 0.85));
      const compressed = await Promise.all(compressions);
      const [c1, c2, c3] = compressed;
      const form = new FormData();
      form.append('name', name);
      form.append('phone', phone);
      form.append('password', password);
      form.append('city', city);
      form.append('zone', zone);
      form.append('vehicle_type', vehicleType);
      form.append('vehicle_plate', vehiclePlate);
      form.append('cni_number', cniNumber);
      if (profilePhoto) form.append('photo', compressed[3], compressed[3].name);
      form.append('cni_photo', c1, c1.name);
      form.append('license_photo', c2, c2.name);
      form.append('vehicle_photo', c3, c3.name);
      await api.register(form);
      go({ name: 'pending' });
    } catch (err: any) {
      show(err.message || "Erreur lors de l'inscription.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const STEP_TITLES = [
    { pre: 'Créez votre', main: 'Compte !' },
    { pre: 'Votre', main: 'Véhicule' },
    { pre: 'Vos', main: 'Documents' },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: '#1C1C1C' }}>

      {/* ── HERO ── */}
      <div className="relative flex-none h-[42vh] flex flex-col justify-end px-6 pb-10 safe-top overflow-hidden">

        {/* Bulles déco */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-2 w-28 h-28 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #FF6100, #FF3301)' }} />
          <div className="absolute top-16 right-20 w-14 h-14 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #FF6100, #FF3301)' }} />
          <div className="absolute top-8 left-1/2 w-8 h-8 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FF8C00, #FF3301)' }} />
          <div className="absolute bottom-8 right-6 w-18 h-18 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #FF6100, transparent)' }} />
        </div>

        {/* Bouton retour */}
        <button
          onClick={step === 0 ? pop : () => setStep(s => s - 1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center tap"
          style={{ background: 'rgba(255,255,255,0.12)', marginTop: 'var(--safe-top)' }}
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        {/* Titre */}
        <div className="relative">
          <p className="text-white/60 text-base font-medium mb-1">{STEP_TITLES[step].pre}</p>
          <h1 className="text-white font-extrabold text-4xl leading-tight">
            {STEP_TITLES[step].main}
          </h1>
        </div>
      </div>

      {/* ── CARD BLANCHE ── */}
      <div
        className="flex-1 rounded-t-[2.5rem] -mt-6 flex flex-col overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
      >
        {/* Stepper pills */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-4 px-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? '2.5rem' : '0.75rem',
                background: i <= step ? '#FF6100' : '#E4E4E4',
              }}
            />
          ))}
        </div>

        {/* Formulaire scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          <div className="space-y-5 pt-2">

            {/* Étape 1 — Infos */}
            {step === 0 && (
              <>
                <UnderlineField label="Nom complet" value={name} placeholder="Kouamé Brou" onChange={setName} />
                <UnderlineField label="Téléphone" value={phone} placeholder="0701234567" type="tel" onChange={setPhone} />
                <UnderlineField
                  label="Mot de passe"
                  value={password}
                  placeholder="••••••••"
                  type={showPwd ? 'text' : 'password'}
                  onChange={setPassword}
                  right={
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="tap">
                      {showPwd
                        ? <EyeOff size={17} style={{ color: '#A0A0A0' }} />
                        : <Eye size={17} style={{ color: '#A0A0A0' }} />}
                    </button>
                  }
                />
                <div>
                  <p className="text-sm font-bold mb-2" style={{ color: '#1C1C1C' }}>Ville de base</p>
                  <div className="pb-2" style={{ borderBottom: '1.5px solid #E4E4E4' }}>
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: '#717171' }}
                    >
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <UnderlineField label="Commune / Zone" value={zone} placeholder="Ex: Cocody, Plateau..." onChange={setZone} />
              </>
            )}

            {/* Étape 2 — Véhicule */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {VEHICLES.map(v => (
                    <button
                      key={v.value}
                      onClick={() => setVehicleType(v.value)}
                      className="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 tap transition-all"
                      style={{
                        background: vehicleType === v.value ? 'rgba(255,97,0,0.06)' : '#FAFAFA',
                        borderColor: vehicleType === v.value ? '#FF6100' : '#E4E4E4',
                      }}
                    >
                      <span className="text-3xl">{v.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: vehicleType === v.value ? '#FF6100' : '#717171' }}>
                        {v.label}
                      </span>
                    </button>
                  ))}
                </div>
                <UnderlineField
                  label="Plaque d'immatriculation"
                  value={vehiclePlate}
                  placeholder="AA-123-CI"
                  onChange={v => setVehiclePlate(v.toUpperCase())}
                />
                <UnderlineField
                  label="Numéro CNI"
                  value={cniNumber}
                  placeholder="CI123456789"
                  onChange={setCniNumber}
                />
              </>
            )}

            {/* Étape 3 — Documents */}
            {step === 2 && (
              <>
                <p className="text-sm pb-2" style={{ color: '#A0A0A0' }}>
                  Photos claires requises. Vérification sous 24–48h par l'équipe MENUPRO Livraison.
                </p>
                <FileUpload label="Votre photo de profil" file={profilePhoto} onChange={setProfilePhoto} optional />
                <FileUpload label="CNI (recto/verso)" file={cniPhoto} onChange={setCniPhoto} />
                <FileUpload label="Permis de conduire" file={licensePhoto} onChange={setLicensePhoto} />
                <FileUpload label="Photo du véhicule" file={vehiclePhoto} onChange={setVehiclePhoto} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── CTA FIXE ── */}
      <div
        className="fixed bottom-0 inset-x-0 px-6 py-4 safe-bottom"
        style={{ background: '#FFFFFF', borderTop: '1px solid #F1F1F1' }}
      >
        <button
          onClick={step < 2 ? nextStep : handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-full font-bold text-white text-base tap disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF3301, #FF6100)', boxShadow: '0 8px 24px rgba(255,97,0,.4)' }}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : step < 2 ? (
            <><span>SUIVANT</span> <ChevronRight size={18} /></>
          ) : (
            "S'INSCRIRE"
          )}
        </button>

        {step === 0 && (
          <p className="text-center text-sm mt-3" style={{ color: '#A0A0A0' }}>
            Déjà livreur ?{' '}
            <button
              onClick={pop}
              className="font-bold tap"
              style={{ color: '#FF3301' }}
            >
              Se connecter
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function UnderlineField({ label, value, placeholder, type = 'text', onChange, right }: {
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange: (v: string) => void;
  right?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-bold mb-2" style={{ color: '#1C1C1C' }}>{label}</p>
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1.5px solid #E4E4E4' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: '#717171' }}
        />
        {right ?? (value && <span style={{ color: '#FF6100' }}>✓</span>)}
      </div>
    </div>
  );
}

function FileUpload({ label, file, onChange, optional }: {
  label: string;
  file: File | null;
  onChange: (f: File) => void;
  optional?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 rounded-2xl p-4 cursor-pointer tap border-2 border-dashed transition-all',
      )}
      style={{
        background: file ? 'rgba(34,197,94,0.05)' : '#FAFAFA',
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
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: file ? 'rgba(34,197,94,0.1)' : '#F1F1F1' }}
      >
        {file
          ? <CheckCircle2 size={22} style={{ color: '#22C55E' }} />
          : <Upload size={22} style={{ color: '#A0A0A0' }} />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: file ? '#16A34A' : '#1C1C1C' }}>
          {label}{optional && <span className="font-normal text-xs ml-1" style={{ color: '#A0A0A0' }}>(optionnel)</span>}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
          {file ? `✓ ${file.name}` : 'Appuyer pour prendre une photo'}
        </p>
      </div>
    </label>
  );
}
