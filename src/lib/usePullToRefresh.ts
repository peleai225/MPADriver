import { useRef, useEffect, useCallback } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>, enabled = true) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const indicatorRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || refreshing.current) return;
    if (window.scrollY > 5) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) { pulling.current = false; return; }
    const progress = Math.min(dy / 120, 1);
    if (indicatorRef.current) {
      indicatorRef.current.style.opacity = String(progress);
      indicatorRef.current.style.transform = `translateY(${Math.min(dy * 0.4, 50)}px) rotate(${progress * 360}deg)`;
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshing.current) return;
    pulling.current = false;
    const indicator = indicatorRef.current;
    if (!indicator) return;

    const opacity = parseFloat(indicator.style.opacity || '0');
    if (opacity >= 0.9) {
      refreshing.current = true;
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(40px)';
      indicator.classList.add('animate-spin');
      try { await onRefresh(); } catch {}
      indicator.classList.remove('animate-spin');
      refreshing.current = false;
    }
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(0)';
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return indicatorRef;
}
