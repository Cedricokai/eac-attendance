import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Menu, RefreshCw, Search } from 'lucide-react';
import MainSidebar from './Eac-attendance/mainSidebar';
import InventoryFulfilment from '../components/InventoryFulfilment';
import { getApiBaseUrl } from '../utils/api';

const tabs = [
  { id: 'awaiting', label: 'Awaiting Review', matches: r => r.status === 'AWAITING_ACCOUNTS' },
  { id: 'returned', label: 'Returned to Procurement', matches: r => r.status === 'RETURNED' },
  { id: 'petty', label: 'Petty Cash', matches: r => r.fundingRoute === 'PETTY_CASH' },
  { id: 'direct', label: 'Direct Purchase', matches: r => r.fundingRoute === 'DIRECT_PURCHASE' },
  { id: 'all', label: 'All Requests', matches: () => true },
];
const money = value => `GH₵ ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = value => value ? new Date(value).toLocaleString() : '—';
const label = value => value === 'AWAITING_ACCOUNTS' ? 'Awaiting Review' : value === 'FUNDED' ? 'Routed to Finance' : value?.replaceAll('_', ' ') || '—';

export default function AccountsFundingReview() {
  const [params, setParams] = useSearchParams();
  const selectedRequest = params.get('requestId');
  const [tab, setTab] = useState(() => params.get('tab') || (selectedRequest ? 'all' : 'awaiting'));
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const base = getApiBaseUrl();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrl()}/api/inventory-fulfilment/accounts-funding-review`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Accounts access is required to review funding requests.');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const requests = useMemo(() => [...new Map(rows.map(r => [r.requestId, { id: r.requestId, requestNumber: r.requestNumber, requesterName: r.requesterName, status: r.requestStatus }])).values()], [rows]);
  const visible = useMemo(() => {
    const filter = tabs.find(t => t.id === tab) || tabs[0];
    const search = query.trim().toLowerCase();
    return rows.filter(filter.matches).filter(r => !search || [r.requestNumber, r.proposalReference, r.requesterName, r.project, r.supplier, r.financeReference].some(v => String(v || '').toLowerCase().includes(search)));
  }, [rows, tab, query]);
  const pageCount = Math.max(1, Math.ceil(visible.length / 10));
  const currentPage = Math.min(page, pageCount);
  const openRequest = r => {
    setParams({ requestId: String(r.requestId), proposalId: String(r.id), tab });
    requestAnimationFrame(() => document.getElementById('funding-review-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className={`fixed inset-y-0 left-0 z-30 bg-white shadow-md transition-all ${sidebarOpen ? 'w-64' : 'hidden w-16 md:block'}`}><MainSidebar isCollapsed={!sidebarOpen} /></div>
    {sidebarOpen && <button aria-label="Close sidebar" className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
    <main className={`min-w-0 transition-all ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
      <header className="border-b bg-white p-4 sm:p-6"><div className="mx-auto flex max-w-7xl items-start gap-3"><button aria-label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg border p-2"><Menu size={20} /></button><div className="min-w-0 flex-1"><h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><ClipboardList className="shrink-0 text-blue-700" />Accounts Funding Review</h1><p className="mt-1 text-sm text-slate-500">Review Procurement’s quotations, choose a funding route and track the resulting finance request.</p></div><button aria-label="Refresh funding review" disabled={loading} onClick={load} className="rounded-lg border p-2 disabled:opacity-40"><RefreshCw size={19} /></button></div></header>
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-4 text-sm"><Link to="/pettyCash" className="font-semibold text-blue-700 hover:underline">Open Petty Cash</Link><Link to="/DirectPurchase" className="font-semibold text-blue-700 hover:underline">Open Direct Purchases</Link></div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div role="tablist" aria-label="Funding review categories" className="flex flex-wrap gap-2 border-b p-3">{tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setPage(1); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === t.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.label} <span className="ml-1 opacity-80">({rows.filter(t.matches).length})</span></button>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm text-slate-500">{visible.length} proposal{visible.length === 1 ? '' : 's'} · One row per quotation; returned versions remain in the history.</p><label className="flex items-center gap-2 rounded-lg border px-3 py-2"><Search size={17} className="text-slate-400" /><input aria-label="Search funding requests" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Request, employee, supplier or reference" className="w-64 max-w-full bg-transparent text-sm outline-none" /></label></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>{['Request / proposal', 'Employee / project', 'Supplier', 'Quoted amount', 'Funding route', 'Finance reference / status', 'Decision officer / date', 'Review status', 'Action'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody className="divide-y">{!loading && visible.slice((currentPage - 1) * 10, currentPage * 10).map(r => <tr key={r.id} className="hover:bg-slate-50"><td className="p-3"><b>{r.requestNumber}</b><p className="mt-1 text-xs text-slate-500">{r.proposalReference}</p></td><td className="p-3">{r.requesterName}<p className="mt-1 text-xs text-slate-500">{r.project || 'No project'}</p></td><td className="p-3">{r.supplier}</td><td className="whitespace-nowrap p-3 font-semibold">{money(r.totalAmount)}</td><td className="p-3">{r.fundingRoute ? label(r.fundingRoute) : 'Not selected'}</td><td className="p-3">{r.financeReference ? <Link className="font-semibold text-blue-700 underline" to={r.fundingRoute === 'PETTY_CASH' ? `/pettyCash?financeRequestId=${r.financeRequestId}` : `/DirectPurchase/${r.financeRequestId}`}>{r.financeReference}</Link> : '—'}<p className="mt-1 text-xs text-slate-500">{label(r.financeStatus)}</p></td><td className="p-3">{r.decisionBy || '—'}<p className="mt-1 text-xs text-slate-500">{date(r.decisionAt)}</p></td><td className="p-3"><span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${r.status === 'AWAITING_ACCOUNTS' ? 'bg-amber-100 text-amber-800' : r.status === 'RETURNED' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{label(r.status)}</span></td><td className="p-3"><button onClick={() => openRequest(r)} className="rounded-lg border px-3 py-2 font-semibold text-blue-700">{r.status === 'AWAITING_ACCOUNTS' ? 'Review' : 'View'}</button></td></tr>)}{(loading || !visible.length) && <tr><td colSpan={9} className="p-10 text-center text-slate-500">{loading ? 'Loading funding requests…' : 'No proposals match this view.'}</td></tr>}</tbody></table></div>
          <div className="flex items-center justify-between border-t p-3 text-sm"><span>Page {currentPage} of {pageCount}</span><div className="flex gap-2"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>
        </section>
        {selectedRequest && !error && <div id="funding-review-details" className="scroll-mt-4"><div className="mt-6 flex items-center justify-between"><h2 className="font-bold">Request review and history</h2><button onClick={() => setParams({ tab })} className="text-sm font-semibold text-slate-500">Close review</button></div><InventoryFulfilment key={selectedRequest} apiBase={base} employeeRequests={requests} accountsOnly onChanged={load} /></div>}
      </div>
    </main>
  </div>;
}
