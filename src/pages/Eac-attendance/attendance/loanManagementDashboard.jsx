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
  const [actionType, setActionType] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [modifiedLoanDetails, setModifiedLoanDetails] = useState({
    loanAmount: 0,
    repaymentPeriod: 0,
    monthlyRepayment: 0
  });
  const [consolidateWithExisting, setConsolidateWithExisting] = useState(false);
  const [existingActiveLoans, setExistingActiveLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
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
  
  // New state for active card filter
  const [activeCardFilter, setActiveCardFilter] = useState(null);
  
  const [employeePayrollHistory, setEmployeePayrollHistory] = useState(null);
  const [loadingPayrollHistory, setLoadingPayrollHistory] = useState(false);
  const [allPayrollPeriods, setAllPayrollPeriods] = useState([]);
  
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [toggleAction, setToggleAction] = useState('');
  const [toggleReason, setToggleReason] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showConsolidatedOnly, setShowConsolidatedOnly] = useState(false);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [expandedLoanHistory, setExpandedLoanHistory] = useState(null);
  const [loanHistoryData, setLoanHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLoan, setDeletingLoan] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ==================== HELPER FUNCTIONS ====================
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

  const calculateMonthlyPayment = (amount, period) => {
    if (!amount || !period || period === 0) return 0;
    const interestRate = 0.15;
    const monthlyRate = interestRate / 12;
    const numerator = amount * monthlyRate * Math.pow(1 + monthlyRate, period);
    const denominator = Math.pow(1 + monthlyRate, period) - 1;
    return numerator / denominator;
  };

  // ==================== CARD FILTER HANDLER ====================
  const handleCardClick = (cardType, filterValue = null) => {
    // Clear visibility filters when clicking cards
    setShowActiveOnly(false);
    setShowConsolidatedOnly(false);
    setShowCompletedOnly(false);
    
    // Reset search and date range for clean filtering
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    
    // Set the active card filter
    setActiveCardFilter(cardType);
    
    // Apply the filter
    if (cardType === 'total') {
      setFilter('all');
    } else if (cardType === 'pending') {
      setFilter('pending');
    } else if (cardType === 'active') {
      setFilter('approved');
      setShowActiveOnly(true);
    } else if (cardType === 'rejected') {
      setFilter('rejected');
    } else if (cardType === 'totalAmount') {
      // For total amount, just show all loans and scroll to table
      setFilter('all');
      setActiveCardFilter('totalAmount');
      // Scroll to table with slight delay
      setTimeout(() => {
        document.getElementById('loan-table-section')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
    
    // Reset sorting when changing card filter
    setSortConfig({ key: null, direction: 'asc' });
  };

  const clearCardFilter = () => {
    setActiveCardFilter(null);
    setFilter('all');
    setShowActiveOnly(false);
    setShowConsolidatedOnly(false);
    setShowCompletedOnly(false);
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
  };

  // ==================== SORTING FUNCTIONS ====================
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedRequests = () => {
    if (!sortConfig.key) return filteredRequests;
    
    return [...filteredRequests].sort((a, b) => {
      let aValue, bValue;
      
      switch(sortConfig.key) {
        case 'requestId':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'employee':
          aValue = `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.toLowerCase();
          bValue = `${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`.toLowerCase();
          break;
        case 'requestedAmount':
          aValue = a.loanAmount || 0;
          bValue = b.loanAmount || 0;
          break;
        case 'approvedAmount':
          aValue = a.approvedAmount || a.loanAmount || 0;
          bValue = b.approvedAmount || b.loanAmount || 0;
          break;
        case 'remainingBalance':
          aValue = a.remainingBalance !== undefined ? a.remainingBalance : (a.approvedAmount || a.loanAmount) - (a.paidAmount || 0);
          bValue = b.remainingBalance !== undefined ? b.remainingBalance : (b.approvedAmount || b.loanAmount) - (b.paidAmount || 0);
          break;
        case 'paidPercentage':
          const aTotal = a.approvedAmount || a.loanAmount || 0;
          const aPaid = a.paidAmount || 0;
          aValue = aTotal > 0 ? (aPaid / aTotal) * 100 : 0;
          const bTotal = b.approvedAmount || b.loanAmount || 0;
          const bPaid = b.paidAmount || 0;
          bValue = bTotal > 0 ? (bPaid / bTotal) * 100 : 0;
          break;
        case 'purpose':
          aValue = (a.purpose || '').toLowerCase();
          bValue = (b.purpose || '').toLowerCase();
          break;
        case 'requestDate':
          aValue = new Date(a.requestDate || a.createdDate || 0);
          bValue = new Date(b.requestDate || b.createdDate || 0);
          break;
        case 'loanStatus':
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
          break;
        case 'active':
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 ml-1 inline-block text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 ml-1 inline-block text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 inline-block text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // ==================== API CALLS ====================
  const fetchExistingActiveLoans = async (employeeId) => {
    if (!employeeId) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/employee/${employeeId}/active-display`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setExistingActiveLoans(data);
        if (data.length > 0) {
          setConsolidateWithExisting(true);
        } else {
          setConsolidateWithExisting(false);
        }
      } else {
        setExistingActiveLoans([]);
        setConsolidateWithExisting(false);
      }
    } catch (err) {
      console.error('Error fetching existing active loans:', err);
      setExistingActiveLoans([]);
    }
  };

  const fetchEmployeeLoanHistory = async (employeeId) => {
    if (!employeeId) return;
    setLoadingHistory(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/employee/${employeeId}/history`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setLoanHistoryData(data);
      }
    } catch (err) {
      console.error('Error fetching loan history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

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

  const fetchLoanRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/loans`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error(`Failed to fetch loan requests: ${response.status}`);
      }
      const data = await response.json();
      data.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
      setLoanRequests(data);
      applyFilters(data, filter, searchTerm, dateRange);
      calculateStats(data);
    } catch (err) {
      console.error('Error fetching loan requests:', err);
      setError(err.message || 'Failed to load loan requests');
    } finally {
      setLoading(false);
    }
  };

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
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          if (res.ok) {
            const periodRecords = await res.json();
            const employeeRecords = periodRecords.filter(record => 
              (record.employee?.id === employeeId) || (record.employeeId === employeeId)
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
      setEmployeePayrollHistory({
        payrollRecords,
        payrollCount,
        netSalaries,
        averageNetSalary,
        totalNetEarnings,
        lastPayrollDate: payrollRecords.length > 0 ? (payrollRecords[0].periodEndDate || payrollRecords[0].periodStartDate) : null
      });
    } catch (err) {
      console.error('Error fetching employee payroll history:', err);
      setError('Failed to load payroll history');
    } finally {
      setLoadingPayrollHistory(false);
    }
  };

  // ==================== FILTERING FUNCTIONS ====================
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
    if (showActiveOnly) {
      filtered = filtered.filter(req => 
        req.isActive === true && req.status === 'Approved' &&
        (req.remainingBalance > 0 || (req.approvedAmount - (req.paidAmount || 0) > 0))
      );
    } else if (showConsolidatedOnly) {
      filtered = filtered.filter(req => req.isAggregated === true);
    } else if (showCompletedOnly) {
      filtered = filtered.filter(req => 
        req.status === 'Completed' || (req.remainingBalance <= 0 && req.paidAmount > 0 && req.status === 'Approved')
      );
    }
    setFilteredRequests(filtered);
  };

  const calculateStats = (requests) => {
    const activeLoans = requests.filter(r => r.status === 'Approved' && r.isActive === true && (r.remainingBalance > 0 || (r.approvedAmount - (r.paidAmount || 0) > 0)));
    const newStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: activeLoans.length,
      rejected: requests.filter(r => r.status === 'Rejected').length,
      totalAmount: requests.reduce((sum, r) => sum + (r.loanAmount || 0), 0)
    };
    setStats(newStats);
  };

  const resetVisibilityFilters = () => {
    setShowActiveOnly(false);
    setShowConsolidatedOnly(false);
    setShowCompletedOnly(false);
    setActiveCardFilter(null);
    setFilter('all');
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
  };

  const getConsolidationSummary = () => {
    if (!existingActiveLoans.length) return null;
    const totalOutstanding = existingActiveLoans.reduce((sum, loan) => {
      const remaining = loan.remainingBalance || (loan.approvedAmount - (loan.paidAmount || 0));
      return sum + remaining;
    }, 0);
    const newTotal = totalOutstanding + modifiedLoanDetails.loanAmount;
    const newMonthlyPayment = calculateMonthlyPayment(newTotal, modifiedLoanDetails.repaymentPeriod);
    return { totalOutstanding, newTotal, newMonthlyPayment, loanCount: existingActiveLoans.length };
  };

  // ==================== ACTION FUNCTIONS ====================
  const handleAction = async () => {
    if (!selectedRequest) return;
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const requestBody = {
        status: actionType === 'approve' ? 'Approved' : 'Rejected',
        approvedAmount: actionType === 'approve' ? modifiedLoanDetails.loanAmount : null,
        approvedRepaymentPeriod: actionType === 'approve' ? modifiedLoanDetails.repaymentPeriod : null,
        approvedMonthlyPayment: actionType === 'approve' ? modifiedLoanDetails.monthlyRepayment : null,
        notes: actionNote,
        processedBy: user?.name || user?.id
      };
      if (actionType === 'approve') {
        requestBody.consolidateWithExisting = consolidateWithExisting;
      }
      const response = await fetch(`${API_BASE_URL}/api/loans/${selectedRequest.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${actionType} loan request`);
      }
      setSuccess(`Loan request ${actionType}d successfully!`);
      await fetchLoanRequests();
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionNote('');
      setModifiedLoanDetails({ loanAmount: 0, repaymentPeriod: 0, monthlyRepayment: 0 });
      setConsolidateWithExisting(false);
      setExistingActiveLoans([]);
      setEmployeePayrollHistory(null);
    } catch (err) {
      console.error(`Error ${actionType}ing loan:`, err);
      setError(err.message || `Failed to ${actionType} loan request`);
    } finally {
      setLoading(false);
    }
  };

  const previewConsolidatedDeletion = async (consolidatedLoanId) => {
    setDeleteLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/consolidated/${consolidatedLoanId}/preview-deletion`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to preview deletion');
      }
      
      const preview = await response.json();
      setDeletePreview(preview);
      return preview;
    } catch (err) {
      console.error('Error previewing deletion:', err);
      setError(err.message);
      return null;
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteConsolidatedLoan = async () => {
    if (!deletingLoan) return;
    
    setDeleteLoading(true);
    setError('');
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/consolidated/${deletingLoan.id}/delete-with-restoration`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete consolidated loan');
      }
      
      const result = await response.json();
      setSuccess(result.message);
      
      setShowDeleteModal(false);
      setDeletingLoan(null);
      setDeletePreview(null);
      setDeleteReason('');
      
      await fetchLoanRequests();
      
      if (showConsolidatedOnly) {
        applyFilters(loanRequests, filter, searchTerm, dateRange);
      }
    } catch (err) {
      console.error('Error deleting consolidated loan:', err);
      setError(err.message);
    } finally {
      setDeleteLoading(false);
      setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => setError(''), 5000);
    }
  };

  const openDeleteModal = async (loan) => {
    setDeletingLoan(loan);
    setDeleteReason('');
    setDeletePreview(null);
    setShowDeleteModal(true);
    await previewConsolidatedDeletion(loan.id);
  };

  const softDeleteConsolidatedLoan = async () => {
    if (!deletingLoan) return;
    
    if (!deleteReason.trim()) {
      setError('Please provide a reason for deleting this consolidated loan');
      return;
    }
    
    setDeleteLoading(true);
    setError('');
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/consolidated/${deletingLoan.id}/soft-delete`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deletedBy: user?.name || user?.id,
          reason: deleteReason 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to soft delete consolidated loan');
      }
      
      const result = await response.json();
      setSuccess(result.message);
      
      setShowDeleteModal(false);
      setDeletingLoan(null);
      setDeletePreview(null);
      setDeleteReason('');
      
      await fetchLoanRequests();
    } catch (err) {
      console.error('Error soft deleting consolidated loan:', err);
      setError(err.message);
    } finally {
      setDeleteLoading(false);
      setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleBulkAction = async (action) => {
    const selectedIds = filteredRequests.filter(req => req.selected).map(req => req.id);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ loanIds: selectedIds, processedBy: user?.id })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} selected loans`);
      }
      setSuccess(`Successfully ${action}d ${selectedIds.length} loan requests!`);
      await fetchLoanRequests();
    } catch (err) {
      console.error(`Error in bulk ${action}:`, err);
      setError(err.message || `Failed to ${action} selected loans`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = filteredRequests.every(req => req.selected);
    const updated = filteredRequests.map(req => ({ ...req, selected: !allSelected }));
    setFilteredRequests(updated);
  };

  const toggleSelectRequest = (id) => {
    const updated = filteredRequests.map(req => req.id === id ? { ...req, selected: !req.selected } : req);
    setFilteredRequests(updated);
  };

  const openActionModal = async (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setModifiedLoanDetails({
      loanAmount: request.loanAmount || 0,
      repaymentPeriod: request.repaymentPeriod || 0,
      monthlyRepayment: request.monthlyPaymentAmount || request.monthlyRepayment || 0
    });
    if (type === 'approve') {
      const employeeId = request.employee?.id || request.employeeId;
      await fetchExistingActiveLoans(employeeId);
    } else {
      setExistingActiveLoans([]);
      setConsolidateWithExisting(false);
    }
    setShowActionModal(true);
  };

  const openDetailsModal = async (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    const employeeId = request.employee?.id || request.employeeId;
    if (employeeId) {
      await fetchEmployeePayrollHistory(employeeId);
      await fetchEmployeeLoanHistory(employeeId);
    }
  };

  // ==================== TOGGLE ACTIVE FUNCTIONS ====================
  const checkCanToggle = async (loan) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/${loan.id}/can-toggle`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (err) {
      console.error('Error checking toggle status:', err);
      return null;
    }
  };

  const openToggleModal = async (loan, action) => {
    const isConsolidatedIntoAnother = loan.previousLoanId && loan.previousLoanId > 0;
    if (action === 'activate' && isConsolidatedIntoAnother) {
      setError(`Cannot activate this loan because it has been consolidated into another loan.`);
      setTimeout(() => setError(''), 5000);
      return;
    }
    setSelectedRequest(loan);
    setToggleAction(action);
    setToggleReason('');
    const info = await checkCanToggle(loan);
    if (info && action === 'activate' && !info.canActivate) {
      const reasons = info.reasons?.join(', ') || 'This loan cannot be activated';
      setError(`Cannot activate this loan: ${reasons}`);
      setTimeout(() => setError(''), 5000);
      return;
    }
    setShowToggleModal(true);
  };

  const handleToggleActive = async () => {
    if (!selectedRequest) return;
    setToggleLoading(true);
    setError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/${selectedRequest.id}/toggle-active`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    } catch (err) {
      console.error(`Error ${toggleAction}ing loan:`, err);
      setError(err.message);
    } finally {
      setToggleLoading(false);
      setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleBulkToggle = async (activate) => {
    const selectedLoanIds = filteredRequests.filter(req => req.selected).map(req => req.id);
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanIds: selectedLoanIds, activate: activate, processedBy: user?.name || user?.id, reason: reason })
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

  // ==================== UI ACTION HANDLERS ====================
  const viewLoanDetails = async (loanId) => {
    const loan = loanRequests.find(l => l.id === loanId);
    if (loan) {
      await openDetailsModal(loan);
    }
  };

  const openApproveModal = async (request) => {
    await openActionModal(request, 'approve');
  };

  const toggleActiveStatus = async (loan) => {
    const action = loan.isActive ? 'deactivate' : 'activate';
    await openToggleModal(loan, action);
  };

  const rejectLoan = async (request) => {
    await openActionModal(request, 'reject');
  };

  const viewConsolidatedDetails = async (loanId) => {
    const loan = loanRequests.find(l => l.id === loanId);
    if (loan) {
      await openDetailsModal(loan);
      setExpandedLoanHistory(loan.employee?.id);
    }
  };

  // ==================== SIDEBAR & USER EFFECTS ====================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }, credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ id: data.id, name: data.username, role: data.role.replace("ROLE_", "").toLowerCase(), email: data.email });
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchLoanRequests();
    fetchPayrollPeriods();
    const interval = setInterval(fetchLoanRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters(loanRequests, filter, searchTerm, dateRange);
  }, [filter, searchTerm, dateRange, loanRequests, showActiveOnly, showConsolidatedOnly, showCompletedOnly]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, credentials: "include",
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
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'consolidated': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'pending': default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleLoanAmountChange = (value) => {
    const newAmount = parseFloat(value) || 0;
    setModifiedLoanDetails(prev => {
      const monthlyPayment = calculateMonthlyPayment(newAmount, prev.repaymentPeriod);
      return { ...prev, loanAmount: newAmount, monthlyRepayment: monthlyPayment };
    });
  };

  const handleRepaymentPeriodChange = (value) => {
    const newPeriod = parseInt(value) || 0;
    setModifiedLoanDetails(prev => {
      const monthlyPayment = calculateMonthlyPayment(prev.loanAmount, newPeriod);
      return { ...prev, repaymentPeriod: newPeriod, monthlyRepayment: monthlyPayment };
    });
  };

  const handleMonthlyPaymentChange = (value) => {
    const newMonthlyPayment = parseFloat(value) || 0;
    setModifiedLoanDetails(prev => ({ ...prev, monthlyRepayment: newMonthlyPayment }));
  };

  // ==================== SIDEBAR HANDLERS ====================
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
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [sidebarOpen]);

  const sortedRequests = getSortedRequests();

  // Get filter description for display
  const getFilterDescription = () => {
    if (activeCardFilter === 'total') return 'Showing all loan requests';
    if (activeCardFilter === 'pending') return 'Showing pending loan requests only';
    if (activeCardFilter === 'active') return 'Showing active loans only';
    if (activeCardFilter === 'rejected') return 'Showing rejected loan requests only';
    if (activeCardFilter === 'totalAmount') return 'Showing all loan requests';
    if (showActiveOnly) return 'Showing active loans only';
    if (showConsolidatedOnly) return 'Showing consolidated loan history only';
    if (showCompletedOnly) return 'Showing completed loans only';
    if (filter !== 'all') return `Showing ${filter} loan requests only`;
    if (searchTerm) return `Showing results for "${searchTerm}"`;
    if (dateRange.start || dateRange.end) return 'Showing filtered by date range';
    return 'Showing all loan requests';
  };

  // ==================== RENDER ====================
  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'}`}>
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {sidebarOpen && window.innerWidth < 768 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'}`}>
        <main className="flex-1 mx-auto px-4 md:px-6 py-6">
          <Header toggleSidebar={toggleSidebar} user={user} onLogout={handleLogout} />

          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-sm mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Loan Approval Management</h1>
              <p className="text-gray-600">Review and manage employee loan requests</p>
            </div>
          </section>

          {/* CLICKABLE SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 mt-6">
            {/* Total Requests Card */}
            <div 
              onClick={() => handleCardClick('total')}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 ${
                activeCardFilter === 'total' 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <p className="text-sm text-gray-600 mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              {activeCardFilter === 'total' && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Active filter
                </div>
              )}
            </div>

            {/* Pending Card */}
            <div 
              onClick={() => handleCardClick('pending')}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 ${
                activeCardFilter === 'pending' 
                  ? 'border-yellow-500 bg-yellow-50 shadow-md' 
                  : 'border-gray-200 hover:border-yellow-300'
              }`}
            >
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              {activeCardFilter === 'pending' && (
                <div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Active filter
                </div>
              )}
            </div>

            {/* Active Loans Card */}
            <div 
              onClick={() => handleCardClick('active')}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 ${
                activeCardFilter === 'active' 
                  ? 'border-green-500 bg-green-50 shadow-md' 
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <p className="text-sm text-gray-600 mb-1">Active Loans</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              {activeCardFilter === 'active' && (
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Active filter
                </div>
              )}
            </div>

            {/* Rejected Card */}
            <div 
              onClick={() => handleCardClick('rejected')}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 ${
                activeCardFilter === 'rejected' 
                  ? 'border-red-500 bg-red-50 shadow-md' 
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <p className="text-sm text-gray-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              {activeCardFilter === 'rejected' && (
                <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Active filter
                </div>
              )}
            </div>

            {/* Total Amount Card */}
            <div 
              onClick={() => handleCardClick('totalAmount')}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 ${
                activeCardFilter === 'totalAmount' 
                  ? 'border-purple-500 bg-purple-50 shadow-md' 
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalAmount)}</p>
              {activeCardFilter === 'totalAmount' && (
                <div className="mt-2 text-xs text-purple-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Scroll to table
                </div>
              )}
            </div>
          </div>

          {/* Active Filter Indicator and Clear Button */}
          {(activeCardFilter || showActiveOnly || showConsolidatedOnly || showCompletedOnly || filter !== 'all' || searchTerm || dateRange.start || dateRange.end) && (
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-sm text-blue-800">
                  <span className="font-medium">Active Filter:</span> {getFilterDescription()}
                </span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  {sortedRequests.length} result{sortedRequests.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={clearCardFilter}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All Filters
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-4">
            <button onClick={() => { setShowActiveOnly(true); setShowConsolidatedOnly(false); setShowCompletedOnly(false); setActiveCardFilter(null); }} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${showActiveOnly ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Active Loans Only</div>
            </button>
            <button onClick={() => { setShowActiveOnly(false); setShowConsolidatedOnly(true); setShowCompletedOnly(false); setActiveCardFilter(null); }} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${showConsolidatedOnly ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>Consolidated History</div>
            </button>
            <button onClick={() => { setShowActiveOnly(false); setShowConsolidatedOnly(false); setShowCompletedOnly(true); setActiveCardFilter(null); }} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${showCompletedOnly ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Completed Loans</div>
            </button>
            <button onClick={resetVisibilityFilters} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors">
              <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Show All</div>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={filter} onChange={(e) => { setFilter(e.target.value); setActiveCardFilter(null); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Search</label><input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setActiveCardFilter(null); }} placeholder="Employee name, ID, purpose..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">From Date</label><input type="date" value={dateRange.start} onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setActiveCardFilter(null); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">To Date</label><input type="date" value={dateRange.end} onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setActiveCardFilter(null); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
            </div>
          </div>

          {filteredRequests.some(r => r.selected) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-blue-700">{filteredRequests.filter(r => r.selected).length} loan(s) selected</p>
              <div className="flex gap-2"><button onClick={() => handleBulkAction('approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Approve Selected</button><button onClick={() => handleBulkAction('reject')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Reject Selected</button><button onClick={() => handleBulkToggle(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Activate Selected</button><button onClick={() => handleBulkToggle(false)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm">Deactivate Selected</button></div>
            </div>
          )}

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-600">{success}</p></div>}

          <div id="loan-table-section" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left"><input type="checkbox" checked={filteredRequests.length > 0 && filteredRequests.every(r => r.selected)} onChange={toggleSelectAll} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('requestId')}><div className="flex items-center">Request ID<SortIcon columnKey="requestId" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('employee')}><div className="flex items-center">Employee<SortIcon columnKey="employee" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('requestedAmount')}><div className="flex items-center">Requested Amount<SortIcon columnKey="requestedAmount" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('approvedAmount')}><div className="flex items-center">Approved Amount<SortIcon columnKey="approvedAmount" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('remainingBalance')}><div className="flex items-center">Remaining Balance<SortIcon columnKey="remainingBalance" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('paidPercentage')}><div className="flex items-center">Paid %<SortIcon columnKey="paidPercentage" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('purpose')}><div className="flex items-center">Purpose<SortIcon columnKey="purpose" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('requestDate')}><div className="flex items-center">Request Date<SortIcon columnKey="requestDate" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('loanStatus')}><div className="flex items-center">Loan Status<SortIcon columnKey="loanStatus" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('active')}><div className="flex items-center">Active<SortIcon columnKey="active" /></div></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRequests.length === 0 ? (
                    <tr><td colSpan="12" className="px-6 py-12 text-center text-gray-500">No loan requests found</td></tr>
                  ) : (
                    sortedRequests.map((request) => {
                      const approvedAmount = request.approvedAmount || request.loanAmount;
                      const remainingBalance = request.remainingBalance ?? (approvedAmount - (request.paidAmount || 0));
                      const paidPercentage = approvedAmount > 0 ? ((request.paidAmount || 0) / approvedAmount) * 100 : 0;
                      const isAggregated = request.isAggregated;
                      const isActive = request.isActive;
                      const status = request.status;
                      
                      const getLocalStatusBadgeClass = () => {
                        switch(status?.toLowerCase()) {
                          case 'approved': return 'bg-green-100 text-green-800';
                          case 'pending': return 'bg-yellow-100 text-yellow-800';
                          case 'rejected': return 'bg-red-100 text-red-800';
                          case 'consolidated': return 'bg-purple-100 text-purple-800';
                          case 'completed': return 'bg-blue-100 text-blue-800';
                          default: return 'bg-gray-100 text-gray-800';
                        }
                      };
                      
                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap"><input type="checkbox" checked={request.selected || false} onChange={() => toggleSelectRequest(request.id)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{request.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{request.employee?.firstName} {request.employee?.lastName}</div><div className="text-sm text-gray-500">{request.employee?.employeeId || 'N/A'}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GHS {request.loanAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">GHS {approvedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>{request.approvedAmount && request.approvedAmount !== request.loanAmount && (<div className="text-xs text-gray-500">(Modified from GHS {request.loanAmount?.toLocaleString()})</div>)}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className={`text-sm font-semibold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>GHS {remainingBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="flex-1 min-w-16"><div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(paidPercentage, 100)}%` }} /></div></div><span className="ml-2 text-sm text-gray-600">{paidPercentage.toFixed(1)}%</span></div><div className="text-xs text-gray-400 mt-1">Paid: GHS {(request.paidAmount || 0)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></td>
                          <td className="px-6 py-4"><div className="text-sm text-gray-900 max-w-xs truncate" title={request.purpose}>{request.purpose || 'N/A'}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.requestDate ? new Date(request.requestDate).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLocalStatusBadgeClass()}`}>{status || 'Pending'}</span>{isAggregated && (<span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Aggregated</span>)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {status === 'Approved' && isActive === true ? (
                              <button onClick={() => toggleActiveStatus(request)} className="px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Active</button>
                            ) : status === 'Approved' && isActive === false && remainingBalance > 0 ? (
                              <button onClick={() => toggleActiveStatus(request)} className="px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-gray-100 text-gray-600 hover:bg-gray-200"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Inactive</button>
                            ) : (<span className="text-gray-400 text-xs">—</span>)}
                           </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button onClick={() => viewLoanDetails(request.id)} className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50" title="View Details">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            
                            {status === 'Pending' && (
                              <>
                                <button onClick={() => openApproveModal(request)} className="text-green-600 hover:text-green-900 transition-colors p-1 rounded hover:bg-green-50" title="Approve/Edit">
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={() => rejectLoan(request)} className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50" title="Reject">
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                            
                            {isAggregated && request.aggregatedFromLoanIds && (
                              <>
                                <button onClick={() => viewConsolidatedDetails(request.id)} className="text-purple-600 hover:text-purple-900 transition-colors p-1 rounded hover:bg-purple-50" title="View Consolidated Details">
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                </button>
                                
                                <button 
                                  onClick={() => openDeleteModal(request)} 
                                  className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50" 
                                  title="Delete Consolidated Loan (Restore Originals)"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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
        </main>
      </div>

      {/* Details Modal - Same as original */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Loan Request Details</h2><button onClick={() => { setShowDetailsModal(false); setEmployeePayrollHistory(null); setLoanHistoryData(null); }} className="text-gray-500 hover:text-gray-700"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-gray-500">Request ID</p><p className="text-sm font-medium text-gray-900">REQ#{selectedRequest.id}</p></div><div><p className="text-sm text-gray-500">Status</p><span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border mt-1 ${getStatusBadgeClass(selectedRequest.status)}`}>{selectedRequest.status}</span></div><div><p className="text-sm text-gray-500">Request Date</p><p className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.requestDate)}</p></div><div><p className="text-sm text-gray-500">Processed Date</p><p className="text-sm font-medium text-gray-900">{selectedRequest.processedDate ? formatDate(selectedRequest.processedDate) : '—'}</p></div></div>
                <div className="border-t border-gray-200 pt-4"><h3 className="text-sm font-medium text-gray-700 mb-3">Employee Information</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-gray-500">Name</p><p className="text-sm font-medium text-gray-900">{selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}</p></div><div><p className="text-sm text-gray-500">Employee ID</p><p className="text-sm font-medium text-gray-900">{selectedRequest.employee?.employeeId}</p></div><div><p className="text-sm text-gray-500">Employee Start Date</p><p className="text-sm font-medium text-gray-900">{selectedRequest.employee?.startDate || 'N/A'}</p></div><div><p className="text-sm text-gray-500">Department</p><p className="text-sm font-medium text-gray-900">{selectedRequest.employee?.department || 'N/A'}</p></div><div><p className="text-sm text-gray-500">Monthly Salary</p><p className="text-sm font-medium text-gray-900">{formatCurrency(selectedRequest.employee?.monthlySalary || 0)}</p></div></div></div>
                <div className="border-t border-gray-200 pt-4"><button onClick={() => setExpandedLoanHistory(expandedLoanHistory === selectedRequest.employee?.id ? null : selectedRequest.employee?.id)} className="flex items-center justify-between w-full text-left"><h3 className="text-sm font-medium text-gray-700">Loan History</h3><svg className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedLoanHistory === selectedRequest.employee?.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>{expandedLoanHistory === selectedRequest.employee?.id && (<div className="mt-3 space-y-3">{loadingHistory ? (<div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>) : loanHistoryData ? (<div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-blue-50 p-3 rounded-lg"><p className="text-xs text-blue-600">Total Borrowed</p><p className="text-sm font-bold text-blue-800">{formatCurrency(loanHistoryData.totalBorrowed)}</p></div><div className="bg-green-50 p-3 rounded-lg"><p className="text-xs text-green-600">Total Paid</p><p className="text-sm font-bold text-green-800">{formatCurrency(loanHistoryData.totalPaid)}</p></div><div className="bg-yellow-50 p-3 rounded-lg"><p className="text-xs text-yellow-600">Outstanding</p><p className="text-sm font-bold text-yellow-800">{formatCurrency(loanHistoryData.totalOutstanding)}</p></div><div className="bg-purple-50 p-3 rounded-lg"><p className="text-xs text-purple-600">Consolidated Loans</p><p className="text-sm font-bold text-purple-800">{loanHistoryData.consolidatedLoans?.length || 0}</p></div></div>{loanHistoryData.activeLoans && loanHistoryData.activeLoans.length > 0 && (<div><p className="text-sm font-medium text-green-700 mb-2">Active Loans</p><div className="space-y-2">{loanHistoryData.activeLoans.map(loan => (<div key={loan.id} className="bg-green-50 border border-green-200 rounded-lg p-3"><div className="flex justify-between items-start"><div><p className="text-sm font-medium text-green-800">Loan #{loan.id}</p><p className="text-xs text-gray-600">Amount: {formatCurrency(loan.approvedAmount || loan.loanAmount)}</p><p className="text-xs text-gray-600">Remaining: {formatCurrency(loan.remainingBalance)}</p></div><span className="px-2 py-0.5 text-xs rounded-full bg-green-200 text-green-800">Active</span></div></div>))}</div></div>)}{loanHistoryData.consolidatedLoans && loanHistoryData.consolidatedLoans.length > 0 && (<div><p className="text-sm font-medium text-purple-700 mb-2">Consolidated Loans (History)</p><div className="space-y-2">{loanHistoryData.consolidatedLoans.map(loan => (<div key={loan.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3"><div className="flex justify-between items-start"><div><p className="text-sm font-medium text-purple-800">Loan #{loan.id}</p><p className="text-xs text-gray-600">Original: {formatCurrency(loan.originalLoanAmount || loan.loanAmount)}</p><p className="text-xs text-gray-600">Consolidation Date: {formatDate(loan.consolidationDate)}</p></div><span className="px-2 py-0.5 text-xs rounded-full bg-purple-200 text-purple-800">Consolidated</span></div></div>))}</div></div>)}{loanHistoryData.completedLoans && loanHistoryData.completedLoans.length > 0 && (<div><p className="text-sm font-medium text-gray-700 mb-2">Completed Loans</p><div className="space-y-2">{loanHistoryData.completedLoans.map(loan => (<div key={loan.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3"><div className="flex justify-between items-start"><div><p className="text-sm font-medium text-gray-700">Loan #{loan.id}</p><p className="text-xs text-gray-500">Amount: {formatCurrency(loan.approvedAmount || loan.loanAmount)}</p><p className="text-xs text-gray-500">Completed: {formatDate(loan.completedDate)}</p></div><span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">Completed</span></div></div>))}</div></div>)}</div>) : (<p className="text-sm text-gray-500 italic">No loan history available</p>)}</div>)}</div>
                <div className="border-t border-gray-200 pt-4"><h3 className="text-sm font-medium text-gray-700 mb-3">Payroll History</h3>{loadingPayrollHistory ? (<div className="flex justify-center items-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><span className="ml-2 text-sm text-gray-600">Loading payroll history...</span></div>) : employeePayrollHistory ? (<div><div className="grid grid-cols-2 gap-3 mb-4"><div className="bg-blue-50 p-3 rounded-lg"><p className="text-xs text-blue-600">Times on Payroll</p><p className="text-lg font-bold text-blue-800">{employeePayrollHistory.payrollCount}</p></div><div className="bg-green-50 p-3 rounded-lg"><p className="text-xs text-green-600">Average Net Salary</p><p className="text-lg font-bold text-green-800">{formatCurrency(employeePayrollHistory.averageNetSalary)}</p></div></div>{employeePayrollHistory.payrollRecords && employeePayrollHistory.payrollRecords.length > 0 ? (<div><p className="text-sm font-medium text-gray-700 mb-2">Net Salary History</p><div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg"><table className="min-w-full text-sm"><thead className="bg-gray-50 sticky top-0"><tr><th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Period</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Net Salary</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Loan Deduction</th></tr></thead><tbody className="divide-y divide-gray-200">{employeePayrollHistory.payrollRecords.map((record, index) => (<tr key={index} className="hover:bg-gray-50"><td className="px-3 py-2 text-xs text-gray-900">{record.periodName || formatDate(record.periodStartDate)}</td><td className="px-3 py-2 text-xs font-medium text-green-600">{formatCurrency(record.netSalary)}</td><td className="px-3 py-2 text-xs text-red-600">{formatCurrency(record.loanDeduction || 0)}</td></tr>))}</tbody>}</table></div></div>) : (<p className="text-sm text-gray-500 italic">No payroll history available for this employee</p>)}</div>) : (<p className="text-sm text-gray-500 italic">Unable to load payroll history</p>)}</div>
                <div className="border-t border-gray-200 pt-4"><h3 className="text-sm font-medium text-gray-700 mb-3">Loan Terms</h3><div className="bg-gray-50 rounded-lg overflow-hidden"><table className="min-w-full text-sm"><thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Term</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Requested</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Approved</th></tr></thead><tbody className="divide-y divide-gray-200"><tr><td className="px-4 py-3 text-gray-600">Loan Amount</td><td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(selectedRequest.loanAmount)}</td><td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(selectedRequest.approvedAmount || selectedRequest.loanAmount)}</td></tr><tr><td className="px-4 py-3 text-gray-600">Repayment Period</td><td className="px-4 py-3 font-medium text-gray-900">{selectedRequest.repaymentPeriod} months</td><td className="px-4 py-3 font-medium text-gray-900">{selectedRequest.approvedRepaymentPeriod || selectedRequest.repaymentPeriod} months</td></tr><tr><td className="px-4 py-3 text-gray-600">Monthly Payment</td><td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(selectedRequest.monthlyPaymentAmount || selectedRequest.monthlyRepayment || 0)}</td><td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(selectedRequest.approvedMonthlyPayment || selectedRequest.monthlyPaymentAmount || 0)}</td></tr><tr><td className="px-4 py-3 text-gray-600">Paid Amount</td><td className="px-4 py-3 font-medium text-gray-900" colSpan="2">{formatCurrency(selectedRequest.paidAmount || 0)}</td></tr><tr><td className="px-4 py-3 text-gray-600">Remaining Balance</td><td className="px-4 py-3 font-medium text-gray-900" colSpan="2">{formatCurrency(selectedRequest.remainingBalance || (selectedRequest.approvedAmount - (selectedRequest.paidAmount || 0)))}</td></tr></tbody></table></div><div className="mt-4"><p className="text-sm text-gray-500">Purpose</p><p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{selectedRequest.purpose}</p></div></div>
                {(selectedRequest.processedBy || selectedRequest.processingNotes) && (<div className="border-t border-gray-200 pt-4"><h3 className="text-sm font-medium text-gray-700 mb-3">Processing Information</h3><div className="bg-gray-50 rounded-lg p-4 space-y-3">{selectedRequest.processedBy && (<div className="flex items-center gap-2"><svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-sm text-gray-600"><span className="font-medium">Processed by:</span> {selectedRequest.processedBy}</span></div>)}{selectedRequest.processedDate && (<div className="flex items-center gap-2"><svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-sm text-gray-600"><span className="font-medium">Processed on:</span> {formatDate(selectedRequest.processedDate)}</span></div>)}{selectedRequest.processingNotes && (<div className="mt-2 pt-2 border-t border-gray-200"><p className="text-xs font-medium text-gray-500 mb-1">Processing Notes:</p><p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">{selectedRequest.processingNotes}</p></div>)}</div></div>)}
              </div>
              {selectedRequest.status === 'Pending' && (<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200"><button onClick={() => { setShowDetailsModal(false); openActionModal(selectedRequest, 'reject'); }} className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Reject</button><button onClick={() => { setShowDetailsModal(false); openActionModal(selectedRequest, 'approve'); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button></div>)}
            </div>
          </div>
        </div>
      )}

      {/* Delete Consolidated Loan Modal */}
      {showDeleteModal && deletingLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Delete Consolidated Loan</h2>
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingLoan(null);
                    setDeletePreview(null);
                    setDeleteReason('');
                  }} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-red-800">Warning: This action cannot be undone!</h3>
                  </div>
                  <p className="text-sm text-red-700">
                    This will permanently delete the consolidated loan and restore all original loans to active status.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">Consolidated Loan Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Loan ID</p>
                      <p className="font-medium">#{deletingLoan.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Employee</p>
                      <p className="font-medium">{deletingLoan.employee?.firstName} {deletingLoan.employee?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-medium text-red-600">{formatCurrency(deletingLoan.aggregatedTotal || deletingLoan.approvedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Consolidation Date</p>
                      <p className="font-medium">{formatDate(deletingLoan.consolidationDate)}</p>
                    </div>
                  </div>
                </div>

                {deletePreview && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Loans that will be restored:
                    </h3>
                    <p className="text-sm text-green-700 mb-2">
                      {deletePreview.willRestoreCount} original loan(s) will be restored to active status
                    </p>
                    {deletePreview.willRestoreLoans && deletePreview.willRestoreLoans.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {deletePreview.willRestoreLoans.map((loan, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-800">Loan #{loan.id}</p>
                                <p className="text-xs text-gray-500">Original Amount: {formatCurrency(loan.originalAmount)}</p>
                                <p className="text-xs text-gray-500">Remaining Balance: {formatCurrency(loan.remainingBalance)}</p>
                                <p className="text-xs text-gray-500">Paid: {formatCurrency(loan.paidAmount)}</p>
                              </div>
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                Will be restored
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-green-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Total Amount to be Restored:</span>
                        <span className="font-bold text-green-800">{formatCurrency(deletePreview.totalRestoredAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-green-700">Total Outstanding to be Restored:</span>
                        <span className="font-bold text-orange-600">{formatCurrency(deletePreview.totalRestoredOutstanding)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for deletion (required for soft delete, optional for permanent)
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows="2"
                    placeholder="Please provide a reason for deleting this consolidated loan..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingLoan(null);
                    setDeletePreview(null);
                    setDeleteReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={softDeleteConsolidatedLoan}
                  disabled={deleteLoading || !deleteReason.trim()}
                  className={`px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 ${
                    (deleteLoading || !deleteReason.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Soft delete (mark as deleted, can be restored later)"
                >
                  {deleteLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  )}
                  Soft Delete
                </button>
                
                <button
                  onClick={handleDeleteConsolidatedLoan}
                  disabled={deleteLoading}
                  className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 ${
                    deleteLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {deleteLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  Permanently Delete & Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{actionType === 'approve' ? 'Approve' : 'Reject'} Loan Request</h2>
              <div className="mb-4"><p className="text-sm text-gray-600 mb-2">{actionType === 'approve' ? 'Review and modify loan details before approval' : 'Are you sure you want to reject this loan request?'}</p><div className="bg-gray-50 p-3 rounded-lg mb-4"><p className="text-sm text-gray-700"><span className="font-medium">Employee:</span> {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}</p><p className="text-sm text-gray-700"><span className="font-medium">Requested Amount:</span> {formatCurrency(selectedRequest.loanAmount)}</p><p className="text-sm text-gray-700"><span className="font-medium">Requested Period:</span> {selectedRequest.repaymentPeriod} months</p>{existingActiveLoans.length > 0 && actionType === 'approve' && (<div className="mt-3 pt-3 border-t border-yellow-200"><p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Existing Active Loans Found</p><div className="space-y-1 text-xs text-gray-600"><p>Number of active loans: {existingActiveLoans.length}</p><p>Total outstanding balance: {formatCurrency(existingActiveLoans.reduce((sum, loan) => sum + (loan.remainingBalance || loan.approvedAmount - (loan.paidAmount || 0)), 0))}</p></div></div>)}{employeePayrollHistory && (<div className="mt-2 pt-2 border-t border-gray-200"><p className="text-xs text-gray-500">Payroll History:</p><p className="text-xs"><span className="font-medium">Times on Payroll:</span> {employeePayrollHistory.payrollCount} | <span className="font-medium ml-2">Avg Net:</span> {formatCurrency(employeePayrollHistory.averageNetSalary)}</p></div>)}</div>{actionType === 'approve' && (<div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Approved Loan Amount *</label><input type="number" value={modifiedLoanDetails.loanAmount} onChange={(e) => handleLoanAmountChange(e.target.value)} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Repayment Period (months) *</label><input type="number" value={modifiedLoanDetails.repaymentPeriod} onChange={(e) => handleRepaymentPeriodChange(e.target.value)} min="1" max="60" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Monthly Repayment Amount *</label><input type="number" value={modifiedLoanDetails.monthlyRepayment} onChange={(e) => handleMonthlyPaymentChange(e.target.value)} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /><p className="text-xs text-gray-500 mt-1">Calculated based on amount and period. Adjust if needed.</p></div>{(modifiedLoanDetails.loanAmount !== selectedRequest.loanAmount || modifiedLoanDetails.repaymentPeriod !== selectedRequest.repaymentPeriod) && (<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"><p className="text-sm text-yellow-800 font-medium">Modified Terms</p><p className="text-xs text-yellow-700 mt-1">Original: {formatCurrency(selectedRequest.loanAmount)} over {selectedRequest.repaymentPeriod} months</p><p className="text-xs text-yellow-700">New: {formatCurrency(modifiedLoanDetails.loanAmount)} over {modifiedLoanDetails.repaymentPeriod} months</p></div>)}{existingActiveLoans.length > 0 && (<div className="border-t border-gray-200 pt-3 mt-3"><label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" checked={consolidateWithExisting} onChange={(e) => setConsolidateWithExisting(e.target.checked)} className="h-4 w-4 text-blue-600 rounded mt-0.5" /><div><span className="text-sm font-medium text-gray-700">Consolidate with existing active loans</span><p className="text-xs text-gray-500">This will combine this loan with {existingActiveLoans.length} existing active loan(s) into a single consolidated loan. The existing loans will be marked as consolidated and hidden from active view.</p></div></label>{consolidateWithExisting && (<div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-sm font-medium text-blue-800 mb-2">Consolidation Summary</p><div className="space-y-1 text-xs"><p className="flex justify-between"><span className="text-gray-600">Existing outstanding:</span><span className="font-medium">{formatCurrency(getConsolidationSummary()?.totalOutstanding || 0)}</span></p><p className="flex justify-between"><span className="text-gray-600">New loan amount:</span><span className="font-medium">{formatCurrency(modifiedLoanDetails.loanAmount)}</span></p><p className="flex justify-between pt-1 border-t border-blue-200 mt-1"><span className="font-medium text-gray-800">Total consolidated amount:</span><span className="font-bold text-blue-800">{formatCurrency(getConsolidationSummary()?.newTotal || 0)}</span></p><p className="flex justify-between text-xs text-gray-500 mt-1"><span>New monthly payment (est.):</span><span>{formatCurrency(getConsolidationSummary()?.newMonthlyPayment || 0)}</span></p><p className="text-xs text-gray-500 mt-1">Over {modifiedLoanDetails.repaymentPeriod} months</p><p className="text-xs text-green-600 mt-2">✓ Existing loans will be moved to consolidated history</p></div></div>)}</div>)}</div>)}</div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Notes {actionType === 'approve' ? '(Optional)' : '(Optional)'}</label><textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} rows="3" placeholder={actionType === 'approve' ? "Add any notes about the modified terms or approval conditions..." : "Add any notes about why you're rejecting this request..."} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div className="flex justify-end gap-3"><button onClick={() => { setShowActionModal(false); setSelectedRequest(null); setActionNote(''); setModifiedLoanDetails({ loanAmount: 0, repaymentPeriod: 0, monthlyRepayment: 0 }); setConsolidateWithExisting(false); setExistingActiveLoans([]); setEmployeePayrollHistory(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button><button onClick={handleAction} disabled={loading || (actionType === 'approve' && (!modifiedLoanDetails.loanAmount || !modifiedLoanDetails.repaymentPeriod || !modifiedLoanDetails.monthlyRepayment))} className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${loading || (actionType === 'approve' && (!modifiedLoanDetails.loanAmount || !modifiedLoanDetails.repaymentPeriod || !modifiedLoanDetails.monthlyRepayment)) ? 'opacity-50 cursor-not-allowed' : ''}`}>{loading ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</>) : (`Confirm ${actionType === 'approve' ? 'Approval' : 'Rejection'}`)}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Active/Inactive Modal */}
      {showToggleModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{toggleAction === 'activate' ? 'Activate' : 'Deactivate'} Loan</h2>
              <div className="mb-4"><p className="text-sm text-gray-600 mb-2">Are you sure you want to {toggleAction} this loan?</p><div className="bg-gray-50 p-3 rounded-lg mb-4"><p className="text-sm text-gray-700"><span className="font-medium">Employee:</span> {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}</p><p className="text-sm text-gray-700"><span className="font-medium">Loan Amount:</span> {formatCurrency(selectedRequest.approvedAmount || selectedRequest.loanAmount)}</p><p className="text-sm text-gray-700"><span className="font-medium">Remaining Balance:</span> {formatCurrency(selectedRequest.remainingBalance || 0)}</p><p className="text-sm text-gray-700"><span className="font-medium">Current Status:</span> {selectedRequest.isActive ? 'Active' : 'Inactive'}</p></div>{toggleAction === 'deactivate' && (<div><label className="block text-sm font-medium text-gray-700 mb-2">Reason for deactivation *</label><textarea value={toggleReason} onChange={(e) => setToggleReason(e.target.value)} rows="3" placeholder="Please provide a reason for deactivating this loan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div>)}{toggleAction === 'activate' && (<div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-sm text-blue-800">Activating this loan will resume monthly deductions from the employee's salary.</p></div>)}</div>
              <div className="flex justify-end gap-3"><button onClick={() => { setShowToggleModal(false); setSelectedRequest(null); setToggleReason(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button><button onClick={handleToggleActive} disabled={toggleLoading || (toggleAction === 'deactivate' && !toggleReason.trim())} className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${toggleAction === 'activate' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${(toggleLoading || (toggleAction === 'deactivate' && !toggleReason.trim())) ? 'opacity-50 cursor-not-allowed' : ''}`}>{toggleLoading ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</>) : (`Confirm ${toggleAction === 'activate' ? 'Activation' : 'Deactivation'}`)}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoanManagementDashboard;