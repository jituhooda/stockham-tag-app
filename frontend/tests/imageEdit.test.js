import { expect, it } from 'vitest';
import {
  IDENTITY, clampCrop, dragCrop, flipHorizontal, flipVertical, fullCrop, isFullCrop, jpegName, orientedSize, rotateCW, workScale,
} from '../lib/imageEdit';

// Where a source pixel ends up on screen for a view {r, m} in a w×h picture.
function place({ r, m }, w, h, x, y) {
  if (m) x = w - 1 - x; // mirror first
  for (let i = 0; i < r; i++) { [x, y, w, h] = [h - 1 - y, x, h, w]; } // then each quarter turn clockwise
  return [x, y];
}

it('four quarter turns come back to the start', () => {
  let v = IDENTITY;
  for (let i = 0; i < 4; i++) v = rotateCW(v);
  expect(v).toEqual(IDENTITY);
});

it('flipping twice is a no-op, for every starting view', () => {
  for (let r = 0; r < 4; r++) for (let m = 0; m < 2; m++) {
    const v = { r, m };
    expect(flipHorizontal(flipHorizontal(v))).toEqual(v);
    expect(flipVertical(flipVertical(v))).toEqual(v);
  }
});

it('flip left-right then top-bottom equals a half turn', () => {
  for (let r = 0; r < 4; r++) for (let m = 0; m < 2; m++) {
    const v = { r, m };
    const both = flipVertical(flipHorizontal(v));
    const turned = rotateCW(rotateCW(v));
    // same on-screen result for every pixel
    for (const [x, y] of [[0, 0], [3, 1], [2, 4]]) expect(place(both, 5, 6, x, y)).toEqual(place(turned, 5, 6, x, y));
  }
});

it('a flip mirrors what is on screen, whatever the current turn', () => {
  const w = 5, h = 3;
  for (let r = 0; r < 4; r++) for (let m = 0; m < 2; m++) {
    const v = { r, m };
    const { w: W, h: H } = orientedSize(w, h, v);
    for (const [x, y] of [[0, 0], [4, 2], [1, 2]]) {
      const [sx, sy] = place(v, w, h, x, y);
      expect(place(flipHorizontal(v), w, h, x, y)).toEqual([W - 1 - sx, sy]);
      expect(place(flipVertical(v), w, h, x, y)).toEqual([sx, H - 1 - sy]);
    }
  }
});

it('swaps width and height on odd turns and never scales up', () => {
  expect(orientedSize(400, 300, { r: 1, m: 0 })).toEqual({ w: 300, h: 400 });
  expect(orientedSize(400, 300, { r: 2, m: 1 })).toEqual({ w: 400, h: 300 });
  expect(workScale(4000, 3000, 2000)).toBe(0.5);
  expect(workScale(800, 600, 2560)).toBe(1);
});

it('keeps the crop inside the picture and above a minimum size', () => {
  expect(clampCrop({ x: -10, y: 5, w: 50, h: 50 }, 100, 80)).toEqual({ x: 0, y: 5, w: 50, h: 50 });
  expect(clampCrop({ x: 90, y: 70, w: 50, h: 50 }, 100, 80)).toEqual({ x: 50, y: 30, w: 50, h: 50 });
  expect(clampCrop({ x: 10, y: 10, w: 2, h: 2 }, 100, 80, 32)).toEqual({ x: 10, y: 10, w: 32, h: 32 });
  expect(isFullCrop(fullCrop(100, 80), 100, 80)).toBe(true);
});

it('drags corners and edges, keeping the opposite side fixed', () => {
  const s = { x: 20, y: 20, w: 40, h: 40 };
  expect(dragCrop(s, 'se', 10, 5, 100, 100)).toEqual({ x: 20, y: 20, w: 50, h: 45 });
  expect(dragCrop(s, 'nw', -10, -10, 100, 100)).toEqual({ x: 10, y: 10, w: 50, h: 50 });
  expect(dragCrop(s, 'e', 500, 0, 100, 100)).toEqual({ x: 20, y: 20, w: 80, h: 40 });
  expect(dragCrop(s, 'w', 500, 0, 100, 100, 32)).toEqual({ x: 28, y: 20, w: 32, h: 40 }); // cannot cross the right edge
  expect(dragCrop(s, 'move', 500, -500, 100, 100)).toEqual({ x: 60, y: 0, w: 40, h: 40 });
});

it('names re-encoded photos .jpg', () => {
  expect(jpegName('IMG_1.PNG')).toBe('IMG_1.jpg');
  expect(jpegName('20261030_161230.jpg')).toBe('20261030_161230.jpg');
  expect(jpegName('')).toBe('photo.jpg');
});
