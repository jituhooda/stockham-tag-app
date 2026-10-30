import { useEffect, useState } from 'react';
import { IconCheck, IconClose } from './icons';

/**
 * "+" next to an equipment line's Description: add a new item to the equipment list (name only).
 * `onCreate({ description })` may be async and should throw to show an error.
 */
export function NewEquipmentDialog({ onCancel, onCreate }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = name.trim() && !busy;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      await onCreate({ description: name.trim() });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <form className="dialog dialog--form" role="dialog" aria-modal="true" aria-label="Add New Equipment" aria-busy={busy} onSubmit={submit}>
        <label className="dialog__row dialog__row--equipment">
          <span>Equipment Name</span>
          <input className="input" value={name} maxLength={200} autoFocus autoComplete="off" disabled={busy}
            placeholder="Enter Equipment Name" onChange={(e) => setName(e.target.value)} />
        </label>
        {error && <p className="dialog__error" role="alert">{error}</p>}
        <div className="dialog__actions">
          <button type="button" className="dialog__btn dialog__btn--no" aria-label="Cancel" disabled={busy} onClick={onCancel}><IconClose size={36} /></button>
          <button type="submit" className="dialog__btn dialog__btn--yes" aria-label="Save new equipment" disabled={!ready}>
            {busy ? <span className="dialog__spinner" role="status" aria-label="Adding" /> : <IconCheck size={36} />}
          </button>
        </div>
      </form>
    </div>
  );
}
