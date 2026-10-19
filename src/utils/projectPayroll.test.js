import test from 'node:test';
import assert from 'node:assert/strict';
import { groupProjectDays, projectPayrollExport, readProjectSnapshot } from './projectPayroll.js';

const days = [
  { date: '2026-09-01', projectId: 7, projectName: 'Project X', timesheetId: 10, source: 'Timesheet', normalHours: 8, overtimeHours: 2, normalEarnings: 80, overtimeEarnings: 20, totalEarnings: 100 },
  { date: '2026-09-05', projectId: 7, projectName: 'Project X', timesheetId: 11, source: 'Timesheet', normalHours: 4, overtimeHours: 0, normalEarnings: 40, overtimeEarnings: 0, totalEarnings: 40 },
  { date: '2026-09-20', projectId: null, source: 'Biometric', normalHours: 8, overtimeHours: 0, normalEarnings: 80, overtimeEarnings: 0, totalEarnings: 80 },
];
const record = { employee: { employeeId: 'E1', firstName: 'Jane', lastName: 'Doe' },
  period: { name: 'September', startDate: '2026-08-26', endDate: '2026-09-25' }, grossSalary: 250, netSalary: 240,
  projectEarningsSnapshot: JSON.stringify({ version: 1, days, workEarnings: 220, otherPeriodEarnings: 30 }) };

test('groups only the actual dates and keeps project work separate from non-project work', () => {
  const groups = groupProjectDays(days);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].dates, ['2026-09-01', '2026-09-05']);
  assert.equal(groups[0].totalEarnings, 140);
  assert.equal(groups[1].key, 'none');
});
test('project-filtered export keeps full period totals without repeating them on work rows', () => {
  const output = projectPayrollExport([record], '7');
  assert.equal(output.periods[0]['Full period gross'], 250);
  assert.equal(output.periods[0]['Full period net'], 240);
  assert.equal(output.work.length, 2);
  assert.equal(output.work.reduce((sum, row) => sum + row['Gross work earnings'], 0), 140);
  assert.equal(output.work[0]['Full period gross'], undefined);
});
test('linked and non-project filters retain only their work details', () => {
  assert.equal(projectPayrollExport([record], 'linked').work.length, 2);
  assert.equal(projectPayrollExport([record], 'none').work.length, 1);
});
test('old or invalid snapshots remain unavailable rather than inferred from live timesheets', () => {
  for (const value of [null, 'invalid', '{}', '{"version":2,"days":[]}']) {
    assert.equal(readProjectSnapshot({ projectEarningsSnapshot: value }), null);
  }
});
