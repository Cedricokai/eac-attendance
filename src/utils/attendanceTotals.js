// Sum the same NH, raw OT and approved OT values shown by the attendance table.
export function calculateAttendanceTotals(records) {
  const number = value => {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) throw new Error('Invalid attendance hours');
    return parsed;
  };

  return records.reduce((totals, record) => {
    const detail = record.reportDetail || {};
    const rawOvertime = number(detail.rawOvertimeHours ?? record.overtime);
    const finalOvertime = number(detail.overtimeHours ?? record.overtime);

    // An overtime record is approved only when its overtime status is "Approved".
    // The attendance report row exposes this as reportDetail.overtimeStatus;
    // fall back to record.overtimeStatus if the backend flattens it.
    const overtimeStatus = String(
      detail.overtimeStatus ?? record.overtimeStatus ?? ''
    ).trim().toLowerCase();
    const isApproved = overtimeStatus === 'approved';

    // Which hours actually count as overtime depends on where the multiplier was applied:
    //   - multiplier applied to hours  -> finalOvertime already includes the multiplier
    //   - multiplier applied to rate   -> rawOvertime is the real number of overtime hours
    const multiplierAppliedToHours =
      detail.multiplierAppliedToHours ?? record.multiplierAppliedToHours ?? false;

    const approvedOvertime = isApproved
      ? (multiplierAppliedToHours ? finalOvertime : rawOvertime)
      : 0;

    return {
      normalHours: totals.normalHours + number(record.minimumHour),
      rawOvertime: totals.rawOvertime + rawOvertime,
      finalOvertime: totals.finalOvertime + finalOvertime,
      approvedOvertime: totals.approvedOvertime + approvedOvertime
    };
  }, { normalHours: 0, rawOvertime: 0, finalOvertime: 0, approvedOvertime: 0 });
}