import { LayoutDashboard, Truck, Wallet, User } from 'lucide-react';
import { useNav } from '../lib/nav';
import { cn } from '../lib/utils';

const TABS = [
  { name: 'dashboard'  as const, icon: LayoutDashboard, label: 'Accueil' },
  { name: 'deliveries' as const, icon: Truck,           label: 'Courses' },
  { name: 'earnings'   as const, icon: Wallet,          label: 'Gains'   },
  { name: 'profile'    as const, icon: User,            label: 'Profil'  },
];

export function BottomNav() {
  const { tab, go } = useNav();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-bottom">
      <div className="bg-white/95 backdrop-blur-md border-t border-ink-100 shadow-[0_-4px_24px_rgba(0,0,0,.07)]">
        <div className="max-w-md mx-auto flex px-2">
          {TABS.map(t => {
            const active = tab === t.name;
            return (
              <button
                key={t.name}
                onClick={() => go({ name: t.name })}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 tap relative"
              >
                {/* Pill indicateur actif */}
                {active && (
                  <span className="absolute top-1.5 inset-x-3 h-8 rounded-2xl bg-brand-50 -z-0 animate-fade-in" />
                )}
                <span className={cn(
                  'relative z-10 w-6 h-6 flex items-center justify-center transition-transform duration-200',
                  active && 'scale-110',
                )}>
                  <t.icon
                    size={22}
                    strokeWidth={active ? 2.5 : 1.7}
                    className={cn('transition-colors', active ? 'text-brand-500' : 'text-ink-400')}
                  />
                </span>
                <span className={cn(
                  'relative z-10 text-[10px] font-semibold transition-colors',
                  active ? 'text-brand-500' : 'text-ink-400',
                )}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
