import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Logo } from '../components/ui';
import { browser, isStandalone, platform } from '../lib/platform';
import {
  AndroidDialogArt, ChromeInstallItemArt, ChromeMenuArt, HomeScreenArt, IosAddDialogArt, OpenBrowserArt, SafariMenuArt, ShareSheetArt,
} from '../components/InstallArt';

// VITE_PUBLIC_URL lets you show the right QR even when this page is opened on localhost.
const baseUrl = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '');
const installUrl = `${baseUrl}/install`;
const host = baseUrl.replace(/^https?:\/\//, '');

const detectPlatform = () => (platform() === 'android' ? 'android' : 'ios');

// The install steps differ per phone and browser, so the page picks the one it detects
// and lets the user switch (the person may be reading it on a laptop for a phone).
const BROWSERS = {
  ios: [['ios-safari', 'Safari'], ['ios-chrome', 'Chrome'], ['ios-other', 'Other']],
  android: [['android-chrome', 'Chrome'], ['android-samsung', 'Samsung'], ['android-firefox', 'Firefox'], ['android-other', 'Other']],
};
const DEFAULT_KEY = { ios: 'ios-safari', android: 'android-chrome' };

function detectKey() {
  const p = platform();
  const b = browser();
  if (p === 'android') return { chrome: 'android-chrome', samsung: 'android-samsung', firefox: 'android-firefox' }[b] || 'android-other';
  if (p === 'ios') return { safari: 'ios-safari', chrome: 'ios-chrome' }[b] || 'ios-other';
  return DEFAULT_KEY.ios;
}

const steps = {
  'ios-safari': [
    { art: <OpenBrowserArt browser="safari" host={host} />, title: 'Open this page in Safari', text: 'Using WhatsApp, Messages or email? Tap the link, then choose Open in Safari (the compass icon). Installing only works from Safari.' },
    { art: <SafariMenuArt host={host} />, title: 'Tap ••• and then Share', text: 'The ••• is at the bottom right of Safari. In the menu that opens, tap Share (the first item). Do not tap Add to Bookmarks. On older iPhones, tap the square with an arrow pointing up instead.' },
    { art: <ShareSheetArt />, title: 'Scroll down and choose Add to Home Screen', text: 'It is in the list of actions below the apps row, so scroll down. If it is not there, scroll to the very bottom, tap Edit Actions, and add it.' },
    { art: <IosAddDialogArt />, title: 'Keep “Open as Web App” on, tap Add', text: 'The switch makes it open full-screen like a normal app.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon. From now on, open the app from there, not from Safari.' },
  ],
  'ios-chrome': [
    { title: 'Tap the Share icon', text: 'In Chrome it is the square with an arrow at the right end of the address bar. Or tap ••• and then Share.' },
    { art: <ShareSheetArt />, title: 'Scroll down and choose Add to Home Screen', text: 'It is in the list of actions, so scroll down. If it is not there, scroll to the very bottom, tap Edit Actions, and add it. Still missing? Use the Safari steps instead.' },
    { title: 'Tap Add', text: 'If you see “Open as Web App”, keep it on.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon.' },
  ],
  'ios-other': [
    { copy: true, title: 'Copy this page’s address', text: 'This browser can’t add the app to your Home Screen, but Safari can.' },
    { art: <OpenBrowserArt browser="safari" host={host} />, title: 'Open Safari and paste the address', text: 'Open Safari (the blue compass), tap the address bar, paste, and go. This page will then show the Safari steps.' },
    { title: 'In Safari: ••• then Share, then Add to Home Screen', text: 'Scroll down the list of actions to Add to Home Screen, then tap Add.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon.' },
  ],
  'android-chrome': [
    { art: <OpenBrowserArt browser="chrome" host={host} />, title: 'Open this page in Chrome', text: 'Using WhatsApp or email? Tap the link, then open it in Chrome.' },
    { art: <ChromeMenuArt host={host} />, title: 'Tap the ⋮ menu', text: 'Top right corner of Chrome.' },
    { art: <ChromeInstallItemArt />, title: 'Tap Install app', text: 'If you only see Add to Home screen, tap that instead.' },
    { art: <AndroidDialogArt />, title: 'Tap Install (or Add)', text: 'Chrome adds Stockham Tags to your Home Screen and app list.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon.' },
  ],
  'android-samsung': [
    { title: 'Tap the ≡ menu', text: 'Bottom right of Samsung Internet.' },
    { title: 'Tap Add page to, then Home screen', text: 'If you see Install app or Add to Home screen directly, tap that.' },
    { title: 'Tap Add', text: 'Samsung Internet puts Stockham Tags on your Home screen.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home screen', text: 'Tap the Stockham Tags icon.' },
  ],
  'android-firefox': [
    { title: 'Tap the ⋮ menu', text: 'Top right (or bottom right) of Firefox.' },
    { title: 'Tap Install', text: 'If you only see Add to Home screen, tap that instead.' },
    { title: 'Tap Add', text: 'Firefox adds Stockham Tags to your Home screen.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home screen', text: 'Tap the Stockham Tags icon.' },
  ],
  'android-other': [
    { copy: true, title: 'Copy this page’s address', text: 'This browser may not be able to install apps, but Chrome can.' },
    { art: <OpenBrowserArt browser="chrome" host={host} />, title: 'Open Chrome and paste the address', text: 'Open Chrome, tap the address bar, paste, and go.' },
    { art: <ChromeMenuArt host={host} />, title: 'Tap ⋮, then Install app', text: 'If you only see Add to Home screen, tap that instead.' },
    { art: <AndroidDialogArt />, title: 'Tap Install (or Add)', text: 'Stockham Tags is added to your Home screen.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon.' },
  ],
};

/** Public page (no sign-in): QR code, share link and illustrated install steps for iPhone and Android. */
export function InstallPage() {
  const [tab, setTab] = useState(detectPlatform);
  const [key, setKey] = useState(detectKey);
  const mobile = platform() !== 'desktop';
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

  // iOS has no install prompt for web pages; this opens the Share sheet in one tap so the user only has to pick Add to Home Screen.
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const openShareSheet = async () => {
    try { await navigator.share({ title: 'Stockham Tags', url: baseUrl }); } catch { /* cancelled */ }
  };

  const copyLink = async () => {
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
            {!mobile && <p className="muted">Share it with a teammate with the QR code or link below.</p>}
          </section>
        ) : (
          prompt ? (
            <section className="install__card center">
              <button className="btn btn--dark btn--block" onClick={installNow}>Install app</button>
            </section>
          ) : (mobile && tab === 'ios' && canShare && (
            <section className="install__card center install__quick">
              <button className="btn btn--dark btn--block" onClick={openShareSheet}>Add to Home Screen</button>
              <p className="muted small">Tap the button. In the sheet that opens, scroll down the list of actions to <strong>Add to Home Screen</strong> (if it is missing, tap <strong>Edit Actions</strong> at the very bottom and add it), then tap <strong>Add</strong>.</p>
            </section>
          ))
        )}

        {!mobile && <section className="install__card install__share">
          {qr && <img className="install__qr" src={qr} alt={`QR code for ${installUrl}`} width="180" height="180" />}
          <div className="install__share-text">
            <h2>Scan with your phone’s camera</h2>
            <p className="muted small">Or send the link:</p>
            <code className="install__link">{installUrl}</code>
            <button className="btn btn--outline" onClick={share}>{copied ? 'Link copied ✓' : 'Share link'}</button>
          </div>
        </section>}
        </aside>

        <main className="install__main">
        {!mobile && <div className="install__tabs" role="tablist" aria-label="Phone type">
          {[['ios', 'iPhone'], ['android', 'Android']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => { setTab(id); setKey(DEFAULT_KEY[id]); }}>{label}</button>
          ))}
        </div>}

        <div className="install__browsers" role="tablist" aria-label="Browser">
          {BROWSERS[tab].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={key === id} className={key === id ? 'is-active' : ''} onClick={() => setKey(id)}>{label}</button>
          ))}
        </div>

        <ol className="install__steps">
          {steps[key].map((s, i) => (
            <li key={s.title} className="install__step">
              <div className="install__num">{i + 1}</div>
              <div className="install__step-body">
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
                {s.copy && <button className="btn btn--outline" onClick={copyLink}>{copied ? 'Link copied ✓' : 'Copy link'}</button>}
                {s.art}
              </div>
            </li>
          ))}
        </ol>

        <details className="install__help">
          <summary>Can’t find it? Tips that work on any phone</summary>
          <ul>
            <li>Use the browser that came with the phone: <strong>Safari</strong> on iPhone, <strong>Chrome</strong> on Android. Browsers built into other apps (WhatsApp, Facebook, email, Teams…) can’t add the app. Copy the link and open it in Safari or Chrome.</li>
            <li>Look for the <strong>Share</strong> icon (a square with an arrow) or a menu (<strong>⋮</strong>, <strong>•••</strong> or <strong>≡</strong>). The option is called <strong>Add to Home Screen</strong> or <strong>Install app</strong>. Scroll the list if you don’t see it.</li>
            <li>iPhone: if Add to Home Screen is missing from the Share sheet, scroll to the bottom, tap <strong>Edit Actions</strong>, and add it.</li>
            <li>A phone managed by your company may block this. You can still use the app in the browser: just sign in at the same address and bookmark it.</li>
          </ul>
        </details>

        <p className="muted small center">Need to remove it later? Press and hold the icon, then choose Remove App (iPhone) or Uninstall (Android).</p>
        </main>
      </div>
    </div>
  );
}
