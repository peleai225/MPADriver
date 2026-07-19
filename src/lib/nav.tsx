import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'deliveries' }
  | { name: 'active-delivery' }
  | { name: 'earnings' }
  | { name: 'profile' }
  | { name: 'edit-profile' }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'pending' };

interface NavCtx {
  stack: Route[];
  tab: 'dashboard' | 'deliveries' | 'earnings' | 'profile';
  push: (r: Route) => void;
  replace: (r: Route) => void;
  pop: () => void;
  go: (r: Route) => void;
  setTab: (t: NavCtx['tab']) => void;
}

const noop = () => {};
const Ctx = createContext<NavCtx>({
  stack: [{ name: 'dashboard' }], tab: 'dashboard',
  push: noop, replace: noop, pop: noop, go: noop, setTab: noop,
});
export const useNav = () => useContext(Ctx);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'dashboard' }]);
  const [tab, setTab] = useState<NavCtx['tab']>('dashboard');

  const push    = useCallback((r: Route) => setStack(s => [...s, r]), []);
  const replace = useCallback((r: Route) => setStack(s => [...s.slice(0, -1), r]), []);
  const pop     = useCallback(() => setStack(s => s.length > 1 ? s.slice(0, -1) : s), []);
  const go      = useCallback((r: Route) => {
    setStack([r]);
    if (r.name === 'dashboard') setTab('dashboard');
    else if (r.name === 'deliveries') setTab('deliveries');
    else if (r.name === 'earnings') setTab('earnings');
    else if (r.name === 'profile') setTab('profile');
  }, []);

  return (
    <Ctx.Provider value={{ stack, tab, push, replace, pop, go, setTab }}>
      {children}
    </Ctx.Provider>
  );
}
