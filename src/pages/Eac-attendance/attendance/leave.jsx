import { useState, useEffect, useContext } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import Search from "../../../compnents/search";
import { 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon,
  PaperClipIcon,
  XMarkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

// Import the LeaveDetailsModal component
import LeaveDetailsModal from "./leaveDetailsModal";

function Leave() {
  const [query, setQuery] = useState('');
  const { settings } = useContext(SettingsContext);
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

  // New leave form state
  const [newLeave, setNewLeave] = useState({
    employee: { id: '' },
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'Pending'
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Function to check if a date is a weekend
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };

  // Function to get the next weekday from a given date
  const getNextWeekday = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    
    if (day === 0) { // Sunday
      date.setDate(date.getDate() + 1); // Move to Monday
    } else if (day === 6) { // Saturday
      date.setDate(date.getDate() + 2); // Move to Monday
    }
    
    return date.toISOString().split('T')[0];
  };

  // Function to disable weekend dates in date picker
  const disableWeekends = (date) => {
    return isWeekend(date);
  };

  // Function to handle date changes with weekend validation
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    if (value && isWeekend(value)) {
      alert('Please select a weekday (Monday to Friday). Weekends are not allowed for leave dates.');
      return;
    }

    setNewLeave({
      ...newLeave,
      [name]: value
    });
  };

  // Function to handle start date change with end date adjustment
  const handleStartDateChange = (e) => {
    const { value } = e.target;
    
    if (value && isWeekend(value)) {
      alert('Please select a weekday (Monday to Friday). Weekends are not allowed for leave dates.');
      return;
    }

    const updatedLeave = {
      ...newLeave,
      startDate: value
    };

    // If end date is before new start date, clear end date
    if (updatedLeave.endDate && value && new Date(updatedLeave.endDate) < new Date(value)) {
      updatedLeave.endDate = '';
    }

    setNewLeave(updatedLeave);
  };

  // Function to handle end date change with validation
  const handleEndDateChange = (e) => {
    const { value } = e.target;
    
    if (value && isWeekend(value)) {
      alert('Please select a weekday (Monday to Friday). Weekends are not allowed for leave dates.');
      return;
    }

    // Validate that end date is not before start date
    if (value && newLeave.startDate && new Date(value) < new Date(newLeave.startDate)) {
      alert('End date cannot be before start date.');
      return;
    }

    setNewLeave({
      ...newLeave,
      endDate: value
    });
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
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
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/leave`, {
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
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "employeeId") {
      setNewLeave({
        ...newLeave,
        employee: { id: value }
      });
    } else {
      setNewLeave({
        ...newLeave,
        [name]: value
      });
    }
  };

  // File upload function
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
      
      console.log("Attachment uploaded successfully");
      return await response.json();
    } catch (error) {
      console.error("Attachment upload failed:", error);
      throw error;
    }
  };

  const createLeave = async () => {
    try {
      // Validate dates are weekdays
      if (newLeave.startDate && isWeekend(newLeave.startDate)) {
        alert('Start date must be a weekday (Monday to Friday).');
        return;
      }
      
      if (newLeave.endDate && isWeekend(newLeave.endDate)) {
        alert('End date must be a weekday (Monday to Friday).');
        return;
      }

      // Validate required fields
      if (!newLeave.employee.id || !newLeave.leaveType || !newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
        alert('Please fill in all required fields.');
        return;
      }

      const token = getToken();
      
      // First create the leave request
      const response = await fetch(`${API_BASE_URL}/api/leave`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newLeave)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create leave');
      }

      const savedLeave = await response.json();

      // If it's sick leave and file exists, upload attachment
      if (newLeave.leaveType === 'Sick' && file) {
        try {
          await uploadAttachment(savedLeave.id, file, token);
          // Refresh leaves to get updated attachment info
          fetchLeaves();
        } catch (uploadError) {
          console.error('Attachment upload failed:', uploadError);
          // Don't throw error here - the main leave request was successful
        }
      }

      setLeaves([...leaves, savedLeave]);
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
      setError(err.message);
    }
  };

  const validateLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to approve this leave request?')) {
      return;
    }

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
        throw new Error(errorData || 'Failed to validate leave');
      }

      const validatedLeave = await response.json();
      
      // Update the leave in the state
      setLeaves(leaves.map(leave => 
        leave.id === validatedLeave.id ? validatedLeave : leave
      ));
      
      alert('Leave approved successfully');
    } catch (err) {
      setError(err.message);
    }
  };

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

  const calculateLeaveDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate business days (weekdays only)
    let businessDays = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return businessDays;
  };

  // Add download function
  const downloadAttachment = async (leaveId) => {
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
      } else {
        throw new Error('Failed to download attachment');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Error downloading attachment: ' + error.message);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        alert('Please select a PDF, JPG, or PNG file');
        return;
      }
      
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  // Check if leave has attachment (helper function)
  const hasAttachment = (leave) => {
    return leave.attachmentFileName && leave.attachmentFileContent;
  };

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <MainSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Overlay for create menu */}
        {isCreateMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCreateMenuOpen(false)}></div>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Top Bar */}
          <header className="flex justify-between items-center border border-white bg-white h-16 w-full rounded-r-2xl px-6 shadow-md">
            {/* Menu Icon */}
            <button className="p-1 hover:bg-gray-100 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Right Icons */}
            <div className="flex items-center gap-5">
              {/* Settings Icon */}
              <div className="relative">
                <Link to="/settingspage" className="p-1 hover:bg-gray-200 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.350.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </Link>
              </div>

              <div className="border-l border-gray-300 h-8"></div>

              {/* Notifications Icon */}
              <button className="p-1 hover:bg-gray-200 rounded-full relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                  >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5"
                  />
                </svg>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </button>

              <div className="border-l border-gray-300 h-8"></div>

              {/* User Profile */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  A
                </div>
                <span className="font-medium">Adams</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </header>

          {/* Page Header */}
          <div className="p-0">
            {/* Header */}
            <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl shadow-sm p-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Leave Management</h1>
                <p className="text-gray-600">Track and manage employee leave requests</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Search leaves={leaves} onResults={setSearchResults} />

                <button
                  onClick={() => setIsCreateMenuOpen(true)}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Request Leave
                </button>
              </div>
            </section>

            {/* Search Results Section */}
            {searchResults.length > 0 && (
              <section className="mt-4 bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-2">Search Results</h2>
                <ul className="divide-y divide-gray-200">
                  {searchResults.map((leave) => (
                    <li key={leave.id} className="py-2 flex justify-between items-center">
                      <span>{leave.employee?.firstName} {leave.employee?.lastName} — {leave.leaveType}</span>
                      <span 
                        className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(leave.status)}`}
                      >
                        {leave.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-start mt-6 mb-4 rounded-lg shadow-sm overflow-hidden w-max border border-gray-200">
            <Link to="/attendance" className="w-[180px]">
              <div className={`h-12 flex items-center justify-center transition-colors duration-200 ${
                location.pathname === "/attendance" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
              }`}>
                <span className="font-medium">Attendance</span>
              </div>
            </Link>

            <Link to="/overtime" className="w-[180px]">
              <div className={`h-12 flex items-center justify-center transition-colors duration-200 ${
                location.pathname === "/overtime" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
              }`}>
                <span className="font-medium">Overtime</span>
              </div>
            </Link>

            <Link to="/leave" className="w-[180px]">
              <div className={`h-12 flex items-center justify-center transition-colors duration-200 ${
                location.pathname === "/leave" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
              }`}>
                <span className="font-medium">Leave</span>
              </div>
            </Link>
          </div>

          {/* Leave Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attachment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-700 font-medium">
                              {leave?.employee?.firstName?.charAt(0)}{leave?.employee?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {leave?.employee 
                                ? `${leave.employee.firstName} ${leave.employee.lastName}`
                                : "Loading..."}
                            </div>
                            <div className="text-sm text-gray-500">{leave?.employee?.employeeId || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leave.leaveType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {calculateLeaveDays(leave.startDate, leave.endDate)} days
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {leave.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.supervisorStatus)}`}>
                          {leave.supervisorStatus || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.plannerStatus)}`}>
                          {leave.plannerStatus || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.hrStatus)}`}>
                          {leave.hrStatus || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {leave.leaveType === 'Sick' && (
                          <div className="flex items-center space-x-1">
                            {hasAttachment(leave) ? (
                              <>
                                <PaperClipIcon className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-green-600">Available</span>
                              </>
                            ) : (
                              <>
                                <PaperClipIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500">None</span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          {leave.status === "Pending" && (
                            <button
                              onClick={() => validateLeave(leave.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                            >
                              Approve
                            </button>
                          )}

                          {leave.status === "Rejected" && (
                            <button
                              onClick={() => {
                                const feedback = leave.supervisorFeedback || leave.plannerFeedback || leave.hrFeedback;
                                setSelectedReason(feedback || "No feedback provided.");
                                setIsReasonModalOpen(true);
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                            >
                              View Reason
                            </button>
                          )}

                          {leave.leaveType === 'Sick' && hasAttachment(leave) && (
                            <button
                              onClick={() => downloadAttachment(leave.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                            >
                              Download
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedLeave(leave)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {leaves.length === 0 && !loading && (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new leave request.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsCreateMenuOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Leave Request
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-500">Loading leave requests...</p>
              </div>
            )}
          </div>

          {/* Create Leave Modal */}
          {isCreateMenuOpen && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Request Leave</h1>
                <button 
                  onClick={() => setIsCreateMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                  <select
                    name="employeeId"
                    value={newLeave.employee.id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} ({employee.employeeId || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Leave Type and Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                    <select
                      name="leaveType"
                      value={newLeave.leaveType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Leave Type</option>
                      <option value="Annual">Annual</option>
                      <option value="Sick">Sick</option>
                      <option value="Maternity">Maternity</option>
                      <option value="Paternity">Paternity</option>
                      <option value="Bereavement">Bereavement</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      {newLeave.startDate && newLeave.endDate 
                        ? `${calculateLeaveDays(newLeave.startDate, newLeave.endDate)} business days`
                        : 'Select dates to calculate duration'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={newLeave.startDate}
                      onChange={handleStartDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">Only weekdays (Monday-Friday) allowed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={newLeave.endDate}
                      onChange={handleEndDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      min={newLeave.startDate || new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">Only weekdays (Monday-Friday) allowed</p>
                  </div>
                </div>

                {/* File Upload for Sick Leave */}
                {newLeave.leaveType === 'Sick' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medical Certificate
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPG, or PNG files up to 5MB
                    </p>
                    {file && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <textarea
                    name="reason"
                    value={newLeave.reason}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter reason for leave"
                    required
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
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
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={createLeave}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Reason Modal */}
          {isReasonModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Rejection Reason</h2>
                  <button
                    onClick={() => setIsReasonModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-gray-700 whitespace-pre-line">{selectedReason}</p>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setIsReasonModalOpen(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
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
              onClose={() => setSelectedLeave(null)} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default Leave;