import { useState, useEffect } from "react";

const SupervisorDashboard = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supervisorNotes, setSupervisorNotes] = useState("");
  const [error, setError] = useState("");

  // Checklist state
  const [validationChecks, setValidationChecks] = useState({
    workloadCoverage: false,
    leavePolicy: false,
    pastBehavior: false,
    documentsVerified: false,
  });

  const getToken = () => localStorage.getItem("jwtToken");

   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';


  useEffect(() => {
    const fetchSupervisorRequests = async () => {
      try {
        setError("");
        const token = getToken();
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`${API_BASE_URL}/api/leave/supervisor`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        if (response.status === 404) {
          throw new Error("Supervisor endpoint not found. Please check backend API.");
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Ensure data is an array
        const requestsArray = Array.isArray(data) ? data : [];
        
        setLeaveRequests(requestsArray);
        setFilteredRequests(requestsArray);

      } catch (error) {
        console.error("Error fetching supervisor requests:", error);
        setError(error.message);
        setLeaveRequests([]);
        setFilteredRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    if (!Array.isArray(leaveRequests)) {
      setFilteredRequests([]);
      return;
    }

    let filtered = leaveRequests;
    
    // Status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((req) => {
        if (statusFilter === "Pending") return req.supervisorStatus === "Pending";
        if (statusFilter === "Approved") return req.supervisorStatus === "Approved";
        if (statusFilter === "Rejected") return req.supervisorStatus === "Rejected";
        return true;
      });
    }
    
    // Leave type filter
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
          ? `${API_BASE_URL}/api/leave/supervisor/approve/${selectedRequest.id}`
          : `${API_BASE_URL}/api/leave/supervisor/reject/${selectedRequest.id}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback: supervisorNotes,
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
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update leave request");
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      alert(`Failed to update leave request: ${error.message}`);
    }
  };

  // Statistics
  const pendingCount = leaveRequests.filter(req => req.supervisorStatus === "Pending").length;
  const approvedCount = leaveRequests.filter(req => req.supervisorStatus === "Approved").length;
  const rejectedCount = leaveRequests.filter(req => req.supervisorStatus === "Rejected").length;

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "Approved":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Rejected":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "Pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

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

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Statistics */}
          <div className="flex flex-wrap items-center mt-4 gap-4">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <span className="font-bold">{pendingCount}</span> Pending Requests
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              <span className="font-bold">{approvedCount}</span> Approved
            </div>
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
              <span className="font-bold">{rejectedCount}</span> Rejected
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
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading leave requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {error ? "Error loading requests" : "No matching leave requests found"}
            </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{request.leaveType}</div>
                      <div className="text-sm text-gray-500">{request.reason}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(request.startDate).toLocaleDateString()} -{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                      <div className="text-xs text-gray-400 mt-1">
                        {Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(request.supervisorStatus)}>
                        {request.supervisorStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {request.supervisorStatus === "Pending" && (
                        <button
                          onClick={() => openRequestDetails(request)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Review
                        </button>
                      )}
                      {request.supervisorStatus !== "Pending" && (
                        <span className="text-gray-400 text-sm">Reviewed</span>
                      )}
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
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
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
                  <strong>Duration:</strong>{" "}
                  {Math.ceil((new Date(selectedRequest.endDate) - new Date(selectedRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                </p>
                <p>
                  <strong>Reason:</strong> {selectedRequest.reason}
                </p>
              </div>

              {/* Checklist */}
              <div className="space-y-3 mb-4">
                <h3 className="font-semibold mb-2">Validation Checklist</h3>
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
                      className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm">{label}</label>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisor Notes {<span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  placeholder="Enter your feedback or notes (required if rejecting)"
                  className="w-full border border-gray-300 rounded-md p-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Required when rejecting a request</p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision("Rejected")}
                  disabled={!supervisorNotes}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleDecision("Approved")}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
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