import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, CheckCircle2, Clock3, Headphones, RefreshCw, Search, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { getApiBaseUrl } from "../utils/api";

const statusStyle = {
  PENDING: "bg-amber-100 text-amber-800", APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800", CANCELLED: "bg-gray-100 text-gray-700",
  OPEN: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-emerald-100 text-emerald-800", CLOSED: "bg-gray-100 text-gray-700",
};

export default function PortalRequestsPage() {
  const [tab, setTab] = useState("accounts");
  const [accounts, setAccounts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("authToken");
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.error || `Request failed (${response.status})`);
    return body;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountData, ticketData] = await Promise.all([
        request("/auth/admin/account-requests"), request("/auth/admin/support-requests"),
      ]);
      setAccounts(accountData);
      setTickets(ticketData);
    } catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  const records = tab === "accounts" ? accounts : tickets;
  const filtered = useMemo(() => records.filter((item) => {
    const haystack = Object.values(item).filter((value) => typeof value === "string").join(" ").toLowerCase();
    return (status === "ALL" || item.status === status) && haystack.includes(query.toLowerCase());
  }), [records, query, status]);

  const update = async (item, nextStatus, notes = "", assignedTo = "") => {
    const path = tab === "accounts" ? `/auth/admin/account-requests/${item.id}` : `/auth/admin/support-requests/${item.id}`;
    try {
      const updated = await request(path, { method: "PATCH", body: JSON.stringify({ status: nextStatus, notes, assignedTo }) });
      if (tab === "accounts") setAccounts((items) => items.map((entry) => entry.id === updated.id ? updated : entry));
      else setTickets((items) => items.map((entry) => entry.id === updated.id ? updated : entry));
      setSelected(updated);
      toast.success(`Request marked ${nextStatus.toLowerCase().replace("_", " ")}`);
    } catch (error) { toast.error(error.message); }
  };

  const counts = (values) => records.reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), Object.fromEntries(values.map((value) => [value, 0])));
  const accountCounts = counts(["PENDING", "APPROVED", "REJECTED"]);
  const ticketCounts = counts(["OPEN", "IN_PROGRESS", "RESOLVED"]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-800 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><Link to="/centralizedDashboard" className="inline-flex items-center text-sm text-blue-100 hover:text-white mb-3"><ArrowLeft size={16} className="mr-2" />Central dashboard</Link><h1 className="text-2xl font-bold flex items-center gap-3"><ShieldCheck /> Portal Requests</h1><p className="text-blue-100 mt-1">Review account access and manage IT support tickets</p></div>
          <button onClick={load} disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-white/15 border border-white/20 px-4 py-2 hover:bg-white/25 disabled:opacity-50"><RefreshCw size={17} className={`mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <Stat label="Pending accounts" value={accountCounts.PENDING} icon={Clock3} color="amber" />
          <Stat label="Approved" value={accountCounts.APPROVED} icon={CheckCircle2} color="emerald" />
          <Stat label="Rejected" value={accountCounts.REJECTED} icon={XCircle} color="red" />
          <Stat label="Open tickets" value={ticketCounts.OPEN} icon={Headphones} color="blue" />
          <Stat label="In progress" value={ticketCounts.IN_PROGRESS} icon={Clock3} color="purple" />
          <Stat label="Resolved" value={ticketCounts.RESOLVED} icon={CheckCircle2} color="emerald" />
        </div>
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 p-4 flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex rounded-xl bg-slate-100 p-1 self-start">
              <Tab active={tab === "accounts"} onClick={() => { setTab("accounts"); setStatus("ALL"); setSelected(null); }} icon={UserPlus}>Account requests</Tab>
              <Tab active={tab === "tickets"} onClick={() => { setTab("tickets"); setStatus("ALL"); setSelected(null); }} icon={Headphones}>IT support</Tab>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requests..." className="w-full sm:w-64 rounded-xl border border-slate-300 pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200" /></label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 outline-none"><option value="ALL">All statuses</option>{(tab === "accounts" ? ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] : ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).map((value) => <option key={value}>{value}</option>)}</select>
            </div>
          </div>
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] min-h-[500px]">
            <div className="overflow-x-auto border-r border-slate-200">
              {loading ? <div className="p-12 text-center text-slate-500">Loading requests...</div> : filtered.length === 0 ? <div className="p-12 text-center text-slate-500">No matching requests found.</div> : (
                <table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500 text-left"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Requester</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer hover:bg-indigo-50/50 ${selected?.id === item.id ? "bg-indigo-50" : ""}`}><td className="px-4 py-4 font-semibold text-indigo-700">{item.reference}</td><td className="px-4 py-4"><div className="font-medium text-slate-900">{item.fullName || item.name}</div><div className="text-xs text-slate-500">{item.workEmail || item.email}</div></td><td className="px-4 py-4 text-slate-600">{item.department || item.category?.replaceAll("_", " ")}</td><td className="px-4 py-4"><Badge status={item.status} /></td><td className="px-4 py-4 text-slate-500 whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td></tr>)}</tbody></table>
              )}
            </div>
            <Detail item={selected} tab={tab} update={update} />
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }) { const styles = { amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700", red: "bg-red-50 text-red-700", blue: "bg-blue-50 text-blue-700", purple: "bg-purple-50 text-purple-700" }; return <div className="bg-white border border-slate-200 rounded-xl p-4"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${styles[color]}`}><Icon size={18} /></div><p className="text-2xl font-bold text-slate-900 mt-3">{value}</p><p className="text-xs text-slate-500 mt-1">{label}</p></div>; }
function Tab({ active, onClick, icon: Icon, children }) { return <button onClick={onClick} className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}><Icon size={16} className="mr-2" />{children}</button>; }
function Badge({ status }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[status] || "bg-gray-100 text-gray-700"}`}>{status?.replaceAll("_", " ")}</span>; }

function Detail({ item, tab, update }) {
  const [notes, setNotes] = useState(""); const [assignedTo, setAssignedTo] = useState("");
  useEffect(() => { setNotes(item?.reviewNotes || item?.resolutionNotes || ""); setAssignedTo(item?.assignedTo || ""); }, [item]);
  if (!item) return <div className="p-8 flex items-center justify-center text-center text-slate-400"><div><ShieldCheck size={40} className="mx-auto mb-3 opacity-50" /><p>Select a request to review its details.</p></div></div>;
  return <aside className="p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-lg text-slate-900">{item.reference}</h2><Badge status={item.status} /></div><dl className="mt-6 space-y-4 text-sm"><Row label="Name" value={item.fullName || item.name} /><Row label="Email" value={item.workEmail || item.email} />{tab === "accounts" ? <><Row label="Employee ID" value={item.employeeId} /><Row label="Department" value={item.department} /><Row label="Mobile" value={item.mobile} /><Row label="Access reason" value={item.accessReason} /></> : <><Row label="Category" value={item.category?.replaceAll("_", " ")} /><Row label="Page" value={item.page} /><Row label="Problem" value={item.description} /></>}</dl><div className="mt-6 border-t border-slate-200 pt-5 space-y-4">{tab === "tickets" && <label className="block"><span className="text-sm font-medium text-slate-700">Assigned to</span><input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="IT team member" /></label>}<label className="block"><span className="text-sm font-medium text-slate-700">{tab === "accounts" ? "Review notes" : "Resolution notes"}</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 resize-none" /></label><div className="grid grid-cols-2 gap-2">{tab === "accounts" ? <><button onClick={() => update(item, "APPROVED", notes)} className="rounded-lg bg-emerald-600 text-white py-2 font-semibold hover:bg-emerald-700">Approve</button><button onClick={() => update(item, "REJECTED", notes)} className="rounded-lg bg-red-600 text-white py-2 font-semibold hover:bg-red-700">Reject</button></> : <><button onClick={() => update(item, "IN_PROGRESS", notes, assignedTo)} className="rounded-lg bg-purple-600 text-white py-2 font-semibold hover:bg-purple-700">Start work</button><button onClick={() => update(item, "RESOLVED", notes, assignedTo)} className="rounded-lg bg-emerald-600 text-white py-2 font-semibold hover:bg-emerald-700">Resolve</button></>}</div></div></aside>;
}
function Row({ label, value }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-slate-800 whitespace-pre-wrap break-words">{value || "—"}</dd></div>; }
