import type { Row } from '../api/client';
import type { EquipmentLine, ExpenseLine, LaborLine, MaterialLine, Tag } from '../types';
import { emptySignature } from '../types';
import { num, pick, str } from '../utils/fields';
import { isoDate, uid } from '../utils/misc';

export function tagFromRow(row: Row): Tag {
  const serverId = num(row, 'Id', 'id');
  const premium = pick(row, 'IsPremium');
  return {
    id: `s-${serverId}`,
    serverId,
    tagNumber: str(row, 'tag_number', 'TagNumber'),
    status: str(row, 'status', 'Status') || 'Draft',
    description: str(row, 'description', 'Description'),
    tagDate: isoDate(str(row, 'tag_date', 'TagDate')),
    isPremium: premium === true || premium === 1 || premium === '1' || String(premium).toLowerCase() === 'true',
    jobNo: str(row, 'JobNo'),
    jobName: str(row, 'JobName'),
    customerId: str(row, 'CustomerID', 'CustomerId'),
    customerName: str(row, 'CustomerName'),
    pmEmail: str(row, 'PMEmail'),
    address: str(row, 'Address', 'JobAddress'),
    lastModified: isoDate(str(row, 'LastModifiedDate')),
    counts: {
      labor: num(row, 'labor_count'),
      material: num(row, 'material_count'),
      equipment: num(row, 'equipment_count'),
      expense: num(row, 'expense_count'),
    },
    labor: [],
    materials: [],
    expenses: [],
    equipment: [],
    linesLoaded: false,
    attachments: [],
    issues: [],
    signature: emptySignature(),
    dirty: false,
  };
}

const n = (row: Row, ...names: string[]) => {
  const v = pick(row, ...names);
  return v == null ? '' : String(v);
};

export const laborFromRow = (row: Row): LaborLine => ({
  key: uid(),
  employeeId: n(row, 'employee_id', 'EmployeeId', 'Employee', 'employee'),
  employeeName: n(row, 'EmployeeName', 'employee_name', 'resource', 'Resource', 'Employee', 'employee'),
  trade: n(row, 'trade', 'Trade'),
  regular: n(row, 'regular', 'Regular', 'regular_hours', 'RegularHours', 'rt', 'RT'),
  overtime: n(row, 'overtime', 'Overtime', 'overtime_hours', 'OvertimeHours', 'ot', 'OT'),
  doubleTime: n(row, 'doubletime', 'DoubleTime', 'double_time', 'doubletime_hours', 'DoubleTimeHours', 'dt', 'DT'),
});

export const materialFromRow = (row: Row): MaterialLine => ({
  key: uid(),
  description: n(row, 'description', 'Description', 'material', 'Material', 'name', 'Name'),
  qty: n(row, 'qty', 'Qty', 'quantity', 'Quantity'),
  length: n(row, 'length', 'Length'),
});

export const expenseFromRow = (row: Row): ExpenseLine => ({
  key: uid(),
  description: n(row, 'description', 'Description', 'expense', 'Expense', 'expense_type', 'name', 'Name'),
  amount: n(row, 'amount', 'Amount', 'cost', 'Cost', 'value'),
});

export const equipmentFromRow = (row: Row): EquipmentLine => ({
  key: uid(),
  description: n(row, 'description', 'Description', 'equipment', 'Equipment', 'name', 'Name'),
  qty: n(row, 'qty', 'Qty', 'quantity', 'Quantity'),
});
