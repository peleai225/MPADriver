import { useState } from 'react';
import { Eye, EyeOff, Phone, Lock, Bike } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';

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
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F6F5' }}>
      {/* Hero gradient */}
      <div className="relative h-48 flex flex-col items-center justify-center gradient-flame overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,0.3)' }} />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full opacity-10" style={{ background: 'rgba(0,0,0,0.3)' }} />

        <div className="relative flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-1">
            <Bike size={30} className="text-white" />
          </div>
          <p className="text-white font-extrabold text-2xl tracking-tight">Espace Livreur</p>
          <p className="text-white/70 text-sm font-medium">MenuPro Driver</p>
        </div>
      </div>

      {/* White form card pulled up over hero */}
      <div
        className="flex-1 rounded-t-3xl -mt-8 relative z-10 px-6 pt-8 pb-10"
        style={{ background: '#FFFFFF' }}
      >
        <h2 className="font-extrabold text-ink-950 text-2xl mb-1">Connexion</h2>
        <p className="text-ink-400 text-sm mb-8">Connectez-vous à votre espace livreur</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Phone input */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 h-13"
            style={{ background: '#F8F8F8' }}
          >
            <Phone size={17} className="text-ink-400 shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Numéro de téléphone"
              className="flex-1 bg-transparent text-sm font-medium text-ink-900 placeholder:text-ink-400 outline-none"
            />
          </div>

          {/* Password input */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 h-13"
            style={{ background: '#F8F8F8' }}
          >
            <Lock size={17} className="text-ink-400 shrink-0" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="flex-1 bg-transparent text-sm font-medium text-ink-900 placeholder:text-ink-400 outline-none"
            />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="tap text-ink-400">
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-xl font-bold text-white text-base tap disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#0D0D0D' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Connexion...
                </>
              ) : 'Se connecter'}
            </button>
          </div>
        </form>

        <p className="text-center text-ink-500 text-sm mt-8">
          Pas encore inscrit ?{' '}
          <button
            onClick={() => push({ name: 'register' })}
            className="font-semibold tap"
            style={{ color: '#FF6100' }}
          >
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  );
}
