export const payrollMoney = value => Math.round((Number(value) || 0) * 100) / 100;

export function readProjectSnapshot(record) {
  if (!record.projectEarningsSnapshot) return null;
  try {
    const snapshot = typeof record.projectEarningsSnapshot === 'string'
      ? JSON.parse(record.projectEarningsSnapshot) : record.projectEarningsSnapshot;
    return snapshot.version === 1 && Array.isArray(snapshot.days) ? snapshot : null;
  } catch { return null; }
}

export function groupProjectDays(days) {
  const groups = new Map();
  for (const day of days) {
    const key = day.projectId == null ? 'none' : String(day.projectId);
    if (!groups.has(key)) groups.set(key, {
      key, projectName: day.projectName || (key === 'none' ? 'No recorded project' : `Project ${key}`),
      dates: new Set(), sources: new Set(), normalHours: 0, overtimeHours: 0,
      normalEarnings: 0, overtimeEarnings: 0, totalEarnings: 0, days: [],
    });
    const group = groups.get(key);
    group.dates.add(day.date);
    group.sources.add(day.source || 'Attendance');
    for (const field of ['normalHours', 'overtimeHours', 'normalEarnings', 'overtimeEarnings', 'totalEarnings']) {
      group[field] = payrollMoney(group[field] + (Number(day[field]) || 0));
    }
    group.days.push(day);
  }
  return [...groups.values()].map(group => ({ ...group,
    dates: [...group.dates].sort(), sources: [...group.sources].sort(),
  }));
}

export function projectPayrollExport(records, selectedProject = 'all') {
  const periods = [], work = [];
  for (const record of records) {
    const snapshot = readProjectSnapshot(record);
    const name = [record.employee?.firstName, record.employee?.lastName].filter(Boolean).join(' ');
    const identity = { Employee: name, 'Employee ID': record.employee?.employeeId || record.employeeId || '',
      'Payroll period': record.period?.name || '', 'Period start': record.period?.startDate || snapshot?.periodStart || '',
      'Period end': record.period?.endDate || snapshot?.periodEnd || '' };
    periods.push({ ...identity, 'Full period gross': payrollMoney(record.grossSalary),
      'PAYE': payrollMoney(record.payeTax), 'Employee SSNIT': payrollMoney(record.ssnitEmployee),
      'Loan deductions': payrollMoney(record.loanDeduction), 'Credits': payrollMoney(record.creditAmount),
      'Full period net': payrollMoney(record.netSalary),
      'Work earnings (all projects and non-project)': snapshot?.workEarnings ?? '',
      'Other period earnings': snapshot?.otherPeriodEarnings ?? '',
      'Breakdown status': snapshot ? 'Saved at generation' : 'Unavailable for this run' });
    for (const day of snapshot?.days || []) {
      const key = day.projectId == null ? 'none' : String(day.projectId);
      if (selectedProject !== 'all' && key !== selectedProject && !(selectedProject === 'linked' && key !== 'none')) continue;
      work.push({ ...identity, Date: day.date, Project: day.projectName || 'No recorded project',
        'Project ID': day.projectId ?? '', Source: day.source, 'Timesheet ID': day.timesheetId ?? '',
        'Normal hours': day.normalHours, 'Overtime hours': day.overtimeHours,
        'Normal earnings': day.normalEarnings, 'Overtime earnings': day.overtimeEarnings,
        'Gross work earnings': day.totalEarnings });
    }
  }
  return { periods, work };
}
