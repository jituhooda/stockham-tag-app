import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { IconChevronDown, IconSearch } from './Icons';
import { cx } from '../utils/misc';

export interface Option {
  value: string;
  label: string;
  sub?: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (opt: Option) => void;
  placeholder?: string;
  searchIcon?: boolean;
  loading?: boolean;
  /** Offer "Use “typed text”" when nothing matches exactly. */
  allowCustom?: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

const MAX_RESULTS = 200;

export function SearchSelect({
  value, options, onChange, placeholder = 'Select…', searchIcon, loading, allowCustom, ariaLabel, className, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
  const items: (Option & { custom?: boolean })[] = custom ? [...filtered, { ...custom, custom: true }] : filtered;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const choose = (o: Option) => {
    onChange({ value: o.value, label: o.label, sub: o.sub });
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKey = (e: React.KeyboardEvent) => {
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
