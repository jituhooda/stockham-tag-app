import { useEffect, useState } from 'react';
import { useMasterData } from '../hooks/useMasterData';
import { IconCheck, IconClose } from './icons';

/**
 * "+" next to a material's Description: add a new item to the material list.
 * Description is free text; Type is one of the trades (its Id is saved as CostCodeID).
 * `onCreate({ description, costCodeId })` may be async and should throw to show an error.
 */
export function NewMaterialDialog({ onCancel, onCreate }) {
  const trades = useMasterData('trades');
  const [description, setDescription] = useState('');
  const [typeId, setTypeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Start on the first type, like the existing app.
  const chosen = typeId || trades.data[0]?.id || '';
  const ready = description.trim() && chosen && !busy;

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
      await onCreate({ description: description.trim(), costCodeId: chosen });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <form className="dialog dialog--form" role="dialog" aria-modal="true" aria-label="Add New Material" aria-busy={busy} onSubmit={submit}>
        <h2 className="dialog__title">Add New Material</h2>
        <label className="dialog__row">
          <span>Description</span>
          <input className="input" value={description} maxLength={200} autoFocus autoComplete="off" disabled={busy}
            placeholder="Enter Material Name" onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="dialog__row">
          <span>Type</span>
          <select className="input" value={chosen} disabled={busy || trades.loading} onChange={(e) => setTypeId(e.target.value)}>
            {trades.data.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        {error && <p className="dialog__error" role="alert">{error}</p>}
        <div className="dialog__actions">
          <button type="button" className="dialog__btn dialog__btn--no" aria-label="Cancel" disabled={busy} onClick={onCancel}><IconClose size={36} /></button>
          <button type="submit" className="dialog__btn dialog__btn--yes" aria-label="Save new material" disabled={!ready}>
            {busy ? <span className="dialog__spinner" role="status" aria-label="Adding" /> : <IconCheck size={36} />}
          </button>
        </div>
      </form>
    </div>
  );
}
