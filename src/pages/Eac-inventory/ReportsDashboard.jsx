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
  ArrowDownTrayIcon
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
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { reportsAPI } from '../../services/api';
import {
  calculateCostByStatus,
  calculateCostByEmployee,
  calculateCostByProduct,
  calculateCostByCostCenter,
  calculateTotalRequestsCost,
  formatCurrency,
  formatCurrencyShort,
  getCostTrend,
  getCostStatistics,
  getTopProductsByCost,
  getTopEmployeesByCost,
  getAverageCostPerRequest
} from '../../utils/costCalculations';
import {
  countRequestsByStatus,
  getApprovalRate,
  getRejectionRate,
  formatTimeSpent,
  getAverageApprovalTime
} from '../../utils/statusTracking';

const ReportsDashboard = () => {
  const navigate = useNavigate();

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data state
  const [requests, setRequests] = useState([]);
  const [requestsByStatus, setRequestsByStatus] = useState({});
  const [costByStatus, setCostByStatus] = useState({});
  const [costByEmployee, setCostByEmployee] = useState({});
  const [costByProduct, setCostByProduct] = useState({});
  const [costByCostCenter, setCostByCostCenter] = useState({});

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch data
  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch all necessary data
      const [
        statusReport,
        employeeUsageReport,
        projectCostReport,
        inventorySummary
      ] = await Promise.all([
        reportsAPI.getRequestsByStatus(),
        reportsAPI.getProductUsageByEmployee(new Date('2024-01-01'), new Date()),
        reportsAPI.getCostSummaryByProject(new Date('2024-01-01'), new Date()),
        reportsAPI.getInventorySummary()
      ]);

      // Combine all requests
      const allRequests = [
        ...(statusReport || []),
        ...(employeeUsageReport || []),
        ...(projectCostReport || [])
      ];

      // Remove duplicates
      const uniqueRequests = Array.from(
        new Map(allRequests.map(item => [item.id, item])).values()
      );

      setRequests(uniqueRequests);

      // Calculate metrics
      setRequestsByStatus(countRequestsByStatus(uniqueRequests));
      setCostByStatus(calculateCostByStatus(uniqueRequests));
      setCostByEmployee(calculateCostByEmployee(uniqueRequests));
      setCostByProduct(calculateCostByProduct(uniqueRequests));
      setCostByCostCenter(calculateCostByCostCenter(uniqueRequests));

      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load report data');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalRequests = requests.length;
  const totalCost = calculateTotalRequestsCost(requests);
  const approvalRate = getApprovalRate(requests);
  const rejectionRate = getRejectionRate(requests);
  const avgCostPerRequest = getAverageCostPerRequest(requests);
  const avgApprovalTime = getAverageApprovalTime(requests);

  // Prepare chart data
  const statusChartData = Object.entries(costByStatus).map(([status, cost]) => ({
    name: status.replace(/_/g, ' ').toUpperCase(),
    value: cost,
    count: requestsByStatus[status] || 0
  }));

  const topProducts = getTopProductsByCost(requests, 10);
  const topEmployees = getTopEmployeesByCost(requests, 10);
  const costTrend = getCostTrend(requests, 12);

  const productChartData = topProducts.map(product => ({
    name: product.product_name,
    cost: product.total_cost,
    quantity: product.total_quantity
  }));

  const employeeChartData = topEmployees.map(emp => ({
    name: `Employee #${emp.employee_id}`,
    cost: emp.total_cost,
    requests: emp.request_count
  }));

  const costCenterData = Object.values(costByCostCenter).map(center => ({
    name: center.cost_center_name,
    cost: center.total_cost,
    requests: center.request_count
  }));

  // COLORS
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="text"
            color="blue"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Button>
          <div>
            <Typography variant="h3" color="blue-gray">
              Reports & Analytics
            </Typography>
            <Typography variant="small" color="gray">
              View comprehensive reports on product requests, costs, and inventory
            </Typography>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert color="red" className="mb-6 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <Typography>{error}</Typography>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="p-4">
            <Typography variant="small" color="gray">Total Requests</Typography>
            <Typography variant="h4" className="mt-2">{totalRequests}</Typography>
            <Typography variant="small" color="blue" className="mt-1">
              All time
            </Typography>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <Typography variant="small" color="gray">Total Cost</Typography>
            <Typography variant="h4" className="mt-2">{formatCurrencyShort(totalCost)}</Typography>
            <Typography variant="small" color="green" className="mt-1">
              {formatCurrency(totalCost, 'USD')}
            </Typography>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <Typography variant="small" color="gray">Approval Rate</Typography>
            <Typography variant="h4" className="mt-2">{approvalRate}%</Typography>
            <Typography variant="small" color="blue" className="mt-1">
              {Math.round((approvalRate / 100) * totalRequests)} issued
            </Typography>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <Typography variant="small" color="gray">Avg Cost / Request</Typography>
            <Typography variant="h4" className="mt-2">{formatCurrencyShort(avgCostPerRequest)}</Typography>
            <Typography variant="small" color="blue" className="mt-1">
              {formatCurrency(avgCostPerRequest, 'USD')}
            </Typography>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="overflow-visible">
        <TabsHeader className="bg-white border-b p-4">
          <Tab
            value="overview"
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2"
          >
            <ChartBarIcon className="h-5 w-5" />
            Overview
          </Tab>
          <Tab
            value="requests"
            onClick={() => setActiveTab('requests')}
            className="flex items-center gap-2"
          >
            <DocumentCheckIcon className="h-5 w-5" />
            Requests by Status
          </Tab>
          <Tab
            value="products"
            onClick={() => setActiveTab('products')}
            className="flex items-center gap-2"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            Products
          </Tab>
          <Tab
            value="employees"
            onClick={() => setActiveTab('employees')}
            className="flex items-center gap-2"
          >
            <UserGroupIcon className="h-5 w-5" />
            Employees
          </Tab>
          <Tab
            value="costcenters"
            onClick={() => setActiveTab('costcenters')}
            className="flex items-center gap-2"
          >
            <CurrencyDollarIcon className="h-5 w-5" />
            Cost Centers
          </Tab>
          <Tab
            value="trends"
            onClick={() => setActiveTab('trends')}
            className="flex items-center gap-2"
          >
            <ArrowTrendingUpIcon className="h-5 w-5" />
            Trends
          </Tab>
        </TabsHeader>

        <TabsBody>
          {/* Overview Tab */}
          <TabPanel value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost by Status Pie Chart */}
              <Card>
                <CardBody>
                  <Typography variant="h6" color="blue-gray" className="mb-4">
                    Cost Distribution by Status
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrencyShort(value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              {/* Statistics Card */}
              <Card>
                <CardBody>
                  <Typography variant="h6" color="blue-gray" className="mb-4">
                    Key Statistics
                  </Typography>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <Typography variant="small" color="gray">Total Requests</Typography>
                      <Typography variant="small" className="font-semibold">{totalRequests}</Typography>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <Typography variant="small" color="gray">Approval Rate</Typography>
                      <Chip value={`${approvalRate}%`} color="green" size="sm" />
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <Typography variant="small" color="gray">Rejection Rate</Typography>
                      <Chip value={`${rejectionRate}%`} color="red" size="sm" />
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <Typography variant="small" color="gray">Avg Approval Time</Typography>
                      <Typography variant="small" className="font-semibold">
                        {formatTimeSpent(avgApprovalTime)}
                      </Typography>
                    </div>
                    <div className="flex justify-between items-center">
                      <Typography variant="small" color="gray">Avg Cost per Request</Typography>
                      <Typography variant="small" className="font-semibold">
                        {formatCurrency(avgCostPerRequest)}
                      </Typography>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </TabPanel>

          {/* Requests by Status Tab */}
          <TabPanel value="requests">
            <Card>
              <CardBody>
                <Typography variant="h6" color="blue-gray" className="mb-4">
                  Request Count & Cost by Status
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="Cost" />
                    <Bar yAxisId="right" dataKey="count" fill="#10b981" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Products Tab */}
          <TabPanel value="products">
            <Card>
              <CardBody>
                <Typography variant="h6" color="blue-gray" className="mb-4">
                  Top 10 Products by Cost
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={productChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="cost" fill="#3b82f6" name="Total Cost" />
                    <Bar dataKey="quantity" fill="#10b981" name="Quantity" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Employees Tab */}
          <TabPanel value="employees">
            <Card>
              <CardBody>
                <Typography variant="h6" color="blue-gray" className="mb-4">
                  Top 10 Employees by Cost
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={employeeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="cost" fill="#8b5cf6" name="Total Cost" />
                    <Bar dataKey="requests" fill="#ec4899" name="# Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Cost Centers Tab */}
          <TabPanel value="costcenters">
            <Card>
              <CardBody>
                <Typography variant="h6" color="blue-gray" className="mb-4">
                  Cost by Project/Cost Center
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={costCenterData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="cost" fill="#f59e0b" name="Total Cost" />
                    <Bar dataKey="requests" fill="#06b6d4" name="# Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Trends Tab */}
          <TabPanel value="trends">
            <Card>
              <CardBody>
                <Typography variant="h6" color="blue-gray" className="mb-4">
                  12-Month Cost Trend
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={costTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#3b82f6"
                      name="Monthly Cost"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="requests"
                      stroke="#10b981"
                      name="# Requests"
                      yAxisId="right"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>
        </TabsBody>
      </Tabs>

      {/* Export Button */}
      <Card className="mt-6">
        <CardBody className="p-4">
          <Button
            variant="gradient"
            color="blue"
            className="flex items-center gap-2"
            onClick={() => toast.info('Export functionality coming soon')}
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Export Report (PDF/Excel)
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default ReportsDashboard;
