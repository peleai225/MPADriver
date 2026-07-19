import { useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
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

const STEPS = ['Infos', 'Véhicule', 'Documents'];

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
      if (password.length < 6) { show('Le mot de passe doit contenir au moins 6 caractères.', 'error'); return; }
    }
    if (step === 1) {
      if (!vehiclePlate) { show('Entrez la plaque du véhicule.', 'error'); return; }
      if (!cniNumber) { show('Entrez votre numéro CNI.', 'error'); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!cniPhoto || !licensePhoto || !vehiclePhoto) { show('Uploadez les 3 photos requises.', 'error'); return; }
    setLoading(true);
    const form = new FormData();
    form.append('name', name);
    form.append('phone', phone);
    form.append('password', password);
    form.append('city', city);
    form.append('zone', zone);
    form.append('vehicle_type', vehicleType);
    form.append('vehicle_plate', vehiclePlate);
    form.append('cni_number', cniNumber);
    form.append('cni_photo', cniPhoto);
    form.append('license_photo', licensePhoto);
    form.append('vehicle_photo', vehiclePhoto);
    try {
      await api.register(form);
      go({ name: 'pending' });
    } catch (err: any) {
      show(err.message || "Erreur lors de l'inscription.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const FileUpload = ({ label, file, onChange, required = true }: {
    label: string; file: File | null; onChange: (f: File) => void; required?: boolean;
  }) => (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <label className={cn(
        'flex items-center gap-3 border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-colors',
        file ? 'border-success-400 bg-success-50' : 'border-ink-200 bg-ink-50 hover:border-brand-300 hover:bg-brand-50/50',
      )}>
        <input type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
        <div className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0', file ? 'bg-success-100' : 'bg-white shadow-sm')}>
          {file
            ? <CheckCircle2 size={20} className="text-success-600" />
            : <Upload size={20} className="text-ink-400" />}
        </div>
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold truncate', file ? 'text-success-700' : 'text-ink-600')}>
            {file ? file.name : 'Appuyer pour prendre une photo'}
          </p>
          {!file && <p className="text-xs text-ink-400 mt-0.5">JPG, PNG — max 5 Mo</p>}
        </div>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-ink-950 px-4 pt-safe pb-4 flex items-center gap-3">
        <button
          onClick={step === 0 ? pop : () => setStep(s => s - 1)}
          className="w-9 h-9 rounded-full bg-white/10 grid place-items-center tap hover:bg-white/20 transition-colors shrink-0"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-base">Créer un compte livreur</h1>
          <p className="text-ink-400 text-xs">{STEPS[step]}</p>
        </div>
        <span className="text-ink-500 text-xs">{step + 1}/3</span>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center px-5 py-4 gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0 transition-all',
              i < step  ? 'bg-brand-500 text-white'
              : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100'
              : 'bg-ink-200 text-ink-400',
            )}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={cn('text-xs font-medium hidden sm:block', i === step ? 'text-ink-900' : 'text-ink-400')}>{s}</span>
            {i < STEPS.length - 1 && <div className={cn('h-0.5 flex-1', i < step ? 'bg-brand-500' : 'bg-ink-200')} />}
          </div>
        ))}
      </div>

      <div className="flex-1 px-4 py-2 space-y-4 overflow-y-auto pb-32">
        {/* Étape 1 */}
        {step === 0 && (
          <>
            <h2 className="font-bold text-ink-900 text-lg">Informations personnelles</h2>
            <div><Label htmlFor="name">Nom complet *</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Kouamé Brou" /></div>
            <div><Label htmlFor="phone">Téléphone *</Label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0701234567" /></div>
            <div><Label htmlFor="pwd">Mot de passe *</Label><Input id="pwd" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 caractères" /></div>
            <div>
              <Label htmlFor="city">Ville de base *</Label>
              <select
                id="city"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full h-12 rounded-2xl px-4 text-sm border border-ink-200 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label htmlFor="zone">Commune / Zone</Label><Input id="zone" value={zone} onChange={e => setZone(e.target.value)} placeholder="Ex: Cocody, Plateau..." /></div>
          </>
        )}

        {/* Étape 2 */}
        {step === 1 && (
          <>
            <h2 className="font-bold text-ink-900 text-lg">Votre véhicule</h2>
            <div>
              <Label>Type de véhicule *</Label>
              <div className="grid grid-cols-3 gap-2">
                {VEHICLES.map(v => (
                  <button
                    key={v.value}
                    onClick={() => setVehicleType(v.value)}
                    className={cn(
                      'py-4 rounded-2xl text-sm font-semibold border-2 tap flex flex-col items-center gap-1.5 transition-all',
                      vehicleType === v.value
                        ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-sm'
                        : 'border-ink-200 text-ink-500 hover:border-ink-300',
                    )}
                  >
                    <span className="text-2xl">{v.emoji}</span>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="plate">Plaque d'immatriculation *</Label>
              <Input id="plate" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="AA-123-CI" className="uppercase" />
            </div>
            <div>
              <Label htmlFor="cni">Numéro CNI *</Label>
              <Input id="cni" value={cniNumber} onChange={e => setCniNumber(e.target.value)} placeholder="CI123456789" />
            </div>
          </>
        )}

        {/* Étape 3 */}
        {step === 2 && (
          <>
            <h2 className="font-bold text-ink-900 text-lg">Pièces justificatives</h2>
            <p className="text-sm text-ink-500">Prenez des photos claires de vos documents. Elles seront vérifiées par l'équipe MenuPro sous 24–48h.</p>
            <FileUpload label="Photo CNI (recto/verso)" file={cniPhoto} onChange={setCniPhoto} />
            <FileUpload label="Permis de conduire" file={licensePhoto} onChange={setLicensePhoto} />
            <FileUpload label="Photo du véhicule" file={vehiclePhoto} onChange={setVehiclePhoto} />
          </>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-ink-100 safe-bottom">
        <Button
          onClick={step < 2 ? nextStep : handleSubmit}
          disabled={loading}
          className="w-full h-13"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Envoi en cours...
            </span>
          ) : step < 2 ? (
            <span className="flex items-center gap-2">Suivant <ChevronRight size={17} /></span>
          ) : 'Soumettre mon dossier'}
        </Button>
      </div>
    </div>
  );
}
