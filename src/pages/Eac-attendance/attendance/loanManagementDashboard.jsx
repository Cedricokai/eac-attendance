import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import Header from "../../../components/Header";

function LoanManagementDashboard() {
  const [loanRequests, setLoanRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [actionNote, setActionNote] = useState('');
  const [modifiedLoanDetails, setModifiedLoanDetails] = useState({
    loanAmount: 0,
    repaymentPeriod: 0,
    monthlyRepayment: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0
  });
  
  // New state for employee payroll history
  const [employeePayrollHistory, setEmployeePayrollHistory] = useState(null);
  const [loadingPayrollHistory, setLoadingPayrollHistory] = useState(false);
  const [allPayrollPeriods, setAllPayrollPeriods] = useState([]);
  
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [toggleAction, setToggleAction] = useState(''); // 'activate' or 'deactivate'
  const [toggleReason, setToggleReason] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);
  const [canToggleInfo, setCanToggleInfo] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [bulkToggleMode, setBulkToggleMode] = useState(false);
  const [selectedForToggle, setSelectedForToggle] = useState([]);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate monthly payment based on loan amount and repayment period
  const calculateMonthlyPayment = (amount, period) => {
    if (!amount || !period || period === 0) return 0;
    const interestRate = 0.15; // 15% annual interest rate
    const monthlyRate = interestRate / 12;
    const numerator = amount * monthlyRate * Math.pow(1 + monthlyRate, period);
    const denominator = Math.pow(1 + monthlyRate, period) - 1;
    return numerator / denominator;
  };

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data.id,
            name: data.username,
            role: data.role.replace("ROLE_", "").toLowerCase(),
            email: data.email
          });
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  // Fetch all payroll periods (to get all available periods)
  const fetchPayrollPeriods = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/periods`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch payroll periods");
      const data = await res.json();
      setAllPayrollPeriods(data);
    } catch (err) {
      console.error("Error fetching payroll periods:", err);
    }
  };

  // Fetch loan requests
  const fetchLoanRequests = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Failed to fetch loan requests');
      const data = await response.json();
      
      data.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
      
      setLoanRequests(data);
      applyFilters(data, filter, searchTerm, dateRange);
      calculateStats(data);
    } catch (err) {
      console.error('Error fetching loan requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee payroll history from all periods
  const fetchEmployeePayrollHistory = async (employeeId) => {
    if (!employeeId) return;
    
    setLoadingPayrollHistory(true);
    setEmployeePayrollHistory(null);
    
    try {
      const token = getToken();
      const payrollRecords = [];
      
      for (const period of allPayrollPeriods) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/payroll?periodId=${period.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (res.ok) {
            const periodRecords = await res.json();
            const employeeRecords = periodRecords.filter(record => 
              (record.employee?.id === employeeId) || 
              (record.employeeId === employeeId)
            );
            
            employeeRecords.forEach(record => {
              payrollRecords.push({
                ...record,
                periodName: period.name,
                periodStartDate: period.startDate,
                periodEndDate: period.endDate
              });
            });
          }
        } catch (err) {
          console.error(`Error fetching payroll for period ${period.id}:`, err);
        }
      }
      
      payrollRecords.sort((a, b) => new Date(b.periodEndDate || b.periodStartDate) - new Date(a.periodEndDate || a.periodStartDate));
      
      const payrollCount = payrollRecords.length;
      const netSalaries = payrollRecords.map(record => record.netSalary || 0);
      const totalNetEarnings = netSalaries.reduce((sum, salary) => sum + salary, 0);
      const averageNetSalary = payrollCount > 0 ? totalNetEarnings / payrollCount : 0;
      const lastPayrollDate = payrollRecords.length > 0 ? 
        (payrollRecords[0].periodEndDate || payrollRecords[0].periodStartDate) : null;
      
      setEmployeePayrollHistory({
        payrollRecords,
        payrollCount,
        netSalaries,
        averageNetSalary,
        totalNetEarnings,
        lastPayrollDate
      });
      
    } catch (err) {
      console.error('Error fetching employee payroll history:', err);
      setError('Failed to load payroll history');
    } finally {
      setLoadingPayrollHistory(false);
    }
  };

  useEffect(() => {
    fetchLoanRequests();
    fetchPayrollPeriods();
    
    const interval = setInterval(fetchLoanRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters
  const applyFilters = (requests, statusFilter, search, dates) => {
    let filtered = [...requests];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status.toLowerCase() === statusFilter);
    }
    
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(req => 
        req.employee?.firstName?.toLowerCase().includes(term) ||
        req.employee?.lastName?.toLowerCase().includes(term) ||
        req.employee?.employeeId?.toLowerCase().includes(term) ||
        req.purpose?.toLowerCase().includes(term) ||
        req.id?.toString().includes(term)
      );
    }
    
    if (dates.start) {
      filtered = filtered.filter(req => new Date(req.requestDate) >= new Date(dates.start));
    }
    if (dates.end) {
      filtered = filtered.filter(req => new Date(req.requestDate) <= new Date(dates.end));
    }
    
    setFilteredRequests(filtered);
  };

  // Calculate statistics
  const calculateStats = (requests) => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      rejected: requests.filter(r => r.status === 'Rejected').length,
      totalAmount: requests.reduce((sum, r) => sum + (r.loanAmount || 0), 0)
    };
    setStats(stats);
  };

  // Handle filter changes
  useEffect(() => {
    applyFilters(loanRequests, filter, searchTerm, dateRange);
  }, [filter, searchTerm, dateRange, loanRequests]);

  // Handle action (approve/reject)
  const handleAction = async () => {
    if (!selectedRequest) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = getToken();
      
      const response = await fetch(
        `${API_BASE_URL}/api/loans/${selectedRequest.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: actionType === 'approve' ? 'Approved' : 'Rejected',
            approvedAmount: actionType === 'approve' ? modifiedLoanDetails.loanAmount : null,
            approvedRepaymentPeriod: actionType === 'approve' ? modifiedLoanDetails.repaymentPeriod : null,
            approvedMonthlyPayment: actionType === 'approve' ? modifiedLoanDetails.monthlyRepayment : null,
            notes: actionNote,
            processedBy: user?.name || user?.id
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${actionType} loan request`);
      }

      setSuccess(`Loan request ${actionType}d successfully!`);
      
      await fetchLoanRequests();
      
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionNote('');
      setModifiedLoanDetails({
        loanAmount: 0,
        repaymentPeriod: 0,
        monthlyRepayment: 0
      });
      setEmployeePayrollHistory(null);
      
    } catch (err) {
      console.error(`Error ${actionType}ing loan:`, err);
      setError(err.message || `Failed to ${actionType} loan request`);
    } finally {
      setLoading(false);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    const selectedIds = filteredRequests
      .filter(req => req.selected)
      .map(req => req.id);
    
    if (selectedIds.length === 0) {
      setError('Please select at least one loan request');
      return;
    }

    if (!window.confirm(`Are you sure you want to ${action} ${selectedIds.length} selected loan requests?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/bulk/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          loanIds: selectedIds,
          processedBy: user?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} selected loans`);
      }

      const result = await response.json();
      
      setSuccess(`Successfully ${action}d ${selectedIds.length} loan requests!`);
      
      await fetchLoanRequests();
      
    } catch (err) {
      console.error(`Error in bulk ${action}:`, err);
      setError(err.message || `Failed to ${action} selected loans`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle select all
  const toggleSelectAll = () => {
    const allSelected = filteredRequests.every(req => req.selected);
    const updated = filteredRequests.map(req => ({
      ...req,
      selected: !allSelected
    }));
    setFilteredRequests(updated);
  };

  // Toggle select single
  const toggleSelect = (id) => {
    const updated = filteredRequests.map(req =>
      req.id === id ? { ...req, selected: !req.selected } : req
    );
    setFilteredRequests(updated);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getStatusBadgeClass = (status) => {
    const safeStatus = (status || 'pending').toLowerCase();

    switch (safeStatus) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  // Handle opening the action modal
  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setModifiedLoanDetails({
      loanAmount: request.loanAmount || 0,
      repaymentPeriod: request.repaymentPeriod || 0,
      monthlyRepayment: request.monthlyPaymentAmount || request.monthlyRepayment || 0
    });
    setShowActionModal(true);
  };

  // Handle opening details modal and fetching payroll history
  const openDetailsModal = async (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    
    const employeeId = request.employee?.id || request.employeeId;
    if (employeeId) {
      await fetchEmployeePayrollHistory(employeeId);
    }
  };

  // Handle loan amount change
  const handleLoanAmountChange = (value) => {
    const newAmount = parseFloat(value) || 0;
    setModifiedLoanDetails(prev => {
      const monthlyPayment = calculateMonthlyPayment(newAmount, prev.repaymentPeriod);
      return {
        ...prev,
        loanAmount: newAmount,
        monthlyRepayment: monthlyPayment
      };
    });
  };

  // Handle repayment period change
  const handleRepaymentPeriodChange = (value) => {
    const newPeriod = parseInt(value) || 0;
    setModifiedLoanDetails(prev => {
      const monthlyPayment = calculateMonthlyPayment(prev.loanAmount, newPeriod);
      return {
        ...prev,
        repaymentPeriod: newPeriod,
        monthlyRepayment: monthlyPayment
      };
    });
  };

  // Handle monthly payment change
  const handleMonthlyPaymentChange = (value) => {
    const newMonthlyPayment = parseFloat(value) || 0;
    setModifiedLoanDetails(prev => ({
      ...prev,
      monthlyRepayment: newMonthlyPayment
    }));
  };

  const checkCanToggle = async (loan) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/loans/${loan.id}/can-toggle`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            setCanToggleInfo(data);
            return data;
        }
        return null;
    } catch (err) {
        console.error('Error checking toggle status:', err);
        return null;
    }
  };

  // Open toggle modal
  const openToggleModal = async (loan, action) => {
    setSelectedRequest(loan);
    setToggleAction(action);
    setToggleReason('');
    
    const info = await checkCanToggle(loan);
    if (info) {
        if (action === 'activate' && !info.canActivate) {
            setError(`Cannot activate this loan: ${info.reasons.join(', ')}`);
            setTimeout(() => setError(''), 5000);
            return;
        }
    }
    
    setShowToggleModal(true);
  };

  // Handle toggle action
  const handleToggleActive = async () => {
    if (!selectedRequest) return;
    
    setToggleLoading(true);
    setError('');
    
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/loans/${selectedRequest.id}/toggle-active`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                active: toggleAction === 'activate',
                reason: toggleReason,
                processedBy: user?.name || user?.id
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${toggleAction} loan`);
        }
        
        const result = await response.json();
        setSuccess(result.message);
        
        await fetchLoanRequests();
        
        setShowToggleModal(false);
        setSelectedRequest(null);
        setToggleReason('');
        
        if (showDetailsModal) {
            const updatedLoan = await fetch(`${API_BASE_URL}/api/loans/${selectedRequest.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (updatedLoan.ok) {
                const loanData = await updatedLoan.json();
                setSelectedRequest(loanData);
            }
        }
        
    } catch (err) {
        console.error(`Error ${toggleAction}ing loan:`, err);
        setError(err.message);
    } finally {
        setToggleLoading(false);
        setTimeout(() => setSuccess(''), 3000);
        setTimeout(() => setError(''), 5000);
    }
  };

  // Bulk toggle function
  const handleBulkToggle = async (activate) => {
    const selectedLoanIds = filteredRequests
        .filter(req => req.selected)
        .map(req => req.id);
    
    if (selectedLoanIds.length === 0) {
        setError('Please select at least one loan request');
        return;
    }
    
    const action = activate ? 'activate' : 'deactivate';
    let reason = '';
    
    if (!activate) {
        reason = prompt('Please provide a reason for deactivating these loans:');
        if (!reason || reason.trim() === '') {
            setError('A reason is required to deactivate loans');
            return;
        }
    }
    
    if (!window.confirm(`Are you sure you want to ${action} ${selectedLoanIds.length} selected loan(s)?`)) {
        return;
    }
    
    setLoading(true);
    setError('');
    
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/loans/bulk/toggle-active`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                loanIds: selectedLoanIds,
                activate: activate,
                processedBy: user?.name || user?.id,
                reason: reason
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${action} selected loans`);
        }
        
        const result = await response.json();
        setSuccess(result.message);
        
        await fetchLoanRequests();
        
        const updated = filteredRequests.map(req => ({ ...req, selected: false }));
        setFilteredRequests(updated);
        
    } catch (err) {
        console.error(`Error in bulk ${action}:`, err);
        setError(err.message);
    } finally {
        setLoading(false);
        setTimeout(() => setSuccess(''), 3000);
        setTimeout(() => setError(''), 5000);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.hamburger-button')) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'
        }`}
      >
        <main className="flex-1 mx-auto px-4 md:px-6 py-6">
          <Header
            toggleSidebar={toggleSidebar}
            user={user}
            onLogout={handleLogout}
          />

          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-sm mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Loan Approval Management</h1>
              <p className="text-gray-600">Review and manage employee loan requests</p>
            </div>
          </section>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Employee name, ID, purpose..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Bulk Actions */}
          {filteredRequests.some(r => r.selected) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
              <p className="text-sm text-blue-700">
                {filteredRequests.filter(r => r.selected).length} requests selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Approve Selected
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Reject Selected
                </button>
              </div>
            </div>
          )}

          {/* Loan Requests Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredRequests.length > 0 && filteredRequests.every(r => r.selected)}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center">
                        <div className="flex justify-center">
                          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                        No loan requests found
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={request.selected || false}
                            onChange={() => toggleSelect(request.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          REQ#{request.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {request.employee?.firstName} {request.employee?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.employee?.employeeId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(request.loanAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.status === 'Approved' ? (
                            <div className="text-sm">
                              {request.approvedAmount && request.approvedAmount !== request.loanAmount ? (
                                <>
                                  <span className="font-medium text-blue-600">
                                    {formatCurrency(request.approvedAmount)}
                                  </span>
                                  <span className="text-xs text-gray-500 block">
                                    (from {formatCurrency(request.loanAmount)})
                                  </span>
                                </>
                              ) : (
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(request.loanAmount)}
                                </span>
                              )}
                              {request.approvedRepaymentPeriod && (
                                <span className="text-xs text-gray-500 block">
                                  {request.approvedRepaymentPeriod} months
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {request.purpose}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.requestDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.status === 'Approved' ? (
                            <button
                              onClick={() => openToggleModal(request, request.isActive ? 'deactivate' : 'activate')}
                              className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                                request.isActive 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {request.isActive ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Active
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Inactive
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openDetailsModal(request)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          {request.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => openActionModal(request, 'approve')}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openActionModal(request, 'reject')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Loan Request Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setEmployeePayrollHistory(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Request ID</p>
                    <p className="text-sm font-medium text-gray-900">REQ#{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border mt-1 ${getStatusBadgeClass(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Request Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.requestDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Processed Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRequest.processedDate ? formatDate(selectedRequest.processedDate) : '—'}
                    </p>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Employee Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Employee ID</p>
                      <p className="text-sm font-medium text-gray-900">{selectedRequest.employee?.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Employee Start Date</p>
                      <p className="text-sm font-medium text-gray-900">{selectedRequest.employee?.startDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="text-sm font-medium text-gray-900">{selectedRequest.employee?.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Monthly Salary</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedRequest.employee?.monthlySalary || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payroll History Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Payroll History</h3>
                  
                  {loadingPayrollHistory ? (
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading payroll history...</span>
                    </div>
                  ) : employeePayrollHistory ? (
                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-600">Times on Payroll</p>
                          <p className="text-lg font-bold text-blue-800">{employeePayrollHistory.payrollCount}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs text-green-600">Average Net Salary</p>
                          <p className="text-lg font-bold text-green-800">
                            {formatCurrency(employeePayrollHistory.averageNetSalary)}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-purple-600">Total Net Earnings</p>
                          <p className="text-lg font-bold text-purple-800">
                            {formatCurrency(employeePayrollHistory.totalNetEarnings)}
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-xs text-orange-600">Last Payroll Date</p>
                          <p className="text-sm font-bold text-orange-800">
                            {employeePayrollHistory.lastPayrollDate ? formatDate(employeePayrollHistory.lastPayrollDate) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {employeePayrollHistory.payrollRecords && employeePayrollHistory.payrollRecords.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Net Salary History</p>
                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Period</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Net Salary</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {employeePayrollHistory.payrollRecords.map((record, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-xs text-gray-900">
                                      {record.periodName || formatDate(record.periodStartDate)}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-medium text-green-600">
                                      {formatCurrency(record.netSalary)}
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        record.status === 'Processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {record.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No payroll history available for this employee</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Unable to load payroll history</p>
                  )}
                </div>

                {/* Loan Details */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Loan Terms</h3>
                  
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Term</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Requested</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Approved</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-3 text-gray-600">Loan Amount</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatCurrency(selectedRequest.loanAmount)}
                          </td>
                          <td className="px-4 py-3">
                            {selectedRequest.approvedAmount ? (
                              <span className={`font-medium ${
                                selectedRequest.approvedAmount !== selectedRequest.loanAmount 
                                  ? 'text-blue-600' 
                                  : 'text-gray-900'
                              }`}>
                                {formatCurrency(selectedRequest.approvedAmount)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {selectedRequest.approvedAmount && selectedRequest.approvedAmount !== selectedRequest.loanAmount && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Modified
                              </span>
                            )}
                          </td>
                        </tr>
                        
                        <tr>
                          <td className="px-4 py-3 text-gray-600">Repayment Period</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {selectedRequest.repaymentPeriod} months
                          </td>
                          <td className="px-4 py-3">
                            {selectedRequest.approvedRepaymentPeriod ? (
                              <span className={`font-medium ${
                                selectedRequest.approvedRepaymentPeriod !== selectedRequest.repaymentPeriod 
                                  ? 'text-blue-600' 
                                  : 'text-gray-900'
                              }`}>
                                {selectedRequest.approvedRepaymentPeriod} months
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                        
                        <tr>
                          <td className="px-4 py-3 text-gray-600">Monthly Payment</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatCurrency(selectedRequest.monthlyPaymentAmount || selectedRequest.monthlyRepayment || 0)}
                          </td>
                          <td className="px-4 py-3">
                            {selectedRequest.approvedMonthlyPayment ? (
                              <span className={`font-medium ${
                                selectedRequest.approvedMonthlyPayment !== (selectedRequest.monthlyPaymentAmount || selectedRequest.monthlyRepayment)
                                  ? 'text-blue-600' 
                                  : 'text-gray-900'
                              }`}>
                                {formatCurrency(selectedRequest.approvedMonthlyPayment)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Purpose</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">
                      {selectedRequest.purpose}
                    </p>
                  </div>
                </div>

                {/* Processing Information */}
                {(selectedRequest.processedBy || selectedRequest.processingNotes) && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Processing Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {selectedRequest.processedBy && (
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm text-gray-600">
                            <span className="font-medium">Processed by:</span> {selectedRequest.processedBy}
                          </span>
                        </div>
                      )}
                      
                      {selectedRequest.processedDate && (
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">
                            <span className="font-medium">Processed on:</span> {formatDate(selectedRequest.processedDate)}
                          </span>
                        </div>
                      )}
                      
                      {selectedRequest.processingNotes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-1">Processing Notes:</p>
                          <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                            {selectedRequest.processingNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'Pending' && (
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openActionModal(selectedRequest, 'reject');
                    }}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openActionModal(selectedRequest, 'approve');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Loan Request
              </h2>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {actionType === 'approve' 
                    ? 'Review and modify loan details before approval' 
                    : 'Are you sure you want to reject this loan request?'}
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Employee:</span> {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Requested Amount:</span> {formatCurrency(selectedRequest.loanAmount)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Requested Period:</span> {selectedRequest.repaymentPeriod} months
                  </p>
                  
                  {employeePayrollHistory && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Payroll History:</p>
                      <p className="text-xs">
                        <span className="font-medium">Times on Payroll:</span> {employeePayrollHistory.payrollCount} | 
                        <span className="font-medium ml-2">Avg Net:</span> {formatCurrency(employeePayrollHistory.averageNetSalary)}
                      </p>
                    </div>
                  )}
                </div>

                {actionType === 'approve' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approved Loan Amount *
                      </label>
                      <input
                        type="number"
                        value={modifiedLoanDetails.loanAmount}
                        onChange={(e) => handleLoanAmountChange(e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repayment Period (months) *
                      </label>
                      <input
                        type="number"
                        value={modifiedLoanDetails.repaymentPeriod}
                        onChange={(e) => handleRepaymentPeriodChange(e.target.value)}
                        min="1"
                        max="60"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Repayment Amount *
                      </label>
                      <input
                        type="number"
                        value={modifiedLoanDetails.monthlyRepayment}
                        onChange={(e) => handleMonthlyPaymentChange(e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Calculated based on amount and period. Adjust if needed.
                      </p>
                    </div>

                    {(modifiedLoanDetails.loanAmount !== selectedRequest.loanAmount || 
                      modifiedLoanDetails.repaymentPeriod !== selectedRequest.repaymentPeriod) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 font-medium">Modified Terms</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Original: {formatCurrency(selectedRequest.loanAmount)} over {selectedRequest.repaymentPeriod} months
                        </p>
                        <p className="text-xs text-yellow-700">
                          New: {formatCurrency(modifiedLoanDetails.loanAmount)} over {modifiedLoanDetails.repaymentPeriod} months
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes {actionType === 'approve' ? '(Optional)' : '(Optional)'}
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows="3"
                  placeholder={actionType === 'approve' 
                    ? "Add any notes about the modified terms or approval conditions..." 
                    : "Add any notes about why you're rejecting this request..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setSelectedRequest(null);
                    setActionNote('');
                    setModifiedLoanDetails({
                      loanAmount: 0,
                      repaymentPeriod: 0,
                      monthlyRepayment: 0
                    });
                    setEmployeePayrollHistory(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={loading || (actionType === 'approve' && 
                    (!modifiedLoanDetails.loanAmount || !modifiedLoanDetails.repaymentPeriod || !modifiedLoanDetails.monthlyRepayment))}
                  className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                    actionType === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } ${loading || (actionType === 'approve' && 
                    (!modifiedLoanDetails.loanAmount || !modifiedLoanDetails.repaymentPeriod || !modifiedLoanDetails.monthlyRepayment)) 
                    ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    `Confirm ${actionType === 'approve' ? 'Approval' : 'Rejection'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Active/Inactive Modal */}
      {showToggleModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {toggleAction === 'activate' ? 'Activate' : 'Deactivate'} Loan
              </h2>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to {toggleAction} this loan?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Employee:</span> {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Loan Amount:</span> {formatCurrency(selectedRequest.approvedAmount || selectedRequest.loanAmount)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Remaining Balance:</span> {formatCurrency(selectedRequest.remainingBalance || 0)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Current Status:</span> {selectedRequest.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>

                {toggleAction === 'deactivate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for deactivation *
                    </label>
                    <textarea
                      value={toggleReason}
                      onChange={(e) => setToggleReason(e.target.value)}
                      rows="3"
                      placeholder="Please provide a reason for deactivating this loan..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}

                {toggleAction === 'activate' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      Activating this loan will resume monthly deductions from the employee's salary.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowToggleModal(false);
                    setSelectedRequest(null);
                    setToggleReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleActive}
                  disabled={toggleLoading || (toggleAction === 'deactivate' && !toggleReason.trim())}
                  className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                    toggleAction === 'activate' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } ${(toggleLoading || (toggleAction === 'deactivate' && !toggleReason.trim())) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {toggleLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    `Confirm ${toggleAction === 'activate' ? 'Activation' : 'Deactivation'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoanManagementDashboard;