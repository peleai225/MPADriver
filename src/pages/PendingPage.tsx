import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/nav';

const ORANGE = '#FF6100';

export function PendingPage() {
  const { logout } = useAuth();
  const { go } = useNav();

  const handleLogout = async () => { await logout(); go({ name: 'login' }); };
  const requestNotifications = async () => {
    if ('Notification' in window) await Notification.requestPermission();
  };

  const steps = [
    { done: true,  active: false, label: 'Dossier soumis',       icon: '📋' },
    { done: false, active: true,  label: 'Vérification en cours', icon: '🔍' },
    { done: false, active: false, label: 'Compte activé',         icon: '✅' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1C1C1C' }}>

      {/* Hero */}
      <div className="relative flex-none flex flex-col items-center justify-end px-6 pb-12 safe-top overflow-hidden" style={{ minHeight: '45vh' }}>
        {/* Bulles déco */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-6 right-4 w-28 h-28 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #FF6100, #FF3301)' }} />
          <div className="absolute top-16 right-20 w-14 h-14 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #FF6100, #FF3301)' }} />
          <div className="absolute bottom-16 left-8 w-10 h-10 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #FF8C00, #FF3301)' }} />
        </div>

        {/* Logo */}
        <div className="relative mb-6 bg-white rounded-2xl px-6 py-3 shadow-pop">
          <img src="/logo.png" alt="MENUPRO Livraison" className="h-10 object-contain" />
        </div>

        {/* Titre */}
        <div className="relative text-center">
          <p className="text-white/50 text-sm mb-1">Bienvenue chez</p>
          <h1 className="text-white font-extrabold text-3xl leading-tight">Dossier en<br/>vérification</h1>
        </div>
      </div>

      {/* Card blanche */}
      <div
        className="flex-1 rounded-t-[2.5rem] px-6 pt-8 pb-10 flex flex-col"
        style={{ background: '#FFFFFF', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
      >
        <p className="text-sm mb-6 text-center" style={{ color: '#717171' }}>
          Votre dossier a bien été reçu. L'équipe MENUPRO Livraison le vérifie sous{' '}
          <strong style={{ color: '#1C1C1C' }}>24 à 48h</strong>.
          Vous serez notifié dès la validation.
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              {/* Ligne verticale */}
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{
                    background: s.done ? '#F0FDF4' : s.active ? 'rgba(255,97,0,0.1)' : '#F8F8F8',
                    border: s.active ? `2px solid ${ORANGE}` : s.done ? '2px solid #22C55E' : '2px solid #E4E4E4',
                  }}
                >
                  {s.done ? '✅' : s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 h-4 mt-1" style={{ background: s.done ? '#22C55E' : '#E4E4E4' }} />
                )}
              </div>
              <div>
                <p
                  className="text-sm font-bold"
                  style={{ color: s.done ? '#22C55E' : s.active ? '#1C1C1C' : '#A0A0A0' }}
                >
                  {s.label}
                </p>
                {s.active && (
                  <p className="text-xs" style={{ color: '#A0A0A0' }}>En cours de traitement…</p>
                )}
              </div>
              {s.active && (
                <div className="ml-auto">
                  <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: ORANGE }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={requestNotifications}
            className="w-full h-14 rounded-full font-bold text-white flex items-center justify-center gap-2 tap gradient-flame"
            style={{ boxShadow: '0 8px 24px rgba(255,97,0,.4)' }}
          >
            <Bell size={18} />
            Activer les notifications
          </button>
          <button
            onClick={handleLogout}
            className="w-full h-14 rounded-full font-semibold flex items-center justify-center gap-2 tap"
            style={{ background: '#F8F8F8', color: '#717171', border: '1px solid #E4E4E4' }}
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
