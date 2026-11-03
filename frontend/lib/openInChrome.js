import { browser, isStandalone, platform } from './platform';

/**
 * A page can't force a browser, but it can ask for Chrome:
 *  - Android: an intent:// link opens Chrome, or (if Chrome isn't installed) loads the fallback URL in the current browser.
 *  - iPhone: googlechromes:// opens Chrome. There is no fallback and no way to tell whether Chrome is installed,
 *    so on iPhone this is only ever offered as a button the user taps.
 */
export function chromeUrl(href, plat = platform()) {
  const u = new URL(href);
  if (plat === 'android') {
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
  }
  return `${u.protocol === 'https:' ? 'googlechromes' : 'googlechrome'}://${u.host}${u.pathname}${u.search}${u.hash}`;
}

/** Phone browsers other than Chrome (and not the installed app), where "Open in Chrome" makes sense. */
export const canOfferChrome = (nav = navigator, win = window) =>
  platform(nav) !== 'desktop' && browser(nav) !== 'chrome' && !isStandalone(nav, win);

const TRIED = 'stockham.triedChrome';

/**
 * Android only: on first load in another browser, hand over to Chrome once per tab. Never when the address carries a
 * #token= or Keycloak response, since that would lose it (Chrome has its own storage and starts without the sign-in).
 */
export function openInChromeOnAndroid({ loc = window.location, nav = navigator, win = window, session = window.sessionStorage } = {}) {
  try {
    if (platform(nav) !== 'android' || !canOfferChrome(nav, win) || session.getItem(TRIED)) return false;
    session.setItem(TRIED, '1');
    if (loc.hash) return false; // stay put for the rest of this tab too
    loc.replace(chromeUrl(loc.href, 'android'));
    return true;
  } catch {
    return false;
  }
}
