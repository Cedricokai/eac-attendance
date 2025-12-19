import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainSidebar from "../mainSidebar";

function Overtime() {
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState({
    employee: { id: '' },
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    status: 'Pending',
    overtimeHours: 0,
    totalOvertimePay: 0,
    defaultOvertimeMultiplier: 1.5,
    hourlyRate: 0,
    doubleTimeOnSunday: false,
    sundayOvertimeMultiplier: 2.0,
    enableTimeAndHalfAfter8Hours: false,
    timeAndHalfMultiplier: 1.5
  });
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [overtimes, setOvertimes] = useState([]);
  const [filteredOvertimes, setFilteredOvertimes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const createMenuRef = useRef(null);
  const [selectAllEmployees, setSelectAllEmployees] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    employeeName: '',
    dateFilterType: 'single',
    singleDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: '',
    minHours: '',
    maxHours: '',
    minAmount: '',
    maxAmount: ''
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [newOvertime, setNewOvertime] = useState({
    employee: { id: '' },
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    status: 'Pending',
    overtimeHours: 0,
    totalOvertimePay: 0,
    overtimeMultiplier: 1.5
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

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getWeekStartDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  };

  const getWeekEndDate = () => {
    const weekStart = new Date(getWeekStartDate());
    weekStart.setDate(weekStart.getDate() + 6);
    return weekStart.toISOString().split('T')[0];
  };

  const getMonthStartDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  };

  const getMonthEndDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const calculateFilterDates = () => {
    const { dateFilterType, singleDate, startDate, endDate } = searchFilters;
    
    switch(dateFilterType) {
      case 'single':
        return {
          startDate: singleDate,
          endDate: singleDate
        };
      case 'range':
        return {
          startDate: startDate || getTodayDate(),
          endDate: endDate || getTodayDate()
        };
      case 'today':
        const today = getTodayDate();
        return {
          startDate: today,
          endDate: today
        };
      case 'thisWeek':
        return {
          startDate: getWeekStartDate(),
          endDate: getWeekEndDate()
        };
      case 'thisMonth':
        return {
          startDate: getMonthStartDate(),
          endDate: getMonthEndDate()
        };
      case 'customRange':
        return {
          startDate: startDate || getTodayDate(),
          endDate: endDate || getTodayDate()
        };
      default:
        return {
          startDate: getTodayDate(),
          endDate: getTodayDate()
        };
    }
  };

  useEffect(() => {
    if (newOvertime.startTime && newOvertime.endTime && newOvertime.employee.id) {
      calculateOvertime();
    }
  }, [newOvertime.startTime, newOvertime.endTime, newOvertime.date, newOvertime.employee.id, employees, settings]);

  const calculateOvertime = () => {
    const [startHours, startMinutes] = newOvertime.startTime.split(':').map(Number);
    const [endHours, endMinutes] = newOvertime.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    const diffHours = (endTotalMinutes - startTotalMinutes) / 60;
    
    if (diffHours > 0) {
      const selectedEmployee = employees.find(emp => emp.id === newOvertime.employee.id);
      const employeeRate = selectedEmployee?.minimumRate || settings.hourlyRate;
      
      const date = new Date(newOvertime.date);
      const dayOfWeek = date.getDay();
      
      let multiplier = settings.defaultOvertimeMultiplier;
      
      if (dayOfWeek === 0 && settings.doubleTimeOnSunday) {
        multiplier = settings.sundayOvertimeMultiplier;
      }
      
      if (settings.enableTimeAndHalfAfter8Hours && diffHours > 8) {
        multiplier = settings.timeAndHalfMultiplier;
      }
      
      const newHourlyRate = employeeRate * multiplier;
      const overtimePay = newHourlyRate * diffHours;
      
      setNewOvertime(prev => ({
        ...prev,
        overtimeHours: diffHours.toFixed(2),
        totalOvertimePay: overtimePay.toFixed(2),
        overtimeMultiplier: multiplier
      }));
    } else {
      setNewOvertime(prev => ({
        ...prev,
        overtimeHours: '',
        totalOvertimePay: ''
      }));
    }
  };

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "employeeId") {
      const employeeId = Number(value) || "";
      const selectedEmployee = employees.find(emp => emp.id === employeeId);
      
      setNewOvertime(prev => ({
        ...prev,
        employee: {
          ...prev.employee,
          id: employeeId,
        }
      }));
    } else {
      setNewOvertime(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const fetchSettings = async () => {
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
          ...systemSettings
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const [employeesResponse, overtimeResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employee`, {
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
        })
      ]);

      if (!employeesResponse.ok) throw new Error('Failed to fetch employees');
      const employeesData = await employeesResponse.json();

      let overtimesData = [];
      if (overtimeResponse.ok) {
        overtimesData = await overtimeResponse.json();
      }

      const normalizedOvertimes = overtimesData.map(o => ({
        id: o.id,
        employeeId: o.employee?.id ?? o.employeeId,
        date: o.date ? new Date(o.date).toISOString().split('T')[0] : null
      }));

      const filteredEmployees = employeesData.filter(employee => {
        if (!newOvertime.date) return true;
        const selectedDate = newOvertime.date;
        const hasOvertime = normalizedOvertimes.some(ot => {
          if (!ot || !ot.employeeId) return false;
          return String(ot.employeeId) === String(employee.id) && ot.date === selectedDate;
        });
        return !hasOvertime;
      });

      setEmployees(filteredEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOvertimes = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/overtime`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
      const data = await response.json();

      const normalized = data.map((o) => {
        const employee = normalizeEmployee(o);

        const overtimeHours = o.overtimeHours != null && o.overtimeHours !== ''
          ? Number(o.overtimeHours)
          : calcHoursFromTimes(o.startTime, o.endTime);

        const overtimeMultiplier = o.overtimeMultiplier ?? settings.defaultOvertimeMultiplier;

        const rate = employee.minimumRate ?? settings.hourlyRate;

        const calculatedOvertimePay = o.calculatedOvertimePay != null
          ? Number(o.calculatedOvertimePay)
          : Number((rate * overtimeMultiplier * overtimeHours).toFixed(2));

        return {
          ...o,
          employee,
          overtimeHours,
          overtimeMultiplier,
          calculatedOvertimePay,
        };
      });

      const validOvertimes = normalized.filter(item => item && item.id != null);

      setOvertimes(validOvertimes);
      setFilteredOvertimes(validOvertimes);
    } catch (err) {
      console.error('Error fetching overtimes:', err);
      setError(err.message);
      setOvertimes([]);
      setFilteredOvertimes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOvertimes();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOvertimeUpdate = () => {
      fetchOvertimes();
    };

    window.addEventListener("overtime-updated", handleOvertimeUpdate);
    return () => window.removeEventListener("overtime-updated", handleOvertimeUpdate);
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchEmployees();
    fetchOvertimes();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [newOvertime.date]);

  const performSearch = () => {
    if (!query.trim() && Object.values(searchFilters).every(val => !val) && searchFilters.dateFilterType === 'single') {
      setFilteredOvertimes(overtimes);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const dates = calculateFilterDates();
    
    const filtered = overtimes.filter(overtime => {
      const employee = overtime.employee || {};
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
      
      const employeeId = employee.employeeId !== undefined && employee.employeeId !== null 
        ? String(employee.employeeId).toLowerCase() 
        : '';
      
      const status = (overtime.status || '').toLowerCase();
      const date = overtime.date || '';
      const hours = overtime.overtimeHours || 0;
      const amount = overtime.calculatedOvertimePay || 0;

      const isWithinDateRange = (!dates.startDate && !dates.endDate) || 
        (date >= dates.startDate && date <= dates.endDate);

      const matchesMainQuery = !searchTerm || 
        employeeName.includes(searchTerm) ||
        employeeId.includes(searchTerm) ||
        status.includes(searchTerm);

      const matchesEmployeeName = !searchFilters.employeeName || 
        employeeName.includes(searchFilters.employeeName.toLowerCase());
      
      const matchesStatus = !searchFilters.status || 
        status === searchFilters.status.toLowerCase();
      
      const matchesMinHours = !searchFilters.minHours || 
        hours >= parseFloat(searchFilters.minHours);
      
      const matchesMaxHours = !searchFilters.maxHours || 
        hours <= parseFloat(searchFilters.maxHours);
      
      const matchesMinAmount = !searchFilters.minAmount || 
        amount >= parseFloat(searchFilters.minAmount);
      
      const matchesMaxAmount = !searchFilters.maxAmount || 
        amount <= parseFloat(searchFilters.maxAmount);

      return isWithinDateRange && 
             matchesMainQuery && 
             matchesEmployeeName && 
             matchesStatus && 
             matchesMinHours && 
             matchesMaxHours && 
             matchesMinAmount && 
             matchesMaxAmount;
    });

    setFilteredOvertimes(filtered);
  };

  useEffect(() => {
    performSearch();
  }, [query, searchFilters, overtimes]);

  const handleSearchInputChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'query') {
      setQuery(value);
    } else if (name === 'dateFilterType') {
      setSearchFilters(prev => ({
        ...prev,
        dateFilterType: value
      }));
    } else {
      setSearchFilters(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? e.target.checked : value
      }));
    }
  };

  const resetSearch = () => {
    setQuery('');
    setSearchFilters({
      employeeName: '',
      dateFilterType: 'single',
      singleDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: '',
      minHours: '',
      maxHours: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  const handleHeaderCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setIsAllSelected(isChecked);
    
    filteredOvertimes.forEach(overtime => {
      const checkbox = document.getElementById(`checkbox-${overtime.id}`);
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    });
  };

  const createOvertime = async () => { 
    if (selectAllEmployees) {
      const formatTimeToHHMMSS = (time) => {
        if (!time) return '00:00:00';
        if (time.length === 5) return time + ':00';
        if (time.length === 8) return time;
        const parts = time.split(':');
        if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
        return '00:00:00';
      };

      for (const employee of employees) {
        const employeeRate = employee.minimumRate || settings.hourlyRate;

        const date = new Date(newOvertime.date);
        const dayOfWeek = date.getDay();

        let multiplier = settings.defaultOvertimeMultiplier;

        if (dayOfWeek === 0 && settings.doubleTimeOnSunday) {
          multiplier = settings.sundayOvertimeMultiplier;
        }

        const [startHours, startMinutes] = newOvertime.startTime.split(':').map(Number);
        const [endHours, endMinutes] = newOvertime.endTime.split(':').map(Number);

        const startTotal = startHours * 60 + startMinutes;
        const endTotal = endHours * 60 + endMinutes;

        const diffHours = (endTotal - startTotal) / 60;

        if (settings.enableTimeAndHalfAfter8Hours && diffHours > 8) {
          multiplier = settings.timeAndHalfMultiplier;
        }

        const newHourlyRate = employeeRate * multiplier;
        const overtimePay = (newHourlyRate * diffHours).toFixed(2);

        const overtimeData = {
          employeeId: employee.id,
          date: newOvertime.date,
          startTime: formatTimeToHHMMSS(newOvertime.startTime),
          endTime: formatTimeToHHMMSS(newOvertime.endTime),
          status: newOvertime.status || 'Pending',
          baseHourlyRate: employeeRate,
          overtimeMultiplier: multiplier,
          overtimeHours: Number(diffHours.toFixed(2)),
          calculatedOvertimePay: Number(overtimePay)
        };

        try {
          const token = getToken();
          
          const response = await fetch(`${API_BASE_URL}/api/overtime`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(overtimeData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            continue;
          }

          const responseData = await response.json();
          console.log('Successfully created overtime:', responseData);

        } catch (err) {
          console.error('Error creating overtime for employee:', employee.id, err);
          continue;
        }
      }

      setNewOvertime({
        employee: { id: '' },
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        status: 'Pending',
        overtimeHours: 0,
        totalOvertimePay: 0,
        overtimeMultiplier: settings.defaultOvertimeMultiplier
      });

      setSelectAllEmployees(false);
      setIsCreateMenuOpen(false);

      fetchEmployees();
      fetchOvertimes();

    } else {
      if (!newOvertime.employee.id || !newOvertime.date || !newOvertime.startTime || !newOvertime.endTime) {
        setError('Please fill out all required fields.');
        return;
      }

      if (!newOvertime.overtimeHours || parseFloat(newOvertime.overtimeHours) <= 0) {
        setError('End time must be after start time');
        return;
      }

      try {
        const employeeRate = getEmployeeRate(newOvertime.employee.id);
        const newHourlyRate = employeeRate * (newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier);
        const calculatedPay = (newHourlyRate * parseFloat(newOvertime.overtimeHours || 0)).toFixed(2);
        const formatTime = (t) => t.length === 5 ? t + ":00" : t;

        const overtimeData = {
          employeeId: newOvertime.employee.id,
          date: newOvertime.date,
          startTime: formatTime(newOvertime.startTime),
          endTime: formatTime(newOvertime.endTime),
          status: newOvertime.status,
          baseHourlyRate: employeeRate,
          overtimeMultiplier: newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier,
          overtimeHours: Number(newOvertime.overtimeHours),
          calculatedOvertimePay: Number(calculatedPay)
        };

        overtimeData.baseHourlyRate = Number(overtimeData.baseHourlyRate);
        overtimeData.overtimeMultiplier = Number(overtimeData.overtimeMultiplier);
        overtimeData.overtimeHours = Number(overtimeData.overtimeHours);
        overtimeData.calculatedOvertimePay = Number(overtimeData.calculatedOvertimePay);

        const token = getToken();

        const response = await fetch(`${API_BASE_URL}/api/overtime`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(overtimeData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        setOvertimes(prev => [...prev, data]);
        setNewOvertime({
          employee: { id: '' },
          date: new Date().toISOString().split('T')[0],
          startTime: '',
          endTime: '',
          status: 'Pending',
          overtimeHours: 0,
          totalOvertimePay: 0,
          overtimeMultiplier: settings.defaultOvertimeMultiplier
        });
        setError('');
        setIsCreateMenuOpen(false);
        fetchEmployees();

      } catch (err) {
        console.error('Error creating overtime:', err);
        setError(err.message);
      }
    }
  };

  const calcHoursFromTimes = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const toMinutes = (t) => {
      const parts = t.split(':').map(Number);
      if (parts.length >= 2) return parts[0] * 60 + parts[1];
      return 0;
    };
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    const diff = (end - start) / 60;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  };

  const normalizeEmployee = (item) => {
    if (item.employee) return item.employee;
    const name = item.employeeName || '';
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    
    let employeeId = item.employeeId || item.employee?.employeeId || null;
    if (employeeId !== null && employeeId !== undefined) {
      employeeId = String(employeeId);
    }
    
    return {
      id: item.employeeId ?? item.employee?.id ?? null,
      firstName,
      lastName,
      employeeId: employeeId,
      minimumRate: item.minimumRate ?? item.employee?.minimumRate ?? settings.hourlyRate
    };
  };

  const validateOvertime = async (overtimeId) => {
    setIsValidating(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/overtime/validate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ overtimeIds: [overtimeId] }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Validation failed");
      }

      alert(result.message);
      fetchOvertimes();
    } catch (error) {
      console.error("Validation Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const validateSelectedOvertimes = async () => {
    const checkedOvertimeIds = isAllSelected 
      ? filteredOvertimes.map(o => o.id)
      : filteredOvertimes
          .filter(o => document.getElementById(`checkbox-${o.id}`)?.checked)
          .map(o => o.id);

    if (checkedOvertimeIds.length === 0) {
      alert("Please select at least one overtime record");
      return;
    }

    setIsValidating(true);
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/overtime/validate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ overtimeIds: checkedOvertimeIds })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Validation failed");
      }

      alert(`Successfully validated ${result.data.length} overtime records!`);
      fetchOvertimes();
    } catch (error) {
      console.error("Validation error:", error);
      alert(error.message || "An unexpected error occurred");
    } finally {
      setIsValidating(false);
      setIsAllSelected(false);
      filteredOvertimes.forEach(o => {
        const checkbox = document.getElementById(`checkbox-${o.id}`);
        if (checkbox) checkbox.checked = false;
      });
    }
  };

  const getEmployeeRate = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.minimumRate || settings.hourlyRate;
  };

  const calculateOvertimeAmount = (employeeRate, overtimeMultiplier, overtimeHours) => {
    const newHourlyRate = employeeRate * overtimeMultiplier;
    return (newHourlyRate * overtimeHours).toFixed(2);
  };

  const searchStats = useMemo(() => {
    return {
      total: overtimes.length,
      filtered: filteredOvertimes.length,
      totalHours: filteredOvertimes.reduce((sum, o) => sum + (o.overtimeHours || 0), 0).toFixed(1),
      totalAmount: filteredOvertimes.reduce((sum, o) => sum + (o.calculatedOvertimePay || 0), 0).toFixed(2)
    };
  }, [overtimes, filteredOvertimes]);

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

  const dateFilterTypes = [
    { value: 'single', label: 'Single Date' },
    { value: 'range', label: 'Date Range' },
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'customRange', label: 'Custom Range' }
  ];

  const renderDateFilterSection = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Date Filter</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {dateFilterTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setSearchFilters(prev => ({ ...prev, dateFilterType: type.value }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchFilters.dateFilterType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(searchFilters.dateFilterType === 'single' || searchFilters.dateFilterType === 'range') && (
            <>
              {searchFilters.dateFilterType === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                  <input
                    type="date"
                    name="singleDate"
                    value={searchFilters.singleDate}
                    onChange={handleSearchInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              
              {(searchFilters.dateFilterType === 'range' || searchFilters.dateFilterType === 'customRange') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={searchFilters.startDate}
                      onChange={handleSearchInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={searchFilters.endDate}
                      onChange={handleSearchInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {searchFilters.dateFilterType !== 'single' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>Selected Date Range:</strong> {calculateFilterDates().startDate} to {calculateFilterDates().endDate}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvancedSearchPanel = () => (
    <div className="mt-4 mb-6">
      <button
        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showAdvancedSearch ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showAdvancedSearch ? 'Hide Advanced Search' : 'Show Advanced Search'}
      </button>
      
      {showAdvancedSearch && (
        <div className="space-y-4">
          {renderDateFilterSection()}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  name="employeeName"
                  value={searchFilters.employeeName}
                  onChange={handleSearchInputChange}
                  placeholder="Enter employee name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={searchFilters.status}
                  onChange={handleSearchInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Overtime Hours</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="minHours"
                    value={searchFilters.minHours}
                    onChange={handleSearchInputChange}
                    placeholder="Min"
                    step="0.5"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    name="maxHours"
                    value={searchFilters.maxHours}
                    onChange={handleSearchInputChange}
                    placeholder="Max"
                    step="0.5"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Overtime Amount (GHS)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="minAmount"
                    value={searchFilters.minAmount}
                    onChange={handleSearchInputChange}
                    placeholder="Min GHS"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    name="maxAmount"
                    value={searchFilters.maxAmount}
                    onChange={handleSearchInputChange}
                    placeholder="Max GHS"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-end justify-end gap-2 mt-4">
              <button
                onClick={resetSearch}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Reset All Filters
              </button>
              <button
                onClick={performSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuickFilters = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => setSearchFilters(prev => ({ ...prev, dateFilterType: 'today' }))}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
          searchFilters.dateFilterType === 'today'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Today
      </button>
      <button
        onClick={() => setSearchFilters(prev => ({ ...prev, dateFilterType: 'thisWeek' }))}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
          searchFilters.dateFilterType === 'thisWeek'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        This Week
      </button>
      <button
        onClick={() => setSearchFilters(prev => ({ ...prev, dateFilterType: 'thisMonth' }))}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
          searchFilters.dateFilterType === 'thisMonth'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        This Month
      </button>
      <button
        onClick={() => setSearchFilters(prev => ({ ...prev, dateFilterType: 'range' }))}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
          searchFilters.dateFilterType === 'range'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Custom Range
      </button>
      <button
        onClick={resetSearch}
        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );

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

          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-sm mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Overtime Management (GHS)</h1>
              <p className="text-gray-600">Track and manage employee overtime records in Ghana Cedis</p>
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
                  name="query"
                  placeholder="Search employees, status, ID..."
                  value={query}
                  onChange={handleSearchInputChange}
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
                Add Overtime
              </button>
            </div>
          </section>

          {filteredOvertimes.length !== overtimes.length && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Showing {filteredOvertimes.length} of {overtimes.length} records
                    {query && ` for "${query}"`}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Total hours: {searchStats.totalHours}h | Total amount: {formatCurrency(searchStats.totalAmount)}
                  </p>
                </div>
                <button
                  onClick={resetSearch}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear search
                </button>
              </div>
            </div>
          )}

          {renderQuickFilters()}
          {renderAdvancedSearchPanel()}

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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={newOvertime.date}
                  onChange={(e) => setNewOvertime(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={validateSelectedOvertimes}
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (GHS)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">
                        <div className="flex justify-center items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading overtime records...
                        </div>
                      </td>
                    </tr>
                  ) : filteredOvertimes.length > 0 ? (
                    filteredOvertimes.map((overtime) => {
                      const employee = overtime.employee || {};
                      const employeeFirstName = employee.firstName || 'Unknown';
                      const employeeLastName = employee.lastName || 'Employee';
                      const employeeId = employee.employeeId || 'N/A';
                      
                      const employeeRate = getEmployeeRate(employee.id);
                      
                      const newHourlyRate = employeeRate * overtime.overtimeMultiplier;
                      
                      const calculatedPay = overtime.calculatedOvertimePay;
                      
                      return (
                        <tr key={overtime.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input 
                              type="checkbox" 
                              id={`checkbox-${overtime.id}`}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-700 font-medium">
                                  {employeeFirstName.charAt(0)}{employeeLastName.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {employeeFirstName} {employeeLastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {employeeId}
                                  <span className="ml-2 text-xs text-blue-600">
                                    ({formatCurrency(employeeRate)}/hr × {overtime.overtimeMultiplier}x = {formatCurrency(newHourlyRate)}/hr)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {overtime.date ? new Date(overtime.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'No Date'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {overtime.startTime ? overtime.startTime.substring(0, 5) : '--:--'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {overtime.endTime ? overtime.endTime.substring(0, 5) : '--:--'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {overtime.overtimeHours ? parseFloat(overtime.overtimeHours).toFixed(1) : '0.0'} hrs
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(calculatedPay)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              overtime.status === 'Approved' 
                                ? 'bg-green-100 text-green-800'
                                : overtime.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {overtime.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => validateOvertime(overtime.id)}
                                disabled={isValidating}
                                className={`px-3 py-1 rounded-md text-sm ${
                                  isValidating
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                              >
                                Validate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <p className="text-lg font-medium mb-1">No overtime records found</p>
                          {query || Object.values(searchFilters).some(val => val) ? (
                            <p className="text-sm">No records match your search criteria. Try adjusting your filters.</p>
                          ) : (
                            <p className="text-sm">Create your first overtime record using the "Add Overtime" button</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {isCreateMenuOpen && (
            <div 
              ref={createMenuRef} 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add Overtime (GHS)</h1>
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
                      value={newOvertime.date}
                      onChange={(e) => setNewOvertime(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select
                      name="employeeId"
                      value={newOvertime.employee.id}
                      onChange={handleInputChange}
                      disabled={selectAllEmployees}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} ({formatCurrency(employee.minimumRate || settings.hourlyRate)}/hr)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {newOvertime.employee.id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-700">
                      <strong>Overtime Rate:</strong> {formatCurrency(getEmployeeRate(newOvertime.employee.id))}/hr × {newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier}x = {formatCurrency(getEmployeeRate(newOvertime.employee.id) * (newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier))}/hr
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAllEmployees}
                    onChange={(e) => setSelectAllEmployees(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">Select All Available Employees</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      value={newOvertime.startTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      value={newOvertime.endTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours</label>
                    <input
                      type="text"
                      value={newOvertime.overtimeHours || ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Multiplier</label>
                    <input
                      type="text"
                      value={newOvertime.overtimeMultiplier ? `${newOvertime.overtimeMultiplier}x` : `${settings.defaultOvertimeMultiplier || 1.5}x`}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Overtime Pay (GHS)</label>
                    <input
                      type="text"
                      value={newOvertime.totalOvertimePay ? `${formatCurrency(newOvertime.totalOvertimePay)}` : ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100"
                    />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Overtime Calculation (GHS)</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Formula:</strong> (Employee Rate × Overtime Multiplier) = New Rate × Hours</p>
                    <p><strong>Calculation:</strong> ({formatCurrency(getEmployeeRate(newOvertime.employee.id) || settings.hourlyRate)} × {newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier || 1.5}) = {formatCurrency((getEmployeeRate(newOvertime.employee.id) || settings.hourlyRate) * (newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier || 1.5))} × {newOvertime.overtimeHours || '0'} = {formatCurrency(newOvertime.totalOvertimePay || '0.00')}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={newOvertime.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setNewOvertime({
                        employee: { id: '' },
                        date: new Date().toISOString().split('T')[0],
                        startTime: '',
                        endTime: '',
                        status: 'Pending',
                        overtimeHours: 0,
                        totalOvertimePay: 0,
                        overtimeMultiplier: 1.5
                      });
                      setSelectAllEmployees(false);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={createOvertime}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Submit Overtime
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Overtime;