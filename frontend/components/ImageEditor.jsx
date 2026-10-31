import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IDENTITY, dragCrop, flipHorizontal, flipVertical, fullCrop, isFullCrop, jpegName, orientedSize, rotateCW, workScale,
} from '../lib/imageEdit';
import { IconFlipH, IconFlipV, IconRotate } from './icons';
import { Overlay } from './ui';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Decode a picked photo (applies its EXIF rotation). Resolves to something drawImage accepts, with width/height. */
async function decode(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Draw the photo into a canvas for the view {r, m}, at most `maxPx` on the long side. */
function renderView(src, view, maxPx) {
  const s = workScale(src.width, src.height, maxPx);
  const w = Math.round(src.width * s);
  const h = Math.round(src.height * s);
  const { w: W, h: H } = orientedSize(w, h, view);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.translate(W / 2, H / 2);
  ctx.rotate((view.r * Math.PI) / 2);
  ctx.scale(view.m ? -1 : 1, 1);
  ctx.drawImage(src, -w / 2, -h / 2, w, h);
  return canvas;
}

/**
 * Full-screen photo editor: crop (drag the box or its handles), flip, rotate 90°. Cancel / Done.
 * `onDone(file)` receives the edited JPEG, or the original file untouched if nothing was changed.
 */
export function ImageEditor({ file, maxPixels = 2560, quality = 0.88, onCancel, onDone }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState(IDENTITY);
  const [crop, setCrop] = useState(null);
  const [box, setBox] = useState({ w: 0, h: 0 }); // space available for the picture
  const [busy, setBusy] = useState(false);
  const stageRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    let live = true;
    decode(file).then((s) => live && setSrc(s), () => live && setFailed(true));
    return () => { live = false; };
  }, [file]);

  // Re-draw the picture whenever the view changes; a new view starts with the whole picture selected.
  const canvas = useMemo(() => (src ? renderView(src, view, maxPixels) : null), [src, view, maxPixels]);
  useEffect(() => { if (canvas) setCrop(fullCrop(canvas.width, canvas.height)); }, [canvas]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  // Show the (already working-size) canvas scaled to fit the stage.
  const scale = canvas && box.w ? Math.min((box.w - 24) / canvas.width, (box.h - 24) / canvas.height) : 0;
  const shown = useCallback((node) => {
    if (!node || !canvas) return;
    node.width = canvas.width;
    node.height = canvas.height;
    node.getContext('2d').drawImage(canvas, 0, 0);
  }, [canvas]);

  const startDrag = (handle) => (e) => {
    if (!crop || !scale) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { handle, x: e.clientX, y: e.clientY, start: crop };
  };
  const moveDrag = (e) => {
    const d = drag.current;
    if (!d) return;
    setCrop(dragCrop(d.start, d.handle, (e.clientX - d.x) / scale, (e.clientY - d.y) / scale, canvas.width, canvas.height, Math.max(24, 40 / scale)));
  };
  const endDrag = () => { drag.current = null; };

  const done = async () => {
    if (!canvas || !crop) return;
    const c = { x: Math.round(crop.x), y: Math.round(crop.y), w: Math.round(crop.w), h: Math.round(crop.h) };
    // Nothing changed and it is already a reasonably sized JPEG: send the original bytes (keeps quality and metadata).
    const untouched = view.r === 0 && !view.m && isFullCrop(crop, canvas.width, canvas.height)
      && /jpe?g/i.test(file.type) && src.width <= maxPixels && src.height <= maxPixels;
    if (untouched) return onDone(file);
    setBusy(true);
    const out = document.createElement('canvas');
    out.width = c.w;
    out.height = c.h;
    out.getContext('2d').drawImage(canvas, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
    out.toBlob((blob) => {
      if (!blob) { setBusy(false); setFailed(true); return; }
      onDone(new File([blob], jpegName(file.name), { type: 'image/jpeg' }));
    }, 'image/jpeg', quality);
    return undefined;
  };

  if (failed) {
    return (
      <Overlay>
      <div className="editor editor--msg" role="dialog" aria-modal="true" aria-label="Edit photo">
        <p>This photo can’t be edited here.</p>
        <div className="editor__row">
          <button className="editor__text editor__text--cancel" onClick={onCancel}>Cancel</button>
          <button className="editor__text editor__text--done" onClick={() => onDone(file)}>Upload as is</button>
        </div>
      </div>
      </Overlay>
    );
  }

  const left = crop ? crop.x * scale : 0;
  const top = crop ? crop.y * scale : 0;

  return (
    <Overlay>
    <div className="editor" role="dialog" aria-modal="true" aria-label="Edit photo">
      <div className="editor__bar">
        <button className="editor__text editor__text--cancel" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="editor__icon" aria-label="Flip horizontally" disabled={!src || busy} onClick={() => setView(flipHorizontal)}><IconFlipH size={26} /></button>
        <button className="editor__icon" aria-label="Flip vertically" disabled={!src || busy} onClick={() => setView(flipVertical)}><IconFlipV size={26} /></button>
        <button className="editor__icon" aria-label="Rotate 90 degrees" disabled={!src || busy} onClick={() => setView(rotateCW)}><IconRotate size={28} /></button>
        <button className="editor__text editor__text--done" onClick={done} disabled={!src || busy}>{busy ? 'Saving…' : 'Done'}</button>
      </div>
      <div className="editor__stage" ref={stageRef}>
        {!src && <p className="editor__hint">Loading…</p>}
        {canvas && scale > 0 && crop && (
          <div className="editor__pic" style={{ width: canvas.width * scale, height: canvas.height * scale }}>
            <canvas ref={shown} className="editor__canvas" />
            <div className="editor__dim" />
            <div
              className="editor__crop"
              style={{ left, top, width: crop.w * scale, height: crop.h * scale, '--pic-w': `${canvas.width * scale}px`, '--pic-h': `${canvas.height * scale}px`, '--off-x': `${left}px`, '--off-y': `${top}px` }}
              onPointerDown={startDrag('move')}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              data-testid="crop-box"
            >
              <div className="editor__window">
                <canvas ref={shown} className="editor__clear" />
                <span className="editor__grid" aria-hidden="true" />
              </div>
              {HANDLES.map((h) => (
                <span key={h} className={`editor__handle editor__handle--${h}`} data-handle={h}
                  onPointerDown={(e) => { e.stopPropagation(); startDrag(h)(e); }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </Overlay>
  );
}