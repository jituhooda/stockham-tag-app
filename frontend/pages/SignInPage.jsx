import { useState } from 'react';
import { Logo } from '../components/ui';
import { useApp } from '../state/AppContext';

/** Asks for the user's eMachine access token; it is kept only in this browser. */
export function SignInPage() {
  const { signIn } = useApp();
  const [token, setToken] = useState('');

  return (
    <div className="signin">
      <form className="signin__card" onSubmit={(e) => { e.preventDefault(); signIn(token); }}>
        <Logo className="signin__logo" />
        <h1>Sign in</h1>
        <p className="muted">Paste your eMachine access token. It stays in this browser only.</p>
        <label className="field">
          <span className="field-label">Access token</span>
          <input className="input" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required />
        </label>
        <button className="btn btn--dark btn--block" disabled={!token.trim()}>Sign in</button>
      </form>
    </div>
  );
}
