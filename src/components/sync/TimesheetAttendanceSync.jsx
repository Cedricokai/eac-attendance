import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, ArrowRightLeft, Check, AlertCircle } from 'lucide-react';

const TimesheetAttendanceSync = ({ 
  timesheets = [],
  attendances = [],
  employees = [],
  settings = {},
  onSyncComplete = () => {},
  // New props for filtering
  selectedEmployeeIds = new Set(), // Set of employee IDs to sync (empty set means all)
  selectedDates = [], 
  selectedCategory = '', // Category filter
  filteredEmployees = [] // Pre-filtered employees from parent
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState('both');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [syncFilter, setSyncFilter] = useState({
    useSelection: true, // Whether to use selected employees filter
    useCategory: false, // Whether to use category filter
    category: ''
  });

  // Get API base URL
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

  // Get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Filter employees based on selected IDs and category
  const getFilteredEmployeeIds = () => {
    let filtered = [];
    
    // Start with all employees or selected ones based on filter settings
    if (syncFilter.useSelection && selectedEmployeeIds.size > 0) {
      filtered = Array.from(selectedEmployeeIds);
    } else {
      // Use all employees from the filteredEmployees prop or all employees
      filtered = (filteredEmployees.length > 0 ? filteredEmployees : employees).map(e => e.id);
    }
    
    // Apply category filter if enabled
    if (syncFilter.useCategory && syncFilter.category) {
      const categoryEmployees = employees
        .filter(e => e.category === syncFilter.category)
        .map(e => e.id);
      
      // Intersection of filtered and category employees
      filtered = filtered.filter(id => categoryEmployees.includes(id));
    }
    
    return new Set(filtered);
  };

  // Filter timesheet records by employee IDs
  const filterTimesheetsByEmployees = (timesheetRecords, allowedEmployeeIds) => {
    if (allowedEmployeeIds.size === 0) return timesheetRecords; // No filter means all
    
    return timesheetRecords.filter(record => {
      const employeeId = record.employeeId || record.employee?.id;
      return allowedEmployeeIds.has(employeeId);
    });
  };

  // Filter attendance records by employee IDs
  const filterAttendancesByEmployees = (attendanceRecords, allowedEmployeeIds) => {
    if (allowedEmployeeIds.size === 0) return attendanceRecords; // No filter means all
    
    return attendanceRecords.filter(record => {
      const employeeId = record.employee?.id || record.employeeId;
      return allowedEmployeeIds.has(employeeId);
    });
  };

  // Function to save attendance records to database (for non-leave codes only)
  const saveAttendanceRecords = async (attendanceRecords) => {
    console.log('Saving attendance records:', attendanceRecords);
    const token = getToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendanceRecords)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save attendances: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Attendance save result:', result);
      return result;
    } catch (error) {
      console.error('Error saving attendance:', error);
      throw error;
    }
  };

  // Function to save timesheet records to database
// Function to save timesheet records to database
const saveTimesheetRecords = async (timesheetRecords) => {
  console.log('Saving timesheet records:', timesheetRecords);
  const token = getToken();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/timesheets/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(timesheetRecords)  // ✅ Just the array, no wrapper
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save timesheets: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Timesheet save result:', result);
    return result;
  } catch (error) {
    console.error('Error saving timesheets:', error);
    throw error;
  }
};

  // Filter records by date range
  const filterRecordsByDateRange = (records) => {
    let filtered = records;
    
    // If specific dates are selected (from attendance checkboxes), use those
    if (selectedDates && selectedDates.length > 0) {
      filtered = filtered.filter(record => {
        if (!record.date) return false;
        return selectedDates.includes(record.date);
      });
    } 
    // Otherwise use the date range from the picker
    else if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    return filtered;
  };

  // Calculate hours from check-in/out
  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const [inHour, inMinute] = checkIn.split(':').map(Number);
      const [outHour, outMinute] = checkOut.split(':').map(Number);
      
      const totalInMinutes = inHour * 60 + inMinute;
      const totalOutMinutes = outHour * 60 + outMinute;
      
      const diffMinutes = totalOutMinutes - totalInMinutes;
      return Math.max(0, diffMinutes / 60).toFixed(2);
    } catch (e) {
      console.error('Error calculating hours:', e);
      return 0;
    }
  };

  // Helper to extract employee ID from timesheet record
  const getEmployeeIdFromTimesheet = (timesheetRecord) => {
    if (timesheetRecord.employeeId) return timesheetRecord.employeeId;
    if (timesheetRecord.employee?.id) return timesheetRecord.employee.id;
    return null;
  };

  // Helper to extract employee name from timesheet record
  const getEmployeeNameFromTimesheet = (timesheetRecord) => {
    if (timesheetRecord.employeeName) return timesheetRecord.employeeName;
    if (timesheetRecord.employee?.firstName && timesheetRecord.employee?.lastName) {
      return `${timesheetRecord.employee.firstName} ${timesheetRecord.employee.lastName}`;
    }
    return 'Unknown Employee';
  };

  // Time validation helper
  const validateTime = (time) => {
    if (!time) return null;
    
    if (time === "00:00") {
      return time;
    }
    
    if (time === "24:00") {
      return "00:00";
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours < 0 || hours > 23) {
      console.warn(`Invalid hour in time: ${time}, converting to valid format`);
      const validHour = hours % 24;
      return `${String(validHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    return time;
  };

  // Function to save pending leave requests to database
  const savePendingLeaveRequests = async (leaveRequests) => {
    const token = getToken();
    const savedLeaves = [];

    for (const leaveRequest of leaveRequests) {
      try {
        // First check if leave already exists in database
        const checkResponse = await fetch(
          `${API_BASE_URL}/api/leave/check-exists?employeeId=${leaveRequest.employee.id}&date=${leaveRequest.startDate}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (checkResponse.ok) {
          const exists = await checkResponse.json();
          if (exists) {
            console.log(`Leave already exists for employee ${leaveRequest.employee.id} on ${leaveRequest.startDate}, skipping`);
            continue;
          }
        }

        // Create the leave request
        const response = await fetch(`${API_BASE_URL}/api/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(leaveRequest)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create leave: ${errorText}`);
        }

        const savedLeave = await response.json();
        savedLeaves.push(savedLeave);
        
        console.log(`Saved leave request ID ${savedLeave.id} for ${leaveRequest.employee.firstName}`);

      } catch (error) {
        console.error('Error saving leave request:', error, leaveRequest);
      }
    }

    return savedLeaves;
  };

  // Enhanced convertTimesheetToAttendance function
  // NOW ONLY creates attendance for non-leave codes
  // Leave codes (L, S, ML, PL) ONLY create pending leave requests
  const convertTimesheetToAttendance = async (timesheetRecords, employees, settings) => {
    const attendanceRecords = []; // Only for non-leave codes
    const pendingLeaveRequests = []; // Only for leave codes
    
    console.log('Converting timesheets to attendance - leave codes will create pending leave requests only');
    
    timesheetRecords.forEach((record, index) => {
      const employeeId = record.employeeId || record.employee?.id;
      const { date, attendanceCode, regularHours, overtimeHours, notes, attachmentFileName } = record;
      
      if (!employeeId) {
        console.warn(`Timesheet record ${index} missing employee ID:`, record);
        return;
      }

      const employee = employees.find(e => e.id === employeeId);
      if (!employee) {
        console.warn(`Employee not found for ID: ${employeeId}`);
        return;
      }

      const code = (attendanceCode || "").trim().toUpperCase();

      // Determine if this is a leave code
      let isLeaveCode = false;
      let leaveType = null;

      // Map timesheet codes to leave types
      switch(code) {
        case "L":
          isLeaveCode = true;
          leaveType = "Annual Leave";
          break;
        case "S":
          isLeaveCode = true;
          leaveType = "Sick Leave";
          break;
        case "ML":
          isLeaveCode = true;
          leaveType = "Maternity Leave";
          break;
        case "PL":
          isLeaveCode = true;
          leaveType = "Paternity Leave";
          break;
        default:
          isLeaveCode = false;
          break;
      }

      // If it's a leave code, ONLY create a pending leave request
      // NO attendance record will be created
      if (isLeaveCode && leaveType) {
        // Check if leave already exists for this employee on this date
        const leaveExists = pendingLeaveRequests.some(
          leave => leave.employee.id === employeeId && leave.startDate === date
        );

        if (!leaveExists) {
          const startDate = date;
          const endDate = date; // Single day leave

          // Create reason based on notes or default
          let reason = notes || `Auto-created from timesheet (${attendanceCode})`;
          
          // For sick leave, add note about medical certificate if present
          if (code === "S" && attachmentFileName) {
            reason += ` - Medical certificate attached: ${attachmentFileName}`;
          }

          pendingLeaveRequests.push({
            employee: { 
              id: employeeId,
              firstName: employee.firstName,
              lastName: employee.lastName,
              employeeId: employee.employeeId
            },
            leaveType,
            startDate,
            endDate,
            reason,
            status: "Pending",
            supervisorStatus: "Pending",
            plannerStatus: "Pending",
            hrStatus: "Pending",
            source: "timesheet_sync",
            timesheetRecordId: record.id,
            // Add metadata for tracking
            syncMetadata: {
              syncedAt: new Date().toISOString(),
              originalCode: attendanceCode,
              timesheetDate: date
            }
          });

          console.log(`Created pending leave request for ${employee.firstName} ${employee.lastName} on ${date} (${leaveType})`);
        }
      } 
      // For non-leave codes, create attendance records as before
      else {
        // Determine status based on code
        let status = "Present";
        
        switch(code) {
          case "A":
            status = "Absent";
            break;
          case "H":
            status = "Holiday";
            break;
          case "HP":
            status = "Holiday Present";
            break;
          case "WP":
            status = "Weekend Present";
            break;
          case "OFF":
            status = "Off Day";
            break;
          case "P":
          default:
            status = code === "WP" ? "Weekend Present" : "Present";
            break;
        }

        // Calculate total hours
        const totalHours = parseFloat(regularHours || 0) + parseFloat(overtimeHours || 0);

        // Create attendance record
        const attendanceRecord = {
          employee: {
            id: employeeId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeId: employee.employeeId,
          },
          date,
          status,
          minimumHour: parseFloat(regularHours || 0),
          overtime: parseFloat(overtimeHours || 0),
          breakHours: 0,
          totalHoursWorked: totalHours,
          notes: notes || `Synced from timesheet. Code: ${attendanceCode}`,
          source: "timesheet_sync",
        };

        attendanceRecords.push(attendanceRecord);
      }
    });

    // If we have pending leave requests, save them to the database
    if (pendingLeaveRequests.length > 0) {
      console.log(`Saving ${pendingLeaveRequests.length} pending leave requests...`);
      try {
        const savedLeaves = await savePendingLeaveRequests(pendingLeaveRequests);
        console.log('Leave requests saved successfully:', savedLeaves);
      } catch (error) {
        console.error('Error saving leave requests:', error);
      }
    }

    console.log(`Created ${attendanceRecords.length} attendance records (non-leave) and ${pendingLeaveRequests.length} pending leave requests`);
    console.log('NOTE: Leave codes (L, S, ML, PL) do NOT create attendance records. They will appear in attendance only after HR approval.');
    
    return { attendanceRecords, pendingLeaveRequests };
  };

 

const convertAttendanceToTimesheet = (attendanceRecords, settings, employees) => {
  const timesheetMap = new Map();
  
  console.log(`Converting ${attendanceRecords.length} attendance records to timesheet...`);
  
  attendanceRecords.forEach((record, index) => {
    const employeeId = record.employee?.id || record.employeeId;
    const { date, checkIn, checkOut, status, minimumHour, overtime, standardHours: recordStandardHours } = record;
    
    if (!employeeId) {
      console.warn(`Record ${index} missing employee ID:`, record);
      return;
    }
    
    if (!date) {
      console.warn(`Record ${index} missing date:`, record);
      return;
    }
    
    // Get full employee object and their standard hours
    const employee = employees.find(e => e.id === employeeId);
    const standardHours = recordStandardHours || getEmployeeStandardHours(employee, settings);
    
    const key = `${employeeId}-${date}`;
    let attendanceCode = 'P';
    
    // Status to code mapping
    const statusUpper = (status || "").toUpperCase();
    
    if (statusUpper === "ON LEAVE" || statusUpper === "LEAVE") {
      attendanceCode = "L";
    } else if (statusUpper === "SICK" || statusUpper === "SICK LEAVE") {
      attendanceCode = "S";
    } else if (statusUpper === "ABSENT") {
      attendanceCode = "A";
    } else if (statusUpper === "OFF DAY") {
      attendanceCode = "OFF";
    } else if (statusUpper === "MATERNITY LEAVE") {
      attendanceCode = "ML";
    } else if (statusUpper === "PATERNITY LEAVE") {
      attendanceCode = "PL";
    } else if (statusUpper === "HOLIDAY PRESENT") {
      attendanceCode = "HP";
    } else if (statusUpper === "WEEKEND PRESENT") {
      attendanceCode = "WP";
    } else if (statusUpper === "SPECIAL WEEKEND PRESENT") {
      attendanceCode = "WP";
    } else if (statusUpper === "PRESENT" || statusUpper === "LATE") {
      attendanceCode = "P";
    } else if (statusUpper === "HOLIDAY") {
      attendanceCode = "H";
    }
    
    // ============================================================
    // CORRECTED HOURS CALCULATION
    // ============================================================
    let regularHours = 0;
    let overtimeHours = 0;
    let totalHours = 0;
    
    const isPresentCode = ['P', 'WP', 'HP'].includes(attendanceCode);
    
    if (isPresentCode) {
      // Get total hours worked from attendance record
      // minimumHour in attendance represents TOTAL hours worked
      const totalWorked = parseFloat(minimumHour) || 0;
      
      // Get stored overtime if available
      const storedOvertime = parseFloat(overtime) || 0;
      
      let calculatedOvertime = storedOvertime;
      
      // If no overtime stored but we have check-in/out times, calculate from scratch
      if (calculatedOvertime === 0 && checkIn && checkOut) {
        const calculatedTotal = calculateHoursFromTime(checkIn, checkOut);
        if (calculatedTotal > 0) {
          calculatedOvertime = Math.max(0, calculatedTotal - standardHours);
        }
      }
      
      // CORRECT: NH = Total hours worked - Overtime hours
      // Then cap NH at standard hours (can't exceed standard)
      let nh = totalWorked - calculatedOvertime;
      nh = Math.min(nh, standardHours);
      
      // Ensure NH is never negative
      regularHours = Math.max(0, nh);
      
      // OT should be the difference between total worked and NH
      overtimeHours = Math.max(0, totalWorked - regularHours);
      
      totalHours = regularHours + overtimeHours;
      
      // Debug logging
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
      console.log(`[Sync] ${employeeName} - ${date}:`, {
        totalWorked,
        standardHours,
        storedOvertime,
        calculatedNH: regularHours,
        calculatedOT: overtimeHours,
        finalTotal: totalHours,
        checkIn,
        checkOut
      });
    }
    
    // Calculate earnings
    const hourlyRate = employee?.minimumRate || employee?.hourlyRate || settings?.hourlyRate || 0;
    const dateMultiplier = getDateRateMultiplier(date, settings);
    const overtimeMultiplier = settings?.timeAndHalfAfter8Hours ? 1.5 : 1.0;
    
    const regularPay = regularHours * hourlyRate * dateMultiplier;
    const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier * dateMultiplier;
    const earnings = regularPay + overtimePay;
    
    const employeeFirstName = employee?.firstName || '';
    const employeeLastName = employee?.lastName || '';
    const employeeIdNumber = employee?.employeeId || '';
    
    timesheetMap.set(key, {
      employee: {
        id: employeeId,
        firstName: employeeFirstName,
        lastName: employeeLastName,
        employeeId: employeeIdNumber
      },
      employeeId: employeeId,
      employeeName: `${employeeFirstName} ${employeeLastName}`.trim() || 'Unknown Employee',
      date,
      regularHours: parseFloat(regularHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      breakHours: 0,
      totalHours: parseFloat(totalHours.toFixed(2)),
      earnings: parseFloat(earnings.toFixed(2)),
      status: 'PENDING',
      attendanceCode: attendanceCode,
      source: 'attendance_sync',
      details: [{
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        attendanceStatus: status,
        totalWorked: parseFloat(minimumHour || 0),
        standardHours: standardHours,
        calculatedHours: totalHours
      }]
    });
  });
  
  const result = Array.from(timesheetMap.values());
  console.log(`Converted ${result.length} attendance records to timesheet records`);
  return result;
};
  // Main sync handler
  const handleSync = async () => {
    if (!dateRange.start || !dateRange.end) {
      setError('Please select both start and end dates');
      return;
    }

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (start > end) {
      setError('Start date cannot be after end date');
      return;
    }

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const results = {};
      
      // Get filtered employee IDs based on selection and category
      const allowedEmployeeIds = getFilteredEmployeeIds();
      
      // Filter timesheets and attendances by date range
      const dateFilteredTimesheets = filterRecordsByDateRange(timesheets);
      const dateFilteredAttendances = filterRecordsByDateRange(attendances);
      
      // Apply employee filtering
      const filteredTimesheets = filterTimesheetsByEmployees(dateFilteredTimesheets, allowedEmployeeIds);
      const filteredAttendances = filterAttendancesByEmployees(dateFilteredAttendances, allowedEmployeeIds);

      console.log('Sync starting:', {
        direction: syncDirection,
        dateRange,
        originalTimesheetCount: dateFilteredTimesheets.length,
        filteredTimesheetCount: filteredTimesheets.length,
        originalAttendanceCount: dateFilteredAttendances.length,
        filteredAttendanceCount: filteredAttendances.length,
        allowedEmployeeCount: allowedEmployeeIds.size,
        filters: {
          useSelection: syncFilter.useSelection,
          selectedCount: selectedEmployeeIds.size,
          useCategory: syncFilter.useCategory,
          category: syncFilter.category
        }
      });

      // Check if any records remain after filtering
      if (syncDirection === 'timesheetToAttendance' && filteredTimesheets.length === 0) {
        throw new Error('No timesheet records found for the selected employees/category in the date range');
      }
      if (syncDirection === 'attendanceToTimesheet' && filteredAttendances.length === 0) {
        throw new Error('No attendance records found for the selected employees/category in the date range');
      }
      if (syncDirection === 'both' && filteredTimesheets.length === 0 && filteredAttendances.length === 0) {
        throw new Error('No records found for the selected employees/category in the date range');
      }

      // Timesheet to Attendance Sync
      if (syncDirection === 'both' || syncDirection === 'timesheetToAttendance') {
        if (filteredTimesheets.length === 0) {
          if (syncDirection === 'both') {
            console.log('No timesheet records to sync for selected employees');
          } else {
            throw new Error('No timesheet records found for the selected employees/category in the date range');
          }
        } else {
          console.log('Converting timesheets to attendance - leave codes will create pending leave requests only...');
          const { attendanceRecords, pendingLeaveRequests } = await convertTimesheetToAttendance(
            filteredTimesheets, 
            employees, 
            settings
          );
          
          // Save attendance records (only for non-leave codes)
          let attendanceSaveResult = null;
          if (attendanceRecords.length > 0) {
            console.log(`Saving ${attendanceRecords.length} attendance records to database...`);
            attendanceSaveResult = await saveAttendanceRecords(attendanceRecords);
          }
          
          results.timesheetToAttendance = {
            success: true,
            attendanceCount: attendanceRecords.length,
            leaveCount: pendingLeaveRequests.length,
            savedAttendanceCount: attendanceSaveResult?.length || 0,
            savedLeaveCount: pendingLeaveRequests.length,
            leaveRequests: pendingLeaveRequests
          };
          
          console.log('Timesheet to Attendance result:', results.timesheetToAttendance);
        }
      }

      // Attendance to Timesheet Sync
      if (syncDirection === 'both' || syncDirection === 'attendanceToTimesheet') {
        if (filteredAttendances.length === 0) {
          if (syncDirection === 'both') {
            console.log('No attendance records to sync for selected employees');
          } else {
            throw new Error('No attendance records found for the selected employees/category in the date range');
          }
        } else {
          console.log('Converting attendance to timesheets...');
          const timesheetRecords = convertAttendanceToTimesheet(filteredAttendances, settings, employees);
          
          if (timesheetRecords.length === 0) {
            throw new Error('No timesheet records could be created from attendance');
          }
          
          // SAVE TO DATABASE
          console.log(`Saving ${timesheetRecords.length} timesheet records to database...`);
          const saveResult = await saveTimesheetRecords(timesheetRecords);
          
          results.attendanceToTimesheet = {
            success: true,
            count: timesheetRecords.length,
            savedCount: saveResult?.length || saveResult?.count || timesheetRecords.length,
            records: timesheetRecords,
            saveResult: saveResult
          };
          
          console.log('Attendance to Timesheet result:', results.attendanceToTimesheet);
        }
      }

      // Check if anything was actually synced
      if (Object.keys(results).length === 0) {
        throw new Error('No records were synced. Please check your filters and try again.');
      }

      // Create sync history entry
      const syncEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        direction: syncDirection,
        dateRange: { ...dateRange },
        filters: {
          useSelection: syncFilter.useSelection,
          selectedCount: selectedEmployeeIds.size,
          useCategory: syncFilter.useCategory,
          category: syncFilter.category
        },
        results: results
      };

      setSyncHistory(prev => [syncEntry, ...prev.slice(0, 9)]);
      setSyncResult(results);

      // Call the callback function to refresh parent components
      await onSyncComplete(results);

      console.log('Sync completed successfully:', results);

    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message || 'Sync failed. Please check console for details.');
      setSyncResult(null);
    } finally {
      setSyncing(false);
    }
  };

  // Add these helper functions at the top of TimesheetAttendanceSync.jsx (after the imports)

// Helper to get employee standard hours
const getEmployeeStandardHours = (employee, settings) => {
  if (!employee) return settings?.standardWorkHours || 8;
  
  // Check category hours first
  if (employee.category && typeof employee.category === 'string') {
    const category = settings?.categories?.find(cat => 
      cat.name && cat.name.toLowerCase() === employee.category.toLowerCase()
    );
    if (category?.standardRateHours !== undefined) {
      return category.standardRateHours;
    }
  }
  
  // Check job position hours
  if (employee.job?.standardWorkHours) {
    return employee.job.standardWorkHours;
  }
  
  // Check employee's own standard hours
  if (employee.standardWorkHours) {
    return employee.standardWorkHours;
  }
  
  // Fallback to system settings
  return settings?.standardWorkHours || 8;
};


// Helper for date rate multiplier
const getDateRateMultiplier = (date, settings) => {
  const dateObj = new Date(date);
  const dateStr = dateObj.toISOString().split('T')[0];
  
  if (settings?.holidays?.some(h => h.date === dateStr)) {
    return settings.holidayRate || 1.5;
  }
  
  if (settings?.specialWeekends?.some(s => s.date === dateStr)) {
    return settings.weekendRate || 1.25;
  }
  
  if (settings?.weekendDays?.includes(dateObj.getDay())) {
    if (settings.doubleTimeOnSunday && dateObj.getDay() === 0) {
      return 2.0;
    }
    return settings.weekendRate || 1.25;
  }
  
  return 1.0;
};

const calculateHoursFromTime = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  
  try {
    const [inHour, inMinute] = checkIn.split(':').map(Number);
    const [outHour, outMinute] = checkOut.split(':').map(Number);
    
    const totalInMinutes = inHour * 60 + inMinute;
    const totalOutMinutes = outHour * 60 + outMinute;
    
    const diffMinutes = totalOutMinutes - totalInMinutes;
    return Math.max(0, diffMinutes / 60);
  } catch (e) {
    console.error('Error calculating hours:', e);
    return 0;
  }
};

  const clearHistory = () => {
    setSyncHistory([]);
  };

  // Get unique categories from employees
  const categories = [...new Set(employees.map(e => e.category).filter(Boolean))];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ArrowRightLeft size={20} />
          Timesheet ↔ Attendance Sync
        </h3>
        <div className="text-sm text-gray-500">
          Last sync: {syncHistory[0]?.timestamp ? new Date(syncHistory[0].timestamp).toLocaleString() : 'Never'}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sync Direction</label>
            <select
              value={syncDirection}
              onChange={(e) => setSyncDirection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="timesheetToAttendance">Timesheet → Attendance</option>
              <option value="attendanceToTimesheet">Attendance → Timesheet</option>
              <option value="both">Two-way Sync</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* New Filter Controls */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-sm">Employee Filters</span>
            <span className="text-xs text-gray-500">(Apply to sync operation)</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selection Filter */}
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="useSelection"
                checked={syncFilter.useSelection}
                onChange={(e) => setSyncFilter(prev => ({ ...prev, useSelection: e.target.checked }))}
                className="mt-1 h-4 w-4 text-blue-600 rounded"
              />
              <div>
                <label htmlFor="useSelection" className="font-medium text-gray-700 cursor-pointer">
                  Use Selected Employees
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedEmployeeIds.size > 0 
                    ? `${selectedEmployeeIds.size} employee(s) currently selected` 
                    : 'No employees selected in main view'}
                </p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="useCategory"
                checked={syncFilter.useCategory}
                onChange={(e) => setSyncFilter(prev => ({ ...prev, useCategory: e.target.checked }))}
                className="mt-1 h-4 w-4 text-purple-600 rounded"
              />
              <div className="flex-1">
                <label htmlFor="useCategory" className="font-medium text-gray-700 cursor-pointer">
                  Filter by Category
                </label>
                {syncFilter.useCategory && (
                  <select
                    value={syncFilter.category}
                    onChange={(e) => setSyncFilter(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          {(syncFilter.useSelection || syncFilter.useCategory) && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">
                <span className="font-medium">Filter Summary: </span>
                {syncFilter.useSelection && selectedEmployeeIds.size > 0 && (
                  <span>Using {selectedEmployeeIds.size} selected employees</span>
                )}
                {syncFilter.useSelection && selectedEmployeeIds.size === 0 && (
                  <span className="text-amber-600">⚠️ No employees selected</span>
                )}
                {syncFilter.useSelection && syncFilter.useCategory && <span> + </span>}
                {syncFilter.useCategory && syncFilter.category && (
                  <span>Category: {syncFilter.category}</span>
                )}
                {syncFilter.useCategory && !syncFilter.category && (
                  <span className="text-amber-600">⚠️ Please select a category</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-600 font-medium">Timesheet Records</div>
              <Calendar size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold mt-1">{filterRecordsByDateRange(timesheets).length}</div>
            <div className="text-xs text-blue-500 mt-1">
              {dateRange.start} to {dateRange.end}
            </div>
            {(syncFilter.useSelection || syncFilter.useCategory) && (
              <div className="text-xs text-blue-600 mt-2 font-medium">
                After filter: {filterTimesheetsByEmployees(filterRecordsByDateRange(timesheets), getFilteredEmployeeIds()).length}
              </div>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-green-600 font-medium">Attendance Records</div>
              <Calendar size={16} className="text-green-400" />
            </div>
            <div className="text-2xl font-bold mt-1">{filterRecordsByDateRange(attendances).length}</div>
            <div className="text-xs text-green-500 mt-1">
              {dateRange.start} to {dateRange.end}
            </div>
            {(syncFilter.useSelection || syncFilter.useCategory) && (
              <div className="text-xs text-green-600 mt-2 font-medium">
                After filter: {filterAttendancesByEmployees(filterRecordsByDateRange(attendances), getFilteredEmployeeIds()).length}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {syncDirection === 'both' && 'Will sync records in both directions'}
            {syncDirection === 'timesheetToAttendance' && (
              <>
                Will convert timesheet records to attendance (non-leave codes) + 
                <span className="font-semibold text-blue-600"> create pending leave requests for leave codes (L, S, ML, PL)</span>
              </>
            )}
            {syncDirection === 'attendanceToTimesheet' && 'Will convert attendance records to timesheet'}
            {(syncFilter.useSelection || syncFilter.useCategory) && ' (filtered)'}
          </div>
          
          <button
            onClick={handleSync}
            disabled={syncing || (syncFilter.useCategory && !syncFilter.category)}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
              syncing || (syncFilter.useCategory && !syncFilter.category)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {syncing ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                Start Sync
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-800">Sync Failed</div>
                <div className="text-sm text-red-600 mt-1">{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {syncResult && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Check size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-green-800">Sync Completed Successfully</div>
                
                {syncResult.timesheetToAttendance && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium text-green-700">
                      Timesheet → Attendance: 
                      <span className="ml-2">
                        {syncResult.timesheetToAttendance.attendanceCount} attendance records (non-leave)
                      </span>
                    </div>
                    {syncResult.timesheetToAttendance.leaveCount > 0 && (
                      <div className="font-medium text-blue-700 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Created {syncResult.timesheetToAttendance.leaveCount} pending leave request(s)
                        </span>
                        <div className="text-xs text-gray-600 mt-1">
                          These will appear in Leave Management with "Pending" status.
                          They will only appear in Attendance after HR approval.
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {syncResult.attendanceToTimesheet && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium text-green-700">
                      Attendance → Timesheet: {syncResult.attendanceToTimesheet.savedCount || syncResult.attendanceToTimesheet.count} records saved
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {syncResult.attendanceToTimesheet.count} records processed
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => setSyncResult(null)}
                  className="mt-3 text-sm text-green-600 hover:text-green-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {syncHistory.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-700">Recent Sync History</h4>
              <button
                onClick={clearHistory}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear History
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {syncHistory.map((item) => (
                <div key={item.id} className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-800">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="text-gray-500 mt-1">
                        {item.dateRange.start} to {item.dateRange.end}
                      </div>
                      {item.filters && (item.filters.useSelection || item.filters.useCategory) && (
                        <div className="text-xs text-purple-600 mt-1">
                          Filter: {item.filters.useSelection && `${item.filters.selectedCount} selected`}
                          {item.filters.useSelection && item.filters.useCategory && ' + '}
                          {item.filters.useCategory && item.filters.category}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mt-1">
                        {item.results.timesheetToAttendance && (
                          <span className="mr-2">
                            → A: {item.results.timesheetToAttendance.attendanceCount} 
                            {item.results.timesheetToAttendance.leaveCount > 0 && 
                              ` (+${item.results.timesheetToAttendance.leaveCount} pending leaves)`}
                          </span>
                        )}
                        {item.results.attendanceToTimesheet && (
                          <span>
                            → T: {item.results.attendanceToTimesheet.savedCount || item.results.attendanceToTimesheet.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.direction === 'timesheetToAttendance' 
                        ? 'bg-blue-100 text-blue-800'
                        : item.direction === 'attendanceToTimesheet'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.direction === 'timesheetToAttendance' ? '→ Attendance' :
                       item.direction === 'attendanceToTimesheet' ? '→ Timesheet' : 'Two-way'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimesheetAttendanceSync;