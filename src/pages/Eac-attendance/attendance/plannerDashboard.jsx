import { useState, useEffect } from "react";

const PlannerDashboard = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plannerNotes, setPlannerNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState([]); // NEW: track selected checkboxes

  const getToken = () => localStorage.getItem("jwtToken");

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch("http://localhost:8080/api/leave/planner", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch planner leave requests");
        const data = await response.json();
        const approvedBySupervisor = data.filter(
          (req) => req.supervisorStatus === "Approved" && req.plannerStatus === "Pending"
        );
        setLeaveRequests(approvedBySupervisor);
      } catch (err) {
        console.error("Error fetching planner leave requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveRequests();
  }, []);

  const toggleCheckbox = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === leaveRequests.length) {
      setSelectedIds([]); // unselect all
    } else {
      setSelectedIds(leaveRequests.map((req) => req.id));
    }
  };

  const openRequestDetails = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    setPlannerNotes("");
  };

  const handleDecision = async (decision, ids = null) => {
    const targetIds = ids || [selectedRequest.id];
    if (decision === "Rejected" && !plannerNotes && !ids) {
      alert("Please provide notes when rejecting a request");
      return;
    }

    try {
      const token = getToken();
      for (const id of targetIds) {
        const endpoint = `http://localhost:8080/api/leave/planner/${decision.toLowerCase()}/${id}`;
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            feedback: plannerNotes || "Bulk decision by planner",
          }),
        });
      }

      setLeaveRequests((prev) => prev.filter((req) => !targetIds.includes(req.id)));
      setSelectedIds([]);
      if (!ids) {
        alert(`Leave request ${decision.toLowerCase()} successfully`);
        setIsModalOpen(false);
        setSelectedRequest(null);
      } else {
        alert(`Selected requests ${decision.toLowerCase()} successfully`);
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      alert(error.message || "Failed to update leave request");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Planner Dashboard</h1>
          <p className="text-gray-600">Review supervisor-approved leave requests</p>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg inline-block mt-4">
            <span className="font-bold">{leaveRequests.length}</span> Pending Requests
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="mb-4 flex space-x-3">
            <button
              onClick={() => handleDecision("Approved", selectedIds)}
              className="px-4 py-2 bg-green-600 text-white rounded-md"
            >
              Approve Selected ({selectedIds.length})
            </button>
            <button
              onClick={() => handleDecision("Rejected", selectedIds)}
              className="px-4 py-2 bg-red-600 text-white rounded-md"
            >
              Reject Selected ({selectedIds.length})
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading leave requests...</div>
          ) : leaveRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No supervisor-approved leave requests pending planner review
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === leaveRequests.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Supervisor Feedback
                  </th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(request.id)}
                        onChange={() => toggleCheckbox(request.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      {request.employee?.firstName} {request.employee?.lastName}
                    </td>
                    <td className="px-6 py-4">{request.leaveType}</td>
                    <td className="px-6 py-4">
                      {new Date(request.startDate).toLocaleDateString()} -{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                      {request.supervisorFeedback || "No feedback provided"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openRequestDetails(request)}
                        className="text-blue-600 hover:text-blue-900"
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
              <h2 className="text-xl font-bold mb-4">Planner Review</h2>

              <div className="space-y-3 mb-4">
                <p>
                  <strong>Employee:</strong> {selectedRequest.employee?.firstName}{" "}
                  {selectedRequest.employee?.lastName}
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
                <p>
                  <strong>Supervisor Feedback:</strong>{" "}
                  {selectedRequest.supervisorFeedback || "No feedback"}
                </p>
              </div>

              <textarea
                value={plannerNotes}
                onChange={(e) => setPlannerNotes(e.target.value)}
                placeholder="Planner feedback (required if rejecting)"
                className="w-full border rounded-md p-2 mt-4 h-20"
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision("Rejected")}
                  className="px-4 py-2 bg-red-600 text-white rounded-md"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleDecision("Approved")}
                  className="px-4 py-2 bg-green-600 text-white rounded-md"
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

export default PlannerDashboard;
