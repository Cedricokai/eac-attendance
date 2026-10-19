import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiBriefcase, FiCheckCircle, FiFileText, FiHash, FiMail, FiPhone, FiSend, FiUser } from "react-icons/fi";
import { apiFetch } from "../../utils/api";

const initialForm = { fullName: "", employeeId: "", department: "", workEmail: "", mobile: "", accessReason: "" };

function SignupPage() {
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const handleChange = ({ target: { name, value } }) => setFormData((current) => ({ ...current, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiFetch("/auth/account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName.trim(), employeeId: formData.employeeId.trim(),
          department: formData.department.trim(), workEmail: formData.workEmail.trim().toLowerCase(),
          mobile: formData.mobile.trim(), accessReason: formData.accessReason.trim(),
        }),
      });
      setConfirmation({ reference: result?.reference || result?.requestNumber || result?.id, email: formData.workEmail.trim() });
      setFormData(initialForm);
      toast.success("Account request submitted for approval");
    } catch (submitError) {
      const message = submitError.message || "Unable to submit your request. Please contact IT support.";
      setError(message);
      toast.error(message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-center bg-cover opacity-70 pointer-events-none" style={{ backgroundImage: "url('/electrical-engineering-bg.svg')" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-white/70 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-5xl w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden grid lg:grid-cols-[0.8fr_1.2fr] border border-white">
        <aside className="bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-800 p-8 lg:p-10 text-white relative overflow-hidden">
          <img src="/electrical-engineering-bg.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" aria-hidden="true" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-7 border border-white/20"><FiUser className="text-3xl" /></div>
            <h1 className="text-3xl font-bold">Request portal access</h1>
            <p className="mt-4 text-blue-100 leading-relaxed">Submit your employee details for verification. An administrator will assign the correct access after approval.</p>
            <ol className="mt-8 space-y-5 text-sm text-blue-50">
              {["Submit your work details", "HR or IT verifies your request", "Receive a secure account setup link"].map((step, index) => (
                <li key={step} className="flex gap-3 items-start"><span className="flex-none w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-bold">{index + 1}</span><span className="pt-1">{step}</span></li>
              ))}
            </ol>
            <p className="mt-9 pt-6 border-t border-white/20 text-xs text-blue-100">You will never be asked to choose your role or send a password in this form.</p>
          </div>
        </aside>
        <main className="p-7 sm:p-10">
          {confirmation ? (
            <div className="min-h-[480px] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"><FiCheckCircle className="text-4xl text-emerald-600" /></div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Request received</h2>
              <p className="mt-3 max-w-md text-gray-600">Your request is pending verification. Account setup instructions will be sent to <strong>{confirmation.email}</strong> after approval.</p>
              {confirmation.reference && <p className="mt-5 rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-3 text-sm text-indigo-800">Reference: <strong>{confirmation.reference}</strong></p>}
              <Link to="/" className="mt-8 inline-flex items-center text-indigo-700 hover:text-indigo-900 font-semibold"><FiArrowLeft className="mr-2" /> Return to login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Account request</h2>
              <p className="mt-2 text-sm text-gray-600">Use your official employee and contact information.</p>
              {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field icon={FiUser} label="Full name" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="As shown in HR records" autoComplete="name" />
                  <Field icon={FiHash} label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="e.g. EAC-0123" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field icon={FiBriefcase} label="Department" name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Electrical Engineering" />
                  <Field icon={FiPhone} label="Mobile number" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Official contact number" type="tel" autoComplete="tel" />
                </div>
                <Field icon={FiMail} label="Work email" name="workEmail" value={formData.workEmail} onChange={handleChange} placeholder="name@company.com" type="email" autoComplete="email" />
                <label className="block"><span className="block text-sm font-medium text-gray-700 mb-2">Reason for access</span><div className="flex border border-gray-300 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200"><FiFileText className="text-gray-400 mt-1 mr-3 flex-none" /><textarea name="accessReason" value={formData.accessReason} onChange={handleChange} rows="3" minLength="10" maxLength="500" required className="w-full resize-none outline-none bg-transparent text-gray-800" placeholder="Briefly explain which portal services you need" /></div></label>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 px-4 text-white font-semibold shadow-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"><span className="flex items-center justify-center"><FiSend className="mr-2" />{loading ? "Submitting request..." : "Submit for approval"}</span></button>
                <Link to="/" className="inline-flex items-center text-sm text-indigo-700 hover:text-indigo-900 font-medium"><FiArrowLeft className="mr-2" /> Back to login</Link>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, ...inputProps }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-2">{label}</span><div className="flex items-center border border-gray-300 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200"><Icon className="text-gray-400 mr-3 flex-none" /><input {...inputProps} required className="w-full min-w-0 outline-none bg-transparent text-gray-800 placeholder-gray-400" /></div></label>;
}

export default SignupPage;
