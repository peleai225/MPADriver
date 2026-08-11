import { useState } from 'react';
import { Eye, EyeOff, Phone, Lock } from 'lucide-react';
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
      if (driver.verification_status === 'pending' || driver.verification_status === 'rejected') {
        go({ name: 'pending' });
      } else if (driver.verification_status === 'approved') {
        go({ name: 'dashboard' });
      } else {
        show('Compte suspendu. Contactez le support.', 'error');
      }
    } catch (err: any) {
      show(err.message || 'Identifiants incorrects.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1C1C1C' }}>

      {/* Zone logo — fond sombre haut */}
      <div className="flex flex-col items-center justify-center pt-16 pb-12 px-6 safe-top">
        {/* Logo officiel sur fond blanc arrondi */}
        <div className="bg-white rounded-3xl px-8 py-4 shadow-pop mb-6 animate-scale-in">
          <img src="/logo.png" alt="MENUPRO Livraison" className="h-16 w-auto object-contain" />
        </div>
        <p className="text-white/50 text-sm font-medium tracking-wide">Espace Livreur</p>
      </div>

      {/* Card formulaire — blanc, coins ronds en haut */}
      <div
        className="flex-1 rounded-t-[2rem] px-6 pt-8 pb-10 flex flex-col"
        style={{ background: '#FFFFFF' }}
      >
        <h2 className="font-extrabold text-2xl mb-1" style={{ color: '#1C1C1C' }}>Connexion</h2>
        <p className="text-sm mb-8" style={{ color: '#A0A0A0' }}>
          Bienvenue ! Connectez-vous pour continuer.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
          {/* Champ téléphone */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#717171' }}>
              Numéro de téléphone
            </label>
            <div
              className="flex items-center gap-3 rounded-2xl px-4 h-14 border transition-all"
              style={{ background: '#F8F8F8', borderColor: phone ? '#FF6100' : '#E4E4E4' }}
            >
              <Phone size={18} style={{ color: '#A0A0A0' }} className="shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0701234567"
                className="flex-1 bg-transparent text-sm font-medium outline-none"
                style={{ color: '#1C1C1C' }}
              />
            </div>
          </div>

          {/* Champ mot de passe */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#717171' }}>
              Mot de passe
            </label>
            <div
              className="flex items-center gap-3 rounded-2xl px-4 h-14 border transition-all"
              style={{ background: '#F8F8F8', borderColor: password ? '#FF6100' : '#E4E4E4' }}
            >
              <Lock size={18} style={{ color: '#A0A0A0' }} className="shrink-0" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent text-sm font-medium outline-none"
                style={{ color: '#1C1C1C' }}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="tap shrink-0">
                {showPwd
                  ? <EyeOff size={18} style={{ color: '#A0A0A0' }} />
                  : <Eye size={18} style={{ color: '#A0A0A0' }} />}
              </button>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-4" />

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl font-bold text-white text-base tap disabled:opacity-60 flex items-center justify-center gap-2 gradient-flame shadow-pop"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Connexion en cours...
              </>
            ) : 'Se connecter →'}
          </button>

          {/* Lien inscription */}
          <p className="text-center text-sm mt-4" style={{ color: '#A0A0A0' }}>
            Pas encore livreur ?{' '}
            <button
              type="button"
              onClick={() => push({ name: 'register' })}
              className="font-bold tap"
              style={{ color: '#FF6100' }}
            >
              Rejoindre MENUPRO
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
