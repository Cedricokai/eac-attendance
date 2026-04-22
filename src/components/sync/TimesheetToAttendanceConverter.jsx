import React, { useState } from 'react';
import { Check, RefreshCw, Calendar } from 'lucide-react';

const TimesheetToAttendanceConverter = ({ 
  timesheets = [], 
  employees = [], 
  settings = {},
  onConvert = () => {}
}) => {
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const determineShift = (checkInTime) => {
    if (!checkInTime) return 'Day';
    const [hours] = checkInTime.split(':').map(Number);
    return hours >= 18 || hours < 6 ? 'Night' : 'Day';
  };

  const convertTimesheetToAttendance = (timesheetRecords, employees, settings) => {
    const attendanceRecords = [];
    
    timesheetRecords.forEach(record => {
      const { employeeId, date, attendanceCode, regularHours, overtimeHours } = record;
      const employee = employees.find(e => e.id === employeeId);
      
      if (!employee) return;
      
      const dateObj = new Date(date);
      
      let status = 'Present';
      if (settings.holidays?.some(h => h.date === date)) {
        if (attendanceCode === 'HP' || attendanceCode === 'P') {
          status = 'Holiday Present';
        } else if (attendanceCode === 'A') {
          status = 'Absent';
        } else if (attendanceCode === 'L') {
          status = 'On Leave';
        } else if (attendanceCode === 'S') {
          status = 'Sick';
        } else {
          status = 'Absent';
        }
      } else if (settings.specialWeekends?.some(s => s.date === date)) {
        if (attendanceCode === 'WP' || attendanceCode === 'P') {
          status = 'Special Weekend Present';
        } else if (attendanceCode === 'A') {
          status = 'Absent';
        } else if (attendanceCode === 'L') {
          status = 'On Leave';
        } else if (attendanceCode === 'S') {
          status = 'Sick';
        } else {
          status = 'Absent';
        }
      } else if (settings.weekendDays?.includes(dateObj.getDay())) {
        if (attendanceCode === 'WP' || attendanceCode === 'P') {
          status = 'Weekend Present';
        } else if (attendanceCode === 'A') {
          status = 'Absent';
        } else if (attendanceCode === 'L') {
          status = 'On Leave';
        } else if (attendanceCode === 'S') {
          status = 'Sick';
        } else {
          status = 'Absent';
        }
      } else {
        if (attendanceCode === 'P') {
          status = 'Present';
        } else if (attendanceCode === 'A') {
          status = 'Absent';
        } else if (attendanceCode === 'L') {
          status = 'On Leave';
        } else if (attendanceCode === 'S') {
          status = 'Sick';
        } else if (attendanceCode === 'WP') {
          status = 'Weekend Present';
        } else if (attendanceCode === 'HP') {
          status = 'Holiday Present';
        } else {
          status = 'Present';
        }
      }
      
      const totalHours = regularHours + overtimeHours;
      const checkIn = '09:00';
      let checkOut = '';
      
      if (totalHours > 0) {
        const endHour = 9 + totalHours;
        checkOut = `${Math.floor(endHour).toString().padStart(2, '0')}:${((endHour % 1) * 60).toString().padStart(2, '0')}`;
      }
      
      const attendanceRecord = {
        employee: { id: employeeId },
        date,
        status,
        minimumHour: regularHours,
        overtime: overtimeHours,
        checkIn: totalHours > 0 ? checkIn : null,
        checkOut: totalHours > 0 ? checkOut : null,
        totalHoursWorked: totalHours,
        shift: determineShift(checkIn),
        workType: 'Regular',
        category: employee.category || 'Default',
        notes: `Converted from timesheet. Code: ${attendanceCode}`
      };
      
      attendanceRecords.push(attendanceRecord);
    });
    
    return attendanceRecords;
  };

  const handleConvert = async () => {
    if (timesheets.length === 0) {
      setError('No timesheet records to convert');
      return;
    }

    setConverting(true);
    setError(null);

    try {
      const attendanceRecords = convertTimesheetToAttendance(timesheets, employees, settings);
      
      if (attendanceRecords.length === 0) {
        throw new Error('No attendance records could be created');
      }

      setResult({
        success: true,
        message: `Converted ${attendanceRecords.length} timesheet records to attendance records`,
        records: attendanceRecords,
        summary: {
          present: attendanceRecords.filter(r => r.status.includes('Present')).length,
          absent: attendanceRecords.filter(r => r.status === 'Absent').length,
          leave: attendanceRecords.filter(r => r.status === 'On Leave').length,
          sick: attendanceRecords.filter(r => r.status === 'Sick').length
        }
      });

      await onConvert(attendanceRecords);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar size={20} />
          Timesheet to Attendance Converter
        </h3>
        <div className="text-sm text-gray-500">
          {timesheets.length} timesheet records
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600">Timesheet Records</div>
            <div className="text-2xl font-bold">{timesheets.length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600">Employees</div>
            <div className="text-2xl font-bold">{employees.length}</div>
          </div>
        </div>

        <button
          onClick={handleConvert}
          disabled={converting || timesheets.length === 0}
          className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
            converting || timesheets.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {converting ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <Check size={20} />
              Convert Timesheets to Attendance
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
            <div className="font-medium">Conversion Error</div>
            <div className="text-sm">{error}</div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg">
            <div className="font-medium flex items-center gap-2">
              <Check size={20} />
              {result.message}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="text-sm">Present: {result.summary.present}</div>
              <div className="text-sm">Absent: {result.summary.absent}</div>
              <div className="text-sm">Leave: {result.summary.leave}</div>
              <div className="text-sm">Sick: {result.summary.sick}</div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 mt-4">
          <div className="font-medium mb-1">Conversion Rules:</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Timesheet code 'P' → 'Present' on weekdays</li>
            <li>Timesheet code 'WP' → 'Weekend Present'</li>
            <li>Timesheet code 'HP' → 'Holiday Present'</li>
            <li>Timesheet code 'A' → 'Absent'</li>
            <li>Timesheet code 'L' → 'On Leave'</li>
            <li>Timesheet code 'S' → 'Sick'</li>
            <li>Check-in time set to 09:00 for present days</li>
            <li>Check-out calculated based on total hours</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TimesheetToAttendanceConverter;