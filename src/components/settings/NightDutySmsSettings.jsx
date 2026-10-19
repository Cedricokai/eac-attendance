import { useEffect, useState } from 'react';

export default function NightDutySmsSettings({ apiBaseUrl }) {
  const [config, setConfig] = useState(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  async function request(path, method = 'GET', body) {
    const response = await fetch(`${apiBaseUrl}/api/night-duty-sms/${path}`, { method, headers: { Authorization: `Bearer ${localStorage.getItem('jwtToken')}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status}). Admin or HR access is required.`);
    return data;
  }
  async function load() {
    setBusy(true);
    try { const data = await request('settings'); setConfig(data.settings); setProviderConfigured(data.providerConfigured); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [apiBaseUrl]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setNotice(''); setPreview('');
    try { const data = await request('settings', 'PUT', config); setConfig(data.settings); setProviderConfigured(data.providerConfigured); setNotice('SMS settings saved.'); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }
  async function review() {
    setBusy(true); setNotice('');
    try { const data = await request('preview'); setPreview(data.message); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }
  async function send() {
    setBusy(true); setNotice('');
    try { const data = await request('send', 'POST'); setNotice(data.message); setPreview(''); }
    catch (error) { setNotice(error.message); }
    finally {
      try { const data = await request('settings'); setConfig(data.settings); setProviderConfigured(data.providerConfigured); }
      catch { /* Keep the sending result if the follow-up refresh fails. */ }
      setBusy(false);
    }
  }
  return <section className="rounded-xl border bg-white p-6">
    <h2 className="text-xl font-semibold">Night duty SMS</h2>
    <p className="mt-2 text-sm text-slate-600">Send the current night-duty employees’ names and phone numbers to your emergency contact. The list uses recent night check-ins with no checkout; old open records are excluded.</p>
    {notice && <p role="status" className="my-3 text-sm">{notice}</p>}
    {!config && <button type="button" disabled={busy} onClick={load} className="mt-3 rounded border px-4 py-2">{busy ? 'Loading…' : 'Retry loading settings'}</button>}
    {config && <>
      <p className={`my-4 text-sm ${providerConfigured ? 'text-green-700' : 'text-amber-800'}`}>{providerConfigured ? 'Arkesel credentials configured on server.' : 'Delivery disabled until the Arkesel API key is configured on the backend server.'}</p>
      <form onSubmit={save} className="grid max-w-xl gap-4">
        <label className="text-sm">Emergency recipient number<input type="tel" value={config.recipient || ''} onChange={event => setConfig({ ...config, recipient: event.target.value })} placeholder="+233244000000" className="mt-1 block w-full rounded border p-2" /></label>
        <label className="text-sm">Approved Arkesel sender ID<input value={config.sender || ''} maxLength={11} onChange={event => setConfig({ ...config, sender: event.target.value })} className="mt-1 block w-full rounded border p-2" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(config.nightlyEnabled)} onChange={event => setConfig({ ...config, nightlyEnabled: event.target.checked })} />Send automatically each night</label>
        <label className="text-sm">Daily send time (Ghana time)<input type="time" value={(config.sendTime || '22:00').slice(0, 5)} onChange={event => setConfig({ ...config, sendTime: event.target.value })} required className="mt-1 block rounded border p-2" /></label>
        <p className="text-xs text-slate-500">Choose a time after security checks in. Scheduled sending runs on the backend. Failed or uncertain sends are recorded and require manual review before retrying.</p>
        <button disabled={busy} className="rounded bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">Save SMS settings</button>
      </form>
      <p className="mt-4 text-sm">Last attempt: {config.lastAttemptAt?.replace('T', ' ') || 'None'} · {config.lastResult || 'No messages sent'}</p>
      <button type="button" disabled={busy || !providerConfigured || !config.recipient} onClick={review} className="mt-4 rounded border px-4 py-2 disabled:opacity-50">Review duty list for SMS</button>
      {preview && <div className="mt-4 rounded bg-slate-50 p-4"><p className="mb-2 text-sm">Uses the recipient saved on the server. Sending may use multiple SMS credits.</p><pre className="whitespace-pre-wrap text-sm">{preview}</pre><button type="button" disabled={busy} onClick={send} className="mt-3 rounded bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">Send current duty list now</button></div>}
    </>}
  </section>;
}
