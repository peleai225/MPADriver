import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
  {
    variants: {
      variant: {
        default:  'bg-brand-100 text-brand-700',
        success:  'bg-success-50 text-success-700',
        warning:  'bg-warning-50 text-warning-700',
        danger:   'bg-danger-50 text-danger-700',
        muted:    'bg-ink-100 text-ink-600',
        dark:     'bg-brand-500/20 text-brand-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

function Badge({ className, variant, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          pulse && 'animate-pulse',
          variant === 'success' && 'bg-success-500',
          variant === 'warning' && 'bg-warning-500',
          variant === 'danger'  && 'bg-danger-500',
          variant === 'dark'    && 'bg-brand-400',
          (!variant || variant === 'default') && 'bg-brand-500',
          variant === 'muted'   && 'bg-ink-400',
        )} />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
