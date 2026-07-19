import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[.96] active:opacity-90',
  {
    variants: {
      variant: {
        default:   'bg-brand-500 text-white shadow-pop hover:bg-brand-600',
        secondary: 'bg-ink-100 text-ink-700 hover:bg-ink-200',
        outline:   'border-2 border-ink-200 text-ink-700 bg-transparent hover:bg-ink-50',
        ghost:     'text-ink-600 hover:bg-ink-100',
        danger:    'bg-danger-50 text-danger-600 hover:bg-danger-100',
        dark:      'bg-white/10 text-white hover:bg-white/20',
        success:   'bg-success-500 text-white hover:bg-success-600',
      },
      size: {
        default: 'h-13 px-5',
        sm:      'h-9 px-4 text-xs',
        lg:      'h-14 px-7 text-base',
        icon:    'h-10 w-10',
        pill:    'h-9 px-4 rounded-full text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
