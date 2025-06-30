import { useState, useEffect, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar";
import { SettingsContext } from "../context/SettingsContext";
import { 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Download,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";


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
    department: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);

  const location = useLocation();

  // Fetch data
  useEffect(() => {
    // In your fetchData function
// Update your fetchData function
const fetchData = async () => {
  setLoading(true);
  try {
    const [timesheetsRes, employeesRes] = await Promise.all([
      fetch('http://localhost:8080/api/timesheets?includeEmployee=true'),
      fetch('http://localhost:8080/api/employee')
    ]);

    if (!timesheetsRes.ok) throw new Error(`Timesheets fetch failed: ${timesheetsRes.status}`);
    if (!employeesRes.ok) throw new Error(`Employees fetch failed: ${employeesRes.status}`);

    let timesheetsData = await timesheetsRes.json();
    const employeesData = await employeesRes.json();

    // If includeEmployee=true didn't work, manually attach employee data
    if (!timesheetsData[0]?.employee) {
      timesheetsData = timesheetsData.map(sheet => ({
        ...sheet,
        employee: employeesData.find(e => e.id === sheet.employeeId)
      }));
    }

    setTimesheets(timesheetsData);
    setEmployees(employeesData);
  } catch (err) {
    console.error("Error fetching data:", err);
  } finally {
    setLoading(false);
  }
};
fetchData().then(() => {
  console.log("Timesheets data:", timesheets);
  console.log("Employees data:", employees);
  if (timesheets.length > 0) {
    console.log("First timesheet employee:", timesheets[0].employee);
  }
});
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
    
    // Department filter (would need employee department data)
    // if (filters.department && sheet.employee.department !== filters.department) return false;
    
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
      const response = await fetch(`http://localhost:8080/api/timesheets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      setTimesheets(prev => prev.map(sheet => 
        sheet.id === id ? { ...sheet, status } : sheet
      ));
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
    // If it's already an employee object with firstName/lastName
    if (employeeIdOrObject?.firstName) {
      return `${employeeIdOrObject.firstName} ${employeeIdOrObject.lastName}`;
    }
    
    // If it's just an ID, look up in employees state
    const employee = employees.find(e => e.id === employeeIdOrObject);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };


  const generateTimesheetsFromAttendance = async () => {
    setIsGenerating(true);
    try {
        const { start, end } = getDateRange();
        
        const response = await fetch(`http://localhost:8080/api/timesheets/generate-from-overview?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) throw new Error('Failed to generate timesheets');

        // Refresh data
        const [timesheetsRes, overviewRes] = await Promise.all([
            fetch('http://localhost:8080/api/timesheets'),
            fetch('http://localhost:8080/api/overview')
        ]);

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
  
  return (
    <div className="relative min-h-screen bg-gray-50 flex">
      {/* Sidebar - Fixed width and full height */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <Sidebar />
      </div>
      
      {/* Main content with left padding equal to sidebar width */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="flex justify-between items-center bg-white h-16 w-full px-6 shadow-md sticky top-0 z-10">
          <h1 className="text-lg font-semibold">Timesheet Management</h1>
          <div className="flex items-center gap-4">
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
  className={`px-4 py-2 text-white rounded-lg ${
    isGenerating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
  }`}
>
  {isGenerating ? 'Generating...' : 'Generate Timesheets'}
</button>

          </div>
        </header>

        {/* Content container with proper padding */}
        <div className="p-6">
          {/* Period Navigation */}
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
                  ? `Week of ${getDateRange().start.toLocaleDateString()}`
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
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg"
              >
                <Filter size={16} />
                Filters
              </button>
              
              <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg">
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                
                {/* Department filter would go here */}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Calendar View */}
              {selectedPeriod === "week" ? (
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date(getDateRange().start);
                      date.setDate(date.getDate() + i);
                      return (
                        <div key={i} className="p-3 text-center font-medium text-gray-500">
                          {date.toLocaleDateString(undefined, { weekday: 'short' })}
                          <div className="text-gray-900 font-normal">
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
                      
                      return (
                        <div key={i} className="border-r border-gray-200 last:border-r-0 p-2">
                          {daySheets.length > 0 ? (
                            <div className="space-y-2">
                         {daySheets.map(sheet => (
  <div key={sheet.id} className={`p-2 rounded-lg text-sm ${
    sheet.status === 'approved' ? 'bg-green-50 border border-green-100' :
    sheet.status === 'rejected' ? 'bg-red-50 border border-red-100' :
    'bg-gray-50 border border-gray-100'
  }`}>
    <div className="font-medium">
      {sheet.employee ? `${sheet.employee.firstName} ${sheet.employee.lastName}` : "Unknown"}
    </div>
    {/* ... rest of the code ... */}
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
                      // Calculate date for each cell
                      const date = new Date(currentDate);
                      date.setDate(1);
                      date.setDate(date.getDate() - date.getDay() + i);
                      const dateStr = date.toISOString().split('T')[0];
                      const daySheets = groupByDate()[dateStr] || [];
                      
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      
                      return (
                        <div 
                        key={i} 
                        className={`min-h-[100px] border-r border-b border-gray-200 p-1 ${
                          !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                        }`}
                      >
                        <div className="text-right text-sm p-1">
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
      'bg-gray-100'
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
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">Timesheet Entries</h2>
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

          {/* ✅ Attendance Status */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {attendance?.status || "—"}
          </td>

          {/* ✅ Total Pay */}
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
            {sheet.status !== 'approved' && (
              <button 
                onClick={() => handleStatusChange(sheet.id, 'approved')}
                className="text-green-600 hover:text-green-900 mr-3"
              >
                <Check size={16} />
              </button>
            )}
            {sheet.status !== 'rejected' && (
              <button 
                onClick={() => handleStatusChange(sheet.id, 'rejected')}
                className="text-red-600 hover:text-red-900"
              >
                <X size={16} />
              </button>
            )}
          </td>
        </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
        No timesheets found for the selected filters
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

      {/* Time Entry Modal (would be implemented similarly to your LeaveModal) */}
      {showTimeEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Add Time Entry</h2>
              <button
                onClick={() => setShowTimeEntryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {/* Form would go here */}
              <div className="text-center py-8 text-gray-500">
                Time entry form would be implemented here
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTimeEntryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle form submission
                  setShowTimeEntryModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Timesheet;