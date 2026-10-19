import test from 'node:test';
import assert from 'node:assert/strict';
import { canConvertRawEvent, groupRawBiometricEvents, loadAllRawBiometricEvents } from './rawBiometricAttendance.js';

test('groups overnight punches by server shift date, keeping earliest in and latest out', () => {
  const event = { employeeId: 1, attendanceDate: '2026-09-23' };
  const groups = groupRawBiometricEvents([
    { ...event, id: 1, eventTimestamp: '2026-09-23T19:00:00', punchType: 'SIGN ON' },
    { ...event, id: 2, eventTimestamp: '2026-09-23T18:00:00', punchType: 'SIGN ON' },
    { ...event, id: 3, eventTimestamp: '2026-09-24T05:00:00', punchType: 'SIGN OFF' },
    { ...event, id: 4, eventTimestamp: '2026-09-24T06:00:00', punchType: 'SIGN OFF' }
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].checkIn, '2026-09-23T18:00:00');
  assert.equal(groups[0].checkOut, '2026-09-24T06:00:00');
  assert.equal(groups[0].events.length, 4);
});

test('unmatched punches stay separate and linked/invalid/legacy punches cannot be selected', () => {
  assert.equal(groupRawBiometricEvents([{ id: 1 }, { id: 2 }]).length, 2);
  assert.equal(canConvertRawEvent({ conversionIssue: null, employeeId: 1 }), true);
  assert.equal(canConvertRawEvent({ conversionIssue: null, attendanceId: 4 }), false);
  assert.equal(canConvertRawEvent({ conversionIssue: 'Invalid timestamp' }), false);
  assert.equal(canConvertRawEvent({}), false);
});

test('loads punches across all pages before grouping and preserves filters', async () => {
  const urls = [];
  const events = await loadAllRawBiometricEvents('http://localhost', { employeeId: '2', status: 'FAILED' }, {}, async url => {
    urls.push(new URL(url));
    return { ok: true, json: async () => ({ totalPages: 2, content: [{ id: urls.length }] }) };
  });
  assert.deepEqual(events.map(event => event.id), [1, 2]);
  assert.equal(urls[1].searchParams.get('page'), '1');
  assert.equal(urls[1].searchParams.get('employeeId'), '2');
  assert.equal(urls[1].searchParams.get('status'), 'FAILED');
});

test('a failed later page never publishes a partial set of punches', async () => {
  let calls = 0;
  await assert.rejects(loadAllRawBiometricEvents('', {}, {}, async () => ++calls === 1
    ? { ok: true, json: async () => ({ totalPages: 2, content: [{ id: 1 }] }) }
    : { ok: false, status: 500 }), /Could not load/);
});
