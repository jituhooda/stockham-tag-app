import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Logo } from '../components/ui';
import {
  AndroidDialogArt, ChromeInstallItemArt, ChromeMenuArt, HomeScreenArt, IosAddDialogArt, OpenBrowserArt, SafariMenuArt, ShareSheetArt,
} from '../components/InstallArt';

// VITE_PUBLIC_URL lets you show the right QR even when this page is opened on localhost.
const baseUrl = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '');
const installUrl = `${baseUrl}/install`;
const host = baseUrl.replace(/^https?:\/\//, '');

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const detectPlatform = () => (/android/i.test(navigator.userAgent) ? 'android' : 'ios');

const steps = {
  ios: [
    { art: <OpenBrowserArt browser="safari" host={host} />, title: 'Open this page in Safari', text: 'Using WhatsApp, Messages or email? Tap the link, then choose Open in Safari (the compass icon). Installing only works from Safari.' },
    { art: <SafariMenuArt host={host} />, title: 'Tap ••• (or the Share button)', text: 'It is at the bottom right of Safari. On older iPhones it is the square with an arrow pointing up.' },
    { art: <ShareSheetArt />, title: 'Choose Add to Home Screen', text: 'If you do not see it, choose Share first, then scroll down the list.' },
    { art: <IosAddDialogArt />, title: 'Keep “Open as Web App” on, tap Add', text: 'The switch makes it open full-screen like a normal app.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon. From now on, open the app from there, not from Safari.' },
  ],
  android: [
    { art: <OpenBrowserArt browser="chrome" host={host} />, title: 'Open this page in Chrome', text: 'Using WhatsApp or email? Tap the link, then open it in Chrome.' },
    { art: <ChromeMenuArt host={host} />, title: 'Tap the ⋮ menu', text: 'Top right corner of Chrome.' },
    { art: <ChromeInstallItemArt />, title: 'Tap Install app', text: 'If you only see Add to Home screen, tap that instead.' },
    { art: <AndroidDialogArt />, title: 'Tap Install', text: 'Chrome adds Stockham Tags to your Home Screen and app list.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon.' },
  ],
};

/** Public page (no sign-in): QR code, share link and illustrated install steps for iPhone and Android. */
export function InstallPage() {
  const [platform, setPlatform] = useState(detectPlatform);
  const [qr, setQr] = useState('');
  const [prompt, setPrompt] = useState(null);
  const [copied, setCopied] = useState(false);
  const installed = isStandalone();

  useEffect(() => {
    document.documentElement.classList.add('install-page');
    return () => document.documentElement.classList.remove('install-page');
  }, []);

  useEffect(() => {
    QRCode.toDataURL(installUrl, { width: 360, margin: 1, color: { dark: '#24304f', light: '#ffffff' } }).then(setQr).catch(() => {});
  }, []);

  // Chrome on Android can install straight from a button.
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Stockham Tags', text: 'Install the Stockham Tags app', url: installUrl }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(installUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const installNow = async () => {
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  return (
    <div className="install">
      <div className="install__wrap">
        <aside className="install__side">
        <header className="install__head">
          <Logo className="install__logo" />
          <h1>Get the Stockham Tags app</h1>
          <p className="muted">Add it to your phone’s Home Screen. No App Store needed.</p>
        </header>

        {installed ? (
          <section className="install__card center">
            <h2>You’re already using the app ✓</h2>
            <p className="muted">Share it with a teammate with the QR code or link below.</p>
          </section>
        ) : (
          prompt && (
            <section className="install__card center">
              <button className="btn btn--dark btn--block" onClick={installNow}>Install app</button>
            </section>
          )
        )}

        <section className="install__card install__share">
          {qr && <img className="install__qr" src={qr} alt={`QR code for ${installUrl}`} width="180" height="180" />}
          <div className="install__share-text">
            <h2>Scan with your phone’s camera</h2>
            <p className="muted small">Or send the link:</p>
            <code className="install__link">{installUrl}</code>
            <button className="btn btn--outline" onClick={share}>{copied ? 'Link copied ✓' : 'Share link'}</button>
          </div>
        </section>
        </aside>

        <main className="install__main">
        <div className="install__tabs" role="tablist" aria-label="Phone type">
          {[['ios', 'iPhone'], ['android', 'Android']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={platform === id} className={platform === id ? 'is-active' : ''} onClick={() => setPlatform(id)}>{label}</button>
          ))}
        </div>

        <ol className="install__steps">
          {steps[platform].map((s, i) => (
            <li key={s.title} className="install__step">
              <div className="install__num">{i + 1}</div>
              <div className="install__step-body">
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
                {s.art}
              </div>
            </li>
          ))}
        </ol>

        <p className="muted small center">Need to remove it later? Press and hold the icon, then choose Remove App (iPhone) or Uninstall (Android).</p>
        </main>
      </div>
    </div>
  );
}
