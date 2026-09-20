import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Truck, MapPin, Wallet, Bell } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const SLIDES = [
  {
    Icon: Truck,
    bg: 'bg-primary/10',
    color: 'text-primary',
    title: 'Livrez avec MENUPRO',
    desc: 'Acceptez des courses, récupérez les commandes et livrez aux clients en toute simplicité.',
  },
  {
    Icon: MapPin,
    bg: 'bg-success-50',
    color: 'text-success-600',
    title: 'Navigation intégrée',
    desc: 'Google Maps s\'ouvre automatiquement pour vous guider vers le restaurant puis vers le client.',
  },
  {
    Icon: Wallet,
    bg: 'bg-warning-50',
    color: 'text-warning-600',
    title: 'Gagnez à chaque course',
    desc: 'Suivez vos gains en temps réel et demandez un virement directement depuis l\'application.',
  },
  {
    Icon: Bell,
    bg: 'bg-info-50',
    color: 'text-info-600',
    title: 'Alertes instantanées',
    desc: 'Recevez une notification sonore dès qu\'une nouvelle course est disponible près de vous.',
  },
];

interface OnboardingPageProps {
  onComplete: () => void;
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [current, setCurrent] = useState(0);
  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent(c => c + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-foreground overflow-hidden">

      {/* Hero zone */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 safe-top">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-8 right-6 w-24 h-24 rounded-full opacity-20 bg-primary" />
          <div className="absolute bottom-16 left-4 w-16 h-16 rounded-full opacity-15 bg-primary" />
          <div className="absolute top-1/3 left-1/2 w-10 h-10 rounded-full opacity-10 bg-primary" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col items-center text-center"
          >
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 ${slide.bg}`}>
              <slide.Icon size={44} strokeWidth={1.8} className={slide.color} />
            </div>
            <h1 className="text-white font-extrabold text-2xl leading-tight mb-3 max-w-xs">
              {slide.title}
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom card */}
      <div className="rounded-t-[2.5rem] px-6 pt-6 pb-10 bg-card shadow-card safe-bottom">

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === current ? 'w-8 bg-primary' : 'w-2 bg-border',
              )}
            />
          ))}
        </div>

        <Button onClick={next} size="lg" className="w-full rounded-full max-w-md mx-auto">
          {isLast ? 'Commencer' : <>Suivant <ChevronRight size={18} /></>}
        </Button>

        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full text-center text-sm font-medium text-muted-foreground mt-3 tap"
          >
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
