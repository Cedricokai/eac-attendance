/**
 * Cost Tracking and Calculations Utility
 * Handles all financial calculations for inventory and product requests
 */

// ============================================================================
// PRODUCT COST CALCULATIONS
// ============================================================================

/**
 * Calculate total inventory value for a single product
 * @param {number} unitCost - Cost per unit
 * @param {number} quantity - Quantity in stock
 * @returns {number} Total value
 */
export const calculateProductTotalValue = (unitCost, quantity) => {
  if (!unitCost || !quantity) return 0;
  return parseFloat((unitCost * quantity).toFixed(2));
};

/**
 * Calculate total inventory value across all products
 * @param {array} products - Array of product objects
 * @returns {number} Total inventory value
 */
export const calculateTotalInventoryValue = (products) => {
  if (!Array.isArray(products)) return 0;
  
  return parseFloat(
    products.reduce((total, product) => {
      const productValue = calculateProductTotalValue(product.unitCost, product.stock);
      return total + productValue;
    }, 0).toFixed(2)
  );
};

/**
 * Get products grouped by cost center with total value
 * @param {array} products - Array of product objects
 * @returns {object} Products grouped by cost center with totals
 */
export const getProductsByCostCenterWithCosts = (products) => {
  const grouped = {};
  
  products.forEach(product => {
    const costCenterId = product.cost_center_id || 'unassigned';
    
    if (!grouped[costCenterId]) {
      grouped[costCenterId] = {
        cost_center_id: costCenterId,
        products: [],
        totalValue: 0,
        totalQuantity: 0
      };
    }
    
    const productValue = calculateProductTotalValue(product.unitCost, product.stock);
    grouped[costCenterId].products.push(product);
    grouped[costCenterId].totalValue = parseFloat(
      (grouped[costCenterId].totalValue + productValue).toFixed(2)
    );
    grouped[costCenterId].totalQuantity += product.stock || 0;
  });
  
  return grouped;
};

// ============================================================================
// PRODUCT REQUEST COST CALCULATIONS
// ============================================================================

/**
 * Calculate total cost for a product request
 * @param {number} quantity - Quantity requested
 * @param {number} unitCost - Unit cost
 * @returns {number} Total cost
 */
export const calculateRequestTotalCost = (quantity, unitCost) => {
  if (!quantity || !unitCost) return 0;
  return parseFloat((quantity * unitCost).toFixed(2));
};

/**
 * Calculate total cost for multiple requests
 * @param {array} requests - Array of request objects
 * @returns {number} Total cost of all requests
 */
export const calculateTotalRequestsCost = (requests) => {
  if (!Array.isArray(requests)) return 0;
  
  return parseFloat(
    requests.reduce((total, request) => {
      const requestCost = calculateRequestTotalCost(
        request.quantity_issued || request.quantity_approved || 0,
        request.unit_cost
      );
      return total + requestCost;
    }, 0).toFixed(2)
  );
};

/**
 * Calculate total cost by request status
 * @param {array} requests - Array of request objects
 * @returns {object} Cost breakdown by status
 */
export const calculateCostByStatus = (requests) => {
  const costByStatus = {
    pending: 0,
    approved_by_procurement: 0,
    approved_by_store: 0,
    issued: 0,
    rejected: 0,
    cancelled: 0
  };
  
  requests.forEach(request => {
    const quantity = request.quantity_issued || request.quantity_approved || request.quantity_requested || 0;
    const cost = calculateRequestTotalCost(quantity, request.unit_cost);
    
    const statusKey = request.status.toLowerCase().replace(/'/g, '_');
    if (costByStatus.hasOwnProperty(statusKey)) {
      costByStatus[statusKey] = parseFloat((costByStatus[statusKey] + cost).toFixed(2));
    }
  });
  
  return costByStatus;
};

/**
 * Calculate cost per employee
 * @param {array} requests - Array of request objects
 * @returns {object} Cost breakdown by employee
 */
export const calculateCostByEmployee = (requests) => {
  const costByEmployee = {};
  
  requests.forEach(request => {
    const employeeId = request.employee_id;
    const quantity = request.quantity_issued || 0;
    const cost = calculateRequestTotalCost(quantity, request.unit_cost);
    
    if (!costByEmployee[employeeId]) {
      costByEmployee[employeeId] = {
        employee_id: employeeId,
        total_cost: 0,
        total_quantity: 0,
        request_count: 0,
        requests: []
      };
    }
    
    costByEmployee[employeeId].total_cost = parseFloat(
      (costByEmployee[employeeId].total_cost + cost).toFixed(2)
    );
    costByEmployee[employeeId].total_quantity += quantity;
    costByEmployee[employeeId].request_count += 1;
    costByEmployee[employeeId].requests.push(request);
  });
  
  return costByEmployee;
};

/**
 * Calculate cost per product
 * @param {array} requests - Array of request objects
 * @returns {object} Cost breakdown by product
 */
export const calculateCostByProduct = (requests) => {
  const costByProduct = {};
  
  requests.forEach(request => {
    const productId = request.product_id;
    const productName = request.product_name || 'Unknown';
    const quantity = request.quantity_issued || 0;
    const cost = calculateRequestTotalCost(quantity, request.unit_cost);
    
    if (!costByProduct[productId]) {
      costByProduct[productId] = {
        product_id: productId,
        product_name: productName,
        total_cost: 0,
        total_quantity: 0,
        request_count: 0,
        unit_cost: request.unit_cost,
        requests: []
      };
    }
    
    costByProduct[productId].total_cost = parseFloat(
      (costByProduct[productId].total_cost + cost).toFixed(2)
    );
    costByProduct[productId].total_quantity += quantity;
    costByProduct[productId].request_count += 1;
    costByProduct[productId].requests.push(request);
  });
  
  return costByProduct;
};

// ============================================================================
// COST CENTER CALCULATIONS
// ============================================================================

/**
 * Calculate total cost for a cost center from requests
 * @param {array} requests - Array of request objects
 * @param {number} costCenterId - Cost center ID
 * @returns {number} Total cost for this cost center
 */
export const calculateCostCenterExpenses = (requests, costCenterId) => {
  if (!Array.isArray(requests)) return 0;
  
  const centerRequests = requests.filter(r => r.cost_center_id === costCenterId);
  return calculateTotalRequestsCost(centerRequests);
};

/**
 * Calculate cost breakdown by cost center
 * @param {array} requests - Array of request objects
 * @returns {object} Cost breakdown by cost center
 */
export const calculateCostByCostCenter = (requests) => {
  const costByCostCenter = {};
  
  requests.forEach(request => {
    const costCenterId = request.cost_center_id;
    const quantity = request.quantity_issued || 0;
    const cost = calculateRequestTotalCost(quantity, request.unit_cost);
    
    if (!costByCostCenter[costCenterId]) {
      costByCostCenter[costCenterId] = {
        cost_center_id: costCenterId,
        cost_center_name: request.cost_center_name || 'Unknown',
        total_cost: 0,
        total_quantity: 0,
        request_count: 0,
        budget_used: 0,
        budget_remaining: 0,
        requests: []
      };
    }
    
    costByCostCenter[costCenterId].total_cost = parseFloat(
      (costByCostCenter[costCenterId].total_cost + cost).toFixed(2)
    );
    costByCostCenter[costCenterId].total_quantity += quantity;
    costByCostCenter[costCenterId].request_count += 1;
    costByCostCenter[costCenterId].requests.push(request);
  });
  
  return costByCostCenter;
};

/**
 * Check if cost center is within budget
 * @param {number} totalCost - Total cost
 * @param {number} budget - Budget available
 * @returns {object} Budget status
 */
export const checkBudgetStatus = (totalCost, budget) => {
  const remaining = parseFloat((budget - totalCost).toFixed(2));
  const percentageUsed = parseFloat(((totalCost / budget) * 100).toFixed(2));
  
  return {
    total_cost: totalCost,
    budget: budget,
    remaining: remaining,
    percentage_used: percentageUsed,
    is_within_budget: remaining >= 0,
    is_critical: percentageUsed > 90,
    is_warning: percentageUsed > 75
  };
};

// ============================================================================
// MONTHLY / QUARTERLY / YEARLY ANALYTICS
// ============================================================================

/**
 * Calculate monthly cost
 * @param {array} requests - Array of request objects
 * @param {number} year - Year (2024, 2025, etc.)
 * @param {number} month - Month (1-12)
 * @returns {object} Monthly cost breakdown
 */
export const calculateMonthlyCost = (requests, year, month) => {
  const monthRequests = requests.filter(request => {
    if (!request.issued_date) return false;
    const date = new Date(request.issued_date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
  
  return {
    year,
    month,
    total_cost: calculateTotalRequestsCost(monthRequests),
    request_count: monthRequests.length,
    requests: monthRequests
  };
};

/**
 * Calculate quarterly cost
 * @param {array} requests - Array of request objects
 * @param {number} year - Year (2024, 2025, etc.)
 * @param {number} quarter - Quarter (1-4)
 * @returns {object} Quarterly cost breakdown
 */
export const calculateQuarterlyCost = (requests, year, quarter) => {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  
  const quarterRequests = requests.filter(request => {
    if (!request.issued_date) return false;
    const date = new Date(request.issued_date);
    const reqMonth = date.getMonth() + 1;
    return date.getFullYear() === year && reqMonth >= startMonth && reqMonth <= endMonth;
  });
  
  return {
    year,
    quarter,
    total_cost: calculateTotalRequestsCost(quarterRequests),
    request_count: quarterRequests.length,
    requests: quarterRequests
  };
};

/**
 * Calculate yearly cost
 * @param {array} requests - Array of request objects
 * @param {number} year - Year (2024, 2025, etc.)
 * @returns {object} Yearly cost breakdown
 */
export const calculateYearlyCost = (requests, year) => {
  const yearRequests = requests.filter(request => {
    if (!request.issued_date) return false;
    const date = new Date(request.issued_date);
    return date.getFullYear() === year;
  });
  
  // Break down by quarter
  const quarterlyBreakdown = {};
  for (let q = 1; q <= 4; q++) {
    quarterlyBreakdown[`Q${q}`] = calculateQuarterlyCost(yearRequests, year, q).total_cost;
  }
  
  return {
    year,
    total_cost: calculateTotalRequestsCost(yearRequests),
    request_count: yearRequests.length,
    quarterly_breakdown: quarterlyBreakdown,
    requests: yearRequests
  };
};

/**
 * Get cost trend over months
 * @param {array} requests - Array of request objects
 * @param {number} months - Number of months to analyze (default: 12)
 * @returns {array} Array of monthly costs for charting
 */
export const getCostTrend = (requests, months = 12) => {
  const trend = [];
  const today = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const monthlyCost = calculateMonthlyCost(requests, year, month);
    trend.push({
      month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
      cost: monthlyCost.total_cost,
      requests: monthlyCost.request_count
    });
  }
  
  return trend;
};

// ============================================================================
// COST COMPARISON & ANALYSIS
// ============================================================================

/**
 * Compare cost center expenses
 * @param {array} requests - Array of request objects
 * @param {array} costCenters - Array of cost center objects
 * @returns {array} Cost centers with expense comparisons
 */
export const compareCostCenterExpenses = (requests, costCenters) => {
  const costByCenter = calculateCostByCostCenter(requests);
  
  return costCenters.map(center => {
    const expenses = costByCenter[center.id] || {
      total_cost: 0,
      request_count: 0
    };
    
    return {
      ...center,
      total_cost: expenses.total_cost,
      request_count: expenses.request_count,
      ...checkBudgetStatus(expenses.total_cost, center.budget)
    };
  });
};

/**
 * Get top products by cost
 * @param {array} requests - Array of request objects
 * @param {number} limit - Number of top products to return
 * @returns {array} Top products by cost
 */
export const getTopProductsByCost = (requests, limit = 10) => {
  const costByProduct = calculateCostByProduct(requests);
  
  return Object.values(costByProduct)
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, limit);
};

/**
 * Get top employees by cost
 * @param {array} requests - Array of request objects
 * @param {number} limit - Number of top employees to return
 * @returns {array} Top employees by cost
 */
export const getTopEmployeesByCost = (requests, limit = 10) => {
  const costByEmployee = calculateCostByEmployee(requests);
  
  return Object.values(costByEmployee)
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, limit);
};

/**
 * Get average cost per request
 * @param {array} requests - Array of request objects
 * @returns {number} Average cost
 */
export const getAverageCostPerRequest = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) return 0;
  
  const totalCost = calculateTotalRequestsCost(requests);
  return parseFloat((totalCost / requests.length).toFixed(2));
};

/**
 * Get cost statistics
 * @param {array} requests - Array of request objects
 * @returns {object} Cost statistics
 */
export const getCostStatistics = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) {
    return {
      total_cost: 0,
      average_cost: 0,
      min_cost: 0,
      max_cost: 0,
      median_cost: 0,
      request_count: 0
    };
  }
  
  const costs = requests
    .filter(r => r.quantity_issued > 0)
    .map(r => calculateRequestTotalCost(r.quantity_issued, r.unit_cost));
  
  if (costs.length === 0) {
    return {
      total_cost: 0,
      average_cost: 0,
      min_cost: 0,
      max_cost: 0,
      median_cost: 0,
      request_count: 0
    };
  }
  
  const sorted = costs.sort((a, b) => a - b);
  const total = costs.reduce((sum, cost) => sum + cost, 0);
  const average = total / costs.length;
  const median = costs.length % 2 === 0
    ? (sorted[costs.length / 2 - 1] + sorted[costs.length / 2]) / 2
    : sorted[Math.floor(costs.length / 2)];
  
  return {
    total_cost: parseFloat(total.toFixed(2)),
    average_cost: parseFloat(average.toFixed(2)),
    min_cost: parseFloat(Math.min(...costs).toFixed(2)),
    max_cost: parseFloat(Math.max(...costs).toFixed(2)),
    median_cost: parseFloat(median.toFixed(2)),
    request_count: costs.length
  };
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  });
  return formatter.format(amount);
};

/**
 * Format currency short (e.g., $10.5K)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrencyShort = (amount) => {
  if (amount >= 1000000) {
    return '$' + (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return '$' + (amount / 1000).toFixed(1) + 'K';
  }
  return '$' + amount.toFixed(2);
};

/**
 * Format percentage
 * @param {number} value - Value to format
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
  return (Math.round(value * 100) / 100).toFixed(2) + '%';
};
