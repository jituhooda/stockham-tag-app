/**
 * Geometry for the photo editor (flip / rotate / crop). Pure functions, no DOM.
 *
 * A view of the photo is a rotation r (0..3 quarter turns clockwise) and a mirror m (0|1), applied as
 * "mirror the source left-right, then rotate". Any mix of flips and 90° turns can be written this way.
 */

export const IDENTITY = { r: 0, m: 0 };

/** Turn the picture 90° clockwise. */
export const rotateCW = ({ r, m }) => ({ r: (r + 1) % 4, m });

/** Mirror what is shown on screen, left-right. */
export const flipHorizontal = ({ r, m }) => ({ r: (4 - r) % 4, m: m ? 0 : 1 });

/** Mirror what is shown on screen, top-bottom. */
export const flipVertical = ({ r, m }) => ({ r: (6 - r) % 4, m: m ? 0 : 1 });

/** Size of the picture after the turn (width and height swap on odd quarter turns). */
export const orientedSize = (w, h, { r }) => (r % 2 ? { w: h, h: w } : { w, h });

/** Scale so the longer side is at most `maxPx` (never scales up). */
export const workScale = (w, h, maxPx) => Math.min(1, maxPx / Math.max(w, h));

export const fullCrop = (w, h) => ({ x: 0, y: 0, w, h });

export const isFullCrop = (c, w, h) => c.x === 0 && c.y === 0 && c.w === w && c.h === h;

/** Keep a crop box inside the picture and at least `min` pixels in each direction. */
export function clampCrop(c, W, H, min = 32) {
  const m = Math.min(min, W, H);
  const w = Math.min(Math.max(c.w, m), W);
  const h = Math.min(Math.max(c.h, m), H);
  return { x: Math.min(Math.max(c.x, 0), W - w), y: Math.min(Math.max(c.y, 0), H - h), w, h };
}

/**
 * Move one handle ('move', a corner 'nw'|'ne'|'sw'|'se', or an edge 'n'|'s'|'e'|'w') by (dx, dy)
 * picture pixels, starting from `start`. The opposite edge stays where it is.
 */
export function dragCrop(start, handle, dx, dy, W, H, min = 32) {
  if (handle === 'move') {
    return clampCrop({ ...start, x: start.x + dx, y: start.y + dy }, W, H, min);
  }
  const m = Math.min(min, W, H);
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  if (handle.includes('w')) left = Math.min(Math.max(left + dx, 0), right - m);
  if (handle.includes('e')) right = Math.max(Math.min(right + dx, W), left + m);
  if (handle.includes('n')) top = Math.min(Math.max(top + dy, 0), bottom - m);
  if (handle.includes('s')) bottom = Math.max(Math.min(bottom + dy, H), top + m);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Name for a re-encoded photo: same name with a .jpg ending. */
export const jpegName = (name = 'photo') => `${name.replace(/\.[^./\\]+$/, '') || 'photo'}.jpg`;
