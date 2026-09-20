import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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
        <h1 className="font-extrabold text-3xl leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm mt-0.5 text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="relative shrink-0 mt-0.5">
        <Button
          variant="outline"
          size="icon"
          onClick={onBellPress}
          className="rounded-full h-11 w-11 shadow-soft"
        >
          <Bell size={20} className="text-foreground" />
        </Button>
        {badgeCount > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] p-0 justify-center text-[9px] border-2 border-card">
            {badgeCount > 9 ? '9+' : badgeCount}
          </Badge>
        )}
      </div>
    </div>
  );
}
