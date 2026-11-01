import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './assets/styles.css';
import { completeLogin, hasLoginResponse } from './lib/keycloak';
import { consumeUrlToken } from './lib/urlToken';

// Must run before the app reads the saved token.
consumeUrlToken();

// Pasting a new #token= link into an already-open tab only changes the fragment (no page load).
window.addEventListener('hashchange', () => {
  if (consumeUrlToken()) window.location.reload();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Coming back from the Keycloak login page: swap the code for a token before the app reads it.
const ready = hasLoginResponse() ? completeLogin() : Promise.resolve();
ready.finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
