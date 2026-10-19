import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import PropTypes from 'prop-types';
import { groupProjectDays, payrollMoney, projectPayrollExport, readProjectSnapshot } from '../utils/projectPayroll';

const money = value => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(Number(value) || 0);
const amount = value => (Number(value) || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 });
const matchesProject = (key, filter) => filter === 'all' || key === filter || (filter === 'linked' && key !== 'none');

export default function ProjectPayrollReport({ apiBaseUrl, refreshKey }) {
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [records, setRecords] = useState([]);
  const [project, setProject] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` };
    fetch(`${apiBaseUrl}/api/payroll/periods`, { headers, credentials: 'include', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load payroll periods.');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid payroll period response.');
        setPeriods(data);
      }).catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [apiBaseUrl, refreshKey]);

  useEffect(() => {
    setRecords([]); setError(''); setProject('all');
    if (!periodId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch(`${apiBaseUrl}/api/payroll?periodId=${encodeURIComponent(periodId)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` },
      credentials: 'include', signal: controller.signal,
    }).then(async response => {
      if (response.status === 404) return [];
      if (!response.ok) throw new Error('Could not load payroll earnings.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid payroll earnings response.');
      return data;
    }).then(setRecords).catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiBaseUrl, periodId, refreshKey]);

  const rows = useMemo(() => records.map(record => {
    const snapshot = readProjectSnapshot(record);
    return { record, snapshot, groups: groupProjectDays(snapshot?.days || []) };
  }), [records]);
  const projects = useMemo(() => {
    const all = new Map();
    rows.forEach(row => row.groups.forEach(group => { if (group.key !== 'none') all.set(group.key, group.projectName); }));
    return [...all.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);
  const visible = rows.filter(({ record, groups }) => {
    const employee = record.employee || {};
    const name = `${employee.firstName || ''} ${employee.lastName || ''} ${employee.employeeId || ''}`.toLowerCase();
    return name.includes(search.trim().toLowerCase()) && (project === 'all' || groups.some(group => matchesProject(group.key, project)));
  });
  const selectedPeriod = periods.find(period => String(period.id) === periodId);
  const totals = visible.reduce((sum, row) => ({
    gross: payrollMoney(sum.gross + (Number(row.record.grossSalary) || 0)),
    net: payrollMoney(sum.net + (Number(row.record.netSalary) || 0)),
    work: payrollMoney(sum.work + row.groups.filter(group => matchesProject(group.key, project)).reduce((total, group) => total + group.totalEarnings, 0)),
  }), { gross: 0, net: 0, work: 0 });

  const exportReport = () => {
    const data = projectPayrollExport(visible.map(row => row.record), project);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.periods), 'Full period earnings');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.work), 'Project work details');
    XLSX.writeFile(workbook, `Payroll-project-earnings-${periodId}.xlsx`);
  };

  return <section className="space-y-4" aria-label="Project payroll earnings">
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <h2 className="text-lg font-semibold">Period and project earnings</h2>
      <p className="text-sm text-gray-600">Full-period pay includes the project earnings below. Project earnings are gross work pay before deductions, allocated from the saved payroll using payable hours and captured rates. Monthly salary, leave pay, allowances and undated pay stay under other period earnings.</p>
      <p className="text-sm text-gray-600">Save project timesheets and sync them with attendance before generating payroll. Saving a timesheet alone does not include its hours in payroll.</p>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">Payroll period
          <select value={periodId} onChange={event => setPeriodId(event.target.value)} className="block border rounded p-2 mt-1 max-w-full">
            <option value="">Select a payroll period</option>
            {periods.map(period => <option key={period.id} value={period.id}>{period.name} · {period.startDate} to {period.endDate} · {period.category}</option>)}
          </select>
        </label>
        <label className="text-sm">Project
          <select value={project} onChange={event => setProject(event.target.value)} className="block border rounded p-2 mt-1">
            <option value="all">All project and non-project work</option><option value="linked">Linked to any project</option><option value="none">No recorded project</option>
            {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="text-sm">Employee<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or employee ID" className="block border rounded p-2 mt-1" /></label>
        <button onClick={exportReport} disabled={loading || !visible.length} className="bg-green-700 text-white rounded px-4 py-2 disabled:opacity-50">Export Excel</button>
      </div>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading && <p role="status">Loading payroll earnings…</p>}
    {!loading && periodId && <>
      <p className="font-medium">{selectedPeriod?.startDate} to {selectedPeriod?.endDate} · {visible.length} employee record(s)</p>
      <div className="grid gap-3 md:grid-cols-3">
        {[['Full-period gross — matching employees', totals.gross], ['Full-period net — matching employees', totals.net], ['Work earnings — selected projects', totals.work]].map(([label, total]) => <div key={label} className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-600">{label}</p><p className="font-semibold text-xl">{money(total)}</p></div>)}
      </div>
      {project !== 'all' && <p className="text-sm text-gray-600">Full-period totals still include all work and adjustments for each matching employee; they are not project-only totals.</p>}
      {!visible.length && <p>No payroll records match this selection.</p>}
      {visible.map(({ record, snapshot, groups }) => <article key={record.id} className="bg-white border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">{record.employee?.firstName} {record.employee?.lastName} <span className="font-normal text-gray-600">· {record.employee?.employeeId} · {record.status}</span></h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>Full-period gross: <strong>{money(record.grossSalary)}</strong></span>
          <span>PAYE: {money(record.payeTax)}</span><span>Employee SSNIT: {money(record.ssnitEmployee)}</span>
          <span>Loans: {money(record.loanDeduction)}</span><span>Credits: {money(record.creditAmount)}</span>
          <span>Full-period net: <strong>{money(record.netSalary)}</strong></span>
        </div>
        {!snapshot ? <p className="text-amber-800">Project breakdown unavailable for this payroll run. It is saved when payroll is generated with this feature.</p> : <>
          <p className="text-sm">All work earnings: {money(snapshot.workEarnings)} + other period earnings: {money(snapshot.otherPeriodEarnings)} = full-period gross: {money(snapshot.periodGross)}</p>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-gray-50"><tr>{['Project', 'Work dates', 'Source', 'Normal hours', 'OT hours', 'Normal earnings', 'OT earnings', 'Gross work earnings'].map(label => <th key={label} className="p-2 whitespace-nowrap">{label}</th>)}</tr></thead>
            <tbody>{groups.filter(group => matchesProject(group.key, project)).map(group => <tr key={group.key} className="border-t">
              <td className="p-2 font-medium">{group.projectName}</td>
              <td className="p-2"><details><summary className="cursor-pointer whitespace-nowrap">{group.dates[0]} to {group.dates.at(-1)} ({group.dates.length} days)</summary><div className="mt-2 space-y-1">{group.days.map((day, index) => <p key={`${day.date}-${index}`} className="whitespace-nowrap">{day.date} · NH {amount(day.normalHours)} · OT {amount(day.overtimeHours)} · {money(day.totalEarnings)}{day.timesheetId != null ? ` · Timesheet #${day.timesheetId}` : ''}</p>)}</div></details></td>
              <td className="p-2">{group.sources.join(', ')}</td><td className="p-2">{amount(group.normalHours)}</td><td className="p-2">{amount(group.overtimeHours)}</td>
              <td className="p-2">{money(group.normalEarnings)}</td><td className="p-2">{money(group.overtimeEarnings)}</td><td className="p-2 font-semibold">{money(group.totalEarnings)}</td>
            </tr>)}</tbody>
          </table></div>
          {!groups.length && <p className="text-sm text-gray-600">No dated work earnings in this run. See full-period earnings above.</p>}
        </>}
      </article>)}
    </>}
  </section>;
}

ProjectPayrollReport.propTypes = {
  apiBaseUrl: PropTypes.string.isRequired,
  refreshKey: PropTypes.number,
};
