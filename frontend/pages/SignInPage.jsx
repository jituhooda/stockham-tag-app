import { useState } from 'react';
import { Logo } from '../components/ui';
import { keycloakEnabled, startLogin, takeLoginError } from '../lib/keycloak';
import { useApp } from '../state/AppContext';

/** Sign in through Keycloak. Pasting a token is offered only if Keycloak isn't configured (auth in integrations.config.json). */
export function SignInPage() {
  const { signIn } = useApp();
  const [token, setToken] = useState('');
  const [error] = useState(takeLoginError);
  const [busy, setBusy] = useState(false);
  const paste = !keycloakEnabled();

  const login = async () => {
    setBusy(true);
    try {
      await startLogin();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="signin">
      <form className="signin__card" onSubmit={(e) => { e.preventDefault(); if (paste) signIn(token); else login(); }}>
        <Logo className="signin__logo" />
        <h1>Sign in</h1>
        {error && <p className="banner banner--error" role="alert">{error}</p>}
        {paste ? (
          <>
            <p className="muted">Paste your eMachine access token. It stays in this browser only.</p>
            <label className="field">
              <span className="field-label">Access token</span>
              <input className="input" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required />
            </label>
            <button className="btn btn--dark btn--block" disabled={!token.trim()}>Sign in</button>
          </>
        ) : (
          <>
            <p className="muted">Sign in with your Stockham account.</p>
            <button className="btn btn--dark btn--block" disabled={busy}>{busy ? 'Opening…' : 'Sign in'}</button>
          </>
        )}
      </form>
    </div>
  );
}
