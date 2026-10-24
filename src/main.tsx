import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { installBadgeAutoClear } from './lib/badge';

// Efface le compteur de l'icône à l'ouverture et à chaque retour au premier plan.
installBadgeAutoClear();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
