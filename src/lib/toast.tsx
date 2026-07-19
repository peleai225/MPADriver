import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }
interface ToastCtx { show: (message: string, type?: ToastType) => void; }

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-3 safe-top pointer-events-none">
        {toasts.map(t => {
          const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;
          const color = t.type === 'success' ? 'text-success-600 bg-success-50' : t.type === 'error' ? 'text-danger-600 bg-danger-50' : 'text-info-600 bg-info-50';
          return (
            <div key={t.id} className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-card max-w-sm w-full ${color} sheet-enter`}>
              <Icon size={18} className="shrink-0" />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => remove(t.id)} className="opacity-50 tap"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
