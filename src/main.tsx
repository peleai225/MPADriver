import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { installBadgeAutoClear } from './lib/badge';
// Importé tôt : l'événement beforeinstallprompt peut arriver avant le premier rendu React.
import './lib/install';
import { initPwa } from './lib/pwa';
import { startOutbox } from './lib/outbox';

// Efface le compteur de l'icône à l'ouverture et à chaque retour au premier plan.
installBadgeAutoClear();

// Service worker (cache hors ligne + push Firebase) et mises à jour sur demande.
initPwa();

// Rejoue les actions de course faites hors ligne dès que le réseau revient.
startOutbox();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
