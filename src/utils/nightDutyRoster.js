import { attendanceShift, getAttendanceCategory } from './nightShiftAttendance.js';

export function nightDutyDates(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const previous = new Date(`${today}T00:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return { startDate: previous.toISOString().slice(0, 10), endDate: today };
}

export function getNightDutyRoster(records, employees, categories, now = new Date()) {
  const dates = nightDutyDates(now);
  return records.flatMap(record => {
    const employee = employees.find(item => String(item.id) === String(record.employee?.id ?? record.employeeId)) || record.employee;
    if (!employee || employee.active === false || !record.checkIn || record.checkOut ||
        ['Absent', 'On Leave', 'Sick', 'Holiday'].includes(record.status) ||
        ![dates.startDate, dates.endDate].includes(record.date)) return [];
    const category = getAttendanceCategory(employee, categories);
    if ((record.shift || attendanceShift(record.checkIn, category)) !== 'Night') return [];
    const checkedInAt = new Date(`${record.date}T${record.checkIn.slice(0, 8)}${record.checkIn.length === 5 ? ':00' : ''}Z`);
    if (!Number.isFinite(checkedInAt.getTime()) || checkedInAt > now) return [];
    return [{ ...record, employee, stale: now - checkedInAt > 18 * 60 * 60 * 1000 }];
  }).sort((a, b) => `${b.date}T${b.checkIn}`.localeCompare(`${a.date}T${a.checkIn}`));
}
