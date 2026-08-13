import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import Header from "../../../components/Header";
import { TrashIcon } from '@heroicons/react/24/outline';

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
    defaultOvertimeMultiplier: null,
    hourlyRate: 0,
    doubleTimeOnSunday: false,
    sundayOvertimeMultiplier: 2.0,
    enableTimeAndHalfAfter8Hours: false,
    timeAndHalfMultiplier: 1.5,
    categories: []
  });
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [overtimes, setOvertimes] = useState([]);
  const [filteredOvertimes, setFilteredOvertimes] = useState([]);
  const [overtimePage, setOvertimePage] = useState(0);
  const [overtimePageSize, setOvertimePageSize] = useState(100);
  const [overtimeTotalPages, setOvertimeTotalPages] = useState(0);
  const [overtimeTotalRecords, setOvertimeTotalRecords] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const createMenuRef = useRef(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isTogglingMultiplier, setIsTogglingMultiplier] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [overtimeToDelete, setOvertimeToDelete] = useState(null);
const [isDeleting, setIsDeleting] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    employeeName: '',
    category: '',
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
  const [selectedOvertimeIds, setSelectedOvertimeIds] = useState(new Set());
  const [overtimeFilter, setOvertimeFilter] = useState('all');
  const [isBulkCreateMenuOpen, setIsBulkCreateMenuOpen] = useState(false);
  const [bulkOvertimeItems, setBulkOvertimeItems] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkStartTime, setBulkStartTime] = useState('');
  const [bulkEndTime, setBulkEndTime] = useState('');
  const [multiplierAppliedToHours, setMultiplierAppliedToHours] = useState(false);
  const [selectAllEmployees, setSelectAllEmployees] = useState(false);

  const [newOvertime, setNewOvertime] = useState({
    employee: { id: '' },
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    status: 'Pending',
    overtimeHours: 0,
    rawOvertimeHours: 0,
    totalOvertimePay: 0,
    overtimeMultiplier: null
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

  const calculateOvertime = () => {
    if (!newOvertime.startTime || !newOvertime.endTime || !newOvertime.employee.id) return;

    const [startHours, startMinutes] = newOvertime.startTime.split(':').map(Number);
    const [endHours, endMinutes] = newOvertime.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    const rawHours = (endTotalMinutes - startTotalMinutes) / 60;
    
    if (rawHours > 0) {
      const selectedEmployee = employees.find(emp => emp.id === newOvertime.employee.id);
      const employeeRate = selectedEmployee?.minimumRate || settings.hourlyRate;
      
      const date = new Date(newOvertime.date);
      const dayOfWeek = date.getDay();
      
      let multiplier = getDefaultOvertimeMultiplier();
      
      if (dayOfWeek === 0 && settings.doubleTimeOnSunday) {
        multiplier = settings.sundayOvertimeMultiplier;
      }
      
      if (settings.enableTimeAndHalfAfter8Hours && rawHours > 8) {
        multiplier = settings.timeAndHalfMultiplier;
      }
      
      let finalHours;
      let overtimePay;
      
      if (multiplierAppliedToHours) {
        finalHours = rawHours * multiplier;
        overtimePay = finalHours * employeeRate;
      } else {
        finalHours = rawHours;
        overtimePay = rawHours * (employeeRate * multiplier);
      }
      
      setNewOvertime(prev => ({
        ...prev,
        rawOvertimeHours: rawHours,
        overtimeHours: finalHours,
        totalOvertimePay: overtimePay,
        overtimeMultiplier: multiplier
      }));
    } else {
      setNewOvertime(prev => ({
        ...prev,
        rawOvertimeHours: 0,
        overtimeHours: 0,
        totalOvertimePay: 0
      }));
    }
  };

  useEffect(() => {
    if (newOvertime.startTime && newOvertime.endTime && newOvertime.employee.id) {
      calculateOvertime();
    }
  }, [newOvertime.startTime, newOvertime.endTime, newOvertime.date, newOvertime.employee.id, employees, settings, multiplierAppliedToHours]);

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

  const deleteOvertime = async (overtimeId) => {
  setIsDeleting(true);
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/overtime/${overtimeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || 'Failed to delete overtime record');
    }

    // Remove the deleted overtime from state
    setOvertimes(overtimes.filter(overtime => overtime.id !== overtimeId));
    setFilteredOvertimes(filteredOvertimes.filter(overtime => overtime.id !== overtimeId));
    
    // Remove from selected set if present
    const newSelectedIds = new Set(selectedOvertimeIds);
    newSelectedIds.delete(overtimeId);
    setSelectedOvertimeIds(newSelectedIds);
    
    await fetchOvertimes(overtimePage);
    alert('Overtime record deleted successfully');
  } catch (err) {
    console.error('Delete error:', err);
    setError(err.message);
    alert('Error deleting overtime record: ' + err.message);
  } finally {
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    setOvertimeToDelete(null);
  }
};

  const fetchSettings = async () => {
    try {
      const token = getToken();
      const [systemResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/settings/system`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/settings/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      ]);
      
      if (systemResponse.ok) {
        const systemSettings = await systemResponse.json();
        setSettings(prev => ({
          ...prev,
          ...systemSettings
        }));
      }

      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        console.log('Categories fetched:', categories);
        setSettings(prev => ({
          ...prev,
          categories: categories
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Add this function to your component
const bulkDeleteOvertimes = async () => {
  const checkedOvertimeIds = Array.from(selectedOvertimeIds);

  if (checkedOvertimeIds.length === 0) {
    alert("Please select at least one overtime record");
    return;
  }

  if (!await window.appConfirm(`Are you sure you want to delete ${checkedOvertimeIds.length} overtime record(s)? This action cannot be undone.`)) {
    return;
  }

  setIsDeleting(true);
  
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/overtime/bulk/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: checkedOvertimeIds })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || 'Failed to delete overtime records');
    }

    const result = await response.json();
    
    // Remove deleted records from state
    const remainingOvertimes = overtimes.filter(o => !checkedOvertimeIds.includes(o.id));
    setOvertimes(remainingOvertimes);
    setFilteredOvertimes(remainingOvertimes);
    
    // Clear selection
    setSelectedOvertimeIds(new Set());
    setIsAllSelected(false);
    
    const nextPage = filteredOvertimes.length === checkedOvertimeIds.length && overtimePage > 0
      ? overtimePage - 1
      : overtimePage;
    setOvertimePage(nextPage);
    await fetchOvertimes(nextPage);
    alert(`Successfully deleted ${result.deletedCount || checkedOvertimeIds.length} overtime record(s)`);
    
  } catch (err) {
    console.error('Bulk delete error:', err);
    setError(err.message);
    alert('Error deleting overtime records: ' + err.message);
  } finally {
    setIsDeleting(false);
  }
};

  const fetchEmployees = async () => {
    try {
      const token = getToken();

      if (!newOvertime.date) {
        setEmployees([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/overtime/available-employees?date=${newOvertime.date}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch available employees');
      }

      const employeesData = await response.json();
      const normalizedEmployees = employeesData.map((employee) => {
        const categoryObject =
          employee.category && typeof employee.category === 'object'
            ? employee.category
            : null;

        const categoryId = employee.categoryId ?? categoryObject?.id ?? null;
        const categoryName =
          employee.categoryName ??
          categoryObject?.name ??
          (typeof employee.category === 'string' ? employee.category : null) ??
          settings.categories?.find((category) => String(category.id) === String(categoryId))?.name ??
          'General';

        return {
          ...employee,
          categoryId,
          categoryName,
          category: categoryName
        };
      });

      setEmployees(normalizedEmployees);
    } catch (err) {
      console.error('Error fetching available employees:', err);
      setError(err.message);
      setEmployees([]);
    }
  };

  const normalizeOvertimeDTO = (record) => {
    if (!record) return null;

    // Compatibility with the old response shape.
    if (record.employee) {
      const employee = normalizeEmployee(record);
      return {
        ...record,
        employee,
        overtimeHours: Number(record.overtimeHours ?? 0),
        rawOvertimeHours: Number(record.rawOvertimeHours ?? record.overtimeHours ?? 0),
        overtimeMultiplier: Number(
          record.overtimeMultiplier ?? settings.defaultOvertimeMultiplier ?? 1.5
        ),
        calculatedOvertimePay: Number(record.calculatedOvertimePay ?? 0),
        multiplierAppliedToHours: Boolean(record.multiplierAppliedToHours)
      };
    }

    const categoryName = record.categoryName || 'General';

    return {
      id: record.id,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      overtimeHours: Number(record.overtimeHours ?? 0),
      rawOvertimeHours: Number(record.rawOvertimeHours ?? record.overtimeHours ?? 0),
      status: record.status || 'Pending',
      notes: record.notes,
      category: record.overtimeCategory,
      baseHourlyRate: Number(
        record.baseHourlyRate ?? record.employeeMinimumRate ?? settings.hourlyRate ?? 0
      ),
      overtimeMultiplier: Number(
        record.overtimeMultiplier ?? settings.defaultOvertimeMultiplier ?? 1.5
      ),
      calculatedOvertimePay: Number(record.calculatedOvertimePay ?? 0),
      multiplierAppliedToHours: Boolean(record.multiplierAppliedToHours),
      attendanceId: record.attendanceId,
      employeeId: record.employeeId,
      employeeName: `${record.firstName || ''} ${record.lastName || ''}`.trim(),
      employee: {
        id: record.employeeId,
        employeeId: record.employeeNumber,
        firstName: record.firstName,
        lastName: record.lastName,
        minimumRate: Number(record.employeeMinimumRate ?? 0),
        category: categoryName,
        categoryId: record.categoryId,
        categoryName: record.categoryName
      }
    };
  };

  const fetchOvertimes = async (requestedPage = overtimePage) => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const dates = calculateFilterDates();

      if (!dates.startDate || !dates.endDate) {
        throw new Error('Please select a valid overtime date range');
      }

      if (dates.endDate < dates.startDate) {
        throw new Error('End date must be on or after start date');
      }

      const selectedCategory = settings.categories?.find(
        (category) =>
          String(category.id) === String(searchFilters.category) ||
          category.name === searchFilters.category
      );

      const categoryId = selectedCategory?.id ?? (
        searchFilters.category && !Number.isNaN(Number(searchFilters.category))
          ? Number(searchFilters.category)
          : null
      );

      const params = new URLSearchParams({
        startDate: dates.startDate,
        endDate: dates.endDate,
        page: String(requestedPage),
        size: String(overtimePageSize)
      });

      const normalizedSearch = query.trim() || searchFilters.employeeName.trim();
      if (normalizedSearch) params.set('search', normalizedSearch);
      if (categoryId) params.set('categoryId', String(categoryId));
      if (searchFilters.status) params.set('status', searchFilters.status);
      if (searchFilters.minHours !== '') params.set('minHours', String(searchFilters.minHours));
      if (searchFilters.maxHours !== '') params.set('maxHours', String(searchFilters.maxHours));
      if (searchFilters.minAmount !== '') params.set('minAmount', String(searchFilters.minAmount));
      if (searchFilters.maxAmount !== '') params.set('maxAmount', String(searchFilters.maxAmount));

      const response = await fetch(
        `${API_BASE_URL}/api/overtime/page?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch overtime: ${response.status}`);
      }

      const pageData = await response.json();
      const pageRecords = Array.isArray(pageData.content)
        ? pageData.content.map(normalizeOvertimeDTO).filter(Boolean)
        : [];

      setOvertimes(pageRecords);
      setFilteredOvertimes(pageRecords);
      setOvertimePage(Number(pageData.number ?? requestedPage));
      setOvertimeTotalPages(Number(pageData.totalPages ?? 0));
      setOvertimeTotalRecords(Number(pageData.totalElements ?? 0));
      setSelectedOvertimeIds(new Set());
      setIsAllSelected(false);
    } catch (err) {
      console.error('Error fetching overtimes:', err);
      setError(err.message || 'Failed to fetch overtime records');
      setOvertimes([]);
      setFilteredOvertimes([]);
      setOvertimeTotalPages(0);
      setOvertimeTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!Array.isArray(settings.categories)) return;

    const timer = setTimeout(() => {
      setOvertimePage(0);
      fetchOvertimes(0);
    }, 400);

    return () => clearTimeout(timer);
  }, [
    settings.categories,
    query,
    searchFilters.employeeName,
    searchFilters.category,
    searchFilters.dateFilterType,
    searchFilters.singleDate,
    searchFilters.startDate,
    searchFilters.endDate,
    searchFilters.status,
    searchFilters.minHours,
    searchFilters.maxHours,
    searchFilters.minAmount,
    searchFilters.maxAmount,
    overtimePageSize
  ]);

  useEffect(() => {
    if (settings?.defaultOvertimeMultiplier != null) {
      setNewOvertime((previous) => ({
        ...previous,
        overtimeMultiplier:
          previous.overtimeMultiplier ?? Number(settings.defaultOvertimeMultiplier)
      }));
    }
  }, [settings?.defaultOvertimeMultiplier]);

  useEffect(() => {
    fetchEmployees();
  }, [newOvertime.date, settings.categories]);

  const performSearch = () => {
    setOvertimePage(0);
    fetchOvertimes(0);
  };

  const goToOvertimePage = (pageNumber) => {
    if (loading) return;

    const safePage = Math.max(
      0,
      Math.min(pageNumber, Math.max(overtimeTotalPages - 1, 0))
    );

    if (safePage === overtimePage) return;
    setOvertimePage(safePage);
    fetchOvertimes(safePage);
  };

  const goToPreviousOvertimePage = () => goToOvertimePage(overtimePage - 1);
  const goToNextOvertimePage = () => goToOvertimePage(overtimePage + 1);

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
    setOvertimePage(0);
    setQuery('');
    setSearchFilters({
      employeeName: '',
      category: '',
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

  const handleIndividualCheckboxChange = (overtimeId, isChecked) => {
    const newSelectedIds = new Set(selectedOvertimeIds);
    if (isChecked) {
      newSelectedIds.add(overtimeId);
    } else {
      newSelectedIds.delete(overtimeId);
    }
    setSelectedOvertimeIds(newSelectedIds);
    
    const allFilteredIds = new Set(filteredOvertimes.map(o => o.id));
    const allSelected = allFilteredIds.size > 0 && 
                       newSelectedIds.size === allFilteredIds.size;
    setIsAllSelected(allSelected);
  };

  const handleHeaderCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setIsAllSelected(isChecked);
    
    if (isChecked) {
      const allIds = new Set(filteredOvertimes.map(o => o.id));
      setSelectedOvertimeIds(allIds);
    } else {
      setSelectedOvertimeIds(new Set());
    }
  };

  const toggleMultiplierForSelected = async (newValue) => {
    const checkedOvertimeIds = Array.from(selectedOvertimeIds);

    if (checkedOvertimeIds.length === 0) {
      alert("Please select at least one overtime record");
      return;
    }

    if (!await window.appConfirm(`Are you sure you want to set Multiplier Applied to Hours to ${newValue ? 'ON (true)' : 'OFF (false)'} for ${checkedOvertimeIds.length} selected record(s)?`)) {
      return;
    }

    setIsTogglingMultiplier(true);
    
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/overtime/batch/toggle-multiplier`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ids: checkedOvertimeIds,
          multiplierAppliedToHours: newValue 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      alert(result.message);
      
      fetchOvertimes(overtimePage);
      setSelectedOvertimeIds(new Set());
      setIsAllSelected(false);
      
    } catch (error) {
      console.error("Toggle multiplier error:", error);
      alert(error.message || "An unexpected error occurred");
    } finally {
      setIsTogglingMultiplier(false);
    }
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

        const rawHours = (endTotal - startTotal) / 60;

        if (settings.enableTimeAndHalfAfter8Hours && rawHours > 8) {
          multiplier = settings.timeAndHalfMultiplier;
        }

        let finalHours;
        let notes;

        if (multiplierAppliedToHours) {
          finalHours = Number((rawHours * multiplier).toFixed(2));
          notes = `Multiplier ${multiplier}x applied to hours: ${rawHours.toFixed(2)} hrs → ${finalHours} hrs (Toggle ON)`;
        } else {
          finalHours = Number(rawHours.toFixed(2));
          notes = `Multiplier ${multiplier}x applied to rate (Toggle OFF) - Hours: ${finalHours}`;
        }

        const overtimePay = multiplierAppliedToHours
          ? (finalHours * employeeRate).toFixed(2)
          : (rawHours * (employeeRate * multiplier)).toFixed(2);

        const overtimeData = {
          employeeId: employee.id,
          date: newOvertime.date,
          startTime: formatTimeToHHMMSS(newOvertime.startTime),
          endTime: formatTimeToHHMMSS(newOvertime.endTime),
          status: 'Pending',
          baseHourlyRate: employeeRate,
          overtimeMultiplier: multiplier,
          overtimeHours: finalHours,
          rawOvertimeHours: Number(rawHours.toFixed(2)),
          calculatedOvertimePay: Number(overtimePay),
          multiplierAppliedToHours: multiplierAppliedToHours,
          notes: notes
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

      resetForm();
      setSelectAllEmployees(false);
      setIsCreateMenuOpen(false);
      fetchEmployees();
      fetchOvertimes(overtimePage);

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
        const formatTime = (t) => t.length === 5 ? t + ":00" : t;

        const finalHours = Number(newOvertime.overtimeHours);
        const rawHours = Number(newOvertime.rawOvertimeHours);
        const multiplier = newOvertime.overtimeMultiplier;

        let notes;

        if (multiplierAppliedToHours) {
          notes = `Multiplier ${multiplier}x applied to hours: ${rawHours.toFixed(2)} hrs → ${finalHours.toFixed(2)} hrs (Toggle ON)`;
        } else {
          notes = `Multiplier ${multiplier}x applied to rate (Toggle OFF) - Hours: ${finalHours.toFixed(2)}`;
        }

        const overtimeData = {
          employeeId: newOvertime.employee.id,
          date: newOvertime.date,
          startTime: formatTime(newOvertime.startTime),
          endTime: formatTime(newOvertime.endTime),
          status: 'Pending',
          baseHourlyRate: employeeRate,
          calculatedOvertimePay: Number(newOvertime.totalOvertimePay),
          overtimeHours: finalHours,
          rawOvertimeHours: rawHours,
          multiplierAppliedToHours: multiplierAppliedToHours,
          notes: notes,
          ...(newOvertime.overtimeMultiplier != null && {
            overtimeMultiplier: Number(newOvertime.overtimeMultiplier)
          })
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
        resetForm();
        setError('');
        setIsCreateMenuOpen(false);
        fetchEmployees();

      } catch (err) {
        console.error('Error creating overtime:', err);
        setError(err.message);
      }
    }
  };

  const fetchEligibleEmployeesForBulk = async (date) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/overtime/bulk/eligible-employees?date=${date}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEligibleEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching eligible employees:', error);
    }
  };

  const createBulkOvertime = async () => {
    if (!bulkDate || !bulkStartTime || !bulkEndTime) {
      setError('Please fill out all required fields.');
      return;
    }

    if (bulkOvertimeItems.length === 0) {
      setError('Please select at least one employee.');
      return;
    }

    setLoading(true);
    
    try {
      const formatTime = (t) => t.length === 5 ? t + ":00" : t;
      
      const bulkRequest = {
        overtimes: bulkOvertimeItems.map(item => ({
          employeeId: item.employeeId,
          date: bulkDate,
          startTime: formatTime(bulkStartTime),
          endTime: formatTime(bulkEndTime),
          overtimeMultiplier: effectiveMultiplier,
          multiplierAppliedToHours: multiplierAppliedToHours,
        })),
        skipDuplicates: skipDuplicates
      };

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/overtime/bulk/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bulkRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      alert(result.message);
      
      setIsBulkCreateMenuOpen(false);
      setBulkOvertimeItems([]);
      fetchOvertimes(overtimePage);
      
    } catch (error) {
      console.error('Bulk creation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setBulkOvertimeItems(prev => {
      const exists = prev.some(item => item.employeeId === employeeId);
      if (exists) {
        return prev.filter(item => item.employeeId !== employeeId);
      } else {
        const employee = eligibleEmployees.find(e => e.id === employeeId);
        return [...prev, {
          employeeId: employeeId,
          employeeName: employee.name
        }];
      }
    });
  };

  const selectAllEmployeesForBulk = () => {
    setBulkOvertimeItems(
      eligibleEmployees.map(emp => ({
        employeeId: emp.id,
        employeeName: emp.name
      }))
    );
  };

  const resetForm = () => {
    setNewOvertime({
      employee: { id: '' },
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      status: 'Pending',
      overtimeHours: 0,
      rawOvertimeHours: 0,
      totalOvertimePay: 0,
      overtimeMultiplier: null
    });
    setMultiplierAppliedToHours(false);
  };

const normalizeEmployee = (item) => {
  // If item already has an employee object with proper category
  if (item.employee) {
    // Handle the case where employee.category is a Category object
    let categoryName = 'General';
    if (item.employee.category) {
      if (typeof item.employee.category === 'object') {
        categoryName = item.employee.category.name || 'General';
      } else if (typeof item.employee.category === 'string') {
        categoryName = item.employee.category;
      }
    } else if (item.employee.categoryName) {
      categoryName = item.employee.categoryName;
    }
    
    // Also check if categoryId exists and we need to map it
    if (categoryName === 'General' && item.employee.categoryId && settings.categories && settings.categories.length > 0) {
      const categoryObj = settings.categories.find(cat => cat.id === item.employee.categoryId);
      if (categoryObj) {
        categoryName = categoryObj.name;
      }
    }
    
    return {
      ...item.employee,
      id: item.employee.id,
      firstName: item.employee.firstName,
      lastName: item.employee.lastName,
      employeeId: item.employee.employeeId,
      minimumRate: item.employee.minimumRate,
      category: categoryName
    };
  }
  
  // If employee data is flattened in the overtime object
  const name = item.employeeName || '';
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  
  let employeeId = item.employeeId || item.employee?.employeeId || null;
  if (employeeId !== null && employeeId !== undefined) {
    employeeId = String(employeeId);
  }
  
  // Get category from multiple possible sources
  let category = 'General';
  
  // Check all possible category sources
  if (item.category) {
    category = item.category;
  } else if (item.employeeCategory) {
    category = item.employeeCategory;
  } else if (item.employee?.category) {
    if (typeof item.employee.category === 'object') {
      category = item.employee.category.name || 'General';
    } else {
      category = item.employee.category;
    }
  } else if (item.employee?.categoryId && settings.categories && settings.categories.length > 0) {
    const categoryObj = settings.categories.find(cat => cat.id === item.employee.categoryId);
    if (categoryObj) {
      category = categoryObj.name;
    }
  } else if (item.categoryId && settings.categories && settings.categories.length > 0) {
    const categoryObj = settings.categories.find(cat => cat.id === item.categoryId);
    if (categoryObj) {
      category = categoryObj.name;
    }
  } else if (item.employee?.categoryName) {
    category = item.employee.categoryName;
  }
  
  return {
    id: item.employeeId ?? item.employee?.id ?? null,
    firstName,
    lastName,
    employeeId: employeeId,
    minimumRate: item.minimumRate ?? item.employee?.minimumRate ?? settings.hourlyRate,
    category: category
  };
};
  const getDefaultOvertimeMultiplier = () => {
    const m = settings?.defaultOvertimeMultiplier;
    const n = Number(m);
    return Number.isFinite(n) && n > 0 ? n : 1.5;
  };

  const effectiveMultiplier = Number(
    newOvertime.overtimeMultiplier ?? getDefaultOvertimeMultiplier()
  );

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Validation failed");
      }

      alert(result.message);
      fetchOvertimes(overtimePage);
    } catch (error) {
      console.error("Validation Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const rejectOvertime = async (overtimeId) => {
    setIsValidating(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/overtime/reject`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ overtimeIds: [overtimeId] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Rejection failed");
      }

      alert(result.message);
      fetchOvertimes(overtimePage);
    } catch (error) {
      console.error("Rejection Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const validateSelectedOvertimes = async () => {
    const checkedOvertimeIds = Array.from(selectedOvertimeIds);

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Validation failed");
      }

      alert(`Successfully validated ${result.data.length} overtime records!`);
      fetchOvertimes(overtimePage);
      setSelectedOvertimeIds(new Set());
      setIsAllSelected(false);
    } catch (error) {
      console.error("Validation error:", error);
      alert(error.message || "An unexpected error occurred");
    } finally {
      setIsValidating(false);
    }
  };

  const rejectSelectedOvertimes = async () => {
    const checkedOvertimeIds = Array.from(selectedOvertimeIds);

    if (checkedOvertimeIds.length === 0) {
      alert("Please select at least one overtime record");
      return;
    }

    setIsValidating(true);
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/overtime/reject`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ overtimeIds: checkedOvertimeIds })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Rejection failed");
      }

      alert(`Successfully rejected ${result.data.length} overtime records!`);
      fetchOvertimes(overtimePage);
      setSelectedOvertimeIds(new Set());
      setIsAllSelected(false);
    } catch (error) {
      console.error("Rejection error:", error);
      alert(error.message || "An unexpected error occurred");
    } finally {
      setIsValidating(false);
    }
  };

  const getEmployeeRate = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.minimumRate || settings.hourlyRate;
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={searchFilters.category}
                  onChange={handleSearchInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {settings.categories && settings.categories.map((category) => (
                    <option key={category.id || category.name} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
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

  const getFilteredOvertimes = () => {
    switch (overtimeFilter) {
      case 'approved':
        return filteredOvertimes.filter(o => o.status === 'Approved');
      case 'pending':
        return filteredOvertimes.filter(o => o.status === 'Pending');
      case 'rejected':
        return filteredOvertimes.filter(o => o.status === 'Rejected');
      default:
        return filteredOvertimes;
    }
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

        <main className="flex-1 mx-auto px-4 md:px-6 py-6">
              <Header
  toggleSidebar={toggleSidebar} 
  user={user} 
  onLogout={handleLogout} 
/>


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

              <button
                onClick={() => {
                  setIsBulkCreateMenuOpen(true);
                  fetchEligibleEmployeesForBulk(newOvertime.date);
                }}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Bulk Create
              </button>
            </div>
          </section>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOvertimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg ${overtimeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              All
            </button>
            <button
              onClick={() => setOvertimeFilter('approved')}
              className={`px-3 py-1.5 rounded-lg ${overtimeFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Approved Only
            </button>
            <button
              onClick={() => setOvertimeFilter('pending')}
              className={`px-3 py-1.5 rounded-lg ${overtimeFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setOvertimeFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg ${overtimeFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
            >
              Rejected
            </button>
          </div>

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
                disabled={selectedOvertimeIds.size === 0 || isValidating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                  selectedOvertimeIds.size > 0 && !isValidating
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Validate Selected ({selectedOvertimeIds.size})
              </button>
              
              <button
                onClick={rejectSelectedOvertimes}
                disabled={selectedOvertimeIds.size === 0 || isValidating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                  selectedOvertimeIds.size > 0 && !isValidating
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject Selected ({selectedOvertimeIds.size})
              </button>
              
              <button
                onClick={() => toggleMultiplierForSelected(true)}
                disabled={selectedOvertimeIds.size === 0 || isTogglingMultiplier}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                  selectedOvertimeIds.size > 0 && !isTogglingMultiplier
                    ? "bg-purple-600 hover:bg-purple-700 text-white" 
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Set Multiplier ON (Hours)
              </button>
              
              <button
                onClick={() => toggleMultiplierForSelected(false)}
                disabled={selectedOvertimeIds.size === 0 || isTogglingMultiplier}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                  selectedOvertimeIds.size > 0 && !isTogglingMultiplier
                    ? "bg-gray-600 hover:bg-gray-700 text-white" 
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Set Multiplier OFF (Rate)
              </button>

              {/* Add this button next to the Reject button */}
<button
  onClick={bulkDeleteOvertimes}
  disabled={selectedOvertimeIds.size === 0 || isDeleting}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
    selectedOvertimeIds.size > 0 && !isDeleting
      ? "bg-red-600 hover:bg-red-700 text-white" 
      : "bg-gray-200 text-gray-500 cursor-not-allowed"
  }`}
>
  <TrashIcon className="h-4 w-4" />
  Delete Selected ({selectedOvertimeIds.size})
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours (Final)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raw Hours</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Multiplier Applied</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">
                        <div className="flex justify-center items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading overtime records...
                        </div>
                      </td>
                    </tr>
                  ) : getFilteredOvertimes().length > 0 ? (
                    getFilteredOvertimes().map((overtime) => {
                      const employee = overtime.employee || {};
                      const employeeFirstName = employee.firstName || 'Unknown';
                      const employeeLastName = employee.lastName || 'Employee';
                      const employeeId = employee.employeeId || 'N/A';
                      const employeeCategory =
                        typeof employee.category === 'object'
                          ? employee.category?.name || employee.categoryName || 'General'
                          : employee.category || employee.categoryName || 'General';
                      
                      return (
                        <tr key={overtime.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input 
                              type="checkbox" 
                              id={`checkbox-${overtime.id}`}
                              checked={selectedOvertimeIds.has(overtime.id)}
                              onChange={(e) => handleIndividualCheckboxChange(overtime.id, e.target.checked)}
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
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {employeeCategory}
                            </span>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="text-gray-500">
                              {overtime.rawOvertimeHours ? parseFloat(overtime.rawOvertimeHours).toFixed(1) : '0.0'} hrs
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              overtime.multiplierAppliedToHours 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {overtime.multiplierAppliedToHours ? 'ON (Hours)' : 'OFF (Rate)'}
                              <span className="ml-1 text-xs opacity-75">
                                ({overtime.multiplierAppliedToHours ? '1' : '0'})
                              </span>
                            </span>
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
                                disabled={isValidating || overtime.status === 'Approved' || overtime.status === 'Rejected'}
                                className={`px-3 py-1 rounded-md text-sm ${
                                  isValidating || overtime.status === 'Approved' || overtime.status === 'Rejected'
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                {overtime.status === 'Approved' ? '✓ Approved' : 'Validate'}
                              </button>
                              
                              <button
                                onClick={() => rejectOvertime(overtime.id)}
                                disabled={isValidating || overtime.status === 'Rejected' || overtime.status === 'Approved'}
                                className={`px-3 py-1 rounded-md text-sm ${
                                  isValidating || overtime.status === 'Rejected' || overtime.status === 'Approved'
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                              >
                                {overtime.status === 'Rejected' ? '✗ Rejected' : 'Reject'}
                              </button>

                           <button
  onClick={() => {
    setOvertimeToDelete(overtime);
    setShowDeleteConfirm(true);
  }}
  disabled={isDeleting}
  className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
>
  <TrashIcon className="w-4 h-4 mr-1" />
  Delete
</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="px-6 py-8 text-center">
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

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                Page <span className="font-semibold">{overtimeTotalPages === 0 ? 0 : overtimePage + 1}</span>{' '}
                of <span className="font-semibold">{overtimeTotalPages}</span>
                <span className="ml-2">({overtimeTotalRecords} overtime records)</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={overtimePageSize}
                  onChange={(event) => {
                    setOvertimePageSize(Number(event.target.value));
                    setOvertimePage(0);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value={200}>200 rows</option>
                  <option value={500}>500 rows</option>
                </select>

                <button
                  type="button"
                  onClick={goToPreviousOvertimePage}
                  disabled={loading || overtimePage <= 0}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={goToNextOvertimePage}
                  disabled={
                    loading ||
                    overtimeTotalPages === 0 ||
                    overtimePage >= overtimeTotalPages - 1
                  }
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
{/* Delete Confirmation Modal for Overtime */}
{showDeleteConfirm && overtimeToDelete && (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)}></div>
    <div className="relative bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Delete Overtime Record</h3>
        <button
          onClick={() => setShowDeleteConfirm(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-6">
        <p className="text-gray-700 mb-2">
          Are you sure you want to delete this overtime record?
        </p>
        <div className="p-4 bg-gray-50 rounded-lg mt-3">
          <p className="text-sm font-medium text-gray-900">
            {overtimeToDelete.employee?.firstName} {overtimeToDelete.employee?.lastName}
          </p>
          <p className="text-sm text-gray-600">
            Date: {overtimeToDelete.date ? new Date(overtimeToDelete.date).toLocaleDateString() : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">
            Hours: {overtimeToDelete.overtimeHours?.toFixed(1) || '0'} hrs | 
            Amount: {formatCurrency(overtimeToDelete.calculatedOvertimePay || 0)}
          </p>
        </div>
        <p className="text-red-600 text-sm mt-3">
          ⚠️ This action cannot be undone.
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={() => setShowDeleteConfirm(false)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => deleteOvertime(overtimeToDelete.id)}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
)}
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
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Overtime Multiplier Application:
                  </label>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${!multiplierAppliedToHours ? 'text-blue-600' : 'text-gray-500'}`}>
                      OFF (Apply to Rate) - 0
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => setMultiplierAppliedToHours(!multiplierAppliedToHours)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        multiplierAppliedToHours ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          multiplierAppliedToHours ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    
                    <span className={`text-sm font-medium ${multiplierAppliedToHours ? 'text-blue-600' : 'text-gray-500'}`}>
                      ON (Apply to Hours) - 1
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {multiplierAppliedToHours 
                      ? 'ON (1): Hours are multiplied. The adjusted hours will be stored in database.'
                      : 'OFF (0): Raw hours are stored in database, rate is multiplied.'}
                  </p>
                </div>

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
                          {employee.firstName} {employee.lastName} ({employee.category || 'General'}) - {formatCurrency(employee.minimumRate || settings.hourlyRate)}/hr
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {newOvertime.employee.id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-700">
                      <strong>Base Rate:</strong> {formatCurrency(getEmployeeRate(newOvertime.employee.id))}/hr × {newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier}x 
                      {!multiplierAppliedToHours ? (
                        <span className="block mt-1">
                          <strong>New Rate:</strong> {formatCurrency(getEmployeeRate(newOvertime.employee.id) * (newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier))}/hr
                        </span>
                      ) : (
                        <span className="block mt-1">
                          <strong>Rate stays:</strong> {formatCurrency(getEmployeeRate(newOvertime.employee.id))}/hr
                        </span>
                      )}
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raw Hours Worked
                    </label>
                    <input
                      type="text"
                      value={newOvertime.rawOvertimeHours ? newOvertime.rawOvertimeHours.toFixed(2) : ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Raw hours from time punch</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center">
                        Final Hours (Stored)
                        {multiplierAppliedToHours && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                            ×{newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier || 1.5}
                          </span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={newOvertime.overtimeHours ? newOvertime.overtimeHours.toFixed(2) : ''}
                      readOnly
                      className={`w-full px-4 py-2 border-2 rounded-lg shadow-sm font-bold text-lg ${
                        multiplierAppliedToHours 
                          ? 'border-yellow-400 bg-yellow-50' 
                          : 'border-gray-300 bg-gray-100'
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {multiplierAppliedToHours 
                        ? '✦ This value will be stored in database' 
                        : 'Raw hours stored in database'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier</label>
                    <input
                      type="text"
                      value={`${effectiveMultiplier}x`}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Overtime Pay (GHS)</label>
                    <input
                      type="text"
                      value={newOvertime.totalOvertimePay ? formatCurrency(newOvertime.totalOvertimePay) : ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 font-semibold text-green-600"
                    />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    Overtime Calculation - {multiplierAppliedToHours ? 'ON (Apply to Hours) - 1' : 'OFF (Apply to Rate) - 0'}
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    {multiplierAppliedToHours ? (
                      <>
                        <p><strong>Formula:</strong> (Raw Hours × Multiplier) = Final Hours × Base Rate</p>
                        <p><strong>Calculation:</strong> 
                          <span className="font-mono bg-green-100 px-2 py-1 rounded mx-1">
                            {newOvertime.rawOvertimeHours?.toFixed(2) || '0'} hrs × {newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier || 1.5}
                          </span>
                          = 
                          <span className="font-bold text-green-800 mx-1">
                            {newOvertime.overtimeHours?.toFixed(2) || '0'} hrs
                          </span>
                        </p>
                        <p><strong>Pay:</strong> {newOvertime.overtimeHours?.toFixed(2) || '0'} hrs × {formatCurrency(getEmployeeRate(newOvertime.employee.id) || settings.hourlyRate)} = 
                          <span className="font-bold text-green-800"> {formatCurrency(newOvertime.totalOvertimePay || 0)}</span>
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          ⓘ Database will store <span className="font-bold">{newOvertime.overtimeHours?.toFixed(2) || '0'}</span> hours (adjusted)
                        </p>
                      </>
                    ) : (
                      <>
                        <p><strong>Formula:</strong> (Base Rate × Multiplier) = New Rate × Raw Hours</p>
                        <p><strong>Calculation:</strong> 
                          {formatCurrency(getEmployeeRate(newOvertime.employee.id) || settings.hourlyRate)} × {newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier || 1.5}
                          = {formatCurrency((getEmployeeRate(newOvertime.employee.id) || settings.hourlyRate) * (newOvertime.overtimeMultiplier || settings.defaultOvertimeMultiplier || 1.5))} × {newOvertime.rawOvertimeHours?.toFixed(2) || '0'}
                        </p>
                        <p><strong>Pay:</strong> = 
                          <span className="font-bold text-green-800"> {formatCurrency(newOvertime.totalOvertimePay || 0)}</span>
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          ⓘ Database will store <span className="font-bold">{newOvertime.rawOvertimeHours?.toFixed(2) || '0'}</span> hours (raw)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={resetForm}
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

          {isBulkCreateMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Bulk Create Overtime</h2>
                  <button onClick={() => setIsBulkCreateMenuOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => {
                        setBulkDate(e.target.value);
                        fetchEligibleEmployeesForBulk(e.target.value);
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={bulkStartTime}
                      onChange={(e) => setBulkStartTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={bulkEndTime}
                      onChange={(e) => setBulkEndTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier Mode</label>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setMultiplierAppliedToHours(false)}
                        className={`px-3 py-1 rounded ${!multiplierAppliedToHours ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      >
                        OFF (Rate)
                      </button>
                      <button
                        onClick={() => setMultiplierAppliedToHours(true)}
                        className={`px-3 py-1 rounded ${multiplierAppliedToHours ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                      >
                        ON (Hours)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label className="text-sm text-gray-700">
                    Skip employees with existing overtime on this date
                  </label>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Select Employees ({eligibleEmployees.length} available)</h3>
                    <button
                      onClick={selectAllEmployeesForBulk}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                  </div>
                  
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {eligibleEmployees.map(emp => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={bulkOvertimeItems.some(item => item.employeeId === emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-sm text-gray-500">ID: {emp.employeeId} | Category: {emp.category || 'General'} | Rate: {formatCurrency(emp.rate)}/hr</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    Selected: {bulkOvertimeItems.length} employees
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsBulkCreateMenuOpen(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createBulkOvertime}
                    disabled={loading || bulkOvertimeItems.length === 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : `Create ${bulkOvertimeItems.length} Records`}
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
