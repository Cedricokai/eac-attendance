import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

export default function BackupSchedule({ apiBaseUrl, getToken }) {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reload, setReload] = useState(0);
  const base = `${apiBaseUrl}/api/settings/database-backups`;
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch(`${base}/schedule`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || 'Unable to load automatic backups. Deploy the updated backend and try again.');
        if (!cancelled) {
          setStatus(data);
          setSettings(current => current || data.state.settings);
          setError('');
        }
      } catch (e) { if (!cancelled) setError(e.message); }
    }
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [base, getToken, reload]);

  function change(key, value) { setSettings(current => ({ ...current, [key]: value })); setDirty(true); setMessage(''); }
  async function request(action) {
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await fetch(`${base}/${action === 'save' ? 'schedule' : 'server'}`, {
        method: action === 'save' ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        ...(action === 'save' ? { body: JSON.stringify(settings) } : {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'The backup request failed.');
      setStatus(data);
      if (action === 'save') { setSettings(data.state.settings); setDirty(false); }
      setMessage(action === 'save' ? 'Backup schedule saved.' : 'Server backup started. The result will appear below.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  const format = value => value ? new Date(value).toLocaleString(undefined, { timeZone: status.state.settings.timezone, timeZoneName: 'short' }) : 'None';
  const inputClass = 'mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm';
  return <section className="border-t border-slate-200 pt-5 space-y-4" aria-labelledby="automatic-backups-title">
    <h3 id="automatic-backups-title" className="text-lg font-semibold text-slate-900">Automatic server backups</h3>
    <p className="text-sm text-slate-600">Runs on the backend even when this page is closed. Missed schedules run once when the backend returns. Failed backups are attempted again at the next scheduled time.</p>
    {!settings && !error && <p role="status">Loading backup settings…</p>}
    {settings && <form onSubmit={e => { e.preventDefault(); request('save'); }} className="space-y-4">
      <fieldset disabled={saving || status?.running} className="space-y-4 disabled:opacity-60">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.enabled} onChange={e => change('enabled', e.target.checked)} />Enable automatic backups</label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">Backup time<input className={inputClass} type="time" required value={settings.time} onChange={e => change('time', e.target.value)} /></label>
          <label className="text-sm">Timezone<input className={inputClass} required placeholder="Africa/Accra" value={settings.timezone} onChange={e => change('timezone', e.target.value)} /></label>
          <label className="text-sm">Keep backups for (days)<input className={inputClass} type="number" required min="1" max="3650" value={settings.retentionDays} onChange={e => change('retentionDays', e.target.value === '' ? '' : Number(e.target.value))} /></label>
        </div>
        <fieldset><legend className="text-sm mb-2">Backup days</legend><div className="flex flex-wrap gap-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => <label key={day} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={settings.days.includes(i + 1)} onChange={e => change('days', e.target.checked ? [...settings.days, i + 1] : settings.days.filter(d => d !== i + 1))} />{day}</label>)}
        </div></fieldset>
        <label className="block text-sm">Backup subfolder (optional)<input className={inputClass} value={settings.folder} pattern="([A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*)?" placeholder="Leave blank for the main backup folder" onChange={e => change('folder', e.target.value)} /></label>
        <p className="text-xs text-slate-600">Server location: {status?.root}{settings.folder ? `/${settings.folder}` : ''}. The NAS base folder is configured in Docker. Retention removes only backups created by this scheduler, after a successful backup, in the selected folder.</p>
        <div className="flex gap-3 flex-wrap">
          <button type="submit" disabled={!settings.days.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Working…' : 'Save Schedule'}</button>
          <button type="button" disabled={dirty} onClick={() => request('run')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Back Up to Server Now</button>
        </div>
        {dirty && <p className="text-xs text-slate-600">Save your changes before running a server backup.</p>}
      </fieldset>
    </form>}
    {status && <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-1" role="status" aria-live="polite">
      <p><strong>Status:</strong> {status.running ? 'Running' : status.state.lastStatus}</p>
      <p><strong>Next scheduled backup:</strong> {format(status.state.nextRun)}</p>
      <p><strong>Last attempt:</strong> {format(status.state.lastRun)}</p>
      <p><strong>Last successful backup:</strong> {format(status.state.lastSuccess)}</p>
      {status.state.lastFile && <p className="break-all"><strong>Last saved file:</strong> {status.state.lastFile}</p>}
    </div>}
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    {error && <div role="alert" className="text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
  </section>;
}
BackupSchedule.propTypes = { apiBaseUrl: PropTypes.string.isRequired, getToken: PropTypes.func.isRequired };
