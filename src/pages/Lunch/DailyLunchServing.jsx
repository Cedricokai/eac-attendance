// src/pages/Lunch/DailyLunchServing.jsx

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  HomeIcon,
  UserGroupIcon,
  XMarkIcon,
  ArrowPathIcon,
  BellIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  UsersIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import {
  lunchApi,
  attendanceService,
} from './services/lunchApi';

// ============================================================
// LOCATION OPTIONS
// ============================================================

const LOCATIONS = [
  {
    id: 'MKV',
    name: 'MKV',
    icon: HomeIcon,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  {
    id: 'LAYDOWN',
    name: 'LAYDOWN',
    icon: BuildingOfficeIcon,
    color: 'from-green-500 to-green-600',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  {
    id: 'PLANTSITE',
    name: 'Plant Site',
    icon: UserGroupIcon,
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  {
    id: 'SUBIKA',
    name: 'Subika',
    icon: MapPinIcon,
    color: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
];

const DailyLunchServing = () => {
  // ==========================================================
  // PAGE STATES
  // ==========================================================

  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dailyStats, setDailyStats] = useState(null);
  const [apiErrors, setApiErrors] = useState({});

  // ==========================================================
  // DATA STATES
  // ==========================================================

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [servedRecords, setServedRecords] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);

  // ==========================================================
  // SINGLE SERVING STATES
  // ==========================================================

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [servingEmployee, setServingEmployee] = useState(null);
  const [servingError, setServingError] = useState(null);
  const [isServingSingle, setIsServingSingle] = useState(false);

  // ==========================================================
  // BULK SERVING STATES
  // ==========================================================

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showBulkLocationModal, setShowBulkLocationModal] =
    useState(false);

  const [bulkServing, setBulkServing] = useState(false);
  const [bulkServingError, setBulkServingError] = useState(null);

  const [bulkProgress, setBulkProgress] = useState({
    completed: 0,
    total: 0,
    successful: 0,
    failed: 0,
  });

  const [bulkResults, setBulkResults] = useState([]);

  // ==========================================================
  // FETCH DAILY STATS
  // ==========================================================

  const fetchDailyStats = useCallback(async () => {
    try {
      const result = await lunchApi.getDailyServingStats(date);

      if (result?.data) {
        setDailyStats(result.data);
      } else if (result) {
        setDailyStats(result);
      } else {
        setDailyStats(null);
      }
    } catch (err) {
      console.warn(
        'Daily stats endpoint not available, using fallback:',
        err.message
      );

      setDailyStats(null);
    }
  }, [date]);

  // ==========================================================
  // FETCH PAGE DATA
  // ==========================================================

  const fetchData = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);
      setApiErrors({});

      try {
        const employeeResponse = await lunchApi.getAllEmployees();

        const employeeList = Array.isArray(employeeResponse)
          ? employeeResponse
          : employeeResponse?.data || [];

        setAllEmployees(employeeList);

        try {
          const attendanceResponse =
            await attendanceService.getAttendancesByDate(date);

          const attendanceList = Array.isArray(attendanceResponse)
            ? attendanceResponse
            : attendanceResponse?.data || [];

          setAttendanceRecords(attendanceList);
        } catch (attendanceError) {
          console.warn(
            'Attendance fetch failed:',
            attendanceError.message
          );

          setApiErrors((previous) => ({
            ...previous,
            attendance: true,
          }));

          setAttendanceRecords([]);
        }

        try {
          const assignmentResponse =
            await lunchApi.getAssignmentsForDate(date);

          const assignmentList = Array.isArray(assignmentResponse)
            ? assignmentResponse
            : assignmentResponse?.data || [];

          setAssignments(assignmentList);
        } catch (assignmentError) {
          console.warn(
            'Assignments fetch failed:',
            assignmentError.message
          );

          setApiErrors((previous) => ({
            ...previous,
            assignments: true,
          }));

          setAssignments([]);
        }

        try {
          const servedResponse =
            await lunchApi.getTodayServed(date);

          const servedList = Array.isArray(servedResponse)
            ? servedResponse
            : servedResponse?.data || [];

          setServedRecords(servedList);
        } catch (servedError) {
          console.warn(
            'Served records fetch failed:',
            servedError.message
          );

          setApiErrors((previous) => ({
            ...previous,
            served: true,
          }));

          setServedRecords([]);
        }

        await fetchDailyStats();

        setLastUpdated(new Date().toLocaleTimeString());
      } catch (fetchError) {
        console.error(fetchError);
        setError('Failed to load data. Please refresh.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [date, fetchDailyStats]
  );

  // ==========================================================
  // INITIAL LOAD AND AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    fetchData(true);

    let interval;

    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData(false);
      }, 30000);
    }

    return () => clearInterval(interval);
  }, [date, autoRefresh, fetchData]);

  // Clear selected employees whenever the date changes.
  useEffect(() => {
    setSelectedEmployeeIds([]);
    setBulkResults([]);
    setBulkServingError(null);
  }, [date]);

  // ==========================================================
  // MERGE EMPLOYEE, ATTENDANCE, ASSIGNMENT AND SERVING DATA
  // ==========================================================

  const employeeData = useMemo(() => {
    const attendanceMap = {};
    const assignmentMap = {};
    const servedMap = {};

    attendanceRecords.forEach((attendance) => {
      const employeeId =
        attendance.employee?.id || attendance.employeeId;

      if (employeeId) {
        attendanceMap[String(employeeId)] = attendance;
      }
    });

    assignments.forEach((assignment) => {
      const employeeId =
        assignment.employee?.id || assignment.employeeId;

      if (employeeId) {
        assignmentMap[String(employeeId)] = assignment;
      }
    });

    servedRecords.forEach((servedRecord) => {
      const employeeId =
        servedRecord.employee?.id || servedRecord.employeeId;

      if (employeeId) {
        servedMap[String(employeeId)] = servedRecord;
      }
    });

    return allEmployees.map((employee) => {
      const employeeId = String(employee.id);

      const attendance = attendanceMap[employeeId];
      const assignment = assignmentMap[employeeId];
      const servedRecord = servedMap[employeeId];

      const attendanceStatus =
        attendance?.status || 'Absent';

      const hasCheckIn =
        attendance?.checkIn &&
        attendance.checkIn !== '--:--' &&
        attendance.checkIn !== null;

      const isPresent =
        Boolean(hasCheckIn) ||
        attendanceStatus === 'Present' ||
        attendanceStatus === 'Late' ||
        attendanceStatus === 'Holiday Present' ||
        attendanceStatus === 'Weekend Present';

      let mealName = null;

      if (assignment?.meal) {
        mealName =
          typeof assignment.meal === 'object'
            ? assignment.meal.name
            : assignment.meal;
      }

      const canServe =
        isPresent &&
        Boolean(mealName) &&
        !servedRecord;

      return {
        id: employee.id,
        employeeId: employee.employeeId || 'N/A',

        name:
          `${employee.firstName || ''} ${
            employee.lastName || ''
          }`.trim() || 'Unnamed',

        department:
          employee.department ||
          employee.category?.name ||
          'N/A',

        checkIn: attendance?.checkIn || '--:--',
        attendanceStatus,
        isPresent,
        hasAttendance: Boolean(attendance),

        mealAssigned: mealName,
        mealId:
          assignment?.meal?.id ||
          assignment?.mealId ||
          null,

        isServed: Boolean(servedRecord),
        servedTime: servedRecord?.servingTime || null,
        location: servedRecord?.location || null,

        assignmentId: assignment?.id || null,
        canServe,
      };
    });
  }, [
    allEmployees,
    attendanceRecords,
    assignments,
    servedRecords,
  ]);

  // ==========================================================
  // FILTER DATA
  // ==========================================================

  const filteredData = useMemo(() => {
    let data = employeeData;

    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();

      data = data.filter(
        (employee) =>
          employee.name
            .toLowerCase()
            .includes(searchTerm) ||
          employee.employeeId
            .toLowerCase()
            .includes(searchTerm) ||
          employee.department
            .toLowerCase()
            .includes(searchTerm)
      );
    }

    switch (filterStatus) {
      case 'present':
        data = data.filter((employee) => employee.isPresent);
        break;

      case 'absent':
        data = data.filter((employee) => !employee.isPresent);
        break;

      case 'served':
        data = data.filter((employee) => employee.isServed);
        break;

      case 'pending':
        data = data.filter((employee) => employee.canServe);
        break;

      case 'assigned':
        data = data.filter(
          (employee) => employee.mealAssigned
        );
        break;

      case 'not_assigned':
        data = data.filter(
          (employee) => !employee.mealAssigned
        );
        break;

      default:
        break;
    }

    return data;
  }, [employeeData, search, filterStatus]);

  // Employees currently visible and eligible to be served.
  const visibleEligibleEmployees = useMemo(
    () =>
      filteredData.filter(
        (employee) => employee.canServe
      ),
    [filteredData]
  );

  const visibleEligibleEmployeeIds = useMemo(
    () =>
      visibleEligibleEmployees.map(
        (employee) => employee.id
      ),
    [visibleEligibleEmployees]
  );

  const selectedEmployees = useMemo(
    () =>
      employeeData.filter((employee) =>
        selectedEmployeeIds.includes(employee.id)
      ),
    [employeeData, selectedEmployeeIds]
  );

  const allVisibleEligibleSelected =
    visibleEligibleEmployeeIds.length > 0 &&
    visibleEligibleEmployeeIds.every((employeeId) =>
      selectedEmployeeIds.includes(employeeId)
    );

  const someVisibleEligibleSelected =
    visibleEligibleEmployeeIds.some((employeeId) =>
      selectedEmployeeIds.includes(employeeId)
    );

  // ==========================================================
  // LOCATION DISTRIBUTION
  // ==========================================================

  const locationStats = useMemo(() => {
    const statistics = {};

    LOCATIONS.forEach((location) => {
      statistics[location.id] = {
        assigned: 0,
        served: 0,
        remaining: 0,
      };
    });

    employeeData.forEach((employee) => {
      if (employee.mealAssigned && employee.isPresent) {
        const servingLocation =
          employee.location || 'MKV';

        if (statistics[servingLocation]) {
          statistics[servingLocation].assigned += 1;

          if (employee.isServed) {
            statistics[servingLocation].served += 1;
          }
        }
      }
    });

    Object.keys(statistics).forEach((locationId) => {
      statistics[locationId].remaining =
        statistics[locationId].assigned -
        statistics[locationId].served;
    });

    return statistics;
  }, [employeeData]);

  // ==========================================================
  // SUMMARY STATISTICS
  // ==========================================================

  const totalEmployees = employeeData.length;

  const presentCount = employeeData.filter(
    (employee) => employee.isPresent
  ).length;

  const absentCount = totalEmployees - presentCount;

  const servedCount = employeeData.filter(
    (employee) => employee.isServed
  ).length;

  const assignedCount = employeeData.filter(
    (employee) => employee.mealAssigned
  ).length;

  const pendingCount = employeeData.filter(
    (employee) => employee.canServe
  ).length;

  const completionPercentage =
    assignedCount > 0
      ? Math.round((servedCount / assignedCount) * 100)
      : 0;

  // ==========================================================
  // GENERAL HANDLERS
  // ==========================================================

  const handleDateChange = (event) => {
    setDate(event.target.value);
  };

  const handleManualRefresh = () => {
    fetchData(false);
  };

  const isToday =
    date === new Date().toISOString().split('T')[0];

  // ==========================================================
  // SINGLE SERVING HANDLERS
  // ==========================================================

  const handleServeClick = (employee) => {
    setServingEmployee(employee);
    setServingError(null);
    setShowLocationModal(true);
  };

  const closeSingleServingModal = () => {
    if (isServingSingle) {
      return;
    }

    setShowLocationModal(false);
    setServingEmployee(null);
    setServingError(null);
  };

  const handleServeWithLocation = async (locationId) => {
    if (!servingEmployee || isServingSingle) {
      return;
    }

    setServingError(null);
    setIsServingSingle(true);

    try {
      const payload = {
        employeeId: servingEmployee.id,
        lunchDate: date,
        location: locationId,
        device: 'web',
        remarks: `Served at ${locationId}`,
      };

      console.log('📤 Serving payload:', payload);

      await lunchApi.serveLunch(payload);

      setShowLocationModal(false);
      setServingEmployee(null);

      await fetchData(false);
    } catch (serveError) {
      console.error('❌ Serve error:', serveError);

      setServingError(
        serveError.message ||
          'Unknown error occurred while serving lunch.'
      );
    } finally {
      setIsServingSingle(false);
    }
  };

  // ==========================================================
  // BULK SELECTION HANDLERS
  // ==========================================================

  const handleToggleEmployee = (employee) => {
    if (!employee.canServe || bulkServing) {
      return;
    }

    setSelectedEmployeeIds((previousIds) => {
      if (previousIds.includes(employee.id)) {
        return previousIds.filter(
          (employeeId) => employeeId !== employee.id
        );
      }

      return [...previousIds, employee.id];
    });
  };

  const handleSelectAllVisible = () => {
    if (bulkServing) {
      return;
    }

    setSelectedEmployeeIds((previousIds) => {
      if (allVisibleEligibleSelected) {
        return previousIds.filter(
          (employeeId) =>
            !visibleEligibleEmployeeIds.includes(employeeId)
        );
      }

      return Array.from(
        new Set([
          ...previousIds,
          ...visibleEligibleEmployeeIds,
        ])
      );
    });
  };

  const handleClearSelection = () => {
    if (bulkServing) {
      return;
    }

    setSelectedEmployeeIds([]);
    setBulkResults([]);
    setBulkServingError(null);
  };

  const openBulkLocationModal = () => {
    if (
      selectedEmployeeIds.length === 0 ||
      bulkServing
    ) {
      return;
    }

    setBulkServingError(null);
    setBulkResults([]);

    setBulkProgress({
      completed: 0,
      total: selectedEmployeeIds.length,
      successful: 0,
      failed: 0,
    });

    setShowBulkLocationModal(true);
  };

  const closeBulkLocationModal = () => {
    if (bulkServing) {
      return;
    }

    setShowBulkLocationModal(false);
    setBulkServingError(null);
  };

  // ==========================================================
  // BULK SERVING
  // ==========================================================

  const handleBulkServeWithLocation = async (
    locationId
  ) => {
    if (
      bulkServing ||
      selectedEmployees.length === 0
    ) {
      return;
    }

    setBulkServing(true);
    setBulkServingError(null);
    setBulkResults([]);

    setBulkProgress({
      completed: 0,
      total: selectedEmployees.length,
      successful: 0,
      failed: 0,
    });

    const results = [];

    let successful = 0;
    let failed = 0;

    /*
     * Existing backend logic is preserved.
     * One request is sent to the existing serveLunch endpoint
     * for every selected employee.
     */
    for (let index = 0; index < selectedEmployees.length; index += 1) {
      const employee = selectedEmployees[index];

      const payload = {
        employeeId: employee.id,
        lunchDate: date,
        location: locationId,
        device: 'web',
        remarks: `Bulk served at ${locationId}`,
      };

      try {
        await lunchApi.serveLunch(payload);

        successful += 1;

        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          success: true,
          message: 'Served successfully',
        });
      } catch (serveError) {
        failed += 1;

        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          success: false,
          message:
            serveError.message ||
            'Unable to serve employee',
        });
      }

      setBulkProgress({
        completed: index + 1,
        total: selectedEmployees.length,
        successful,
        failed,
      });
    }

    setBulkResults(results);
    setBulkServing(false);

    await fetchData(false);

    const failedEmployeeIds = results
      .filter((result) => !result.success)
      .map((result) => result.employeeId);

    setSelectedEmployeeIds(failedEmployeeIds);

    if (failed === 0) {
      setShowBulkLocationModal(false);
      setSelectedEmployeeIds([]);
    } else {
      setBulkServingError(
        `${failed} employee${
          failed === 1 ? '' : 's'
        } could not be served. Review the results below.`
      );
    }
  };

  // ==========================================================
  // UI HELPERS
  // ==========================================================

  const getLocation = (locationId) =>
    LOCATIONS.find(
      (location) => location.id === locationId
    );

  const getLocationBg = (locationId) => {
    const location = getLocation(locationId);

    return location
      ? `${location.bg} ${location.text} ${location.border}`
      : 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getEmployeeInitials = (name) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <UsersIcon className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Daily Lunch Serving
                </h1>

                <p className="text-sm text-gray-500">
                  Verify attendance and serve meals individually
                  or in bulk.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isToday && (
              <button
                type="button"
                onClick={() =>
                  setAutoRefresh((previous) => !previous)
                }
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <BellIcon className="h-4 w-4" />

                {autoRefresh
                  ? 'Auto refresh on'
                  : 'Auto refresh off'}
              </button>
            )}

            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />

              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        {lastUpdated && (
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400">
            <ClockIcon className="h-4 w-4" />
            Last updated at {lastUpdated}
          </div>
        )}
      </div>

      {/* ======================================================
          API WARNING
      ======================================================= */}

      {Object.keys(apiErrors).length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />

          <div>
            <p className="font-semibold">
              Some data could not be loaded
            </p>

            <p className="mt-0.5 text-yellow-700">
              Available records are still being displayed.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================
          SUMMARY CARDS
      ======================================================= */}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {[
          {
            label: 'Employees',
            value: totalEmployees,
            wrapper: 'border-blue-200 bg-blue-50',
            labelClass: 'text-blue-600',
            valueClass: 'text-blue-900',
          },
          {
            label: 'Present',
            value: presentCount,
            wrapper: 'border-green-200 bg-green-50',
            labelClass: 'text-green-600',
            valueClass: 'text-green-900',
          },
          {
            label: 'Absent',
            value: absentCount,
            wrapper: 'border-red-200 bg-red-50',
            labelClass: 'text-red-600',
            valueClass: 'text-red-900',
          },
          {
            label: 'Assigned',
            value: assignedCount,
            wrapper: 'border-purple-200 bg-purple-50',
            labelClass: 'text-purple-600',
            valueClass: 'text-purple-900',
          },
          {
            label: 'Served',
            value: servedCount,
            wrapper: 'border-indigo-200 bg-indigo-50',
            labelClass: 'text-indigo-600',
            valueClass: 'text-indigo-900',
          },
          {
            label: 'Pending',
            value: pendingCount,
            wrapper: 'border-yellow-200 bg-yellow-50',
            labelClass: 'text-yellow-700',
            valueClass: 'text-yellow-900',
          },
          {
            label: 'Completion',
            value: `${completionPercentage}%`,
            wrapper: 'border-orange-200 bg-orange-50',
            labelClass: 'text-orange-600',
            valueClass: 'text-orange-900',
          },
        ].map((statistic) => (
          <div
            key={statistic.label}
            className={`rounded-2xl border p-4 ${statistic.wrapper}`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${statistic.labelClass}`}
            >
              {statistic.label}
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${statistic.valueClass}`}
            >
              {statistic.value || 0}
            </p>
          </div>
        ))}
      </div>

      {/* ======================================================
          AUTO REFRESH STATUS
      ======================================================= */}

      {isToday && autoRefresh && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <ClockIcon className="h-4 w-4" />

          Attendance and serving records refresh every 30
          seconds.
        </div>
      )}

      {/* ======================================================
          LOCATION CARDS
      ======================================================= */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LOCATIONS.map((location) => {
          const statistics = locationStats[location.id] || {
            assigned: 0,
            served: 0,
            remaining: 0,
          };

          const percentage =
            statistics.assigned > 0
              ? Math.round(
                  (statistics.served /
                    statistics.assigned) *
                    100
                )
              : 0;

          const LocationIcon = location.icon;

          return (
            <motion.div
              key={location.id}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${location.bg} ${location.text}`}
                  >
                    <LocationIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">
                      {location.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {percentage}% complete
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">
                    Assigned
                  </p>

                  <p className="mt-1 text-lg font-bold text-gray-800">
                    {statistics.assigned}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Served
                  </p>

                  <p className="mt-1 text-lg font-bold text-green-600">
                    {statistics.served}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Remaining
                  </p>

                  <p className="mt-1 text-lg font-bold text-orange-600">
                    {statistics.remaining}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${location.color}`}
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ======================================================
          FILTERS
      ======================================================= */}

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              placeholder="Search employee name, ID or department"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="relative min-w-[230px]">
            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value)
              }
              className="h-11 w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All employees</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="assigned">Assigned</option>
              <option value="not_assigned">
                Not assigned
              </option>
              <option value="pending">
                Pending serving
              </option>
              <option value="served">Served</option>
            </select>

            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ======================================================
          BULK ACTION BAR
      ======================================================= */}

      <AnimatePresence>
        {selectedEmployeeIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-3 z-30 mb-4 rounded-2xl border border-indigo-200 bg-indigo-600 p-3 shadow-lg shadow-indigo-200/50"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <CheckIcon className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-semibold">
                    {selectedEmployeeIds.length}{' '}
                    employee
                    {selectedEmployeeIds.length === 1
                      ? ''
                      : 's'}{' '}
                    selected
                  </p>

                  <p className="text-xs text-indigo-100">
                    Select a serving location to process all
                    selected employees.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  disabled={bulkServing}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={openBulkLocationModal}
                  disabled={bulkServing}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Serve selected
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================
          TABLE
      ======================================================= */}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="animate-pulse">
            <div className="mb-5 h-10 rounded-lg bg-gray-200" />

            <div className="space-y-3">
              {[...Array(7)].map((_, index) => (
                <div
                  key={index}
                  className="h-14 rounded-lg bg-gray-100"
                />
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircleIcon className="mx-auto h-10 w-10 text-red-400" />

          <p className="mt-3 font-semibold text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() => fetchData(true)}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-300" />

          <p className="mt-4 font-semibold text-gray-700">
            No employees found
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Try changing the selected date, search term or
            filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleEligibleSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate =
                            !allVisibleEligibleSelected &&
                            someVisibleEligibleSelected;
                        }
                      }}
                      onChange={handleSelectAllVisible}
                      disabled={
                        visibleEligibleEmployeeIds.length === 0 ||
                        bulkServing
                      }
                      title="Select all eligible employees currently visible"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Employee
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Department
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Check in
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Attendance
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Meal
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Location
                  </th>

                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>

                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredData.map((employee) => {
                  const selected =
                    selectedEmployeeIds.includes(employee.id);

                  return (
                    <tr
                      key={employee.id}
                      className={`transition ${
                        selected
                          ? 'bg-indigo-50/70'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            handleToggleEmployee(employee)
                          }
                          disabled={
                            !employee.canServe || bulkServing
                          }
                          title={
                            employee.canServe
                              ? `Select ${employee.name}`
                              : 'Only present, assigned and unserved employees can be selected'
                          }
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                            {getEmployeeInitials(employee.name)}
                          </div>

                          <div className="ml-3 min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {employee.name}
                            </p>

                            <p className="text-xs text-gray-500">
                              {employee.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                        {employee.department}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                        {employee.checkIn}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {employee.isPresent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            <CheckCircleIcon className="h-4 w-4" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <XCircleIcon className="h-4 w-4" />
                            Absent
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        {employee.mealAssigned ? (
                          <span className="font-medium text-gray-800">
                            {employee.mealAssigned}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            Not assigned
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {employee.location ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getLocationBg(
                              employee.location
                            )}`}
                          >
                            <MapPinIcon className="h-3.5 w-3.5" />
                            {employee.location}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-center">
                        {employee.isServed ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              <CheckCircleIcon className="h-4 w-4" />
                              Served
                            </span>

                            {employee.servedTime && (
                              <p className="mt-1 text-[11px] text-gray-400">
                                {new Date(
                                  employee.servedTime
                                ).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        ) : employee.canServe ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                            Pending
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        {employee.canServe ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleServeClick(employee)
                            }
                            disabled={bulkServing}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Serve
                          </button>
                        ) : employee.isServed ? (
                          <span className="text-xs font-medium text-gray-400">
                            Already served
                          </span>
                        ) : !employee.isPresent ? (
                          <span className="text-xs font-medium text-gray-400">
                            Absent
                          </span>
                        ) : !employee.mealAssigned ? (
                          <span className="text-xs font-medium text-gray-400">
                            No meal assigned
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredData.length} employee
              {filteredData.length === 1 ? '' : 's'}
            </span>

            <div className="flex items-center gap-4">
              <span>
                Eligible for serving:{' '}
                {visibleEligibleEmployeeIds.length}
              </span>

              <span>Date: {date}</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          SINGLE LOCATION MODAL
      ======================================================= */}

      <AnimatePresence>
        {showLocationModal && servingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Select serving location
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Choose where the employee will receive
                    lunch.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeSingleServingModal}
                  disabled={isServingSingle}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {servingError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <p className="font-semibold">
                      Unable to serve lunch
                    </p>

                    <p className="mt-1">{servingError}</p>
                  </div>
                )}

                <div className="mb-5 rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700">
                      {getEmployeeInitials(
                        servingEmployee.name
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {servingEmployee.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {servingEmployee.mealAssigned}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {LOCATIONS.map((location) => {
                    const LocationIcon = location.icon;

                    return (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() =>
                          handleServeWithLocation(
                            location.id
                          )
                        }
                        disabled={isServingSingle}
                        className={`group flex min-h-[120px] flex-col items-center justify-center rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${location.bg} ${location.border}`}
                      >
                        <LocationIcon
                          className={`mb-2 h-8 w-8 ${location.text}`}
                        />

                        <span
                          className={`font-semibold ${location.text}`}
                        >
                          {location.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isServingSingle && (
                  <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600">
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Serving lunch...
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================
          BULK LOCATION MODAL
      ======================================================= */}

      <AnimatePresence>
        {showBulkLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Bulk lunch serving
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Serve {selectedEmployees.length}{' '}
                    selected employee
                    {selectedEmployees.length === 1
                      ? ''
                      : 's'}{' '}
                    at one location.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeBulkLocationModal}
                  disabled={bulkServing}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {bulkServingError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />

                      <div>
                        <p className="font-semibold">
                          Bulk serving completed with errors
                        </p>

                        <p className="mt-1">
                          {bulkServingError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!bulkServing && bulkResults.length === 0 && (
                  <>
                    <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <UsersIcon className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-semibold text-indigo-900">
                            {selectedEmployees.length}{' '}
                            employee
                            {selectedEmployees.length === 1
                              ? ''
                              : 's'}{' '}
                            selected
                          </p>

                          <p className="text-sm text-indigo-700">
                            Select the location where all selected
                            employees will be served.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {LOCATIONS.map((location) => {
                        const LocationIcon = location.icon;

                        return (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() =>
                              handleBulkServeWithLocation(
                                location.id
                              )
                            }
                            className={`group flex min-h-[125px] flex-col items-center justify-center rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${location.bg} ${location.border}`}
                          >
                            <LocationIcon
                              className={`mb-2 h-8 w-8 ${location.text}`}
                            />

                            <span
                              className={`text-sm font-semibold ${location.text}`}
                            >
                              {location.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {bulkServing && (
                  <div className="py-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                      <ArrowPathIcon className="h-7 w-7 animate-spin" />
                    </div>

                    <h4 className="mt-4 text-center text-lg font-bold text-gray-900">
                      Serving selected employees
                    </h4>

                    <p className="mt-1 text-center text-sm text-gray-500">
                      Please keep this window open until the
                      process finishes.
                    </p>

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          Progress
                        </span>

                        <span className="text-gray-500">
                          {bulkProgress.completed} of{' '}
                          {bulkProgress.total}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                          style={{
                            width:
                              bulkProgress.total > 0
                                ? `${
                                    (bulkProgress.completed /
                                      bulkProgress.total) *
                                    100
                                  }%`
                                : '0%',
                          }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-green-50 p-3 text-center">
                          <p className="text-xs font-medium text-green-600">
                            Successful
                          </p>

                          <p className="mt-1 text-xl font-bold text-green-800">
                            {bulkProgress.successful}
                          </p>
                        </div>

                        <div className="rounded-xl bg-red-50 p-3 text-center">
                          <p className="text-xs font-medium text-red-600">
                            Failed
                          </p>

                          <p className="mt-1 text-xl font-bold text-red-800">
                            {bulkProgress.failed}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!bulkServing && bulkResults.length > 0 && (
                  <div>
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                        <p className="text-sm font-medium text-green-600">
                          Served successfully
                        </p>

                        <p className="mt-1 text-2xl font-bold text-green-800">
                          {
                            bulkResults.filter(
                              (result) => result.success
                            ).length
                          }
                        </p>
                      </div>

                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                        <p className="text-sm font-medium text-red-600">
                          Failed
                        </p>

                        <p className="mt-1 text-2xl font-bold text-red-800">
                          {
                            bulkResults.filter(
                              (result) => !result.success
                            ).length
                          }
                        </p>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
                      {bulkResults.map((result) => (
                        <div
                          key={result.employeeId}
                          className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {result.employeeName}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-500">
                              {result.message}
                            </p>
                          </div>

                          {result.success ? (
                            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={closeBulkLocationModal}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyLunchServing;