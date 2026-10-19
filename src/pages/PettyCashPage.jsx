import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, ChevronDown, Eye, FileText, Paperclip, Pencil, Plus, RefreshCw, RotateCcw, Trash2, WalletCards, XCircle } from "lucide-react";
import { getApiBaseUrl } from "../utils/api";

const blankItem = () => ({ description: "", quantity: 1, unitCost: "" });
const money = (value) => `GH₵ ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const badge = { PENDING_ACCOUNTS: "bg-amber-100 text-amber-800", APPROVED: "bg-blue-100 text-blue-800", VOUCHER_COMPLETED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-red-100 text-red-800" };
const PETTY_CASH_PERMISSIONS = {
  viewSummary: "/pettyCash/features/view-summary",
  reviewRequests: "/pettyCash/actions/review-requests",
  viewVouchers: "/pettyCash/features/view-vouchers",
  completeVouchers: "/pettyCash/actions/complete-vouchers",
  reimburseFloat: "/pettyCash/actions/reimburse-float"
};

export default function PettyCashPage() {
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [summary, setSummary] = useState({ threshold: 0, used: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [reimbursementOpen, setReimbursementOpen] = useState(false);
  const [permissions, setPermissions] = useState(new Set());
  const [voucherRequest, setVoucherRequest] = useState(null);
  const [voucherDetails, setVoucherDetails] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ category: "", purpose: "", costCenter: "", items: [blankItem()] });
  const canViewSummary = permissions.has(PETTY_CASH_PERMISSIONS.viewSummary);
  const canReviewRequests = permissions.has(PETTY_CASH_PERMISSIONS.reviewRequests);
  const canViewVouchers = permissions.has(PETTY_CASH_PERMISSIONS.viewVouchers);
  const canCompleteVouchers = permissions.has(PETTY_CASH_PERMISSIONS.completeVouchers);
  const canReimburseFloat = permissions.has(PETTY_CASH_PERMISSIONS.reimburseFloat);

  const api = useCallback(async (path, options = {}) => {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken") || localStorage.getItem("authToken")}`, ...(!isFormData && { "Content-Type": "application/json" }), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    api("/api/pages/my-pages")
      .then((pages) => {
        if (active) setPermissions(new Set(Array.isArray(pages) ? pages.map((page) => page.path) : []));
      })
      .catch(() => { if (active) setPermissions(new Set()); });
    return () => { active = false; };
  }, [api]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requestData = await api("/api/petty-cash");
      let summaryData = { threshold: 0, used: 0, remaining: 0 };
      let voucherData = [];
      let cycleData = [];
      if (canViewSummary || canReimburseFloat) summaryData = await api("/api/petty-cash/summary");
      if (canViewVouchers) voucherData = await api("/api/petty-cash/vouchers");
      if (canViewSummary) cycleData = await api("/api/petty-cash/cycles");
      setRequests(requestData); setSummary(summaryData); setVouchers(voucherData); setCycles(cycleData);
    } catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }, [api, canViewSummary, canViewVouchers, canReimburseFloat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.hash.split('?')[1] || '').get('financeRequestId');
    if (!id) return;
    const linked = requests.find(r => String(r.id) === id);
    if (linked) setVoucherDetails(linked);
  }, [requests]);
  const requestTotal = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0), [form.items]);
  const setItem = (index, key, value) => setForm((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));

  const submitRequest = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, items: form.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitCost: Number(item.unitCost) })) };
      await api(editingRequest ? `/api/petty-cash/${editingRequest.id}` : "/api/petty-cash", { method: editingRequest ? "PUT" : "POST", body: JSON.stringify(payload) });
      toast.success(editingRequest ? "Petty cash request updated" : "Petty cash request submitted to Accounts");
      setForm({ category: "", purpose: "", costCenter: "", items: [blankItem()] }); setEditingRequest(null); setRequestOpen(false); load();
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  const openNewRequest = () => {
    setEditingRequest(null);
    setForm({ category: "", purpose: "", costCenter: "", items: [blankItem()] });
    setRequestOpen(true);
  };

  const openEditRequest = (request) => {
    if (request.status !== "PENDING_ACCOUNTS") return;
    setEditingRequest(request);
    setForm({
      category: request.category || "",
      purpose: request.purpose || "",
      costCenter: request.costCenter || "",
      items: request.items?.length ? request.items.map((item) => ({
        description: item.description || "",
        quantity: item.quantity ?? 1,
        unitCost: item.estimatedUnitCost ?? item.unitCost ?? ""
      })) : [blankItem()]
    });
    setRequestOpen(true);
  };

  const decide = async (item, action) => {
    const notes = window.prompt(action === "approve" ? "Approval notes (optional)" : "Reason for rejection") || "";
    let approvedAmount;
    if (action === "approve") { const entered = window.prompt("Approved amount", item.amount); if (entered === null) return; approvedAmount = Number(entered); }
    try { await api(`/api/petty-cash/${item.id}/${action}`, { method: "PUT", body: JSON.stringify({ approvedAmount, notes }) }); toast.success(`Request ${action}d`); load(); }
    catch (error) { toast.error(error.message); }
  };

  return <div className="min-h-screen bg-slate-50">
    <header className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white"><div className="max-w-7xl mx-auto p-6 flex justify-between items-center"><h1 className="text-2xl font-bold flex items-center gap-3"><WalletCards />Petty Cash</h1><button onClick={load} className="p-2 rounded-lg bg-white/15"><RefreshCw size={20} /></button></div></header>
    <main className="max-w-7xl mx-auto p-5">{canReviewRequests && <a href="#/accountsFundingReview" className="mb-4 inline-block rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Review inventory funding in Accounts Funding Review →</a>}{canViewSummary && <div className="grid sm:grid-cols-3 gap-4 mb-4"><Summary label="Configured float" value={money(summary.threshold)} icon={WalletCards} /><Summary label="Approved/used" value={money(summary.used)} icon={FileText} /><Summary label="Remaining amount" value={money(summary.remaining)} icon={summary.remaining > 0 ? CheckCircle2 : XCircle} /></div>}{canReimburseFloat && Number(summary.remaining) <= 0 && <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4"><div><p className="font-bold text-amber-900">Petty cash float is exhausted</p><p className="text-sm text-amber-800">Reimburse the float to restore the allocated amount.</p></div><button onClick={() => setReimbursementOpen(true)} className="shrink-0 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white font-semibold hover:bg-amber-700"><RotateCcw size={17} />Reimburse float</button></div>}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"><div className="p-4 border-b flex flex-wrap gap-3 justify-between"><div className="flex flex-wrap bg-slate-100 rounded-xl p-1"><Tab active={tab === "requests"} onClick={() => setTab("requests")}>Petty Cash Requests</Tab>{canViewVouchers && <Tab active={tab === "vouchers"} onClick={() => setTab("vouchers")}>Petty Cash Voucher</Tab>}{canViewSummary && <Tab active={tab === "history"} onClick={() => setTab("history")}>Float History & Report</Tab>}</div><button onClick={openNewRequest} className="flex items-center bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold"><Plus size={17} className="mr-2" />New request</button></div>
        {tab === "history" && canViewSummary ? <CycleReport cycles={cycles} loading={loading} /> : tab === "vouchers" && canViewVouchers ? <VoucherTable items={vouchers} loading={loading} complete={canCompleteVouchers ? setVoucherRequest : null} view={setVoucherDetails} /> : <RequestTable items={requests} loading={loading} canReview={canReviewRequests} decide={decide} edit={openEditRequest} />}
      </section>
    </main>
    {requestOpen && <RequestModal editing={Boolean(editingRequest)} form={form} setForm={setForm} setItem={setItem} total={requestTotal} submit={submitRequest} close={() => { setRequestOpen(false); setEditingRequest(null); }} busy={busy} />}
    {reimbursementOpen && canReimburseFloat && <ReimbursementModal allocatedAmount={summary.threshold} api={api} close={() => setReimbursementOpen(false)} completed={() => { setReimbursementOpen(false); load(); }} />}
    {voucherRequest && <VoucherModal request={voucherRequest} api={api} close={() => setVoucherRequest(null)} completed={() => { setVoucherRequest(null); load(); }} />}
    {voucherDetails && <VoucherDetailsModal request={voucherDetails} close={() => setVoucherDetails(null)} />}
  </div>;
}

function RequestModal({ editing, form, setForm, setItem, total, submit, close, busy }) { return <Modal title={editing ? "Edit pending petty cash request" : "New petty cash request"} close={close}><form onSubmit={submit}><div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-medium">Category<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 bg-white"><option value="" disabled>Select expense category</option><option>Office Supplies</option><option>Cleaning Supplies</option><option>Transport</option><option>Fuel</option><option>Postage and Courier Costs</option><option>Repairs and Maintenance</option><option>Refreshments</option><option>Printing and Stationery</option><option>Utilities</option><option>Emergency Purchase</option><option>Other</option></select></label><Input label="Cost center / project" value={form.costCenter} required={false} onChange={(e) => setForm({ ...form, costCenter: e.target.value })} /></div><label className="block mt-4 text-sm font-medium">Why is the money required?<textarea required minLength="5" rows="3" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="mt-1 w-full border rounded-lg p-3" /></label><div className="mt-5 flex justify-between items-center"><h3 className="font-bold">Estimated items</h3><button type="button" onClick={() => setForm({ ...form, items: [...form.items, blankItem()] })} className="text-emerald-700 font-semibold text-sm flex items-center"><Plus size={16} className="mr-1" />Add item</button></div><div className="space-y-3 mt-3">{form.items.map((item, index) => <ItemRow key={index} item={item} setItem={(key, value) => setItem(index, key, value)} remove={form.items.length > 1 ? () => setForm({ ...form, items: form.items.filter((_, i) => i !== index) }) : null} />)}</div><div className="mt-5 bg-emerald-50 rounded-lg p-4 flex justify-between font-bold"><span>Estimated request total</span><span>{money(total)}</span></div><Actions close={close} busy={busy} label={editing ? "Save changes" : "Submit to Accounts"} /></form></Modal> }

function ReimbursementModal({ allocatedAmount, api, close, completed }) { const [data, setData] = useState({ amount: allocatedAmount || "", reference: "", notes: "" }); const [busy, setBusy] = useState(false); const submit = async (event) => { event.preventDefault(); setBusy(true); try { await api("/api/petty-cash/reimburse", { method: "PUT", body: JSON.stringify({ ...data, amount: Number(data.amount) }) }); toast.success("Petty cash float reimbursed"); completed(); } catch (error) { toast.error(error.message); } finally { setBusy(false); } }; return <Modal title="Reimburse petty cash float" close={close}><form onSubmit={submit}><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-5 text-sm text-amber-900">This starts a new petty-cash cycle by restoring the float. The configured allocation is <b>{money(allocatedAmount)}</b>.</div><div className="grid sm:grid-cols-2 gap-4"><Input label="Reimbursement amount" type="number" min="0.01" step="0.01" value={data.amount} onChange={(e) => setData({ ...data, amount: e.target.value })} /><Input label="Payment / transfer reference" value={data.reference} onChange={(e) => setData({ ...data, reference: e.target.value })} /></div><label className="block mt-4 text-sm font-medium">Notes<textarea rows="3" value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} className="mt-1 w-full border rounded-lg p-3" placeholder="Optional reimbursement details" /></label><Actions close={close} busy={busy} label="Confirm reimbursement" /></form></Modal>; }

function VoucherModal({ request, api, close, completed }) {
  const [data, setData] = useState({ paidTo: request.requesterName, paymentMethod: "Cash", paymentReference: "", notes: "", items: request.items.map((item) => ({ description: item.description, quantity: item.quantity, unitCost: item.actualUnitCost ?? item.estimatedUnitCost })) });
  const [receiptFile, setReceiptFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const total = data.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0);
  const selectReceipt = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      event.target.value = "";
      setReceiptFile(null);
      toast.error("Receipt file must be 10 MB or smaller");
      return;
    }
    setReceiptFile(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!receiptFile) { toast.error("Please upload the receipt or invoice evidence"); return; }
    setBusy(true);
    try {
      const uploadBody = new FormData();
      uploadBody.append("file", receiptFile);
      const uploaded = await api(`/api/petty-cash/${request.id}/receipt`, { method: "POST", body: uploadBody });
      const receiptReference = uploaded.url || uploaded.fileUrl || uploaded.reference || uploaded.id || uploaded.fileName;
      if (!receiptReference) throw new Error("The receipt uploaded, but the server did not return its file reference");
      await api(`/api/petty-cash/${request.id}/voucher`, { method: "PUT", body: JSON.stringify({ ...data, receiptReference: String(receiptReference), receiptFileName: uploaded.fileName || receiptFile.name, items: data.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitCost: Number(item.unitCost) })) }) });
      toast.success("Petty cash voucher completed with receipt evidence");
      completed();
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  return <Modal title={`Complete voucher ${request.voucherNumber}`} close={close}><form onSubmit={submit}><div className="grid sm:grid-cols-2 gap-4"><Input label="Paid to / recipient" value={data.paidTo} onChange={(e) => setData({ ...data, paidTo: e.target.value })} /><label className="block text-sm font-medium">Payment method<select value={data.paymentMethod} onChange={(e) => setData({ ...data, paymentMethod: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2"><option>Cash</option><option>Mobile Money</option><option>Bank Transfer</option></select></label><Input label="Payment reference" required={false} value={data.paymentReference} onChange={(e) => setData({ ...data, paymentReference: e.target.value })} /><label className="block text-sm font-medium">Receipt / invoice file <span className="text-red-600">*</span><span className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-400 px-3 py-2 text-slate-700 hover:bg-slate-50"><Paperclip size={17} /><span className="truncate">{receiptFile?.name || "Choose receipt, picture, PDF or document"}</span><input required type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={selectReceipt} className="sr-only" /></span><span className="mt-1 block text-xs font-normal text-slate-500">Maximum file size: 10 MB</span></label></div><h3 className="font-bold mt-5">Actual expenditure</h3><div className="space-y-3 mt-3">{data.items.map((item, index) => <ItemRow key={index} item={item} actual setItem={(key, value) => setData({ ...data, items: data.items.map((line, i) => i === index ? { ...line, [key]: value } : line) })} />)}</div><label className="block mt-4 text-sm font-medium">Voucher notes<textarea rows="3" value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} className="mt-1 w-full border rounded-lg p-3" /></label><div className={`mt-5 rounded-lg p-4 flex justify-between font-bold ${total > Number(request.approvedAmount) ? "bg-red-50 text-red-700" : "bg-emerald-50"}`}><span>Actual total / approved {request.approvedAmount == null ? "Pending" : money(request.approvedAmount)}</span><span>{money(total)}</span></div><Actions close={close} busy={busy} label="Finalize voucher" /></form></Modal>;
}

function ItemRow({ item, setItem, remove, actual }) { return <div className="grid grid-cols-[1fr_80px_120px_36px] gap-2 items-end bg-slate-50 p-3 rounded-lg"><Input label="Description" value={item.description} readOnly={actual} onChange={(e) => setItem("description", e.target.value)} /><Input label="Qty" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItem("quantity", e.target.value)} /><Input label={actual ? "Actual unit cost" : "Est. unit cost"} type="number" min="0" step="0.01" value={item.unitCost} onChange={(e) => setItem("unitCost", e.target.value)} />{remove ? <button type="button" onClick={remove} className="h-10 text-red-600"><Trash2 size={18} /></button> : <span />}</div>; }
function RequestTable({ items, loading, canReview, decide, edit }) { return <DataState loading={loading} empty={!items.length}>{items.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-4">Reference</th><th className="p-4">Requester</th><th className="p-4">Estimated items</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="p-4 font-semibold text-emerald-700">{item.reference}{item.inventoryRequestId && <span className="mt-1 block text-xs font-normal text-slate-500">Inventory: {item.inventoryRequestNumber}<br />Created by {item.createdByName}</span>}</td><td className="p-4">{item.requesterName}</td><td className="p-4"><b>{item.category}</b><ul className="text-xs text-slate-500 mt-1">{item.items?.map((line, index) => <li key={line.id || index}>{line.description} × {line.quantity}</li>)}</ul></td><td className="p-4 font-semibold">{money(item.amount)}</td><td className="p-4"><Status value={item.status} /></td><td className="p-4">{item.status === "PENDING_ACCOUNTS" && <div className="flex flex-wrap gap-3"><button onClick={() => edit(item)} className="text-blue-700 font-semibold flex items-center gap-1"><Pencil size={15} />Edit</button>{canReview && <><button onClick={() => decide(item, "approve")} className="text-emerald-700 font-semibold">Approve</button><button onClick={() => decide(item, "reject")} className="text-red-700 font-semibold">Reject</button></>}</div>}</td></tr>)}</tbody></table></div>}</DataState>; }
function VoucherTable({ items, loading, complete, view }) { return <DataState loading={loading} empty={!items.length}>{items.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-4">Voucher</th><th className="p-4">Payee</th><th className="p-4">Approved</th><th className="p-4">Actual spent</th><th className="p-4">Evidence</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="p-4"><b className="text-emerald-700">{item.voucherNumber}</b><br /><span className="text-xs">{item.reference}</span></td><td className="p-4">{item.paidTo || item.requesterName}</td><td className="p-4">{money(item.approvedAmount)}</td><td className="p-4">{item.actualAmount == null ? "—" : money(item.actualAmount)}</td><td className="p-4">{item.receiptFileName || (item.receiptReference ? "Uploaded" : "Pending")}</td><td className="p-4"><Status value={item.status} /></td><td className="p-4"><div className="flex flex-wrap gap-2"><button onClick={() => view(item)} className="border border-slate-300 px-3 py-2 rounded-lg font-semibold flex items-center gap-1"><Eye size={16} />View details</button>{complete && item.status === "APPROVED" && <button onClick={() => complete(item)} className="bg-emerald-600 text-white px-3 py-2 rounded-lg font-semibold">Complete voucher</button>}</div></td></tr>)}</tbody></table></div>}</DataState>; }

function CycleReport({ cycles, loading }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(() => new Set());
  const pageSize = 10;
  const totals = cycles.reduce((result, cycle) => ({ allocated: result.allocated + Number(cycle.allocatedAmount || 0), used: result.used + Number(cycle.usedAmount || 0), requests: result.requests + Number(cycle.requests?.length || 0) }), { allocated: 0, used: 0, requests: 0 });
  const term = search.trim().toLowerCase();
  const filtered = cycles.filter((cycle) => (status === "ALL" || cycle.status === status) && (!term || [cycle.cycleNumber, cycle.reimbursementReference, cycle.openedBy, cycle.closedBy, ...(cycle.requests || []).flatMap((request) => [request.reference, request.requesterName, request.category, request.purpose])].some((value) => String(value || "").toLowerCase().includes(term))));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const changeFilter = (setter, value) => { setter(value); setPage(1); };
  const toggle = (id) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <DataState loading={loading} empty={!cycles.length}><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ReportTotal label="Float cycles" value={cycles.length.toLocaleString()} /><ReportTotal label="Total allocated" value={money(totals.allocated)} /><ReportTotal label="Total approved/used" value={money(totals.used)} /><ReportTotal label="Requests tracked" value={totals.requests.toLocaleString()} /></div><div className="flex flex-wrap items-center gap-3 rounded-xl border bg-slate-50 p-3"><input value={search} onChange={(event) => changeFilter(setSearch, event.target.value)} placeholder="Search cycle, reference, requester or purpose" className="min-w-64 flex-1 rounded-lg border bg-white px-3 py-2 text-sm" /><select value={status} onChange={(event) => changeFilter(setStatus, event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="ALL">All cycles</option><option value="ACTIVE">Active</option><option value="CLOSED">Closed / reimbursed</option></select><span className="text-sm text-slate-500">{filtered.length} cycle{filtered.length === 1 ? "" : "s"}</span></div>{visible.map((cycle) => { const isOpen = expanded.has(cycle.id); return <article key={cycle.id} className="overflow-hidden rounded-xl border border-slate-200"><button type="button" onClick={() => toggle(cycle.id)} className="flex w-full flex-wrap items-start justify-between gap-4 bg-slate-50 p-4 text-left hover:bg-slate-100"><div className="flex items-start gap-3"><ChevronDown size={20} className={`mt-1 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} /><div><div className="flex items-center gap-2"><h3 className="font-bold text-emerald-800">{cycle.cycleNumber}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${cycle.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{cycle.status}</span><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">{cycle.requests?.length || 0} requests</span></div><p className="mt-1 text-xs text-slate-500">Opened {dateTime(cycle.openedAt)} by {cycle.openedBy || "System"}{cycle.closedAt ? ` • Reimbursed/closed ${dateTime(cycle.closedAt)} by ${cycle.closedBy || "—"}` : ""}</p></div></div><div className="grid grid-cols-3 gap-5 text-right text-sm"><CycleAmount label="Allocated" value={cycle.allocatedAmount} /><CycleAmount label="Used" value={cycle.usedAmount} /><CycleAmount label="Balance" value={cycle.remainingAmount} /></div></button>{isOpen && <>{cycle.closedAt && <div className="grid gap-2 border-t bg-amber-50 px-4 py-3 text-sm sm:grid-cols-3"><span><b>Reimbursement:</b> {money(cycle.reimbursementAmount)}</span><span><b>Reference:</b> {cycle.reimbursementReference || "—"}</span><span><b>Notes:</b> {cycle.reimbursementNotes || "—"}</span></div>}<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-white text-left text-slate-500"><th className="p-3">Request</th><th className="p-3">Date</th><th className="p-3">Requester</th><th className="p-3">Purpose</th><th className="p-3 text-right">Requested</th><th className="p-3 text-right">Approved</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{cycle.requests?.length ? cycle.requests.map((request) => <tr key={request.id}><td className="p-3 font-semibold text-emerald-700">{request.reference}{request.inventoryRequestId && <span className="mt-1 block text-xs font-normal text-slate-500">Inventory: {request.inventoryRequestNumber}<br />Created by {request.createdByName}</span>}</td><td className="p-3 whitespace-nowrap">{dateTime(request.createdAt)}</td><td className="p-3">{request.requesterName}</td><td className="p-3"><b>{request.category}</b><br /><span className="text-xs text-slate-500">{request.purpose}</span></td><td className="p-3 text-right">{money(request.amount)}</td><td className="p-3 text-right">{request.approvedAmount == null ? "—" : money(request.approvedAmount)}</td><td className="p-3"><Status value={request.status} /></td></tr>) : <tr><td colSpan="7" className="p-6 text-center text-slate-500">No requests were recorded in this float cycle.</td></tr>}</tbody></table></div></>}</article>; })}{!visible.length && <p className="rounded-xl border border-dashed p-10 text-center text-slate-500">No float cycles match the selected filters.</p>}<div className="flex items-center justify-between"><span className="text-sm text-slate-500">Page {currentPage} of {pageCount}</span><div className="flex gap-2"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div></div></DataState>;
}
function ReportTotal({ label, value }) { return <div className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></div>; }
function CycleAmount({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{money(value)}</p></div>; }
function dateTime(value) { return value ? new Date(value).toLocaleString() : "—"; }

function VoucherDetailsModal({ request, close }) { const lines = request.items || []; return <Modal title={`${request.voucherNumber ? "Voucher details" : "Petty cash request details"} — ${request.voucherNumber || request.reference}`} close={close}><div className="grid sm:grid-cols-2 gap-4"><Detail label="Request reference" value={request.reference} /><Detail label="Status" value={<Status value={request.status} />} /><Detail label="Requester" value={request.requesterName} />{request.inventoryRequestId && <Detail label="Inventory request" value={<span>{request.inventoryRequestNumber} · Created by {request.createdByName}</span>} />}<Detail label="Paid to / recipient" value={request.paidTo || "Not recorded"} /><Detail label="Category" value={request.category} /><Detail label="Cost center / project" value={request.costCenter || "—"} /><Detail label="Payment method" value={request.paymentMethod || "Not recorded"} /><Detail label="Payment reference" value={request.paymentReference || "—"} /><Detail label="Receipt / invoice evidence" value={<ReceiptFile request={request} />} /><Detail label="Finalized by" value={request.finalizedBy || "Not finalized"} /></div><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purpose</p><p className="mt-1 text-slate-800">{request.purpose}</p></div><h3 className="font-bold mt-6 mb-2">Item breakdown</h3>{lines.length ? <div className="overflow-x-auto border rounded-xl"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Description</th><th className="p-3 text-right">Estimated</th><th className="p-3 text-right">Actual</th></tr></thead><tbody className="divide-y">{lines.map((line, index) => <tr key={line.id || index}><td className="p-3">{line.description}</td><td className="p-3 text-right">{line.quantity} × {money(line.estimatedUnitCost)}<br /><b>{money(line.estimatedTotal)}</b></td><td className="p-3 text-right">{line.actualQuantity == null ? "Pending" : <>{line.actualQuantity} × {money(line.actualUnitCost)}<br /><b>{money(line.actualTotal)}</b></>}</td></tr>)}</tbody></table></div> : <p className="bg-amber-50 text-amber-800 p-3 rounded-lg">This older voucher has no saved item breakdown.</p>}<div className="grid sm:grid-cols-2 gap-3 mt-4"><div className="bg-blue-50 p-4 rounded-lg"><span className="text-sm text-slate-600">Approved total</span><p className="font-bold text-lg">{request.approvedAmount == null ? "Pending" : money(request.approvedAmount)}</p></div><div className="bg-emerald-50 p-4 rounded-lg"><span className="text-sm text-slate-600">Actual amount spent</span><p className="font-bold text-lg">{request.actualAmount == null ? "Pending" : money(request.actualAmount)}</p></div></div>{request.voucherNotes && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Voucher notes</p><p className="mt-1">{request.voucherNotes}</p></div>}<div className="flex justify-end mt-6"><button onClick={close} className="px-4 py-2 border rounded-lg">Close</button></div></Modal>; }
function ReceiptFile({ request }) { const open = async () => { try { if (/^https?:\/\//i.test(request.receiptReference || "")) { window.open(request.receiptReference, "_blank", "noopener,noreferrer"); return; } const response = await fetch(`${getApiBaseUrl()}/api/petty-cash/${request.id}/receipt`, { headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken") || localStorage.getItem("authToken")}` } }); if (!response.ok) throw new Error(`Could not open receipt (${response.status})`); const url = URL.createObjectURL(await response.blob()); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch (error) { toast.error(error.message); } }; if (!request.receiptReference && !request.receiptFileName) return "Pending"; return <button type="button" onClick={open} className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><Paperclip size={15} />{request.receiptFileName || "Open uploaded file"}</button>; }
function Detail({ label, value }) { return <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 font-medium break-words">{value || "—"}</div></div>; }

function Modal({ title, close, children }) { return <div className="fixed inset-0 bg-slate-950/55 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto"><div className="flex justify-between"><h2 className="text-xl font-bold">{title}</h2><button onClick={close}>✕</button></div><div className="mt-5">{children}</div></div></div>; }
function Input({ label, required = true, ...props }) { return <label className="block text-sm font-medium">{label}<input required={required} {...props} className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100" /></label>; }
function Actions({ close, busy, label }) { return <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={close} className="px-4 py-2 border rounded-lg">Cancel</button><button disabled={busy} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50">{busy ? "Saving..." : label}</button></div>; }
function Summary({ label, value, icon: Icon }) { return <div className="bg-white border rounded-xl p-5"><Icon className="text-emerald-600" /><p className="text-2xl font-bold mt-3">{value}</p><p className="text-sm text-slate-500">{label}</p></div>; }
function Tab({ active, onClick, children }) { return <button onClick={onClick} className={`px-4 py-2 rounded-lg font-semibold text-sm ${active ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}>{children}</button>; }
function Status({ value }) { return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge[value] || "bg-slate-100"}`}>{value?.replaceAll("_", " ")}</span>; }
function DataState({ loading, empty, children }) { if (loading) return <p className="p-10 text-center">Loading...</p>; if (empty) return <p className="p-10 text-center text-slate-500">No records found.</p>; return children; }
