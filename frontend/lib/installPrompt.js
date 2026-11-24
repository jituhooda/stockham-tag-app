import { browser, isStandalone, platform } from './platform';

/**
 * Chrome/Edge/Samsung on Android fire `beforeinstallprompt` once, often before the /install page has mounted,
 * so it is captured from main.jsx and kept here until a button asks for it.
 */
let deferred = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export function captureInstallPrompt(win = window) {
  win.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  win.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export const installState = () => ({ canPrompt: !!deferred, installed });

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Opens the browser's own install dialog. Resolves 'accepted', 'dismissed' or 'unavailable'. */
export async function promptInstall() {
  const e = deferred;
  if (!e) return 'unavailable';
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome;
}

/**
 * What the single Install button should do on this device:
 *  installed      already running from the Home Screen icon (or just installed)
 *  prompt         Android: the browser's own install dialog is ready
 *  android-menu   Android without the dialog (yet): open the browser menu, Install app
 *  open-browser   inside WhatsApp/Facebook/email etc., which can't install: open in Safari/Chrome
 *  ios-share      iPhone Safari/Chrome: open the Share sheet, then Add to Home Screen
 *  ios-safari     iPhone browser that can't add to Home Screen: copy link into Safari
 *  desktop        laptop: show the QR code
 */
export function installMode({ nav = navigator, win = window, canPrompt = false, justInstalled = false } = {}) {
  if (justInstalled || isStandalone(nav, win)) return 'installed';
  const p = platform(nav);
  if (p === 'desktop') return 'desktop';
  const b = browser(nav);
  if (b === 'inapp') return 'open-browser';
  if (p === 'android') return canPrompt ? 'prompt' : 'android-menu';
  if (b === 'safari' || b === 'chrome' || b === 'edge') return 'ios-share';
  return 'ios-safari';
}
