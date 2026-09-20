import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
  {
    variants: {
      variant: {
        default:     'bg-primary/10 text-primary',
        secondary:   'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline:     'border border-border text-foreground',
        success:     'bg-success-50 text-success-700',
        warning:     'bg-warning-50 text-warning-700',
        muted:       'bg-muted text-muted-foreground',
        dark:        'bg-foreground/10 text-foreground',
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
          variant === 'success'     && 'bg-success-500',
          variant === 'warning'     && 'bg-warning-500',
          variant === 'destructive' && 'bg-destructive',
          variant === 'dark'        && 'bg-foreground/60',
          (!variant || variant === 'default') && 'bg-primary',
          variant === 'muted'       && 'bg-muted-foreground',
        )} />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
