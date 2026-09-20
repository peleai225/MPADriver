import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badgeCount?: number;
  onBellPress?: () => void;
  className?: string;
}

export function PageHeader({ title, subtitle, badgeCount = 0, onBellPress, className }: PageHeaderProps) {
  return (
    <div className={cn('px-5 pt-safe pt-5 pb-3 flex items-start justify-between', className)}>
      <div className="min-w-0 flex-1 mr-3">
        <h1 className="font-extrabold text-3xl leading-tight text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm mt-0.5 text-ink-400">{subtitle}</p>}
      </div>

      <div className="relative shrink-0 mt-0.5">
        <button
          onClick={onBellPress}
          className="w-11 h-11 rounded-full bg-white flex items-center justify-center tap"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
        >
          <Bell size={20} className="text-ink-900" />
        </button>
        {badgeCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full border-2 border-white bg-flame flex items-center justify-center">
            {badgeCount > 1 && (
              <span className="text-[9px] font-extrabold text-white px-0.5">{badgeCount > 9 ? '9+' : badgeCount}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
