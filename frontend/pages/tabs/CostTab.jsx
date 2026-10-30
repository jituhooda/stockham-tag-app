import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { IconBox, IconDollarBox, IconPlus, IconTrash, IconUsers } from '../../components/icons';
import { apexConfig } from '../../lib/apexConfig';
import { ActionBar, SaveButton, SearchSelect } from '../../components/ui';
import { useMasterData } from '../../hooks/useMasterData';
import { tagPath } from '../../routes/router';
import { emptyEquipment, emptyExpense, emptyLabor, emptyMaterial } from '../../services/tagModel';

const SUBS = [
  { key: 'labor', label: 'Labor' },
  { key: 'material', label: 'Material' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'equipment', label: 'Equipment' },
] ;

export function CostTab(props) {
  const { tag, save, readOnly, busy } = props;
  const sub = SUBS.some((s) => s.key === props.sub) ? props.sub : 'labor';

  return (
    <>
      <nav className="subtabs" aria-label="Cost type">
        {SUBS.map((s) => (
          <NavLink key={s.key} to={tagPath(tag.id, 'cost', s.key)} className={() => `subtab${sub === s.key ? ' is-active' : ''}`}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      <div className="tab-body">
        {sub === 'labor' && <LaborSection {...props} />}
        {sub === 'material' && <MaterialSection {...props} />}
        {sub === 'expenses' && <ExpenseSection {...props} />}
        {sub === 'equipment' && <EquipmentSection {...props} />}
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} busy={busy} />
        </ActionBar>
      )}
    </>
  );
}

/** add / change / remove helpers for one of the tag's line arrays */
function useLines({ tag, edit }, key, make) {
  return {
    lines: tag[key],
    add: () => edit((t) => ({ [key]: [...t[key], make()] })),
    change: (k, patch) => edit((t) => ({ [key]: t[key].map((l) => (l.key === k ? { ...l, ...patch } : l)) })),
    remove: (k) => edit((t) => ({ [key]: t[key].filter((l) => l.key !== k) })),
  };
}

function Section({ icon, title, addLabel, onAdd, readOnly, children, empty }

) {
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

const DELETE_SAVED_NOTE = 'Removing lines already saved in eMachine isn’t connected yet';

/** Trash button; disabled for lines already in eMachine until the delete API is wired. */
function DeleteBtn({ onClick, label, hidden, line }) {
  if (hidden) return null;
  const locked = !!line?.id && !apexConfig.features.deleteLines;
  return (
    <button className="icon-btn trash" onClick={onClick} aria-label={label} disabled={locked} title={locked ? DELETE_SAVED_NOTE : label}>
      <IconTrash size={28} />
    </button>
  );
}

function NumField({ label, value, onChange, readOnly, step = '0.25' }

) {
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

/** Normalised master items ({ id, label }) -> select options. */
function useOptions(items) {
  return useMemo(() => items.map((i) => ({ value: String(i.id ?? i.label), label: i.label })), [items]);
}

function LaborSection(props) {
  const { readOnly } = props;
  const employeeList = useMasterData('employees');
  const tradeList = useMasterData('trades');
  const { lines, add, change, remove } = useLines(props, 'labor', emptyLabor);

  const employees = useMemo(
    () => employeeList.data.map((e) => ({ value: e.id, label: e.name, sub: [e.employee, e.division].filter(Boolean).join(' · ') })),
    [employeeList.data],
  );
  const trades = useOptions(tradeList.data);

  return (
    <Section
      icon={<IconUsers size={20} />}
      title="LABOR"
      addLabel="Add Labor"
      readOnly={readOnly}
      empty={!lines.length}
      onAdd={add}
    >
      {lines.map((l) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Resource</span>
              <SearchSelect
                value={l.employeeName}
                options={employees}
                loading={employeeList.loading}
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
                loading={tradeList.loading}
                disabled={readOnly}
                ariaLabel="Trade"
                placeholder="Trade"
                onChange={(o) => change(l.key, { tradeId: o.value, trade: o.label })}
              />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove labor line" line={l} onClick={() => remove(l.key)} />
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

/** Pick from the master list; eMachine stores the chosen row's Id. */
function DescriptionPicker({ value, options, loading, readOnly, onChange }) {
  return (
    <SearchSelect
      value={value}
      options={options}
      loading={loading}
      searchIcon
      disabled={readOnly}
      ariaLabel="Description"
      placeholder="Search the list"
      onChange={onChange}
    />
  );
}

function MaterialSection(props) {
  const { readOnly } = props;
  const list = useMasterData('materials');
  const { lines, add, change, remove } = useLines(props, 'materials', emptyMaterial);
  const options = useOptions(list.data);

  return (
    <Section icon={<IconBox size={20} />} title="MATERIALS" addLabel="Add Material" readOnly={readOnly} empty={!lines.length}
      onAdd={add}>
      {lines.map((l) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Description</span>
              <DescriptionPicker value={l.description} options={options} loading={list.loading} readOnly={readOnly}
                onChange={(o) => change(l.key, { materialId: o.value, description: o.label })} />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove material" line={l} onClick={() => remove(l.key)} />
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

function ExpenseSection(props) {
  const { readOnly } = props;
  const list = useMasterData('expenses');
  const { lines, add, change, remove } = useLines(props, 'expenses', emptyExpense);
  const options = useOptions(list.data);
  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  // Prefill an amount when the master row carries a default (Amount/Rate/Cost).
  const defaultAmount = (label) => {
    const v = list.data.find((i) => i.label === label)?.defaultAmount;
    return v ? v.toFixed(2) : '';
  };

  return (
    <Section icon={<IconDollarBox size={20} />} title="OTHER CHARGES" addLabel="Add Expense" readOnly={readOnly} empty={!lines.length}
      onAdd={add}>
      {lines.map((l) => (
        <div className="expense-row" key={l.key}>
          <SearchSelect
            className="grow"
            value={l.description}
            options={options}
            loading={list.loading}
            disabled={readOnly}
            ariaLabel="Expense"
            placeholder="Expense"
            onChange={(o) => change(l.key, { expenseId: o.value, description: o.label, amount: l.amount || defaultAmount(o.label) })}
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
          <DeleteBtn hidden={readOnly} label="Remove expense" line={l} onClick={() => remove(l.key)} />
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

function EquipmentSection(props) {
  const { readOnly } = props;
  const list = useMasterData('equipment');
  const { lines, add, change, remove } = useLines(props, 'equipment', emptyEquipment);
  const options = useOptions(list.data);

  return (
    <Section icon={<IconBox size={20} />} title="EQUIPMENT" addLabel="Add Equipment" readOnly={readOnly} empty={!lines.length}
      onAdd={add}>
      {lines.map((l) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Description</span>
              <DescriptionPicker value={l.description} options={options} loading={list.loading} readOnly={readOnly}
                onChange={(o) => change(l.key, { equipmentId: o.value, description: o.label })} />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove equipment" line={l} onClick={() => remove(l.key)} />
          </div>
          <div className="line-card__nums">
            <NumField label="Qty" value={l.qty} readOnly={readOnly} step="1" onChange={(v) => change(l.key, { qty: v })} />
          </div>
        </div>
      ))}
    </Section>
  );
}
