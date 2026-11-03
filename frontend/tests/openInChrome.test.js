import { expect, it, vi } from 'vitest';
import { canOfferChrome, chromeUrl, openInChromeOnAndroid } from '../lib/openInChrome';

const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36';
const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const win = { matchMedia: () => ({ matches: false }) };

it('builds the Android intent link with a fallback to the same address', () => {
  const href = 'https://app.test/install?x=1';
  expect(chromeUrl(href, 'android')).toBe(
    `intent://app.test/install?x=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`,
  );
});

it('builds the iPhone Chrome link for https and http', () => {
  expect(chromeUrl('https://app.test/a?b=1#c', 'ios')).toBe('googlechromes://app.test/a?b=1#c');
  expect(chromeUrl('http://localhost:5190/', 'ios')).toBe('googlechrome://localhost:5190/');
});

it('offers Chrome only on phones that are not already in Chrome or the installed app', () => {
  expect(canOfferChrome({ userAgent: SAMSUNG }, win)).toBe(true);
  expect(canOfferChrome({ userAgent: SAFARI }, win)).toBe(true);
  expect(canOfferChrome({ userAgent: CHROME }, win)).toBe(false);
  expect(canOfferChrome({ userAgent: SAMSUNG }, { matchMedia: () => ({ matches: true }) })).toBe(false);
  expect(canOfferChrome({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36' }, win)).toBe(false);
});

const store = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };

it('hands Android browsers over to Chrome once per tab', () => {
  const loc = { href: 'https://app.test/', hash: '', replace: vi.fn() };
  const session = store();
  expect(openInChromeOnAndroid({ loc, nav: { userAgent: SAMSUNG }, win, session })).toBe(true);
  expect(loc.replace).toHaveBeenCalledOnce();
  expect(loc.replace.mock.calls[0][0]).toMatch(/^intent:\/\/app\.test\/#Intent;.*package=com\.android\.chrome/);
  expect(openInChromeOnAndroid({ loc, nav: { userAgent: SAMSUNG }, win, session })).toBe(false); // the fallback page load
});

it('never hands over when it would lose a token or login response, or on iPhone / Chrome', () => {
  const run = (hash, ua) => openInChromeOnAndroid({ loc: { href: 'https://app.test/', hash, replace: vi.fn() }, nav: { userAgent: ua }, win, session: store() });
  expect(run('#token=abc', SAMSUNG)).toBe(false);
  expect(run('#state=a&code=b', SAMSUNG)).toBe(false);
  expect(run('', CHROME)).toBe(false);
  expect(run('', SAFARI)).toBe(false);
});
