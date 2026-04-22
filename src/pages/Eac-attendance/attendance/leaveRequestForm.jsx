import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarIcon, 
  UserIcon, 
  DocumentTextIcon,
  PaperClipIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

const LeaveRequestForm = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    status: "Pending",
  });
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [dateWarnings, setDateWarnings] = useState([]);
  const [availableBalance, setAvailableBalance] = useState(0);
const [leaveSettings, setLeaveSettings] = useState({
  maternityLeaveMonths: 3,
  paternityLeaveMonths: 1,
  nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study'],
  annualLeaveBalance: 20 // Default value
});

  const leaveTypes = [
    "Annual Leave",
    "Sick Leave", 
    "Casual Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Unpaid Leave",
    "Study Leave",
    "Compassionate Leave",
    "Public Holiday",
    "Sabbatical Leave",
  ];

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

  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Fetch leave settings
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
      // Calculate available balance for current user
      await calculateAvailableBalance(data.annualLeaveBalance);
    }
  } catch (err) {
    console.error('Failed to fetch leave settings:', err);
  }
};

const calculateAvailableBalance = async (totalAnnualBalance) => {
  try {
    if (!currentEmployee?.id) return;
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/leave/employee/${currentEmployee.id}/used-days`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const usedDays = await response.json();
      const available = totalAnnualBalance - usedDays;
      setAvailableBalance(available > 0 ? available : 0);
    }
  } catch (err) {
    console.error('Error calculating balance:', err);
  }
};

  // Function to check if a date is a weekend
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };

  // Function to get day name
  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
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

  // Function to calculate business days between two dates (excludes weekends)
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

  // Function to validate dates and set warnings
  const validateDates = (startDate, endDate) => {
    const warnings = [];
    
    // Only validate weekdays for non-maternity/paternity leaves
    if (!['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType)) {
      if (startDate && isWeekend(startDate)) {
        warnings.push({
          type: 'error',
          message: `Start date (${getDayName(startDate)}) is a weekend. Please select a weekday.`,
          suggestedDate: getNextWeekday(startDate)
        });
      }
      
      if (endDate && isWeekend(endDate)) {
        warnings.push({
          type: 'error', 
          message: `End date (${getDayName(endDate)}) is a weekend. Please select a weekday.`,
          suggestedDate: getNextWeekday(endDate)
        });
      }
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      warnings.push({
        type: 'error',
        message: 'End date must be after start date.'
      });
    }

    // Check if dates include weekends in the period (for non-maternity/paternity)
    if (!['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType) && 
        startDate && endDate && !isWeekend(startDate) && !isWeekend(endDate)) {
      const totalDays = calculateTotalDays(startDate, endDate);
      const businessDays = calculateBusinessDays(startDate, endDate);
      const weekendDays = totalDays - businessDays;
      
      if (weekendDays > 0) {
        warnings.push({
          type: 'warning',
          message: `This leave period includes ${weekendDays} weekend day(s). Only ${businessDays} business day(s) will be counted.`
        });
      }
    }
    
    setDateWarnings(warnings);
    return warnings.length === 0;
  };

  // Function to calculate total calendar days
  const calculateTotalDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
  };

  // Enhanced function to handle start date change
  const handleStartDateChange = (e) => {
    const { value } = e.target;
    
    // Only validate weekdays for non-maternity/paternity leaves
    if (!['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType) && value && isWeekend(value)) {
      setSubmitMessage(`Start date cannot be a weekend. Please select a weekday.`);
      setIsError(true);
      
      // Auto-correct to next weekday
      const nextWeekday = getNextWeekday(value);
      const updatedFormData = {
        ...formData,
        startDate: nextWeekday
      };

      // If end date is before new start date, clear end date
      if (formData.endDate && nextWeekday && new Date(formData.endDate) < new Date(nextWeekday)) {
        updatedFormData.endDate = '';
      }

      setFormData(updatedFormData);
      validateDates(nextWeekday, updatedFormData.endDate);
      return;
    }

    const updatedFormData = {
      ...formData,
      startDate: value
    };

    // If end date is before new start date, clear end date
    if (formData.endDate && value && new Date(formData.endDate) < new Date(value)) {
      updatedFormData.endDate = '';
    }

    setFormData(updatedFormData);
    validateDates(value, updatedFormData.endDate);
    setIsError(false);
    setSubmitMessage("");
  };

  // Enhanced function to handle end date change
  const handleEndDateChange = (e) => {
    const { value } = e.target;
    
    // Only validate weekdays for non-maternity/paternity leaves
    if (!['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType) && value && isWeekend(value)) {
      setSubmitMessage(`End date cannot be a weekend. Please select a weekday.`);
      setIsError(true);
      
      // Auto-correct to next weekday
      const nextWeekday = getNextWeekday(value);
      setFormData({
        ...formData,
        endDate: nextWeekday
      });
      validateDates(formData.startDate, nextWeekday);
      return;
    }

    // Validate that end date is not before start date
    if (value && formData.startDate && new Date(value) < new Date(formData.startDate)) {
      setSubmitMessage('End date cannot be before start date.');
      setIsError(true);
      return;
    }

    setFormData({
      ...formData,
      endDate: value
    });
    validateDates(formData.startDate, value);
    setIsError(false);
    setSubmitMessage("");
  };

  // Auto-calculate end date for maternity/paternity leave
  const handleLeaveTypeChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, leaveType: value }));
    
    // Auto-calculate end date for maternity/paternity leave
    if (value === 'Maternity Leave' && formData.startDate) {
      const startDate = new Date(formData.startDate);
      startDate.setMonth(startDate.getMonth() + leaveSettings.maternityLeaveMonths);
      const endDate = startDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, endDate }));
    } else if (value === 'Paternity Leave' && formData.startDate) {
      const startDate = new Date(formData.startDate);
      startDate.setMonth(startDate.getMonth() + leaveSettings.paternityLeaveMonths);
      const endDate = startDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, endDate }));
    }
  };

  const getValidToken = () => {
    const token = localStorage.getItem("jwtToken");
    if (!token) throw new Error("No authentication token found");
    return token;
  };

  // Fetch current user info and determine role
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getToken();
        if (!token) return;

        // Fetch leave settings first
        await fetchLeaveSettings();

        // Fetch current user info
        const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userResponse.ok) throw new Error("Failed to load user info");
        const userData = await userResponse.json();
        setCurrentUser(userData);

        // Determine user role from authorities or role field
        const authorities = userData.authorities || [];
        const roleFromBackend = userData.role || "";
        
       let role = "EMPLOYEE";
if (authorities.includes("ROLE_ADMIN") || roleFromBackend === "ROLE_ADMIN") {
  role = "ADMIN";
} else if (authorities.includes("ROLE_SUPERVISOR") || roleFromBackend === "ROLE_SUPERVISOR") {
  role = "SUPERVISOR";
} else if (authorities.includes("ROLE_PLANNER") || roleFromBackend === "ROLE_PLANNER") {
  role = "PLANNER";
} else if (authorities.includes("ROLE_HR") || roleFromBackend === "ROLE_HR") {
  role = "HR";
} else if (authorities.includes("ROLE_PROCUREMENT_OFFICER") || roleFromBackend === "ROLE_PROCUREMENT_OFFICER") {
  role = "PROCUREMENT_OFFICER";
} else if (authorities.includes("ROLE_INVENTORY") || roleFromBackend === "ROLE_INVENTORY") {
  role = "INVENTORY";
} else if (authorities.includes("ROLE_EMPLOYEE") || roleFromBackend === "ROLE_EMPLOYEE") {
  role = "EMPLOYEE";
} else if (authorities.includes("ROLE_CUSTOMER") || roleFromBackend === "ROLE_CUSTOMER") {
  role = "CUSTOMER";
  } else if (authorities.includes("ROLE_TRANSPORT") || roleFromBackend === "ROLE_TRANSPORT") {
  role = "ROLE_TRANSPORT";
}
        
        setUserRole(role);

        // For ALL roles, try to find their employee record first
        const empResponse = await fetch(
          `${API_BASE_URL}/api/employee/email/${userData.email}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (empResponse.ok) {
          const empData = await empResponse.json();
          setCurrentEmployee(empData);
          setFormData((prev) => ({ ...prev, employeeId: empData.id }));
        } else {
          console.warn("No employee record found for:", userData.email);
          setSubmitMessage("No employee record found for your account. Please contact administrator.");
          setIsError(true);
        }

        // Only fetch all employees if user is ADMIN and needs to create requests for others
       if (!['PROCUREMENT_OFFICER', 'CUSTOMER', 'INVENTORY','PLANNER'].includes(role)) {
    const empResponse = await fetch(
      `${API_BASE_URL}/api/employee/email/${userData.email}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

          if (allEmpResponse.ok) {
            const empData = await allEmpResponse.json();
            setEmployees(empData);
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        setSubmitMessage("Error loading user information: " + error.message);
        setIsError(true);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!validTypes.includes(selectedFile.type)) {
        setSubmitMessage("Please select a PDF, JPG, or PNG file");
        setIsError(true);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setSubmitMessage("File size must be less than 5MB");
        setIsError(true);
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setIsError(false);
      setSubmitMessage("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsError(false);
    setSubmitMessage("");

    try {
      const token = getValidToken();

      if (!formData.employeeId || !formData.leaveType || !formData.startDate || !formData.reason) {
        throw new Error("Please fill in all required fields");
      }

      // Auto-calculate end date for maternity/paternity leave if not provided
      let finalEndDate = formData.endDate;
      if (!finalEndDate && formData.leaveType === 'Maternity Leave') {
        const startDate = new Date(formData.startDate);
        startDate.setMonth(startDate.getMonth() + leaveSettings.maternityLeaveMonths);
        finalEndDate = startDate.toISOString().split('T')[0];
      } else if (!finalEndDate && formData.leaveType === 'Paternity Leave') {
        const startDate = new Date(formData.startDate);
        startDate.setMonth(startDate.getMonth() + leaveSettings.paternityLeaveMonths);
        finalEndDate = startDate.toISOString().split('T')[0];
      }

      // Validate dates are weekdays (for non-maternity/paternity leaves)
      if (!['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType)) {
        if (isWeekend(formData.startDate)) {
          throw new Error("Start date must be a weekday (Monday to Friday)");
        }
        
        if (finalEndDate && isWeekend(finalEndDate)) {
          throw new Error("End date must be a weekday (Monday to Friday)");
        }
      }

      if (finalEndDate && new Date(formData.startDate) > new Date(finalEndDate)) {
        throw new Error("End date must be after start date");
      }

      if (formData.leaveType === "Sick Leave" && !file) {
        throw new Error("Please upload an excuse duty document for sick leave");
      }

      const leaveRequest = {
        employee: { id: formData.employeeId },
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: finalEndDate,
        reason: formData.reason,
        status: "Pending",
        supervisorStatus: "Pending",
        plannerStatus: "Pending",
        hrStatus: "Pending"
      };

      const response = await fetch(`${API_BASE_URL}/api/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leaveRequest),
      });

      if (response.ok) {
        if (file && formData.leaveType === "Sick Leave") {
          await uploadAttachment(response, file, token);
        }

        setSubmitMessage("Leave request submitted successfully!");
        setIsError(false);

        // Reset form
        setFormData({
          employeeId: currentEmployee?.id || "",
          leaveType: "",
          startDate: "",
          endDate: "",
          reason: "",
          status: "Pending",
        });
        setFile(null);
        setFileName("");
        setDateWarnings([]);

        setTimeout(() => {
          if (userRole === "EMPLOYEE" || userRole === "SUPERVISOR" || userRole === "PLANNER" || userRole === "HR") {
            navigate("/employeeDashboard");
          } else {
            navigate("/employeeDashboard");
          }
        }, 2000);
      } else {
        throw new Error("Failed to submit leave request");
      }
    } catch (error) {
      setSubmitMessage(error.message);
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAttachment = async (leaveResponse, file, token) => {
    try {
      const leaveData = await leaveResponse.json();
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/leave/${leaveData.id}/attachment`,
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload attachment");
      }
      
      console.log("Attachment uploaded successfully");
    } catch (error) {
      console.error("Attachment upload failed:", error);
    }
  };

  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    return calculateBusinessDays(formData.startDate, formData.endDate);
  };

  const getTotalCalendarDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    return calculateTotalDays(formData.startDate, formData.endDate);
  };

  const getRoleDisplayName = () => {
    switch(userRole) {
      case "SUPERVISOR": return "Supervisor";
      case "PLANNER": return "Planner";
      case "HR": return "HR Manager";
      case "ADMIN": return "Administrator";
      default: return "Employee";
    }
  };

  // Show loading state while determining user role and employee data
  if (!currentUser || !currentEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Your Information</h3>
          <p className="text-gray-600 mb-4">Please wait while we prepare your leave request form</p>
          {submitMessage && (
            <div className={`p-4 rounded-xl mt-4 flex items-center space-x-3 ${
              isError ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
            }`}>
              {isError ? (
                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{submitMessage}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">New Leave Request</h1>
              <p className="text-gray-600">Submit a new leave request for approval</p>
            </div>
          </div>
          
          {currentUser && (
            <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
              <UserIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {currentUser.name || currentUser.username}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleDisplayName()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                <UserIcon className="h-4 w-4" />
                <span>Employee *</span>
              </label>
              {userRole !== "ADMIN" ? (
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {currentEmployee?.firstName?.charAt(0)}{currentEmployee?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : "Loading..."}
                    </p>
                    <p className="text-sm text-gray-500">{currentEmployee?.employeeId}</p>
                  </div>
                </div>
              ) : (
                <select
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-colors"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeId})
                    </option>
                  ))}
                </select>
              )}
              <input type="hidden" name="employeeId" value={formData.employeeId} />
            </div>

            {/* Leave Type */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                <DocumentTextIcon className="h-4 w-4" />
                <span>Leave Type *</span>
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleLeaveTypeChange}
                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-colors"
                required
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                    {(type === 'Maternity Leave' || type === 'Paternity Leave') && 
                      ` (${type === 'Maternity Leave' ? leaveSettings.maternityLeaveMonths : leaveSettings.paternityLeaveMonths} months)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Start Date *</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleStartDateChange}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-colors"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
                {formData.startDate && !['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType) && (
                  <p className={`text-xs ${isWeekend(formData.startDate) ? 'text-red-600' : 'text-green-600'}`}>
                    {getDayName(formData.startDate)}
                    {isWeekend(formData.startDate) && ' (Weekend - not allowed)'}
                  </p>
                )}
              </div>
              
              {/* End Date - Conditional rendering based on leave type */}
              {['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType) ? (
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                    <CalendarIcon className="h-4 w-4" />
                    <span>End Date (Auto-calculated)</span>
                  </label>
                  <div className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-500">
                    {formData.leaveType === 'Maternity Leave' 
                      ? `${leaveSettings.maternityLeaveMonths} months from start date`
                      : `${leaveSettings.paternityLeaveMonths} month from start date`
                    }
                  </div>
                  {formData.endDate && (
                    <p className="text-xs text-green-600">
                      Calculated end date: {new Date(formData.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                    <CalendarIcon className="h-4 w-4" />
                    <span>End Date *</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleEndDateChange}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-colors"
                    required
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                  {formData.endDate && (
                    <p className={`text-xs ${isWeekend(formData.endDate) ? 'text-red-600' : 'text-green-600'}`}>
                      {getDayName(formData.endDate)}
                      {isWeekend(formData.endDate) && ' (Weekend - not allowed)'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Date Warnings */}
            {dateWarnings.length > 0 && (
              <div className="space-y-2">
                {dateWarnings.map((warning, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl flex items-start space-x-3 ${
                      warning.type === 'error' 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}
                  >
                    {warning.type === 'error' ? (
                      <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{warning.message}</p>
                      {warning.suggestedDate && (
                        <p className="text-xs mt-1">
                          Suggested date: {new Date(warning.suggestedDate).toLocaleDateString()} ({getDayName(warning.suggestedDate)})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Leave Duration */}
            {formData.startDate && formData.endDate && (
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Business Days</p>
                    <p className="text-2xl font-bold">{calculateLeaveDays()} days</p>
                    <p className="text-xs opacity-90">(Monday - Friday)</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Calendar Days</p>
                    <p className="text-2xl font-bold">{getTotalCalendarDays()} days</p>
                    <p className="text-xs opacity-90">Including weekends</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-400">
                  <p className="text-sm text-center">
                    {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                <DocumentTextIcon className="h-4 w-4" />
                <span>Reason for Leave *</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none transition-colors"
                placeholder="Please provide detailed information about your leave request..."
                required
              />
            </div>

            {/* Sick Leave File Upload */}
            {formData.leaveType === "Sick Leave" && (
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                  <PaperClipIcon className="h-4 w-4" />
                  <span>Medical Certificate *</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="file-upload"
                    required
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {fileName ? "File Selected" : "Upload Medical Certificate"}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {fileName || "PDF, JPG or PNG up to 5MB"}
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      {fileName ? "Change File" : "Choose File"}
                    </button>
                  </label>
                  {fileName && (
                    <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-green-600">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>{fileName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.employeeId || dateWarnings.some(w => w.type === 'error')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Submitting Request...</span>
                </div>
              ) : (
                "Submit Leave Request"
              )}
            </button>

            {/* Message */}
            {submitMessage && (
              <div
                className={`p-4 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
                  isError 
                    ? "bg-red-50 text-red-700 border border-red-200" 
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                {isError ? (
                  <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                )}
                <span className="font-medium">{submitMessage}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {['Maternity Leave', 'Paternity Leave'].includes(formData.leaveType) 
              ? 'Maternity and paternity leave durations are automatically calculated based on system settings.'
              : 'Only weekdays (Monday-Friday) are allowed for leave dates. Weekends are automatically excluded from business day calculations.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestForm;