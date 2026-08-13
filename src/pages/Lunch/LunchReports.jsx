import React, { useState, useEffect, useMemo } from 'react';
import { DocumentArrowDownIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { attendanceService } from './services/lunchApi';

const LunchReports = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    period: 'daily',
    date: new Date().toISOString().split('T')[0],
    department: '',
    search: '',
  });
  const [showDailyDetails, setShowDailyDetails] = useState(false);

  // ----- Date range helpers -----
  const getDateRange = () => {
    const today = new Date(filter.date);
    let start, end;
    if (filter.period === 'daily') {
      start = end = filter.date;
    } else if (filter.period === 'weekly') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      start = monday.toISOString().split('T')[0];
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      end = sunday.toISOString().split('T')[0];
    } else if (filter.period === 'monthly') {
      const year = today.getFullYear();
      const month = today.getMonth();
      start = new Date(year, month, 1).toISOString().split('T')[0];
      end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    }
    return { start, end };
  };

  // ----- Fetch data -----
  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange();
      const res = await attendanceService.getAllAttendances();
      // If the response is an array directly, use it; otherwise use res.data
      let data = Array.isArray(res) ? res : (res.data || []);
      // Filter by date range
      if (start && end) {
        data = data.filter(rec => {
          const recDate = new Date(rec.date);
          const startDate = new Date(start);
          const endDate = new Date(end);
          return recDate >= startDate && recDate <= endDate;
        });
      }
      setAttendanceData(data);
    } catch (err) {
      setError('Failed to load attendance data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [filter.period, filter.date]);

  // ----- Filtering (department + search) -----
  const filteredData = useMemo(() => {
    let data = attendanceData;
    if (filter.department) {
      data = data.filter(rec => rec.employee?.department === filter.department);
    }
    if (filter.search) {
      const term = filter.search.toLowerCase();
      data = data.filter(rec => {
        const fullName = `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.toLowerCase();
        const empId = (rec.employee?.employeeId || '').toLowerCase();
        return fullName.includes(term) || empId.includes(term);
      });
    }
    return data;
  }, [attendanceData, filter.department, filter.search]);

  // ----- Compute employee summary (unique employees) -----
  const employeeSummary = useMemo(() => {
    const map = new Map();
    filteredData.forEach(rec => {
      const id = rec.employee?.id;
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, {
          employee: rec.employee,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          onLeaveDays: 0,
          totalHours: 0,
        });
      }
      const entry = map.get(id);
      entry.totalDays += 1;
      const status = rec.status || 'Absent';
      if (status === 'Present') entry.presentDays += 1;
      else if (status === 'Late') entry.lateDays += 1;
      else if (status === 'Absent') entry.absentDays += 1;
      else if (status === 'On Leave' || status === 'Leave') entry.onLeaveDays += 1;
      const hours = parseFloat(rec.minimumHour) || 0;
      entry.totalHours += hours;
    });
    return Array.from(map.values());
  }, [filteredData]);

  // ----- Departments for filter -----
  const departments = useMemo(() => {
    const deptSet = new Set();
    attendanceData.forEach(rec => {
      if (rec.employee?.department) deptSet.add(rec.employee.department);
    });
    return Array.from(deptSet).sort();
  }, [attendanceData]);

  // ----- Export -----
  const handleExport = (format) => {
    if (format === 'csv') {
      const headers = ['Employee Name', 'Department', 'Total Days', 'Present', 'Absent', 'Late', 'On Leave'];
      const rows = employeeSummary.map(emp => [
        `${emp.employee.firstName} ${emp.employee.lastName}`,
        emp.employee.department || '',
        emp.totalDays,
        emp.presentDays,
        emp.absentDays,
        emp.lateDays,
        emp.onLeaveDays,
      ]);
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_summary_${filter.date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      alert(`Export as ${format} – coming soon`);
    }
  };

  // ----- Stats -----
  const totalEmployees = employeeSummary.length;
  const totalPresent = employeeSummary.reduce((sum, e) => sum + e.presentDays, 0);
  const totalAbsent = employeeSummary.reduce((sum, e) => sum + e.absentDays, 0);
  const totalDays = filteredData.length > 0 ? new Set(filteredData.map(r => r.date)).size : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance Summary</h1>
          <p className="text-gray-500">View attendance by employee – all names listed</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700">Period</label>
            <select
              value={filter.period}
              onChange={(e) => setFilter({ ...filter, period: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={filter.date}
              onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              className="mt-1 block w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              value={filter.department}
              onChange={(e) => setFilter({ ...filter, department: e.target.value })}
              className="mt-1 block w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700">Search Employee</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Name or ID"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="mt-1 block w-full pl-10 pr-4 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={fetchAttendance}
            className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Employees</p>
          <p className="text-2xl font-bold text-gray-800">{totalEmployees}</p>
          <p className="text-xs text-gray-400 mt-1">Unique employees in this period</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Present Days</p>
          <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
          <p className="text-xs text-gray-400 mt-1">Total present days across all</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Absent Days</p>
          <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
          <p className="text-xs text-gray-400 mt-1">Total absent days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Days Covered</p>
          <p className="text-2xl font-bold text-indigo-600">{totalDays}</p>
          <p className="text-xs text-gray-400 mt-1">Unique dates in this period</p>
        </div>
      </div>

      {/* Employee Summary Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
          {error}
        </div>
      ) : employeeSummary.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          No employees found for the selected period.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Employee Attendance Summary</h3>
            <button
              onClick={() => setShowDailyDetails(!showDailyDetails)}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              {showDailyDetails ? 'Hide' : 'Show'} Daily Records
              {showDailyDetails ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">On Leave</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employeeSummary.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {emp.employee?.firstName?.charAt(0)}{emp.employee?.lastName?.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {emp.employee?.firstName} {emp.employee?.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{emp.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {emp.employee?.department || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                      {emp.totalDays}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-green-600 font-medium">
                      {emp.presentDays}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-red-600 font-medium">
                      {emp.absentDays}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-yellow-600 font-medium">
                      {emp.lateDays}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-blue-600 font-medium">
                      {emp.onLeaveDays}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                      {emp.totalHours.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex justify-between">
            <span>Showing {employeeSummary.length} employees</span>
            <span>Period: {getDateRange().start} to {getDateRange().end}</span>
          </div>

          {/* Daily Records (expandable) */}
          {showDailyDetails && (
            <div className="border-t border-gray-200">
              <div className="px-4 py-3 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700">Daily Records</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {rec.employee?.firstName} {rec.employee?.lastName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{rec.checkIn || '--:--'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{rec.checkOut || '--:--'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            rec.status === 'Present' ? 'bg-green-100 text-green-800' :
                            rec.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                            rec.status === 'Absent' ? 'bg-red-100 text-red-800' :
                            rec.status === 'On Leave' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {rec.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {rec.minimumHour?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
                {filteredData.length} daily records
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LunchReports;