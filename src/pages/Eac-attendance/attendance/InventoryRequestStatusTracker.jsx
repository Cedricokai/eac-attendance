// InventoryRequestStatusTracker.jsx
import { useState, useEffect } from 'react';
import { 
  Package, Truck, Warehouse, CheckCircle, Clock, AlertCircle, 
  ChevronRight, ChevronLeft, Filter, FileText, ShoppingCart,
  Home, Building, User, Calendar, DollarSign
} from 'lucide-react';

const InventoryRequestStatusTracker = ({ employeeId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    issued: 0,
    rejected: 0,
    inProcurement: 0
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

  // Status mapping based on your service class
  const STATUS_CONFIG = {
    'PENDING': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    'PENDING_PLANNER': { label: 'With Planner', color: 'bg-blue-100 text-blue-800', icon: FileText },
    'APPROVED_BY_PLANNER': { label: 'Planner Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'PROCUREMENT_PENDING': { label: 'With Procurement', color: 'bg-purple-100 text-purple-800', icon: ShoppingCart },
    'PROCURED': { label: 'Procured', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    'STORE_REVIEW': { label: 'Store Review', color: 'bg-orange-100 text-orange-800', icon: Warehouse },
    'APPROVED_BY_STORE': { label: 'Store Approved', color: 'bg-teal-100 text-teal-800', icon: CheckCircle },
    'RECEIVED_IN_STORE': { label: 'Received in Store', color: 'bg-emerald-100 text-emerald-800', icon: Package },
    'ISSUED': { label: 'Issued', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'REJECTED_BY_PLANNER': { label: 'Rejected by Planner', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    'REJECTED_BY_PROCUREMENT': { label: 'Rejected by Procurement', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    'REJECTED_BY_STORE': { label: 'Rejected by Store', color: 'bg-red-100 text-red-800', icon: AlertCircle }
  };

  const fetchInventoryRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwtToken');
      
      // Get current user
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) return;
      const userData = await userResponse.json();
      const username = userData.username || userData.email;
      
      // Fetch user's inventory requests
      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/by-user/${username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const sortedData = data.sort((a, b) => 
          new Date(b.requestDate || b.createdAt) - new Date(a.requestDate || a.createdAt)
        );
        setRequests(sortedData);
        
        // Calculate stats
        const stats = {
          total: data.length,
          pending: data.filter(r => r.status === 'PENDING' || r.status === 'PENDING_PLANNER').length,
          approved: data.filter(r => r.status === 'APPROVED_BY_STORE' || r.status === 'APPROVED_BY_PLANNER').length,
          issued: data.filter(r => r.status === 'ISSUED').length,
          rejected: data.filter(r => r.status?.includes('REJECTED')).length,
          inProcurement: data.filter(r => r.status === 'PROCUREMENT_PENDING' || r.status === 'PROCURED' || r.status === 'STORE_REVIEW').length
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching inventory requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryRequests();
  }, []);

  // Filter requests based on status
  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Pending') return request.status === 'PENDING' || request.status === 'PENDING_PLANNER';
    if (statusFilter === 'In Progress') return ['PROCUREMENT_PENDING', 'PROCURED', 'STORE_REVIEW'].includes(request.status);
    if (statusFilter === 'Approved') return request.status === 'APPROVED_BY_STORE' || request.status === 'APPROVED_BY_PLANNER';
    if (statusFilter === 'Issued') return request.status === 'ISSUED';
    if (statusFilter === 'Rejected') return request.status?.includes('REJECTED');
    return true;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  // Function to get status badge
  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = config.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Function to determine current step in workflow
  const getWorkflowStep = (request) => {
    const workflow = [
      { status: 'PENDING', label: 'Submitted', step: 1 },
      { status: 'PENDING_PLANNER', label: 'Planner Review', step: 2 },
      { status: 'APPROVED_BY_PLANNER', label: 'Planner Approved', step: 3 },
      { status: 'PROCUREMENT_PENDING', label: 'Procurement', step: 4 },
      { status: 'PROCURED', label: 'Procured', step: 5 },
      { status: 'STORE_REVIEW', label: 'Store Review', step: 6 },
      { status: 'APPROVED_BY_STORE', label: 'Store Approved', step: 7 },
      { status: 'RECEIVED_IN_STORE', label: 'Received', step: 8 },
      { status: 'ISSUED', label: 'Issued', step: 9 }
    ];

    const rejected = request.status?.includes('REJECTED');
    if (rejected) {
      return { step: 0, label: 'Rejected', rejected: true };
    }

    const currentStep = workflow.find(w => w.status === request.status);
    return currentStep || { step: 0, label: 'Unknown' };
  };

  // Progress bar component
  const WorkflowProgress = ({ request }) => {
    const step = getWorkflowStep(request);
    
    if (step.rejected) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span>Request was rejected</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Step {step.step} of 9</span>
          <span className="text-xs font-medium text-gray-700">{step.label}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step.step / 9) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Total</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Pending</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">In Progress</p>
              <p className="text-2xl font-bold mt-1">{stats.inProcurement}</p>
            </div>
            <Truck className="w-8 h-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Approved</p>
              <p className="text-2xl font-bold mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Issued</p>
              <p className="text-2xl font-bold mt-1">{stats.issued}</p>
            </div>
            <Package className="w-8 h-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Rejected</p>
              <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
            </div>
            <AlertCircle className="w-8 h-8 opacity-80" />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              My Inventory Requests
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track the status of all your inventory and PPE requests
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Approved">Approved</option>
                <option value="Issued">Issued</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            
            <button
              onClick={fetchInventoryRequests}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Request #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Job/Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Workflow</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No inventory requests found
                  </td>
                </tr>
              ) : (
                currentRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {request.requestNumber || `REQ-${request.id}`}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        request.ppeRequest 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {request.ppeRequest ? 'PPE' : 'Inventory'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {request.quantity || 0} items
                      </div>
                      {request.hasManualProducts && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          + Manual items
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                        {request.projectName || request.jobDescription || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(request.requestDate || request.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <WorkflowProgress request={request} />
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRequests.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRequests.length)} of {filteredRequests.length} requests
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Legend */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Request Workflow Steps</h4>
        <div className="grid grid-cols-2 md:grid-cols-9 gap-2">
          {[
            { step: 1, label: 'Submitted', icon: FileText, color: 'bg-blue-100 text-blue-800' },
            { step: 2, label: 'Planner', icon: User, color: 'bg-blue-100 text-blue-800' },
            { step: 3, label: 'Planner Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
            { step: 4, label: 'Procurement', icon: ShoppingCart, color: 'bg-purple-100 text-purple-800' },
            { step: 5, label: 'Procured', icon: Truck, color: 'bg-indigo-100 text-indigo-800' },
            { step: 6, label: 'Store Review', icon: Warehouse, color: 'bg-orange-100 text-orange-800' },
            { step: 7, label: 'Store Approved', icon: CheckCircle, color: 'bg-teal-100 text-teal-800' },
            { step: 8, label: 'Received', icon: Package, color: 'bg-emerald-100 text-emerald-800' },
            { step: 9, label: 'Issued', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
          ].map(step => (
            <div key={step.step} className="flex flex-col items-center text-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${step.color}`}>
                <step.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Step {step.step}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request Details Modal would go here */}
    </div>
  );
};

export default InventoryRequestStatusTracker;