/**

 * Attendance.jsx – Complete Attendance Management Component

 * 

 * This component handles:

 * - Displaying attendance records with filtering, search, and category selection

 * - Creating new attendance records (single or range) with employee selection

 * - Editing and deleting individual records

 * - Batch updating check‑in/out times for multiple selected records

 * - Syncing with timesheets and biometric import

 * - Date filtering (single, range, all)

 * - Hiding/clearing records for specific dates

 * - Export to CSV and Excel template generation

 * - Validation of attendance records

 * 

 * Navigation comments are provided for easy orientation.

 */



// ============================================================

// 1. IMPORTS

// ============================================================

import { useState, useEffect, useRef, useMemo } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import * as XLSX from 'xlsx';

import MainSidebar from "../mainSidebar";

import Search from "../../../components/search";

import {

  Download,

  Clock,

  Filter,

  RotateCcw,

  ChevronDown,

  ChevronUp,

  X,

  Search as SearchIcon

  ,FileCheck

} from "lucide-react";

import TimesheetAttendanceSync from '../../../components/sync/TimesheetAttendanceSync';

import Header from "../../../components/Header";

import BiometricStatus from './BiometricStatus';



// ============================================================

// 2. CONSTANTS

// ============================================================

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



// ============================================================

// 3. MAIN COMPONENT

// ============================================================

function Attendance() {

  // ------------------------------------------------------------

  // 3a. State – UI & Modal Controls

  // ------------------------------------------------------------

  const [query, setQuery] = useState('');

  const [settings, setSettings] = useState({

    hourlyRate: 10,

    overtimeHourlyRate: 15,

    weekendDays: [0, 6],

    holidays: [],

    specialWeekends: [],

    standardWorkHours: 8,

    weekendRate: 1.25,

    holidayRate: 1.5,

    doubleTimeOnSunday: false,

    timeAndHalfAfter8Hours: false,

    jobPositions: [],

    categories: [],

    lateArrivalTime: '09:00'

  });

  

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const [employees, setEmployees] = useState([]);

  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState(new Set());

  const [attendanceFilter, setAttendanceFilter] = useState('all');

  const [showAttendanceFilters, setShowAttendanceFilters] = useState(false);

  const [showAdvancedTimeFilters, setShowAdvancedTimeFilters] = useState(false);

  const [timeFilters, setTimeFilters] = useState({

    checkInOperator: '',

    checkInTime: '',

    checkOutOperator: '',

    checkOutTime: ''

  });

  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  const [editingAttendanceId, setEditingAttendanceId] = useState(null);

  const [showExcludedEmployees, setShowExcludedEmployees] = useState(false);

  const [showHidden, setShowHidden] = useState(false);

  const [showBiometricImport, setShowBiometricImport] = useState(false);

  const [showDatePanel, setShowDatePanel] = useState(false);

  const [showSyncPanel, setShowSyncPanel] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(false);

  const [pendingAttendanceRequestCount, setPendingAttendanceRequestCount] = useState(0);

  const [isValidating, setIsValidating] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  const [biometricImporting, setBiometricImporting] = useState(false);



  // ------------------------------------------------------------

  // 3b. State – Data

  // ------------------------------------------------------------

  const [attendances, setAttendances] = useState([]);
  const [attendancePage, setAttendancePage] = useState(0);
  const [attendancePageSize, setAttendancePageSize] = useState(100);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(0);
  const [attendanceTotalRecords, setAttendanceTotalRecords] = useState(0);

  const [leaves, setLeaves] = useState([]);

  const [leavesData, setLeavesData] = useState([]);

  const [overtimes, setOvertimes] = useState([]);

  const [error, setError] = useState('');

  const [searchResults, setSearchResults] = useState([]);

  const [excelData, setExcelData] = useState([]);

  const [showExcelPreview, setShowExcelPreview] = useState(false);

  const [excelFileName, setExcelFileName] = useState('');

  const [selectedDateToClear, setSelectedDateToClear] = useState('');

  const [biometricImportResult, setBiometricImportResult] = useState(null);

  const [biometricError, setBiometricError] = useState(null);

  const [processedBiometricData, setProcessedBiometricData] = useState(null);

  const [syncResult, setSyncResult] = useState(null);

  const [syncHistory, setSyncHistory] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  const [isAllSelected, setIsAllSelected] = useState(false);

  const [selectAllEmployees, setSelectAllEmployees] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [totalMinimumAmount, setTotalMinimumAmount] = useState(0);

  const [totalOvertimeAmount, setTotalOvertimeAmount] = useState(0);



  // ------------------------------------------------------------

  // 3c. State – Date Filtering (improved single source of truth)

  // ------------------------------------------------------------

  const [dateFilterMode, setDateFilterMode] = useState("single");

  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);

  const [rangeStart, setRangeStart] = useState(new Date().toISOString().split('T')[0]);

  const [rangeEnd, setRangeEnd] = useState(new Date().toISOString().split('T')[0]);



  // ------------------------------------------------------------

  // 3d. State – Create/Edit Form

  // ------------------------------------------------------------

  const [createDateMode, setCreateDateMode] = useState("single");

  const [createRangeStart, setCreateRangeStart] = useState(new Date().toISOString().split('T')[0]);

  const [createRangeEnd, setCreateRangeEnd] = useState(new Date().toISOString().split('T')[0]);

  const [isEditing, setIsEditing] = useState(false);

  const [newAttendance, setNewAttendance] = useState({

    employee: { id: '' },

    shift: '',

    workType: '',

    category: '',

    date: new Date().toISOString().split('T')[0],

    status: '',

    minimumHour: '',

    checkIn: '',

    checkOut: '',

  });

  const [newHoliday, setNewHoliday] = useState({

    date: '',

    name: '',

    recurring: false

  });



  // ------------------------------------------------------------

  // 3e. State – Batch Update (NEW)

  // ------------------------------------------------------------

  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);

  const [batchUpdateData, setBatchUpdateData] = useState({ checkIn: '', checkOut: '' });

  const [batchUpdating, setBatchUpdating] = useState(false);



  // ------------------------------------------------------------

  // 3f. State – Cleared Dates (from localStorage)

  // ------------------------------------------------------------

  const [clearedDates, setClearedDates] = useState(() => {

    const saved = localStorage.getItem('clearedAttendanceDates');

    return saved ? JSON.parse(saved) : [];

  });



  // ------------------------------------------------------------

  // 3g. State – Popup Menu (right-click)

  // ------------------------------------------------------------

  const [popupMenu, setPopupMenu] = useState({

    isOpen: false,

    attendanceId: null,

    position: { x: 0, y: 0 }

  });



  // ------------------------------------------------------------

  // 3h. Refs

  // ------------------------------------------------------------

  const createMenuRef = useRef(null);

  const navigate = useNavigate();

  const location = useLocation();



  // ------------------------------------------------------------

  // 3i. Helper: API base URL

  // ------------------------------------------------------------

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

  const fetchPendingAttendanceRequestCount = async () => {

    try {

      const token = localStorage.getItem('jwtToken');

      if (!token) return;

      const params = new URLSearchParams({ status: 'Pending', page: '0', size: '1' });

      const response = await fetch(`${API_BASE_URL}/api/attendance-requests?${params.toString()}`, {

        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      });

      if (!response.ok) return;

      const data = await response.json();

      const count = Array.isArray(data)

        ? data.length

        : Number(data.totalElements ?? data.totalCount ?? data.count ?? data.content?.length ?? 0);

      setPendingAttendanceRequestCount(Number.isFinite(count) ? count : 0);

    } catch (requestError) {

      console.warn('Could not load pending attendance request count:', requestError);

    }

  };



  // ============================================================

  // 4. HELPER FUNCTIONS

  // ============================================================

  const getToken = () => localStorage.getItem('jwtToken');



  const getSelectedEmployeeIdsFromAttendances = () => {

    const employeeIds = new Set();

    attendances.forEach(attendance => {

      if (selectedAttendanceIds.has(attendance.id) && attendance.employee?.id) {

        employeeIds.add(attendance.employee.id);

      }

    });

    return employeeIds;

  };



  // Collect the employee IDs and attendance dates selected in the table.

  // TimesheetAttendanceSync expects employeeIds as a Set and dates as an array.

  const syncDataFromSelectedAttendances = useMemo(() => {

    const employeeIds = new Set();

    const dates = new Set();



    attendances.forEach((attendance) => {

      if (!selectedAttendanceIds.has(attendance.id)) return;



      const employeeId = attendance.employee?.id ?? attendance.employeeId;

      if (employeeId !== null && employeeId !== undefined) {

        employeeIds.add(employeeId);

      }



      if (attendance.date) {

        dates.add(attendance.date);

      }

    });



    return {

      employeeIds,

      dates: Array.from(dates)

    };

  }, [attendances, selectedAttendanceIds]);



  const getActiveDateRange = () => {

    if (dateFilterMode === 'range' && rangeStart && rangeEnd) {

      return { start: rangeStart, end: rangeEnd };

    } else if (dateFilterMode === 'single' && singleDate) {

      return { start: singleDate, end: singleDate };

    } else {

      return { start: '2000-01-01', end: '2099-12-31' };

    }

  };



  const getFilterDisplayText = () => {

    if (dateFilterMode === 'range' && rangeStart && rangeEnd) {

      return `📅 ${rangeStart} to ${rangeEnd}`;

    } else if (dateFilterMode === 'single' && singleDate) {

      const date = new Date(singleDate);

      return `📅 ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    } else {

      return `📅 All Dates (${attendances.length} records)`;

    }

  };



  const toISODate = (d) => d.toISOString().split("T")[0];



  const getDatesInRange = (startStr, endStr) => {

    if (!startStr || !endStr) return [];

    const start = new Date(startStr);

    const end = new Date(endStr);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    if (start > end) return [];



    const dates = [];

    const cur = new Date(start);

    while (cur <= end) {

      dates.push(toISODate(cur));

      cur.setDate(cur.getDate() + 1);

    }

    return dates;

  };



  const formatTimeToHHMMSS = (time) => {

    if (!time) return null;

    if (time.length === 5) return `${time}:00`;

    if (time.length === 8) return time;

    const [h, m] = time.split(':');

    return `${h}:${m}:00`;

  };



  const calculateHours = (checkIn, checkOut) => {

    if (!checkIn || !checkOut) return 0;

    try {

      const [inHour, inMinute] = checkIn.split(':').map(Number);

      const [outHour, outMinute] = checkOut.split(':').map(Number);

      const totalInMinutes = inHour * 60 + inMinute;

      const totalOutMinutes = outHour * 60 + outMinute;

      const diffMinutes = totalOutMinutes - totalInMinutes;

      return (diffMinutes / 60).toFixed(2);

    } catch (e) {

      console.error('Error calculating hours:', e);

      return 0;

    }

  };



  const determineShift = (checkInTime) => {

    if (!checkInTime) return 'Day';

    const [hours] = checkInTime.split(':').map(Number);

    return hours >= 18 || hours < 6 ? 'Night' : 'Day';

  };



  const isWeekend = (dateString) => {

    const date = new Date(dateString);

    const dayOfWeek = date.getDay();

    return settings.weekendDays.includes(dayOfWeek);

  };



  const isHoliday = (dateString) => {

    return settings.holidays.some(holiday => holiday.date === dateString);

  };



  const isSpecialWeekend = (dateString) => {

    return settings.specialWeekends?.some(specialWeekend => 

      specialWeekend.date === dateString

    ) || false;

  };



  const getEmployeeStandardHours = (employee) => {

    if (!employee) return settings.standardWorkHours || 0;

    if (employee.category && typeof employee.category === 'string') {

      const category = settings.categories?.find(cat => 

        cat.name && typeof cat.name === 'string' &&

        cat.name.toLowerCase() === employee.category.toLowerCase()

      );

      if (category?.standardRateHours !== undefined) {

        return category.standardRateHours;

      }

    }

    return settings.standardWorkHours;

  };



  const getEmployeeWorkStartTime = (employee) => {

    if (!employee) return settings.lateArrivalTime || '09:00';

    if (employee.category && typeof employee.category === 'string') {

      const category = settings.categories?.find(cat => 

        cat.name && typeof cat.name === 'string' &&

        cat.name.toLowerCase() === employee.category.toLowerCase()

      );

      if (category?.workStartTime) {

        return category.workStartTime;

      }

    }

    return settings.lateArrivalTime || '09:00';

  };



  const getStatusOptions = (dateString) => {

    if (isHoliday(dateString)) {

      return [

        { value: "Holiday Present", label: "Holiday Present" },

        { value: "Absent", label: "Absent" }

      ];

    } else if (isSpecialWeekend(dateString)) {

      const specialWeekend = settings.specialWeekends?.find(sw => sw.date === dateString);

      const label = `Special Weekend (${specialWeekend?.name || 'Special'})`;

      return [

        { value: "Special Weekend Present", label },

        { value: "Absent", label: "Absent" }

      ];

    } else if (isWeekend(dateString)) {

      return [

        { value: "Weekend Present", label: "Weekend Present" },

        { value: "Absent", label: "Absent" }

      ];

    } else {

      return [

        { value: "Present", label: "Present" },

        { value: "Absent", label: "Absent" },

        { value: "Late", label: "Late" }

      ];

    }

  };



  const getStatusDisplay = (attendance) => {

    const date = attendance.date;

    const hasCheckIn = attendance.checkIn && attendance.checkIn !== '--:--';

    const hasCheckOut = attendance.checkOut && attendance.checkOut !== '--:--';

    

    if (hasCheckIn && !hasCheckOut) {

      return {

        text: 'Half Day (Checked In)',

        class: 'bg-yellow-100 text-yellow-800'

      };

    }

    if (!hasCheckIn && hasCheckOut) {

      return {

        text: 'Half Day (Checked Out)',

        class: 'bg-yellow-100 text-yellow-800'

      };

    }

    if (isHoliday(date)) {

      return {

        text: 'Holiday Present',

        class: 'bg-purple-100 text-purple-800'

      };

    } else if (isSpecialWeekend(date)) {

      const specialWeekend = settings.specialWeekends?.find(sw => sw.date === date);

      return {

        text: `Special Weekend (${specialWeekend?.name || 'Special'})`,

        class: 'bg-indigo-100 text-indigo-800'

      };

    } else if (isWeekend(date)) {

      return {

        text: 'Weekend Present',

        class: 'bg-amber-100 text-amber-800'

      };

    } else {

      return {

        text: attendance.status || 'Present',

        class: attendance.status === 'Present' ? 'bg-green-100 text-green-800' :

               attendance.status === 'Absent' ? 'bg-red-100 text-red-800' :

               attendance.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :

               attendance.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :

               attendance.status === 'On Leave' ? 'bg-blue-100 text-blue-800' :

               attendance.status === 'Sick' ? 'bg-orange-100 text-orange-800' :

               attendance.status === 'Maternity Leave' ? 'bg-pink-100 text-pink-800' :

               attendance.status === 'Paternity Leave' ? 'bg-teal-100 text-teal-800' :

               attendance.status === 'Off Day' ? 'bg-gray-100 text-gray-800' :

               'bg-gray-100 text-gray-800'

      };

    }

  };



  // ------------------------------------------------------------

  // 4a. Custom attendance time-filter helpers

  // ------------------------------------------------------------

  const TIME_OPERATOR_LABELS = {

    before: 'before',

    before_or_equal: 'at or before',

    equal: 'exactly',

    after_or_equal: 'at or after',

    after: 'after'

  };



  const timeToMinutes = (time) => {

    if (time === null || time === undefined || time === '' || time === '--:--') {

      return null;

    }



    const normalizedTime = String(time).trim().substring(0, 5);

    const [hours, minutes] = normalizedTime.split(':').map(Number);



    if (

      Number.isNaN(hours) || Number.isNaN(minutes) ||

      hours < 0 || hours > 23 || minutes < 0 || minutes > 59

    ) {

      return null;

    }



    return hours * 60 + minutes;

  };



  const matchesTimeFilter = (attendanceTime, operator, selectedTime) => {

    if (!operator || !selectedTime) return true;



    const attendanceMinutes = timeToMinutes(attendanceTime);

    const selectedMinutes = timeToMinutes(selectedTime);



    // Records without the relevant time are excluded whenever that filter is active.

    if (attendanceMinutes === null || selectedMinutes === null) return false;



    switch (operator) {

      case 'before': return attendanceMinutes < selectedMinutes;

      case 'before_or_equal': return attendanceMinutes <= selectedMinutes;

      case 'equal': return attendanceMinutes === selectedMinutes;

      case 'after_or_equal': return attendanceMinutes >= selectedMinutes;

      case 'after': return attendanceMinutes > selectedMinutes;

      default: return true;

    }

  };



  const formatTimeForDisplay = (time) => {

    if (!time) return '';



    const minutesFromMidnight = timeToMinutes(time);

    if (minutesFromMidnight === null) return time;



    const hours = Math.floor(minutesFromMidnight / 60);

    const minutes = minutesFromMidnight % 60;

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);



    return date.toLocaleTimeString([], {

      hour: '2-digit',

      minute: '2-digit'

    });

  };



  const resetTimeFilters = () => {

    setTimeFilters({

      checkInOperator: '',

      checkInTime: '',

      checkOutOperator: '',

      checkOutTime: ''

    });

  };



  const resetAllAttendanceFilters = () => {

    setSearchQuery('');

    setSelectedCategoryFilter('');

    setAttendanceFilter('all');

    resetTimeFilters();

  };



  const removeCheckInTimeFilter = () => {

    setTimeFilters((previous) => ({

      ...previous,

      checkInOperator: '',

      checkInTime: ''

    }));

  };



  const removeCheckOutTimeFilter = () => {

    setTimeFilters((previous) => ({

      ...previous,

      checkOutOperator: '',

      checkOutTime: ''

    }));

  };



  const applyTimePreset = (preset) => {

    switch (preset) {

      case 'late_arrivals':

        setTimeFilters((previous) => ({

          ...previous,

          checkInOperator: 'after',

          checkInTime: settings.lateArrivalTime || '09:00'

        }));

        break;

      case 'before_08':

        setTimeFilters((previous) => ({

          ...previous,

          checkInOperator: 'before_or_equal',

          checkInTime: '08:00'

        }));

        break;

      case 'early_checkouts':

        setTimeFilters((previous) => ({

          ...previous,

          checkOutOperator: 'before',

          checkOutTime: '17:00'

        }));

        break;

      case 'after_18':

        setTimeFilters((previous) => ({

          ...previous,

          checkOutOperator: 'after_or_equal',

          checkOutTime: '18:00'

        }));

        break;

      default:

        return;

    }



    setShowAdvancedTimeFilters(true);

  };



  const getUniqueCategories = () => {

    const categories = new Set();

    attendances.forEach(attendance => {

      if (attendance.employee?.category?.name) {

        categories.add(attendance.employee.category.name);

      }

    });

    return Array.from(categories).sort();

  };



  // ============================================================

  // 5. API CALLS (Data Fetching & Mutations)

  // ============================================================



  // 5a. Load settings from backend

  const loadSettings = async () => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/settings/system`, {

        headers: {

          'Authorization': `Bearer ${token}`,

          'Content-Type': 'application/json',

        }

      });

      if (response.ok) {

        const systemSettings = await response.json();

        setSettings(prev => ({

          ...prev,

          ...systemSettings,

          lateArrivalTime: systemSettings.lateArrivalTime || '09:00'

        }));

      }

    } catch (error) {

      console.error('Error loading settings:', error);

    }

  };



  const loadHolidays = async () => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/settings/holidays`, {

        headers: {

          'Authorization': `Bearer ${token}`,

          'Content-Type': 'application/json',

        }

      });

      if (response.ok) {

        const holidays = await response.json();

        setSettings(prev => ({ ...prev, holidays }));

      }

    } catch (error) {

      console.error('Error loading holidays:', error);

    }

  };



  const loadJobPositions = async () => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/settings/job-positions`, {

        headers: {

          'Authorization': `Bearer ${token}`,

          'Content-Type': 'application/json',

        }

      });

      if (response.ok) {

        const positions = await response.json();

        setSettings(prev => ({ ...prev, jobPositions: positions }));

      }

    } catch (error) {

      console.error('Error loading job positions:', error);

    }

  };



  const loadSpecialWeekends = async () => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/settings/special-weekends`, {

        headers: {

          'Authorization': `Bearer ${token}`,

          'Content-Type': 'application/json',

        }

      });

      if (response.ok) {

        const specialWeekends = await response.json();

        setSettings(prev => ({ ...prev, specialWeekends }));

      }

    } catch (error) {

      console.error('Error loading special weekends:', error);

    }

  };



  const loadCategories = async () => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/settings/categories`, {

        headers: {

          'Authorization': `Bearer ${token}`,

          'Content-Type': 'application/json',

        }

      });

      if (response.ok) {

        const categories = await response.json();

        setSettings(prev => ({ ...prev, categories }));

      }

    } catch (error) {

      console.error('Error loading categories:', error);

    }

  };



  const refreshSettings = async () => {

    await loadSettings();

    await loadHolidays();

    await loadJobPositions();

    await loadCategories();

    await loadSpecialWeekends();

  };



  // 5b. Fetch employees

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const selectedDate = dateFilterMode === 'single' ? singleDate : rangeStart;
      if (!selectedDate) { setEmployees([]); return; }
      const response = await fetch(
        `${API_BASE_URL}/api/attendance/available-employees?date=${selectedDate}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (!response.ok) throw new Error(await response.text() || 'Failed to fetch available employees');
      setEmployees(await response.json());
    } catch (err) {
      console.error('Error fetching available employees:', err);
      setError(err.message);
      setEmployees([]);
    }
  };

  const normalizeAttendanceDTO = (record) => {
  if (!record) return null;

  // Legacy entity response already contains a nested employee.
  if (record.employee) {
    return record;
  }

  // Convert the lightweight DTO into the shape already used
  // throughout the existing Attendance.jsx component.
  return {
    id: record.id,
    date: record.date,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    minimumHour: Number(record.minimumHour ?? 0),
    overtime: Number(record.overtime ?? 0),
    standardHours: Number(
      record.standardHours ?? settings.standardWorkHours ?? 8
    ),
    shift: record.shift,
    workType: record.workType,
    status: record.status,
    biometric: Boolean(record.biometric),

    employeeId: record.employeeId,
    employeeNumber: record.employeeNumber,
    firstName: record.firstName,
    lastName: record.lastName,
    categoryId: record.categoryId,
    categoryName: record.categoryName,

    employee: {
      id: record.employeeId,

      // Your entity calls this employeeId, while the DTO property
      // currently exposes it as employeeNumber.
      employeeId: record.employeeNumber,

      firstName: record.firstName,
      lastName: record.lastName,

      category: record.categoryId
        ? {
            id: record.categoryId,
            name: record.categoryName
          }
        : null
    }
  };
};

  // 5c. Fetch attendance with date filtering

const fetchAttendance = async (
  requestedPage = attendancePage
) => {
  setLoading(true);
  setError('');

  try {
    const token = getToken();
    const { start, end } = getActiveDateRange();

    if (!start || !end) {
      throw new Error('Please select a valid attendance date range');
    }

    const selectedCategory = settings.categories?.find(
      (category) =>
        String(category.id) === String(selectedCategoryFilter) ||
        category.name === selectedCategoryFilter
    );

    const categoryId =
      selectedCategory?.id ??
      (
        selectedCategoryFilter &&
        !Number.isNaN(Number(selectedCategoryFilter))
          ? Number(selectedCategoryFilter)
          : null
      );

    const params = new URLSearchParams({
      startDate: start,
      endDate: end,
      page: String(requestedPage),
      size: String(attendancePageSize)
    });

    const normalizedSearch = searchQuery.trim();

    if (normalizedSearch) {
      params.set('search', normalizedSearch);
    }

    if (categoryId) {
      params.set('categoryId', String(categoryId));
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const [attendanceRes, leavesRes] = await Promise.all([
      fetch(
        `${API_BASE_URL}/api/attendance/page?${params.toString()}`,
        { headers }
      ),
      fetch(
        `${API_BASE_URL}/api/leave`,
        { headers }
      )
    ]);

    if (!attendanceRes.ok) {
      const message = await attendanceRes.text();

      throw new Error(
        message ||
        `Failed to fetch attendance: ${attendanceRes.status}`
      );
    }

    const pageData = await attendanceRes.json();

    const rawPageRecords = Array.isArray(pageData.content)
      ? pageData.content
      : [];

    const pageRecords = rawPageRecords
      .map(normalizeAttendanceDTO)
      .filter(Boolean);

    const approvedLeaves = leavesRes.ok
      ? await leavesRes.json()
      : [];

    const leaveAttendanceRecords =
      generateLeaveAttendanceRecords(
        approvedLeaves,
        pageRecords
      );

    const combinedData = [
      ...pageRecords,
      ...leaveAttendanceRecords
    ];

    const visibleRecords = showHidden
      ? combinedData
      : combinedData.filter(
          (attendance) =>
            !clearedDates.includes(attendance.date)
        );

    setAttendances(visibleRecords);

    setAttendancePage(
      Number(pageData.number ?? requestedPage)
    );

    setAttendanceTotalPages(
      Number(pageData.totalPages ?? 0)
    );

    setAttendanceTotalRecords(
      Number(pageData.totalElements ?? 0)
    );

    setSelectedAttendanceIds(new Set());
    setIsAllSelected(false);
  } catch (err) {
    console.error('Error loading attendance:', err);

    setError(
      err instanceof Error
        ? err.message
        : 'Failed to load attendance'
    );

    setAttendances([]);
    setAttendanceTotalPages(0);
    setAttendanceTotalRecords(0);
  } finally {
    setLoading(false);
  }
};



  // 5d. Generate leave attendance records

  const generateLeaveAttendanceRecords = (leavesData, existingAttendance) => {

    const leaveRecords = [];

    const { start, end } = getActiveDateRange();

    const filterStartDate = new Date(start);

    const filterEndDate = new Date(end);

    

    leavesData.forEach(leave => {

      if (leave.status !== 'Approved') return;

      const leaveStartDate = new Date(leave.startDate);

      const leaveEndDate = new Date(leave.endDate);

      const employeeId = leave.employee?.id;

      if (!employeeId) return;

      

      const effectiveStart = new Date(Math.max(leaveStartDate, filterStartDate));

      const effectiveEnd = new Date(Math.min(leaveEndDate, filterEndDate));

      if (effectiveStart > effectiveEnd) return;

      

      const currentDate = new Date(effectiveStart);

      while (currentDate <= effectiveEnd) {

        const dayOfWeek = currentDate.getDay();

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {

          const dateStr = currentDate.toISOString().split('T')[0];

          const existingRecord = existingAttendance.find(att => 

            att.employee?.id === employeeId && att.date === dateStr

          );

          if (!existingRecord) {

            const employee = employees.find(emp => emp.id === employeeId);

            const standardHours = getEmployeeStandardHours(employee);

            leaveRecords.push({

              id: `leave-${leave.id}-${dateStr}`,

              employee: leave.employee,

              date: dateStr,

              checkIn: '--:--',

              checkOut: '--:--',

              minimumHour: standardHours,

              shift: 'Day',

              workType: 'Regular',

              status: 'On Leave',

              leaveBased: true,

              leaveType: leave.leaveType

            });

          }

        }

        currentDate.setDate(currentDate.getDate() + 1);

      }

    });

    return leaveRecords;

  };



  // 5e. Fetch leaves (for exclusion logic)

  const fetchLeaves = async () => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/leave`, {

        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

      });

      if (!response.ok) throw new Error('Failed to fetch leaves');

      const data = await response.json();

      setLeaves(data);

    } catch (err) {

      setError(err.message);

    }

  };



  // 5f. Create or update attendance (single or batch)

  const createAttendance = async () => {

    try {

      const token = getToken();

      

      // ---- EDIT MODE ----

      if (isEditing && editingAttendanceId) {

        const updateData = {

          shift: newAttendance.shift || 'Day',

          workType: newAttendance.workType || 'Regular',

          date: newAttendance.date,

          status: newAttendance.status,

          checkIn: newAttendance.checkIn ? formatTimeToHHMMSS(newAttendance.checkIn) : null,

          checkOut: newAttendance.checkOut ? formatTimeToHHMMSS(newAttendance.checkOut) : null,

        };

        const response = await fetch(`${API_BASE_URL}/api/attendance/${editingAttendanceId}`, {

          method: 'PUT',

          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

          body: JSON.stringify(updateData)

        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        alert('Attendance record updated successfully!');

        resetCreateForm();

        fetchAttendance();

        fetchEmployees();

        setIsCreateMenuOpen(false);

        return;

      }



      // ---- CREATE MODE (batch) ----

      const currentSingleDate = newAttendance.date || singleDate;

      const datesToProcess =

        createDateMode === "range" && !isEditing

          ? getDatesInRange(createRangeStart, createRangeEnd)

          : [currentSingleDate];



      if (!datesToProcess.length) {

        alert("Please select a valid date or date range");

        return;

      }



      const employeeIdsToProcess = selectAllEmployees

        ? employees.map(emp => emp.id)

        : selectedEmployees.length > 0

          ? selectedEmployees.map(id => parseInt(id))

          : newAttendance.employee?.id

            ? [newAttendance.employee.id]

            : [];



      if (employeeIdsToProcess.length === 0) {

        alert('Please select at least one employee');

        return;

      }



      const overtimeRecords = [];

      const attendancePayload = [];



      for (const dateStr of datesToProcess) {

        for (const employeeId of employeeIdsToProcess) {

          const employee = employees.find(emp => emp.id === employeeId);

          if (!employee) continue;



          const workStartTime = getEmployeeWorkStartTime(employee);

          // Calculate worked minutes considering work start time

          const calculateTotalMinutesWithWorkStart = (checkIn, checkOut, workStartTime) => {

            if (!checkIn || !checkOut) return 0;

            const [inH, inM] = checkIn.split(':').map(Number);

            const [startH, startM] = workStartTime.split(':').map(Number);

            const [outH, outM] = checkOut.split(':').map(Number);

            const checkInMinutes = inH * 60 + inM;

            const workStartMinutes = startH * 60 + startM;

            let checkOutMinutes = outH * 60 + outM;

            const effectiveStartMinutes = Math.max(checkInMinutes, workStartMinutes);

            if (checkOutMinutes < effectiveStartMinutes) {

              checkOutMinutes += 24 * 60;

            }

            return Math.max(0, checkOutMinutes - effectiveStartMinutes);

          };



          const totalWorkedMinutes = calculateTotalMinutesWithWorkStart(

            newAttendance.checkIn,

            newAttendance.checkOut,

            workStartTime

          );



          if (totalWorkedMinutes <= 0 && newAttendance.checkIn && newAttendance.checkOut) {

            alert(`Check-out time must be after work start time for ${employee.firstName} ${employee.lastName}`);

            return;

          }



          const standardHours = getEmployeeStandardHours(employee);

          const standardMinutes = standardHours * 60;

          const overtimeMinutes = Math.max(0, totalWorkedMinutes - standardMinutes);



          if (overtimeMinutes > 0) {

            overtimeRecords.push({

              employeeId,

              employee,

              overtimeMinutes,

              standardMinutes,

              standardHours,

              totalWorkedMinutes,

              checkIn: newAttendance.checkIn,

              checkOut: newAttendance.checkOut,

              date: dateStr

            });

          }



          // Determine status

          let determinedStatus = newAttendance.status;

          if (!determinedStatus) {

            if (isHoliday(dateStr)) {

              determinedStatus = "Holiday Present";

            } else if (isSpecialWeekend(dateStr)) {

              determinedStatus = "Special Weekend Present";

            } else if (isWeekend(dateStr)) {

              determinedStatus = "Weekend Present";

            } else {

              const isLate = (() => {

                if (!newAttendance.checkIn || !workStartTime) return false;

                const [inH, inM] = newAttendance.checkIn.split(':').map(Number);

                const [startH, startM] = workStartTime.split(':').map(Number);

                const checkInMinutes = inH * 60 + inM;

                const workStartMinutes = startH * 60 + startM;

                return checkInMinutes > workStartMinutes + 1;

              })();

              determinedStatus = isLate ? "Late" : "Present";

            }

          }



          attendancePayload.push({

            employee: { id: employeeId },

            shift: newAttendance.shift || determineShift(newAttendance.checkIn),

            workType: newAttendance.workType || 'Regular',

            date: dateStr,

            status: determinedStatus,

            checkIn: newAttendance.checkIn ? formatTimeToHHMMSS(newAttendance.checkIn) : null,

            checkOut: newAttendance.checkOut ? formatTimeToHHMMSS(newAttendance.checkOut) : null,

            minimumHour: totalWorkedMinutes / 60,

            overtime: overtimeMinutes / 60,

            standardHours: standardHours

          });

        }

      }



      // Submit batch attendance

      const response = await fetch(`${API_BASE_URL}/api/attendance/batch`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

        body: JSON.stringify(attendancePayload)

      });

      if (!response.ok) {

        const errorText = await response.text();

        throw new Error(`Server error: ${response.status} - ${errorText}`);

      }

      const savedAttendances = await response.json();



      alert(

        overtimeRecords.length > 0

          ? `Successfully created ${savedAttendances.length} attendance record(s) with ${overtimeRecords.length} overtime record(s)`

          : `Successfully created ${savedAttendances.length} attendance record(s)`

      );



      resetCreateForm();

      fetchAttendance();

      fetchEmployees();

      setIsCreateMenuOpen(false);

    } catch (err) {

      console.error('Error creating/updating attendance:', err);

      alert(`Failed: ${err.message}`);

      setError(err.message);

    }

  };



  const resetCreateForm = () => {

    setNewAttendance({

      employee: { id: '' },

      shift: '',

      workType: '',

      category: '',

      date: singleDate,

      status: '',

      minimumHour: '',

      checkIn: '',

      checkOut: '',

    });

    setSelectedEmployees([]);

    setSelectAllEmployees(false);

    setIsEditing(false);

    setEditingAttendanceId(null);

    setCreateDateMode("single");

    setCreateRangeStart(singleDate);

    setCreateRangeEnd(singleDate);

    setEmployeeSearchQuery('');

  };



  const bulkDeleteAttendances = async () => {

  const attendanceIds = Array.from(selectedAttendanceIds);



  if (attendanceIds.length === 0) {

    alert("Please select at least one attendance record.");

    return;

  }



  const confirmed = await window.appConfirm(

    `Are you sure you want to delete ` +

    `${attendanceIds.length} attendance record(s)?\n\n` +

    `Linked overtime records will also be deleted.`

  );



  if (!confirmed) {

    return;

  }



  setLoading(true);



  try {

    const token = getToken();



    const response = await fetch(

      `${API_BASE_URL}/api/attendance/bulk/delete`,

      {

        method: "DELETE",

        headers: {

          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          ids: attendanceIds,

        }),

      }

    );



    const responseText = await response.text();



    let result = {};



    if (responseText) {

      try {

        result = JSON.parse(responseText);

      } catch {

        result = {

          message: responseText,

        };

      }

    }



    if (!response.ok) {

      throw new Error(

        result.message ||

          `Failed to delete attendance records: ${response.status}`

      );

    }



    setAttendances((previousAttendances) =>

      previousAttendances.filter(

        (attendance) => !attendanceIds.includes(attendance.id)

      )

    );



    setSelectedAttendanceIds(new Set());

    setIsAllSelected(false);



    alert(

      result.message ||

        `Successfully deleted ${attendanceIds.length} attendance record(s).`

    );

  } catch (error) {

    console.error("Bulk attendance delete error:", error);



    setError(error.message);



    alert(

      "Error deleting attendance records: " +

        error.message

    );

  } finally {

    setLoading(false);

  }

};



  // 5g. Validate attendance (create overview)

  const validateAttendance = async (ids = null) => {

    setIsValidating(true);

    setError('');



    let checkedAttendanceIds = [];

    if (ids && ids.length > 0) {

      checkedAttendanceIds = Array.isArray(ids) ? ids.map(Number) : [Number(ids)];

    } else if (isAllSelected) {

      checkedAttendanceIds = attendances.map(a => Number(a.id));

    } else {

      checkedAttendanceIds = attendances

        .filter(a => document.getElementById(`checkbox-${a.id}`)?.checked)

        .map(a => Number(a.id));

    }



    if (checkedAttendanceIds.length === 0) {

      setError("No attendance selected for validation.");

      setIsValidating(false);

      return;

    }



    try {

      const token = getToken();

      const payload = { attendanceIds: checkedAttendanceIds };

      const response = await fetch(`${API_BASE_URL}/api/attendance/insertOverview`, {

        method: "POST",

        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

        body: JSON.stringify(payload)

      });

      const text = await response.text();

      let data;

      try { data = JSON.parse(text); } catch { data = text; }

      if (!response.ok) throw new Error(data?.message || data || "Validation failed");

      alert(`✅ Successfully validated ${checkedAttendanceIds.length} record(s)`);

      fetchAttendance();

    } catch (error) {

      setError(error.message);

      console.error("Validation error:", error);

    } finally {

      setIsValidating(false);

      setIsAllSelected(false);

      attendances.forEach(a => {

        const checkbox = document.getElementById(`checkbox-${a.id}`);

        if (checkbox) checkbox.checked = false;

      });

    }

  };



  // 5h. Delete attendance

  const handleDeleteAttendance = async (id) => {

    if (!await window.appConfirm('Are you sure you want to delete this attendance record?')) {

      handleClosePopupMenu();

      return;

    }

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/attendance/${id}`, {

        method: 'DELETE',

        headers: { 'Authorization': `Bearer ${token}` }

      });

      if (!response.ok) throw new Error('Failed to delete attendance');

      fetchAttendance();

      fetchEmployees();

    } catch (err) {

      setError(err.message);

    } finally {

      handleClosePopupMenu();

    }

  };



  // 5i. Edit attendance (populate form)

  const handleEditAttendance = (id) => {

    const attendance = attendances.find(a => a.id === id);

    if (attendance) {

      setIsEditing(true);

      setEditingAttendanceId(id);

      setCreateDateMode("single");

      setCreateRangeStart(attendance.date);

      setCreateRangeEnd(attendance.date);

      setNewAttendance({

        employee: { id: attendance.employee?.id || '' },

        shift: attendance.shift || '',

        workType: attendance.workType || '',

        category: attendance.employee?.category?.name || '',

        date: attendance.date,

        status: attendance.status || '',

        minimumHour: attendance.minimumHour || '',

        checkIn: attendance.checkIn || '',

        checkOut: attendance.checkOut || '',

      });

      if (attendance.employee?.id) {

        setSelectedEmployees([attendance.employee.id.toString()]);

        setSelectAllEmployees(false);

      }

      setIsCreateMenuOpen(true);

    }

    handleClosePopupMenu();

  };



  // 5j. Batch Update (NEW)

  const batchUpdateAttendance = async () => {

    const selectedIds = Array.from(selectedAttendanceIds);

    if (selectedIds.length === 0) {

      alert('Please select at least one attendance record.');

      return;

    }



    if (!await window.appConfirm(`Update check-in/out for ${selectedIds.length} record(s)?`)) return;



    setBatchUpdating(true);

    try {

      const token = getToken();

      const updatePromises = selectedIds.map(async (id) => {

        const attendance = attendances.find(a => a.id === id);

        if (!attendance) return null;



        const updateData = {

          shift: attendance.shift || 'Day',

          workType: attendance.workType || 'Regular',

          date: attendance.date,

          status: attendance.status || 'Present',

          checkIn: batchUpdateData.checkIn 

            ? formatTimeToHHMMSS(batchUpdateData.checkIn) 

            : attendance.checkIn,

          checkOut: batchUpdateData.checkOut 

            ? formatTimeToHHMMSS(batchUpdateData.checkOut) 

            : attendance.checkOut,

        };



        const response = await fetch(`${API_BASE_URL}/api/attendance/${id}`, {

          method: 'PUT',

          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

          body: JSON.stringify(updateData)

        });



        if (!response.ok) {

          throw new Error(`Failed to update record ${id}`);

        }

        return response.json();

      });



      const results = await Promise.allSettled(updatePromises);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;

      const failed = results.filter(r => r.status === 'rejected').length;



      alert(`✅ ${succeeded} record(s) updated successfully.\n${failed > 0 ? `❌ ${failed} failed.` : ''}`);

      

      fetchAttendance();

      setSelectedAttendanceIds(new Set());

      setShowBatchUpdateModal(false);

      setBatchUpdateData({ checkIn: '', checkOut: '' });

    } catch (error) {

      alert('Error during batch update: ' + error.message);

    } finally {

      setBatchUpdating(false);

    }

  };



  // 5k. Clear (hide) records for a date

  const clearTableAndForm = async () => {

    const dateToClear = dateFilterMode === 'single' ? singleDate : null;

    if (!dateToClear) {

      alert("Please select a single date mode to clear records");

      return;

    }

    if (!await window.appConfirm(`Are you sure you want to hide all records for ${dateToClear}?`)) return;

    setClearedDates(prev => prev.includes(dateToClear) ? prev : [...prev, dateToClear]);

    setAttendances(prev => prev.filter(att => att.date !== dateToClear));

    alert(`Hidden records for ${dateToClear}. Use "Show Cleared" to see them again.`);

  };



  // 5l. Reset cleared dates

  const resetClearedDates = () => {

    setClearedDates([]);

    fetchAttendance();

    alert("All cleared dates have been reset. Records will now show again.");

  };



  // 5m. Export to CSV

  const handleExport = async () => {
    try {
      const { start, end } = getActiveDateRange();
      if (!start || !end) {
        alert("Please select a valid date range before exporting.");
        return;
      }

      const token = getToken();
      const params = new URLSearchParams({ startDate: start, endDate: end });
      const response = await fetch(`${API_BASE_URL}/api/attendance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to load attendance records for export');

      const rawRecords = await response.json();
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const exportRecords = (Array.isArray(rawRecords) ? rawRecords : [])
        .map((record) => record.employee ? record : normalizeAttendanceDTO(record))
        .filter(Boolean)
        .filter((record) => {
          if (!normalizedSearch) return true;
          const employee = record.employee || {};
          return [
            employee.firstName,
            employee.lastName,
            `${employee.firstName || ''} ${employee.lastName || ''}`,
            employee.employeeId,
            record.employeeNumber
          ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
        });

      if (exportRecords.length === 0) {
        alert("No attendance records match the selected employee and duration.");
        return;
      }

    const headers = [

      "Date", "Employee ID", "Employee Name", "Check In", "Check Out",

      "Hours Worked", "Shift", "Status"

    ];

    const rows = exportRecords.map((att) => [

      att.date,

      att.employee?.employeeId || att.employee?.id || "",

      `${att.employee?.firstName || ""} ${att.employee?.lastName || ""}`.trim(),

      att.checkIn || "--:--",

      att.checkOut || "--:--",

      att.minimumHour || 0,

      att.shift || "",

      att.status || ""

    ]);

    const csvContent = [headers, ...rows]

      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))

      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    const employeeLabel = normalizedSearch
      ? normalizedSearch.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'all-employees';
    a.download = `attendance-${employeeLabel}-${start}-to-${end}.csv`;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error('Attendance export failed:', exportError);
      alert(exportError.message || 'Unable to export attendance records.');
    }
  };



  // ============================================================

  // 6. BIOMETRIC IMPORT FUNCTIONS

  // ============================================================



  const createNameMapping = () => {

    const nameMap = new Map();

    employees.forEach(emp => {

      if (!emp.id) return;

      const firstName = emp.firstName?.trim() || '';

      const lastName = emp.lastName?.trim() || '';

      const fullName = `${firstName} ${lastName}`.trim();

      nameMap.set(emp.id.toString(), { id: emp.id, employeeId: emp.employeeId, name: fullName });

      if (emp.employeeId) {

        nameMap.set(emp.employeeId.toString(), { id: emp.id, employeeId: emp.employeeId, name: fullName });

        nameMap.set(emp.employeeId.toString().toUpperCase(), { id: emp.id, employeeId: emp.employeeId, name: fullName });

      }

      const nameVariations = [

        fullName.toUpperCase(),

        fullName.toLowerCase(),

        `${lastName} ${firstName}`.toUpperCase().trim(),

        firstName.toUpperCase(),

        firstName.toLowerCase(),

      ];

      nameVariations.forEach(variation => {

        if (variation && variation.length > 2) {

          nameMap.set(variation, { id: emp.id, employeeId: emp.employeeId, name: fullName });

        }

      });

    });

    return nameMap;

  };



  const findEmployeeByDatabaseID = (row, nameMap) => {

    for (const [key, value] of Object.entries(row)) {

      if (value === null || value === undefined) continue;

      const stringValue = value.toString().trim();

      if (!stringValue) continue;

      if (/^\d+$/.test(stringValue)) {

        if (nameMap.has(stringValue)) return nameMap.get(stringValue);

      }

      if (key.toLowerCase().includes('databaseid') || key.toLowerCase().includes('dbid') || 

          key.toLowerCase().includes('id') && !key.toLowerCase().includes('employeeid')) {

        if (nameMap.has(stringValue)) return nameMap.get(stringValue);

      }

    }

    return null;

  };



  const findEmployeeByEmployeeID = (row, nameMap) => {

    for (const [key, value] of Object.entries(row)) {

      if (value === null || value === undefined) continue;

      const stringValue = value.toString().trim();

      if (!stringValue) continue;

      if (stringValue.includes('E-') || key.toLowerCase().includes('employeeid')) {

        if (nameMap.has(stringValue.toUpperCase())) return nameMap.get(stringValue.toUpperCase());

      }

    }

    return null;

  };



  const findEmployeeByName = (row, nameMap) => {

    for (const [key, value] of Object.entries(row)) {

      if (typeof value !== 'string') continue;

      const stringValue = value.trim();

      if (!stringValue || stringValue.length < 2) continue;

      if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || 

          key.toLowerCase().includes('action') || key.toLowerCase().includes('type') ||

          key.toLowerCase().includes('sign') || stringValue.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {

        continue;

      }

      if (nameMap.has(stringValue.toUpperCase())) return nameMap.get(stringValue.toUpperCase());

      const upperValue = stringValue.toUpperCase();

      for (const [nameVariation, employeeData] of nameMap.entries()) {

        if (upperValue.includes(nameVariation) && nameVariation.length > 3 && !/^\d+$/.test(nameVariation)) {

          return employeeData;

        }

      }

    }

    const nameLikeColumns = Object.keys(row).filter(key => 

      key.toLowerCase().includes('name') || key.toLowerCase().includes('employee') ||

      key.toLowerCase().includes('staff') || key.toLowerCase().includes('person')

    );

    for (const col of nameLikeColumns) {

      const value = row[col];

      if (typeof value === 'string' && value.trim()) {

        const upperValue = value.toUpperCase().trim();

        if (nameMap.has(upperValue)) return nameMap.get(upperValue);

      }

    }

    return null;

  };



  const parseTimestamp = (timestamp) => {

    if (!timestamp) return { date: null, time: null };

    if (typeof timestamp === 'number') {

      const date = new Date((timestamp - (25567 + 2)) * 86400 * 1000);

      return {

        date: date.toISOString().split('T')[0],

        time: date.toTimeString().split(' ')[0].substring(0, 5)

      };

    }

    const ts = timestamp.toString().trim();

    if (ts.includes('/') && ts.includes('-')) {

      const [datePart, timePart] = ts.split('-');

      if (datePart && timePart) {

        const [year, month, day] = datePart.split('/');

        const normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        return { date: normalizedDate, time: timePart.substring(0, 5) };

      }

    }

    if (ts.match(/^\d{4}-\d{2}-\d{2}$/)) {

      return { date: ts, time: null };

    }

    return { date: null, time: null };

  };



  const processBiometricData = async (rawData) => {

    const nameMap = createNameMapping();

    const individualRecords = [];

    const unmappedRows = new Set();

    const mappedEmployees = new Set();



    rawData.forEach((row, index) => {

      let employeeData = findEmployeeByDatabaseID(row, nameMap);

      if (!employeeData) employeeData = findEmployeeByEmployeeID(row, nameMap);

      if (!employeeData) employeeData = findEmployeeByName(row, nameMap);

      if (!employeeData) {

        unmappedRows.add(`Row ${index + 2}`);

        return;

      }

      mappedEmployees.add(employeeData.id);



      let timestamp = null;

      for (const [key, value] of Object.entries(row)) {

        if (value && value.toString().match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {

          timestamp = value;

          break;

        }

      }

      const { date, time } = parseTimestamp(timestamp);

      if (!date || !time) return;



      const action = (row.SIGN || row.Action || row.Type || row.action || "").toUpperCase().trim();

      const isCheckIn = action.includes("SIGN ON") || action.includes("ON") || action === "IN" || action.includes("CHECK IN");

      const isCheckOut = action.includes("SIGN OFF") || action.includes("OFF") || action === "OUT" || action.includes("CHECK OUT");

      let finalAction = action;

      if (!isCheckIn && !isCheckOut) {

        const [hours] = time.split(':').map(Number);

        finalAction = hours < 12 ? "SIGN ON" : "SIGN OFF";

      } else {

        finalAction = isCheckIn ? "SIGN ON" : "SIGN OFF";

      }



      individualRecords.push({

        employeeId: employeeData.id,

        employeeName: employeeData.name,

        employeeCode: employeeData.employeeId,

        timestamp: `${date}T${time}:00`,

        action: finalAction,

        date: date,

        time: time,

        originalData: row

      });

    });



    const groupRecordsByEmployeeAndDate = (records) => {

      const grouped = {};

      records.forEach(record => {

        const key = `${record.employeeId}-${record.date}`;

        if (!grouped[key]) {

          grouped[key] = {

            employeeId: record.employeeId,

            employeeName: record.employeeName,

            employeeCode: record.employeeCode,

            date: record.date,

            checkIns: [],

            checkOuts: [],

            records: []

          };

        }

        if (record.action === 'SIGN ON') grouped[key].checkIns.push(record.time);

        else if (record.action === 'SIGN OFF') grouped[key].checkOuts.push(record.time);

        grouped[key].records.push({

          time: record.time,

          action: record.action,

          timestamp: record.timestamp,

          original: record.originalData

        });

      });

      return grouped;

    };



    const createAttendanceRecords = (groupedRecords) => {

      const attendanceRecords = [];

      Object.values(groupedRecords).forEach(group => {

        group.checkIns.sort();

        group.checkOuts.sort();

        const checkIn = group.checkIns.length > 0 ? group.checkIns[0] : null;

        const checkOut = group.checkOuts.length > 0 ? group.checkOuts[group.checkOuts.length - 1] : null;

        const hoursWorked = calculateHours(checkIn, checkOut);

        let status = 'Present';

        if (!checkIn && !checkOut) status = 'Absent';

        else if (checkIn && !checkOut) status = 'Half Day';

        else if (!checkIn && checkOut) status = 'Half Day';

        const shift = determineShift(checkIn);

        attendanceRecords.push({

          employeeId: group.employeeId,

          employeeName: group.employeeName,

          employeeCode: group.employeeCode,

          date: group.date,

          checkIn: checkIn,

          checkOut: checkOut,

          hoursWorked: hoursWorked,

          shift: shift,

          status: status,

          biometric: true,

          recordCount: group.records.length,

          signOnCount: group.checkIns.length,

          signOffCount: group.checkOuts.length,

          individualEvents: group.records

        });

      });

      return attendanceRecords;

    };



    const groupedRecords = groupRecordsByEmployeeAndDate(individualRecords);

    const attendanceRecords = createAttendanceRecords(groupedRecords);



    if (unmappedRows.size > 0) {

      setBiometricError(`Warning: ${unmappedRows.size} rows could not be matched to employees.`);

    }

    if (attendanceRecords.length === 0) {

      throw new Error('No valid attendance records could be created. Check if employee Database IDs/names in Excel match those in the database.');

    }

    return {

      individualRecords: individualRecords,

      attendanceRecords: attendanceRecords,

      totalEvents: individualRecords.length,

      mappedCount: mappedEmployees.size,

      unmappedCount: unmappedRows.size,

      unmappedRows: Array.from(unmappedRows)

    };

  };



  const convertToBiometricRecordDTO = (processedRecords) => {

    return processedRecords.individualRecords.map(record => ({

      employeeId: record.employeeId,

      timestamp: record.timestamp,

      action: record.action,

      employeeName: record.employeeName

    }));

  };



  const importBiometricData = async (biometricDTOs) => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/attendance/import/biometric-file`, {

        method: "POST",

        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

        body: JSON.stringify(biometricDTOs)

      });

      if (!response.ok) {

        const errorText = await response.text();

        throw new Error(errorText || `Server error: ${response.status}`);

      }

      return await response.json();

    } catch (error) {

      throw new Error(`Failed to import biometric data: ${error.message}`);

    }

  };



  const importUsingBatchEndpoint = async (attendanceRecords) => {

    try {

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/attendance/batch`, {

        method: "POST",

        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

        body: JSON.stringify(attendanceRecords)

      });

      if (!response.ok) {

        const errorText = await response.text();

        throw new Error(errorText || `Server error: ${response.status}`);

      }

      return await response.json();

    } catch (error) {

      throw new Error(`Failed to save records: ${error.message}`);

    }

  };



  const generateExcelTemplate = () => {

    try {

      let employeesSample = employees.slice(0, 3).map(employee => ({

        id: employee.id,

        employeeId: employee.employeeId,

        name: `${employee.firstName} ${employee.lastName}`

      }));

      if (employeesSample.length === 0) {

        employeesSample = [

          { id: 1, employeeId: 'E-250301-001', name: 'John Doe' },

          { id: 2, employeeId: 'E-250301-002', name: 'Jane Smith' },

          { id: 3, employeeId: 'E-250301-003', name: 'Robert Johnson' }

        ];

      }

      const templateData = employeesSample.map(employee => [

        {

          'Database ID (Numeric)': employee.id,

          'Employee ID (String)': employee.employeeId,

          'Employee Name': employee.name,

          'Timestamp': '2024-12-31-08:00:00',

          'Action': 'SIGN ON',

          'Date': '2024-12-31',

          'Time': '08:00:00'

        },

        {

          'Database ID (Numeric)': employee.id,

          'Employee ID (String)': employee.employeeId,

          'Employee Name': employee.name,

          'Timestamp': '2024-12-31-17:00:00',

          'Action': 'SIGN OFF',

          'Date': '2024-12-31',

          'Time': '17:00:00'

        }

      ]).flat();



      const workbook = XLSX.utils.book_new();

      const worksheet = XLSX.utils.json_to_sheet(templateData);

      const colWidths = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Biometric Template');



      const employeeReference = employees.map(emp => ({

        'Database ID (Numeric)': emp.id,

        'Employee ID (String)': emp.employeeId,

        'Employee Name': `${emp.firstName} ${emp.lastName}`,

        'Job Position': emp.jobPosition || 'N/A',

        'Category': emp.category || 'N/A'

      }));

      const referenceSheet = XLSX.utils.json_to_sheet(employeeReference);

      XLSX.utils.book_append_sheet(workbook, referenceSheet, 'Employee Reference');



      const instructions = [

        ['=== BIOMETRIC ATTENDANCE TEMPLATE ==='],

        [''],

        ['IMPORTANT: Use Database ID (numeric) OR Employee ID (string) from the "Employee Reference" sheet'],

        [''],

        ['1. Database ID: Use numeric ID from reference sheet (column A)'],

        ['2. Employee ID: Use string ID from reference sheet (column B)'],

        ['3. Employee Name: Full name for reference only'],

        ['4. Timestamp format: YYYY-MM-DD-HH:MM:SS or YYYY/MM/DD-HH:MM:SS'],

        ['5. Action: "SIGN ON" for check-in, "SIGN OFF" for check-out'],

        ['6. Date: YYYY-MM-DD'],

        ['7. Time: HH:MM:SS (24-hour format)'],

        [''],

        ['=== AVAILABLE EMPLOYEES ==='],

        ['Check "Employee Reference" sheet for all employees with Database IDs'],

        [''],

        ['=== SAMPLE DATA ==='],

        ['See first few rows for sample format'],

        [''],

        ['=== TIPS ==='],

        ['• Copy Database IDs from reference sheet for 100% accuracy'],

        ['• Database IDs are numeric (e.g., 1, 2, 3)'],

        ['• Employee IDs are string format (e.g., E-250301-001)'],

        ['• One record per row'],

        ['• Sort by employee and timestamp'],

        ['• Remove empty rows'],

        ['• Save as .xlsx or .xls']

      ];

      const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);

      instructionSheet['!cols'] = [{ wch: 80 }];

      XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');



      const timestamp = new Date().toISOString().split('T')[0];

      const filename = `biometric_attendance_template_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);

    } catch (error) {

      console.error('Error generating template:', error);

      alert('Failed to generate template. Please check console for details.');

    }

  };



  const exportBiometricToExcel = () => {

    if (!processedBiometricData || !processedBiometricData.attendanceRecords || processedBiometricData.attendanceRecords.length === 0) {

      setBiometricError("No processed data to export. Please import biometric data first.");

      return;

    }

    try {

      const exportData = processedBiometricData.attendanceRecords.map(record => {

        const employee = employees.find(emp => emp.id === record.employeeId);

        return {

          'Database ID': employee?.id || record.employeeId,

          'Employee ID': employee?.employeeId || 'N/A',

          'Employee Name': record.employeeName,

          'Date': record.date,

          'Check In Time': record.checkIn || '--:--',

          'Check Out Time': record.checkOut || '--:--',

          'Sign On Count': record.signOnCount || 0,

          'Sign Off Count': record.signOffCount || 0,

          'Total Hours Worked': record.hoursWorked,

          'Shift': record.shift,

          'Status': record.status,

          'Biometric Record': 'Yes',

          'Individual Events': record.individualEvents?.length || 0,

          'Job Position': employee?.jobPosition || 'N/A',

          'Category': employee?.category || 'N/A',

          'Work Type': employee?.workType || 'N/A',

          'Hourly Rate': employee?.minimumRate || 'N/A',

          'Standard Hours': employee?.standardHours || 8,

          'Overtime Hours': (parseFloat(record.hoursWorked) > (employee?.standardHours || 8)) 

            ? (parseFloat(record.hoursWorked) - (employee?.standardHours || 8)).toFixed(2)

            : 0

        };

      });



      const individualEventsData = [];

      processedBiometricData.attendanceRecords.forEach(record => {

        record.individualEvents?.forEach(event => {

          const employee = employees.find(emp => emp.id === record.employeeId);

          individualEventsData.push({

            'Database ID': employee?.id || record.employeeId,

            'Employee ID': employee?.employeeId || 'N/A',

            'Employee Name': record.employeeName,

            'Date': record.date,

            'Time': event.time,

            'Action': event.action,

            'Original Timestamp': event.timestamp,

            'Status': record.status

          });

        });

      });



      const workbook = XLSX.utils.book_new();

      const attendanceSheet = XLSX.utils.json_to_sheet(exportData);

      XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance Summary');

      if (individualEventsData.length > 0) {

        const eventsSheet = XLSX.utils.json_to_sheet(individualEventsData);

        XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Individual Events');

      }



      const summaryData = [

        ['Biometric Attendance Export Summary'],

        [''],

        ['Total Employees:', processedBiometricData.mappedCount],

        ['Total Attendance Records:', processedBiometricData.attendanceRecords.length],

        ['Total Individual Events:', processedBiometricData.totalEvents],

        ['Export Date:', new Date().toLocaleDateString()],

        [''],

        ['Statistics:'],

        ['Average Hours Worked:', 

          (exportData.reduce((sum, record) => sum + parseFloat(record['Total Hours Worked'] || 0), 0) / exportData.length).toFixed(2)

        ],

        ['Day Shift Count:', exportData.filter(r => r.Shift === 'Day').length],

        ['Night Shift Count:', exportData.filter(r => r.Shift === 'Night').length],

        ['Present Count:', exportData.filter(r => r.Status === 'Present').length],

        ['Half Day Count:', exportData.filter(r => r.Status === 'Half Day').length]

      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');



      const columnWidths = [

        { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 },

        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 },

        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },

        { wch: 12 }, { wch: 15 }

      ];

      attendanceSheet['!cols'] = columnWidths;



      const dateStr = new Date().toISOString().split('T')[0];

      const filename = `biometric_attendance_export_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, filename);

      setBiometricImportResult({

        ...biometricImportResult,

        exportSuccess: true,

        exportMessage: `Successfully exported ${exportData.length} attendance records to Excel`

      });

    } catch (error) {

      console.error('Export error:', error);

      setBiometricError(`Failed to export data: ${error.message}`);

    }

  };



  const handleBiometricImport = async (file) => {

    try {

      setBiometricImporting(true);

      setBiometricError(null);

      setBiometricImportResult(null);

      setProcessedBiometricData(null);



      const rawData = await readExcelFile(file);

      if (rawData.length === 0) throw new Error('Excel file is empty or contains no data.');

      

      const processingResult = await processBiometricData(rawData);

      setProcessedBiometricData(processingResult);

      

      const { attendanceRecords, mappedCount, unmappedCount, unmappedRows } = processingResult;

      if (!attendanceRecords || attendanceRecords.length === 0) {

        throw new Error('No valid biometric records found after processing. Check if employee Database IDs in Excel match those in the database.');

      }



      let saveResult;

      try {

        const biometricDTOs = convertToBiometricRecordDTO(processingResult);

        saveResult = await importBiometricData(biometricDTOs);

      } catch (endpointError) {

        const batchRecords = attendanceRecords.map(record => ({

          employee: { id: record.employeeId },

          employeeName: record.employeeName,

          date: record.date,

          checkIn: record.checkIn,

          checkOut: record.checkOut,

          minimumHour: record.hoursWorked,

          status: record.status,

          shift: record.shift,

          workType: 'Regular',

          biometric: true,

          notes: `Biometric import: ${record.signOnCount} sign-ons, ${record.signOffCount} sign-offs`

        }));

        saveResult = await importUsingBatchEndpoint(batchRecords);

      }

      

      const result = {

        success: true,

        message: `Successfully processed ${processingResult.individualRecords.length} biometric events into ${attendanceRecords.length} attendance records`,

        summary: {

          totalEvents: processingResult.individualRecords.length,

          attendanceRecords: attendanceRecords.length,

          mappedEmployees: mappedCount,

          unmappedRows: unmappedCount,

          savedCount: saveResult?.length || saveResult?.count || attendanceRecords.length,

          unmappedRows: unmappedRows

        },

        data: processingResult

      };

      

      setBiometricImportResult(result);

      setTimeout(() => window.location.reload(), 3000);

      return result;

    } catch (error) {

      console.error('Import error:', error);

      const errorMessage = `Failed to import biometric data: ${error.message}`;

      setBiometricError(errorMessage);

      throw new Error(errorMessage);

    } finally {

      setBiometricImporting(false);

    }

  };



  const readExcelFile = (file) => {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onload = (e) => {

        try {

          const data = new Uint8Array(e.target.result);

          const workbook = XLSX.read(data, { type: 'array' });

          const firstSheetName = workbook.SheetNames[0];

          const worksheet = workbook.Sheets[firstSheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          resolve(jsonData);

        } catch (error) {

          reject(new Error(`Failed to parse Excel file: ${error.message}`));

        }

      };

      reader.onerror = () => reject(new Error('Failed to read file'));

      reader.readAsArrayBuffer(file);

    });

  };



  const handleFileChange = async (event) => {

    const file = event.target.files[0];

    if (!file) return;

    const validTypes = [

      'application/vnd.ms-excel',

      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {

      setBiometricError('Please select a valid Excel file (.xlsx or .xls)');

      return;

    }

    try {

      await handleBiometricImport(file);

    } catch (error) {

      console.error('Import failed:', error);

    }

  };



  // ============================================================

  // 7. TIMESHEET SYNC

  // ============================================================

  const handleSync = async (dateRange, direction) => {

    setIsSyncing(true);

    try {

      const token = getToken();

      const headers = {

        'Authorization': `Bearer ${token}`,

        'Content-Type': 'application/json'

      };



      const results = {};



      // Helper for calculating hours (reused)

      const calculateHoursForSync = (checkIn, checkOut) => {

        if (!checkIn || !checkOut) return 0;

        try {

          const [inHour, inMinute] = checkIn.split(':').map(Number);

          const [outHour, outMinute] = checkOut.split(':').map(Number);

          let totalInMinutes = inHour * 60 + inMinute;

          let totalOutMinutes = outHour * 60 + outMinute;

          if (totalOutMinutes < totalInMinutes) totalOutMinutes += 24 * 60;

          return ((totalOutMinutes - totalInMinutes) / 60).toFixed(2);

        } catch (e) {

          return 0;

        }

      };



      const getDateRateMultiplier = (date, settings) => {

        const dateObj = new Date(date);

        if (settings.holidays?.some(h => h.date === date)) return settings.holidayRate || 1.5;

        if (settings.specialWeekends?.some(s => s.date === date)) {

          const specialWeekend = settings.specialWeekends.find(s => s.date === date);

          return specialWeekend?.rateMultiplier || settings.weekendRate || 1.25;

        }

        if (settings.weekendDays?.includes(dateObj.getDay())) {

          if (settings.doubleTimeOnSunday && dateObj.getDay() === 0) return 2.0;

          return settings.weekendRate || 1.25;

        }

        return 1.0;

      };



      // Direction: attendance → timesheet

      if (direction === 'both' || direction === 'attendanceToTimesheet') {

        const attendanceRes = await fetch(

          `${API_BASE_URL}/api/attendance?startDate=${dateRange.start}&endDate=${dateRange.end}&includeEmployee=true`,

          { headers }

        );

        const attendanceData = await attendanceRes.json();

        // Convert to timesheet records

        const timesheetMap = new Map();

        attendanceData.forEach(record => {

          const { employee, date, checkIn, checkOut, status, minimumHour, overtime } = record;

          const employeeId = employee?.id;

          if (!employeeId) return;

          const key = `${employeeId}-${date}`;

          if (!timesheetMap.has(key)) {

            let attendanceCode = 'P';

            if (status === 'On Leave' || status === 'Leave') attendanceCode = 'L';

            else if (status === 'Sick' || status === 'Sick Leave') attendanceCode = 'S';

            else if (status === 'Absent') attendanceCode = 'A';

            else if (status === 'Off Day') attendanceCode = 'OFF';

            else if (status === 'Maternity Leave') attendanceCode = 'ML';

            else if (status === 'Paternity Leave') attendanceCode = 'PL';

            else if (status === 'Holiday Present') attendanceCode = 'HP';

            else if (status === 'Weekend Present' || status === 'Special Weekend Present') attendanceCode = 'WP';

            else if (status === 'Present' || status === 'Late') attendanceCode = 'P';

            else if (status === 'Holiday') attendanceCode = 'H';

            // else keep P



            timesheetMap.set(key, {

              employeeId,

              employeeName: `${employee.firstName} ${employee.lastName}`,

              date,

              regularHours: 0,

              overtimeHours: 0,

              breakHours: 0,

              totalHours: 0,

              earnings: 0,

              status: 'PENDING',

              attendanceCode: attendanceCode,

              details: []

            });

          }

          const timesheet = timesheetMap.get(key);

          const totalHours = calculateHoursForSync(checkIn, checkOut);

          const regularHours = Math.min(totalHours, minimumHour || 8);

          const overtimeHours = overtime || Math.max(totalHours - (minimumHour || 8), 0);

          timesheet.regularHours = regularHours;

          timesheet.overtimeHours = overtimeHours;

          timesheet.totalHours = totalHours;

          // Calculate earnings

          const employeeRate = employee.minimumRate || settings.hourlyRate || 0;

          const dateMultiplier = getDateRateMultiplier(date, settings);

          const overtimeMultiplier = settings.timeAndHalfAfter8Hours ? 1.5 : 1.0;

          const regularPay = regularHours * employeeRate * dateMultiplier;

          const overtimePay = overtimeHours * employeeRate * overtimeMultiplier * dateMultiplier;

          timesheet.earnings = regularPay + overtimePay;

          timesheet.details.push({ checkIn, checkOut, attendanceStatus: status, calculatedHours: totalHours });

        });

        const timesheetData = Array.from(timesheetMap.values());

        // Save timesheets

        const saveRes = await fetch(`${API_BASE_URL}/api/timesheets/batch`, {

          method: 'POST',

          headers,

          body: JSON.stringify(timesheetData)

        });

        results.attendanceToTimesheet = await saveRes.json();

      }



      // Direction: timesheet → attendance

      if (direction === 'both' || direction === 'timesheetToAttendance') {

        const timesheetRes = await fetch(

          `${API_BASE_URL}/api/timesheets?startDate=${dateRange.start}&endDate=${dateRange.end}&includeEmployee=true`,

          { headers }

        );

        const timesheetData = await timesheetRes.json();

        // Get employees to map standard hours

        const empRes = await fetch(`${API_BASE_URL}/api/employee`, { headers });

        const employeesData = await empRes.json();

        // Convert timesheet to attendance

        const attendanceRecords = [];

        timesheetData.forEach(record => {

          const { employeeId, date, attendanceCode, regularHours, overtimeHours } = record;

          const employee = employeesData.find(e => e.id === employeeId);

          if (!employee) return;

          const employeeStandardHours = getEmployeeStandardHours(employee);

          const dateObj = new Date(date);

          let status = 'Present';

          // Map code back to status

          if (isHoliday(date)) {

            if (attendanceCode === 'HP' || attendanceCode === 'P') status = 'Holiday Present';

            else if (attendanceCode === 'A') status = 'Absent';

            else if (attendanceCode === 'L') status = 'On Leave';

            else if (attendanceCode === 'S') status = 'Sick';

            else status = 'Absent';

          } else if (isSpecialWeekend(date)) {

            if (attendanceCode === 'WP' || attendanceCode === 'P') status = 'Special Weekend Present';

            else if (attendanceCode === 'A') status = 'Absent';

            else if (attendanceCode === 'L') status = 'On Leave';

            else if (attendanceCode === 'S') status = 'Sick';

            else status = 'Absent';

          } else if (isWeekend(date)) {

            if (attendanceCode === 'WP' || attendanceCode === 'P') status = 'Weekend Present';

            else if (attendanceCode === 'A') status = 'Absent';

            else if (attendanceCode === 'L') status = 'On Leave';

            else if (attendanceCode === 'S') status = 'Sick';

            else status = 'Absent';

          } else {

            if (attendanceCode === 'P') status = 'Present';

            else if (attendanceCode === 'A') status = 'Absent';

            else if (attendanceCode === 'L') status = 'On Leave';

            else if (attendanceCode === 'S') status = 'Sick';

            else if (attendanceCode === 'WP') status = 'Weekend Present';

            else if (attendanceCode === 'HP') status = 'Holiday Present';

            else status = 'Present';

          }

          const totalHours = regularHours + overtimeHours;

          const checkIn = '09:00';

          let checkOut = '';

          if (totalHours > 0) {

            const endHour = 9 + totalHours;

            checkOut = `${Math.floor(endHour).toString().padStart(2, '0')}:${((endHour % 1) * 60).toString().padStart(2, '0')}`;

          }

          attendanceRecords.push({

            employee: { id: employeeId },

            date,

            status,

            minimumHour: regularHours,

            overtime: overtimeHours,

            checkIn: totalHours > 0 ? checkIn : null,

            checkOut: totalHours > 0 ? checkOut : null,

            totalHoursWorked: totalHours,

            shift: determineShift(checkIn),

            workType: 'Regular',

            category: employee.category || 'Default',

            notes: `Converted from timesheet. Code: ${attendanceCode}`,

            standardHours: employeeStandardHours

          });

        });

        // Save attendance

        const saveRes = await fetch(`${API_BASE_URL}/api/attendance/batch`, {

          method: 'POST',

          headers,

          body: JSON.stringify(attendanceRecords)

        });

        results.timesheetToAttendance = await saveRes.json();

      }



      setSyncResult(results);

      setSyncHistory(prev => [{

        id: Date.now(),

        timestamp: new Date().toISOString(),

        direction: direction,

        dateRange,

        result: results

      }, ...prev.slice(0, 9)]);

      fetchAttendance();

      return results;

    } catch (error) {

      console.error('Sync error:', error);

      setSyncResult({ error: error.message });

      throw error;

    } finally {

      setIsSyncing(false);

    }

  };



  // ============================================================

  // 8. UI EVENT HANDLERS

  // ============================================================



  const handleInputChange = (e) => {

    const { name, value, options } = e.target;

    if (name === "employeeId") {

      const selectedOptions = Array.from(options)

        .filter((option) => option.selected)

        .map((option) => option.value);

      setSelectedEmployees(selectedOptions);

    } else {

      setNewAttendance((prev) => ({ ...prev, [name]: value }));

    }

  };



  const handleHeaderCheckboxChange = (e) => {

    const isChecked = e.target.checked;

    setIsAllSelected(isChecked);

    if (isChecked) {

      const newSelected = new Set(

        filteredAttendancesBySearch

          .filter((attendance) => typeof attendance.id === 'number')

          .map((attendance) => attendance.id)

      );

      setSelectedAttendanceIds(newSelected);

    } else {

      setSelectedAttendanceIds(new Set());

    }

  };



  const handleAttendanceCheckboxChange = (attendanceId, isChecked) => {

    setSelectedAttendanceIds((currentSelection) => {

      const updatedSelection = new Set(currentSelection);

      if (isChecked) updatedSelection.add(attendanceId);

      else updatedSelection.delete(attendanceId);



      const visibleIds = filteredAttendancesBySearch

        .filter((attendance) => typeof attendance.id === 'number')

        .map((attendance) => attendance.id);



      setIsAllSelected(

        visibleIds.length > 0 && visibleIds.every((id) => updatedSelection.has(id))

      );



      return updatedSelection;

    });

  };



  const handlePopupMenu = (e, attendanceId) => {

    e.preventDefault();

    setPopupMenu({

      isOpen: true,

      attendanceId,

      position: { x: e.clientX, y: e.clientY }

    });

  };



  const handleClosePopupMenu = () => {

    setPopupMenu({ ...popupMenu, isOpen: false });

  };



  const resetDateFilters = () => {

    setDateFilterMode('none');

    setSingleDate(new Date().toISOString().split('T')[0]);

    setRangeStart(new Date().toISOString().split('T')[0]);

    setRangeEnd(new Date().toISOString().split('T')[0]);

  };



  const applySingleDateFilter = () => {

    setDateFilterMode('single');

    fetchAttendance();

  };



  const applyRangeFilter = () => {

    if (rangeStart && rangeEnd) {

      if (new Date(rangeStart) > new Date(rangeEnd)) {

        alert("Start date cannot be after end date");

        return;

      }

      setDateFilterMode('range');

      fetchAttendance();

    } else {

      alert("Please select both start and end dates");

    }

  };



  const toggleSidebar = () => {

    setSidebarOpen(!sidebarOpen);

  };



  // ============================================================

  // 9. USE-EFFECT HOOKS

  // ============================================================



  // 9a. Resize handler for sidebar

  useEffect(() => {

    const handleResize = () => {

      if (window.innerWidth >= 768) setSidebarOpen(true);

      else setSidebarOpen(false);

    };

    window.addEventListener('resize', handleResize);

    handleResize();

    return () => window.removeEventListener('resize', handleResize);

  }, []);



  // 9b. Click outside sidebar (mobile)

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

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, [sidebarOpen]);



  // 9c. Initial settings and supporting-data load
  useEffect(() => {
    refreshSettings();
    fetchLeaves();
    const interval = setInterval(refreshSettings, 300000);
    return () => clearInterval(interval);
  }, []);

  // 9d. Server-side attendance loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setAttendancePage(0);
      fetchAttendance(0);
      fetchEmployees();
    }, 350);
    return () => clearTimeout(timer);
  }, [dateFilterMode, singleDate, rangeStart, rangeEnd, showHidden, clearedDates, attendancePageSize]);

  // 9e. Auto-set status when date changes in create form

  useEffect(() => {

    const date = newAttendance.date || singleDate;

    if (!date) return;

    if (!newAttendance.status || newAttendance.status === '') {

      if (isHoliday(date)) {

        setNewAttendance(prev => ({ ...prev, status: 'Holiday Present' }));

      } else if (isSpecialWeekend(date)) {

        setNewAttendance(prev => ({ ...prev, status: 'Special Weekend Present' }));

      } else if (isWeekend(date)) {

        setNewAttendance(prev => ({ ...prev, status: 'Weekend Present' }));

      } else {

        setNewAttendance(prev => ({ ...prev, status: 'Present' }));

      }

    }

  }, [newAttendance.date, newAttendance.status, singleDate]);



  // 9f. Calculate totals for minimum/overtime amounts

  useEffect(() => {

    const minAmount = newAttendance.minimumHour * settings.hourlyRate;

    setTotalMinimumAmount(minAmount);

    const overtimeAmount = newAttendance.overtime * settings.overtimeHourlyRate;

    setTotalOvertimeAmount(overtimeAmount);

  }, [newAttendance.minimumHour, newAttendance.overtime, settings.hourlyRate, settings.overtimeHourlyRate]);



  // 9g. Click outside create menu to close

  useEffect(() => {

    const handleClickOutside = (event) => {

      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {

        setIsCreateMenuOpen(false);

        setEmployeeSearchQuery('');

      }

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);



  // 9h. Fetch user info on mount

  useEffect(() => {

    fetchPendingAttendanceRequestCount();

    const refreshPendingRequests = () => fetchPendingAttendanceRequestCount();

    const interval = window.setInterval(refreshPendingRequests, 60000);

    window.addEventListener('focus', refreshPendingRequests);

    return () => {

      window.clearInterval(interval);

      window.removeEventListener('focus', refreshPendingRequests);

    };

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



  // ============================================================

  // 10. MEMOIZED FILTERS

  // ============================================================



  const hasActiveCheckInTimeFilter = Boolean(

    timeFilters.checkInOperator && timeFilters.checkInTime

  );



  const hasActiveCheckOutTimeFilter = Boolean(

    timeFilters.checkOutOperator && timeFilters.checkOutTime

  );



  const activeAttendanceFilterCount = [

    Boolean(searchQuery.trim()),

    Boolean(selectedCategoryFilter),

    attendanceFilter !== 'all',

    hasActiveCheckInTimeFilter,

    hasActiveCheckOutTimeFilter

  ].filter(Boolean).length;



  const hasAnyAttendanceFilter = activeAttendanceFilterCount > 0;



  const filteredAttendancesBySearch = useMemo(() => {

    let filtered = [...attendances];



    if (searchQuery.trim()) {

      const normalizedQuery = searchQuery.toLowerCase().trim();



      filtered = filtered.filter((attendance) => {

        const fullName = `${attendance.employee?.firstName || ''} ${attendance.employee?.lastName || ''}`;

        const employeeId = attendance.employee?.employeeId || attendance.employee?.id || '';

        const date = attendance.date || '';

        const status = attendance.status || '';

        const category = attendance.employee?.category?.name || attendance.employee?.category || '';

        const shift = attendance.shift || '';

        const workType = attendance.workType || '';



        return [fullName, employeeId, date, status, category, shift, workType]

          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      });

    }



    if (selectedCategoryFilter) {

      filtered = filtered.filter((attendance) => {

        const categoryName = attendance.employee?.category?.name || attendance.employee?.category || '';

        return categoryName === selectedCategoryFilter;

      });

    }



    if (attendanceFilter !== 'all') {

      filtered = filtered.filter((attendance) => {

        const hasCheckIn = Boolean(

          attendance.checkIn && attendance.checkIn !== '--:--' && String(attendance.checkIn).trim()

        );

        const hasCheckOut = Boolean(

          attendance.checkOut && attendance.checkOut !== '--:--' && String(attendance.checkOut).trim()

        );



        switch (attendanceFilter) {

          case 'complete_records': return hasCheckIn && hasCheckOut;

          case 'incomplete_records': return !hasCheckIn || !hasCheckOut;

          case 'checked_in_only': return hasCheckIn;

          case 'checked_out_only': return hasCheckOut;

          case 'checked_in_no_checkout': return hasCheckIn && !hasCheckOut;

          case 'checked_out_no_checkin': return hasCheckOut && !hasCheckIn;

          case 'missing_both': return !hasCheckIn && !hasCheckOut;

          default: return true;

        }

      });

    }



    if (hasActiveCheckInTimeFilter) {

      filtered = filtered.filter((attendance) =>

        matchesTimeFilter(

          attendance.checkIn,

          timeFilters.checkInOperator,

          timeFilters.checkInTime

        )

      );

    }



    if (hasActiveCheckOutTimeFilter) {

      filtered = filtered.filter((attendance) =>

        matchesTimeFilter(

          attendance.checkOut,

          timeFilters.checkOutOperator,

          timeFilters.checkOutTime

        )

      );

    }



    return filtered;

  }, [

    attendances,

    searchQuery,

    selectedCategoryFilter,

    attendanceFilter,

    hasActiveCheckInTimeFilter,

    hasActiveCheckOutTimeFilter,

    timeFilters.checkInOperator,

    timeFilters.checkInTime,

    timeFilters.checkOutOperator,

    timeFilters.checkOutTime

  ]);



  const filteredEmployeesBySearch = useMemo(() => {

    if (!employeeSearchQuery.trim()) return employees;



    const query = employeeSearchQuery.toLowerCase().trim();



    return employees.filter((employee) => {

      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();

      const employeeId = String(employee.employeeId || '').toLowerCase();

      const category = String(employee.category?.name || employee.category || '').toLowerCase();

      const jobPosition = String(employee.jobPosition?.name || employee.jobPosition || '').toLowerCase();



      return (

        fullName.includes(query) ||

        employeeId.includes(query) ||

        category.includes(query) ||

        jobPosition.includes(query)

      );

    });

  }, [employees, employeeSearchQuery]);



  // ============================================================

  // 11. LOGOUT

  // ============================================================

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



  // ============================================================

  // 12. SUB-COMPONENTS (StatusBadge, StatusDropdown, BiometricAttendanceFeed, SyncControlPanel)

  // ============================================================



  const StatusBadge = ({ attendance }) => {

    const statusDisplay = getStatusDisplay(attendance);

    return (

      <div className="flex items-center gap-2">

        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.class}`}>

          {statusDisplay.text}

        </span>

        {attendance.biometric && (

          <span className="text-xs text-blue-600" title="Biometric Record">📱</span>

        )}

      </div>

    );

  };



  const StatusDropdown = () => {

    const date = newAttendance.date || singleDate;

    const statusOptions = getStatusOptions(date);

    return (

      <select

        value={newAttendance.status}

        onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })}

        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

      >

        {statusOptions.map(option => (

          <option key={option.value} value={option.value}>{option.label}</option>

        ))}

      </select>

    );

  };



  const BiometricAttendanceFeed = () => {

    return (

      <div className="biometric-attendance-feed">

        <div className="import-container">

          <h2>Biometric Attendance Import</h2>

          <p className="mapping-info">

            <strong>Using Database IDs</strong> for employee matching

          </p>

          

          {biometricImporting && (

            <div className="loading-section">

              <div className="spinner"></div>

              <p>Importing biometric attendance data...</p>

              <p>Using Database IDs for employee matching</p>

            </div>

          )}

          

          {biometricError && !biometricImporting && (

            <div className="error-section">

              <h3>Import Failed</h3>

              <p>{biometricError}</p>

              <button onClick={() => setBiometricError(null)} className="dismiss-btn">Dismiss</button>

            </div>

          )}

          

          {biometricImportResult && !biometricImporting && (

            <div className="success-section">

              <h3>Import Successful! ✅</h3>

              <p>{biometricImportResult.message}</p>

              <div className="summary">

                <h4>Import Summary:</h4>

                <ul>

                  <li>Total Biometric Events: {biometricImportResult.summary.totalEvents}</li>

                  <li>Attendance Records Created: {biometricImportResult.summary.attendanceRecords}</li>

                  <li>Employees Matched: {biometricImportResult.summary.mappedEmployees}</li>

                  <li>Rows Not Matched: {biometricImportResult.summary.unmappedRows}</li>

                  <li>Records Saved: {biometricImportResult.summary.savedCount}</li>

                </ul>

                <div className="export-buttons">

                  <h4>Export Options:</h4>

                  <div className="button-group">

                    <button onClick={exportBiometricToExcel} className="export-btn excel">

                      Export to Excel

                    </button>

                  </div>

                </div>

              </div>

              <p className="refresh-notice">Page will refresh automatically to show new records...</p>

              <button onClick={() => {

                setBiometricImportResult(null);

                setProcessedBiometricData(null);

              }} className="import-another-btn">

                Import Another File

              </button>

            </div>

          )}

          

          {!biometricImporting && !biometricError && !biometricImportResult && (

            <div className="file-input-section">

              <h3>📊 Import Biometric Attendance Data</h3>

              <p>Select your biometric Excel file to import attendance records</p>

              <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', border: '2px dashed #3498db', borderRadius: '8px' }}>

                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2c3e50' }}>📋 Get Excel Template with Database IDs</h4>

                <p style={{ fontSize: '14px', marginBottom: '15px', color: '#555' }}>

                  Download a pre‑formatted Excel template with Database IDs (numeric) for 100% accurate matching.

                </p>

                {loading ? (

                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>

                    Loading employee data...

                  </p>

                ) : (

                  <>

                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>

                      Found {employees.length} employees in the system

                    </p>

                    <button 

                      onClick={generateExcelTemplate}

                      style={{ 

                        background: '#27ae60', 

                        color: 'white', 

                        padding: '10px 20px', 

                        border: 'none', 

                        borderRadius: '6px', 

                        cursor: 'pointer', 

                        fontSize: '14px',

                        fontWeight: 'bold',

                        display: 'inline-flex',

                        alignItems: 'center',

                        gap: '8px',

                        transition: 'background 0.3s'

                      }}

                    >

                      Download Template with Database IDs

                    </button>

                  </>

                )}

              </div>

              <label className="file-upload-label">

                <input

                  type="file"

                  accept=".xlsx,.xls"

                  onChange={handleFileChange}

                  disabled={biometricImporting || loading}

                />

                {loading ? 'Loading employees...' : 'Choose Excel File'}

              </label>

              <div className="file-requirements">

                <p><strong>Supported File Format:</strong></p>

                <ul>

                  <li>Excel files (.xlsx, .xls) or use template above</li>

                  <li>Include Database ID column (numeric) for 100% accurate matching</li>

                  <li>Employee names in any column (for name matching)</li>

                  <li>Timestamps in various formats</li>

                  <li>SIGN ON / SIGN OFF actions</li>

                  <li><strong>Matching Priority:</strong> Database ID → Employee ID → Name</li>

                </ul>

              </div>

            </div>

          )}

        </div>



        <style jsx>{`

          .biometric-attendance-feed { max-width: 600px; margin: 20px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }

          .import-container { border: 2px dashed #ddd; border-radius: 12px; padding: 30px; background: #fafafa; text-align: center; }

          .mapping-info { background: #e3f2fd; padding: 10px; border-radius: 6px; margin: 10px 0; color: #1565c0; }

          .loading-section { text-align: center; padding: 20px; }

          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 20px; }

          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

          .error-section { background: #ffe6e6; border: 1px solid #ffcccc; border-radius: 8px; padding: 20px; margin: 15px 0; text-align: left; }

          .success-section { background: #e6ffe6; border: 1px solid #ccffcc; border-radius: 8px; padding: 20px; margin: 15px 0; text-align: left; }

          .file-upload-label { display: inline-block; background: #3498db; color: white; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 15px 0; transition: background 0.3s; font-weight: bold; }

          .file-upload-label:hover { background: #2980b9; }

          .file-upload-label input[type="file"] { display: none; }

          .file-requirements { background: #f0f0f0; padding: 15px; border-radius: 6px; margin-top: 15px; text-align: left; }

          .file-requirements ul { margin: 10px 0; padding-left: 20px; }

          .summary { text-align: left; margin: 15px 0; }

          .summary ul { margin: 10px 0; padding-left: 20px; }

          .refresh-notice { font-style: italic; color: #666; margin: 10px 0; }

          .export-buttons { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6; }

          .export-buttons h4 { margin: 0 0 15px 0; color: #495057; font-size: 16px; }

          .button-group { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

          .export-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }

          .export-btn.excel { background: #217346; color: white; }

          .export-btn.excel:hover { background: #1b5e38; }

          button { background: #3498db; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 15px; font-size: 14px; transition: background 0.3s; }

          button:hover { background: #2980b9; }

          button:disabled { background: #bdc3c7; cursor: not-allowed; }

          .dismiss-btn { background: #e74c3c; }

          .dismiss-btn:hover { background: #c0392b; }

          .import-another-btn { background: #27ae60; }

          .import-another-btn:hover { background: #229954; }

        `}</style>

      </div>

    );

  };



  const SyncControlPanel = () => {

    const [syncDirection, setSyncDirection] = useState('both');

    const [dateRange, setDateRange] = useState({

      start: new Date().toISOString().split('T')[0],

      end: new Date().toISOString().split('T')[0]

    });



    const handleSyncClick = async () => {

      setIsSyncing(true);

      try {

        const result = await handleSync(dateRange, syncDirection);

        setSyncResult(result);

      } catch (error) {

        setSyncResult({ error: error.message });

      } finally {

        setIsSyncing(false);

      }

    };



    return (

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">

        <div className="flex items-center justify-between mb-4">

          <h3 className="text-lg font-semibold flex items-center gap-2">

            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

            </svg>

            Attendance ↔ Timesheet Sync

          </h3>

          <div className="text-sm text-gray-500">

            Last sync: {syncHistory[0]?.timestamp ? new Date(syncHistory[0].timestamp).toLocaleString() : 'Never'}

          </div>

        </div>



        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Sync Direction</label>

            <select

              value={syncDirection}

              onChange={(e) => setSyncDirection(e.target.value)}

              className="w-full px-3 py-2 border border-gray-300 rounded-lg"

            >

              <option value="attendanceToTimesheet">Attendance → Timesheet</option>

              <option value="timesheetToAttendance">Timesheet → Attendance</option>

              <option value="both">Two‑way Sync</option>

            </select>

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>

            <input

              type="date"

              value={dateRange.start}

              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}

              className="w-full px-3 py-2 border border-gray-300 rounded-lg"

            />

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>

            <input

              type="date"

              value={dateRange.end}

              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}

              className="w-full px-3 py-2 border border-gray-300 rounded-lg"

            />

          </div>

        </div>



        <div className="flex justify-between items-center mb-4">

          <div className="text-sm text-gray-600">

            {syncDirection === 'both' && 'Will sync records in both directions'}

            {syncDirection === 'attendanceToTimesheet' && 'Will convert attendance to timesheet'}

            {syncDirection === 'timesheetToAttendance' && 'Will convert timesheet to attendance'}

          </div>

          <button

            onClick={handleSyncClick}

            disabled={isSyncing}

            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${

              isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'

            }`}

          >

            {isSyncing ? (

              <>

                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>

                Syncing...

              </>

            ) : (

              <>

                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

                </svg>

                Start Sync

              </>

            )}

          </button>

        </div>



        {syncResult && (

          <div className={`p-4 rounded-lg mb-4 ${

            syncResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'

          }`}>

            <div className="flex items-start gap-3">

              {syncResult.error ? (

                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                </svg>

              ) : (

                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />

                </svg>

              )}

              <div>

                <h4 className="font-medium">{syncResult.error ? 'Sync Failed' : 'Sync Completed'}</h4>

                <p className="text-sm mt-1">{syncResult.error || 'Data synchronized successfully'}</p>

              </div>

            </div>

          </div>

        )}



        {syncHistory.length > 0 && (

          <div className="border-t pt-4">

            <h4 className="font-medium text-gray-700 mb-2">Recent Sync History</h4>

            <div className="space-y-2 max-h-40 overflow-y-auto">

              {syncHistory.map((item) => (

                <div key={item.id} className="text-sm p-2 bg-gray-50 rounded">

                  <div className="flex justify-between">

                    <span>{new Date(item.timestamp).toLocaleString()}</span>

                    <span className={`px-2 py-1 rounded text-xs ${

                      item.direction === 'attendanceToTimesheet' ? 'bg-blue-100 text-blue-800' :

                      item.direction === 'timesheetToAttendance' ? 'bg-green-100 text-green-800' :

                      'bg-purple-100 text-purple-800'

                    }`}>

                      {item.direction}

                    </span>

                  </div>

                  <div className="text-gray-500">{item.dateRange.start} to {item.dateRange.end}</div>

                </div>

              ))}

            </div>

          </div>

        )}

      </div>

    );

  };



  // ============================================================

  // 13. MAIN RENDER

  // ============================================================

  return (

    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">

      {/* Sidebar */}

      <div 

        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${

          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'

        }`}

      >

        <MainSidebar isCollapsed={!sidebarOpen} />

      </div>



      {sidebarOpen && window.innerWidth < 768 && (

        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setSidebarOpen(false)} />

      )}



      <div 

        className={`flex-1 transition-all duration-300 ${

          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'

        }`}

      >

        {/* Overlay for create modal */}

        {isCreateMenuOpen && (

          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => {

            setIsCreateMenuOpen(false);

            setIsEditing(false);

            setEditingAttendanceId(null);

            setEmployeeSearchQuery('');

          }}></div>

        )}



        <main className="flex-1 mx-auto px-4 md:px-6 pt-6 pb-40 sm:pb-28">

          {/* Header */}

          <Header toggleSidebar={toggleSidebar} user={user} onLogout={handleLogout} />



          <div className="p-6">

            {/* Top section: title and primary action */}

            <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl shadow-sm p-6">

              <div>

                <h1 className="text-2xl font-bold text-gray-800">Attendance Management</h1>

                <p className="text-gray-600">Track and manage employee attendance records</p>

              </div>



              <div className="flex flex-wrap items-center gap-2">

                <Link

                  to="/attendanceRequestReview"

                  className={`relative inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${

                    pendingAttendanceRequestCount > 0

                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'

                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'

                  }`}

                >

                  <FileCheck className="h-5 w-5" />

                  Pending Requests

                  {pendingAttendanceRequestCount > 0 && (

                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-xs font-bold text-white">

                      {pendingAttendanceRequestCount > 99 ? '99+' : pendingAttendanceRequestCount}

                    </span>

                  )}

                </Link>

                <button

                  type="button"

                  onClick={() => setShowAttendanceFilters((previous) => !previous)}

                  className={`relative inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${

                    showAttendanceFilters

                      ? 'border-blue-600 bg-blue-50 text-blue-700'

                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'

                  }`}

                >

                  <Filter className="h-5 w-5" />

                  Filters

                  {activeAttendanceFilterCount > 0 && (

                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">

                      {activeAttendanceFilterCount}

                    </span>

                  )}

                  {showAttendanceFilters ? (

                    <ChevronUp className="h-4 w-4" />

                  ) : (

                    <ChevronDown className="h-4 w-4" />

                  )}

                </button>



                <button

                  type="button"

                  onClick={() => {

                    setIsCreateMenuOpen(true);

                    setEmployeeSearchQuery('');

                    setIsEditing(false);

                    setEditingAttendanceId(null);

                  }}

                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors"

                >

                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />

                  </svg>

                  Add Attendance

                </button>

              </div>

            </section>



            {/* Attendance filter drawer */}

            {showAttendanceFilters && (

              <>

                <div

                  className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]"

                  onClick={() => setShowAttendanceFilters(false)}

                  aria-hidden="true"

                />



                <aside

                  className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl"

                  role="dialog"

                  aria-modal="true"

                  aria-labelledby="attendance-filter-title"

                >

                  <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">

                    <div className="flex items-start gap-3">

                      <div className="rounded-lg bg-blue-100 p-2 text-blue-700">

                        <Filter className="h-5 w-5" />

                      </div>

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h2 id="attendance-filter-title" className="text-base font-semibold text-gray-900">

                            Attendance Filters

                          </h2>

                          {activeAttendanceFilterCount > 0 && (

                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">

                              {activeAttendanceFilterCount} active

                            </span>

                          )}

                        </div>

                        <p className="mt-1 text-sm text-gray-500">

                          Refine attendance records without taking space from the table.

                        </p>

                      </div>

                    </div>



                    <button

                      type="button"

                      onClick={() => setShowAttendanceFilters(false)}

                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"

                      aria-label="Close attendance filters"

                    >

                      <X className="h-5 w-5" />

                    </button>

                  </div>



                  <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">

                        Search records

                      </label>

                      <div className="relative">

                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                        <input

                          type="text"

                          value={searchQuery}

                          onChange={(event) => setSearchQuery(event.target.value)}

                          placeholder="Employee, ID, status..."

                          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                        />

                        {searchQuery && (

                          <button

                            type="button"

                            onClick={() => setSearchQuery('')}

                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"

                            aria-label="Clear search"

                          >

                            <X className="h-4 w-4" />

                          </button>

                        )}

                      </div>

                    </div>



                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <div>

                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">

                          Category

                        </label>

                        <select

                          value={selectedCategoryFilter}

                          onChange={(event) => setSelectedCategoryFilter(event.target.value)}

                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                        >

                          <option value="">All categories</option>

                          {getUniqueCategories().map((category) => (

                            <option key={category} value={category}>{category}</option>

                          ))}

                        </select>

                      </div>



                      <div>

                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">

                          Record status

                        </label>

                        <select

                          value={attendanceFilter}

                          onChange={(event) => setAttendanceFilter(event.target.value)}

                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                        >

                          <option value="all">All records</option>

                          <option value="complete_records">Complete records</option>

                          <option value="incomplete_records">Incomplete records</option>

                          <option value="checked_in_only">Has check-in</option>

                          <option value="checked_out_only">Has check-out</option>

                          <option value="checked_in_no_checkout">Check-in, no check-out</option>

                          <option value="checked_out_no_checkin">Check-out, no check-in</option>

                          <option value="missing_both">Missing both times</option>

                        </select>

                      </div>

                    </div>



                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                      <div className="flex items-center justify-between gap-3">

                        <div>

                          <h3 className="text-sm font-semibold text-gray-900">Matching records</h3>

                          <p className="mt-0.5 text-xs text-gray-500">Updates instantly as filters change.</p>

                        </div>

                        <div className="text-right">

                          <div className="text-xl font-bold text-gray-900">{filteredAttendancesBySearch.length}</div>

                          <div className="text-xs text-gray-500">of {attendances.length}</div>

                        </div>

                      </div>

                    </div>



                    <div>

                      <div className="mb-2 flex items-center justify-between gap-3">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick time filters</p>

                        {(hasActiveCheckInTimeFilter || hasActiveCheckOutTimeFilter) && (

                          <button

                            type="button"

                            onClick={resetTimeFilters}

                            className="text-xs font-medium text-blue-600 hover:text-blue-800"

                          >

                            Clear times

                          </button>

                        )}

                      </div>



                      <div className="flex flex-wrap gap-2">

                        <button type="button" onClick={() => applyTimePreset('late_arrivals')} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100">

                          Late after {formatTimeForDisplay(settings.lateArrivalTime || '09:00')}

                        </button>

                        <button type="button" onClick={() => applyTimePreset('before_08')} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100">

                          Check-in by 8:00 AM

                        </button>

                        <button type="button" onClick={() => applyTimePreset('early_checkouts')} className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 transition hover:bg-yellow-100">

                          Check-out before 5:00 PM

                        </button>

                        <button type="button" onClick={() => applyTimePreset('after_18')} className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100">

                          Check-out after 6:00 PM

                        </button>

                      </div>

                    </div>



                    <div className="overflow-hidden rounded-xl border border-gray-200">

                      <button

                        type="button"

                        onClick={() => setShowAdvancedTimeFilters((previous) => !previous)}

                        className="flex w-full items-center justify-between bg-white px-4 py-3 text-left transition hover:bg-gray-50"

                      >

                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">

                          <Clock className="h-4 w-4 text-blue-600" />

                          Custom check-in and check-out

                        </span>

                        {showAdvancedTimeFilters ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}

                      </button>



                      {showAdvancedTimeFilters && (

                        <div className="space-y-4 border-t border-gray-200 bg-gray-50 p-4">

                          <div className="rounded-lg border border-gray-200 bg-white p-4">

                            <div className="mb-3 flex items-center justify-between">

                              <div>

                                <h4 className="text-sm font-semibold text-gray-900">Check-in</h4>

                                <p className="text-xs text-gray-500">Filter by arrival time.</p>

                              </div>

                              {hasActiveCheckInTimeFilter && (

                                <button type="button" onClick={removeCheckInTimeFilter} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Clear check-in filter">

                                  <X className="h-4 w-4" />

                                </button>

                              )}

                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                              <select

                                value={timeFilters.checkInOperator}

                                onChange={(event) => setTimeFilters((previous) => ({ ...previous, checkInOperator: event.target.value }))}

                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                              >

                                <option value="">Any time</option>

                                <option value="before">Before</option>

                                <option value="before_or_equal">At or before</option>

                                <option value="equal">Exactly</option>

                                <option value="after_or_equal">At or after</option>

                                <option value="after">After</option>

                              </select>

                              <input

                                type="time"

                                value={timeFilters.checkInTime}

                                onChange={(event) => setTimeFilters((previous) => ({ ...previous, checkInTime: event.target.value }))}

                                disabled={!timeFilters.checkInOperator}

                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"

                              />

                            </div>

                          </div>



                          <div className="rounded-lg border border-gray-200 bg-white p-4">

                            <div className="mb-3 flex items-center justify-between">

                              <div>

                                <h4 className="text-sm font-semibold text-gray-900">Check-out</h4>

                                <p className="text-xs text-gray-500">Filter by departure time.</p>

                              </div>

                              {hasActiveCheckOutTimeFilter && (

                                <button type="button" onClick={removeCheckOutTimeFilter} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Clear check-out filter">

                                  <X className="h-4 w-4" />

                                </button>

                              )}

                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                              <select

                                value={timeFilters.checkOutOperator}

                                onChange={(event) => setTimeFilters((previous) => ({ ...previous, checkOutOperator: event.target.value }))}

                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                              >

                                <option value="">Any time</option>

                                <option value="before">Before</option>

                                <option value="before_or_equal">At or before</option>

                                <option value="equal">Exactly</option>

                                <option value="after_or_equal">At or after</option>

                                <option value="after">After</option>

                              </select>

                              <input

                                type="time"

                                value={timeFilters.checkOutTime}

                                onChange={(event) => setTimeFilters((previous) => ({ ...previous, checkOutTime: event.target.value }))}

                                disabled={!timeFilters.checkOutOperator}

                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"

                              />

                            </div>

                          </div>

                        </div>

                      )}

                    </div>



                    {hasAnyAttendanceFilter && (

                      <div>

                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Active filters</p>

                        <div className="flex flex-wrap gap-2">

                          {searchQuery.trim() && (

                            <button type="button" onClick={() => setSearchQuery('')} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">

                              Search: “{searchQuery.trim()}” <X className="h-3.5 w-3.5" />

                            </button>

                          )}

                          {selectedCategoryFilter && (

                            <button type="button" onClick={() => setSelectedCategoryFilter('')} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200">

                              {selectedCategoryFilter} <X className="h-3.5 w-3.5" />

                            </button>

                          )}

                          {attendanceFilter !== 'all' && (

                            <button type="button" onClick={() => setAttendanceFilter('all')} className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-200">

                              {attendanceFilter.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())} <X className="h-3.5 w-3.5" />

                            </button>

                          )}

                          {hasActiveCheckInTimeFilter && (

                            <button type="button" onClick={removeCheckInTimeFilter} className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200">

                              Check-in {TIME_OPERATOR_LABELS[timeFilters.checkInOperator]} {formatTimeForDisplay(timeFilters.checkInTime)} <X className="h-3.5 w-3.5" />

                            </button>

                          )}

                          {hasActiveCheckOutTimeFilter && (

                            <button type="button" onClick={removeCheckOutTimeFilter} className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200">

                              Check-out {TIME_OPERATOR_LABELS[timeFilters.checkOutOperator]} {formatTimeForDisplay(timeFilters.checkOutTime)} <X className="h-3.5 w-3.5" />

                            </button>

                          )}

                        </div>

                      </div>

                    )}

                  </div>



                  <div className="border-t border-gray-200 bg-white px-5 py-4">

                    <div className="flex items-center justify-between gap-3">

                      <button

                        type="button"

                        onClick={resetAllAttendanceFilters}

                        disabled={!hasAnyAttendanceFilter}

                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"

                      >

                        <RotateCcw className="h-4 w-4" />

                        Clear all

                      </button>



                      <button

                        type="button"

                        onClick={() => setShowAttendanceFilters(false)}

                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"

                      >

                        View {filteredAttendancesBySearch.length} records

                      </button>

                    </div>

                  </div>

                </aside>

              </>

            )}

          </div>



          {/* Sub-navigation tabs */}

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



          {/* Timesheet Sync Panel toggle */}

          <div className="mb-4">

            <button

              onClick={() => setShowSyncPanel(!showSyncPanel)}

              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mb-4"

            >

              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showSyncPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

              </svg>

              Sync with Timesheet

              <span className="text-xs text-gray-500 ml-1">({showSyncPanel ? 'Hide' : 'Show'})</span>

            </button>

            {showSyncPanel && (

              <TimesheetAttendanceSync 

                attendances={attendances}

                employees={employees}

                settings={settings}

                selectedEmployeeIds={syncDataFromSelectedAttendances.employeeIds}

                selectedDates={syncDataFromSelectedAttendances.dates}

                onSyncComplete={(results) => {

                  if (results.attendanceToTimesheet) {

                    console.log('Attendance converted to timesheets:', results.attendanceToTimesheet.count);

                    alert(`Successfully converted ${results.attendanceToTimesheet.count} attendance records to timesheet!`);

                  }

                  fetchAttendance();

                }}

              />

            )}

          </div>



          {/* Biometric Import toggle */}

          <div className="mb-4">

            <button

              onClick={() => setShowBiometricImport(!showBiometricImport)}

              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"

            >

              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showBiometricImport ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />

              </svg>

              Biometric Import

              <span className="text-xs text-gray-500 ml-1">({showBiometricImport ? 'Hide' : 'Show'})</span>

            </button>

            {showBiometricImport && (

              <div className="mt-3">

                <BiometricAttendanceFeed />

              </div>

            )}

          </div>



          {/* Date Filters Panel */}

          <div className="mb-6">

            <button

              onClick={() => setShowDatePanel(!showDatePanel)}

              className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"

            >

              <div className="flex items-center gap-3">

                <svg 

                  xmlns="http://www.w3.org/2000/svg" 

                  className={`h-5 w-5 text-blue-600 transition-transform duration-200 ${showDatePanel ? 'rotate-90' : ''}`} 

                  fill="none" 

                  viewBox="0 0 24 24" 

                  stroke="currentColor"

                >

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />

                </svg>

                <div className="text-left">

                  <h3 className="font-semibold text-blue-800">Date Filters & Actions</h3>

                  <p className="text-sm text-blue-600">{getFilterDisplayText()}</p>

                </div>

              </div>

              <div className="flex items-center gap-2">

                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">

                  {showDatePanel ? 'Hide' : 'Show'} Controls

                </span>

                {dateFilterMode !== 'none' && (

                  <span className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">✓</span>

                )}

              </div>

            </button>



            {showDatePanel && (

              <div className="mt-2 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Left column: Date filter controls */}

                  <div className="space-y-4">

                    <div className="flex items-center gap-2 mb-2">

                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />

                      </svg>

                      <h3 className="text-lg font-semibold text-gray-800">Filter by Date</h3>

                    </div>

                    <div className="grid grid-cols-3 gap-2">

                      <button

                        onClick={() => setDateFilterMode('single')}

                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${

                          dateFilterMode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                        }`}

                      >

                        Single Date

                      </button>

                      <button

                        onClick={() => setDateFilterMode('range')}

                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${

                          dateFilterMode === 'range' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                        }`}

                      >

                        Date Range

                      </button>

                      <button

                        onClick={() => setDateFilterMode('none')}

                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${

                          dateFilterMode === 'none' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                        }`}

                      >

                        All Dates

                      </button>

                    </div>



                    {dateFilterMode === 'single' && (

                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">

                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>

                        <div className="flex gap-2">

                          <input

                            type="date"

                            value={singleDate}

                            onChange={(e) => setSingleDate(e.target.value)}

                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                          />

                          <button

                            onClick={applySingleDateFilter}

                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"

                          >

                            Apply

                          </button>

                        </div>

                      </div>

                    )}



                    {dateFilterMode === 'range' && (

                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">

                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date Range</label>

                        <div className="grid grid-cols-2 gap-3">

                          <div>

                            <label className="block text-xs text-gray-500 mb-1">Start Date</label>

                            <input

                              type="date"

                              value={rangeStart}

                              onChange={(e) => setRangeStart(e.target.value)}

                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                            />

                          </div>

                          <div>

                            <label className="block text-xs text-gray-500 mb-1">End Date</label>

                            <input

                              type="date"

                              value={rangeEnd}

                              onChange={(e) => setRangeEnd(e.target.value)}

                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                            />

                          </div>

                        </div>

                        <button

                          onClick={applyRangeFilter}

                          className="w-full mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"

                        >

                          Apply Range

                        </button>

                      </div>

                    )}



                    {dateFilterMode === 'none' && (

                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">

                        <p className="text-gray-600">Showing all attendance records</p>

                        <p className="text-xs text-gray-400 mt-1">Total records: {attendances.length}</p>

                      </div>

                    )}

                  </div>



                  {/* Right column: Actions */}

                  <div className="space-y-4">

                    <div className="flex items-center gap-2">

                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />

                      </svg>

                      <h3 className="text-lg font-semibold text-gray-800">Actions</h3>

                    </div>



                    <div className="grid grid-cols-2 gap-3">

                      {/* Show/Hide Cleared */}

                      <button

                        onClick={() => {

                          setShowHidden(!showHidden);

                          fetchAttendance();

                        }}

                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${

                          showHidden ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                        }`}

                      >

                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showHidden ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />

                        </svg>

                        {showHidden ? 'Hide Cleared' : 'Show Cleared'}

                      </button>



                      {/* Clear View */}

                      <button

                        onClick={clearTableAndForm}

                        disabled={dateFilterMode !== 'single'}

                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${

                          dateFilterMode === 'single' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'

                        }`}

                        title={dateFilterMode !== 'single' ? 'Switch to Single Date mode to clear records' : ''}

                      >

                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />

                        </svg>

                        Clear View

                      </button>



                      {/* Validate All */}

                      <button

                        onClick={() => validateAttendance()}

                        disabled={!isAllSelected || isValidating}

                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${

                          isAllSelected && !isValidating ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'

                        }`}

                      >

                        {isValidating ? (

                          <>

                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>

                            Validating...

                          </>

                        ) : (

                          <>

                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />

                            </svg>

                            Validate All

                          </>

                        )}

                      </button>



                      {/* Reset All */}

                      <button

                        onClick={() => {

                          resetClearedDates();

                          resetDateFilters();

                        }}

                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"

                      >

                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

                        </svg>

                        Reset All

                      </button>

                    </div>



                    {/* Import/Export buttons */}

                    <div className="grid grid-cols-2 gap-3 pt-2">

                      <label className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors relative">

                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" />

                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                        </svg>

                        Import Excel

                      </label>

                      <button 

                        onClick={handleExport}

                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"

                      >

                        <Download size={16} />

                        Export Filtered CSV

                      </button>

                    </div>



                    {/* NEW: Batch Update button */}

                    <div className="grid grid-cols-2 gap-3 pt-2">

                    <button

                      onClick={() => {

                        if (selectedAttendanceIds.size === 0) {

                          alert('Please select at least one attendance record.');

                          return;

                        }

                        setShowBatchUpdateModal(true);

                      }}

                      disabled={selectedAttendanceIds.size === 0}

                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${

                        selectedAttendanceIds.size > 0

                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'

                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'

                      }`}

                    >

                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />

                      </svg>

                      Batch Update ({selectedAttendanceIds.size})

                    </button>



                    <button

  type="button"

  onClick={bulkDeleteAttendances}

  disabled={

    selectedAttendanceIds.size === 0 ||

    loading

  }

  className={`px-4 py-2 rounded-md text-white ${

    selectedAttendanceIds.size === 0 || loading

      ? "bg-gray-400 cursor-not-allowed"

      : "bg-red-600 hover:bg-red-700"

  }`}

>

  {loading

    ? "Deleting..."

    : `Delete Selected (${selectedAttendanceIds.size})`}

</button>

</div>

                  </div>

                </div>

              </div>

            )}

          </div>



          {/* Attendance Table */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            <div className="overflow-x-auto">

              <table className="min-w-full divide-y divide-gray-200">

                <thead className="bg-gray-50">

                  <tr>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                      <input 

                        type="checkbox"

                        checked={

                          filteredAttendancesBySearch.filter((attendance) => typeof attendance.id === 'number').length > 0 &&

                          filteredAttendancesBySearch

                            .filter((attendance) => typeof attendance.id === 'number')

                            .every((attendance) => selectedAttendanceIds.has(attendance.id))

                        }

                        onChange={handleHeaderCheckboxChange}

                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"

                      />

                    </th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Hours</th>

                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>

                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>

                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>

                  </tr>

                </thead>



                <tbody className="bg-white divide-y divide-gray-200">

                  {filteredAttendancesBySearch.map((attendance) => (

                    <tr key={attendance.id} className="hover:bg-gray-50">

                      <td className="px-6 py-4 whitespace-nowrap">

                        <input 

                          type="checkbox" 

                          id={`checkbox-${attendance.id}`}

                          checked={selectedAttendanceIds.has(attendance.id)}

                          onChange={(e) => handleAttendanceCheckboxChange(attendance.id, e.target.checked)}

                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"

                        />

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">

                        <div className="flex items-center">

                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">

                            <span className="text-gray-700 font-medium">

                              {attendance?.employee?.firstName?.charAt(0)}{attendance?.employee?.lastName?.charAt(0)}

                            </span>

                          </div>

                          <div className="ml-4">

                            <div className="text-sm font-medium text-gray-900">

                              {attendance?.employee 

                                ? `${attendance.employee.firstName} ${attendance.employee.lastName}`

                                : "Loading..."}

                            </div>

                            <div className="text-sm text-gray-500">{attendance?.employee?.employeeId || 'N/A'}</div>

                          </div>

                        </div>

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">

                        <div className="text-sm text-gray-500">{attendance?.employee?.category?.name || 'No Category'}</div>

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                        {new Date(attendance.date).toLocaleDateString('en-US', {

                          year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'

                        })}

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attendance.checkIn || '--:--'}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attendance.checkOut || '--:--'}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attendance.minimumHour?.toFixed(2)}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attendance.standardHours}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">

                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${

                          attendance.shift === 'Day' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'

                        }`}>

                          {attendance.shift}

                        </span>

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">

                        <div className="flex items-center">

                          <StatusBadge attendance={attendance} />

                        </div>

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

                        <div className="flex justify-end items-center gap-2">

                          <button

                            onClick={() => validateAttendance([attendance.id])}

                            disabled={isValidating}

                            className={`px-3 py-1 rounded-md text-sm ${

                              isValidating ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'

                            }`}

                          >

                            Validate

                          </button>

                          <button

                            onClick={(e) => handlePopupMenu(e, attendance.id)}

                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"

                          >

                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />

                            </svg>

                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>



            {filteredAttendancesBySearch.length === 0 && (

              <div className="px-6 py-14 text-center">

                <div className="mx-auto flex max-w-sm flex-col items-center">

                  <div className="mb-3 rounded-full bg-gray-100 p-3">

                    <Filter className="h-6 w-6 text-gray-400" />

                  </div>

                  <h3 className="text-sm font-semibold text-gray-900">No attendance records found</h3>

                  <p className="mt-1 text-sm text-gray-500">

                    {hasAnyAttendanceFilter

                      ? 'No records match the current search and time-filter conditions.'

                      : 'There are no attendance records for the selected date period.'}

                  </p>

                  {hasAnyAttendanceFilter && (

                    <button

                      type="button"

                      onClick={resetAllAttendanceFilters}

                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"

                    >

                      <RotateCcw className="h-4 w-4" />

                      Clear filters

                    </button>

                  )}

                </div>

              </div>

            )}

          </div>



          {/* ============================================================

              CREATE/EDIT ATTENDANCE MODAL

          ============================================================ */}

          {isCreateMenuOpen && (

            <div 

              ref={createMenuRef} 

              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto"

            >

              <div className="flex justify-between items-center mb-6">

                <h1 className="text-2xl font-bold text-gray-800">

                  {isEditing ? 'Edit Attendance' : 'Add Attendance'}

                </h1>

                <button 

                  onClick={() => {

                    setIsCreateMenuOpen(false);

                    setIsEditing(false);

                    setEditingAttendanceId(null);

                    setEmployeeSearchQuery('');

                  }}

                  className="text-gray-500 hover:text-gray-700"

                >

                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                  </svg>

                </button>

              </div>



              <div className="space-y-6">

                {/* Date selection */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Mode</label>

                      <select

                        value={createDateMode}

                        onChange={(e) => setCreateDateMode(e.target.value)}

                        disabled={isEditing}

                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"

                      >

                        <option value="single">Single Date</option>

                        <option value="range">Date Range</option>

                      </select>

                    </div>

                    {createDateMode === "single" && (

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>

                        <input

                          type="date"

                          value={newAttendance.date || singleDate}

                          onChange={(e) => {

                            const v = e.target.value;

                            setNewAttendance(prev => ({ ...prev, date: v }));

                            setCreateRangeStart(v);

                            setCreateRangeEnd(v);

                          }}

                          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"

                        />

                      </div>

                    )}

                  </div>



                  {createDateMode === "range" && !isEditing && (

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>

                        <input

                          type="date"

                          value={createRangeStart}

                          onChange={(e) => setCreateRangeStart(e.target.value)}

                          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"

                        />

                      </div>

                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>

                        <input

                          type="date"

                          value={createRangeEnd}

                          onChange={(e) => setCreateRangeEnd(e.target.value)}

                          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"

                        />

                      </div>

                    </div>

                  )}



                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>

                    <select

                      value={newAttendance.category}

                      onChange={(e) => setNewAttendance({ ...newAttendance, category: e.target.value })}

                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    >

                      <option value="">All Categories</option>

                      <option value="Projects">Projects</option>

                      <option value="Site Services">Site Services</option>

                      <option value="Ahafo North">Ahafo North</option>

                    </select>

                  </div>

                </div>



                {/* Employee selection */}

                <div className="space-y-4">

                  <div className="flex items-center justify-between flex-wrap gap-3">

                    <h3 className="text-lg font-medium text-gray-800">Employee Selection</h3>

                    <div className="flex items-center space-x-4">

                      <label className="flex items-center space-x-2 text-sm text-gray-700">

                        <input

                          type="checkbox"

                          checked={selectAllEmployees}

                          onChange={(e) => setSelectAllEmployees(e.target.checked)}

                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"

                        />

                        <span>Select All</span>

                      </label>

                      <button 

                        onClick={() => setShowExcludedEmployees(!showExcludedEmployees)}

                        className="text-sm text-blue-600 hover:text-blue-800"

                      >

                        {showExcludedEmployees ? 'Show Available' : 'Show Excluded'}

                      </button>

                    </div>

                  </div>



                  {!showExcludedEmployees && !isEditing && (

                    <div className="relative">

                      <input

                        type="text"

                        placeholder="Search employees by name, ID, or category..."

                        value={employeeSearchQuery}

                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}

                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                      />

                      <svg 

                        xmlns="http://www.w3.org/2000/svg" 

                        className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 

                        fill="none" 

                        viewBox="0 0 24 24" 

                        stroke="currentColor"

                      >

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                      </svg>

                      {employeeSearchQuery && (

                        <button

                          onClick={() => setEmployeeSearchQuery('')}

                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"

                        >

                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                          </svg>

                        </button>

                      )}

                    </div>

                  )}



                  {!showExcludedEmployees ? (

                    <div className="border border-gray-200 rounded-lg overflow-hidden">

                      <select

                        name="employeeId"

                        value={selectedEmployees}

                        onChange={handleInputChange}

                        disabled={selectAllEmployees || isEditing}

                        multiple={!isEditing}

                        className={`w-full ${isEditing ? 'h-16' : 'h-64'} px-3 py-2 border-none focus:ring-2 focus:ring-blue-500`}

                      >

                        {isEditing ? (

                          <option value={newAttendance.employee?.id} className="px-3 py-2">

                            {employees.find(e => e.id === newAttendance.employee?.id)?.firstName} {employees.find(e => e.id === newAttendance.employee?.id)?.lastName} ({newAttendance.employee?.id})

                          </option>

                        ) : filteredEmployeesBySearch.length > 0 ? (

                          filteredEmployeesBySearch.map((employee) => (

                            <option key={employee.id} value={employee.id} className="px-3 py-2">

                              {employee.firstName} {employee.lastName} ({employee.employeeId || 'N/A'}) - {employee.category?.name || 'No Category'}

                            </option>

                          ))

                        ) : (

                          <option disabled className="px-3 py-2 text-gray-500">

                            {employeeSearchQuery ? `No employees match "${employeeSearchQuery}"` : 'No employees available for the selected date'}

                          </option>

                        )}

                      </select>

                      {!isEditing && filteredEmployeesBySearch.length > 0 && employeeSearchQuery && (

                        <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t">

                          Found {filteredEmployeesBySearch.length} employee(s)

                        </div>

                      )}

                    </div>

                  ) : (

                    <div className="border border-gray-200 rounded-lg overflow-hidden">

                      <div className="w-full h-64 px-3 py-2 border-none overflow-y-auto bg-gray-50">

                        {employees.filter(employee => {

                          const hasAttendance = attendances.some(a => 

                            a.employee?.id === employee.id && a.date === singleDate

                          );

                          const hasOvertime = overtimes.some(o => 

                            o.employee?.id === employee.id && o.date === singleDate

                          );

                          const activeLeaves = leaves.filter(l => 

                            l.employee?.id === employee.id &&

                            l.status === "Approved" &&

                            new Date(singleDate) >= new Date(l.startDate) && 

                            new Date(singleDate) <= new Date(l.endDate)

                          );

                          return hasAttendance || hasOvertime || activeLeaves.length > 0;

                        }).map(employee => {

                          const activeLeaves = leaves.filter(l => 

                            l.employee?.id === employee.id &&

                            l.status === "Approved" &&

                            new Date(singleDate) >= new Date(l.startDate) && 

                            new Date(singleDate) <= new Date(l.endDate)

                          );

                          return (

                            <div key={employee.id} className="flex items-center py-2 px-3 border-b border-gray-200 last:border-b-0">

                              <span className="inline-block h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-sm font-medium">

                                {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}

                              </span>

                              <div className="flex-1">

                                <p className="font-medium text-gray-900">

                                  {employee.firstName} {employee.lastName}

                                </p>

                                <p className="text-xs text-gray-500">

                                  {activeLeaves.length > 0 ? 

                                    `On ${activeLeaves[0].leaveType} leave` : 

                                    'Already has attendance/overtime'}

                                </p>

                              </div>

                            </div>

                          );

                        })}

                        {employees.filter(employee => {

                          const hasAttendance = attendances.some(a => 

                            a.employee?.id === employee.id && a.date === singleDate

                          );

                          const hasOvertime = overtimes.some(o => 

                            o.employee?.id === employee.id && o.date === singleDate

                          );

                          const activeLeaves = leaves.filter(l => 

                            l.employee?.id === employee.id &&

                            l.status === "Approved" &&

                            new Date(singleDate) >= new Date(l.startDate) && 

                            new Date(singleDate) <= new Date(l.endDate)

                          );

                          return hasAttendance || hasOvertime || activeLeaves.length > 0;

                        }).length === 0 && (

                          <div className="text-center py-8 text-gray-500">

                            No excluded employees

                          </div>

                        )}

                      </div>

                    </div>

                  )}

                </div>



                {/* Check-in/out, Work Type, Shift, Status */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">Check‑in</label>

                    <input

                      type="time"

                      value={newAttendance.checkIn}

                      onChange={(e) => setNewAttendance({ ...newAttendance, checkIn: e.target.value })}

                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">Check‑out</label>

                    <input

                      type="time"

                      value={newAttendance.checkOut}

                      onChange={(e) => setNewAttendance({ ...newAttendance, checkOut: e.target.value })}

                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>

                    <select

                      value={newAttendance.workType}

                      onChange={(e) => setNewAttendance({ ...newAttendance, workType: e.target.value })}

                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    >

                      <option value="" disabled>Select Work Type</option>

                      <option value="Regular">Regular</option>

                      <option value="Contract">Contract</option>

                    </select>

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>

                    <select

                      name="shift"

                      value={newAttendance.shift}

                      onChange={handleInputChange}

                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    >

                      <option value="">Select Shift</option>

                      <option value="Day">Day</option>

                      <option value="Night">Night</option>

                    </select>

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>

                    <StatusDropdown />

                    {(isHoliday(newAttendance.date || singleDate) || isWeekend(newAttendance.date || singleDate) || isSpecialWeekend(newAttendance.date || singleDate)) && (

                      <p className="text-xs text-purple-600 mt-1 flex items-center">

                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />

                        </svg>

                        {isHoliday(newAttendance.date || singleDate) 

                          ? "This date is configured as a holiday"

                          : isSpecialWeekend(newAttendance.date || singleDate)

                          ? `This is a special weekend: ${settings.specialWeekends?.find(sw => sw.date === (newAttendance.date || singleDate))?.name}`

                          : "This date falls on a weekend"}

                      </p>

                    )}

                  </div>

                </div>



                {/* Form buttons */}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">

                  <button

                    onClick={() => {

                      setNewAttendance({

                        employee: { id: '' },

                        shift: '',

                        workType: '',

                        category: '',

                        date: singleDate,

                        status: '',

                        minimumHour: '',

                        checkIn: '',

                        checkOut: '',

                      });

                      setSelectedEmployees([]);

                      setSelectAllEmployees(false);

                      setEmployeeSearchQuery('');

                      if (isEditing) {

                        setIsEditing(false);

                        setEditingAttendanceId(null);

                      }

                    }}

                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"

                  >

                    Clear

                  </button>

                  <button

                    onClick={createAttendance}

                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"

                  >

                    {isEditing ? 'Update Attendance' : 'Submit Attendance'}

                  </button>

                </div>

              </div>

            </div>

          )}



          {/* ============================================================

              BATCH UPDATE MODAL (NEW)

          ============================================================ */}

          {showBatchUpdateModal && (

            <>

              <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowBatchUpdateModal(false)}></div>

              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-[90%] max-w-md">

                <div className="flex justify-between items-center mb-6">

                  <h2 className="text-xl font-bold text-gray-800">Batch Update</h2>

                  <button 

                    onClick={() => setShowBatchUpdateModal(false)}

                    className="text-gray-500 hover:text-gray-700"

                  >

                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                    </svg>

                  </button>

                </div>

                <p className="text-sm text-gray-600 mb-4">

                  Updating <strong>{selectedAttendanceIds.size}</strong> selected record(s).

                  Leave a field empty to keep its current value.

                </p>

                <div className="space-y-4">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">New Check‑in</label>

                    <input

                      type="time"

                      value={batchUpdateData.checkIn}

                      onChange={(e) => setBatchUpdateData({ ...batchUpdateData, checkIn: e.target.value })}

                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"

                      placeholder="Keep current"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">New Check‑out</label>

                    <input

                      type="time"

                      value={batchUpdateData.checkOut}

                      onChange={(e) => setBatchUpdateData({ ...batchUpdateData, checkOut: e.target.value })}

                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"

                      placeholder="Keep current"

                    />

                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">

                    <button

                      onClick={() => setShowBatchUpdateModal(false)}

                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"

                    >

                      Cancel

                    </button>

                    <button

                      onClick={batchUpdateAttendance}

                      disabled={batchUpdating}

                      className={`px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition ${

                        batchUpdating ? 'opacity-50 cursor-not-allowed' : ''

                      }`}

                    >

                      {batchUpdating ? 'Updating...' : 'Update All'}

                    </button>

                  </div>

                </div>

              </div>

            </>

          )}



          {/* ============================================================

              RIGHT‑CLICK CONTEXT MENU

          ============================================================ */}

          {popupMenu.isOpen && (

            <>

              <div className="fixed inset-0 z-40" onClick={handleClosePopupMenu} />

              <div 

                className="fixed bg-white border border-gray-200 shadow-lg rounded-md z-50"

                style={{ top: `${popupMenu.position.y}px`, left: `${popupMenu.position.x}px` }}

              >

                <button 

                  onClick={() => handleEditAttendance(popupMenu.attendanceId)}

                  className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100"

                >

                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">

                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />

                  </svg>

                  Edit

                </button>

                <button 

                  onClick={() => handleDeleteAttendance(popupMenu.attendanceId)}

                  className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100 text-red-500"

                >

                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">

                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />

                  </svg>

                  Delete

                </button>

              </div>

            </>

          )}

        </main>

      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg md:left-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Total attendance records: <span className="font-semibold">{attendanceTotalRecords}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={attendancePageSize}
              onChange={(event) => {
                setAttendancePageSize(Number(event.target.value));
                setAttendancePage(0);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
              <option value={500}>500 per page</option>
            </select>
            <button
              type="button"
              disabled={loading || attendancePage === 0}
              onClick={() => {
                const previousPage = Math.max(attendancePage - 1, 0);
                setAttendancePage(previousPage);
                fetchAttendance(previousPage);
              }}
              className="rounded-md border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="min-w-28 text-center text-sm">
              Page {attendanceTotalPages === 0 ? 0 : attendancePage + 1} of {attendanceTotalPages}
            </span>
            <button
              type="button"
              disabled={loading || attendanceTotalPages === 0 || attendancePage + 1 >= attendanceTotalPages}
              onClick={() => {
                const nextPage = attendancePage + 1;
                setAttendancePage(nextPage);
                fetchAttendance(nextPage);
              }}
              className="rounded-md border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <BiometricStatus />

    </div>

  );

}



export default Attendance;
