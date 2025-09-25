import { useState, useEffect } from "react";
import { 
  Check, 
  X, 
  Filter, 
  Download, 
  Search, 
  Calendar, 
  User, 
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical
} from "lucide-react";

const PlannerDashboard = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plannerNotes, setPlannerNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  // Filter requests based on search and filters
  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = searchTerm === "" || 
      `${request.employee?.firstName} ${request.employee?.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.leaveType.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const toggleCheckbox = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((req) => req.id));
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
        let endpoint, body;
        
        if (decision === "Approved") {
          endpoint = `http://localhost:8080/api/leave/planner/approve/${id}`;
          body = JSON.stringify({
            feedback: plannerNotes || "Approved by planner",
          });
        } else {
          endpoint = `http://localhost:8080/api/leave/reject/${id}`;
          body = JSON.stringify({
            role: "planner",
            feedback: plannerNotes || "Rejected by planner",
          });
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: body,
        });

        if (!response.ok) {
          throw new Error(`Failed to update leave request ${id}`);
        }
      }

      setLeaveRequests((prev) => 
        prev.filter((req) => !targetIds.includes(req.id))
      );
      setSelectedIds([]);
      
      if (!ids) {
        setIsModalOpen(false);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      alert(error.message || "Failed to update leave request");
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800";
      case "Rejected": return "bg-red-100 text-red-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Planner Dashboard</h1>
              <p className="text-gray-600 text-lg">Review and manage supervisor-approved leave requests</p>
              
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span className="font-semibold text-2xl">{leaveRequests.length}</span>
                  </div>
                  <p className="text-sm mt-1">Pending Requests</p>
                </div>
                
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    <span className="font-semibold text-2xl">
                      {leaveRequests.filter(req => req.plannerStatus === "Approved").length}
                    </span>
                  </div>
                  <p className="text-sm mt-1">Approved This Month</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Check size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">{selectedIds.length} requests selected</p>
                <p className="text-blue-700 text-sm">Choose an action to perform on selected items</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision("Approved", selectedIds)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <Check size={18} />
                Approve Selected
              </button>
              <button
                onClick={() => handleDecision("Rejected", selectedIds)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                <X size={18} />
                Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search employees or leave types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={18} />
              More Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leave requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "No supervisor-approved leave requests pending planner review"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Supervisor Feedback
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(request.id)}
                          onChange={() => toggleCheckbox(request.id)}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {request.employee?.firstName?.charAt(0)}{request.employee?.lastName?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {request.employee?.firstName} {request.employee?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.employee?.department || "No department"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {request.leaveType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-gray-900">
                            {new Date(request.startDate).toLocaleDateString()} -{" "}
                            {new Date(request.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 max-w-xs">
                          <MessageSquare size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600 line-clamp-2">
                            {request.supervisorFeedback || "No feedback provided"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openRequestDetails(request)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Check size={16} />
                            Review
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Review Leave Request</h2>
                <p className="text-gray-600 mt-1">Planner decision for {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}</p>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Employee Information</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {selectedRequest.employee?.firstName?.charAt(0)}{selectedRequest.employee?.lastName?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {selectedRequest.employee?.department || "No department"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Leave Details</label>
                      <div className="mt-1 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{selectedRequest.leaveType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">
                            {Math.ceil((new Date(selectedRequest.endDate) - new Date(selectedRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Dates</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="font-medium">
                            {new Date(selectedRequest.startDate).toLocaleDateString()} -{" "}
                            {new Date(selectedRequest.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Supervisor Feedback</label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          {selectedRequest.supervisorFeedback || "No feedback provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Reason for Leave</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedRequest.reason}</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label htmlFor="plannerNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Planner Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="plannerNotes"
                    value={plannerNotes}
                    onChange={(e) => setPlannerNotes(e.target.value)}
                    placeholder="Enter your feedback or notes (required for rejection)"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required when rejecting a request</p>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision("Rejected")}
                  disabled={!plannerNotes}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                >
                  <X size={18} />
                  Reject Request
                </button>
                <button
                  onClick={() => handleDecision("Approved")}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Check size={18} />
                  Approve Request
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