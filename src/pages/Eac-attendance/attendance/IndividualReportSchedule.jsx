import { useEffect, useRef, useState } from "react";
import { CalendarClock, Clock3, Users, X, ChevronRight } from "lucide-react";
import { attendanceReportContactNote } from "./reportContact";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" }).format(new Date(value)) : "—";

export default function IndividualReportSchedule({ api, token, employeeIds, includeOvertime, excludeOvertimeEmployeeIds, message }) {
  const [status, setStatus] = useState(null);
  const [frequency, setFrequency] = useState("WEEKLY");
  const [weekday, setWeekday] = useState(1);
  const [sendTime, setSendTime] = useState("08:00");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [useCurrentSelection, setUseCurrentSelection] = useState(true);
  const dialog = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { dialog.current?.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);
  const openSettings = () => {
    if (status) accept(status);
    setUseCurrentSelection(!status?.settings.employeeIds.length);
    setError(""); setNotice(""); setOpen(true);
  };
  const endpoint = `${api}/api/reports/attendance/individual-schedule`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const accept = (data) => {
    setStatus(data); setFrequency(data.settings.frequency); setWeekday(data.settings.weekday); setSendTime(data.settings.sendTime);
  };
  const responseData = async (response) => {
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Could not access the report schedule. Check that the server is updated and you have administrator access.");
    return data;
  };
  useEffect(() => {
    let active = true;
    fetch(endpoint, { headers }).then(responseData).then((data) => { if (active) accept(data); })
      .catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (settings, success) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await responseData(await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify(settings) }));
      accept(data); setNotice(success); setOpen(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const saveSelection = (event) => {
    event.preventDefault();
    const selection = useCurrentSelection ? { employeeIds, includeOvertime,
      excludeOvertimeEmployeeIds: excludeOvertimeEmployeeIds.filter((id) => employeeIds.includes(id)), message } : status.settings;
    if (!selection.employeeIds.length) { setError("Select at least one employee in Project and employees, then reopen this popup."); return; }
    save({ ...selection, enabled: true, frequency, weekday, sendTime }, "Automatic individual reports scheduled.");
  };
  const selectedCount = useCurrentSelection ? employeeIds.length : status?.settings.employeeIds.length || 0;
  return <>
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><CalendarClock size={22}/></div>
        <label className="flex flex-1 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={Boolean(status?.settings.enabled || open)} disabled={loading || busy || !status}
            onChange={(event) => event.target.checked ? openSettings() : save({ ...status.settings, enabled: false }, "Automatic reports paused.")}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus:ring-2 focus:ring-blue-500"/>
          <span><span className="block text-sm font-semibold text-slate-900">Send individual reports automatically</span>
            <span className="mt-0.5 block text-xs text-slate-500">{loading ? "Loading schedule…" : status?.settings.enabled ? `Next delivery: ${formatDate(status.nextRun)} · Ghana time` : "Choose a daily or weekly delivery schedule."}</span></span>
        </label>
        {status && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.settings.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{status.settings.enabled ? "Active" : status.settings.employeeIds.length ? "Paused" : "Not scheduled"}</span>}
        {!!status?.settings.employeeIds.length && <button type="button" disabled={busy} onClick={openSettings} className="flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900">Edit schedule<ChevronRight size={16}/></button>}
      </div>
      {!open && error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
    </div>
    <dialog ref={dialog} aria-labelledby="individual-schedule-title" aria-describedby="individual-schedule-description"
      onCancel={(event) => { if (busy) event.preventDefault(); else setOpen(false); }} onClose={() => setOpen(false)}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm">
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600"><CalendarClock size={16}/>Report delivery</div>
          <h2 id="individual-schedule-title" className="text-xl font-semibold">Automatic individual reports</h2>
          <p id="individual-schedule-description" className="mt-1 text-sm text-slate-500">A personal attendance report, delivered on schedule.</p></div>
        <button type="button" aria-label="Close schedule settings" disabled={busy} onClick={() => setOpen(false)} className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={20}/></button>
      </div>
      <form onSubmit={saveSelection}>
        <fieldset disabled={busy || !status} className="space-y-5 px-6 py-5 disabled:opacity-60">
          <fieldset><legend className="mb-2 text-sm font-medium">How often?</legend><div className="grid grid-cols-2 gap-3">
            {[["DAILY", "Daily", "Previous day"], ["WEEKLY", "Weekly", "Previous Monday–Sunday"]].map(([value, title, subtitle]) => <label key={value} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${frequency === value ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"}`}>
              <input type="radio" name="reportFrequency" value={value} checked={frequency === value} onChange={() => setFrequency(value)} className="mt-1 accent-blue-600"/>
              <span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-slate-500">{subtitle}</span></span></label>)}
          </div></fieldset>
          <div className="grid grid-cols-2 gap-3">
            {frequency === "WEEKLY" && <label className="text-sm font-medium">Delivery day<select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">{days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>}
            <label className="text-sm font-medium">Delivery time<input required type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"/></label>
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14}/>Ghana time (GMT) · Works when this page is closed</p>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-slate-500"/>{selectedCount} employee(s) {useCurrentSelection ? "selected" : "saved"}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Each employee receives a separate report using their email on file. Missing email addresses are skipped.</p>
            {!!status?.settings.employeeIds.length && <label className="mt-3 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={useCurrentSelection} onChange={(e) => setUseCurrentSelection(e.target.checked)} className="mt-0.5 accent-blue-600"/>Replace saved recipients and report options with the current selection ({employeeIds.length} employees)</label>}
            {useCurrentSelection && <p className="mt-2 text-xs text-slate-500">Uses the selected overtime options and Email report message.</p>}
          </div>
          <details className="text-xs text-slate-500"><summary className="cursor-pointer font-medium text-slate-600">Included HR contact note</summary><p className="mt-2 leading-relaxed">{attendanceReportContactNote}</p></details>
          {status?.lastAttempt && <p className="text-xs text-slate-500">Last delivery attempt: {formatDate(status.lastAttempt)} · {status.lastResult}</p>}
          {!selectedCount && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Select employees under Project and employees first, then reopen these settings.</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </fieldset>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={busy || !status || !selectedCount} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{busy ? "Saving…" : "Save and enable"}</button>
        </div>
      </form>
    </dialog>
  </>;
}
