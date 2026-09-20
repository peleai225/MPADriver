import { Bell, LogOut, FileCheck, Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export function PendingPage() {
  const { logout } = useAuth();
  const { go } = useNav();

  const handleLogout = async () => { await logout(); go({ name: 'login' }); };
  const requestNotifications = async () => {
    if ('Notification' in window) await Notification.requestPermission();
  };

  const steps = [
    { done: true,  active: false, label: 'Dossier envoyé',       Icon: FileCheck },
    { done: false, active: true,  label: 'Vérification en cours', Icon: Search },
    { done: false, active: false, label: 'Compte activé',         Icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-foreground">

      {/* Hero */}
      <div className="relative flex-none flex flex-col items-center justify-end px-6 pb-12 safe-top overflow-hidden" style={{ minHeight: '45vh' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-6 right-4 w-28 h-28 rounded-full opacity-25 bg-primary" />
          <div className="absolute top-16 right-20 w-14 h-14 rounded-full opacity-15 bg-primary" />
          <div className="absolute bottom-16 left-8 w-10 h-10 rounded-full opacity-15 bg-primary" />
        </div>

        <div className="relative mb-6 bg-card rounded-2xl px-6 py-3 shadow-pop">
          <img src="/logo.png" alt="MENUPRO Livraison" className="h-10 object-contain" />
        </div>

        <div className="relative text-center">
          <p className="text-white/50 text-sm mb-1">Bienvenue chez</p>
          <h1 className="text-white font-extrabold text-3xl leading-tight">Dossier en<br/>vérification</h1>
        </div>
      </div>

      {/* Card blanche */}
      <div className="flex-1 rounded-t-[2.5rem] px-6 pt-8 pb-10 flex flex-col bg-card shadow-card">
        <p className="text-sm mb-6 text-center text-muted-foreground">
          Votre dossier a bien été reçu. L'equipe MENUPRO Livraison le vérifie sous{' '}
          <strong className="text-foreground">24 a 48h</strong>.
          Vous serez notifié dès la validation.
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  s.done ? 'bg-success-50 border-success-500'
                  : s.active ? 'bg-primary/10 border-primary'
                  : 'bg-muted border-border'
                }`}>
                  {s.done
                    ? <CheckCircle2 size={18} className="text-success-600" />
                    : <s.Icon size={18} className={s.active ? 'text-primary' : 'text-muted-foreground'} />
                  }
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 h-4 mt-1 ${s.done ? 'bg-success-500' : 'bg-border'}`} />
                )}
              </div>
              <div>
                <p className={`text-sm font-bold ${
                  s.done ? 'text-success-600' : s.active ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </p>
                {s.active && (
                  <p className="text-xs text-muted-foreground">En cours de traitement...</p>
                )}
              </div>
              {s.active && (
                <div className="ml-auto">
                  <Badge variant="default" dot pulse className="text-[10px]">En cours</Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="space-y-3">
          <Button onClick={requestNotifications} size="lg" className="w-full rounded-full">
            <Bell size={18} />
            Activer les notifications
          </Button>
          <Button variant="outline" size="lg" onClick={handleLogout} className="w-full rounded-full">
            <LogOut size={18} />
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
