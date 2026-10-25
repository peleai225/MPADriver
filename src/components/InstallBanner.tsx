import { useState } from 'react';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { useInstallMode, promptInstall, dismissInstall } from '../lib/install';

/**
 * Bandeau discret « Installer l'app », affiché au-dessus de la barre de navigation.
 * Android : ouvre la boîte d'installation du système. iPhone : explique la marche à suivre.
 * « Plus tard » le masque 30 jours.
 */
export function InstallBanner() {
  const mode = useInstallMode();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (mode === 'none') return null;

  return (
    <div className="fixed inset-x-0 z-[45] px-3 pointer-events-none" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-card border border-border shadow-elevated animate-fade-up">
        <div className="flex items-center gap-3 pl-3 pr-1 py-2">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl border border-border shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-foreground leading-tight">Installer l'app</p>
            <p className="text-xs text-muted-foreground leading-tight">Accès direct, alertes de courses, plein écran</p>
          </div>
          <button
            onClick={() => (mode === 'prompt' ? promptInstall() : setShowIosHelp(v => !v))}
            className="min-h-12 px-4 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm tap shrink-0"
          >
            {mode === 'prompt' ? 'Installer' : 'Comment ?'}
          </button>
          <button
            onClick={dismissInstall}
            aria-label="Plus tard"
            className="w-12 h-12 flex items-center justify-center rounded-xl tap shrink-0"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {mode === 'ios' && showIosHelp && (
          <ol className="px-4 pb-3 space-y-2 text-sm text-foreground border-t border-border pt-3">
            <li className="flex items-center gap-2">
              <Share size={16} className="text-info-600 shrink-0" />
              Touchez <strong>Partager</strong> en bas de Safari
            </li>
            <li className="flex items-center gap-2">
              <PlusSquare size={16} className="text-info-600 shrink-0" />
              Choisissez <strong>Sur l'écran d'accueil</strong>
            </li>
            <li className="flex items-center gap-2">
              <Smartphone size={16} className="text-info-600 shrink-0" />
              Ouvrez MENUPRO Livreur depuis l'icône
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
