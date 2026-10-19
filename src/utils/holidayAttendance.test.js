import test from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredHoliday, holidayDisplayStatus, holidayCredit } from './holidayAttendance.js';

test('holiday matching includes recurring holidays but excludes other dates', () => {
  assert.equal(isConfiguredHoliday('2026-09-22', [{ date: '2020-09-22', recurring: true }]), true);
  assert.equal(isConfiguredHoliday('2026-09-22', [{ date: '2020-09-22' }]), false);
});
test('unworked holidays and legacy automatic credits are not presented as attendance', () => {
  assert.equal(holidayDisplayStatus({ status: 'Holiday Present', checkIn: '--:--' }, true), 'Holiday');
  assert.equal(holidayDisplayStatus({ status: 'Holiday' }, true), 'Holiday');
  assert.equal(holidayDisplayStatus({ status: 'Absent' }, true), 'Absent');
});
test('holiday punches including a single biometric punch show Holiday Present', () => {
  assert.equal(holidayDisplayStatus({ status: 'Half Day', checkIn: '08:00', biometric: true }, true), 'Holiday Present');
  assert.equal(holidayDisplayStatus({ status: 'Present', checkOut: '17:00' }, true), 'Holiday Present');
  assert.equal(holidayDisplayStatus({ status: 'Present', checkIn: '08:00' }, false), null);
});
test('holiday credit is exactly eight normal hours without punches or overtime', () => {
  assert.deepEqual(holidayCredit({ date: '2026-09-22', checkIn: '08:00', checkOut: '20:00', minimumHour: 12, overtime: 4 }),
    { date: '2026-09-22', status: 'Holiday', checkIn: null, checkOut: null, minimumHour: 8, standardHours: 8, overtime: 0 });
});
