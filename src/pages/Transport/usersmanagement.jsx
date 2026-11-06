import { useCallback, useEffect, useState } from "react";
import Link from "./TransportLink";
import TransportWorkspace from "./TransportWorkspace";
import { TransportDialog, TransportField, TransportTable } from "./TransportPrimitives";
import { transportApi, transportCommand } from "./transportApi";

export default function UsersManagement() {
  const [records, setRecords] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const load = useCallback(() => { setError(""); transportApi("/directory").then(setRecords).catch(e => setError(e.message)); }, []);
  useEffect(load, [load]);
  const open = (kind, row) => { setError(""); setDialog({ kind, row }); setForm(row ? { ...row } : { fullName: "", email: "", phone: "", role: "" }); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError("");
    try { await transportApi(`/directory${dialog.row ? `/${dialog.row.id}` : ""}`, transportCommand(dialog.kind === "archive" ? "DELETE" : dialog.row ? "PUT" : "POST", dialog.kind === "archive" ? undefined : form)); setDialog(null); load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const rows = (records || []).filter(row => [row.fullName, row.email, row.role].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  return <TransportWorkspace title="Transport team directory" description="Manage fleet contacts and team roles. Driver logins use the existing EAC employee accounts." loading={!records && !error} error={!dialog ? error : ""} onRetry={load}>
    {context => <><section className="tm-panel"><div className="tm-toolbar"><label>Search <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email or team role" /></label>{context.grants.includes("TRANSPORT_SETTINGS") && <button className="tm-button-primary" onClick={() => open("edit")}>Add team contact</button>}<Link to="/drivers">Assign driver workspaces</Link></div><TransportTable rows={rows} columns={[{ key: "fullName", label: "Name" }, { key: "role", label: "Team role" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }]} actions={row => context.grants.includes("TRANSPORT_SETTINGS") && <><button onClick={() => open("edit", row)}>Edit contact</button><button onClick={() => open("archive", row)}>Archive contact</button></>} /></section>
    {dialog && <TransportDialog title={dialog.kind === "archive" ? "Archive team contact" : dialog.row ? "Edit team contact" : "Add team contact"} busy={busy} onClose={() => setDialog(null)}><form onSubmit={save}>{error && <p role="alert" className="tm-error">{error}</p>}{dialog.kind === "archive" ? <p>Archive {dialog.row.fullName} from this directory? Their system login and historical records are retained.</p> : <><p>These contact details do not create a login or grant access. Use driver account management to link an existing employee account.</p><div className="tm-form-grid">{[["fullName", "Full name", "text"], ["role", "Team role", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"]].map(([key, label, type]) => <TransportField key={key} label={label} value={form[key]} type={type} required={key === "fullName"} onChange={value => setForm(old => ({ ...old, [key]: value }))} />)}</div></>}<div className="tm-form-actions"><button type="button" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button type="submit" disabled={busy} className="tm-button-primary">{busy ? "Saving…" : dialog.kind === "archive" ? "Archive contact" : "Save contact"}</button></div></form></TransportDialog>}</>}
  </TransportWorkspace>;
}
