import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Download,
  Filter,
  Search,
  Calendar,
  Users,
  Clock,
  FileText,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  DollarSign
} from "lucide-react";

function Report() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    employeeId: "",
    category: "",
    department: "",
    workType: "",
    status: "",
    shift: ""
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [viewOptions, setViewOptions] = useState({
    groupBy: "date",
    showDetails: true,
    showSummary: true,
    includeLeave: true,
    includeOvertime: true
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [expandedRows, setExpandedRows] = useState([]);
  
  const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log("🖥️ Current hostname:", hostname);
  console.log("🔌 Current port:", port);

  // If frontend is opened via localhost → use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  // Public / Tailscale / Cloudflare IP
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }

  // Default fallback
  console.log("🌍 Using PUBLIC API URL (fallback)");
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      
      const attendanceUrl = filters.startDate && filters.endDate 
        ? `${API_BASE_URL}/api/attendance?startDate=${filters.startDate}&endDate=${filters.endDate}`
        : `${API_BASE_URL}/api/attendance`;
      
      const [attendanceRes, employeesRes, payrollRes] = await Promise.all([
        fetch(attendanceUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/employee`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/payroll/summary?startDate=${filters.startDate || '2024-01-01'}&endDate=${filters.endDate || '2024-12-31'}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      ]);

      if (!attendanceRes.ok) throw new Error('Failed to fetch attendance data');
      if (!employeesRes.ok) throw new Error('Failed to fetch employees');

      const attendance = await attendanceRes.json();
      const employeesData = await employeesRes.json();
      let payrollSummary = {};
      
      if (payrollRes.ok) {
        payrollSummary = await payrollRes.json();
      }

      const enrichedData = attendance.map(record => {
        const employee = employeesData.find(emp => emp.id === record.employee?.id);
        const employeeSalary = employee?.salary || employee?.hourlyRate * 8 * 20 || 0;
        
        return {
          ...record,
          employeeDetails: employee || {},
          fullName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          department: employee?.department || 'N/A',
          category: employee?.category || 'N/A',
          workType: employee?.workType || 'N/A',
          employeeId: employee?.employeeId || 'N/A',
          salary: employeeSalary,
          dailyPay: employeeSalary / 20,
          overtimePay: record.overtimeHours ? (record.overtimeHours * (employee?.overtimeRate || employee?.hourlyRate * 1.5 || 0)) : 0,
          totalPay: 0
        };
      });

      const dataWithPay = enrichedData.map(record => {
        let totalPay = 0;
        
        if (record.status.includes('Present')) {
          totalPay += record.dailyPay || 0;
        }
        
        if (record.overtimeHours) {
          totalPay += record.overtimePay || 0;
        }
        
        if (record.status === 'Weekend Present' || record.status === 'Holiday Present') {
          totalPay += (record.dailyPay || 0) * 1.5;
        }
        
        if (record.status === 'On Leave' && record.leaveType === 'Paid') {
          totalPay += record.dailyPay || 0;
        }
        
        return {
          ...record,
          totalPay: parseFloat(totalPay.toFixed(2))
        };
      });

      setAttendanceData(dataWithPay);
      setEmployees(employeesData);
      setError("");
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return attendanceData.filter(record => {
      if (filters.startDate && record.date < filters.startDate) return false;
      if (filters.endDate && record.date > filters.endDate) return false;
      
      if (filters.employeeId && record.employee?.id !== filters.employeeId) return false;
      
      if (filters.category && record.employeeDetails?.category !== filters.category) return false;
      
      if (filters.department && record.department !== filters.department) return false;
      
      if (filters.workType && record.workType !== filters.workType) return false;
      
      if (filters.status && record.status !== filters.status) return false;
      
      if (filters.shift && record.shift !== filters.shift) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.fullName.toLowerCase().includes(query) ||
          record.employeeId.toLowerCase().includes(query) ||
          record.department.toLowerCase().includes(query) ||
          record.status.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [attendanceData, filters, searchQuery]);

  const groupedData = useMemo(() => {
    if (viewOptions.groupBy === "date") {
      const groups = {};
      filteredData.forEach(record => {
        if (!groups[record.date]) {
          groups[record.date] = [];
        }
        groups[record.date].push(record);
      });
      return Object.entries(groups).map(([date, records]) => ({
        key: date,
        label: new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        records,
        summary: calculateDateSummary(records)
      }));
    } else if (viewOptions.groupBy === "employee") {
      const groups = {};
      filteredData.forEach(record => {
        const key = record.employee?.id || 'unknown';
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(record);
      });
      return Object.entries(groups).map(([key, records]) => ({
        key,
        label: records[0].fullName,
        records,
        summary: calculateEmployeeSummary(records)
      }));
    } else if (viewOptions.groupBy === "department") {
      const groups = {};
      filteredData.forEach(record => {
        const key = record.department;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(record);
      });
      return Object.entries(groups).map(([key, records]) => ({
        key,
        label: key,
        records,
        summary: calculateDepartmentSummary(records)
      }));
    }
    
    return [];
  }, [filteredData, viewOptions.groupBy]);

  const totalPages = Math.ceil(groupedData.length / itemsPerPage);
  const paginatedData = groupedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const overallSummary = useMemo(() => {
    return calculateOverallSummary(filteredData);
  }, [filteredData]);

  function calculateDateSummary(records) {
    const present = records.filter(r => r.status.includes('Present')).length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const leave = records.filter(r => r.status === 'On Leave').length;
    const totalHours = records.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    const totalPay = records.reduce((sum, r) => sum + (r.totalPay || 0), 0);
    
    return { present, absent, late, leave, totalHours, totalEmployees: records.length, totalPay };
  }

  function calculateEmployeeSummary(records) {
    const presentDays = records.filter(r => r.status.includes('Present')).length;
    const absentDays = records.filter(r => r.status === 'Absent').length;
    const lateDays = records.filter(r => r.status === 'Late').length;
    const totalHours = records.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    const totalPay = records.reduce((sum, r) => sum + (r.totalPay || 0), 0);
    const avgHours = records.length > 0 ? totalHours / records.length : 0;
    
    return { presentDays, absentDays, lateDays, totalHours, avgHours, totalDays: records.length, totalPay };
  }

  function calculateDepartmentSummary(records) {
    const employees = [...new Set(records.map(r => r.employee?.id))].length;
    const present = records.filter(r => r.status.includes('Present')).length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const totalHours = records.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    const totalPay = records.reduce((sum, r) => sum + (r.totalPay || 0), 0);
    const attendanceRate = records.length > 0 ? (present / records.length) * 100 : 0;
    
    return { employees, present, absent, totalHours, attendanceRate, totalRecords: records.length, totalPay };
  }

  function calculateOverallSummary(allRecords) {
    const totalRecords = allRecords.length;
    const totalEmployees = [...new Set(allRecords.map(r => r.employee?.id))].length;
    const totalDepartments = [...new Set(allRecords.map(r => r.department))].length;
    const totalPay = allRecords.reduce((sum, r) => sum + (r.totalPay || 0), 0);
    const late = allRecords.filter(r => r.status === 'Late').length;
    
    const statusCounts = {
  Present: allRecords.filter(r => r.status.includes('Present')).length,
  Absent: allRecords.filter(r => r.status === 'Absent').length,
  Late: late,
  'On Leave': allRecords.filter(r => r.status === 'On Leave').length
};
    
    const totalHours = allRecords.reduce((sum, r) => sum + (r.minimumHour || 0), 0);
    const avgHours = totalRecords > 0 ? totalHours / totalRecords : 0;
    const avgPay = totalEmployees > 0 ? totalPay / totalEmployees : 0;
    
    const attendanceRate = totalRecords > 0 ? (statusCounts.Present / totalRecords) * 100 : 0;
    
    const deptBreakdown = {};
    allRecords.forEach(record => {
      if (!deptBreakdown[record.department]) {
        deptBreakdown[record.department] = { present: 0, total: 0, totalPay: 0 };
      }
      deptBreakdown[record.department].total++;
      deptBreakdown[record.department].totalPay += record.totalPay || 0;
      if (record.status.includes('Present')) {
        deptBreakdown[record.department].present++;
      }
    });
    
    const categoryBreakdown = {};
    allRecords.forEach(record => {
      if (!categoryBreakdown[record.category]) {
        categoryBreakdown[record.category] = { present: 0, total: 0, totalPay: 0 };
      }
      categoryBreakdown[record.category].total++;
      categoryBreakdown[record.category].totalPay += record.totalPay || 0;
      if (record.status.includes('Present')) {
        categoryBreakdown[record.category].present++;
      }
    });
    
    return {
      totalRecords,
      totalEmployees,
      totalDepartments,
      statusCounts,
      totalHours,
      totalPay,
      avgHours,
      avgPay,
      attendanceRate,
      deptBreakdown,
      categoryBreakdown
    };
  }

  const toggleRow = (key) => {
    if (expandedRows.includes(key)) {
      setExpandedRows(expandedRows.filter(k => k !== key));
    } else {
      setExpandedRows([...expandedRows, key]);
    }
  };

  const handleRowClick = (group) => {
    if (viewOptions.groupBy === 'date') {
      window.location.href = `/attendance?date=${group.key}`;
    } else if (viewOptions.groupBy === 'employee') {
      window.location.href = `/employee/${group.key}`;
    } else if (viewOptions.groupBy === 'department') {
      window.location.href = `/attendance?department=${encodeURIComponent(group.label)}`;
    }
  };

  const exportToExcel = () => {
    const wsData = [
      ['Attendance Report - Ghana Cedis (GHS)', 'Generated', new Date().toLocaleDateString()],
      [''],
      ['Overall Summary', '', ''],
      ['Total Records', overallSummary.totalRecords],
      ['Total Employees', overallSummary.totalEmployees],
      ['Total Hours', overallSummary.totalHours.toFixed(2)],
      ['Total Payroll Cost', formatCurrency(overallSummary.totalPay)],
      ['Average Salary per Employee', formatCurrency(overallSummary.avgPay)],
      ['Attendance Rate', `${overallSummary.attendanceRate.toFixed(1)}%`],
      [''],
      ['Status Breakdown', '', ''],
      ['Present', overallSummary.statusCounts.Present],
      ['Absent', overallSummary.statusCounts.Absent],
      ['Late', overallSummary.statusCounts.Late],
      ['On Leave', overallSummary.statusCounts['On Leave']],
      [''],
      ['Department Breakdown', '', '', ''],
      ['Department', 'Employees', 'Attendance Rate', 'Payroll Cost']
    ];

    Object.entries(overallSummary.deptBreakdown).forEach(([dept, data]) => {
      const rate = data.total > 0 ? (data.present / data.total) * 100 : 0;
      wsData.push([dept, data.total, `${rate.toFixed(1)}%`, formatCurrency(data.totalPay)]);
    });

    wsData.push(['', '', '', '']);
wsData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
wsData.push(['Date', 'Employee ID', 'Employee Name', 'Department', 'Category', 'Check In', 'Check Out', 'Hours', 'Status', 'Late', 'Shift', 'Pay (GHS)']);


    filteredData.forEach(record => {
      wsData.push([
        record.date,
        record.employeeId,
        record.fullName,
        record.department,
        record.category,
        record.checkIn || '--:--',
        record.checkOut || '--:--',
        record.minimumHour || 0,
        record.status,
        isLate ? 'Yes' : 'No',
        record.shift,
        record.totalPay || 0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    
    const wscols = [
      { wch: 12 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 }
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setSuccess("Report exported successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const exportToPDF = () => {
    window.print();
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      employeeId: "",
      category: "",
      department: "",
      workType: "",
      status: "",
      shift: ""
    });
    setSearchQuery("");
    setCurrentPage(1);
  };

  const uniqueCategories = [...new Set(employees.map(e => e.category))].filter(Boolean);
  const uniqueDepartments = [...new Set(employees.map(e => e.department))].filter(Boolean);
  const uniqueWorkTypes = [...new Set(employees.map(e => e.workType))].filter(Boolean);
  const uniqueStatuses = ['Present', 'Absent', 'Late', 'On Leave', 'Weekend Present', 'Holiday Present'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Report (GHS)</h1>
              <p className="text-gray-600">Comprehensive attendance analysis and reporting in Ghana Cedis</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Printer size={18} />
                Print
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download size={18} />
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Filter size={20} />
              Filters & Search
            </h2>
            <button
              onClick={resetFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Reset All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({...filters, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
              <select
                value={filters.workType}
                onChange={(e) => setFilters({...filters, workType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Work Types</option>
                {uniqueWorkTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select
                value={filters.shift}
                onChange={(e) => setFilters({...filters, shift: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Shifts</option>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={filters.employeeId}
                onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, employee ID, department, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">View Options</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
              <select
                value={viewOptions.groupBy}
                onChange={(e) => setViewOptions({...viewOptions, groupBy: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Date</option>
                <option value="employee">Employee</option>
                <option value="department">Department</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showDetails"
                checked={viewOptions.showDetails}
                onChange={(e) => setViewOptions({...viewOptions, showDetails: e.target.checked})}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="showDetails" className="text-sm text-gray-700">
                Show Details
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showSummary"
                checked={viewOptions.showSummary}
                onChange={(e) => setViewOptions({...viewOptions, showSummary: e.target.checked})}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="showSummary" className="text-sm text-gray-700">
                Show Summary
              </label>
            </div>
          </div>
        </div>

        {viewOptions.showSummary && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Overall Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{overallSummary.totalRecords}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{overallSummary.totalEmployees}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{overallSummary.totalHours.toFixed(2)}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-amber-600">Total Payroll</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(overallSummary.totalPay)}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-indigo-600">Avg Salary</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(overallSummary.avgPay)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{overallSummary.totalDepartments}</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Status Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(overallSummary.statusCounts).map(([status, count]) => (
  <div key={status} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
    <span className={`w-2 h-2 rounded-full ${
      status === 'Present' ? 'bg-green-500' :
      status === 'Absent' ? 'bg-red-500' :
      status === 'Late' ? 'bg-yellow-500' :
      'bg-blue-500'
    }`}></span>
    <span className="text-sm text-gray-700">{status}:</span>
    <span className="font-medium">{count}</span>
    <span className="text-sm text-gray-500">
      ({((count / overallSummary.totalRecords) * 100).toFixed(1)}%)
    </span>
  </div>
))}
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
  <p className="text-sm text-yellow-600">Late Arrivals</p>
  <p className="text-2xl font-bold text-gray-900">
    {overallSummary.statusCounts.Late || 0}
  </p>
  <p className="text-xs text-yellow-500 mt-1">
    {overallSummary.totalRecords > 0 
      ? `${((overallSummary.statusCounts.Late / overallSummary.totalRecords) * 100).toFixed(1)}% of total`
      : '0%'
    }
  </p>
</div>

            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Department Performance</h4>
              <div className="space-y-2">
                {Object.entries(overallSummary.deptBreakdown).map(([dept, data]) => {
                  const rate = data.total > 0 ? (data.present / data.total) * 100 : 0;
                  return (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{dept}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {data.present}/{data.total} ({rate.toFixed(1)}%)
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(data.totalPay)}
                        </span>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500"
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {viewOptions.groupBy === 'date' ? 'Date' : 
                         viewOptions.groupBy === 'employee' ? 'Employee' : 'Department'}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Summary
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payroll Cost (GHS)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((group) => (
                      <>
                        <tr key={group.key} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(group)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRow(group.key);
                                }}
                                className="mr-2 text-gray-500 hover:text-gray-700"
                              >
                                {expandedRows.includes(group.key) ? (
                                  <ChevronUp size={20} />
                                ) : (
                                  <ChevronDown size={20} />
                                )}
                              </button>
                              <div>
                                <div className="font-medium text-gray-900">{group.label}</div>
                                <div className="text-sm text-gray-500">
                                  {group.records.length} record{group.records.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {viewOptions.groupBy === 'date' && (
                                <>
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                    {group.summary.present} Present
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                    {group.summary.absent} Absent
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
                                    {group.summary.late} Late
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    {group.summary.totalHours.toFixed(1)} hrs
                                  </span>
                                </>
                              )}
                              {viewOptions.groupBy === 'employee' && (
                                <>
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                    {group.summary.presentDays} Days Present
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    {group.summary.avgHours.toFixed(1)} avg hrs
                                  </span>
                                </>
                              )}
                              {viewOptions.groupBy === 'department' && (
                                <>
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                    {group.summary.employees} Employees
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    {group.summary.totalHours.toFixed(1)} hrs
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                    {group.summary.attendanceRate.toFixed(1)}% Rate
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-green-600">
                              {formatCurrency(group.summary.totalPay || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(group.key);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              {expandedRows.includes(group.key) ? 'Hide Details' : 'Show Details'}
                            </button>
                          </td>
                        </tr>
                        
                        {expandedRows.includes(group.key) && viewOptions.showDetails && (
                          <tr>
                            <td colSpan="4" className="px-6 py-4 bg-gray-50">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead>
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Employee</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Check In</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Check Out</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Hours</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Shift</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pay (GHS)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.records.map((record) => (
                                      <tr key={record.id} className="hover:bg-white">
                                        <td className="px-4 py-2 text-sm">{record.date}</td>
                                        <td className="px-4 py-2 text-sm">
                                          <div className="font-medium">{record.fullName}</div>
                                          <div className="text-xs text-gray-500">{record.employeeId}</div>
                                        </td>
                                        <td className="px-4 py-2 text-sm">{record.checkIn || '--:--'}</td>
                                        <td className="px-4 py-2 text-sm">{record.checkOut || '--:--'}</td>
                                        <td className="px-4 py-2 text-sm">
                                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                            {record.minimumHour || 0} hrs
                                          </span>
                                        </td>
<td className="px-6 py-2 text-sm">
  <span className={`px-2 py-1 text-xs rounded-full ${
    record.status.includes('Present') ? 'bg-green-100 text-green-800' :
    record.status === 'Absent' ? 'bg-red-100 text-red-800' :
    record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
    'bg-blue-100 text-blue-800'
  }`}>
    {record.status}
  </span>
</td>
                                        <td className="px-4 py-2 text-sm">{record.shift}</td>
                                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                                          {formatCurrency(record.totalPay || 0)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, groupedData.length)}
                  </span>{' '}
                  of <span className="font-medium">{groupedData.length}</span> groups
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && filteredData.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or date range to see more results.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reset Filters
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Report generated on {new Date().toLocaleString()} (All amounts in Ghana Cedis - GHS)</p>
          <p className="mt-1">Total records analyzed: {attendanceData.length}</p>
          <p className="mt-1">Total payroll cost: {formatCurrency(overallSummary.totalPay)}</p>
        </div>
      </div>
    </div>
  );
}

export default Report;