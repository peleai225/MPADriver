import { useState } from 'react';
import { Eye, EyeOff, Phone, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function LoginPage() {
  const { login } = useAuth();
  const { go, push } = useNav();
  const { show } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) { show('Remplissez tous les champs.', 'error'); return; }
    setLoading(true);
    try {
      const driver = await login(phone, password);
      if (driver.verification_status === 'pending') go({ name: 'pending' });
      else if (driver.verification_status === 'approved') go({ name: 'dashboard' });
      else show(`Compte ${driver.verification_status === 'rejected' ? 'refusé' : 'suspendu'}.`, 'error');
    } catch (err: any) {
      show(err.message || 'Identifiants incorrects.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo officiel */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="w-56 bg-white rounded-3xl px-4 py-3 shadow-pop">
            <img src="/logo.png" alt="MenuPro Livraison" className="w-full h-auto object-contain" />
          </div>
        </div>

        <p className="text-ink-400 text-sm mt-1.5">Connectez-vous à votre espace livreur</p>

        <form onSubmit={handleSubmit} className="w-full max-w-sm mt-10 space-y-3">
          <Input
            dark
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Numéro de téléphone"
            leftIcon={<Phone size={17} />}
            className="h-13"
          />

          <Input
            dark
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            leftIcon={<Lock size={17} />}
            rightIcon={
              <button type="button" onClick={() => setShowPwd(v => !v)} className="tap">
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
            className="h-13"
          />

          <Button type="submit" disabled={loading} className="w-full mt-2 h-13">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Connexion...
              </span>
            ) : 'Se connecter'}
          </Button>
        </form>
      </div>

      <div className="pb-10 px-6 text-center">
        <p className="text-ink-500 text-sm">
          Pas encore inscrit ?{' '}
          <button onClick={() => push({ name: 'register' })} className="text-brand-400 font-semibold tap">
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  );
}
