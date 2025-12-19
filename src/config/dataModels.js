/**
 * Data Models for Product Management System
 * These represent the structure of data received from and sent to the backend
 */

// ============================================================================
// COST CENTER MODEL
// ============================================================================
export const CostCenterModel = {
  id: null,
  name: '',                    // e.g., "Project A", "IT Department"
  code: '',                    // e.g., "ProjA", "IT-001"
  description: '',
  type: 'PROJECT',             // 'PROJECT', 'DEPARTMENT', 'LOCATION'
  status: 'ACTIVE',            // 'ACTIVE', 'INACTIVE', 'ON_HOLD'
  manager_id: null,
  budget: 0.00,
  spent_amount: 0.00,
  start_date: null,
  end_date: null,
  created_by: null,
  created_date: null,
  modified_by: null,
  modified_date: null
};

// ============================================================================
// PRODUCT REQUEST MODEL
// ============================================================================
export const ProductRequestModel = {
  id: null,
  request_number: '',          // Auto-generated: REQ-2024-001
  employee_id: null,           // Employee requesting
  product_id: null,            // Product being requested
  cost_center_id: null,        // Project/Department
  quantity_requested: 0,
  quantity_approved: null,     // Set by procurement manager
  quantity_issued: 0,
  unit_cost: 0.00,            // Unit cost at time of request
  total_cost: 0.00,           // Calculated: quantity_issued × unit_cost
  purpose: '',                // e.g., "Repairs", "New Project"
  comments: '',               // Employee's comments
  status: 'PENDING',          // See status workflow below
  procurement_manager_id: null,
  procurement_comments: '',
  procurement_date: null,
  store_officer_id: null,
  store_comments: '',
  store_date: null,
  issued_date: null,
  created_date: null,
  modified_date: null
};

// ============================================================================
// STATUS CONSTANTS
// ============================================================================
export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED_BY_PROCUREMENT: 'APPROVED_BY_PROCUREMENT',
  REJECTED_BY_PROCUREMENT: 'REJECTED_BY_PROCUREMENT',
  APPROVED_BY_STORE: 'APPROVED_BY_STORE',
  REJECTED_BY_STORE: 'REJECTED_BY_STORE',
  ISSUED: 'ISSUED',
  CANCELLED: 'CANCELLED'
};

export const STATUS_LABELS = {
  PENDING: 'Pending Review',
  APPROVED_BY_PROCUREMENT: 'Approved by Procurement',
  REJECTED_BY_PROCUREMENT: 'Rejected by Procurement',
  APPROVED_BY_STORE: 'Approved by Store',
  REJECTED_BY_STORE: 'Rejected by Store',
  ISSUED: 'Issued to Employee',
  CANCELLED: 'Cancelled'
};

export const STATUS_COLORS = {
  PENDING: 'blue',
  APPROVED_BY_PROCUREMENT: 'orange',
  REJECTED_BY_PROCUREMENT: 'red',
  APPROVED_BY_STORE: 'cyan',
  REJECTED_BY_STORE: 'red',
  ISSUED: 'green',
  CANCELLED: 'gray'
};

// ============================================================================
// COST CENTER TYPE CONSTANTS
// ============================================================================
export const COST_CENTER_TYPES = {
  PROJECT: 'PROJECT',
  DEPARTMENT: 'DEPARTMENT',
  LOCATION: 'LOCATION'
};

export const COST_CENTER_STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ON_HOLD: 'ON_HOLD'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique request number
 * Format: REQ-YYYY-XXXXX
 */
export const generateRequestNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `REQ-${year}-${random}`;
};

/**
 * Calculate total cost
 * @param {number} quantity - Quantity
 * @param {number} unitCost - Unit cost
 * @returns {number} Total cost
 */
export const calculateTotalCost = (quantity, unitCost) => {
  return parseFloat((quantity * unitCost).toFixed(2));
};

/**
 * Get status badge color for UI
 * @param {string} status - Request status
 * @returns {string} Color name for Material-Tailwind
 */
export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || 'gray';
};

/**
 * Get human-readable status label
 * @param {string} status - Request status
 * @returns {string} Status label
 */
export const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || status;
};

/**
 * Check if status is rejected
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isRejected = (status) => {
  return status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT || 
         status === REQUEST_STATUS.REJECTED_BY_STORE;
};

/**
 * Check if status is approved and ready for store
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isReadyForStore = (status) => {
  return status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT;
};

/**
 * Check if status is issued
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isIssued = (status) => {
  return status === REQUEST_STATUS.ISSUED;
};

/**
 * Get next possible statuses for workflow progression
 * @param {string} currentStatus - Current status
 * @returns {string[]} Array of possible next statuses
 */
export const getNextPossibleStatuses = (currentStatus) => {
  const workflows = {
    [REQUEST_STATUS.PENDING]: [
      REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
      REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
      REQUEST_STATUS.CANCELLED
    ],
    [REQUEST_STATUS.APPROVED_BY_PROCUREMENT]: [
      REQUEST_STATUS.APPROVED_BY_STORE,
      REQUEST_STATUS.REJECTED_BY_STORE
    ],
    [REQUEST_STATUS.APPROVED_BY_STORE]: [
      REQUEST_STATUS.ISSUED
    ]
  };
  
  return workflows[currentStatus] || [];
};

// ============================================================================
// REQUEST STATUS HISTORY MODEL
// ============================================================================
export const RequestStatusHistoryModel = {
  id: null,
  product_request_id: null,
  old_status: null,
  new_status: '',
  changed_by: null,
  changed_date: null,
  change_notes: ''
};
