import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'deliveries' }
  | { name: 'active-delivery' }
  | { name: 'active-parcel' }
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

/**
 * Écran demandé par un clic sur une notification push (lien `/?open=deliveries`, `/?open=active-delivery`,
 * `/?open=dashboard` pour une course annulée, `/?open=parcels` pour une nouvelle course colis — les colis
 * disponibles sont listés avec les courses repas —, `/?open=active-parcel` pour le colis en cours).
 * Le paramètre est retiré de l'URL (quelle que soit sa valeur) pour ne pas rouvrir le même écran au rechargement.
 */
function initialRoute(): Route {
  try {
    const url = new URL(window.location.href);
    const open = url.searchParams.get('open');
    if (open) {
      url.searchParams.delete('open');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    if (open === 'deliveries' || open === 'parcels') return { name: 'deliveries' };
    if (open === 'active-parcel') return { name: 'active-parcel' };
    if (open === 'active-delivery') return { name: 'active-delivery' };
    if (open === 'dashboard') return { name: 'dashboard' };
    if (open === 'earnings') return { name: 'earnings' }; // raccourci « Mes gains » de l'icône
  } catch {}
  return { name: 'dashboard' };
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>(() => [initialRoute()]);
  const [tab, setTab] = useState<NavCtx['tab']>(() => {
    const first = stack[0]?.name;
    return first === 'deliveries' || first === 'earnings' ? first : 'dashboard';
  });

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

  // ── Bouton retour Android ──
  // La navigation de l'app n'utilise pas l'historique du navigateur : sans précaution, « retour »
  // fermait l'application. Une entrée « garde » est ajoutée dès qu'on quitte l'accueil ; le retour
  // la consomme et ramène à l'écran précédent (ou à l'accueil). À l'accueil, « retour » ferme l'app.
  const isRoot = stack.length === 1 && stack[0].name === 'dashboard';
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const guardRef = useRef(false);

  useEffect(() => {
    if (isRoot && guardRef.current) {
      // Revenu à l'accueil par un bouton de l'app : on retire la garde devenue inutile.
      guardRef.current = false;
      window.history.back();
    }
  }, [isRoot]);

  useEffect(() => {
    const onPop = () => {
      const wasGuarded = guardRef.current;
      guardRef.current = false;
      if (!wasGuarded) return;
      const s = stackRef.current;
      if (s.length > 1) setStack(s.slice(0, -1));
      else if (s[0]?.name !== 'dashboard') go({ name: 'dashboard' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [go]);

  // Hors de l'accueil (y compris après un retour qui n'y ramène pas) : une garde doit être en place.
  useEffect(() => {
    if (!isRoot && !guardRef.current) {
      window.history.pushState({ mpaGuard: true }, '');
      guardRef.current = true;
    }
  }, [stack, isRoot]);

  return (
    <Ctx.Provider value={{ stack, tab, push, replace, pop, go, setTab }}>
      {children}
    </Ctx.Provider>
  );
}
