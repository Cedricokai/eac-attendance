import { useState, useEffect, useRef, useContext } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainSidebar from "../mainSidebar";

function Overtime() {
  const [query, setQuery] = useState('');
  const { settings } = useContext(SettingsContext);
  const { overtimeHourlyRate } = settings;
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [overtimes, setOvertimes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const createMenuRef = useRef(null);
  const [selectAllEmployees, setSelectAllEmployees] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);

  const [newOvertime, setNewOvertime] = useState({
    employee: { id: '' },
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    status: 'Pending',
    overtimeHours: 0,
    totalOvertimePay: 0
  });

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Calculate overtime hours and pay when times change
  useEffect(() => {
    if (newOvertime.startTime && newOvertime.endTime) {
      const [startHours, startMinutes] = newOvertime.startTime.split(':').map(Number);
      const [endHours, endMinutes] = newOvertime.endTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      
      const diffHours = (endTotalMinutes - startTotalMinutes) / 60;
      
      if (diffHours > 0) {
        setNewOvertime(prev => ({
          ...prev,
          overtimeHours: diffHours.toFixed(2),
          totalOvertimePay: (diffHours * overtimeHourlyRate).toFixed(2)
        }));
      } else {
        setNewOvertime(prev => ({
          ...prev,
          overtimeHours: '',
          totalOvertimePay: ''
        }));
      }
    }
  }, [newOvertime.startTime, newOvertime.endTime, overtimeHourlyRate]);

  // Close create menu when clicking outside
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
    const { name, value } = e.target;

    if (name === "employeeId") {
      setNewOvertime(prev => ({
        ...prev,
        employee: {
          ...prev.employee,
          id: Number(value) || "",
        },
      }));
    } else {
      setNewOvertime(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Fetch employees and filter out those who already have overtime on the selected date
  const fetchEmployees = async () => {
    try {
      const token = getToken();
      // Fetch both employees and overtimes in parallel
      const [employeesResponse, overtimeResponse] = await Promise.all([
        fetch('http://localhost:8080/api/employee', {
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
        })
      ]);

      if (!employeesResponse.ok) throw new Error('Failed to fetch employees');
      const employeesData = await employeesResponse.json();
  
      let overtimesData = [];
      if (overtimeResponse.ok) {
        overtimesData = await overtimeResponse.json();
      }

      // Filter employees who don't have overtime on the selected date
      const filteredEmployees = employeesData.filter(employee => {
        if (!newOvertime.date) return true;
        
        const hasOvertime = overtimesData.some(
          o => o.employee.id === employee.id && o.date === newOvertime.date
        );

        return !hasOvertime;
      });

      setEmployees(filteredEmployees);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all overtime records
  const fetchOvertimes = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/overtime', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
      const data = await response.json();
      setOvertimes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchEmployees();
    fetchOvertimes();
  }, []);

  // Refetch employees when date changes
  useEffect(() => {
    fetchEmployees();
  }, [newOvertime.date]);

  const handleHeaderCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setIsAllSelected(isChecked);
    
    overtimes.forEach(overtime => {
      const checkbox = document.getElementById(`checkbox-${overtime.id}`);
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    });
  };

  // Create overtime record(s)
  const createOvertime = async () => {
    if (selectAllEmployees) {
      for (const employee of employees) {
        const overtimeData = {
          employee: { id: employee.id },
          date: newOvertime.date,
          startTime: newOvertime.startTime,
          endTime: newOvertime.endTime,
          status: newOvertime.status,
        };

        try {
          const token = getToken();
          const response = await fetch('http://localhost:8080/api/overtime', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(overtimeData),
          });

          if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
          
          const data = await response.json();
          console.log('Overtime created for employee:', employee.id, data);
        } catch (err) {
          console.error('Error creating overtime for employee:', employee.id, err);
          setError(`Error creating overtime for employee ${employee.id}: ${err.message}`);
        }
      }
      
      setNewOvertime({
        employee: { id: '' },
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        status: 'Pending'
      });
      setSelectAllEmployees(false);
      setIsCreateMenuOpen(false);
      
      // Refresh the data
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
        const overtimeData = {
          employee: { id: newOvertime.employee.id },
          date: newOvertime.date,
          startTime: newOvertime.startTime,
          endTime: newOvertime.endTime,
          status: newOvertime.status,
        };

        const token = getToken();
        const response = await fetch('http://localhost:8080/api/overtime', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(overtimeData),
        });

        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

        const data = await response.json();
        setOvertimes(prev => [...prev, data]);
        
        setNewOvertime({
          employee: { id: '' },
          date: new Date().toISOString().split('T')[0],
          startTime: '',
          endTime: '',
          status: 'Pending'
        });
        setError('');
        setIsCreateMenuOpen(false);
        
        // Refresh the employee list to exclude the employee who now has overtime
        fetchEmployees();
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      }
    }
  };

  // Validate a single overtime record
  const validateOvertime = async (overtimeId) => {
    setIsValidating(true);
    try {
      const token = getToken();
      const response = await fetch("http://localhost:8080/api/overtime/validate", {
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

  // Validate multiple overtime records
  const validateSelectedOvertimes = async () => {
    const checkedOvertimeIds = isAllSelected 
      ? overtimes.map(o => o.id)
      : overtimes
          .filter(o => document.getElementById(`checkbox-${o.id}`)?.checked)
          .map(o => o.id);

    if (checkedOvertimeIds.length === 0) {
      alert("Please select at least one overtime record");
      return;
    }

    setIsValidating(true);
    
    try {
      const token = getToken();
      const response = await fetch("http://localhost:8080/api/overtime/validate", {
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
      overtimes.forEach(o => {
        const checkbox = document.getElementById(`checkbox-${o.id}`);
        if (checkbox) checkbox.checked = false;
      });
    }
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
          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-sm mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Overtime Management</h1>
              <p className="text-gray-600">Track and manage employee overtime records</p>
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
                Add Overtime
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

          {/* Date and Actions Panel */}
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

          {/* Overtime Table */}
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {overtimes.map((overtime) => (
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
                              {overtime?.employee?.firstName?.charAt(0)}{overtime?.employee?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {overtime?.employee 
                                ? `${overtime.employee.firstName} ${overtime.employee.lastName}`
                                : "Loading..."}
                            </div>
                            <div className="text-sm text-gray-500">{overtime?.employee?.employeeId || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(overtime.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {overtime.startTime || '--:--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {overtime.endTime || '--:--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {overtime.overtimeHours || 0} hrs
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${(overtime.overtimeHours * overtimeHourlyRate).toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          overtime.status === 'Approved' 
                            ? 'bg-green-100 text-green-800'
                            : overtime.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {overtime.status}
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
                          <button className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
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
          </div>

          {isCreateMenuOpen && (
            <div 
              ref={createMenuRef} 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add Overtime</h1>
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
                {/* Date and Employee Selection */}
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
                          {employee.firstName} {employee.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Select All Employees */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAllEmployees}
                    onChange={(e) => setSelectAllEmployees(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">Select All Available Employees</label>
                </div>

                {/* Time Inputs */}
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

                {/* Calculated Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Overtime Pay</label>
                    <input
                      type="text"
                      value={newOvertime.totalOvertimePay ? `$${newOvertime.totalOvertimePay}` : ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100"
                    />
                  </div>
                </div>

                {/* Status */}
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

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setNewOvertime({
                        employee: { id: '' },
                        date: new Date().toISOString().split('T')[0],
                        startTime: '',
                        endTime: '',
                        status: 'Pending'
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