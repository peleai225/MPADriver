import { Home, Package, Navigation, Wallet, User } from 'lucide-react';
import { useNav } from '../lib/nav';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { tab, go } = useNav();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom bg-card border-t border-border shadow-soft">
      <div className="flex items-end justify-around px-2 pb-1 h-[68px]">

        <NavItem icon={Home}    label="Accueil" active={tab === 'dashboard'}  onClick={() => go({ name: 'dashboard' })} />
        <NavItem icon={Package} label="Courses" active={tab === 'deliveries'} onClick={() => go({ name: 'deliveries' })} />

        {/* FAB central */}
        <button
          onClick={() => go({ name: 'active-delivery' })}
          className="tap flex items-center justify-center rounded-full -mt-6 gradient-brand shadow-pop"
          style={{ width: '58px', height: '58px' }}
        >
          <Navigation size={26} strokeWidth={2.2} className="text-white" />
        </button>

        <NavItem icon={Wallet} label="Gains"  active={tab === 'earnings'} onClick={() => go({ name: 'earnings' })} />
        <NavItem icon={User}   label="Profil"  active={tab === 'profile'} onClick={() => go({ name: 'profile' })} />
      </div>
    </nav>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 tap flex-1 h-full pt-2 relative"
    >
      {active && (
        <span className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-8 rounded-2xl bg-primary/8" />
      )}
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.7}
        className={cn('relative z-10 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
      />
      <span className={cn('text-[10px] font-semibold transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
        {label}
      </span>
    </button>
  );
}
