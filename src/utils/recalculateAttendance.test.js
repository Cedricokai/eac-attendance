import test from 'node:test';
import assert from 'node:assert/strict';
import { recalculateAttendance } from './recalculateAttendance.js';

test('preserves exact timestamps and excludes stale hours when re-saving', async () => {
  const record = { id: 1, checkIn: '06:43:23', checkOut: '17:46:50', date: '2026-09-07', shift: 'Day', workType: 'Regular', status: 'Present', minimumHour: 10.5, overtime: 2.5 };
  const calls = [];
  const result = await recalculateAttendance([record], new Set([1]), async (...args) => calls.push(args));
  assert.deepEqual(calls, [[1, { checkIn: record.checkIn, checkOut: record.checkOut, date: record.date, shift: 'Day', workType: 'Regular', status: 'Present' }]]);
  assert.deepEqual(result, { succeeded: [1], failed: [], skipped: [] });
});

test('continues after failures and skips incomplete or unloaded records', async () => {
  const complete = { checkIn: '08:00:00', checkOut: '17:00:00' };
  const calls = [];
  const progress = [];
  const result = await recalculateAttendance(
    [{ id: 1, ...complete }, { id: 2, checkIn: '08:00:00' }, { id: 3, ...complete }],
    new Set([1, 2, 3, 4]),
    async id => { calls.push(id); if (id === 1) throw new Error('Server error'); },
    (...args) => progress.push(args)
  );
  assert.deepEqual(calls, [1, 3]);
  assert.deepEqual(result, { succeeded: [3], failed: [1], skipped: [2, 4] });
  assert.deepEqual(progress, [[1, 4], [2, 4], [3, 4], [4, 4]]);
});
