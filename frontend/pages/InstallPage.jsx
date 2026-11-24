import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { OpenInChrome } from '../components/OpenInChrome';
import { Logo } from '../components/ui';
import { installMode, installState, promptInstall, subscribeInstall } from '../lib/installPrompt';
import { chromeUrl, safariUrl } from '../lib/openInChrome';
import { browser, platform } from '../lib/platform';
import {
  AndroidDialogArt, ChromeInstallItemArt, ChromeMenuArt, HomeScreenArt, IosAddDialogArt, OpenBrowserArt, SafariMenuArt, SafariPageMenuArt,
  SafariShareButtonArt, ShareSheetActionsArt, ShareSheetArt,
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
    {
      title: 'Open the Share menu',
      text: 'Safari looks different depending on your iOS version and settings. Use whichever of these your screen shows. Do not tap Add to Bookmarks.',
      variants: [
        { label: '≡ at the left of the address bar', text: 'Tap ≡ next to the address, then tap Share.', art: <SafariPageMenuArt host={host} /> },
        { label: '••• at the bottom right', text: 'Tap •••, then tap Share.', art: <SafariMenuArt host={host} /> },
        { label: 'Share icon (square with an arrow)', text: 'Older iPhones and iPads: tap the Share icon in the bottom bar (top right on iPad).', art: <SafariShareButtonArt host={host} /> },
      ],
    },
    {
      title: 'Tap Add to Home Screen',
      text: 'If you don’t see it, scroll down or tap View More. If it is still missing, scroll to the very bottom, tap Edit Actions, and add it.',
      variants: [
        { label: 'A round button under the apps row', text: 'Newer iOS: a row of round buttons (Copy, Add to Home Screen, Add to Bookmarks…).', art: <ShareSheetActionsArt /> },
        { label: 'A row in the list of actions', text: 'Older iOS: scroll down the list below the apps.', art: <ShareSheetArt /> },
      ],
    },
    { art: <IosAddDialogArt />, title: 'Tap Add', text: 'Add is at the top right. If you see an “Open as Web App” switch, keep it on so the app opens full-screen. Older iPhones don’t have the switch; just tap Add.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon. From now on, open the app from there, not from Safari.' },
  ],
  'ios-chrome': [
    { title: 'Tap the Share icon', text: 'In Chrome it is the square with an arrow at the right end of the address bar. Or tap ••• and then Share.' },
    {
      title: 'Tap Add to Home Screen',
      text: 'If you don’t see it, scroll down or tap View More, or tap Edit Actions at the very bottom and add it. Still missing? Use the Safari steps instead (Chrome needs iOS 16.4 or newer).',
      variants: [
        { label: 'A round button under the apps row', art: <ShareSheetActionsArt /> },
        { label: 'A row in the list of actions', art: <ShareSheetArt /> },
      ],
    },
    { title: 'Tap Add', text: 'If you see “Open as Web App”, keep it on.' },
    { art: <HomeScreenArt />, title: 'Open it from your Home Screen', text: 'Tap the Stockham Tags icon.' },
  ],
  'ios-other': [
    { copy: true, title: 'Copy this page’s address', text: 'This browser can’t add the app to your Home Screen, but Safari can.' },
    { art: <OpenBrowserArt browser="safari" host={host} />, title: 'Open Safari and paste the address', text: 'Open Safari (the blue compass), tap the address bar, paste, and go. This page will then show the Safari steps.' },
    { title: 'In Safari: open Share, then Add to Home Screen', text: 'Share is under ≡ (left of the address), under ••• (bottom right), or the square-with-arrow icon on older iPhones. Then tap Add to Home Screen and Add.' },
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

const quickSteps = {
  'ios-share': [
    { title: 'Tap Add to Home Screen', text: 'A round button under the apps on newer iPhones, or a row further down the list on older ones. Tap View More or scroll if you don’t see it.', art: <ShareSheetActionsArt /> },
    { title: 'Tap Add', text: 'Top right. If you see “Open as Web App”, keep it on.', art: <IosAddDialogArt /> },
  ],
  'android-menu': [
    { title: 'Tap the ⋮ menu', text: 'Top right of Chrome (≡ at the bottom in Samsung Internet).', art: <ChromeMenuArt host={host} /> },
    { title: 'Tap Install app', text: 'Or Add to Home screen, then Install (or Add).', art: <ChromeInstallItemArt /> },
  ],
};

function QuickSteps({ steps: list }) {
  return (
    <ol className="install__quick-steps">
      {list.map((s, i) => (
        <li key={s.title}>
          <div className="install__num">{i + 1}</div>
          <div className="install__step-body">
            <h3>{s.title}</h3>
            <p className="muted">{s.text}</p>
            {s.art}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Public page (no sign-in): one Install button for the detected phone, plus QR code and full illustrated steps. */
export function InstallPage() {
  const [tab, setTab] = useState(detectPlatform);
  const [key, setKey] = useState(detectKey);
  const mobile = platform() !== 'desktop';
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [{ canPrompt, installed: justInstalled }, setInstall] = useState(installState);
  const [shared, setShared] = useState(false);
  const mode = installMode({ canPrompt, justInstalled });

  useEffect(() => subscribeInstall(() => setInstall(installState())), []);

  useEffect(() => {
    document.documentElement.classList.add('install-page');
    return () => document.documentElement.classList.remove('install-page');
  }, []);

  useEffect(() => {
    QRCode.toDataURL(installUrl, { width: 360, margin: 1, color: { dark: '#24304f', light: '#ffffff' } }).then(setQr).catch(() => {});
  }, []);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(installUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Stockham Tags', text: 'Install the Stockham Tags app', url: installUrl }); return; } catch { /* cancelled */ }
    }
    copyLink();
  };

  // iOS has no install API for web pages; this opens the Share sheet in one tap so the user only has to pick Add to Home Screen.
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const openShareSheet = async () => {
    setShared(true);
    try { await navigator.share({ title: 'Stockham Tags', url: baseUrl }); } catch { /* cancelled */ }
  };

  const here = typeof window === 'undefined' ? installUrl : window.location.href;
  const openInBrowserHref = platform() === 'android' ? chromeUrl(here, 'android') : safariUrl(here);

  const hero = {
    installed: (
      <>
        <h2>Installed ✓</h2>
        <p className="muted">Open Stockham Tags from its icon on your Home Screen.</p>
      </>
    ),
    prompt: (
      <>
        <button className="btn btn--dark btn--block btn--lg" onClick={promptInstall}>Install app</button>
        <p className="muted small">Then tap <strong>Install</strong> in the box that pops up. That’s it.</p>
      </>
    ),
    'android-menu': (
      <>
        <h2>Install in 2 taps</h2>
        <QuickSteps steps={quickSteps['android-menu']} />
      </>
    ),
    'open-browser': (
      <>
        <h2>First, open this page in {platform() === 'android' ? 'Chrome' : 'Safari'}</h2>
        <p className="muted small">The browser inside WhatsApp, email and similar apps can’t add apps to your Home Screen.</p>
        <a className="btn btn--dark btn--block btn--lg" href={openInBrowserHref}>Open in {platform() === 'android' ? 'Chrome' : 'Safari'}</a>
        <p className="muted small">Nothing happens? Tap <strong>•••</strong> or <strong>⋮</strong> and choose <strong>Open in browser</strong>, or copy the link and paste it into {platform() === 'android' ? 'Chrome' : 'Safari'}.</p>
        <button className="btn btn--outline btn--block" onClick={copyLink}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
      </>
    ),
    'ios-share': canShare ? (
      <>
        <button className="btn btn--dark btn--block btn--lg" onClick={openShareSheet}>Add to Home Screen</button>
        <p className="muted small">{shared ? 'In the sheet that opened:' : 'Tap the button, then in the sheet that opens:'}</p>
        <QuickSteps steps={quickSteps['ios-share']} />
      </>
    ) : (
      <>
        <h2>Add to your Home Screen</h2>
        <p className="muted small">Follow the steps below.</p>
      </>
    ),
    'ios-safari': (
      <>
        <h2>Open this page in Safari</h2>
        <p className="muted small">This browser can’t add apps to your Home Screen, but Safari can.</p>
        <a className="btn btn--dark btn--block btn--lg" href={safariUrl(here)}>Open in Safari</a>
        <button className="btn btn--outline btn--block" onClick={copyLink}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
      </>
    ),
    desktop: null,
  }[mode];

  return (
    <div className="install">
      <div className="install__wrap">
        <aside className="install__side">
        <header className="install__head">
          <Logo className="install__logo" />
          <h1>Get the Stockham Tags app</h1>
          <p className="muted">Add it to your phone’s Home Screen. No App Store needed.</p>
        </header>

        {hero && <section className="install__card install__quick center">{hero}</section>}

        {mobile && mode !== 'installed' && mode !== 'open-browser' && <OpenInChrome className="install__chrome center" />}

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
        <details className="install__all" open={!mobile || mode === 'ios-share' && !canShare}>
        <summary>{mobile ? 'Show all steps for other phones and browsers' : 'Step-by-step instructions'}</summary>
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
                {s.variants && (
                  <div className="install__variants">
                    {s.variants.map((v, j) => (
                      <figure key={v.label} className="install__variant">
                        <figcaption><strong>{s.variants.length > 1 ? `${String.fromCharCode(65 + j)}. ` : ''}{v.label}</strong>{v.text && <span className="muted"> {v.text}</span>}</figcaption>
                        {v.art}
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        </details>

        <details className="install__help">
          <summary>Can’t find it? Tips that work on any phone</summary>
          <ul>
            <li>Use the browser that came with the phone: <strong>Safari</strong> on iPhone, <strong>Chrome</strong> on Android. Browsers built into other apps (WhatsApp, Facebook, email, Teams…) can’t add the app. Copy the link and open it in Safari or Chrome.</li>
            <li>Look for the <strong>Share</strong> icon (a square with an arrow) or a menu (<strong>⋮</strong>, <strong>•••</strong> or <strong>≡</strong>). The option is called <strong>Add to Home Screen</strong> or <strong>Install app</strong>. Scroll the list if you don’t see it.</li>
            <li>iPhone: Safari’s layout changes with the iOS version and with Settings › Apps › Safari (Tabs: Compact, Bottom or Top). Share may be under <strong>≡</strong> by the address, under <strong>•••</strong>, or a separate icon.</li>
            <li>iPhone: if Add to Home Screen is missing from the Share sheet, tap <strong>View More</strong>, or scroll to the bottom, tap <strong>Edit Actions</strong>, and add it.</li>
            <li>iPhone: the app needs iOS 16.4 or newer. Check in Settings › General › About › iOS Version.</li>
            <li>A phone managed by your company may block this. You can still use the app in the browser: just sign in at the same address and bookmark it.</li>
          </ul>
        </details>

        <p className="muted small center">Need to remove it later? Press and hold the icon, then choose Remove App (iPhone) or Uninstall (Android).</p>
        </main>
      </div>
    </div>
  );
}
