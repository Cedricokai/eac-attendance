import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as XLSX from 'xlsx';
import { X, Download } from 'lucide-react';
import { canConvertRawEvent, groupRawBiometricEvents, loadAllRawBiometricEvents } from '../../../utils/rawBiometricAttendance';

export default function RawBiometricModal({ apiBaseUrl, employees, onClose, onConverted }) {
  const [filters, setFilters] = useState({ employeeId: '', startDate: '', endDate: '', source: '', status: '' });
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [view, setView] = useState('attendance');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payloadEvent, setPayloadEvent] = useState(null);
  const request = useRef(null);
  const appliedFilters = useRef(filters);
  const names = useMemo(() => new Map(employees.map(employee => [String(employee.id), `${employee.firstName || ''} ${employee.lastName || ''}`.trim()])), [employees]);
  const name = event => names.get(String(event.employeeId)) || event.rawEmployeeName || event.deviceUserId || 'Unmatched';
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('jwtToken')}` });
  const load = async (nextFilters) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(''); setSelected(new Set());
    try {
      if (nextFilters.startDate && nextFilters.endDate && nextFilters.startDate > nextFilters.endDate) throw new Error('Start date must be before the end date.');
      const rows = await loadAllRawBiometricEvents(apiBaseUrl, nextFilters, { headers: headers(), signal: controller.signal });
      if (controller.signal.aborted) return;
      setEvents(rows); setPage(0); appliedFilters.current = { ...nextFilters };
    } catch (e) {
      if (!controller.signal.aborted) { setEvents([]); setError(e.message); }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };
  useEffect(() => {
    load(appliedFilters.current);
    return () => request.current?.abort();
    // The modal owns its applied filters; editing inputs does not trigger requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);
  const groups = useMemo(() => groupRawBiometricEvents(events), [events]);
  const rows = view === 'attendance' ? groups : events;
  const totalPages = Math.max(1, Math.ceil(rows.length / 100));
  const visibleRows = rows.slice(page * 100, (page + 1) * 100);
  const eligibleIds = rowsToSelect => rowsToSelect.flatMap(row => view === 'attendance' ? row.events : [row]).filter(canConvertRawEvent).map(event => event.id);
  const pageIds = eligibleIds(visibleRows);
  const toggle = ids => {
    const next = new Set(selected);
    if (ids.every(id => next.has(id))) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    if (next.size > 500) { setError('Select up to 500 punches per conversion.'); return; }
    setError(''); setSelected(next);
  };
  const convert = async () => {
    if (converting || !selected.size) return;
    setConverting(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/biometric/raw-events/convert`, {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify([...selected])
      });
      if (!response.ok) {
        const body = await response.text();
        let message = body;
        try { const data = JSON.parse(body); message = data.detail || data.message || data.error; } catch { /* text error */ }
        throw new Error(message || `Conversion failed (${response.status})`);
      }
      const result = await response.json();
      setSuccess(`${result.convertedEvents} punches converted into ${result.attendanceCount} attendance records. ${result.skippedEvents} already linked punches skipped.`);
      await load(appliedFilters.current);
      onConverted();
    } catch (e) { setError(e.message); }
    finally { setConverting(false); }
  };
  const exportEvents = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(events.map(event => ({ ...event, employeeName: name(event) }))), 'Raw Biometric Events');
    XLSX.writeFile(workbook, `raw_biometric_events_${appliedFilters.current.startDate || 'all'}_${appliedFilters.current.endDate || 'all'}.xlsx`);
  };
  const field = (key, value) => setFilters(previous => ({ ...previous, [key]: value }));
  const time = value => value ? value.replace('T', ' ') : '—';
  const cell = 'px-4 py-3 text-sm';
  const check = ids => <input type="checkbox" aria-label="Select punches for attendance" disabled={loading || converting || !ids.length} checked={ids.length > 0 && ids.every(id => selected.has(id))} onChange={() => toggle(ids)} />;
  return <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="raw-biometric-title">
    <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-950 px-6 py-4 text-white">
        <div><h2 id="raw-biometric-title" className="text-lg font-bold">Raw Biometric Events</h2><p className="text-xs text-slate-400">Review punches by employee and shift, then convert selected records to attendance.</p></div>
        <div className="flex gap-2"><button onClick={exportEvents} disabled={loading || !events.length} className="rounded-lg bg-green-600 px-3 py-2 text-sm disabled:opacity-50"><Download size={16} className="mr-1 inline" />Export</button><button aria-label="Close raw biometric events" disabled={converting} onClick={onClose} className="rounded-lg bg-white/10 p-2 disabled:opacity-50"><X size={18} /></button></div>
      </div>
      <fieldset disabled={converting || loading} className="grid grid-cols-2 gap-3 border-b bg-slate-50 p-4 md:grid-cols-6">
        <select aria-label="Employee" value={filters.employeeId} onChange={e => field('employeeId', e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">All employees</option>{employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select>
        <input aria-label="Start date" type="date" value={filters.startDate} onChange={e => field('startDate', e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
        <input aria-label="End date" type="date" value={filters.endDate} onChange={e => field('endDate', e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
        <select aria-label="Source" value={filters.source} onChange={e => field('source', e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">All sources</option><option value="ONEPASS">ONEPASS</option><option value="EXCEL_IMPORT">Excel import</option></select>
        <select aria-label="Processing status" value={filters.status} onChange={e => field('status', e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">All statuses</option><option value="RECEIVED">Received</option><option value="PROCESSED">Processed</option><option value="FAILED">Failed</option></select>
        <button onClick={() => { setSuccess(''); load(filters); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
      </fieldset>
      <div className="border-b px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">{[['attendance', 'Attendance view'], ['raw', 'Raw punches']].map(([value, label]) => <button key={value} aria-pressed={view === value} onClick={() => { setView(value); setPage(0); }} className={`rounded-lg px-3 py-2 text-sm ${view === value ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div>
          <button disabled={loading || converting || !selected.size} onClick={convert} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{converting ? 'Converting…' : `Convert selected to attendance (${selected.size} punches)`}</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Selected punches use the earliest check-in and latest check-out for each shift. Conversion calculates attendance hours and updates any existing attendance for that employee and shift. Already linked punches are skipped. Saved NH and OT show the linked attendance values after conversion.</p>
        {events.some(event => !Object.hasOwn(event, 'conversionIssue')) && <p className="mt-2 text-sm text-amber-700">Restart the updated backend to enable conversion and shift grouping.</p>}
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="mt-2 text-sm text-green-700">{success}</p>}
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? <p role="status" className="p-12 text-center text-slate-500">Loading all matching punches…</p> : <table className="min-w-full divide-y"><thead className="sticky top-0 bg-white"><tr><th className={cell}>{check(pageIds)}</th>{(view === 'attendance' ? ['Employee', 'Category', 'Shift date', 'Check In', 'Check Out', 'Saved NH', 'Saved OT', 'Punches', 'Conversion status'] : ['Time', 'Employee', 'Source', 'Punch', 'Status', 'Attendance', 'Details']).map(label => <th key={label} className="px-4 py-3 text-left text-xs uppercase text-slate-500">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{visibleRows.map(row => {
            const groupEvents = view === 'attendance' ? row.events : [row];
            const ids = groupEvents.filter(canConvertRawEvent).map(event => event.id);
            const event = groupEvents[0];
            const linked = groupEvents.find(item => item.attendanceId != null);
            const issues = [...new Set(groupEvents.map(item => item.conversionIssue).filter(Boolean))];
            return <tr key={row.key || row.id} className="hover:bg-slate-50"><td className={cell}>{check(ids)}</td>{view === 'attendance' ? <>
              <td className={cell}>{name(event)}</td><td className={cell}>{event.categoryName || '—'}</td><td className={cell}>{row.date || 'Unknown'}</td><td className={`${cell} whitespace-nowrap`}>{time(row.checkIn)}</td><td className={`${cell} whitespace-nowrap`}>{time(row.checkOut)}</td><td className={cell}>{linked?.savedNormalHours == null ? '—' : Number(linked.savedNormalHours).toFixed(2)}</td><td className={cell}>{linked?.savedOvertimeHours == null ? '—' : Number(linked.savedOvertimeHours).toFixed(2)}</td><td className={cell}>{groupEvents.length}</td><td className={cell}>{ids.length > 0 && <div className="text-blue-700">{ids.length} ready to convert</div>}{issues.map(issue => <div key={issue} className="text-xs text-slate-500">{issue}</div>)}</td>
            </> : <><td className={`${cell} whitespace-nowrap`}>{time(event.eventTimestamp || event.receivedAt)}</td><td className={cell}>{name(event)}</td><td className={cell}>{event.sourceType}</td><td className={cell}>{event.punchType || '—'}</td><td className={cell}>{event.processingStatus}<div className="text-xs text-slate-500">{event.conversionIssue}</div></td><td className={cell}>{event.attendanceId || '—'}</td><td className={cell}><button onClick={() => setPayloadEvent(event)} className="font-semibold text-blue-600">Payload</button></td></>}</tr>;
          })}</tbody></table>}
        {!loading && !rows.length && <div className="p-12 text-center text-slate-500">No raw biometric events found.</div>}
      </div>
      <div className="flex items-center justify-between border-t px-5 py-3 text-sm"><span>{events.length} punches · Page {page + 1} of {totalPages}</span><div className="flex gap-2"><button disabled={loading || page === 0} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={loading || page + 1 >= totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    </div>
    {payloadEvent && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"><div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-slate-950 p-5 text-slate-100"><div className="mb-3 flex justify-between"><h3 className="font-bold">Raw payload #{payloadEvent.id}</h3><button aria-label="Close payload" onClick={() => setPayloadEvent(null)}><X size={18} /></button></div><pre className="whitespace-pre-wrap break-all text-xs">{typeof payloadEvent.rawPayload === 'string' ? payloadEvent.rawPayload : JSON.stringify(payloadEvent.rawPayload, null, 2)}</pre></div></div>}
  </div>;
}

RawBiometricModal.propTypes = { apiBaseUrl: PropTypes.string.isRequired, employees: PropTypes.array.isRequired, onClose: PropTypes.func.isRequired, onConverted: PropTypes.func.isRequired };
