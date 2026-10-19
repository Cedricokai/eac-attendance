import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAttendanceTotals } from './attendanceTotals.js';

test('totals use report overtime, preserve zero overrides, and include leave NH', () => {
  assert.deepEqual(calculateAttendanceTotals([
    { minimumHour: '8', overtime: 9, reportDetail: { rawOvertimeHours: 2, overtimeHours: 3 } },
    { minimumHour: 6.5, overtime: 4, reportDetail: { rawOvertimeHours: 0, overtimeHours: 0 } },
    { minimumHour: 8, leaveBased: true },
    { minimumHour: null, overtime: '1.5' }
  ]), { normalHours: 22.5, rawOvertime: 3.5, finalOvertime: 4.5 });
});

test('empty matches total zero and invalid hours cannot silently produce a partial total', () => {
  assert.deepEqual(calculateAttendanceTotals([]), { normalHours: 0, rawOvertime: 0, finalOvertime: 0 });
  assert.throws(() => calculateAttendanceTotals([{ minimumHour: 'invalid' }]), /Invalid attendance hours/);
});
