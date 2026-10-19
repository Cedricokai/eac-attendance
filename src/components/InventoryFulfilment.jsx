import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { STATUS_LABELS } from '../config/dataModels';

const token = () => localStorage.getItem('jwtToken') || localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('authToken');
async function api(base, path, body, method = 'POST') {
  const response = await fetch(`${base}${path}`, { method: body === undefined ? 'GET' : method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  return data;
}
const money = value => `GH₵ ${Number(value || 0).toFixed(2)}`;
const button = 'rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40';
const field = 'w-full min-w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';

export default function InventoryFulfilment({ apiBase, employeeRequests, accountsOnly = false, onChanged }) {
  const [requests, setRequests] = useState(employeeRequests || []);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('requestId') || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({});
  const [supplier, setSupplier] = useState('');
  const [quotation, setQuotation] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState({});
  const [limit, setLimit] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const followRequest = () => {
      const id = new URLSearchParams(window.location.hash.split('?')[1] || '').get('requestId');
      if (id) setSelected(id);
    };
    window.addEventListener('hashchange', followRequest);
    return () => window.removeEventListener('hashchange', followRequest);
  }, []);

  useEffect(() => {
    if (employeeRequests) { setRequests(employeeRequests); return; }
    let active = true;
    api(apiBase, accountsOnly ? '/api/inventory-fulfilment/accounts-queue' : '/api/inventory-fulfilment/requests').then(rows => { if (active) setRequests(rows); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [apiBase, employeeRequests, accountsOnly]);
  const load = useCallback(async () => {
    if (!selected) { setData(null); return; }
    setBusy(true); setError('');
    try { const value = await api(apiBase, `/api/inventory-requests/${selected}/fulfilment${accountsOnly ? "?view=accounts" : ""}`); setData(value); setLimit(value.pettyCashPurchaseLimit || ''); setDraft({}); }
    catch (e) { setData(null); setError(e.message); } finally { setBusy(false); }
  }, [apiBase, selected, accountsOnly]);
  useEffect(() => { load(); }, [load]);
  const mutate = async (suffix, body) => {
    setBusy(true); setError(''); setNotice('');
    try { const saved = await api(apiBase, `/api/inventory-requests/${selected}/fulfilment${suffix}`, body); const updated = accountsOnly ? await api(apiBase, `/api/inventory-requests/${selected}/fulfilment?view=accounts`) : saved; setData(updated); setRequests(old => old.map(r => String(r.id) === String(selected) ? { ...r, status: updated.status } : r)); setDraft({}); setReceipt({}); setNotice('Saved. Quantities and linked history have been updated.'); onChanged?.(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const change = (id, name, value) => setDraft(old => ({ ...old, [id]: { ...old[id], [name]: value } }));
  const total = (data?.items || []).reduce((sum, item) => sum + Number(draft[item.id]?.quantity || 0) * Number(draft[item.id]?.unitCost ?? item.estimatedUnitCost ?? 0), 0);
  const approved = ['APPROVED_BY_STORE', 'APPROVED_BY_PROCUREMENT', 'APPROVED_BY_PLANNER', 'PROCURED', 'STORE_REVIEW', 'RECEIVED_IN_STORE', 'PARTIALLY_ISSUED'].includes(data?.status);
  const propose = e => {
    e.preventDefault();
    const items = data.items.filter(i => Number(draft[i.id]?.quantity) > 0).map(i => ({ itemId: i.id, quantity: Number(draft[i.id].quantity), unitCost: Number(draft[i.id]?.unitCost ?? i.estimatedUnitCost ?? 0) }));
    if (!items.length) { setError('Enter the shortage quantities to purchase.'); return; }
    mutate('/proposals', { supplier, quotationReference: quotation, notes, items });
  };
  const canPropose = data?.canPropose && !accountsOnly;
  const canStore = data?.canStore && !accountsOnly;
  const canSource = approved || data?.status === 'PROCUREMENT_PENDING';
  return <section id="inventory-fulfilment" className="my-6 min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{accountsOnly ? "Accounts review and request history" : "Inventory request fulfilment"}</h2><p className="mt-1 text-sm text-slate-500">Employee request → Procurement pricing → Accounts funding → Store receipt and handover.</p></div>{selected && <button className="rounded-lg border px-3 py-2 text-sm" disabled={busy} onClick={load}>Refresh</button>}</div>
    <label className="mt-4 block text-sm font-semibold">Employee request<select className={`${field} mt-1`} value={selected} onChange={e => { setSelected(e.target.value); setData(null); setNotice(''); }}><option value="">Select a request</option>{requests.map(r => <option key={r.id} value={r.id}>{r.requestNumber || `Request ${r.id}`} — {r.requesterName || r.requestedBy} — {(STATUS_LABELS[r.status] || r.status)?.replaceAll('_', ' ')}</option>)}</select></label>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}{busy && <p className="mt-3 text-sm text-slate-500">Updating…</p>}
    {data && <><div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p><b>Employee:</b> {data.requester}</p><p><b>Project:</b> {data.project || '—'}</p><p><b>Cost center:</b> {data.costCenter || '—'}</p></div>{!approved && data.status !== 'ISSUED' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This request is pending review. Procurement can source unavailable items; Store can issue stock after approval.</p>}
      <form onSubmit={propose}><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr>{['Item', 'Requested / approved', 'Issued', 'Outstanding', 'Funded awaiting issue', 'Awaiting Accounts', 'Available stock', 'Unfunded shortage', ...(canPropose ? ['Purchase qty', 'Unit cost'] : []), ...(canStore ? ['Issue qty'] : [])].map(t => <th key={t} className="p-3 whitespace-nowrap">{t}</th>)}</tr></thead><tbody className="divide-y">{data.items.map(i => <tr key={i.id}><td className="p-3 font-semibold">{i.name}{!i.productId && <span className="block text-xs font-normal text-slate-500">Manual item · direct handover</span>}</td><td className="p-3">{i.requested} / {i.approved ?? "Pending"}</td><td className="p-3">{i.issued}</td><td className="p-3">{i.outstanding}</td><td className="p-3">{i.fundedOutstanding}</td><td className="p-3">{i.awaitingAccounts || 0}</td><td className="p-3">{i.availableStock}</td><td className="p-3 font-semibold">{i.shortfall}</td>{canPropose && <><td className="p-2"><input aria-label={`Purchase quantity for ${i.name}`} className={field} type="number" min="0" max={i.shortfall} step="1" disabled={busy || !canSource} value={draft[i.id]?.quantity || ''} onChange={e => change(i.id, 'quantity', e.target.value)} /></td><td className="p-2"><input aria-label={`Unit cost for ${i.name}`} className={field} type="number" min="0" step="0.01" disabled={busy || !canSource} value={draft[i.id]?.unitCost ?? i.estimatedUnitCost ?? ''} onChange={e => change(i.id, 'unitCost', e.target.value)} /></td></>}{canStore && <td className="p-2"><div className="flex gap-2"><input aria-label={`Issue quantity for ${i.name}`} className={field} type="number" min="1" max={i.readyToIssue} step="1" value={draft[i.id]?.issue || ''} onChange={e => change(i.id, 'issue', e.target.value)} /><button type="button" className={button} disabled={busy || !approved || !i.readyToIssue || !Number(draft[i.id]?.issue)} onClick={() => mutate('/issue', { itemId: i.id, quantity: Number(draft[i.id]?.issue) })}>Issue</button></div><span className="text-xs text-slate-500">{i.readyToIssue} ready</span></td>}</tr>)}</tbody></table></div>
      {canPropose && <div className="mt-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold">Supplier<input required maxLength={255} className={`${field} mt-1`} value={supplier} onChange={e => setSupplier(e.target.value)} /></label>
        <label className="text-sm font-semibold">Quotation reference / link<input required maxLength={500} className={`${field} mt-1`} value={quotation} onChange={e => setQuotation(e.target.value)} /></label>
        <label className="text-sm font-semibold">Procurement notes<input maxLength={800} className={`${field} mt-1`} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        <div><p className="mb-2 text-sm">Proposal total: <b>{money(total)}</b></p><button className={button} disabled={busy || !canSource || total <= 0}>Submit prices to Accounts</button></div>
      </div>}
      </form>
      {canPropose && <p className="mt-3 text-sm text-slate-500">Accounts will review the quotation and select petty cash or direct purchase. Returned proposals remain in the history; submit a corrected proposal to continue.</p>}
      <h3 className="mt-6 font-bold">Procurement proposals</h3>
      {!data.proposals?.length && <p className="mt-2 text-sm text-slate-500">No priced proposals submitted yet.</p>}
      <div className="mt-3 space-y-3">{data.proposals?.map(p => <ProposalCard key={p.id} proposal={p} canDecide={accountsOnly && data.canFund} busy={busy} apiBase={apiBase} purchaseLimit={data.pettyCashPurchaseLimit} onDecision={body => mutate(`/proposals/${p.id}/decision`, body)} />)}</div>
      {data.canConfigure && <form className="mt-3 flex max-w-md items-end gap-2" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await api(apiBase, '/api/petty-cash/settings/purchase-limit', { purchaseLimit: Number(limit) }, 'PUT'); await load(); setNotice('Petty-cash purchase limit saved.'); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><label className="text-sm">Purchase limit (GH₵)<input required min="0.01" step="0.01" type="number" className={`${field} mt-1`} value={limit} onChange={e => setLimit(e.target.value)} /></label><button className={button} disabled={busy}>Save limit</button></form>}
      <h3 className="mt-6 font-bold">{data.accountsView ? "Linked purchases and receipts" : "Delivery and handover progress"}</h3><p className="mt-1 text-sm text-slate-500">Finance approval does not add stock. Store records delivery after the voucher is completed or the direct purchase is paid.</p>
      {!data.history.length && <p className="mt-3 text-sm text-slate-500">No linked purchases yet.</p>}
      <div className="mt-3 space-y-3">{data.history.map(h => { const l = h.allocation; const remaining = h.purchasedQuantity - l.receivedQuantity; const ready = h.readyToReceive; return <article key={l.id} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><div>{data.accountsView ? <a className="font-semibold text-blue-700 underline" href={l.route === 'PETTY_CASH' ? '#/pettyCash' : `#/DirectPurchase/${l.financeRequestId}`}>{l.financeReference}</a> : <b>Delivery record</b>}<span className="ml-2">{h.status.replaceAll('_', ' ')}</span><p className="mt-1 text-slate-500">{data.items.find(i => i.id === l.requestItemId)?.name} · Quantity {l.quantity} · Purchased {h.purchasedQuantity} · Received {l.receivedQuantity} · Handed over {l.issuedQuantity}</p>{data.accountsView && <p className="mt-1 text-xs text-slate-500">Created by {l.createdBy} · {new Date(l.createdAt).toLocaleString()}</p>}</div></div>{h.receipts.map(r => <p key={r.id} className="mt-2 text-xs text-slate-600">Received {r.quantity} by {r.receivedBy} · Evidence: {r.evidenceReference}</p>)}{canStore && approved && ready && remaining > 0 && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs">Receive quantity<input className={`${field} mt-1`} type="number" min="1" step="1" max={remaining} value={receipt[l.id]?.quantity || ''} onChange={e => setReceipt(old => ({ ...old, [l.id]: { ...old[l.id], quantity: e.target.value } }))} /></label><label className="grow text-xs">Delivery / receipt reference<input className={`${field} mt-1`} maxLength={500} value={receipt[l.id]?.evidence || ''} onChange={e => setReceipt(old => ({ ...old, [l.id]: { ...old[l.id], evidence: e.target.value } }))} /></label><button className={button} disabled={busy || !Number(receipt[l.id]?.quantity) || !receipt[l.id]?.evidence?.trim()} onClick={() => mutate(`/receive/${l.id}`, { quantity: Number(receipt[l.id]?.quantity), evidenceReference: receipt[l.id].evidence })}>Record receipt</button></div>}</article>; })}</div>
    </>}
  </section>;
}
InventoryFulfilment.propTypes = { apiBase: PropTypes.string.isRequired, employeeRequests: PropTypes.arrayOf(PropTypes.object), accountsOnly: PropTypes.bool, onChanged: PropTypes.func };

function ProposalCard({ proposal: p, canDecide, busy, apiBase, purchaseLimit, onDecision }) {
  const [route, setRoute] = useState('PETTY_CASH');
  const [accountant, setAccountant] = useState('');
  const [accountants, setAccountants] = useState([]);
  const [loadingAccountants, setLoadingAccountants] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!canDecide || route !== 'DIRECT_PURCHASE' || p.status !== 'AWAITING_ACCOUNTS') return;
    let active = true;
    setLoadingAccountants(true);
    api(apiBase, '/api/direct-purchases/approvers/ACCOUNTANT').then(rows => { if (active) setAccountants(rows); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoadingAccountants(false); });
    return () => { active = false; };
  }, [apiBase, canDecide, route, p.status]);
  const eligiblePetty = purchaseLimit && Number(p.totalAmount) <= Number(purchaseLimit);
  return <article className="rounded-lg border border-slate-200 p-4">
    <div className="flex flex-wrap justify-between gap-2"><div><b>{p.reference}</b><p className="mt-1 text-sm">{p.supplier} · Quotation: <span className="break-all">{p.quotationReference}</span></p></div><div className="text-sm"><b>{money(p.totalAmount)}</b><p>{p.status === 'AWAITING_ACCOUNTS' ? 'Awaiting Accounts Review' : p.status.replaceAll('_', ' ')}</p></div></div>
    <ul className="my-3 space-y-1 text-sm text-slate-600">{p.items.map(i => <li key={i.id}>{i.productName} · {i.quantity} × {money(i.unitCost)} = {money(i.quantity * Number(i.unitCost))}</li>)}</ul>
    <p className="text-xs text-slate-500">Submitted by {p.submittedBy} · {new Date(p.submittedAt).toLocaleString()}</p>{p.notes && <p className="mt-2 text-sm">{p.notes}</p>}
    {canDecide && p.reviewedBy && <p className="mt-2 text-sm">Accounts: {p.reviewedBy} · {p.reviewNotes || 'Reviewed'}{p.financeReference && <a className="ml-2 text-blue-700 underline" href={p.fundingRoute === 'PETTY_CASH' ? '#/pettyCash' : `#/DirectPurchase/${p.financeRequestId}`}>{p.financeReference}</a>}</p>}
    {!canDecide && p.correctionReason && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><b>Correction requested:</b> {p.correctionReason}</p>}
    {canDecide && p.status === 'AWAITING_ACCOUNTS' && <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); onDecision({ action: 'FUND', route, accountantUserId: accountant ? Number(accountant) : null, notes }); }}>
      <label className="text-sm font-semibold">Accounts funding choice<select className={`${field} mt-1`} value={route} onChange={e => setRoute(e.target.value)}><option value="PETTY_CASH">Petty cash</option><option value="DIRECT_PURCHASE">Direct purchase</option></select></label>
      {route === 'DIRECT_PURCHASE' && <label className="text-sm font-semibold">Assigned accountant<select required className={`${field} mt-1`} value={accountant} onChange={e => setAccountant(e.target.value)}><option value="">Select accountant</option>{accountants.map(a => <option value={a.id} key={a.id}>{a.name} ({a.email})</option>)}</select></label>}
      <label className="text-sm font-semibold">Accounts notes / return reason<input className={`${field} mt-1`} maxLength={800} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <div className="flex flex-wrap items-end gap-2"><button className={button} disabled={busy || (route === 'PETTY_CASH' && !eligiblePetty)}>Create {route === 'PETTY_CASH' ? 'petty-cash request' : 'direct purchase'}</button><button type="button" disabled={busy || !notes.trim()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40" onClick={() => onDecision({ action: 'RETURN', notes })}>Return to Procurement</button></div>
      {route === 'PETTY_CASH' && !eligiblePetty && <p className="text-sm text-amber-800">{purchaseLimit ? 'Proposal exceeds the petty-cash purchase limit. Choose direct purchase.' : 'An admin must configure the petty-cash purchase limit, or choose direct purchase.'}</p>}
      <p className="text-xs text-slate-500">This selects the funding route. Finance approval and payment still follow the selected process.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {route === 'DIRECT_PURCHASE' && !loadingAccountants && !accountants.length && !error && <p role="status" className="text-sm text-amber-800">No enabled Accountant user is available. An administrator must configure an Accountant before this proposal can use direct purchase.</p>}
    </form>}
  </article>;
}
ProposalCard.propTypes = { proposal: PropTypes.object.isRequired, canDecide: PropTypes.bool, busy: PropTypes.bool, apiBase: PropTypes.string.isRequired, purchaseLimit: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), onDecision: PropTypes.func.isRequired };
