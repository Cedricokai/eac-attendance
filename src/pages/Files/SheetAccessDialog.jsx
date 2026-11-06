import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { FileModal } from "./FileDialogs";
import { fileApi, jsonRequest, employeeSharingRecipients, date } from "./fileApi";

export default function SheetAccessDialog({ item, policy, onClose, onSaved, connected }) {
  const [sheet, setSheet] = useState(policy.sheets[0]?.name || "");
  const [selectedSheets, setSelectedSheets] = useState([policy.sheets[0]?.name].filter(Boolean));
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [bulkAccess, setBulkAccess] = useState("CanView");
  const [restricted, setRestricted] = useState(false);
  const [grants, setGrants] = useState({});
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState(new Set());
  const [directory, setDirectory] = useState([]);
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const current = policy.sheets.find(entry => entry.name === sheet);
    setRestricted(!!current?.restricted); setGrants(current?.members || {});
    // Refresh drafts only after a saved policy change or a sheet selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, policy.policyVersion]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => employeeSharingRecipients(query, controller.signal)
      .then(people => {setDirectory(people);setMatches(new Set(people.map(person => person.userId)));})
      .catch(e => { if (!controller.signal.aborted) setError(e.message); }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const people = policy.employees.filter(person => matches.has(person.userId) || person.admin || person.id === policy.ownerId).map(person=>{const employee=directory.find(entry=>entry.userId===person.userId);return employee?{...person,name:employee.name,employeeId:employee.employeeId}:person;});
  return <FileModal title="Assign sheet access" onClose={onClose} wide>
    <form className="fm-sheet-access" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        const saved = await fileApi(`/${item.id}/onlyoffice/sheets/batch`, jsonRequest("PUT", {
          sheets: selectedSheets, restricted, policyVersion: policy.policyVersion, shareWorkbook: share,
          grants: policy.employees.filter(person => ["CanView", "CanEdit"].includes(grants[person.id])).map(person => ({ userId: person.userId, access: grants[person.id] })),
        }));
        onSaved(saved);
      } catch (e) { setError(e.message); } finally { setBusy(false); }
    }}>
      <p><strong>{item.name}</strong> · {policy.sheets.length} sheets. Employees open the same workbook; sheets without access show a denial message.</p>
      <div className="fm-sheet-admin"><ShieldCheck size={18} />The workbook owner and ADMIN accounts retain full control.</div>
      <label>Choose a sheet<select value={sheet} onChange={event => {setSheet(event.target.value);setSelectedSheets(old=>old.length<=1?[event.target.value]:old);}}>{policy.sheets.map(entry => <option key={entry.name}>{entry.name}</option>)}</select></label>
      <fieldset><legend>Apply these assignments to sheets</legend><button type="button" onClick={()=>setSelectedSheets(policy.sheets.map(entry=>entry.name))}>Select all sheets</button><button type="button" onClick={()=>setSelectedSheets([sheet])}>Use chosen sheet only</button>{policy.sheets.map(entry=><label className="fm-sheet-check" key={entry.name}><input type="checkbox" checked={selectedSheets.includes(entry.name)} onChange={event=>setSelectedSheets(old=>event.target.checked?[...old,entry.name]:old.filter(name=>name!==entry.name))}/>{entry.name}</label>)}</fieldset>
      <p className="fm-muted">The chosen sheet supplies the starting permissions. Saving replaces the assignments on all {selectedSheets.length} selected sheets with the employee permissions below. Other sheets are unchanged. No cell edit is required.</p>
      <label className="fm-sheet-check"><input type="checkbox" checked={restricted} onChange={event => setRestricted(event.target.checked)} />Limit this sheet to selected employees</label>
      <p className="fm-muted">{restricted ? "Unassigned employees cannot view this sheet inside the editor." : "Everyone who can open this workbook can use this sheet, subject to their file permissions."}</p>
      <label className="fm-sheet-search"><Search size={16} /><input aria-label="Search employee directory" placeholder="Search your employee directory…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="fm-sheet-bulk"><button type="button" disabled={busy||!restricted} onClick={()=>setSelectedPeople(people.filter(p=>!p.admin&&p.id!==policy.ownerId).map(p=>p.id))}>Select listed employees</button><button type="button" onClick={()=>setSelectedPeople([])}>Clear employee selection</button><label>Permission for selected employees<select value={bulkAccess} onChange={event=>setBulkAccess(event.target.value)}><option value="NotView">No access</option><option value="CanView">View only</option><option value="CanEdit">View and edit</option></select></label><button type="button" disabled={busy||!restricted||!selectedPeople.length} onClick={()=>{const chosen=policy.employees.filter(p=>selectedPeople.includes(p.id));if(bulkAccess==="CanEdit"&&chosen.some(p=>!p.canEdit)){setError("Some selected employees do not have file editing permission. Choose View only or adjust your selection.");return;}setError("");setGrants(old=>({...old,...Object.fromEntries(chosen.map(p=>[p.id,bulkAccess]))}));}}>Apply to {selectedPeople.length} employees</button></div>
      <div className="fm-sheet-people">{people.map(person => {
        const mandatory = person.admin || person.id === policy.ownerId;
        return <div className="fm-sheet-person" key={person.id}><label className="fm-sheet-check"><input type="checkbox" aria-label={`Select ${person.name}`} disabled={mandatory||busy||!restricted} checked={selectedPeople.includes(person.id)} onChange={event=>setSelectedPeople(old=>event.target.checked?[...old,person.id]:old.filter(id=>id!==person.id))}/><span><strong>{person.name}</strong><small>{person.admin ? "ADMIN · full control" : person.id === policy.ownerId ? "Workbook owner" : person.employeeId}{!person.workbookAccess && !mandatory ? " · workbook not yet shared" : ""}</small></span></label>
          <select aria-label={`Sheet access for ${person.name}`} disabled={!restricted || mandatory || busy} value={mandatory ? "CanEdit" : grants[person.id] || "NotView"} onChange={event => setGrants(old => ({ ...old, [person.id]: event.target.value }))}>
            <option value="NotView">No access</option><option value="CanView">View only</option><option value="CanEdit" disabled={!person.canEdit}>View and edit</option>
          </select></div>;
      })}{!people.length && <p>No matching employee accounts.</p>}</div>
      <label className="fm-sheet-check"><input type="checkbox" checked={share} onChange={event => setShare(event.target.checked)} />Also share the workbook with newly assigned employees (no email)</label>
      {policy.pending && <p className="fm-sheet-pending"><CheckCircle2 size={17} />Assignments saved in EAC. The editor is applying and saving the restrictions automatically. Other employees must wait until verification completes.</p>}
      {!connected && <p className="fm-error">The editor bridge is connecting. Wait for it before saving assignments.</p>}
      {error && <p className="fm-error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Close</button><button className="fm-primary" disabled={busy || !selectedSheets.length || !connected}>{busy ? "Saving…" : "Save assignments and apply"}</button></footer>
      {!!policy.audit.length && <section className="fm-sheet-audit"><h3>Assignment history</h3>{policy.audit.map(entry => <p key={entry.policyVersion}><strong>{entry.employee}</strong> · policy {entry.policyVersion} · {date(entry.savedAt)}</p>)}</section>}
    </form>
  </FileModal>;
}
SheetAccessDialog.propTypes = { item: PropTypes.object.isRequired, policy: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired, connected: PropTypes.bool.isRequired };
