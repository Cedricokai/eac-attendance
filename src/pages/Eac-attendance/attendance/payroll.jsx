import { useState, useEffect, useContext } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link, useLocation } from "react-router-dom";
import MainSidebar from "../mainSidebar";

function Payroll() {
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [newPeriod, setNewPeriod] = useState({ name: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [summary, setSummary] = useState(null);
  const { settings } = useContext(SettingsContext);
  const location = useLocation();
  
  // New state for TEMPORARY allowance management (not saved to employee profile)
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [temporaryAllowances, setTemporaryAllowances] = useState([
    { type: 'housingAllowance', amount: '', description: '', enabled: false },
    { type: 'tntAllowance', amount: '', description: '', enabled: false },
    { type: 'clothsAllowances', amount: '', description: '', enabled: false },
    { type: 'otherAllowances', amount: '', description: '', enabled: false }
  ]);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [noRecordsMessage, setNoRecordsMessage] = useState('');

  // Store temporary allowances separately (not in employee profile)
  const [payrollTemporaryAllowances, setPayrollTemporaryAllowances] = useState({});

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';


  // Filters
  const [filters, setFilters] = useState({
    grade: '',
    workType: '',
    category: ''
  });

  // Helper function to calculate working days between two dates (excluding weekends)
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count only weekdays (Monday to Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

  const getToken = () => localStorage.getItem('jwtToken');

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) { console.error(err.message); }
  };

  const filteredEmployees = employees.filter(emp => {
    return (
      (!filters.grade || (emp.grade && emp.grade.toLowerCase().includes(filters.grade.toLowerCase()))) &&
      (!filters.workType || (emp.workType && emp.workType.toLowerCase().includes(filters.workType.toLowerCase()))) &&
      (!filters.category || (emp.category && emp.category.toLowerCase().includes(filters.category.toLowerCase())))
    );
  });

  const fetchPayrollPeriods = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/periods`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch payroll periods');
      const data = await res.json();
      setPayrollPeriods(data);
    } catch (err) { setError(err.message); }
  };

  const isHoliday = (date) => {
  if (!date) return false;
  const dateStr = new Date(date).toISOString().split('T')[0];
  return settings.holidays?.some(holiday => {
    if (holiday.recurring) {
      const holidayDate = new Date(holiday.date);
      const checkDate = new Date(date);
      return holidayDate.getMonth() === checkDate.getMonth() && 
             holidayDate.getDate() === checkDate.getDate();
    }
    return holiday.date === dateStr;
  }) || false;
};


// Check if date is weekend
const isWeekend = (date) => {
  if (!date) return false;
  const day = new Date(date).getDay();
  return settings.weekendDays?.includes(day) || false;
};

// Get multiplier for specific date
const getDateMultiplier = (date) => {
  if (isHoliday(date)) {
    // Find the specific holiday to get its multiplier
    const dateStr = new Date(date).toISOString().split('T')[0];
    const holiday = settings.holidays?.find(h => {
      if (h.recurring) {
        const holidayDate = new Date(h.date);
        const checkDate = new Date(date);
        return holidayDate.getMonth() === checkDate.getMonth() && 
               holidayDate.getDate() === checkDate.getDate();
      }
      return h.date === dateStr;
    });
    return holiday?.payMultiplier || settings.holidayRate || 1.5;
  } else if (isWeekend(date)) {
    return settings.weekendRate || 1.25;
  }
  return 1; // Regular day
};

const fetchPayrollRecords = async (periodId) => {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/api/payroll?periodId=${periodId}`, { // ✅ Correct endpoint
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
      
      if (!res.ok) {
        if (res.status === 404) {
          const errorData = await res.json();
          setNoRecordsMessage(errorData.message || 'No payroll records found for this period');
          setPayrollRecords([]);
        } else {
          throw new Error('Failed to fetch payroll records');
        }
      } else {
        const data = await res.json();
        
        // Enhance payroll records with temporary allowances
        const enhancedRecords = data.map(record => {
          const employeeId = record.employee?.id || record.employeeId;
          const tempAllowances = payrollTemporaryAllowances[employeeId] || {};
          
          return {
            ...record,
            // Use temporary allowances if available, otherwise use profile allowances
            rentAllowance: tempAllowances.housingAllowance || record.rentAllowance || 0,
            transportAllowance: tempAllowances.tntAllowance || record.transportAllowance || 0,
            clothingAllowance: tempAllowances.clothsAllowances || record.clothingAllowance || 0,
            otherAllowance: tempAllowances.otherAllowances || record.otherAllowance || 0,
            // Flag to indicate if temporary allowances are being used
            usesTemporaryAllowances: !!payrollTemporaryAllowances[employeeId]
          };
        });
        
        setPayrollRecords(enhancedRecords);
        if (data.length === 0) {
          setNoRecordsMessage('No payroll records found for this period');
        }
      }
    } catch (err) { 
      setError(err.message); 
    }
    finally { setLoading(false); }
  };

 const fetchPayrollSummary = async () => {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/api/payroll/summary`, { // ✅ Correct endpoint
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
  
      if (!res.ok) throw new Error('Failed to fetch payroll summary');
      const data = await res.json();
      setSummary(data);
    } catch (err) { console.error(err); }
  };

  const createPayrollPeriod = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/periods`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newPeriod)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create payroll period');
      }
      const data = await res.json();
      setPayrollPeriods([...payrollPeriods, data]);
      setNewPeriod({ name: '', startDate: '', endDate: '' });
      setSuccess('Payroll period created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 5000); }
  };

  
const debugEmployee = async (employeeId) => {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/api/debug/employee/${employeeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Employee Debug Data:', data);
  } catch (err) {
    console.error('Debug error:', err);
  }
};

useEffect(() => {
  console.log('Current settings:', {
    hourlyRate: settings.hourlyRate,
    overtimeRate: settings.overtimeHourlyRate,
    weekendRate: settings.weekendRate,
    holidayRate: settings.holidayRate,
    weekendDays: settings.weekendDays,
    holidays: settings.holidays
  });
}, [settings]);

// Call this for problematic employees
useEffect(() => {
  payrollRecords.forEach(record => {
    if (record.basicSalary === 0 || record.basicSalary > 5000) {
      const employeeId = record.employee?.id || record.employeeId;
      console.log('Checking employee:', employeeId);
      debugEmployee(employeeId);
    }
  });
}, [payrollRecords]);

 // In Payroll.jsx - fix the generatePayroll function
const generatePayroll = async (periodId) => {
  try {
    const token = getToken();
    
    const payload = {
      periodId,
      temporaryAllowances: payrollTemporaryAllowances,
      settings: {
        hourlyRate: settings.hourlyRate || 15.00,
        overtimeHourlyRate: settings.overtimeHourlyRate || 22.50,
        weekendRate: settings.weekendRate || 1.25,
        holidayRate: settings.holidayRate || 1.5,
        weekendDays: settings.weekendDays || [0, 6],
        holidays: settings.holidays || [],
        standardWorkHours: settings.standardWorkHours || 8
      }
    };
    
    console.log('Sending payroll generation payload:', payload);

    const res = await fetch(`${API_BASE_URL}/api/payroll/generate`, { 
      method: 'POST', 
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) { 
      const errData = await res.json(); 
      throw new Error(errData.error || 'Failed to generate payroll'); 
    }
    
    setSuccess('Payroll generated successfully'); 
    setTimeout(() => setSuccess(''), 3000);
    fetchPayrollRecords(periodId); 
    fetchPayrollSummary();
  } catch (err) { 
    setError(err.message); 
    setTimeout(() => setError(''), 5000); 
  }
};

const calculateLeaveDaysPerEmployee = (leaves, periodStart, periodEnd) => {
  const leaveDaysByEmployee = {};
  
  leaves.forEach(leave => {
    if (leave.status === 'Approved' && leave.employee?.id) {
      const employeeId = leave.employee.id;
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const periodStartDate = new Date(periodStart);
      const periodEndDate = new Date(periodEnd);
      
      // Calculate overlapping days
      const overlapStart = leaveStart < periodStartDate ? periodStartDate : leaveStart;
      const overlapEnd = leaveEnd > periodEndDate ? periodEndDate : leaveEnd;
      
      if (overlapStart <= overlapEnd) {
        // Calculate working days in the overlap period
        const overlapDays = calculateWorkingDaysInRange(overlapStart, overlapEnd);
        
        if (!leaveDaysByEmployee[employeeId]) {
          leaveDaysByEmployee[employeeId] = 0;
        }
        leaveDaysByEmployee[employeeId] += overlapDays;
      }
    }
  });
  
  return leaveDaysByEmployee;
};

const calculateWorkingDaysInRange = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count only weekdays (Monday to Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// Helper function to check if leave overlaps with payroll period
const isLeaveInPeriod = (leave, periodStart, periodEnd) => {
  const leaveStart = new Date(leave.startDate);
  const leaveEnd = new Date(leave.endDate);
  const payrollStart = new Date(periodStart);
  const payrollEnd = new Date(periodEnd);
  
  return leaveStart <= payrollEnd && leaveEnd >= payrollStart;
};
  const processPayroll = async (periodId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/process?periodId=${periodId}`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } 
      });
      if (!res.ok) { 
        const errData = await res.json(); 
        throw new Error(errData.error || 'Failed to process payroll'); 
      }
      setSuccess('Payroll processed successfully'); 
      setTimeout(() => setSuccess(''), 3000);
      fetchPayrollRecords(periodId); 
      fetchPayrollSummary();
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 5000); }
  };

  // NEW: Add temporary allowances (NOT saved to employee profile)
  const addTemporaryAllowances = async () => {
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Filter only enabled allowances with valid amounts
    const validAllowances = temporaryAllowances.filter(
      allowance => allowance.enabled && allowance.amount && !isNaN(parseFloat(allowance.amount))
    );

    if (validAllowances.length === 0) {
      setError('Please add at least one allowance with a valid amount');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      // Store temporary allowances locally (not in database)
      const newTemporaryAllowances = { ...payrollTemporaryAllowances };
      
      selectedEmployees.forEach(employeeId => {
        if (!newTemporaryAllowances[employeeId]) {
          newTemporaryAllowances[employeeId] = {};
        }
        
        validAllowances.forEach(allowance => {
          newTemporaryAllowances[employeeId][allowance.type] = parseFloat(allowance.amount);
        });
      });
      
      setPayrollTemporaryAllowances(newTemporaryAllowances);
      
      setSuccess(`Temporary allowances added to ${selectedEmployees.length} employees for this payroll period`);
      setTimeout(() => setSuccess(''), 3000);
      setShowAllowanceModal(false);
      
      // Reset temporary allowances form
      setTemporaryAllowances([
        { type: 'housingAllowance', amount: '', description: '', enabled: false },
        { type: 'tntAllowance', amount: '', description: '', enabled: false },
        { type: 'clothsAllowances', amount: '', description: '', enabled: false },
        { type: 'otherAllowances', amount: '', description: '', enabled: false }
      ]);
      setSelectedEmployees([]);
      
      // Refresh payroll data if a period is selected
      if (selectedPeriod) {
        fetchPayrollRecords(selectedPeriod);
      }
    } catch (err) { 
      setError(err.message); 
      setTimeout(() => setError(''), 5000); 
    }
  };

  // NEW: Remove temporary allowances for an employee
  const removeTemporaryAllowances = (employeeId) => {
    const newTemporaryAllowances = { ...payrollTemporaryAllowances };
    delete newTemporaryAllowances[employeeId];
    setPayrollTemporaryAllowances(newTemporaryAllowances);
    
    if (selectedPeriod) {
      fetchPayrollRecords(selectedPeriod);
    }
    
    setSuccess('Temporary allowances removed');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Helper function to safely display numbers
const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toFixed(decimals);
};

// Enhanced total allowance calculation
const getTotalAllowance = (record) => {
  return (record.rentAllowance || 0) +
         (record.transportAllowance || 0) +
         (record.clothingAllowance || 0) +
         (record.otherAllowance || 0) +
         (record.overtimePay || 0);
};

// Helper to check if employee has data
const hasEmployeeData = (record) => {
  return record && record.employee && record.employee.firstName;
};

  const toggleEmployeeSelection = (employeeId) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
  };

  const toggleAllowance = (index) => {
    const newAllowances = [...temporaryAllowances];
    newAllowances[index].enabled = !newAllowances[index].enabled;
    setTemporaryAllowances(newAllowances);
  };

  const updateAllowance = (index, field, value) => {
    const newAllowances = [...temporaryAllowances];
    newAllowances[index][field] = value;
    setTemporaryAllowances(newAllowances);
  };

  const addNewAllowanceField = () => {
    setTemporaryAllowances([
      ...temporaryAllowances,
      { type: 'otherAllowances', amount: '', description: '', enabled: true }
    ]);
  };

  const removeAllowance = (index) => {
    if (temporaryAllowances.length <= 1) return;
    const newAllowances = [...temporaryAllowances];
    newAllowances.splice(index, 1);
    setTemporaryAllowances(newAllowances);
  };

  useEffect(() => { 
    fetchPayrollPeriods(); 
    fetchPayrollSummary();
    fetchEmployees();
  }, []);
  
  useEffect(() => { 
    if (selectedPeriod) fetchPayrollRecords(selectedPeriod); 
  }, [selectedPeriod, payrollTemporaryAllowances]); // Re-fetch when temporary allowances change

  const formatCurrency = (amount) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount || 0);

  const getAllowanceLabel = (type) => {
    const labels = {
      housingAllowance: "Housing Allowance",
      tntAllowance: "Transport & Travel Allowance",
      clothsAllowances: "Clothing Allowance",
      otherAllowances: "Other Allowance"
    };
    return labels[type] || type;
  };

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div className="fixed inset-y-0 left-0 w-64 bg-white z-30"><MainSidebar /></div>
      <div className="flex-1 ml-64">
        <main className="flex-1 max-w-full px-2 md:px-4 py-6">

          {/* Page Header */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
              <p className="text-gray-600">Manage employee payroll and compensation</p>
            </div>
            <button 
              onClick={() => setShowAllowanceModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Temporary Allowances
            </button>

            <Link to="/payslip" className="w-[180px]">
              <div className={`h-12 flex items-center justify-center transition-colors duration-200 ${
                location.pathname === "/payslip" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
              }`}>
                <span className="font-medium">Payslip Generator</span>
              </div>
            </Link>
          </section>

          {/* Status Messages */}
          {error && <div className="bg-red-100 text-red-700 px-4 py-3 mt-4 rounded-lg">{error}</div>}
          {success && <div className="bg-green-100 text-green-700 px-4 py-3 mt-4 rounded-lg">{success}</div>}

          {/* Temporary Allowances Summary */}
          {Object.keys(payrollTemporaryAllowances).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 mx-2 md:mx-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-yellow-800">
                    Temporary allowances applied to {Object.keys(payrollTemporaryAllowances).length} employee(s)
                  </span>
                </div>
                <button 
                  onClick={() => setPayrollTemporaryAllowances({})}
                  className="text-yellow-700 hover:text-yellow-900 text-sm font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Add this near your other action buttons */}
<div className="flex gap-2 mt-4">
  {selectedPeriod && (
    <>
      <button 
        onClick={() => fetchPayrollRecords(selectedPeriod)}
        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        Refresh Data
      </button>
      <button 
        onClick={() => fetchPayrollSummary()}
        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
        </svg>
        Update Summary
      </button>
    </>
  )}
</div>

         {/* Payroll Summary */}
{summary && (
  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-6 mx-2 md:mx-4">
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm text-gray-500">Total Net Pay</div>
      <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalNetAmount)}</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm text-gray-500">Total Tax</div>
      <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalTax)}</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm text-gray-500">Total SSNIT</div>
      <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalSsnit)}</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm text-gray-500">Employees</div>
      <div className="text-2xl font-bold text-purple-600">{summary.employeeCount}</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm text-gray-500">Total Leave Days</div>
      <div className="text-2xl font-bold text-orange-600">{summary.totalLeaveDays || 0}</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm text-gray-500">Employees on Leave</div>
      <div className="text-2xl font-bold text-indigo-600">{summary.employeesOnLeave || 0}</div>
    </div>
  </div>
)}
          {/* Create Payroll Period */}
          <div className="mt-6 mb-6 mx-2 md:mx-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Payroll Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                placeholder="Period Name" 
                value={newPeriod.name} 
                onChange={e => setNewPeriod({...newPeriod, name: e.target.value})} 
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="date" 
                value={newPeriod.startDate} 
                onChange={e => setNewPeriod({...newPeriod, startDate: e.target.value})} 
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="date" 
                value={newPeriod.endDate} 
                onChange={e => setNewPeriod({...newPeriod, endDate: e.target.value})} 
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={createPayrollPeriod} 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 mt-4 rounded-md"
            >
              Create Period
            </button>
          </div>

          {/* Payroll Periods Table */}
          <div className="overflow-x-auto mb-6 mx-2 md:mx-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full text-left text-sm text-gray-700 w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Start Date</th>
                  <th className="px-4 py-3 font-medium">End Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollPeriods.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 border-t border-gray-200">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.startDate}</td>
                    <td className="px-4 py-3">{p.endDate}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button 
                        onClick={() => setSelectedPeriod(p.id)} 
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => generatePayroll(p.id)} 
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Generate
                      </button>
                      <button 
                        onClick={() => processPayroll(p.id)} 
                        className="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

         {/* Payroll Records Table */}
{selectedPeriod && (
  <div className="overflow-x-auto mt-6 mx-2 md:mx-4 bg-white rounded-lg shadow-sm border border-gray-200">
    {loading ? (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    ) : (
      <>
        {noRecordsMessage ? (
          <div className="p-8 text-center">
            <div className="text-yellow-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">{noRecordsMessage}</h3>
            <p className="text-gray-600 mb-4">Please ensure attendance records are available for this period before generating payroll.</p>
            <button 
              onClick={() => generatePayroll(selectedPeriod)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
            >
              Generate Payroll
            </button>
          </div>
        ) : (
          <table className="min-w-full text-left text-sm text-gray-700 w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Total Days in Period</th>
                <th className="px-4 py-3 font-medium">Leave Days</th>
                    <th className="px-4 py-3 font-medium">Holiday Days</th>
    <th className="px-4 py-3 font-medium">Weekend Days</th>
    <th className="px-4 py-3 font-medium">Multiplier Impact</th>
                <th className="px-4 py-3 font-medium">Physical Working Days</th>
                <th className="px-4 py-3 font-medium">Total working days</th>
                <th className="px-4 py-3 font-medium">Total Hours</th>
                <th className="px-4 py-3 font-medium">Basic Salary</th>
                <th className="px-4 py-3 font-medium">Overtime Pay</th>
                <th className="px-4 py-3 font-medium">Housing Allowance</th>
                <th className="px-4 py-3 font-medium">TnT Allowance</th>
                <th className="px-4 py-3 font-medium">Clothing Allowance</th>
                <th className="px-4 py-3 font-medium">Other Allowances</th>
                <th className="px-4 py-3 font-medium">Total Allowances</th>
                <th className="px-4 py-3 font-medium">Gross Salary</th>
                <th className="px-4 py-3 font-medium">Employee SSNIT</th>
                <th className="px-4 py-3 font-medium">Employer SSNIT</th>
                <th className="px-4 py-3 font-medium">Total SSNIT</th>
                <th className="px-4 py-3 font-medium">Taxable Income</th>
                <th className="px-4 py-3 font-medium">Tax</th>
                <th className="px-4 py-3 font-medium">Net Salary</th>
                <th className="px-4 py-3 font-medium">Employer Cost</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrollRecords.map((r) => {
                const employeeId = r.employee?.id || r.employeeId;
                const hasTemporaryAllowances = payrollTemporaryAllowances[employeeId];
                const hasLeaveDays = r.leaveDays && r.leaveDays > 0;
                
                return (
                  <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {r.employee?.firstName} {r.employee?.lastName}
                        {hasTemporaryAllowances && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full" title="Temporary allowances applied">
                            Temp
                          </span>
                        )}
                        {hasLeaveDays && (
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full" title={`${r.leaveDays} leave days`}>
                            Leave
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.totalDaysInPeriod || 'N/A'}</td>
                    <td className={`px-4 py-3 ${hasLeaveDays ? 'bg-blue-50 font-medium text-blue-700' : ''}`}>
                      {r.leaveDays || 0}
                    </td>
<td className="px-4 py-3 text-center">
  {r.holidayDays > 0 ? (
    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
      {r.holidayDays} days
    </span>
  ) : (
    <span className="text-gray-400 text-xs">0 days</span>
  )}
</td>
      <td className="px-4 py-3 text-center">
        {r.weekendDays > 0 && (
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
            {r.weekendDays} days
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {r.multiplierBonus > 0 && (
          <span className="text-green-600 text-sm font-medium">
            +{formatCurrency(r.multiplierBonus)}
          </span>
        )}
      </td>
                    <td className="px-4 py-3">{r.workingDays}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
  {(r.leaveDays || 0) + (r.workingDays || 0)}
</td>
<td className="px-4 py-3 text-xs text-gray-500">
  Normal: {(r.totalHours - (r.leaveHours || 0))?.toFixed(2)} hrs<br/>
  Leave: {(r.leaveHours || 0)?.toFixed(2)} hrs
</td>
                    <td className="px-4 py-3">{formatCurrency(r.basicSalary)}</td>
                    <td className="px-4 py-3">{formatCurrency(r.overtimePay)}</td>
                    <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                      {formatCurrency(r.rentAllowance || 0)}
                    </td>
                    <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                      {formatCurrency(r.transportAllowance || 0)}
                    </td>
                    <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                      {formatCurrency(r.clothingAllowance || 0)}
                    </td>
                    <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                      {formatCurrency(r.otherAllowance || 0)}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {formatCurrency(getTotalAllowance(r))}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(r.grossSalary)}</td>
                    <td className="px-4 py-3">{formatCurrency(r.ssnitEmployee)}</td>
                    <td className="px-4 py-3">{formatCurrency(r.ssnitEmployer)}</td>
                    <td className="px-4 py-3">
                      {formatCurrency((r.ssnitEmployee || 0) + (r.ssnitEmployer || 0))}
                    </td>
                    <td className="px-4 py-3 font-medium text-orange-600">
                      {formatCurrency(r.taxableIncome || ((r.grossSalary || 0) - (r.ssnitEmployee || 0)))}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(r.payeTax)}</td>
                    <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(r.netSalary)}</td>
                    <td className="px-4 py-3 font-medium text-green-500">
                      {formatCurrency((r.grossSalary || 0) + (r.ssnitEmployer || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        r.status === 'Processed' ? 'bg-green-100 text-green-800' :
                        r.status === 'Generated' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {hasTemporaryAllowances && (
                        <button
                          onClick={() => removeTemporaryAllowances(employeeId)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Remove temporary allowances"
                        >
                          Remove Temp
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </>
    )}
  </div>
)}

          {/* Allowance Modal */}
          {showAllowanceModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Add Temporary Allowances</h2>
                  <button 
                    onClick={() => setShowAllowanceModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto pr-2">
                  {/* Important Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-blue-800">Temporary Allowances Notice</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          These allowances are temporary and will only apply to the current payroll period. 
                          They will not affect the employee's permanent profile data.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Allowance Details */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-800">Allowance Details</h3>
                      <button
                        onClick={addNewAllowanceField}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Another Allowance
                      </button>
                    </div>

                    {/* Grid layout for allowances */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {temporaryAllowances.map((allowance, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={allowance.enabled}
                                onChange={() => toggleAllowance(index)}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Allowance {index + 1}
                              </span>
                            </div>
                            {temporaryAllowances.length > 1 && (
                              <button
                                onClick={() => removeAllowance(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {allowance.enabled && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                  value={allowance.type}
                                  onChange={e => updateAllowance(index, 'type', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="housingAllowance">Housing Allowance</option>
                                  <option value="tntAllowance">Transport & Travel Allowance</option>
                                  <option value="clothsAllowances">Clothing Allowance</option>
                                  <option value="otherAllowances">Other Allowances</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
                                <input
                                  type="number"
                                  value={allowance.amount}
                                  onChange={e => updateAllowance(index, 'amount', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter amount"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <input
                                  type="text"
                                  value={allowance.description}
                                  onChange={e => updateAllowance(index, 'description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Description of allowance"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Employee Filters */}
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                      <input
                        type="text"
                        placeholder="Enter grade"
                        value={filters.grade}
                        onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                      <input
                        type="text"
                        placeholder="Enter work type"
                        value={filters.workType}
                        onChange={(e) => setFilters({ ...filters, workType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        placeholder="Enter category"
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Employee Selection */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-800">Select Employees</h3>
                      <button 
                        onClick={selectAllEmployees}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-md overflow-hidden max-h-60 overflow-y-auto">
                      {filteredEmployees.length > 0 ? (
                        <div>
                          {filteredEmployees.map(employee => (
                            <div key={employee.id} className="flex items-center p-3 border-b border-gray-200 hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={selectedEmployees.includes(employee.id)}
                                onChange={() => toggleEmployeeSelection(employee.id)}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="ml-3 text-gray-700">
                                {employee.firstName} {employee.lastName} - {employee.department || 'No Department'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">No employees found</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setShowAllowanceModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addTemporaryAllowances}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={selectedEmployees.length === 0 || !temporaryAllowances.some(a => a.enabled && a.amount)}
                  >
                    Add Temporary to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
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

export default Payroll;