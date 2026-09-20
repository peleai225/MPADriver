import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { NavProvider, useNav } from './lib/nav';
import { ToastProvider, useToast } from './lib/toast';
import { ErrorBoundary } from './components/ErrorBoundary';

import { OnboardingPage } from './pages/OnboardingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PendingPage } from './pages/PendingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { ActiveDeliveryPage } from './pages/ActiveDeliveryPage';
import { EarningsPage } from './pages/EarningsPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { BottomNav } from './components/BottomNav';
import { DeliveryRequestAlert } from './components/DeliveryRequestAlert';

function SplashScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-foreground">
      <div className="flex flex-col items-center gap-6">
        <img src="/logo.png" alt="MENUPRO" className="h-14 object-contain" />
        <div className="w-6 h-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );
}

function PwaUpdateBanner() {
  const [show, setShow] = useState(false);
  const { show: toast } = useToast();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const newSw = reg.installing;
        if (!newSw) return;
        newSw.addEventListener('statechange', () => {
          if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
            setShow(true);
          }
        });
      });
    });
  }, []);

  if (!show) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[200] safe-top">
      <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 shadow-elevated">
        <p className="flex-1 text-white text-sm font-semibold">Nouvelle version disponible</p>
        <button
          onClick={() => { toast('Mise à jour en cours...', 'info'); window.location.reload(); }}
          className="text-primary font-bold text-sm tap"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}

function Router() {
  const { driver, loading } = useAuth();
  const { stack } = useNav();
  const current = stack[stack.length - 1];
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('mpa_onboarded') === '1');

  if (loading) return <SplashScreen />;

  if (!driver) {
    if (!onboarded) {
      return <OnboardingPage onComplete={() => { localStorage.setItem('mpa_onboarded', '1'); setOnboarded(true); }} />;
    }
    if (current.name === 'register') return <RegisterPage />;
    return <LoginPage />;
  }

  if (driver.verification_status === 'pending' || driver.verification_status === 'rejected') {
    return <PendingPage />;
  }

  const showBottomNav = !['login', 'register', 'pending', 'active-delivery', 'edit-profile'].includes(current.name);

  return (
    <div className="min-h-screen" style={{ background: '#F8F6F5' }}>
      <ErrorBoundary>
        {current.name === 'dashboard'       && <DashboardPage />}
        {current.name === 'deliveries'      && <DeliveriesPage />}
        {current.name === 'active-delivery' && <ActiveDeliveryPage />}
        {current.name === 'earnings'        && <EarningsPage />}
        {current.name === 'profile'         && <ProfilePage />}
        {current.name === 'edit-profile'    && <EditProfilePage />}
      </ErrorBoundary>
      {showBottomNav && <BottomNav />}
      <DeliveryRequestAlert />
      <PwaUpdateBanner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavProvider>
        <ToastProvider>
          <Router />
        </ToastProvider>
      </NavProvider>
    </AuthProvider>
  );
}
