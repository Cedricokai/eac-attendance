// api.js

export const getApiBaseUrl = () => {
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";

  if (hostname.startsWith("192.168.")) {
    return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://192.168.1.97:8080";
  }

  if (hostname === "100.114.178.13") {
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://100.114.178.13:8080";
  }

  return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
};

export const apiFetch = async (path, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  // Try to parse JSON, fallback to text
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
};

// Products API
export const productsAPI = {
  // Get all products
  getAll: async () => {
    return await apiFetch('/api/products');
  },

  // Get product by ID
  getById: async (id) => {
    return await apiFetch(`/api/products/${id}`);
  },

  // Create new product
  create: async (productData) => {
    return await apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  // Update product
  update: async (id, productData) => {
    return await apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  // Delete product
  delete: async (id) => {
    return await apiFetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Update stock
  updateStock: async (id, stockData) => {
    return await apiFetch(`/api/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(stockData),
    });
  },
};

// Product Requests API
export const productRequestAPI = {
  // Get all product requests
  getAll: async () => {
    return await apiFetch('/api/product-requests');
  },

  // Get product request by ID
  getById: async (id) => {
    return await apiFetch(`/api/product-requests/${id}`);
  },

  // Create new product request
  create: async (requestData) => {
    return await apiFetch('/api/product-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  // Update product request
  update: async (id, requestData) => {
    return await apiFetch(`/api/product-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
  },

  // Delete product request
  delete: async (id) => {
    return await apiFetch(`/api/product-requests/${id}`, {
      method: 'DELETE',
    });
  },

  // Get requests by employee
  getByEmployee: async (employeeId) => {
    return await apiFetch(`/api/product-requests/employee/${employeeId}`);
  },

  // Get requests by status
  getByStatus: async (status) => {
    return await apiFetch(`/api/product-requests/status/${status}`);
  },

  // Get pending requests for procurement review
  getProcurementPendingRequests: async () => {
    return await apiFetch('/api/product-requests/procurement/pending');
  },

  // Approve by procurement
  approveBYProcurement: async (id, approvalData) => {
    return await apiFetch(`/api/product-requests/${id}/procurement/approve`, {
      method: 'PUT',
      body: JSON.stringify(approvalData),
    });
  },

  // Reject by procurement
  rejectByProcurement: async (id, rejectionData) => {
    return await apiFetch(`/api/product-requests/${id}/procurement/reject`, {
      method: 'PUT',
      body: JSON.stringify(rejectionData),
    });
  },

  // Approve by management (final approval)
  approveByManagement: async (id, approvalData) => {
    return await apiFetch(`/api/product-requests/${id}/management/approve`, {
      method: 'PUT',
      body: JSON.stringify(approvalData),
    });
  },

  // Reject by management
  rejectByManagement: async (id, rejectionData) => {
    return await apiFetch(`/api/product-requests/${id}/management/reject`, {
      method: 'PUT',
      body: JSON.stringify(rejectionData),
    });
  },

  // Cancel request
  cancel: async (id, reason) => {
    return await apiFetch(`/api/product-requests/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  // Get request statistics
  getStatistics: async () => {
    return await apiFetch('/api/product-requests/statistics');
  },
};

// Department API (if needed)
export const departmentAPI = {
  getAll: async () => {
    return await apiFetch('/api/departments');
  },

  getById: async (id) => {
    return await apiFetch(`/api/departments/${id}`);
  },
};

// User/Employee API (if needed)
export const userAPI = {
  getCurrentUser: async () => {
    return await apiFetch('/api/users/me');
  },

  getAllEmployees: async () => {
    return await apiFetch('/api/users/employees');
  },

  getById: async (id) => {
    return await apiFetch(`/api/users/${id}`);
  },
};

// Default export for convenience
export default {
  getApiBaseUrl,
  apiFetch,
  productsAPI,
  productRequestAPI,
  departmentAPI,
  userAPI,
};