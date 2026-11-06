import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Link from "./TransportLink";
import TransportWorkspace from "./TransportWorkspace";
import TransportAssets from "./TransportAssets";
import { TransportBadge, TransportDialog, TransportField, TransportTable } from "./TransportPrimitives";
import { transportApi, transportCommand } from "./transportApi";

const options = values => values.map(value => ({ value, label: value.replaceAll("_", " ") }));
const blank = { vehicleId: "", category: "", severity: "MEDIUM", description: "", location: "", odometer: "", operational: true };
export default function TransportFaults() {
  const [records, setRecords] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); const [attachments, setAttachments] = useState(null);
  const [form, setForm] = useState(blank);
  const [key, setKey] = useState("");
  const [filter, setFilter] = useState("");
  const [search] = useSearchParams();
  const load = useCallback(() => { setError(""); Promise.all([transportApi("/faults"), transportApi("/vehicles")]).then(([rows, fleet]) => { setRecords(rows); setVehicles(fleet); }).catch(e => setError(e.message)); }, []);
  useEffect(load, [load]);
  const change = name => value => setForm(previous => ({ ...previous, [name]: value }));
  const open = record => { setError(""); setDialog(record || "new"); setForm(record ? { revision: record.revision, status: record.status === "COMPLETED" ? "CLOSED" : record.status === "UNDER_REVIEW" ? "APPROVED" : "UNDER_REVIEW", reviewNotes: "" } : { ...blank }); setKey(crypto.randomUUID()); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (dialog === "new") await transportApi("/faults", transportCommand("POST", { ...form, vehicleId: Number(form.vehicleId), odometer: form.odometer === "" ? null : Number(form.odometer) }, key));
      else await transportApi(`/faults/${dialog.id}/review`, transportCommand("POST", form));
      setDialog(null); load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const columns = [{ key: "reference", label: "Reference" }, { key: "vehicle", label: "Vehicle" }, { key: "category", label: "Category" }, { key: "severity", label: "Severity", render: row => <TransportBadge value={row.severity} /> }, { key: "status", label: "Status", render: row => <TransportBadge value={row.status} /> }, { key: "description", label: "Fault details" }, { key: "reporter", label: "Reported by" }, { key: "files", label: "Attachments", render: row => <button onClick={() => setAttachments(row)}>View files</button> }];
  const rows = (records || []).filter(row => !search.get("open") || !["CLOSED", "REJECTED"].includes(row.status)).filter(row => !filter || row.status === filter).filter(row => !search.get("record") || String(row.id) === search.get("record"));
  return <TransportWorkspace title="Fault reports" description="Report vehicle defects and track safety reviews." loading={!records && !error} error={!dialog ? error : ""} onRetry={load}>
    {context => <>
      <section className="tm-panel"><div className="tm-toolbar">{search.size > 0 && <Link to="/transport/faults">Clear dashboard filters</Link>}<label>Status <select value={filter} onChange={e => setFilter(e.target.value)}><option value="">All statuses</option>{options(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "COMPLETED", "CLOSED"]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>{(context.driverId || context.grants.some(g => ["TRANSPORT_REVIEW_FAULTS", "TRANSPORT_MANAGE_MAINTENANCE"].includes(g))) && <button className="tm-button-primary" onClick={() => open(null)}>Report a fault</button>}</div><TransportTable rows={rows} columns={columns} actions={record => !record.vehicleArchived && context.grants.includes("TRANSPORT_REVIEW_FAULTS") && ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"].includes(record.status) ? <button onClick={() => open(record)}>Review</button> : <span>{record.reviewNotes || "Awaiting next action"}</span>} /></section>
      {dialog && <TransportDialog title={dialog === "new" ? "Report a vehicle fault" : `Review ${dialog.reference}`} busy={busy} onClose={() => setDialog(null)}><form onSubmit={save}>{error && <p role="alert" className="tm-error">{error}</p>}<div className="tm-form-grid">{dialog === "new" ? <>
        <TransportField label="Vehicle" type="select" value={form.vehicleId} options={vehicles.map(v => ({ value: v.id, label: `${v.dvla} — ${v.name}` }))} onChange={change("vehicleId")} required />
        <TransportField label="Category" value={form.category} onChange={change("category")} required />
        <TransportField label="Severity" type="select" value={form.severity} options={options(["LOW", "MEDIUM", "HIGH", "CRITICAL"])} onChange={change("severity")} required />
        <TransportField label="Location" value={form.location} onChange={change("location")} />
        <TransportField label="Odometer (optional)" type="number" min="0" step="any" value={form.odometer} onChange={change("odometer")} />
        <TransportField label="Vehicle is operational" type="checkbox" value={form.operational} onChange={change("operational")} />
        <TransportField label="Fault description" type="textarea" value={form.description} onChange={change("description")} required />
      </> : <><TransportField label="Review decision" type="select" value={form.status} options={options(dialog.status === "COMPLETED" ? ["CLOSED"] : dialog.status === "UNDER_REVIEW" ? ["APPROVED", "REJECTED"] : ["UNDER_REVIEW", "APPROVED", "REJECTED"])} onChange={change("status")} required /><TransportField label="Review reason / safety assessment" type="textarea" value={form.reviewNotes} onChange={change("reviewNotes")} required help="At least 10 characters; rejecting a critical fault requires at least 20." /></>}</div>{dialog === "new" && (form.severity === "CRITICAL" || !form.operational) && <p className="tm-safety-note">This report places the vehicle out of service. An authorized safety release is required before it returns to operation.</p>}<div className="tm-form-actions"><button type="button" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="tm-button-primary" disabled={busy}>{busy ? "Saving…" : dialog === "new" ? "Submit fault report" : "Save review"}</button></div></form></TransportDialog>}
      {attachments && <TransportDialog title={`Attachments — ${attachments.reference}`} onClose={() => setAttachments(null)}><TransportAssets vehicleId={attachments.vehicleId} purpose="FAULT" referenceId={attachments.id} editable={Boolean(!attachments.vehicleArchived && (context.grants.includes("TRANSPORT_REVIEW_FAULTS") || attachments.reporterId === context.userId))} /></TransportDialog>}
    </>}
  </TransportWorkspace>;
}
