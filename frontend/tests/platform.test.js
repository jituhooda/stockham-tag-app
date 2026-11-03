import { expect, it } from 'vitest';
import { browser, isMobile, isStandalone, platform } from '../lib/platform';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

it('detects iPhone and Android phones', () => {
  expect(platform({ userAgent: IPHONE, maxTouchPoints: 5 })).toBe('ios');
  expect(platform({ userAgent: ANDROID, maxTouchPoints: 5 })).toBe('android');
});

it('detects an iPad that reports itself as a Mac, but not a real Mac', () => {
  expect(platform({ userAgent: MAC, maxTouchPoints: 5 })).toBe('ios');
  expect(platform({ userAgent: MAC, maxTouchPoints: 0 })).toBe('desktop');
});

it('treats laptops and unknown agents as desktop', () => {
  expect(platform({ userAgent: WINDOWS, maxTouchPoints: 10 })).toBe('desktop');
  expect(platform({})).toBe('desktop');
  expect(isMobile({ userAgent: WINDOWS })).toBe(false);
  expect(isMobile({ userAgent: ANDROID })).toBe(true);
});

it('detects the Home Screen (standalone) mode', () => {
  const win = (matches) => ({ matchMedia: () => ({ matches }) });
  expect(isStandalone({}, win(true))).toBe(true);
  expect(isStandalone({ standalone: true }, win(false))).toBe(true);
  expect(isStandalone({ standalone: false }, win(false))).toBe(false);
  expect(isStandalone({}, {})).toBe(false);
});

it('names the browser, including in-app browsers', () => {
  const ios = (extra) => ({ userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ${extra}` });
  expect(browser(ios('Version/17.0 Mobile/15E148 Safari/604.1'))).toBe('safari');
  expect(browser(ios('CriOS/120.0 Mobile/15E148 Safari/604.1'))).toBe('chrome');
  expect(browser(ios('FxiOS/120.0 Mobile/15E148 Safari/605.1.15'))).toBe('firefox');
  expect(browser(ios('Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]'))).toBe('inapp');
  expect(browser(ios('Mobile/15E148'))).toBe('inapp');

  const droid = (extra) => ({ userAgent: `Mozilla/5.0 (Linux; Android 14; Pixel 8${extra}` });
  expect(browser(droid(') AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'))).toBe('chrome');
  expect(browser(droid(') AppleWebKit/537.36 SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36'))).toBe('samsung');
  expect(browser(droid('; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'))).toBe('inapp');
  expect(browser(droid(') Gecko/120.0 Firefox/120.0'))).toBe('firefox');
  expect(browser(droid(') AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 OPR/76.0'))).toBe('other');
});
