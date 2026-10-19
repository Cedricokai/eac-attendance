import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttendanceCategory, attendanceShift, workedHours, biometricAttendanceDate, timesheetPunches } from './nightShiftAttendance.js';

const category = { id: 1, name: 'Security', overnightShift: true, workStartTime: '18:00:00' };

test('overnight hours cross midnight and day hours remain unchanged', () => {
  assert.equal(workedHours('18:00', '06:00'), 12);
  assert.equal(workedHours('23:30', '07:15'), 7.75);
  assert.equal(workedHours('08:00', '17:00'), 9);
  assert.equal(workedHours('18:00', null), 0);
});

test('morning departures belong to the previous shift across month and year boundaries', () => {
  const record = { date: '2027-01-01', time: '06:00', action: 'SIGN OFF' };
  assert.equal(biometricAttendanceDate(record, category), '2026-12-31');
  assert.equal(biometricAttendanceDate({ ...record, action: 'SIGN ON' }, category), record.date);
  assert.equal(biometricAttendanceDate(record, { overnightShift: false }), record.date);
  assert.equal(biometricAttendanceDate({ ...record, time: '18:00' }, category), record.date);
});

test('category resolution supports names, objects and IDs', () => {
  for (const employee of [{ category: 'security' }, { category: { id: 1 } }, { categoryId: 1 }]) {
    assert.equal(getAttendanceCategory(employee, [category]), category);
  }
  assert.equal(attendanceShift('17:00', category), 'Night');
  assert.equal(attendanceShift('08:00', null), 'Day');
});

test('timesheet punches use the configured start and wrap at midnight', () => {
  assert.deepEqual(timesheetPunches(12, '18:00:00'), { checkIn: '18:00', checkOut: '06:00' });
  assert.deepEqual(timesheetPunches(8.5, '22:30'), { checkIn: '22:30', checkOut: '07:00' });
  assert.deepEqual(timesheetPunches(0, '18:00'), { checkIn: null, checkOut: null });
});
