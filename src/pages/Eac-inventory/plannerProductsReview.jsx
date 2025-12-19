import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock,
  AlertCircle,
  Calendar,
  User,
  Building,
  Package,
  Check,
  X,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Truck,
  Store
} from "lucide-react";

const PlannerProductsReview = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    urgency: "all",
    requestType: "all",
    department: "all",
    dateRange: "all"
  });
  
  // Approval state
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    urgent: 0
  });

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

  // Fetch all inventory requests
 // Add this to your fetchRequests function:
const fetchRequests = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("jwtToken");
    const response = await fetch(`${API_BASE_URL}/api/inventory-requests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch requests: ${response.status}`);
    }

    const data = await response.json();
    
    // DEBUG: Log the requests and their statuses
    console.log("DEBUG - All requests from API:", data);
    data.forEach((req, index) => {
      console.log(`DEBUG - Request ${index}:`, {
        id: req.id,
        status: req.status,
        ppeRequest: req.ppeRequest,
        requestNumber: req.requestNumber
      });
    });
    
    setRequests(data);
    calculateStats(data);
  } catch (err) {
    setError(err.message);
    console.error("Error fetching requests:", err);
  } finally {
    setLoading(false);
  }
};

  // Calculate statistics
  const calculateStats = (requestsData) => {
    const stats = {
      total: requestsData.length,
      pending: requestsData.filter(r => r.status === 'PENDING').length,
      approved: requestsData.filter(r => r.status === 'APPROVED').length,
      rejected: requestsData.filter(r => r.status === 'REJECTED').length,
      urgent: requestsData.filter(r => r.urgency === 'urgent' || r.urgency === 'high').length
    };
    setStats(stats);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on search and filters
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      // Search term filter
      const matchesSearch = !searchTerm || 
        request.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.department?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = filters.status === "all" || request.status === filters.status;
      
      // Urgency filter
      const matchesUrgency = filters.urgency === "all" || request.urgency === filters.urgency;
      
      // Request type filter
      const matchesType = filters.requestType === "all" || 
        (filters.requestType === "inventory" && !request.isPpeRequest) ||
        (filters.requestType === "ppe" && request.isPpeRequest);
      
      // Department filter
      const matchesDepartment = filters.department === "all" || 
        request.department?.toLowerCase().includes(filters.department.toLowerCase());

      return matchesSearch && matchesStatus && matchesUrgency && matchesType && matchesDepartment;
    });
  }, [requests, searchTerm, filters]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = requests
      .map(r => r.department)
      .filter((dept, index, self) => dept && self.indexOf(dept) === index);
    return ["all", ...depts];
  }, [requests]);

  

  // Handle request approval
 const handleApproveRequest = async (requestId) => {
    if (!approvalNotes.trim()) {
        alert("Please provide approval notes");
        return;
    }

    setApproving(true);
    try {
        const token = localStorage.getItem("jwtToken");
        const response = await fetch(`${API_BASE_URL}/api/inventory-requests/${requestId}/planner-approve`, {
            method: "PUT",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notes: approvalNotes,
                approvedBy: localStorage.getItem("username") || "Planner"
            })
        });

        if (response.ok) {
            alert("Request approved successfully! It will now go to Procurement.");
            fetchRequests(); // Refresh the list
            setShowDetailsModal(false);
            setApprovalNotes("");
        } else {
            const errorText = await response.text();
            console.error("Backend error response:", errorText);
            throw new Error(errorText);
        }
    } catch (err) {
        console.error("Error approving request:", err);
        alert("Failed to approve request: " + err.message);
    } finally {
        setApproving(false);
    }
};


  // Handle request rejection
  const handleRejectRequest = async (requestId) => {
    if (!approvalNotes.trim()) {
      alert("Please provide rejection notes");
      return;
    }

    setRejecting(true);
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/${requestId}/reject`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: approvalNotes,
          rejectedBy: localStorage.getItem("username") || "Planner"
        })
      });

      if (response.ok) {
        alert("Request rejected successfully!");
        fetchRequests(); // Refresh the list
        setShowDetailsModal(false);
        setApprovalNotes("");
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("Failed to reject request: " + err.message);
    } finally {
      setRejecting(false);
    }
  };

  // Send to Procurement Preview
  const sendToProcurementPreview = async (requestId) => {
    try {
        const token = localStorage.getItem("jwtToken");
        const response = await fetch(`${API_BASE_URL}/api/inventory-requests/${requestId}/send-to-procurement`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert("Sent to Procurement successfully!");
            fetchRequests(); // Refresh the list
        } else {
            const errorText = await response.text();
            throw new Error(errorText);
        }
    } catch (err) {
        console.error("Error sending to procurement:", err);
        alert("Failed to send to procurement: " + err.message);
    }
};

// Add this to your component to debug
useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    const userRole = localStorage.getItem("userRole");
    console.log("Current user role:", userRole);
    console.log("Token exists:", !!token);
    
    // Fetch current user details
    const fetchCurrentUser = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            const userData = await response.json();
            console.log("Current user data:", userData);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };
    
    if (token) {
        fetchCurrentUser();
    }
}, []);

  // Send to Store Officer
  const sendToStoreOfficer = async (requestId) => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/${requestId}/send-to-store`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert("Sent to Store Officer successfully!");
        fetchRequests(); // Refresh the list
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (err) {
      console.error("Error sending to store officer:", err);
      alert("Failed to send to store officer: " + err.message);
    }
  };

  // View request details
  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock size={14} /> };
      case 'APPROVED':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle size={14} /> };
      case 'REJECTED':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle size={14} /> };
      case 'PROCUREMENT':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Truck size={14} /> };
      case 'STORE':
        return { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Store size={14} /> };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: <AlertCircle size={14} /> };
    }
  };

  // Get urgency badge color
  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Urgent' };
      case 'high':
        return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' };
      case 'normal':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Normal' };
      case 'low':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Low' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: urgency || 'Normal' };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-lg font-semibold">Error: {error}</h2>
          <button
            onClick={fetchRequests}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 flex">
     
      {/* Main content */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="flex justify-between items-center bg-white h-16 w-full px-6 shadow-md sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold">Planner Dashboard</h1>
            <p className="text-sm text-gray-600">Review and approve inventory requests</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchRequests}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="text-blue-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="text-yellow-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="text-green-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="text-red-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.urgent}</p>
                </div>
                <AlertCircle className="text-orange-500" size={24} />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by request number, project, requester..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PROCUREMENT">Procurement</option>
                  <option value="STORE">Store</option>
                </select>

                <select
                  value={filters.urgency}
                  onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Urgency</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={filters.requestType}
                  onChange={(e) => setFilters({...filters, requestType: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Types</option>
                  <option value="inventory">Inventory</option>
                  <option value="ppe">PPE</option>
                </select>

                <select
                  value={filters.department}
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Departments</option>
                  {departments.filter(d => d !== "all").map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <button
                  onClick={() => setFilters({
                    status: "all",
                    urgency: "all",
                    requestType: "all",
                    department: "all",
                    dateRange: "all"
                  })}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job/Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
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
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No requests found matching your filters
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => {
                      const statusBadge = getStatusBadge(request.status);
                      const urgencyBadge = getUrgencyBadge(request.urgency);
                      const totalItems = request.items?.length || 0;
                      const totalQuantity = request.items?.reduce((sum, item) => sum + (item.requestedQuantity || 0), 0) || 0;

                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {request.requestNumber || `REQ-${request.id}`}
                                </div>
                                <div className="text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User size={12} />
                                    {request.requestedBy}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Building size={12} />
                                    {request.department}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Calendar size={12} />
                                    {formatDate(request.requestDate)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 font-medium">
                              {request.projectName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.jobDescription}
                            </div>
                            <div className="mt-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${urgencyBadge.bg} ${urgencyBadge.text}`}>
                                {urgencyBadge.label}
                              </span>
                              {request.isPpeRequest && (
                                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  PPE
                                </span>
                              )}
                            </div>
                          </td>
                          
         <td className="px-6 py-4">
  {/* Add individual quantities - QUICK FIX */}
  <div className="mt-1 text-xs text-gray-600 space-y-1">
    {request.items?.slice(0, 3).map((item, idx) => (
      <div key={idx} className="flex justify-between">
        <span className="truncate">{item.productName}</span>
        <span className="font-medium ml-2">{item.quantity}</span>
      </div>
    ))}
  </div>
</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.icon}
                                {request.status}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => viewRequestDetails(request)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                <Eye size={14} />
                                View
                              </button>
                              
                              {request.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowDetailsModal(true);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    <Check size={14} />
                                    Approve
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowDetailsModal(true);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    <X size={14} />
                                    Reject
                                  </button>
                                </>
                              )}
                              
                              {request.status === 'APPROVED' && (
                                <>
                                  <button
                                    onClick={() => sendToProcurementPreview(request.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                  >
                                    <Truck size={14} />
                                    To Procurement
                                  </button>
                                  
                                  <button
                                    onClick={() => sendToStoreOfficer(request.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                  >
                                    <Store size={14} />
                                    To Store
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Request Details: {selectedRequest.requestNumber}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Submitted on {formatDate(selectedRequest.requestDate)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                    setApprovalNotes("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Requester Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="ml-2 text-sm font-medium">{selectedRequest.requestedBy}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Department:</span>
                      <span className="ml-2 text-sm font-medium">{selectedRequest.department}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Contact:</span>
                      <span className="ml-2 text-sm font-medium">{selectedRequest.contactPerson}</span>
                    </div>
                    {selectedRequest.contactPhone && (
                      <div>
                        <span className="text-sm text-gray-600">Phone:</span>
                        <span className="ml-2 text-sm font-medium">{selectedRequest.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Job Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Project:</span>
                      <span className="ml-2 text-sm font-medium">{selectedRequest.projectName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Job Description:</span>
                      <span className="ml-2 text-sm font-medium">{selectedRequest.jobDescription}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="ml-2 text-sm font-medium">{selectedRequest.location}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Urgency:</span>
                      <span className={`ml-2 text-sm font-medium px-2 py-1 rounded-full ${getUrgencyBadge(selectedRequest.urgency).bg} ${getUrgencyBadge(selectedRequest.urgency).text}`}>
                        {getUrgencyBadge(selectedRequest.urgency).label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">
                  Requested Items ({selectedRequest.items?.length || 0})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">Item</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">Code</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">Requested Qty</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">Current Stock</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 border text-sm">{item.productName}</td>
                          <td className="px-4 py-2 border text-sm text-gray-600">{item.productCode}</td>
                          <td className="px-4 py-2 border text-sm font-medium">{item.requestedQuantity}</td>
                          <td className="px-4 py-2 border text-sm">
                            <span className={item.currentStock < item.quantity ? "text-red-600 font-medium" : "text-green-600"}>
                              {item.currentStock}
                            </span>
                          </td>
                          <td className="px-4 py-2 border text-sm text-gray-500">{item.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Additional Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedRequest.notes}</p>
                  </div>
                </div>
              )}

              {/* Approval/Rejection Section */}
              {selectedRequest.status === 'PENDING' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-3">Review & Decision</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decision Notes
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Enter your approval/rejection notes..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRejectRequest(selectedRequest.id)}
                      disabled={rejecting || !approvalNotes.trim()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {rejecting ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                      Reject Request
                    </button>
                    <button
                      onClick={() => handleApproveRequest(selectedRequest.id)}
                      disabled={approving || !approvalNotes.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {approving ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Approve Request
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons for approved requests */}
              {selectedRequest.status === 'APPROVED' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-3">Next Steps</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => sendToProcurementPreview(selectedRequest.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Truck size={16} />
                      Send to Procurement Preview
                    </button>
                    <button
                      onClick={() => sendToStoreOfficer(selectedRequest.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Store size={16} />
                      Send to Store Officer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerProductsReview;