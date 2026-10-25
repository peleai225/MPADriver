import { useState } from 'react';
import { MapPinOff, ChevronDown, RefreshCw } from 'lucide-react';
import { useGeoState, restartTracking } from '../lib/geo';

/**
 * Explique au livreur pourquoi sa position n'est pas transmise et comment corriger,
 * en termes simples (Android d'entrée de gamme : Chrome, Tecno / Infinix / Itel).
 */
export function GeoNotice() {
  const state = useGeoState();
  const [open, setOpen] = useState(false);

  if (state !== 'denied' && state !== 'unavailable' && state !== 'unsupported') return null;

  const title =
    state === 'denied' ? 'Localisation bloquée'
    : state === 'unavailable' ? 'GPS désactivé ou sans signal'
    : 'Localisation non disponible';

  const body =
    state === 'denied'
      ? 'Le client et le restaurant ne voient pas où vous êtes. Autorisez la position pour MENUPRO.'
      : state === 'unavailable'
        ? 'Activez « Localisation » dans les réglages rapides (glissez depuis le haut de l\'écran).'
        : 'Ce navigateur ne permet pas la localisation. Utilisez Google Chrome.';

  return (
    <div role="alert" className="rounded-2xl border-2 border-danger-600 bg-danger-50 overflow-hidden">
      <div className="flex items-start gap-3 p-3.5">
        <div className="w-10 h-10 rounded-xl bg-danger-600 flex items-center justify-center shrink-0">
          <MapPinOff size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm text-danger-700">{title}</p>
          <p className="text-sm text-foreground mt-0.5">{body}</p>
        </div>
      </div>

      {state === 'denied' && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full min-h-12 px-4 flex items-center justify-between border-t border-danger-200 text-sm font-bold text-danger-700"
          >
            Comment l'autoriser ?
            <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <ol className="px-4 pb-3 space-y-1.5 text-sm text-foreground list-decimal list-inside">
              <li><strong>App installée</strong> : appui long sur l'icône MENUPRO → <strong>Infos sur l'appli</strong> → <strong>Autorisations</strong> → <strong>Position</strong> → <strong>Autoriser</strong>.</li>
              <li><strong>Dans Chrome</strong> : touchez le cadenas à gauche de l'adresse → <strong>Autorisations</strong> → <strong>Position</strong> → <strong>Autoriser</strong>.</li>
              <li>Vérifiez aussi que <strong>Localisation</strong> est activée dans les réglages rapides du téléphone.</li>
            </ol>
          )}
        </>
      )}

      {state !== 'unsupported' && (
        <button
          onClick={restartTracking}
          className="w-full min-h-12 flex items-center justify-center gap-2 bg-danger-600 text-white text-sm font-extrabold tap"
        >
          <RefreshCw size={16} /> Réessayer
        </button>
      )}
    </div>
  );
}
