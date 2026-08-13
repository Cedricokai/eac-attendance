// src/pages/Lunch/services/lunchApi.js

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080';
  }

  if (hostname.startsWith('192.168.')) {
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

const API_BASE_URL = getApiBaseUrl();

const getToken = () => {
  const keys = ['jwtToken', 'authToken', 'token', 'accessToken'];
  for (const key of keys) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const data = await response.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch (_) {
      // Use the default HTTP error message when response is not JSON.
    }

    const error = new Error(errorMessage);
    error.status = response.status;

    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

// ============================================================
// CONVENIENCE METHODS
// ============================================================

const get = (url, params) => {
  let fullUrl = url;

  if (params) {
    const cleanedParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ''
      )
    );

    const query = new URLSearchParams(cleanedParams).toString();

    if (query) {
      fullUrl += `${fullUrl.includes('?') ? '&' : '?'}${query}`;
    }
  }

  return fetchWithAuth(fullUrl, {
    method: 'GET',
  });
};

const post = (url, data, options = {}) =>
  fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });

const put = (url, data) =>
  fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

const patch = (url, data) =>
  fetchWithAuth(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

const del = (url) =>
  fetchWithAuth(url, {
    method: 'DELETE',
  });

// ============================================================
// DATE HELPERS
// ============================================================

const formatDateForApi = (date) => {
  if (typeof date === 'string') {
    return date;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTodayDate = () => formatDateForApi(new Date());

const getDatesBetween = (startDate, endDate) => {
  const dates = [];

  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    dates.push(formatDateForApi(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

// ============================================================
// SAFE FETCH WRAPPER - prevents 401 from breaking the UI
// ============================================================

const safeFetch = async (fn, fallback = null) => {
  try {
    const result = await fn();
    return result;
  } catch (error) {
    console.warn('API call failed:', error.message);
    // Don't throw - return fallback instead
    return fallback;
  }
};

// ============================================================
// LUNCH API
// ============================================================

export const lunchApi = {
  // ==========================================================
  // DASHBOARD
  // ==========================================================

  getDashboardStats: (date) =>
    safeFetch(() => get('/api/lunch/dashboard/stats', { date }), { data: {} }),

  getBudget: () =>
    safeFetch(() => get('/api/lunch/budget/current'), { data: { amount: 0 } }),

  // ==========================================================
  // ASSIGNMENTS
  // ==========================================================

  getActiveAssignments: () =>
    safeFetch(() => get('/api/lunch/assignments/active'), { data: [] }),

  getAssignmentsForDate: (date) =>
    safeFetch(() => get('/api/lunch/assignments/date', { date }), { data: [] }),

  getAssignmentsForEmployee: (employeeId) =>
    safeFetch(() => get(`/api/lunch/assignments/employee/${employeeId}`), { data: [] }),

  getActiveAssignmentForEmployee: (employeeId, date) =>
    safeFetch(() => get(`/api/lunch/assignments/employee/${employeeId}/active`, { date }), null),

  getTodayAssignments: () => {
    const today = getTodayDate();
    return safeFetch(() => get('/api/lunch/assignments/date', { date: today }), { data: [] });
  },

  createAssignment: (data) =>
    post('/api/lunch/assignments', data),

  updateAssignment: (id, data) =>
    put(`/api/lunch/assignments/${id}`, data),

  deleteAssignment: (id) =>
    del(`/api/lunch/assignments/${id}`),

  suspendAssignment: (id) =>
    patch(`/api/lunch/assignments/${id}/suspend`),

  activateAssignment: (id) =>
    patch(`/api/lunch/assignments/${id}/activate`),

  // ==========================================================
  // WEEKLY ASSIGNMENTS
  // ==========================================================

  getEmployeeWeeklyAssignment: (employeeId, startDate) =>
    safeFetch(() => get('/api/lunch/assignments/weekly', { employeeId, startDate }), { data: [] }),

  createOrUpdateWeeklyAssignment: (data) =>
    post('/api/lunch/assignments/weekly', data),

  updateMyWeeklyAssignment: (data) =>
    post('/api/lunch/assignments/my-weekly', data),

  getMyWeeklyAssignment: (startDate) =>
    safeFetch(() => get('/api/lunch/assignments/my-weekly', { startDate }), { data: [] }),

  // ==========================================================
  // DAILY MEAL OPTIONS
  // ==========================================================

  getDailyMeals: () =>
    safeFetch(() => get('/api/lunch/daily-meals'), { data: [] }),

  updateDailyMeals: (data) =>
    post('/api/lunch/daily-meals', data),

  // ==========================================================
  // SERVING
  // ==========================================================

  serveLunch: (data) =>
    post('/api/lunch/serve', data),

  // This endpoint may not exist yet - use safeFetch with fallback
  getTodayServed: (date) =>
    safeFetch(() => get('/api/lunch/serve/today', { date }), { data: [] }),

  getEmployeeServing: (employeeId, date) =>
    safeFetch(() => get(`/api/lunch/serve/employee/${employeeId}`, { date }), null),

  // This endpoint may not exist yet - use safeFetch with fallback
  getDailyServingStats: (date) =>
    safeFetch(() => get('/api/lunch/serve/stats/daily', { date }), { data: null }),

  // ==========================================================
  // REPORTS
  // ==========================================================

  getDailySummary: (date) =>
    safeFetch(() => get('/api/lunch/reports/daily-summary', { date }), { data: {} }),

  getKitchenReport: (date) =>
    safeFetch(() => get('/api/lunch/reports/kitchen', { date }), { data: {} }),

  getWeeklyReport: (start, end) =>
    safeFetch(() => get('/api/lunch/reports/weekly', { start, end }), { data: {} }),

  getMonthlyReport: (month, year) =>
    safeFetch(() => get('/api/lunch/reports/monthly', { month, year }), { data: {} }),

  getAssignmentsForDateRange: (start, end) =>
    safeFetch(() => get('/api/lunch/reports/assignments/range', { start, end }), { data: [] }),

  getDailyTrend: (start, end) =>
    safeFetch(() => get('/api/lunch/reports/daily-trend', { start, end }), { data: [] }),

  getDepartmentDistribution: (date) =>
    safeFetch(() => get('/api/lunch/reports/department-distribution', { date }), { data: [] }),

  exportReport: (format, params = {}) => {
    const query = new URLSearchParams(params).toString();

    return fetchWithAuth(
      `/api/lunch/reports/export/${format}${query ? `?${query}` : ''}`,
      {
        method: 'GET',
      }
    );
  },

  // ==========================================================
  // WEEKLY KITCHEN DATA
  // ==========================================================

  getWeeklyKitchenData: async (startDate, endDate) => {
    const dates = getDatesBetween(startDate, endDate);

    const dailyRequests = dates.map(async (date) => {
      const [
        assignmentsResponse,
        servedResponse,
      ] = await Promise.all([
        lunchApi.getAssignmentsForDate(date),
        lunchApi.getTodayServed(date),
      ]);

      const assignments =
        assignmentsResponse?.data ||
        assignmentsResponse ||
        [];

      const servedRecords =
        servedResponse?.data ||
        servedResponse ||
        [];

      return {
        date,
        assignments,
        servedRecords,
      };
    });

    return Promise.all(dailyRequests);
  },

  // ==========================================================
  // BUDGET
  // ==========================================================

  getCurrentBudget: (budgetType) =>
    safeFetch(() => get('/api/lunch/budget/current', { budgetType }), { data: { amount: 0 } }),

  createBudget: (data) =>
    post('/api/lunch/budget', data),

  // ==========================================================
  // MEALS
  // ==========================================================

  getMeals: () =>
    safeFetch(() => get('/api/lunch/meals'), { data: [] }),

  getActiveMeals: () =>
    safeFetch(() => get('/api/lunch/meals/active'), { data: [] }),

  createMeal: (data) =>
    post('/api/lunch/meals', data),

  updateMeal: (id, data) =>
    put(`/api/lunch/meals/${id}`, data),

  deleteMeal: (id) =>
    del(`/api/lunch/meals/${id}`),

  // ==========================================================
  // SETTINGS
  // ==========================================================

  getSettings: () =>
    safeFetch(() => get('/api/lunch/settings'), { data: {} }),

  updateSettings: (data) =>
    put('/api/lunch/settings', data),

  getSetting: (key) =>
    safeFetch(() => get(`/api/lunch/settings/${key}`), { data: {} }),

  createOrUpdateSetting: (data) =>
    post('/api/lunch/settings', data),

  // ==========================================================
  // EMPLOYEES
  // ==========================================================

  getAllEmployees: () =>
    safeFetch(() => get('/api/employee'), []),

  getEligibleForLunch: () =>
    safeFetch(() => get('/api/lunch/eligible'), { data: [] }),
};

// ============================================================
// ATTENDANCE SERVICE
// ============================================================

export const attendanceService = {
  getTodayAttendance: () => {
    const today = getTodayDate();
    return safeFetch(() => get(`/api/attendance/date/${today}`), { data: [] });
  },

  getPresentEmployees: () => {
    const today = getTodayDate();
    return safeFetch(() => get(`/api/attendance/date/${today}`), { data: [] });
  },

  getAbsentEmployees: () =>
    Promise.resolve([]),

  syncAttendance: () =>
    safeFetch(() => post('/api/attendance/sync', {}), { success: false }),

  refreshAttendance: () => {
    const today = getTodayDate();
    return safeFetch(() => get(`/api/attendance/date/${today}`), { data: [] });
  },

  getEmployeeCheckIn: (employeeId) => {
    const today = getTodayDate();
    return safeFetch(() => get('/api/attendance/by-employee-date', { employeeId, date: today }), null);
  },

  getAllAttendances: () =>
    safeFetch(() => get('/api/attendance'), { data: [] }),

  getAttendancesByDate: (date) =>
    safeFetch(() => get(`/api/attendance/date/${date}`), { data: [] }),

  // Fetch attendance for every day in a selected week
  getAttendancesForDateRange: async (startDate, endDate) => {
    const dates = getDatesBetween(startDate, endDate);

    const attendanceRequests = dates.map(async (date) => {
      const response = await safeFetch(() => get(`/api/attendance/date/${date}`), { data: [] });

      const attendances =
        response?.data ||
        response ||
        [];

      return {
        date,
        attendances,
      };
    });

    return Promise.all(attendanceRequests);
  },
};