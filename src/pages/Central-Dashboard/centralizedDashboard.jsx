import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Package,
  DollarSign,
  Briefcase,
  PieChart,
  Home,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  X,
  FileText,
  Truck,
  Bell,
  Search,
  User as UserIcon,
  LayoutDashboard,
  CreditCard,
  ClipboardList,
  Building2,
  UserCheck,
  HandCoins,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  Clock3,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  Plus,
  Download,
  Link2,
  Coins,
  Shield
} from 'lucide-react';
import AttendanceDashboard from '../Eac-attendance/attendanceDashboard';
import InventoryDashboard from '../Eac-inventory/InventoryDashboard';
import Userpage from '../Userpage';
import JobsManagement from '../Eac-attendance/attendance/JobsManagement';
import companyLogo from "../../assets/companyLogo.jpg";

// ========== PLACEHOLDER COMPONENTS FOR UNIMPLEMENTED DASHBOARDS ==========
const PlaceholderDashboard = ({ title, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <Icon size={48} className="text-indigo-300 mb-4" />
    <h2 className="text-2xl font-semibold text-gray-700">{title}</h2>
    <p className="text-gray-400 mt-2">This module is under development</p>
    <div className="mt-6 flex gap-2">
      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm">Coming soon</span>
    </div>
  </div>
);

// ========== DASHBOARD REGISTRY ==========
const dashboardComponents = {
  attendance: AttendanceDashboard,
  quotationMaster: () => <PlaceholderDashboard title="Quotation Master" icon={FileText} />,
  payroll: () => <PlaceholderDashboard title="Payroll" icon={DollarSign} />,
  InventoryDashboard: InventoryDashboard,
  reports: () => <PlaceholderDashboard title="Reports" icon={PieChart} />,
  userpage: Userpage,
  settings: () => <PlaceholderDashboard title="Settings" icon={Settings} />,
  JobsManagement: JobsManagement,
  CostCenterManagement: () => <PlaceholderDashboard title="Cost Center Management" icon={Building2} />,
  adminDashboard: () => <PlaceholderDashboard title="Transport Admin Dashboard" icon={Truck} />,
  employeeDashboard: () => <PlaceholderDashboard title="Employee Dashboard" icon={UserCheck} />,
  loanManagementDashboard: () => <PlaceholderDashboard title="Loan Management Dashboard" icon={HandCoins} />,
};

const CentralizedDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDashboard, setActiveDashboard] = useState('main');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount] = useState(3);
  const [timeElapsed, setTimeElapsed] = useState('01:24:08');

  // ===== SUMMARY DATA STATE =====
  const [summaryData, setSummaryData] = useState({
    totalProjects: 0,
    runningProjects: 0,
    endedProjects: 0,
    pendingProjects: 0,
    employees: 0,
    jobs: 0,
    products: 0,
    costCenters: 0,
    totalAttendance: 0,
    totalQuotes: 0,
    totalPayroll: 0,
    totalReports: 0,
    totalUsers: 0,
    totalPermissions: 0,
    totalLoans: 0,
    totalVehicles: 0
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ===== API CONFIG =====
  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
    if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
    if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };
  const API_BASE_URL = getApiBaseUrl();

  // ===== FETCH SUMMARY DATA =====
  const fetchSummaryData = async () => {
    setSummaryLoading(true);
    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) return;

      const [
        employeesRes,
        jobsRes,
        productsRes,
        costCentersRes,
        attendanceRes,
        quotesRes,
        payrollRes,
        reportsRes,
        usersRes,
        permissionsRes,
        loansRes,
        vehiclesRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employee`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/jobs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/cost-centers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/attendance/today`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/quotes`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/payroll/summary`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/reports/count`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/permissions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/loans`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false }))
      ]);

      const employees = employeesRes.ok ? await employeesRes.json() : [];
      const jobs = jobsRes.ok ? await jobsRes.json() : [];
      const products = productsRes.ok ? await productsRes.json() : [];
      const costCenters = costCentersRes.ok ? await costCentersRes.json() : [];

      const runningJobs = jobs.filter(job => job.status === 'ACTIVE').length;
      const endedJobs = jobs.filter(job => job.status === 'COMPLETED').length;
      const pendingJobs = jobs.filter(job => job.status === 'PENDING' || job.status === 'ON_HOLD').length;

      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
      const quotesData = quotesRes.ok ? await quotesRes.json() : [];
      const payrollData = payrollRes.ok ? await payrollRes.json() : {};
      const reportsData = reportsRes.ok ? await reportsRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const permissionsData = permissionsRes.ok ? await permissionsRes.json() : [];
      const loansData = loansRes.ok ? await loansRes.json() : [];
      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : [];

      setSummaryData({
        totalProjects: jobs.length || 0,
        runningProjects: runningJobs || 0,
        endedProjects: endedJobs || 0,
        pendingProjects: pendingJobs || 0,
        employees: employees.length || 0,
        jobs: jobs.length || 0,
        products: products.length || 0,
        costCenters: costCenters.length || 0,
        totalAttendance: attendanceData.length || 0,
        totalQuotes: quotesData.length || 0,
        totalPayroll: payrollData.total || 0,
        totalReports: reportsData.length || 0,
        totalUsers: usersData.length || 0,
        totalPermissions: permissionsData.length || 0,
        totalLoans: loansData.length || 0,
        totalVehicles: vehiclesData.length || 0,
      });
    } catch (error) {
      console.error("Error fetching summary data:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  // ===== USER FETCH =====
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          navigate("/");
          return;
        }
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` },
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setUser({
            name: data.name || data.username,
            role: data.role ? data.role.replace("ROLE_", "").toLowerCase() : 'employee',
            email: data.email,
            id: data.id
          });
        } else if (response.status === 401) {
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("userRole");
          navigate("/");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate, API_BASE_URL]);

  // ===== REFRESH SUMMARY ON MAIN DASHBOARD =====
  useEffect(() => {
    if (activeDashboard === 'main') {
      fetchSummaryData();
    }
  }, [activeDashboard]);

  // ===== LOGOUT =====
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
      localStorage.removeItem("authToken");
      navigate("/");
    }
  };

  // ===== DASHBOARD DEFINITIONS WITH STAT MAPPING =====
  const getDashboards = () => [
    { id: 'attendanceDashboard', name: 'Attendance', icon: <Users size={18} />, color: 'bg-blue-100 text-blue-800', hover: 'hover:bg-blue-50', statKey: 'totalAttendance', statLabel: 'Today\'s Present', roles: ['admin', 'hr', 'supervisor'] },
    { id: 'quotationMaster', name: 'Quotation Master', icon: <FileText size={18} />, color: 'bg-purple-100 text-purple-800', hover: 'hover:bg-purple-50', statKey: 'totalQuotes', statLabel: 'Total Quotes', roles: ['admin', 'hr'] },
    { id: 'payroll', name: 'Payroll', icon: <DollarSign size={18} />, color: 'bg-green-100 text-green-800', hover: 'hover:bg-green-50', statKey: 'totalPayroll', statLabel: 'Payroll (₵)', roles: ['admin', 'hr', 'accountant'] },
    { id: 'InventoryDashboard', name: 'Inventory', icon: <Package size={18} />, color: 'bg-amber-100 text-amber-800', hover: 'hover:bg-amber-50', statKey: 'products', statLabel: 'Total Products', roles: ['admin', 'inventory'] },
    { id: 'reports', name: 'Reports', icon: <PieChart size={18} />, color: 'bg-cyan-100 text-cyan-800', hover: 'hover:bg-cyan-50', statKey: 'totalReports', statLabel: 'Reports', roles: ['admin', 'manager', 'hr'] },
    { id: 'userpage', name: 'User Management', icon: <Users size={18} />, color: 'bg-indigo-100 text-indigo-800', hover: 'hover:bg-indigo-50', statKey: 'totalUsers', statLabel: 'Total Users', roles: ['admin'] },
    { id: 'pagePermissionManagement', name: 'System Permissions', icon: <Shield size={18} />, color: 'bg-gray-100 text-gray-800', hover: 'hover:bg-gray-50', statKey: 'totalPermissions', statLabel: 'Permissions', roles: ['admin'] },
    { id: 'settingspage', name: 'Settings', icon: <Settings size={18} />, color: 'bg-gray-100 text-gray-800', hover: 'hover:bg-gray-50', statKey: null, statLabel: '⚙️ Configure', roles: ['admin'] },
    { id: 'JobsManagement', name: 'Jobs Management', icon: <Briefcase size={18} />, color: 'bg-teal-100 text-teal-800', hover: 'hover:bg-teal-50', statKey: 'jobs', statLabel: 'Total Jobs', roles: ['admin'] },
    { id: 'CostCenterManagement', name: 'Cost Center', icon: <Building2 size={18} />, color: 'bg-purple-100 text-purple-800', hover: 'hover:bg-purple-50', statKey: 'costCenters', statLabel: 'Cost Centers', roles: ['admin'] },
    { id: 'adminDashboard', name: 'Transport Admin', icon: <Truck size={18} />, color: 'bg-orange-100 text-orange-800', hover: 'hover:bg-orange-50', statKey: 'totalVehicles', statLabel: 'Total Vehicles', roles: ['admin'] },
    { id: 'employeeDashboard', name: 'Employee Dashboard', icon: <UserCheck size={18} />, color: 'bg-emerald-100 text-emerald-800', hover: 'hover:bg-emerald-50', statKey: 'employees', statLabel: 'Active Employees', roles: ['admin'] },
    { id: 'loanManagementDashboard', name: 'Loan Management', icon: <HandCoins size={18} />, color: 'bg-rose-100 text-rose-800', hover: 'hover:bg-rose-50', statKey: 'totalLoans', statLabel: 'Total Loans', roles: ['admin'] }
  ];

  const dashboards = getDashboards();
  const filteredDashboards = dashboards.filter(d => user?.role ? d.roles.includes(user.role) : false);

  // ===== SYNC ACTIVE DASHBOARD WITH URL =====
  useEffect(() => {
    const path = location.pathname.split('/')[1];
    if (path && path !== 'centralizedDashboard') {
      setActiveDashboard(path);
    } else {
      setActiveDashboard('main');
    }
  }, [location.pathname]);

  // ===== RENDER ACTIVE DASHBOARD =====
  const renderDashboard = () => {
    const Component = dashboardComponents[activeDashboard];
    if (Component) return <Component />;
    return <MainDashboard />;
  };

  // ===== MAIN DASHBOARD WITH PROJECT STATS + MODULE SUMMARY CARDS =====
  const MainDashboard = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Sparkles size={28} className="text-indigo-500" />
          Welcome back, {user?.name || 'User'}!
        </h2>
        <p className="text-gray-600">Here's an overview of your available modules and key metrics</p>
      </div>

      {/* ===== TOP STATS ROW (PROJECT METRICS) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Projects"
          value={summaryData.totalProjects}
          change="+2.5%"
          trend="up"
          icon={<Briefcase size={24} />}
          color="from-blue-500 to-blue-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Ended Projects"
          value={summaryData.endedProjects}
          change="+8.1%"
          trend="up"
          icon={<CheckCircle size={24} />}
          color="from-green-500 to-green-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Running Projects"
          value={summaryData.runningProjects}
          change="+12.3%"
          trend="up"
          icon={<Clock3 size={24} />}
          color="from-amber-500 to-amber-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Pending Projects"
          value={summaryData.pendingProjects}
          change="-3.2%"
          trend="down"
          icon={<AlertCircle size={24} />}
          color="from-rose-500 to-rose-600"
          loading={summaryLoading}
        />
      </div>

      {/* ===== MODULE SUMMARY CARDS (ALL 13) ===== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-32">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mr-4"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDashboards.map((dashboard) => {
            const statValue = dashboard.statKey !== null ? summaryData[dashboard.statKey] : null;
            const statLabel = dashboard.statLabel || '';

            return (
              <motion.div
                key={dashboard.id}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveDashboard(dashboard.id);
                  navigate(`/${dashboard.id}`);
                }}
                className={`${dashboard.color} ${dashboard.hover} p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all duration-200 group relative overflow-hidden`}
              >
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white opacity-20 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-start">
                  <div className="p-3 rounded-lg bg-white shadow-xs mr-4 group-hover:scale-110 transition-transform z-10">
                    {dashboard.icon}
                  </div>
                  <div className="flex-1 z-10">
                    <h3 className="text-lg font-semibold mb-1">{dashboard.name}</h3>
                    {summaryLoading ? (
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      <>
                        {statValue !== null ? (
                          <p className="text-2xl font-bold text-gray-900">
                            {typeof statValue === 'number' && statValue > 999 ? statValue.toLocaleString() : statValue}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">{statLabel}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{statLabel}</p>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  // ===== STAT CARD COMPONENT =====
  const StatCard = ({ title, value, change, trend, icon, color, loading }) => (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`}></div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
          {!loading && (
            <p className={`text-xs mt-1 ${trend === 'up' ? 'text-green-600' : 'text-rose-600'}`}>
              {change} {trend === 'up' ? '▲' : '▼'}
              {trend === 'up' ? ' Increased from last month' : ' Decreased from last month'}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color} text-white`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );

  // ===== CLOSE USER DROPDOWN =====
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('.user-dropdown')) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  // ===== LOADING SCREEN =====
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ========== SIDEBAR ========== */}
      <motion.div
        initial={{ width: sidebarOpen ? 260 : 80 }}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="hidden md:flex h-full bg-gradient-to-b from-indigo-800 to-indigo-900 text-white fixed z-30 shadow-xl flex-col transition-all duration-300"
      >
        <div className="p-4 flex items-center justify-between border-b border-indigo-700 h-16 flex-shrink-0">
          {sidebarOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center overflow-hidden">
              <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-indigo-800 font-bold text-sm">EAC</span>
              </div>
              <h1 className="text-lg font-bold truncate">Employee Portal</h1>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-8 h-8 rounded-md bg-white flex items-center justify-center mx-auto flex-shrink-0">
              <span className="text-indigo-800 font-bold text-sm">E</span>
            </motion.div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-md hover:bg-indigo-700 transition-colors flex-shrink-0">
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          <Link to="/centralizedDashboard" className={`flex items-center p-3 rounded-lg transition-all duration-200 ${activeDashboard === 'main' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-700/70'}`}>
            <Home size={20} className="flex-shrink-0" />
            {sidebarOpen && <span className="ml-3 truncate">Dashboard</span>}
          </Link>
          {filteredDashboards.map((d) => (
            <Link key={d.id} to={`/${d.id}`} className={`flex items-center p-3 rounded-lg transition-all duration-200 ${activeDashboard === d.id ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-700/70'}`}>
              <span className="flex-shrink-0">{d.icon}</span>
              {sidebarOpen && <span className="ml-3 truncate">{d.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-700 flex-shrink-0">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen ? (
              <>
                <div className="flex items-center min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-indigo-200 capitalize truncate">{user?.role || 'employee'}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex-shrink-0 ml-2">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ========== MOBILE MENU ========== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-indigo-800 to-indigo-900 text-white z-50 shadow-2xl md:hidden">
              <div className="p-4 flex items-center justify-between border-b border-indigo-700 h-16">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center mr-2">
                    <span className="text-indigo-800 font-bold">EAC</span>
                  </div>
                  <h1 className="text-lg font-bold">Employee Portal</h1>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-indigo-700">
                  <X size={20} />
                </button>
              </div>
              <nav className="py-4 overflow-y-auto h-[calc(100%-8rem)] px-2 space-y-1">
                <Link to="/centralizedDashboard" onClick={() => setMobileMenuOpen(false)} className={`flex items-center p-3 rounded-lg transition-colors ${activeDashboard === 'main' ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}>
                  <Home size={20} />
                  <span className="ml-3">Dashboard</span>
                </Link>
                {filteredDashboards.map((d) => (
                  <Link key={d.id} to={`/${d.id}`} onClick={() => setMobileMenuOpen(false)} className={`flex items-center p-3 rounded-lg transition-colors ${activeDashboard === d.id ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}>
                    {d.icon}
                    <span className="ml-3">{d.name}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-indigo-700">
                <div className="flex items-center justify-between p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-indigo-200 capitalize">{user?.role || 'employee'}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 transition-all duration-300 overflow-auto" style={{ marginLeft: sidebarOpen ? '260px' : '80px' }}>
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center">
              <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 mr-2 rounded-md hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <img src={companyLogo} alt="Company Logo" className="h-8 w-auto" />
                <div className="hidden sm:block">
                  <span className="text-xl font-semibold text-gray-800">
                    {dashboards.find(d => d.id === activeDashboard)?.name || 'Dashboard'}
                  </span>
                  <span className="text-sm text-gray-400 ml-2">/</span>
                  <span className="text-sm text-gray-500 ml-1">Dashboard</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden lg:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
                <Search size={16} className="text-gray-400" />
                <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none text-sm ml-2 w-40" />
              </div>

              <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Bell size={20} className="text-gray-600" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              <div className="relative user-dropdown">
                <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white">
                    <span className="font-medium text-sm">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 hidden sm:block">
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown size={16} className={`text-gray-500 group-hover:text-gray-700 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                        <p className="text-xs text-indigo-600 capitalize mt-1">{user?.role || 'employee'}</p>
                      </div>
                      <button onClick={() => { navigate('/settings'); setUserDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors">
                        <Settings size={16} className="mr-2" /> Settings
                      </button>
                      <button onClick={() => { handleLogout(); setUserDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-gray-100">
                        <LogOut size={16} className="mr-2" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={activeDashboard} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="min-h-[calc(100vh-4rem)] bg-gray-50">
            {renderDashboard()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CentralizedDashboard;