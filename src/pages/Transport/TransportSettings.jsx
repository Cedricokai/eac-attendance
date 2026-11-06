import { useCallback, useEffect, useState } from "react";
import TransportWorkspace from "./TransportWorkspace";
import { TransportField } from "./TransportPrimitives";
import { transportApi, transportCommand } from "./transportApi";
import TransportPermissions from "./TransportPermissions";
import TransportEmailTest from "./TransportEmailTest";

const groups = [
  ["Organization", [["companyName", "Company name"], ["currency", "Currency", "readonly"], ["timezone", "Business timezone", "readonly"], ["distanceUnit", "Distance unit", "readonly"]]],
  ["Notification recipients", [["adminEmails", "Administrator emails"], ["faultEmails", "Fault review emails"], ["procurementEmails", "Procurement emails"], ["supervisorEmails", "Maintenance supervisor emails"], ["escalationEmails", "Critical escalation emails"]]],
  ["Alert thresholds", [["dvlaThresholds", "DVLA expiry (days)"], ["insuranceThresholds", "Insurance expiry (days)"], ["roadworthyThresholds", "Roadworthy expiry (days)"], ["licenseThresholds", "Driver licence expiry (days)"], ["maintenanceDays", "Maintenance warning (days)"], ["maintenanceKm", "Maintenance warning (km)"], ["reminderDays", "Repeat reminders every (days)", "number"], ["forecastMinReadings", "Minimum dated forecast readings", "number"], ["forecastMaxAgeDays", "Maximum reading age (days)", "number"]]],
  ["Categories", [["vehicleCategories", "Vehicle categories"], ["documentTypes", "Document types"], ["componentCategories", "Component categories"], ["procurementCategories", "Procurement categories"]]],
  ["Delivery and driver permissions", [["emailEnabled", "Enable email notifications", "checkbox"], ["inAppEnabled", "Enable in-app notifications", "checkbox"], ["notifyAdmin", "Notify administrators", "checkbox"], ["notifyDriver", "Notify assigned drivers", "checkbox"], ["criticalEscalation", "Escalate critical faults", "checkbox"], ["driverFuelEnabled", "Allow drivers to record fuel", "checkbox"], ["driverMileageEnabled", "Allow drivers to record mileage", "checkbox"], ["allowMultipleVehiclesPerDriver", "Allow multiple vehicles per driver", "checkbox"]]],
];

export default function TransportSettings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(() => { setError(""); transportApi("/settings").then(setData).catch(e => setError(e.message)); }, []);
  useEffect(load, [load]);
  const save = async event => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const payload = { ...data };
    ["reminderDays", "forecastMinReadings", "forecastMaxAgeDays"].forEach(key => { payload[key] = Number(payload[key]); });
    try { setData(await transportApi("/settings", transportCommand("PUT", payload))); setMessage("Transport settings saved."); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <TransportWorkspace title="Transport settings" description="Manage fleet rules, reminders, and delivery preferences." loading={!data && !error} error={error} onRetry={load}>
    {context => context.grants.includes("TRANSPORT_SETTINGS") && data ? <><form className="tm-settings" onSubmit={save}>
      {message && <p className="tm-success" role="status">{message}</p>}
      {groups.map(([title, fields]) => <section className="tm-panel" key={title}><h2>{title}</h2>{title === "Notification recipients" && <p>Separate email addresses with commas.</p>}{title === "Alert thresholds" && <p>Separate thresholds with commas. Documents remain valid through their expiry date in Africa/Accra.</p>}<div className="tm-form-grid">{fields.map(([key, label, type = "text"]) => <TransportField key={key} label={label} value={data[key]} type={type === "readonly" ? "text" : type} readOnly={type === "readonly"} min={type === "number" ? key === "forecastMinReadings" ? 2 : 1 : undefined} onChange={value => setData(previous => ({ ...previous, [key]: value }))} />)}</div></section>)}
      {data.smtp && <section className="tm-panel"><h2>Email connection</h2><p>Uses the existing backend email configuration. Update credentials in the local environment or deployment configuration.</p><dl className="tm-details"><dt>Server</dt><dd>{data.smtp.host || "Not configured"}:{data.smtp.port}</dd><dt>Sender</dt><dd>{data.smtp.sender || "Not configured"}</dd><dt>Authentication</dt><dd>{data.smtp.authenticationConfigured ? "Configured" : "Not configured"}</dd><dt>TLS / SSL</dt><dd>{String(data.smtp.tls)} / {String(data.smtp.ssl)}</dd></dl></section>}
      <div className="tm-form-actions"><button type="submit" className="tm-button-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></div>
    </form><TransportEmailTest />{context.admin && <TransportPermissions />}</> : <p role="alert">Transport settings permission is required.</p>}
  </TransportWorkspace>;
}
