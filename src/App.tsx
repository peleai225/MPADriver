import { AuthProvider, useAuth } from './lib/auth';
import { NavProvider, useNav } from './lib/nav';
import { ToastProvider } from './lib/toast';
import { ErrorBoundary } from './components/ErrorBoundary';

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

function Router() {
  const { driver, loading } = useAuth();
  const { stack } = useNav();
  const current = stack[stack.length - 1];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!driver) {
    if (current.name === 'register') return <RegisterPage />;
    return <LoginPage />;
  }

  if (driver.verification_status === 'pending' || driver.verification_status === 'rejected') {
    return <PendingPage />;
  }

  const showBottomNav = !['login', 'register', 'pending', 'active-delivery', 'edit-profile'].includes(current.name);

  return (
    <div className="min-h-screen bg-ink-50">
      <ErrorBoundary>
        {current.name === 'dashboard'       && <DashboardPage />}
        {current.name === 'deliveries'      && <DeliveriesPage />}
        {current.name === 'active-delivery' && <ActiveDeliveryPage />}
        {current.name === 'earnings'        && <EarningsPage />}
        {current.name === 'profile'         && <ProfilePage />}
        {current.name === 'edit-profile'    && <EditProfilePage />}
      </ErrorBoundary>
      {showBottomNav && <BottomNav />}
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
