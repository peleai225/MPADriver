import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Driver } from './types';
import { api, clearAuth, getDriver, getToken, setAuth } from './api';

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
      .catch((err: any) => {
        // Purger seulement si le token n'a pas été remplacé par un login entretemps
        if (err?.status === 401 && getToken() === token) {
          clearAuth();
          setDriver(null);
        }
      })
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
    // Persister dans localStorage pour survivre au reload
    if (getToken()) setAuth(getToken()!, d);
    setDriver(d);
  };

  // setDriver persistant — met à jour React state ET localStorage
  const persistDriver = (d: Driver) => {
    if (getToken()) setAuth(getToken()!, d);
    setDriver(d);
  };

  return (
    <Ctx.Provider value={{ driver, loading, login, logout, refresh, setDriver: persistDriver }}>
      {children}
    </Ctx.Provider>
  );
}
