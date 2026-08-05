import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { lunchApi } from './services/lunchApi';
import EmployeeWeeklyAssignmentModal from './components/EmployeeWeeklyAssignmentModal';

const EmployeeLunchAssignment = () => {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await lunchApi.getAllEmployees();
      const employeeData = res.data || res || [];
      setEmployees(employeeData);
      setFiltered(employeeData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearch(term);
    const filteredData = employees.filter(emp => {
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      const employeeId = (emp.employeeId || '').toLowerCase();
      const department = (emp.department || emp.category?.name || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      return fullName.includes(term) || 
             employeeId.includes(term) || 
             department.includes(term) ||
             email.includes(term);
    });
    setFiltered(filteredData);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;
      
      switch(key) {
        case 'name':
          aVal = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
          bVal = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
          break;
        case 'employeeId':
          aVal = (a.employeeId || '').toLowerCase();
          bVal = (b.employeeId || '').toLowerCase();
          break;
        case 'department':
          aVal = (a.department || a.category?.name || '').toLowerCase();
          bVal = (b.department || b.category?.name || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'status':
          aVal = (a.lunchStatus || 'Not Assigned');
          bVal = (b.lunchStatus || 'Not Assigned');
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFiltered(sorted);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return <ChevronUpDownIcon className="h-4 w-4 inline ml-1" />;
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedEmployee(null);
  };

  const handleAssignmentSaved = () => {
    fetchEmployees();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'EXPIRED': 'bg-red-100 text-red-800'
    };
    const defaultStatus = 'Not Assigned';
    const badgeClass = statusMap[status] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 text-xs rounded-full ${badgeClass}`}>{status || defaultStatus}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employee Lunch Assignment</h1>
          <p className="text-gray-500">Click on any employee row to assign their weekly meal plan (Mon–Fri)</p>
        </div>
        <div className="text-sm text-gray-500">
          Total Employees: {filtered.length}
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, department, or email..."
            value={search}
            onChange={handleSearch}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <FunnelIcon className="h-5 w-5" />
          Filter
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 border-t border-gray-200"></div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No employees found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Employee
                      <span className="ml-1">{getSortIcon('name')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('employeeId')}
                  >
                    <div className="flex items-center">
                      Employee ID
                      <span className="ml-1">{getSortIcon('employeeId')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center">
                      Department
                      <span className="ml-1">{getSortIcon('department')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      Email
                      <span className="ml-1">{getSortIcon('email')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <span className="ml-1">{getSortIcon('status')}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(emp => {
                  const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                  return (
                    <tr 
                      key={emp.id}
                      onClick={() => handleEmployeeClick(emp)}
                      className="hover:bg-indigo-50 transition cursor-pointer group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              src={emp.photo || '/default-avatar.png'}
                              alt={fullName}
                              className="h-10 w-10 rounded-full object-cover bg-gray-200"
                              onError={(e) => { e.target.src = '/default-avatar.png'; }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {fullName || 'Unnamed'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{emp.employeeId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {emp.department || emp.category?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{emp.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(emp.lunchStatus)}
                        {emp.specialDiet && (
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            {emp.specialDiet}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmployeeClick(emp);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 font-medium opacity-0 group-hover:opacity-100 transition"
                        >
                          Assign Meal
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Optional: Add pagination if needed */}
          {filtered.length > 20 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(20, filtered.length)}</span> of{' '}
                  <span className="font-medium">{filtered.length}</span> employees
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Previous</button>
                  <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && selectedEmployee && (
        <EmployeeWeeklyAssignmentModal
          employee={selectedEmployee}
          onClose={handleModalClose}
          onSaved={handleAssignmentSaved}
        />
      )}
    </div>
  );
};

export default EmployeeLunchAssignment;