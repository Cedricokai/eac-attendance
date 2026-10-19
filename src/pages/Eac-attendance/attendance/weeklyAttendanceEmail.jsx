import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckSquare, Eye, Mail, RefreshCw, Send } from "lucide-react";
import MainSidebar from "../mainSidebar";
import { attendanceReportContactNote } from "./reportContact";
import IndividualReportSchedule from "./IndividualReportSchedule";

const apiBase = () => {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8080";
  if (host.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};
const ymd = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const ranges = {
  weekly: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); const end = new Date(start); end.setDate(start.getDate() + 6); return { startDate: ymd(start), endDate: ymd(end) }; },
  monthly: () => { const now = new Date(); return { startDate: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }; },
};
const employeeName = (employee) => [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.employeeId || "Employee";
const employeeCategory = (employee) => employee.category?.name || employee.category || "Uncategorised";

export default function WeeklyAttendanceEmail() {
  const API = apiBase();
  const token = localStorage.getItem("jwtToken");
  const [isAdmin, setIsAdmin] = useState(false);
  const [period, setPeriod] = useState("weekly");
  const [dates, setDates] = useState(ranges.weekly);
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [excludedCategories, setExcludedCategories] = useState([]);
  const [excludedOvertimeIds, setExcludedOvertimeIds] = useState([]);
  const [includeOvertime, setIncludeOvertime] = useState(true);
  const [recipientText, setRecipientText] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("Please find the selected attendance report attached.");
  const [preview, setPreview] = useState({ rows: [], totals: [] });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const selectedEmployees = useMemo(() => employees.filter((e) => selectedIds.includes(e.id)), [employees, selectedIds]);
  const categories = useMemo(() => [...new Set(employees.map(employeeCategory))].sort(), [employees]);
  const emails = useMemo(() => [...new Set([
    ...selectedEmployees.map((employee) => employee.email).filter((email) => /^\S+@\S+\.\S+$/.test(email || "")),
    ...recipientText.split(/[\n,;]+/).map((v) => v.trim()).filter((v) => /^\S+@\S+\.\S+$/.test(v)),
  ])], [recipientText, selectedEmployees]);
  const missingEmailCount = selectedEmployees.filter((employee) => !/^\S+@\S+\.\S+$/.test(employee.email || "")).length;

  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not verify administrator access to automatic reports. Refresh the page to retry.");
        const user = await response.json();
        const roles = [...(Array.isArray(user.roles) ? user.roles : []), user.role];
        if (active) setIsAdmin(roles.some((role) => String(role).replace(/^ROLE_/i, "").toLowerCase() === "admin"));
      })
      .catch((error) => { if (active) setNotice({ type: "error", text: error.message }); });
    return () => { active = false; };
  }, [API, token]);

  useEffect(() => {
    fetch(`${API}/api/jobs`, { headers }).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => setJobs(Array.isArray(data) ? data : [])).catch(() => setNotice({ type: "error", text: "Could not load projects." }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedIds([]); setExcludedCategories([]); setExcludedOvertimeIds([]); setEmployees([]); setPreview({ rows: [], totals: [] });
    if (!jobId) return;
    const loadGroupEmployees = async () => {
      try {
        let groupEmployees;
        if (jobId === "__NO_JOB__") {
          const [allResponse, ...jobResponses] = await Promise.all([
            fetch(`${API}/api/employee`, { headers }),
            ...jobs.map((job) => fetch(`${API}/api/jobs/${job.id}/employees`, { headers })),
          ]);
          if (!allResponse.ok) throw new Error();
          const allEmployees = await allResponse.json();
          const assignedLists = await Promise.all(jobResponses.map((response) => response.ok ? response.json() : []));
          const assignedIds = new Set(assignedLists.flat().map((employee) => employee.id));
          groupEmployees = (Array.isArray(allEmployees) ? allEmployees : []).filter((employee) => !assignedIds.has(employee.id));
        } else {
          const response = await fetch(`${API}/api/jobs/${jobId}/employees`, { headers });
          if (!response.ok) throw new Error();
          const data = await response.json();
          groupEmployees = Array.isArray(data) ? data : [];
        }
        setEmployees(groupEmployees);
        setSelectedIds(groupEmployees.map((employee) => employee.id));
      } catch { setNotice({ type: "error", text: "Could not load employees for this group." }); }
    };
    loadGroupEmployees();
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePeriod = (value) => { setPeriod(value); if (value !== "custom") setDates(ranges[value]()); setPreview({ rows: [], totals: [] }); };
  const toggleEmployee = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const selectAll = () => {
    const includeAll = selectedIds.length !== employees.length;
    setSelectedIds(includeAll ? employees.map((e) => e.id) : []);
    setExcludedCategories(includeAll ? [] : categories);
  };
  const toggleCategory = (category) => {
    const excluding = !excludedCategories.includes(category);
    setExcludedCategories((current) => excluding ? [...current, category] : current.filter((value) => value !== category));
    const categoryIds = employees.filter((employee) => employeeCategory(employee) === category).map((employee) => employee.id);
    setSelectedIds((current) => excluding
      ? current.filter((id) => !categoryIds.includes(id))
      : [...new Set([...current, ...categoryIds])]);
  };
  const toggleEmployeeOvertime = (employeeId) => setExcludedOvertimeIds((current) =>
    current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId]);
  const toggleCategoryOvertime = (category) => {
    const ids = employees.filter((employee) => employeeCategory(employee) === category).map((employee) => employee.id);
    const allExcluded = ids.length > 0 && ids.every((id) => excludedOvertimeIds.includes(id));
    setExcludedOvertimeIds((current) => allExcluded
      ? current.filter((id) => !ids.includes(id))
      : [...new Set([...current, ...ids])]);
  };
  const validate = () => {
    if (!dates.startDate || !dates.endDate || dates.endDate < dates.startDate) return "Choose a valid report period.";
    if (!jobId) return "Choose a project.";
    if (!selectedIds.length) return "Select at least one employee under the project.";
    return "";
  };

  const loadPreview = async () => {
    const error = validate(); if (error) return setNotice({ type: "error", text: error });
    setLoading(true); setPreview({ rows: [], totals: [] }); setNotice({ type: "", text: "" });
    try {
      const params = new URLSearchParams({ startDate: dates.startDate, endDate: dates.endDate, approvedOnly: 'true' });
      if (jobId !== "__NO_JOB__") params.set("jobId", jobId);
      selectedIds.forEach((id) => params.append("employeeIds", id));
      excludedOvertimeIds.filter((id) => selectedIds.includes(id)).forEach((id) => params.append("excludeOvertimeEmployeeIds", id));
      const response = await fetch(`${API}/api/reports/attendance/preview?${params}`, { headers });
      if (!response.ok) throw new Error(await response.text() || "Could not load preview");
      const data = await response.json();
      if (data.approvedOnly !== true) throw new Error('Approved-hours preview requires the updated backend. Rebuild/restart it and retry.');
      setPreview(data);
    } catch (errorValue) { setNotice({ type: "error", text: errorValue.message }); }
    finally { setLoading(false); }
  };
  const sendReport = async () => {
    const error = validate();
    if (error || !emails.length) return setNotice({ type: "error", text: error || "Enter at least one valid recipient email." });
    setSending(true); setNotice({ type: "", text: "" });
    try {
      const employeeRequests = selectedEmployees.filter((employee) => /^\S+@\S+\.\S+$/.test(employee.email || "")).map((employee) => ({
        toEmails: [employee.email], employeeIds: [employee.id],
        subject: subject || `Your attendance report: ${dates.startDate} to ${dates.endDate}`,
        message: `${message.trim() || "Please find your attendance report attached."}\n\n${attendanceReportContactNote}`,
      }));
      const additionalEmails = [...new Set(recipientText.split(/[\n,;]+/).map((value) => value.trim()).filter((value) => /^\S+@\S+\.\S+$/.test(value)))];
      const requests = [...employeeRequests, ...(additionalEmails.length ? [{ toEmails: additionalEmails, employeeIds: selectedIds, subject: subject || `Attendance report: ${dates.startDate} to ${dates.endDate}` }] : [])];
      const results = await Promise.allSettled(requests.map(async (request) => {
        const response = await fetch(`${API}/api/reports/attendance/email`, { method: "POST", headers, body: JSON.stringify({
          ...request, startDate: dates.startDate, endDate: dates.endDate,
          jobId: jobId === "__NO_JOB__" ? null : Number(jobId),
          includeOvertime,
          excludeOvertimeEmployeeIds: includeOvertime ? excludedOvertimeIds.filter((id) => request.employeeIds.includes(id)) : request.employeeIds,
          message: request.message ?? message,
        }) });
        if (!response.ok) throw new Error(await response.text() || "Could not send report");
      }));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) throw new Error(`${requests.length - failed} report(s) sent, but ${failed} report(s) failed.`);
      setNotice({ type: "success", text: `${employeeRequests.length} individual employee report(s) sent${additionalEmails.length ? `; a combined copy was also sent to ${additionalEmails.length} additional recipient(s)` : ""}.` });
    } catch (errorValue) { setNotice({ type: "error", text: errorValue.message }); }
    finally { setSending(false); }
  };

  return <div className="min-h-screen bg-slate-50 lg:pl-64">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block"><MainSidebar /></aside>
    <main className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <div className="mb-6"><div className="flex items-center gap-2 text-blue-700"><Mail size={19}/><span className="text-sm font-semibold">Reports</span></div><h1 className="mt-1 text-2xl font-bold text-slate-900">Send attendance reports</h1><p className="mt-1 text-sm text-slate-600">Select a period, project and specific employees, preview normal and overtime hours, then email the Excel report.</p></div>
      {notice.text && <div className={`mb-5 flex gap-2 rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}><AlertCircle size={19}/>{notice.text}</div>}
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          {isAdmin && <div className="xl:col-span-2"><IndividualReportSchedule api={API} token={token} employeeIds={selectedIds} includeOvertime={includeOvertime} excludeOvertimeEmployeeIds={excludedOvertimeIds} message={message} /></div>}
        <section className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold"><CalendarDays size={18} className="text-blue-600"/>Report period</h2><div className="mt-4 grid grid-cols-3 gap-2">{[["weekly","Weekly"],["monthly","Monthly"],["custom","Custom"]].map(([value,label]) => <button key={value} onClick={() => choosePeriod(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${period === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">From<input type="date" value={dates.startDate} onChange={(e) => { setPeriod("custom"); setDates({...dates,startDate:e.target.value}); }} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">To<input type="date" value={dates.endDate} onChange={(e) => { setPeriod("custom"); setDates({...dates,endDate:e.target.value}); }} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label></div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Project and employees</h2>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="mt-3 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"><option value="">Select project or group</option><option value="__NO_JOB__">Employees without a project</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}</select>
            {jobId && <>
              {categories.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase text-slate-500">Skip categories</p><div className="mt-2 flex flex-wrap gap-2">{categories.map((category) => <button key={category} onClick={() => toggleCategory(category)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${excludedCategories.includes(category) ? "border-red-200 bg-red-50 text-red-700 line-through" : "border-slate-200 bg-white text-slate-600"}`}>{excludedCategories.includes(category) ? "Skipped: " : "Include: "}{category}</button>)}</div></div>}
              <div className="mt-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Recipients included ({selectedIds.length})</span><button onClick={selectAll} className="text-xs font-bold text-blue-700">{selectedIds.length === employees.length && employees.length ? "Skip all" : "Include all"}</button></div>
              <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border">{employees.length ? employees.map((employee) => <label key={employee.id} className={`flex cursor-pointer gap-3 border-b p-3 last:border-0 hover:bg-slate-50 ${selectedIds.includes(employee.id) ? "" : "bg-red-50/50 opacity-60"}`}><input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)}/><span><span className="block text-sm font-medium">{employeeName(employee)}</span><span className="text-xs text-slate-500">{employeeCategory(employee)} • {employee.email || "No email — cannot receive report"}</span></span></label>) : <p className="p-4 text-sm text-slate-500">No employees assigned to this project.</p>}</div>
            </>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Overtime in this report</h2><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => setIncludeOvertime(true)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${includeOvertime ? "border-purple-500 bg-purple-600 text-white" : "border-slate-200 text-slate-600"}`}>Include overtime</button><button onClick={() => setIncludeOvertime(false)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${!includeOvertime ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 text-slate-600"}`}>Exclude overtime</button></div><p className="mt-2 text-xs text-slate-500">{includeOvertime ? "OT will appear beside NH in the preview and Excel report." : "No OT column, OT hours or OT totals will appear anywhere in the report."}</p></div>
          {includeOvertime && jobId && employees.length > 0 && <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-purple-900">Overtime included in report</h2>
            <p className="mt-1 text-xs text-slate-500">Uncheck OT for an employee or exclude OT for a whole category. Their attendance and normal hours will remain in the report.</p>
            {categories.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => {
              const categoryIds = employees.filter((employee) => employeeCategory(employee) === category).map((employee) => employee.id);
              const excluded = categoryIds.length > 0 && categoryIds.every((id) => excludedOvertimeIds.includes(id));
              return <button key={category} onClick={() => toggleCategoryOvertime(category)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${excluded ? "border-purple-300 bg-purple-100 text-purple-800" : "border-slate-200 text-slate-600"}`}>{excluded ? "OT excluded: " : "OT included: "}{category}</button>;
            })}</div>}
            <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border">{employees.filter((employee) => selectedIds.includes(employee.id)).map((employee) => <label key={employee.id} className="flex cursor-pointer items-center justify-between border-b px-3 py-2 last:border-0"><span className="text-sm">{employeeName(employee)}</span><span className="flex items-center gap-2 text-xs font-semibold text-purple-800"><input type="checkbox" checked={!excludedOvertimeIds.includes(employee.id)} onChange={() => toggleEmployeeOvertime(employee.id)}/> Include OT</span></label>)}</div>
          </div>}
          <button onClick={loadPreview} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? <RefreshCw size={17} className="animate-spin"/> : <Eye size={17}/>} Preview report</button>
        </section>
        <section className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Attendance preview</h2><p className="text-sm text-slate-500">{preview.rows.length} daily record(s) • Total NH {Number(preview.totalNormalHours || 0).toFixed(2)}{includeOvertime && <> • Total OT {Number(preview.totalOvertimeHours || 0).toFixed(2)}</>}</p></div><CheckSquare className="text-emerald-600"/></div><div className="max-h-[420px] overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Employee","Project","Date","Check in","Check out","NH",...(includeOvertime ? ["OT"] : [])].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody className="divide-y">{preview.rows.length ? preview.rows.map((row) => <tr key={row.attendanceId}><td className="px-4 py-3 font-medium">{row.employeeName}<span className="block text-xs font-normal text-slate-400">{row.employeeNumber}</span></td><td className="px-4 py-3">{row.jobName}</td><td className="px-4 py-3 whitespace-nowrap">{row.date}{row.status === "On Leave" && <span className="block text-xs font-medium text-blue-600">On Leave</span>}</td><td className="px-4 py-3">{row.checkIn || "—"}</td><td className="px-4 py-3">{row.checkOut || "—"}</td><td className="px-4 py-3 font-semibold">{Number(row.normalHours || 0).toFixed(2)}</td>{includeOvertime && <td className="px-4 py-3 font-semibold text-purple-700">{Number(row.overtimeHours || 0).toFixed(2)}</td>}</tr>) : <tr><td colSpan={includeOvertime ? 7 : 6} className="px-5 py-12 text-center text-slate-500">Choose the report options and select Preview report.</td></tr>}</tbody></table></div>
            {preview.totals?.length > 0 && <div className="border-t bg-slate-50 p-4"><h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Employee totals</h3><div className="grid gap-2 md:grid-cols-2">{preview.totals.map((total) => <div key={total.employeeId} className="flex justify-between rounded-lg border bg-white px-3 py-2"><span className="text-sm font-medium">{total.employeeName}</span><span className="text-sm"><b>NH {Number(total.totalNormalHours).toFixed(2)}</b>{includeOvertime && <b className="ml-3 text-purple-700">OT {Number(total.totalOvertimeHours).toFixed(2)}</b>}</span></div>)}</div></div>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Email report</h2><div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><b>{emails.length}</b> recipient email(s) ready from selected employee records{missingEmailCount ? ` • ${missingEmailCount} selected employee(s) have no valid email and will be skipped` : ""}.</div><label className="mt-4 block text-sm font-medium">Additional recipient emails (optional)<textarea value={recipientText} onChange={(e) => setRecipientText(e.target.value)} rows="2" placeholder="hr@company.com, manager@company.com" className="mt-1.5 w-full rounded-lg border px-3 py-2"/></label><label className="mt-4 block text-sm font-medium">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={`Attendance report: ${dates.startDate} to ${dates.endDate}`} className="mt-1.5 w-full rounded-lg border px-3 py-2"/></label><label className="mt-4 block text-sm font-medium">Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows="3" className="mt-1.5 w-full rounded-lg border px-3 py-2"/></label><button onClick={sendReport} disabled={sending || !preview.rows.length} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50"><Send size={17}/>{sending ? "Sending report..." : `Send report to ${emails.length || 0} recipient(s)`}</button></div>
        </section>
      </div>
    </main>
  </div>;
}
