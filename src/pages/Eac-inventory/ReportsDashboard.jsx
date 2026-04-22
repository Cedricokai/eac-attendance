import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Card,
  CardBody,
  CardFooter,
  Typography,
  Button,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Spinner,
  Alert,
  Chip,
  Select,
  Option,
  Input
} from "@material-tailwind/react";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  TruckIcon,
  ShieldCheckIcon,
  HomeIcon,
  ArchiveBoxIcon,
  CubeIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Utility functions for cedis
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatCurrencyShort = (amount) => {
  const amt = amount || 0;
  if (amt >= 1000000) {
    return `GH₵${(amt / 1000000).toFixed(1)}M`;
  } else if (amt >= 1000) {
    return `GH₵${(amt / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amt);
};

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8080";
  }
  if (hostname.startsWith("192.168.")) {
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }
  if (hostname === "100.114.178.13") {
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

const API_BASE_URL = getApiBaseUrl();

// Get authentication token
const getAuthToken = () => {
  return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
};

const getStatusText = (status) => {
  const statusMap = {
    'PENDING': 'Pending',
    'APPROVED_BY_PROCUREMENT': 'Approved by Procurement',
    'APPROVED_BY_STORE': 'Approved by Store',
    'ISSUED': 'Issued',
    'REJECTED_BY_PROCUREMENT': 'Rejected by Procurement',
    'REJECTED_BY_STORE': 'Rejected by Store',
    'TRANSFER': 'Transferred',
    'DELIVERED': 'Delivered',
    'RECEIVED': 'Received',
    'RETURNED': 'Returned',
    'NOT_RETURNED': 'Not Returned',
    'OVERDUE': 'Overdue'
  };
  return statusMap[status] || status;
};

// Safe date parsing function
const parseDate = (dateString) => {
  if (!dateString) return new Date(); // Return current date if null
  
  try {
    // Handle different date formats
    let date;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    }
    // If it's a string
    else if (typeof dateString === 'string') {
      // Try parsing as ISO string first
      date = new Date(dateString);
      
      // If invalid, try other formats
      if (isNaN(date.getTime())) {
        // Try removing timezone if present
        const cleaned = dateString.split('T')[0];
        date = new Date(cleaned);
        
        if (isNaN(date.getTime())) {
          // Try parsing as timestamp
          const timestamp = Date.parse(dateString);
          if (!isNaN(timestamp)) {
            date = new Date(timestamp);
          } else {
            console.warn('Invalid date string, using current date:', dateString);
            return new Date();
          }
        }
      }
    }
    // If it's a number (timestamp)
    else if (typeof dateString === 'number') {
      date = new Date(dateString);
    }
    // Unknown format
    else {
      console.warn('Unknown date format, using current date:', dateString);
      return new Date();
    }

    // Final validation
    if (isNaN(date.getTime())) {
      console.warn('Invalid date, using current date:', dateString);
      return new Date();
    }
    
    return date;
  } catch (error) {
    console.warn('Error parsing date, using current date:', dateString, error);
    return new Date();
  }
};

// Get month key from date (YYYY-MM)
const getMonthKey = (date) => {
  const parsedDate = parseDate(date);
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const ReportsDashboard = () => {
  const navigate = useNavigate();

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [outgoingRecords, setOutgoingRecords] = useState([]);
  const [issuedRequests, setIssuedRequests] = useState([]);
  
  // Statistics states
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    totalCost: 0,
    approvalRate: 0,
    avgCostPerRequest: 0,
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalInventoryValue: 0,
    totalOutgoingItems: 0,
    returnableItems: 0,
    returnedItems: 0,
    overdueItems: 0,
    notReturnedItems: 0,
    ppeItems: 0,
    kitchenItems: 0,
    returnableStoreItems: 0,
    regularStoreItems: 0
  });

  // Chart data states
  const [requestsByStatusData, setRequestsByStatusData] = useState([]);
  const [inventoryByStoreTypeData, setInventoryByStoreTypeData] = useState([]);
  const [productsByCategoryData, setProductsByCategoryData] = useState([]);
  const [monthlyOutgoingData, setMonthlyOutgoingData] = useState([]);
  const [returnStatusData, setReturnStatusData] = useState([]);
  const [topProductsByValueData, setTopProductsByValueData] = useState([]);
  const [monthlyRequestCostData, setMonthlyRequestCostData] = useState([]);

  // Filter states
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Fetch all data in parallel
      const [
        requestsRes,
        productsRes,
        outgoingRes,
        issuedRequestsRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/inventory-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : []).catch(() => []),
        fetch(`${API_BASE_URL}/api/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : []).catch(() => []),
        fetch(`${API_BASE_URL}/api/outgoing`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : []).catch(() => []),
        fetch(`${API_BASE_URL}/api/inventory-requests/issued`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : []).catch(() => [])
      ]);

      // Ensure data is arrays
      const requestsData = Array.isArray(requestsRes) ? requestsRes : [];
      const productsData = Array.isArray(productsRes) ? productsRes : [];
      const outgoingData = Array.isArray(outgoingRes) ? outgoingRes : [];
      const issuedRequestsData = Array.isArray(issuedRequestsRes) ? issuedRequestsRes : [];

      console.log('Fetched data:', {
        requests: requestsData.length,
        products: productsData.length,
        outgoing: outgoingData.length,
        issuedRequests: issuedRequestsData.length
      });

      // Clean and normalize data
      const cleanedRequests = requestsData.map(req => ({
        ...req,
        createdDate: req.createdDate || req.date || req.request_date || req.requestDate || new Date().toISOString(),
        unit_cost: parseFloat(req.unit_cost || req.unitCost || 0),
        quantity_requested: parseInt(req.quantity_requested || req.quantity || req.quantityRequested || 0),
        quantity_approved: parseInt(req.quantity_approved || req.approvedQuantity || req.quantity || 0)
      }));

      const cleanedProducts = productsData.map(product => ({
        ...product,
        stock: parseInt(product.stock || 0),
        unitCost: parseFloat(product.unitCost || 0),
        ppe: Boolean(product.ppe || product.isPpe),
        kitchenStore: Boolean(product.kitchenStore),
        returnableAfterUse: Boolean(product.returnableAfterUse || product.returnable)
      }));

      const cleanedOutgoing = outgoingData.map(record => ({
        ...record,
        date: record.date || record.createdDate || record.movementDate || record.transferDate || new Date().toISOString(),
        quantity: parseInt(record.quantity || record.quantityMoved || 0),
        unitCost: parseFloat(record.unitCost || record.unit_cost || 0),
        returnableAfterUse: Boolean(record.returnableAfterUse || record.returnable),
        returnStatus: (record.returnStatus || record.return_status || '').toUpperCase()
      }));

      const cleanedIssuedRequests = issuedRequestsData.map(req => ({
        ...req,
        issuedDate: req.issuedDate || req.requestDate || req.createdDate || req.date || new Date().toISOString(),
        returnableAfterUse: Boolean(req.returnableAfterUse || req.returnable || 
          (req.items && req.items.some(item => item.returnableAfterUse || item.returnable))),
        returnStatus: (req.returnStatus || req.return_status || '').toUpperCase()
      }));

      // Set data
      setRequests(cleanedRequests);
      setProducts(cleanedProducts);
      setOutgoingRecords(cleanedOutgoing);
      setIssuedRequests(cleanedIssuedRequests);

      // Calculate statistics
      calculateStatistics(cleanedRequests, cleanedProducts, cleanedOutgoing, cleanedIssuedRequests);
      
      // Prepare chart data
      prepareChartData(cleanedRequests, cleanedProducts, cleanedOutgoing, cleanedIssuedRequests);

      setError(null);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data: ' + err.message);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (requestsData, productsData, outgoingData, issuedRequestsData) => {
    // Filter requests by date range
    const startDate = parseDate(dateRange.start);
    const endDate = parseDate(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    const filteredRequests = requestsData.filter(req => {
      const reqDate = parseDate(req.createdDate);
      return reqDate >= startDate && reqDate <= endDate;
    });

    // Calculate request statistics
    const totalRequests = filteredRequests.length;
    const approvedRequests = filteredRequests.filter(req => 
      req.status === 'ISSUED' || req.status === 'APPROVED_BY_STORE' || req.status === 'APPROVED_BY_PROCUREMENT'
    ).length;
    const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;
    
    // Calculate total cost in cedis
    const totalCost = filteredRequests.reduce((total, request) => {
      const quantity = request.quantity_approved || request.quantity_requested || request.quantity || 0;
      const unitCost = request.unit_cost || request.unitCost || 0;
      return total + (quantity * unitCost);
    }, 0);
    
    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

    // Calculate product statistics
    const totalProducts = productsData.length;
    const lowStockItems = productsData.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length;
    const outOfStockItems = productsData.filter(p => (p.stock || 0) === 0).length;
    const totalInventoryValue = productsData.reduce((total, product) => {
      return total + ((product.stock || 0) * (product.unitCost || 0));
    }, 0);

    // Calculate store type counts
    const ppeItems = productsData.filter(p => p.ppe === true).length;
    const kitchenItems = productsData.filter(p => p.kitchenStore === true).length;
    const returnableStoreItems = productsData.filter(p => p.returnableAfterUse === true).length;
    const regularStoreItems = productsData.filter(p => 
      p.ppe === false && 
      p.kitchenStore === false &&
      p.returnableAfterUse === false
    ).length;

    // Calculate outgoing statistics
    const allOutgoing = [...outgoingData, ...issuedRequestsData];
    const totalOutgoingItems = allOutgoing.length;
    
    const returnableItems = allOutgoing.filter(item => 
      item.returnableAfterUse || 
      (item.items && item.items.some(i => i.returnableAfterUse))
    ).length;
    
    const returnedItems = allOutgoing.filter(item => 
      item.returnStatus === 'RETURNED'
    ).length;
    
    const overdueItems = allOutgoing.filter(item => 
      item.returnStatus === 'OVERDUE'
    ).length;
    
    const notReturnedItems = allOutgoing.filter(item => 
      item.returnStatus === 'NOT_RETURNED'
    ).length;

    setStatistics({
      totalRequests,
      totalCost,
      approvalRate,
      avgCostPerRequest,
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalInventoryValue,
      totalOutgoingItems,
      returnableItems,
      returnedItems,
      overdueItems,
      notReturnedItems,
      ppeItems,
      kitchenItems,
      returnableStoreItems,
      regularStoreItems
    });
  };

  const prepareChartData = (requestsData, productsData, outgoingData, issuedRequestsData) => {
    console.log('Preparing chart data...');
    console.log('Requests data length:', requestsData.length);
    console.log('Products data length:', productsData.length);
    console.log('Outgoing data length:', outgoingData.length);
    console.log('Issued requests length:', issuedRequestsData.length);

    // Filter requests by date range
    const startDate = parseDate(dateRange.start);
    const endDate = parseDate(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    const filteredRequests = requestsData.filter(req => {
      try {
        const reqDate = parseDate(req.createdDate);
        return reqDate >= startDate && reqDate <= endDate;
      } catch (error) {
        console.warn('Error filtering request date:', req, error);
        return false;
      }
    });

    // 1. Requests by Status
    const statusCounts = {};
    filteredRequests.forEach(req => {
      const status = req.status || 'PENDING';
      const statusText = getStatusText(status);
      statusCounts[statusText] = (statusCounts[statusText] || 0) + 1;
    });
    
    const requestsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: getStatusColor(status)
    }));
    console.log('Requests by status:', requestsByStatus);
    setRequestsByStatusData(requestsByStatus);

    // 2. Inventory by Store Type
    const regularStoreProducts = productsData.filter(p => 
      p.ppe === false && 
      p.kitchenStore === false && 
      p.returnableAfterUse === false
    );
    
    const ppeStoreProducts = productsData.filter(p => p.ppe === true);
    const kitchenStoreProducts = productsData.filter(p => p.kitchenStore === true);
    const returnableProducts = productsData.filter(p => p.returnableAfterUse === true);

    const storeTypeData = [
      {
        name: 'Regular Store',
        value: regularStoreProducts.length,
        inventoryValue: regularStoreProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.unitCost || 0)), 0),
        color: '#3b82f6'
      },
      {
        name: 'PPE Store',
        value: ppeStoreProducts.length,
        inventoryValue: ppeStoreProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.unitCost || 0)), 0),
        color: '#8b5cf6'
      },
      {
        name: 'Kitchen Store',
        value: kitchenStoreProducts.length,
        inventoryValue: kitchenStoreProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.unitCost || 0)), 0),
        color: '#f59e0b'
      },
      {
        name: 'Returnable Items',
        value: returnableProducts.length,
        inventoryValue: returnableProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.unitCost || 0)), 0),
        color: '#10b981'
      }
    ].filter(store => store.value > 0); // Only show stores with items
    console.log('Store type data:', storeTypeData);
    setInventoryByStoreTypeData(storeTypeData);

    // 3. Products by Category
    const categoryCounts = {};
    productsData.forEach(product => {
      const category = product.productType || product.category || 'Uncategorized';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    const productsByCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, count], index) => ({
        name: category.length > 20 ? category.substring(0, 20) + '...' : category,
        fullName: category,
        value: count,
        color: COLORS[index % COLORS.length]
      }));
    console.log('Products by category:', productsByCategory);
    setProductsByCategoryData(productsByCategory);

    // 4. Monthly Outgoing Data (last 6 months)
    const monthlyOutgoing = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      
      // Count items for this month
      let monthCount = 0;
      let monthCost = 0;
      
      // Check outgoing records
      outgoingData.forEach(item => {
        try {
          const itemDate = parseDate(item.date);
          if (getMonthKey(itemDate) === monthKey) {
            monthCount++;
            const quantity = item.quantity || 0;
            const unitCost = item.unitCost || 0;
            monthCost += quantity * unitCost;
          }
        } catch (error) {
          console.warn('Error processing outgoing item date:', item, error);
        }
      });
      
      // Check issued requests
      issuedRequestsData.forEach(req => {
        try {
          const itemDate = parseDate(req.issuedDate);
          if (getMonthKey(itemDate) === monthKey) {
            monthCount++;
            // Estimate cost from issued requests if available
            if (req.items && Array.isArray(req.items)) {
              req.items.forEach(item => {
                const quantity = item.issuedQuantity || item.quantity || 0;
                const unitCost = item.unitPrice || item.unitCost || 0;
                monthCost += quantity * unitCost;
              });
            }
          }
        } catch (error) {
          console.warn('Error processing issued request date:', req, error);
        }
      });
      
      monthlyOutgoing.push({
        name: monthName,
        count: monthCount,
        value: monthCost
      });
    }
    
    console.log('Monthly outgoing data:', monthlyOutgoing);
    setMonthlyOutgoingData(monthlyOutgoing);

    // 5. Return Status Data
    const allOutgoing = [...outgoingData, ...issuedRequestsData];
    const returnableOutgoing = allOutgoing.filter(item => 
      item.returnableAfterUse || 
      (item.items && item.items.some(i => i.returnableAfterUse))
    );

    const returnStatusCounts = {
      'RETURNED': 0,
      'NOT RETURNED': 0,
      'OVERDUE': 0,
      'PENDING': 0
    };

    returnableOutgoing.forEach(item => {
      const status = item.returnStatus || 'PENDING';
      if (status === 'RETURNED') returnStatusCounts['RETURNED']++;
      else if (status === 'NOT_RETURNED') returnStatusCounts['NOT RETURNED']++;
      else if (status === 'OVERDUE') returnStatusCounts['OVERDUE']++;
      else returnStatusCounts['PENDING']++;
    });

    const returnStatusData = Object.entries(returnStatusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count], index) => ({
        name: status,
        value: count,
        color: getReturnStatusColor(status)
      }));
    console.log('Return status data:', returnStatusData);
    setReturnStatusData(returnStatusData);

    // 6. Top Products by Inventory Value
    const topProductsByValue = productsData
      .map(product => ({
        name: product.name || 'Unnamed Product',
        fullName: product.name || 'Unnamed Product',
        value: (product.stock || 0) * (product.unitCost || 0),
        stock: product.stock || 0,
        unitCost: product.unitCost || 0,
        category: product.productType || 'Uncategorized'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(item => ({
        ...item,
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name
      }));
    
    console.log('Top products by value:', topProductsByValue);
    setTopProductsByValueData(topProductsByValue);

    // 7. Monthly Request Cost Data
    const monthlyRequestCost = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      
      let monthRequests = 0;
      let monthCost = 0;
      
      filteredRequests.forEach(req => {
        try {
          const reqDate = parseDate(req.createdDate);
          if (getMonthKey(reqDate) === monthKey) {
            monthRequests++;
            const quantity = req.quantity_approved || req.quantity_requested || req.quantity || 0;
            const unitCost = req.unit_cost || req.unitCost || 0;
            monthCost += quantity * unitCost;
          }
        } catch (error) {
          console.warn('Error processing request date:', req, error);
        }
      });
      
      monthlyRequestCost.push({
        name: monthName,
        requests: monthRequests,
        value: monthCost
      });
    }
    
    console.log('Monthly request cost data:', monthlyRequestCost);
    setMonthlyRequestCostData(monthlyRequestCost);
  };

  // Helper functions for colors
  const getStatusColor = (status) => {
    if (status.includes('Issued') || status.includes('Approved')) return '#10b981';
    if (status.includes('Pending')) return '#f59e0b';
    if (status.includes('Rejected')) return '#ef4444';
    if (status.includes('Transferred')) return '#3b82f6';
    return '#6b7280';
  };

  const getReturnStatusColor = (status) => {
    if (status === 'RETURNED') return '#10b981';
    if (status === 'NOT RETURNED') return '#ef4444';
    if (status === 'OVERDUE') return '#f59e0b';
    if (status === 'PENDING') return '#3b82f6';
    return '#6b7280';
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const handleApplyDateFilter = () => {
    if (!requests.length || !products.length) {
      toast.warning('No data available to filter');
      return;
    }
    
    calculateStatistics(requests, products, outgoingRecords, issuedRequests);
    prepareChartData(requests, products, outgoingRecords, issuedRequests);
    toast.info('Date filter applied');
  };

  const handleDateRangeChange = (type, value) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  // Export function
  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      statistics,
      summary: {
        totalInventoryValue: formatCurrency(statistics.totalInventoryValue),
        totalRequestsCost: formatCurrency(statistics.totalCost),
        totalProducts: statistics.totalProducts,
        approvalRate: `${statistics.approvalRate}%`,
        returnRate: statistics.returnableItems > 0 ? 
          `${Math.round((statistics.returnedItems / statistics.returnableItems) * 100)}%` : '0%'
      },
      chartData: {
        requestsByStatus: requestsByStatusData,
        inventoryByStoreType: inventoryByStoreTypeData,
        productsByCategory: productsByCategoryData,
        monthlyOutgoing: monthlyOutgoingData,
        returnStatus: returnStatusData,
        topProductsByValue: topProductsByValueData,
        monthlyRequestCost: monthlyRequestCostData
      }
    };

    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully!');
  };

  const handleRefresh = () => {
    fetchAllData();
    toast.info('Refreshing report data...');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Spinner className="h-12 w-12 mb-4" />
        <Typography variant="h6" color="gray">Loading report data...</Typography>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="text"
              color="blue"
              onClick={() => navigate(-1)}
              className="rounded-full p-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <div>
              <Typography variant="h3" color="blue-gray" className="text-xl md:text-3xl">
                Inventory Analytics Dashboard
              </Typography>
              <Typography variant="small" color="gray" className="text-xs md:text-sm">
                Comprehensive inventory and request analytics • All amounts in Ghana Cedis (GHS)
              </Typography>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <Card className="shadow-sm mb-4">
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Typography variant="small" className="mb-2 text-xs md:text-sm">Start Date</Typography>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Typography variant="small" className="mb-2 text-xs md:text-sm">End Date</Typography>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleApplyDateFilter}
                    color="blue"
                    className="w-full"
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  color="blue"
                  onClick={handleRefresh}
                  className="whitespace-nowrap"
                >
                  Refresh Data
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert color="red" className="mb-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <Typography className="text-sm">{error}</Typography>
          </Alert>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="shadow-sm">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CubeIcon className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <Typography variant="small" color="gray" className="text-xs md:text-sm">Total Inventory Value</Typography>
            </div>
            <Typography variant="h4" className="text-lg md:text-xl font-bold mt-2">
              {formatCurrencyShort(statistics.totalInventoryValue)}
            </Typography>
            <Typography variant="small" color="blue" className="mt-1 text-xs">
              {statistics.totalProducts} products
            </Typography>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DocumentCheckIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <Typography variant="small" color="gray" className="text-xs md:text-sm">Total Requests</Typography>
            </div>
            <Typography variant="h4" className="text-lg md:text-xl font-bold mt-2">
              {statistics.totalRequests}
            </Typography>
            <Typography variant="small" color="green" className="mt-1 text-xs">
              {statistics.approvalRate}% approval rate
            </Typography>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TruckIcon className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
              </div>
              <Typography variant="small" color="gray" className="text-xs md:text-sm">Outgoing Items</Typography>
            </div>
            <Typography variant="h4" className="text-lg md:text-xl font-bold mt-2">
              {statistics.totalOutgoingItems}
            </Typography>
            <Typography variant="small" color="orange" className="mt-1 text-xs">
              {statistics.returnableItems} returnable
            </Typography>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </div>
              <Typography variant="small" color="gray" className="text-xs md:text-sm">Stock Issues</Typography>
            </div>
            <Typography variant="h4" className="text-lg md:text-xl font-bold mt-2">
              {statistics.outOfStockItems}
            </Typography>
            <Typography variant="small" color="red" className="mt-1 text-xs">
              {statistics.lowStockItems} low stock
            </Typography>
          </CardBody>
        </Card>
      </div>

      {/* Store Type Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="shadow-sm">
          <CardBody className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray" className="text-xs">Regular Store</Typography>
                <Typography variant="h6" className="text-sm md:text-base font-bold mt-1">
                  {statistics.regularStoreItems}
                </Typography>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <CubeIcon className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray" className="text-xs">PPE Store</Typography>
                <Typography variant="h6" className="text-sm md:text-base font-bold mt-1">
                  {statistics.ppeItems}
                </Typography>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShieldCheckIcon className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray" className="text-xs">Kitchen Store</Typography>
                <Typography variant="h6" className="text-sm md:text-base font-bold mt-1">
                  {statistics.kitchenItems}
                </Typography>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <HomeIcon className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardBody className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray" className="text-xs">Returnable Items</Typography>
                <Typography variant="h6" className="text-sm md:text-base font-bold mt-1">
                  {statistics.returnableStoreItems}
                </Typography>
              </div>
              <div className="p-2 bg-teal-100 rounded-lg">
                <ArchiveBoxIcon className="h-4 w-4 text-teal-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <Tabs value={activeTab}>
          <TabsHeader className="bg-gray-50 border-b rounded-t-lg">
            <div className="flex overflow-x-auto">
              <Tab
                value="overview"
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap"
              >
                <ChartBarIcon className="h-4 w-4" />
                Overview
              </Tab>
              <Tab
                value="inventory"
                onClick={() => setActiveTab('inventory')}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap"
              >
                <CubeIcon className="h-4 w-4" />
                Inventory
              </Tab>
              <Tab
                value="requests"
                onClick={() => setActiveTab('requests')}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap"
              >
                <DocumentCheckIcon className="h-4 w-4" />
                Requests
              </Tab>
              <Tab
                value="outgoing"
                onClick={() => setActiveTab('outgoing')}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap"
              >
                <TruckIcon className="h-4 w-4" />
                Outgoing
              </Tab>
              <Tab
                value="financial"
                onClick={() => setActiveTab('financial')}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap"
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                Financial
              </Tab>
            </div>
          </TabsHeader>

          <TabsBody className="p-4">
            {/* Overview Tab */}
            <TabPanel value="overview" className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory Value by Store Type */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Inventory Distribution by Store Type
                    </Typography>
                    {inventoryByStoreTypeData.length > 0 ? (
                      <>
                        <div className="h-64 md:h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={inventoryByStoreTypeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}\n${formatCurrencyShort(entry.inventoryValue)}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="inventoryValue"
                              >
                                {inventoryByStoreTypeData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value) => formatCurrency(value)}
                                labelFormatter={(name) => `Store: ${name}`}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {inventoryByStoreTypeData.map((store, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: store.color }} />
                              <div className="flex-1 min-w-0">
                                <Typography variant="small" className="truncate text-xs">{store.name}</Typography>
                              </div>
                              <Typography variant="small" className="font-semibold text-xs">
                                {store.value} items
                              </Typography>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-64 md:h-72 flex items-center justify-center">
                        <Typography variant="small" color="gray">No inventory data available</Typography>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Return Status */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Returnable Items Status
                    </Typography>
                    {returnStatusData.length > 0 ? (
                      <>
                        <div className="h-64 md:h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={returnStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {returnStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    ) : (
                      <div className="h-64 md:h-72 flex items-center justify-center">
                        <Typography variant="small" color="gray">No returnable items data available</Typography>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </TabPanel>

            {/* Inventory Tab */}
            <TabPanel value="inventory" className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Products by Category */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Product Categories
                    </Typography>
                    {productsByCategoryData.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productsByCategoryData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              interval={0}
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" name="Number of Products" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-72 flex items-center justify-center">
                        <Typography variant="small" color="gray">No product category data available</Typography>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Stock Level Statistics */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Stock Level Statistics
                    </Typography>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Typography variant="small" color="gray" className="mb-1 text-xs">
                          Total Products in Inventory
                        </Typography>
                        <Typography variant="h4" className="text-gray-900">
                          {statistics.totalProducts}
                        </Typography>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Good Stock</Typography>
                          <Typography variant="h5" className="text-green-600">
                            {products.filter(p => (p.stock || 0) > 10).length}
                          </Typography>
                          <Typography variant="small" color="green" className="text-xs">
                            &gt; 10 units
                          </Typography>
                        </div>
                        
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Low Stock</Typography>
                          <Typography variant="h5" className="text-orange-600">
                            {statistics.lowStockItems}
                          </Typography>
                          <Typography variant="small" color="orange" className="text-xs">
                            1-10 units
                          </Typography>
                        </div>
                        
                        <div className="p-3 bg-red-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Out of Stock</Typography>
                          <Typography variant="h5" className="text-red-600">
                            {statistics.outOfStockItems}
                          </Typography>
                          <Typography variant="small" color="red" className="text-xs">
                            0 units
                          </Typography>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <Typography variant="small" color="gray" className="text-xs">Total Inventory Value</Typography>
                            <Typography variant="h5" className="text-blue-600">
                              {formatCurrency(statistics.totalInventoryValue)}
                            </Typography>
                          </div>
                          <CubeIcon className="h-8 w-8 text-blue-500 opacity-50" />
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </TabPanel>

            {/* Requests Tab */}
            <TabPanel value="requests" className="p-0">
              <Card className="shadow-sm mb-6">
                <CardBody>
                  <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                    Requests by Status
                  </Typography>
                  {requestsByStatusData.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestsByStatusData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" name="Number of Requests" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <Typography variant="small" color="gray">No request data available</Typography>
                    </div>
                  )}
                </CardBody>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Request Cost */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Monthly Request Cost (GHS)
                    </Typography>
                    {monthlyRequestCostData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyRequestCostData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#3b82f6"
                              name="Total Cost"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <Typography variant="small" color="gray">No monthly request cost data available</Typography>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Request Statistics */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Request Statistics
                    </Typography>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 border-b">
                        <Typography variant="small" color="gray" className="text-xs">Total Requests</Typography>
                        <Typography variant="small" className="font-semibold">{statistics.totalRequests}</Typography>
                      </div>
                      <div className="flex justify-between items-center p-3 border-b">
                        <Typography variant="small" color="gray" className="text-xs">Approval Rate</Typography>
                        <Chip value={`${statistics.approvalRate}%`} size="sm" color="green" />
                      </div>
                      <div className="flex justify-between items-center p-3 border-b">
                        <Typography variant="small" color="gray" className="text-xs">Total Cost (GHS)</Typography>
                        <Typography variant="small" className="font-semibold">
                          {formatCurrency(statistics.totalCost)}
                        </Typography>
                      </div>
                      <div className="flex justify-between items-center p-3 border-b">
                        <Typography variant="small" color="gray" className="text-xs">Avg Cost per Request</Typography>
                        <Typography variant="small" className="font-semibold">
                          {formatCurrency(statistics.avgCostPerRequest)}
                        </Typography>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </TabPanel>

            {/* Outgoing Tab */}
            <TabPanel value="outgoing" className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Outgoing Trend */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Monthly Outgoing Trend
                    </Typography>
                    {monthlyOutgoingData.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyOutgoingData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip 
                              formatter={(value, name) => {
                                if (name === 'value') return [formatCurrency(value), 'Total Cost (GHS)'];
                                return [value, 'Number of Items'];
                              }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="Total Cost (GHS)" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="count" fill="#10b981" name="# of Items" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-72 flex items-center justify-center">
                        <Typography variant="small" color="gray">No outgoing trend data available</Typography>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Outgoing Statistics */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Outgoing Statistics
                    </Typography>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Typography variant="small" color="gray" className="mb-1 text-xs">
                          Total Outgoing Items
                        </Typography>
                        <Typography variant="h4" className="text-gray-900">
                          {statistics.totalOutgoingItems}
                        </Typography>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-teal-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Returnable Items</Typography>
                          <Typography variant="h5" className="text-teal-600">
                            {statistics.returnableItems}
                          </Typography>
                        </div>
                        
                        <div className="p-3 bg-green-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Returned</Typography>
                          <Typography variant="h5" className="text-green-600">
                            {statistics.returnedItems}
                          </Typography>
                        </div>
                        
                        <div className="p-3 bg-red-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Not Returned</Typography>
                          <Typography variant="h5" className="text-red-600">
                            {statistics.notReturnedItems}
                          </Typography>
                        </div>
                        
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Overdue</Typography>
                          <Typography variant="h5" className="text-orange-600">
                            {statistics.overdueItems}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </TabPanel>

            {/* Financial Tab */}
            <TabPanel value="financial" className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products by Inventory Value */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Top Products by Inventory Value (GHS)
                    </Typography>
                    {topProductsByValueData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topProductsByValueData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={100}
                              tick={{ fontSize: 10 }}
                            />
                            <Tooltip 
                              formatter={(value, name) => {
                                if (name === 'value') return [formatCurrency(value), 'Inventory Value'];
                                return [value, 'Stock Quantity'];
                              }}
                            />
                            <Legend />
                            <Bar dataKey="value" fill="#3b82f6" name="Inventory Value" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <Typography variant="small" color="gray">No product value data available</Typography>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Financial Summary */}
                <Card className="shadow-sm">
                  <CardBody>
                    <Typography variant="h6" color="blue-gray" className="mb-4 text-sm md:text-base">
                      Financial Summary (GHS)
                    </Typography>
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Typography variant="small" color="gray" className="mb-1 text-xs">
                          Total Inventory Value
                        </Typography>
                        <Typography variant="h4" className="text-green-600">
                          {formatCurrency(statistics.totalInventoryValue)}
                        </Typography>
                      </div>
                      
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Typography variant="small" color="gray" className="mb-1 text-xs">
                          Total Approved Request Cost
                        </Typography>
                        <Typography variant="h4" className="text-blue-600">
                          {formatCurrency(statistics.totalCost)}
                        </Typography>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Avg Product Value</Typography>
                          <Typography variant="h6" className="text-gray-700">
                            {formatCurrency(statistics.totalProducts > 0 ? 
                              statistics.totalInventoryValue / statistics.totalProducts : 0)}
                          </Typography>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Typography variant="small" color="gray" className="mb-1 text-xs">Avg Request Cost</Typography>
                          <Typography variant="h6" className="text-gray-700">
                            {formatCurrency(statistics.avgCostPerRequest)}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </TabPanel>
          </TabsBody>
        </Tabs>
      </div>

      {/* Export Section */}
      <Card className="mt-6 shadow-sm">
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <Typography variant="h6" color="blue-gray" className="text-sm md:text-base">
                Export Report Data
              </Typography>
              <Typography variant="small" color="gray" className="text-xs">
                Export comprehensive analytics in JSON format
              </Typography>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outlined"
                color="blue"
                className="flex items-center gap-2"
                onClick={handleRefresh}
              >
                Refresh Data
              </Button>
              <Button
                variant="gradient"
                color="green"
                className="flex items-center gap-2"
                onClick={handleExportReport}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export JSON Report
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Footer */}
      <div className="mt-6 text-center">
        <Typography variant="small" color="gray" className="text-xs">
          Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} • 
          Data includes {statistics.totalProducts} products, {statistics.totalRequests} requests, and {statistics.totalOutgoingItems} outgoing items
        </Typography>
      </div>
    </div>
  );
};

export default ReportsDashboard;