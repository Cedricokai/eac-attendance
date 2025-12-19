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
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import MainSidebar from "./mainSidebar";

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
            {linkText} <ChevronDown size={16} className="rotate-270" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

function ActivityItem({ activity }) {
  const iconMap = {
    error: <XCircle size={18} className="text-red-500" />,
    success: <CheckCircle size={18} className="text-green-500" />,
    warning: <AlertCircle size={18} className="text-amber-500" />,
    info: <AlertCircle size={18} className="text-blue-500" />,
    payroll: <DollarSign size={18} className="text-indigo-500" />,
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
      <button 
        onClick={() => setTimeRange('quarter')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === 'quarter' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        Quarter
      </button>
    </div>
  );
}

function AttendanceDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingApprovals: 0,
    absentCount: 0,
    totalPresent: 0,
    totalLate: 0
  });
  
  const [payrollStats, setPayrollStats] = useState({
    totalNetAmount: 0,
    totalTax: 0,
    totalSsnit: 0,
    employeeCount: 0,
    totalLeaveDays: 0,
    employeesOnLeave: 0,
    latestPeriod: null,
    processedPeriods: 0,
    pendingPayrolls: 0
  });
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [mainSidebarOpen, setMainSidebarOpen] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [payrollChartData, setPayrollChartData] = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();

  const sidebarOffsets = useMemo(() => {
    const mainWidth = mainSidebarOpen ? 64 : 20;
    return {
      mainWidth,
      contentMarginLeft: mainWidth
    };
  }, [mainSidebarOpen]);

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
  }, []);

  const fetchPayrollSummary = async () => {
    try {
      setPayrollLoading(true);
      const token = localStorage.getItem('jwtToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/payroll/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPayrollStats({
          totalNetAmount: data.totalNetAmount || 0,
          totalTax: data.totalTax || 0,
          totalSsnit: data.totalSsnit || 0,
          employeeCount: data.employeeCount || 0,
          totalLeaveDays: data.totalLeaveDays || 0,
          employeesOnLeave: data.employeesOnLeave || 0,
          latestPeriod: data.latestPeriod || null,
          processedPeriods: data.processedPeriods || 0,
          pendingPayrolls: data.pendingPayrolls || 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch payroll summary:", error);
    } finally {
      setPayrollLoading(false);
    }
  };

  const fetchPayrollHistory = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/payroll/history?limit=6`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPayrollHistory(data);
        
        const chartData = data.slice(0, 6).map(item => ({
          name: item.periodName,
          netSalary: item.totalNetAmount || 0,
          tax: item.totalTax || 0,
          ssnit: item.totalSsnit || 0
        }));
        setPayrollChartData(chartData);
      }
    } catch (error) {
      console.error("Failed to fetch payroll history:", error);
    }
  };

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

  const handleLineChartClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const clickedDataKey = data.activePayload[0].dataKey;
      
      const payrollPeriod = payrollHistory.find(p => p.periodName === payload.name);
      
      if (payrollPeriod) {
        let categoryFilter = '';
        if (clickedDataKey === 'netSalary') categoryFilter = 'net';
        else if (clickedDataKey === 'tax') categoryFilter = 'tax';
        else if (clickedDataKey === 'ssnit') categoryFilter = 'ssnit';
        
        navigate(`/reports?period=${payrollPeriod.id}&view=payroll&groupBy=employee&category=${categoryFilter}`);
      }
    }
  };

  const handleLegendClick = (event) => {
    const status = event.dataKey;
    let statusFilter = '';
    
    if (status === 'present') statusFilter = 'Present';
    else if (status === 'late') statusFilter = 'Late';
    else if (status === 'absent') statusFilter = 'Absent';
    
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    
    navigate(`/reports?startDate=${startDate}&endDate=${today}&status=${statusFilter}&groupBy=employee`);
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
      await fetchPayrollSummary();
      await fetchPayrollHistory();

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

        if (payrollStats.latestPeriod) {
          activities.push({
            id: 5,
            type: 'payroll',
            message: `Latest payroll: ${payrollStats.latestPeriod} - ${new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(payrollStats.totalNetAmount || 0)}`,
            timestamp: new Date().toISOString()
          });
        }

        if (payrollStats.pendingPayrolls > 0) {
          activities.push({
            id: 6,
            type: 'warning',
            message: `${payrollStats.pendingPayrolls} payroll period(s) pending processing`,
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

  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, [timeRange]);

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

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const calculateTrends = () => {
    const attendanceTrend = calculatedAttendanceRate > 85 ? 2.5 : calculatedAttendanceRate > 75 ? 0.5 : -1.2;
    const employeesTrend = stats.totalEmployees > 20 ? 1.5 : stats.totalEmployees > 15 ? 0.8 : -0.3;
    const payrollTrend = payrollStats.totalNetAmount > 100000 ? 3.2 : payrollStats.totalNetAmount > 50000 ? 1.8 : 0.5;
    
    return {
      attendanceTrend,
      employeesTrend,
      leaveTrend: stats.onLeave > 3 ? -1.0 : 0.5,
      payrollTrend
    };
  };

  const trends = calculateTrends();

  const formatCurrency = (amount) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount || 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
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

      <div 
        className="flex-1 overflow-auto transition-all duration-300"
        style={{ marginLeft: `${sidebarOffsets.contentMarginLeft}px` }}
      >
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
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
                  {recentActivities.filter(a => a.type === 'warning' || a.type === 'error').length}
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

          <motion.section 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-xs mb-6 border border-gray-100"
          >
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Attendance & Payroll Dashboard</h1>
              <p className="text-gray-500 mt-1">Comprehensive overview of employee attendance and payroll metrics</p>
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
              {payrollStats.latestPeriod && (
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                  <FileText size={18} className="text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Latest Payroll: {payrollStats.latestPeriod}
                  </span>
                </div>
              )}
            </div>
          </motion.section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
              icon={<DollarSign size={20} />}
              title="Total Net Pay"
              value={formatCurrency(payrollStats.totalNetAmount)}
              secondaryValue={`${payrollStats.employeeCount} employees`}
              linkText="View payroll"
              linkTo="/payroll"
              loading={payrollLoading}
              color="indigo"
              trend={trends.payrollTrend > 0 ? 1 : -1}
              trendValue={Math.abs(trends.payrollTrend)}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Attendance Trend</h2>
                <TimeRangeSelector timeRange={timeRange} setTimeRange={setTimeRange} />
              </div>
              
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : chartData.length > 0 ? (
                <>
                  <div className="h-64">
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
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Click on any bar to view detailed employee records for that period
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                  <Calendar size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No attendance data available</p>
                  <p className="text-sm mt-1">Attendance records will appear here once added</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Today's Status</h2>
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
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
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
                          <span className="text-xs text-gray-600">{entry.name}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Click on any segment to view detailed employee records
                  </div>
                </>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-gray-500">
                  <Users size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No attendance today</p>
                  <p className="text-sm mt-1">No attendance records for today yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Payroll Overview</h2>
                <Link 
                  to="/payroll" 
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                >
                  View all <ChevronDown size={16} className="rotate-270" />
                </Link>
              </div>
              
              {payrollLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : payrollChartData.length > 0 ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={payrollChartData}
                        onClick={handleLineChartClick}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false}
                          tickFormatter={(value) => `GHS ${(value/1000).toFixed(0)}K`}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Amount']}
                          labelFormatter={(label) => `Payroll Period: ${label}`}
                          cursor={{ stroke: '#8B5CF6', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="netSalary" 
                          stroke="#8B5CF6" 
                          strokeWidth={2}
                          dot={{ r: 4, cursor: 'pointer' }}
                          activeDot={{ r: 6, cursor: 'pointer' }}
                          name="Net Salary"
                          onClick={handleLineChartClick}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="tax" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          dot={{ r: 4, cursor: 'pointer' }}
                          activeDot={{ r: 6, cursor: 'pointer' }}
                          name="Tax"
                          onClick={handleLineChartClick}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="ssnit" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          dot={{ r: 4, cursor: 'pointer' }}
                          activeDot={{ r: 6, cursor: 'pointer' }}
                          name="SSNIT"
                          onClick={handleLineChartClick}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div 
                      className="text-center p-3 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => navigate('/reports?view=payroll&groupBy=employee')}
                    >
                      <div className="text-sm text-gray-500">Total Net</div>
                      <div className="text-xl font-bold text-indigo-600 hover:text-indigo-700">
                        {formatCurrency(payrollStats.totalNetAmount)}
                      </div>
                    </div>
                    <div 
                      className="text-center p-3 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => navigate('/reports?view=payroll&groupBy=employee&category=tax')}
                    >
                      <div className="text-sm text-gray-500">Total Tax</div>
                      <div className="text-xl font-bold text-red-600 hover:text-red-700">
                        {formatCurrency(payrollStats.totalTax)}
                      </div>
                    </div>
                    <div 
                      className="text-center p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => navigate('/reports?view=payroll&groupBy=employee&category=ssnit')}
                    >
                      <div className="text-sm text-gray-500">Total SSNIT</div>
                      <div className="text-xl font-bold text-blue-600 hover:text-blue-700">
                        {formatCurrency(payrollStats.totalSsnit)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Click on any data point to view payroll employee records
                  </div>
                  
                  {payrollStats.pendingPayrolls > 0 && (
                    <div 
                      className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 cursor-pointer transition-colors"
                      onClick={() => navigate('/payroll')}
                    >
                      <div className="flex items-center">
                        <AlertCircle size={16} className="text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-700">
                          {payrollStats.pendingPayrolls} payroll period(s) pending processing
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-gray-500">
                  <CreditCard size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No payroll data available</p>
                  <p className="text-sm mt-1">Generate payroll to see analytics</p>
                  <Link 
                    to="/payroll"
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                  >
                    Go to Payroll
                  </Link>
                </div>
              )}
            </div>

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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Payroll Status Summary</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{payrollStats.processedPeriods || 0} processed periods</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200 hover:from-indigo-100 hover:to-indigo-200 cursor-pointer transition-all"
                  onClick={() => navigate('/reports?view=payroll&groupBy=employee')}
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                      <Banknote size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Disbursed</p>
                      <p className="text-xl font-bold text-indigo-700">{formatCurrency(payrollStats.totalNetAmount)}</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:from-green-100 hover:to-green-200 cursor-pointer transition-all"
                  onClick={() => navigate('/employee')}
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Users size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Employees Covered</p>
                      <p className="text-xl font-bold text-green-700">{payrollStats.employeeCount || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:from-blue-100 hover:to-blue-200 cursor-pointer transition-all"
                  onClick={() => navigate('/reports?category=leave&groupBy=employee')}
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <CalendarCheck size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Leave Impact</p>
                      <p className="text-xl font-bold text-blue-700">{payrollStats.totalLeaveDays || 0} days</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {payrollHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Payroll Periods</h3>
                  <div className="space-y-2">
                    {payrollHistory.slice(0, 3).map((period, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        onClick={() => navigate(`/reports?period=${period.id}&view=payroll&groupBy=employee`)}
                      >
                        <div>
                          <p className="font-medium text-gray-900">{period.periodName}</p>
                          <p className="text-xs text-gray-500">{period.startDate} to {period.endDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">{formatCurrency(period.totalNetAmount)}</p>
                          <p className="text-xs text-gray-500">{period.employeeCount} employees</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-xs p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                <Clock size={18} className="text-gray-400" />
              </div>
              
              <div className="space-y-3">
                <Link 
                  to="/attendance"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg border border-green-200 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3 group-hover:bg-green-200 transition-colors">
                      <CalendarCheck size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Manage Attendance</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {calculatedAttendanceRate.toFixed(1)}% attendance rate today
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link 
                  to="/payroll"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 rounded-lg border border-indigo-200 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg mr-3 group-hover:bg-indigo-200 transition-colors">
                      <DollarSign size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Manage Payroll</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(payrollStats.totalNetAmount)} total net pay
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link 
                  to="/reports"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border border-purple-200 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3 group-hover:bg-purple-200 transition-colors">
                      <BarChart3 size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Generate Reports</p>
                      <p className="text-sm text-gray-600 mt-1">
                        View detailed analytics and insights
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link 
                  to="/payslip"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 rounded-lg border border-pink-200 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-pink-100 rounded-lg mr-3 group-hover:bg-pink-200 transition-colors">
                      <FileText size={20} className="text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Payslip Generator</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Create and distribute payslips
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AttendanceDashboard;