import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ActionBar, SaveButton } from '../../components/ActionBar';
import { IconBox, IconDollarBox, IconPlus, IconTrash, IconUsers, IconWrench } from '../../components/Icons';
import type { Option } from '../../components/SearchSelect';
import { SearchSelect } from '../../components/SearchSelect';
import { useMasterData } from '../../store/MasterDataContext';
import type { EquipmentLine, ExpenseLine, LaborLine, MaterialLine, Tag } from '../../types';
import { idOf, labelOf, num, str } from '../../utils/fields';
import { uid } from '../../utils/misc';
import type { TabProps } from '../TagDetailPage';

const SUBS = [
  { key: 'labor', label: 'Labor' },
  { key: 'material', label: 'Material' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'equipment', label: 'Equipment' },
] as const;

type ListKey = 'labor' | 'materials' | 'expenses' | 'equipment';
type LineOf<K extends ListKey> = Tag[K][number];

export function CostTab(props: TabProps & { sub?: string }) {
  const { tag, save, readOnly } = props;
  const sub = SUBS.some((s) => s.key === props.sub) ? props.sub! : 'labor';

  return (
    <>
      <nav className="subtabs" aria-label="Cost type">
        {SUBS.map((s) => (
          <NavLink key={s.key} to={`/tags/${tag.id}/cost/${s.key}`} className={() => `subtab${sub === s.key ? ' is-active' : ''}`}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      <div className="tab-body">
        {!tag.linesLoaded ? (
          <p className="muted small center">Loading cost lines…</p>
        ) : (
          <>
        {sub === 'labor' && <LaborSection {...props} />}
        {sub === 'material' && <MaterialSection {...props} />}
        {sub === 'expenses' && <ExpenseSection {...props} />}
        {sub === 'equipment' && <EquipmentSection {...props} />}
          </>
        )}
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} disabled={!tag.linesLoaded} />
        </ActionBar>
      )}
    </>
  );
}

/** add / change / remove helpers for one of the tag's line arrays */
function useLines<K extends ListKey>({ tag, edit }: TabProps, key: K) {
  const lines = tag[key] as LineOf<K>[];
  return {
    lines,
    add: (line: Omit<LineOf<K>, 'key'>) =>
      edit((t) => ({ [key]: [...(t[key] as LineOf<K>[]), { ...line, key: uid() }] }) as Partial<Tag>),
    change: (k: string, patch: Partial<LineOf<K>>) =>
      edit((t) => ({ [key]: (t[key] as LineOf<K>[]).map((l) => (l.key === k ? { ...l, ...patch } : l)) }) as Partial<Tag>),
    remove: (k: string) =>
      edit((t) => ({ [key]: (t[key] as LineOf<K>[]).filter((l) => l.key !== k) }) as Partial<Tag>),
  };
}

function Section({ icon, title, addLabel, onAdd, readOnly, children, empty }: {
  icon: ReactNode; title: string; addLabel: string; onAdd: () => void; readOnly: boolean; children: ReactNode; empty: boolean;
}) {
  return (
    <section>
      <div className="section-head">{icon}<h3>{title}</h3></div>
      {!readOnly && (
        <button className="btn btn--outline btn--block add-line" onClick={onAdd}>
          <IconPlus size={20} /> {addLabel}
        </button>
      )}
      {empty && <p className="muted small center">Nothing added yet.</p>}
      <div className="line-grid">{children}</div>
    </section>
  );
}

function DeleteBtn({ onClick, label, hidden }: { onClick: () => void; label: string; hidden: boolean }) {
  if (hidden) return null;
  return (
    <button className="icon-btn trash" onClick={onClick} aria-label={label}>
      <IconTrash size={28} />
    </button>
  );
}

function NumField({ label, value, onChange, readOnly, step = '0.25' }: {
  label: string; value: string; onChange: (v: string) => void; readOnly: boolean; step?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (step !== '1' && e.target.value !== '' && Number.isFinite(n)) onChange(n.toFixed(2));
        }}
      />
    </label>
  );
}

/** Master rows → unique options, labelled with the row's best description. */
function useOptions(rows: Record<string, unknown>[], labelFields?: string[]): Option[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const out: Option[] = [];
    for (const r of rows) {
      const label = (labelFields && str(r, ...labelFields)) || labelOf(r);
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      out.push({ value: idOf(r), label });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, labelFields]);
}

const TRADE_FIELDS = ['Trade', 'trade', 'TradeName', 'trade_name', 'Classification', 'Craft', 'LaborType', 'labor_type'];

function LaborSection(props: TabProps) {
  const { readOnly } = props;
  const { data } = useMasterData();
  const { lines, add, change, remove } = useLines(props, 'labor');

  const employees = useMemo(
    () =>
      data.employees.rows.map((r) => ({
        value: str(r, 'Id', 'Employee'),
        label: str(r, 'EmployeeName') || str(r, 'Employee'),
        sub: [str(r, 'Employee'), str(r, 'Division')].filter(Boolean).join(' · '),
      })),
    [data.employees.rows],
  );
  const trades = useOptions(data.laborRates.rows, TRADE_FIELDS);

  return (
    <Section
      icon={<IconUsers size={20} />}
      title="LABOR"
      addLabel="Add Labor"
      readOnly={readOnly}
      empty={!lines.length}
      onAdd={() => add({ employeeId: '', employeeName: '', trade: '', regular: '', overtime: '', doubleTime: '' })}
    >
      {lines.map((l: LaborLine) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Resource</span>
              <SearchSelect
                value={l.employeeName}
                options={employees}
                loading={data.employees.loading}
                searchIcon
                disabled={readOnly}
                ariaLabel="Resource"
                placeholder="Employee"
                onChange={(o) => change(l.key, { employeeId: o.value, employeeName: o.label })}
              />
            </label>
            <label className="field grow">
              <span className="field-label">Trade</span>
              <SearchSelect
                value={l.trade}
                options={trades}
                loading={data.laborRates.loading}
                allowCustom
                disabled={readOnly}
                ariaLabel="Trade"
                placeholder="Trade"
                onChange={(o) => change(l.key, { trade: o.label })}
              />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove labor line" onClick={() => remove(l.key)} />
          </div>
          <div className="line-card__nums">
            <NumField label="Regular" value={l.regular} readOnly={readOnly} onChange={(v) => change(l.key, { regular: v })} />
            <NumField label="Overtime" value={l.overtime} readOnly={readOnly} onChange={(v) => change(l.key, { overtime: v })} />
            <NumField label="DoubleTime" value={l.doubleTime} readOnly={readOnly} onChange={(v) => change(l.key, { doubleTime: v })} />
          </div>
        </div>
      ))}
    </Section>
  );
}

function DescriptionPicker({ value, options, loading, readOnly, onChange }: {
  value: string; options: Option[]; loading: boolean; readOnly: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="desc-picker">
      <SearchSelect
        value={value}
        options={options}
        loading={loading}
        allowCustom
        disabled={readOnly}
        ariaLabel="Description"
        placeholder="Select or type"
        onChange={(o) => onChange(o.label)}
      />
      {!readOnly && (
        <button
          className="icon-btn"
          aria-label="Enter a description not in the list"
          title="Enter a description not in the list"
          onClick={() => {
            const v = window.prompt('Description', value);
            if (v?.trim()) onChange(v.trim());
          }}
        >
          <IconPlus size={24} />
        </button>
      )}
    </div>
  );
}

function MaterialSection(props: TabProps) {
  const { readOnly } = props;
  const { data } = useMasterData();
  const { lines, add, change, remove } = useLines(props, 'materials');
  const options = useOptions(data.materials.rows);

  return (
    <Section icon={<IconBox size={20} />} title="MATERIALS" addLabel="Add Material" readOnly={readOnly} empty={!lines.length}
      onAdd={() => add({ description: '', qty: '', length: '' })}>
      {lines.map((l: MaterialLine) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Description</span>
              <DescriptionPicker value={l.description} options={options} loading={data.materials.loading} readOnly={readOnly}
                onChange={(v) => change(l.key, { description: v })} />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove material" onClick={() => remove(l.key)} />
          </div>
          <div className="line-card__nums">
            <NumField label="Qty" value={l.qty} readOnly={readOnly} step="1" onChange={(v) => change(l.key, { qty: v })} />
            <NumField label="Length" value={l.length} readOnly={readOnly} step="1" onChange={(v) => change(l.key, { length: v })} />
          </div>
        </div>
      ))}
    </Section>
  );
}

function ExpenseSection(props: TabProps) {
  const { readOnly } = props;
  const { data } = useMasterData();
  const { lines, add, change, remove } = useLines(props, 'expenses');
  const options = useOptions(data.expenses.rows);
  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  // Prefill an amount when the master row carries a default (Amount/Rate/Cost).
  const defaultAmount = (label: string) => {
    const row = data.expenses.rows.find((r) => labelOf(r) === label);
    const v = row ? num(row, 'Amount', 'amount', 'Rate', 'rate', 'Cost', 'cost', 'Price', 'price') : 0;
    return v ? v.toFixed(2) : '';
  };

  return (
    <Section icon={<IconDollarBox size={20} />} title="OTHER CHARGES" addLabel="Add Expense" readOnly={readOnly} empty={!lines.length}
      onAdd={() => add({ description: '', amount: '' })}>
      {lines.map((l: ExpenseLine) => (
        <div className="expense-row" key={l.key}>
          <SearchSelect
            className="grow"
            value={l.description}
            options={options}
            loading={data.expenses.loading}
            allowCustom
            disabled={readOnly}
            ariaLabel="Expense"
            placeholder="Expense"
            onChange={(o) => change(l.key, { description: o.label, amount: l.amount || defaultAmount(o.label) })}
          />
          <input
            className="input amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            aria-label="Amount"
            placeholder="0.00"
            value={l.amount}
            disabled={readOnly}
            onChange={(e) => change(l.key, { amount: e.target.value })}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== '' && Number.isFinite(n)) change(l.key, { amount: n.toFixed(2) });
            }}
          />
          <DeleteBtn hidden={readOnly} label="Remove expense" onClick={() => remove(l.key)} />
        </div>
      ))}
      {lines.length > 0 && (
        <div className="expense-total">
          Total <strong>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      )}
    </Section>
  );
}

function EquipmentSection(props: TabProps) {
  const { readOnly } = props;
  const { data } = useMasterData();
  const { lines, add, change, remove } = useLines(props, 'equipment');
  const options = useOptions(data.equipment.rows);

  return (
    <Section icon={<IconWrench size={20} />} title="EQUIPMENT" addLabel="Add Equipment" readOnly={readOnly} empty={!lines.length}
      onAdd={() => add({ description: '', qty: '' })}>
      {lines.map((l: EquipmentLine) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Description</span>
              <DescriptionPicker value={l.description} options={options} loading={data.equipment.loading} readOnly={readOnly}
                onChange={(v) => change(l.key, { description: v })} />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove equipment" onClick={() => remove(l.key)} />
          </div>
          <div className="line-card__nums">
            <NumField label="Qty" value={l.qty} readOnly={readOnly} step="1" onChange={(v) => change(l.key, { qty: v })} />
          </div>
        </div>
      ))}
    </Section>
  );
}
