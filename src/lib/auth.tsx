import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Driver } from './types';
import { api, getDriver, getToken } from './api';

interface AuthCtx {
  driver: Driver | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<Driver>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setDriver: (d: Driver) => void;
}

const defaultCtx: AuthCtx = {
  driver: null,
  loading: true,
  login: async () => { throw new Error('AuthProvider missing'); },
  logout: async () => {},
  refresh: async () => {},
  setDriver: () => {},
};

const Ctx = createContext<AuthCtx>(defaultCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(() => getDriver());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.me()
      .then(d => setDriver(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (phone: string, password: string) => {
    const d = await api.login(phone, password);
    setDriver(d);
    return d;
  };

  const logout = async () => {
    await api.logout();
    setDriver(null);
  };

  const refresh = async () => {
    const d = await api.me();
    setDriver(d);
  };

  return (
    <Ctx.Provider value={{ driver, loading, login, logout, refresh, setDriver }}>
      {children}
    </Ctx.Provider>
  );
}
