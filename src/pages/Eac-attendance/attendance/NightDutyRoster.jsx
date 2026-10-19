import { useState } from 'react';
import { nightDutyDates, getNightDutyRoster } from '../../../utils/nightDutyRoster';

export default function NightDutyRoster({ apiBaseUrl, employees, categories }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);

  async function refresh() {
    setLoading(true);
    setError('');
    setUpdated(null);
    setRows([]);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` };
      const response = await fetch(`${apiBaseUrl}/api/attendance?${new URLSearchParams(nightDutyDates())}`, { headers });
      if (!response.ok) throw new Error('Could not load night duty attendance. Please retry.');
      const records = await response.json();
      if (!Array.isArray(records)) throw new Error('Unexpected attendance response.');
      setRows(getNightDutyRoster(records, employees, categories));
      setUpdated(new Date());
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }

  return <section className="my-4 rounded-xl border border-indigo-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold text-indigo-950">Night shift duty</h2><p className="text-sm text-gray-600">Employees with a night check-in and no recorded checkout.</p></div>
      <button type="button" disabled={loading} onClick={() => { setOpen(true); refresh(); }} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm text-white disabled:opacity-50">{loading ? 'Loading…' : open ? 'Refresh duty list' : 'View duty list'}</button>
    </div>
    {open && <div className="mt-4">
      <p className="text-sm text-amber-800">Attendance indicates who may still be on duty. Verify missed checkouts before using this list in an emergency.</p>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {updated && <p className="mt-2 text-xs text-gray-500">Updated {updated.toLocaleTimeString('en-GB', { timeZone: 'Africa/Accra' })} Ghana time</p>}
      <a href="/settingspage?tab=sms" className="mt-3 inline-block text-sm text-indigo-700 underline">Configure SMS recipient and send duty list</a>
      {updated && rows.length === 0 && <p className="mt-3 text-sm">No open night-shift attendance found for today or yesterday.</p>}
      {rows.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Employee</th><th className="p-2">Phone</th><th className="p-2">Shift date / check-in</th><th className="p-2">Attendance</th></tr></thead><tbody>{rows.map(row => <tr key={row.id ?? `${row.employee.id}-${row.date}`} className="border-b"><td className="p-2">{row.employee.firstName} {row.employee.lastName}</td><td className="p-2">{row.employee.phone || 'Missing phone number'}</td><td className="p-2">{row.date} / {row.checkIn.slice(0, 5)}</td><td className="p-2">{row.stale ? 'Old open record — verify checkout' : 'Checked in · no checkout recorded'}</td></tr>)}</tbody></table></div>}
    </div>}
  </section>;
}
