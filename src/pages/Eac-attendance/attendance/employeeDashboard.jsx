import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Users,
  FileText,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ListChecks,
} from "lucide-react";

const EmployeeDashboard = () => {
  // --- Leave Request States ---
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  // --- Role + User ---
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) setRole(storedRole);

    fetchCurrentUser();
    fetchLeaveRequests();
  }, []);

  // Fetch logged-in user info
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) return;

      const response = await fetch("http://localhost:8080/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch user info");

      const data = await response.json();
      setUsername(data.username);
      if (data.role) setRole(data.role);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch("http://localhost:8080/api/leave/my-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch leave requests");

      const data = await response.json();
      setLeaveRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Filter requests ---
  useEffect(() => {
    if (statusFilter === "All") {
      setFilteredRequests(leaveRequests);
    } else {
      setFilteredRequests(
        leaveRequests.filter((req) => req.status === statusFilter)
      );
    }
  }, [statusFilter, leaveRequests]);

  // --- Stats Calculation ---
  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === "Pending").length,
    approved: leaveRequests.filter((r) => r.status === "Approved").length,
    rejected: leaveRequests.filter((r) => r.status === "Rejected").length,
  };

  // --- Dashboard Cards ---
  const cards = [
    {
      to: "/leaveRequestForm",
      icon: <CalendarCheck className="w-10 h-10 text-blue-600" />,
      title: "Leave Request",
      description: "Apply for a new leave request",
      alwaysVisible: true,
    },
    {
      to: "/attendance",
      icon: <Users className="w-10 h-10 text-green-600" />,
      title: "Attendance",
      description: "Manage and track attendance",
      role: "ROLE_HR",
    },
    {
      to: "/HRDashboard",
      icon: <FileText className="w-10 h-10 text-purple-600" />,
      title: "HR Dashboard",
      description: "Review and manage HR requests",
      role: "ROLE_HR",
    },
    {
      to: "/payroll",
      icon: <DollarSign className="w-10 h-10 text-yellow-600" />,
      title: "Payroll",
      description: "Manage payroll and salary records",
      role: "ROLE_ADMIN",
    },
    {
      to: "/inventoryDashboard",
      icon: <Package className="w-10 h-10 text-red-600" />,
      title: "Inventory",
      description: "Track and manage inventory",
      role: "ROLE_INVENTORY",
    },
    {
      to: "/supervisorDashboard",
      icon: <Users className="w-10 h-10 text-red-600" />,
      title: "Supervisor",
      description: "Track and manage leave requests",
      role: "ROLE_SUPERVISOR",
    },
    {
      to: "/plannerDashboard",
      icon: <ListChecks className="w-10 h-10 text-indigo-600" />,
      title: "Planner",
      description: "Validate resource coverage and project timelines",
      role: "ROLE_PLANNER",
    },
  ];

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      {/* --- Dashboard Header --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Employee Dashboard
        </h2>
        {username && (
          <p className="mt-2 md:mt-0 text-lg text-gray-600 dark:text-gray-300">
            👋 Welcome, <span className="font-semibold">{username}</span>
          </p>
        )}
      </div>

      {/* --- Summary Stats --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-5 flex items-center space-x-4">
          <Clock className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-xl font-bold">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-5 flex items-center space-x-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
            <p className="text-xl font-bold">{stats.approved}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-5 flex items-center space-x-4">
          <XCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
            <p className="text-xl font-bold">{stats.rejected}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-5 flex items-center space-x-4">
          <ListChecks className="w-8 h-8 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* --- Cards Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {cards
          .filter((card) => card.alwaysVisible || card.role === role)
          .map((card, idx) => (
            <Link
              key={idx}
              to={card.to}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg rounded-2xl p-6 flex flex-col items-center text-center transform hover:scale-105 transition duration-200"
            >
              {card.icon}
              <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                {card.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {card.description}
              </p>
            </Link>
          ))}
      </div>

      {/* --- Leave Requests Section --- */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            My Leave Requests
          </h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring focus:ring-blue-200"
          >
            <option>All</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading requests...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No leave requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left">
                <tr>
                  <th className="px-4 py-2 border">Dates</th>
                  <th className="px-4 py-2 border">Type</th>
                  <th className="px-4 py-2 border">Status</th>
                  <th className="px-4 py-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150"
                  >
                    <td className="px-4 py-2 border">
                      {new Date(req.startDate).toLocaleDateString()} -{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 border">{req.leaveType}</td>
                    <td className="px-4 py-2 border">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          req.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : req.status === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Modal with Approval Flow --- */}
      {selectedRequest && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-96 p-6 transform scale-100 transition-all">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
              Leave Request Details
            </h4>
            <p className="mb-2 text-gray-700 dark:text-gray-300">
              <strong>Dates:</strong>{" "}
              {new Date(selectedRequest.startDate).toLocaleDateString()} -{" "}
              {new Date(selectedRequest.endDate).toLocaleDateString()}
            </p>
            <p className="mb-2 text-gray-700 dark:text-gray-300">
              <strong>Type:</strong> {selectedRequest.leaveType}
            </p>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedRequest.status === "Approved"
                    ? "bg-green-100 text-green-700"
                    : selectedRequest.status === "Rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {selectedRequest.status}
              </span>
            </p>

            {/* Approval Flow */}
            <div className="mb-4">
              <h5 className="text-gray-700 dark:text-gray-300 font-medium mb-2">Approval Progress</h5>
              <div className="flex justify-between items-center">
                {/* Supervisor */}
                <div className="flex flex-col items-center text-center">
                  <CheckCircle
                    className={`w-8 h-8 ${
                      selectedRequest.supervisorStatus === "Approved"
                        ? "text-green-500"
                        : selectedRequest.supervisorStatus === "Rejected"
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                  />
                  <span className="text-xs mt-1 text-gray-700 dark:text-gray-300">Supervisor</span>
                </div>
                {/* Planner */}
                <div className="flex flex-col items-center text-center">
                  <CheckCircle
                    className={`w-8 h-8 ${
                      selectedRequest.plannerStatus === "Approved"
                        ? "text-green-500"
                        : selectedRequest.plannerStatus === "Rejected"
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                  />
                  <span className="text-xs mt-1 text-gray-700 dark:text-gray-300">Planner</span>
                </div>
                {/* HR */}
                <div className="flex flex-col items-center text-center">
                  <CheckCircle
                    className={`w-8 h-8 ${
                      selectedRequest.hrStatus === "Approved"
                        ? "text-green-500"
                        : selectedRequest.hrStatus === "Rejected"
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                  />
                  <span className="text-xs mt-1 text-gray-700 dark:text-gray-300">HR</span>
                </div>
              </div>

              {/* Horizontal Progress Line */}
              <div className="relative mt-2">
                <div className="absolute top-4 left-4 right-4 h-1 bg-gray-200 dark:bg-gray-600 rounded"></div>
                <div
                  className="absolute top-4 h-1 bg-blue-500 rounded"
                  style={{
                    width: `${
                      selectedRequest.hrStatus === "Pending"
                        ? selectedRequest.plannerStatus === "Approved"
                          ? "66%"
                          : selectedRequest.supervisorStatus === "Approved"
                          ? "33%"
                          : "0%"
                        : "100%"
                    }`,
                  }}
                />
              </div>
            </div>

            {/* Feedback */}
            <div className="mb-4">
              {selectedRequest.supervisorFeedback && (
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-1">
                  <strong>Supervisor Feedback:</strong> {selectedRequest.supervisorFeedback}
                </p>
              )}
              {selectedRequest.plannerFeedback && (
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-1">
                  <strong>Planner Feedback:</strong> {selectedRequest.plannerFeedback}
                </p>
              )}
              {selectedRequest.hrFeedback && (
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-1">
                  <strong>HR Feedback:</strong> {selectedRequest.hrFeedback}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedRequest(null)}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
