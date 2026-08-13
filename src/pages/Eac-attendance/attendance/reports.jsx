import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Download,
  Filter,
  Search,
  Calendar,
  Users,
  Clock,
  FileText,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  Menu,
  X,
  CheckCircle,
  XCircle,
  Settings,
  User,
  Building,
  LogOut,
  Mail,
  Send,
  Clock as ClockIcon,
  CalendarDays,
  Save,
  TrendingUp,
  Briefcase,
  Filter as FilterIcon,
  UserCheck,
  UserX,
  AlertCircle,
  CheckSquare,
  Square,
  PieChart
} from "lucide-react";
import MainSidebar from "../mainSidebar";

function Report() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEmployeeReportModal, setShowEmployeeReportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState(null);
  const [sendingEmployeeReport, setSendingEmployeeReport] = useState(false);
  
  // Email report states
  const [reportEmailTo, setReportEmailTo] = useState("");
  const [reportEmailSubject, setReportEmailSubject] = useState("Attendance Report");
  const [reportEmailMessage, setReportEmailMessage] = useState("Please find the attendance report attached.");
  const [sendingReport, setSendingReport] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    employeeId: "",
    category: "",
    department: "",
    workType: "",
    status: "",
    shift: ""
  });

  const [scheduleSettings, setScheduleSettings] = useState({
    enabled: false,
    sendTime: "18:00",
    recipientEmails: "",
    sendOnlyExceptions: true,
    attachExcel: true
  });

  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [viewOptions, setViewOptions] = useState({
    groupBy: "date",
    showDetails: true,
    showSummary: true
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [expandedRows, setExpandedRows] = useState([]);
  const [showRawBiometric, setShowRawBiometric] = useState(false);
  const [rawEvents, setRawEvents] = useState([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawPage, setRawPage] = useState(0);
  const [rawTotalPages, setRawTotalPages] = useState(1);
  const [selectedRawEvent, setSelectedRawEvent] = useState(null);
  const [rawFilters, setRawFilters] = useState({ employeeId: "", startDate: "", endDate: "", source: "", status: "" });

  const employeeNamesById = useMemo(() => {
    return new Map(employees.map((employee) => [
      String(employee.id),
      [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.employeeId || `Employee ${employee.id}`
    ]));
  }, [employees]);

  const getRawEventEmployeeName = (event) => {
    if (event.employeeId != null) {
      const linkedEmployeeName = employeeNamesById.get(String(event.employeeId));
      if (linkedEmployeeName) return linkedEmployeeName;
    }
    return event.rawEmployeeName || event.deviceUserId || "Unmatched";
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
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

  const fetchRawEvents = async (page = rawPage) => {
    setRawLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: "100" });
      Object.entries(rawFilters).forEach(([key, value]) => value && params.set(key, value));
      const response = await fetch(`${API_BASE_URL}/api/biometric/raw-events?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!response.ok) {
        const message = await response.text();
        if (response.status === 401) throw new Error("Your session has expired. Please sign in again.");
        if (response.status === 403) throw new Error("Only HR and administrators can view raw biometric events.");
        throw new Error(message || `Failed to load raw biometric events (${response.status})`);
      }
      const data = await response.json();
      setRawEvents(data.content || []);
      setRawPage(data.number || 0);
      setRawTotalPages(Math.max(data.totalPages || 1, 1));
    } catch (e) { setError(e.message); } finally { setRawLoading(false); }
  };

  const exportRawEvents = () => {
    const rows = rawEvents.map(({ employeeId, rawPayload, ...event }) => ({
      ...event,
      employeeName: getRawEventEmployeeName({ ...event, employeeId }),
      rawPayload
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Raw Biometric Events");
    XLSX.writeFile(workbook, `raw_biometric_events_${rawFilters.startDate || "all"}_${rawFilters.endDate || "all"}.xlsx`);
  };

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
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
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` },
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
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
      });
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const attendanceUrl = filters.startDate && filters.endDate 
        ? `${API_BASE_URL}/api/attendance?startDate=${filters.startDate}&endDate=${filters.endDate}`
        : `${API_BASE_URL}/api/attendance`;
      
      const [attendanceRes, employeesRes] = await Promise.all([
        fetch(attendanceUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }),
        fetch(`${API_BASE_URL}/api/employee`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } })
      ]);

      if (!attendanceRes.ok) throw new Error('Failed to fetch attendance data');
      if (!employeesRes.ok) throw new Error('Failed to fetch employees');

      const attendance = await attendanceRes.json();
      const employeesData = await employeesRes.json();

      const enrichedData = attendance.map(record => {
        const employee = employeesData.find(emp => emp.id === record.employee?.id);
        return {
          ...record,
          employeeDetails: employee || {},
          fullName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          department: employee?.department || 'N/A',
          category: employee?.category || 'N/A',
          workType: employee?.workType || 'N/A',
          employeeId: employee?.employeeId || 'N/A',
          employeeFirstName: employee?.firstName || '',
          employeeLastName: employee?.lastName || ''
        };
      });

      setAttendanceData(enrichedData);
      setEmployees(employeesData);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchScheduleSettings();
  }, []);

  const filteredData = useMemo(() => {
    return attendanceData.filter(record => {
      if (filters.startDate && record.date < filters.startDate) return false;
      if (filters.endDate && record.date > filters.endDate) return false;
      if (filters.employeeId && record.employee?.id !== parseInt(filters.employeeId)) return false;
      if (filters.category && record.employeeDetails?.category !== filters.category) return false;
      if (filters.department && record.department !== filters.department) return false;
      if (filters.workType && record.workType !== filters.workType) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.shift && record.shift !== filters.shift) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.fullName.toLowerCase().includes(query) ||
          record.employeeId.toLowerCase().includes(query) ||
          record.department.toLowerCase().includes(query) ||
          record.status.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [attendanceData, filters, searchQuery]);

  const groupedData = useMemo(() => {
    if (viewOptions.groupBy === "date") {
      const groups = {};
      filteredData.forEach(record => {
        if (!groups[record.date]) groups[record.date] = [];
        groups[record.date].push(record);
      });
      return Object.entries(groups).map(([date, records]) => ({
        key: date,
        label: new Date(date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
        records,
        summary: calculateDateSummary(records)
      }));
    } else if (viewOptions.groupBy === "employee") {
      const groups = {};
      filteredData.forEach(record => {
        const key = record.employee?.id || 'unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(record);
      });
      return Object.entries(groups).map(([key, records]) => ({
        key,
        label: records[0].fullName,
        records,
        summary: calculateEmployeeSummary(records),
        employeeId: records[0].employeeId,
        employeeFirstName: records[0].employeeFirstName,
        employeeLastName: records[0].employeeLastName,
        employeeEmail: records[0].employeeDetails?.email
      }));
    } else {
      const groups = {};
      filteredData.forEach(record => {
        const key = record.department;
        if (!groups[key]) groups[key] = [];
        groups[key].push(record);
      });
      return Object.entries(groups).map(([key, records]) => ({
        key,
        label: key,
        records,
        summary: calculateDepartmentSummary(records)
      }));
    }
  }, [filteredData, viewOptions.groupBy]);

  const totalPages = Math.ceil(groupedData.length / itemsPerPage);
  const paginatedData = groupedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const overallSummary = useMemo(() => {
    return calculateOverallSummary(filteredData);
  }, [filteredData]);

  function calculateDateSummary(records) {
    const present = records.filter(r => r.status?.includes('Present')).length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const leave = records.filter(r => r.status === 'On Leave').length;
    const totalHours = records.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    return { present, absent, late, leave, totalHours, totalEmployees: records.length };
  }

  function calculateEmployeeSummary(records) {
    const presentDays = records.filter(r => r.status?.includes('Present')).length;
    const absentDays = records.filter(r => r.status === 'Absent').length;
    const lateDays = records.filter(r => r.status === 'Late').length;
    const leaveDays = records.filter(r => r.status === 'On Leave').length;
    const totalHours = records.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    const avgHours = records.length > 0 ? totalHours / records.length : 0;
    return { presentDays, absentDays, lateDays, leaveDays, totalHours, avgHours, totalDays: records.length };
  }

  function calculateDepartmentSummary(records) {
    const employees = [...new Set(records.map(r => r.employee?.id))].length;
    const present = records.filter(r => r.status?.includes('Present')).length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const totalHours = records.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    const attendanceRate = records.length > 0 ? (present / records.length) * 100 : 0;
    return { employees, present, absent, late, totalHours, attendanceRate, totalRecords: records.length };
  }

  function calculateOverallSummary(allRecords) {
    const totalRecords = allRecords.length;
    const totalEmployees = [...new Set(allRecords.map(r => r.employee?.id))].length;
    const totalDepartments = [...new Set(allRecords.map(r => r.department))].length;
    
    const statusCounts = {
      Present: allRecords.filter(r => r.status?.includes('Present')).length,
      Absent: allRecords.filter(r => r.status === 'Absent').length,
      Late: allRecords.filter(r => r.status === 'Late').length,
      'On Leave': allRecords.filter(r => r.status === 'On Leave').length
    };
    
    const totalHours = allRecords.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    const avgHours = totalRecords > 0 ? totalHours / totalRecords : 0;
    const attendanceRate = totalRecords > 0 ? (statusCounts.Present / totalRecords) * 100 : 0;
    
    const deptBreakdown = {};
    allRecords.forEach(record => {
      if (!deptBreakdown[record.department]) {
        deptBreakdown[record.department] = { present: 0, total: 0 };
      }
      deptBreakdown[record.department].total++;
      if (record.status?.includes('Present')) {
        deptBreakdown[record.department].present++;
      }
    });
    
    return { totalRecords, totalEmployees, totalDepartments, statusCounts, totalHours, avgHours, attendanceRate, deptBreakdown };
  }

  const toggleRow = (key) => {
    if (expandedRows.includes(key)) {
      setExpandedRows(expandedRows.filter(k => k !== key));
    } else {
      setExpandedRows([...expandedRows, key]);
    }
  };

  const handleRowClick = (group) => {
    if (viewOptions.groupBy === 'date') {
      navigate(`/attendance?date=${group.key}`);
    } else if (viewOptions.groupBy === 'employee') {
      navigate(`/employee/${group.key}`);
    } else if (viewOptions.groupBy === 'department') {
      navigate(`/attendance?department=${encodeURIComponent(group.label)}`);
    }
  };

  const exportToExcel = () => {
    const selectedEmployee = employees.find(
      (employee) => String(employee.id) === String(filters.employeeId)
    );
    const employeeName = selectedEmployee
      ? `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim()
      : 'All Employees';
    const wsData = [
      ['Attendance Report', employeeName, new Date().toLocaleDateString()],
      ['Period', filters.startDate || 'All dates', filters.endDate || 'All dates'],
      [''],
      ['Overall Summary', '', ''],
      ['Total Records', overallSummary.totalRecords],
      ['Total Employees', overallSummary.totalEmployees],
      ['Total Hours', overallSummary.totalHours.toFixed(2)],
      ['Average Hours per Day', overallSummary.avgHours.toFixed(2)],
      ['Attendance Rate', `${overallSummary.attendanceRate.toFixed(1)}%`],
      [''],
      ['Status Breakdown', '', ''],
      ['Present', overallSummary.statusCounts.Present],
      ['Absent', overallSummary.statusCounts.Absent],
      ['Late', overallSummary.statusCounts.Late],
      ['On Leave', overallSummary.statusCounts['On Leave']],
      [''],
      ['Department Breakdown', '', '', ''],
      ['Department', 'Employees', 'Attendance Rate', 'Total Hours']
    ];

    Object.entries(overallSummary.deptBreakdown).forEach(([dept, data]) => {
      const rate = data.total > 0 ? (data.present / data.total) * 100 : 0;
      wsData.push([dept, data.total, `${rate.toFixed(1)}%`, '']);
    });

    wsData.push(['', '', '', '']);
    wsData.push(['Date', 'Employee ID', 'Employee Name', 'Department', 'Category', 'Check In', 'Check Out', 'Hours', 'Status', 'Shift']);

    filteredData.forEach(record => {
      wsData.push([
        record.date, record.employeeId, record.fullName, record.department,
        record.category, record.checkIn || '--:--', record.checkOut || '--:--',
        record.minimumHour || 0, record.status, record.shift
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    const employeeFileName = selectedEmployee
      ? employeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'all-employees';
    const periodFileName = filters.startDate && filters.endDate
      ? `${filters.startDate}_to_${filters.endDate}`
      : new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `attendance_report_${employeeFileName}_${periodFileName}.xlsx`);
    setSuccess("Report exported successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const exportToPDF = () => {
    window.print();
  };

  const resetFilters = () => {
    setFilters({
      startDate: "", endDate: "", employeeId: "", category: "", department: "", workType: "", status: "", shift: ""
    });
    setSearchQuery("");
    setCurrentPage(1);
    setShowFilterModal(false);
  };

  const uniqueCategories = [...new Set(employees.map(e => e.category))].filter(Boolean);
  const uniqueDepartments = [...new Set(employees.map(e => e.department))].filter(Boolean);
  const uniqueWorkTypes = [...new Set(employees.map(e => e.workType))].filter(Boolean);
  const uniqueStatuses = ['Present', 'Absent', 'Late', 'On Leave', 'Weekend Present', 'Holiday Present'];

  const parseEmails = (raw) => {
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const sendReportByEmail = async () => {
    try {
      setError("");
      setSuccess("");

      if (!filters.startDate || !filters.endDate) {
        setError("Please select Start Date and End Date before sending the report.");
        return;
      }

      const toEmails = parseEmails(reportEmailTo);
      if (toEmails.length === 0) {
        setError("Please enter at least one recipient email (comma-separated).");
        return;
      }

      const token = getToken();
      if (!token) {
        setError("You are not logged in. Please login again.");
        return;
      }

      setSendingReport(true);

      const payload = {
        toEmails,
        startDate: filters.startDate,
        endDate: filters.endDate,
        subject: reportEmailSubject?.trim() || `Attendance Report (${filters.startDate} to ${filters.endDate})`,
        message: reportEmailMessage?.trim() || "Please find the attendance report attached."
      };

      const res = await fetch(`${API_BASE_URL}/api/reports/attendance/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to send report email");

      setSuccess(text || "Report email sent successfully!");
      setShowEmailModal(false);
      setReportEmailTo("");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e.message || "Failed to send report email");
    } finally {
      setSendingReport(false);
    }
  };

  const sendEmployeeReportByEmail = async () => {
    try {
      setError("");
      setSuccess("");

      if (!selectedEmployeeForReport) {
        setError("No employee selected.");
        return;
      }

      if (!filters.startDate || !filters.endDate) {
        setError("Please select Start Date and End Date in filters before sending the report.");
        return;
      }

      const token = getToken();
      if (!token) {
        setError("You are not logged in. Please login again.");
        return;
      }

      setSendingEmployeeReport(true);

      const payload = {
        employeeId: selectedEmployeeForReport.key,
        employeeEmail: selectedEmployeeForReport.employeeEmail,
        startDate: filters.startDate,
        endDate: filters.endDate,
        subject: `Attendance Report for ${selectedEmployeeForReport.label} (${filters.startDate} to ${filters.endDate})`,
        message: `Please find the attendance report for ${selectedEmployeeForReport.label} attached.`
      };

      const res = await fetch(`${API_BASE_URL}/api/reports/attendance/employee/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to send employee report email");

      setSuccess(text || `Report sent to ${selectedEmployeeForReport.employeeEmail || selectedEmployeeForReport.label} successfully!`);
      setShowEmployeeReportModal(false);
      setSelectedEmployeeForReport(null);
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e.message || "Failed to send employee report email");
    } finally {
      setSendingEmployeeReport(false);
    }
  };

  const fetchScheduleSettings = async () => {
    try {
      setScheduleLoading(true);
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/report-schedule`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Failed to load report schedule settings");
      const data = await res.json();
      setScheduleSettings({
        enabled: !!data.enabled,
        sendTime: data.sendTime ? data.sendTime.slice(0, 5) : "18:00",
        recipientEmails: data.recipientEmails || "",
        sendOnlyExceptions: data.sendOnlyExceptions !== false,
        attachExcel: data.attachExcel !== false
      });
    } catch (e) {
      setError(e.message || "Failed to load schedule settings");
    } finally {
      setScheduleLoading(false);
    }
  };

  const saveScheduleSettings = async () => {
    try {
      setError("");
      setSuccess("");

      const token = getToken();
      if (!token) {
        setError("You are not logged in. Please login again.");
        return;
      }

      if (scheduleSettings.enabled) {
        if (!scheduleSettings.sendTime) {
          setError("Please select a send time.");
          return;
        }
        if (!scheduleSettings.recipientEmails?.trim()) {
          setError("Please enter recipient emails for scheduled reports.");
          return;
        }
      }

      setScheduleSaving(true);

      const payload = {
        enabled: scheduleSettings.enabled,
        sendTime: scheduleSettings.sendTime,
        recipientEmails: scheduleSettings.recipientEmails,
        sendOnlyExceptions: scheduleSettings.sendOnlyExceptions,
        attachExcel: scheduleSettings.attachExcel
      };

      const res = await fetch(`${API_BASE_URL}/api/report-schedule`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to save schedule settings");
      }

      const saved = await res.json();
      setScheduleSettings({
        enabled: !!saved.enabled,
        sendTime: saved.sendTime ? saved.sendTime.slice(0, 5) : scheduleSettings.sendTime,
        recipientEmails: saved.recipientEmails || scheduleSettings.recipientEmails,
        sendOnlyExceptions: saved.sendOnlyExceptions !== false,
        attachExcel: saved.attachExcel !== false
      });

      setSuccess("Daily auto-report schedule saved successfully!");
      setShowScheduleModal(false);
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e.message || "Failed to save schedule settings");
    } finally {
      setScheduleSaving(false);
    }
  };

  const openEmployeeReportModal = (group) => {
    setSelectedEmployeeForReport({
      key: group.key,
      label: group.label,
      employeeEmail: group.employeeEmail,
      employeeId: group.employeeId
    });
    setShowEmployeeReportModal(true);
  };

  // Calculate attendance rate color
  const getAttendanceRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className={`fixed inset-y-0 left-0 bg-white shadow-xl z-30 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {!sidebarOpen && (
        <button onClick={toggleSidebar} className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors">
          <Menu size={20} className="text-gray-600" />
        </button>
      )}
      
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="flex justify-between items-center px-6 py-3">
            <div className="flex items-center gap-4">
              {sidebarOpen && (
                <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Menu size={20} className="text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  <BarChart3 size={22} className="text-blue-500" />
                  Attendance Report
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">Comprehensive attendance tracking and analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowRawBiometric(true); setRawPage(0); setTimeout(() => fetchRawEvents(0), 0); }} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-800">
                <FileText size={18} />
                <span className="hidden sm:inline">Raw Biometric</span>
              </button>
              <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <RefreshCw size={18} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <button onClick={exportToPDF} className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <Printer size={18} />
                <span className="hidden sm:inline">Print</span>
              </button>
              
              <button onClick={exportToExcel} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition">
                <Download size={18} />
                <span className="hidden sm:inline">Export Excel</span>
              </button>

              <div className="relative">
                <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role || 'Role'}</p>
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                
                {userDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setUserDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-40">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500">{user?.email || ''}</p>
                      </div>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-600 hover:bg-gray-50 rounded-b-lg transition-colors flex items-center gap-2">
                        <LogOut size={18} /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <XCircle size={20} /> {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={20} /> {success}
            </div>
          )}

          {/* Stats Cards - No Payroll */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Total Records</p>
                <FileText size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{overallSummary.totalRecords}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Employees</p>
                <Users size={16} className="text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-600">{overallSummary.totalEmployees}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Total Hours</p>
                <Clock size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{overallSummary.totalHours.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Present</p>
                <UserCheck size={16} className="text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-600">{overallSummary.statusCounts.Present}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Attendance Rate</p>
                <TrendingUp size={16} className="text-purple-400" />
              </div>
              <p className={`text-2xl font-bold ${getAttendanceRateColor(overallSummary.attendanceRate)}`}>
                {overallSummary.attendanceRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Departments</p>
                <Building size={16} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{overallSummary.totalDepartments}</p>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setShowFilterModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                  <FilterIcon size={18} />
                  Filters
                  {(filters.startDate || filters.endDate || filters.category || filters.department) && (
                    <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </button>
                
                <div className="relative">
                  <select
                    value={viewOptions.groupBy}
                    onChange={(e) => setViewOptions({...viewOptions, groupBy: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="date">Group by Date</option>
                    <option value="employee">Group by Employee</option>
                    <option value="department">Group by Department</option>
                  </select>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500"
                  />
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm">
                  <Mail size={16} />
                  Email Report
                </button>
                <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition shadow-sm">
                  <ClockIcon size={16} />
                  Schedule
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Employee attendance report</h3>
                  <p className="text-xs text-gray-500">Choose one employee and the exact days you want to include.</p>
                </div>
                <span className="text-xs font-medium text-blue-700">{filteredData.length} matching records</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <select
                  value={filters.employeeId}
                  onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">All employees</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeId || employee.id})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Report start date"
                  value={filters.startDate}
                  max={filters.endDate || undefined}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <input
                  type="date"
                  aria-label="Report end date"
                  value={filters.endDate}
                  min={filters.startDate || undefined}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={exportToExcel}
                  disabled={!filters.startDate || !filters.endDate || filteredData.length === 0}
                  className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} /> Export report
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.startDate || filters.endDate || filters.employeeId || filters.category || filters.department || filters.status) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Active filters:</span>
                {filters.startDate && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">From: {filters.startDate}</span>
                )}
                {filters.endDate && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">To: {filters.endDate}</span>
                )}
                {filters.employeeId && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                    Employee: {employees.find((employee) => String(employee.id) === String(filters.employeeId))?.firstName || filters.employeeId}
                  </span>
                )}
                {filters.category && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Category: {filters.category}</span>
                )}
                {filters.department && (
                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">Dept: {filters.department}</span>
                )}
                {filters.status && (
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">Status: {filters.status}</span>
                )}
                <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
              </div>
            )}
          </div>

          {showRawBiometric && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 backdrop-blur-sm">
              <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b bg-slate-950 px-6 py-4 text-white">
                  <div><h2 className="text-lg font-bold">Raw Biometric Events</h2><p className="text-xs text-slate-400">Original device punches for reporting and verification</p></div>
                  <div className="flex gap-2"><button onClick={exportRawEvents} disabled={!rawEvents.length} className="rounded-lg bg-green-600 px-3 py-2 text-sm disabled:opacity-50"><Download size={16} className="inline mr-1" />Export</button><button onClick={() => setShowRawBiometric(false)} className="rounded-lg bg-white/10 p-2"><X size={18} /></button></div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-b bg-slate-50 p-4 md:grid-cols-6">
                  <select value={rawFilters.employeeId} onChange={e => setRawFilters({...rawFilters, employeeId:e.target.value})} className="rounded-lg border px-3 py-2 text-sm"><option value="">All employees</option>{employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select>
                  <input type="date" value={rawFilters.startDate} onChange={e=>setRawFilters({...rawFilters,startDate:e.target.value})} className="rounded-lg border px-3 py-2 text-sm" />
                  <input type="date" value={rawFilters.endDate} onChange={e=>setRawFilters({...rawFilters,endDate:e.target.value})} className="rounded-lg border px-3 py-2 text-sm" />
                  <select value={rawFilters.source} onChange={e=>setRawFilters({...rawFilters,source:e.target.value})} className="rounded-lg border px-3 py-2 text-sm"><option value="">All sources</option><option value="ONEPASS">ONEPASS</option><option value="EXCEL_IMPORT">Excel import</option></select>
                  <select value={rawFilters.status} onChange={e=>setRawFilters({...rawFilters,status:e.target.value})} className="rounded-lg border px-3 py-2 text-sm"><option value="">All statuses</option><option value="RECEIVED">Received</option><option value="PROCESSED">Processed</option><option value="FAILED">Failed</option></select>
                  <button onClick={()=>fetchRawEvents(0)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="min-w-full divide-y"><thead className="sticky top-0 bg-white"><tr>{["Time","Employee","Source","Punch","Method","Status","Attendance",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs uppercase text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y">{rawEvents.map(event=><tr key={event.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-sm">{event.eventTimestamp || event.receivedAt}</td><td className="px-4 py-3 text-sm">{getRawEventEmployeeName(event)}</td><td className="px-4 py-3 text-xs">{event.sourceType}</td><td className="px-4 py-3 text-sm">{event.punchType || "-"}</td><td className="px-4 py-3 text-sm">{event.verificationMethod || "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${event.processingStatus==="PROCESSED"?"bg-green-100 text-green-700":event.processingStatus==="FAILED"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>{event.processingStatus}</span></td><td className="px-4 py-3 text-xs">{event.attendanceId || "-"}</td><td className="px-4 py-3"><button onClick={()=>setSelectedRawEvent(event)} className="text-sm font-semibold text-blue-600">Payload</button></td></tr>)}</tbody></table>
                  {!rawLoading && !rawEvents.length && <div className="p-12 text-center text-slate-500">No raw biometric events found.</div>}
                </div>
                <div className="flex items-center justify-between border-t px-5 py-3 text-sm"><span>Page {rawPage+1} of {rawTotalPages}</span><div className="flex gap-2"><button disabled={rawPage===0} onClick={()=>fetchRawEvents(rawPage-1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={rawPage+1>=rawTotalPages} onClick={()=>fetchRawEvents(rawPage+1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
              </div>
              {selectedRawEvent && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={()=>setSelectedRawEvent(null)}><div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-slate-950 p-5 text-slate-100" onClick={e=>e.stopPropagation()}><div className="mb-3 flex justify-between"><h3 className="font-bold">Raw payload #{selectedRawEvent.id}</h3><button onClick={()=>setSelectedRawEvent(null)}><X size={18}/></button></div><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(typeof selectedRawEvent.rawPayload === "string" ? (()=>{try{return JSON.parse(selectedRawEvent.rawPayload)}catch{return selectedRawEvent.rawPayload}})() : selectedRawEvent.rawPayload, null, 2)}</pre></div></div>}
            </div>
          )}

          {/* Filter Modal */}
          {showFilterModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <FilterIcon size={20} className="text-blue-500" />
                      Filter Attendance Report
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Refine your attendance report data</p>
                  </div>
                  <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">All Categories</option>
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <select value={filters.department} onChange={(e) => setFilters({...filters, department: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">All Departments</option>
                        {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">All Status</option>
                        {uniqueStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                      <select value={filters.employeeId} onChange={(e) => setFilters({...filters, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">All Employees</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button onClick={() => setShowFilterModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                  <button onClick={() => { setShowFilterModal(false); fetchData(); }} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Apply Filters</button>
                </div>
              </div>
            </div>
          )}

          {/* Email Report Modal */}
          {showEmailModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Mail size={20} className="text-blue-500" />
                      Email Attendance Report
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Send report to email recipients</p>
                  </div>
                  <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Emails (comma-separated)</label>
                    <input type="text" value={reportEmailTo} onChange={(e) => setReportEmailTo(e.target.value)} placeholder="hr@company.com, manager@company.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input type="text" value={reportEmailSubject} onChange={(e) => setReportEmailSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea value={reportEmailMessage} onChange={(e) => setReportEmailMessage(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600">📅 Date range: {filters.startDate || "Not set"} to {filters.endDate || "Not set"}</p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                  <button onClick={sendReportByEmail} disabled={sendingReport} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                    {sendingReport ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    {sendingReport ? "Sending..." : "Send Report"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Modal */}
          {showScheduleModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <ClockIcon size={20} className="text-indigo-500" />
                      Auto Report Schedule
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Configure daily automated reports</p>
                  </div>
                  <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input type="checkbox" id="autoEnabled" checked={scheduleSettings.enabled} onChange={(e) => setScheduleSettings({...scheduleSettings, enabled: e.target.checked})} className="h-4 w-4 text-indigo-600 rounded" />
                    <label htmlFor="autoEnabled" className="text-sm font-medium text-gray-700">Enable daily auto email</label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send Time</label>
                    <input type="time" value={scheduleSettings.sendTime} onChange={(e) => setScheduleSettings({...scheduleSettings, sendTime: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Emails</label>
                    <input type="text" value={scheduleSettings.recipientEmails} onChange={(e) => setScheduleSettings({...scheduleSettings, recipientEmails: e.target.value})} placeholder="hr@company.com, manager@company.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="exceptionsOnly" checked={scheduleSettings.sendOnlyExceptions} onChange={(e) => setScheduleSettings({...scheduleSettings, sendOnlyExceptions: e.target.checked})} className="h-4 w-4 text-indigo-600 rounded" />
                    <label htmlFor="exceptionsOnly" className="text-sm text-gray-700">Send only Late & Absent employees</label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="attachExcel" checked={scheduleSettings.attachExcel} onChange={(e) => setScheduleSettings({...scheduleSettings, attachExcel: e.target.checked})} className="h-4 w-4 text-indigo-600 rounded" />
                    <label htmlFor="attachExcel" className="text-sm text-gray-700">Attach Excel file</label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                  <button onClick={saveScheduleSettings} disabled={scheduleSaving} className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
                    {scheduleSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {scheduleSaving ? "Saving..." : "Save Schedule"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Employee Report Modal */}
          {showEmployeeReportModal && selectedEmployeeForReport && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <User size={20} className="text-green-500" />
                      Employee Attendance Report
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Send report to {selectedEmployeeForReport.label}</p>
                  </div>
                  <button onClick={() => setShowEmployeeReportModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Employee: <span className="font-semibold">{selectedEmployeeForReport.label}</span></p>
                    <p className="text-sm text-gray-600 mt-1">Email: <span className="font-semibold">{selectedEmployeeForReport.employeeEmail || "No email on file"}</span></p>
                    <p className="text-sm text-gray-600 mt-1">Employee ID: <span className="font-semibold">{selectedEmployeeForReport.employeeId}</span></p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600">📅 Date range: {filters.startDate || "Not set"} to {filters.endDate || "Not set"}</p>
                    {(!filters.startDate || !filters.endDate) && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ Please set date range in filters before sending</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button onClick={() => setShowEmployeeReportModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                  <button onClick={sendEmployeeReportByEmail} disabled={sendingEmployeeReport || !filters.startDate || !filters.endDate} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2">
                    {sendingEmployeeReport ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    {sendingEmployeeReport ? "Sending..." : "Send Report"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary Section - No Payroll */}
          {viewOptions.showSummary && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart size={20} className="text-blue-500" />
                Attendance Summary
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 flex items-center gap-1"><UserCheck size={14} /> Present</p>
                  <p className="text-2xl font-bold text-gray-900">{overallSummary.statusCounts.Present}</p>
                  <p className="text-xs text-green-500">{overallSummary.totalRecords > 0 ? ((overallSummary.statusCounts.Present / overallSummary.totalRecords) * 100).toFixed(1) : 0}% of total</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center gap-1"><UserX size={14} /> Absent</p>
                  <p className="text-2xl font-bold text-gray-900">{overallSummary.statusCounts.Absent}</p>
                  <p className="text-xs text-red-500">{overallSummary.totalRecords > 0 ? ((overallSummary.statusCounts.Absent / overallSummary.totalRecords) * 100).toFixed(1) : 0}% of total</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 flex items-center gap-1"><AlertCircle size={14} /> Late</p>
                  <p className="text-2xl font-bold text-gray-900">{overallSummary.statusCounts.Late}</p>
                  <p className="text-xs text-yellow-500">{overallSummary.totalRecords > 0 ? ((overallSummary.statusCounts.Late / overallSummary.totalRecords) * 100).toFixed(1) : 0}% of total</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 flex items-center gap-1"><Briefcase size={14} /> On Leave</p>
                  <p className="text-2xl font-bold text-gray-900">{overallSummary.statusCounts['On Leave']}</p>
                  <p className="text-xs text-blue-500">{overallSummary.totalRecords > 0 ? ((overallSummary.statusCounts['On Leave'] / overallSummary.totalRecords) * 100).toFixed(1) : 0}% of total</p>
                </div>
              </div>

              <h4 className="text-md font-medium text-gray-700 mb-3">Department Performance</h4>
              <div className="space-y-3">
                {Object.entries(overallSummary.deptBreakdown).map(([dept, data]) => {
                  const rate = data.total > 0 ? (data.present / data.total) * 100 : 0;
                  return (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 w-32">{dept}</span>
                      <div className="flex-1 flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-24">
                          {data.present}/{data.total} present
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${rate}%` }}></div>
                        </div>
                        <span className={`text-sm font-medium ${getAttendanceRateColor(rate)}`}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Table */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {viewOptions.groupBy === 'date' ? 'Date' : viewOptions.groupBy === 'employee' ? 'Employee' : 'Department'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((group) => (
                      <React.Fragment key={group.key}>
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(group)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <button onClick={(e) => { e.stopPropagation(); toggleRow(group.key); }} className="mr-2 text-gray-500 hover:text-gray-700">
                                {expandedRows.includes(group.key) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                              <div>
                                <div className="font-medium text-gray-900">{group.label}</div>
                                <div className="text-sm text-gray-500">{group.records.length} records</div>
                              </div>
                            </div>
                           </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {viewOptions.groupBy === 'date' && (
                                <>
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{group.summary.present} Present</span>
                                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">{group.summary.absent} Absent</span>
                                  <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">{group.summary.late} Late</span>
                                </>
                              )}
                              {viewOptions.groupBy === 'employee' && (
                                <>
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{group.summary.presentDays} Present</span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{group.summary.avgHours.toFixed(1)} avg hrs</span>
                                </>
                              )}
                              {viewOptions.groupBy === 'department' && (
                                <>
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{group.summary.present} Present</span>
                                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">{group.summary.attendanceRate.toFixed(1)}% Rate</span>
                                </>
                              )}
                            </div>
                           </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-blue-600">{group.summary.totalHours?.toFixed(1) || 0} hrs</div>
                           </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); toggleRow(group.key); }} className="text-blue-600 hover:text-blue-800 text-sm">
                                {expandedRows.includes(group.key) ? 'Hide' : 'Details'}
                              </button>
                              {viewOptions.groupBy === 'employee' && (
                                <button onClick={(e) => { e.stopPropagation(); openEmployeeReportModal(group); }} className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1">
                                  <Mail size={14} /> Report
                                </button>
                              )}
                            </div>
                           </td>
                         </tr>
                        
                        {expandedRows.includes(group.key) && viewOptions.showDetails && (
                          <tr>
                            <td colSpan="4" className="px-6 py-4 bg-gray-50">
                              <div className="overflow-x-auto">
                                <table className="min-w-full">
                                  <thead>
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs text-gray-500">Date</th>
                                      <th className="px-4 py-2 text-left text-xs text-gray-500">Employee</th>
                                      <th className="px-4 py-2 text-left text-xs text-gray-500">Check In/Out</th>
                                      <th className="px-4 py-2 text-left text-xs text-gray-500">Hours</th>
                                      <th className="px-4 py-2 text-left text-xs text-gray-500">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.records.map((record) => (
                                      <tr key={record.id} className="hover:bg-white">
                                        <td className="px-4 py-2 text-sm">{record.date}</td>
                                        <td className="px-4 py-2 text-sm">
                                          <div className="font-medium">{record.fullName}</div>
                                          <div className="text-xs text-gray-500">{record.employeeId}</div>
                                        </td>
                                        <td className="px-4 py-2 text-sm">{record.checkIn || '--:--'} → {record.checkOut || '--:--'}</td>
                                        <td className="px-4 py-2 text-sm">
                                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{record.minimumHour || 0} hrs</span>
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          <span className={`px-2 py-1 text-xs rounded-full ${
                                            record.status?.includes('Present') ? 'bg-green-100 text-green-800' :
                                            record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                                            record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                          }`}>{record.status}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50">Prev</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && filteredData.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
              <button onClick={resetFilters} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Reset Filters</button>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-gray-400">
            Report generated on {new Date().toLocaleString()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Report;
