import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconBox, IconDollarBox, IconPlus, IconTrash, IconUsers } from '../../components/icons';
import { NewEquipmentDialog } from '../../components/NewEquipmentDialog';
import { NewMaterialDialog } from '../../components/NewMaterialDialog';
import { apexApi } from '../../lib/apexApi';
import { WritesDisabledError } from '../../lib/apexHttp';
import { ActionBar, ConfirmDialog, SaveButton, SearchSelect, useToast } from '../../components/ui';
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
function useLines({ tag, edit, editor }, key, make) {
  const toast = useToast();
  const [asking, setAsking] = useState(null); // the line waiting for "Are you sure to delete?"

  const confirmDelete = async () => {
    const line = asking;
    try {
      // Saved lines are deleted in eMachine right away (as the existing app does); new lines were never saved.
      if (line.id) await apexApi.tags.deleteLine(key, line.id);
      if (line.id) editor.dropLine(key, line.key);
      else edit((t) => ({ [key]: t[key].filter((l) => l.key !== line.key) }));
      setAsking(null);
      toast('Deleted');
    } catch (e) {
      setAsking(null);
      toast(e instanceof WritesDisabledError ? 'Saving to eMachine is turned off, so nothing was deleted.' : e.message, 'error');
    }
  };

  return {
    lines: tag[key],
    add: () => edit((t) => ({ [key]: [...t[key], make()] })),
    change: (k, patch) => edit((t) => ({ [key]: t[key].map((l) => (l.key === k ? { ...l, ...patch } : l)) })),
    remove: (k) => setAsking(tag[key].find((l) => l.key === k) || null),
    confirm: asking && <ConfirmDialog text="Are you sure to delete?" onCancel={() => setAsking(null)} onConfirm={confirmDelete} />,
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

/** Trash button: asks "Are you sure to delete?" first. */
function DeleteBtn({ onClick, label, hidden }) {
  if (hidden) return null;
  return (
    <button className="icon-btn trash" onClick={onClick} aria-label={label} title={label}>
      <IconTrash size={28} />
    </button>
  );
}

/** Keeps digits (and one decimal point unless whole numbers only); drops everything else, including pasted text. */
const cleanNumber = (raw, whole) => {
  if (whole) return raw.replace(/\D/g, '');
  const [int, ...rest] = raw.replace(/,/g, '.').replace(/[^\d.]/g, '').split('.');
  return rest.length ? `${int}.${rest.join('')}` : int;
};

/** Numeric input: empty shows the placeholder; typing accepts only numbers (decimals too, except for whole-number fields). */
function NumField({ label, value, onChange, readOnly, step = '0.25', placeholder = label }) {
  const whole = step === '1';
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="input"
        type="text"
        inputMode={whole ? 'numeric' : 'decimal'}
        autoComplete="off"
        enterKeyHint="next"
        placeholder={placeholder}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(cleanNumber(e.target.value, whole))}
        onBlur={(e) => {
          const v = e.target.value;
          if (whole || v === '' || v === '.') return onChange(v === '.' ? '' : v);
          onChange(Number(v).toFixed(2));
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
  const { lines, add, change, remove, confirm } = useLines(props, 'labor', emptyLabor);

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
          <div className="line-card__top line-card__top--labor">
            <label className="field">
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
            <DeleteBtn hidden={readOnly} label="Remove labor line" onClick={() => remove(l.key)} />
          </div>
          <div className="line-card__nums">
            <NumField label="Regular" value={l.regular} readOnly={readOnly} onChange={(v) => change(l.key, { regular: v })} />
            <NumField label="Overtime" value={l.overtime} readOnly={readOnly} onChange={(v) => change(l.key, { overtime: v })} />
            <NumField label="DoubleTime" placeholder="Double" value={l.doubleTime} readOnly={readOnly} onChange={(v) => change(l.key, { doubleTime: v })} />
          </div>
        </div>
      ))}
      {confirm}
    </Section>
  );
}

/** Pick from the master list; eMachine stores the chosen row's Id. */
function DescriptionPicker({ value, options, loading, readOnly, onChange, onAdd, addLabel }) {
  const picker = (
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
  if (!onAdd || readOnly) return picker;
  return (
    <div className="desc-picker">
      {picker}
      <button type="button" className="icon-btn desc-picker__add" aria-label={addLabel} title={addLabel} onClick={onAdd}>
        <IconPlus size={26} />
      </button>
    </div>
  );
}

/**
 * The "+" flow for a master list: create the item in eMachine, reload the list, and select the new item on the
 * line that asked. If the name is already in the list nothing is created and that item is selected instead.
 */
function useAddMasterItem({ list, change, noun, apply, send }) {
  const toast = useToast();
  const [adding, setAdding] = useState(null); // the line whose "+" was tapped

  const create = async (input) => {
    const line = adding;
    const name = input.description.toLowerCase();
    let item = list.data.find((m) => m.label.toLowerCase() === name);
    const existed = !!item;
    if (!item) {
      let id;
      try {
        id = await send(input);
      } catch (e) {
        if (e instanceof WritesDisabledError) throw new Error(`Saving to eMachine is turned off, so the ${noun} was not added.`);
        throw e;
      }
      const fresh = await list.reload();
      item = (id != null && fresh.find((m) => m.id === String(id))) || fresh.find((m) => m.label.toLowerCase() === name);
    }
    setAdding(null);
    if (item) change(line.key, apply(item));
    toast(existed ? `“${item.label}” is already in the list` : `${noun[0].toUpperCase()}${noun.slice(1)} added`);
  };

  return { adding, setAdding, create };
}

function MaterialSection(props) {
  const { readOnly } = props;
  const list = useMasterData('materials');
  const { lines, add, change, remove, confirm } = useLines(props, 'materials', emptyMaterial);
  const options = useOptions(list.data);
  const { adding, setAdding, create } = useAddMasterItem({
    list, change, noun: 'material', apply: (item) => ({ materialId: String(item.id), description: item.label }),
    send: (input) => apexApi.master.createMaterial(input),
  });

  return (
    <Section icon={<IconBox size={20} />} title="MATERIALS" addLabel="Add Material" readOnly={readOnly} empty={!lines.length}
      onAdd={add}>
      {lines.map((l) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Description</span>
              <DescriptionPicker value={l.description} options={options} loading={list.loading} readOnly={readOnly}
                onChange={(o) => change(l.key, { materialId: o.value, description: o.label })}
                onAdd={() => setAdding(l)} addLabel="Add new material" />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove material" onClick={() => remove(l.key)} />
          </div>
          <div className="line-card__nums">
            <NumField label="Qty" value={l.qty} readOnly={readOnly} step="1" onChange={(v) => change(l.key, { qty: v })} />
            <NumField label="Length" value={l.length} readOnly={readOnly} step="1" onChange={(v) => change(l.key, { length: v })} />
          </div>
        </div>
      ))}
      {confirm}
      {adding && <NewMaterialDialog onCancel={() => setAdding(null)} onCreate={create} />}
    </Section>
  );
}

function ExpenseSection(props) {
  const { readOnly } = props;
  const list = useMasterData('expenses');
  const { lines, add, change, remove, confirm } = useLines(props, 'expenses', emptyExpense);
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
          <DeleteBtn hidden={readOnly} label="Remove expense" onClick={() => remove(l.key)} />
        </div>
      ))}
      {lines.length > 0 && (
        <div className="expense-total">
          Total <strong>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      )}
      {confirm}
    </Section>
  );
}

function EquipmentSection(props) {
  const { readOnly } = props;
  const list = useMasterData('equipment');
  const { lines, add, change, remove, confirm } = useLines(props, 'equipment', emptyEquipment);
  const options = useOptions(list.data);
  const { adding, setAdding, create } = useAddMasterItem({
    list, change, noun: 'equipment', apply: (item) => ({ equipmentId: String(item.id), description: item.label }),
    send: (input) => apexApi.master.createEquipment(input),
  });

  return (
    <Section icon={<IconBox size={20} />} title="EQUIPMENT" addLabel="Add Equipment" readOnly={readOnly} empty={!lines.length}
      onAdd={add}>
      {lines.map((l) => (
        <div className="line-card" key={l.key}>
          <div className="line-card__top">
            <label className="field grow">
              <span className="field-label">Description</span>
              <DescriptionPicker value={l.description} options={options} loading={list.loading} readOnly={readOnly}
                onChange={(o) => change(l.key, { equipmentId: o.value, description: o.label })}
                onAdd={() => setAdding(l)} addLabel="Add new equipment" />
            </label>
            <DeleteBtn hidden={readOnly} label="Remove equipment" onClick={() => remove(l.key)} />
          </div>
          <div className="line-card__nums">
            <NumField label="Qty" value={l.qty} readOnly={readOnly} step="1" onChange={(v) => change(l.key, { qty: v })} />
          </div>
        </div>
      ))}
      {confirm}
      {adding && <NewEquipmentDialog onCancel={() => setAdding(null)} onCreate={create} />}
    </Section>
  );
}
