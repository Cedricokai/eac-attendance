import { useState, useEffect } from "react";

const SupervisorDashboard = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supervisorNotes, setSupervisorNotes] = useState("");

  // Checklist state
  const [validationChecks, setValidationChecks] = useState({
    workloadCoverage: false,
    leavePolicy: false,
    pastBehavior: false,
    documentsVerified: false,
  });

  const getToken = () => localStorage.getItem("jwtToken");

  // Fetch leave requests
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch("http://localhost:8080/api/leave/supervisor", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch leave requests");
        const data = await response.json();
        // Only pending requests for Supervisor
        const pendingLeaves = data.filter(req => req.supervisorStatus === "Pending");
        setLeaveRequests(pendingLeaves);
        setFilteredRequests(pendingLeaves);
      } catch (error) {
        console.error("Error fetching leave requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaveRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = leaveRequests;
    if (statusFilter !== "All") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }
    if (leaveTypeFilter !== "All") {
      filtered = filtered.filter((req) => req.leaveType === leaveTypeFilter);
    }
    setFilteredRequests(filtered);
  }, [statusFilter, leaveTypeFilter, leaveRequests]);

  const leaveTypes = [
    "Annual Leave",
    "Sick Leave",
    "Casual Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Unpaid Leave",
    "Study Leave",
    "Compassionate Leave",
    "Public Holiday",
    "Sabbatical Leave",
  ];

  const handleCheckboxChange = (check) => {
    setValidationChecks((prev) => ({ ...prev, [check]: !prev[check] }));
  };

  const openRequestDetails = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    setValidationChecks({
      workloadCoverage: false,
      leavePolicy: false,
      pastBehavior: false,
      documentsVerified: false,
    });
    setSupervisorNotes("");
  };

  const handleDecision = async (decision) => {
    if (decision === "Rejected" && !supervisorNotes) {
      alert("Please provide notes when rejecting a request");
      return;
    }

    try {
      const token = getToken();
      const endpoint =
        decision === "Approved"
          ? `http://localhost:8080/api/leave/supervisor/approve/${selectedRequest.id}`
          : `http://localhost:8080/api/leave/reject/${selectedRequest.id}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback: supervisorNotes,
          role: "supervisor",
        }),
      });

      if (response.ok) {
        const updatedLeave = await response.json();
        setLeaveRequests((prev) =>
          prev.map((req) => (req.id === selectedRequest.id ? updatedLeave : req))
        );
        alert(`Leave request ${decision.toLowerCase()} successfully`);
        setIsModalOpen(false);
        setSelectedRequest(null);
      } else {
        throw new Error("Failed to update leave request");
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      alert("Failed to update leave request");
    }
  };

  const pendingCount = leaveRequests.filter((req) => req.status === "Pending").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Supervisor Leave Management Dashboard
          </h1>
          <p className="text-gray-600">
            Review team leave requests and recommend approval or rejection
          </p>

          <div className="flex flex-wrap items-center mt-4 gap-4">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <span className="font-bold">{pendingCount}</span> Pending Requests
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by leave type:
              </label>
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="All">All Leave Types</option>
                {leaveTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading leave requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No matching leave requests</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-700 font-medium">
                            {request.employee?.firstName?.charAt(0)}
                            {request.employee?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.employee?.firstName} {request.employee?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.employee?.employeeId || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{request.leaveType}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(request.startDate).toLocaleDateString()} -{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === "Approved"
                            ? "bg-green-100 text-green-800"
                            : request.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openRequestDetails(request)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
              <h2 className="text-xl font-bold mb-4">Supervisor Review</h2>

              {/* Employee Info */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Employee Information</h3>
                <p>
                  <strong>Name:</strong> {selectedRequest.employee?.firstName}{" "}
                  {selectedRequest.employee?.lastName}
                </p>
                <p>
                  <strong>ID:</strong> {selectedRequest.employee?.employeeId || "N/A"}
                </p>
                <p>
                  <strong>Leave Type:</strong> {selectedRequest.leaveType}
                </p>
                <p>
                  <strong>Dates:</strong>{" "}
                  {new Date(selectedRequest.startDate).toLocaleDateString()} -{" "}
                  {new Date(selectedRequest.endDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Reason:</strong> {selectedRequest.reason}
                </p>
              </div>

              {/* Checklist */}
              <div className="space-y-3 mb-4">
                {Object.entries({
                  workloadCoverage: "Team workload can be covered",
                  leavePolicy: "Leave request follows policy",
                  pastBehavior: "No concerning leave patterns",
                  documentsVerified: "Supporting documents provided (if required)",
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={validationChecks[key]}
                      onChange={() => handleCheckboxChange(key)}
                      className="mr-2"
                    />
                    <label>{label}</label>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <textarea
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                placeholder="Supervisor notes (required if rejecting)"
                className="w-full border rounded-md p-2 mb-4 h-20"
              />

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision("Rejected")}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleDecision("Approved")}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;
