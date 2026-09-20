import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[.96]',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground shadow-pop hover:bg-primary/90 active:bg-primary/80',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline:     'border-2 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost:       'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        dark:        'bg-foreground text-background hover:bg-foreground/90',
        muted:       'bg-muted text-muted-foreground hover:bg-muted/80',
        link:        'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-13 px-5',
        sm:      'h-9 px-4 text-xs rounded-xl',
        lg:      'h-14 px-7 text-base rounded-3xl',
        icon:    'h-10 w-10 rounded-full',
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
