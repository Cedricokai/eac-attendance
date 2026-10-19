import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

export default function TimesheetPayrollApproval({ apiBase, startDate, endDate, jobId }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [canApprove, setCanApprove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('jwtToken')}`, 'Content-Type': 'application/json' });
  const refresh = useCallback(async () => {
    if (!startDate || !endDate) return;
    setBusy(true); setError('');
    try {
      const query = new URLSearchParams({ startDate, endDate });
      if (jobId && Number(jobId) > 0) query.set('jobId', jobId);
      const response = await fetch(`${apiBase}/api/timesheets/payroll-approvals?${query}`, { headers: headers() });
      if (!response.ok) throw new Error('Could not load payroll approvals. Check your access and refresh.');
      const result = await response.json();
      setRows(result.rows); setCanApprove(result.canApprove); setSelected([]);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [apiBase, startDate, endDate, jobId]);
  useEffect(() => { if (open) refresh(); }, [open, refresh]);
  const decide = async action => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${apiBase}/api/timesheets/payroll-approvals`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ ids: selected, action, reason }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || result.detail || 'Approval failed. Submit current work before approving; rejection requires a reason.');
      }
      await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const chosen = rows.filter(row => selected.includes(row.id));
  const submitted = chosen.length > 0 && chosen.every(row => row.status === 'SUBMITTED');
  const draft = chosen.length > 0 && chosen.every(row => ['DRAFT', 'REJECTED'].includes(row.status));
  return <section className="mb-6 rounded-xl border border-blue-200 bg-white p-4" aria-label="Project timesheet payroll approval">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="font-semibold text-blue-800">Project timesheet payroll approval {open ? '−' : '+'}</button>
    <p className="mt-1 text-sm text-gray-600">Save work, submit for approval, then sync approved hours to attendance before generating payroll. Editing work details requires fresh approval. Client billing rates are separate from employee payroll rates.</p>
    {open && <>
      <div className="my-3 flex flex-wrap items-center gap-2">
        <span className="text-sm">{startDate} to {endDate}</span>
        <button disabled={busy} onClick={refresh} className="rounded border px-3 py-1">Refresh approvals</button>
        <button disabled={busy || !draft} onClick={() => decide('SUBMIT')} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-40">Submit selected</button>
        {canApprove && <>
          <button disabled={busy || !submitted} onClick={() => decide('APPROVE')} className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-40">Approve selected</button>
          <input aria-label="Rejection reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection" className="rounded border px-2 py-1" />
          <button disabled={busy || !submitted || !reason.trim()} onClick={() => decide('REJECT')} className="rounded bg-red-700 px-3 py-1 text-white disabled:opacity-40">Reject selected</button>
        </>}
      </div>
      {error && <p role="alert" className="mb-2 text-red-700">{error}</p>}
      {busy && <p role="status">Loading approvals…</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr>{['Select', 'Employee', 'Project', 'Date', 'NH', 'OT', 'Payroll approval', 'Decision'].map(label => <th key={label} className="border-b p-2">{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <td className="p-2"><input type="checkbox" aria-label={`Select timesheet ${row.id}`} checked={selected.includes(row.id)} onChange={e => setSelected(e.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))} /></td>
          <td className="p-2">{row.employeeName}</td><td className="p-2">{row.project}</td><td className="p-2 whitespace-nowrap">{row.date}</td>
          <td className="p-2">{row.normalHours}{row.enteredNormalHours !== undefined && row.enteredNormalHours !== row.normalHours && <small className="block text-gray-500">Entered: {row.enteredNormalHours}</small>}</td><td className="p-2">{row.overtimeHours}{row.enteredOvertimeHours !== undefined && row.enteredOvertimeHours !== row.overtimeHours && <small className="block text-gray-500">Entered: {row.enteredOvertimeHours}</small>}</td><td className="p-2">{row.status}</td>
          <td className="p-2">{row.approvedBy && `${row.approvedBy} · ${row.approvedAt?.replace('T', ' ')}`}{row.reason && <p>{row.reason}</p>}</td>
        </tr>)}</tbody>
      </table></div>
      {!busy && !rows.length && <p className="mt-2 text-sm">No saved project timesheets in the selected dates.</p>}
    </>}
  </section>;
}
TimesheetPayrollApproval.propTypes = {
  apiBase: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
