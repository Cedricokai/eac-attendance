import { useCallback, useEffect, useState } from "react";
import TransportWorkspace from "./TransportWorkspace";
import {TransportUploadField,TransportRecordImage} from "./TransportUploads";
import { TransportBadge, TransportDialog, TransportField, TransportTable } from "./TransportPrimitives";
import { transportDate } from "./transportFormat";
import { transportApi, transportCommand } from "./transportApi";

const blank = { driverName: "", licenseNumber: "", licenseExpiry: "", licenseClass: "", contact: "", email: "", department: "", project: "", employeeRecordId: "", accountId: "", username: "", status: "active", active: true, notificationsEnabled: true };
export default function TransportDrivers() {
  const [records, setRecords] = useState(null); const [includeArchived,setIncludeArchived]=useState(false);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [photo,setPhoto]=useState(null);
  const load = useCallback(() => { setError(""); transportApi("/context").then(async context => { const [drivers, people] = await Promise.all([transportApi(`/drivers?includeArchived=${includeArchived}`), context.grants.includes("TRANSPORT_MANAGE_DRIVERS") ? transportApi("/employees") : Promise.resolve([])]);setRecords(drivers);setEmployees(people); }).catch(e => setError(e.message)); }, [includeArchived]);
  useEffect(load, [load]);
  useEffect(() => { let current = true; setAccounts([]); if (form.employeeRecordId && dialog?.kind === "edit") transportApi(`/driver-accounts?employeeId=${encodeURIComponent(form.employeeRecordId)}`).then(rows => { if (current) {setAccounts(rows);const active=rows.filter(a=>a.enabled);if(active.length===1)setForm(old=>({...old,accountId:active[0].id}));} }).catch(e => { if (current) setError(e.message); }); return () => { current = false; }; }, [form.employeeRecordId, dialog?.kind]);
  const restore=async row=>{setBusy(true);setError("");try{await transportApi(`/drivers/${row.id}/restore`,transportCommand("POST",{}));setMessage("Driver restored as inactive. Activate driver workspace access when ready. The employee keeps their existing EAC login.");load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const change = key => value => setForm(old => {const employee=employees.find(e=>String(e.id)===String(value));return {...old,[key]:value,...(key==="employeeRecordId"?{accountId:"",driverName:employee?.name||old.driverName}:{})};});
  const open = (kind, row) => { setPhoto(null);setError(""); setMessage("");setDialog({ kind, row });setForm(row ? { ...blank, ...row,  } : { ...blank }); };
  const save = async event => {
    event.preventDefault();setBusy(true);setError("");
    try {
      const row = dialog.row;
      if (dialog.kind === "archive") await transportApi(`/drivers/${row.id}`, transportCommand("DELETE"));
      else if (dialog.kind === "invite") { await transportApi(`/drivers/${row.id}/invitation`, transportCommand("POST", {}));setMessage("Secure setup invitation queued. Email delivery follows your Transport settings."); }
      else { const payload = { ...form, employeeRecordId: form.employeeRecordId ? Number(form.employeeRecordId) : null, accountId: form.accountId ? Number(form.accountId) : null };if(photo){const body=new FormData();body.append("driver",new Blob([JSON.stringify(payload)],{type:"application/json"}));body.append("photo",photo);await transportApi(`/drivers${row?`/${row.id}`:""}/with-photo`,{method:row?"PUT":"POST",body});}else await transportApi(`/drivers${row ? `/${row.id}` : ""}`, transportCommand(row ? "PUT" : "POST", payload));setMessage("Driver workspace linked to the existing EAC account. The employee uses their normal login."); }
      setDialog(null);load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const rows = (records || []).filter(row => [row.driverName, row.licenseNumber, row.email].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  return <TransportWorkspace title="Drivers" description="Manage driver records and link real employee accounts." loading={!records && !error} error={!dialog ? error : ""} onRetry={load}>
    {context => <><section className="tm-panel">{message && <p role="status" className="tm-success">{message}</p>}<div className="tm-toolbar">{context.grants.includes("TRANSPORT_MANAGE_DRIVERS")&&<label><input type="checkbox" checked={includeArchived} onChange={e=>setIncludeArchived(e.target.checked)}/>Include archived drivers</label>}<label>Search <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Driver, licence or email" /></label>{context.grants.includes("TRANSPORT_MANAGE_DRIVERS") && <button className="tm-button-primary" onClick={() => open("edit")}>Add driver</button>}</div><TransportTable rows={rows} columns={[{ key: "driverName", label: "Driver", render:row=><div className="tm-driver-identity"><TransportRecordImage driver={row}/><strong>{row.driverName}</strong></div> }, { key: "licenseNumber", label: "Licence" }, { key: "licenseExpiry", label: "Licence expiry", render: row => transportDate(row.licenseExpiry) }, { key: "contact", label: "Phone" }, { key: "email", label: "Email" }, { key: "status", label: "Status", render: row => <TransportBadge value={row.archivedAt?"ARCHIVED":row.status} /> }, { key: "username", label: "Linked account" }]} actions={row => context.grants.includes("TRANSPORT_MANAGE_DRIVERS") && (row.archivedAt?<button disabled={busy} onClick={()=>restore(row)}>Restore driver</button>:<><button onClick={() => open("edit", row)}>Edit driver</button><button onClick={() => open("archive", row)}>Archive driver</button></>)} /></section>
      {dialog && <TransportDialog title={dialog.kind === "archive" ? "Archive driver" : dialog.kind === "invite" ? "Resend secure setup invitation" : dialog.row ? "Edit driver" : "Add driver"} busy={busy} onClose={() => setDialog(null)}><form onSubmit={save}>{error && <p role="alert" className="tm-error">{error}</p>}{dialog.kind === "archive" ? <p>Archive {dialog.row.driverName}? Their history is retained. Driver assignments are removed; their normal EAC login remains unchanged.</p> : dialog.kind === "invite" ? <p>Queue a secure password setup invitation for {dialog.row.driverName}? Existing EAC accounts use their normal password recovery.</p> : <>
        <TransportUploadField label="Driver profile photo" imagesOnly file={photo} onChange={setPhoto} disabled={busy} existingName={dialog.row?.photoFileId?"Saved profile photo":undefined}/>{!photo&&dialog.row?.photoFileId&&<TransportRecordImage driver={dialog.row} className="tm-edit-driver-photo"/>}<div className="tm-form-grid">{[["driverName", "Driver name", "text", true], ["licenseNumber", "Licence number", "text", true], ["licenseExpiry", "Licence expiry", "date"], ["licenseClass", "Licence class"], ["contact", "Phone", "tel"], ["email", "Notification email", "email"], ["department", "Department"], ["project", "Project"]].map(([key, label, type = "text", required]) => <TransportField key={key} label={label} type={type} value={form[key]} onChange={change(key)} required={required} />)}
          <TransportField label="Existing employee" required type="select" value={form.employeeRecordId} options={employees.map(e => ({ value: e.id, label: `${e.employeeId || e.id} — ${e.name}` }))} onChange={change("employeeRecordId")} disabled={Boolean(dialog.row?.accountId)} />
          <TransportField label="Status" type="select" value={form.status} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "on_leave", label: "On leave" }]} onChange={value => setForm(old => ({ ...old, status: value, active: value !== "inactive" }))} required />
          <TransportField label="Email notifications enabled" type="checkbox" value={form.notificationsEnabled} onChange={change("notificationsEnabled")} />
          {form.employeeRecordId && !dialog.row?.accountId && <TransportField label="Existing EAC account" required type="select" value={form.accountId} options={accounts.filter(a => a.enabled).map(a => ({ value: a.id, label: `${a.username} — ${a.email}` }))} onChange={change("accountId")} />}
        </div><p>One EAC account, one login. Select the employee’s existing account to assign driver workspace access. Page access and additional transport actions are controlled through Page & User Permissions and Transport Settings → Action permissions. No password, username or employee role is changed.</p>{form.employeeRecordId && !dialog.row?.accountId && !accounts.some(a=>a.enabled) && <p className="tm-error">No active EAC account found. Create or activate the employee account in the main system first.</p>}
      </>}<div className="tm-form-actions"><button type="button" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="tm-button-primary" disabled={busy}>{busy ? "Saving…" : dialog.kind === "archive" ? "Archive driver" : dialog.kind === "invite" ? "Queue invitation" : "Save driver"}</button></div></form></TransportDialog>}
    </>}
  </TransportWorkspace>;
}
