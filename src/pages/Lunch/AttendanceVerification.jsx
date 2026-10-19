import { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import EmployeeWeeklyAssignmentModal from './components/EmployeeWeeklyAssignmentModal';
import { attendanceService, lunchApi } from './services/lunchApi';

const toLocalIsoDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const unwrapList = (response) =>
  Array.isArray(response) ? response : response?.data || response?.content || [];

const getEmployeeId = (record) =>
  record?.employee?.id || record?.employeeDto?.id || record?.employeeId;

const getMealName = (assignment) => {
  const meal = assignment?.meal || assignment?.mealDto || assignment?.mealDetails;
  return typeof meal === 'string'
    ? meal
    : meal?.name || assignment?.mealName || assignment?.meal?.mealName || null;
};

const AttendanceVerification = () => {
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [lunchAssignmentMap, setLunchAssignmentMap] = useState({});
  const [selectedDate, setSelectedDate] = useState(toLocalIsoDate());

  // Fetch only the selected date. Loading the full attendance history makes this page slow.
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [attendanceResponse, assignmentsResponse] = await Promise.all([
        attendanceService.getAttendancesByDate(selectedDate),
        lunchApi.getAssignmentsForDate(selectedDate),
      ]);
      const records = unwrapList(attendanceResponse);
      const assignments = unwrapList(assignmentsResponse);
      setFilteredAttendances(records);

      const assignmentMap = {};
      assignments.forEach((assignment) => {
        const employeeId = getEmployeeId(assignment);
        if (!employeeId) return;
        assignmentMap[String(employeeId)] = {
          assigned: Boolean(getMealName(assignment)),
          mealName: getMealName(assignment),
        };
      });
      setLunchAssignmentMap(assignmentMap);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // ===== Refresh all data =====
  const refreshData = useCallback(() => fetchAttendance(), [fetchAttendance]);

  // ===== Initial load and auto-refresh =====
  useEffect(() => {
    fetchAttendance();

    let interval;
    if (autoRefresh && selectedDate === toLocalIsoDate()) {
      interval = setInterval(() => {
        fetchAttendance();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAttendance, selectedDate]);

  // ===== Open modal to assign/edit lunch =====
  const handleAssignLunch = (employee) => {
    setSelectedEmployee(employee);
    setShowAssignmentModal(true);
  };

  const handleModalClose = () => {
    setShowAssignmentModal(false);
    setSelectedEmployee(null);
    // Refresh data after assignment
    fetchAttendance();
  };

  // ===== Prepare data for display =====
  const getEmployeeFromRecord = (record) => {
    return record.employee || { id: null, firstName: 'Unknown', lastName: 'Employee', employeeId: 'N/A', photo: null };
  };

  const getStatusDisplay = (record) => {
    const status = record.status || 'Absent';
    if (status === 'Present' || status === 'Late') return 'Present';
    return 'Absent';
  };

  const isPresent = (record) => {
    return record.status === 'Present' || record.status === 'Late';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance Verification</h1>
          <p className="text-gray-500">Attendance and lunch assignments for the selected date</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            aria-label="Attendance date"
          />
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded-lg text-sm ${autoRefresh ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button onClick={refreshData} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today&apos;s Meal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </td>
              </tr>
            ) : filteredAttendances.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No attendance records for {selectedDate}</td>
              </tr>
            ) : (
              filteredAttendances.map(record => {
                const employee = getEmployeeFromRecord(record);
                const status = getStatusDisplay(record);
                const present = isPresent(record);
                const assignment = lunchAssignmentMap[String(employee.id)];
                const hasLunch = assignment?.assigned || false;
                const mealName = assignment?.mealName || null;

                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={employee.photo || '/default-avatar.png'}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{employee.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {present ? (
                        hasLunch ? (
                          <span className="text-sm text-gray-900">{mealName}</span>
                        ) : (
                          <span className="text-sm text-gray-400">Not assigned</span>
                        )
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {present && (
                        <button
                          onClick={() => handleAssignLunch(employee)}
                          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          {hasLunch ? (
                            <>
                              <PencilIcon className="h-4 w-4" />
                              Edit
                            </>
                          ) : (
                            <>
                              <PlusIcon className="h-4 w-4" />
                              Assign
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAssignmentModal && selectedEmployee && (
        <EmployeeWeeklyAssignmentModal
          employee={selectedEmployee}
          onClose={handleModalClose}
          onSaved={() => {
            handleModalClose();
            refreshData();
          }}
        />
      )}
    </div>
  );
};

export default AttendanceVerification;
