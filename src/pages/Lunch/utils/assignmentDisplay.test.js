import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentsByEmployee, assignedMeal, isAttendancePresent, applyMealToEmployees, weekMonday } from './assignmentDisplay.js';
import { changedMealDays } from './mealSelection.js';

test('daily serving and assignment list choose the same meal regardless of response order', () => {
  const range = { id: 1, employee: { id: 10 }, status: 'ACTIVE', startDate: '2026-09-14', endDate: '2026-09-18', meal: { id: 1, name: 'Rice' } };
  const changed = { ...range, id: 2, startDate: '2026-09-16', endDate: '2026-09-16', meal: { id: 2, name: 'Banku' } };
  const expired = { ...changed, id: 3, status: 'EXPIRED' };
  for (const records of [[range, changed, expired], [expired, changed, range]]) {
    assert.equal(assignedMeal(assignmentsByEmployee(records, '2026-09-16')[10]).name, 'Banku');
    assert.equal(assignedMeal(assignmentsByEmployee(records, '2026-09-17')[10]).name, 'Rice');
  }
});

test('bulk meal changes do not mutate the saved snapshot or skip the save', () => {
  const saved = { 10: { MONDAY: 1, TUESDAY: 1 }, 11: { MONDAY: 1 } };
  const changed = applyMealToEmployees(saved, [10], ['MONDAY', 'TUESDAY'], 2);
  assert.deepEqual(changedMealDays(saved[10], changed[10]), { MONDAY: 2, TUESDAY: 2 });
  assert.equal(saved[10].MONDAY, 1);
  assert.equal(changed[11], saved[11]);
});

test('manual and biometric attendance consistently count as present', () => {
  for (const status of ['Present', 'PRESENT', 'Late', 'Holiday Present', 'WEEKEND_PRESENT']) {
    assert.equal(isAttendancePresent({ status, checkIn: null }), true);
  }
  assert.equal(isAttendancePresent({ status: 'Absent', checkIn: '00:00:00' }), true);
  assert.equal(isAttendancePresent({ status: 'Absent', checkIn: '--:--' }), false);
  assert.equal(isAttendancePresent(null), false);
});

test('week inputs normalize to Monday including Sundays and year boundaries', () => {
  assert.equal(weekMonday('2026-09-20'), '2026-09-14');
  assert.equal(weekMonday('2027-01-01'), '2026-12-28');
});
