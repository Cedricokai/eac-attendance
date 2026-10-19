const dateKey = value => String(value || '').slice(0, 10);
const hours = value => Math.max(0, Number(value || 0));

// Recover the saved payroll's OT by worked date, never by the NH proportions.
export function recoverPayrollOvertimeSplit(record, overtime, attendance = [], system = {}, holidays = []) {
  const employeeId = record.employee?.id ?? record.employeeId;
  const approved = new Map();
  for (const row of overtime) {
    if (String(row.employeeId ?? row.employee?.id) !== String(employeeId) || row.status !== 'Approved' || !row.date) continue;
    const date = dateKey(row.date);
    approved.set(date, (approved.get(date) || 0) + hours(row.overtimeHours));
  }
  const from = dateKey(record.appliedEffectivePayrollRateFrom);
  const to = dateKey(record.appliedEffectivePayrollRateTo);
  const split = dated => {
    let oldRate = 0, newRate = 0;
    for (const [date, value] of dated) {
      if (from && date >= from && (!to || date <= to)) newRate += value;
      else oldRate += value;
    }
    return Math.abs(oldRate + newRate - hours(record.overtimeHours)) < 0.005
      ? { oldRate, newRate } : null;
  };
  const approvedSplit = split(approved);
  if (approvedSplit) return approvedSplit;

  const daily = new Map();
  for (const row of attendance) {
    if (String(row.employeeId ?? row.employee?.id) !== String(employeeId) || !row.date || /leave|absent/i.test(row.status || '')) continue;
    const date = dateKey(row.date);
    daily.set(date, (daily.get(date) || 0) + hours(row.minimumHour));
  }
  const weekendDays = Array.isArray(system.weekendDays) ? system.weekendDays.map(Number)
    : String(system.weekendDays ?? '0,6').split(',').map(Number);
  const isHoliday = date => holidays.some(holiday => holiday.recurring
    ? date.slice(5) === dateKey(holiday.date).slice(5) : date === dateKey(holiday.date));
  const standard = Number(record.employee?.category?.standardRateHours || system.standardWorkHours || 8);
  let remainingNormal = hours(record.totalHours);
  const dated = new Map(approved);
  for (const date of [...daily.keys()].sort()) {
    const worked = daily.get(date);
    const weekend = weekendDays.includes(new Date(`${date}T00:00:00Z`).getUTCDay());
    let extra = 0;
    if (record.employee?.category?.weekendAttendanceAsOvertime && weekend && !isHoliday(date)) {
      extra = Math.max(0, worked - (approved.get(date) || 0)) * hours(system.defaultOvertimeMultiplier ?? 1);
    } else {
      const payable = Math.min(standard, worked);
      const normal = Math.min(remainingNormal, payable);
      remainingNormal -= normal;
      if (record.period?.convertExcessToOvertime) extra = payable - normal;
    }
    dated.set(date, (dated.get(date) || 0) + extra);
  }
  return split(dated);
}

export async function loadPayrollOvertimeSplit(record, { baseUrl, token, signal, fetchImpl = fetch }) {
  const period = record.period;
  if (!period?.startDate || !period?.endDate) throw new Error('Payroll period dates are missing');
  const get = async path => {
    const response = await fetchImpl(`${baseUrl}${path}`, { signal, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Could not load dated overtime records');
    return response.json();
  };
  const query = new URLSearchParams({ startDate: dateKey(period.startDate), endDate: dateKey(period.endDate),
    status: 'Approved', search: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(), size: '100' });
  const overtime = [];
  let totalPages = 1;
  for (let page = 0; page < totalPages; page++) {
    query.set('page', String(page));
    const data = await get(`/api/overtime/page?${query}`);
    if (!Array.isArray(data.content)) throw new Error('Invalid overtime response');
    overtime.push(...data.content);
    totalPages = Number(data.totalPages || 1);
  }
  const approvedSplit = recoverPayrollOvertimeSplit(record, overtime);
  if (approvedSplit) return approvedSplit;
  const attendanceQuery = new URLSearchParams({ employeeId: String(record.employee?.id ?? record.employeeId),
    startDate: dateKey(period.startDate), endDate: dateKey(period.endDate) });
  const [attendance, system, holidays] = await Promise.all([
    get(`/api/attendance/by-employee-range?${attendanceQuery}`), get('/api/settings/system'), get('/api/settings/holidays')
  ]);
  const recovered = recoverPayrollOvertimeSplit(record, overtime, attendance, system, holidays);
  if (!recovered) throw new Error('Dated OT and attendance do not match the saved payroll total');
  return recovered;
}
