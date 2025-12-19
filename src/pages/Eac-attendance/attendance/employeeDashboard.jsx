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
  UserCog,
  BarChart3,
  Settings,
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
  
  const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log("🖥️ Current hostname:", hostname);
  console.log("🔌 Current port:", port);

  // If frontend is opened via localhost → use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  // Public / Tailscale / Cloudflare IP
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }

  // Default fallback
  console.log("🌍 Using PUBLIC API URL (fallback)");
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

  const API_BASE_URL = getApiBaseUrl();
  // Fetch logged-in user info
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
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
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/leave/my-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (response.status === 401) {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched leave requests:", data);
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

  // --- Consolidated Dashboard Cards ---
  const cards = [
    // Employee Cards (Visible to all)
    {
      to: "/leaveRequestForm",
      icon: <CalendarCheck className="w-10 h-10 text-blue-600" />,
      title: "Leave Request",
      description: "Apply for a new leave request",
      roles: ["ROLE_EMPLOYEE", "ROLE_SUPERVISOR", "ROLE_PLANNER", "ROLE_HR", "ROLE_ADMIN", "ROLE_INVENTORY", "ROLE_TRANSPORT"],
      alwaysVisible: true,
    },
    {
      to: "/attendance",
      icon: <Clock className="w-10 h-10 text-green-600" />,
      title: "Attendance",
      description: "Manage and track attendance",
      roles: ["ROLE_EMPLOYEE", "ROLE_SUPERVISOR", "ROLE_PLANNER", "ROLE_HR", "ROLE_ADMIN"],
    },

    // 🆕 NEW CARD: Inventory Request (for everyone)
  {
    to: "/inventoryRequest",
    icon: <Package className="w-10 h-10 text-orange-500" />,
    title: "Inventory Request",
    description: "Request items or materials from stores",
    roles: [
      "ROLE_EMPLOYEE",
      "ROLE_SUPERVISOR",
      "ROLE_PLANNER",
      "ROLE_HR",
      "ROLE_ADMIN",
      "ROLE_INVENTORY",
      "ROLE_TRANSPORT"
    ],
    alwaysVisible: true, // visible to everyone
  },


    // Supervisor Card
    {
      to: "/supervisorDashboard",
      icon: <UserCog className="w-10 h-10 text-orange-600" />,
      title: "Supervisor Dashboard",
      description: "Review and approve team leave requests",
      roles: ["ROLE_SUPERVISOR", "ROLE_ADMIN"],
    },

    // Planner Card
    {
      to: "/plannerDashboard",
      icon: <ListChecks className="w-10 h-10 text-indigo-600" />,
      title: "Planner Dashboard",
      description: "Validate resource coverage and project timelines",
      roles: ["ROLE_PLANNER", "ROLE_ADMIN"],
    },

      {
      to: "/plannerProductsReview",
      icon: <ListChecks className="w-10 h-10 text-indigo-600" />,
      title: "Products Review",
      description: "Validate resource coverage and project timelines",
      roles: ["ROLE_PLANNER", "ROLE_ADMIN"],
    },

    
      {
      to: "/procurementManagerReview",
      icon: <ListChecks className="w-10 h-10 text-indigo-600" />,
      title: "Products Review",
      description: "Validate resource coverage and project timelines",
      roles: ["ROLE_PROCUREMENT_OFFICER", "ROLE_ADMIN"],
    },

      {
      to: "/adminDashboard",
      icon: <ListChecks className="w-10 h-10 text-indigo-600" />,
      title: "Transport",
      description: "Validate resource coverage and project timelines",
      roles: ["ROLE_TRANSPORT", "ROLE_ADMIN"],
    },

    // HR Cards
    {
      to: "/HRDashboard",
      icon: <Users className="w-10 h-10 text-purple-600" />,
      title: "HR Dashboard",
      description: "Review and manage HR requests",
      roles: ["ROLE_HR", "ROLE_ADMIN"],
    },
    {
      to: "/payroll",
      icon: <DollarSign className="w-10 h-10 text-yellow-600" />,
      title: "Payroll",
      description: "Manage payroll and salary records",
      roles: ["ROLE_HR", "ROLE_ADMIN"],
    },

    // Inventory Card
    {
      to: "/inventoryDashboard",
      icon: <Package className="w-10 h-10 text-red-600" />,
      title: "Inventory",
      description: "Track and manage inventory",
      roles: ["ROLE_INVENTORY", "ROLE_ADMIN"],
    },

    // Admin Cards
    {
      to: "/admin",
      icon: <Settings className="w-10 h-10 text-gray-600" />,
      title: "Admin Panel",
      description: "System administration and settings",
      roles: ["ROLE_ADMIN"],
    },
    {
      to: "/analytics",
      icon: <BarChart3 className="w-10 h-10 text-teal-600" />,
      title: "Analytics",
      description: "View system analytics and reports",
      roles: ["ROLE_ADMIN", "ROLE_HR"],
    },
  ];

  // Filter cards based on user role
  const filteredCards = cards.filter((card) => {
    if (card.alwaysVisible) return true;
    if (!role) return false;
    return card.roles.includes(role);
  });

  // Group cards by category for better organization
  const getCardCategory = (card) => {
    if (card.roles.includes("ROLE_ADMIN") && !card.roles.some(r => r !== "ROLE_ADMIN")) {
      return "Administration";
    }
    if (card.roles.includes("ROLE_HR") && card.title.includes("HR")) {
      return "Human Resources";
    }
    if (card.roles.includes("ROLE_SUPERVISOR")) {
      return "Supervisor Tools";
    }
    if (card.roles.includes("ROLE_PLANNER")) {
      return "Planning";
    }
    if (card.roles.includes("ROLE_INVENTORY")) {
      return "Inventory Management";
    }
     if (card.roles.includes("ROLE_PROCUREMENT_OFFICER")) {
      return "Procurement";
    }
    return "General";
  };

  const categorizedCards = filteredCards.reduce((acc, card) => {
    const category = getCardCategory(card);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(card);
    return acc;
  }, {});

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
            {role && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {role.replace('ROLE_', '')}
              </span>
            )}
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

      {/* --- Cards Section (Categorized) --- */}
      {Object.entries(categorizedCards).map(([category, categoryCards]) => (
        <div key={category} className="mb-10">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {category}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categoryCards.map((card, idx) => (
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
        </div>
      ))}

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