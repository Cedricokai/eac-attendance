import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateJobScheduleHours } from './jobScheduleHours.js';
for (const [name, start, arrival, departure, normalHours, overtimeHours] of [
  ['late arrival', '07:00', '08:00', '17:00', 7, 2],
  ['on time', '07:00', '07:00', '17:00', 8, 2],
  ['early arrival', '07:00', '06:00', '17:00', 8, 2],
  ['early departure', '07:00', '08:00', '14:00', 6, 0],
  ['overtime only', '07:00', '16:00', '17:00', 0, 1],
  ['normal boundary', '07:00', '08:00', '15:00', 7, 0],
  ['fractional hours', '07:00', '08:30', '16:30', 6.5, 1.5],
  ['overnight', '22:00', '23:00', '08:00', 7, 2],
  ['post midnight', '22:00', '01:00', '08:00', 5, 2],
]) test(name, () => assert.deepEqual(calculateJobScheduleHours(start, 8, arrival, departure), {normalHours, overtimeHours}));
