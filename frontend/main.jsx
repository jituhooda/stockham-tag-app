import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './assets/styles.css';
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
