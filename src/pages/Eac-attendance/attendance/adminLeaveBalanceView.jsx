import React, { useState, useEffect, Fragment } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Filter,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  PieChart,
  BarChart3,
  FileText,
  UserPlus
} from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminLeaveBalanceView = ({ apiBaseUrl, getToken }) => {
  // ==================== STATE DECLARATIONS ====================
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [sortField, setSortField] = useState('lastName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalUsed: 0,
    totalPending: 0,
    avgUsage: 0,
    lowBalanceCount: 0
  });
  
  // ==================== SINGLE EMPLOYEE EXPORT STATE ====================
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedEmployeeForExport, setSelectedEmployeeForExport] = useState(null);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportType, setExportType] = useState('summary');
  const [exporting, setExporting] = useState(false);

  // ==================== HELPER FUNCTIONS ====================
  const getDisplayValue = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'object') {
      return value.name || String(value);
    }
    return String(value);
  };

  // ==================== FETCH EMPLOYEE BALANCES ====================
  const fetchEmployeeBalances = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/leave/admin/employee-balances`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch employee balances');
      
      const data = await response.json();
      setEmployees(data);
      setFilteredEmployees(data);
      
      const uniqueCategories = ['All', ...new Set(
        data
          .map(emp => {
            if (emp.category && typeof emp.category === 'object') {
              return emp.category.name || String(emp.category);
            }
            return emp.category;
          })
          .filter(Boolean)
          .map(cat => String(cat))
      )];
      
      const uniqueDepartments = ['All', ...new Set(
        data
          .map(emp => {
            if (emp.department && typeof emp.department === 'object') {
              return emp.department.name || String(emp.department);
            }
            return emp.department;
          })
          .filter(Boolean)
          .map(dept => String(dept))
      )];
      
      setCategories(uniqueCategories);
      setDepartments(uniqueDepartments);
      
      calculateStats(data);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CALCULATE STATISTICS ====================
  const calculateStats = (data) => {
    const totalUsed = data.reduce((sum, emp) => sum + (emp.usedDays || 0), 0);
    const totalPending = data.reduce((sum, emp) => sum + (emp.pendingDays || 0), 0);
    const lowBalanceCount = data.filter(emp => (emp.availableBalance || 0) < 5).length;
    const avgUsage = data.length > 0 
      ? Math.round((totalUsed / (data.length * 20)) * 100) 
      : 0;

    setStats({
      totalEmployees: data.length,
      totalUsed,
      totalPending,
      avgUsage,
      lowBalanceCount
    });
  };

  // ==================== INITIAL DATA FETCH ====================
  useEffect(() => {
    fetchEmployeeBalances();
  }, []);

  // ==================== APPLY FILTERS AND SEARCH ====================
  useEffect(() => {
    let filtered = [...employees];
    
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(emp => {
        let empCategory = emp.category;
        if (empCategory && typeof empCategory === 'object') {
          empCategory = empCategory.name || String(empCategory);
        }
        return String(empCategory) === categoryFilter;
      });
    }
    
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(emp => {
        let empDept = emp.department;
        if (empDept && typeof empDept === 'object') {
          empDept = empDept.name || String(empDept);
        }
        return String(empDept) === departmentFilter;
      });
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        (emp.firstName?.toLowerCase() || '').includes(term) ||
        (emp.lastName?.toLowerCase() || '').includes(term) ||
        (emp.employeeCode?.toLowerCase() || '').includes(term) ||
        (`${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase()).includes(term)
      );
    }
    
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (sortField === 'category' || sortField === 'department') {
        aVal = aVal && typeof aVal === 'object' ? (aVal.name || String(aVal)) : (aVal || '');
        bVal = bVal && typeof bVal === 'object' ? (bVal.name || String(bVal)) : (bVal || '');
      }
      
      if (sortField === 'usagePercentage' || sortField === 'availableBalance' || 
          sortField === 'usedDays' || sortField === 'pendingDays' || sortField === 'annualBalance') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, departmentFilter, sortField, sortDirection, employees]);

  // ==================== SORTING HANDLER ====================
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ==================== STATUS COLOR HELPER ====================
  const getStatusColor = (available) => {
    if (available >= 10) return 'text-green-600 bg-green-100';
    if (available >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // ==================== EXPORT ALL EMPLOYEES TO EXCEL ====================
  const exportAllToExcel = () => {
    const exportData = filteredEmployees.map(emp => ({
      'Employee ID': emp.employeeCode || '',
      'First Name': emp.firstName || '',
      'Last Name': emp.lastName || '',
      'Department': getDisplayValue(emp.department),
      'Category': getDisplayValue(emp.category),
      'Annual Balance': emp.annualBalance || 20,
      'Used Days': emp.usedDays || 0,
      'Pending Days': emp.pendingDays || 0,
      'Available Balance': emp.availableBalance || 0,
      'Usage %': `${emp.usagePercentage || 0}%`,
      'Status': (emp.availableBalance || 0) >= 10 ? 'Good' : 
                (emp.availableBalance || 0) >= 5 ? 'Warning' : 'Critical'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Balances');
    
    const fileName = `all_leave_balances_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ==================== FETCH EMPLOYEE LEAVE RECORDS ====================
  const fetchEmployeeLeaveRecords = async (employeeId, startDate, endDate) => {
    try {
      const token = getToken();
      const url = `${apiBaseUrl}/api/leave/employee/${employeeId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch leave records');
      
      const allLeaves = await response.json();
      
      let filteredLeaves = allLeaves;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filteredLeaves = allLeaves.filter(leave => {
          const leaveDate = new Date(leave.startDate);
          return leaveDate >= start && leaveDate <= end;
        });
      }
      
      return filteredLeaves;
    } catch (err) {
      console.error('Error fetching leave records:', err);
      throw err;
    }
  };

  // ==================== EXPORT SINGLE EMPLOYEE SUMMARY ====================
  const exportSingleEmployeeSummary = (employee, leaveRecords) => {
    const totalApprovedDays = leaveRecords
      .filter(l => l.status === 'Approved')
      .reduce((sum, l) => sum + (l.deductedDays || 0), 0);
    
    const totalPendingDays = leaveRecords
      .filter(l => l.status === 'Pending')
      .reduce((sum, l) => sum + (l.deductedDays || 0), 0);
    
    const totalRejectedDays = leaveRecords
      .filter(l => l.status === 'Rejected')
      .reduce((sum, l) => sum + (l.deductedDays || 0), 0);
    
    const leaveTypeSummary = {};
    leaveRecords.forEach(record => {
      const type = record.leaveType || 'Unknown';
      if (!leaveTypeSummary[type]) {
        leaveTypeSummary[type] = { approved: 0, pending: 0, rejected: 0, total: 0 };
      }
      if (record.status === 'Approved') leaveTypeSummary[type].approved += (record.deductedDays || 0);
      if (record.status === 'Pending') leaveTypeSummary[type].pending += (record.deductedDays || 0);
      if (record.status === 'Rejected') leaveTypeSummary[type].rejected += (record.deductedDays || 0);
      leaveTypeSummary[type].total += (record.deductedDays || 0);
    });
    
    const summaryData = [
      ['Report Type', 'EMPLOYEE LEAVE SUMMARY REPORT', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['Employee Name', `${employee.firstName || ''} ${employee.lastName || ''}`, 'Employee ID', employee.employeeCode || '', 'Department', getDisplayValue(employee.department)],
      ['Category', getDisplayValue(employee.category), 'Report Date', new Date().toLocaleDateString(), 'Date Range', `${exportDateRange.startDate} to ${exportDateRange.endDate}`],
      ['', '', '', '', '', ''],
      ['Annual Leave Entitlement', employee.annualBalance || 20, 'Days Used This Year', employee.usedDays || 0, 'Days Pending', employee.pendingDays || 0],
      ['Available Balance', employee.availableBalance || 0, 'Usage Percentage', `${employee.usagePercentage || 0}%`, 'Status', (employee.availableBalance || 0) >= 10 ? 'Good' : (employee.availableBalance || 0) >= 5 ? 'Warning' : 'Critical'],
      ['', '', '', '', '', ''],
      ['SUMMARY STATISTICS', '', '', '', '', ''],
      ['Total Approved Days', totalApprovedDays, 'Total Pending Days', totalPendingDays, 'Total Rejected Days', totalRejectedDays],
      ['Total Leave Requests', leaveRecords.length, '', '', '', ''],
      ['', '', '', '', '', ''],
      ['LEAVE TYPE BREAKDOWN', '', '', '', '', ''],
      ['Leave Type', 'Approved Days', 'Pending Days', 'Rejected Days', 'Total Days', '']
    ];
    
    Object.entries(leaveTypeSummary).forEach(([type, data]) => {
      summaryData.push([type, data.approved, data.pending, data.rejected, data.total, '']);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    ws['!cols'] = [{wch:20}, {wch:15}, {wch:15}, {wch:15}, {wch:15}, {wch:15}];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Summary');
    const fileName = `leave_summary_${employee.firstName}_${employee.lastName}_${exportDateRange.startDate}_to_${exportDateRange.endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ==================== EXPORT SINGLE EMPLOYEE DETAILED ====================
  const exportSingleEmployeeDetailed = (employee, leaveRecords) => {
    const detailedData = leaveRecords.map(record => ({
      'Leave ID': record.id || '',
      'Leave Type': record.leaveType || '',
      'Start Date': record.startDate ? new Date(record.startDate).toLocaleDateString() : '',
      'End Date': record.endDate ? new Date(record.endDate).toLocaleDateString() : '',
      'Duration (Days)': record.deductedDays || 0,
      'Reason': record.reason || '',
      'Status': record.status || '',
      'Supervisor Status': record.supervisorStatus || '',
      'Planner Status': record.plannerStatus || '',
      'HR Status': record.hrStatus || '',
      'Submitted Date': record.submittedDate ? new Date(record.submittedDate).toLocaleDateString() : '',
      'Approved/Rejected Date': record.hrActionDate ? new Date(record.hrActionDate).toLocaleDateString() : 
                               record.plannerActionDate ? new Date(record.plannerActionDate).toLocaleDateString() :
                               record.supervisorActionDate ? new Date(record.supervisorActionDate).toLocaleDateString() : '',
      'Weekend Policy': record.weekendCalculationMethod || 'Excluded'
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(detailedData);
    ws['!cols'] = [{wch:10}, {wch:15}, {wch:12}, {wch:12}, {wch:10}, {wch:30}, {wch:12}, {wch:12}, {wch:12}, {wch:10}, {wch:12}, {wch:15}, {wch:12}];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Records');
    const fileName = `leave_records_${employee.firstName}_${employee.lastName}_${exportDateRange.startDate}_to_${exportDateRange.endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ==================== HANDLE SINGLE EMPLOYEE EXPORT ====================
  const handleSingleEmployeeExport = async () => {
    if (!selectedEmployeeForExport) return;
    
    setExporting(true);
    try {
      const leaveRecords = await fetchEmployeeLeaveRecords(
        selectedEmployeeForExport.id,
        exportDateRange.startDate,
        exportDateRange.endDate
      );
      
      if (exportType === 'summary') {
        exportSingleEmployeeSummary(selectedEmployeeForExport, leaveRecords);
      } else {
        exportSingleEmployeeDetailed(selectedEmployeeForExport, leaveRecords);
      }
      
      setShowExportModal(false);
      setSelectedEmployeeForExport(null);
      setExportType('summary');
    } catch (err) {
      setError('Failed to export leave records: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setExporting(false);
    }
  };

  // ==================== OPEN EXPORT MODAL ====================
  const openExportModal = (employee) => {
    setSelectedEmployeeForExport(employee);
    setExportDateRange({
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setExportType('summary');
    setShowExportModal(true);
  };

  // ==================== PAGINATION ====================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  // ==================== SORT ICON COMPONENT ====================
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className="space-y-6">
      {/* Error Message Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow">
          <div className="text-sm opacity-90">Total Employees</div>
          <div className="text-2xl font-bold">{stats.totalEmployees}</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl shadow">
          <div className="text-sm opacity-90">Total Used Days</div>
          <div className="text-2xl font-bold">{stats.totalUsed}</div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-xl shadow">
          <div className="text-sm opacity-90">Total Pending</div>
          <div className="text-2xl font-bold">{stats.totalPending}</div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow">
          <div className="text-sm opacity-90">Avg Usage</div>
          <div className="text-2xl font-bold">{stats.avgUsage}%</div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-xl shadow">
          <div className="text-sm opacity-90">Low Balance</div>
          <div className="text-2xl font-bold">{stats.lowBalanceCount}</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat, index) => (
              <option key={`cat-${index}-${cat}`} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {departments.map((dept, index) => (
              <option key={`dept-${index}-${dept}`} value={dept}>{dept}</option>
            ))}
          </select>
          
          <button
            onClick={exportAllToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Employee Balances Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('lastName')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Employee <SortIcon field="lastName" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('department')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Department <SortIcon field="department" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Category <SortIcon field="category" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('annualBalance')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Annual <SortIcon field="annualBalance" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('usedDays')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Used <SortIcon field="usedDays" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('pendingDays')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Pending <SortIcon field="pendingDays" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('availableBalance')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Available <SortIcon field="availableBalance" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('usagePercentage')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Usage <SortIcon field="usagePercentage" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Export
                </th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEmployees.map((emp) => (
                <Fragment key={emp.employeeId || `emp-${emp.firstName}-${emp.lastName}`}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {emp.firstName || ''} {emp.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">{emp.employeeCode || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDisplayValue(emp.department)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDisplayValue(emp.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {emp.annualBalance || 20}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {emp.usedDays || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-yellow-600">
                      {emp.pendingDays > 0 ? emp.pendingDays : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(emp.availableBalance)}`}>
                        {emp.availableBalance || 0} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${Math.min(emp.usagePercentage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {emp.usagePercentage || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        (emp.availableBalance || 0) >= 10 ? 'bg-green-100 text-green-800' :
                        (emp.availableBalance || 0) >= 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(emp.availableBalance || 0) >= 10 ? 'Good' :
                         (emp.availableBalance || 0) >= 5 ? 'Warning' : 'Critical'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setExpandedEmployee(
                          expandedEmployee === emp.employeeId ? null : emp.employeeId
                        )}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {expandedEmployee === emp.employeeId ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => openExportModal(emp)}
                        className="text-green-600 hover:text-green-800 flex items-center gap-1 mx-auto"
                        title="Export this employee's leave records"
                      >
                        <FileText className="w-5 h-5" />
                        <span className="text-xs">Export</span>
                      </button>
                    </td> */}
                  </tr>
                  
                  {/* Expanded Row - Leave Type Breakdown */}
                  {expandedEmployee === emp.employeeId && (
                    <tr className="bg-blue-50">
                      <td colSpan="11" className="px-6 py-4">
                        <div className="text-sm">
                          <h4 className="font-medium text-gray-900 mb-3">Leave Type Breakdown ({new Date().getFullYear()})</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {emp.leaveTypeBreakdown && Object.entries(emp.leaveTypeBreakdown).map(([type, days]) => (
                              <div key={type} className="bg-white p-3 rounded-lg border border-blue-200">
                                <div className="text-xs text-gray-500">{type}</div>
                                <div className="text-lg font-bold text-blue-700">{days} days</div>
                              </div>
                            ))}
                            {(!emp.leaveTypeBreakdown || Object.keys(emp.leaveTypeBreakdown).length === 0) && (
                              <div className="col-span-4 text-center text-gray-500 py-4">
                                No approved leave records for this year
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredEmployees.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEmployees.length)} of {filteredEmployees.length} employees
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-sm text-gray-600">Employees with Good Balance (&gt;10 days)</div>
              <div className="text-2xl font-bold text-green-700">
                {filteredEmployees.filter(e => (e.availableBalance || 0) >= 10).length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <div className="text-sm text-gray-600">Employees with Warning (5-9 days)</div>
              <div className="text-2xl font-bold text-yellow-700">
                {filteredEmployees.filter(e => {
                  const bal = e.availableBalance || 0;
                  return bal >= 5 && bal < 10;
                }).length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <div className="text-sm text-gray-600">Employees with Critical (&lt;5 days)</div>
              <div className="text-2xl font-bold text-red-700">
                {filteredEmployees.filter(e => (e.availableBalance || 0) < 5).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single Employee Export Modal */}
      {showExportModal && selectedEmployeeForExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Export Leave Records</h3>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setSelectedEmployeeForExport(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Employee: {selectedEmployeeForExport.firstName} {selectedEmployeeForExport.lastName}</p>
                <p className="text-xs text-blue-600 mt-1">ID: {selectedEmployeeForExport.employeeCode || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="summary"
                      checked={exportType === 'summary'}
                      onChange={(e) => setExportType(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Summary Report</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="detailed"
                      checked={exportType === 'detailed'}
                      onChange={(e) => setExportType(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Detailed Records</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={exportDateRange.startDate}
                    onChange={(e) => setExportDateRange({ ...exportDateRange, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={exportDateRange.endDate}
                    onChange={(e) => setExportDateRange({ ...exportDateRange, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-700">
                  <strong>Note:</strong> {exportType === 'summary' 
                    ? 'Summary report includes annual balance, usage statistics, and leave type breakdown.'
                    : 'Detailed report includes all leave requests with dates, statuses, and approval history.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setSelectedEmployeeForExport(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSingleEmployeeExport}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeaveBalanceView;