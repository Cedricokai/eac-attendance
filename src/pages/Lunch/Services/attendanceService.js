// src/pages/Lunch/services/attendanceService.js

// Helper to get the base API URL based on environment
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080';
  if (hostname.startsWith('192.168.')) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

const API_BASE_URL = getApiBaseUrl();

// Generic fetch wrapper with authentication header
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('jwtToken');
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
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (_) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const attendanceService = {
  // Get today's attendance for all employees (uses /api/attendance/today endpoint)
  getTodayAttendance: () => fetchWithAuth('/api/attendance/today'),

  // Get attendance for a specific date (uses /api/attendance/date/{date})
  getAttendancesByDate: (date) => fetchWithAuth(`/api/attendance/date/${date}`),

  // Get all attendance records (all dates)
  getAllAttendances: () => fetchWithAuth('/api/attendance'),

  // Get list of employees who are present today (uses /api/attendance/present)
  getPresentEmployees: () => fetchWithAuth('/api/attendance/present'),

  // Get list of employees who are absent today (uses /api/attendance/absent)
  getAbsentEmployees: () => fetchWithAuth('/api/attendance/absent'),

  // Manually sync attendance data from biometric device
  syncAttendance: () => fetchWithAuth('/api/attendance/sync', { method: 'POST' }),

  // Force refresh attendance cache (uses /api/attendance/refresh)
  refreshAttendance: () => fetchWithAuth('/api/attendance/refresh'),

  // Get check-in time for a specific employee
  getEmployeeCheckIn: (employeeId) =>
    fetchWithAuth(`/api/attendance/checkin/${employeeId}`),
};