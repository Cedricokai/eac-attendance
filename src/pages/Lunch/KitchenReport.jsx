// src/pages/Lunch/KitchenReport.jsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { attendanceService, lunchApi } from './services/lunchApi';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const toLocalIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (dateValue, numberOfDays) => {
  const date = typeof dateValue === 'string'
    ? parseLocalDate(dateValue)
    : new Date(dateValue);

  date.setDate(date.getDate() + numberOfDays);
  return date;
};

const getMonday = (dateValue = new Date()) => {
  const date = typeof dateValue === 'string'
    ? parseLocalDate(dateValue)
    : new Date(dateValue);

  const day = date.getDay();
  const difference = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + difference);
  return toLocalIsoDate(date);
};

const getWeekDates = (weekStart) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      date: toLocalIsoDate(date),
      dayName: DAY_NAMES[date.getDay()],
      shortDayName: DAY_NAMES[date.getDay()].slice(0, 3),
    };
  });

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data?.content)) return response.data.content;
  return [];
};

const getEmployeeFromRecord = (record) =>
  record?.employee || record?.employeeDto || null;

const getMealFromAssignment = (assignment) =>
  assignment?.meal || assignment?.mealDto || null;

const isPresentAttendance = (attendance) => {
  const status = String(attendance?.status || '').toLowerCase();
  const hasCheckIn = Boolean(
    attendance?.checkIn &&
    attendance.checkIn !== '--:--'
  );

  return (
    hasCheckIn ||
    status === 'present' ||
    status === 'late' ||
    status === 'holiday present' ||
    status === 'weekend present'
  );
};

const KitchenReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekStart, setWeekStart] = useState(getMonday());
  const [weeklyRecords, setWeeklyRecords] = useState([]);
  const [filter, setFilter] = useState({ department: '', search: '' });

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = weekDates[6]?.date || weekStart;

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dailyResponses = await Promise.all(
        weekDates.map(async ({ date, dayName, shortDayName }) => {
          const [attendanceResponse, assignmentResponse, servedResponse] =
            await Promise.all([
              attendanceService.getAttendancesByDate(date),
              lunchApi.getAssignmentsForDate(date),
              lunchApi.getTodayServed(date),
            ]);

          return {
            date,
            dayName,
            shortDayName,
            attendance: unwrapList(attendanceResponse),
            assignments: unwrapList(assignmentResponse),
            servedRecords: unwrapList(servedResponse),
          };
        })
      );

      setWeeklyRecords(dailyResponses);
    } catch (err) {
      console.error('Error fetching weekly kitchen data:', err);
      setError(err.message || 'Failed to load weekly kitchen data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  const allRows = useMemo(() => {
    return weeklyRecords.flatMap((dailyRecord) => {
      const assignmentMap = new Map();
      dailyRecord.assignments.forEach((assignment) => {
        const employee = getEmployeeFromRecord(assignment);
        if (employee?.id != null) {
          assignmentMap.set(String(employee.id), assignment);
        }
      });

      const servedMap = new Map();
      dailyRecord.servedRecords.forEach((servedRecord) => {
        const employee = getEmployeeFromRecord(servedRecord);
        if (employee?.id != null) {
          servedMap.set(String(employee.id), servedRecord);
        }
      });

      return dailyRecord.attendance
        .map((attendance) => {
          const employee = getEmployeeFromRecord(attendance);
          if (!employee?.id || !isPresentAttendance(attendance)) return null;

          const assignment = assignmentMap.get(String(employee.id));
          const servedRecord = servedMap.get(String(employee.id));
          const meal = getMealFromAssignment(assignment);

          return {
            rowKey: `${dailyRecord.date}-${employee.id}`,
            date: dailyRecord.date,
            dayName: dailyRecord.dayName,
            shortDayName: dailyRecord.shortDayName,
            employeeId: employee.id,
            employeeName:
              `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
              'Unnamed',
            employeeIdNumber:
              employee.employeeNumber || employee.employeeId || 'N/A',
            department:
              employee.department || employee.category?.name || 'N/A',
            checkInTime: attendance.checkIn || '--:--',
            mealAssigned: meal?.name || 'Not Assigned',
            mealId: meal?.id || null,
            served: Boolean(servedRecord),
            servedTime:
              servedRecord?.servingTime ||
              servedRecord?.servedAt ||
              servedRecord?.createdAt ||
              null,
          };
        })
        .filter(Boolean);
    });
  }, [weeklyRecords]);

  const reportData = useMemo(() => {
    let rows = allRows;

    if (filter.department) {
      rows = rows.filter((row) => row.department === filter.department);
    }

    if (filter.search.trim()) {
      const searchTerm = filter.search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.employeeName.toLowerCase().includes(searchTerm) ||
          String(row.employeeIdNumber).toLowerCase().includes(searchTerm)
      );
    }

    return rows;
  }, [allRows, filter]);

  const mealSummary = useMemo(() => {
    const summaryMap = new Map();

    reportData.forEach((row) => {
      if (row.mealAssigned === 'Not Assigned') return;

      if (!summaryMap.has(row.mealAssigned)) {
        summaryMap.set(row.mealAssigned, {
          meal: row.mealAssigned,
          totalAssigned: 0,
          totalServed: 0,
          uniqueEmployees: new Set(),
          days: Object.fromEntries(
            weekDates.map(({ date, shortDayName }) => [date, {
              label: shortDayName,
              assigned: 0,
              served: 0,
            }])
          ),
        });
      }

      const meal = summaryMap.get(row.mealAssigned);
      meal.totalAssigned += 1;
      meal.uniqueEmployees.add(String(row.employeeId));

      if (row.served) {
        meal.totalServed += 1;
      }

      if (meal.days[row.date]) {
        meal.days[row.date].assigned += 1;
        if (row.served) {
          meal.days[row.date].served += 1;
        }
      }
    });

    return Array.from(summaryMap.values())
      .map((item) => ({
        meal: item.meal,
        totalAssigned: item.totalAssigned,
        totalServed: item.totalServed,
        remaining: item.totalAssigned - item.totalServed,
        uniqueWorkers: item.uniqueEmployees.size,
        days: item.days,
      }))
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [reportData, weekDates]);

  const dailySummary = useMemo(() => {
    return weekDates.map(({ date, dayName, shortDayName }) => {
      const rows = reportData.filter((row) => row.date === date);
      const assigned = rows.filter(
        (row) => row.mealAssigned !== 'Not Assigned'
      ).length;
      const served = rows.filter((row) => row.served).length;

      return {
        date,
        dayName,
        shortDayName,
        present: rows.length,
        assigned,
        served,
        notAssigned: rows.length - assigned,
      };
    });
  }, [reportData, weekDates]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        allRows
          .map((row) => row.department)
          .filter((department) => department && department !== 'N/A')
      )
    ).sort();
  }, [allRows]);

  const totalPresentEntries = reportData.length;
  const totalAssigned = reportData.filter(
    (row) => row.mealAssigned !== 'Not Assigned'
  ).length;
  const totalServed = reportData.filter((row) => row.served).length;
  const totalRemaining = totalAssigned - totalServed;
  const uniqueWorkers = new Set(
    reportData.map((row) => String(row.employeeId))
  ).size;

  const changeWeek = (numberOfDays) => {
    setWeekStart(toLocalIsoDate(addDays(weekStart, numberOfDays)));
  };

  const handleExportCsv = () => {
    const rows = [];

    rows.push(['WEEKLY KITCHEN FOOD BUDGET REPORT']);
    rows.push(['Week Start', weekStart, 'Week End', weekEnd]);
    rows.push([]);

    rows.push([
      'Meal',
      ...weekDates.map(({ shortDayName }) => shortDayName),
      'Weekly Portions',
      'Unique Workers',
      'Served',
      'Remaining',
    ]);

    mealSummary.forEach((item) => {
      rows.push([
        item.meal,
        ...weekDates.map(({ date }) => item.days[date]?.assigned || 0),
        item.totalAssigned,
        item.uniqueWorkers,
        item.totalServed,
        item.remaining,
      ]);
    });

    rows.push([]);
    rows.push([
      'Date',
      'Day',
      'Employee',
      'Employee ID',
      'Department',
      'Check In',
      'Meal Assigned',
      'Served',
      'Served Time',
    ]);

    reportData.forEach((row) => {
      rows.push([
        row.date,
        row.dayName,
        row.employeeName,
        row.employeeIdNumber,
        row.department,
        row.checkInTime,
        row.mealAssigned,
        row.served ? 'Yes' : 'No',
        row.servedTime
          ? new Date(row.servedTime).toLocaleTimeString()
          : '--:--',
      ]);
    });

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `kitchen_weekly_report_${weekStart}_to_${weekEnd}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Weekly Kitchen Food Budget Report
          </h1>
          <p className="text-gray-500">
            Total workers and portions required for each meal from {weekStart} to{' '}
            {weekEnd}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
          >
            <PrinterIcon className="h-5 w-5" />
            Print
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
        <button
          type="button"
          onClick={() => changeWeek(-7)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Previous Week
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Week Starting Monday
          </label>
          <div className="relative mt-1">
            <CalendarDaysIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(getMonday(event.target.value))}
              className="block w-52 rounded-md border-gray-300 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => changeWeek(7)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Next Week
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Department
          </label>
          <select
            value={filter.department}
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                department: event.target.value,
              }))
            }
            className="mt-1 block w-52 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Search Employee
          </label>
          <div className="relative mt-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Name or employee ID"
              value={filter.search}
              onChange={(event) =>
                setFilter((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              className="block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-white transition hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unique Workers</p>
          <p className="text-2xl font-bold text-gray-800">{uniqueWorkers}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Weekly Attendance Entries</p>
          <p className="text-2xl font-bold text-gray-800">
            {totalPresentEntries}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Required Food Portions</p>
          <p className="text-2xl font-bold text-indigo-600">{totalAssigned}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Served Portions</p>
          <p className="text-2xl font-bold text-green-600">{totalServed}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Remaining Portions</p>
          <p className="text-2xl font-bold text-orange-600">
            {totalRemaining}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 h-8 animate-pulse rounded bg-gray-200" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded bg-gray-200"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Food Budget Summary for the Week
            </h2>

            {mealSummary.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
                No meal assignments were found for this week.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Food / Meal
                        </th>
                        {weekDates.map(({ date, shortDayName }) => (
                          <th
                            key={date}
                            className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                          >
                            {shortDayName}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-indigo-600">
                          Weekly Portions
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Unique Workers
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-green-600">
                          Served
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-orange-600">
                          Remaining
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {mealSummary.map((item) => (
                        <tr key={item.meal} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                            {item.meal}
                          </td>

                          {weekDates.map(({ date }) => (
                            <td
                              key={date}
                              className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-700"
                            >
                              {item.days[date]?.assigned || 0}
                            </td>
                          ))}

                          <td className="whitespace-nowrap px-4 py-3 text-center text-lg font-bold text-indigo-600">
                            {item.totalAssigned}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            {item.uniqueWorkers}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-green-600">
                            {item.totalServed}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-orange-600">
                            {item.remaining}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          Daily Totals
                        </td>
                        {dailySummary.map((day) => (
                          <td
                            key={day.date}
                            className="px-4 py-3 text-center text-sm font-bold text-gray-900"
                          >
                            {day.assigned}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center text-lg font-bold text-indigo-700">
                          {totalAssigned}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                          {uniqueWorkers}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-green-700">
                          {totalServed}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-orange-700">
                          {totalRemaining}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Daily Kitchen Totals
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {dailySummary.map((day) => (
                <div
                  key={day.date}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold text-gray-800">{day.dayName}</p>
                  <p className="mb-3 text-xs text-gray-500">{day.date}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Present</span>
                      <span className="font-semibold">{day.present}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Food Portions</span>
                      <span className="font-semibold text-indigo-600">
                        {day.assigned}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Served</span>
                      <span className="font-semibold text-green-600">
                        {day.served}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Not Assigned</span>
                      <span className="font-semibold text-gray-500">
                        {day.notAssigned}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Weekly Employee Meal Details
              </h2>
            </div>

            {reportData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No present employees were found for this week.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Day / Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Check In
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Meal Assigned
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Served
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Served Time
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {reportData.map((row) => (
                      <tr key={row.rowKey} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {row.dayName}
                          </div>
                          <div className="text-xs text-gray-500">{row.date}</div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                              {row.employeeName
                                .split(' ')
                                .filter(Boolean)
                                .map((name) => name[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {row.employeeName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {row.employeeIdNumber}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {row.department}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {row.checkInTime}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {row.mealAssigned !== 'Not Assigned' ? (
                            <span className="font-medium text-green-700">
                              {row.mealAssigned}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not Assigned</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {row.served ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                              ✓ Served
                            </span>
                          ) : row.mealAssigned !== 'Not Assigned' ? (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                              Pending
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {row.servedTime
                            ? new Date(row.servedTime).toLocaleTimeString()
                            : '--:--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col justify-between gap-1 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 sm:flex-row">
              <span>Showing {reportData.length} attendance-meal records</span>
              <span>
                Week: {weekStart} to {weekEnd}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default KitchenReport;