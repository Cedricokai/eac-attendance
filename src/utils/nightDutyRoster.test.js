import test from 'node:test';
import assert from 'node:assert/strict';
import { nightDutyDates, getNightDutyRoster } from './nightDutyRoster.js';

const now = new Date('2026-10-02T02:00:00Z');
const employee = { id: 1, firstName: 'Night', category: 'Security' };
const categories = [{ name: 'Security', overnightShift: true }];
const record = { id: 1, employee: { id: 1 }, date: '2026-10-01', checkIn: '18:00:00', checkOut: null, status: 'Present' };

test('duty range includes the previous evening after midnight in Ghana', () => {
  assert.deepEqual(nightDutyDates(now), { startDate: '2026-10-01', endDate: '2026-10-02' });
  assert.equal(getNightDutyRoster([record], [employee], categories, now).length, 1);
});

test('excludes checked out, future, absent, inactive and day-shift attendance', () => {
  for (const change of [{ checkOut: '01:00' }, { date: '2026-10-02', checkIn: '18:00' }, { status: 'Absent' }, { shift: 'Day' }, { date: '2026-09-30' }]) {
    assert.equal(getNightDutyRoster([{ ...record, ...change }], [employee], categories, now).length, 0);
  }
  assert.equal(getNightDutyRoster([record], [{ ...employee, active: false }], categories, now).length, 0);
});

test('flags old open attendance for verification', () => {
  const rows = getNightDutyRoster([record], [employee], categories, new Date('2026-10-02T15:00:00Z'));
  assert.equal(rows[0].stale, true);
});
