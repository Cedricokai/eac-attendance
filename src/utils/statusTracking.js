/**
 * Status Tracking Utilities
 * Handles request status workflow, transitions, and validations
 */

import { REQUEST_STATUS } from '../config/dataModels';

// ============================================================================
// STATUS VALIDATION & WORKFLOW
// ============================================================================

/**
 * Get valid next statuses for a given current status
 * @param {string} currentStatus - Current request status
 * @returns {array} Array of valid next statuses
 */
export const getValidNextStatuses = (currentStatus) => {
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
      REQUEST_STATUS.ISSUED,
      REQUEST_STATUS.REJECTED_BY_STORE
    ],
    [REQUEST_STATUS.ISSUED]: [],
    [REQUEST_STATUS.REJECTED_BY_PROCUREMENT]: [],
    [REQUEST_STATUS.REJECTED_BY_STORE]: [],
    [REQUEST_STATUS.CANCELLED]: []
  };

  return workflows[currentStatus] || [];
};

/**
 * Check if a status transition is valid
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired status
 * @returns {boolean} Whether the transition is valid
 */
export const isValidStatusTransition = (fromStatus, toStatus) => {
  if (fromStatus === toStatus) return false;
  return getValidNextStatuses(fromStatus).includes(toStatus);
};

/**
 * Get status description
 * @param {string} status - Request status
 * @returns {string} Status description
 */
export const getStatusDescription = (status) => {
  const descriptions = {
    [REQUEST_STATUS.PENDING]: 'Request is pending review by Procurement Manager',
    [REQUEST_STATUS.APPROVED_BY_PROCUREMENT]: 'Procurement Manager has approved the request. Awaiting Store Officer approval.',
    [REQUEST_STATUS.REJECTED_BY_PROCUREMENT]: 'Procurement Manager has rejected this request',
    [REQUEST_STATUS.APPROVED_BY_STORE]: 'Store Officer has approved the request. Ready to be issued.',
    [REQUEST_STATUS.REJECTED_BY_STORE]: 'Store Officer has rejected this request',
    [REQUEST_STATUS.ISSUED]: 'Product has been successfully issued to the employee',
    [REQUEST_STATUS.CANCELLED]: 'Request has been cancelled'
  };

  return descriptions[status] || 'Unknown status';
};

// ============================================================================
// STATUS ANALYSIS
// ============================================================================

/**
 * Check if status is terminal (no further transitions)
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isTerminalStatus = (status) => {
  const terminal = [
    REQUEST_STATUS.ISSUED,
    REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
    REQUEST_STATUS.REJECTED_BY_STORE,
    REQUEST_STATUS.CANCELLED
  ];
  return terminal.includes(status);
};

/**
 * Check if status is rejected
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isRejectedStatus = (status) => {
  return status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT ||
         status === REQUEST_STATUS.REJECTED_BY_STORE;
};

/**
 * Check if status is approved
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isApprovedStatus = (status) => {
  return status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT ||
         status === REQUEST_STATUS.APPROVED_BY_STORE ||
         status === REQUEST_STATUS.ISSUED;
};

/**
 * Check if status is pending approval
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isPendingApprovalStatus = (status) => {
  return status === REQUEST_STATUS.PENDING ||
         status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT;
};

/**
 * Check if request requires procurement manager action
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const requiresProcurementAction = (status) => {
  return status === REQUEST_STATUS.PENDING;
};

/**
 * Check if request requires store officer action
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const requiresStoreAction = (status) => {
  return status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT;
};

/**
 * Check if request is ready for issuance
 * @param {string} status - Request status
 * @returns {boolean}
 */
export const isReadyForIssuance = (status) => {
  return status === REQUEST_STATUS.APPROVED_BY_STORE;
};

// ============================================================================
// STATUS STATISTICS
// ============================================================================

/**
 * Count requests by status
 * @param {array} requests - Array of request objects
 * @returns {object} Count of requests by status
 */
export const countRequestsByStatus = (requests) => {
  if (!Array.isArray(requests)) return {};

  const counts = {
    [REQUEST_STATUS.PENDING]: 0,
    [REQUEST_STATUS.APPROVED_BY_PROCUREMENT]: 0,
    [REQUEST_STATUS.REJECTED_BY_PROCUREMENT]: 0,
    [REQUEST_STATUS.APPROVED_BY_STORE]: 0,
    [REQUEST_STATUS.REJECTED_BY_STORE]: 0,
    [REQUEST_STATUS.ISSUED]: 0,
    [REQUEST_STATUS.CANCELLED]: 0
  };

  requests.forEach(request => {
    if (counts.hasOwnProperty(request.status)) {
      counts[request.status]++;
    }
  });

  return counts;
};

/**
 * Calculate status percentages
 * @param {array} requests - Array of request objects
 * @returns {object} Percentage of requests in each status
 */
export const calculateStatusPercentages = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) {
    return {};
  }

  const counts = countRequestsByStatus(requests);
  const total = requests.length;
  const percentages = {};

  Object.keys(counts).forEach(status => {
    percentages[status] = parseFloat(((counts[status] / total) * 100).toFixed(2));
  });

  return percentages;
};

/**
 * Get approval rate (issued / total)
 * @param {array} requests - Array of request objects
 * @returns {number} Approval rate as percentage
 */
export const getApprovalRate = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) return 0;

  const issued = requests.filter(r => r.status === REQUEST_STATUS.ISSUED).length;
  return parseFloat(((issued / requests.length) * 100).toFixed(2));
};

/**
 * Get rejection rate
 * @param {array} requests - Array of request objects
 * @returns {number} Rejection rate as percentage
 */
export const getRejectionRate = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) return 0;

  const rejected = requests.filter(r => isRejectedStatus(r.status)).length;
  return parseFloat(((rejected / requests.length) * 100).toFixed(2));
};

/**
 * Get pending requests count
 * @param {array} requests - Array of request objects
 * @returns {number} Count of pending requests
 */
export const getPendingRequestsCount = (requests) => {
  if (!Array.isArray(requests)) return 0;
  return requests.filter(r => requiresProcurementAction(r.status)).length;
};

/**
 * Get requests awaiting store approval
 * @param {array} requests - Array of request objects
 * @returns {number} Count of requests awaiting store approval
 */
export const getAwaitingStoreApprovalCount = (requests) => {
  if (!Array.isArray(requests)) return 0;
  return requests.filter(r => requiresStoreAction(r.status)).length;
};

// ============================================================================
// STATUS FILTERING
// ============================================================================

/**
 * Filter requests by status
 * @param {array} requests - Array of request objects
 * @param {string} status - Status to filter by
 * @returns {array} Filtered requests
 */
export const filterByStatus = (requests, status) => {
  if (!Array.isArray(requests)) return [];
  return requests.filter(r => r.status === status);
};

/**
 * Filter requests by multiple statuses
 * @param {array} requests - Array of request objects
 * @param {array} statuses - Statuses to filter by
 * @returns {array} Filtered requests
 */
export const filterByStatuses = (requests, statuses) => {
  if (!Array.isArray(requests) || !Array.isArray(statuses)) return [];
  return requests.filter(r => statuses.includes(r.status));
};

/**
 * Filter pending requests
 * @param {array} requests - Array of request objects
 * @returns {array} Pending requests
 */
export const filterPending = (requests) => {
  return filterByStatus(requests, REQUEST_STATUS.PENDING);
};

/**
 * Filter approved requests
 * @param {array} requests - Array of request objects
 * @returns {array} Approved requests
 */
export const filterApproved = (requests) => {
  return filterByStatuses(requests, [
    REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
    REQUEST_STATUS.APPROVED_BY_STORE
  ]);
};

/**
 * Filter issued requests
 * @param {array} requests - Array of request objects
 * @returns {array} Issued requests
 */
export const filterIssued = (requests) => {
  return filterByStatus(requests, REQUEST_STATUS.ISSUED);
};

/**
 * Filter rejected requests
 * @param {array} requests - Array of request objects
 * @returns {array} Rejected requests
 */
export const filterRejected = (requests) => {
  return filterByStatuses(requests, [
    REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
    REQUEST_STATUS.REJECTED_BY_STORE
  ]);
};

// ============================================================================
// STATUS TIMELINE & HISTORY
// ============================================================================

/**
 * Create status change record for history
 * @param {number} requestId - Request ID
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {number} changedBy - User ID who made the change
 * @param {string} notes - Change notes/comments
 * @returns {object} Status history record
 */
export const createStatusHistoryRecord = (requestId, oldStatus, newStatus, changedBy, notes = '') => {
  return {
    product_request_id: requestId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: changedBy,
    changed_date: new Date().toISOString(),
    change_notes: notes
  };
};

/**
 * Get timeline between two statuses
 * @param {array} historyRecords - Array of status history records
 * @returns {array} History records in chronological order
 */
export const getStatusTimeline = (historyRecords) => {
  if (!Array.isArray(historyRecords)) return [];
  
  return [...historyRecords].sort((a, b) => {
    return new Date(a.changed_date) - new Date(b.changed_date);
  });
};

/**
 * Calculate time spent in each status
 * @param {array} historyRecords - Array of status history records
 * @returns {object} Time (in minutes) spent in each status
 */
export const calculateTimeInStatuses = (historyRecords) => {
  if (!Array.isArray(historyRecords) || historyRecords.length === 0) return {};

  const timeline = getStatusTimeline(historyRecords);
  const timeSpent = {};

  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i];
    const next = timeline[i + 1];
    const status = current.new_status;
    const time = (new Date(next.changed_date) - new Date(current.changed_date)) / (1000 * 60);

    if (!timeSpent[status]) {
      timeSpent[status] = 0;
    }
    timeSpent[status] += time;
  }

  return timeSpent;
};

/**
 * Get average approval time
 * @param {array} requests - Array of request objects with dates
 * @returns {number} Average time in minutes
 */
export const getAverageApprovalTime = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) return 0;

  const issuedRequests = requests.filter(r => r.status === REQUEST_STATUS.ISSUED);
  if (issuedRequests.length === 0) return 0;

  const times = issuedRequests.map(r => {
    const created = new Date(r.created_date);
    const issued = new Date(r.issued_date);
    return (issued - created) / (1000 * 60); // in minutes
  });

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  return parseFloat((totalTime / times.length).toFixed(2));
};

/**
 * Format time in minutes to readable format
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
export const formatTimeSpent = (minutes) => {
  if (!minutes || minutes < 0) return '0 min';

  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = Math.floor(minutes % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}min`);

  return parts.join(' ') || '0 min';
};

// ============================================================================
// STATUS INDICATORS & ALERTS
// ============================================================================

/**
 * Determine if a request needs attention
 * @param {object} request - Request object
 * @returns {boolean}
 */
export const needsAttention = (request) => {
  return requiresProcurementAction(request.status) ||
         requiresStoreAction(request.status);
};

/**
 * Determine priority level for a request
 * @param {object} request - Request object
 * @param {number} hoursOld - How many hours old the request is
 * @returns {string} Priority level: 'critical', 'high', 'normal'
 */
export const determinePriority = (request, hoursOld) => {
  if (isTerminalStatus(request.status)) return 'normal';

  if (hoursOld > 72) return 'critical'; // Over 3 days
  if (hoursOld > 48) return 'high'; // Over 2 days
  return 'normal';
};

/**
 * Get requests that are overdue (pending for too long)
 * @param {array} requests - Array of request objects
 * @param {number} hours - Hours threshold (default: 48)
 * @returns {array} Overdue requests
 */
export const getOverdueRequests = (requests, hours = 48) => {
  if (!Array.isArray(requests)) return [];

  const now = new Date();
  return requests.filter(r => {
    if (isTerminalStatus(r.status)) return false;

    const createdDate = new Date(r.created_date);
    const hoursOld = (now - createdDate) / (1000 * 60 * 60);
    return hoursOld > hours;
  });
};
