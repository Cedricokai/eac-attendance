import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import {
  Calendar, Clock, User, Check, X, Filter, Download, Plus, ChevronLeft,
  ChevronRight, Search, MoreVertical, Edit, Trash2, RefreshCw, ChevronDown,
  ChevronUp, FileText, DollarSign, Building, Upload, File, Users, Receipt,
  CalendarRange, AlertCircle, CalendarDays, ArrowRightLeft, Settings,
  Info, HelpCircle, BarChart, Eye, EyeOff, Save, CheckCircle, XCircle, UserCheck,
  ArrowLeftRight, Menu, Flag, AlertTriangle
} from "lucide-react";
import MainSidebar from "../mainSidebar";
import { useSearchParams, useNavigate } from "react-router-dom";
import ExcelTemplateViewer from './ExcelTemplateViewer';
import TimesheetAttendanceSync from "../../../components/sync/TimesheetAttendanceSync";
import * as XLSX from 'xlsx';

const AttendanceCodes = {
  PRESENT: 'P',
  ABSENT: 'A',
  LEAVE: 'L',
  HOLIDAY: 'H',
  SICK: 'S',
  WEEKEND_PRESENT: 'WP',
  HOLIDAY_PRESENT: 'HP',
  LATE: 'LT',
  OFF_DAY: 'OFF',
  PATERNITY_LEAVE: 'PL',
  MATERNITY_LEAVE: 'ML'
};

const TimesheetStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID'
};

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
  const [filters] = useState({
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
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [showCodeSettings, setShowCodeSettings] = useState(false);
  const [employeeNormalHours, setEmployeeNormalHours] = useState({});
  const [normalHours, setNormalHours] = useState(0);
  const [nhManuallyEdited, setNhManuallyEdited] = useState(false);
  const [hourConfigModal, setHourConfigModal] = useState({
    open: false,
    employeeId: null,
    dateStr: '',
    attendanceCode: '',
    currentNH: 0,
    currentOT: 0
  });
  const [attendanceCodeSettings, setAttendanceCodeSettings] = useState({});

  const fetchAttendanceCodeSettings = async () => {
    try {
        const token = localStorage.getItem("jwtToken");
        const response = await fetch(`${API_BASE_URL}/api/settings/attendance-codes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            setAttendanceCodeSettings(data);
        } else {
            setAttendanceCodeSettings({
                P: { capNH: false, defaultNH: 8, allowOT: true, description: "Regular Present" },
                WP: { capNH: false, defaultNH: 8, allowOT: true, description: "Weekend Present" },
                HP: { capNH: false, defaultNH: 8, allowOT: true, description: "Holiday Present" },
                H: { capNH: false, defaultNH: 8, allowOT: false, description: "Holiday" },
                L: { capNH: false, defaultNH: 8, allowOT: false, description: "Leave" },
                S: { capNH: false, defaultNH: 8, allowOT: false, description: "Sick Leave" },
                ML: { capNH: false, defaultNH: 8, allowOT: false, description: "Maternity Leave" },
                PL: { capNH: false, defaultNH: 8, allowOT: false, description: "Paternity Leave" },
                OFF: { capNH: false, defaultNH: 0, allowOT: false, description: "Off Day" },
                A: { capNH: false, defaultNH: 0, allowOT: false, description: "Absent" }
            });
        }
    } catch (err) {
        console.error("Error fetching attendance code settings:", err);
    }
  };

  useEffect(() => {
    fetchAttendanceCodeSettings();
  }, []);

  const saveAttendanceCodeSettings = async () => {
    try {
        const token = localStorage.getItem("jwtToken");
        const promises = Object.entries(attendanceCodeSettings).map(([code, settings]) =>
            fetch(`${API_BASE_URL}/api/settings/attendance-codes/${code}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            })
        );
        
        await Promise.all(promises);
        setSaveMessage({ type: "success", text: "Attendance code settings saved successfully!" });
        setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    } catch (err) {
        console.error("Error saving settings:", err);
        setSaveMessage({ type: "error", text: "Failed to save settings: " + err.message });
        setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  const [saveSpecificDate, setSaveSpecificDate] = useState({
    open: false,
    date: "",
    endDate: "",
    rangeMode: false,
    employeeIds: new Set(),
    isSaving: false
  });
  
  const [missingSourceEntries, setMissingSourceEntries] = useState({});
  const [showMissingSourceModal, setShowMissingSourceModal] = useState(false);
  const [missingSourceFilter, setMissingSourceFilter] = useState("all");
  const [missingSourceModalData, setMissingSourceModalData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    employeeIds: new Set()
  });
  
  const [autoSyncWithBilling, setAutoSyncWithBilling] = useState(true);
  const userManuallyChangedRef = useRef(false);
  const autoSyncPerformedRef = useRef(false);
  
  const [bulkAction, setBulkAction] = useState({
    scope: "period",
    date: "",
    startDate: "",
    endDate: "",
    selectedDatesText: "",
    selectedDates: [],
    attendanceCode: "P",
    totalHours: "8",
    overtimeHours: "0",
    onlyUpdateExistingP: false,
    conditionalLogic: {
      enabled: false,
      conditionType: "nhEquals",
      conditionValue: "8",
      thenAction: "setOvertime",
      thenValue: "4"
    }
  });
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });
  const [defaultRates, setDefaultRates] = useState({
    hourlyRate: 0,
    overtimeHourlyRate: 0
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
    timeAndHalfAfter8Hours: false,
    weekendRate: 1.0,
    holidayRate: 1.0,
    hourlyRate: 0,
    overtimeHourlyRate: 0,
    standardWorkHours: 8
  });
  const [holidays, setHolidays] = useState([]);
  const [specialWeekends, setSpecialWeekends] = useState([]);
  const [employeeHours, setEmployeeHours] = useState({});
  const [employeeOvertime, setEmployeeOvertime] = useState({});
  const [exportLoading, setExportLoading] = useState(false);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('timesheet');
  const [showDurationFilter, setShowDurationFilter] = useState(false);
  const [durationFilter, setDurationFilter] = useState({
    startDate: "",
    endDate: "",
    customRange: false
  });
  const [importedExcelData, setImportedExcelData] = useState([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [customDays, setCustomDays] = useState([]);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [tablePageSize, setTablePageSize] = useState(25);
  const [tablePage, setTablePage] = useState(1);
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    scope: "selected",
    date: "",
    startDate: "",
    endDate: "",
    employeeIds: new Set(),
    selectedEmployeeForDay: null,
    selectedDateForDay: "",
    isDeleting: false
  });

  const getLastBillingDate = (nextBillingDate, billingCycle) => {
    const next = new Date(nextBillingDate);
    const last = new Date(next);
    
    switch (billingCycle) {
      case 'WEEKLY':
        last.setDate(last.getDate() - 7);
        break;
      case 'BI_WEEKLY':
        last.setDate(last.getDate() - 14);
        break;
      case 'MONTHLY':
        last.setMonth(last.getMonth() - 1);
        break;
      case 'QUARTERLY':
        last.setMonth(last.getMonth() - 3);
        break;
      default:
        last.setMonth(last.getMonth() - 1);
    }
    
    return last;
  };

  const getDaysBetween = (startDate, endDate) => {
    const days = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const current = new Date(start);
    
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const openDeleteForDay = (employeeId, dateStr) => {
    setDeleteModal({
      open: true,
      scope: "singleDay",
      date: dateStr,
      startDate: "",
      endDate: "",
      employeeIds: new Set([employeeId]),
      selectedEmployeeForDay: employeeId,
      selectedDateForDay: dateStr,
      isDeleting: false
    });
  };

  const toggleMissingSourceFlag = (employeeId, dateStr, currentFlag) => {
    const key = `${employeeId}_${dateStr}`;
    setMissingSourceEntries(prev => ({
      ...prev,
      [key]: {
        flagged: !currentFlag,
        reason: !currentFlag ? "No hard copy timesheet received" : null,
        flaggedAt: !currentFlag ? new Date().toISOString() : null,
        flaggedBy: user?.name || "Unknown"
      }
    }));
  };

  const bulkMarkMissingSource = () => {
    const { startDate, endDate, reason, employeeIds } = missingSourceModalData;
    
    if (!startDate || !endDate) {
      setSaveMessage({ type: "error", text: "Please select start and end dates" });
      return;
    }
    
    const ids = employeeIds.size > 0 ? Array.from(employeeIds) : Array.from(selectedEmployeeIds);
    
    if (ids.length === 0) {
      setSaveMessage({ type: "error", text: "Select at least one employee" });
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];
    const current = new Date(start);
    
    while (current <= end) {
      dateRange.push(toYMD(current));
      current.setDate(current.getDate() + 1);
    }
    
    const newMissingEntries = { ...missingSourceEntries };
    
    ids.forEach(empId => {
      dateRange.forEach(dateStr => {
        const key = `${empId}_${dateStr}`;
        newMissingEntries[key] = {
          flagged: true,
          reason: reason || "No hard copy timesheet received",
          flaggedAt: new Date().toISOString(),
          flaggedBy: user?.name || "Unknown"
        };
      });
    });
    
    setMissingSourceEntries(newMissingEntries);
    setShowMissingSourceModal(false);
    setMissingSourceModalData({ startDate: "", endDate: "", reason: "", employeeIds: new Set() });
    setSaveMessage({ type: "success", text: `Marked ${dateRange.length * ids.length} entries as "No Source Document"` });
    setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
  };

  const isMissingSource = (employeeId, dateStr) => {
    const key = `${employeeId}_${dateStr}`;
    return missingSourceEntries[key]?.flagged === true;
  };

  const getMissingSourceReason = (employeeId, dateStr) => {
    const key = `${employeeId}_${dateStr}`;
    return missingSourceEntries[key]?.reason || "No source document";
  };

  const handleExportInvoice = async () => {
    if (!selectedJob || selectedJob === '' || selectedJob === 'no-job') {
        setSaveMessage({ type: "error", text: "Please select a job first" });
        return;
    }
    
    const { start, end } = getDateRange();
    const startDate = toYMD(start);
    const endDate = toYMD(end);
    
    if (!startDate || !endDate) {
        setSaveMessage({ type: "error", text: "Please ensure date range is selected" });
        return;
    }
    
    setIsGenerating(true);
    setSaveMessage({ type: "info", text: "Generating invoice with attachments..." });
    
    try {
        const token = localStorage.getItem("jwtToken");
        const response = await fetch(
            `${API_BASE_URL}/api/timesheets/invoice/export-with-attachments?jobId=${selectedJob}&startDate=${startDate}&endDate=${endDate}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to generate invoice");
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `Invoice_${selectedJob}_${startDate}_to_${endDate}.zip`;
        if (contentDisposition && contentDisposition.includes('filename=')) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setSaveMessage({ type: "success", text: "Invoice ZIP generated successfully!" });
        
    } catch (err) {
        console.error("Error generating invoice:", err);
        setSaveMessage({ type: "error", text: `Failed to generate invoice: ${err.message}` });
    } finally {
        setIsGenerating(false);
        setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  const getFilteredEmployeesWithSourceFilter = () => {
    let filtered = getFilteredEmployees();
    
    if (missingSourceFilter === "verified") {
      filtered = filtered.filter(emp => {
        const hasAnyMissing = days.some(day => {
          const dateStr = toYMD(day);
          return isMissingSource(emp.id, dateStr) && attendanceData[emp.id]?.[dateStr];
        });
        return !hasAnyMissing;
      });
    } else if (missingSourceFilter === "unverified") {
      filtered = filtered.filter(emp => {
        return days.some(day => {
          const dateStr = toYMD(day);
          return isMissingSource(emp.id, dateStr) && attendanceData[emp.id]?.[dateStr];
        });
      });
    }
    
    return filtered;
  };

  const STANDARD_HOURS_CODES = new Set(["P", "WP", "HP", "H", "L", "S", "ML", "PL"]);
  const COUNT_CODES = new Set(["P", "WP", "HP"]);  
  const ZERO_HOURS_CODES = new Set(["A", "OFF"]);
  const PRESENT_CODES = new Set([...STANDARD_HOURS_CODES, ...ZERO_HOURS_CODES]);

  const isStandardHoursCode = (code) => STANDARD_HOURS_CODES.has(String(code || "").toUpperCase());
  const isZeroHoursCode = (code) => ZERO_HOURS_CODES.has(String(code || "").toUpperCase());
  const isPresentCode = (code) => PRESENT_CODES.has(String(code || "").toUpperCase());
  const isCountCodes = (code) => COUNT_CODES.has(String(code || "").toUpperCase());

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const saveSpecificDateAttendance = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const ids = saveSpecificDate.employeeIds.size > 0 
        ? Array.from(saveSpecificDate.employeeIds) 
        : Array.from(selectedEmployeeIds);
      
      if (ids.length === 0) {
        setSaveMessage({ type: "error", text: "Select at least one employee to save." });
        return;
      }

      if (!saveSpecificDate.rangeMode && !saveSpecificDate.date) {
        setSaveMessage({ type: "error", text: "Please select a date to save." });
        return;
      }

      if (saveSpecificDate.rangeMode && (!saveSpecificDate.date || !saveSpecificDate.endDate)) {
        setSaveMessage({ type: "error", text: "Please select start and end dates." });
        return;
      }

      const selectedEmployees = filteredEmployees.filter(e => ids.includes(e.id));
      
      const datesToSave = [];
      if (!saveSpecificDate.rangeMode) {
        datesToSave.push(saveSpecificDate.date);
      } else {
        const start = new Date(saveSpecificDate.date);
        const end = new Date(saveSpecificDate.endDate);
        
        if (start > end) {
          setSaveMessage({ type: "error", text: "Start date cannot be after end date." });
          return;
        }
        
        const current = new Date(start);
        while (current <= end) {
          datesToSave.push(toYMD(current));
          current.setDate(current.getDate() + 1);
        }
      }

      const timesheetData = [];
      let hasData = false;

      selectedEmployees.forEach(employee => {
        datesToSave.forEach(dateStr => {
          const attendanceStatus = attendanceData[employee.id]?.[dateStr];

          if (attendanceStatus && attendanceStatus !== "") {
            hasData = true;

            const key = `${employee.id}_${dateStr}`;
            const sourceMissing = missingSourceEntries[key]?.flagged || false;

            if (isPresentCode(attendanceStatus)) {
              const totalHours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
              const nh = parseFloat(employeeNormalHours?.[employee.id]?.[dateStr] || 0);
              const ot = parseFloat(employeeOvertime?.[employee.id]?.[dateStr] || 0);
              const earnings = calculateEarnings(employee, new Date(dateStr), nh, ot);
              
              const employeeJob = employees.find(e => e.id === employee.id)?.job;
              const jobId = employeeJob?.id;

              timesheetData.push({
                employeeId: employee.id,
                date: dateStr,
                regularHours: nh,
                overtimeHours: ot,
                breakHours: 0,
                totalHours: totalHours,
                earnings: earnings.totalPay,
                attendanceCode: attendanceStatus,
                sourceDocumentMissing: sourceMissing,
                sourceDocumentMissingReason: sourceMissing ? (missingSourceEntries[key]?.reason || null) : null,
                sourceDocumentMissingFlaggedBy: sourceMissing ? (missingSourceEntries[key]?.flaggedBy || null) : null,
                jobId: jobId
              });
            } else {
              timesheetData.push({
                employeeId: employee.id,
                date: dateStr,
                regularHours: 0,
                overtimeHours: 0,
                breakHours: 0,
                totalHours: 0,
                earnings: 0,
                attendanceCode: attendanceStatus,
                sourceDocumentMissing: sourceMissing,
                sourceDocumentMissingReason: sourceMissing ? (missingSourceEntries[key]?.reason || null) : null,
                sourceDocumentMissingFlaggedBy: sourceMissing ? (missingSourceEntries[key]?.flaggedBy || null) : null,
                jobId: jobId
              });
            }
          }
        });
      });

      if (!hasData) {
        setSaveMessage({ type: "error", text: "No data to save for selected employees." });
        return;
      }

      setSaveSpecificDate(prev => ({ ...prev, isSaving: true }));
      setSaveMessage({ type: "info", text: `Saving data for ${datesToSave.length} day(s) for ${ids.length} employees...` });

      const response = await fetch(`${API_BASE_URL}/api/timesheets/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          timesheets: timesheetData,
          saveMode: "override"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const result = await response.json();

      setSaveMessage({
        type: "success",
        text: `Saved ${datesToSave.length} day(s) for ${ids.length} employees. Created: ${result.createdCount || 0}, Updated: ${result.updatedCount || 0}`
      });

      await fetchTimesheets();

      setSaveSpecificDate({ 
        open: false, 
        date: "", 
        endDate: "", 
        rangeMode: false, 
        employeeIds: new Set(),
        isSaving: false 
      });

    } catch (err) {
      console.error("Save error:", err);
      setSaveMessage({ type: "error", text: `Save failed: ${err.message}` });
      setSaveSpecificDate(prev => ({ ...prev, isSaving: false }));
    } finally {
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  const toYMD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const applyAttendanceDefaults = (employeeId, dateStr, employee, attendanceCode = 'P') => {
    if (isStandardHoursCode(attendanceCode)) {
      const stdHours = getEmployeeStandardHours(employee);
      const settings = attendanceCodeSettings[attendanceCode] || attendanceCodeSettings.P;
      const defaultNH = (settings.defaultNH ?? stdHours);
      const nh = settings.capNH ? Math.min(defaultNH, stdHours) : defaultNH;
      const finalNH = (attendanceCode === 'A' || attendanceCode === 'OFF') ? 0 : nh;
      const finalOT = settings.allowOT ? "0" : "0";

      setEmployeeNormalHours(prev => ({
        ...prev,
        [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: String(finalNH) }
      }));

      setEmployeeHours(prev => ({
        ...prev,
        [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: String(finalNH) }
      }));

      setEmployeeOvertime(prev => ({
        ...prev,
        [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: finalOT }
      }));
    } else if (isZeroHoursCode(attendanceCode)) {
      setEmployeeHours(prev => ({
        ...prev,
        [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: "0" }
      }));
      setEmployeeOvertime(prev => ({
        ...prev,
        [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: "0" }
      }));
      setEmployeeNormalHours(prev => ({
        ...prev,
        [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: "0" }
      }));
    }
  };

  useEffect(() => {
    userManuallyChangedRef.current = false;
    autoSyncPerformedRef.current = false;
  }, [selectedJob]);

  useEffect(() => {
    if (autoSyncWithBilling && selectedJob && selectedJob !== '' && selectedJob !== 'no-job' && !userManuallyChangedRef.current && !autoSyncPerformedRef.current) {
      const job = jobs.find(j => j.id === parseInt(selectedJob));
      
      if (job?.nextBillingDate) {
        const nextBilling = new Date(job.nextBillingDate);
        const lastBilling = getLastBillingDate(nextBilling, job.billingCycle);
        
        if (lastBilling && nextBilling && lastBilling <= nextBilling) {
          const daysArray = getDaysBetween(lastBilling, nextBilling);
          
          if (daysArray.length > 0) {
            autoSyncPerformedRef.current = true;
            setCurrentDate(lastBilling);
            setSelectedPeriod("custom");
            setCustomDays(daysArray);
            
            setSaveMessage({
              type: "info",
              text: `📅 Auto-synced to billing period: ${lastBilling.toLocaleDateString()} - ${nextBilling.toLocaleDateString()}`
            });
            setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
          }
        }
      }
    }
  }, [selectedJob, jobs, autoSyncWithBilling]);

  useEffect(() => {
    setTablePage(1);
  }, [selectedCategory, deferredSearchQuery, selectedJob, selectedPeriod, currentDate, customDays.length, missingSourceFilter]);

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
          headers: {
            "Authorization": `Bearer ${token}`
          },
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

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
    if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
    if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const fetchEmployeesWithJobs = async (preloadedJobs = [], preloadedEmployeesResponse = null) => {
    try {
      const token = localStorage.getItem("jwtToken");
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const employeesRes = preloadedEmployeesResponse || await fetch(`${API_BASE_URL}/api/employee`, { headers });
      if (!employeesRes.ok) throw new Error(`Failed to fetch employees: ${employeesRes.status}`);
      
      let employeesData = await employeesRes.json();
      const jobsData = preloadedJobs;
      const jobMap = {};
      jobsData.forEach(job => { jobMap[job.id] = job; });
      
      const enhancedEmployees = await Promise.all(
        employeesData.map(async (employee) => {
          if (employee.job && employee.job.id && employee.job.name) return employee;
          
          if (employee.jobId && jobMap[employee.jobId]) {
            return { ...employee, job: jobMap[employee.jobId] };
          }
          
          try {
            if (employee.jobId) {
              const jobAssignmentRes = await fetch(`${API_BASE_URL}/api/employee/${employee.id}/job`, { headers });
              if (jobAssignmentRes.ok) {
                const jobData = await jobAssignmentRes.json();
                return { ...employee, job: jobData };
              }
            }
          } catch (err) {
            console.warn(`Error fetching job for employee ${employee.id}:`, err);
          }
          
          return employee;
        })
      );
      
      return enhancedEmployees;
    } catch (err) {
      console.error("Error fetching employees with jobs:", err);
      throw err;
    }
  };

  const deleteTimesheetRecords = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      
      setDeleteModal(prev => ({ ...prev, isDeleting: true }));
      setSaveMessage({ type: "info", text: "Deleting timesheet records..." });

      let url = `${API_BASE_URL}/api/timesheets/delete`;
      let method = "DELETE";
      let body = {};

      if (deleteModal.scope === "singleDay") {
        if (!deleteModal.selectedEmployeeForDay || !deleteModal.selectedDateForDay) {
          setSaveMessage({ type: "error", text: "Please select an employee and date to delete." });
          return;
        }
        
        body = {
          scope: "singleDay",
          employeeId: deleteModal.selectedEmployeeForDay,
          date: deleteModal.selectedDateForDay
        };
        
      } else if (deleteModal.scope === "selected") {
        const ids = deleteModal.employeeIds.size > 0 
          ? Array.from(deleteModal.employeeIds) 
          : Array.from(selectedEmployeeIds);
        
        if (ids.length === 0) {
          setSaveMessage({ type: "error", text: "Select at least one employee." });
          return;
        }
        
        body = {
          employeeIds: ids,
          scope: "selected"
        };
        
        if (deleteModal.date) {
          body.date = deleteModal.date;
        } else if (deleteModal.startDate && deleteModal.endDate) {
          body.startDate = deleteModal.startDate;
          body.endDate = deleteModal.endDate;
        }
        
      } else if (deleteModal.scope === "all") {
        body = {
          scope: "all"
        };
        
        if (deleteModal.date) {
          body.date = deleteModal.date;
        } else if (deleteModal.startDate && deleteModal.endDate) {
          body.startDate = deleteModal.startDate;
          body.endDate = deleteModal.endDate;
        }
        
      } else if (deleteModal.scope === "date") {
        if (!deleteModal.date) {
          setSaveMessage({ type: "error", text: "Please select a date." });
          return;
        }
        
        body = {
          scope: "date",
          date: deleteModal.date
        };
        
      } else if (deleteModal.scope === "dateRange") {
        if (!deleteModal.startDate || !deleteModal.endDate) {
          setSaveMessage({ type: "error", text: "Please select start and end dates." });
          return;
        }
        
        body = {
          scope: "dateRange",
          startDate: deleteModal.startDate,
          endDate: deleteModal.endDate
        };
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();

      setSaveMessage({
        type: "success",
        text: `Successfully deleted ${result.deletedCount || 0} timesheet records.`
      });

      if (deleteModal.scope === "singleDay") {
        const empId = deleteModal.selectedEmployeeForDay;
        const dateStr = deleteModal.selectedDateForDay;
        
        const newAttendanceData = { ...attendanceData };
        const newEmployeeHours = { ...employeeHours };
        const newEmployeeOvertime = { ...employeeOvertime };
        const newEmployeeNormalHours = { ...employeeNormalHours };
        const newMissingSourceEntries = { ...missingSourceEntries };
        
        if (newAttendanceData[empId]) delete newAttendanceData[empId][dateStr];
        if (newEmployeeHours[empId]) delete newEmployeeHours[empId][dateStr];
        if (newEmployeeOvertime[empId]) delete newEmployeeOvertime[empId][dateStr];
        if (newEmployeeNormalHours[empId]) delete newEmployeeNormalHours[empId][dateStr];
        delete newMissingSourceEntries[`${empId}_${dateStr}`];
        
        setAttendanceData(newAttendanceData);
        setEmployeeHours(newEmployeeHours);
        setEmployeeOvertime(newEmployeeOvertime);
        setEmployeeNormalHours(newEmployeeNormalHours);
        setMissingSourceEntries(newMissingSourceEntries);
        
      } else if (deleteModal.scope === "selected") {
        const idsToClear = deleteModal.employeeIds.size > 0 
          ? Array.from(deleteModal.employeeIds) 
          : Array.from(selectedEmployeeIds);
        
        const newAttendanceData = { ...attendanceData };
        const newEmployeeHours = { ...employeeHours };
        const newEmployeeOvertime = { ...employeeOvertime };
        const newEmployeeNormalHours = { ...employeeNormalHours };
        const newMissingSourceEntries = { ...missingSourceEntries };
        
        idsToClear.forEach(empId => {
          if (deleteModal.date) {
            if (newAttendanceData[empId]) delete newAttendanceData[empId][deleteModal.date];
            if (newEmployeeHours[empId]) delete newEmployeeHours[empId][deleteModal.date];
            if (newEmployeeOvertime[empId]) delete newEmployeeOvertime[empId][deleteModal.date];
            if (newEmployeeNormalHours[empId]) delete newEmployeeNormalHours[empId][deleteModal.date];
            delete newMissingSourceEntries[`${empId}_${deleteModal.date}`];
          } else if (deleteModal.startDate && deleteModal.endDate) {
            const start = new Date(deleteModal.startDate);
            const end = new Date(deleteModal.endDate);
            const cur = new Date(start);
            
            while (cur <= end) {
              const dateStr = toYMD(cur);
              if (newAttendanceData[empId]) delete newAttendanceData[empId][dateStr];
              if (newEmployeeHours[empId]) delete newEmployeeHours[empId][dateStr];
              if (newEmployeeOvertime[empId]) delete newEmployeeOvertime[empId][dateStr];
              if (newEmployeeNormalHours[empId]) delete newEmployeeNormalHours[empId][dateStr];
              delete newMissingSourceEntries[`${empId}_${dateStr}`];
              cur.setDate(cur.getDate() + 1);
            }
          } else {
            days.forEach(day => {
              const dateStr = toYMD(day);
              if (newAttendanceData[empId]) delete newAttendanceData[empId][dateStr];
              if (newEmployeeHours[empId]) delete newEmployeeHours[empId][dateStr];
              if (newEmployeeOvertime[empId]) delete newEmployeeOvertime[empId][dateStr];
              if (newEmployeeNormalHours[empId]) delete newEmployeeNormalHours[empId][dateStr];
              delete newMissingSourceEntries[`${empId}_${dateStr}`];
            });
          }
        });
        
        setAttendanceData(newAttendanceData);
        setEmployeeHours(newEmployeeHours);
        setEmployeeOvertime(newEmployeeOvertime);
        setEmployeeNormalHours(newEmployeeNormalHours);
        setMissingSourceEntries(newMissingSourceEntries);
        
      } else {
        await fetchTimesheets();
      }

      setDeleteModal({ 
        open: false, 
        scope: "selected", 
        date: "", 
        startDate: "", 
        endDate: "", 
        employeeIds: new Set(),
        selectedEmployeeForDay: null,
        selectedDateForDay: "",
        isDeleting: false 
      });

    } catch (err) {
      setSaveMessage({ type: "error", text: `Delete failed: ${err.message}` });
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    } finally {
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  const categories = useMemo(() => {
    const set = new Set();
    employees.forEach((employee) => {
      const categoryName = typeof employee?.category === 'string'
        ? employee.category
        : employee?.category?.name;
      if (categoryName) set.add(categoryName);
    });
    return Array.from(set).sort();
  }, [employees]);

  const toggleSelectEmployee = (id) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      pagedEmployees.forEach(e => next.add(e.id));
      return next;
    });
  };

  const clearAllSelection = () => setSelectedEmployeeIds(new Set());

  const selectAllFiltered = () => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      filteredEmployees.forEach(e => next.add(e.id));
      return next;
    });
  };

  const parseBulkDateTokenToYMD = (token) => {
    if (!token) return null;
    const t = String(token).trim();
    if (!t) return null;

    let m = t.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(y, mo - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) {
        return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      return null;
    }

    m = t.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2}|[0-9]{4})$/);
    if (m) {
      const mo = Number(m[1]);
      const d = Number(m[2]);
      let y = Number(m[3]);
      if (m[3].length === 2) {
        y = 2000 + y;
      }
      const dt = new Date(y, mo - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) {
        return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      return null;
    }

    return null;
  };

  const parseBulkDateList = (textValue) => {
    if (!textValue) return [];
    const tokens = String(textValue)
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const ymds = tokens
      .map(parseBulkDateTokenToYMD)
      .filter(Boolean);

    return Array.from(new Set(ymds)).sort();
  };

  const applyBulkToSelected = () => {
    const ids = Array.from(selectedEmployeeIds);
    if (ids.length === 0) {
      setSaveMessage({ type: "error", text: "Select at least one employee." });
      return;
    }

    let scopeDates = [];
    if (bulkAction.scope === "date") {
      if (!bulkAction.date) {
        setSaveMessage({ type: "error", text: "Choose a date for 'Single Date' scope." });
        return;
      }
      scopeDates = [bulkAction.date];
    } else if (bulkAction.scope === "customRange") {
      if (!bulkAction.startDate || !bulkAction.endDate) {
        setSaveMessage({ type: "error", text: "Choose start and end dates for 'Custom Date Range'." });
        return;
      }
      const start = new Date(bulkAction.startDate);
      const end = new Date(bulkAction.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (start > end) {
        setSaveMessage({ type: "error", text: "Start date cannot be after end date." });
        return;
      }
      const cur = new Date(start);
      while (cur <= end) {
        scopeDates.push(toYMD(cur));
        cur.setDate(cur.getDate() + 1);
      }
    } else if (bulkAction.scope === "selectedDates") {
      const parsed = (bulkAction.selectedDates && bulkAction.selectedDates.length > 0)
        ? bulkAction.selectedDates
        : parseBulkDateList(bulkAction.selectedDatesText);

      if (!parsed || parsed.length === 0) {
        setSaveMessage({ type: "error", text: "Enter at least one valid date, e.g. 1/1/26, 1/4/26." });
        return;
      }

      scopeDates = [...parsed];
    } else {
      scopeDates = days.map(d => toYMD(d));
    }

    const code = (bulkAction.attendanceCode || "").toUpperCase();
    const baseTotal = parseFloat(bulkAction.totalHours || "0") || 0;
    const baseOT = parseFloat(bulkAction.overtimeHours || "0") || 0;
    const conditional = bulkAction.conditionalLogic || {
      enabled: false,
      conditionType: "nhEquals",
      conditionValue: "8",
      thenAction: "setOvertime",
      thenValue: "4"
    };

    const prevAtt = attendanceData;
    const prevHours = employeeHours;
    const prevOT = employeeOvertime;
    const nextAtt = { ...prevAtt };
    const nextHours = { ...prevHours };
    const nextOT = { ...prevOT };
    const prevNH = employeeNormalHours || {};
    const nextNH = { ...prevNH };

    const shouldApplyConditionalLocal = (empId, dateStr) => {
      if (!conditional.enabled) return true;
      
      const hasExistingData = prevAtt?.[empId]?.[dateStr] && prevAtt[empId][dateStr] !== "";
      const currentStatus = (prevAtt?.[empId]?.[dateStr] || "").toUpperCase();
      const total = parseFloat(prevHours?.[empId]?.[dateStr] || 0);
      const ot = parseFloat(prevOT?.[empId]?.[dateStr] || 0);
      const currentNH = Math.max(total - ot, 0);
      const conditionValueRaw = String(conditional.conditionValue ?? "").trim();
      
      const conditionTypesThatRequireExistingData = ["nhEquals", "statusEquals", "both"];
      
      if (conditionTypesThatRequireExistingData.includes(conditional.conditionType)) {
        if (!hasExistingData) return false;
      }
      
      let nhTarget = null;
      let statusTarget = null;
      
      const maybeNum = parseFloat(conditionValueRaw);
      if (!isNaN(maybeNum)) {
        nhTarget = maybeNum;
      }
      
      if (conditional.conditionType === "statusEquals" || 
          (conditional.conditionType === "both" && isNaN(Number(conditionValueRaw)))) {
        statusTarget = conditionValueRaw.toUpperCase();
      }
      
      if (conditional.conditionType === "nhEquals") {
        return currentNH === nhTarget;
      }
      
      if (conditional.conditionType === "statusEquals") {
        return currentStatus === statusTarget;
      }
      
      if (conditional.conditionType === "both") {
        const nhMatches = (nhTarget !== null) ? (currentNH === nhTarget) : true;
        const statusMatches = (statusTarget !== null) ? (currentStatus === statusTarget) : true;
        return nhMatches && statusMatches;
      }
      
      return hasExistingData;
    };

    const applyHoursWithConditional = (empId, dateStr) => {
      const thenVal = parseFloat(conditional.thenValue || "0") || 0;
      const prevTotal = parseFloat(prevHours?.[empId]?.[dateStr] || 0);
      const prevOtVal = parseFloat(prevOT?.[empId]?.[dateStr] || 0);
      const prevNhVal = Math.max(prevTotal - prevOtVal, 0);
      const hasExistingData = prevAtt?.[empId]?.[dateStr] && prevAtt[empId][dateStr] !== "";

      if (!hasExistingData) {
          nextNH[empId][dateStr] = String(Math.max(baseTotal - baseOT, 0));
          nextOT[empId][dateStr] = String(baseOT);
          nextHours[empId][dateStr] = String(baseTotal);
          return;
      }

      if (conditional.thenAction === "setOvertime") {
          const currentNH = parseFloat(nextNH[empId]?.[dateStr] ?? prevNhVal);
          nextOT[empId][dateStr] = String(thenVal);
          nextHours[empId][dateStr] = String(currentNH + thenVal);
          nextNH[empId][dateStr] = String(currentNH);
          return;
      }

      if (conditional.thenAction === "setHours") {
          const currentOT = parseFloat(nextOT[empId]?.[dateStr] ?? prevOtVal);
          nextNH[empId][dateStr] = String(thenVal);
          nextOT[empId][dateStr] = String(currentOT);
          nextHours[empId][dateStr] = String(thenVal + currentOT);
          return;
      }

      if (conditional.thenAction === "setBoth") {
          nextNH[empId][dateStr] = String(thenVal);
          nextOT[empId][dateStr] = String(thenVal);
          nextHours[empId][dateStr] = String(thenVal + thenVal);
          return;
      }

      nextNH[empId][dateStr] = String(Math.max(baseTotal - baseOT, 0));
      nextOT[empId][dateStr] = String(baseOT);
      nextHours[empId][dateStr] = String(baseTotal);
    };

    ids.forEach(empId => {
      nextAtt[empId] = { ...(nextAtt[empId] || {}) };
      nextHours[empId] = { ...(nextHours[empId] || {}) };
      nextOT[empId] = { ...(nextOT[empId] || {}) };
      nextNH[empId] = { ...(nextNH[empId] || {}) };

      scopeDates.forEach(dateStr => {
        const ok = shouldApplyConditionalLocal(empId, dateStr);
        if (!ok) return;

        if (bulkAction.onlyUpdateExistingP && String(code).toUpperCase() === "P") {
          const existing = String(attendanceData?.[empId]?.[dateStr] || "").toUpperCase();
          if (existing && existing !== "P") return;
        }

        nextAtt[empId][dateStr] = code;

        if (!conditional.enabled) {
          nextHours[empId][dateStr] = String(baseTotal);
          nextOT[empId][dateStr] = String(baseOT);
          nextNH[empId][dateStr] = String(Math.max(baseTotal - baseOT, 0));
        } else {
          applyHoursWithConditional(empId, dateStr);
        }
      });
    });

    setAttendanceData(nextAtt);
    setEmployeeHours(nextHours);
    setEmployeeOvertime(nextOT);
    setEmployeeNormalHours(nextNH);

    setSaveMessage({
      type: "success",
      text: `Applied to ${ids.length} employees for ${scopeDates.length} date(s).`
    });
  };

  const saveSelectedAttendance = async () => {
    try {
        const token = localStorage.getItem("jwtToken");
        const ids = Array.from(selectedEmployeeIds);
        if (ids.length === 0) {
            setSaveMessage({ type: "error", text: "Select at least one employee to save." });
            return;
        }

        const selectedEmployees = filteredEmployees.filter(e => ids.includes(e.id));
        const scopeDays = selectedPeriod === "custom" ? customDays : getDaysArray();

        const timesheetData = [];
        let hasData = false;

        selectedEmployees.forEach(employee => {
            scopeDays.forEach(day => {
                const dateStr = toYMD(day);
                const attendanceStatus = attendanceData[employee.id]?.[dateStr];

                if (attendanceStatus && attendanceStatus !== "") {
                    hasData = true;

                    const key = `${employee.id}_${dateStr}`;
                    const sourceMissing = missingSourceEntries[key]?.flagged || false;

                    if (isPresentCode(attendanceStatus)) {
                        const totalHours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
                        const nh = parseFloat(employeeNormalHours?.[employee.id]?.[dateStr] || 0);
                        const ot = parseFloat(employeeOvertime?.[employee.id]?.[dateStr] || 0);
                        const earnings = calculateEarnings(employee, day, nh, ot);
                        
                        const employeeJob = employees.find(e => e.id === employee.id)?.job;
                        const jobId = employeeJob?.id;

                        timesheetData.push({
                            employeeId: employee.id,
                            date: dateStr,
                            regularHours: nh,
                            overtimeHours: ot,
                            breakHours: 0,
                            totalHours: totalHours,
                            earnings: earnings.totalPay,
                            attendanceCode: attendanceStatus,
                            sourceDocumentMissing: sourceMissing,
                            sourceDocumentMissingReason: sourceMissing ? (missingSourceEntries[key]?.reason || null) : null,
                            sourceDocumentMissingFlaggedBy: sourceMissing ? (missingSourceEntries[key]?.flaggedBy || null) : null,
                            jobId: jobId
                        });
                    } else {
                        timesheetData.push({
                            employeeId: employee.id,
                            date: dateStr,
                            regularHours: 0,
                            overtimeHours: 0,
                            breakHours: 0,
                            totalHours: 0,
                            earnings: 0,
                            attendanceCode: attendanceStatus,
                            sourceDocumentMissing: sourceMissing,
                            sourceDocumentMissingReason: sourceMissing ? (missingSourceEntries[key]?.reason || null) : null,
                            sourceDocumentMissingFlaggedBy: sourceMissing ? (missingSourceEntries[key]?.flaggedBy || null) : null,
                            jobId: jobId
                        });
                    }
                }
            });
        });

        if (!hasData) {
            setSaveMessage({ type: "error", text: "No data to save for selected employees." });
            return;
        }

        setIsGenerating(true);
        setSaveMessage({ type: "info", text: "Saving selected employees..." });

        const response = await fetch(`${API_BASE_URL}/api/timesheets/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                timesheets: timesheetData,
                saveMode: "override"
            })
        });

        if (!response.ok) throw new Error(await response.text());
        const result = await response.json();

        setSaveMessage({
            type: "success",
            text: `Saved selected employees. Created: ${result.createdCount}, Updated: ${result.updatedCount}, Skipped: ${result.skippedCount}`
        });

        await fetchTimesheets();
    } catch (err) {
        console.error("Save error - Full details:", err);
        setSaveMessage({ type: "error", text: `Save failed: ${err.message}` });
    } finally {
        setIsGenerating(false);
        setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  // Convert the lightweight backend projection into the object shape already
  // used throughout this component. This lets the matrix, editing, exports,
  // source-document flags and bulk actions continue to work unchanged.
  const normalizeTimesheetDTO = (row, employeesList = employees) => {
    if (!row) return null;

    const employeeFromList = employeesList.find(
      (employee) => String(employee.id) === String(row.employeeId)
    );

    const employee = employeeFromList || {
      id: row.employeeId,
      employeeId: row.employeeNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      categoryId: row.categoryId,
      category: row.categoryName || '',
      job: row.jobId
        ? { id: row.jobId, name: row.jobName }
        : null
    };

    // Preserve job/category information from the DTO when the employee endpoint
    // does not include the same relationship shape.
    const normalizedEmployee = {
      ...employee,
      id: row.employeeId ?? employee.id,
      employeeId: row.employeeNumber ?? employee.employeeId,
      firstName: row.firstName ?? employee.firstName,
      lastName: row.lastName ?? employee.lastName,
      categoryId: row.categoryId ?? employee.categoryId ?? employee.category?.id,
      category:
        row.categoryName ??
        (typeof employee.category === 'string'
          ? employee.category
          : employee.category?.name) ??
        '',
      job: row.jobId
        ? { id: row.jobId, name: row.jobName }
        : employee.job || null
    };

    return {
      id: row.id,
      date: row.date,
      attendanceCode: row.attendanceCode,
      regularHours: Number(row.regularHours ?? 0),
      overtimeHours: Number(row.overtimeHours ?? 0),
      breakHours: Number(row.breakHours ?? 0),
      totalHours: Number(
        row.totalHours ??
          (Number(row.regularHours ?? 0) + Number(row.overtimeHours ?? 0))
      ),
      earnings: Number(row.earnings ?? 0),
      status: row.status,
      notes: row.notes,
      sourceDocumentMissing: Boolean(row.sourceDocumentMissing),
      sourceDocumentMissingReason: row.sourceDocumentMissingReason,
      sourceDocumentMissingFlaggedAt: row.sourceDocumentMissingFlaggedAt,
      sourceDocumentMissingFlaggedBy: row.sourceDocumentMissingFlaggedBy,
      sourceDocumentType: row.sourceDocumentType,
      sourceDocumentReference: row.sourceDocumentReference,
      verifiedAt: row.verifiedAt,
      verifiedBy: row.verifiedBy,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber,
      employee: normalizedEmployee,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      jobId: row.jobId,
      job: row.jobId ? { id: row.jobId, name: row.jobName } : null,
      overviewId: row.overviewId
    };
  };

  const fetchTimesheets = async (employeesList = employees) => {
    setLoading(true);

    const att = {};
    const hrs = {};
    const ot = {};
    const nhMap = {};
    const missingMap = {};

    try {
      const token = localStorage.getItem('jwtToken');
      const { start, end } = getDateRange();
      const startDate = toYMD(start);
      const endDate = toYMD(end);

      if (!startDate || !endDate) {
        throw new Error('A valid timesheet date range is required');
      }

      const params = new URLSearchParams({
        startDate,
        endDate
      });

      // Keep the complete employee/date matrix intact while allowing the
      // backend to narrow large datasets when these filters are active.
      if (selectedJob && selectedJob !== 'no-job') {
        params.set('jobId', String(selectedJob));
      } else if (selectedJob === 'no-job') {
        params.set('withoutJob', 'true');
      }

      if (filters.status) {
        params.set('status', String(filters.status).toUpperCase());
      }

      if (missingSourceFilter === 'unverified') {
        params.set('sourceMissing', 'true');
      } else if (missingSourceFilter === 'verified') {
        params.set('sourceMissing', 'false');
      }

      // selectedCategory is currently stored as a category name. Resolve its
      // database ID from the already-loaded employee records when possible.
      if (selectedCategory) {
        const categoryEmployee = employeesList.find((employee) => {
          const categoryName =
            typeof employee.category === 'string'
              ? employee.category
              : employee.category?.name;
          return categoryName === selectedCategory;
        });

        const categoryId =
          categoryEmployee?.categoryId ?? categoryEmployee?.category?.id;

        if (categoryId) {
          params.set('categoryId', String(categoryId));
        }
      }

      const response = await fetch(
        `${API_BASE_URL}/api/timesheets/rows?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          responseText || `Failed to fetch timesheets: ${response.status}`
        );
      }

      const raw = await response.json();
      const fixed = (Array.isArray(raw) ? raw : [])
        .map((row) => normalizeTimesheetDTO(row, employeesList))
        .filter(Boolean)
        .map((timesheet) => {
          const status = String(timesheet.status || '').toUpperCase();
          const attendanceCode =
            String(timesheet.attendanceCode || '').toUpperCase() ||
            (status === 'WEEKEND'
              ? 'WP'
              : status === 'HOLIDAY'
                ? 'HP'
                : status === 'ABSENT'
                  ? 'A'
                  : status === 'LEAVE'
                    ? 'L'
                    : status === 'SICK'
                      ? 'S'
                      : status === 'PENDING' ||
                          status === 'APPROVED' ||
                          status === 'PAID'
                        ? 'P'
                        : '');

          return {
            ...timesheet,
            attendanceCode
          };
        });

      fixed.forEach((timesheet) => {
        const employeeId = timesheet.employeeId ?? timesheet.employee?.id;
        const dateStr = String(timesheet.date || '').slice(0, 10);

        if (!employeeId || !dateStr) return;

        if (!att[employeeId]) att[employeeId] = {};
        if (!hrs[employeeId]) hrs[employeeId] = {};
        if (!ot[employeeId]) ot[employeeId] = {};
        if (!nhMap[employeeId]) nhMap[employeeId] = {};

        const regularHours = Number(timesheet.regularHours ?? 0);
        const overtimeHours = Number(timesheet.overtimeHours ?? 0);
        const totalHours = Number(
          timesheet.totalHours ?? regularHours + overtimeHours
        );

        att[employeeId][dateStr] = timesheet.attendanceCode || '';
        nhMap[employeeId][dateStr] = String(regularHours);
        ot[employeeId][dateStr] = String(overtimeHours);
        hrs[employeeId][dateStr] = String(totalHours);

        if (timesheet.sourceDocumentMissing) {
          missingMap[`${employeeId}_${dateStr}`] = {
            flagged: true,
            reason:
              timesheet.sourceDocumentMissingReason || 'No source document',
            flaggedAt: timesheet.sourceDocumentMissingFlaggedAt,
            flaggedBy: timesheet.sourceDocumentMissingFlaggedBy
          };
        }
      });

      setTimesheets(fixed);
      setAttendanceData((previous) => ({ ...previous, ...att }));
      setEmployeeHours((previous) => ({ ...previous, ...hrs }));
      setEmployeeOvertime((previous) => ({ ...previous, ...ot }));
      setEmployeeNormalHours((previous) => ({ ...previous, ...nhMap }));
      setMissingSourceEntries((previous) => ({ ...previous, ...missingMap }));

      return fixed;
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      setSaveMessage({
        type: 'error',
        text: `Failed to fetch timesheets: ${error.message}`
      });
      setTimesheets([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const applyImportPreviewToState = () => {
    const newAttendanceData = { ...attendanceData };
    const newEmployeeHours = { ...employeeHours };
    const newEmployeeOvertime = { ...employeeOvertime };
    const newEmployeeNormalHours = { ...employeeNormalHours };

    importPreview.forEach((item) => {
      const employeeId = item.employee.id;

      Object.entries(item.attendance).forEach(([dateStr, info]) => {
        const code = String(info.code || "").toUpperCase();

        newAttendanceData[employeeId] = newAttendanceData[employeeId] || {};
        newAttendanceData[employeeId][dateStr] = code;

        const stdHours = getEmployeeStandardHours(item.employee);
        const settings = attendanceCodeSettings[code] || attendanceCodeSettings.P;
        const defaultNH = stdHours;
        const nh = settings.capNH ? Math.min(defaultNH, stdHours) : defaultNH;
        const finalNH = code === 'OFF' ? 0 : nh;
        const finalOT = settings.allowOT ? "0" : "0";

        newEmployeeNormalHours[employeeId] = newEmployeeNormalHours[employeeId] || {};
        newEmployeeNormalHours[employeeId][dateStr] = String(finalNH);

        newEmployeeHours[employeeId] = newEmployeeHours[employeeId] || {};
        newEmployeeHours[employeeId][dateStr] = String(finalNH);

        newEmployeeOvertime[employeeId] = newEmployeeOvertime[employeeId] || {};
        newEmployeeOvertime[employeeId][dateStr] = finalOT;
      });
    });

    setAttendanceData(newAttendanceData);
    setEmployeeHours(newEmployeeHours);
    setEmployeeOvertime(newEmployeeOvertime);
    setEmployeeNormalHours(newEmployeeNormalHours);
  };

  const saveImportedDataToDatabase = async () => {
    setIsSavingImport(true);
    try {
      const token = localStorage.getItem("jwtToken");
      const timesheetData = [];
      
      importPreview.forEach(item => {
        Object.entries(item.attendance).forEach(([dateStr, attendanceInfo]) => {
          const date = new Date(dateStr);
          const employee = item.employee;
          const attendanceCode = attendanceInfo.code;
          const workedCodes = new Set(["P","WP","HP","H","L","S","ML","PL"]);
          const isWorked = workedCodes.has(String(attendanceCode || "").toUpperCase());

          if (isWorked) {
            const stdHours = getEmployeeStandardHours(employee);
            const totalHours = stdHours;
            const overtimeHours = 0;
            const earnings = calculateEarnings(employee, date, stdHours, overtimeHours);

            timesheetData.push({
              employeeId: employee.id,
              date: dateStr,
              regularHours: stdHours,
              overtimeHours: overtimeHours,
              breakHours: 0,
              totalHours: totalHours,
              earnings: earnings.totalPay,
              status: attendanceCode === 'P' ? 'PENDING' :
                      attendanceCode === 'WP' ? 'WEEKEND' :
                      attendanceCode === 'HP' ? 'HOLIDAY' :
                      attendanceCode === 'H' ? 'HOLIDAY' :
                      attendanceCode === 'L' ? 'LEAVE' :
                      attendanceCode === 'S' ? 'SICK' :
                      attendanceCode === 'ML' ? 'LEAVE' :
                      attendanceCode === 'PL' ? 'LEAVE' :
                      attendanceCode === 'A' ? 'ABSENT' : 'PENDING',
              attendanceCode
            });
          } else {
            timesheetData.push({
              employeeId: employee.id,
              date: dateStr,
              regularHours: 0,
              overtimeHours: 0,
              breakHours: 0,
              totalHours: 0,
              earnings: 0,
              status: attendanceCode === "WP" ? "WEEKEND" :
                      attendanceCode === "HP" ? "HOLIDAY" :
                      attendanceCode === "H" ? "HOLIDAY" :
                      attendanceCode === "A" ? "ABSENT" : "PENDING",
              attendanceCode: attendanceCode
            });
          }
        });
      });

      const response = await fetch(`${API_BASE_URL}/api/timesheets/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timesheets: timesheetData,
          importSource: 'excel',
          importDate: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        const newAttendanceData = { ...attendanceData };
        const newEmployeeHours = { ...employeeHours };
        const newEmployeeOvertime = { ...employeeOvertime };
        
        importPreview.forEach(item => {
          const employeeId = item.employee.id;
          const employee = item.employee;
          const stdHours = getEmployeeStandardHours(employee);
          
          if (!newAttendanceData[employeeId]) newAttendanceData[employeeId] = {};
          if (!newEmployeeHours[employeeId]) newEmployeeHours[employeeId] = {};
          if (!newEmployeeOvertime[employeeId]) newEmployeeOvertime[employeeId] = {};
          
          Object.entries(item.attendance).forEach(([dateStr, attendanceInfo]) => {
            newAttendanceData[employeeId][dateStr] = attendanceInfo.code;
            
            if (isPresentCode(attendanceInfo.code)) {
              newEmployeeHours[employeeId][dateStr] = stdHours.toString();
              newEmployeeOvertime[employeeId][dateStr] = "0";
            } else {
              newEmployeeHours[employeeId][dateStr] = "0";
              newEmployeeOvertime[employeeId][dateStr] = "0";
            }
          });
        });
        
        setAttendanceData(newAttendanceData);
        setEmployeeHours(newEmployeeHours);
        setEmployeeOvertime(newEmployeeOvertime);
        
        const importedDates = importPreview.flatMap(item => Object.keys(item.attendance));
        if (importedDates.length > 0) {
          const uniqueDates = [...new Set(importedDates)].sort();
          const startDate = new Date(uniqueDates[0]);
          const endDate = new Date(uniqueDates[uniqueDates.length - 1]);
          const customDaysArray = [];
          const current = new Date(startDate);
          while (current <= endDate) {
            customDaysArray.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
          
          setCustomDays(customDaysArray);
          setSelectedPeriod("custom");
          setCurrentDate(startDate);
          
          setDurationFilter({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            customRange: true
          });
        }
        
        const updatedTimesheets = await fetchTimesheets();
        if (updatedTimesheets.length > 0) setTimesheets(updatedTimesheets);
        
        alert(`Successfully imported and saved data for ${importPreview.length} employees`);
        setShowImportModal(false);
        setImportPreview([]);
        setImportErrors([]);
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (err) {
      console.error("Error saving imported data:", err);
      alert('Error saving imported data: ' + err.message);
    } finally {
      setIsSavingImport(false);
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (selectedPeriod === "week") {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 6);
    } else if (selectedPeriod === "month") {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
    } else if (selectedPeriod === "custom" && customDays.length > 0) {
      const s = new Date(customDays[0]);
      const e = new Date(customDays[customDays.length - 1]);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      start.setTime(s.getTime());
      end.setTime(e.getTime());
    }

    return { start, end };
  };

  const getDaysArray = () => {
    if (selectedPeriod === "custom" && customDays.length > 0) {
      return customDays.map(d => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      });
    }

    const { start, end } = getDateRange();
    const days = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);

    while (cur <= end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  const days = getDaysArray();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("jwtToken");
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        
        const jobIdFromUrl = searchParams.get('jobId');
        if (jobIdFromUrl) setSelectedJob(jobIdFromUrl);
        
        const { start, end } = getDateRange();
        const startDate = toYMD(start);
        const endDate = toYMD(end);

        const jobsPromise = fetch(`${API_BASE_URL}/api/jobs`, { headers });
        const employeesResponsePromise = fetch(`${API_BASE_URL}/api/employee`, { headers });
        const [
          jobsRes,
          attendancesRes,
          overviewsRes,
          settingsRes,
          holidaysRes,
          specialWeekendsRes
        ] = await Promise.all([
          jobsPromise,
          fetch(`${API_BASE_URL}/api/attendance?startDate=${startDate}&endDate=${endDate}`, { headers }),
          fetch(`${API_BASE_URL}/api/overview?startDate=${startDate}&endDate=${endDate}`, { headers }),
          fetch(`${API_BASE_URL}/api/settings/system`, { headers }),
          fetch(`${API_BASE_URL}/api/settings/holidays`, { headers }),
          fetch(`${API_BASE_URL}/api/settings/special-weekends`, { headers })
        ]);

        const jobsData = jobsRes.ok ? await jobsRes.json() : [];
        const employeesPromise = employeesResponsePromise.then((employeesResponse) =>
          fetchEmployeesWithJobs(jobsData, employeesResponse)
        );
        const attendancesData = attendancesRes.ok ? await attendancesRes.json() : [];
        const overviewsData = overviewsRes.ok ? await overviewsRes.json() : [];
        const holidaysData = holidaysRes.ok ? await holidaysRes.json() : [];
        const specialWeekendsData = specialWeekendsRes.ok ? await specialWeekendsRes.json() : [];
        
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
        
        const employeesData = await employeesPromise;
        
        setEmployees(employeesData);
        setJobs(jobsData);
        setAttendances(attendancesData);
        setOverviews(overviewsData);
        setHolidays(holidaysData);
        setSpecialWeekends(specialWeekendsData);
        
        initializeAttendanceData(employeesData);
        initializeHoursData(employeesData);

        await fetchTimesheets(employeesData);
        
        if (jobIdFromUrl) {
          const jobExists = jobsData.some(job => job.id === parseInt(jobIdFromUrl));
          if (jobExists) setSelectedJob(jobIdFromUrl);
        }
        
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
      } catch (err) {
        console.error("Error fetching data:", err);
        alert('Error loading timesheet data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams, selectedPeriod, currentDate, customDays]);

  const initializeAttendanceData = (employeesData) => {
    const daysArray = getDaysArray().map(d => toYMD(d));
    setAttendanceData(prev => {
      const next = { ...prev };
      employeesData.forEach(emp => {
        if (!next[emp.id]) next[emp.id] = {};
        daysArray.forEach(dateStr => {
          if (next[emp.id][dateStr] === undefined) next[emp.id][dateStr] = "";
        });
      });
      return next;
    });
  };

  const initializeHoursData = (employeesData) => {
    const initialNH = {};
    const initialOH = {};
    employeesData.forEach(employee => {
      initialNH[employee.id] = {};
      initialOH[employee.id] = {};
      const daysArray = getDaysArray();
      daysArray.forEach(day => {
        const dateStr = toYMD(day);
        initialNH[employee.id][dateStr] = '';
        initialOH[employee.id][dateStr] = '';
      });
    });
    setEmployeeNormalHours(initialNH);
    setEmployeeOvertime(initialOH);
  };

  const filteredEmployeesBase = useMemo(() => {
    let filtered = employees;

    if (selectedCategory) {
      filtered = filtered.filter((employee) => {
        const categoryName = typeof employee.category === 'string'
          ? employee.category
          : employee.category?.name;
        return categoryName === selectedCategory;
      });
    }

    if (selectedJob && selectedJob !== 'no-job') {
      const jobId = Number(selectedJob);
      filtered = filtered.filter((employee) => Number(employee.job?.id) === jobId);
    } else if (selectedJob === 'no-job') {
      filtered = filtered.filter((employee) => !employee.job?.id);
    }

    const searchTerm = deferredSearchQuery.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter((employee) => [
        employee.firstName,
        employee.lastName,
        employee.employeeId,
        employee.position,
        employee.department,
        employee.job?.name
      ].some((value) => String(value || '').toLowerCase().includes(searchTerm)));
    }

    return filtered;
  }, [employees, selectedCategory, selectedJob, deferredSearchQuery]);

  const getFilteredEmployees = () => filteredEmployeesBase;

  const filteredEmployees = getFilteredEmployeesWithSourceFilter();
  const totalRows = filteredEmployees.length;
  const effectivePageSize = useMemo(() => {
    if (tablePageSize === 0) return totalRows || 1;
    return tablePageSize;
  }, [tablePageSize, totalRows]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalRows / effectivePageSize));
  }, [totalRows, effectivePageSize]);

  const pagedEmployees = useMemo(() => {
    const startIdx = (tablePage - 1) * effectivePageSize;
    const endIdx = startIdx + effectivePageSize;
    return filteredEmployees.slice(startIdx, endIdx);
  }, [filteredEmployees, tablePage, effectivePageSize]);

  const startRow = totalRows === 0 ? 0 : (tablePage - 1) * effectivePageSize + 1;
  const endRow = Math.min(totalRows, tablePage * effectivePageSize);

  const isWeekend = (date) => {
    const dayOfWeek = date.getDay();
    return systemSettings.weekendDays.includes(dayOfWeek);
  };

  const isHoliday = (date) => {
    const dateStr = toYMD(date);
    return holidays.some(holiday => holiday.date === dateStr);
  };

  const isSpecialWeekend = (date) => {
    const dateStr = toYMD(date);
    return specialWeekends.some(special => special.date === dateStr);
  };

  const getDateRateMultiplier = (date) => {
    if (isHoliday(date)) return systemSettings.holidayRate;
    if (isSpecialWeekend(date)) {
      const specialWeekend = specialWeekends.find(special => special.date === date.toISOString().split('T')[0]);
      return specialWeekend?.rateMultiplier || systemSettings.weekendRate;
    }
    if (isWeekend(date)) {
      if (systemSettings.doubleTimeOnSunday && date.getDay() === 0) return 2.0;
      return systemSettings.weekendRate;
    }
    return 1.0;
  };

  const calculateEarnings = (employee, date, nh, ot) => {
    const employeeRate = employee.minimumRate || employee.hourlyRate || defaultRates.hourlyRate;
    const dateMultiplier = getDateRateMultiplier(date);
    const regularHours = Number(nh) || 0;
    const overtimeHours = Number(ot) || 0;
    const regularPay = regularHours * employeeRate * dateMultiplier;
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
      overtimeRate,
      multiplier: dateMultiplier,
      overtimeMultiplier
    };
  };

  const handleHoursChange = (employeeId, date, value) => {
    userManuallyChangedRef.current = true;
    autoSyncPerformedRef.current = true;
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

  const handleOvertimeChange = (employeeId, date, value) => {
    userManuallyChangedRef.current = true;
    autoSyncPerformedRef.current = true;
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

  const handleAttendanceStatusChange = (employeeId, dateStr, newStatus) => {
    userManuallyChangedRef.current = true;
    autoSyncPerformedRef.current = true;
    const employee = employees.find(e => e.id === employeeId);
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: newStatus }
    }));
    applyAttendanceDefaults(employeeId, dateStr, employee, newStatus);
  };

  const saveAttendance = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const timesheetData = [];
      const daysArray = selectedPeriod === "custom" ? customDays : getDaysArray();
      let hasData = false;
      
      filteredEmployees.forEach(employee => {
        daysArray.forEach(day => {
          const dateStr = toYMD(day);
          const attendanceStatus = attendanceData[employee.id]?.[dateStr];

          const employeeJob = employees.find(e => e.id === employee.id)?.job;
          const jobId = employeeJob?.id;
          
          if (attendanceStatus && attendanceStatus !== '') {
            hasData = true;
            
            const key = `${employee.id}_${dateStr}`;
            const sourceMissing = missingSourceEntries[key]?.flagged || false;
            
            if (isPresentCode(attendanceStatus)) {
              const totalHours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
              const nh = parseFloat(employeeNormalHours?.[employee.id]?.[dateStr] || 0);
              const ot = parseFloat(employeeOvertime?.[employee.id]?.[dateStr] || 0);
              const earnings = calculateEarnings(employee, day, nh, ot);
              
              timesheetData.push({
                employeeId: employee.id,
                date: dateStr,
                regularHours: nh,
                overtimeHours: ot,
                breakHours: 0,
                totalHours: totalHours,
                earnings: earnings.totalPay,
                attendanceCode: attendanceStatus,
                sourceDocumentMissing: sourceMissing,
                sourceDocumentMissingReason: sourceMissing ? (missingSourceEntries[key]?.reason || null) : null,
                sourceDocumentMissingFlaggedBy: sourceMissing ? (missingSourceEntries[key]?.flaggedBy || null) : null,
                jobId: jobId
              });
            } else {
              timesheetData.push({
                employeeId: employee.id,
                date: dateStr,
                regularHours: 0,
                overtimeHours: 0,
                breakHours: 0,
                totalHours: 0,
                earnings: 0,
                attendanceCode: attendanceStatus,
                sourceDocumentMissing: sourceMissing,
                sourceDocumentMissingReason: sourceMissing ? (missingSourceEntries[key]?.reason || null) : null,
                sourceDocumentMissingFlaggedBy: sourceMissing ? (missingSourceEntries[key]?.flaggedBy || null) : null,
                jobId: jobId
              });
            }
          }
        });
      });

      if (!hasData) {
        setSaveMessage({ type: 'error', text: 'No attendance data to save.' });
        return;
      }

      setIsGenerating(true);
      setSaveMessage({ type: 'info', text: 'Saving timesheet data...' });

      const response = await fetch(`${API_BASE_URL}/api/timesheets/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timesheets: timesheetData,
          saveMode: 'override'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      
      setSaveMessage({ 
        type: 'success', 
        text: `Successfully saved ${result.savedCount || timesheetData.length} timesheets!` 
      });

      await fetchTimesheets();
      
      if (result.savedTimesheets) {
        const newAttendanceData = { ...attendanceData };
        const newEmployeeHours = { ...employeeHours };
        const newEmployeeOvertime = { ...employeeOvertime };
        
        result.savedTimesheets.forEach(ts => {
          const empId = ts.employeeId || ts.employee?.id;
          const dateStr = ts.date;
          
          if (empId && dateStr) {
            if (!newAttendanceData[empId]) newAttendanceData[empId] = {};
            newAttendanceData[empId][dateStr] = ts.attendanceCode || '';
            
            if (!newEmployeeHours[empId]) newEmployeeHours[empId] = {};
            if (!newEmployeeOvertime[empId]) newEmployeeOvertime[empId] = {};
            
            newEmployeeHours[empId][dateStr] = ts.totalHours?.toString() || 
                                              (ts.regularHours + ts.overtimeHours)?.toString() || 
                                              '0';
            newEmployeeOvertime[empId][dateStr] = ts.overtimeHours?.toString() || '0';
          }
        });
        
        setAttendanceData(newAttendanceData);
        setEmployeeHours(newEmployeeHours);
        setEmployeeOvertime(newEmployeeOvertime);
      }

    } catch (err) {
      console.error("Error saving data:", err);
      setSaveMessage({ 
        type: 'error', 
        text: 'Error saving data: ' + (err.message || 'Unknown error') 
      });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    }
  };

  const formatCurrency = (amount) => amount ? `₵${parseFloat(amount).toFixed(2)}` : "₵0.00";

  const getEmployeeTotalEarnings = (employee) => {
    let totalEarnings = 0;
    days.forEach((day) => {
      const dateStr = toYMD(day);
      const status = attendanceData[employee.id]?.[dateStr];
      const isPresent = isPresentCode(status);
      if (!isPresent) return;
      const nh = parseFloat(employeeNormalHours?.[employee.id]?.[dateStr] || 0);
      const ot = parseFloat(employeeOvertime?.[employee.id]?.[dateStr] || 0);
      const earnings = calculateEarnings(employee, day, nh, ot);
      totalEarnings += (earnings?.totalPay || 0);
    });
    return totalEarnings;
  };

  const getDateTypeBadge = (date) => {
    if (isHoliday(date)) return { text: 'Holiday', class: 'bg-red-100 text-red-800' };
    if (isSpecialWeekend(date)) return { text: 'Special', class: 'bg-purple-100 text-purple-800' };
    if (isWeekend(date)) return { text: 'Weekend', class: 'bg-orange-100 text-orange-800' };
    return { text: 'Regular', class: 'bg-green-100 text-green-800' };
  };

  const exportToColoredExcel = async () => {
    setExportLoading(true);
    try {
      const exportData = [];
      const headers = ['Employee ID', 'Name', 'Position', 'Staff ID'];
      days.forEach(day => headers.push(`${day.getDate()}/${day.getMonth() + 1}`));
      headers.push('Total Hours', 'Total Earnings', 'Source Verified');
      exportData.push(headers);
      
      pagedEmployees.forEach((employee) => {
        const row = [
          employee.id,
          `${employee.firstName} ${employee.lastName}`,
          employee.position || 'N/A',
          employee.employeeId || 'N/A'
        ];
        
        let totalHours = 0;
        let totalEarnings = 0;
        let hasUnverified = false;
        
        days.forEach(day => {
          const dateStr = toYMD(day);
          const status = attendanceData[employee.id]?.[dateStr] || '';
          const hours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
          row.push(status);
          totalHours += hours;
          
          if (status === 'P' || status === 'WP' || status === 'HP') {
            const earnings = calculateEarnings(employee, day, hours, 0);
            totalEarnings += earnings.totalPay;
          }
          
          if (isMissingSource(employee.id, dateStr)) hasUnverified = true;
        });
        
        row.push(totalHours.toFixed(1), formatCurrency(totalEarnings), hasUnverified ? 'NO' : 'YES');
        exportData.push(row);
      });
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
      XLSX.writeFile(wb, `Timesheet_${new Date().toISOString().split('T')[0]}.xlsx`);
      
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
      const exportData = [];
      const headers = ['ID', 'Employee Name', 'Employee ID', 'Position', 'Job', 'Rate/Hour'];
      days.forEach(day => {
        headers.push(
          `${day.toLocaleDateString('en-US', { weekday: 'short' })} ${day.getDate()}`,
          'Hours',
          'Overtime',
          'Earnings',
          'Verified'
        );
      });
      headers.push('Total Hours', 'Total Overtime', 'Total Earnings', 'Has Unverified');
      exportData.push(headers);
      
      pagedEmployees.forEach((employee, index) => {
        const row = [
          index + 1,
          `${employee.firstName} ${employee.lastName}`,
          employee.employeeId || 'N/A',
          employee.position || 'N/A',
          employee.job?.name || 'N/A',
          employee.minimumRate || employee.hourlyRate || defaultRates.hourlyRate
        ];
        
        let totalHours = 0;
        let totalOvertime = 0;
        let totalEarnings = 0;
        let hasUnverified = false;
        
        days.forEach(day => {
          const dateStr = toYMD(day);
          const status = attendanceData[employee.id]?.[dateStr] || '';
          const hours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
          const overtime = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
          const verified = !isMissingSource(employee.id, dateStr);
          
          row.push(status, hours.toFixed(1), overtime.toFixed(1));
          totalHours += hours;
          totalOvertime += overtime;
          
          if (status === 'P' || status === 'WP' || status === 'HP') {
            const earnings = calculateEarnings(employee, day, hours, overtime);
            row.push(formatCurrency(earnings.totalPay));
            totalEarnings += earnings.totalPay;
          } else {
            row.push('₵0.00');
          }
          
          row.push(verified ? '✓' : '⚠️');
          if (!verified) hasUnverified = true;
        });
        
        row.push(
          totalHours.toFixed(1),
          totalOvertime.toFixed(1),
          formatCurrency(totalEarnings),
          hasUnverified ? 'Yes' : 'No'
        );
        exportData.push(row);
      });
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Timesheet_Detailed');
      XLSX.writeFile(wb, `Timesheet_Detailed_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (err) {
      console.error("Error exporting professional Excel:", err);
      alert('Error exporting data');
    } finally {
      setExportLoading(false);
    }
  };

  const generateIndividualReport = async (employeeId) => {
    try {
      const token = localStorage.getItem("jwtToken");
      const { start, end } = getDateRange();
      
      setExportLoading(true);
      setSaveMessage({ type: "info", text: "Generating report with attachments... This may take a moment." });
      
      const response = await fetch(
        `${API_BASE_URL}/api/reports/individual?employeeId=${employeeId}&startDate=${toYMD(start)}&endDate=${toYMD(end)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate report");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `timesheet-report-${employeeId}-${new Date().toISOString().split('T')[0]}.zip`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSaveMessage({ type: "success", text: "Report downloaded successfully! Check your Downloads folder." });
      
    } catch (err) {
      console.error("Error generating report:", err);
      setSaveMessage({ type: "error", text: `Error generating report: ${err.message}` });
    } finally {
      setExportLoading(false);
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 5000);
    }
  };

  const generateGeneralReport = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const { start, end } = getDateRange();
      
      setExportLoading(true);
      setSaveMessage({ type: "info", text: "Generating general report with attachments... This may take a moment." });
      
      const url = `${API_BASE_URL}/api/reports/general?startDate=${toYMD(start)}&endDate=${toYMD(end)}${selectedJob && selectedJob !== '' && selectedJob !== 'no-job' ? `&jobId=${selectedJob}` : ''}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate general report");
      }
      
      const blob = await response.blob();
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `general-report-${toYMD(start)}-to-${toYMD(end)}.zip`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(urlBlob);
      
      setSaveMessage({ type: "success", text: "General report downloaded successfully! Check your Downloads folder." });
      
    } catch (err) {
      console.error("Error generating general report:", err);
      setSaveMessage({ type: "error", text: `Error: ${err.message}` });
    } finally {
      setExportLoading(false);
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 5000);
    }
  };

  const generateQuickInvoice = () => {
    if (!selectedJob || selectedJob === 'no-job') {
      alert("Please select a job first");
      return;
    }
    
    const job = jobs.find(j => j.id === parseInt(selectedJob));
    if (!job) {
      alert("Selected job not found");
      return;
    }
    
    const { start, end } = getDateRange();
    let totalHoursAll = 0;
    let totalOvertimeAll = 0;
    let totalEarningsAll = 0;
    const employeeDetails = [];
    
    filteredEmployees.forEach(employee => {
      let empHoursTotal = 0;
      let empOvertimeTotal = 0;
      let empEarningsTotal = 0;
      
      days.forEach(day => {
        const dateStr = toYMD(day);
        const status = attendanceData[employee.id]?.[dateStr];
        const isPresent = isPresentCode(status);
        
        if (isPresent) {
          const hrs = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
          const ot = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
          const earnings = calculateEarnings(employee, day, hrs - ot, ot);
          
          empHoursTotal += hrs;
          empOvertimeTotal += ot;
          empEarningsTotal += earnings.totalPay;
        }
      });
      
      if (empHoursTotal > 0) {
        employeeDetails.push({
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          hours: empHoursTotal,
          overtime: empOvertimeTotal,
          earnings: empEarningsTotal
        });
        
        totalHoursAll += empHoursTotal;
        totalOvertimeAll += empOvertimeTotal;
        totalEarningsAll += empEarningsTotal;
      }
    });
    
    navigate(`/generateinvoice?jobId=${selectedJob}`, {
      state: {
        quickInvoiceData: {
          jobId: selectedJob,
          jobName: job.name,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          totalHours: totalHoursAll,
          totalOvertime: totalOvertimeAll,
          totalEarnings: totalEarningsAll,
          employeeDetails: employeeDetails,
          employeeCount: employeeDetails.length
        }
      }
    });
  };

  const handleDurationFilter = () => {
    userManuallyChangedRef.current = true;
    autoSyncPerformedRef.current = true;
    if (durationFilter.startDate && durationFilter.endDate) {
      const start = new Date(durationFilter.startDate);
      const end = new Date(durationFilter.endDate);
      
      if (start > end) {
        alert('Start date cannot be after end date');
        return;
      }
      
      setCurrentDate(start);
      setSelectedPeriod("custom");
      
      const customDaysArray = [];
      const current = new Date(start);
      while (current <= end) {
        customDaysArray.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      
      setCustomDays(customDaysArray);
      
      const newAttendanceData = { ...attendanceData };
      const newEmployeeHours = { ...employeeHours };
      const newEmployeeOvertime = { ...employeeOvertime };
      
      filteredEmployees.forEach(employee => {
        if (!newAttendanceData[employee.id]) newAttendanceData[employee.id] = {};
        if (!newEmployeeHours[employee.id]) newEmployeeHours[employee.id] = {};
        if (!newEmployeeOvertime[employee.id]) newEmployeeOvertime[employee.id] = {};
        
        customDaysArray.forEach(day => {
          const dateStr = toYMD(day);
          if (!newAttendanceData[employee.id][dateStr]) newAttendanceData[employee.id][dateStr] = '';
          if (!newEmployeeHours[employee.id][dateStr]) newEmployeeHours[employee.id][dateStr] = '';
          if (!newEmployeeOvertime[employee.id][dateStr]) newEmployeeOvertime[employee.id][dateStr] = '';
        });
      });
      
      setAttendanceData(newAttendanceData);
      setEmployeeHours(newEmployeeHours);
      setEmployeeOvertime(newEmployeeOvertime);
      
      alert(`Set duration to ${customDaysArray.length} days`);
      setShowDurationFilter(false);
    }
  };

  const parseDayNumber = (v) => {
    if (v == null || v === "") return null;
    if (v instanceof Date && !isNaN(v.getTime())) {
      const d = v.getDate();
      return d >= 1 && d <= 31 ? d : null;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.floor(v);
      return n >= 1 && n <= 31 ? n : null;
    }
    const s = String(v).trim();
    if (!s) return null;
    const nums = s.match(/\b([1-9]|[12]\d|3[01])\b/g);
    if (!nums || nums.length === 0) return null;
    const n = parseInt(nums[nums.length - 1], 10);
    return n >= 1 && n <= 31 ? n : null;
  };

  const parseHeaderDate = (v) => {
    if (!v) return null;

    if (v instanceof Date && !isNaN(v.getTime())) {
      const year = v.getUTCFullYear();
      const month = v.getUTCMonth();
      const day = v.getUTCDate();
      const utcDate = new Date(Date.UTC(year, month, day));
      return utcDate;
    }

    const s = String(v).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const year = parseInt(iso[1], 10);
      const month = parseInt(iso[2], 10) - 1;
      const day = parseInt(iso[3], 10);
      const utcDate = new Date(Date.UTC(year, month, day));
      return utcDate;
    }

    return null;
  };

  const buildDateColumnMap = (jsonData, nameColumn, firstDataRow) => {
    let bestMap = {};
    let bestCount = 0;

    const start = Math.max(0, firstDataRow - 8);
    const end = Math.max(0, firstDataRow - 1);

    for (let r = start; r <= end; r++) {
      const row = Array.isArray(jsonData[r]) ? jsonData[r] : [];
      const map = {};
      let count = 0;

      for (let col = 0; col < row.length; col++) {
        if (col === nameColumn) continue;

        const d = parseHeaderDate(row[col]);
        if (d) {
          map[col] = d;
          count++;
        }
      }

      if (count > bestCount) {
        bestCount = count;
        bestMap = map;
      }
    }

    return bestMap;
  };

  const normalizeAttendanceCode = (code) => {
    if (!code || code === '') return null;
    const normalized = String(code).trim().toUpperCase();
    if (normalized === 'P' || normalized === 'P'.toUpperCase()) return 'P';
    if (normalized === 'A') return 'A';
    if (normalized === 'L') return 'L';
    if (normalized === 'H') return 'H';
    if (normalized === 'S') return 'S';
    if (normalized === 'WP') return 'P';
    if (normalized === 'HP') return 'HP';
    if (normalized === 'P/M L' || normalized === 'P/M' || normalized === 'M/L') return 'L';
    if (normalized === 'OFF') return 'OFF';
    return null;
  };

  const handleExcelImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      setIsProcessingImport(true);

      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true, cellText: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });

        if (jsonData.length < 2) {
          alert("Excel file is empty or missing data");
          return;
        }

        const findNameColumn = (jsonData) => {
          for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row = jsonData[i];
            if (Array.isArray(row)) {
              for (let j = 0; j < row.length; j++) {
                const cellValue = String(row[j] || "").toLowerCase().trim();
                if (cellValue === "name" || cellValue === "employee" || cellValue === "staff name") return j;
              }
            }
          }

          for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row = jsonData[i];
            if (Array.isArray(row)) {
              for (let j = 0; j < row.length; j++) {
                const cellValue = String(row[j] || "").trim();
                if (
                  cellValue &&
                  cellValue !== "" &&
                  !cellValue.toLowerCase().includes("date") &&
                  !cellValue.toLowerCase().includes("day") &&
                  !cellValue.toLowerCase().includes("total") &&
                  !cellValue.toLowerCase().includes("summary")
                ) {
                  const nextRows = [];
                  for (let k = i + 1; k < Math.min(i + 5, jsonData.length); k++) {
                    if (jsonData[k] && Array.isArray(jsonData[k]) && jsonData[k][j]) {
                      const nextCell = String(jsonData[k][j]).trim();
                      if (nextCell && nextCell !== "") nextRows.push(nextCell);
                    }
                  }
                  if (nextRows.length >= 2) {
                    const looksLikeNames = nextRows.some((name) => name.includes(" ") || /^[A-Z][a-z]+/.test(name));
                    if (looksLikeNames) return j;
                  }
                }
              }
            }
          }

          return 0;
        };

        const findFirstDataRow = (jsonData, nameColumn) => {
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (Array.isArray(row) && row[nameColumn]) {
              const nameCell = String(row[nameColumn]).trim();
              if (
                nameCell &&
                nameCell !== "" &&
                !nameCell.toLowerCase().includes("name") &&
                !nameCell.toLowerCase().includes("total") &&
                !nameCell.toLowerCase().includes("summary") &&
                !nameCell.toLowerCase().includes("employee")
              ) {
                const hasAttendanceData = row.some((cell, index) => {
                  if (index === nameColumn) return false;
                  const code = normalizeAttendanceCode(cell);
                  return code !== null;
                });

                if (hasAttendanceData) return i;
              }
            }
          }
          return -1;
        };

        const nameColumn = findNameColumn(jsonData);
        const firstDataRow = findFirstDataRow(jsonData, nameColumn);

        if (firstDataRow === -1) {
          alert("Could not find attendance data in the Excel file.");
          return;
        }

        const dateColumnMap = buildDateColumnMap(jsonData, nameColumn, firstDataRow);

        if (!dateColumnMap || Object.keys(dateColumnMap).length === 0) {
          alert(
            "Could not detect date headers. Make sure your day columns are REAL Excel dates or ISO text like 2025-12-25."
          );
          return;
        }

        const importedEmployees = [];
        const errors = [];

        for (let i = firstDataRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!Array.isArray(row)) continue;

          const excelName = String(row[nameColumn] || "").trim();
          if (
            !excelName ||
            excelName === "" ||
            excelName.toLowerCase().includes("total") ||
            excelName.toLowerCase().includes("summary")
          )
            continue;

          const matchedEmployee = employees.find((emp) => {
            const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase().trim();
            const searchName = excelName.toLowerCase().trim();

            if (fullName === searchName) return true;

            const fullNameParts = fullName.split(" ");
            const searchNameParts = searchName.split(" ");

            if (fullNameParts.length >= 2 && searchNameParts.length >= 2) {
              const firstNameMatch = fullNameParts[0] === searchNameParts[0];
              const lastNameMatch =
                fullNameParts[fullNameParts.length - 1] === searchNameParts[searchNameParts.length - 1];
              if (firstNameMatch && lastNameMatch) return true;
            }

            if (fullName.includes(searchName)) return true;
            if (searchName.includes(fullName)) return true;

            if (emp.employeeId && emp.employeeId.toLowerCase() === searchName) return true;

            return false;
          });

          if (!matchedEmployee) {
            const hasAttendanceData = row.some((cell, index) => {
              if (index === nameColumn) return false;
              const code = normalizeAttendanceCode(cell);
              return code !== null;
            });

            if (hasAttendanceData) {
              errors.push({
                name: excelName,
                rowNumber: i + 1,
                error: "No matching employee found in system",
              });
            }
            continue;
          }

          const attendanceDataImport = {};

          for (let col = 0; col < row.length; col++) {
            if (col === nameColumn) continue;

            const headerDate = dateColumnMap[col];
            if (!headerDate) continue;

            const cellValue = row[col];
            if (cellValue === null || cellValue === undefined || cellValue === "") continue;

            const attendanceCode = normalizeAttendanceCode(cellValue);
            if (!attendanceCode) continue;

            try {
              const dateStr = toYMD(headerDate);
              const isWeekendDay = (systemSettings.weekendDays || [0, 6]).includes(headerDate.getDay());

              let finalCode = attendanceCode;

              attendanceDataImport[dateStr] = {
                code: finalCode,
                original: String(cellValue).trim(),
                day: headerDate.getDate(),
                isWeekend: isWeekendDay,
              };
            } catch (err) {
              console.warn(`Error mapping date for ${excelName}, column ${col}:`, err);
            }
          }

          if (Object.keys(attendanceDataImport).length > 0) {
            importedEmployees.push({
              employee: matchedEmployee,
              name: excelName,
              originalName: excelName,
              attendance: attendanceDataImport,
              rowNumber: i + 1,
              daysCount: Object.keys(attendanceDataImport).length,
            });
          }
        }

        errors.sort((a, b) => a.rowNumber - b.rowNumber);

        setImportPreview(importedEmployees);
        setImportErrors(errors);
        setShowImportModal(true);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        alert(`Error processing file: ${error.message}`);
      } finally {
        setIsProcessingImport(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const applyImportedData = async () => {
    applyImportPreviewToState();
    await saveImportedDataToDatabase();
  };

  const selectedJobData = jobs.find(j => j.id === parseInt(selectedJob));

  const getEmployeeStandardHours = (employee) => {
    const catHours = Number(employee?.category?.standardRateHours);
    if (!Number.isNaN(catHours) && catHours > 0) return catHours;
    const posHours = Number(
      employee?.jobPositionDetails?.standardWorkHours ??
      employee?.jobPosition?.standardWorkHours ??
      employee?.standardWorkHours
    );
    if (!Number.isNaN(posHours) && posHours > 0) return posHours;
    const sysHours = Number(systemSettings?.standardWorkHours);
    if (!Number.isNaN(sysHours) && sysHours > 0) return sysHours;
    return 8;
  };

  const getAttendanceCodeColor = (code) => {
    switch(code) {
      case 'P': return 'bg-green-100 border-green-500 text-green-700';
      case 'A': return 'bg-red-100 border-red-500 text-red-700';
      case 'L': return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'H': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'S': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'WP': return 'bg-indigo-100 border-indigo-500 text-indigo-700';
      case 'HP': return 'bg-purple-100 border-purple-500 text-purple-700';
      case 'ML': return 'bg-pink-100 border-pink-500 text-pink-700';
      case 'PL': return 'bg-teal-100 border-teal-500 text-teal-700';
      case 'OFF': return 'bg-gray-100 border-gray-500 text-gray-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  const unverifiedCount = useMemo(() => {
    let count = 0;
    filteredEmployees.forEach(emp => {
      days.forEach(day => {
        const dateStr = toYMD(day);
        if (attendanceData[emp.id]?.[dateStr] && isMissingSource(emp.id, dateStr)) {
          count++;
        }
      });
    });
    return count;
  }, [filteredEmployees, days, attendanceData, missingSourceEntries]);

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      )}
      
      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        {/* ===== HEADER BAR – reduced height ===== */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="flex justify-between items-center px-6 py-2">
            <div className="flex items-center gap-4">
              {sidebarOpen && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu size={20} className="text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarDays size={22} className="text-blue-500" />
                  Timesheet Management
                </h1>
                {selectedJob && selectedJobData && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    <Building size={14} className="inline mr-1" />
                    {selectedJobData.name} • {filteredEmployees.length} employees
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                value={missingSourceFilter} 
                onChange={(e) => setMissingSourceFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Entries</option>
                <option value="verified">Verified Only (Has Source)</option>
                <option value="unverified">Unverified Only (No Source)</option>
              </select>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setControlsOpen((open) => !open)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 shadow hover:shadow-md text-sm font-medium"
                >
                  <Settings size={16} />
                  Controls
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${controlsOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {controlsOpen && typeof document !== "undefined" && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[2147483646] bg-black/10 backdrop-blur-[1px]"
                      onClick={() => setControlsOpen(false)}
                      aria-hidden="true"
                    />

                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label="Timesheet controls"
                      className="fixed right-4 top-20 z-[2147483647] w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain bg-white rounded-xl shadow-2xl border border-gray-200"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Timesheet controls</p>
                        <p className="text-xs text-gray-500 mt-0.5">Manage, save, import, export, and review records.</p>
                      </div>

                      <div className="p-2">
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Save</p>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); saveAttendance(); }}
                          disabled={isGenerating}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-green-50 disabled:opacity-50"
                        >
                          {isGenerating ? <RefreshCw size={17} className="animate-spin text-green-600" /> : <Save size={17} className="text-green-600" />}
                          <div>
                            <div className="text-sm font-medium text-gray-800">{isGenerating ? 'Saving...' : 'Save all'}</div>
                            <div className="text-xs text-gray-500">Save the current timesheet period</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); saveSelectedAttendance(); }}
                          disabled={isGenerating || selectedEmployeeIds.size === 0}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-cyan-50 disabled:opacity-50"
                        >
                          <Check size={17} className="text-cyan-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Save selected ({selectedEmployeeIds.size})</div>
                            <div className="text-xs text-gray-500">Save only selected employees</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setControlsOpen(false);
                            setSaveSpecificDate({
                              open: true,
                              date: days.length > 0 ? toYMD(days[0]) : "",
                              endDate: days.length > 0 ? toYMD(days[days.length - 1]) : "",
                              rangeMode: false,
                              employeeIds: new Set(selectedEmployeeIds),
                              isSaving: false
                            });
                          }}
                          disabled={isGenerating || selectedEmployeeIds.size === 0}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-teal-50 disabled:opacity-50"
                        >
                          <Calendar size={17} className="text-teal-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Save date or range</div>
                            <div className="text-xs text-gray-500">Save selected employees for chosen dates</div>
                          </div>
                        </button>

                        <div className="my-2 border-t border-gray-100" />
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Manage</p>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); setBulkPanelOpen(true); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-purple-50"
                        >
                          <Users size={17} className="text-purple-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Bulk actions ({selectedEmployeeIds.size})</div>
                            <div className="text-xs text-gray-500">Update multiple employees and dates</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); setShowMissingSourceModal(true); }}
                          disabled={selectedEmployeeIds.size === 0}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-amber-50 disabled:opacity-50"
                        >
                          <Flag size={17} className="text-amber-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Mark missing source ({selectedEmployeeIds.size})</div>
                            <div className="text-xs text-gray-500">Flag records without supporting documents</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); setShowSyncPanel((open) => !open); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-blue-50"
                        >
                          <ArrowRightLeft size={17} className="text-blue-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">{showSyncPanel ? 'Hide attendance sync' : 'Sync with attendance'}</div>
                            <div className="text-xs text-gray-500">Create or update timesheets from attendance</div>
                          </div>
                        </button>

                        <label className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoSyncWithBilling}
                            onChange={(e) => setAutoSyncWithBilling(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Auto-sync billing period</div>
                            <div className="text-xs text-gray-500">Follow the selected job billing cycle</div>
                          </div>
                        </label>

                        <div className="my-2 border-t border-gray-100" />
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Import and export</p>

                        <label className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-blue-50 cursor-pointer ${isProcessingImport ? 'opacity-50 pointer-events-none' : ''}`}>
                          {isProcessingImport ? <RefreshCw size={17} className="animate-spin text-blue-600" /> : <Upload size={17} className="text-blue-600" />}
                          <div>
                            <div className="text-sm font-medium text-gray-800">Import Excel</div>
                            <div className="text-xs text-gray-500">Upload XLSX, XLS, or CSV timesheets</div>
                          </div>
                          <input type="file" accept=".xlsx, .xls, .csv" onChange={(event) => { setControlsOpen(false); handleExcelImport(event); }} className="hidden" disabled={isProcessingImport} />
                        </label>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); exportToColoredExcel(); }}
                          disabled={exportLoading}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-blue-50 disabled:opacity-50"
                        >
                          <FileText size={17} className="text-blue-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Export template</div>
                            <div className="text-xs text-gray-500">Export a formatted manual-entry template</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); exportToProfessionalExcel(); }}
                          disabled={exportLoading}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-green-50 disabled:opacity-50"
                        >
                          <File size={17} className="text-green-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Export detailed data</div>
                            <div className="text-xs text-gray-500">Export calculations and employee totals</div>
                          </div>
                        </button>

                        {selectedJob && selectedJob !== 'no-job' && (
                          <button
                            type="button"
                            onClick={() => { setControlsOpen(false); handleExportInvoice(); }}
                            disabled={isGenerating}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <Receipt size={17} className="text-emerald-600" />
                            <div>
                              <div className="text-sm font-medium text-gray-800">Export invoice</div>
                              <div className="text-xs text-gray-500">Generate invoice with job attachments</div>
                            </div>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); navigate('/excel-comparator'); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-indigo-50"
                        >
                          <ArrowLeftRight size={17} className="text-indigo-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Compare Excel files</div>
                            <div className="text-xs text-gray-500">Open the spreadsheet comparison tool</div>
                          </div>
                        </button>

                        <div className="my-2 border-t border-gray-100" />
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Reports and settings</p>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); generateGeneralReport(); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-indigo-50"
                        >
                          <BarChart size={17} className="text-indigo-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Generate report</div>
                            <div className="text-xs text-gray-500">Build the current timesheet report</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); setShowCodeSettings((open) => !open); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-amber-50"
                        >
                          <Settings size={17} className="text-amber-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Attendance-code settings</div>
                            <div className="text-xs text-gray-500">Configure normal and overtime-hour rules</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setControlsOpen(false); window.location.reload(); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50"
                        >
                          <RefreshCw size={17} className="text-gray-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">Refresh page</div>
                            <div className="text-xs text-gray-500">Reload all current timesheet data</div>
                          </div>
                        </button>

                        <div className="my-2 border-t border-gray-100" />

                        <button
                          type="button"
                          onClick={() => {
                            setControlsOpen(false);
                            setDeleteModal({
                              open: true,
                              scope: "selected",
                              date: "",
                              startDate: "",
                              endDate: "",
                              employeeIds: new Set(selectedEmployeeIds),
                              isDeleting: false
                            });
                          }}
                          disabled={selectedEmployeeIds.size === 0}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={17} className="text-red-600" />
                          <div>
                            <div className="text-sm font-medium text-red-700">Delete selected ({selectedEmployeeIds.size})</div>
                            <div className="text-xs text-gray-500">Remove selected employees' timesheet records</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.role || 'Role'}</p>
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                
                {userDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998] bg-black/5" onClick={() => setUserDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-40">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500">{user?.email || ''}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-red-600 hover:bg-gray-50 rounded-b-lg transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {saveMessage.text && (
            <div className={`mb-6 p-4 rounded-lg shadow-sm ${
              saveMessage.type === 'success' ? 'bg-gradient-to-r from-green-50 to-green-100 border border-green-200 text-green-800' :
              saveMessage.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800' :
              'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {saveMessage.type === 'success' && <CheckCircle size={20} className="text-green-600" />}
                  {saveMessage.type === 'error' && <XCircle size={20} className="text-red-600" />}
                  {saveMessage.type === 'info' && <RefreshCw size={20} className="animate-spin text-blue-600" />}
                  <span className="font-medium">{saveMessage.text}</span>
                </div>
                <button onClick={() => setSaveMessage({ type: '', text: '' })} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ===== FILTER / ACTION BAR – reduced height ===== */}
          <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button onClick={() => { userManuallyChangedRef.current = true; autoSyncPerformedRef.current = true; const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() - 7); setCurrentDate(newDate); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronLeft size={18} />
                </button>
                
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm">
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <h2 className="text-base font-semibold text-blue-800">
                    {selectedPeriod === "week" 
                      ? `Week of ${getDateRange().start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${getDateRange().end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : selectedPeriod === "month"
                      ? currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                      : selectedPeriod === "custom" && customDays.length > 0
                      ? `${customDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customDays[customDays.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : 'Custom Range'}
                  </h2>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {days.length} days • {filteredEmployees.length} employees
                  </p>
                </div>
                
                <button onClick={() => { userManuallyChangedRef.current = true; autoSyncPerformedRef.current = true; const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() + 7); setCurrentDate(newDate); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>

              <button onClick={() => setViewMode(viewMode === 'timesheet' ? 'excel-template' : 'timesheet')} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow text-sm">
                <FileText size={14} />
                {viewMode === 'timesheet' ? 'View Template' : 'Back to Timesheet'}
              </button>

              {selectedJob && selectedJobData && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Building size={14} className="text-blue-600" />
                    <h3 className="font-semibold text-blue-800 text-sm">{selectedJobData.name}</h3>
                  </div>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {filteredEmployees.length} employees • Standard: {selectedJobData.standardWorkHours || 8}h/day
                  </p>
                  <button onClick={() => navigate(`/generateinvoice?jobId=${selectedJob}&startDate=${getDateRange().start.toISOString().split('T')[0]}&endDate=${getDateRange().end.toISOString().split('T')[0]}`)} className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors">
                    <Receipt size={12} />
                    Quick Invoice
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search employees, positions, IDs..." className="w-full pl-9 pr-9 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" title="Clear search">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">Show:</span>
                <select value={tablePageSize} onChange={(e) => setTablePageSize(parseInt(e.target.value))} className="px-1.5 py-0.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>All</option>
                </select>
              </div>

              <div className="relative">
                <button onClick={() => setShowDurationFilter(!showDurationFilter)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow text-sm">
                  <CalendarRange size={14} />
                  Duration
                </button>
                
                {showDurationFilter && (
                  <div className="absolute top-full mt-2 right-0 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 z-50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 text-lg">Set Timesheet Duration</h3>
                      <button onClick={() => setShowDurationFilter(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                          <input type="date" value={durationFilter.startDate} onChange={(e) => setDurationFilter(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                          <input type="date" value={durationFilter.endDate} onChange={(e) => setDurationFilter(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                        </div>
                      </div>
                      
                      <button onClick={handleDurationFilter} className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 font-medium transition-all duration-200 shadow">
                        Apply Duration
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm">
                <option value="">All Jobs ({employees.length})</option>
                <option value="no-job">No Job ({employees.filter(emp => !emp.job || !emp.job.id).length})</option>
                {jobs.map(job => {
                  const assignedEmployeesCount = employees.filter(emp => emp.job && emp.job.id === job.id).length;
                  return (
                    <option key={job.id} value={job.id}>
                      {job.name} ({assignedEmployeesCount})
                    </option>
                  );
                })}
              </select>
              
              <button onClick={() => setShowStatsPanel(!showStatsPanel)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                {showStatsPanel ? <EyeOff size={18} className="text-gray-600" /> : <Eye size={18} className="text-gray-600" />}
              </button>
            </div>
          </div>

          {showStatsPanel && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-blue-800 text-lg flex items-center gap-2">
                    <BarChart size={20} />
                    Current Billing Cycle
                  </h3>
                  <p className="text-blue-600 mt-1">
                    {billingCycle.startDate.toLocaleDateString()} - {billingCycle.endDate.toLocaleDateString()}
                  </p>
                  <p className="text-sm text-blue-500">
                    {selectedJob ? `Job: ${selectedJobData?.name}` : 'All Jobs'} • {filteredEmployees.length} employees
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {billingCycle.type.toUpperCase()}
                  </span>
                  {selectedJob && selectedJob !== 'no-job' && (
                    <button onClick={generateQuickInvoice} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                      <Receipt size={16} />
                      Generate Invoice
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Total Employees</div>
                  <div className="text-2xl font-bold text-gray-800">{filteredEmployees.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Present Days</div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredEmployees.reduce((total, emp) => total + days.filter(day => {
                      const dateStr = toYMD(day);
                      const status = attendanceData[emp.id]?.[dateStr];
                      return status === 'P' || status === 'WP' || status === 'HP';
                    }).length, 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Total Hours</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredEmployees.reduce((total, emp) => total + days.reduce((sum, day) => {
                      const dateStr = toYMD(day);
                      return sum + parseFloat(employeeHours[emp.id]?.[dateStr] || 0);
                    }, 0), 0).toFixed(1)}h
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Unverified Entries</div>
                  <div className="text-2xl font-bold text-amber-600">{unverifiedCount}</div>
                  <div className="text-xs text-gray-500 mt-1">No source document</div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            {showSyncPanel && (
              <TimesheetAttendanceSync 
                timesheets={timesheets}
                attendances={attendances}
                employees={employees}
                settings={{
                  ...systemSettings,
                  holidays,
                  specialWeekends,
                  weekendDays: systemSettings.weekendDays || [0, 6]
                }}
                onSyncComplete={(results) => {
                  console.log('Sync completed:', results);
                  fetchTimesheets();
                }}
                selectedEmployeeIds={selectedEmployeeIds}
                selectedCategory={selectedCategory}
                filteredEmployees={filteredEmployees}
              />
            )}
          </div>

          <div className="mb-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <div className="text-sm text-gray-700 flex items-center gap-4">
              <div>
                Showing <span className="font-bold text-gray-800">{startRow}</span>–<span className="font-bold text-gray-800">{endRow}</span> of{" "}
                <span className="font-bold text-gray-800">{totalRows}</span> employees
                {searchQuery && (
                  <span className="ml-2 text-gray-500">
                    (filtered by "{searchQuery}")
                  </span>
                )}
                {missingSourceFilter !== "all" && (
                  <span className="ml-2 text-amber-600">
                    • Filtered: {missingSourceFilter === "verified" ? "Verified only" : "Unverified only"}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Select:</span>
                <button onClick={selectAllOnPage} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors">
                  Page
                </button>
                <button onClick={selectAllFiltered} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors">
                  All Filtered
                </button>
                <button onClick={clearAllSelection} className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                  Clear
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage <= 1} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page <span className="font-bold">{tablePage}</span> / <span className="font-bold">{totalPages}</span>
              </span>
              <button onClick={() => setTablePage(p => Math.min(totalPages, p + 1))} disabled={tablePage >= totalPages} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow border border-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <span className="text-lg text-gray-600">Loading timesheet data...</span>
              <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the latest information</p>
            </div>
          ) : viewMode === 'excel-template' ? (
            <ExcelTemplateViewer 
              employees={pagedEmployees}
              jobName={selectedJobData?.name || "SITE SERVICES"}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                <table className="min-w-full">
                  <thead className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="sticky left-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 w-12">
                        <input type="checkbox" checked={pagedEmployees.length > 0 && pagedEmployees.every(e => selectedEmployeeIds.has(e.id))} onChange={(e) => { if (e.target.checked) selectAllOnPage(); else clearAllSelection(); }} className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500" />
                      </th>
                      
                      <th className="sticky left-12 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <User size={14} />
                          Employee Details
                        </div>
                      </th>
                      
                      {days.map((day, index) => {
                        const dateType = getDateTypeBadge(day);
                        return (
                          <th key={index} className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[100px]">
                            <div className="font-bold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className="text-lg font-bold text-gray-800">{day.getDate()}</div>
                            <div className={`text-xs px-2 py-1 rounded-full ${dateType.class} font-medium mt-1`}>
                              {dateType.text}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{getDateRateMultiplier(day)}x rate</div>
                          </th>
                        );
                      })}
                      
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-2">
                          <Clock size={14} />
                          Total Days
                        </div>
                      </th>
                      
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {pagedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={days.length + 6} className="px-4 py-12 text-center">
                          <div className="max-w-md mx-auto">
                            <Users size={64} className="mx-auto mb-4 text-gray-300" />
                            <div className="text-xl font-semibold text-gray-500 mb-2">No employees found</div>
                            <div className="text-gray-400 mb-6">
                              {selectedJob 
                                ? `No employees are assigned to the selected job.`
                                : 'No employees match the current filters.'
                              }
                            </div>
                            {selectedJob && selectedJob !== 'no-job' && (
                              <button onClick={() => window.location.href = `/jobs?selectJob=${selectedJob}`} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow">
                                Assign Employees to Job
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedEmployees.map((employee) => {
                        const jobStandardHours = employee.job?.standardWorkHours || systemSettings.standardWorkHours;
                        const employeeJob = employee.job;
                        
                        return (
                          <React.Fragment key={employee.id}>
                            <tr className="hover:bg-gray-50 transition-colors duration-150">
                              <td className="sticky left-0 z-20 bg-white px-4 py-3 border-r border-gray-100 text-center align-top" rowSpan="2">
                                <input type="checkbox" checked={selectedEmployeeIds.has(employee.id)} onChange={() => toggleSelectEmployee(employee.id)} className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500" />
                              </td>
                              
                              <td className="sticky left-12 z-20 bg-white px-3 py-3 border-r border-gray-100 w-[180px] align-top" rowSpan="2">
                                <div className="font-semibold text-gray-900 text-sm leading-tight">
                                  {employee.firstName} {employee.lastName}
                                </div>

                                <div className="text-xs text-gray-600 space-y-1.5 mt-2">
                                  <div className="flex items-center">
                                    <User size={12} className="mr-2 text-gray-400" />
                                    <span className="font-medium">ID: {employee.employeeId || 'N/A'}</span>
                                  </div>

                                  {employeeJob && (
                                    <div className="flex items-center">
                                      <Building size={12} className="mr-2 text-blue-400" />
                                      <span className="font-medium text-blue-600">{employeeJob.name}</span>
                                    </div>
                                  )}
                                  {!employeeJob && selectedJob && selectedJob !== '' && selectedJob !== 'no-job' && (
                                    <div className="flex items-center text-amber-600">
                                      <Building size={12} className="mr-2 text-amber-400" />
                                      <span className="text-xs font-medium">Not assigned to this job</span>
                                    </div>
                                  )}

                                  <div className="flex items-center">
                                    <Clock size={12} className="mr-2 text-gray-400" />
                                    <span>Standard: {jobStandardHours}h/day</span>
                                  </div>

                                  <div className="flex items-center">
                                    <DollarSign size={12} className="mr-2 text-gray-400" />
                                    <span className="font-medium">
                                      ₵{(employee.minimumRate || employee.hourlyRate || defaultRates.hourlyRate).toFixed(2)}/hr
                                    </span>
                                  </div>
                                  
                                  {employee.category && (
                                    <div className="mt-2">
                                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                        {employee.category}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {days.map((day, dayIndex) => {
                                const dateStr = toYMD(day);
                                const attendanceStatus = attendanceData[employee.id]?.[dateStr] || '';
                                const dateType = getDateTypeBadge(day);
                                const missingSource = isMissingSource(employee.id, dateStr);
                                
                                return (
                                  <td key={dayIndex} className="px-1 py-2 text-center border-r border-gray-100 align-top relative" style={{ backgroundColor: missingSource ? '#fef3c7' : 'white' }}>
                                    <div className="flex items-center justify-center gap-1">
                                      <select 
                                        value={attendanceStatus} 
                                        onChange={(e) => handleAttendanceStatusChange(employee.id, dateStr, e.target.value)} 
                                        className="w-16 h-8 rounded-lg border-2 font-bold text-sm text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
                                        style={getAttendanceCodeColor(attendanceStatus) ? { backgroundColor: 'white' } : {}}
                                      >
                                        <option value="">-</option>
                                        <option value="P">P</option>
                                        <option value="A">A</option>
                                        <option value="L">L</option>
                                        <option value="H">H</option>
                                        <option value="S">S</option>
                                        <option value="WP">WP</option>
                                        <option value="HP">HP</option>
                                        <option value="PL">PL</option>
                                        <option value="ML">ML</option>
                                        <option value="OFF">OFF</option>
                                      </select>
                                      
                                      <div className="relative group">
                                        <button
                                          onClick={() => toggleMissingSourceFlag(employee.id, dateStr, missingSource)}
                                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${missingSource ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-amber-100'}`}
                                          title={missingSource ? "Mark as has source document" : "Mark as missing source document"}
                                        >
                                          {missingSource ? <AlertTriangle size={12} /> : <Flag size={12} />}
                                        </button>
                                        {missingSource && (
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                            {getMissingSourceReason(employee.id, dateStr)}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {attendanceStatus && attendanceStatus !== '' && (
                                      <button
                                        onClick={() => openDeleteForDay(employee.id, dateStr)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center shadow-sm"
                                        title="Delete this day's record"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  
                                    <div className={`text-xs mt-2 px-2 py-1 rounded-full ${dateType.class} font-medium`}>
                                      {getDateRateMultiplier(day)}x
                                    </div>
                                  </td>
                                );
                              })}
                              
                              <td className="px-4 py-3 text-center font-semibold text-gray-800 align-top">
                                <div className="text-lg">
                                  {days.filter(day => {
                                    const dateStr = toYMD(day);
                                    const status = attendanceData[employee.id]?.[dateStr];
                                    return isPresentCode(status);
                                  }).length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">days present</div>
                              </td>
                              
                              <td className="px-4 py-3 text-center align-top" rowSpan="2">
                                <button onClick={() => generateIndividualReport(employee.id)} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow w-full">
                                  <FileText size={14} />
                                  Report
                                </button>
                              </td>
                            </tr>
                            
                            <tr className="hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100">
                              {days.map((day, dayIndex) => {
                                const dateStr = toYMD(day);
                                const status = attendanceData[employee.id]?.[dateStr];
                                const isPresent = isPresentCode(status);
                                const totalHours = parseFloat(employeeHours[employee.id]?.[dateStr] || 0);
                                const overtimeHours = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
                                const normalHours = parseFloat(employeeNormalHours?.[employee.id]?.[dateStr] || 0);
                                const missingSource = isMissingSource(employee.id, dateStr);
                                
                                return (
                                  <td key={dayIndex} className="border-r border-gray-100 px-1 py-2" style={{ backgroundColor: missingSource ? '#fef3c7' : 'white' }}>
                                    {isPresent ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <label className="text-xs font-medium text-gray-600">NH:</label>
                                          <input 
                                            type="number" 
                                            placeholder="0" 
                                            value={normalHours || ''} 
                                            onChange={(e) => {
                                              userManuallyChangedRef.current = true;
                                              autoSyncPerformedRef.current = true;
                                              const newNH = parseFloat(e.target.value) || 0;
                                              const currentOT = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
                                              
                                              setEmployeeNormalHours(prev => ({
                                                ...prev,
                                                [employee.id]: {
                                                  ...(prev[employee.id] || {}),
                                                  [dateStr]: newNH.toString()
                                                }
                                              }));
                                              
                                              setEmployeeHours(prev => ({
                                                ...prev,
                                                [employee.id]: {
                                                  ...(prev[employee.id] || {}),
                                                  [dateStr]: (newNH + currentOT).toString()
                                                }
                                              }));
                                            }} 
                                            className="w-16 p-1 border border-blue-300 rounded-lg text-sm text-center bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                            min="0" 
                                            max="24" 
                                            step="0.5" 
                                          />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <label className="text-xs font-medium text-orange-600">OT:</label>
                                          <input type="number" placeholder="0" value={overtimeHours || ''} onChange={(e) => {
                                            userManuallyChangedRef.current = true;
                                            autoSyncPerformedRef.current = true;
                                            handleOvertimeChange(employee.id, dateStr, e.target.value);
                                          }} className="w-16 p-1 border border-orange-300 rounded-lg text-sm text-center bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" min="0" max="24" step="0.5" />
                                        </div>
                                        
                                        <div className="text-center text-xs font-medium text-gray-700 bg-gray-100 py-0.5 rounded">
                                          Total: {totalHours.toFixed(1)}h
                                        </div>
                                      </div>
                                    ) : ( 
                                      <div className="text-center py-2">
                                        <div className={`text-sm font-medium px-3 py-1 rounded-full ${status === 'A' ? 'bg-red-100 text-red-700' : status === 'L' ? 'bg-blue-100 text-blue-700' : status === 'H' ? 'bg-yellow-100 text-yellow-700' : status === 'S' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                          {status === '' ? 'Not Marked' : 
                                            status === 'A' ? 'Absent' : 
                                            status === 'L' ? 'Leave' : 
                                            status === 'H' ? 'Holiday' : 
                                            status === 'S' ? 'Sick' : 
                                            status === 'OFF' ? 'Off Day' : 'Not Present'}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2">0 hours</div>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              
                              <td className="px-4 py-3 text-center border-r border-gray-100">
                                <div className="space-y-1">
                                  <div className="font-bold text-lg text-gray-800">
                                    {days.reduce((total, day) => {
                                      const dateStr = toYMD(day);
                                      const nh = parseFloat(employeeNormalHours?.[employee.id]?.[dateStr] || 0);
                                      const ot = parseFloat(employeeOvertime?.[employee.id]?.[dateStr] || 0);
                                      return total + nh + ot;
                                    }, 0).toFixed(1)}h
                                  </div>

                                  <div className="text-xs text-blue-600 font-medium">
                                    NH: {days.reduce((total, day) => {
                                      const dateStr = toYMD(day);
                                      const nh = parseFloat(employeeNormalHours?.[employee.id]?.[dateStr] || 0);
                                      return total + nh;
                                    }, 0).toFixed(1)}h
                                  </div>

                                  <div className="text-xs text-orange-600 font-medium">
                                    OT: {days.reduce((total, day) => {
                                      const dateStr = toYMD(day);
                                      const ot = parseFloat(employeeOvertime[employee.id]?.[dateStr] || 0);
                                      return total + ot;
                                    }, 0).toFixed(1)}h
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-500 mb-2">Total Employees</div>
                    <div className="text-2xl font-bold text-gray-800">{filteredEmployees.length}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-500 mb-2">Present Days</div>
                    <div className="text-2xl font-bold text-green-600">
                      {filteredEmployees.reduce((total, emp) => total + days.filter(day => {
                        const dateStr = toYMD(day);
                        const status = attendanceData[emp.id]?.[dateStr];
                        return status === 'P' || status === 'WP' || status === 'HP';
                      }).length, 0)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-500 mb-2">Unmarked Days</div>
                    <div className="text-2xl font-bold text-amber-600">
                      {filteredEmployees.reduce((total, emp) => total + days.filter(day => {
                        const dateStr = toYMD(day);
                        const status = attendanceData[emp.id]?.[dateStr];
                        return status === '';
                      }).length, 0)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-500 mb-2">Unverified Entries</div>
                    <div className="text-2xl font-bold text-amber-600">{unverifiedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">No source document</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-500 mb-2">Selected Job</div>
                    <div className="text-lg font-bold text-gray-800">
                      {selectedJob ? (selectedJobData?.name || 'Unknown Job') : 'All Jobs'}
                    </div>
                    {selectedJob && selectedJob !== 'no-job' && (
                      <button onClick={generateQuickInvoice} className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors">
                        <Receipt size={14} />
                        Generate Invoice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===== MODALS (unchanged) ===== */}
      {showMissingSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Flag size={20} className="text-amber-600" />
                  Mark as "No Source Document"
                </h2>
                <p className="text-gray-600 mt-1">
                  Apply to <span className="font-bold text-amber-700">{missingSourceModalData.employeeIds.size || selectedEmployeeIds.size}</span> selected employees
                </p>
              </div>
              <button onClick={() => setShowMissingSourceModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input 
                      type="date" 
                      value={missingSourceModalData.startDate} 
                      onChange={(e) => setMissingSourceModalData(prev => ({ ...prev, startDate: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input 
                      type="date" 
                      value={missingSourceModalData.endDate} 
                      onChange={(e) => setMissingSourceModalData(prev => ({ ...prev, endDate: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                  <textarea 
                    value={missingSourceModalData.reason} 
                    onChange={(e) => setMissingSourceModalData(prev => ({ ...prev, reason: e.target.value }))} 
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., Hard copy timesheet not received for these dates..."
                  />
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employees:</span>
                      <span className="font-bold text-amber-700">{missingSourceModalData.employeeIds.size || selectedEmployeeIds.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Range:</span>
                      <span className="font-bold text-amber-700">
                        {missingSourceModalData.startDate || '?'} to {missingSourceModalData.endDate || '?'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Info size={18} className="text-blue-600 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    This will mark these entries as having NO source document. Payroll will see these as UNVERIFIED.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button 
                onClick={() => setShowMissingSourceModal(false)} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={bulkMarkMissingSource} 
                disabled={!missingSourceModalData.startDate || !missingSourceModalData.endDate} 
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 font-medium transition-all duration-200 shadow disabled:opacity-50 flex items-center gap-2"
              >
                <Flag size={16} />
                Mark as No Source
              </button>
            </div>
          </div>
        </div>
      )}

      {saveSpecificDate.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-emerald-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar size={20} className="text-teal-600" />
                  {saveSpecificDate.rangeMode ? 'Save Date Range' : 'Save Single Date'}
                </h2>
                <p className="text-gray-600 mt-1">
                  Save for <span className="font-bold text-teal-700">{saveSpecificDate.employeeIds.size || selectedEmployeeIds.size}</span> selected employees
                </p>
              </div>
              <button onClick={() => setSaveSpecificDate({ open: false, date: "", endDate: "", rangeMode: false, employeeIds: new Set(), isSaving: false })} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setSaveSpecificDate(prev => ({ ...prev, rangeMode: false, endDate: "" }))}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      !saveSpecificDate.rangeMode 
                        ? 'bg-teal-500 text-white shadow' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Single Date
                  </button>
                  <button
                    onClick={() => setSaveSpecificDate(prev => ({ ...prev, rangeMode: true }))}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      saveSpecificDate.rangeMode 
                        ? 'bg-teal-500 text-white shadow' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Date Range
                  </button>
                </div>

                {!saveSpecificDate.rangeMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                    <input 
                      type="date" 
                      value={saveSpecificDate.date} 
                      onChange={(e) => setSaveSpecificDate(prev => ({ ...prev, date: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                )}

                {saveSpecificDate.rangeMode && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input 
                        type="date" 
                        value={saveSpecificDate.date} 
                        onChange={(e) => setSaveSpecificDate(prev => ({ ...prev, date: e.target.value }))} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input 
                        type="date" 
                        value={saveSpecificDate.endDate} 
                        onChange={(e) => setSaveSpecificDate(prev => ({ ...prev, endDate: e.target.value }))} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>
                )}
                
                {saveSpecificDate.rangeMode && (
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(end.getDate() - 7);
                          setSaveSpecificDate(prev => ({ 
                            ...prev, 
                            date: toYMD(start), 
                            endDate: toYMD(end) 
                          }));
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Last 7 Days
                      </button>
                      <button
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(end.getDate() - 30);
                          setSaveSpecificDate(prev => ({ 
                            ...prev, 
                            date: toYMD(start), 
                            endDate: toYMD(end) 
                          }));
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Last 30 Days
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          const start = new Date(today.getFullYear(), today.getMonth(), 1);
                          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                          setSaveSpecificDate(prev => ({ 
                            ...prev, 
                            date: toYMD(start), 
                            endDate: toYMD(end) 
                          }));
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Current Month
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          const start = new Date(today);
                          start.setDate(today.getDate() - today.getDay());
                          const end = new Date(start);
                          end.setDate(start.getDate() + 6);
                          setSaveSpecificDate(prev => ({ 
                            ...prev, 
                            date: toYMD(start), 
                            endDate: toYMD(end) 
                          }));
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Current Week
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 flex items-center gap-2">
                    <Info size={16} />
                    Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employees:</span>
                      <span className="font-bold text-teal-700">{saveSpecificDate.employeeIds.size || selectedEmployeeIds.size}</span>
                    </div>
                    {!saveSpecificDate.rangeMode ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-bold text-teal-700">{saveSpecificDate.date || 'Not selected'}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date Range:</span>
                          <span className="font-bold text-teal-700">
                            {saveSpecificDate.date || '?'} to {saveSpecificDate.endDate || '?'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Days:</span>
                          <span className="font-bold text-teal-700">
                            {saveSpecificDate.date && saveSpecificDate.endDate 
                              ? Math.ceil((new Date(saveSpecificDate.endDate) - new Date(saveSpecificDate.date)) / (1000 * 60 * 60 * 24)) + 1 
                              : 0}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Action:</span>
                      <span className="font-bold text-teal-700">Override existing data</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    {!saveSpecificDate.rangeMode 
                      ? "This will save attendance data for the selected date only. Existing data for this date will be overwritten."
                      : "This will save attendance data for all dates in the selected range. Existing data within this range will be overwritten."
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button 
                onClick={() => setSaveSpecificDate({ open: false, date: "", endDate: "", rangeMode: false, employeeIds: new Set(), isSaving: false })} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveSpecificDateAttendance} 
                disabled={
                  saveSpecificDate.isSaving || 
                  (!saveSpecificDate.rangeMode && !saveSpecificDate.date) ||
                  (saveSpecificDate.rangeMode && (!saveSpecificDate.date || !saveSpecificDate.endDate))
                } 
                className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 font-medium transition-all duration-200 shadow disabled:opacity-50 flex items-center gap-2"
              >
                {saveSpecificDate.isSaving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{saveSpecificDate.rangeMode ? 'Save Date Range' : 'Save Date'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Trash2 size={20} className="text-red-600" />
                  Delete Timesheet Records
                </h2>
                <p className="text-gray-600 mt-1">
                  {deleteModal.scope === "singleDay" && (
                    <>Delete for <span className="font-bold text-red-700">one employee on one day</span></>
                  )}
                  {deleteModal.scope === "selected" && (
                    <>Delete for <span className="font-bold text-red-700">{deleteModal.employeeIds.size || selectedEmployeeIds.size}</span> selected employees</>
                  )}
                  {deleteModal.scope === "all" && <>Delete for <span className="font-bold text-red-700">all employees</span></>}
                  {deleteModal.scope === "date" && <>Delete for <span className="font-bold text-red-700">specific date</span></>}
                  {deleteModal.scope === "dateRange" && <>Delete for <span className="font-bold text-red-700">date range</span></>}
                </p>
              </div>
              <button onClick={() => setDeleteModal({ open: false, scope: "selected", date: "", startDate: "", endDate: "", employeeIds: new Set(), selectedEmployeeForDay: null, selectedDateForDay: "", isDeleting: false })} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delete Scope</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "singleDay", label: "Single Day", disabled: false },
                      { value: "selected", label: "Selected Employees", disabled: selectedEmployeeIds.size === 0 },
                      { value: "all", label: "All Employees", disabled: false },
                      { value: "date", label: "Specific Date", disabled: false },
                      { value: "dateRange", label: "Date Range", disabled: false }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDeleteModal(prev => ({ ...prev, scope: option.value }))}
                        disabled={option.disabled}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                          deleteModal.scope === option.value
                            ? 'border-red-500 bg-red-50 text-red-700 font-medium'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {deleteModal.scope === "singleDay" && (
                  <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
                      <select
                        value={deleteModal.selectedEmployeeForDay || ''}
                        onChange={(e) => setDeleteModal(prev => ({ 
                          ...prev, 
                          selectedEmployeeForDay: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">Choose employee...</option>
                        {filteredEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeId || 'No ID'})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                      <input 
                        type="date" 
                        value={deleteModal.selectedDateForDay || deleteModal.date} 
                        onChange={(e) => setDeleteModal(prev => ({ 
                          ...prev, 
                          selectedDateForDay: e.target.value,
                          date: e.target.value
                        }))} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                )}

                {deleteModal.scope === "date" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                    <input 
                      type="date" 
                      value={deleteModal.date} 
                      onChange={(e) => setDeleteModal(prev => ({ ...prev, date: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                )}

                {deleteModal.scope === "dateRange" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input 
                        type="date" 
                        value={deleteModal.startDate} 
                        onChange={(e) => setDeleteModal(prev => ({ ...prev, startDate: e.target.value }))} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input 
                        type="date" 
                        value={deleteModal.endDate} 
                        onChange={(e) => setDeleteModal(prev => ({ ...prev, endDate: e.target.value }))} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                )}
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Delete Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scope:</span>
                      <span className="font-bold text-red-700">
                        {deleteModal.scope === "singleDay" && "Single Day for One Employee"}
                        {deleteModal.scope === "selected" && `Selected Employees (${deleteModal.employeeIds.size || selectedEmployeeIds.size})`}
                        {deleteModal.scope === "all" && "All Employees"}
                        {deleteModal.scope === "date" && "Specific Date"}
                        {deleteModal.scope === "dateRange" && "Date Range"}
                      </span>
                    </div>
                    {deleteModal.scope === "singleDay" && deleteModal.selectedEmployeeForDay && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employee:</span>
                        <span className="font-bold text-red-700">
                          {employees.find(e => e.id === deleteModal.selectedEmployeeForDay)?.firstName} {employees.find(e => e.id === deleteModal.selectedEmployeeForDay)?.lastName}
                        </span>
                      </div>
                    )}
                    {(deleteModal.date || deleteModal.selectedDateForDay) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-bold text-red-700">{deleteModal.selectedDateForDay || deleteModal.date}</span>
                      </div>
                    )}
                    {deleteModal.startDate && deleteModal.endDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Range:</span>
                        <span className="font-bold text-red-700">{deleteModal.startDate} to {deleteModal.endDate}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>Warning:</strong> This action will permanently delete timesheet records from the database. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button 
                onClick={() => setDeleteModal({ open: false, scope: "selected", date: "", startDate: "", endDate: "", employeeIds: new Set(), selectedEmployeeForDay: null, selectedDateForDay: "", isDeleting: false })} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={deleteModal.isDeleting}
              >
                Cancel
              </button>
              <button 
                onClick={deleteTimesheetRecords} 
                disabled={
                  deleteModal.isDeleting || 
                  (deleteModal.scope === "singleDay" && (!deleteModal.selectedEmployeeForDay || !deleteModal.selectedDateForDay)) ||
                  (deleteModal.scope === "date" && !deleteModal.date) ||
                  (deleteModal.scope === "dateRange" && (!deleteModal.startDate || !deleteModal.endDate))
                } 
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 font-medium transition-all duration-200 shadow disabled:opacity-50 flex items-center gap-2"
              >
                {deleteModal.isDeleting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkPanelOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Bulk Actions</h2>
                <p className="text-gray-600 mt-2">
                  Apply settings to <span className="font-bold text-indigo-700">{selectedEmployeeIds.size}</span> selected employees
                </p>
              </div>
              <button onClick={() => setBulkPanelOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[60vh]">
              <div className="space-y-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-500" />
                    Scope Selection
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: "period", label: "Current Period", desc: `${days.length} days` },
                      { value: "date", label: "Single Date", desc: "Specific day" },
                      { value: "customRange", label: "Custom Range", desc: "Date range" },
                      { value: "selectedDates", label: "Selected Dates", desc: "Pick dates" }
                    ].map((option) => (
                      <label key={option.value} className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all duration-200 ${bulkAction.scope === option.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="radio" value={option.value} checked={bulkAction.scope === option.value} onChange={(e) => setBulkAction(prev => ({ ...prev, scope: e.target.value }))} className="text-indigo-600" />
                          <span className="font-medium">{option.label}</span>
                        </div>
                        <span className="text-sm text-gray-500">{option.desc}</span>
                      </label>
                    ))}
                  </div>
                  
                  {bulkAction.scope === "date" && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                      <input type="date" value={bulkAction.date} onChange={(e) => setBulkAction(prev => ({ ...prev, date: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  )}
                  
                  {bulkAction.scope === "customRange" && (
                    <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input type="date" value={bulkAction.startDate} onChange={(e) => setBulkAction(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input type="date" value={bulkAction.endDate} onChange={(e) => setBulkAction(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>
                  )}

                  {bulkAction.scope === "selectedDates" && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specific Dates (comma or new line)
                      </label>
                      <textarea
                        value={bulkAction.selectedDatesText}
                        onChange={(e) => {
                          const v = e.target.value;
                          const parsed = parseBulkDateList(v);
                          setBulkAction({
                            ...bulkAction,
                            selectedDatesText: v,
                            selectedDates: parsed
                          });
                        }}
                        rows={3}
                        className="w-full p-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Examples: 1/1/26, 1/4/26&#10;Or: 2026-01-01, 2026-01-04"
                      />
                      <div className="mt-2 text-xs text-gray-600">
                        Parsed dates:{" "}
                        {bulkAction.selectedDates?.length ? bulkAction.selectedDates.join(", ") : "—"}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <UserCheck size={18} className="text-green-500" />
                    Attendance Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Code</label>
                      <select value={bulkAction.attendanceCode} onChange={(e) => setBulkAction(prev => ({ ...prev, attendanceCode: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        <option value="P">Present (P)</option>
                        <option value="A">Absent (A)</option>
                        <option value="L">Leave (L)</option>
                        <option value="H">Holiday (H)</option>
                        <option value="S">Sick (S)</option>
                        <option value="WP">Weekend Present (WP)</option>
                        <option value="HP">Holiday Present (HP)</option>
                        <option value="OFF">Off Day (OFF)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={bulkAction.onlyUpdateExistingP}
                        onChange={(e) => setBulkAction({ ...bulkAction, onlyUpdateExistingP: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        When applying <span className="font-semibold">P</span>, only update dates already marked as <span className="font-semibold">P</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Normal Hours (NH)</label>
                        <input type="number" value={bulkAction.totalHours} onChange={(e) => setBulkAction(prev => ({ ...prev, totalHours: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" min="0" max="24" step="0.5" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Overtime Hours (OT)</label>
                        <input type="number" value={bulkAction.overtimeHours} onChange={(e) => setBulkAction(prev => ({ ...prev, overtimeHours: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" min="0" max="24" step="0.5" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <Filter size={18} className="text-purple-500" />
                    Conditional Logic
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <input type="checkbox" checked={bulkAction.conditionalLogic.enabled} onChange={(e) => setBulkAction(prev => ({ ...prev, conditionalLogic: { ...prev.conditionalLogic, enabled: e.target.checked } }))} className="h-5 w-5 text-purple-600 rounded" />
                      <div>
                        <span className="font-medium text-gray-800">Enable Conditional Logic</span>
                        <p className="text-sm text-gray-600 mt-1">Apply only when specific conditions are met</p>
                      </div>
                    </div>
                    
                    {bulkAction.conditionalLogic.enabled && (
                      <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <select value={bulkAction.conditionalLogic.conditionType} onChange={(e) => setBulkAction(prev => ({ ...prev, conditionalLogic: { ...prev.conditionalLogic, conditionType: e.target.value } }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                          <option value="nhEquals">If NH equals</option>
                          <option value="statusEquals">If Status equals</option>
                          <option value="both">If both match</option>
                        </select>
                        
                        <input type="text" placeholder="Value to match" value={bulkAction.conditionalLogic.conditionValue} onChange={(e) => setBulkAction(prev => ({ ...prev, conditionalLogic: { ...prev.conditionalLogic, conditionValue: e.target.value } }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                        
                        <select value={bulkAction.conditionalLogic.thenAction} onChange={(e) => setBulkAction(prev => ({ ...prev, conditionalLogic: { ...prev.conditionalLogic, thenAction: e.target.value } }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                          <option value="setOvertime">Then set OT to</option>
                          <option value="setHours">Then set NH to</option>
                          <option value="setBoth">Then set both</option>
                        </select>
                        
                        <input type="text" placeholder="Value to set" value={bulkAction.conditionalLogic.thenValue} onChange={(e) => setBulkAction(prev => ({ ...prev, conditionalLogic: { ...prev.conditionalLogic, thenValue: e.target.value } }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <h4 className="font-bold text-blue-800 text-lg mb-4">Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                      <div className="text-sm text-gray-500">Employees</div>
                      <div className="text-xl font-bold text-blue-700">{selectedEmployeeIds.size}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                      <div className="text-sm text-gray-500">Scope</div>
                      <div className="text-sm font-medium text-blue-700">
                        {bulkAction.scope === "period" ? `Period (${days.length} days)` : 
                         bulkAction.scope === "date" ? `Single date` : 
                         bulkAction.scope === "customRange" ? "Custom range" : "Selected dates"}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                      <div className="text-sm text-gray-500">Code</div>
                      <div className="text-xl font-bold text-green-700">{bulkAction.attendanceCode}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                      <div className="text-sm text-gray-500">Hours (NH/OT)</div>
                      <div className="text-sm font-medium text-blue-700">
                        {bulkAction.totalHours}h / {bulkAction.overtimeHours}h
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-8 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <strong>Note:</strong> This will update UI state only. Click "Save Selected" to save to database.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setBulkPanelOpen(false)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium">
                  Cancel
                </button>
                <button onClick={() => { applyBulkToSelected(); setBulkPanelOpen(false); }} className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 font-medium transition-all duration-200 shadow">
                  Apply to Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Import Excel Attendance</h2>
                <p className="text-gray-600 mt-2">
                  Found <span className="font-bold text-green-700">{importPreview.length}</span> matches, <span className="font-bold text-red-700">{importErrors.length}</span> unmatched
                </p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[60vh]">
              {importPreview.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-green-600 text-lg mb-4 flex items-center gap-2">
                    <Check size={20} />
                    {importPreview.length} Employees Matched Successfully
                  </h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-r">Excel Row</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-r">Imported Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-r">Matched To</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-r">Staff ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-r">Days Imported</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importPreview.slice(0, 20).map((item, idx) => (
                          <tr key={idx} className="hover:bg-green-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-500 border-r">{item.rowNumber}</td>
                            <td className="px-4 py-3 text-sm font-medium border-r">{item.originalName}</td>
                            <td className="px-4 py-3 text-sm border-r">
                              {item.employee.firstName} {item.employee.lastName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 border-r">
                              {item.employee.employeeId || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm border-r">
                              <div className="flex flex-col gap-1">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {item.daysCount} days
                                </span>
                                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                  Codes: {Object.values(item.attendance).map(a => a.code).join(', ')}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                                ✓ Ready
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {importErrors.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-red-600 text-lg mb-4 flex items-center gap-2">
                    <AlertCircle size={20} />
                    {importErrors.length} Unmatched Employees
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <p className="text-sm text-red-700 mb-4">
                      These employees from the Excel file were not found in your system.
                      They will not be imported. You may need to add them first.
                    </p>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left px-2 py-2 text-red-800 font-medium">Row</th>
                            <th className="text-left px-2 py-2 text-red-800 font-medium">Excel Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importErrors.slice(0, 10).map((error, idx) => (
                            <tr key={idx} className="border-b border-red-100 last:border-0">
                              <td className="px-2 py-2 text-red-700">{error.rowNumber}</td>
                              <td className="px-2 py-2 text-red-700 font-medium">{error.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              {importPreview.length > 0 && (
                <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                  <h4 className="font-bold text-blue-800 text-lg mb-3">Import Information</h4>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>• Dates will be imported for the detected month/year</p>
                    <p>• <strong>"O" (Off Day) will be converted to "P" (Present) with standard hours</strong></p>
                    <p>• Attendance codes will override existing data</p>
                    <p>• Hours will be auto-set: Present = standard hours, Others = 0</p>
                    <p>• Weekend days will be automatically marked as WP when P is found</p>
                    <p>• Both uppercase and lowercase 'P' are accepted</p>
                  </div>
                </div>
              )}
              
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-700 text-lg mb-4">Excel Code Mapping</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    { code: 'P/p', name: 'Present', color: 'green' },
                    { code: 'O', name: 'Off Day (→Present)', color: 'teal' },
                    { code: 'A', name: 'Absent', color: 'red' },
                    { code: 'L', name: 'Leave', color: 'blue' },
                    { code: 'H', name: 'Holiday', color: 'yellow' },
                    { code: 'S', name: 'Sick Leave', color: 'orange' },
                    { code: 'WP', name: 'Weekend Present', color: 'indigo' },
                    { code: 'HP', name: 'Holiday Present', color: 'purple' },
                    { code: 'P/M L', name: 'Maternity Leave', color: 'pink' },
                  ].map((item) => (
                    <div key={item.code} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <span className={`w-8 h-8 flex items-center justify-center bg-${item.color}-100 text-${item.color}-800 rounded-lg font-bold shadow-sm`}>
                        {item.code}
                      </span>
                      <span className="font-medium text-gray-700">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-8 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <strong>Note:</strong> {importPreview.length} employees ready for import
                {importErrors.length > 0 && `, ${importErrors.length} will be skipped`}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium">
                  Cancel
                </button>
                <button onClick={applyImportedData} disabled={importPreview.length === 0 || isSavingImport} className={`px-8 py-3 rounded-lg font-medium flex items-center gap-3 transition-all duration-200 ${ importPreview.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow' }`}>
                  {isSavingImport ? ( <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </> ) : ( <>
                    <Check size={18} />
                    <span>Import {importPreview.length} Employee{importPreview.length !== 1 ? 's' : ''}</span>
                  </> )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hourConfigModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-gray-800">Configure Hours</h2>
              <p className="text-gray-600 mt-2">
                {hourConfigModal.employeeName} • {hourConfigModal.date}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Attendance: <span className={`font-bold px-2 py-1 rounded ${getAttendanceCodeColor(hourConfigModal.attendanceCode)}`}>
                  {hourConfigModal.attendanceCode}
                </span>
                {(hourConfigModal.attendanceCode === 'P' || hourConfigModal.attendanceCode === 'WP' || hourConfigModal.attendanceCode === 'HP') && (
                  <span className="ml-3 text-blue-600 font-medium">
                    (Standard: {hourConfigModal.standardHours}h)
                  </span>
                )}
              </p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-800 text-lg mb-3">Code Settings for "{hourConfigModal.attendanceCode}"</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Caps at standard hours:</span>
                    <span className={`px-3 py-1 rounded-full font-medium ${attendanceCodeSettings[hourConfigModal.attendanceCode]?.capNH ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {attendanceCodeSettings[hourConfigModal.attendanceCode]?.capNH ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Allows overtime:</span>
                    <span className={`px-3 py-1 rounded-full font-medium ${attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Default NH:</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                      {attendanceCodeSettings[hourConfigModal.attendanceCode]?.defaultNH || 0}h
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Normal Hours (NH)
                    <span className="text-gray-500 text-sm font-normal ml-2">
                      Max: {attendanceCodeSettings[hourConfigModal.attendanceCode]?.capNH ? 
                        `${hourConfigModal.standardHours}h (capped)` : 'Unlimited'}
                    </span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input type="number" value={hourConfigModal.currentNH} onChange={(e) => setHourConfigModal(prev => ({ ...prev, currentNH: parseFloat(e.target.value) || 0 }))} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg" min="0" max={attendanceCodeSettings[hourConfigModal.attendanceCode]?.capNH ? hourConfigModal.standardHours : 24} step="0.5" />
                    <div className="flex gap-2">
                      {[4, 6, 8, 10, 12].map(hours => (
                        <button key={hours} onClick={() => setHourConfigModal(prev => ({ ...prev, currentNH: attendanceCodeSettings[prev.attendanceCode]?.capNH ? Math.min(hours, hourConfigModal.standardHours) : hours }))} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                          {hours}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Overtime Hours (OT)
                    {!attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT && (
                      <span className="text-red-500 text-sm font-normal ml-2">Not allowed for this code</span>
                    )}
                  </label>
                  <div className="flex items-center gap-4">
                    <input type="number" value={hourConfigModal.currentOT} onChange={(e) => setHourConfigModal(prev => ({ ...prev, currentOT: attendanceCodeSettings[prev.attendanceCode]?.allowOT ? (parseFloat(e.target.value) || 0) : 0 }))} className={`flex-1 px-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 ${ !attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500' }`} min="0" max="24" step="0.5" disabled={!attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT} />
                    <div className="flex gap-2">
                      {[0, 2, 4, 6, 8].map(hours => (
                        <button key={hours} onClick={() => { if (attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT) { setHourConfigModal(prev => ({ ...prev, currentOT: hours })); } }} disabled={!attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${ !attendanceCodeSettings[hourConfigModal.attendanceCode]?.allowOT ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200' }`}>
                          {hours}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-lg">Total Hours:</span>
                    <span className="font-bold text-2xl text-blue-700">
                      {(hourConfigModal.currentNH + hourConfigModal.currentOT).toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-3">
                    <span>NH: {hourConfigModal.currentNH}h</span>
                    <span>OT: {hourConfigModal.currentOT}h</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-8 border-t border-gray-200">
              <button onClick={() => { const settings = attendanceCodeSettings[hourConfigModal.attendanceCode] || attendanceCodeSettings.P; setHourConfigModal({ ...hourConfigModal, currentNH: settings.defaultNH || hourConfigModal.standardHours, currentOT: 0 }); }} className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                Reset to Defaults
              </button>
              
              <div className="flex gap-3">
                <button onClick={() => setHourConfigModal({ ...hourConfigModal, open: false })} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                  Cancel
                </button>
                <button onClick={() => { const { employeeId, dateStr } = hourConfigModal; setEmployeeNormalHours(prev => ({ ...prev, [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: String(hourConfigModal.currentNH) } })); setEmployeeHours(prev => ({ ...prev, [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: String(hourConfigModal.currentNH + hourConfigModal.currentOT) } })); setEmployeeOvertime(prev => ({ ...prev, [employeeId]: { ...(prev[employeeId] || {}), [dateStr]: String(hourConfigModal.currentOT) } })); setHourConfigModal({ ...hourConfigModal, open: false }); }} className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium transition-all duration-200 shadow">
                  Save Hours
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCodeSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Attendance Code Settings</h2>
                <p className="text-gray-600 mt-2">Configure default hours and rules for each attendance code</p>
              </div>
              <button onClick={() => setShowCodeSettings(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(attendanceCodeSettings).map(([code, settings]) => (
                  <div key={code} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`text-2xl font-bold px-3 py-2 rounded-lg ${getAttendanceCodeColor(code)}`}>
                          {code}
                        </span>
                        <div className="text-sm text-gray-500 mt-2">{settings.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-700">{settings.defaultNH}h</div>
                        <div className="text-xs text-gray-500">Default NH</div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={settings.capNH} onChange={(e) => setAttendanceCodeSettings(prev => ({ ...prev, [code]: { ...prev[code], capNH: e.target.checked } }))} className="h-4 w-4 text-amber-600 rounded" />
                          <span>Cap at standard hours</span>
                        </label>
                        <span className={`px-2 py-1 text-xs rounded-full ${settings.capNH ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {settings.capNH ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={settings.allowOT} onChange={(e) => setAttendanceCodeSettings(prev => ({ ...prev, [code]: { ...prev[code], allowOT: e.target.checked } }))} className="h-4 w-4 text-amber-600 rounded" />
                          <span>Allow overtime</span>
                        </label>
                        <span className={`px-2 py-1 text-xs rounded-full ${settings.allowOT ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {settings.allowOT ? 'Allowed' : 'Not Allowed'}
                        </span>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Normal Hours (NH):</label>
                        <div className="flex items-center gap-3">
                          <input type="number" value={settings.defaultNH} onChange={(e) => setAttendanceCodeSettings(prev => ({ ...prev, [code]: { ...prev[code], defaultNH: parseFloat(e.target.value) || 0 } }))} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" min="0" max="24" step="0.5" />
                          <div className="flex gap-1">
                            {[0, 4, 6, 8, 10, 12].map(hours => (
                              <button key={hours} onClick={() => setAttendanceCodeSettings(prev => ({ ...prev, [code]: { ...prev[code], defaultNH: hours } }))} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                                {hours}h
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-800 text-lg mb-3 flex items-center gap-2">
                  <Info size={20} />
                  Configuration Guidelines
                </h4>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li>• <strong>Cap at standard hours:</strong> Limits NH to employee's standard hours (e.g., 8h)</li>
                  <li>• <strong>Allow overtime:</strong> Enables overtime hours input for this code</li>
                  <li>• <strong>Default NH:</strong> Pre-filled normal hours when code is selected</li>
                  <li>• Present codes (P, WP, HP) typically allow overtime</li>
                  <li>• Leave/absence codes (L, S, ML, PL) typically don't allow overtime</li>
                  <li>• Zero-hour codes (A, OFF) have NH=0 by default</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-8 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Changes apply immediately to new attendance entries
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAttendanceCodeSettings({
                  P: { capNH: false, defaultNH: 8, allowOT: true, description: "Regular Present" },
                  WP: { capNH: false, defaultNH: 8, allowOT: true, description: "Weekend Present" },
                  HP: { capNH: false, defaultNH: 8, allowOT: true, description: "Holiday Present" },
                  H: { capNH: false, defaultNH: 8, allowOT: false, description: "Holiday" },
                  L: { capNH: false, defaultNH: 8, allowOT: false, description: "Leave" },
                  S: { capNH: false, defaultNH: 8, allowOT: false, description: "Sick Leave" },
                  ML: { capNH: false, defaultNH: 8, allowOT: false, description: "Maternity Leave" },
                  PL: { capNH: false, defaultNH: 8, allowOT: false, description: "Paternity Leave" },
                  OFF: { capNH: false, defaultNH: 0, allowOT: false, description: "Off Day" },
                  A: { capNH: false, defaultNH: 0, allowOT: false, description: "Absent" }
                })} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors">
                  Reset to Defaults
                </button>
                <button 
                  onClick={() => { 
                    saveAttendanceCodeSettings(); 
                    setShowCodeSettings(false); 
                  }} 
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 font-medium transition-all duration-200 shadow"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Timesheet;
