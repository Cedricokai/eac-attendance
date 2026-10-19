export const hasAttendancePunch = record => Boolean(
  (record.checkIn && record.checkIn !== '--:--') ||
  (record.checkOut && record.checkOut !== '--:--')
);

export function isConfiguredHoliday(date, holidays = []) {
  return Boolean(date) && holidays.some(holiday => holiday.recurring
    ? holiday.date?.slice(5, 10) === date.slice(5, 10)
    : holiday.date?.slice(0, 10) === date.slice(0, 10));
}

export function holidayDisplayStatus(record, configuredHoliday) {
  if (record.status === 'Holiday' || record.status === 'Holiday Present' || configuredHoliday) {
    if (hasAttendancePunch(record)) return 'Holiday Present';
    if (['Absent', 'On Leave', 'Sick', 'Off Day'].includes(record.status)) return record.status;
    return 'Holiday';
  }
  return null;
}

export function holidayCredit(record) {
  return { ...record, status: 'Holiday', checkIn: null, checkOut: null,
    minimumHour: 8, standardHours: 8, overtime: 0 };
}
