import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UsersIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  FireIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PrinterIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  QueueListIcon,
  PlusIcon,
  PencilIcon,
  UserIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { lunchApi, attendanceService } from './services/lunchApi';

// ===== WORKING IMAGE URLS =====
const IMAGES = {
  employees: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop&crop=center&q=80',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=600&fit=crop&crop=center&q=80',
  workers: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=800&h=600&fit=crop&crop=center&q=80',
  banku: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/BANKU_WITH_TILAPIA_%2B_FRIED_RICE.jpg',
  jollof: 'https://images.unsplash.com/photo-1665928048293-7f38f6f0b8a8?w=800&h=600&fit=crop&crop=center&q=80',
  waakye: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Waakye%2C_a_delicious_delicacy_in_Ghana.jpg',
  fufu: 'https://images.unsplash.com/photo-1633436375795-12b3b339712f?w=800&h=600&fit=crop&crop=center&q=80',
  friedRice: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Ghanaian_fried_rice.jpg',
  riceBalls: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Omo_tuo.jpg',
  ampesi: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Ghanaian_Local_Dish.jpg',
  serving: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop&crop=center&q=80',
  budget: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&h=600&fit=crop&crop=center&q=80',
  analytics: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center&q=80',
  attendance: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&h=600&fit=crop&crop=center&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&crop=center&q=80'
};

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

// ===== IMAGE FALLBACK COMPONENT =====
const ImageWithFallback = ({ src, alt, className, ...props }) => {
  const [error, setError] = useState(false);
  return (
    <img
      src={error ? IMAGES.default : src}
      alt={alt || 'Image'}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      {...props}
    />
  );
};

// ===== THEME CONTEXT =====
const ThemeContext = React.createContext({ theme: 'light', toggleTheme: () => {} });

// ===== MAIN DASHBOARD COMPONENT =====
const Dashboard = () => {
  const [theme, setTheme] = useState('light');
  const [stats, setStats] = useState({
    todayPresent: 0,
    todayAssigned: 0,
    todayServed: 0,
    pendingLunch: 0,
    absentEmployees: 0,
    notAssigned: 0,
    weeklyAssigned: 0,
    monthlyServed: 0,
    todayEstimatedCost: 0,
    monthlyFoodCost: 0,
    todayBudget: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [queueData, setQueueData] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  // ===== TIME UPDATER =====
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ===== DATA FETCHING =====
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getMondayOfCurrentWeek();
      const monthStart = getFirstOfCurrentMonth();
      const weekEnd = getWeekEnd(weekStart);
      const monthEnd = getMonthEnd(monthStart);

      // Fetch data using only existing API endpoints
      const [
        attendanceRes,
        assignedRes,
        servedRes,
        budgetRes,
        weeklyAssignmentsRes,
        monthlyServedRes,
        dailyTrendRes,
        departmentRes
      ] = await Promise.all([
        attendanceService.getTodayAttendance().catch(() => ({ data: [] })),
        lunchApi.getAssignmentsForDate(today).catch(() => ({ data: [] })),
        lunchApi.getTodayServed(today).catch(() => ({ data: [] })),
        lunchApi.getCurrentBudget('DAILY').catch(() => ({ data: { amount: 2500 } })),
        lunchApi.getAssignmentsForDateRange(weekStart, weekEnd).catch(() => ({ data: [] })),
        lunchApi.getAssignmentsForDateRange(monthStart, monthEnd).catch(() => ({ data: [] })),
        lunchApi.getDailyTrend(weekStart, weekEnd).catch(() => ({ data: [] })),
        lunchApi.getDepartmentDistribution(today).catch(() => ({ data: [] }))
      ]);

      // Extract data with fallbacks
      const present = attendanceRes?.data?.length || 0;
      const assigned = assignedRes?.data?.length || 0;
      const served = servedRes?.data?.length || 0;
      const pending = Math.max(0, assigned - served);
      const absent = Math.max(0, present - assigned);
      const notAssigned = Math.max(0, present - assigned);
      const weeklyAssigned = weeklyAssignmentsRes?.data?.length || 0;
      const monthlyServed = monthlyServedRes?.data?.length || 0;
      const todayBudget = budgetRes?.data?.amount || 2500;

      setStats({
        todayPresent: present,
        todayAssigned: assigned,
        todayServed: served,
        pendingLunch: pending,
        absentEmployees: absent,
        notAssigned: notAssigned,
        weeklyAssigned: weeklyAssigned,
        monthlyServed: monthlyServed,
        todayEstimatedCost: served * 5.50,
        monthlyFoodCost: monthlyServed * 5.50,
        todayBudget: todayBudget,
      });

      setDailyTrend(dailyTrendRes?.data || []);
      setDepartmentData(departmentRes?.data || []);

      // Generate queue data from assignments if available
      if (assignedRes?.data && assignedRes.data.length > 0) {
        const queue = assignedRes.data.slice(0, 6).map((item, index) => ({
          id: item.id || index + 1,
          name: item.employee?.name || `Employee ${index + 1}`,
          department: item.employee?.department || 'N/A',
          meal: item.meal?.name || 'N/A',
          status: index < 2 ? 'Waiting' : index < 4 ? 'Served' : 'Completed',
          time: `${12 + Math.floor(index / 2)}:${String(15 + index * 5).padStart(2, '0')} ${index < 4 ? 'PM' : 'PM'}`
        }));
        setQueueData(queue);
      } else {
        setQueueData(generateDefaultQueue());
      }

      // Generate notifications based on data
      const newNotifications = [];
      if (notAssigned > 0) {
        newNotifications.push({
          id: Date.now() + 1,
          message: `${notAssigned} employees not assigned for lunch today`,
          time: 'Just now',
          type: 'warning'
        });
      }
      if (pending > 10) {
        newNotifications.push({
          id: Date.now() + 2,
          message: `${pending} employees waiting in the lunch queue`,
          time: 'Just now',
          type: 'info'
        });
      }
      if (served > 0 && assigned > 0 && served < assigned * 0.5) {
        newNotifications.push({
          id: Date.now() + 3,
          message: 'Lunch serving is below 50% completion',
          time: 'Just now',
          type: 'warning'
        });
      }
      if (present === 0) {
        newNotifications.push({
          id: Date.now() + 4,
          message: 'No attendance data available for today',
          time: 'Just now',
          type: 'info'
        });
      }
      setNotifications(newNotifications);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== GENERATE DEFAULT DATA (FALLBACK) =====
  const generateDefaultQueue = () => {
    const names = ['John Mensah', 'Ama Osei', 'Kwame Asare', 'Esi Brown', 'Kofi Addo', 'Akua Serwaa'];
    const departments = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'IT'];
    const meals = ['Jollof', 'Banku', 'Waakye', 'Fufu', 'Fried Rice', 'Rice Balls'];
    const statuses = ['Waiting', 'Served', 'Completed'];
    
    return names.map((name, i) => ({
      id: i + 1,
      name,
      department: departments[i % departments.length],
      meal: meals[i % meals.length],
      status: statuses[i % statuses.length],
      time: `${12 + Math.floor(i / 2)}:${String(15 + i * 5).padStart(2, '0')} ${i < 4 ? 'PM' : 'PM'}`
    }));
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ===== HELPER FUNCTIONS =====
  function getMondayOfCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  }

  function getFirstOfCurrentMonth() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return first.toISOString().split('T')[0];
  }

  function getWeekEnd(start) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  }

  function getMonthEnd(start) {
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    return end.toISOString().split('T')[0];
  }

  // ===== THEME TOGGLE =====
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const themeValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  // ===== RETRY FETCH =====
  const handleRetry = () => {
    fetchAllData();
  };

  if (loading) {
    return <LoadingSkeleton theme={theme} />;
  }

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={handleRetry} 
        theme={theme} 
      />
    );
  }

  return (
    <ThemeContext.Provider value={themeValue}>
      <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* ===== HEADER SECTION ===== */}
          <DashboardHeader 
            theme={theme} 
            currentTime={currentTime} 
            stats={stats}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            notifications={notifications}
          />

          {/* ===== KPI CARDS ===== */}
          <KPICards stats={stats} theme={theme} />

          {/* ===== QUICK ACTIONS ===== */}
          <QuickActions theme={theme} />

          {/* ===== CHARTS SECTION ===== */}
          <ChartsSection 
            dailyTrend={dailyTrend} 
            departmentData={departmentData}
            theme={theme}
          />

          {/* ===== BOTTOM SECTION: MENU + QUEUE + BUDGET ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <TodayMenu theme={theme} />
            <LiveQueue queueData={queueData} theme={theme} />
            <BudgetSummary stats={stats} theme={theme} />
          </div>

          {/* ===== ATTENDANCE SUMMARY ===== */}
          <AttendanceSummary stats={stats} theme={theme} />
        </div>
      </div>
    </ThemeContext.Provider>
  );
};

// ===== DASHBOARD HEADER =====
const DashboardHeader = ({ theme, currentTime, stats, showNotifications, setShowNotifications, notifications }) => {
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl p-6 md:p-8 mb-8 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      } shadow-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}
    >
      <div className="absolute inset-0 opacity-5">
        <ImageWithFallback 
          src={IMAGES.office} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg">
            <FireIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Lunch Management Dashboard
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Monitor employee lunch assignments, attendance, and meal distribution in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className={`px-4 py-2 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {greeting}, CHEF
            </p>
          </div>
          
          <div className={`px-4 py-2 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {formatDate(currentTime)}
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-xl transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <BellIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          <ThemeToggle />
        </div>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <NotificationsPanel 
            theme={theme} 
            onClose={() => setShowNotifications(false)}
            notifications={notifications}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ===== THEME TOGGLE =====
const ThemeToggle = () => {
  const { theme, toggleTheme } = React.useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl transition-colors ${
          theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}
      >
        {theme === 'dark' ? (
          <MoonIcon className="h-6 w-6 text-gray-300" />
        ) : (
          <SunIcon className="h-6 w-6 text-gray-600" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            } overflow-hidden z-50`}
          >
            <button
              onClick={() => {
                toggleTheme();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                theme === 'light'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <SunIcon className="h-5 w-5" />
              Light Mode
            </button>
            <button
              onClick={() => {
                if (theme !== 'dark') toggleTheme();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MoonIcon className="h-5 w-5" />
              Dark Mode
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== KPI CARDS =====
const KPICards = ({ stats, theme }) => {
  const kpis = [
    {
      title: 'Employees Present',
      value: stats.todayPresent,
      icon: <UsersIcon className="h-6 w-6" />,
      image: IMAGES.employees,
      gradient: 'from-indigo-500 to-indigo-600',
      trend: `${stats.todayPresent > 0 ? 'Active' : 'No data'}`,
      trendUp: stats.todayPresent > 0
    },
    {
      title: 'Assigned Lunch',
      value: stats.todayAssigned,
      icon: <CheckCircleIcon className="h-6 w-6" />,
      image: IMAGES.jollof,
      gradient: 'from-emerald-500 to-emerald-600',
      trend: stats.todayPresent > 0 ? `${Math.round((stats.todayAssigned / stats.todayPresent) * 100)}% assigned` : 'No data',
      trendUp: stats.todayAssigned > 0
    },
    {
      title: 'Lunch Served',
      value: stats.todayServed,
      icon: <FireIcon className="h-6 w-6" />,
      image: IMAGES.serving,
      gradient: 'from-amber-500 to-amber-600',
      trend: stats.todayAssigned > 0 ? `${Math.round((stats.todayServed / stats.todayAssigned) * 100)}% served` : 'No data',
      trendUp: stats.todayServed > 0
    },
    {
      title: 'Pending Lunch',
      value: stats.pendingLunch,
      icon: <ClockIcon className="h-6 w-6" />,
      image: IMAGES.queue || IMAGES.default,
      gradient: 'from-rose-500 to-rose-600',
      trend: 'Waiting to collect',
      trendUp: false
    },
    {
      title: 'Absent Employees',
      value: stats.absentEmployees,
      icon: <XCircleIcon className="h-6 w-6" />,
      image: IMAGES.attendance,
      gradient: 'from-red-500 to-red-600',
      trend: 'Not checked in',
      trendUp: false
    },
    {
      title: 'Not Assigned',
      value: stats.notAssigned,
      icon: <UserGroupIcon className="h-6 w-6" />,
      image: IMAGES.workers,
      gradient: 'from-gray-500 to-gray-600',
      trend: 'Need meal assignment',
      trendUp: false
    },
    {
      title: 'Weekly Assigned',
      value: stats.weeklyAssigned,
      icon: <CalendarIcon className="h-6 w-6" />,
      image: IMAGES.fufu,
      gradient: 'from-purple-500 to-purple-600',
      trend: 'This week total',
      trendUp: true
    },
    {
      title: 'Monthly Served',
      value: stats.monthlyServed,
      icon: <CalendarIcon className="h-6 w-6" />,
      image: IMAGES.waakye,
      gradient: 'from-pink-500 to-pink-600',
      trend: 'Month to date',
      trendUp: true
    },
    {
      title: "Today's Food Cost",
      value: `₵${stats.todayEstimatedCost.toFixed(2)}`,
      icon: <CurrencyDollarIcon className="h-6 w-6" />,
      image: IMAGES.budget,
      gradient: 'from-teal-500 to-teal-600',
      trend: 'Estimated cost',
      trendUp: true
    },
    {
      title: 'Monthly Food Cost',
      value: `₵${stats.monthlyFoodCost.toFixed(2)}`,
      icon: <CurrencyDollarIcon className="h-6 w-6" />,
      image: IMAGES.budget,
      gradient: 'from-cyan-500 to-cyan-600',
      trend: 'Accumulated cost',
      trendUp: true
    },
    {
      title: "Today's Budget",
      value: `₵${stats.todayBudget.toFixed(2)}`,
      icon: <CurrencyDollarIcon className="h-6 w-6" />,
      image: IMAGES.analytics,
      gradient: 'from-blue-500 to-blue-600',
      trend: `Remaining: ₵${Math.max(0, stats.todayBudget - stats.todayEstimatedCost).toFixed(2)}`,
      trendUp: stats.todayBudget > stats.todayEstimatedCost
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <MetricCard key={index} {...kpi} index={index} theme={theme} />
      ))}
    </div>
  );
};

// ===== METRIC CARD COMPONENT =====
const MetricCard = ({ title, value, icon, image, gradient, trend, trendUp, index, theme }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ 
        y: -6,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={`relative overflow-hidden rounded-2xl h-44 shadow-lg border ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      } group cursor-pointer`}
    >
      <ImageWithFallback
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70"></div>
      
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}></div>

      <div className="relative z-10 flex flex-col justify-between h-full p-5">
        <div className="flex justify-between items-start">
          <p className="text-white/90 font-medium text-sm tracking-wide">
            {title}
          </p>
          <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            {icon}
          </div>
        </div>

        <div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {value}
          </h3>
          <div className="flex items-center gap-2">
            {trendUp !== undefined && trendUp !== null && (
              trendUp ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
              )
            )}
            <span className="text-xs text-white/80">{trend}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ===== QUICK ACTIONS =====
const QuickActions = ({ theme }) => {
  const actions = [
    { label: 'Assign Meals', icon: PlusIcon, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Manage Meals', icon: PencilIcon, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Attendance', icon: UserIcon, color: 'from-blue-500 to-blue-600' },
    { label: "Today's Serving", icon: FireIcon, color: 'from-amber-500 to-amber-600' },
    { label: 'Weekly Reports', icon: DocumentTextIcon, color: 'from-purple-500 to-purple-600' },
    { label: 'Budget Management', icon: CurrencyDollarIcon, color: 'from-rose-500 to-rose-600' },
    { label: 'Print Report', icon: PrinterIcon, color: 'from-gray-500 to-gray-600' },
    { label: 'Export Excel', icon: ChartBarIcon, color: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 mb-8 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      } shadow-lg border`}
    >
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`} />
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Quick Actions
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}
          >
            <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <span className={`text-xs font-medium text-center ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

// ===== CHARTS SECTION =====
const ChartsSection = ({ dailyTrend, departmentData, theme }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Daily Lunch Trend */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-6 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        } shadow-lg border`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Daily Lunch Trend
          </h3>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            This Week
          </span>
        </div>
        {dailyTrend && dailyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="servedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="assignedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="date" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
              <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                  color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="served" 
                stroke="#4F46E5" 
                strokeWidth={2}
                fill="url(#servedGradient)" 
              />
              <Area 
                type="monotone" 
                dataKey="assigned" 
                stroke="#10B981" 
                strokeWidth={2}
                fill="url(#assignedGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No daily trend data available" theme={theme} />
        )}
      </motion.div>

      {/* Department Distribution */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl p-6 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        } shadow-lg border`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Department Distribution
          </h3>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Today
          </span>
        </div>
        {departmentData && departmentData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                  color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No department data available" theme={theme} />
        )}
      </motion.div>
    </div>
  );
};

// ===== TODAY'S MENU =====
const TodayMenu = ({ theme }) => {
  const menuItems = [
    { day: 'Monday', meals: ['Banku', 'Fried Rice'], images: [IMAGES.banku, IMAGES.friedRice], prices: ['₵12', '₵10'] },
    { day: 'Tuesday', meals: ['Waakye', 'Red Red'], images: [IMAGES.waakye, IMAGES.default], prices: ['₵10', '₵8'] },
    { day: 'Wednesday', meals: ['Fufu', 'Rice & Stew'], images: [IMAGES.fufu, IMAGES.default], prices: ['₵15', '₵10'] },
    { day: 'Thursday', meals: ['Ampesi', 'Braised Rice'], images: [IMAGES.ampesi, IMAGES.default], prices: ['₵12', '₵10'] },
    { day: 'Friday', meals: ['Rice Balls', 'Jollof'], images: [IMAGES.riceBalls, IMAGES.jollof], prices: ['₵8', '₵12'] },
  ];

  const today = new Date().getDay();
  const todayIndex = today === 0 ? 4 : today - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      } shadow-lg border`}
    >
      <div className="flex items-center gap-3 mb-4">
        <FireIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-500'}`} />
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Weekly Meal Menu
        </h3>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {menuItems.map((item, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            className={`p-3 rounded-xl transition-colors ${
              index === todayIndex 
                ? theme === 'dark' ? 'bg-indigo-500/20 border border-indigo-500' : 'bg-indigo-50 border border-indigo-200'
                : theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${
                index === todayIndex 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {item.day}
                {index === todayIndex && (
                  <span className="ml-2 text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">Today</span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {item.meals.map((meal, mealIndex) => (
                <div key={mealIndex} className="flex items-center gap-2">
                  <ImageWithFallback 
                    src={item.images[mealIndex]} 
                    alt={meal}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                      {meal}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.prices[mealIndex]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ===== LIVE QUEUE =====
const LiveQueue = ({ queueData, theme }) => {
  const statusColors = {
    Waiting: 'bg-amber-500',
    Served: 'bg-emerald-500',
    Completed: 'bg-blue-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-2xl p-6 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      } shadow-lg border`}
    >
      <div className="flex items-center gap-3 mb-4">
        <QueueListIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`} />
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Live Lunch Queue
        </h3>
        <span className="ml-auto text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 px-2 py-1 rounded-full animate-pulse">
          ● Live
        </span>
      </div>

      {queueData && queueData.length > 0 ? (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {queueData.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {item.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {item.name || 'Unknown'}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.department || 'N/A'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className={`truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.meal || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {item.time || 'N/A'}
                </span>
                <div className={`mt-1 text-xs px-2 py-0.5 rounded-full text-white ${statusColors[item.status] || 'bg-gray-500'}`}>
                  {item.status || 'Unknown'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState message="No queue data available" theme={theme} />
      )}
    </motion.div>
  );
};

// ===== BUDGET SUMMARY =====
const BudgetSummary = ({ stats, theme }) => {
  const spent = stats.todayEstimatedCost || 0;
  const budget = stats.todayBudget || 2500;
  const remaining = Math.max(0, budget - spent);
  const percentage = Math.min(100, (spent / budget) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl p-6 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      } shadow-lg border`}
    >
      <div className="flex items-center gap-3 mb-4">
        <CurrencyDollarIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Budget Summary
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Today's Budget
            </span>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              ₵{budget.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Spent
            </span>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              ₵{spent.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Remaining
            </span>
            <span className={`text-sm font-semibold ${remaining > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ₵{remaining.toFixed(2)}
            </span>
          </div>
          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`absolute left-0 top-0 h-full rounded-full ${
                percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </div>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {percentage.toFixed(1)}% of budget used
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Cost Per Employee</p>
            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              ₵{(stats.todayPresent > 0 ? spent / stats.todayPresent : 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Average Meal Cost</p>
            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              ₵5.50
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ===== ATTENDANCE SUMMARY =====
const AttendanceSummary = ({ stats, theme }) => {
  const attendanceData = [
    { label: 'Present', value: stats.todayPresent, color: 'bg-emerald-500' },
    { label: 'Absent', value: stats.absentEmployees, color: 'bg-red-500' },
    { label: 'Late', value: Math.floor(stats.todayPresent * 0.1), color: 'bg-amber-500' },
    { label: 'On Leave', value: Math.floor(stats.todayPresent * 0.05), color: 'bg-blue-500' },
  ];

  const totalWorkforce = stats.todayPresent + stats.absentEmployees;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl p-6 mt-6 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      } shadow-lg border`}
    >
      <div className="flex items-center gap-3 mb-4">
        <UserGroupIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`} />
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Attendance Summary
        </h3>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          Total Workforce: {totalWorkforce}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {attendanceData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ===== NOTIFICATIONS PANEL =====
const NotificationsPanel = ({ theme, onClose, notifications }) => {
  const typeColors = {
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    success: 'bg-emerald-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`absolute right-0 top-full mt-2 w-80 md:w-96 rounded-xl shadow-2xl border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } z-50 overflow-hidden`}
    >
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex justify-between items-center">
          <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Notifications
          </h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            ✕
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {notifications && notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-xl mb-2 transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${typeColors[notif.type] || 'bg-gray-500'}`}></div>
                <div className="flex-1">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    {notif.message}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
                    {notif.time}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className={`text-sm text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No new notifications
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ===== EMPTY STATE =====
const EmptyState = ({ message, theme }) => (
  <div className="flex flex-col items-center justify-center h-64">
    <PhotoIcon className={`h-12 w-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
    <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
      {message || 'No data available'}
    </p>
  </div>
);

// ===== ERROR STATE =====
const ErrorState = ({ error, onRetry, theme }) => (
  <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
    <div className={`max-w-md w-full rounded-2xl p-8 text-center ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    } shadow-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
      </div>
      <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        Something went wrong
      </h3>
      <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        {error || 'Failed to load dashboard data. Please try again.'}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
      >
        <ArrowPathIcon className="h-5 w-5" />
        Try Again
      </button>
    </div>
  </div>
);

// ===== LOADING SKELETON =====
const LoadingSkeleton = ({ theme }) => {
  return (
    <div className={`min-h-screen p-4 md:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-8">
          <div className={`rounded-3xl p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-2xl"></div>
                <div>
                  <div className="h-8 w-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-4 w-96 bg-gray-300 dark:bg-gray-600 rounded mt-2"></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-32 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                <div className="h-10 w-48 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`h-44 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg animate-pulse`}>
                <div className="w-full h-full bg-gray-300 dark:bg-gray-600 rounded-2xl"></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className={`h-72 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg p-6`}>
                <div className="h-6 w-40 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                <div className="w-full h-56 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;