import { useState, useEffect, useRef, useContext } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link, useLocation, useNavigate } from "react-router-dom";
import SockJS from 'sockjs-client';
import BiometricAttendanceFeed from "./BiometricAttendanceFeed";
import { Client as StompClient } from '@stomp/stompjs';
import * as XLSX from 'xlsx';
import MainSidebar from "../mainSidebar";
import Search from "../../../compnents/search";

import {
  Download
} from "lucide-react";

function Attendance() {
  const [query, setQuery] = useState('');
  const { settings, updateSettings } = useContext(SettingsContext);
  const { hourlyRate, overtimeHourlyRate, weekendDays, holidays } = settings;
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();
  const [attendances, setAttendances] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const createMenuRef = useRef(null);
  const [resetForm, setResetForm] = useState();
  const [selectAllEmployees, setSelectAllEmployees] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
  const [showExcludedEmployees, setShowExcludedEmployees] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [leavesData, setLeavesData] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
 const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [datesToClear, setDatesToClear] = useState([]);
const [showHidden, setShowHidden] = useState(false);
const [selectedDateToClear, setSelectedDateToClear] = useState('');

const [clearedDates, setClearedDates] = useState(() => {
    const saved = localStorage.getItem('clearedAttendanceDates');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [newAttendance, setNewAttendance] = useState({
    employee: {
      id: '',
    },
    shift: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    status: '',
    minimumHour: '',
    checkIn: '',
    checkOut: '',
  });

  const filteredEmployees = employees.filter(employee => {
    if (!newAttendance.category) return true;
    return employee.category === newAttendance.category;
  });

  const [totalMinimumAmount, setTotalMinimumAmount] = useState(0);
  
  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchHolidays();
  }, [globalDate]);
  
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    name: '',
    recurring: false
  });
  
  const [totalOvertimeAmount, setTotalOvertimeAmount] = useState(0);
  const [overtimes, setOvertimes] = useState([]);
  const [newOverview, setNewOverview] = useState({
    overviewId: '',
    employee: { id: '' },
    attendance: { id: '' },
    overtime: {id: ''},
    shift: '',
    date: '',
    status: '',
    hoursWorked: '',
    minimumHour: '',
    version: '',
  });

  useEffect(() => {
  if (startDate || endDate) {
    const timer = setTimeout(() => {
      fetchAttendance();
    }, 500); // Debounce to avoid too many requests
    
    return () => clearTimeout(timer);
  }
}, [startDate, endDate, showHidden]);

// Also add this to handle globalDate changes
useEffect(() => {
  fetchAttendance();
}, [globalDate, clearedDates]);

  const handleHeaderCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setIsAllSelected(isChecked);
    
    attendances.forEach(attendance => {
      const checkbox = document.getElementById(`checkbox-${attendance.id}`);
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    });
  };

 const clearSelectedDates = () => {
  if (datesToClear.length === 0) {
    alert("No dates selected to clear.");
    return;
  }
  
  if (!window.confirm(`Are you sure you want to hide all records for these dates: ${datesToClear.join(', ')}?`)) {
    return;
  }
  
  setClearedDates(prev => [...new Set([...prev, ...datesToClear])]);
  setDatesToClear([]);
  fetchAttendance();
  alert(`Hidden records for: ${datesToClear.join(', ')}`);
};

  useEffect(() => {
    localStorage.setItem('clearedAttendanceDates', JSON.stringify(clearedDates));
  }, [clearedDates]);

  useEffect(() => {
    const minAmount = newAttendance.minimumHour * hourlyRate;
    setTotalMinimumAmount(minAmount);

    const overtimeAmount = newAttendance.overtime * overtimeHourlyRate;
    setTotalOvertimeAmount(overtimeAmount);
  }, [newAttendance.minimumHour, newAttendance.overtime, hourlyRate, overtimeHourlyRate]);

  const isWeekend = (date) => {
    const day = new Date(date).getDay();
    return (settings.weekendDays || []).includes(day);
  };

  const isHoliday = (date) => {
    if (!date) return false;
    const dateStr = new Date(date).toISOString().split('T')[0];
    return holidays.some(holiday => {
      if (holiday.recurring) {
        const holidayDate = new Date(holiday.date);
        const checkDate = new Date(date);
        return holidayDate.getMonth() === checkDate.getMonth() && 
               holidayDate.getDate() === checkDate.getDate();
      }
      return holiday.date === dateStr;
    });
  };

  const fetchHolidays = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/holidays', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch holidays');
      const data = await response.json();
      updateSettings({ ...settings, holidays: data });
    } catch (err) {
      setError(err.message);
    }
  };
  
  const createHoliday = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/holidays', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newHoliday)
      });
      if (!response.ok) throw new Error('Failed to create holiday');
      fetchHolidays();
      setNewHoliday({ date: '', name: '', recurring: false });
    } catch (err) {
      setError(err.message);
    }
  };

  const [popupMenu, setPopupMenu] = useState({
    isOpen: false,
    attendanceId: null,
    position: { x: 0, y: 0 }
  });

  const handleClosePopupMenu = () => {
    setPopupMenu({ ...popupMenu, isOpen: false });
  };

  const handleEditAttendance = (id) => {
    const attendance = attendances.find(a => a.id === id);
    if (attendance) {
      setNewAttendance({
        ...attendance,
        employee: { id: attendance.employee?.id || '' }
      });
      setIsCreateMenuOpen(true);
    }
    handleClosePopupMenu();
  };

  const handleDeleteAttendance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      handleClosePopupMenu();
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`http://localhost:8080/api/attendance/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
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

  const handlePopupMenu = (e, attendanceId) => {
    e.preventDefault();
    setPopupMenu({
      isOpen: true,
      attendanceId,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
  }, [newAttendance.date]);

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null); 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setIsCreateMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchHolidays();
    const fetchLeaves = async () => {
      try {
        const token = getToken();
        const response = await fetch('http://localhost:8080/api/leave', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) throw new Error('Failed to fetch leaves');
        setLeaves(await response.json());
      } catch (err) {
        setError(err.message);
      }
    };
    fetchLeaves();
  }, [globalDate]);
  
  const toggleSettingsMenu = () => {
    setIsSettingsMenuOpen(!isSettingsMenuOpen);
  };

  const handleInputChange = (e) => {
    const { name, options } = e.target;
  
    if (name === "employeeId") {
      const selectedOptions = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);
  
      setSelectedEmployees(selectedOptions);
     setNewAttendance((prev) => ({
  ...prev,
  employeeIds: selectedOptions, // Store as separate array
}));
    } else {
      setNewAttendance((prev) => ({
        ...prev,
        [name]: e.target.value,
      }));
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [employeesRes, attendanceRes, overtimeRes, leavesRes] = await Promise.all([
        fetch('http://localhost:8080/api/employee', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch('http://localhost:8080/api/attendance', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch('http://localhost:8080/api/overtime', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch('http://localhost:8080/api/leave', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      ]);

      if (!employeesRes.ok) throw new Error('Failed to fetch employees');
      
      const employeesData = await employeesRes.json();
      const attendancesData = attendanceRes.ok ? await attendanceRes.json() : [];
      const overtimesData = overtimeRes.ok ? await overtimeRes.json() : [];
      const leavesData = leavesRes.ok ? await leavesRes.json() : [];

      const filteredEmployees = employeesData.filter(employee => {
        const hasAttendance = attendancesData.some(a => 
          a.employee?.id === employee.id && 
          a.date === globalDate
        );
        
        const hasOvertime = overtimesData.some(o => 
          o.employee?.id === employee.id && 
          o.date === globalDate
        );
        
        const hasLeave = leavesData.some(l => 
          l.employee?.id === employee.id &&
          l.status !== "Rejected" &&
          new Date(globalDate) >= new Date(l.startDate) && 
          new Date(globalDate) <= new Date(l.endDate)
        );

        return !hasAttendance && !hasOvertime && !hasLeave;
      });

      setEmployees(filteredEmployees);
    } catch (err) {
      setError(err.message);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

 const fetchAttendance = async () => {
  setLoading(true);
  try {
    const token = getToken();
    const response = await fetch('http://localhost:8080/api/attendance', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) throw new Error('Failed to fetch attendance');

    let data = await response.json();

    // 🔹 Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      data = data.filter(att => {
        const attDate = new Date(att.date);
        return attDate >= start && attDate <= end;
      });
    } else if (globalDate) {
      data = data.filter(att => att.date === globalDate);
    }

    // 🔹 Respect clearedDates
    if (!showHidden) {
      data = data.filter(att => !clearedDates.includes(att.date));
    }

    setAttendances(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const addDateToClear = () => {
  if (!selectedDateToClear) {
    alert("Please select a date first");
    return;
  }
  
  if (!datesToClear.includes(selectedDateToClear)) {
    setDatesToClear(prev => [...prev, selectedDateToClear]);
    setSelectedDateToClear('');
  }
};

const removeDateFromClear = (dateToRemove) => {
  setDatesToClear(prev => prev.filter(date => date !== dateToRemove));
};



 // Enhanced the mapExcelToAttendance function to handle various date formats
const normalizeDate = (dateStr) => {
  if (!dateStr) return globalDate;
  
  // Handle Excel date numbers (serial numbers)
  if (typeof dateStr === 'number') {
    const date = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // Handle string dates in various formats
  if (typeof dateStr === 'string') {
    // Try to parse as ISO format first
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Try to parse as "YYYY/MM/DD" format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const year = parts[0].padStart(4, '20');
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    // Try to parse as "MM/DD/YYYY" format
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // If all else fails, return today's date
  return globalDate;
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

  useEffect(() => {
    const date = newAttendance.date;
    if (!date) return;
  
    if (isHoliday(date)) {
      setNewAttendance(prev => ({...prev, status: 'Holiday Present'}));
    } else if (isWeekend(date)) {
      setNewAttendance(prev => ({...prev, status: 'Weekend Present'}));
    }
  }, [newAttendance.date, settings.holidays, settings.weekendDays]);

  // Modified to handle multiple employee IDs correctly
const createAttendance = async () => {
  // Calculate hours worked
  const calculateMinimumHour = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    const [checkInHour, checkInMinute] = checkIn.split(':').map(Number);
    const [checkOutHour, checkOutMinute] = checkOut.split(':').map(Number);
    
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
    const checkOutTotalMinutes = checkOutHour * 60 + checkOutMinute;
    
    const diffMinutes = checkOutTotalMinutes - checkInTotalMinutes;
    return diffMinutes / 60;
  };

  const minimumHour = calculateMinimumHour(newAttendance.checkIn, newAttendance.checkOut);
  const standardHours = settings.standardWorkHours || 8;
  const overtimeHours = Math.max(minimumHour - standardHours, 0);
  const regularHours = Math.min(minimumHour, standardHours);

  // Get the employee IDs to process
  const employeeIdsToProcess = selectAllEmployees 
    ? employees.map(emp => emp.id) 
    : newAttendance.employeeIds || [];

  // Process each employee
  for (const employeeId of employeeIdsToProcess) {
    const attendanceData = {
      employee: { id: employeeId },
      shift: newAttendance.shift,
      workType: newAttendance.workType,
      date: newAttendance.date,
      status: newAttendance.status,
      minimumHour: regularHours,
      checkIn: newAttendance.checkIn,
      checkOut: newAttendance.checkOut,
    };

    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/attendance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(attendanceData),
      });

      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      
      const attendance = await response.json();
      
      // Create overtime record if needed
      if (overtimeHours > 0) {
        const overtimeData = {
          employee: { id: employeeId },
          date: newAttendance.date,
          startTime: calculateOvertimeStartTime(newAttendance.checkIn, standardHours),
          endTime: newAttendance.checkOut,
          overtimeHours: overtimeHours,
          status: 'Pending',
          relatedAttendanceId: attendance.id
        };

        await fetch('http://localhost:8080/api/overtime', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(overtimeData),
        });
      }
    } catch (err) {
      console.error('Error creating attendance/overtime for employee:', employeeId, err);
    }
  }

  // Reset form
  setNewAttendance({
    employeeIds: [],
    shift: '',
    workType: '',
    date: globalDate,
    status: '',
    minimumHour: '',
    checkIn: '',
    checkOut: '',
  });
  setSelectedEmployees([]);
  setSelectAllEmployees(false);
  fetchEmployees();
};

  const calculateOvertimeStartTime = (checkIn, standardHours) => {
    if (!checkIn) return '';
    const [hours, minutes] = checkIn.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (standardHours * 60);
    
    const overtimeHours = Math.floor(totalMinutes / 60) % 24;
    const overtimeMinutes = totalMinutes % 60;
    
    return `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMinutes).padStart(2, '0')}`;
  };

  const clearNewAttendanceForm = () => {
    setNewAttendance({
      employee: { id: '' },
      shift: '',
      workType: '',
      date: globalDate,
      status: '',
      minimumHour: '',
      checkIn: '',
      checkOut: '',
    });
    setSelectedEmployees([]);
    setSelectAllEmployees(false);
    setError('');
    alert('Form cleared for new attendance entries');
  };
  
  const clearTableAndForm = () => {
    if (!globalDate) {
      alert("Please select a date first");
      return;
    }
  
    if (!window.confirm(`Are you sure you want to hide all records for ${globalDate}?`)) {
      return;
    }
  
    setClearedDates(prev => 
      prev.includes(globalDate) ? prev : [...prev, globalDate]
    );
    
    setAttendances(prev => prev.filter(att => att.date !== globalDate));
    
    alert(`Hidden records for ${globalDate}. Use "Reset All" to show them again.`);
  };

const validateAttendance = async (ids = null) => {
  setIsValidating(true);
  setError('');

  let checkedAttendanceIds = [];

  if (ids && ids.length > 0) {
    // ✅ Case 1: Single row button passed an ID
    checkedAttendanceIds = Array.isArray(ids) ? ids.map(Number) : [Number(ids)];
  } else if (isAllSelected) {
    // ✅ Case 3: "Select All" toggle
    checkedAttendanceIds = attendances.map(a => Number(a.id));
  } else {
    // ✅ Case 2: Collect all manually checked checkboxes
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
    console.log("📤 Sending payload:", payload);

    const response = await fetch("http://localhost:8080/api/attendance/insertOverview", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) throw new Error(data?.message || data || "Validation failed");

    alert(`✅ Successfully validated ${checkedAttendanceIds.length} record(s)`);
    fetchAttendance();
  } catch (error) {
    setError(error.message);
    console.error("Validation error:", error);
  } finally {
    setIsValidating(false);
    setIsAllSelected(false);

    // Reset all checkboxes
    attendances.forEach(a => {
      const checkbox = document.getElementById(`checkbox-${a.id}`);
      if (checkbox) checkbox.checked = false;
    });
  }
};




  const resetClearedDates = () => {
    setClearedDates([]);
    fetchAttendance();
    alert("All cleared dates have been reset. Records will now show again.");
  };

  const hasLeave = (employee) => {
    return leavesData.some(l => 
      l.employee?.id === employee.id &&
      l.status === "Approved" &&
      new Date(globalDate) >= new Date(l.startDate) && 
      new Date(globalDate) <= new Date(l.endDate)
    );
  };

  const calculatePay = (attendance) => {
    const baseRate = settings.hourlyRate;
    let multiplier = 1;
    let overtimeMultiplier = settings.overtimeHourlyRate / settings.hourlyRate;
    
    const holiday = settings.holidays.find(h => {
      const date = new Date(attendance.date);
      return h.recurring 
        ? date.getMonth() + 1 === h.month && date.getDate() === h.day
        : attendance.date === h.date;
    });
    
    if (holiday) {
      multiplier = holiday.payMultiplier || settings.holidayRate || 1.5;
    } 
    else if (isWeekend(attendance.date)) {
      multiplier = settings.weekendRate || 1.25;
    }
    
    if (settings.doubleTimeOnSunday && new Date(attendance.date).getDay() === 0) {
      multiplier = Math.max(multiplier, 2);
    }
    
    const regularHours = Math.min(attendance.minimumHour, 8);
    const overtimeHours = Math.max(attendance.minimumHour - 8, 0);
    
    let totalPay = 0;
    
    if (settings.timeAndHalfAfter8Hours) {
      totalPay = (regularHours * baseRate * multiplier) + 
                 (overtimeHours * baseRate * multiplier * overtimeMultiplier);
    } else {
      totalPay = attendance.minimumHour * baseRate * multiplier;
    }
    
    return totalPay;
  };

const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setExcelFileName(file.name);
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        setError("Excel file doesn't contain enough data");
        return;
      }
      
      // Get headers from first row
      const headers = jsonData[0].map(header => 
        header.toString().toLowerCase().replace(/\s+/g, '')
      );
      
      // Map remaining rows to objects using headers
      const processedData = jsonData.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
      
      setExcelData(processedData);
      setShowExcelPreview(true);
    } catch (err) {
      setError("Error reading Excel file: " + err.message);
      console.error('Excel read error:', err);
    }
  };
  reader.readAsArrayBuffer(file);
};


// --- Helper: parse timestamp like "2025/10/01-08:30:00"
const parseTimestamp = (timestamp) => {
  if (!timestamp) return { date: null, time: null };
  const ts = timestamp.toString();
  const [d, t] = ts.split('-');
  if (!d || !t) return { date: null, time: null };
  return {
    date: normalizeDate(d), // reuse your normalizeDate
    time: t.trim()
  };
};

// --- NEW: Process biometric format files (SIGN ON / SIGN OFF)
const processBiometricData = (rows) => {
  const grouped = {};

  rows.forEach(row => {
    const employeeId = row.employeeid || row.employee_id || row.id || row.empid || row['employee id'] || row['emp id'];
    const employeeName = row.employeename || row['employee name'] || row.name;
    if (!employeeId) return;

    const { date, time } = parseTimestamp(row.timestamp);
    if (!date || !time) return;

    const key = `${employeeId}-${date}`;
    if (!grouped[key]) {
      grouped[key] = {
        employee: { id: employeeId.toString(), name: employeeName },
        date,
        checkIns: [],
        checkOuts: []
      };
    }

    const action = (row.action || row.Action || "").toUpperCase();
    if (action === "SIGN ON") {
      grouped[key].checkIns.push(time);
    } else if (action === "SIGN OFF") {
      grouped[key].checkOuts.push(time);
    }
  });

  // Convert grouped to attendance records
  return Object.values(grouped).map(record => {
    const checkIn = record.checkIns.length > 0 ? record.checkIns.sort()[0] : null;
    const checkOut = record.checkOuts.length > 0 ? record.checkOuts.sort().slice(-1)[0] : null;

    const hoursWorked = calculateHours(checkIn, checkOut);

    return {
      employee: { id: record.employee.id },
      shift: determineShift(checkIn),
      workType: "Regular",
      date: record.date,
      status: hoursWorked > 0 ? "Present" : "Absent",
      checkIn,
      checkOut,
      minimumHour: hoursWorked,
      biometric: true
    };
  });
};

// --- Main mapper
const mapExcelToAttendance = async () => {
  if (excelData.length === 0) {
    setError("No data found in the Excel file");
    return;
  }

  // Check if this is a biometric format file (has Action column with SIGN ON/SIGN OFF)
  const isBiometricFormat = excelData.some(row => 
    row.Action || row.action || row['SIGN ON'] || row['SIGN OFF']
  );

  if (isBiometricFormat) {
    // Process biometric format data
    const biometricRecords = processBiometricData(excelData);
    if (biometricRecords.length === 0) {
      setError("No valid biometric records found to convert to attendance");
      setShowExcelPreview(false);
      return;
    }
    
    // Import the converted biometric data
    await importAttendanceData(biometricRecords);
  } else {
    // Process regular attendance format
    const mappedData = excelData
      .map(row => {
        // Flexible column name matching for regular attendance format
        const employeeId = 
          row.employeeid || row.employee_id || row.id || row.empid || 
          row['employee id'] || row['emp id'] || '';
        
        if (!employeeId) {
          console.warn('Skipping row - no employee ID found:', row);
          return null;
        }

        // Flexible time column matching
        let checkIn = 
          (row.checkin || row.check_in || row.timein || row['check in'] || row['time in'] || '')
            .toString().trim();
        
        let checkOut = 
          (row.checkout || row.check_out || row.timeout || row['check out'] || row['time out'] || '')
            .toString().trim();
        
        // 🔥 Handle single Timestamp column
        if ((!checkIn && !checkOut) && row.timestamp) {
          const ts = row.timestamp.toString();
          const [d, t] = ts.split('-');
          if (d && t) {
            const normalizedDate = normalizeDate(d);
            if ((row.action || row.Action)?.toUpperCase() === 'SIGN ON') {
              checkIn = t.trim();
            } else if ((row.action || row.Action)?.toUpperCase() === 'SIGN OFF') {
              checkOut = t.trim();
            }
            row.date = row.date || normalizedDate;
          }
        }

        if (!checkIn && !checkOut) {
          console.warn('Skipping row - no time data found:', row);
          return null;
        }

        // Flexible date column matching with fallback
        const dateValue = 
          row.date || row.attendancedate || row.attendance_date || 
          row['attendance date'] || globalDate;
        
        const date = normalizeDate(dateValue);
        
        // Calculate hours worked
        const hoursWorked = calculateHours(checkIn, checkOut);
        
        if (hoursWorked <= 0) {
          console.warn('Skipping row - invalid hours calculation:', row);
          return null;
        }

        return {
          employee: { id: employeeId.toString() },
          shift: determineShift(checkIn),
          workType: row.worktype || row.work_type || row['work type'] || 'Regular',
          date,
          status: 'Present',
          checkIn,
          checkOut,
          minimumHour: hoursWorked,
          biometric: false
        };
      })
      .filter(item => item !== null);

    if (mappedData.length === 0) {
      setError("No valid attendance records found in the Excel file");
      setShowExcelPreview(false);
      return;
    }

    await importAttendanceData(mappedData);
  }
};

// --- Import attendance data (robust)
const importAttendanceData = async (data) => {
  try {
    const token = getToken();
    // Use batch endpoint if your backend supports it; change URL if necessary.
    const response = await fetch("http://localhost:8080/api/attendance/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to import attendance data");
    }

    // try parse json, but accept text
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { message: text }; }

    alert(`Successfully imported ${data.length} attendance records`);
    console.log("Import result:", result);
    fetchAttendance();
    fetchEmployees();
    setShowExcelPreview(false);
    return result;
  } catch (err) {
    console.error("Import error:", err);
    alert(`Import failed: ${err.message}`);
    setError(err.message);
    return null;
  }
};

  const ExcelPreviewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Excel File Preview: {excelFileName}</h2>
          <button 
            onClick={() => setShowExcelPreview(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {excelData.length > 0 && Object.keys(excelData[0]).map((key) => (
                  <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {excelData.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
              {excelData.length > 10 && (
                <tr>
                  <td colSpan={Object.keys(excelData[0]).length} className="px-6 py-4 text-center text-sm text-gray-500">
                    Showing 10 of {excelData.length} rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowExcelPreview(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={mapExcelToAttendance}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Import Data
          </button>
        </div>
      </div>
    </div>
  );

 // Replace your existing handleExport with this one
const handleExport = () => {
  if (!attendances || attendances.length === 0) {
    alert("No attendance records to export.");
    return;
  }

  // Define CSV headers
  const headers = [
    "Date",
    "Employee ID",
    "Employee Name",
    "Check In",
    "Check Out",
    "Hours Worked",
    "Shift",
    "Status"
  ];

  // Build CSV rows
  const rows = attendances.map((att) => [
    att.date,
    att.employee?.employeeId || att.employee?.id || "",
    `${att.employee?.firstName || ""} ${att.employee?.lastName || ""}`.trim(),
    att.checkIn || "--:--",
    att.checkOut || "--:--",
    att.minimumHour || 0,
    att.shift || "",
    att.status || ""
  ]);

  // Convert to CSV string
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  // Trigger file download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
            <div className="relative" ref={settingsMenuRef}>
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
     <div className="p-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance Management</h1>
          <p className="text-gray-600">Track and manage employee attendance records</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Search attendances={attendances} onResults={setSearchResults} />

          <button
            onClick={() => setIsCreateMenuOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Attendance
          </button>
        </div>
      </section>
{/* Search Results Section */}
{searchResults.length > 0 && (
  <section className="mt-4 bg-white rounded-xl shadow-sm p-4">
    <h2 className="text-lg font-semibold mb-2">Search Results</h2>
    <ul className="divide-y divide-gray-200">
      {searchResults.map((att) => (
        <li key={att.id} className="py-2 flex justify-between items-center">
          <span>{att.employee?.firstName} {att.employee?.lastName} — {att.date}</span>
          <span 
            className={`px-2 py-1 rounded-full text-sm font-medium ${
              att.status === "Present" ? "bg-green-100 text-green-800" :
              att.status === "Absent" ? "bg-red-100 text-red-800" :
              att.status === "Late" ? "bg-yellow-100 text-yellow-800" :
              "bg-gray-100 text-gray-800"
            }`}
          >
            {att.status}
          </span>
        </li>
      ))}
    </ul>
  </section>
)}
      {/* Attendance Table (or other content) */}
      <section className="mt-6">
        {/* Your attendance table goes here */}
      </section>
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
        
         {/* Add this right after your Navigation Tabs */}
         <BiometricAttendanceFeed />


  {/* Date and Actions Panel */}
<div className="flex flex-col lg:flex-row gap-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
  {/* Date Selection Section */}
  <div className="flex-1">
    <h3 className="text-sm font-medium text-gray-700 mb-3">Date Selection</h3>
    
    <div className="flex flex-col md:flex-row gap-4">
      {/* Single Date Selector */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-600 mb-1">Single Date</label>
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="date"
            value={globalDate}
            onChange={(e) => setGlobalDate(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full"
          />
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-600 mb-1">Date Range</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Start date"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="End date"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={fetchAttendance}
              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 whitespace-nowrap"
            >
              Apply Range
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Current View Info */}
    <div className="mt-3 p-2 bg-gray-50 rounded-md">
      <p className="text-xs text-gray-600">
        Currently viewing:{" "}
        <span className="font-medium text-gray-800">
          {startDate && endDate
            ? `${startDate} to ${endDate}`
            : globalDate || "All dates"}
        </span>
      </p>
    </div>
  </div>

  {/* Divider */}
  <div className="hidden lg:block border-l border-gray-200 mx-2"></div>

  {/* Actions Section */}
  <div className="flex-1">
    <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Clear Dates Section */}
      <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-xs font-medium text-gray-600 mb-2">Clear Multiple Dates</label>
        <div className="flex gap-2 mb-2">
          <input
            type="date"
            value={selectedDateToClear}
            onChange={(e) => setSelectedDateToClear(e.target.value)}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
          />
          <button
            onClick={addDateToClear}
            disabled={!selectedDateToClear}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        
        {datesToClear.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {datesToClear.map(date => (
                <span key={date} className="inline-flex items-center gap-1 bg-gray-200 px-2 py-1 rounded text-xs">
                  {date}
                  <button
                    onClick={() => removeDateFromClear(date)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="Remove date"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={clearSelectedDates}
              className="w-full px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm"
            >
              Clear {datesToClear.length} Date{datesToClear.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Toggle Hidden */}
      <button
        onClick={() => {
          setShowHidden(!showHidden);
          fetchAttendance();
        }}
        className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium ${
          showHidden
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showHidden ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
        </svg>
        {showHidden ? "Hide Cleared" : "Show Cleared"}
      </button>

      {/* Clear Current View */}
      <button
        onClick={clearTableAndForm}
        disabled={!globalDate}
        className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium ${
          globalDate
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Clear View
      </button>

      {/* Reset All */}
      <button
        onClick={() => {
          resetClearedDates();
          setStartDate('');
          setEndDate('');
          setDatesToClear([]);
        }}
        className="flex items-center justify-center px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset All
      </button>

      {/* Import Excel */}
      <label className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium cursor-pointer">
        <input 
          type="file" 
          accept=".xlsx,.xls,.csv" 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Import Excel
      </label>

       <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={16} />
                Export
              </button>

      {/* Validate All */}
      <button
        onClick={validateAttendance}
        disabled={!isAllSelected}
        className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium ${
          isAllSelected
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Validate All
      </button>
    </div>
  </div>
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
        checked={isAllSelected}
        onChange={(e) => {
          const checked = e.target.checked;
          setIsAllSelected(checked);

          // ✅ toggle all visible checkboxes in the table
          attendances.forEach(a => {
            const checkbox = document.getElementById(`checkbox-${a.id}`);
            if (checkbox) checkbox.checked = checked;
          });
        }}
        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
      />
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Employee
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Date
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Check In
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Check Out
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Hours
    </th>
    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
      Shift
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Status
    </th>
    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
      Actions
    </th>
  </tr>
</thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {attendances.map((attendance) => (
                  <tr key={attendance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        id={`checkbox-${attendance.id}`}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(attendance.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attendance.checkIn || '--:--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attendance.checkOut || '--:--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendance.minimumHour >= 8 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {attendance.minimumHour || 0} hrs
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendance.shift === 'Day' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {attendance.shift}
                      </span>
                    </td>
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex items-center">
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      attendance.status === 'Present' 
        ? 'bg-green-100 text-green-800'
        : attendance.status === 'Absent'
        ? 'bg-red-100 text-red-800'
        : isWeekend(attendance.date)
        ? 'bg-amber-100 text-amber-800'
        : isHoliday(attendance.date)
        ? 'bg-purple-100 text-purple-800'
        : 'bg-gray-100 text-gray-800'
    }`}>
      {attendance.status}
    </span>
    {attendance.biometric && (
      <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6.625 2.655A9 9 0 0119 11a1 1 0 11-2 0 7 7 0 00-9.625-6.492 1 1 0 11-.75-1.853zM4.662 4.959A1 1 0 014.75 6.37 6.97 6.97 0 003 11a1 1 0 11-2 0 8.97 8.97 0 012.25-5.953 1 1 0 011.412-.088z" clipRule="evenodd" />
        </svg>
        Bio
      </span>
    )}
  </div>
</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => validateAttendance([attendance.id])}
                          disabled={isValidating}
                          className={`px-3 py-1 rounded-md text-sm ${
                            isValidating
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          Validate
                        </button>
                        <button
                          onClick={(e) =>popupMenu(e, attendance.id)}
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

          {isCreateMenuOpen && (
            <div 
              ref={createMenuRef} 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add Attendance</h1>
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
                {/* Date and Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={globalDate}
                      onChange={(e) => {
                        setGlobalDate(e.target.value);
                        setNewAttendance({...newAttendance, date: e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

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

                {/* Employee Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
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

                  {!showExcludedEmployees ? (
                   <div className="border border-gray-200 rounded-lg overflow-hidden">
  <select
    name="employeeId"
    value={selectedEmployees}
    onChange={handleInputChange}
    disabled={selectAllEmployees}
    multiple
    className="w-full h-64 px-3 py-2 border-none focus:ring-2 focus:ring-blue-500"
  >
    {filteredEmployees.map((employee) => (
   <option key={employee.id} value={employee.id} className="px-3 py-2">
  {employee.firstName} {employee.lastName} ({employee.employeeId || 'N/A'})
</option>
    ))}
  </select>
</div>
                  ) : (
                   <div className="border border-gray-200 rounded-lg overflow-hidden">
  <select
    name="excludedEmployees"
    className="w-full h-64 px-3 py-2 border-none"
    multiple
    disabled
  >
    {employees.filter(employee => {
      const hasAttendance = attendances.some(a => 
        a.employee?.id === employee.id && a.date === globalDate
      );
      const hasOvertime = overtimes.some(o => 
        o.employee?.id === employee.id && o.date === globalDate
      );
      const activeLeaves = leaves.filter(l => 
        l.employee?.id === employee.id &&
        new Date(globalDate) >= new Date(l.startDate) && 
        new Date(globalDate) <= new Date(l.endDate)
      );
      
      return hasAttendance || hasOvertime || activeLeaves.length > 0;
    }).map(employee => {
      const activeLeaves = leaves.filter(l => 
        l.employee?.id === employee.id &&
        new Date(globalDate) >= new Date(l.startDate) && 
        new Date(globalDate) <= new Date(l.endDate)
      );
      
      return (
        <option key={employee.id} value={employee.id} className="px-3 py-2">
          <div className="flex items-center">
            <span className="inline-block h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
            </span>
            <div>
              <p className="font-medium">{employee.firstName} {employee.lastName}</p>
              <p className="text-xs text-gray-500">
                {activeLeaves.length > 0 ? 
                  `On ${activeLeaves[0].leaveType} leave` : 
                  'Already has attendance'}
              </p>
            </div>
          </div>
        </option>
      );
    })}
  </select>
</div>
                  )}
                </div>

                {/* Time and Work Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                    <input
                      type="time"
                      value={newAttendance.checkIn}
                      onChange={(e) => setNewAttendance({ ...newAttendance, checkIn: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
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
                    <select
                      value={newAttendance.status}
                      onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="" disabled>Select Status</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      {isHoliday(newAttendance.date) && (
                        <option value="Holiday Present">Holiday Present</option>
                      )}
                      {isWeekend(newAttendance.date) && (
                        <option value="Weekend Present">Weekend Present</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setNewAttendance({
                        employee: { id: '' },
                        shift: '',
                        workType: '',
                        category: '',
                        date: globalDate,
                        status: '',
                        minimumHour: '',
                        checkIn: '',
                        checkOut: '',
                      });
                      setSelectedEmployees([]);
                      setSelectAllEmployees(false);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={createAttendance}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Submit Attendance
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Popup Menu */}
{popupMenu.isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={handleClosePopupMenu} />
              <div 
                className="fixed bg-white border border-gray-200 shadow-lg rounded-md z-50"
                style={{
                  top: `${popupMenu.position.y}px`,
                  left: `${popupMenu.position.x}px`,
                }}
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
          {/* Add the Excel preview modal */}
      {showExcelPreview && <ExcelPreviewModal />}
          </div>
  );
}
export default Attendance;