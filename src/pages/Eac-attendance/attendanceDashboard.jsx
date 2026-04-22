import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Users,
  Clock,
  CalendarCheck,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Bell,
  Settings,
  Menu,
  ChevronRight,
  BarChart3,
  Calendar,
  Filter,
  TrendingDown,
  DollarSign,
  CreditCard,
  Banknote,
  FileText,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import MainSidebar from "./mainSidebar";
import Header from "../../components/Header";

// Helper component
function StatsCard({ icon, title, value, secondaryValue, linkText, linkTo, loading, color, trend, trendValue }) {
  const colorVariants = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', hover: 'hover:bg-green-100', border: 'border-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'hover:bg-amber-100', border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100', border: 'border-purple-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:bg-indigo-100', border: 'border-indigo-100' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', hover: 'hover:bg-pink-100', border: 'border-pink-100' },
  };

  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white rounded-xl shadow-sm border ${colorVariants[color].border} p-6 hover:shadow-md transition-all duration-200 ${colorVariants[color].hover}`}
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
              {trend !== undefined && trendValue !== undefined && (
                <span className={`text-xs ${trendColor} flex items-center gap-1`}>
                  {trendIcon} {Math.abs(trendValue)}%
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
            {linkText} <ChevronRight size={16} />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// Helper component
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

// Helper component
function TimeRangeSelector({ timeRange, setTimeRange }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
      <button 
        onClick={() => setTimeRange('week')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        Week
      </button>
      <button 
        onClick={() => setTimeRange('month')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        Month
      </button>
      <button 
        onClick={() => setTimeRange('quarter')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === 'quarter' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        Quarter
      </button>
    </div>
  );
}

// MAIN COMPONENT
function AttendanceDashboard() {
  // ========== STATE DECLARATIONS ==========
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingApprovals: 0,
    absentCount: 0,
    totalPresent: 0,
    totalLate: 0
  });
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

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

  // ========== HELPER FUNCTIONS ==========
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount || 0);

  // ========== DATA FETCHING FUNCTIONS ==========
  const fetchAttendanceStats = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) return;

      const today = new Date();
      const startDate = new Date();
      
      if (timeRange === 'week') {
        startDate.setDate(today.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setDate(today.getDate() - 30);
      } else {
        startDate.setDate(today.getDate() - 90);
      }

      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = today.toISOString().split('T')[0];

      const res = await fetch(`${API_BASE_URL}/api/attendance?startDate=${formattedStartDate}&endDate=${formattedEndDate}`, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        }
      });

      if (res.ok) {
        const data = await res.json();
        
        if (timeRange === 'week') {
          const weekData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(today.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            
            const dayAttendance = data.filter(att => att.date === dateStr);
            const presentCount = dayAttendance.filter(att => 
              att.status === 'Present' || att.status === 'Weekend Present' || att.status === 'Holiday Present'
            ).length;
            const lateCount = dayAttendance.filter(att => att.status === 'Late').length;
            const absentCount = dayAttendance.filter(att => att.status === 'Absent').length;
            
            return {
              name: date.toLocaleDateString('en-US', { weekday: 'short' }),
              date: dateStr,
              present: presentCount,
              late: lateCount,
              absent: absentCount,
              total: dayAttendance.length
            };
          });
          setChartData(weekData);
        } else if (timeRange === 'month') {
          const weeks = [];
          for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const weekAttendance = data.filter(att => {
              const attDate = new Date(att.date);
              return attDate >= weekStart && attDate <= weekEnd;
            });
            
            const presentCount = weekAttendance.filter(att => 
              att.status === 'Present' || att.status === 'Weekend Present' || att.status === 'Holiday Present'
            ).length;
            const lateCount = weekAttendance.filter(att => att.status === 'Late').length;
            const absentCount = weekAttendance.filter(att => att.status === 'Absent').length;
            
            weeks.push({
              name: `Week ${4 - i}`,
              startDate: weekStart.toISOString().split('T')[0],
              endDate: weekEnd.toISOString().split('T')[0],
              present: presentCount,
              late: lateCount,
              absent: absentCount,
              total: weekAttendance.length
            });
          }
          setChartData(weeks);
        } else {
          const months = [];
          for (let i = 2; i >= 0; i--) {
            const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            
            const monthAttendance = data.filter(att => {
              const attDate = new Date(att.date);
              return attDate >= monthStart && attDate <= monthEnd;
            });
            
            const presentCount = monthAttendance.filter(att => 
              att.status === 'Present' || att.status === 'Weekend Present' || att.status === 'Holiday Present'
            ).length;
            const lateCount = monthAttendance.filter(att => att.status === 'Late').length;
            const absentCount = monthAttendance.filter(att => att.status === 'Absent').length;
            
            months.push({
              name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
              startDate: monthStart.toISOString().split('T')[0],
              endDate: monthEnd.toISOString().split('T')[0],
              present: presentCount,
              late: lateCount,
              absent: absentCount,
              total: monthAttendance.length
            });
          }
          setChartData(months);
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance stats:', err);
      setChartData([]);
    }
  };

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

      const employeesRes = await fetch(`${API_BASE_URL}/api/employee`, { headers });
      if (!employeesRes.ok) throw new Error(`Failed to fetch employees: ${employeesRes.status}`);
      const employees = await employeesRes.json();

      const todayStr = new Date().toISOString().split('T')[0];
      const attendanceRes = await fetch(`${API_BASE_URL}/api/attendance?date=${todayStr}`, { headers });
      let attendanceToday = [];
      if (attendanceRes.ok) attendanceToday = await attendanceRes.json();

      const leavesRes = await fetch(`${API_BASE_URL}/api/leave/current`, { headers });
      let leaves = [];
      if (leavesRes.ok) leaves = await leavesRes.json();

      await fetchAttendanceStats();

      const onLeaveToday = employees.filter(employee => 
        leaves.some(leave => 
          leave.employee?.id === employee.id &&
          leave.status === 'Approved' &&
          todayStr >= leave.startDate &&
          todayStr <= leave.endDate
        )
      ).length;

      const presentCount = attendanceToday.filter(a => 
        a.status === 'Present' || a.status === 'Weekend Present' || a.status === 'Holiday Present'
      ).length;
      const lateCount = attendanceToday.filter(a => a.status === 'Late').length;
      const absentCount = attendanceToday.filter(a => a.status === 'Absent').length;
      const pendingCount = attendanceToday.filter(a => a.status === 'Pending').length;

      const expectedEmployees = employees.length - onLeaveToday;
      const attendanceRateValue = expectedEmployees > 0 ? (presentCount / expectedEmployees) * 100 : 0;

      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.length - onLeaveToday,
        onLeave: onLeaveToday,
        pendingApprovals: pendingCount,
        absentCount: Math.max(0, expectedEmployees - presentCount - lateCount),
        totalPresent: presentCount,
        totalLate: lateCount
      });

      setAttendanceData(attendanceToday);
      setAttendanceRate(attendanceRateValue);

      const generateActivities = () => {
        const activities = [
          {
            id: 1,
            type: 'success',
            message: `Attendance system synchronized - ${presentCount} employees present today`,
            timestamp: new Date().toISOString()
          }
        ];

        if (attendanceRateValue < 85) {
          activities.push({
            id: 2,
            type: 'warning',
            message: `Attendance rate below target (${attendanceRateValue.toFixed(1)}%)`,
            timestamp: new Date().toISOString()
          });
        }

        if (lateCount > 0) {
          activities.push({
            id: 3,
            type: 'warning',
            message: `${lateCount} employee(s) arrived late today`,
            timestamp: new Date().toISOString()
          });
        }

        if (onLeaveToday > 0) {
          activities.push({
            id: 4,
            type: 'info',
            message: `${onLeaveToday} employee(s) on leave today`,
            timestamp: new Date().toISOString()
          });
        }

        return activities;
      };

      setRecentActivities(generateActivities());

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setStats({
        totalEmployees: 0,
        activeEmployees: 0,
        onLeave: 0,
        pendingApprovals: 0,
        absentCount: 0,
        totalPresent: 0,
        totalLate: 0
      });
      setChartData([]);
      setRecentActivities([
        {
          id: 1,
          type: 'error',
          message: 'Failed to fetch dashboard data. Please check your connection.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ========== CHART HANDLERS ==========
  const handleBarChartClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const clickedDataKey = data.activePayload[0].dataKey;
      
      let statusFilter = '';
      if (clickedDataKey === 'present') statusFilter = 'Present';
      else if (clickedDataKey === 'late') statusFilter = 'Late';
      else if (clickedDataKey === 'absent') statusFilter = 'Absent';
      
      if (timeRange === 'week') {
        navigate(`/reports?startDate=${payload.date}&endDate=${payload.date}&status=${statusFilter}&groupBy=employee`);
      } else if (timeRange === 'month') {
        navigate(`/reports?startDate=${payload.startDate}&endDate=${payload.endDate}&status=${statusFilter}&groupBy=employee`);
      } else {
        navigate(`/reports?startDate=${payload.startDate}&endDate=${payload.endDate}&status=${statusFilter}&groupBy=employee`);
      }
    }
  };

  const handlePieChartClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const today = new Date().toISOString().split('T')[0];
      
      let statusFilter = '';
      if (payload.name === 'Present') statusFilter = 'Present';
      else if (payload.name === 'Late') statusFilter = 'Late';
      else if (payload.name === 'Absent') statusFilter = 'Absent';
      else if (payload.name === 'On Leave') statusFilter = 'On Leave';
      
      navigate(`/reports?startDate=${today}&endDate=${today}&status=${statusFilter}&groupBy=employee`);
    }
  };

  // ========== MEMOIZED VALUES ==========
  const pieChartData = useMemo(() => {
    if (attendanceData.length === 0) return [];
    
    const presentCount = attendanceData.filter(a => 
      a.status === 'Present' || a.status === 'Weekend Present' || a.status === 'Holiday Present'
    ).length;
    const lateCount = attendanceData.filter(a => a.status === 'Late').length;
    const absentCount = attendanceData.filter(a => a.status === 'Absent').length;
    
    const onLeaveCount = stats.onLeave || 0;
    
    return [
      { name: 'Present', value: Math.max(0, presentCount) },
      { name: 'Late', value: Math.max(0, lateCount) },
      { name: 'Absent', value: Math.max(0, absentCount) },
      { name: 'On Leave', value: Math.max(0, onLeaveCount) },
    ].filter(item => item.value > 0);
  }, [attendanceData, stats.onLeave]);

  const calculatedAttendanceRate = useMemo(() => {
    if (attendanceData.length === 0 || stats.totalEmployees === 0) return 0;
    
    const presentCount = attendanceData.filter(a => 
      a.status === 'Present' || a.status === 'Late' || a.status === 'Weekend Present' || a.status === 'Holiday Present'
    ).length;
    
    const expectedEmployees = stats.totalEmployees - stats.onLeave;
    return expectedEmployees > 0 ? (presentCount / expectedEmployees) * 100 : 0;
  }, [attendanceData, stats.totalEmployees, stats.onLeave]);

  const calculateTrends = () => {
    const attendanceTrend = calculatedAttendanceRate > 85 ? 2.5 : calculatedAttendanceRate > 75 ? 0.5 : -1.2;
    const employeesTrend = stats.totalEmployees > 20 ? 1.5 : stats.totalEmployees > 15 ? 0.8 : -0.3;
    
    return {
      attendanceTrend,
      employeesTrend,
      leaveTrend: stats.onLeave > 3 ? -1.0 : 0.5,
    };
  };

  const trends = calculateTrends();
  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // ========== EFFECTS ==========
  // User fetch effect
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setUser({
            name: data.username,
            role: data.role.replace("ROLE_", "").toLowerCase(), 
            email: data.email
          });
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  // Responsive sidebar effect
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click outside effect for mobile sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.hamburger-button')) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  // Main data fetching effect
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // ========== RENDER ==========
  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar with dynamic classes */}
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content with dynamic margin */}
      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'
        }`}
      >
        <main className="flex-1 mx-auto px-4 md:px-6 py-6">
          {/* Header Component */}
          <Header
            toggleSidebar={toggleSidebar}
            user={user}
            onLogout={handleLogout}
          />

          {/* Welcome Banner */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Admin'}!</h1>
                <p className="text-blue-100 mt-1">Here's what's happening with your attendance today.</p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                  <p className="text-sm text-blue-100">Today's Date</p>
                  <p className="text-lg font-semibold">
                    {new Date().toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <StatsCard 
              icon={<Users size={20} />}
              title="Total Employees"
              value={stats.totalEmployees}
              secondaryValue={`${stats.onLeave} on leave`}
              linkText="View all employees"
              linkTo="/employee"
              loading={loading}
              color="blue"
              trend={trends.employeesTrend > 0 ? 1 : -1}
              trendValue={Math.abs(trends.employeesTrend)}
            />

            <StatsCard 
              icon={<Activity size={20} />}
              title="Attendance Rate"
              value={`${calculatedAttendanceRate.toFixed(1)}%`}
              secondaryValue={`${stats.totalPresent} present, ${stats.totalLate} late`}
              linkText="View attendance"
              linkTo="/attendance"
              loading={loading}
              color="green"
              trend={trends.attendanceTrend > 0 ? 1 : -1}
              trendValue={Math.abs(trends.attendanceTrend)}
            />

            <StatsCard 
              icon={<AlertCircle size={20} />}
              title="Absent Today"
              value={stats.absentCount}
              secondaryValue={`${stats.pendingApprovals} pending approvals`}
              linkText="Take action"
              linkTo="/attendance"
              loading={loading}
              color="amber"
              trend={-2.1}
              trendValue={2.1}
            />
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Quick Actions</h3>
                  <p className="text-xs text-gray-500">Frequently used operations</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link 
                  to="/attendance"
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all group border border-green-200"
                >
                  <CalendarCheck size={18} />
                  <span className="text-sm font-medium">Mark Attendance</span>
                </Link>

                <Link 
                  to="/reports"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all group border border-purple-200"
                >
                  <BarChart3 size={18} />
                  <span className="text-sm font-medium">Generate Report</span>
                </Link>

                <Link 
                  to="/employee"
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg transition-all group border border-cyan-200"
                >
                  <Users size={18} />
                  <span className="text-sm font-medium">Add Employee</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Grid - 2 columns for charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Attendance Trend - Takes 2/3 of the space */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Attendance Trend</h2>
                  <p className="text-sm text-gray-500 mt-1">Daily attendance overview</p>
                </div>
                <TimeRangeSelector timeRange={timeRange} setTimeRange={setTimeRange} />
              </div>
              
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : chartData.length > 0 ? (
                <>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartData}
                        onClick={handleBarChartClick}
                      >
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
                          formatter={(value, name) => {
                            if (name === 'present') return [value, 'Present Employees'];
                            if (name === 'late') return [value, 'Late Employees'];
                            if (name === 'absent') return [value, 'Absent Employees'];
                            return [value, name];
                          }}
                          labelFormatter={(value, items) => {
                            if (items && items[0] && items[0].payload.date) {
                              return `Date: ${new Date(items[0].payload.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}`;
                            }
                            if (items && items[0] && items[0].payload.startDate) {
                              return `Period: ${items[0].payload.startDate} to ${items[0].payload.endDate}`;
                            }
                            return value;
                          }}
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
                          cursor="pointer"
                          onClick={handleBarChartClick}
                        />
                        <Bar 
                          dataKey="late" 
                          fill="#F59E0B" 
                          radius={[4, 4, 0, 0]} 
                          name="Late"
                          cursor="pointer"
                          onClick={handleBarChartClick}
                        />
                        <Bar 
                          dataKey="absent" 
                          fill="#EF4444" 
                          radius={[4, 4, 0, 0]} 
                          name="Absent"
                          cursor="pointer"
                          onClick={handleBarChartClick}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-4 pt-2 border-t border-gray-100">
                    💡 Click on any bar to view detailed employee records for that period
                  </div>
                </>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-gray-500">
                  <Calendar size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No attendance data available</p>
                  <p className="text-sm mt-1">Attendance records will appear here once added</p>
                </div>
              )}
            </div>

            {/* Today's Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Today's Status</h2>
                  <p className="text-sm text-gray-500 mt-1">Real-time attendance snapshot</p>
                </div>
                <Filter size={18} className="text-gray-400" />
              </div>
              
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : pieChartData.length > 0 ? (
                <>
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
                          onClick={handlePieChartClick}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              cursor="pointer"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [`${value} employees`, name]}
                          cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {pieChartData.map((entry, index) => (
                      <div 
                        key={entry.name} 
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        onClick={() => handlePieChartClick({ activePayload: [{ payload: { name: entry.name } }] })}
                      >
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: COLORS[index] }}
                          ></div>
                          <span className="text-sm text-gray-600">{entry.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-3 pt-2 border-t border-gray-100">
                    💡 Click on any segment to view detailed records
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                  <Users size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No attendance today</p>
                  <p className="text-sm mt-1">No attendance records for today yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
                <p className="text-sm text-gray-500 mt-1">Latest system updates</p>
              </div>
              <Link 
                to="/activities" 
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ChevronRight size={16} />
              </Link>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {recentActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No recent activities</p>
                <p className="text-sm mt-1">Activities will appear here</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AttendanceDashboard;