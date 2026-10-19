import test from 'node:test';
import assert from 'node:assert/strict';
import { changedMealDays, mealDayEditable, mealDate } from './mealSelection.js';

test('only changed days are submitted, preserving assigned defaults on untouched days', () => {
  assert.deepEqual(changedMealDays({ MONDAY: 1, TUESDAY: 2 }, { MONDAY: 1, TUESDAY: 3 }), { TUESDAY: 3 });
  assert.deepEqual(changedMealDays({ MONDAY: 1 }, { MONDAY: 1 }), {});
});
test('day-before cutoff closes at the exact second and blocks past days', () => {
  const cutoff = '2026-09-15T17:00:00Z';
  assert.equal(mealDayEditable('2026-09-16', cutoff, Date.parse('2026-09-15T16:59:59Z')), true);
  assert.equal(mealDayEditable('2026-09-16', cutoff, Date.parse(cutoff)), false);
  assert.equal(mealDayEditable('2026-09-14', '2026-09-17T17:00:00Z', Date.parse(cutoff)), false);
  assert.equal(mealDayEditable('2026-09-16', null, Date.parse(cutoff)), false);
});
test('week dates handle month and year boundaries', () => {
  assert.equal(mealDate('2026-12-28', 'FRIDAY'), '2027-01-01');
});
