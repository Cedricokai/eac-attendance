export function currentEmployeeRate(employee) {
  const minimum = Number(employee?.minimumRate ?? 0);
  return minimum > 0 ? minimum : Math.max(0, Number(employee?.hourlyRate ?? 0));
}

export function payrollRateReview(records) {
  return {
    canKeepSaved: records.length > 0 && records.every(record => record.rateSnapshotSaved === true),
    rows: records.map(record => ({
      id: record.employee?.id ?? record.employeeId,
      name: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
      savedRate: record.rateSnapshotSaved === true ? record.appliedEmployeeRate : null,
      currentRate: currentEmployeeRate(record.employee),
      savedSalary: record.rateSnapshotSaved === true ? (record.appliedMonthlySalary ?? 0) : null,
      currentSalary: record.employee?.basicSalary ?? 0
    }))
  };
}
