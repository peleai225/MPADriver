import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'bottom' | 'top' }
>(({ className, children, side = 'bottom', ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 bg-white shadow-xl focus:outline-none',
        side === 'bottom' && [
          'bottom-0 inset-x-0 rounded-t-3xl pb-[env(safe-area-inset-bottom,1rem)]',
          'data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down',
        ],
        side === 'top' && 'top-0 inset-x-0 rounded-b-3xl',
        className,
      )}
      {...props}
    >
      {side === 'bottom' && (
        <div className="mx-auto w-10 h-1 rounded-full bg-ink-200 mt-3 mb-1" />
      )}
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between px-6 pt-2 pb-4', className)} {...props} />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('font-bold text-ink-900 text-lg', className)} {...props} />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetCloseButton = () => (
  <SheetClose asChild>
    <button className="w-8 h-8 rounded-full bg-ink-100 grid place-items-center tap hover:bg-ink-200 transition-colors">
      <X size={16} className="text-ink-500" />
    </button>
  </SheetClose>
);

export {
  Sheet, SheetTrigger, SheetClose, SheetContent,
  SheetHeader, SheetTitle, SheetCloseButton,
};
