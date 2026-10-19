import { useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, CheckCircle2, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { medicalVisitApi } from "../../../services/medicalVisitApi";

const initialForm = {
  employeeId: "", visitDate: new Date().toISOString().slice(0, 10), arrivalTime: "",
  dischargeTime: "", visitType: "OUTPATIENT", requiresExcuseDuty: false,
  excuseStartDate: "", excuseEndDate: "", fitToReturn: true, followUpDate: "",
  hospitalReference: "", remarks: "", submittedByName: "", submittedByContact: "",
};

export default function HospitalPublicForm() {
  const { token } = useParams();
  const [tagNumber, setTagNumber] = useState("");
  const [employee, setEmployee] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [linkUnavailable, setLinkUnavailable] = useState(false);

  const handlePortalError = (error, fallback) => {
    const text = error.message || fallback;
    if (/invalid|revoked|inactive|expired/i.test(text)) setLinkUnavailable(true);
    setMessage({ type: "error", text });
  };

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const findEmployee = async (event) => {
    event.preventDefault();
    if (!tagNumber.trim()) return;
    setBusy(true); setEmployee(null); setMessage({ type: "", text: "" });
    try {
      const found = await medicalVisitApi.lookupEmployee(token, tagNumber.trim());
      setEmployee(found);
      setForm((current) => ({ ...current, employeeId: found.id }));
    } catch (error) {
      handlePortalError(error, "Employee not found.");
    } finally { setBusy(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!employee) return setMessage({ type: "error", text: "Look up and confirm an employee first." });
    if (form.requiresExcuseDuty && (!form.excuseStartDate || !form.excuseEndDate)) {
      return setMessage({ type: "error", text: "Enter both excuse-duty dates." });
    }
    setBusy(true); setMessage({ type: "", text: "" });
    try {
      const saved = await medicalVisitApi.submitPublicVisit(token, form);
      if (file) await medicalVisitApi.uploadPublicAttachment(token, saved.id, file);
      setMessage({ type: "success", text: `Visit submitted successfully. Reference: ${saved.referenceNumber || saved.id}` });
      setEmployee(null); setTagNumber(""); setForm(initialForm); setFile(null);
    } catch (error) {
      handlePortalError(error, "Submission failed.");
    } finally { setBusy(false); }
  };

  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  if (linkUnavailable) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <main className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700"><ShieldCheck size={32} /></div>
        <h1 className="text-2xl font-bold text-slate-900">Hospital portal link inactive</h1>
        <p className="mt-3 text-slate-600">This link has been revoked, replaced, or is no longer valid. No employee information can be accessed and no visits can be submitted through it.</p>
        <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">Please contact EAC HR for a new hospital portal link.</p>
      </main>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <main className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="bg-gradient-to-r from-blue-800 to-cyan-700 px-6 py-7 text-white">
          <div className="flex items-center gap-3"><Stethoscope size={34} /><div><h1 className="text-2xl font-bold">Hospital Visit Submission</h1><p className="text-sm text-blue-100">EAC employee medical attendance portal</p></div></div>
        </header>
        <div className="p-6 md:p-8">
          <div className="mb-6 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><ShieldCheck className="shrink-0" /><p>Use this form only for employees who attended this facility. Submitted records remain pending until HR verifies them.</p></div>
          {message.text && <div className={`mb-5 rounded-lg p-4 ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{message.text}</div>}
          <form onSubmit={findEmployee} className="mb-7 flex flex-col gap-3 sm:flex-row">
            <input value={tagNumber} onChange={(e) => setTagNumber(e.target.value)} placeholder="Employee tag number" className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5" />
            <button disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white disabled:opacity-50"><Search size={18} />Find employee</button>
          </form>
          {employee && <div className="mb-7 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="text-emerald-600" /><div><p className="font-semibold text-slate-900">{employee.displayName || `${employee.firstName || ""} ${employee.lastName || ""}`}</p><p className="text-sm text-slate-600">{employee.tagNumber || tagNumber}{employee.department ? ` · ${employee.department}` : ""}</p></div></div>}
          <form onSubmit={submit} className="space-y-7">
            <section><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Building2 size={20} />Visit information</h2><div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium">Visit date *<input required type="date" name="visitDate" value={form.visitDate} onChange={update} className={inputClass} /></label>
              <label className="text-sm font-medium">Arrival time<input type="time" name="arrivalTime" value={form.arrivalTime} onChange={update} className={inputClass} /></label>
              <label className="text-sm font-medium">Discharge time<input type="time" name="dischargeTime" value={form.dischargeTime} onChange={update} className={inputClass} /></label>
              <label className="text-sm font-medium">Visit type *<select name="visitType" value={form.visitType} onChange={update} className={inputClass}><option value="OUTPATIENT">Outpatient</option><option value="EMERGENCY">Emergency</option><option value="ADMISSION">Admission</option><option value="FOLLOW_UP">Follow-up</option></select></label>
              <label className="text-sm font-medium">Hospital reference<input name="hospitalReference" value={form.hospitalReference} onChange={update} className={inputClass} /></label>
              <label className="text-sm font-medium">Follow-up date<input type="date" name="followUpDate" value={form.followUpDate} onChange={update} className={inputClass} /></label>
            </div></section>
            <section className="rounded-xl bg-slate-50 p-5"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" name="requiresExcuseDuty" checked={form.requiresExcuseDuty} onChange={update} className="h-5 w-5" />Employee requires excuse duty</label>{form.requiresExcuseDuty && <div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">From *<input required type="date" name="excuseStartDate" value={form.excuseStartDate} onChange={update} className={inputClass} /></label><label className="text-sm font-medium">Until *<input required type="date" min={form.excuseStartDate} name="excuseEndDate" value={form.excuseEndDate} onChange={update} className={inputClass} /></label></div>}<label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" name="fitToReturn" checked={form.fitToReturn} onChange={update} />Fit to return to work after the stated period</label></section>
            <section className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Hospital staff name *<input required name="submittedByName" value={form.submittedByName} onChange={update} className={inputClass} /></label><label className="text-sm font-medium">Staff contact *<input required name="submittedByContact" value={form.submittedByContact} onChange={update} className={inputClass} /></label><label className="text-sm font-medium md:col-span-2">General remarks<textarea name="remarks" rows="3" value={form.remarks} onChange={update} className={inputClass} /></label><label className="text-sm font-medium md:col-span-2">Supporting document (PDF or image)<input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className={inputClass} /></label></section>
            <button disabled={busy || !employee} className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting…" : "Submit for HR verification"}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
