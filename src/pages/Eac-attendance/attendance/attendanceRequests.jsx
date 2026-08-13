import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, FileCheck, RefreshCw, Search, XCircle } from "lucide-react";
import PropTypes from "prop-types";
import MainSidebar from "../mainSidebar";
import Header from "../../../components/Header";

const today = () => new Date().toISOString().slice(0, 10);

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
  if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

const formatTime = (value) => value && value.length === 5 ? `${value}:00` : value;
const displayTime = (value) => value ? String(value).slice(0, 5) : "--:--";

function AttendanceRequests({ reviewMode = false }) {
  const API_BASE_URL = getApiBaseUrl();
  const tab = reviewMode ? "review" : "request";
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [requests, setRequests] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState("Pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    date: today(),
    checkIn: "",
    checkOut: "",
    shift: "Day",
    reason: "",
    evidenceReference: ""
  });

  const token = () => localStorage.getItem("jwtToken");
  const headers = () => ({ Authorization: `Bearer ${token()}`, "Content-Type": "application/json" });

  const parseError = async (response, fallback) => {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.message || data.error || fallback);
    } catch (parseFailure) {
      if (parseFailure instanceof SyntaxError) throw new Error(text || fallback);
      throw parseFailure;
    }
  };

  const fetchEmployees = async () => {
    const response = await fetch(`${API_BASE_URL}/api/employee`, { headers: headers() });
    if (!response.ok) return parseError(response, "Could not load employees");
    setEmployees(await response.json());
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filter && filter !== "All") params.set("status", filter);
      const response = await fetch(`${API_BASE_URL}/api/attendance-requests?${params}`, { headers: headers() });
      if (!response.ok) await parseError(response, "Could not load attendance requests");
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : (data.content || []));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token()}` },
          credentials: "include"
        });
        if (!response.ok) return;
        const data = await response.json();
        setUser({
          name: data.username || data.name,
          role: String(data.role || data.roles?.[0] || "employee").replace("ROLE_", "").toLowerCase(),
          email: data.email
        });
      } catch (userError) {
        console.warn("Could not load current user:", userError);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (tab === "review") fetchRequests();
  }, [tab, filter]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (selectedEmployeeIds.size === 0 || !form.date || !form.checkIn || !form.checkOut || !form.reason.trim()) {
      setError("Select at least one employee and enter the date, check-in, check-out, and reason.");
      return;
    }
    if (form.checkOut <= form.checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setLoading(true);
    try {
      const sharedRequest = {
        date: form.date,
        checkIn: formatTime(form.checkIn),
        checkOut: formatTime(form.checkOut),
        shift: form.shift,
        reason: form.reason.trim(),
        evidenceReference: form.evidenceReference.trim() || null
      };
      const response = await fetch(`${API_BASE_URL}/api/attendance-requests/batch`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          requests: [...selectedEmployeeIds].map((employeeId) => ({
            ...sharedRequest,
            employeeId: Number(employeeId)
          }))
        })
      });
      if (!response.ok) await parseError(response, "Attendance requests could not be submitted");
      const count = selectedEmployeeIds.size;
      setForm({ date: today(), checkIn: "", checkOut: "", shift: "Day", reason: "", evidenceReference: "" });
      setSelectedEmployeeIds(new Set());
      setEmployeeSearch("");
      setSuccess(`${count} attendance request${count === 1 ? "" : "s"} submitted for verification. They are not yet attendance records.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const review = async (ids, action) => {
    if (!ids.length) return;
    const rejectionReason = action === "reject" ? window.prompt("Reason for rejection:") : null;
    if (action === "reject" && !rejectionReason?.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance-requests/${action === "verify" ? "verify" : "reject"}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ requestIds: ids, rejectionReason: rejectionReason?.trim() || null })
      });
      if (!response.ok) await parseError(response, `Could not ${action} request`);
      setSuccess(action === "verify"
        ? `${ids.length} request${ids.length === 1 ? "" : "s"} verified. Open the Verified filter to add them to attendance records.`
        : `${ids.length} request${ids.length === 1 ? "" : "s"} rejected.`);
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAttendanceRecords = async (items, shouldAdd) => {
    if (!items.length) return;
    if (!shouldAdd && !window.confirm(`Remove ${items.length} linked attendance record${items.length === 1 ? "" : "s"}? The requests will remain verified.`)) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = shouldAdd ? "add-to-attendance" : "remove-from-attendance";
      const response = await fetch(`${API_BASE_URL}/api/attendance-requests/${endpoint}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ requestIds: items.map((item) => item.id) })
      });
      if (!response.ok) await parseError(response, shouldAdd ? "Could not add attendance record" : "Could not remove attendance record");
      setSuccess(shouldAdd
        ? `${items.length} verified request${items.length === 1 ? "" : "s"} added to attendance records.`
        : `${items.length} attendance record${items.length === 1 ? "" : "s"} removed. The requests remain verified.`);
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const visibleRequests = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((item) => {
      const name = item.employeeName || `${item.employee?.firstName || ""} ${item.employee?.lastName || ""}`;
      return [name, item.employee?.employeeId, item.date, item.reason].filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [requests, query]);

  const visibleEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) => [
      employee.firstName,
      employee.lastName,
      employee.employeeId,
      employee.department,
      employee.category?.name || employee.category
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [employees, employeeSearch]);

  const toggleEmployee = (employeeId) => setSelectedEmployeeIds((current) => {
    const next = new Set(current);
    next.has(employeeId) ? next.delete(employeeId) : next.add(employeeId);
    return next;
  });

  const allVisibleEmployeesSelected = visibleEmployees.length > 0
    && visibleEmployees.every((employee) => selectedEmployeeIds.has(employee.id));

  const toggleAllVisibleEmployees = () => setSelectedEmployeeIds((current) => {
    const next = new Set(current);
    if (allVisibleEmployeesSelected) {
      visibleEmployees.forEach((employee) => next.delete(employee.id));
    } else {
      visibleEmployees.forEach((employee) => next.add(employee.id));
    }
    return next;
  });

  const selectedRequests = visibleRequests.filter((item) => selectedIds.has(item.id));
  const selectedPendingRequests = selectedRequests.filter((item) => (item.status || "Pending") === "Pending");
  const selectedVerifiedNotAdded = selectedRequests.filter((item) => item.status === "Verified" && !item.attendanceId);
  const selectedVerifiedAdded = selectedRequests.filter((item) => item.status === "Verified" && item.attendanceId);
  const selectableVisibleRequests = visibleRequests.filter((item) => (item.status || "Pending") === "Pending" || item.status === "Verified");
  const allSelectableVisibleSelected = selectableVisibleRequests.length > 0
    && selectableVisibleRequests.every((item) => selectedIds.has(item.id));

  const toggleAllSelectableVisible = () => setSelectedIds((current) => {
    const next = new Set(current);
    if (allSelectableVisibleSelected) {
      selectableVisibleRequests.forEach((item) => next.delete(item.id));
    } else {
      selectableVisibleRequests.forEach((item) => next.add(item.id));
    }
    return next;
  });

  const toggle = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const statusClass = (status) => ({
    Pending: "bg-amber-100 text-amber-800",
    Verified: "bg-emerald-100 text-emerald-800",
    Approved: "bg-emerald-100 text-emerald-800",
    Rejected: "bg-red-100 text-red-800"
  }[status] || "bg-gray-100 text-gray-700");

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: headers(),
        credentials: "include"
      });
    } finally {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      navigate("/");
    }
  };

  return (
    <div className="relative flex min-h-screen bg-gray-50 text-gray-800">
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-md transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:w-16 md:translate-x-0"}`}>
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>
      {sidebarOpen && <button type="button" aria-label="Close sidebar" className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className={`min-w-0 flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0 md:ml-16"}`}>
        <main className="mx-auto px-4 pb-20 pt-6 md:px-6">
          <Header toggleSidebar={() => setSidebarOpen((open) => !open)} user={user} onLogout={handleLogout} />
          <div className="mx-auto mt-6 max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/attendance"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Attendance
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{reviewMode ? "Verify Attendance Requests" : "Attendance Request"}</h1>
            <p className="mt-1 text-sm text-gray-600">{reviewMode ? "Review pending submissions before they become attendance records." : "Submit a missing or corrected attendance entry for verification."}</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {tab === "request" ? (
          <form onSubmit={submitRequest} className="max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" />
              <span>This submission remains pending and is excluded from attendance, timesheets, and payroll until verified.</span>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <label className="block flex-1 text-sm font-medium text-gray-700">
                    Select employees
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="search"
                        value={employeeSearch}
                        onChange={(event) => setEmployeeSearch(event.target.value)}
                        placeholder="Search by name, employee ID, department, or category"
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3"
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={toggleAllVisibleEmployees}
                    disabled={visibleEmployees.length === 0}
                    className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {allVisibleEmployeesSelected ? "Clear visible" : "Select all visible"}
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                  {visibleEmployees.map((employee) => {
                    const category = employee.category?.name || employee.category;
                    return (
                      <label key={employee.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-blue-50">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.has(employee.id)}
                          onChange={() => toggleEmployee(employee.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">{employee.firstName} {employee.lastName}</span>
                          <span className="block truncate text-xs text-gray-500">
                            {[employee.employeeId, employee.department, category].filter(Boolean).join(" · ") || "No additional employee details"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {visibleEmployees.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-500">No employees match your search.</p>}
                </div>
                <div className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${selectedEmployeeIds.size > 0 ? "bg-blue-50 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                  {selectedEmployeeIds.size} employee{selectedEmployeeIds.size === 1 ? "" : "s"} selected
                </div>
              </div>
              <label className="text-sm font-medium text-gray-700">Attendance date
                <input type="date" value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required />
              </label>
              <label className="text-sm font-medium text-gray-700">Check-in
                <input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required />
              </label>
              <label className="text-sm font-medium text-gray-700">Check-out
                <input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required />
              </label>
              <label className="text-sm font-medium text-gray-700">Shift
                <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option>Day</option><option>Night</option></select>
              </label>
              <label className="text-sm font-medium text-gray-700">Evidence reference (optional)
                <input value={form.evidenceReference} onChange={(e) => setForm({ ...form, evidenceReference: e.target.value })} placeholder="Job card, site log, or document ID" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-gray-700 md:col-span-2">Reason for manual attendance
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={4} maxLength={1000} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required />
              </label>
            </div>
            <button disabled={loading || selectedEmployeeIds.size === 0} className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Submitting..." : `Submit ${selectedEmployeeIds.size || ""} request${selectedEmployeeIds.size === 1 ? "" : "s"} for verification`}
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center">
              <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee, date, or reason" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3" /></div>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2"><option>Pending</option><option>Verified</option><option>Rejected</option><option>All</option></select>
              <button onClick={fetchRequests} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
              {selectedPendingRequests.length > 0 && <><button onClick={() => review(selectedPendingRequests.map((item) => item.id), "verify")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white">Verify selected ({selectedPendingRequests.length})</button><button onClick={() => review(selectedPendingRequests.map((item) => item.id), "reject")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">Reject selected ({selectedPendingRequests.length})</button></>}
              {selectedVerifiedNotAdded.length > 0 && <button onClick={() => updateAttendanceRecords(selectedVerifiedNotAdded, true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Add selected to Attendance Records ({selectedVerifiedNotAdded.length})</button>}
              {selectedVerifiedAdded.length > 0 && <button onClick={() => updateAttendanceRecords(selectedVerifiedAdded, false)} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">Remove selected from Attendance Records ({selectedVerifiedAdded.length})</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3"><input type="checkbox" aria-label="Select all visible requests" disabled={selectableVisibleRequests.length === 0} checked={allSelectableVisibleSelected} onChange={toggleAllSelectableVisible} /></th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Reason / evidence</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleRequests.map((item) => {
                    const employeeName = item.employeeName || `${item.employee?.firstName || ""} ${item.employee?.lastName || ""}`.trim();
                    const pending = (item.status || "Pending") === "Pending";
                    return <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><input type="checkbox" disabled={!pending && item.status !== "Verified"} checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} /></td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{employeeName || `Employee #${item.employeeId}`}</td>
                      <td className="whitespace-nowrap px-4 py-3">{item.date}</td>
                      <td className="whitespace-nowrap px-4 py-3">{displayTime(item.checkIn)} – {displayTime(item.checkOut)}</td>
                      <td className="max-w-xs px-4 py-3"><div className="truncate">{item.reason}</div>{item.evidenceReference && <div className="text-xs text-gray-500">Ref: {item.evidenceReference}</div>}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(item.status || "Pending")}`}>{item.status || "Pending"}</span>{item.attendanceId ? <div className="mt-1 text-xs font-medium text-emerald-700">In attendance · #{item.attendanceId}</div> : item.status === "Verified" ? <div className="mt-1 text-xs font-medium text-amber-700">Not yet in attendance</div> : null}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {pending && <div className="flex justify-end gap-2"><button title="Verify request" onClick={() => review([item.id], "verify")} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle className="h-5 w-5" /></button><button title="Reject" onClick={() => review([item.id], "reject")} className="rounded-md p-2 text-red-700 hover:bg-red-50"><XCircle className="h-5 w-5" /></button></div>}
                        {item.status === "Verified" && !item.attendanceId && <button onClick={() => updateAttendanceRecords([item], true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"><FileCheck className="h-4 w-4" />Add to Attendance Records</button>}
                        {item.status === "Verified" && item.attendanceId && <button onClick={() => updateAttendanceRecords([item], false)} className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"><XCircle className="h-4 w-4" />Remove from Attendance Records</button>}
                      </td>
                    </tr>;
                  })}
                  {!loading && visibleRequests.length === 0 && <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-500"><FileCheck className="mx-auto mb-2 h-8 w-8" />No attendance requests found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AttendanceRequests;

AttendanceRequests.propTypes = {
  reviewMode: PropTypes.bool
};
