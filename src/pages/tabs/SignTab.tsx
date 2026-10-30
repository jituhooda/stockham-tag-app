import { useMemo, useState } from 'react';
import { ActionBar, SubmitButton } from '../../components/ActionBar';
import { IconEraser, IconPlus } from '../../components/Icons';
import { SearchSelect } from '../../components/SearchSelect';
import { SignaturePad } from '../../components/SignaturePad';
import { useToast } from '../../components/Toast';
import { load, save as saveLocal } from '../../store/storage';
import { submitProblems } from '../../utils/validate';
import type { TabProps } from '../TagDetailPage';

const APPROVERS_KEY = 'stockham.approvers.v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignTab({ tag, edit, save, goTo, readOnly }: TabProps) {
  const toast = useToast();
  const sig = tag.signature;
  const customer = tag.customerName || tag.customerId || 'Customer';
  const [approvers, setApprovers] = useState<Record<string, string[]>>(() => load(APPROVERS_KEY, {}));

  const options = useMemo(() => {
    const names = new Set(approvers[customer] ?? []);
    if (sig.approver) names.add(sig.approver);
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [approvers, customer, sig.approver]);

  const setSig = (patch: Partial<typeof sig>) => edit((t) => ({ signature: { ...t.signature, ...patch } }));

  const addApprover = (name: string) => {
    const n = name.trim();
    if (!n) return;
    const next = { ...approvers, [customer]: [...new Set([...(approvers[customer] ?? []), n])] };
    setApprovers(next);
    saveLocal(APPROVERS_KEY, next);
    setSig({ approver: n });
  };

  const submit = () => {
    const problems = submitProblems(tag);
    if (!sig.approver) problems.push('Choose an approver');
    if (sig.mode === 'in-person' && !sig.image) problems.push('The approver needs to sign above');
    if (sig.mode === 'send' && !EMAIL_RE.test(sig.email)) problems.push('Enter a valid email to send the tag to');
    if (problems.length) {
      toast(problems[0], 'error');
      if (problems[0].includes('Details')) goTo('details');
      else if (problems[0].includes('cost') || problems[0].includes('line') || problems[0].includes('expense')) goTo('cost');
      return;
    }
    const signature = { ...sig, signedAt: sig.mode === 'in-person' ? new Date().toISOString() : '' };
    const status = sig.mode === 'in-person' ? 'Signed' : 'Submitted';
    if (!save({ signature, status })) return;

    if (sig.mode === 'send') {
      const subject = `Change order ${tag.tagNumber} – ${tag.jobName} – signature requested`;
      const body = [
        `Hello ${sig.approver},`,
        '',
        `Please review and sign change order tag ${tag.tagNumber} for ${tag.jobNo} ${tag.jobName}.`,
        '',
        tag.description,
        '',
        `Labor lines: ${tag.labor.length}, materials: ${tag.materials.length}, equipment: ${tag.equipment.length}, other charges: ${tag.expenses.length}.`,
        '',
        'Stockham Construction',
      ].join('\n');
      window.location.href = `mailto:${encodeURIComponent(sig.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  return (
    <>
      <div className="tab-body sign">
        <span className="field-label">Approver from {customer}</span>
        <div className="desc-picker">
          <SearchSelect
            value={sig.approver}
            options={options}
            allowCustom
            disabled={readOnly}
            ariaLabel="Approver"
            placeholder="Type the approver’s name"
            onChange={(o) => addApprover(o.label)}
          />
          {!readOnly && (
            <button className="icon-btn" aria-label="Add approver" onClick={() => addApprover(window.prompt(`New approver from ${customer}`) ?? '')}>
              <IconPlus size={26} />
            </button>
          )}
        </div>

        <fieldset className="radios" disabled={readOnly}>
          <legend className="sr-only">How will the approver sign?</legend>
          <label className="radio">
            <input type="radio" name="mode" checked={sig.mode === 'in-person'} onChange={() => setSig({ mode: 'in-person' })} />
            <span>Sign in person</span>
          </label>
          <label className="radio">
            <input type="radio" name="mode" checked={sig.mode === 'send'} onChange={() => setSig({ mode: 'send' })} />
            <span>Send for signature</span>
          </label>
        </fieldset>

        {sig.mode === 'in-person' ? (
          <>
            <span className="field-label caps">Signature</span>
            <SignaturePad value={sig.image} disabled={readOnly} onChange={(image) => setSig({ image })} />
            <div className="sig-foot">
              <span className="muted">{sig.signedAt ? `Signed ${new Date(sig.signedAt).toLocaleString()}` : 'Sign above'}</span>
              {!readOnly && (
                <button className="btn btn--outline" onClick={() => setSig({ image: '' })}>
                  <IconEraser size={18} /> Clear
                </button>
              )}
            </div>
            {sig.approver && <p className="sig-name">{sig.approver}</p>}
          </>
        ) : (
          <label className="field">
            <span className="field-label">Approver email</span>
            <input
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={sig.email}
              disabled={readOnly}
              onChange={(e) => setSig({ email: e.target.value.trim() })}
            />
          </label>
        )}
      </div>
      {!readOnly && (
        <ActionBar>
          <SubmitButton onClick={submit} />
        </ActionBar>
      )}
    </>
  );
}
