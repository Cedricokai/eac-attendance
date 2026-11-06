/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FileModal, HistoryDialog } from "./FileDialogs";
import { fileApi, jsonRequest, date } from "./fileApi";

export function ReturnWorkDialog({ item, onClose }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <FileModal title="Send back to owner" onClose={() => { if (!busy) onClose(); }}>
    <form className="fm-sheet-access" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try { await fileApi(`/${item.id}/return-work`, jsonRequest("POST", { version: item.currentVersion, note })); toast.success("Saved work sent to the owner for review"); onClose(); }
      catch (e) { setError(e.message); } finally { setBusy(false); }
    }}>
      <p>Send <strong>{item.name}</strong>, saved version <strong>{item.currentVersion}</strong>, to <strong>{item.owner}</strong> for review.</p>
      <p className="fm-muted">Only this saved version is submitted. Finish saving your edits first. The owner can open the shared document and inspect its version history. Sheet restrictions and download permissions remain applied.</p>
      <label>What did you work on?<textarea value={note} maxLength={2000} rows={4} onChange={event => setNote(event.target.value)} placeholder="Describe the sheets, cells or sections you updated" /></label>
      {error && <p className="fm-error" role="alert">{error}</p>}
      <footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="fm-primary" disabled={busy}>{busy ? "Sending…" : "Send back to owner"}</button></footer>
    </form>
  </FileModal>;
}

export default function FileWorkReview({ onOpen }) {
  const [tab, setTab] = useState("returns"), [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], totalPages: 0 });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [revision, setRevision] = useState(0), [history, setHistory] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError("");
    fileApi(`/work-review/${tab}?page=${page}`, { signal: controller.signal }).then(setResult).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [tab, page, revision]);
  const load = async (row, showHistory = false) => {
    try { const item = await fileApi(`/${row.fileId}`); if (showHistory) setHistory(item); else onOpen(item); } catch (e) { setError(e.message); }
  };
  return <section className="fm-work-review" aria-label="Employee work review">
    <div className="fm-work-heading"><div><h2>Employee work review</h2><p>Track documents you shared and review saved work returned by employees.</p></div><button onClick={() => setRevision(value => value + 1)}>Refresh</button></div>
    <div className="fm-work-tabs" role="tablist" aria-label="Work review lists">{[["returns", "Returned work"], ["sent", "Files sent to employees"]].map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "fm-primary" : ""} onClick={() => { setTab(key); setPage(0); }}>{label}</button>)}</div>
    {error && <p className="fm-error" role="alert">{error}</p>}
    {busy ? <p role="status">Loading work…</p> : result.content.length === 0 ? <p className="fm-notice">{tab === "returns" ? "No work has been returned yet. Employees with editing access can send a saved version back to you." : "No documents have been shared from your account yet."}</p> : <div className="fm-work-grid">{result.content.map(row => <article className="fm-work-card" key={row.id || `${row.fileId}-${row.employee}-${row.sentAt}`}>
      <h3>{row.fileName}</h3><p><strong>{row.employee}</strong> · {tab === "returns" ? `Returned version ${row.version}` : `${row.access} access${row.folder ? " · Shared folder" : ""}`}</p>
      {tab === "returns" ? <><span className="fm-work-badge">{row.reviewedAt ? "Reviewed" : "Awaiting your review"}</span><p className="fm-work-note">{row.note || "No work notes provided. Open version history to inspect the saved revisions."}</p><small>Returned {date(row.returnedAt)} · Version saved by {row.savedBy}</small>{row.reviewedAt && <small>Reviewed {date(row.reviewedAt)}</small>}</> : <small>Shared {date(row.sentAt)} · Latest version {row.currentVersion}{row.expiresAt && ` · Access expires ${date(row.expiresAt)}`}</small>}
      {row.deleted && <p>File is in the recycle bin. Restore it before opening.</p>}
      <div className="fm-work-actions"><button disabled={row.deleted} onClick={() => load(row)}>{row.folder ? "Open folder" : "Open latest document"}</button>{!row.folder && <button disabled={row.deleted} onClick={() => load(row, true)}>Version history</button>}{tab === "returns" && !row.reviewedAt && <button disabled={row.deleted} onClick={async () => { try { await fileApi(`/work-review/returns/${row.id}/reviewed`, { method: "PUT" }); setRevision(value => value + 1); } catch (e) { setError(e.message); } }}>Mark reviewed</button>}</div>
    </article>)}</div>}
    <div className="fm-work-actions"><button disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, result.totalPages)}</span><button disabled={busy || page + 1 >= result.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div>
    {history && <HistoryDialog item={history} onClose={() => setHistory(null)} refresh={() => setRevision(value => value + 1)} />}
  </section>;
}
