import { useState, useEffect, useContext } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import * as XLSX from 'xlsx';
import { Download, Filter, Calendar, Clock, AlertCircle, UserCheck, UserX } from "lucide-react";

function DailyAttendanceReport() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useContext(SettingsContext);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    department: '',
    showLatenessOnly: false,
    showEarlyDeparturesOnly: false
  });

  // Stats for the dashboard
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    earlyDepartures: 0
  });

  const getToken = () => localStorage.getItem('jwtToken');

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:8080/api/attendance?date=${filters.date}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch attendance data');
      
      const data = await response.json();
      setAttendanceData(data);
      applyFilters(data);
      
      // Calculate statistics
      calculateStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from attendance data
  const calculateStats = (data) => {
    const present = data.filter(a => a.status === 'Present' || a.status === 'Late');
    const late = data.filter(a => a.status === 'Late');
    const absent = data.filter(a => a.status === 'Absent');
    
    // Calculate early departures (checking if checkOut is before official end time)
    const officialEndTime = settings.workEndTime || '17:00'; // Default to 5 PM
    const earlyDepartures = data.filter(a => {
      if (!a.checkOut || a.status === 'Absent') return false;
      
      const [outHour, outMinute] = a.checkOut.split(':').map(Number);
      const [endHour, endMinute] = officialEndTime.split(':').map(Number);
      
      const outTotalMinutes = outHour * 60 + outMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      // Considered early if leaving more than 15 minutes before official end time
      return outTotalMinutes < (endTotalMinutes - 15);
    });

    setStats({
      totalEmployees: data.length,
      presentCount: present.length,
      lateCount: late.length,
      absentCount: absent.length,
      earlyDepartures: earlyDepartures.length
    });
  };

  // Apply filters to data
 const applyFilters = (data) => {
  let filtered = [...data];
  
  // Filter by department
  if (filters.department) {
    filtered = filtered.filter(item => 
      item.employee?.department === filters.department
    );
  }
  
  // Filter by lateness
  if (filters.showLatenessOnly) {
    filtered = filtered.filter(item => item.status === 'Late');
  }
  
  // Filter by early departures
  if (filters.showEarlyDeparturesOnly) {
    const officialEndTime = settings.workEndTime || '17:00';
    filtered = filtered.filter(a => {
      if (!a.checkOut || a.status === 'Absent') return false;
      
      const [outHour, outMinute] = a.checkOut.split(':').map(Number);
      const [endHour, endMinute] = officialEndTime.split(':').map(Number);
      
      const outTotalMinutes = outHour * 60 + outMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      return outTotalMinutes < (endTotalMinutes - 15);
    });
  }

  // ✅ NEW: Only include late arrivals OR less than 8 hours worked
  filtered = filtered.filter(item => {
    const late = calculateMinutesLate(item.checkIn) > 0;
    const underHours = (item.minimumHour || 0) < 8;
    return late || underHours;
  });

  setFilteredData(filtered);
};


  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(attendanceData);
  };

  // Check if employee is late
  const isLate = (checkInTime) => {
    if (!checkInTime) return false;
    
    const officialStartTime = settings.workStartTime || '08:00'; // Default to 8 AM
    const [inHour, inMinute] = checkInTime.split(':').map(Number);
    const [startHour, startMinute] = officialStartTime.split(':').map(Number);
    
    const inTotalMinutes = inHour * 60 + inMinute;
    const startTotalMinutes = startHour * 60 + startMinute;
    
    // Considered late if arriving more than 5 minutes after official start time
    return inTotalMinutes > (startTotalMinutes + 5);
  };

  // Calculate minutes late
  const calculateMinutesLate = (checkInTime) => {
    if (!checkInTime || !isLate(checkInTime)) return 0;
    
    const officialStartTime = settings.workStartTime || '08:00';
    const [inHour, inMinute] = checkInTime.split(':').map(Number);
    const [startHour, startMinute] = officialStartTime.split(':').map(Number);
    
    const inTotalMinutes = inHour * 60 + inMinute;
    const startTotalMinutes = startHour * 60 + startMinute;
    
    return inTotalMinutes - startTotalMinutes;
  };

  // Calculate minutes early departure
  const calculateMinutesEarly = (checkOutTime) => {
    if (!checkOutTime) return 0;
    
    const officialEndTime = settings.workEndTime || '17:00';
    const [outHour, outMinute] = checkOutTime.split(':').map(Number);
    const [endHour, endMinute] = officialEndTime.split(':').map(Number);
    
    const outTotalMinutes = outHour * 60 + outMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (outTotalMinutes >= endTotalMinutes) return 0;
    
    return endTotalMinutes - outTotalMinutes;
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map(item => ({
        'Employee ID': item.employee?.employeeId || 'N/A',
        'Name': `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
        'Department': item.employee?.department || 'N/A',
        'Date': item.date,
        'Check In': item.checkIn || '--:--',
        'Check Out': item.checkOut || '--:--',
        'Status': item.status,
        'Minutes Late': isLate(item.checkIn) ? calculateMinutesLate(item.checkIn) : 0,
        'Minutes Early Departure': calculateMinutesEarly(item.checkOut),
        'Hours Worked': item.minimumHour || 0
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    XLSX.writeFile(workbook, `attendance_report_${filters.date}.xlsx`);
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [filters.date]);

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white z-30">
        <MainSidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        <main className="flex-1 max-w-full px-2 md:px-4 py-6">
          {/* Page Header */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Daily Attendance Report</h1>
              <p className="text-gray-600">Track employee attendance, lateness, and early departures</p>
            </div>
            
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
            >
              <Download size={18} />
              Export Report
            </button>
          </section>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Total Employees</div>
                  <div className="text-2xl font-bold text-gray-800">{stats.totalEmployees}</div>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <UserCheck size={20} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Present</div>
                  <div className="text-2xl font-bold text-green-600">{stats.presentCount}</div>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <UserCheck size={20} className="text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Late Arrivals</div>
                  <div className="text-2xl font-bold text-amber-600">{stats.lateCount}</div>
                </div>
                <div className="p-2 bg-amber-100 rounded-full">
                  <Clock size={20} className="text-amber-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Absent</div>
                  <div className="text-2xl font-bold text-red-600">{stats.absentCount}</div>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <UserX size={20} className="text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Early Departures</div>
                  <div className="text-2xl font-bold text-purple-600">{stats.earlyDepartures}</div>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <AlertCircle size={20} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <Calendar size={16} className="text-gray-500" />
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  <option value="Projects">Projects</option>
                  <option value="Site Services">Site Services</option>
                  <option value="Ahafo North">Ahafo North</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={filters.showLatenessOnly}
                    onChange={(e) => handleFilterChange('showLatenessOnly', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show only late arrivals</span>
                </label>
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={filters.showEarlyDeparturesOnly}
                    onChange={(e) => handleFilterChange('showEarlyDeparturesOnly', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Show only early departures</span>
                </label>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours Worked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Minutes Late
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Early Departure
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((item) => {
                      const isLate = item.checkIn ? calculateMinutesLate(item.checkIn) > 0 : false;
                      const isEarlyDeparture = calculateMinutesEarly(item.checkOut) > 0;
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-700 font-medium">
                                  {item.employee?.firstName?.charAt(0)}{item.employee?.lastName?.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.employee?.firstName} {item.employee?.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.employee?.employeeId || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.employee?.department || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.checkIn || '--:--'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.checkOut || '--:--'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              (item.minimumHour || 0) >= 8 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.minimumHour || 0} hrs
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === 'Present' ? 'bg-green-100 text-green-800' :
                              item.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                              item.status === 'Absent' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {item.status === "Absent" ? (
    <span className="text-red-600 font-medium">Absent</span>
  ) : isLate ? (
    <span className="text-amber-600 font-medium">
      {calculateMinutesLate(item.checkIn)} min late
    </span>
  ) : (
    <span className="text-green-600">On time</span>
  )}
</td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isEarlyDeparture ? (
                              <span className="text-purple-600 font-medium">
                                {calculateMinutesEarly(item.checkOut)} min early
                              </span>
                            ) : (
                              <span className="text-green-600">Normal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                        No attendance records found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          {filteredData.length > 0 && (
            <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Lateness Analysis</h4>
                  <ul className="space-y-2">
                    {filteredData
                      .filter(item => calculateMinutesLate(item.checkIn) > 0)
                      .sort((a, b) => calculateMinutesLate(b.checkIn) - calculateMinutesLate(a.checkIn))
                      .slice(0, 5)
                      .map(item => (
                        <li key={item.id} className="flex justify-between items-center text-sm">
                          <span>
                            {item.employee?.firstName} {item.employee?.lastName}
                          </span>
                          <span className="text-amber-600 font-medium">
                            {calculateMinutesLate(item.checkIn)} min late
                          </span>
                        </li>
                      ))
                    }
                    
                    {filteredData.filter(item => calculateMinutesLate(item.checkIn) > 0).length === 0 && (
                      <li className="text-sm text-gray-500">No late arrivals</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Early Departures</h4>
                  <ul className="space-y-2">
                    {filteredData
                      .filter(item => calculateMinutesEarly(item.checkOut) > 0)
                      .sort((a, b) => calculateMinutesEarly(b.checkOut) - calculateMinutesEarly(a.checkOut))
                      .slice(0, 5)
                      .map(item => (
                        <li key={item.id} className="flex justify-between items-center text-sm">
                          <span>
                            {item.employee?.firstName} {item.employee?.lastName}
                          </span>
                          <span className="text-purple-600 font-medium">
                            {calculateMinutesEarly(item.checkOut)} min early
                          </span>
                        </li>
                      ))
                    }
                    
                    {filteredData.filter(item => calculateMinutesEarly(item.checkOut) > 0).length === 0 && (
                      <li className="text-sm text-gray-500">No early departures</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default DailyAttendanceReport;