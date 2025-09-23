import { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../context/SettingsContext";
import { 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  Filter, 
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import MainSidebar from "../mainSidebar";

function Timesheet() {
  const { settings } = useContext(SettingsContext);
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendances, setAttendances] = useState([]);
  const [overviews, setOverviews] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filters, setFilters] = useState({
    employee: "",
    status: "",
    department: "",
    dateRange: "",
    search: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("jwtToken");
        const headers = {
          'Authorization': `Bearer ${token}`
        };

        const [timesheetsRes, employeesRes, attendancesRes, overviewsRes] = await Promise.all([
          fetch('http://localhost:8080/api/timesheets?includeEmployee=true', { headers }),
          fetch('http://localhost:8080/api/employee', { headers }),
          fetch('http://localhost:8080/api/attendance', { headers }),
          fetch('http://localhost:8080/api/overview', { headers })
        ]);

        if (!timesheetsRes.ok) throw new Error(`Timesheets fetch failed: ${timesheetsRes.status}`);
        if (!employeesRes.ok) throw new Error(`Employees fetch failed: ${employeesRes.status}`);
        if (!attendancesRes.ok) console.error("Attendances fetch failed");
        if (!overviewsRes.ok) console.error("Overviews fetch failed");

        let timesheetsData = await timesheetsRes.json();
        const employeesData = await employeesRes.json();
        const attendancesData = attendancesRes.ok ? await attendancesRes.json() : [];
        const overviewsData = overviewsRes.ok ? await overviewsRes.json() : [];

        // If includeEmployee=true didn't work, manually attach employee data
        if (!timesheetsData[0]?.employee) {
          timesheetsData = timesheetsData.map(sheet => ({
            ...sheet,
            employee: employeesData.find(e => e.id === sheet.employeeId)
          }));
        }

        setTimesheets(timesheetsData);
        setEmployees(employeesData);
        setAttendances(attendancesData);
        setOverviews(overviewsData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getAttendanceByDateAndEmployee = (date, employeeId) => {
    return attendances.find(
      (a) => a.date === date && a.employee?.id === employeeId
    );
  };
  
  const getOverviewByDateAndEmployee = (date, employeeId) => {
    return overviews.find(
      (o) => o.date === date && o.employee?.id === employeeId
    );
  };
  
  const formatCurrency = (amount) =>
    amount ? `$${parseFloat(amount).toFixed(2)}` : "$0.00";

  // Calculate date ranges based on selected period
  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (selectedPeriod === "week") {
      start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
      end.setDate(end.getDate() + (6 - end.getDay())); // End of week (Saturday)
    } else {
      // Month
      start.setDate(1); // First day of month
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of month
    }
    
    return { start, end };
  };

  // Filter timesheets based on selected filters and date range
  const filteredTimesheets = timesheets.filter(sheet => {
    const { start, end } = getDateRange();
    const sheetDate = new Date(sheet.date);
    
    // Date range filter
    if (sheetDate < start || sheetDate > end) return false;
    
    // Employee filter
    if (filters.employee && sheet.employeeId !== filters.employee) return false;
    
    // Status filter
    if (filters.status && sheet.status !== filters.status) return false;
    
    // Search filter
    if (filters.search) {
      const employeeName = getEmployeeName(sheet.employee || sheet.employeeId).toLowerCase();
      if (!employeeName.includes(filters.search.toLowerCase())) return false;
    }
    
    // Custom date range filter
    if (dateFilter.startDate && dateFilter.endDate) {
      const filterStart = new Date(dateFilter.startDate);
      const filterEnd = new Date(dateFilter.endDate);
      if (sheetDate < filterStart || sheetDate > filterEnd) return false;
    }
    
    return true;
  });

  // Group timesheets by date for calendar view
  const groupByDate = () => {
    const grouped = {};
    filteredTimesheets.forEach(sheet => {
      if (!grouped[sheet.date]) {
        grouped[sheet.date] = [];
      }
      grouped[sheet.date].push(sheet);
    });
    return grouped;
  };

  // Handle period navigation
  const navigatePeriod = (direction) => {
    const newDate = new Date(currentDate);
    if (selectedPeriod === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  // Handle timesheet approval/rejection
  const handleStatusChange = async (id, status) => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`http://localhost:8080/api/timesheets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      setTimesheets(prev => prev.map(sheet => 
        sheet.id === id ? { ...sheet, status } : sheet
      ));
      
      setShowActionsMenu(null);
    } catch (err) {
      console.error("Error updating timesheet:", err);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get employee name by ID
  const getEmployeeName = (employeeIdOrObject) => {
    if (employeeIdOrObject?.firstName) {
      return `${employeeIdOrObject.firstName} ${employeeIdOrObject.lastName}`;
    }
    
    const employee = employees.find(e => e.id === employeeIdOrObject);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };

  const generateTimesheetsFromAttendance = async () => {
    setIsGenerating(true);
    try {
      const { start, end } = getDateRange();
      const token = localStorage.getItem("jwtToken");
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `http://localhost:8080/api/timesheets/generate-from-overview?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error('Failed to generate timesheets');
      }

      // Refresh data
      const [timesheetsRes, overviewRes] = await Promise.all([
        fetch('http://localhost:8080/api/timesheets', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('http://localhost:8080/api/overview', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!timesheetsRes.ok) throw new Error('Failed to fetch updated timesheets');
      if (!overviewRes.ok) throw new Error('Failed to fetch overview data');

      setTimesheets(await timesheetsRes.json());
      setOverviews(await overviewRes.json());

      alert('Timesheets generated successfully from overview data');
    } catch (err) {
      console.error("Error generating timesheets:", err);
      alert('Error generating timesheets: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ["Date", "Employee", "Regular Hours", "Overtime", "Status", "Total Pay"];
    const csvContent = [
      headers.join(","),
      ...filteredTimesheets.map(sheet => {
        const overview = getOverviewByDateAndEmployee(sheet.date, sheet.employeeId);
        const totalPay = (overview?.hoursWorked || 0) * (overview?.rate || settings.hourlyRate) +
          (overview?.overtimeHours || 0) * (overview?.overtimeRate || settings.overtimeHourlyRate);
        
        return [
          sheet.date,
          getEmployeeName(sheet.employee || sheet.employeeId),
          sheet.regularHours,
          sheet.overtimeHours || 0,
          sheet.status,
          formatCurrency(totalPay)
        ].join(",");
      })
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen bg-gray-50 flex">
      {/* Sidebar - Fixed width and full height */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <MainSidebar />
      </div>
      
      {/* Main content with left padding equal to sidebar width */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="flex justify-between items-center bg-white h-16 w-full px-6 shadow-md sticky top-0 z-10">
          <h1 className="text-lg font-semibold">Timesheet Management</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button 
              onClick={() => setShowTimeEntryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Entry
            </button>
            <button 
              onClick={generateTimesheetsFromAttendance}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg ${
                isGenerating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isGenerating ? 'Generating...' : (
                <>
                  <Plus size={16} />
                  Generate Timesheets
                </>
              )}
            </button>
          </div>
        </header>

        {/* Content container with proper padding */}
        <div className="p-6">
          {/* Period Navigation and Controls */}
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigatePeriod("prev")}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              
              <h2 className="text-lg font-semibold">
                {selectedPeriod === "week" 
                  ? `Week of ${getDateRange().start.toLocaleDateString()} - ${getDateRange().end.toLocaleDateString()}`
                  : currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              
              <button 
                onClick={() => navigatePeriod("next")}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedPeriod("week")}
                className={`px-4 py-2 rounded-lg ${selectedPeriod === "week" ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setSelectedPeriod("month")}
                className={`px-4 py-2 rounded-lg ${selectedPeriod === "month" ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                Month
              </button>
              
              <div className="relative">
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                  <Search size={16} className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="outline-none bg-transparent"
                  />
                </div>
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg"
              >
                <Filter size={16} />
                Filters
                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select 
                    value={filters.employee}
                    onChange={(e) => setFilters({...filters, employee: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              {(dateFilter.startDate || dateFilter.endDate) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setDateFilter({ startDate: "", endDate: "" })}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear date filters
                  </button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Total Entries</div>
                  <div className="text-2xl font-bold">{filteredTimesheets.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Pending Approval</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredTimesheets.filter(t => t.status === 'pending').length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Approved</div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredTimesheets.filter(t => t.status === 'approved').length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Rejected</div>
                  <div className="text-2xl font-bold text-red-600">
                    {filteredTimesheets.filter(t => t.status === 'rejected').length}
                  </div>
                </div>
              </div>

              {/* Calendar View */}
              {selectedPeriod === "week" ? (
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date(getDateRange().start);
                      date.setDate(date.getDate() + i);
                      const isToday = date.toDateString() === new Date().toDateString();
                      return (
                        <div key={i} className={`p-3 text-center font-medium ${isToday ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}>
                          {date.toLocaleDateString(undefined, { weekday: 'short' })}
                          <div className={`text-gray-900 font-normal ${isToday ? 'font-bold' : ''}`}>
                            {date.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="grid grid-cols-7 min-h-[200px]">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date(getDateRange().start);
                      date.setDate(date.getDate() + i);
                      const dateStr = date.toISOString().split('T')[0];
                      const daySheets = groupByDate()[dateStr] || [];
                      const isToday = date.toDateString() === new Date().toDateString();
                      
                      return (
                        <div key={i} className={`border-r border-gray-200 last:border-r-0 p-2 ${isToday ? 'bg-blue-50' : ''}`}>
                          {daySheets.length > 0 ? (
                            <div className="space-y-2">
                              {daySheets.map(sheet => (
                                <div key={sheet.id} className={`p-2 rounded-lg text-sm ${
                                  sheet.status === 'approved' ? 'bg-green-50 border border-green-100' :
                                  sheet.status === 'rejected' ? 'bg-red-50 border border-red-100' :
                                  'bg-yellow-50 border border-yellow-100'
                                }`}>
                                  <div className="font-medium truncate">
                                    {sheet.employee ? `${sheet.employee.firstName} ${sheet.employee.lastName}` : "Unknown"}
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-xs text-gray-500">
                                      {sheet.regularHours}h
                                      {sheet.overtimeHours ? ` + ${sheet.overtimeHours} OT` : ''}
                                    </span>
                                    <span className={`text-xs px-1 rounded ${
                                      sheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                      sheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {sheet.status || 'pending'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 text-sm py-4">
                              No entries
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-3 text-center font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7">
                    {Array.from({ length: 35 }).map((_, i) => {
                      const date = new Date(currentDate);
                      date.setDate(1);
                      date.setDate(date.getDate() - date.getDay() + i);
                      const dateStr = date.toISOString().split('T')[0];
                      const daySheets = groupByDate()[dateStr] || [];
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      
                      return (
                        <div 
                          key={i} 
                          className={`min-h-[100px] border-r border-b border-gray-200 p-1 ${
                            !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 
                            isToday ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className={`text-right text-sm p-1 ${isToday ? 'font-bold text-blue-600' : ''}`}>
                            {date.getDate()}
                          </div>
                          {isCurrentMonth && daySheets.length > 0 && (
                            <div className="text-xs space-y-1">
                              {daySheets.slice(0, 2).map(sheet => (
                                <div 
                                  key={sheet.id} 
                                  className={`p-1 rounded truncate ${
                                    sheet.status === 'approved' ? 'bg-green-100' :
                                    sheet.status === 'rejected' ? 'bg-red-100' :
                                    'bg-yellow-100'
                                  }`}
                                >
                                  {sheet.employee ? `${sheet.employee.firstName}` : "Unknown"}
                                </div>
                              ))}
                              {daySheets.length > 2 && (
                                <div className="text-gray-500 text-center">
                                  +{daySheets.length - 2} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timesheet List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Timesheet Entries</h2>
                  <span className="text-sm text-gray-500">
                    Showing {filteredTimesheets.length} of {timesheets.length} entries
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regular Hours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pay</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTimesheets.length > 0 ? (
                        filteredTimesheets.map(sheet => {
                          const attendance = getAttendanceByDateAndEmployee(sheet.date, sheet.employeeId);
                          const overview = getOverviewByDateAndEmployee(sheet.date, sheet.employeeId);

                          return (
                            <tr key={sheet.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(sheet.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {getEmployeeName(sheet.employee || sheet.employeeId)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {sheet.regularHours}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {sheet.overtimeHours || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {attendance?.status || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(
                                  (overview?.hoursWorked || 0) * (overview?.rate || settings.hourlyRate) +
                                  (overview?.overtimeHours || 0) * (overview?.overtimeRate || settings.overtimeHourlyRate)
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  sheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  sheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {sheet.status || 'pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="relative">
                                  <button 
                                    onClick={() => setShowActionsMenu(showActionsMenu === sheet.id ? null : sheet.id)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                  {showActionsMenu === sheet.id && (
                                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                      <div className="py-1">
                                        {sheet.status !== 'approved' && (
                                          <button
                                            onClick={() => handleStatusChange(sheet.id, 'approved')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-100"
                                          >
                                            <Check size={14} className="mr-2" />
                                            Approve
                                          </button>
                                        )}
                                        {sheet.status !== 'rejected' && (
                                          <button
                                            onClick={() => handleStatusChange(sheet.id, 'rejected')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                                          >
                                            <X size={14} className="mr-2" />
                                            Reject
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setSelectedTimesheet(sheet);
                                            setShowTimeEntryModal(true);
                                          }}
                                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          <Edit size={14} className="mr-2" />
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
                                              // Implement delete functionality
                                            }
                                          }}
                                          className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                                        >
                                          <Trash2 size={14} className="mr-2" />
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-8 text-center">
                            <div className="text-gray-500 mb-2">No timesheets found</div>
                            <div className="text-sm text-gray-400">
                              Try adjusting your filters or generate timesheets from attendance data
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Time Entry Modal */}
      {showTimeEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {selectedTimesheet ? 'Edit Time Entry' : 'Add Time Entry'}
              </h2>
              <button
                onClick={() => {
                  setShowTimeEntryModal(false);
                  setSelectedTimesheet(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg">
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id} selected={selectedTimesheet?.employeeId === emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    defaultValue={selectedTimesheet?.date || ''}
                    className="w-full p-2 border border-gray-300 rounded-lg" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Regular Hours</label>
                    <input 
                      type="number" 
                      step="0.5"
                      defaultValue={selectedTimesheet?.regularHours || ''}
                      className="w-full p-2 border border-gray-300 rounded-lg" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours</label>
                    <input 
                      type="number" 
                      step="0.5"
                      defaultValue={selectedTimesheet?.overtimeHours || ''}
                      className="w-full p-2 border border-gray-300 rounded-lg" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea 
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    rows={3}
                    defaultValue={selectedTimesheet?.notes || ''}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTimeEntryModal(false);
                  setSelectedTimesheet(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle form submission
                  setShowTimeEntryModal(false);
                  setSelectedTimesheet(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {selectedTimesheet ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Timesheet;