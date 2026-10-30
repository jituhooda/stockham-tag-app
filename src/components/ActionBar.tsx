import type { ReactNode } from 'react';
import { IconCheckCircle, IconSave } from './Icons';

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}

export const SaveButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <button className="btn btn--dark" onClick={onClick} disabled={disabled}>
    <IconSave size={20} /> Save
  </button>
);

export const SubmitButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <button className="btn btn--dark btn--right" onClick={onClick} disabled={disabled}>
    <IconCheckCircle size={22} /> Submit
  </button>
);
