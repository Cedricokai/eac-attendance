export function reportPreviewRange(records, filters) {
  const dates = records.map(record => String(record.date || '').slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const startDate = filters.startDate || dates[0];
  const endDate = filters.endDate || dates.at(-1);
  return startDate && endDate ? { startDate, endDate } : null;
}

export function approvedReportRows(attendance, preview, employees) {
  if (preview?.approvedOnly !== true || !Array.isArray(preview.rows)) {
    throw new Error('Approved-hours preview is unavailable. Rebuild/restart the updated backend and retry.');
  }
  const byId = new Map(attendance.map(record => [String(record.id), record]));
  const employeesById = new Map(employees.map(employee => [String(employee.id), employee]));
  return preview.rows.map(detail => {
    const record = byId.get(String(detail.attendanceId));
    return {
      ...record,
      id: detail.attendanceId,
      date: detail.date,
      checkIn: detail.checkIn,
      checkOut: detail.checkOut,
      status: detail.status,
      employee: record?.employee || employeesById.get(String(detail.employeeId)) || { id: detail.employeeId },
      reportDetail: detail
    };
  });
}
