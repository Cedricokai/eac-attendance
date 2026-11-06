import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Link from "./TransportLink";
import TransportWorkspace from "./TransportWorkspace";
import TransportAssets from "./TransportAssets";
import { TransportBadge, TransportDialog, TransportField, TransportTable } from "./TransportPrimitives";
import { transportDate, transportMoney } from "./transportFormat";
import { transportApi, transportCommand } from "./transportApi";

const choices = values => values.map(value => ({ value, label: value.replaceAll("_", " ") }));
const componentFields = [
  ["name", "Component name", "text", true], ["category", "Category", "text", true],
  ["lastServiceDate", "Last service date", "date"], ["lastServiceMileage", "Last service mileage", "number"],
  ["intervalKm", "Interval (km)", "number"], ["intervalDays", "Interval (days)", "number"], ["intervalMonths", "Interval (months)", "number"],
  ["nextServiceDate", "Next date (when baseline unknown)", "date"], ["nextServiceMileage", "Next mileage (when baseline unknown)", "number"],
  ["warningKm", "Warning distance (km)", "number"], ["warningDays", "Warning period (days)", "number"],
  ["technician", "Technician"], ["supplier", "Supplier / workshop"], ["checklist", "Service checklist", "textarea"], ["notes", "Notes", "textarea"],
];
const numeric = new Set(["vehicleId", "componentId", "faultId", "lastServiceMileage", "intervalKm", "intervalDays", "intervalMonths", "nextServiceMileage", "warningKm", "warningDays", "completionMileage", "partsCost", "labourCost"]);

export default function TransportMaintenanceDesk() {
  const location = useLocation();
  const [search] = useSearchParams();
  const componentsMode = location.pathname.endsWith("components");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [vehicleFilter, setVehicleFilter] = useState("");
  const load = useCallback(() => { setError(""); Promise.all([transportApi("/vehicles"), transportApi("/components"), transportApi("/work-orders"), transportApi("/faults")]).then(([vehicles, components, orders, faults]) => setData({ vehicles, components, orders, faults })).catch(e => setError(e.message)); }, []);
  useEffect(load, [load]);
  const change = key => value => setForm(old => ({ ...old, [key]: value, ...(key === "vehicleId" ? { componentId: "", faultId: "" } : {}) }));
  const open = (kind, row, action) => { setError(""); setDialog({ kind, row, action }); setForm(row ? { ...row, action, reason: "", completionNotes: "", partsCost: "", labourCost: "", completedDate: "", completionMileage: "" } : kind === "component" ? { vehicleId: vehicleFilter, vehicleIds: [] } : { vehicleId: vehicleFilter, maintenanceType: "PREVENTIVE", takeOutOfService: false }); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError("");
    const payload = { ...form };
    for (const key of numeric) if (key in payload) payload[key] = payload[key] === "" || payload[key] === undefined || payload[key] === null ? null : Number(payload[key]);
    try {
      const { kind, row } = dialog;
      if (kind === "release") await transportApi(`/vehicles/${row.vehicleId}/release`, transportCommand("POST", { reason: form.reason }));
      else if (kind === "transition") await transportApi(`/work-orders/${row.id}/transition`, transportCommand("POST", payload));
      else if(kind === "component" && !row && form.vehicleIds?.length) await transportApi("/components/bulk", transportCommand("POST", { ...payload, vehicleIds: [...new Set([Number(form.vehicleId), ...form.vehicleIds.map(Number)])] })); else await transportApi(`/${kind === "component" ? "components" : "work-orders"}${row ? `/${row.id}` : ""}`, transportCommand(row ? "PUT" : "POST", payload));
      setDialog(null); load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const rows = (componentsMode ? data?.components : data?.orders || [])?.filter(row => !search.get("open") || !["COMPLETED", "CANCELLED"].includes(row.status)).filter(row => !search.get("condition") || row.forecast?.status === search.get("condition")).filter(row => !vehicleFilter || String(row.vehicleId) === vehicleFilter).filter(row => !search.get("record") || String(row.id) === search.get("record")) || [];
  const fields = dialog?.kind === "component" ? componentFields : dialog?.kind === "order" ? [["title", "Work description", "text", true], ["scheduledDate", "Scheduled date", "date", true], ["technician", "Assigned technician"], ["supplier", "Supplier / workshop"], ["checklist", "Checklist", "textarea"], ["takeOutOfService", "Take vehicle out of service", "checkbox"]] : dialog?.action === "COMPLETE" ? [["completedDate", "Completion date", "date", true], ["completionMileage", "Completion mileage (optional)", "number"], ["partsCost", "Additional parts cost (excludes received procurement)", "number", true], ["labourCost", "Labour cost", "number", true], ["technician", "Technician", "text", true], ["supplier", "Supplier / workshop"], ["replacement", "Component was replaced", "checkbox"], ["completionNotes", "Completion notes", "textarea", true]] : dialog?.kind === "release" || dialog?.action === "CANCEL" ? [["reason", "Documented assessment / reason", "textarea", true]] : [];
  return <TransportWorkspace title={componentsMode ? "Component maintenance plans" : "Maintenance work orders"} description={componentsMode ? "Schedule each component by distance, time, or both. Forecasts use recorded mileage only." : "Schedule, complete, and verify preventive and corrective work."} loading={!data && !error} error={!dialog ? error : ""} onRetry={load}>
    {context => {
      const manager = context.grants.includes("TRANSPORT_MANAGE_MAINTENANCE");
      return <><section className="tm-panel"><div className="tm-toolbar">{search.size > 0 && <Link to={location.pathname}>Clear dashboard filters</Link>}<label>Vehicle <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}><option value="">All vehicles</option>{data?.vehicles.map(v => <option key={v.id} value={v.id}>{v.dvla} — {v.name}</option>)}</select></label>{manager && <button className="tm-button-primary" onClick={() => open(componentsMode ? "component" : "order")}>{componentsMode ? "Add component plan" : "Schedule work"}</button>}</div>
        <TransportTable rows={rows} columns={componentsMode ? [{ key: "vehicle", label: "Vehicle" }, { key: "name", label: "Component" }, { key: "nextServiceDate", label: "Next date", render: row => transportDate(row.nextServiceDate) }, { key: "nextServiceMileage", label: "Next mileage (km)" }, { key: "forecast", label: "Condition", render: row => <TransportBadge value={row.forecast.status} /> }, { key: "estimate", label: "Forecast", render: row => <div><strong>{transportDate(row.forecast.predictedServiceDate)}</strong><p>{row.forecast.explanation}</p></div> }] : [{ key: "reference", label: "Reference" }, { key: "vehicle", label: "Vehicle" }, { key: "title", label: "Work" }, { key: "maintenanceType", label: "Type" }, { key: "scheduledDate", label: "Scheduled", render: row => transportDate(row.scheduledDate) }, { key: "status", label: "Status", render: row => <TransportBadge value={row.status} /> }, { key: "totalCost", label: "Cost", render: row => transportMoney(row.totalCost) }, {key:"attachments",label:"Files",render:row=><button onClick={()=>setAttachments(row)}>Attachments</button>}]} actions={row => manager && !row.vehicleArchived ? componentsMode ? <button onClick={() => open("component", row)}>Edit plan</button> : <>
          {["SCHEDULED", "AWAITING_PARTS"].includes(row.status) && <button onClick={() => open("order", row)}>Edit</button>}
          {row.status === "SCHEDULED" && <button onClick={() => open("transition", row, "START")}>Start</button>}
          {["SCHEDULED", "IN_PROGRESS"].includes(row.status) && <><button onClick={() => open("transition", row, "AWAIT_PARTS")}>Await parts</button><button onClick={() => open("transition", row, "COMPLETE")}>Complete</button></>}
          {row.status === "COMPLETED" && !row.verifiedAt && <button onClick={() => open("transition", row, "VERIFY")}>Verify work</button>}
          {!["COMPLETED", "CANCELLED"].includes(row.status) && <button onClick={() => open("transition", row, "CANCEL")}>Cancel work</button>}
          {row.verifiedAt && context.grants.includes("TRANSPORT_RELEASE_VEHICLE") && <button onClick={() => open("release", row)}>Safety release</button>}
        </> : null} />
      </section>
      {dialog && <TransportDialog busy={busy} title={dialog.kind === "component" ? "Component plan" : dialog.kind === "order" ? "Schedule maintenance" : dialog.kind === "release" ? "Vehicle safety release" : `${dialog.action.replaceAll("_", " ")} — ${dialog.row.reference}`} onClose={() => setDialog(null)}><form onSubmit={save}>{error && <p role="alert" className="tm-error">{error}</p>}<div className="tm-form-grid">
        {["component", "order"].includes(dialog.kind) && <TransportField label="Vehicle" type="select" value={form.vehicleId} options={data.vehicles.map(v => ({ value: v.id, label: `${v.dvla} — ${v.name}` }))} onChange={change("vehicleId")} disabled={Boolean(dialog.row)} required />}
        {dialog.kind === "order" && <><TransportField label="Maintenance type" type="select" value={form.maintenanceType} options={choices(["PREVENTIVE", "CORRECTIVE", "ROUTINE"])} onChange={change("maintenanceType")} required /><TransportField label="Component (optional)" type="select" value={form.componentId} options={data.components.filter(c => String(c.vehicleId) === String(form.vehicleId)).map(c => ({ value: c.id, label: c.name }))} onChange={change("componentId")} /><TransportField label="Approved fault (optional)" type="select" value={form.faultId} options={data.faults.filter(f => String(f.vehicleId) === String(form.vehicleId) && ["APPROVED", "SCHEDULED", "AWAITING_PARTS"].includes(f.status)).map(f => ({ value: f.id, label: `${f.reference} — ${f.category}` }))} onChange={change("faultId")} /></>}
        {fields.map(([key, label, type = "text", required]) => <TransportField key={key} label={label} type={key==="category"?"select":type} options={key==="category"?[...new Set([...(context.rules.componentCategories||[]),form.category].filter(Boolean))].map(value=>({value,label:value})):undefined} value={form[key]} onChange={change(key)} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} />)}
      </div>{dialog.kind === "component" && !dialog.row && <fieldset className="tm-panel"><legend>Also assign this plan to</legend>{data.vehicles.filter(v => String(v.id) !== String(form.vehicleId)).map(v => <TransportField key={v.id} label={`${v.dvla} — ${v.name}`} type="checkbox" value={form.vehicleIds?.includes(v.id)} onChange={checked => setForm(old => ({ ...old, vehicleIds: checked ? [...(old.vehicleIds || []), v.id] : (old.vehicleIds || []).filter(id => id !== v.id) }))} />)}</fieldset>}{dialog.kind === "component" && <p>Set at least one interval. Use days or months for the time interval. Missing service baselines remain unrecorded.</p>}{dialog.kind === "transition" && ["START", "AWAIT_PARTS", "VERIFY"].includes(dialog.action) && <p>Confirm this action for {dialog.row.vehicle}: {dialog.row.title}.</p>}<div className="tm-form-actions"><button type="button" disabled={busy} onClick={() => setDialog(null)}>Close</button><button className="tm-button-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Confirm and save"}</button></div></form></TransportDialog>}
      {attachments && <TransportDialog title={`Work order files — ${attachments.reference}`} onClose={()=>setAttachments(null)}><TransportAssets vehicleId={attachments.vehicleId} purpose="WORK_ORDER" referenceId={attachments.id} editable={Boolean(manager && !attachments.vehicleArchived)}/></TransportDialog>}
      </>;
    }}
  </TransportWorkspace>;
}
