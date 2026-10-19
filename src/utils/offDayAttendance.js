import { hasAttendancePunch } from './holidayAttendance.js';

export function offDayDisplayStatus(record, configuredOffDay) {
  if (hasAttendancePunch(record)) return null;
  if (!configuredOffDay && !['Off Day', 'Weekend Present', 'Special Weekend Present'].includes(record.status)) return null;
  if (['Absent', 'On Leave', 'Sick'].includes(record.status)) return record.status;
  return 'Off Day';
}
