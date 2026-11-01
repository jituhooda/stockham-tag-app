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
