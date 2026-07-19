import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  dark?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, dark = false, type, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-500">
              {leftIcon}
            </span>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              'w-full h-13 rounded-2xl px-4 text-sm transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand-500',
              dark
                ? 'bg-white/10 border border-white/10 text-white placeholder:text-ink-500'
                : 'bg-white border border-ink-200 text-ink-900 placeholder:text-ink-400 shadow-sm',
              leftIcon  && 'pl-11',
              rightIcon && 'pr-11',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500">
              {rightIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'w-full h-12 rounded-2xl px-4 text-sm transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-brand-500',
          dark
            ? 'bg-white/10 border border-white/10 text-white placeholder:text-ink-500'
            : 'bg-white border border-ink-200 text-ink-900 placeholder:text-ink-400 shadow-sm',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
