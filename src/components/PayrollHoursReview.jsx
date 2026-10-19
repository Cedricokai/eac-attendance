import PropTypes from 'prop-types';

export default function PayrollHoursReview({ review, busy, onCancel, onContinue }) {
  const rows = review.rows || [];
  const ready = rows.filter(row => row.status === 'APPROVED' && row.synced && !row.alreadyAllocated);
  const pending = rows.filter(row => row.status !== 'APPROVED');
  const unsynced = rows.filter(row => row.status === 'APPROVED' && !row.synced && !row.alreadyAllocated);
  const sum = key => ready.reduce((total, row) => total + Number(row[key] || 0), 0);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="payroll-hours-title">
    <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <h2 id="payroll-hours-title" className="text-lg font-semibold">Review hours before payroll generation</h2>
      {review.periodType === 'PROJECT' && <p className="mt-2 font-medium text-blue-800">Project payroll: {review.projectName}. Normal salary, allowances and deductions apply.</p>}
      <p className="mt-1">{review.periodStart} to {review.periodEnd}</p>
      <p className="mt-2 text-sm text-gray-600">Employee pay rates are used for NH and OT. Project client billing rates do not determine overtime pay. Payroll caps, weekend rules and deductions apply during calculation.</p>
      <div className="my-4 grid gap-3 sm:grid-cols-3">
        <p>Approved, synced project NH: <strong>{sum('normalHours')}</strong></p>
        <p>Approved, synced project OT: <strong>{sum('overtimeHours')}</strong></p>
        <p>Other attendance NH: <strong>{review.attendanceNormalHours}</strong></p>
      </div>
      <p className="text-amber-800">{pending.length} draft, pending or rejected timesheet(s) excluded. {unsynced.length} approved timesheet(s) need syncing before inclusion.</p>
      {review.excludedAlreadyAllocatedWorkDays > 0 && <p className="mt-2 text-amber-800">{review.excludedAlreadyAllocatedWorkDays} work date(s) already included in another payroll are excluded to prevent paying them twice.</p>}
      {review.excludedSyncedAttendanceRecords > 0 && <p className="mt-2 text-amber-800">{review.excludedSyncedAttendanceRecords} previously synced attendance record(s) are excluded because their current timesheet approval or matching sync is missing.</p>}
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Employee', 'Project', 'Date', 'NH', 'OT', 'Payroll eligibility'].map(label => <th className="border-b p-2" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><td className="p-2">{row.employeeName}</td><td className="p-2">{row.project}</td><td className="p-2 whitespace-nowrap">{row.date}</td><td className="p-2">{row.normalHours}{row.enteredNormalHours !== undefined && row.enteredNormalHours !== row.normalHours && <small className="block text-gray-500">Entered: {row.enteredNormalHours}</small>}</td><td className="p-2">{row.overtimeHours}{row.enteredOvertimeHours !== undefined && row.enteredOvertimeHours !== row.overtimeHours && <small className="block text-gray-500">Entered: {row.enteredOvertimeHours}</small>}</td><td className="p-2">{row.alreadyAllocated ? 'Already included in another payroll — excluded' : row.status === 'APPROVED' ? row.synced ? 'Approved and synced' : 'Approved — sync required' : `${row.status} — excluded`}</td></tr>)}</tbody>
      </table></div>
      <div className="mt-5 flex justify-end gap-3"><button onClick={onCancel} disabled={busy} className="rounded border px-4 py-2">Cancel</button><button onClick={onContinue} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40">Generate with eligible hours</button></div>
    </div>
  </div>;
}
PayrollHoursReview.propTypes = {
  review: PropTypes.shape({
    rows: PropTypes.arrayOf(PropTypes.object),
    periodType: PropTypes.string,
    projectName: PropTypes.string,
    excludedAlreadyAllocatedWorkDays: PropTypes.number,
    periodStart: PropTypes.string,
    periodEnd: PropTypes.string,
    attendanceNormalHours: PropTypes.number,
    excludedSyncedAttendanceRecords: PropTypes.number,
  }).isRequired,
  busy: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
};
