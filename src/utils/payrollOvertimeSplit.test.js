import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverPayrollOvertimeSplit, loadPayrollOvertimeSplit } from './payrollOvertimeSplit.js';

const record = { employee: { id: 1, firstName: 'Test', lastName: 'Employee' },
  overtimeHours: 84, totalHours: 160, appliedEffectivePayrollRateFrom: '2026-09-22',
  period: { startDate: '2026-08-26', endDate: '2026-09-25', convertExcessToOvertime: true } };
const ot = (date, overtimeHours, employeeId = 1) => ({ date, overtimeHours, employeeId, status: 'Approved' });

test('recovers 84 OT hours from dates independently of the 128/32 NH split', () => {
  const result = recoverPayrollOvertimeSplit({ ...record, normalRateHours: 128, effectiveRateHours: 32 },
    [ot('2026-09-21', 60), ot('2026-09-22', 24), ot('2026-09-22', 100, 2)]);
  assert.deepEqual(result, { oldRate: 60, newRate: 24 });
});

test('effective start/end dates are inclusive, and later hours return to old rate', () => {
  assert.deepEqual(recoverPayrollOvertimeSplit({ ...record, overtimeHours: 10, appliedEffectivePayrollRateTo: '2026-09-23' },
    [ot('2026-09-21', 1), ot('2026-09-22', 2), ot('2026-09-23', 3), ot('2026-09-24', 4)]), { oldRate: 5, newRate: 5 });
});

test('recovers automatic weekend overtime and avoids counting approved hours twice', () => {
  const weekendRecord = { ...record, overtimeHours: 11, employee: { id: 1, category: { weekendAttendanceAsOvertime: true } } };
  assert.deepEqual(recoverPayrollOvertimeSplit(weekendRecord, [ot('2026-09-26', 2)],
    [{ employeeId: 1, date: '2026-09-26', minimumHour: 8, status: 'Present' }], { defaultOvertimeMultiplier: 1.5 }),
  { oldRate: 0, newRate: 11 });
});

test('excess normal hours are allocated by date and leave hours are excluded', () => {
  const result = recoverPayrollOvertimeSplit({ ...record, overtimeHours: 10, totalHours: 10 }, [],
    [{ employeeId: 1, date: '2026-09-21', minimumHour: 12, status: 'Present' },
      { employeeId: 1, date: '2026-09-22', minimumHour: 4, status: 'Present' },
      { employeeId: 1, date: '2026-09-23', minimumHour: 8, status: 'On Leave' },
      { employeeId: 1, date: '2026-09-24', minimumHour: 8, status: 'Present' }]);
  assert.deepEqual(result, { oldRate: 0, newRate: 10 });
});

test('does not invent a split when dated hours disagree with the saved total', () => {
  assert.equal(recoverPayrollOvertimeSplit(record, [ot('2026-09-21', 60)]), null);
});

test('loads all overtime pages and uses the saved period and employee', async () => {
  const requests = [];
  const result = await loadPayrollOvertimeSplit(record, { baseUrl: 'https://example.test', token: 'test',
    fetchImpl: async url => {
      requests.push(url);
      const page = new URL(url).searchParams.get('page');
      return { ok: true, json: async () => ({ totalPages: 2, content: [page === '0' ? ot('2026-09-21', 60) : ot('2026-09-22', 24)] }) };
    } });
  assert.equal(requests.length, 2);
  assert.equal(new URL(requests[0]).searchParams.get('startDate'), '2026-08-26');
  assert.deepEqual(result, { oldRate: 60, newRate: 24 });
});
