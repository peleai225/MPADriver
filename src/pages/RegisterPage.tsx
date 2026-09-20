import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Upload, CheckCircle2, Bike, Car } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';

const CITIES = ['Abidjan', 'Bouake', 'Yamoussoukro', 'San-Pedro', 'Korhogo', 'Man', 'Daloa', 'Gagnoa'];
const VEHICLES = [
  { value: 'moto',    label: 'Moto',    Icon: Bike },
  { value: 'velo',    label: 'Velo',    Icon: Bike },
  { value: 'voiture', label: 'Voiture', Icon: Car },
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
      show('Téléversez les 3 photos requises.', 'error'); return;
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
      show(err.message || 'Erreur lors de l\'inscription.', 'error');
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
    <div className="min-h-screen flex flex-col overflow-hidden bg-foreground">

      {/* HERO */}
      <div className="relative flex-none min-h-[28vh] max-h-[38vh] flex flex-col justify-end px-6 pb-8 safe-top overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-2 w-24 h-24 rounded-full opacity-25 bg-primary" />
          <div className="absolute top-14 right-18 w-12 h-12 rounded-full opacity-15 bg-primary" />
          <div className="absolute top-6 left-1/2 w-8 h-8 rounded-full opacity-20 bg-primary" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={step === 0 ? pop : () => setStep(s => s - 1)}
          className="absolute top-4 left-4 rounded-full bg-white/12 text-white hover:bg-white/20"
          style={{ marginTop: 'var(--safe-top)' }}
        >
          <ChevronLeft size={20} />
        </Button>

        <div className="relative">
          <p className="text-white/60 text-base font-medium mb-1">{STEP_TITLES[step].pre}</p>
          <h1 className="text-white font-extrabold text-4xl leading-tight">
            {STEP_TITLES[step].main}
          </h1>
        </div>
      </div>

      {/* WHITE CARD */}
      <div className="flex-1 rounded-t-[2.5rem] -mt-6 flex flex-col overflow-hidden bg-card shadow-card">

        {/* Stepper pills */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-4 px-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-10' : 'w-3',
                i <= step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>

        {/* Form scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          <div className="space-y-5 pt-2 max-w-md mx-auto">

            {/* Step 1 - Info */}
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label>Nom complet</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Kouame Brou" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telephone</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0701234567" />
                </div>
                <div className="space-y-1.5">
                  <Label>Mot de passe</Label>
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="--------"
                    rightIcon={
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPwd(v => !v)}>
                        {showPwd ? <EyeOff size={17} className="text-muted-foreground" /> : <Eye size={17} className="text-muted-foreground" />}
                      </Button>
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ville de base</Label>
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
              </>
            )}

            {/* Step 2 - Vehicle */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {VEHICLES.map(v => (
                    <Card
                      key={v.value}
                      className={cn(
                        'cursor-pointer tap border-2 transition-all',
                        vehicleType === v.value ? 'border-primary bg-primary/5' : 'border-border',
                      )}
                      onClick={() => setVehicleType(v.value)}
                    >
                      <CardContent className="flex flex-col items-center gap-2 py-4 px-2">
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
                <div className="space-y-1.5">
                  <Label>Plaque d'immatriculation</Label>
                  <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} placeholder="AA-123-CI" className="uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label>Numero CNI</Label>
                  <Input value={cniNumber} onChange={e => setCniNumber(e.target.value)} placeholder="CI123456789" />
                </div>
              </>
            )}

            {/* Step 3 - Documents */}
            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Photos claires requises. Vérification sous 24-48h par l'équipe MENUPRO Livraison.
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

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 px-6 py-4 safe-bottom bg-card border-t border-border">
        <Button
          onClick={step < 2 ? nextStep : handleSubmit}
          disabled={loading}
          size="lg"
          className="w-full rounded-full"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
          ) : step < 2 ? (
            <>SUIVANT <ChevronRight size={18} /></>
          ) : (
            "S'INSCRIRE"
          )}
        </Button>

        {step === 0 && (
          <p className="text-center text-sm mt-3 text-muted-foreground">
            Deja livreur ?{' '}
            <Button variant="link" className="p-0 h-auto font-bold" onClick={pop}>
              Se connecter
            </Button>
          </p>
        )}
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
        file ? 'bg-success-50 border-success-500' : 'bg-muted border-border',
      )}
    >
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
      />
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', file ? 'bg-success-100' : 'bg-background')}>
        {file
          ? <CheckCircle2 size={22} className="text-success-600" />
          : <Upload size={22} className="text-muted-foreground" />}
      </div>
      <div className="min-w-0">
        <p className={cn('text-sm font-bold truncate', file ? 'text-success-700' : 'text-foreground')}>
          {label}{optional && <span className="font-normal text-xs ml-1 text-muted-foreground">(optionnel)</span>}
        </p>
        <p className="text-xs mt-0.5 text-muted-foreground">
          {file ? file.name : 'Appuyer pour prendre une photo'}
        </p>
      </div>
    </label>
  );
}
