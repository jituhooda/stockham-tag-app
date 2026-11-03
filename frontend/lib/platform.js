/**
 * 'ios', 'android' or 'desktop' (laptops and anything else). From the user agent, so it only
 * decides which UI to show; it is not a security check.
 */
export function platform(nav = typeof navigator === 'undefined' ? {} : navigator) {
  const ua = nav.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipod|ipad/i.test(ua)) return 'ios';
  // iPadOS 13+ reports itself as a Mac; only a touch screen gives it away.
  if (/macintosh/i.test(ua) && nav.maxTouchPoints > 1) return 'ios';
  return 'desktop';
}

export const isMobile = (nav) => platform(nav) !== 'desktop';

/** True when running from the Home Screen icon (no browser bars). */
export const isStandalone = (nav = navigator, win = window) =>
  !!win.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;

/**
 * Which browser: 'safari' | 'chrome' | 'samsung' | 'firefox' | 'edge' | 'inapp' | 'other'.
 * 'inapp' is a browser built into another app (Facebook, WhatsApp, a native app's web view...),
 * which usually cannot add pages to the Home Screen.
 */
export function browser(nav = typeof navigator === 'undefined' ? {} : navigator) {
  const ua = nav.userAgent || '';
  const p = platform(nav);
  if (/FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|LinkedInApp|GSA\//i.test(ua)) return 'inapp';
  if (p === 'android') {
    if (/; wv\)/.test(ua)) return 'inapp';
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/EdgA/i.test(ua)) return 'edge';
    if (/Firefox/i.test(ua)) return 'firefox';
    if (/OPR\/|Opera|DuckDuckGo|UCBrowser/i.test(ua)) return 'other';
    return /Chrome\//i.test(ua) ? 'chrome' : 'other';
  }
  if (p === 'ios') {
    if (/CriOS/i.test(ua)) return 'chrome';
    if (/FxiOS/i.test(ua)) return 'firefox';
    if (/EdgiOS/i.test(ua)) return 'edge';
    if (/OPiOS|DuckDuckGo/i.test(ua)) return 'other';
    return /Safari\//i.test(ua) ? 'safari' : 'inapp';
  }
  if (/Edg\//i.test(ua)) return 'edge';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Chrome\//i.test(ua)) return 'chrome';
  return /Safari\//i.test(ua) ? 'safari' : 'other';
}
