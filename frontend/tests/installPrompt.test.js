import { expect, it, vi } from 'vitest';
import { captureInstallPrompt, installMode, installState, promptInstall } from '../lib/installPrompt';
import { safariUrl } from '../lib/openInChrome';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1';
const IOS_WHATSAPP = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IOS_FIREFOX = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/130.0 Mobile/15E148 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const win = (standalone = false) => ({ matchMedia: () => ({ matches: standalone }) });
const mode = (userAgent, opts = {}) => installMode({ nav: { userAgent, maxTouchPoints: 5 }, win: win(opts.standalone), ...opts });

it('picks the right Install button for each phone and browser', () => {
  expect(mode(ANDROID, { canPrompt: true })).toBe('prompt');
  expect(mode(ANDROID)).toBe('android-menu');
  expect(mode(ANDROID_WEBVIEW, { canPrompt: true })).toBe('open-browser');
  expect(mode(SAFARI)).toBe('ios-share');
  expect(mode(IOS_CHROME)).toBe('ios-share');
  expect(mode(IOS_WHATSAPP)).toBe('open-browser');
  expect(mode(IOS_FIREFOX)).toBe('ios-safari');
  expect(installMode({ nav: { userAgent: MAC, maxTouchPoints: 0 }, win: win() })).toBe('desktop');
});

it('reports installed when running from the icon or right after installing', () => {
  expect(mode(SAFARI, { standalone: true })).toBe('installed');
  expect(mode(ANDROID, { canPrompt: true, justInstalled: true })).toBe('installed');
});

it('keeps the early install event and shows the browser dialog on demand', async () => {
  const handlers = {};
  captureInstallPrompt({ addEventListener: (name, fn) => { handlers[name] = fn; } });
  const event = { preventDefault: vi.fn(), prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
  handlers.beforeinstallprompt(event);
  expect(event.preventDefault).toHaveBeenCalled();
  expect(installState()).toEqual({ canPrompt: true, installed: false });

  await expect(promptInstall()).resolves.toBe('accepted');
  expect(event.prompt).toHaveBeenCalled();
  expect(installState()).toEqual({ canPrompt: false, installed: true });
  await expect(promptInstall()).resolves.toBe('unavailable');
});

it('builds the open-in-Safari link', () => {
  expect(safariUrl('https://app.test/install?x=1')).toBe('x-safari-https://app.test/install?x=1');
});
