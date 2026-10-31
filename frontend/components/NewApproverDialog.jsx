import { useEffect, useState } from 'react';
import { IconCheck, IconClose } from './icons';
import { Overlay } from './ui';

/**
 * "+" next to the approver: add a contact for the customer. `onCreate({ firstName, lastName, email })` may be
 * async and should throw to show an error in the dialog.
 */
export function NewApproverDialog({ customerName, onCancel, onCreate }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ready = form.firstName.trim() && form.email.trim() && !busy;

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
      await onCreate(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Overlay>
      <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
        <form className="dialog dialog--form" role="dialog" aria-modal="true" aria-label="Add New Approver" aria-busy={busy} onSubmit={submit} noValidate>
          <h2 className="dialog__title">Add New Approver</h2>
          {customerName && <p className="dialog__sub">{customerName}</p>}
          <label className="dialog__row">
            <span>First Name</span>
            <input className="input" value={form.firstName} maxLength={100} autoFocus autoComplete="off" disabled={busy} onChange={set('firstName')} />
          </label>
          <label className="dialog__row">
            <span>Last Name</span>
            <input className="input" value={form.lastName} maxLength={100} autoComplete="off" disabled={busy} onChange={set('lastName')} />
          </label>
          <label className="dialog__row">
            <span>Email</span>
            <input className="input" type="email" inputMode="email" value={form.email} maxLength={200} autoComplete="off" autoCapitalize="none" disabled={busy} onChange={set('email')} />
          </label>
          {error && <p className="dialog__error" role="alert">{error}</p>}
          <div className="dialog__actions">
            <button type="button" className="dialog__btn dialog__btn--no" aria-label="Cancel" disabled={busy} onClick={onCancel}><IconClose size={36} /></button>
            <button type="submit" className="dialog__btn dialog__btn--yes" aria-label="Save new approver" disabled={!ready}>
              {busy ? <span className="dialog__spinner" role="status" aria-label="Adding" /> : <IconCheck size={36} />}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}
