import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { NavProvider, useNav } from './lib/nav';
import { ToastProvider } from './lib/toast';
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
