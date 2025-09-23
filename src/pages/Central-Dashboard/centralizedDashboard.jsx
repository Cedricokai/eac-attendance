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
  Bell,
  ChevronDown,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import AttendanceDashboard from '../Eac-attendance/attendanceDashboard';
import InventoryDashboard from '../Eac-inventory/InventoryDashboard';
import Userpage from '../Userpage';

const CentralizedDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDashboard, setActiveDashboard] = useState('main');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Mock user data
  const [user] = useState({
    name: 'Demo User',
    role: 'admin',
    email: 'demo@example.com'
  });

  const logout = () => {
    console.log('Logging out...');
    navigate('/login');
  };

  const dashboards = [
    { 
      id: 'attendance', 
      name: 'Attendance', 
      icon: <Users size={18} />, 
      color: 'bg-blue-100 text-blue-800',
      hover: 'hover:bg-blue-50',
      roles: ['admin', 'manager', 'supervisor']
    },
    { 
      id: 'hr', 
      name: 'HR Management', 
      icon: <Briefcase size={18} />, 
      color: 'bg-purple-100 text-purple-800',
      hover: 'hover:bg-purple-50',
      roles: ['admin', 'hr']
    },
    { 
      id: 'payroll', 
      name: 'Payroll', 
      icon: <DollarSign size={18} />, 
      color: 'bg-green-100 text-green-800',
      hover: 'hover:bg-green-50',
      roles: ['admin', 'accountant']
    },
    { 
      id: 'InventoryDashboard', 
      name: 'InventoryDashboard', 
      icon: <Package size={18} />, 
      color: 'bg-amber-100 text-amber-800',
      hover: 'hover:bg-amber-50',
      roles: ['admin', 'InventoryDashbaord']
    },
    { 
      id: 'reports', 
      name: 'Reports', 
      icon: <PieChart size={18} />, 
      color: 'bg-cyan-100 text-cyan-800',
      hover: 'hover:bg-cyan-50',
      roles: ['admin', 'manager']
    },
        { 
      id: 'UserPage', 
      name: 'UserPage', 
      icon: <PieChart size={18} />, 
      color: 'bg-cyan-100 text-cyan-800',
      hover: 'hover:bg-cyan-50',
      roles: ['admin', 'manager']
    },
    { 
      id: 'quotationMaster', 
      name: 'Quotation Master', 
      icon: <Settings size={18} />, 
      color: 'bg-gray-100 text-gray-800',
      hover: 'hover:bg-gray-50',
      roles: ['admin']
    },
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: <Settings size={18} />, 
      color: 'bg-gray-100 text-gray-800',
      hover: 'hover:bg-gray-50',
      roles: ['admin']
    }
  ];

  const filteredDashboards = dashboards.filter(dashboard => 
    dashboard.roles.includes(user?.role || 'employee')
  );

  useEffect(() => {
    const path = location.pathname.split('/')[1];
    if (path && path !== 'dashboard') {
      setActiveDashboard(path);
    } else {
      setActiveDashboard('main');
    }
  }, [location.pathname]);

  const renderDashboard = () => {
    switch (activeDashboard) {
      case 'attendance':
        return <AttendanceDashboard />;
      case 'InventoryDashboard':
        return <InventoryDashboard />;
        case 'UserPage':
        return <Userpage />;
      default:
        return <MainDashboard />;
    }
  };

  const MainDashboard = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Welcome back, {user?.name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDashboards.map((dashboard) => (
          <motion.div
            key={dashboard.id}
            whileHover={{ y: -5 }}
            onClick={() => {
              setActiveDashboard(dashboard.id);
              navigate(`/${dashboard.id}`);
            }}
            className={`${dashboard.color} ${dashboard.hover} p-6 rounded-xl shadow-xs border border-gray-100 cursor-pointer transition-all duration-200 flex items-center`}
          >
            <div className="p-3 rounded-lg bg-white shadow-xs mr-4">
              {dashboard.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{dashboard.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                View and manage {dashboard.name.toLowerCase()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.div
        initial={{ width: sidebarOpen ? 240 : 80 }}
        animate={{ width: sidebarOpen ? 240 : 80 }}
        className={`hidden md:flex h-full bg-gradient-to-b from-indigo-800 to-indigo-900 text-white fixed z-30 shadow-xl`}
      >
        <div className="flex flex-col w-full">
          {/* Logo/Header */}
          <div className="p-4 flex items-center justify-between border-b border-indigo-700 h-16">
            {sidebarOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center"
              >
                <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center mr-2">
                  <span className="text-indigo-800 font-bold">EAC</span>
                </div>
                <h1 className="text-lg font-bold">Employee Portal</h1>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-8 h-8 rounded-md bg-white flex items-center justify-center mx-auto"
              >
                <span className="text-indigo-800 font-bold">E</span>
              </motion.div>
            )}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md hover:bg-indigo-700 transition-colors"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <Link 
              to="/dashboard"
              className={`flex items-center p-3 mx-2 my-1 rounded-lg transition-colors ${activeDashboard === 'main' ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}
            >
              <Home size={20} />
              {sidebarOpen && <span className="ml-3">Dashboards</span>}
            </Link>

            {filteredDashboards.map((dashboard) => (
              <Link
                key={dashboard.id}
                to={`/${dashboard.id}`}
                className={`flex items-center p-3 mx-2 my-1 rounded-lg transition-colors ${activeDashboard === dashboard.id ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}
              >
                {dashboard.icon}
                {sidebarOpen && <span className="ml-3">{dashboard.name}</span>}
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-indigo-700">
            <div className={`flex items-center p-3 rounded-lg ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
              {sidebarOpen ? (
                <>
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-indigo-200 capitalize">{user?.role || 'employee'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-1 rounded-md hover:bg-indigo-700 text-indigo-200"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-indigo-800 to-indigo-900 text-white z-50 shadow-2xl md:hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-indigo-700 h-16">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center mr-2">
                    <span className="text-indigo-800 font-bold">EAC</span>
                  </div>
                  <h1 className="text-lg font-bold">Employee Portal</h1>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md hover:bg-indigo-700"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="py-4 overflow-y-auto h-[calc(100%-8rem)]">
                <Link 
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center p-3 mx-2 my-1 rounded-lg transition-colors ${activeDashboard === 'main' ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}
                >
                  <Home size={20} />
                  <span className="ml-3">Dashboard</span>
                </Link>

                {filteredDashboards.map((dashboard) => (
                  <Link
                    key={dashboard.id}
                    to={`/${dashboard.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center p-3 mx-2 my-1 rounded-lg transition-colors ${activeDashboard === dashboard.id ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}
                  >
                    {dashboard.icon}
                    <span className="ml-3">{dashboard.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-indigo-700">
                <div className="flex items-center justify-between p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-indigo-200 capitalize">{user?.role || 'employee'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-1 rounded-md hover:bg-indigo-700 text-indigo-200"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        <Menu size={24} className="text-gray-700" />
      </button>

      <div 
        className="flex-1 transition-all duration-300 overflow-auto"
        style={{ marginLeft: sidebarOpen ? '240px' : '80px' }}
      >
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 p-1 rounded-md hover:bg-gray-100 hidden md:block"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                {dashboards.find(d => d.id === activeDashboard)?.name || 'Company Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-green-500 absolute -top-1 -right-1"></div>
                <span className="text-gray-600">Online</span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="p-2 rounded-full hover:bg-gray-100 relative"
                >
                  <Bell size={20} className="text-gray-600" />
                  <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                </button>
              </div>

              <div className="relative">
                <div 
                  className="flex items-center space-x-2 cursor-pointer group"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white">
                    <span className="font-medium">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-500 group-hover:text-gray-700 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} 
                  />
                </div>

                {/* User Dropdown */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                      >
                        <Settings size={16} className="mr-2" />
                        Settings
                      </button>
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center"
                      >
                        <LogOut size={16} className="mr-2" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeDashboard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-[calc(100vh-4rem)] bg-gray-50"
          >
            {renderDashboard()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CentralizedDashboard;