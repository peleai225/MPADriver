import { Clock, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { Button } from '../components/ui/button';

export function PendingPage() {
  const { logout } = useAuth();
  const { go } = useNav();

  const handleLogout = async () => {
    await logout();
    go({ name: 'login' });
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      await Notification.requestPermission();
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="mb-6 bg-white rounded-2xl px-4 py-2">
        <img src="/logo.png" alt="MenuPro Livraison" className="h-12 object-contain" />
      </div>

      {/* Icône animée */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-warning-500/10 border border-warning-500/20 grid place-items-center animate-pulse">
          <Clock size={40} className="text-warning-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-ink-950 grid place-items-center">
          <span className="w-4 h-4 rounded-full bg-warning-500 animate-ping absolute" />
          <span className="w-4 h-4 rounded-full bg-warning-500 relative" />
        </div>
      </div>

      <h1 className="text-white font-extrabold text-2xl mb-3">Dossier en vérification</h1>
      <p className="text-ink-400 text-sm leading-relaxed max-w-xs">
        Votre dossier a bien été reçu. L'équipe MenuPro le vérifie sous{' '}
        <strong className="text-white">24 à 48h</strong>.
        Vous serez notifié dès la validation.
      </p>

      {/* Steps */}
      <div className="mt-8 w-full max-w-xs space-y-3">
        {[
          { done: true,  label: 'Dossier soumis' },
          { done: false, label: 'Vérification en cours', active: true },
          { done: false, label: 'Compte activé' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full grid place-items-center shrink-0 text-xs font-bold transition-all ${
              s.done ? 'bg-success-500 text-white' : s.active ? 'bg-warning-500 text-white animate-pulse' : 'bg-white/10 text-ink-500'
            }`}>
              {s.done ? '✓' : i + 1}
            </div>
            <p className={`text-sm ${s.done ? 'text-success-400' : s.active ? 'text-white font-semibold' : 'text-ink-500'}`}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 w-full max-w-xs space-y-3">
        <Button onClick={requestNotifications} className="w-full h-12 gap-2">
          <Bell size={18} />
          Activer les notifications
        </Button>
        <Button onClick={handleLogout} variant="dark" className="w-full h-12 gap-2">
          <LogOut size={18} />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
