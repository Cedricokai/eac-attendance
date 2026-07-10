import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import Header from "../../../components/Header";
import { 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon,
  PaperClipIcon,
  XMarkIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { TrashIcon, CheckCircleIcon, XCircleIcon as XCircleSolid } from '@heroicons/react/24/solid';

import LeaveDetailsModal from "./leaveDetailsModal";
import AdminLeaveBalanceView from "./AdminLeaveBalanceView";

function Leave() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedLeaveId, setHighlightedLeaveId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  
  const [query, setQuery] = useState('');
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState([]);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [file, setFile] = useState(null);
  const [viewMode, setViewMode] = useState('requests');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedLeaves, setSelectedLeaves] = useState(new Set());
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState(null);
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isProcessingSingle, setIsProcessingSingle] = useState(false);
  const [processingLeaveId, setProcessingLeaveId] = useState(null);
  
  // Category filter state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  
  const [filters, setFilters] = useState({
    status: 'All',
    leaveType: 'All',
    dateRange: 'All',
    startDate: '',
    endDate: '',
    employeeName: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'submittedDate',
    direction: 'desc'
  });

  const [newLeave, setNewLeave] = useState({
    employee: { id: '' },
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'Pending'
  });

  const [leaveSettings, setLeaveSettings] = useState({
    maternityLeaveMonths: 3,
    paternityLeaveMonths: 1,
    nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study']
  });

  const [categories, setCategories] = useState([]);
  const [toastMessage, setToastMessage] = useState({ type: '', text: '', visible: false });

  const showToast = (type, text) => {
    setToastMessage({ type, text, visible: true });
    setTimeout(() => setToastMessage({ type: '', text: '', visible: false }), 3000);
  };

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const getUniqueCategoriesFromLeaves = () => {
    const categoriesSet = new Set();
    leaves.forEach(leave => {
      if (leave.employee?.category?.name) {
        categoriesSet.add(leave.employee.category.name);
      }
    });
    return Array.from(categoriesSet).sort();
  };

  const isLeaveDeductible = (leaveType) => {
    return !leaveSettings.nonDeductibleLeaveTypes?.includes(leaveType);
  };

  const calculateLeaveDays = (startDate, endDate, leaveType, employeeCategory) => {
    if (!startDate || !endDate) return 0;
    
    if (!isLeaveDeductible(leaveType)) {
      return 0;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let excludeWeekends = true;
    if (employeeCategory && employeeCategory.excludeWeekendsFromLeave !== undefined) {
      excludeWeekends = employeeCategory.excludeWeekendsFromLeave;
    }
    
    let days = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const isWeekendDay = (dayOfWeek === 0 || dayOfWeek === 6);
      
      if (excludeWeekends) {
        if (!isWeekendDay) {
          days++;
        }
      } else {
        days++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const getEmployeeRemainingLeave = (employee) => {
    if (!employee) return 0;
    
    const annualLeaveDays = employee.category?.annualLeaveDays || 20;
    
    const usedLeaveDays = leaves
      .filter(leave => 
        leave.employee?.id === employee.id && 
        leave.status === 'Approved' &&
        isLeaveDeductible(leave.leaveType)
      )
      .reduce((total, leave) => {
        return total + calculateLeaveDays(
          leave.startDate, 
          leave.endDate, 
          leave.leaveType, 
          employee.category
        );
      }, 0);
    
    return Math.max(0, annualLeaveDays - usedLeaveDays);
  };

  const hasSufficientLeaveBalance = (employee, leaveType, startDate, endDate) => {
    if (!isLeaveDeductible(leaveType)) {
      return true;
    }
    
    const requestedDays = calculateLeaveDays(startDate, endDate, leaveType, employee?.category);
    const remainingBalance = getEmployeeRemainingLeave(employee);
    
    return requestedDays <= remainingBalance;
  };

  const fetchUser = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          name: data.username,
          role: data.role.replace("ROLE_", "").toLowerCase(),
          email: data.email
        });
      }
    } catch (err) {
      console.error("Failed to fetch user", err);
    }
  };

  const handleLogout = async () => {
    try {
      const token = getToken();
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSelectLeave = (leaveId) => {
    const newSelected = new Set(selectedLeaves);
    if (newSelected.has(leaveId)) {
      newSelected.delete(leaveId);
    } else {
      newSelected.add(leaveId);
    }
    setSelectedLeaves(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeaves.size === filteredLeaves.length) {
      setSelectedLeaves(new Set());
    } else {
      const allIds = filteredLeaves.map(leave => leave.id);
      setSelectedLeaves(new Set(allIds));
    }
  };

  const handleBulkApprove = () => {
    if (selectedLeaves.size === 0) {
      showToast('error', 'Please select at least one leave request to approve');
      return;
    }
    setBulkActionType('approve');
    setIsBulkActionModalOpen(true);
  };

  const handleBulkReject = () => {
    if (selectedLeaves.size === 0) {
      showToast('error', 'Please select at least one leave request to reject');
      return;
    }
    setBulkActionType('reject');
    setIsBulkActionModalOpen(true);
  };

  const executeBulkAction = async () => {
    setIsProcessingBulk(true);
    setBulkFeedback('');
    const leaveIds = Array.from(selectedLeaves);
    
    try {
      const token = getToken();
      const endpoint = bulkActionType === 'approve' 
        ? `${API_BASE_URL}/api/leave/bulk/approve`
        : `${API_BASE_URL}/api/leave/bulk/reject`;
      
      showToast('info', `Processing ${bulkActionType} for ${leaveIds.length} leave request(s)...`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaveIds: leaveIds,
          feedback: bulkFeedback || (bulkActionType === 'approve' ? 'Bulk approved by supervisor' : 'Bulk rejected by supervisor')
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bulk action failed');
      }

      const result = await response.json();
      showToast('success', `Successfully ${bulkActionType === 'approve' ? 'approved' : 'rejected'} ${result.processedCount} leave requests`);
      
      setSelectedLeaves(new Set());
      setIsBulkActionModalOpen(false);
      setBulkFeedback('');
      await fetchLeaves();
      
    } catch (err) {
      showToast('error', 'Error processing bulk action: ' + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const deleteLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to delete this leave request? This action cannot be undone.')) {
      return;
    }

    setProcessingLeaveId(leaveId);
    
    try {
      const token = getToken();
      showToast('info', 'Deleting leave request...');
      
      const response = await fetch(`${API_BASE_URL}/api/leave/${leaveId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete leave request');
      }

      showToast('success', 'Leave request deleted successfully');
      await fetchLeaves();
      
      if (selectedLeaves.has(leaveId)) {
        const newSelected = new Set(selectedLeaves);
        newSelected.delete(leaveId);
        setSelectedLeaves(newSelected);
      }
    } catch (err) {
      showToast('error', 'Error deleting leave request: ' + err.message);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeaves.size === 0) {
      showToast('error', 'Please select at least one leave request to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedLeaves.size} leave request(s)? This action cannot be undone.`)) {
      return;
    }

    setIsProcessingBulk(true);
    const leaveIds = Array.from(selectedLeaves);

    try {
      const token = getToken();
      showToast('info', `Deleting ${leaveIds.length} leave request(s)...`);
      
      const response = await fetch(`${API_BASE_URL}/api/leave/bulk/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ leaveIds: leaveIds })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bulk delete failed');
      }

      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        showToast('warning', `Deleted ${result.deletedCount} leave requests. Some had errors: ${result.errors.length}`);
      } else {
        showToast('success', `Successfully deleted ${result.deletedCount} leave requests`);
      }
      
      setSelectedLeaves(new Set());
      await fetchLeaves();
      
    } catch (err) {
      showToast('error', 'Error deleting leave requests: ' + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
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

  const fetchLeaveSettings = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/leave`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch leave settings:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const leaveTypes = useMemo(() => {
    const types = new Set(leaves.map(l => l.leaveType).filter(Boolean));
    return ['All', ...Array.from(types)];
  }, [leaves]);

  const handleStartDateChange = (e) => {
    const { value } = e.target;
    
    if (value && isWeekend(value)) {
      showToast('error', 'Please select a weekday (Monday to Friday). Weekends are not allowed for leave dates.');
      return;
    }

    const updatedLeave = {
      ...newLeave,
      startDate: value
    };

    if (updatedLeave.endDate && value && new Date(updatedLeave.endDate) < new Date(value)) {
      updatedLeave.endDate = '';
    }

    setNewLeave(updatedLeave);
  };

  const handleEndDateChange = (e) => {
    const { value } = e.target;
    
    if (value && isWeekend(value)) {
      showToast('error', 'Please select a weekday (Monday to Friday). Weekends are not allowed for leave dates.');
      return;
    }

    if (value && newLeave.startDate && new Date(value) < new Date(newLeave.startDate)) {
      showToast('error', 'End date cannot be before start date.');
      return;
    }

    setNewLeave({
      ...newLeave,
      endDate: value
    });
  };

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
    fetchLeaveSettings();
    fetchCategories();
    fetchUser();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      
      const processedEmployees = data.map(emp => ({
        ...emp,
        category: emp.category ? { 
          id: emp.category.id, 
          name: emp.category.name,
          annualLeaveDays: emp.category.annualLeaveDays || 20,
          excludeWeekendsFromLeave: emp.category.excludeWeekendsFromLeave !== undefined ? emp.category.excludeWeekendsFromLeave : true,
          workStartTime: emp.category.workStartTime || '08:00',
          standardRateHours: emp.category.standardRateHours || 8
        } : null
      }));
      
      setEmployees(processedEmployees);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const token = getToken();
      
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!userResponse.ok) throw new Error('Failed to fetch user info');
      const userData = await userResponse.json();
      
      let url = `${API_BASE_URL}/api/leave`;
      const isAdmin = userData.roles?.includes('ROLE_ADMIN') || userData.role === 'ROLE_ADMIN';
      
      if (!isAdmin) {
        const empResponse = await fetch(`${API_BASE_URL}/api/employee/email/${userData.email}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (empResponse.ok) {
          const empData = await empResponse.json();
          url = `${API_BASE_URL}/api/leave/employee/${empData.id}`;
        }
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch leaves');
      const data = await response.json();
      setLeaves(data);
    } catch (err) {
      setError(err.message);
      showToast('error', 'Failed to load leave requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const leaveId = searchParams.get('leaveId');
    const employeeId = searchParams.get('employeeId');
    const action = searchParams.get('action');
    
    if (leaveId && employeeId && employees.length > 0) {
      const employee = employees.find(emp => emp.id === parseInt(employeeId));
      if (employee) {
        setFilters(prev => ({
          ...prev,
          employeeName: `${employee.firstName} ${employee.lastName}`
        }));
      }
      
      setHighlightedLeaveId(parseInt(leaveId));
      
      if (action === 'approve' || action === 'reject') {
        setPendingAction(action);
      }
      
      const targetLeave = leaves.find(l => l.id === parseInt(leaveId));
      if (targetLeave) {
        setSelectedLeave(targetLeave);
      }
    }
  }, [searchParams, employees, leaves]);

  const handleModalClose = () => {
    setSelectedLeave(null);
    setSearchParams({});
    setHighlightedLeaveId(null);
    setPendingAction(null);
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUpIcon className="w-4 h-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4" />
      : <ChevronDownIcon className="w-4 h-4" />;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "employeeId") {
      const selectedEmployee = employees.find(emp => emp.id === parseInt(value));
      if (selectedEmployee) {
        setNewLeave({
          ...newLeave,
          employee: {
            id: selectedEmployee.id,
            firstName: selectedEmployee.firstName,
            lastName: selectedEmployee.lastName,
            employeeId: selectedEmployee.employeeId,
            category: selectedEmployee.category ? { 
              id: selectedEmployee.category.id,
              name: selectedEmployee.category.name,
              annualLeaveDays: selectedEmployee.category.annualLeaveDays || 20,
              excludeWeekendsFromLeave: selectedEmployee.category.excludeWeekendsFromLeave !== undefined 
                ? selectedEmployee.category.excludeWeekendsFromLeave 
                : true,
              workStartTime: selectedEmployee.category.workStartTime || '08:00',
              standardRateHours: selectedEmployee.category.standardRateHours || 8
            } : null
          }
        });
      }
    } else {
      setNewLeave({
        ...newLeave,
        [name]: value
      });
    }
  };

  const uploadAttachment = async (leaveId, file, token) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/leave/${leaveId}/attachment`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload attachment");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Attachment upload failed:", error);
      throw error;
    }
  };

  const createLeave = async () => {
    if (isProcessingSingle) {
      showToast('warning', 'Please wait, previous request is still processing');
      return;
    }
    
    try {
      if (!['Maternity', 'Paternity'].includes(newLeave.leaveType)) {
        if (newLeave.startDate && isWeekend(newLeave.startDate)) {
          showToast('error', 'Start date must be a weekday (Monday to Friday).');
          return;
        }
        
        if (newLeave.endDate && isWeekend(newLeave.endDate)) {
          showToast('error', 'End date must be a weekday (Monday to Friday).');
          return;
        }
      }

      if (!newLeave.employee.id || !newLeave.leaveType || !newLeave.startDate || !newLeave.reason) {
        showToast('error', 'Please fill in all required fields.');
        return;
      }

      const selectedEmployee = employees.find(emp => emp.id === parseInt(newLeave.employee.id));
      
      if (!hasSufficientLeaveBalance(selectedEmployee, newLeave.leaveType, newLeave.startDate, newLeave.endDate)) {
        const remainingBalance = getEmployeeRemainingLeave(selectedEmployee);
        showToast('error', `Insufficient leave balance. You have ${remainingBalance} days remaining.`);
        return;
      }

      let finalEndDate = newLeave.endDate;
      if (newLeave.leaveType === 'Maternity' && !newLeave.endDate) {
        const startDate = new Date(newLeave.startDate);
        startDate.setMonth(startDate.getMonth() + leaveSettings.maternityLeaveMonths);
        finalEndDate = startDate.toISOString().split('T')[0];
      } else if (newLeave.leaveType === 'Paternity' && !newLeave.endDate) {
        const startDate = new Date(newLeave.startDate);
        startDate.setMonth(startDate.getMonth() + leaveSettings.paternityLeaveMonths);
        finalEndDate = startDate.toISOString().split('T')[0];
      }

      const token = getToken();
      
      const leavePayload = {
        employee: {
          id: parseInt(newLeave.employee.id),
          category: newLeave.employee.category ? { id: newLeave.employee.category.id } : null
        },
        leaveType: newLeave.leaveType,
        startDate: newLeave.startDate,
        endDate: finalEndDate,
        reason: newLeave.reason,
        status: 'Pending'
      };
      
      setIsProcessingSingle(true);
      showToast('info', 'Creating leave request...');
      
      const response = await fetch(`${API_BASE_URL}/api/leave`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(leavePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create leave');
      }

      const savedLeave = await response.json();
      showToast('success', 'Leave request created successfully!');

      if (newLeave.leaveType === 'Sick' && file) {
        showToast('info', 'Uploading attachment...');
        try {
          await uploadAttachment(savedLeave.id, file, token);
          showToast('success', 'Leave request submitted with attachment!');
        } catch (uploadError) {
          showToast('warning', 'Leave request created but attachment upload failed. You can upload it later.');
        }
      } else {
        showToast('success', 'Leave request submitted successfully!');
      }

      await fetchLeaves();
      setIsCreateMenuOpen(false);
      setNewLeave({
        employee: { id: '' },
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        status: 'Pending'
      });
      setFile(null);
      
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsProcessingSingle(false);
    }
  };

  const approveLeave = async (leaveId) => {
    const action = searchParams.get('action');
    const isAutoAction = action === 'approve';
    
    if (!isAutoAction) {
      if (!window.confirm('Are you sure you want to approve this leave request?')) {
        return;
      }
    }
    
    setProcessingLeaveId(leaveId);
    showToast('info', 'Approving leave request...');
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/leave/supervisor/approve/${leaveId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback: "Approved by supervisor" })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to approve leave');
      }

      const approvedLeave = await response.json();
      
      setLeaves(leaves.map(leave => 
        leave.id === approvedLeave.id ? approvedLeave : leave
      ));
      
      showToast('success', 'Leave approved successfully');
      
      setSearchParams({});
      setHighlightedLeaveId(null);
      setSelectedLeave(null);
      setPendingAction(null);
      
      await fetchLeaves();
      
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const rejectLeave = async (leaveId, feedback) => {
    const action = searchParams.get('action');
    const isAutoAction = action === 'reject';
    
    if (!isAutoAction) {
      if (!window.confirm('Are you sure you want to reject this leave request?')) {
        return;
      }
    }
    
    setProcessingLeaveId(leaveId);
    showToast('info', 'Rejecting leave request...');
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/leave/reject/${leaveId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          role: 'supervisor',
          feedback: feedback || "Rejected by supervisor"
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to reject leave');
      }

      const rejectedLeave = await response.json();
      
      setLeaves(leaves.map(leave => 
        leave.id === rejectedLeave.id ? rejectedLeave : leave
      ));
      
      showToast('success', 'Leave rejected successfully');
      
      setSearchParams({});
      setHighlightedLeaveId(null);
      setSelectedLeave(null);
      setPendingAction(null);
      
      await fetchLeaves();
      
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckBadgeIcon className="w-4 h-4 text-green-600" />;
      case 'Rejected':
        return <XCircleIcon className="w-4 h-4 text-red-600" />;
      case 'Pending':
        return <ClockIcon className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const downloadAttachment = async (leaveId) => {
    setProcessingLeaveId(leaveId);
    showToast('info', 'Downloading attachment...');
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/leave/${leaveId}/attachment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-certificate-${leaveId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('success', 'Attachment downloaded successfully!');
      } else {
        throw new Error('Failed to download attachment');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      showToast('error', 'Error downloading attachment: ' + error.message);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        showToast('error', 'Please select a PDF, JPG, or PNG file');
        return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) {
        showToast('error', 'File size must be less than 5MB');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const hasAttachment = (leave) => {
    return !!leave?.attachmentFileName;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLeaves = useMemo(() => {
    let filtered = [...leaves];

    if (query) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(leave => 
        leave.employee?.firstName?.toLowerCase().includes(searchTerm) ||
        leave.employee?.lastName?.toLowerCase().includes(searchTerm) ||
        leave.employee?.employeeId?.toLowerCase().includes(searchTerm) ||
        leave.leaveType?.toLowerCase().includes(searchTerm) ||
        leave.reason?.toLowerCase().includes(searchTerm) ||
        leave.status?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.status !== 'All') {
      filtered = filtered.filter(leave => leave.status === filters.status);
    }

    if (filters.leaveType !== 'All') {
      filtered = filtered.filter(leave => leave.leaveType === filters.leaveType);
    }

    if (filters.employeeName) {
      filtered = filtered.filter(leave => {
        const fullName = `${leave.employee?.firstName} ${leave.employee?.lastName}`.toLowerCase();
        return fullName.includes(filters.employeeName.toLowerCase());
      });
    }

    if (selectedCategoryFilter) {
      filtered = filtered.filter(leave => 
        leave.employee?.category?.name === selectedCategoryFilter
      );
    }

    if (filters.dateRange === 'Today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(leave => {
        if (!leave.submittedDate) return false;
        const submittedDate = new Date(leave.submittedDate).toISOString().split('T')[0];
        return submittedDate === today;
      });
    } else if (filters.dateRange === 'This Week') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(leave => {
        if (!leave.submittedDate) return false;
        const submittedDate = new Date(leave.submittedDate);
        return submittedDate >= startOfWeek && submittedDate <= endOfWeek;
      });
    } else if (filters.dateRange === 'This Month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      filtered = filtered.filter(leave => {
        if (!leave.submittedDate) return false;
        const submittedDate = new Date(leave.submittedDate);
        return submittedDate >= startOfMonth && submittedDate <= endOfMonth;
      });
    }

    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'startDate' || sortConfig.key === 'endDate' || sortConfig.key === 'submittedDate') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setSearchResults(filtered);
    return filtered;
  }, [leaves, query, filters, selectedCategoryFilter, sortConfig]);

  const requestSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const resetFilters = () => {
    setFilters({
      status: 'All',
      leaveType: 'All',
      dateRange: 'All',
      startDate: '',
      endDate: '',
      employeeName: ''
    });
    setQuery('');
    setSelectedCategoryFilter('');
    showToast('info', 'Filters reset');
  };

  const getSelectedEmployeeCategory = () => {
    const selectedEmployee = employees.find(emp => emp.id === parseInt(newLeave.employee.id));
    return selectedEmployee?.category;
  };

  const getSelectedEmployeeBalance = () => {
    const selectedEmployee = employees.find(emp => emp.id === parseInt(newLeave.employee.id));
    if (!selectedEmployee) return null;
    return getEmployeeRemainingLeave(selectedEmployee);
  };

  const getSelectedEmployeeAnnualDays = () => {
    const selectedEmployee = employees.find(emp => emp.id === parseInt(newLeave.employee.id));
    return selectedEmployee?.category?.annualLeaveDays || 20;
  };

  // Toast Notification Component
  const ToastNotification = () => {
    if (!toastMessage.visible) return null;
    
    const bgColor = toastMessage.type === 'success' ? 'bg-green-500' :
                    toastMessage.type === 'error' ? 'bg-red-500' :
                    toastMessage.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    
    const Icon = toastMessage.type === 'success' ? CheckCircleIcon :
                 toastMessage.type === 'error' ? XCircleIcon :
                 toastMessage.type === 'warning' ? ExclamationTriangleIcon : InformationCircleIcon;
    
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
        <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
          <Icon className="w-5 h-5" />
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      </div>
    );
  };

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
        {isCreateMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCreateMenuOpen(false)}></div>
        )}

        <Header toggleSidebar={toggleSidebar} user={user} onLogout={handleLogout} />

        <main className="flex-1 mx-auto px-4 md:px-6 py-6">
          {/* Toast Notification */}
          <ToastNotification />

          <div className="mb-6">
            <section className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
                  <p className="text-gray-500 mt-1">Track and manage employee leave requests</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FunnelIcon className="w-5 h-5" />
                    Filters
                    {(Object.values(filters).some(v => v !== 'All' && v !== '') || selectedCategoryFilter) && (
                      <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                        Active
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setIsCreateMenuOpen(true)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                    disabled={isProcessingSingle}
                  >
                    {isProcessingSingle ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                    Request Leave
                  </button>
                </div>
              </div>

              <div className="mt-4 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by employee name, ID, leave type, or reason..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>

              {showFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                      <select
                        value={filters.leaveType}
                        onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {leaveTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="All">All Time</option>
                        <option value="Today">Created Today</option>
                        <option value="This Week">Created This Week</option>
                        <option value="This Month">Created This Month</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Based on submission date</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Categories</option>
                        {getUniqueCategoriesFromLeaves().map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="From"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="To"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Reset All Filters
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="flex items-center justify-start mb-6 rounded-xl overflow-hidden w-max border border-gray-200 bg-white shadow-sm">
            <Link to="/attendance" className="w-[180px]">
              <div className={`h-12 flex items-center justify-center transition-all duration-200 ${
                location.pathname === "/attendance" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
              }`}>
                <span className="font-medium">Attendance</span>
              </div>
            </Link>

            <Link to="/overtime" className="w-[180px]">
              <div className={`h-12 flex items-center justify-center transition-all duration-200 ${
                location.pathname === "/overtime" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
              }`}>
                <span className="font-medium">Overtime</span>
              </div>
            </Link>

            <Link to="/leave" className="w-[180px]">
              <div className={`h-12 flex items-center justify-center transition-all duration-200 ${
                location.pathname === "/leave" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
              }`}>
                <span className="font-medium">Leave</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-start mb-6 rounded-xl overflow-hidden w-max border border-gray-200 bg-white shadow-sm">
            <button
              onClick={() => setViewMode('requests')}
              className={`w-[180px] h-12 flex items-center justify-center transition-all duration-200 ${
                viewMode === 'requests' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <CalendarDaysIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Leave Requests</span>
            </button>
            <button
              onClick={() => setViewMode('balances')}
              className={`w-[180px] h-12 flex items-center justify-center transition-all duration-200 ${
                viewMode === 'balances' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <UserGroupIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Employee Balances</span>
            </button>
          </div>

          {viewMode === 'requests' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {filteredLeaves.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        <strong>⚠️ Multi-Level Approval Chain:</strong> Leave requests require approval from <strong>Supervisor → Planner → HR</strong> in sequence. 
                        Check the boxes below and click <strong className="text-green-700">Approve</strong> to approve for ALL required roles at once. 
                        The request will automatically move through the entire approval chain.
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Showing <span className="font-medium text-gray-900">{filteredLeaves.length}</span> of <span className="font-medium text-gray-900">{leaves.length}</span> leave requests
                    </p>
                    {selectedLeaves.size > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleBulkApprove}
                          disabled={isProcessingBulk}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          {isProcessingBulk && bulkActionType === 'approve' ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            `✅ Approve (${selectedLeaves.size})`
                          )}
                        </button>
                        <button
                          onClick={handleBulkReject}
                          disabled={isProcessingBulk}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          {isProcessingBulk && bulkActionType === 'reject' ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            `❌ Reject (${selectedLeaves.size})`
                          )}
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          disabled={isProcessingBulk}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          {isProcessingBulk && bulkActionType === 'delete' ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            `🗑️ Delete (${selectedLeaves.size})`
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading leave requests...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedLeaves.size === filteredLeaves.length && filteredLeaves.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('employeeName')} className="flex items-center gap-1 hover:text-gray-900">
                            Employee <SortIcon columnKey="employeeName" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('leaveType')} className="flex items-center gap-1 hover:text-gray-900">
                            Leave Type <SortIcon columnKey="leaveType" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('startDate')} className="flex items-center gap-1 hover:text-gray-900">
                            Start Date <SortIcon columnKey="startDate" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('endDate')} className="flex items-center gap-1 hover:text-gray-900">
                            End Date <SortIcon columnKey="endDate" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('submittedDate')} className="flex items-center gap-1 hover:text-gray-900">
                            Submitted <SortIcon columnKey="submittedDate" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('duration')} className="flex items-center gap-1 hover:text-gray-900">
                            Duration <SortIcon columnKey="duration" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('categoryName')} className="flex items-center gap-1 hover:text-gray-900">
                            Category <SortIcon columnKey="categoryName" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('annualLeave')} className="flex items-center gap-1 hover:text-gray-900">
                            Annual Leave <SortIcon columnKey="annualLeave" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('remainingLeave')} className="flex items-center gap-1 hover:text-gray-900">
                            Remaining <SortIcon columnKey="remainingLeave" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('weekendPolicy')} className="flex items-center gap-1 hover:text-gray-900">
                            Weekend Policy <SortIcon columnKey="weekendPolicy" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('supervisorStatus')} className="flex items-center gap-1 hover:text-gray-900">
                            Supervisor <SortIcon columnKey="supervisorStatus" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('plannerStatus')} className="flex items-center gap-1 hover:text-gray-900">
                            Planner <SortIcon columnKey="plannerStatus" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('hrStatus')} className="flex items-center gap-1 hover:text-gray-900">
                            HR <SortIcon columnKey="hrStatus" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Attachment</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('status')} className="flex items-center gap-1 hover:text-gray-900">
                            Status <SortIcon columnKey="status" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeaves.length > 0 ? (
                        filteredLeaves.map((leave) => {
                          const remainingBalance = getEmployeeRemainingLeave(leave.employee);
                          const annualDays = leave.employee?.category?.annualLeaveDays || 20;
                          const isProcessingThis = processingLeaveId === leave.id;
                          return (
                            <tr 
                              key={leave.id} 
                              className={`hover:bg-gray-50 transition-colors ${
                                highlightedLeaveId === leave.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedLeaves.has(leave.id)}
                                  onChange={() => handleSelectLeave(leave.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  disabled={false}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                                    <span className="text-blue-700 font-medium">
                                      {leave?.employee?.firstName?.charAt(0)}{leave?.employee?.lastName?.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-semibold text-gray-900">
                                      {leave?.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : "N/A"}
                                    </div>
                                    <div className="text-xs text-gray-500">{leave?.employee?.employeeId || 'N/A'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">{leave.leaveType}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(leave.startDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(leave.endDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDateTime(leave.submittedDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {calculateLeaveDays(leave.startDate, leave.endDate, leave.leaveType, leave.employee?.category)} days
                                </div>
                                {!isLeaveDeductible(leave.leaveType) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Non-deductible
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate" title={leave.reason}>
                                  {leave.reason}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {leave.employee?.category?.name || 'General'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">{annualDays} days</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-medium ${remainingBalance < 5 ? 'text-red-600' : 'text-green-600'}`}>
                                  {remainingBalance} days
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {leave.employee?.category?.excludeWeekendsFromLeave !== false ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Weekends Excluded
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Weekends Included
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.supervisorStatus)}`}>
                                  {getStatusIcon(leave.supervisorStatus)}
                                  {leave.supervisorStatus || "Pending"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.plannerStatus)}`}>
                                  {getStatusIcon(leave.plannerStatus)}
                                  {leave.plannerStatus || "Pending"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.hrStatus)}`}>
                                  {getStatusIcon(leave.hrStatus)}
                                  {leave.hrStatus || "Pending"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {leave.leaveType === 'Sick' && (
                                  <div className="flex items-center justify-center">
                                    {hasAttachment(leave) ? (
                                      <div className="flex items-center gap-1">
                                        <PaperClipIcon className="h-4 w-4 text-green-600" />
                                        <span className="text-xs text-green-600 font-medium">Available</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">None</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.status)}`}>
                                  {getStatusIcon(leave.status)}
                                  {leave.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex gap-2 justify-end">
                                  {leave.status === "Pending" && (
                                    <>
                                      <button
                                        onClick={() => approveLeave(leave.id)}
                                        disabled={isProcessingThis}
                                        className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                                      >
                                        {isProcessingThis ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                        ) : (
                                          <CheckBadgeIcon className="w-4 h-4 mr-1" />
                                        )}
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => deleteLeave(leave.id)}
                                        disabled={isProcessingThis}
                                        className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                                      >
                                        <TrashIcon className="w-4 h-4 mr-1" />
                                        Delete
                                      </button>
                                    </>
                                  )}

                                  {leave.status === "Rejected" && (
                                    <button
                                      onClick={() => {
                                        const feedback = leave.supervisorFeedback || leave.plannerFeedback || leave.hrFeedback;
                                        setSelectedReason(feedback || "No feedback provided.");
                                        setIsReasonModalOpen(true);
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                      <EyeIcon className="w-4 h-4 mr-1" />
                                      Reason
                                    </button>
                                  )}

                                  {leave.leaveType === 'Sick' && hasAttachment(leave) && (
                                    <button
                                      onClick={() => downloadAttachment(leave.id)}
                                      disabled={isProcessingThis}
                                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                                    >
                                      {isProcessingThis ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                      ) : (
                                        <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                                      )}
                                      Download
                                    </button>
                                  )}

                                  <button
                                    onClick={() => setSelectedLeave(leave)}
                                    className="inline-flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                  >
                                    <DocumentIcon className="w-4 h-4 mr-1" />
                                    Details
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="18" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <CalendarDaysIcon className="w-12 h-12 text-gray-300 mb-3" />
                              <h3 className="text-lg font-medium text-gray-900 mb-1">No leave requests found</h3>
                              <p className="text-sm text-gray-500 mb-4">
                                {query || Object.values(filters).some(v => v !== 'All' && v !== '') || selectedCategoryFilter
                                  ? 'Try adjusting your search or filters' 
                                  : 'Get started by creating a new leave request'}
                              </p>
                              {!query && Object.values(filters).every(v => v === 'All' || v === '') && !selectedCategoryFilter && (
                                <button
                                  onClick={() => setIsCreateMenuOpen(true)}
                                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  New Leave Request
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <AdminLeaveBalanceView
              apiBaseUrl={API_BASE_URL} 
              getToken={getToken} 
            />
          )}

          {/* Create Leave Modal */}
          {isCreateMenuOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => setIsCreateMenuOpen(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Request Leave</h2>
                  <button onClick={() => setIsCreateMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                    <select
                      name="employeeId"
                      value={newLeave.employee.id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} ({employee.employeeId || 'N/A'}) - {employee.category?.name || 'No Category'} - {getEmployeeRemainingLeave(employee)} days remaining
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                      <select
                        name="leaveType"
                        value={newLeave.leaveType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        required
                      >
                        <option value="">Select Leave Type</option>
                        <option value="Annual">Annual Leave</option>
                        <option value="Sick">Sick Leave</option>
                        <option value="Maternity">Maternity Leave</option>
                        <option value="Paternity">Paternity Leave</option>
                        <option value="Bereavement">Bereavement Leave</option>
                        <option value="Study">Study Leave</option>
                        <option value="Other">Other Leave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Balance Info</label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
                        {newLeave.employee.id ? (
                          <div className="text-sm text-gray-600">
                            <div>Category: <span className="font-medium">{getSelectedEmployeeCategory()?.name || 'Not selected'}</span></div>
                            <div>Annual Days: <span className="font-medium">{getSelectedEmployeeAnnualDays()} days</span></div>
                            <div>Remaining: <span className={`font-medium ${getSelectedEmployeeBalance() < 5 ? 'text-red-600' : 'text-green-600'}`}>{getSelectedEmployeeBalance() || 0} days</span></div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 text-center py-2">
                            Select an employee to view balance info
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input
                        type="date"
                        name="startDate"
                        value={newLeave.startDate}
                        onChange={handleStartDateChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Only weekdays (Mon-Fri) allowed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration Preview</label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                        {newLeave.employee.id && newLeave.startDate && newLeave.endDate ? (
                          (() => {
                            const employeeCategory = getSelectedEmployeeCategory();
                            const days = calculateLeaveDays(newLeave.startDate, newLeave.endDate, newLeave.leaveType, employeeCategory);
                            const isExcluding = employeeCategory?.excludeWeekendsFromLeave !== false;
                            return `${days} ${isExcluding ? 'business' : 'total'} days`;
                          })()
                        ) : (
                          <span className="text-gray-400">Select employee and dates to calculate duration</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!['Maternity', 'Paternity'].includes(newLeave.leaveType) ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                        <input
                          type="date"
                          name="endDate"
                          value={newLeave.endDate}
                          onChange={handleEndDateChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Only weekdays (Mon-Fri) allowed</p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date (Auto-calculated)
                        </label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                          {newLeave.leaveType === 'Maternity' 
                            ? `${leaveSettings.maternityLeaveMonths} months from start date`
                            : `${leaveSettings.paternityLeaveMonths} month from start date`
                          }
                        </div>
                      </div>
                    )}

                    {newLeave.employee.id && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Weekend Policy
                          </label>
                          <div className="group relative">
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={() => {
                                const policy = getSelectedEmployeeCategory()?.excludeWeekendsFromLeave !== false 
                                  ? "Weekends (Saturday and Sunday) are NOT counted as leave days. Only Monday to Friday are considered."
                                  : "Weekends (Saturday and Sunday) ARE counted as leave days. All calendar days are considered.";
                                alert(`ℹ️ Weekend Policy Info:\n\n${policy}`);
                              }}
                            >
                              <InformationCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className={`px-4 py-3 rounded-lg border ${
                          getSelectedEmployeeCategory()?.excludeWeekendsFromLeave !== false 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getSelectedEmployeeCategory()?.excludeWeekendsFromLeave !== false ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${
                                getSelectedEmployeeCategory()?.excludeWeekendsFromLeave !== false ? 'text-blue-800' : 'text-yellow-800'
                              }`}>
                                {getSelectedEmployeeCategory()?.excludeWeekendsFromLeave !== false 
                                  ? 'Weekends Excluded' 
                                  : 'Weekends Included'}
                              </div>
                              <div className={`text-sm mt-1 ${
                                getSelectedEmployeeCategory()?.excludeWeekendsFromLeave !== false ? 'text-blue-600' : 'text-yellow-600'
                              }`}>
                                {getSelectedEmployeeCategory()?.excludeWeekendsFromLeave !== false 
                                  ? 'Only business days (Monday to Friday) will be counted towards your leave balance.' 
                                  : 'All calendar days including weekends will be counted towards your leave balance.'}
                              </div>
                              
                              {newLeave.startDate && newLeave.endDate && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs text-gray-500">
                                    📅 Based on your selected dates:
                                    <span className="block font-medium text-gray-700 mt-1">
                                      {(() => {
                                        const employeeCategory = getSelectedEmployeeCategory();
                                        const days = calculateLeaveDays(newLeave.startDate, newLeave.endDate, newLeave.leaveType, employeeCategory);
                                        const isExcluding = employeeCategory?.excludeWeekendsFromLeave !== false;
                                        return `${days} ${isExcluding ? 'business days' : 'total days'} will be deducted from your leave balance.`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {newLeave.leaveType === 'Sick' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medical Certificate
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                          <PhotoIcon className="w-12 h-12 text-gray-400 mb-2" />
                          <span className="text-sm font-medium text-blue-600 hover:text-blue-700">Click to upload</span>
                          <span className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG up to 5MB</span>
                        </label>
                        {file && (
                          <div className="mt-3 flex items-center justify-between p-2 bg-green-50 rounded-lg">
                            <span className="text-sm text-green-700 truncate">{file.name}</span>
                            <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                    <textarea
                      name="reason"
                      value={newLeave.reason}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
                      placeholder="Please provide a detailed reason for your leave request..."
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setNewLeave({
                          employee: { id: '' },
                          leaveType: '',
                          startDate: '',
                          endDate: '',
                          reason: '',
                          status: 'Pending'
                        });
                        setFile(null);
                      }}
                      className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      Clear
                    </button>
                    <button
                      onClick={createLeave}
                      disabled={isProcessingSingle}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {isProcessingSingle ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reason Modal */}
          {isReasonModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => setIsReasonModalOpen(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Rejection Reason</h3>
                  <button onClick={() => setIsReasonModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-gray-700 whitespace-pre-line">{selectedReason}</p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button onClick={() => setIsReasonModalOpen(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leave Details Modal */}
          {selectedLeave && (
            <LeaveDetailsModal 
              leave={selectedLeave}
              apiBaseUrl={API_BASE_URL}
              onClose={handleModalClose}
              onApprove={approveLeave}
              onReject={rejectLeave}
              autoAction={pendingAction}
            />
          )}

          {/* Bulk Action Modal */}
          {isBulkActionModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => {
                setIsBulkActionModalOpen(false);
                setBulkFeedback('');
              }}></div>
              <div className="relative bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {bulkActionType === 'approve' ? 'Approve' : 'Reject'} {selectedLeaves.size} Leave Request{selectedLeaves.size !== 1 ? 's' : ''}
                  </h3>
                  <button 
                    onClick={() => {
                      setIsBulkActionModalOpen(false);
                      setBulkFeedback('');
                    }} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback (Optional)
                  </label>
                  <textarea
                    value={bulkFeedback}
                    onChange={(e) => setBulkFeedback(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
                    placeholder={`Enter ${bulkActionType === 'approve' ? 'approval' : 'rejection'} feedback for all selected leave requests...`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bulkActionType === 'approve' 
                      ? 'This feedback will be applied to all selected leave requests' 
                      : 'Please provide a reason for rejecting these leave requests'}
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsBulkActionModalOpen(false);
                      setBulkFeedback('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeBulkAction}
                    disabled={isProcessingBulk}
                    className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                      bulkActionType === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                  >
                    {isProcessingBulk ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      `${bulkActionType === 'approve' ? 'Approve' : 'Reject'} (${selectedLeaves.size})`
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Leave;