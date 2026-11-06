import { useCallback, useEffect, useState } from "react";
import TransportWorkspace from "./TransportWorkspace";
import { TransportField, TransportTable } from "./TransportPrimitives";
import { transportApi, transportQuery } from "./transportApi";

const initial = { type: "VEHICLE_REGISTER", from: "", to: "", vehicleId: "", driverId: "", department: "", project: "", vehicleType: "", status: "" };
export default function TransportReportPage() {
  const [options, setOptions] = useState(null);
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [report, setReport] = useState(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const load = useCallback(() => { setError("");Promise.all([transportApi("/report-types"), transportApi("/vehicles")]).then(([types, vehicles]) => setOptions({ types, vehicles })).catch(e => setError(e.message)); }, []);
  useEffect(load, [load]);
  useEffect(() => {const controller = new AbortController();setBusy(true);setError("");const { type, ...filters } = applied;transportApi(`/reports/${type}${transportQuery(filters)}`, { signal: controller.signal }).then(result => { setReport(result);setPage(0); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => {if (!controller.signal.aborted) setBusy(false);});return () => controller.abort();}, [applied]);
  const change = key => value => setDraft(old => ({ ...old, [key]: value }));
  const exportFile = async format => {setExporting(true);setError("");try{const { type, ...filters } = applied;const blob = await transportApi(`/reports/${type}/export${transportQuery({ ...filters, format })}`, { blob: true });const url = URL.createObjectURL(blob);const link = document.createElement("a");link.href = url;link.download = `transport-${type.toLowerCase()}.${format}`;link.click();window.setTimeout(() => URL.revokeObjectURL(url), 1000);}catch(e){setError(e.message);}finally{setExporting(false);}};
  const values = key => [...new Set((options?.vehicles || []).map(v => v[key]).filter(Boolean))].sort().map(value => ({ value, label: value }));
  const drivers = [...new Map((options?.vehicles || []).filter(v => v.driverId).map(v => [v.driverId, { value: v.driverId, label: v.assignedDriver || `Driver ${v.driverId}` }])).values()];
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  return <TransportWorkspace title="Transport reports" description="Explore recorded fleet data and export the same filtered results." loading={!options && !error} error={error} onRetry={() => {load();setApplied(old => ({ ...old }));}}>
    <section className="tm-panel"><form onSubmit={event => { event.preventDefault();setApplied({ ...draft }); }}><div className="tm-form-grid"><TransportField label="Report" type="select" value={draft.type} options={options?.types || []} onChange={change("type")} required /><TransportField label="Vehicle" type="select" value={draft.vehicleId} options={(options?.vehicles || []).map(v => ({ value: v.id, label: `${v.dvla} — ${v.name}` }))} onChange={change("vehicleId")} /><TransportField label="From date" type="date" value={draft.from} onChange={change("from")} /><TransportField label="To date" type="date" value={draft.to} onChange={change("to")} /><TransportField label="Driver (where recorded)" type="select" value={draft.driverId} options={drivers} onChange={change("driverId")} /><TransportField label="Department" type="select" value={draft.department} options={values("department")} onChange={change("department")} /><TransportField label="Project" type="select" value={draft.project} options={values("project")} onChange={change("project")} /><TransportField label="Vehicle type" type="select" value={draft.vehicleType} options={values("type")} onChange={change("vehicleType")} /><TransportField label="Status (exact value)" value={draft.status} onChange={change("status")} placeholder="For example ACTIVE or COMPLETED" /></div><div className="tm-form-actions"><button type="button" disabled={busy} onClick={() => {setDraft(initial);setApplied({ ...initial });}}>Reset filters</button><button className="tm-button-primary" disabled={busy} type="submit">{busy ? "Loading report…" : "Apply filters"}</button>{dirty && <span role="status">Apply your changes to refresh the report.</span>}</div></form></section>
    {report && <section className="tm-panel" aria-busy={busy}><div className="tm-page-heading"><div><h2>{report.title}</h2><p>{report.total} matching records</p></div><div className="tm-row-actions">{["csv", "xlsx", "pdf"].map(format => <button key={format} disabled={busy || exporting || dirty} onClick={() => exportFile(format)}>{exporting ? "Preparing…" : `Export ${format.toUpperCase()}`}</button>)}</div></div><p>{report.notes}</p><TransportTable rows={report.rows.slice(page * 25, (page + 1) * 25)} rowKey="reportRow" columns={report.columns.map(column => ({ ...column, render: row => row[column.key] === null || row[column.key] === undefined ? "Not Recorded" : String(row[column.key]) }))} /><div className="tm-pagination"><button disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(report.total / 25))}</span><button disabled={busy || (page + 1) * 25 >= report.total} onClick={() => setPage(value => value + 1)}>Next</button></div></section>}
  </TransportWorkspace>;
}
