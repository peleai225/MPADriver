import { Home, Package, Navigation, Wallet, User } from 'lucide-react';
import { useNav } from '../lib/nav';

function NavItem({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 tap relative"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.7}
        style={{ color: active ? '#FF6100' : '#888888' }}
      />
      <span
        className="text-[10px] font-semibold"
        style={{ color: active ? '#FF6100' : '#888888' }}
      >
        {label}
      </span>
      {active && (
        <span
          className="absolute bottom-0.5 w-1 h-1 rounded-full"
          style={{ background: '#FF6100' }}
        />
      )}
    </button>
  );
}

export function BottomNav() {
  const { tab, go } = useNav();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-100 pb-safe z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        <NavItem
          icon={Home}
          label="Accueil"
          active={tab === 'dashboard'}
          onClick={() => go({ name: 'dashboard' })}
        />
        <NavItem
          icon={Package}
          label="Courses"
          active={tab === 'deliveries'}
          onClick={() => go({ name: 'deliveries' })}
        />

        {/* FAB center */}
        <button
          onClick={() => go({ name: 'active-delivery' })}
          className="relative -mt-6 w-14 h-14 rounded-full flex items-center justify-center tap gradient-flame"
          style={{ boxShadow: '0 8px 24px rgba(255,97,0,.45)' }}
        >
          <Navigation size={26} className="text-white" />
        </button>

        <NavItem
          icon={Wallet}
          label="Gains"
          active={tab === 'earnings'}
          onClick={() => go({ name: 'earnings' })}
        />
        <NavItem
          icon={User}
          label="Profil"
          active={tab === 'profile'}
          onClick={() => go({ name: 'profile' })}
        />
      </div>
    </nav>
  );
}
