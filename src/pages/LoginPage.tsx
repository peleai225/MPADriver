import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: '#1C1C1C' }}>

      {/* ── HERO (60%) ── */}
      <div className="relative flex-none h-[55vh] flex flex-col justify-end px-6 pb-10 safe-top overflow-hidden">

        {/* Bulles déco */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-6 right-4 w-32 h-32 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #FF6100, #FF3301)' }} />
          <div className="absolute top-20 right-24 w-16 h-16 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #FF6100, #FF3301)' }} />
          <div className="absolute top-10 left-1/2 w-10 h-10 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FF8C00, #FF3301)' }} />
          <div className="absolute bottom-16 right-8 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #FF6100, transparent)' }} />
          <div className="absolute top-1/3 left-6 w-8 h-8 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #FF6100, #FF3301)' }} />
        </div>

        {/* Titre */}
        <div className="relative">
          <p className="text-white/60 text-base font-medium mb-1">Bonjour,</p>
          <h1 className="text-white font-extrabold text-4xl leading-tight">
            Connectez-<br/>vous !
          </h1>
        </div>
      </div>

      {/* ── CARD BLANCHE (remonte sur le hero) ── */}
      <div
        className="flex-1 rounded-t-[2.5rem] -mt-6 px-6 pt-8 pb-10 flex flex-col"
        style={{ background: '#FFFFFF', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="MENUPRO Livraison" className="h-12 object-contain" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-6">

          {/* Champ téléphone */}
          <UnderlineField
            label="Téléphone"
            value={phone}
            placeholder="0701234567"
            type="tel"
            onChange={setPhone}
          />

          {/* Champ mot de passe */}
          <UnderlineField
            label="Mot de passe"
            value={password}
            placeholder="••••••••"
            type={showPwd ? 'text' : 'password'}
            onChange={setPassword}
            right={
              <button type="button" onClick={() => setShowPwd(v => !v)} className="tap">
                {showPwd
                  ? <EyeOff size={18} style={{ color: '#A0A0A0' }} />
                  : <Eye size={18} style={{ color: '#A0A0A0' }} />}
              </button>
            }
          />

          <div className="flex-1" />

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-full font-bold text-white text-base tap disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FF3301, #FF6100)', boxShadow: '0 8px 24px rgba(255,97,0,.4)' }}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : 'SE CONNECTER'}
          </button>

          {/* Lien inscription */}
          <p className="text-center text-sm" style={{ color: '#A0A0A0' }}>
            Pas encore livreur ?{' '}
            <button
              type="button"
              onClick={() => push({ name: 'register' })}
              className="font-bold tap"
              style={{ color: '#FF3301' }}
            >
              S'inscrire
            </button>
          </p>
        </form>
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
