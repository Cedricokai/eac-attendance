import { useEffect, useState } from "react";
import { Building2, Copy, Link2, Plus, RefreshCw, ShieldOff } from "lucide-react";
import MainSidebar from "../mainSidebar";
import { medicalVisitApi, unwrapList } from "../../../services/medicalVisitApi";

const emptyHospital = { name: "", code: "", address: "", contactName: "", phone: "", email: "" };

export default function HospitalManagement() {
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState(emptyHospital);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkStates, setLinkStates] = useState({});

  const load = async () => {
    setLoading(true); setError("");
    try {
      const items = unwrapList(await medicalVisitApi.getHospitals());
      setHospitals(items);
      setLinkStates((current) => Object.fromEntries(items.map((hospital) => [
        hospital.id,
        current[hospital.id] ?? Boolean(hospital.accessLinkActive),
      ])));
    }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault(); setError("");
    try { await medicalVisitApi.createHospital(form); setForm(emptyHospital); await load(); }
    catch (err) { setError(err.message); }
  };

  const generate = async (hospital) => {
    try {
      const result = await medicalVisitApi.createAccessLink(hospital.id);
      const token = result.token || result.accessToken;
      const link = result.url || `${window.location.origin}${window.location.pathname}#/hospital/portal/${token}`;
      setGeneratedLink(link);
      setLinkStates((current) => ({ ...current, [hospital.id]: true }));
    } catch (err) { setError(err.message); }
  };

  const revoke = async (hospital) => {
    if (!window.confirm(`Revoke the active portal link for ${hospital.name}?`)) return;
    try {
      await medicalVisitApi.revokeAccessLink(hospital.id);
      setGeneratedLink("");
      setLinkStates((current) => ({ ...current, [hospital.id]: false }));
    }
    catch (err) { setError(err.message); }
  };

  const input = "rounded-lg border border-slate-300 px-3 py-2";
  return <div className="min-h-screen bg-slate-100"><MainSidebar /><main className="ml-64 p-6 lg:p-8">
    <div className="mx-auto max-w-7xl"><div className="mb-7 flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Hospital partners</h1><p className="text-slate-600">Register facilities and manage their submission links.</p></div><button onClick={load} className="rounded-lg border bg-white p-2.5"><RefreshCw size={18} /></button></div>
    {error && <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}
    {generatedLink && <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="mb-2 font-semibold text-blue-900">New hospital portal link</p><div className="flex gap-2"><input readOnly value={generatedLink} className="min-w-0 flex-1 rounded border bg-white px-3 py-2" /><button onClick={() => navigator.clipboard.writeText(generatedLink)} className="flex items-center gap-2 rounded bg-blue-700 px-4 text-white"><Copy size={16} />Copy</button></div><p className="mt-2 text-xs text-blue-700">Share securely. Generating a replacement may invalidate the previous link.</p></div>}
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]"><form onSubmit={create} className="h-fit rounded-xl bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-semibold"><Plus size={19} />Register hospital</h2><div className="space-y-3"><input required placeholder="Hospital name" value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} className={`w-full ${input}`} /><input required placeholder="Facility code" value={form.code} onChange={(e) => setForm({...form, code:e.target.value})} className={`w-full ${input}`} /><input placeholder="Address" value={form.address} onChange={(e) => setForm({...form, address:e.target.value})} className={`w-full ${input}`} /><input required placeholder="Contact person" value={form.contactName} onChange={(e) => setForm({...form, contactName:e.target.value})} className={`w-full ${input}`} /><input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({...form, phone:e.target.value})} className={`w-full ${input}`} /><input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email:e.target.value})} className={`w-full ${input}`} /><button className="w-full rounded-lg bg-blue-700 py-2.5 font-medium text-white">Register facility</button></div></form>
    <section className="overflow-hidden rounded-xl bg-white shadow-sm"><div className="border-b px-5 py-4 font-semibold">Registered facilities</div>{loading ? <p className="p-6 text-slate-500">Loading…</p> : hospitals.length === 0 ? <p className="p-6 text-slate-500">No hospitals registered.</p> : <div className="divide-y">{hospitals.map((hospital) => <article key={hospital.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center"><div className="rounded-lg bg-blue-50 p-3 text-blue-700"><Building2 /></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{hospital.name}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${hospital.status === "INACTIVE" ? "bg-slate-100" : "bg-emerald-100 text-emerald-700"}`}>{hospital.status || "ACTIVE"}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${linkStates[hospital.id] ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>{linkStates[hospital.id] ? "Portal link active" : "Link revoked / not generated"}</span></div><p className="text-sm text-slate-500">{hospital.code} · {hospital.contactName} · {hospital.phone}</p></div><div className="flex gap-2"><button onClick={() => generate(hospital)} className="flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm text-white"><Link2 size={16} />{linkStates[hospital.id] ? "Replace link" : "Generate new link"}</button>{linkStates[hospital.id] && <button onClick={() => revoke(hospital)} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700"><ShieldOff size={16} />Revoke link</button>}</div></article>)}</div>}</section></div></div>
  </main></div>;
}
