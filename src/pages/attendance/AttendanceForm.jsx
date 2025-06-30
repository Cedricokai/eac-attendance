import React from 'react';

const AttendanceForm = ({
  isOpen,
  onClose,
  onSubmit,
  newAttendance,
  setNewAttendance,
  globalDate,
  setGlobalDate,
  employees,
  selectAllEmployees,
  setSelectAllEmployees,
  selectedEmployees,
  setSelectedEmployees,
  handleInputChange,
  showExcludedEmployees,
  setShowExcludedEmployees,
  attendances,
  overtimes,
  leaves,
}) => {
  if (!isOpen) return null;

  const handleClearForm = () => {
    setNewAttendance({
      employee: { id: '' },
      shift: '',
      workType: '',
      date: '',
      status: '',
      minimumHour: '',
      checkIn: '',
      checkOut: '',
      overtime: '',
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-white h-[720px] w-[640px] rounded-lg shadow-lg p-6 z-50 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-4">Add Attendance(s)</h1>

        {/* Select All Employees */}
        <div className="flex justify-start gap-12 mb-4">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={selectAllEmployees}
              onChange={(e) => setSelectAllEmployees(e.target.checked)}
              className="w-4 h-4"
            />
            Select All Employees
          </label>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={globalDate}
            onChange={(e) => {
              setGlobalDate(e.target.value);
              setNewAttendance({ ...newAttendance, date: e.target.value });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Employee Select */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee(s)</label>
            <select
              name="employeeId"
              value={selectedEmployees}
              onChange={handleInputChange}
              disabled={selectAllEmployees}
              multiple
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Employees to Exclude
              </label>
              <button
                onClick={() => setShowExcludedEmployees(!showExcludedEmployees)}
                className="text-blue-600 hover:underline text-xs"
              >
                Toggle
              </button>
            </div>
            {showExcludedEmployees && (
              <select
                name="excludedEmployees"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm h-32"
                multiple
                disabled
              >
                {employees
                  .filter((emp) => {
                    const hasAttendance = attendances.some(
                      (a) => a.employee?.id === emp.id && a.date === globalDate
                    );
                    const hasOvertime = overtimes.some(
                      (o) => o.employee?.id === emp.id && o.date === globalDate
                    );
                    const activeLeave = leaves.filter(
                      (l) =>
                        l.employee?.id === emp.id &&
                        new Date(globalDate) >= new Date(l.startDate) &&
                        new Date(globalDate) <= new Date(l.endDate)
                    );
                    return hasAttendance || hasOvertime || activeLeave.length > 0;
                  })
                  .map((emp) => {
                    const activeLeave = leaves.find(
                      (l) =>
                        l.employee?.id === emp.id &&
                        new Date(globalDate) >= new Date(l.startDate) &&
                        new Date(globalDate) <= new Date(l.endDate)
                    );
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                        {activeLeave ? ` (On ${activeLeave.leaveType})` : ''}
                      </option>
                    );
                  })}
              </select>
            )}
          </div>
        </div>

        {/* Time Inputs */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-In</label>
            <input
              type="time"
              value={newAttendance.checkIn}
              onChange={(e) =>
                setNewAttendance({ ...newAttendance, checkIn: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-Out</label>
            <input
              type="time"
              value={newAttendance.checkOut}
              onChange={(e) =>
                setNewAttendance({ ...newAttendance, checkOut: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>
        </div>

        {/* Shift & WorkType */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
            <select
              value={newAttendance.workType}
              onChange={(e) =>
                setNewAttendance({ ...newAttendance, workType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
            >
              <option value="">Select Work Type</option>
              <option value="Regular">Regular</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <select
              name="shift"
              value={newAttendance.shift}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
            >
              <option value="">Select Shift</option>
              <option value="Day">Day</option>
              <option value="Night">Night</option>
            </select>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={newAttendance.status}
            onChange={(e) =>
              setNewAttendance({ ...newAttendance, status: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
          >
            <option value="">Select Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            {['Holiday Present', 'Weekend Present'].includes(newAttendance.status) && (
              <option value={newAttendance.status}>{newAttendance.status}</option>
            )}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onSubmit}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Submit
          </button>
          <button
            onClick={handleClearForm}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
};

export default AttendanceForm;
