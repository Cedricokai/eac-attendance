import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import MainSidebar from "../mainSidebar";
import Search from "../../../compnents/search";
import { Download } from "lucide-react";

function Attendance() {
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
  const navigate = useNavigate();
  const [attendances, setAttendances] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const createMenuRef = useRef(null);
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
  const [showBiometricImport, setShowBiometricImport] = useState(false);
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [biometricImporting, setBiometricImporting] = useState(false);
  const [biometricImportResult, setBiometricImportResult] = useState(null);
  const [biometricError, setBiometricError] = useState(null);
  const [processedBiometricData, setProcessedBiometricData] = useState(null);

  const [clearedDates, setClearedDates] = useState(() => {
    const saved = localStorage.getItem('clearedAttendanceDates');
    return saved ? JSON.parse(saved) : [];
  });

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

  const [popupMenu, setPopupMenu] = useState({
    isOpen: false,
    attendanceId: null,
    position: { x: 0, y: 0 }
  });

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

  const [totalMinimumAmount, setTotalMinimumAmount] = useState(0);
  const [totalOvertimeAmount, setTotalOvertimeAmount] = useState(0);
  const [overtimes, setOvertimes] = useState([]);

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

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
        // Ensure lateArrivalTime is set
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
        setSettings(prev => ({
          ...prev,
          holidays: holidays
        }));
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
        setSettings(prev => ({
          ...prev,
          jobPositions: positions
        }));
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
        setSettings(prev => ({
          ...prev,
          specialWeekends: specialWeekends
        }));
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
        setSettings(prev => ({
          ...prev,
          categories: categories
        }));
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    refreshSettings();
    
    const fetchLeaves = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/leave`, {
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

    const interval = setInterval(refreshSettings, 300000);
    return () => clearInterval(interval);
  }, [globalDate]);

  useEffect(() => {
    if (startDate || endDate) {
      const timer = setTimeout(() => {
        fetchAttendance();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [startDate, endDate, showHidden]);

  useEffect(() => {
    fetchAttendance();
  }, [globalDate, clearedDates]);

  const isSpecialWeekend = (dateString) => {
    return settings.specialWeekends?.some(specialWeekend => 
      specialWeekend.date === dateString
    ) || false;
  };

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    return settings.weekendDays.includes(dayOfWeek);
  };

  const isHoliday = (dateString) => {
    return settings.holidays.some(holiday => holiday.date === dateString);
  };

  const getPositionStandardHours = (jobPositionName, jobGrade) => {
    if (!jobPositionName) return settings.standardWorkHours || 8;
    
    const position = settings.jobPositions?.find(pos => 
      pos.name?.toLowerCase() === jobPositionName?.toLowerCase()
    );
    
    if (!position) {
      return settings.standardWorkHours || 8;
    }
    
    if (position.grades && jobGrade && position.grades.length > 0) {
      const grade = position.grades.find(g => 
        g.level?.toLowerCase() === jobGrade?.toLowerCase()
      );
      if (grade && (grade.standardWorkHours || grade.standardWorkHours === 0)) {
        return grade.standardWorkHours;
      }
    }
    
    return position.standardWorkHours || settings.standardWorkHours || 8;
  };

  const getEmployeeStandardHours = (employee) => {
    if (!employee) {
      return settings.standardWorkHours || 8;
    }
    
    if (employee.jobPosition) {
      const standardHours = getPositionStandardHours(employee.jobPosition, employee.jobGrade);
      return standardHours;
    }
    
    return settings.standardWorkHours || 8;
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
               'bg-gray-100 text-gray-800'
      };
    }
  };

  const determineShift = (checkInTime) => {
    if (!checkInTime) return 'Day';
    const [hours] = checkInTime.split(':').map(Number);
    return hours >= 18 || hours < 6 ? 'Night' : 'Day';
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [employeesRes, attendanceRes, overtimeRes, leavesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employee`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/attendance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/overtime`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/leave`, {
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
        
        const isOnLeave = leavesData.some(l => 
          l.employee?.id === employee.id &&
          l.status === "Approved" &&
          new Date(globalDate) >= new Date(l.startDate) && 
          new Date(globalDate) <= new Date(l.endDate)
        );

        return !hasAttendance && !hasOvertime && !isOnLeave;
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
      
      const [attendanceRes, leavesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/attendance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/leave`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      ]);

      if (!attendanceRes.ok) throw new Error('Failed to fetch attendance');
      
      let data = await attendanceRes.json();
      const leavesData = leavesRes.ok ? await leavesRes.json() : [];

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

      const leaveAttendanceRecords = generateLeaveAttendanceRecords(leavesData, data);
      const combinedData = [...data, ...leaveAttendanceRecords];

      const filteredData = !showHidden 
        ? combinedData.filter(att => !clearedDates.includes(att.date))
        : combinedData;

      setAttendances(filteredData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateLeaveAttendanceRecords = (leavesData, existingAttendance) => {
    const leaveRecords = [];
    
    leavesData.forEach(leave => {
      if (leave.status !== 'Approved') return;
      
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const employeeId = leave.employee?.id;
      
      if (!employeeId) return;
      
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const existingRecord = existingAttendance.find(att => 
          att.employee?.id === employeeId && att.date === dateStr
        );
        
        if (!existingRecord) {
          leaveRecords.push({
            id: `leave-${leave.id}-${dateStr}`,
            employee: leave.employee,
            date: dateStr,
            checkIn: '--:--',
            checkOut: '--:--',
            minimumHour: 8,
            shift: 'Day',
            workType: 'Regular',
            status: 'On Leave',
            leaveBased: true,
            leaveType: leave.leaveType
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    return leaveRecords;
  };

  const handleInputChange = (e) => {
    const { name, value, options } = e.target;

    if (name === "employeeId") {
      const selectedOptions = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);

      setSelectedEmployees(selectedOptions);
    } else {
      setNewAttendance((prev) => ({
        ...prev,
        [name]: e.target.value,
      }));
    }
  };

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

  const createAttendance = async () => {
    try {
      const calculateTotalHours = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0;
        
        try {
          const [inHour, inMinute] = checkIn.split(':').map(Number);
          const [outHour, outMinute] = checkOut.split(':').map(Number);
          
          const totalInMinutes = inHour * 60 + inMinute;
          const totalOutMinutes = outHour * 60 + outMinute;
          
          const diffMinutes = totalOutMinutes - totalInMinutes;
          return parseFloat((diffMinutes / 60).toFixed(2));
        } catch (e) {
          console.error('Error calculating hours:', e);
          return 0;
        }
      };

      const formatTimeToHHMMSS = (time) => {
        if (!time) return '00:00:00';
        if (time.length === 5) return time + ':00';
        if (time.length === 8) return time;
        const parts = time.split(':');
        if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
        return '00:00:00';
      };

      const totalHoursWorked = calculateTotalHours(newAttendance.checkIn, newAttendance.checkOut);
      
      if (totalHoursWorked <= 0) {
        alert('Check-out time must be after check-in time');
        return;
      }

      const determinedStatus = determineStatus(newAttendance.date || globalDate);

      const employeeIdsToProcess = selectAllEmployees 
        ? employees.map(emp => emp.id)
        : selectedEmployees.length > 0 
          ? selectedEmployees.map(id => parseInt(id))
          : newAttendance.employee?.id ? [newAttendance.employee.id] : [];

      if (employeeIdsToProcess.length === 0) {
        alert("Please select at least one employee");
        return;
      }

      const token = getToken();
      const overtimeRecords = [];

      const attendancePayload = await Promise.all(
        employeeIdsToProcess.map(async (employeeId) => {
          const employee = employees.find(emp => emp.id === employeeId);
          const employeeStandardHours = getEmployeeStandardHours(employee);
          
          const regularHours = Math.min(totalHoursWorked, employeeStandardHours);
          const overtimeHours = parseFloat(Math.max(totalHoursWorked - employeeStandardHours, 0).toFixed(2));

          if (overtimeHours > 0) {
            overtimeRecords.push({
              employeeId,
              employee,
              overtimeHours,
              standardHours: employeeStandardHours,
              totalHours: totalHoursWorked,
              checkIn: newAttendance.checkIn,
              checkOut: newAttendance.checkOut,
              date: newAttendance.date || globalDate
            });
          }

          return {
            employee: { id: employeeId },
            shift: newAttendance.shift || determineShift(newAttendance.checkIn),
            workType: newAttendance.workType || "Regular",
            date: newAttendance.date || globalDate,
            status: newAttendance.status || determineStatus(newAttendance.date || globalDate, newAttendance.checkIn),
            minimumHour: regularHours,
            overtime: overtimeHours,
            checkIn: newAttendance.checkIn,
            checkOut: newAttendance.checkOut,
            totalHoursWorked: totalHoursWorked,
            standardHours: employeeStandardHours
          };
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/attendance/batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(attendancePayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const savedAttendances = await response.json();

      if (overtimeRecords.length > 0) {
        for (const overtimeRecord of overtimeRecords) {
          try {
            const correspondingAttendance = savedAttendances.find(
              att => att.employee?.id === overtimeRecord.employeeId
            );

            if (correspondingAttendance && overtimeRecord.overtimeHours > 0) {
              const calculateOvertimeStartTime = (checkIn, standardHours) => {
                if (!checkIn) return '';
                
                try {
                  const [hours, minutes] = checkIn.split(':').map(Number);
                  const totalMinutes = hours * 60 + minutes + (standardHours * 60);
                  
                  const overtimeHours = Math.floor(totalMinutes / 60) % 24;
                  const overtimeMinutes = totalMinutes % 60;
                  
                  return `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMinutes).padStart(2, '0')}`;
                } catch (error) {
                  console.error('Error calculating overtime start time:', error);
                  return checkIn;
                }
              };

              const calculateOvertimeMultiplier = (dateString, overtimeHours) => {
                const date = new Date(dateString);
                const dayOfWeek = date.getDay();
                
                let multiplier = settings.defaultOvertimeMultiplier || 1.5;
                
                if (dayOfWeek === 0 && settings.doubleTimeOnSunday) {
                  multiplier = settings.sundayOvertimeMultiplier || 2.0;
                }
                
                if (settings.enableTimeAndHalfAfter8Hours && overtimeHours > 8) {
                  multiplier = settings.timeAndHalfMultiplier || 1.5;
                }
                
                return multiplier;
              };

              const getEmployeeRate = (employeeId) => {
                const employee = employees.find(emp => emp.id === employeeId);
                return employee?.minimumRate || settings.hourlyRate;
              };

              const overtimeStartTime = calculateOvertimeStartTime(
                overtimeRecord.checkIn, 
                overtimeRecord.standardHours
              );

              const employeeRate = getEmployeeRate(overtimeRecord.employeeId);
              const multiplier = calculateOvertimeMultiplier(
                overtimeRecord.date, 
                overtimeRecord.overtimeHours
              );
              
              const calculatedPay = (employeeRate * multiplier * overtimeRecord.overtimeHours).toFixed(2);

              const overtimeData = {
                employeeId: overtimeRecord.employeeId,
                date: overtimeRecord.date,
                startTime: formatTimeToHHMMSS(overtimeStartTime),
                endTime: formatTimeToHHMMSS(overtimeRecord.checkOut),
                status: 'Pending',
                baseHourlyRate: employeeRate,
                overtimeMultiplier: multiplier,
                overtimeHours: Number(overtimeRecord.overtimeHours),
                calculatedOvertimePay: Number(calculatedPay)
              };

              const overtimeResponse = await fetch(`${API_BASE_URL}/api/overtime`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(overtimeData),
              });

              if (!overtimeResponse.ok) {
                const errorText = await overtimeResponse.text();
                console.error('Failed to create overtime:', errorText);
              } else {
                const overtimeResult = await overtimeResponse.json();
                console.log('Overtime created successfully:', overtimeResult);
              }
            }
          } catch (overtimeError) {
            console.error('Error creating overtime record:', overtimeError);
          }
        }
      }

      const successMessage = overtimeRecords.length > 0 
        ? `Successfully created ${savedAttendances.length} attendance record(s) with ${overtimeRecords.length} overtime record(s)`
        : `Successfully created ${savedAttendances.length} attendance record(s)`;

      alert(successMessage);

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
      
      fetchAttendance();
      fetchEmployees();
      setIsCreateMenuOpen(false);

    } catch (err) {
      console.error('Error creating attendance:', err);
      alert(`Failed to create attendance: ${err.message}`);
      setError(err.message);
    }
  };

  const StatusDropdown = () => {
    const date = newAttendance.date || globalDate;
    const statusOptions = getStatusOptions(date);
    
    return (
      <select
        value={newAttendance.status}
        onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {statusOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  const StatusBadge = ({ attendance }) => {
    const statusDisplay = getStatusDisplay(attendance);
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.class}`}>
        {statusDisplay.text}
      </span>
    );
  };

  const calculateOvertimeStartTime = (checkIn, standardHours) => {
    if (!checkIn) return '';
    
    try {
      const [hours, minutes] = checkIn.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + (standardHours * 60);
      
      const overtimeHours = Math.floor(totalMinutes / 60) % 24;
      const overtimeMinutes = totalMinutes % 60;
      
      return `${String(overtimeHours).padStart(2, '0')}:${String(overtimeMinutes).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating overtime start time:', error);
      return '';
    }
  };

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

      attendances.forEach(a => {
        const checkbox = document.getElementById(`checkbox-${a.id}`);
        if (checkbox) checkbox.checked = false;
      });
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
      const response = await fetch(`${API_BASE_URL}/api/attendance/${id}`, {
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

  const resetClearedDates = () => {
    setClearedDates([]);
    fetchAttendance();
    alert("All cleared dates have been reset. Records will now show again.");
  };

  const handleExport = () => {
    if (!attendances || attendances.length === 0) {
      alert("No attendance records to export.");
      return;
    }

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

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

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

  const filteredEmployees = employees.filter(employee => {
    if (!newAttendance.category) return true;
    return employee.category === newAttendance.category;
  });

  useEffect(() => {
    const date = newAttendance.date || globalDate;
    if (!date) return;

    if (!newAttendance.status || newAttendance.status === '') {
      if (isHoliday(date)) {
        setNewAttendance(prev => ({ 
          ...prev, 
          status: 'Holiday Present'
        }));
      } else if (isSpecialWeekend(date)) {
        setNewAttendance(prev => ({ 
          ...prev, 
          status: 'Special Weekend Present'
        }));
      } else if (isWeekend(date)) {
        setNewAttendance(prev => ({ 
          ...prev, 
          status: 'Weekend Present'
        }));
      } else {
        setNewAttendance(prev => ({ 
          ...prev, 
          status: 'Present'
        }));
      }
    }
  }, [newAttendance.date, newAttendance.status, globalDate]);

  useEffect(() => {
    const minAmount = newAttendance.minimumHour * settings.hourlyRate;
    setTotalMinimumAmount(minAmount);

    const overtimeAmount = newAttendance.overtime * settings.overtimeHourlyRate;
    setTotalOvertimeAmount(overtimeAmount);
  }, [newAttendance.minimumHour, newAttendance.overtime, settings.hourlyRate, settings.overtimeHourlyRate]);

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

  const createNameMapping = () => {
    const nameMap = new Map();
    
    employees.forEach(emp => {
      if (!emp.id) return;

      const firstName = emp.firstName?.trim() || '';
      const lastName = emp.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      nameMap.set(emp.id.toString(), { 
        id: emp.id,
        employeeId: emp.employeeId,
        name: fullName 
      });
      
      if (emp.employeeId) {
        nameMap.set(emp.employeeId.toString(), { 
          id: emp.id,
          employeeId: emp.employeeId,
          name: fullName 
        });
        nameMap.set(emp.employeeId.toString().toUpperCase(), { 
          id: emp.id,
          employeeId: emp.employeeId,
          name: fullName 
        });
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
          nameMap.set(variation, { 
            id: emp.id,
            employeeId: emp.employeeId,
            name: fullName 
          });
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
        if (nameMap.has(stringValue)) {
          const employeeData = nameMap.get(stringValue);
          return employeeData;
        }
      }
      
      if (key.toLowerCase().includes('databaseid') || 
          key.toLowerCase().includes('dbid') || 
          key.toLowerCase().includes('id') && !key.toLowerCase().includes('employeeid')) {
        if (nameMap.has(stringValue)) {
          const employeeData = nameMap.get(stringValue);
          return employeeData;
        }
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
        if (nameMap.has(stringValue.toUpperCase())) {
          const employeeData = nameMap.get(stringValue.toUpperCase());
          return employeeData;
        }
      }
    }
    
    return null;
  };

  const findEmployeeByName = (row, nameMap) => {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'string') continue;
      
      const stringValue = value.trim();
      if (!stringValue || stringValue.length < 2) continue;
      
      if (key.toLowerCase().includes('time') || 
          key.toLowerCase().includes('date') || 
          key.toLowerCase().includes('action') ||
          key.toLowerCase().includes('type') ||
          key.toLowerCase().includes('sign') ||
          stringValue.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {
        continue;
      }
      
      if (nameMap.has(stringValue.toUpperCase())) {
        const employeeData = nameMap.get(stringValue.toUpperCase());
        return employeeData;
      }
      
      const upperValue = stringValue.toUpperCase();
      for (const [nameVariation, employeeData] of nameMap.entries()) {
        if (upperValue.includes(nameVariation) && nameVariation.length > 3 && !/^\d+$/.test(nameVariation)) {
          return employeeData;
        }
      }
    }
    
    const nameLikeColumns = Object.keys(row).filter(key => 
      key.toLowerCase().includes('name') || 
      key.toLowerCase().includes('employee') ||
      key.toLowerCase().includes('staff') ||
      key.toLowerCase().includes('person')
    );
    
    for (const col of nameLikeColumns) {
      const value = row[col];
      if (typeof value === 'string' && value.trim()) {
        const upperValue = value.toUpperCase().trim();
        if (nameMap.has(upperValue)) {
          const employeeData = nameMap.get(upperValue);
          return employeeData;
        }
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
        return {
          date: normalizedDate,
          time: timePart.substring(0, 5)
        };
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
      
      if (!employeeData) {
        employeeData = findEmployeeByEmployeeID(row, nameMap);
      }
      
      if (!employeeData) {
        employeeData = findEmployeeByName(row, nameMap);
      }

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
      if (!date || !time) {
        return;
      }

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
        
        if (record.action === 'SIGN ON') {
          grouped[key].checkIns.push(record.time);
        } else if (record.action === 'SIGN OFF') {
          grouped[key].checkOuts.push(record.time);
        }
        
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
        if (!checkIn && !checkOut) {
          status = 'Absent';
        } else if (checkIn && !checkOut) {
          status = 'Half Day';
        } else if (!checkIn && checkOut) {
          status = 'Half Day';
        }
        
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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(biometricDTOs)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to import biometric data: ${error.message}`);
    }
  };

  const importUsingBatchEndpoint = async (attendanceRecords) => {
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/attendance/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(attendanceRecords)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to save records: ${error.message}`);
    }
  };

  const generateExcelTemplate = () => {
    try {
      const employeesSample = employees.slice(0, 3).map(employee => ({
        id: employee.id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`
      }));

      if (employeesSample.length === 0) {
        employeesSample.push(
          { id: 1, employeeId: 'E-250301-001', name: 'John Doe' },
          { id: 2, employeeId: 'E-250301-002', name: 'Jane Smith' },
          { id: 3, employeeId: 'E-250301-003', name: 'Robert Johnson' }
        );
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

      const colWidths = [
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];
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
      
      const headerCell = instructionSheet['A1'];
      if (headerCell) {
        headerCell.s = {
          font: { bold: true, color: { rgb: "FF0000" } },
          fill: { fgColor: { rgb: "FFFF00" } }
        };
      }

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
      
      if (rawData.length === 0) {
        throw new Error('Excel file is empty or contains no data.');
      }
      
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
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
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

const isEmployeeLate = (checkInTime) => {
  if (!checkInTime || !settings.lateArrivalTime) return false;
  
  try {
    const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
    const [lateHour, lateMinute] = settings.lateArrivalTime.split(':').map(Number);
    
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
    const lateTotalMinutes = lateHour * 60 + lateMinute;
    
    return checkInTotalMinutes > lateTotalMinutes;
  } catch (error) {
    console.error('Error checking late arrival:', error);
    return false;
  }
};

// Then update your status determination logic:
const determineStatus = (dateString, checkInTime) => {
  if (isHoliday(dateString)) {
    return "Holiday Present";
  } else if (isSpecialWeekend(dateString)) {
    return "Special Weekend Present";
  } else if (isWeekend(dateString)) {
    return "Weekend Present";
  } else {
    // Check if employee is late using the setting
    if (checkInTime && isEmployeeLate(checkInTime)) {
      return "Late";
    }
    return "Present";
  }
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
              <button onClick={() => setBiometricError(null)} className="dismiss-btn">
                Dismiss
              </button>
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
                  Download a pre-formatted Excel template with Database IDs (numeric) for 100% accurate matching.
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
          .biometric-attendance-feed {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .import-container {
            border: 2px dashed #ddd;
            border-radius: 12px;
            padding: 30px;
            background: #fafafa;
            text-align: center;
          }
          
          .mapping-info {
            background: #e3f2fd;
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
            color: #1565c0;
          }
          
          .loading-section {
            text-align: center;
            padding: 20px;
          }
          
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 2s linear infinite;
            margin: 0 auto 20px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .error-section {
            background: #ffe6e6;
            border: 1px solid #ffcccc;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            text-align: left;
          }
          
          .success-section {
            background: #e6ffe6;
            border: 1px solid #ccffcc;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            text-align: left;
          }
          
          .file-upload-label {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin: 15px 0;
            transition: background 0.3s;
            font-weight: bold;
          }
          
          .file-upload-label:hover {
            background: #2980b9;
          }
          
          .file-upload-label input[type="file"] {
            display: none;
          }
          
          .file-requirements {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
            text-align: left;
          }
          
          .file-requirements ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          
          .summary {
            text-align: left;
            margin: 15px 0;
          }
          
          .summary ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          
          .refresh-notice {
            font-style: italic;
            color: #666;
            margin: 10px 0;
          }
          
          .export-buttons {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
          }
          
          .export-buttons h4 {
            margin: 0 0 15px 0;
            color: #495057;
            font-size: 16px;
          }
          
          .button-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .export-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .export-btn.excel {
            background: #217346;
            color: white;
          }
          
          .export-btn.excel:hover {
            background: #1b5e38;
          }
          
          button {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 15px;
            font-size: 14px;
            transition: background 0.3s;
          }
          
          button:hover {
            background: #2980b9;
          }
          
          button:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
          }
          
          .dismiss-btn {
            background: #e74c3c;
          }
          
          .dismiss-btn:hover {
            background: #c0392b;
          }
          
          .import-another-btn {
            background: #27ae60;
          }
          
          .import-another-btn:hover {
            background: #229954;
          }
        `}</style>
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

        <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6">
          <header className="flex justify-between items-center border border-white bg-white h-16 w-full rounded-r-2xl px-6 shadow-md">
            <button 
              onClick={toggleSidebar}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors hamburger-button"
            >
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

            <div className="flex items-center gap-5">
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

              <div className="relative">
                <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white">
                    <span className="font-medium">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.name || 'User'}
                  </span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                      <p className="text-xs text-indigo-600 capitalize mt-1">{user?.role || 'employee'}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-gray-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="p-6">
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
          </div>

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
          
          <div className="mb-4">
            <button
              onClick={() => setShowBiometricImport(!showBiometricImport)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showBiometricImport ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Biometric Import
              <span className="text-xs text-gray-500 ml-1">
                ({showBiometricImport ? 'Hide' : 'Show'})
              </span>
            </button>
            
            {showBiometricImport && (
              <div className="mt-3">
                <BiometricAttendanceFeed />
              </div>
            )}
          </div>

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
                  <p className="text-sm text-blue-600">
                    {startDate && endDate 
                      ? `Viewing: ${startDate} to ${endDate}`
                      : globalDate 
                      ? `Viewing: ${globalDate}`
                      : 'All dates'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {showDatePanel ? 'Hide' : 'Show'} Controls
                </span>
                {datesToClear.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {datesToClear.length}
                  </span>
                )}
              </div>
            </button>

            {showDatePanel && (
              <div className="mt-2 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-800">Date Selection</h3>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Single Date</label>
                      <div className="flex items-center gap-3 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100">
                        <input
                          type="date"
                          value={globalDate}
                          onChange={(e) => setGlobalDate(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Date Range</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Start date"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="End date"
                        />
                      </div>
                      {(startDate || endDate) && (
                        <button
                          onClick={fetchAttendance}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                          Apply Date Range
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-800">Actions</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setShowHidden(!showHidden);
                          fetchAttendance();
                        }}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          showHidden
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showHidden ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                        </svg>
                        {showHidden ? "Hide Cleared" : "Show Cleared"}
                      </button>

                      <button
                        onClick={clearTableAndForm}
                        disabled={!globalDate}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          globalDate
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear View
                      </button>

                      <button
                        onClick={() => validateAttendance()}
                        disabled={!isAllSelected || isValidating}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isAllSelected && !isValidating
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
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

                      <button
                        onClick={() => {
                          resetClearedDates();
                          setStartDate('');
                          setEndDate('');
                          setDatesToClear([]);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <label className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors relative">
                        <input 
                          type="file" 
                          accept=".xlsx,.xls,.csv" 
                          className="hidden" 
                        />
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
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Standard Hours
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

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">
                            Standard: {getEmployeeStandardHours(attendance.employee)}h
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            attendance.minimumHour >= getEmployeeStandardHours(attendance.employee) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            Worked: {attendance.minimumHour || 0}h
                          </span>
                          {attendance.minimumHour > getEmployeeStandardHours(attendance.employee) && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Overtime: +{attendance.minimumHour - getEmployeeStandardHours(attendance.employee)}h
                            </span>
                          )}
                        </div>
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
                          <StatusBadge attendance={attendance} />
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

            {attendances.length === 0 && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new attendance record.</p>
              </div>
            )}
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
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id} className="px-3 py-2">
                              {employee.firstName} {employee.lastName} ({employee.employeeId || 'N/A'})
                            </option>
                          ))
                        ) : (
                          <option disabled className="px-3 py-2 text-gray-500">
                            No employees available for the selected date
                          </option>
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="w-full h-64 px-3 py-2 border-none overflow-y-auto bg-gray-50">
                        {employees.filter(employee => {
                          const hasAttendance = attendances.some(a => 
                            a.employee?.id === employee.id && a.date === globalDate
                          );
                          const hasOvertime = overtimes.some(o => 
                            o.employee?.id === employee.id && o.date === globalDate
                          );
                          const activeLeaves = leaves.filter(l => 
                            l.employee?.id === employee.id &&
                            l.status === "Approved" &&
                            new Date(globalDate) >= new Date(l.startDate) && 
                            new Date(globalDate) <= new Date(l.endDate)
                          );
                          
                          return hasAttendance || hasOvertime || activeLeaves.length > 0;
                        }).map(employee => {
                          const activeLeaves = leaves.filter(l => 
                            l.employee?.id === employee.id &&
                            l.status === "Approved" &&
                            new Date(globalDate) >= new Date(l.startDate) && 
                            new Date(globalDate) <= new Date(l.endDate)
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
                            a.employee?.id === employee.id && a.date === globalDate
                          );
                          const hasOvertime = overtimes.some(o => 
                            o.employee?.id === employee.id && o.date === globalDate
                          );
                          const activeLeaves = leaves.filter(l => 
                            l.employee?.id === employee.id &&
                            l.status === "Approved" &&
                            new Date(globalDate) >= new Date(l.startDate) && 
                            new Date(globalDate) <= new Date(l.endDate)
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
                    <StatusDropdown />
                    {(isHoliday(newAttendance.date || globalDate) || isWeekend(newAttendance.date || globalDate) || isSpecialWeekend(newAttendance.date || globalDate)) && (
                      <p className="text-xs text-purple-600 mt-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {isHoliday(newAttendance.date || globalDate) 
                          ? "This date is configured as a holiday"
                          : isSpecialWeekend(newAttendance.date || globalDate)
                          ? `This is a special weekend: ${settings.specialWeekends?.find(sw => sw.date === (newAttendance.date || globalDate))?.name}`
                          : "This date falls on a weekend"
                        }
                      </p>
                    )}
                  </div>
                </div>

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
    </div>
  );
}

export default Attendance;