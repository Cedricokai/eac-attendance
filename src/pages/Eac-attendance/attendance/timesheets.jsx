import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  Filter, 
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Building,
  Upload,
  File,
  Users,
  Receipt
} from "lucide-react";
import MainSidebar from "../mainSidebar";
import { useSearchParams, useNavigate } from "react-router-dom";

function Timesheet() {
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendances, setAttendances] = useState([]);
  const [overviews, setOverviews] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    employee: "",
    status: "",
    department: "",
    job: "",
    search: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });
  const [defaultRates, setDefaultRates] = useState({
    hourlyRate: 10,
    overtimeHourlyRate: 15
  });
  const [billingCycle, setBillingCycle] = useState({
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    type: "monthly"
  });
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedJob, setSelectedJob] = useState("");
  const [systemSettings, setSystemSettings] = useState({
    weekendDays: [0, 6],
    doubleTimeOnSunday: false,
    timeAndHalfAfter8Hours: true,
    weekendRate: 1.5,
    holidayRate: 2.0,
    hourlyRate: 10,
    overtimeHourlyRate: 15,
    standardWorkHours: 8
  });
  const [holidays, setHolidays] = useState([]);
  const [specialWeekends, setSpecialWeekends] = useState([]);
  const [employeeHours, setEmployeeHours] = useState({});
  const [employeeOvertime, setEmployeeOvertime] = useState({});
  const [exportLoading, setExportLoading] = useState(false);
  const navigate = useNavigate();

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

  // Enhanced employee fetching with job assignments
  const fetchEmployeesWithJobs = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('=== FETCHING EMPLOYEES WITH JOB ASSIGNMENTS ===');

      // Fetch all employees
      const employeesRes = await fetch(`${API_BASE_URL}/api/employee`, { headers });
      if (!employeesRes.ok) {
        throw new Error(`Failed to fetch employees: ${employeesRes.status}`);
      }
      
      let employeesData = await employeesRes.json();
      console.log('Raw employees data:', employeesData);

      // Fetch all jobs
      const jobsRes = await fetch(`${API_BASE_URL}/api/jobs`, { headers });
      const jobsData = jobsRes.ok ? await jobsRes.json() : [];
      console.log('Jobs data:', jobsData);

      // Create a job map for quick lookup
      const jobMap = {};
      jobsData.forEach(job => {
        jobMap[job.id] = job;
      });

      // Enhance employees with job data
      const enhancedEmployees = await Promise.all(
        employeesData.map(async (employee) => {
          console.log(`Processing employee: ${employee.firstName} ${employee.lastName}`, {
            hasJobObject: !!employee.job,
            jobId: employee.job?.id,
            jobName: employee.job?.name
          });

          // If employee already has complete job data, use it
          if (employee.job && employee.job.id && employee.job.name) {
            console.log(`Employee ${employee.firstName} has job:`, employee.job);
            return employee;
          }

          // If employee has jobId but no job object, look it up
          if (employee.jobId && jobMap[employee.jobId]) {
            console.log(`Employee ${employee.firstName} has jobId ${employee.jobId}, found job:`, jobMap[employee.jobId]);
            return {
              ...employee,
              job: jobMap[employee.jobId]
            };
          }

          // Try to fetch job assignment from API
          try {
            console.log(`Fetching job assignment for employee ${employee.id}`);
            const jobAssignmentRes = await fetch(`${API_BASE_URL}/api/employee/${employee.id}/job`, { headers });
            if (jobAssignmentRes.ok) {
              const jobData = await jobAssignmentRes.json();
              console.log(`Found job for employee ${employee.id}:`, jobData);
              return {
                ...employee,
                job: jobData
              };
            } else {
              console.log(`No job found for employee ${employee.id}`);
            }
          } catch (err) {
            console.warn(`Error fetching job for employee ${employee.id}:`, err);
          }

          return employee;
        })
      );

      console.log('Enhanced employees:', enhancedEmployees);
      return enhancedEmployees;

    } catch (err) {
      console.error("Error fetching employees with jobs:", err);
      throw err;
    }
  };

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("jwtToken");
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        console.log('=== INITIALIZING TIMESHEET DATA FETCH ===');

        // Check for job ID in URL parameters
        const jobIdFromUrl = searchParams.get('jobId');
        if (jobIdFromUrl) {
          console.log('Job ID from URL:', jobIdFromUrl);
          setSelectedJob(jobIdFromUrl);
        }

        // Fetch data in parallel
        const [
          timesheetsRes, 
          jobsRes, 
          attendancesRes, 
          overviewsRes, 
          settingsRes,
          holidaysRes,
          specialWeekendsRes
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/api/timesheets?includeEmployee=true`, { headers }),
          fetch(`${API_BASE_URL}/api/jobs`, { headers }),
          fetch(`${API_BASE_URL}/api/attendance`, { headers }),
          fetch(`${API_BASE_URL}/api/overview`, { headers }),
          fetch(`${API_BASE_URL}/api/settings/system`, { headers }),
          fetch(`${API_BASE_URL}/api/settings/holidays`, { headers }),
          fetch(`${API_BASE_URL}/api/settings/special-weekends`, { headers })
        ]);

        // Process responses
        let timesheetsData = timesheetsRes.ok ? await timesheetsRes.json() : [];
        const jobsData = jobsRes.ok ? await jobsRes.json() : [];
        const attendancesData = attendancesRes.ok ? await attendancesRes.json() : [];
        const overviewsData = overviewsRes.ok ? await overviewsRes.json() : [];
        const holidaysData = holidaysRes.ok ? await holidaysRes.json() : [];
        const specialWeekendsData = specialWeekendsRes.ok ? await specialWeekendsRes.json() : [];
        
        console.log('Jobs data loaded:', jobsData);

        // Load settings if available
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSystemSettings(prev => ({
            ...prev,
            ...settingsData,
            weekendDays: settingsData.weekendDays || [0, 6],
            weekendRate: settingsData.weekendRate || 1.5,
            holidayRate: settingsData.holidayRate || 2.0,
            standardWorkHours: settingsData.standardWorkHours || 8
          }));
        }

        // Fetch employees with job assignments
        console.log('Fetching employees with job assignments...');
        const employeesData = await fetchEmployeesWithJobs();
        
        // If includeEmployee=true didn't work, manually attach employee data to timesheets
        if (!timesheetsData[0]?.employee) {
          timesheetsData = timesheetsData.map(sheet => ({
            ...sheet,
            employee: employeesData.find(e => e.id === sheet.employeeId)
          }));
        }

        setTimesheets(timesheetsData);
        setEmployees(employeesData);
        setJobs(jobsData);
        setAttendances(attendancesData);
        setOverviews(overviewsData);
        setHolidays(holidaysData);
        setSpecialWeekends(specialWeekendsData);
        
        // Initialize attendance data and hours
        initializeAttendanceData(employeesData);
        initializeHoursData(employeesData);

        // Validate job from URL
        if (jobIdFromUrl) {
          const jobExists = jobsData.some(job => job.id === parseInt(jobIdFromUrl));
          if (jobExists) {
            setSelectedJob(jobIdFromUrl);
            console.log('Valid job ID from URL:', jobIdFromUrl);
          } else {
            console.warn('Job ID from URL not found in fetched jobs:', jobIdFromUrl);
          }
        }
        
        // Set billing cycle from jobs if available
        if (jobsData.length > 0) {
          const activeJob = jobsData.find(job => job.status === 'ACTIVE');
          if (activeJob) {
            setBillingCycle({
              startDate: new Date(activeJob.startDate),
              endDate: activeJob.endDate ? new Date(activeJob.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              type: activeJob.billingCycle || 'monthly'
            });
          }
        }

        console.log('=== DATA FETCH COMPLETE ===');
        console.log('Total employees:', employeesData.length);
        console.log('Employees with jobs:', employeesData.filter(emp => emp.job).length);
        console.log('Selected job:', selectedJob);

      } catch (err) {
        console.error("Error fetching data:", err);
        alert('Error loading timesheet data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams]);

  // Initialize attendance data structure
  const initializeAttendanceData = (employeesData) => {
    const initialAttendance = {};
    employeesData.forEach(employee => {
      initialAttendance[employee.id] = {};
      const { start } = getDateRange();
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        initialAttendance[employee.id][dateStr] = 'P'; // Default to Present
      }
    });
    setAttendanceData(initialAttendance);
  };

  // Initialize hours data structure
  const initializeHoursData = (employeesData) => {
    const initialHours = {};
    const initialOvertime = {};
    
    employeesData.forEach(employee => {
      initialHours[employee.id] = {};
      initialOvertime[employee.id] = {};
      const { start } = getDateRange();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Get job standard hours for this employee
        const jobStandardHours = employee.job?.standardWorkHours || systemSettings.standardWorkHours;
        
        // Initialize with standard hours for present days
        initialHours[employee.id][dateStr] = jobStandardHours.toString();
        initialOvertime[employee.id][dateStr] = '0';
      }
    });
    
    setEmployeeHours(initialHours);
    setEmployeeOvertime(initialOvertime);
  };

  // Enhanced employee filtering with job assignment
  const getFilteredEmployees = () => {
    let filtered = employees;
    
    console.log('=== FILTERING EMPLOYEES ===');
    console.log('Total employees:', employees.length);
    console.log('Selected job:', selectedJob);
    
    // Filter by selected job
    if (selectedJob && selectedJob !== '') {
      const jobId = parseInt(selectedJob);
      console.log('Filtering for job ID:', jobId);
      
      filtered = employees.filter(emp => {
        const hasJob = emp.job && emp.job.id === jobId;
        console.log(`Employee ${emp.firstName} ${emp.lastName}:`, {
          hasJob: hasJob,
          jobId: emp.job?.id,
          jobName: emp.job?.name,
          employeeId: emp.id
        });
        return hasJob;
      });
      
      console.log('Filtered employees count:', filtered.length);
      console.log('Filtered employees:', filtered.map(emp => ({
        name: `${emp.firstName} ${emp.lastName}`,
        job: emp.job?.name,
        employeeId: emp.id
      })));
    } else {
      console.log('No job filter applied - showing all employees');
    }
    
    // Additional filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.firstName?.toLowerCase().includes(searchTerm) ||
        emp.lastName?.toLowerCase().includes(searchTerm) ||
        emp.employeeId?.toLowerCase().includes(searchTerm)
      );
    }
    
    return filtered;
  };

  // Check if a date is a weekend
  const isWeekend = (date) => {
    const dayOfWeek = date.getDay();
    return systemSettings.weekendDays.includes(dayOfWeek);
  };

  // Check if a date is a holiday
  const isHoliday = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.some(holiday => holiday.date === dateStr);
  };

  // Check if a date is a special weekend
  const isSpecialWeekend = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return specialWeekends.some(special => special.date === dateStr);
  };

  // Get rate multiplier for a specific date
  const getDateRateMultiplier = (date) => {
    if (isHoliday(date)) {
      return systemSettings.holidayRate;
    }
    if (isSpecialWeekend(date)) {
      const specialWeekend = specialWeekends.find(special => special.date === date.toISOString().split('T')[0]);
      return specialWeekend?.rateMultiplier || systemSettings.weekendRate;
    }
    if (isWeekend(date)) {
      if (systemSettings.doubleTimeOnSunday && date.getDay() === 0) {
        return 2.0;
      }
      return systemSettings.weekendRate;
    }
    return 1.0;
  };

  // Calculate earnings for an employee on a specific date
  const calculateEarnings = (employee, date, totalHours) => {
    const employeeRate = employee.minimumRate || employee.hourlyRate || defaultRates.hourlyRate;
    const dateMultiplier = getDateRateMultiplier(date);
    
    // Get job standard hours, fallback to system standard hours
    const jobStandardHours = employee.job?.standardWorkHours || systemSettings.standardWorkHours;
    
    // Calculate regular and overtime hours based on job standard hours
    const regularHours = Math.min(totalHours, jobStandardHours);
    const overtimeHours = Math.max(totalHours - jobStandardHours, 0);
    
    // Calculate regular pay
    const regularPay = regularHours * employeeRate * dateMultiplier;
    
    // Calculate overtime pay with overtime multiplier
    const overtimeMultiplier = systemSettings.timeAndHalfAfter8Hours ? 1.5 : 1.0;
    const overtimeRate = employeeRate * overtimeMultiplier * dateMultiplier;
    const overtimePay = overtimeHours * overtimeRate;
    
    return {
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      totalPay: regularPay + overtimePay,
      rate: employeeRate,
      overtimeRate: overtimeRate,
      multiplier: dateMultiplier,
      overtimeMultiplier: overtimeMultiplier,
      jobStandardHours
    };
  };

  // Handle hours input change - auto-calculate overtime
  const handleHoursChange = (employeeId, date, value) => {
    const totalHours = parseFloat(value) || 0;
    const employee = employees.find(emp => emp.id === employeeId);
    const jobStandardHours = employee?.job?.standardWorkHours || systemSettings.standardWorkHours;
    
    const regularHours = Math.min(totalHours, jobStandardHours);
    const overtimeHours = Math.max(totalHours - jobStandardHours, 0);
    
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: totalHours.toString()
      }
    }));

    setEmployeeOvertime(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: overtimeHours.toString()
      }
    }));
  };

  // Handle overtime hours input change
  const handleOvertimeChange = (employeeId, date, value) => {
    const overtimeHours = parseFloat(value) || 0;
    const employee = employees.find(emp => emp.id === employeeId);
    const jobStandardHours = employee?.job?.standardWorkHours || systemSettings.standardWorkHours;
    const regularHours = parseFloat(employeeHours[employee.id]?.[date] || 0);
    
    const totalHours = regularHours + overtimeHours;
    
    setEmployeeOvertime(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: overtimeHours.toString()
      }
    }));

    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: totalHours.toString()
      }
    }));
  };

  // Handle attendance toggle
  const handleAttendanceToggle = (employeeId, date) => {
    const newStatus = attendanceData[employeeId]?.[date] === 'P' ? 'A' : 'P';
    
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: newStatus
      }
    }));

    // If changing to Present (P), auto-fill standard hours
    if (newStatus === 'P') {
      const employee = employees.find(emp => emp.id === employeeId);
      const jobStandardHours = employee?.job?.standardWorkHours || systemSettings.standardWorkHours;
      
      // Set regular hours to standard work hours, overtime to 0
      setEmployeeHours(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: jobStandardHours.toString()
        }
      }));

      setEmployeeOvertime(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: '0'
        }
      }));
    } else {
      // If changing to Absent (A), clear hours
      setEmployeeHours(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: '0'
        }
      }));

      setEmployeeOvertime(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: '0'
        }
      }));
    }
  };

  // Save attendance data
  const saveAttendance = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      
      // Prepare timesheet data
      const timesheetData = [];
      const days = getDaysArray();
      
      filteredEmployees.forEach(employee => {
        days.forEach(day => {
          const dateStr = day.toISOString().split('T')[0];
          const isPresent = attendanceData[employee.id]?.[dateStr] === 'P';
          
          if (isPresent) {
            const totalHours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
            const earnings = calculateEarnings(employee, day, totalHours);
            
            timesheetData.push({
              employeeId: employee.id,
              date: dateStr,
              regularHours: earnings.regularHours,
              overtimeHours: earnings.overtimeHours,
              breakHours: 0, // Default break hours
              totalHours: totalHours,
              earnings: earnings.totalPay,
              status: 'PENDING'
            });
          }
        });
      });

      // Use the correct endpoint
      const response = await fetch(`${API_BASE_URL}/api/timesheets/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timesheets: timesheetData
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Timesheets saved successfully!');
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save data');
      }
    } catch (err) {
      console.error("Error saving data:", err);
      alert('Error saving data: ' + err.message);
    }
  };

  // Calculate date ranges based on selected period
  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (selectedPeriod === "week") {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(end.getDate() + (6 - end.getDay()));
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }
    
    return { start, end };
  };

  // Get days array for the current period
  const getDaysArray = () => {
    const { start, end } = getDateRange();
    const days = [];
    const current = new Date(start);
    
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Format currency
  const formatCurrency = (amount) =>
    amount ? `₵${parseFloat(amount).toFixed(2)}` : "₵0.00";

  // Get total earnings for an employee in the current period
  const getEmployeeTotalEarnings = (employee) => {
    const days = getDaysArray();
    let totalEarnings = 0;
    
    days.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      const isPresent = attendanceData[employee.id]?.[dateStr] === 'P';
      
      if (isPresent) {
        const totalHours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
        const earnings = calculateEarnings(employee, day, totalHours);
        totalEarnings += earnings.totalPay;
      }
    });
    
    return totalEarnings;
  };

  // Get date type badge
  const getDateTypeBadge = (date) => {
    if (isHoliday(date)) {
      return { text: 'Holiday', class: 'bg-red-100 text-red-800' };
    }
    if (isSpecialWeekend(date)) {
      return { text: 'Special', class: 'bg-purple-100 text-purple-800' };
    }
    if (isWeekend(date)) {
      return { text: 'Weekend', class: 'bg-orange-100 text-orange-800' };
    }
    return { text: 'Regular', class: 'bg-green-100 text-green-800' };
  };

  // Export functions (simplified for brevity)
  const exportToColoredExcel = async () => {
    setExportLoading(true);
    try {
      // Your export implementation here
      alert('Export feature would be implemented here');
    } catch (err) {
      console.error("Error exporting colored Excel:", err);
      alert('Error exporting colored data');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToProfessionalExcel = async () => {
    setExportLoading(true);
    try {
      // Your export implementation here
      alert('Professional export feature would be implemented here');
    } catch (err) {
      console.error("Error exporting professional Excel:", err);
      alert('Error exporting data');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPayrollFormat = async () => {
    setExportLoading(true);
    try {
      // Your export implementation here
      alert('Payroll export feature would be implemented here');
    } catch (err) {
      console.error("Error exporting payroll format:", err);
      alert('Error exporting payroll data');
    } finally {
      setExportLoading(false);
    }
  };

  const exportQuickSummary = async () => {
    setExportLoading(true);
    try {
      // Your export implementation here
      alert('Quick summary export feature would be implemented here');
    } catch (err) {
      console.error("Error exporting quick summary:", err);
      alert('Error exporting summary');
    } finally {
      setExportLoading(false);
    }
  };

  // Generate reports
  const generateIndividualReport = async (employeeId) => {
    try {
      const token = localStorage.getItem("jwtToken");
      const { start, end } = getDateRange();
      
      const response = await fetch(
        `${API_BASE_URL}/api/reports/individual?employeeId=${employeeId}&startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `timesheet-report-${employeeId}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error generating report:", err);
      alert('Error generating report');
    }
  };

  const generateGeneralReport = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const { start, end } = getDateRange();
      
      const response = await fetch(
        `${API_BASE_URL}/api/reports/general?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}&jobId=${selectedJob}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `general-timesheet-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error generating report:", err);
      alert('Error generating report');
    }
  };

  // Handle file upload
  const handleFileUpload = async (event, employeeId, date) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const token = localStorage.getItem("jwtToken");
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employeeId', employeeId);
      formData.append('date', date);

      const response = await fetch(`${API_BASE_URL}/api/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        alert('File uploaded successfully!');
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert('Error uploading file');
    }
  };

  // Generate quick invoice for selected job
  const generateQuickInvoice = () => {
    if (!selectedJob) {
      alert("Please select a job first");
      return;
    }
    
    const job = jobs.find(j => j.id === parseInt(selectedJob));
    if (!job) {
      alert("Selected job not found");
      return;
    }
    
    // Calculate totals from current timesheet data
    const { start, end } = getDateRange();
    const daysArray = getDaysArray();
    
    let totalHours = 0;
    let totalOvertime = 0;
    let totalEarnings = 0;
    const employeeDetails = [];
    
    filteredEmployees.forEach(employee => {
      let employeeHours = 0;
      let employeeOvertime = 0;
      let employeeEarnings = 0;
      
      daysArray.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        const isPresent = attendanceData[employee.id]?.[dateStr] === 'P';
        
        if (isPresent) {
          const hours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
          const overtime = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
          const earnings = calculateEarnings(employee, day, hours);
          
          employeeHours += hours;
          employeeOvertime += overtime;
          employeeEarnings += earnings.totalPay;
        }
      });
      
      if (employeeHours > 0) {
        employeeDetails.push({
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          hours: employeeHours,
          overtime: employeeOvertime,
          earnings: employeeEarnings
        });
        
        totalHours += employeeHours;
        totalOvertime += employeeOvertime;
        totalEarnings += employeeEarnings;
      }
    });
    
    // Navigate to generate invoice page with pre-filled data
    navigate(`/generateinvoice?jobId=${selectedJob}`, {
      state: {
        quickInvoiceData: {
          jobId: selectedJob,
          jobName: job.name,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          totalHours: totalHours,
          totalOvertime: totalOvertime,
          totalEarnings: totalEarnings,
          employeeDetails: employeeDetails,
          employeeCount: employeeDetails.length
        }
      }
    });
  };

  const days = getDaysArray();
  const filteredEmployees = getFilteredEmployees();
  const selectedJobData = jobs.find(j => j.id === parseInt(selectedJob));

  return (
    <div className="relative min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <MainSidebar />
      </div>
      
      {/* Main content */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="flex justify-between items-center bg-white h-16 w-full px-6 shadow-md sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold">Enhanced Timesheet Management</h1>
            {selectedJob && selectedJobData && (
              <p className="text-sm text-blue-600 font-medium">
                Job: {selectedJobData.name} - {filteredEmployees.length} employees assigned
                {selectedJobData.standardWorkHours && (
                  <span className="text-gray-600 ml-2">
                    (Standard Hours: {selectedJobData.standardWorkHours}h/day)
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Export Dropdown */}
            <div className="relative group">
              <button 
                disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {exportLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Export Data
                <ChevronDown size={16} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <button
                  onClick={exportToColoredExcel}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                >
                  <FileText size={16} />
                  Colored Overtime Report
                </button>
                <button
                  onClick={exportToProfessionalExcel}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                >
                  <File size={16} />
                  Professional Overtime
                </button>
                <button
                  onClick={exportToPayrollFormat}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                >
                  <DollarSign size={16} />
                  Payroll with Overtime
                </button>
                <div className="border-t border-gray-200">
                  <button
                    onClick={exportQuickSummary}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg flex items-center gap-2 text-sm text-gray-600"
                  >
                    <FileText size={14} />
                    Quick Overtime Summary
                  </button>
                </div>
              </div>
            </div>

            {/* Generate Invoice Button - Only show when a job is selected */}
            {selectedJob && (
              <button 
                onClick={generateQuickInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Receipt size={16} />
                Generate Invoice
              </button>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button 
              onClick={saveAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check size={16} />
              Save Timesheets
            </button>
            <button 
              onClick={generateGeneralReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText size={16} />
              Generate Report
            </button>
          </div>
        </header>

        <div className="p-6">
          {/* Controls */}
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              
              <h2 className="text-lg font-semibold">
                {selectedPeriod === "week" 
                  ? `Week of ${getDateRange().start.toLocaleDateString()} - ${getDateRange().end.toLocaleDateString()}`
                  : currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight size={20} />
              </button>

              {/* Show selected job name prominently */}
              {selectedJob && selectedJobData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <h3 className="font-semibold text-blue-800">
                    {selectedJobData.name}
                  </h3>
                  <p className="text-sm text-blue-600">
                    {filteredEmployees.length} employees assigned • Standard Hours: {selectedJobData.standardWorkHours || 8}h/day
                  </p>
                  {/* Quick Invoice Button */}
                  <button
                    onClick={() => navigate(`/generateinvoice?jobId=${selectedJob}&startDate=${getDateRange().start.toISOString().split('T')[0]}&endDate=${getDateRange().end.toISOString().split('T')[0]}`)}
                    className="mt-2 flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <Receipt size={14} />
                    Quick Invoice for This Period
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <select 
                value={selectedJob}
                onChange={(e) => {
                  setSelectedJob(e.target.value);
                  console.log('Job selection changed to:', e.target.value);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Jobs ({employees.length} employees)</option>
                {jobs.map(job => {
                  const assignedEmployeesCount = employees.filter(emp => 
                    emp.job && emp.job.id === job.id
                  ).length;
                  
                  return (
                    <option key={job.id} value={job.id}>
                      {job.name} 
                      {job.standardWorkHours ? ` (${job.standardWorkHours}h)` : ''}
                      {` - ${assignedEmployeesCount} employees`}
                    </option>
                  );
                })}
              </select>
              
              {/* Invoice button next to job selector */}
              {selectedJob && (
                <button
                  onClick={generateQuickInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  title="Generate Invoice for Selected Job"
                >
                  <Receipt size={16} />
                  <span>Invoice</span>
                </button>
              )}
              
              <button 
                onClick={() => setSelectedPeriod("week")}
                className={`px-4 py-2 rounded-lg ${selectedPeriod === "week" ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setSelectedPeriod("month")}
                className={`px-4 py-2 rounded-lg ${selectedPeriod === "month" ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Billing Cycle Indicator */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-blue-800">Current Billing Cycle</h3>
                <p className="text-blue-600">
                  {billingCycle.startDate.toLocaleDateString()} - {billingCycle.endDate.toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-500">
                  {selectedJob ? `Job: ${selectedJobData?.name}` : 'All Jobs'} • {filteredEmployees.length} employees
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {billingCycle.type}
              </span>
            </div>
          </div>

          {/* Debug Information (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Debug Info</h3>
              <div className="text-sm text-yellow-700 grid grid-cols-3 gap-4">
                <div>
                  <strong>Total Employees:</strong> {employees.length}
                </div>
                <div>
                  <strong>Filtered Employees:</strong> {filteredEmployees.length}
                </div>
                <div>
                  <strong>Selected Job:</strong> {selectedJob || 'All Jobs'}
                </div>
                <div className="col-span-3">
                  <strong>Assigned Employees:</strong>{' '}
                  {filteredEmployees.map(emp => 
                    `${emp.firstName} ${emp.lastName} (${emp.job?.name || 'No Job'})`
                  ).join(', ') || 'None'}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-lg">Loading timesheet data...</span>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Employee & Rate Column */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                        Employee Details
                      </th>
                      
                      {/* Days Headers */}
                      {days.map((day, index) => {
                        const dateType = getDateTypeBadge(day);
                        return (
                          <th key={index} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                            <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className="font-normal">{day.getDate()}</div>
                            <div className={`text-xs px-1 rounded ${dateType.class}`}>
                              {dateType.text}
                            </div>
                          </th>
                        );
                      })}
                      
                      {/* Total Hours & Earnings */}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Hours
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Earnings
                      </th>
                      
                      {/* Actions */}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={days.length + 5} className="px-4 py-8 text-center text-gray-500">
                          <Users size={48} className="mx-auto mb-2 text-gray-300" />
                          <div className="text-lg font-medium">No employees found</div>
                          <div className="text-sm">
                            {selectedJob 
                              ? `No employees are assigned to the selected job.`
                              : 'No employees match the current filters.'
                            }
                          </div>
                          {selectedJob && (
                            <button
                              onClick={() => window.location.href = `/jobs?selectJob=${selectedJob}`}
                              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Assign Employees to Job
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const jobStandardHours = employee.job?.standardWorkHours || systemSettings.standardWorkHours;
                        const employeeJob = employee.job;
                        
                        return (
                          <>
                            {/* Main Employee Row */}
                            <tr className="hover:bg-gray-50" key={`main-${employee.id}`}>
                              {/* Employee Name and Details */}
                           <td className="px-2 py-2 border-r w-[180px] align-top" rowSpan="2">
  <div className="font-semibold text-gray-900 text-sm leading-tight truncate">
    {employee.firstName} {employee.lastName}
  </div>

  <div className="text-xs text-gray-600 space-y-0.5 mt-1">
    <div className="flex items-center truncate">
      <User size={12} className="mr-1" />
      <span>ID: {employee.employeeId}</span>
    </div>

    {employeeJob && (
      <div className="flex items-center truncate">
        <Building size={12} className="mr-1 text-blue-600" />
        <span className="font-medium text-blue-700">{employeeJob.name}</span>
      </div>
    )}

    {!employeeJob && selectedJob && (
      <div className="flex items-center text-gray-500 truncate">
        <Building size={12} className="mr-1 text-gray-400" />
        <span className="text-xs">Not assigned to this job</span>
      </div>
    )}

    <div className="flex items-center truncate">
      <Clock size={12} className="mr-1" />
      <span>{jobStandardHours}h/day</span>
    </div>

    <div className="flex items-center truncate">
      <DollarSign size={12} className="mr-1" />
      <span>
        ₵{(employee.minimumRate || employee.hourlyRate || defaultRates.hourlyRate).toFixed(2)}/hr
      </span>
    </div>
  </div>
</td>

                              
                              {/* Attendance Row - P/A Boxes */}
                              {days.map((day, dayIndex) => {
                                const dateStr = day.toISOString().split('T')[0];
                                const attendanceStatus = attendanceData[employee.id]?.[dateStr] || 'P';
                                const dateType = getDateTypeBadge(day);
                                
                                return (
                                  <td key={dayIndex} className="px-2 text-center border-r">
                                    <button
                                      onClick={() => handleAttendanceToggle(employee.id, dateStr)}
                                      className={`w-8 h-8 rounded border-2 font-bold text-sm transition-all ${
                                        attendanceStatus === 'P' 
                                          ? 'bg-green-100 border-green-500 text-green-700' 
                                          : 'bg-red-100 border-red-500 text-red-700'
                                      } hover:opacity-80`}
                                    >
                                      {attendanceStatus}
                                    </button>
                                    <div className={`text-xs mt-1 px-1 rounded ${dateType.class}`}>
                                      {getDateRateMultiplier(day)}x
                                    </div>
                                  </td>
                                );
                              })}
                              
                              {/* Total Present Days */}
                              <td className="px-4 py-4 text-center font-medium">
                                {days.filter(day => {
                                  const dateStr = day.toISOString().split('T')[0];
                                  return attendanceData[employee.id]?.[dateStr] === 'P';
                                }).length} days
                              </td>
                              
                              {/* Total Earnings */}
                              <td className="px-4 py-4 text-center font-medium text-green-600">
                                {formatCurrency(getEmployeeTotalEarnings(employee))}
                              </td>
                              
                              {/* Actions */}
                              <td className="px-4 py-4 text-center" rowSpan="2">
                                <button
                                  onClick={() => generateIndividualReport(employee.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                >
                                  <FileText size={14} />
                                  Report
                                </button>
                              </td>
                            </tr>
                            
                            {/* Hours Row */}
                            <tr className="hover:bg-gray-50" key={`hours-${employee.id}`}>
                              {days.map((day, dayIndex) => {
                                const dateStr = day.toISOString().split('T')[0];
                                const isPresent = attendanceData[employee.id]?.[dateStr] === 'P';
                                const totalHours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
                                const overtimeHours = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
                                                              
                                return (
                                  <td key={dayIndex} className=" border-r">
                                    {isPresent ? (
                                      <div className="space-y-2">
                                        {/* Regular Hours Input */}
                                        <div className="flex gap-3 justify-center items-center">
                                          <label className="text-xs text-gray-500 block mb-1">NH:</label>
                                          <input
  type="number"
  placeholder="0"
  value={totalHours - overtimeHours || ''}
  onChange={(e) =>
    handleHoursChange(
      employee.id,
      dateStr,
      parseFloat(e.target.value || 0) + overtimeHours
    )
  }
  className="w-12 p-1 border border-green-300 rounded text-sm text-center bg-green-50"
  min="0"
  max="24"
  step="0.5"
/>

                                        </div>
                                        
                                        {/* Overtime Hours Input */}
                                        <div className="flex gap-3 justify-center items-center">
                                          <label className="text-xs text-orange-600 block mb-1 font-medium">OH:</label>
                                        <input
  type="number"
  placeholder="0"
  value={overtimeHours || ''}
  onChange={(e) => handleOvertimeChange(employee.id, dateStr, e.target.value)}
  className="w-12  border border-orange-300 rounded text-sm text-center bg-orange-50"
  min="0"
  max="24"
  step="0.5"
/>

                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-400 text-sm py-2">
                                        Absent
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              
                              {/* Total Hours */}
                              <td className="px-4 py-4 text-center">
                                <div className="font-medium">
                                  {days.reduce((total, day) => {
                                    const dateStr = day.toISOString().split('T')[0];
                                    const isPresent = attendanceData[employee.id]?.[dateStr] === 'P';
                                    if (isPresent) {
                                      const hours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
                                      return total + hours;
                                    }
                                    return total;
                                  }, 0).toFixed(1)} hrs
                                </div>
                                <div className="text-xs text-orange-600">
                                  OT: {days.reduce((total, day) => {
                                    const dateStr = day.toISOString().split('T')[0];
                                    const isPresent = attendanceData[employee.id]?.[dateStr] === 'P';
                                    if (isPresent) {
                                      const ot = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
                                      return total + ot;
                                    }
                                    return total;
                                  }, 0).toFixed(1)} hrs
                                </div>
                              </td>
                              
                              {/* Empty cell for actions alignment */}
                              <td></td>
                            </tr>
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Summary Section */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Employees</div>
                    <div className="text-2xl font-bold">{filteredEmployees.length}</div>
                  </div>
                  <div>
                    <div className="font-medium">Present Today</div>
                    <div className="text-2xl font-bold text-green-600">
                      {filteredEmployees.filter(emp => {
                        const today = new Date().toISOString().split('T')[0];
                        return attendanceData[emp.id]?.[today] === 'P';
                      }).length}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Absent Today</div>
                    <div className="text-2xl font-bold text-red-600">
                      {filteredEmployees.filter(emp => {
                        const today = new Date().toISOString().split('T')[0];
                        return attendanceData[emp.id]?.[today] === 'A';
                      }).length}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Selected Job</div>
                    <div className="text-lg font-semibold">
                      {selectedJob ? (selectedJobData?.name || 'Unknown Job') : 'All Jobs'}
                    </div>
                    {selectedJob && (
                      <button
                        onClick={generateQuickInvoice}
                        className="mt-2 text-xs flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Receipt size={12} />
                        Invoice
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">Total Period Earnings</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(filteredEmployees.reduce((total, emp) => total + getEmployeeTotalEarnings(emp), 0))}
                    </div>
                    {selectedJob && (
                      <button
                        onClick={() => navigate(`/generateinvoice?jobId=${selectedJob}`)}
                        className="mt-2 text-xs flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-800"
                      >
                        <DollarSign size={12} />
                        Invoice Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Timesheet;