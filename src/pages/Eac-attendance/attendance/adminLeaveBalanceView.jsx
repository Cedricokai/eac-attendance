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
  BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminLeaveBalanceView = ({ apiBaseUrl, getToken }) => {
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
      
      // Extract unique categories and departments - ensure strings
      const uniqueCategories = ['All', ...new Set(
        data
          .map(emp => {
            // Handle if category is an object
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
            // Handle if department is an object
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
      
      // Calculate stats
      calculateStats(data);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchEmployeeBalances();
  }, []);

  useEffect(() => {
    // Apply filters and search
    let filtered = [...employees];
    
    // Category filter - handle object categories
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(emp => {
        let empCategory = emp.category;
        if (empCategory && typeof empCategory === 'object') {
          empCategory = empCategory.name || String(empCategory);
        }
        return String(empCategory) === categoryFilter;
      });
    }
    
    // Department filter - handle object departments
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(emp => {
        let empDept = emp.department;
        if (empDept && typeof empDept === 'object') {
          empDept = empDept.name || String(empDept);
        }
        return String(empDept) === departmentFilter;
      });
    }
    
    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        (emp.firstName?.toLowerCase() || '').includes(term) ||
        (emp.lastName?.toLowerCase() || '').includes(term) ||
        (emp.employeeCode?.toLowerCase() || '').includes(term) ||
        (`${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase()).includes(term)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      // Handle objects for category/department
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (available) => {
    if (available >= 10) return 'text-green-600 bg-green-100';
    if (available >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const exportToExcel = () => {
    const exportData = filteredEmployees.map(emp => ({
      'Employee ID': emp.employeeCode || '',
      'First Name': emp.firstName || '',
      'Last Name': emp.lastName || '',
      'Department': (emp.department && typeof emp.department === 'object') 
        ? (emp.department.name || String(emp.department)) 
        : (emp.department || 'N/A'),
      'Category': (emp.category && typeof emp.category === 'object') 
        ? (emp.category.name || String(emp.category)) 
        : (emp.category || 'N/A'),
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
    
    const fileName = `leave_balances_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  // Helper function to get display value for category/department
  const getDisplayValue = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'object') {
      return value.name || String(value);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Filters */}
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
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Table */}
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
                  </tr>
                  
                  {/* Expanded Row - Leave Type Breakdown */}
                  {expandedEmployee === emp.employeeId && (
                    <tr className="bg-blue-50">
                      <td colSpan="10" className="px-6 py-4">
                        <div className="text-sm">
                          <h4 className="font-medium text-gray-900 mb-3">Leave Type Breakdown</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {emp.leaveTypeBreakdown && Object.entries(emp.leaveTypeBreakdown).map(([type, days], index) => (
                              <div key={`breakdown-${emp.employeeId}-${type}-${index}`} className="bg-white p-3 rounded-lg border border-blue-200">
                                <div className="text-xs text-gray-500">{type}</div>
                                <div className="text-lg font-bold text-blue-700">{days} days</div>
                              </div>
                            ))}
                            {(!emp.leaveTypeBreakdown || Object.keys(emp.leaveTypeBreakdown).length === 0) && (
                              <div className="col-span-4 text-center text-gray-500 py-4">
                                No leave history for this year
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
    </div>
  );
};

export default AdminLeaveBalanceView;