import { useState, useEffect } from "react";

const HRDashboard = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hrNotes, setHrNotes] = useState("");

  const getToken = () => localStorage.getItem("jwtToken");

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch("http://localhost:8080/api/leave/hr", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch HR leave requests");
        const data = await response.json();
        // Only planner-approved leaves
        const approvedByPlanner = data.filter(req => req.plannerStatus === "Approved" && req.hrStatus === "Pending");
        setLeaveRequests(approvedByPlanner);
      } catch (err) {
        console.error("Error fetching HR leave requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaveRequests();
  }, []);

  const openRequestDetails = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    setHrNotes("");
  };

  const handleDecision = async (decision) => {
    if (decision === "Rejected" && !hrNotes) {
      alert("Please provide notes when rejecting a request");
      return;
    }

    try {
      const token = getToken();
      const endpoint = `http://localhost:8080/api/leave/hr/${decision.toLowerCase()}/${selectedRequest.id}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback: hrNotes,
        }),
      });

      if (response.ok) {
        setLeaveRequests((prev) =>
          prev.filter((req) => req.id !== selectedRequest.id)
        );
        alert(`Leave request ${decision.toLowerCase()} successfully`);
        setIsModalOpen(false);
        setSelectedRequest(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update leave request");
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            HR Leave Management Dashboard
          </h1>
          <p className="text-gray-600">Final review of planner-approved leave requests</p>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg inline-block mt-4">
            <span className="font-bold">{leaveRequests.length}</span> Pending for HR Review
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading leave requests...</div>
          ) : leaveRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No planner-approved requests for HR review
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor Feedback</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planner Feedback</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4">{request.employee?.firstName} {request.employee?.lastName}</td>
                    <td className="px-6 py-4">{request.leaveType}</td>
                    <td className="px-6 py-4">{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.supervisorFeedback || "No feedback"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.plannerFeedback || "No feedback"}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openRequestDetails(request)} className="text-blue-600 hover:text-blue-900">Review</button>
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
              <h2 className="text-xl font-bold mb-4">HR Final Review</h2>
              
              <div className="space-y-3 mb-4">
                <p><strong>Employee:</strong> {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}</p>
                <p><strong>Leave Type:</strong> {selectedRequest.leaveType}</p>
                <p><strong>Dates:</strong> {new Date(selectedRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.endDate).toLocaleDateString()}</p>
                <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                <p><strong>Supervisor Feedback:</strong> {selectedRequest.supervisorFeedback || "No feedback"}</p>
                <p><strong>Planner Feedback:</strong> {selectedRequest.plannerFeedback || "No feedback"}</p>
                {selectedRequest.leaveType === "Sick Leave" && (
                  <p><strong>Attachment:</strong> {selectedRequest.attachment || "No file uploaded"}</p>
                )}
              </div>

              <textarea
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                placeholder="HR feedback (required if rejecting)"
                className="w-full border rounded-md p-2 mt-4 h-20"
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
                <button onClick={() => handleDecision("Rejected")} className="px-4 py-2 bg-red-600 text-white rounded-md">Reject</button>
                <button onClick={() => handleDecision("Approved")} className="px-4 py-2 bg-green-600 text-white rounded-md">Approve</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
