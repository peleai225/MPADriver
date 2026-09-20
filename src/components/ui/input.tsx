import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, type, ...props }, ref) => {
    const base = cn(
      'w-full h-12 rounded-2xl px-4 text-sm bg-background border border-input text-foreground',
      'placeholder:text-muted-foreground shadow-sm transition-all duration-150',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      leftIcon  && 'pl-11',
      rightIcon && 'pr-11',
      className,
    );

    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              {leftIcon}
            </span>
          )}
          <input type={type} ref={ref} className={base} {...props} />
          {rightIcon && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </span>
          )}
        </div>
      );
    }

    return <input type={type} ref={ref} className={base} {...props} />;
  },
);
Input.displayName = 'Input';

export { Input };
