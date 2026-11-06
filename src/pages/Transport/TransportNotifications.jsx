import { useCallback, useEffect, useState } from "react";
import Link from "./TransportLink";
import TransportWorkspace from "./TransportWorkspace";
import { TransportBadge, TransportEmpty } from "./TransportPrimitives";
import { transportApi, transportCommand, transportQuery } from "./transportApi";

export default function TransportNotifications() {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [type, setType] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [deliveryLog, setDeliveryLog] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setBusy(true); setError("");
    transportApi(`/notification-history${transportQuery({ page, size: 25, type, unreadOnly, deliveryLog })}`).then(setResult).catch(e => setError(e.message)).finally(() => setBusy(false));
  }, [page, type, unreadOnly, deliveryLog]);
  useEffect(load, [load]);
  const act = async path => { setBusy(true); setError(""); try { await transportApi(path, transportCommand("POST", {})); load(); } catch (e) { setError(e.message); setBusy(false); } };
  return <TransportWorkspace title="Notifications" description="Fleet updates, reminders, and delivery history." loading={!result && !error} error={error} onRetry={load}>
    {context => <section className="tm-panel" aria-busy={busy}>
      <div className="tm-toolbar"><label>Event <select value={type} onChange={e => { setType(e.target.value); setPage(0); }}><option value="">All events</option>{result?.eventTypes.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label><input type="checkbox" checked={unreadOnly} onChange={e => { setUnreadOnly(e.target.checked); setPage(0); }} /> Unread only</label>{context.grants.includes("TRANSPORT_SETTINGS") && <label><input type="checkbox" checked={deliveryLog} onChange={e => { setDeliveryLog(e.target.checked); setPage(0); }} /> Delivery history</label>}<button disabled={busy || !result?.unreadCount} onClick={() => act("/notifications/read-all")}>Mark all as read ({result?.unreadCount ?? 0})</button></div>
      {!result?.items.length ? <TransportEmpty title="You’re all caught up" description="Notifications matching your filters will appear here." /> : <ul className="tm-notification-list">{result.items.map(item => <li key={item.id} className={item.readAt ? "" : "is-unread"}><div><TransportBadge value={item.priority} /><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("en-GB")}</time></div><h2>{item.title}</h2><p>{item.body}</p>{deliveryLog && <p><TransportBadge value={item.deliveryStatus} /> {item.email || item.recipient} · Attempts: {item.attempts}{item.lastError && <span> · {item.lastError}</span>}</p>}<div className="tm-row-actions">{item.targetPath?.startsWith("/") && !item.targetPath.startsWith("//") && <Link to={item.targetPath} onClick={() => { if (!deliveryLog && !item.readAt) act(`/notifications/${item.id}/read`); }}>Open record</Link>}{!deliveryLog && !item.readAt && <button disabled={busy} onClick={() => act(`/notifications/${item.id}/read`)}>Mark as read</button>}{deliveryLog && ["FAILED", "RETRY"].includes(item.deliveryStatus) && <button disabled={busy} onClick={() => act(`/notifications/${item.id}/retry`)}>Retry delivery</button>}</div></li>)}</ul>}
      <div className="tm-pagination"><button disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page + 1} · {result?.total ?? 0} notifications</span><button disabled={busy || (page + 1) * 25 >= (result?.total ?? 0)} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </section>}
  </TransportWorkspace>;
}
