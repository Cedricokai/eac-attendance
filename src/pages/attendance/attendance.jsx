import { useState, useEffect,useRef, version, useContext } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import SockJS from 'sockjs-client';
import BiometricAttendanceFeed from "./BiometricAttendanceFeed";
import { Client as StompClient } from '@stomp/stompjs';
import * as XLSX from 'xlsx'; // Add this import

const API_URL = "https://mysql-production-563e.up.railway.app"; 

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
 // Add these new states for Excel import
 const [excelData, setExcelData] = useState([]);
 const [showExcelPreview, setShowExcelPreview] = useState(false);
 const [excelFileName, setExcelFileName] = useState('');
 // Add to your state declarations
const [newAttendance, setNewAttendance] = useState({
  employee: {
    id: '', // Ensure this is a number
  },
  shift: '',
  category: '',
  date: new Date().toISOString().split('T')[0], // Set the current date in YYYY-MM-DD format
  status: '',
  minimumHour: '',
  checkIn: '',
  checkOut: '',
});



// Add to your useEffect to fetch overtimes
useEffect(() => {
  const fetchOvertimes = async () => {
    try {
      const response = await fetch('${API_URL}/api/overtime');
      if (!response.ok) throw new Error('Failed to fetch overtimes');
      setOvertimes(await response.json());
    } catch (err) {
      setError(err.message);
    }
  };
  fetchOvertimes();
}, []);

useEffect(() => {
const socket = new SockJS(`${API_URL}/ws`);
  const stompClient = new StompClient({
    webSocketFactory: () => socket,
    debug: (str) => console.log(str),
    reconnectDelay: 5000,
  });
  
  stompClient.onConnect = () => {
    stompClient.subscribe('/topic/attendance', (message) => {
      const newAttendance = JSON.parse(message.body);
      setAttendances(prev => {
        const existingIndex = prev.findIndex(a => 
          a.id === newAttendance.id || 
          (a.employee.id === newAttendance.employee.id && a.date === newAttendance.date)
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newAttendance;
          return updated;
        }
        return [newAttendance, ...prev];
      });
    });
  };

  stompClient.activate();

  return () => {
    if (stompClient.connected) {
      stompClient.deactivate();
    }
  };
}, []);

const filteredEmployees = employees.filter(employee => {
  // If no category selected, show all employees
  if (!newAttendance.category) return true;
  
  // Check if employee's category matches the selected category
  return employee.category === newAttendance.category;
});


  const [totalMinimumAmount, setTotalMinimumAmount] = useState(0);
  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchHolidays(); // Add this line
  }, [globalDate]); // Change from newAttendance.date to globalDate
const [newHoliday, setNewHoliday] = useState({
  date: '',
  name: '',
  recurring: false
});
  const [totalOvertimeAmount, setTotalOvertimeAmount] = useState(0);
  const [overtimes, setOvertimes] = useState([]);
  const [newOverview, setNewOverview] = useState({
    overviewId: '',
    employee: { id: '' }, // Ensure this is properly set
    attendance: { id: '' },
    overtime: {id: ''},
    shift: '',
    date: '',
    status: '',
    hoursWorked: '',
    minimumHour: '',
    version: '',
  });
  




  const handleHeaderCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setIsAllSelected(isChecked);
    
    // Check/uncheck all individual checkboxes
    attendances.forEach(attendance => {
      const checkbox = document.getElementById(`checkbox-${attendance.id}`);
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    });
  };

  // Add this to your component state
const [clearedDates, setClearedDates] = useState(() => {
  // Initialize from localStorage if available
  const saved = localStorage.getItem('clearedAttendanceDates');
  return saved ? JSON.parse(saved) : [];
});

// Add this useEffect to persist cleared dates
useEffect(() => {
  localStorage.setItem('clearedAttendanceDates', JSON.stringify(clearedDates));
}, [clearedDates]);

useEffect(() => {
  const minAmount = newAttendance.minimumHour * hourlyRate;
  setTotalMinimumAmount(minAmount);

  const overtimeAmount = newAttendance.overtime * overtimeHourlyRate;
  setTotalOvertimeAmount(overtimeAmount);
}, [newAttendance.minimumHour, newAttendance.overtime, hourlyRate, overtimeHourlyRate]);

// Update your isWeekend function to use settings from context
const isWeekend = (date) => {
  const day = new Date(date).getDay(); // 0=Sunday, 6=Saturday
  return (settings.weekendDays || []).includes(day);
};

const isHoliday = (date) => {
  if (!date) return false; // Prevents error if date is null or undefined

  const [year, month, day] = date.split('-');
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
      const response = await fetch('${API_URL}/api/holidays');
      if (!response.ok) throw new Error('Failed to fetch holidays');
      setHolidays(await response.json());
    } catch (err) {
      setError(err.message);
    }
  };
  
  const createHoliday = async () => {
    try {
      const response = await fetch('${API_URL}/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();// Add this line
  }, [newAttendance.date]);

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null); 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setIsCreateMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add to your existing useEffect
useEffect(() => {
  fetchEmployees();
  fetchAttendance();
  fetchHolidays();
  // Add fetchLeaves
  const fetchLeaves = async () => {
    try {
      const response = await fetch('${API_URL}/api/leave');
      if (!response.ok) throw new Error('Failed to fetch leaves');
      setLeaves(await response.json());
    } catch (err) {
      setError(err.message);
    }
  };
  fetchLeaves();
}, [globalDate]);
  
  
   // Toggle settings menu
   const toggleSettingsMenu = () => {
    setIsSettingsMenuOpen(!isSettingsMenuOpen);
  };

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleInputChange = (e) => {
    const { name, options } = e.target;
  
    if (name === "employeeId") {
      // Handle multiple selections
      const selectedOptions = Array.from(options)
        .filter((option) => option.selected) // Filter selected options
        .map((option) => option.value); // Map to their values
  
      setSelectedEmployees(selectedOptions); // Update selectedEmployees state
      setNewAttendance((prev) => ({
        ...prev,
        employee: {
          ...prev.employee,
          id: selectedOptions, // Store selected employee IDs
        },
      }));
    } else {
      // Handle other inputs
      setNewAttendance((prev) => ({
        ...prev,
        [name]: e.target.value,
      }));
    }
  };

// Update the fetchEmployees function in Attendance component
const fetchEmployees = async () => {
  setLoading(true);
  try {
    // Fetch all necessary data in parallel
    const [employeesRes, attendanceRes, overtimeRes, leavesRes] = await Promise.all([
      fetch('${API_URL}/api/employee'),
      fetch('${API_URL}/api/attendance'),
      fetch('${API_URL}/api/overtime'),
      fetch('${API_URL}/api/leave')
    ]);

    if (!employeesRes.ok) throw new Error('Failed to fetch employees');
    
    const employeesData = await employeesRes.json();
    const attendancesData = attendanceRes.ok ? await attendanceRes.json() : [];
    const overtimesData = overtimeRes.ok ? await overtimeRes.json() : [];
    const leavesData = leavesRes.ok ? await leavesRes.json() : [];

    // Filter employees
    const filteredEmployees = employeesData.filter(employee => {
      // Check for attendance conflicts
      const hasAttendance = attendancesData.some(a => 
        a.employee?.id === employee.id && 
        a.date === globalDate
      );
      
      // Check for overtime conflicts
      const hasOvertime = overtimesData.some(o => 
        o.employee?.id === employee.id && 
        o.date === globalDate
      );
      
      // Check for leave conflicts (date falls between startDate and endDate)
      const hasLeave = leavesData.some(l => 
        l.employee?.id === employee.id &&
        l.status !== "Rejected" && // Only consider approved/pending leaves
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

  // Call fetchEmployees inside useEffect
  useEffect(() => {
    fetchEmployees();
  }, [newAttendance.date]);
  
  useEffect(() => {
    // Calculate total minimum amount
    const minAmount = newAttendance.minimumHour * hourlyRate;
    setTotalMinimumAmount(minAmount);
  
    // Calculate total overtime amount
    const overtimeAmount = newAttendance.overtime * overtimeHourlyRate;
    setTotalOvertimeAmount(overtimeAmount);
  }, [newAttendance.minimumHour, newAttendance.overtime, hourlyRate, overtimeHourlyRate]);
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch('${API_URL}/api/attendance');
      if (!response.ok) throw new Error('Failed to fetch attendance');
      
      const data = await response.json();
      // Filter out cleared dates
      setAttendances(data.filter(att => !clearedDates.includes(att.date)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    const date = newAttendance.date;
    if (!date) return;
  
    if (isHoliday(date)) {
      setNewAttendance(prev => ({...prev, status: 'Holiday Present'}));
    } else if (isWeekend(date)) {
      setNewAttendance(prev => ({...prev, status: 'Weekend Present'}));
    }
  }, [newAttendance.date, settings.holidays, settings.weekendDays]);

 // In Attendance.jsx, modify the createAttendance function
const createAttendance = async () => {
  const calculateMinimumHour = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    const [checkInHour, checkInMinute] = checkIn.split(':').map(Number);
    const [checkOutHour, checkOutMinute] = checkOut.split(':').map(Number);
    
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
    const checkOutTotalMinutes = checkOutHour * 60 + checkOutMinute;
    
    const diffMinutes = checkOutTotalMinutes - checkInTotalMinutes;
    return diffMinutes / 60; // Convert minutes to hours
  };

  const minimumHour = calculateMinimumHour(newAttendance.checkIn, newAttendance.checkOut);
  const standardHours = settings.standardWorkHours || 8;
  const overtimeHours = Math.max(minimumHour - standardHours, 0);
  const regularHours = Math.min(minimumHour, standardHours);

  if (selectAllEmployees) {
    for (const employee of employees) {
      // Create attendance record
      const attendanceData = {
        employee: { id: employee.id },
        shift: newAttendance.shift,
        workType: newAttendance.workType,
        date: newAttendance.date,
        status: newAttendance.status,
        minimumHour: regularHours,
        checkIn: newAttendance.checkIn,
        checkOut: newAttendance.checkOut,
      };

      try {
        const response = await fetch('${API_URL}/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attendanceData),
        });

        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
        
        const attendance = await response.json();
        console.log('Attendance created for employee:', employee.id, attendance);

        // Create overtime record if hours exceed standard
        if (overtimeHours > 0) {
          const overtimeData = {
            employee: { id: employee.id },
            date: newAttendance.date,
            startTime: calculateOvertimeStartTime(newAttendance.checkIn, standardHours),
            endTime: newAttendance.checkOut,
            overtimeHours: overtimeHours,
            status: 'Pending',
            relatedAttendanceId: attendance.id
          };

          const overtimeResponse = await fetch('${API_URL}/api/overtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overtimeData),
          });

          if (!overtimeResponse.ok) {
            console.error('Failed to create overtime record');
          }
        }
      } catch (err) {
        console.error('Error creating attendance/overtime for employee:', employee.id, err);
      }
    }
  } else {
    // Similar logic for selected employees
    for (const employeeId of selectedEmployees) {
      // Create attendance record
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
        const response = await fetch('${API_URL}/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attendanceData),
        });

        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
        
        const attendance = await response.json();
        setAttendances((prev) => [...prev, attendance]);

        // Create overtime record if hours exceed standard
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

          const overtimeResponse = await fetch('${API_URL}/api/overtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overtimeData),
          });

          if (!overtimeResponse.ok) {
            console.error('Failed to create overtime record');
          } else {
            const overtime = await overtimeResponse.json();
            setOvertimes(prev => [...prev, overtime]);
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      }
    }
  }

  // Reset form
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
  fetchEmployees();
};

// Helper function to calculate overtime start time
const calculateOvertimeStartTime = (checkIn, standardHours) => {
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
      date: globalDate, // Keep the selected date
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
  
  // Reset form function
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

  // Add this useEffect to persist cleared dates
useEffect(() => {
  localStorage.setItem('clearedAttendanceDates', JSON.stringify(clearedDates));
}, [clearedDates]);


const validateAttendance = async () => {
  setIsValidating(true);
  setError('');

  const checkedAttendanceIds = isAllSelected 
    ? attendances.map(a => a.id)
    : attendances
        .filter(a => document.getElementById(`checkbox-${a.id}`)?.checked)
        .map(a => a.id);

  if (checkedAttendanceIds.length === 0) {
    setError("No attendance selected for validation.");
    setIsValidating(false);
    return;
  }

  try {
    const response = await fetch("${API_URL}/api/attendance/insertOverview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendanceIds: checkedAttendanceIds })
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.message || "Validation failed");
    
    alert(`Successfully validated ${checkedAttendanceIds.length} records`);
    fetchAttendance();
  } catch (error) {
    setError(error.message);
    console.error("Validation error:", error);
  } finally {
    setIsValidating(false);
    setIsAllSelected(false);
    // Uncheck all boxes
    attendances.forEach(a => {
      const checkbox = document.getElementById(`checkbox-${a.id}`);
      if (checkbox) checkbox.checked = false;
    });
  }
};

const resetClearedDates = () => {
  setClearedDates([]);
  fetchAttendance(); // Refetch all data
  alert("All cleared dates have been reset. Records will now show again.");
};

// Modify the leave conflict check to only consider approved leaves
const hasLeave = leavesData.some(l => 
  l.employee?.id === employee.id &&
  l.status === "Approved" && // Only consider approved leaves
  new Date(globalDate) >= new Date(l.startDate) && 
  new Date(globalDate) <= new Date(l.endDate)
);

const calculatePay = (attendance) => {
  const baseRate = settings.hourlyRate;
  let multiplier = 1;
  let overtimeMultiplier = settings.overtimeHourlyRate / settings.hourlyRate;
  
  // Check for holiday
  const holiday = settings.holidays.find(h => {
    const date = new Date(attendance.date);
    return h.recurring 
      ? date.getMonth() + 1 === h.month && date.getDate() === h.day
      : attendance.date === h.date;
  });
  
  if (holiday) {
    multiplier = holiday.payMultiplier || settings.holidayRate || 1.5;
  } 
  // Check for weekend
  else if (isWeekend(attendance.date)) {
    multiplier = settings.weekendRate || 1.25;
  }
  
  // Apply special rules
  if (settings.doubleTimeOnSunday && new Date(attendance.date).getDay() === 0) {
    multiplier = Math.max(multiplier, 2); // Use whichever is higher
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

// Add this function to handle file upload
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setExcelFileName(file.name);
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    setExcelData(jsonData);
    setShowExcelPreview(true);
  };
  reader.readAsArrayBuffer(file);
};

// Patch for attendance import logic to auto-calculate hours from check-in/check-out
// Inserted where minimumHour is currently just being mapped in Attendance.jsx

// Patch for attendance import logic to auto-calculate hours from check-in/check-out
// Inserted where minimumHour is currently just being mapped in Attendance.jsx

// Enhanced fix: ensure attendance state is set properly after Excel import
// Also support multiple mapped records to be imported properly into the app

// Final fix: ensure all fields are clean and data types are enforced for Attendance import

const mapExcelToAttendance = () => {
  if (excelData.length === 0) return;

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;

    const [inH, inM, inS] = checkIn.split(':').map(Number);
    const [outH, outM, outS] = checkOut.split(':').map(Number);

    const checkInSeconds = inH * 3600 + inM * 60 + (inS || 0);
    const checkOutSeconds = outH * 3600 + outM * 60 + (outS || 0);

    const diffSeconds = checkOutSeconds - checkInSeconds;
    return diffSeconds > 0 ? (diffSeconds / 3600).toFixed(2) : 0;
  };

  const mappedData = excelData.map(row => {
    const employeeId = row["EmployeeID"] || row["Employee ID"] || row["ID"] || '';
    const checkIn = (row.CheckIn || row["Check In"] || '').toString().trim();
    const checkOut = (row.CheckOut || row["Check Out"] || '').toString().trim();
    const calculatedHours = calculateHours(checkIn, checkOut);
    const date = row.Date || row["Date"] || globalDate;
    const shift = row.Shift || row["Shift"] || 'Day';
    const workType = row.WorkType || row["Work Type"] || '';
    const status = row.Status || row["Status"] || 'Present';

    return {
      employee: { id: employeeId.toString() },
      shift,
      workType,
      date,
      status,
      checkIn,
      checkOut,
      minimumHour: calculatedHours
    };
  });

  setAttendances(prev => [...prev, ...mappedData]);

  if (mappedData.length > 0) {
    setNewAttendance(mappedData[0]);
    setSelectedEmployees(mappedData.map(item => item.employee.id));
  }

  setShowExcelPreview(false);
  alert('Excel data mapped, cleaned, and fields set.');
};



// Add this component to render the Excel preview modal
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
            {excelData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, i) => (
                  <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
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
          Use This Data
        </button>
      </div>
    </div>
  </div>
);

// In Attendance.jsx, enhance the import functionality
const handleExcelImport = async () => {
  try {
    // Get the processed biometric data
    const biometricData = prepareApiData(); // From BiometricAttendanceFeed
    
    // Map to your attendance format
    const attendanceData = biometricData.map(record => ({
      employee: { id: record.employee.id },
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      minimumHour: record.workingHours,
      status: 'Present',
      biometric: true,
      shift: determineShift(record.checkIn) // Add this helper function
    }));

    // Send to backend
    const response = await fetch('${API_URL}/api/attendance/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendanceData)
    });

    if (!response.ok) throw new Error('Failed to import attendance');
    
    // Refresh data
    fetchAttendance();
    fetchEmployees();
    alert('Attendance imported successfully!');
  } catch (err) {
    setError(err.message);
    console.error('Import error:', err);
  }
};

// Helper function to determine shift based on check-in time
const determineShift = (checkInTime) => {
  if (!checkInTime) return 'Day';
  const [hours] = checkInTime.split(':').map(Number);
  return hours >= 18 || hours < 6 ? 'Night' : 'Day';
};


  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
    {/* Sidebar */}
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
      <Sidebar />
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
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
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
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-sm mt-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Attendance Management</h1>
            <p className="text-gray-600">Track and manage employee attendance records</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search employees..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={globalDate}
                onChange={(e) => setGlobalDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-medium"
              />
            </div>

            <div className="hidden sm:block text-sm text-gray-500">
              Showing records for: <span className="font-medium text-gray-700">{globalDate || 'All dates'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearTableAndForm}
              disabled={!globalDate}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                globalDate 
                  ? "bg-amber-500 hover:bg-amber-600 text-white" 
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear View
            </button>

            <label className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium text-sm cursor-pointer">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Import Excel
        </label>

            <button
              onClick={resetClearedDates}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset All
            </button>

            <button
              onClick={validateAttendance}
              disabled={!isAllSelected}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                isAllSelected 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Validate All
            </button>
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
                      onChange={handleHeaderCheckboxChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          <option 
                            key={employee.id} 
                            value={employee.id}
                            className="px-3 py-2 hover:bg-blue-50"
                          >
                            <div className="flex items-center">
                              <span className="inline-block h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                  {employee.firstName}    {employee.lastName}
                              </span>
                            
                            </div>
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
                                  {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
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