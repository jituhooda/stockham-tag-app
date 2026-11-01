import { expect, it } from 'vitest';
import { isMobile, platform } from '../lib/platform';

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
