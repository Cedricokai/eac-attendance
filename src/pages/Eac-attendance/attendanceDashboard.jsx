import { useState, useEffect, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Users,
  Clock,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Bell,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Home,
  BarChart3,
  Calendar,
  Download,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import MainSidebar from "./mainSidebar";

// Stats Card Component
function StatsCard({ icon, title, value, secondaryValue, linkText, linkTo, loading, color, trend }) {
  const colorVariants = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', hover: 'hover:bg-green-100', border: 'border-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'hover:bg-amber-100', border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100', border: 'border-purple-100' },
  };

  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend > 0 ? '↗' : trend < 0 ? '↘' : '→';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white rounded-xl shadow-xs border ${colorVariants[color].border} p-6 hover:shadow-sm transition-all duration-200 ${colorVariants[color].hover}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {loading ? (
              <span className="inline-block h-8 w-16 bg-gray-200 rounded animate-pulse"></span>
            ) : (
              value
            )}
          </p>
          {secondaryValue && (
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
              {secondaryValue}
              {trend !== undefined && (
                <span className={`text-xs ${trendColor}`}>
                  {trendIcon} {Math.abs(trend)}%
                </span>
              )}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorVariants[color].bg} ${colorVariants[color].text}`}>
          {icon}
        </div>
      </div>
      {linkText && linkTo && (
        <div className="mt-4">
          <Link 
            to={linkTo} 
            className={`text-sm font-medium ${colorVariants[color].text} hover:opacity-80 flex items-center gap-1`}
          >
            {linkText} <ChevronDown size={16} className="rotate-270" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// Activity Item Component
function ActivityItem({ activity }) {
  const iconMap = {
    error: <XCircle size={18} className="text-red-500" />,
    success: <CheckCircle size={18} className="text-green-500" />,
    warning: <AlertCircle size={18} className="text-amber-500" />,
    info: <AlertCircle size={18} className="text-blue-500" />,
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-start py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="flex-shrink-0 mt-1">
        {iconMap[activity.type] || iconMap.info}
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {activity.message}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

// Time Range Selector Component
function TimeRangeSelector({ timeRange, setTimeRange }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
      <button 
        onClick={() => setTimeRange('week')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === 'week' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        Week
      </button>
      <button 
        onClick={() => setTimeRange('month')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === 'month' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        Month
      </button>
    </div>
  );
}

// Main Attendance Dashboard Component
function AttendanceDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingApprovals: 0,
    absentCount: 0
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [payrollData, setPayrollData] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [mainSidebarOpen, setMainSidebarOpen] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [user, setUser] = useState(null);

  // Get API base URL from environment
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

  // Calculate sidebar offsets
  const sidebarOffsets = useMemo(() => {
    const mainWidth = mainSidebarOpen ? 64 : 20;
    return {
      mainWidth,
      contentMarginLeft: mainWidth
    };
  }, [mainSidebarOpen]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser({
            name: data.name || data.username,
            role: data.role ? data.role.replace("ROLE_", "").toLowerCase() : 'employee',
            email: data.email,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, [API_BASE_URL]);

  // Generate sample chart data based on time range
  useEffect(() => {
    const generateChartData = () => {
      if (timeRange === 'week') {
        return [
          { name: 'Mon', present: 65, absent: 5, late: 8 },
          { name: 'Tue', present: 59, absent: 8, late: 12 },
          { name: 'Wed', present: 80, absent: 2, late: 5 },
          { name: 'Thu', present: 81, absent: 3, late: 4 },
          { name: 'Fri', present: 56, absent: 12, late: 15 },
          { name: 'Sat', present: 40, absent: 4, late: 2 },
          { name: 'Sun', present: 30, absent: 1, late: 1 },
        ];
      } else {
        return [
          { name: 'Week 1', present: 320, absent: 35, late: 42 },
          { name: 'Week 2', present: 295, absent: 40, late: 38 },
          { name: 'Week 3', present: 350, absent: 25, late: 28 },
          { name: 'Week 4', present: 380, absent: 20, late: 22 },
        ];
      }
    };
    
    setChartData(generateChartData());
  }, [timeRange]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        console.error("No JWT token found");
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      console.log("Fetching dashboard data...");

      // Fetch employees
      const employeesRes = await fetch(`${API_BASE_URL}/api/employee`, { headers });
      if (!employeesRes.ok) {
        throw new Error(`Failed to fetch employees: ${employeesRes.status}`);
      }
      const employees = await employeesRes.json();
      console.log("Employees data:", employees);

      // Fetch attendance data
      const attendanceRes = await fetch(`${API_BASE_URL}/api/attendance/today`, { headers });
      let attendance = [];
      if (attendanceRes.ok) {
        attendance = await attendanceRes.json();
        console.log("Attendance data:", attendance);
      } else {
        console.warn("Failed to fetch attendance data, using empty array");
      }

      // Fetch leave data
      const leavesRes = await fetch(`${API_BASE_URL}/api/leave/current`, { headers });
      let leaves = [];
      if (leavesRes.ok) {
        leaves = await leavesRes.json();
        console.log("Leave data:", leaves);
      } else {
        console.warn("Failed to fetch leave data, using empty array");
      }

      // Fetch payroll summary
      const payrollRes = await fetch(`${API_BASE_URL}/api/payroll/summary`, { headers });
      let payroll = {};
      if (payrollRes.ok) {
        payroll = await payrollRes.json();
        console.log("Payroll data:", payroll);
      } else {
        console.warn("Failed to fetch payroll data, using defaults");
      }

      // Calculate employees on approved leave for current date
      const currentDate = new Date().toISOString().split('T')[0];
      const onLeave = employees.filter(employee => 
        leaves.some(leave => 
          leave.employee?.id === employee.id &&
          leave.status === 'Approved' &&
          currentDate >= leave.startDate &&
          currentDate <= leave.endDate
        )
      ).length;

      const presentCount = attendance.filter(a => 
        a.status === 'Present' || a.status === 'Late' || a.status === 'Weekend Present' || a.status === 'Holiday Present'
      ).length;

      const expectedEmployees = employees.length - onLeave;
      const attendanceRateValue = expectedEmployees > 0 ? (presentCount / expectedEmployees) * 100 : 0;

      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.length - onLeave,
        onLeave,
        pendingApprovals: attendance.filter(a => a.status === 'Pending').length,
        absentCount: Math.max(0, expectedEmployees - presentCount)
      });

      setAttendanceData(attendance);
      setPayrollData(payroll);
      setAttendanceRate(attendanceRateValue);

      // Generate sample activities since we don't have an activities endpoint
      const sampleActivities = [
        {
          id: 1,
          type: 'success',
          message: 'Attendance system synchronized successfully',
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          type: 'info',
          message: 'New employee records imported',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          type: 'warning',
          message: '3 employees have pending leave requests',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      setRecentActivities(sampleActivities);

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      // Set fallback data for demo purposes
      setStats({
        totalEmployees: 24,
        activeEmployees: 20,
        onLeave: 4,
        pendingApprovals: 3,
        absentCount: 2
      });
      setRecentActivities([
        {
          id: 1,
          type: 'info',
          message: 'Demo mode: Using sample data',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // FIXED: Prepare data for pie chart
  const pieChartData = useMemo(() => {
    const presentCount = attendanceData.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const lateCount = attendanceData.filter(a => a.status === 'Late').length;
    const absentCount = stats.totalEmployees - presentCount - stats.onLeave;
    
    return [
      { name: 'Present', value: Math.max(0, presentCount - lateCount) }, // Only pure Present
      { name: 'Late', value: Math.max(0, lateCount) },
      { name: 'Absent', value: Math.max(0, absentCount) }, // Ensure non-negative
      { name: 'On Leave', value: Math.max(0, stats.onLeave) },
    ];
  }, [attendanceData, stats.totalEmployees, stats.onLeave]);

  // FIXED: Calculate attendance rate properly
  const calculatedAttendanceRate = useMemo(() => {
    if (attendanceData.length === 0 || stats.totalEmployees === 0) return 0;
    
    const presentCount = attendanceData.filter(a => 
      a.status === 'Present' || a.status === 'Late' || a.status === 'Weekend Present' || a.status === 'Holiday Present'
    ).length;
    
    // Calculate rate based on expected employees (total - on leave)
    const expectedEmployees = stats.totalEmployees - stats.onLeave;
    return expectedEmployees > 0 ? (presentCount / expectedEmployees) * 100 : 0;
  }, [attendanceData, stats.totalEmployees, stats.onLeave]);

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Main Sidebar */}
      <motion.div
        initial={{ width: 64 }}
        animate={{ width: mainSidebarOpen ? 64 : 20 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-y-0 z-20 bg-white shadow-sm border-r border-gray-100 overflow-hidden`}
      >
        <MainSidebar 
          sidebarOpen={mainSidebarOpen}
          setSidebarOpen={setMainSidebarOpen}
        />
      </motion.div>

      {/* Main Content */}
      <div 
        className="flex-1 overflow-auto transition-all duration-300"
        style={{ marginLeft: `${sidebarOffsets.contentMarginLeft}px` }}
      >
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Top Bar */}
          <header className="flex justify-between items-center bg-white h-16 w-full rounded-xl px-6 shadow-xs mb-6 border border-gray-100">
            <button 
              onClick={() => setMainSidebarOpen(!mainSidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Menu size={24} className="text-gray-600" />
            </button>

            <div className="flex items-center gap-5">
              <div className="relative">
                <Link 
                  to="/settingspage" 
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Settings"
                >
                  <Settings size={20} className="text-gray-600" />
                </Link>
              </div>

              <div className="border-l border-gray-200 h-8"></div>

              <button 
                className="p-1 hover:bg-gray-100 rounded-full relative transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-600" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </button>

              <div className="border-l border-gray-200 h-8"></div>

              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  {user?.name || 'User'}
                </span>
                <ChevronDown 
                  size={16} 
                  className="text-gray-500 group-hover:text-gray-700 transition-colors" 
                />
              </div>
            </div>
          </header>

          {/* Page Header */}
          <motion.section 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-xs mb-6 border border-gray-100"
          >
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Attendance Dashboard</h1>
              <p className="text-gray-500 mt-1">Overview of employee attendance and time tracking</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <CalendarCheck size={18} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <Link
                to="/dailyAttendanceReport"
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg border border-green-100 text-green-700 text-sm font-medium transition-colors"
              >
                <BarChart3 size={16} />
                Daily Report
              </Link>
            </div>
          </motion.section>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatsCard 
              icon={<Users size={20} />}
              title="Total Employees"
              value={stats.totalEmployees}
              linkText="View all employees"
              linkTo="/employee"
              loading={loading}
              color="blue"
              trend={2.5}
            />

            <StatsCard 
              icon={<Activity size={20} />}
              title="Active Employees"
              value={stats.activeEmployees}
              secondaryValue={`${stats.onLeave} on leave`}
              linkText="View attendance"
              linkTo="/attendance"
              loading={loading}
              color="green"
              trend={1.8}
            />

            <StatsCard 
              icon={<CalendarCheck size={20} />}
              title="Attendance Rate"
              value={`${calculatedAttendanceRate.toFixed(1)}%`}
              secondaryValue={`${stats.pendingApprovals} pending approvals`}
              linkText="View timesheets"
              linkTo="/timesheets"
              loading={loading}
              color="amber"
              trend={-0.5}
            />

            <StatsCard 
              icon={<DollarSign size={20} />}
              title="Payroll Summary"
              value={formatCurrency(payrollData.totalAmount || 125000)}
              secondaryValue={`${payrollData.employeeCount || stats.totalEmployees} employees`}
              linkText="View payroll"
              linkTo="/payroll"
              loading={loading}
              color="purple"
              trend={3.2}
            />
          </div>

          {/* Charts and Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Attendance Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Attendance Overview</h2>
                <TimeRangeSelector timeRange={timeRange} setTimeRange={setTimeRange} />
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="present" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]} 
                      name="Present" 
                    />
                    <Bar 
                      dataKey="absent" 
                      fill="#EF4444" 
                      radius={[4, 4, 0, 0]} 
                      name="Absent" 
                    />
                    <Bar 
                      dataKey="late" 
                      fill="#F59E0B" 
                      radius={[4, 4, 0, 0]} 
                      name="Late" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Status Distribution</h2>
                <Filter size={18} className="text-gray-400" />
              </div>
              
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                {pieChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index] }}
                    ></div>
                    <span className="text-xs text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activities and Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
                <Link 
                  to="/activities" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                  View all <ChevronDown size={16} className="rotate-270" />
                </Link>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-1">
                  <AnimatePresence>
                    {recentActivities.slice(0, 5).map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent activities found
                </div>
              )}
            </div>

            {/* Recent Attendance */}
            <div className="bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Attendance</h2>
                <Link 
                  to="/attendance" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                  View all <ChevronDown size={16} className="rotate-270" />
                </Link>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : attendanceData.length > 0 ? (
                <div className="space-y-3">
                  {attendanceData.slice(0, 5).map((attendance) => (
                    <motion.div 
                      key={attendance.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mr-3">
                          <span className="text-blue-800 text-xs font-medium">
                            {attendance.employee?.firstName?.charAt(0)}{attendance.employee?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attendance.employee?.firstName} {attendance.employee?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(attendance.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendance.status === 'Present' ? 'bg-green-100 text-green-800' :
                        attendance.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {attendance.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found for today
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AttendanceDashboard;