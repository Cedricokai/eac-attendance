export function getAttendanceCategory(employee, categories = []) {
  const value = employee?.category;
  return categories.find(category =>
    (employee?.categoryId != null && String(category.id) === String(employee.categoryId)) ||
    (value?.id != null && String(category.id) === String(value.id)) ||
    (typeof (value?.name ?? value) === 'string' && category.name?.toLowerCase() === (value?.name ?? value).toLowerCase())
  ) || (typeof value === 'object' ? value : null);
}

export function attendanceShift(checkIn, category) {
  if (category?.overnightShift) return 'Night';
  if (!checkIn) return 'Day';
  const hour = Number(checkIn.split(':')[0]);
  return hour >= 18 || hour < 6 ? 'Night' : 'Day';
}

export function workedHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const minutes = time => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };
  const difference = minutes(checkOut) - minutes(checkIn);
  return Number.isFinite(difference) ? (difference < 0 ? difference + 1440 : difference) / 60 : 0;
}

export function biometricAttendanceDate(record, category) {
  if (!category?.overnightShift || record.action !== 'SIGN OFF' ||
      record.time >= (category.workStartTime || '18:00').slice(0, 5)) return record.date;
  const date = new Date(`${record.date}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function timesheetPunches(totalHours, startTime = '09:00') {
  if (!(totalHours > 0)) return { checkIn: null, checkOut: null };
  const [hour, minute] = startTime.split(':').map(Number);
  const end = (hour * 60 + minute + Math.round(totalHours * 60)) % 1440;
  return { checkIn: startTime.slice(0, 5), checkOut: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}` };
}
