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

// ============================================================================
// COST CENTER API ENDPOINTS
// ============================================================================
export const costCenterAPI = {
  getAllCostCenters: () => apiRequest('/api/cost-centers'),
  getCostCenterById: (id) => apiRequest(`/api/cost-centers/${id}`),
  createCostCenter: (costCenterData) => apiRequest('/api/cost-centers', {
    method: 'POST',
    body: JSON.stringify(costCenterData),
  }),
  updateCostCenter: (id, costCenterData) => apiRequest(`/api/cost-centers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(costCenterData),
  }),
  deleteCostCenter: (id) => apiRequest(`/api/cost-centers/${id}`, {
    method: 'DELETE',
  }),
  getCostCenterStats: (id) => apiRequest(`/api/cost-centers/${id}/stats`),
  getActiveCostCenters: () => apiRequest('/api/cost-centers?status=ACTIVE'),
};

// ============================================================================
// PRODUCT REQUEST API ENDPOINTS
// ============================================================================
export const productRequestAPI = {
  // Retrieve product requests
  getAllRequests: () => apiRequest('/api/product-requests'),
  getRequestById: (id) => apiRequest(`/api/product-requests/${id}`),
  getRequestsByStatus: (status) => apiRequest(`/api/product-requests?status=${status}`),
  getRequestsByEmployee: (employeeId) => apiRequest(`/api/product-requests/employee/${employeeId}`),
  getRequestsByCostCenter: (costCenterId) => apiRequest(`/api/product-requests/cost-center/${costCenterId}`),
  
  // Create product request
  createProductRequest: (requestData) => apiRequest('/api/product-requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  }),
  
  // Procurement Manager operations
  approveBYProcurement: (id, approvalData) => apiRequest(`/api/product-requests/${id}/approve-procurement`, {
    method: 'PUT',
    body: JSON.stringify(approvalData),
  }),
  rejectByProcurement: (id, rejectionData) => apiRequest(`/api/product-requests/${id}/reject-procurement`, {
    method: 'PUT',
    body: JSON.stringify(rejectionData),
  }),
  getProcurementPendingRequests: () => apiRequest('/api/product-requests/procurement/pending'),
  
  // Store Officer operations
  approveByStore: (id, approvalData) => apiRequest(`/api/product-requests/${id}/approve-store`, {
    method: 'PUT',
    body: JSON.stringify(approvalData),
  }),
  rejectByStore: (id, rejectionData) => apiRequest(`/api/product-requests/${id}/reject-store`, {
    method: 'PUT',
    body: JSON.stringify(rejectionData),
  }),
  issueProduct: (id, issueData) => apiRequest(`/api/product-requests/${id}/issue`, {
    method: 'PUT',
    body: JSON.stringify(issueData),
  }),
  getStoreApprovalRequests: () => apiRequest('/api/product-requests/store/approved'),
  
  // Update and cancel
  updateProductRequest: (id, updateData) => apiRequest(`/api/product-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }),
  cancelProductRequest: (id) => apiRequest(`/api/product-requests/${id}/cancel`, {
    method: 'PUT',
  }),
  
  // Status history
  getRequestStatusHistory: (requestId) => apiRequest(`/api/product-requests/${requestId}/history`),
};

// ============================================================================
// PRODUCT MANAGEMENT API - EXTENDED
// ============================================================================
export const productsAPI = {
  getAllProducts: () => apiRequest('/api/products'),
  getProductById: (id) => apiRequest(`/api/products/${id}`),
  getProductsByCostCenter: (costCenterId) => apiRequest(`/api/products/cost-center/${costCenterId}`),
  getProductByCode: (code) => apiRequest(`/api/products/code/${code}`),
  createProduct: (productData) => apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),
  updateProduct: (id, productData) => apiRequest(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  }),
  deleteProduct: (id) => apiRequest(`/api/products/${id}`, {
    method: 'DELETE',
  }),
  getInventoryValue: () => apiRequest('/api/products/inventory/total-value'),
  getLowStockProducts: (threshold = 10) => apiRequest(`/api/products/low-stock?threshold=${threshold}`),
};

// ============================================================================
// REPORTS API ENDPOINTS
// ============================================================================
export const reportsAPI = {
  // Product request reports
  getRequestsByStatus: () => apiRequest('/api/reports/requests/by-status'),
  getProductUsageByEmployee: (startDate, endDate) => apiRequest(`/api/reports/usage/employee?start=${startDate}&end=${endDate}`),
  getCostSummaryByProject: (startDate, endDate) => apiRequest(`/api/reports/cost/by-project?start=${startDate}&end=${endDate}`),
  getMonthlyCostAnalysis: (year, month) => apiRequest(`/api/reports/cost/monthly?year=${year}&month=${month}`),
  getQuarterlyCostAnalysis: (year, quarter) => apiRequest(`/api/reports/cost/quarterly?year=${year}&quarter=${quarter}`),
  getCostCenterExpenses: (costCenterId) => apiRequest(`/api/reports/cost-center/${costCenterId}/expenses`),
  
  // Inventory reports
  getInventorySummary: () => apiRequest('/api/reports/inventory/summary'),
  getInventoryByProject: (costCenterId) => apiRequest(`/api/reports/inventory/by-project/${costCenterId}`),
  
  // Export reports
  exportRequestsReport: (format = 'pdf') => apiRequest(`/api/reports/requests/export?format=${format}`),
  exportCostReport: (format = 'pdf', startDate, endDate) => apiRequest(`/api/reports/cost/export?format=${format}&start=${startDate}&end=${endDate}`),
};