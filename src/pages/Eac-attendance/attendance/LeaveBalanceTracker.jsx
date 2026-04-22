// LeaveBalanceTracker.jsx - Updated with Leave Request Status
import { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  UserCheck,
  Users,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Filter
} from 'lucide-react';

const LeaveBalanceTracker = ({ employeeId }) => {
  const [leaveData, setLeaveData] = useState({
    totalAnnualBalance: 0,
    usedDays: 0,
    availableBalance: 0,
    pendingDays: 0,
    leaveHistory: [],
    allLeaves: [] // Add this to store all leaves
  });
  const [loading, setLoading] = useState(true);
  const [nonDeductibleTypes, setNonDeductibleTypes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All'); // Add status filter
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

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

  // Function to calculate business days
  const calculateBusinessDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let businessDays = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return businessDays;
  };

  // Function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to get overall status based on approval flow
  const getOverallStatus = (leave) => {
    if (leave.status === 'Approved' || leave.status === 'Rejected') {
      return leave.status;
    }
    
    // Check approval flow status
    if (leave.hrStatus === 'Approved') return 'Approved';
    if (leave.hrStatus === 'Rejected') return 'Rejected';
    if (leave.plannerStatus === 'Approved') return 'With HR';
    if (leave.plannerStatus === 'Rejected') return 'Rejected';
    if (leave.supervisorStatus === 'Approved') return 'With Planner';
    if (leave.supervisorStatus === 'Rejected') return 'Rejected';
    
    return 'With Supervisor';
  };

  // Function to get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'With HR':
      case 'With Planner':
      case 'With Supervisor':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwtToken');
      
      // Fetch leave settings
      const settingsRes = await fetch(`${API_BASE_URL}/api/settings/leave`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const settings = await settingsRes.json();
      
      // Set non-deductible leave types
      const nonDeductible = settings.nonDeductibleLeaveTypes || 
        ['Maternity', 'Paternity', 'Sick', 'Study'];
      setNonDeductibleTypes(nonDeductible);
      
      // Fetch ALL employee's leaves (not just history)
      const allLeavesRes = await fetch(`${API_BASE_URL}/api/leave/employee/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allLeaves = await allLeavesRes.json();
      
      // Separate leaves by status
      const approvedLeaves = allLeaves.filter(leave => leave.status === 'Approved');
      const pendingLeaves = allLeaves.filter(leave => leave.status === 'Pending');
      const rejectedLeaves = allLeaves.filter(leave => leave.status === 'Rejected');
      
      // Calculate total annual balance
      const totalAnnualBalance = settings.annualLeaveBalance || 20;
      
      // Calculate USED DAYS from APPROVED leaves (only deductible types)
      let usedDays = 0;
      approvedLeaves.forEach(leave => {
        if (!nonDeductible.includes(leave.leaveType)) {
          const businessDays = calculateBusinessDays(leave.startDate, leave.endDate);
          usedDays += businessDays;
        }
      });
      
      // Calculate PENDING DAYS from PENDING leaves (only deductible types)
      let pendingDays = 0;
      pendingLeaves.forEach(leave => {
        if (!nonDeductible.includes(leave.leaveType)) {
          const businessDays = calculateBusinessDays(leave.startDate, leave.endDate);
          pendingDays += businessDays;
        }
      });
      
      // Calculate AVAILABLE BALANCE
      const availableBalance = totalAnnualBalance - usedDays;
      
      setLeaveData({
        totalAnnualBalance,
        usedDays,
        availableBalance: availableBalance > 0 ? availableBalance : 0,
        pendingDays,
        leaveHistory: approvedLeaves,
        allLeaves: allLeaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)) // Sort by date
      });
      
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchLeaveBalance();
    }
  }, [employeeId]);

  // Filter leaves based on status
  const filteredLeaves = leaveData.allLeaves.filter(leave => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Approved') return leave.status === 'Approved';
    if (statusFilter === 'Pending') return leave.status === 'Pending';
    if (statusFilter === 'Rejected') return leave.status === 'Rejected';
    return true;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeaves = filteredLeaves.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);

  // Approval flow progress component
  const ApprovalFlow = ({ leave }) => {
    const steps = [
      { 
        status: leave.supervisorStatus, 
        label: 'Supervisor',
        icon: <Users className="w-3 h-3" />
      },
      { 
        status: leave.plannerStatus, 
        label: 'Planner',
        icon: <FileCheck className="w-3 h-3" />
      },
      { 
        status: leave.hrStatus, 
        label: 'HR',
        icon: <UserCheck className="w-3 h-3" />
      }
    ];

    return (
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              step.status === 'Approved' ? 'bg-green-100 text-green-600' :
              step.status === 'Rejected' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-400'
            }`}>
              {step.status === 'Approved' ? (
                <CheckCircle className="w-4 h-4" />
              ) : step.status === 'Rejected' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                step.icon
              )}
            </div>
            <span className="text-xs text-gray-600">{step.label}</span>
            <span className="text-xs text-gray-500 mt-1">
              {step.status || 'Pending'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Summary - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Annual Balance */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Total Annual</p>
              <p className="text-3xl font-bold mt-2">{leaveData.totalAnnualBalance} days</p>
              <p className="text-xs opacity-90 mt-1">Annual allocation</p>
            </div>
            <Calendar className="w-10 h-10 opacity-80" />
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Available</p>
              <p className="text-3xl font-bold mt-2">{leaveData.availableBalance} days</p>
              <p className="text-xs opacity-90 mt-1">
                = {leaveData.totalAnnualBalance} - {leaveData.usedDays}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 opacity-80" />
          </div>
        </div>

        {/* Used Days */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Used Days</p>
              <p className="text-3xl font-bold mt-2">{leaveData.usedDays} days</p>
              <p className="text-xs opacity-90 mt-1">
                From deductible leaves
              </p>
            </div>
            <TrendingUp className="w-10 h-10 opacity-80" />
          </div>
        </div>

        {/* Pending Days */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Pending</p>
              <p className="text-3xl font-bold mt-2">{leaveData.pendingDays} days</p>
              <p className="text-xs opacity-90 mt-1">Awaiting approval</p>
            </div>
            <Clock className="w-10 h-10 opacity-80" />
          </div>
        </div>
      </div>

      {/* Leave Requests Status Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              My Leave Requests
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track the status of all your leave applications
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            
            <button
              onClick={fetchLeaveBalance}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Leave Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Approval Flow</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentLeaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                currentLeaves.map((leave) => {
                  const businessDays = calculateBusinessDays(leave.startDate, leave.endDate);
                  const isDeductible = !nonDeductibleTypes.includes(leave.leaveType);
                  const overallStatus = getOverallStatus(leave);
                  
                  return (
                    <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4">
                        <div>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {leave.leaveType}
                          </span>
                          {!isDeductible && (
                            <span className="ml-2 text-xs text-green-600">(Non-deductible)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-800 dark:text-gray-200">
                          {businessDays} business days
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-800 dark:text-gray-200">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <ApprovalFlow leave={leave} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(overallStatus)}
                          <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                            {overallStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLeaves.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredLeaves.length)} of {filteredLeaves.length} requests
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

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Leave Usage Progress
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {leaveData.usedDays} of {leaveData.totalAnnualBalance} days used
            ({Math.round((leaveData.usedDays / leaveData.totalAnnualBalance) * 100)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-4 rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min((leaveData.usedDays / leaveData.totalAnnualBalance) * 100, 100)}%`,
              maxWidth: '100%'
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Approval Flow Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Pending</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Awaiting review</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Approved</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Approved by reviewer</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Rejected</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rejected by reviewer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Balance Warning */}
      {leaveData.availableBalance < 5 && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 p-4 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-700">
                ⚠️ Low leave balance! Only {leaveData.availableBalance} days remaining.
              </p>
              <p className="text-xs text-red-600 mt-1">
                Used {leaveData.usedDays} days out of {leaveData.totalAnnualBalance} annual allocation.
                {leaveData.pendingDays > 0 && ` (${leaveData.pendingDays} days pending approval)`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalanceTracker;