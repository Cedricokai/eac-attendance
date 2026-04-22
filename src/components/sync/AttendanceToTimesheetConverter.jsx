import React, { useState } from 'react';
import { Check, RefreshCw, Calendar } from 'lucide-react';

const AttendanceToTimesheetConverter = ({ 
  attendances = [], 
  employees = [], 
  settings = {},
  onConvert = () => {}
}) => {
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const [inHour, inMinute] = checkIn.split(':').map(Number);
      const [outHour, outMinute] = checkOut.split(':').map(Number);
      
      const totalInMinutes = inHour * 60 + inMinute;
      const totalOutMinutes = outHour * 60 + outMinute;
      
      const diffMinutes = totalOutMinutes - totalInMinutes;
      return (diffMinutes / 60).toFixed(2);
    } catch (e) {
      console.error('Error calculating hours:', e);
      return 0;
    }
  };

  const convertAttendanceToTimesheet = (attendanceRecords, settings) => {
    const timesheetMap = new Map();
    
    attendanceRecords.forEach(record => {
      const { employee, date, checkIn, checkOut, status, minimumHour, overtime } = record;
      const employeeId = employee?.id;
      
      if (!employeeId) return;
      
      const key = `${employeeId}-${date}`;
      
      if (!timesheetMap.has(key)) {
        const dateObj = new Date(date);
        let attendanceCode = 'P';
        
        if (settings.holidays?.some(h => h.date === date)) {
          if (status === 'Holiday Present' || status === 'Present') {
            attendanceCode = 'HP';
          } else if (status === 'Absent') {
            attendanceCode = 'H';
          } else if (status === 'On Leave') {
            attendanceCode = 'L';
          } else if (status === 'Sick') {
            attendanceCode = 'S';
          } else {
            attendanceCode = 'H';
          }
        } else if (settings.specialWeekends?.some(s => s.date === date)) {
          if (status === 'Special Weekend Present' || status === 'Present') {
            attendanceCode = 'WP';
          } else if (status === 'Absent') {
            attendanceCode = 'A';
          } else if (status === 'On Leave') {
            attendanceCode = 'L';
          } else if (status === 'Sick') {
            attendanceCode = 'S';
          } else {
            attendanceCode = 'A';
          }
        } else if (settings.weekendDays?.includes(dateObj.getDay())) {
          if (status === 'Weekend Present' || status === 'Present') {
            attendanceCode = 'WP';
          } else if (status === 'Absent') {
            attendanceCode = 'A';
          } else if (status === 'On Leave') {
            attendanceCode = 'L';
          } else if (status === 'Sick') {
            attendanceCode = 'S';
          } else {
            attendanceCode = 'A';
          }
        } else {
          if (status === 'Present' || status === 'Late') {
            attendanceCode = 'P';
          } else if (status === 'Absent') {
            attendanceCode = 'A';
          } else if (status === 'On Leave') {
            attendanceCode = 'L';
          } else if (status === 'Sick') {
            attendanceCode = 'S';
          } else if (status === 'Holiday Present') {
            attendanceCode = 'HP';
          } else if (status === 'Weekend Present') {
            attendanceCode = 'WP';
          } else {
            attendanceCode = 'P';
          }
        }
        
        timesheetMap.set(key, {
          employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          date,
          regularHours: 0,
          overtimeHours: 0,
          breakHours: 0,
          totalHours: 0,
          earnings: 0,
          status: 'PENDING',
          attendanceCode: attendanceCode,
          details: []
        });
      }
      
      const timesheet = timesheetMap.get(key);
      const totalHours = calculateHours(checkIn, checkOut);
      const regularHours = Math.min(totalHours, minimumHour || 8);
      const overtimeHours = overtime || Math.max(totalHours - (minimumHour || 8), 0);
      
      timesheet.regularHours = regularHours;
      timesheet.overtimeHours = overtimeHours;
      timesheet.totalHours = totalHours;
      
      timesheet.details.push({
        checkIn,
        checkOut,
        attendanceStatus: status,
        calculatedHours: totalHours
      });
    });
    
    return Array.from(timesheetMap.values());
  };

  const handleConvert = async () => {
    if (attendances.length === 0) {
      setError('No attendance records to convert');
      return;
    }

    setConverting(true);
    setError(null);

    try {
      const timesheetRecords = convertAttendanceToTimesheet(attendances, settings);
      
      if (timesheetRecords.length === 0) {
        throw new Error('No timesheet records could be created');
      }

      setResult({
        success: true,
        message: `Converted ${timesheetRecords.length} attendance records to timesheet records`,
        records: timesheetRecords,
        summary: {
          present: timesheetRecords.filter(r => r.attendanceCode === 'P').length,
          absent: timesheetRecords.filter(r => r.attendanceCode === 'A').length,
          leave: timesheetRecords.filter(r => r.attendanceCode === 'L').length,
          sick: timesheetRecords.filter(r => r.attendanceCode === 'S').length,
          weekend: timesheetRecords.filter(r => r.attendanceCode === 'WP').length,
          holiday: timesheetRecords.filter(r => r.attendanceCode === 'HP').length
        }
      });

      await onConvert(timesheetRecords);
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
          Attendance to Timesheet Converter
        </h3>
        <div className="text-sm text-gray-500">
          {attendances.length} attendance records
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600">Attendance Records</div>
            <div className="text-2xl font-bold">{attendances.length}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600">Unique Employees</div>
            <div className="text-2xl font-bold">
              {[...new Set(attendances.map(a => a.employee?.id))].length}
            </div>
          </div>
        </div>

        <button
          onClick={handleConvert}
          disabled={converting || attendances.length === 0}
          className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
            converting || attendances.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
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
              Convert Attendance to Timesheets
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
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="text-sm">Present: {result.summary.present}</div>
              <div className="text-sm">Absent: {result.summary.absent}</div>
              <div className="text-sm">Leave: {result.summary.leave}</div>
              <div className="text-sm">Sick: {result.summary.sick}</div>
              <div className="text-sm">Weekend: {result.summary.weekend}</div>
              <div className="text-sm">Holiday: {result.summary.holiday}</div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 mt-4">
          <div className="font-medium mb-1">Conversion Rules:</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>'Present' → 'P' on weekdays</li>
            <li>'Weekend Present' → 'WP'</li>
            <li>'Holiday Present' → 'HP'</li>
            <li>'Absent' → 'A'</li>
            <li>'On Leave' → 'L'</li>
            <li>'Sick' → 'S'</li>
            <li>Regular hours from minimumHour field</li>
            <li>Overtime hours from overtime field</li>
            <li>Total hours calculated from check-in/out times</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AttendanceToTimesheetConverter;