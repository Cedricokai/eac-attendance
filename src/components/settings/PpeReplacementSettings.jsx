import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Pencil } from "lucide-react";
import IssuedItemsDialog from "../IssuedItemsDialog";
import { issuedItemsRequest } from "../../utils/issuedItems";

const blank = { ppeType: "", intervalCount: 1, intervalUnit: "YEARS", active: true };
export default function PpeReplacementSettings() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { issuedItemsRequest("/policies").then(setRules).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const saved = await issuedItemsRequest(`/policies${form.id ? `/${form.id}` : ""}`, form.id ? "PUT" : "POST", { ...form, intervalCount: Number(form.intervalCount) });
      setRules((current) => [...current.filter((rule) => rule.id !== saved.id), saved].sort((a, b) => a.ppeType.localeCompare(b.ppeType)));
      setForm(null); setNotice("Replacement rule saved. Existing issue dates and due dates are preserved.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="text-blue-600"/>PPE replacement rules</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Set how often each PPE type should be replaced. The countdown starts from the date it was given to the employee.</p></div><button onClick={() => { setError(""); setNotice(""); setForm({ ...blank }); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Add rule</button></div>
    {!form && error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p>}
    <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>{["PPE type", "Replace every", "Status", ""].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{rules.map((rule) => <tr key={rule.id}><td className="px-4 py-4 font-medium">{rule.ppeType}</td><td className="px-4 py-4">{rule.intervalCount} {rule.intervalUnit.toLowerCase()}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${rule.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{rule.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-4"><button aria-label={`Edit ${rule.ppeType} rule`} onClick={() => { setError(""); setNotice(""); setForm({ ...rule }); }} className="flex items-center gap-1 text-blue-700"><Pencil size={14}/>Edit</button></td></tr>)}{!rules.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">{loading ? "Loading rules…" : "No replacement rules yet. Add a PPE type and its replacement interval."}</td></tr>}</tbody></table></div>
    <p className="mt-4 text-xs leading-relaxed text-slate-500">Rules apply to new issues and replacements. Each saved issue retains the interval used when it was recorded. Inactive rules remain in the records but cannot be used for a new issue.</p>
    {form && <IssuedItemsDialog title={form.id ? "Edit replacement rule" : "New replacement rule"} busy={busy} onClose={() => setForm(null)}><form onSubmit={save} className="space-y-5 p-6"><fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm font-medium">PPE type<input required maxLength={100} value={form.ppeType} placeholder="e.g. Safety boots" onChange={(e) => setForm({ ...form, ppeType: e.target.value })} className="mt-2 w-full rounded-lg border px-3 py-2.5"/></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Replace every<input required type="number" min="1" max="120" value={form.intervalCount} onChange={(e) => setForm({ ...form, intervalCount: e.target.value })} className="mt-2 w-full rounded-lg border px-3 py-2.5"/></label><label className="text-sm font-medium">Period<select value={form.intervalUnit} onChange={(e) => setForm({ ...form, intervalUnit: e.target.value })} className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5"><option value="MONTHS">Months</option><option value="YEARS">Years</option></select></label></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}/>Active for new issues</label>
    </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setForm(null)} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">{busy ? "Saving…" : "Save rule"}</button></div></form></IssuedItemsDialog>}
  </div>;
}
