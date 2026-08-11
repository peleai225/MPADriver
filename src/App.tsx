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

function SplashScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: '#1C1C1C' }}
    >
      {/* Logo centré */}
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className="bg-white rounded-3xl px-8 py-5 shadow-pop">
          <img src="/logo.png" alt="MENUPRO Livraison" className="h-20 w-auto object-contain" />
        </div>

        {/* Tagline */}
        <p className="text-white/40 text-sm font-medium tracking-wide">
          Espace Livreur
        </p>

        {/* Spinner */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-flame animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-flame animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-flame animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Version en bas */}
      <p className="absolute bottom-8 text-white/20 text-xs">MENUPRO Livraison</p>
    </div>
  );
}

function Router() {
  const { driver, loading } = useAuth();
  const { stack } = useNav();
  const current = stack[stack.length - 1];

  if (loading) return <SplashScreen />;

  if (!driver) {
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
