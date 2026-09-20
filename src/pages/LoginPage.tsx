import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { useToast } from '../lib/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

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
    <div className="min-h-screen flex flex-col overflow-hidden bg-foreground">

      {/* ── HERO (55%) ── */}
      <div className="relative flex-none h-[55vh] flex flex-col justify-end px-6 pb-10 safe-top overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-6 right-4 w-32 h-32 rounded-full opacity-25 bg-primary" />
          <div className="absolute top-20 right-24 w-16 h-16 rounded-full opacity-15 bg-primary" />
          <div className="absolute top-10 left-1/2 w-10 h-10 rounded-full opacity-20 bg-primary" />
          <div className="absolute bottom-16 right-8 w-20 h-20 rounded-full opacity-10 bg-primary" />
          <div className="absolute top-1/3 left-6 w-8 h-8 rounded-full opacity-15 bg-primary" />
        </div>

        <div className="relative">
          <p className="text-white/60 text-base font-medium mb-1">Bonjour,</p>
          <h1 className="text-white font-extrabold text-4xl leading-tight">
            Connectez-<br/>vous !
          </h1>
        </div>
      </div>

      {/* ── CARD BLANCHE ── */}
      <div className="flex-1 rounded-t-[2.5rem] -mt-6 px-6 pt-8 pb-10 flex flex-col bg-card shadow-card">

        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="MENUPRO Livraison" className="h-12 object-contain" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-6">

          <div className="space-y-1.5">
            <Label htmlFor="login-phone">Téléphone</Label>
            <Input
              id="login-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0701234567"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Mot de passe</Label>
            <Input
              id="login-password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              rightIcon={
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPwd(v => !v)}>
                  {showPwd
                    ? <EyeOff size={18} className="text-muted-foreground" />
                    : <Eye size={18} className="text-muted-foreground" />}
                </Button>
              }
            />
          </div>

          <div className="flex-1" />

          <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full">
            {loading
              ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              : 'SE CONNECTER'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore livreur ?{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-bold"
              onClick={() => push({ name: 'register' })}
            >
              S'inscrire
            </Button>
          </p>
        </form>
      </div>
    </div>
  );
}
