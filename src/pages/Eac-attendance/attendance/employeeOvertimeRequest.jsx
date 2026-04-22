import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function EmployeeOvertimeRequest() {
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
    timeAndHalfMultiplier: 1.5
  });
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const createMenuRef = useRef(null);
  const [selectAllEmployees, setSelectAllEmployees] = useState(false);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [newOvertime, setNewOvertime] = useState({
    employee: { id: '' },
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    status: 'Pending',
    overtimeHours: 0,
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
      
      let multiplier = getDefaultOvertimeMultiplier();
      
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

  useEffect(() => {
    fetchSettings();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (settings?.defaultOvertimeMultiplier != null) {
      setNewOvertime(prev => ({
        ...prev,
        overtimeMultiplier: prev.overtimeMultiplier ?? Number(settings.defaultOvertimeMultiplier)
      }));
    }
  }, [settings?.defaultOvertimeMultiplier]);

  useEffect(() => {
    fetchEmployees();
  }, [newOvertime.date]);

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
          status: 'Pending',
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
        overtimeMultiplier: null
      });

      setSelectAllEmployees(false);
      setIsCreateMenuOpen(false);
      alert('Overtime requests submitted successfully!');

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
          status: 'Pending',
          baseHourlyRate: employeeRate,
          calculatedOvertimePay: Number(calculatedPay),
          overtimeHours: Number(newOvertime.overtimeHours),
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

        setNewOvertime({
          employee: { id: '' },
          date: new Date().toISOString().split('T')[0],
          startTime: '',
          endTime: '',
          status: 'Pending',
          overtimeHours: 0,
          totalOvertimePay: 0,
          overtimeMultiplier: null
        });
        setError('');
        setIsCreateMenuOpen(false);
        alert('Overtime request submitted successfully!');

      } catch (err) {
        console.error('Error creating overtime:', err);
        setError(err.message);
      }
    }
  };

  const getDefaultOvertimeMultiplier = () => {
    const m = settings?.defaultOvertimeMultiplier;
    const n = Number(m);
    return Number.isFinite(n) && n > 0 ? n : 1.5;
  };

  const effectiveMultiplier = Number(
    newOvertime.overtimeMultiplier ?? getDefaultOvertimeMultiplier()
  );

  const getEmployeeRate = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.minimumRate || settings.hourlyRate;
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-800">Overtime Request</h1>
            
            <div className="flex items-center gap-4">
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
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Request Overtime</h2>
            <p className="text-sm text-gray-600">Fill in the details below to submit an overtime request</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

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
                id="selectAllEmployees"
                checked={selectAllEmployees}
                onChange={(e) => setSelectAllEmployees(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="selectAllEmployees" className="text-sm font-medium text-gray-700">
                Apply to all available employees (no overtime on selected date)
              </label>
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
                  value={`${effectiveMultiplier}x`}
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
                    overtimeMultiplier: null
                  });
                  setSelectAllEmployees(false);
                  setError('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Clear
              </button>
              <button
                onClick={createOvertime}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Submit Overtime Request
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EmployeeOvertimeRequest;