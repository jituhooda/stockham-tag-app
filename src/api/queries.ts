import { sqlString } from './client';

export const Q = {
  employees:
    "select Id,Employee,CONCAT(first, ' ', last) AS EmployeeName,Status,FEID,Division from employees where status='Active Status'",
  expenses: 'select * from expenses_master',
  materials: 'select * from materials_master',
  equipment: 'select * from equipment_master',
  laborRates: 'select * from tag_labor_rates',
  tags:
    'SELECT t.Id, t.tag_number, t.status, t.description, DATE(t.tag_date) AS tag_date, t.IsPremium, t.JobName, t.CustomerID, t.PMEmail, t.JobNo, t.JobAddress AS Address, DATE(t.LastModifiedDate) AS LastModifiedDate, (SELECT COUNT(*) FROM tag_labor tl WHERE tl.tag_id = t.Id) AS labor_count, (SELECT COUNT(*) FROM tag_materials tm WHERE tm.tag_id = t.Id) AS material_count, (SELECT COUNT(*) FROM tag_equipment te WHERE te.tag_id = t.Id) AS equipment_count, (SELECT COUNT(*) FROM tag_other_expenses toe WHERE toe.tag_id = t.Id) AS expense_count FROM tags t ORDER BY t.LastModifiedDate DESC',
  division: (employee: string) =>
    `select Division from employees where EMPLOYEE = ${sqlString(employee)}`,
  jobs: (divisions: string[]) =>
    `select *, CONCAT(\`JobNo\`, ' : ',\`JobName\`) as CJobName from job where CustomerName !='' AND CustomerName is NOT NULL AND Division in (${divisions
      .map(sqlString)
      .join(',')}) order by Address ASC`,
  tagLines: (table: 'tag_labor' | 'tag_materials' | 'tag_equipment' | 'tag_other_expenses', tagId: number) =>
    `select * from ${table} where tag_id = ${Math.trunc(tagId)}`,
};
