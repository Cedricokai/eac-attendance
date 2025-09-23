import { getToken, handleSessionExpired } from '../utils/auth';

const API_BASE_URL = 'http://localhost:8080';

const handleResponse = async (response) => {
  if (response.status === 401) {
    handleSessionExpired();
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(errorData || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  if (!token) {
    handleSessionExpired();
    throw new Error('No valid token');
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, { ...options, headers });
    return await handleResponse(response);
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Specific API methods
export const authAPI = {
  login: (credentials) => apiRequest('/auth/signin', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
};

export const payrollAPI = {
  getPeriods: () => apiRequest('/api/payroll/periods'),
  getPayrollData: (periodId) => apiRequest(`/api/payroll?periodId=${periodId}`),
  generatePayroll: (periodId) => apiRequest(`/api/payroll/generate?periodId=${periodId}`, {
    method: 'POST',
  }),
  processPayroll: (periodId) => apiRequest(`/api/payroll/process?periodId=${periodId}`, {
    method: 'POST',
  }),
  createPeriod: (periodData) => apiRequest('/api/payroll/periods', {
    method: 'POST',
    body: JSON.stringify(periodData),
  }),
};

export const attendanceAPI = {
  getAttendance: () => apiRequest('/api/attendance'),
  createAttendance: (data) => apiRequest('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  batchCreateAttendance: (data) => apiRequest('/api/attendance/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteAttendance: (id) => apiRequest(`/api/attendance/${id}`, {
    method: 'DELETE',
  }),
  validateAttendance: (attendanceIds) => apiRequest('/api/attendance/insertOverview', {
    method: 'POST',
    body: JSON.stringify({ attendanceIds }),
  }),
};

export const employeeAPI = {
  getEmployees: () => apiRequest('/api/employee'),
};

export const holidaysAPI = {
  getHolidays: () => apiRequest('/api/holidays'),
  createHoliday: (holidayData) => apiRequest('/api/holidays', {
    method: 'POST',
    body: JSON.stringify(holidayData),
  }),
};

export const leaveAPI = {
  getLeaves: () => apiRequest('/api/leave'),
};

export const overtimeAPI = {
  getOvertimes: () => apiRequest('/api/overtime'),
};