import { useState } from 'react';
import { Logo } from '../components/ui';
import { useApp } from '../state/AppContext';

/** Shown when the backend runs with authMode "token" and we have no valid token. */
export function SignInPage() {
  const { signIn, status } = useApp();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    await signIn(token);
    setBusy(false);
    setFailed(true); // if sign-in worked this page is already gone
  };

  return (
    <div className="signin">
      <form className="signin__card" onSubmit={submit}>
        <Logo className="signin__logo" />
        <h1>Sign in</h1>
        <p className="muted">Enter the access token your administrator gave you.</p>
        <label className="field">
          <span className="field-label">Access token</span>
          <input className="input" type="password" autoComplete="current-password" value={token} onChange={(e) => setToken(e.target.value)} required />
        </label>
        {failed && status === 'signed-out' && <p className="error-text">That token wasn’t accepted.</p>}
        <button className="btn btn--dark btn--block" disabled={busy || !token.trim()}>{busy ? 'Checking…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
