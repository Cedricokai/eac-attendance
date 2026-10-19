import test from 'node:test';
import assert from 'node:assert/strict';
import { offDayDisplayStatus } from './offDayAttendance.js';
test('weekend without punches is an off day even with a stale present status', () => {
  assert.equal(offDayDisplayStatus({status: 'Weekend Present', checkIn: '--:--', checkOut: null}, true), 'Off Day');
});
test('attendance with either punch keeps its worked or incomplete status', () => {
  assert.equal(offDayDisplayStatus({checkIn: '08:00'}, true), null);
  assert.equal(offDayDisplayStatus({checkOut: '17:00'}, true), null);
});
test('preserves explicit absence, sickness and leave', () => {
  for (const status of ['Absent', 'On Leave', 'Sick']) assert.equal(offDayDisplayStatus({status}, true), status);
});
test('ordinary working day is not converted to an off day', () => {
  assert.equal(offDayDisplayStatus({status: 'Present'}, false), null);
});
