import { useSyncExternalStore } from 'react';

/**
 * Which layout the app is in, from the viewport:
 *  - phone:   narrower than 768px, or shorter than 500px (a phone on its side)
 *  - tablet:  768-1199px  - tag list (320px) beside the open tag
 *  - desktop: 1200px+     - wider list, roomier forms
 * Keep in step with the breakpoints in assets/styles.css.
 */
export const LAYOUT_QUERIES = {
  desktop: '(min-width: 1200px) and (min-height: 500px)',
  tablet: '(min-width: 768px) and (min-height: 500px)',
};

function read() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'phone';
  if (window.matchMedia(LAYOUT_QUERIES.desktop).matches) return 'desktop';
  if (window.matchMedia(LAYOUT_QUERIES.tablet).matches) return 'tablet';
  return 'phone';
}

function subscribe(onChange) {
  const lists = Object.values(LAYOUT_QUERIES).map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener('change', onChange));
  return () => lists.forEach((l) => l.removeEventListener('change', onChange));
}

export function useLayout() {
  const layout = useSyncExternalStore(subscribe, read, () => 'phone');
  return { layout, split: layout !== 'phone' };
}
