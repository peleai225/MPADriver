import { Home, Package, Navigation, Wallet, User } from 'lucide-react';
import { useNav } from '../lib/nav';

export function BottomNav() {
  const { tab, go } = useNav();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{ background: '#FFFFFF', borderTop: '1px solid #F1F1F1', boxShadow: '0 -4px 24px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-end justify-around px-2 pb-1" style={{ height: '68px' }}>

        <NavItem icon={Home}    label="Accueil"  active={tab === 'dashboard'}  onClick={() => go({ name: 'dashboard' })} />
        <NavItem icon={Package} label="Courses"  active={tab === 'deliveries'} onClick={() => go({ name: 'deliveries' })} />

        {/* FAB central — navigation active delivery */}
        <button
          onClick={() => go({ name: 'active-delivery' })}
          className="tap flex items-center justify-center rounded-full -mt-6"
          style={{
            width: '58px',
            height: '58px',
            background: 'linear-gradient(135deg, #FF3301, #FF6100)',
            boxShadow: '0 8px 28px rgba(255,97,0,.55)',
          }}
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
      className="flex flex-col items-center justify-center gap-1 tap flex-1 h-full pt-2"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.7}
        style={{ color: active ? '#FF6100' : '#CBCBCB' }}
      />
      <span
        className="text-[10px] font-semibold"
        style={{ color: active ? '#FF6100' : '#CBCBCB' }}
      >
        {label}
      </span>
    </button>
  );
}
