/**
 * Shared UI building blocks: buttons, status pills, the searchable select,
 * toasts, the signature pad and the Stockham logo.
 */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { IconCheckCircle, IconChevronDown, IconSave, IconSearch } from './icons';

export const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- Logo */

/** Stockham Construction wordmark (script name over a red-ruled block caption). */
export function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 52" role="img" aria-label="Stockham Construction">
      <text x="4" y="22" fontFamily="'Brush Script MT','Segoe Script',cursive" fontStyle="italic" fontSize="22" fill="#1d1d1d" transform="rotate(-8 30 20)">
        Stockham
      </text>
      <rect x="2" y="30" width="116" height="2" fill="#c0282d" />
      <text x="60" y="42" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900" fontSize="11" letterSpacing="0.5" fill="#1d1d1d" textAnchor="middle">
        CONSTRUCTION
      </text>
      <rect x="2" y="45" width="116" height="4" fill="#c0282d" />
    </svg>
  );
}

/* ---------------------------------------------------------------- StatusPill */

export function StatusPill({ status }) {
  const key = status.toLowerCase().replace(/[^a-z]/g, '');
  return <span className={`status-pill status-pill--${key}`}>{status || 'Draft'}</span>;
}

/* ---------------------------------------------------------------- ActionBar */

export function ActionBar({ children }) {
  return <div className="action-bar">{children}</div>;
}

export const SaveButton = ({ onClick, disabled, busy }) => (
  <button className="btn btn--dark" onClick={onClick} disabled={disabled || busy}>
    <IconSave size={20} /> {busy ? 'Saving…' : 'Save'}
  </button>
);

export const SubmitButton = ({ onClick, disabled, busy, label = 'Submit' }) => (
  <button className="btn btn--dark btn--right" onClick={onClick} disabled={disabled || busy}>
    <IconCheckCircle size={22} /> {busy ? 'Working…' : label}
  </button>
);

/* ---------------------------------------------------------------- SearchSelect */

const MAX_RESULTS = 200;

export function SearchSelect({
  value, options, onChange, placeholder = 'Select…', searchIcon, loading, allowCustom, ariaLabel, className, disabled,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q))
      : options;
    return list.slice(0, MAX_RESULTS);
  }, [options, query]);

  const custom =
    allowCustom && query.trim() && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())
      ? { value: query.trim(), label: query.trim() }
      : null;
  const items = custom ? [...filtered, { ...custom, custom: true }] : filtered;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target )) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const choose = (o) => {
    onChange({ value: o.value, label: o.label, sub: o.sub });
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && items[active]) {
        e.preventDefault();
        choose(items[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={wrapRef} className={cx('combo', open && 'combo--open', disabled && 'combo--disabled', className)}>
      <div className="combo__control" onClick={() => !disabled && inputRef.current?.focus()}>
        {searchIcon && <IconSearch className="combo__search" size={20} />}
        <input
          ref={inputRef}
          className="combo__input"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : value}
          placeholder={open ? value || placeholder : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKey}
        />
        <IconChevronDown className="combo__chev" size={18} />
      </div>
      {open && (
        <ul className="combo__list" id={listId} role="listbox">
          {loading && !options.length && <li className="combo__empty">Loading…</li>}
          {!loading && !items.length && <li className="combo__empty">No matches</li>}
          {items.map((o, i) => (
            <li
              key={`${o.value}-${i}`}
              role="option"
              aria-selected={o.label === value}
              className={cx('combo__opt', i === active && 'is-active', o.label === value && 'is-selected')}
              onPointerEnter={() => setActive(i)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
            >
              {o.custom ? <>Use “<strong>{o.label}</strong>”</> : o.label}
              {o.sub && <span className="combo__sub">{o.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Toast */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(undefined);
  const show = useCallback((msg, kind = 'ok') => {
    window.clearTimeout(timer.current);
    setToast({ msg, kind });
    timer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-host" aria-live="polite">
        {toast && <div className={cx('toast', `toast--${toast.kind}`)}>{toast.msg}</div>}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------------------------------------------------------------- SignaturePad */

/** Pointer-driven signature canvas; emits a PNG data URL after each stroke. */
export function SignaturePad({ value, onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Size the backing store to the element (and DPR), redrawing the saved image.
  useEffect(() => {
    const canvas = canvasRef.current;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#3a3a3a';
      paint(valueRef.current);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();
    return () => ro.disconnect();
  }, []);

  // Repaint when cleared or loaded from outside.
  useEffect(() => {
    if (!drawing.current) paint(value);
  }, [value]);

  function paint(src) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    if (!src) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, width, height);
    img.src = src;
  }

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <canvas
      ref={canvasRef}
      className={`sig-pad${disabled ? ' is-disabled' : ''}`}
      aria-label="Signature area"
      role="img"
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        last.current = pos(e);
        const ctx = e.currentTarget.getContext('2d');
        ctx.beginPath();
        ctx.arc(last.current.x, last.current.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#3a3a3a';
        ctx.fill();
      }}
      onPointerMove={(e) => {
        if (!drawing.current || !last.current) return;
        const ctx = e.currentTarget.getContext('2d');
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
      }}
      onPointerUp={(e) => {
        if (!drawing.current) return;
        drawing.current = false;
        last.current = null;
        onChange(e.currentTarget.toDataURL('image/png'));
      }}
      onPointerCancel={() => {
        drawing.current = false;
        last.current = null;
      }}
    />
  );
}

/* ---------------------------------------------------------------- Banner / Spinner */

export function Banner({ kind = 'info', children, action }) {
  return (
    <div className={`banner banner--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {action}
    </div>
  );
}

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="spinner" role="status">
    <span className="spinner__dot" aria-hidden="true" />
    {label}
  </div>
);
