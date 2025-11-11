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
  X
} from 'lucide-react';

const CentralizedDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDashboard, setActiveDashboard] = useState('main');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("userData");
    const userRole = localStorage.getItem("userRole");
    
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      // Demo user data
      setUser({
        name: "Demo User",
        role: userRole ? userRole.replace("ROLE_", "").toLowerCase() : 'admin',
        email: "demo@example.com",
        id: "1"
      });
    }
  }, []);

  const handleLogout = () => {
    // Clear local storage
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    
    // Redirect to login
    navigate("/");
  };

  const dashboards = [
    { 
      id: 'attendanceDashboard', 
      name: 'Attendance', 
      icon: <Users size={18} />, 
      color: 'bg-blue-100 text-blue-800',
      hover: 'hover:bg-blue-50',
      roles: ['admin', 'hr', 'supervisor']
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
      roles: ['admin', 'hr', 'accountant']
    },
    { 
      id: 'InventoryDashboard', 
      name: 'Inventory', 
      icon: <Package size={18} />, 
      color: 'bg-amber-100 text-amber-800',
      hover: 'hover:bg-amber-50',
      roles: ['admin', 'inventory']
    },
    { 
      id: 'reports', 
      name: 'Reports', 
      icon: <PieChart size={18} />, 
      color: 'bg-cyan-100 text-cyan-800',
      hover: 'hover:bg-cyan-50',
      roles: ['admin', 'manager', 'hr']
    },
    { 
      id: 'userpage', 
      name: 'User Management', 
      icon: <Users size={18} />, 
      color: 'bg-indigo-100 text-indigo-800',
      hover: 'hover:bg-indigo-50',
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

  // Filter dashboards based on user role
  const filteredDashboards = dashboards.filter(dashboard => {
    if (!user?.role) return false;
    return dashboard.roles.includes(user.role);
  });

  useEffect(() => {
    const path = location.pathname.split('/')[1];
    if (path && path !== 'centralizedDashboard') {
      setActiveDashboard(path);
    } else {
      setActiveDashboard('main');
    }
  }, [location.pathname]);

  const MainDashboard = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome back, {user?.name || 'User'}!
        </h2>
        <p className="text-gray-600">
          Here's an overview of your available modules
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDashboards.length > 0 ? (
          filteredDashboards.map((dashboard) => (
            <motion.div
              key={dashboard.id}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveDashboard(dashboard.id);
                navigate(`/${dashboard.id}`);
              }}
              className={`${dashboard.color} ${dashboard.hover} p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all duration-200 flex items-center group`}
            >
              <div className="p-3 rounded-lg bg-white shadow-xs mr-4 group-hover:scale-110 transition-transform">
                {dashboard.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{dashboard.name}</h3>
                <p className="text-sm text-gray-600">
                  Access {dashboard.name.toLowerCase()} features
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">
              No modules available for your role ({user?.role || 'unknown'})
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Contact administrator for access
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Add click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('.user-dropdown')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

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
                  <span className="text-indigo-800 font-bold text-sm">EAC</span>
                </div>
                <h1 className="text-lg font-bold">Employee Portal</h1>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-8 h-8 rounded-md bg-white flex items-center justify-center mx-auto"
              >
                <span className="text-indigo-800 font-bold text-sm">E</span>
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
              to="/centralizedDashboard"
              className={`flex items-center p-3 mx-2 my-1 rounded-lg transition-colors ${activeDashboard === 'main' ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}
            >
              <Home size={20} />
              {sidebarOpen && <span className="ml-3">Dashboard</span>}
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
                  <div className="flex items-center min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-indigo-200 capitalize truncate">{user?.role || 'employee'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex-shrink-0 ml-2"
                    title="Logout"
                  >
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
                  to="/centralizedDashboard"
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
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-indigo-200 capitalize">{user?.role || 'employee'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        className="flex-1 transition-all duration-300 overflow-auto"
        style={{ marginLeft: sidebarOpen ? '240px' : '80px' }}
      >
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 mr-2 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-md bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">EAC</span>
                </div>
                <span className="text-xl font-semibold text-gray-800">
                  {dashboards.find(d => d.id === activeDashboard)?.name || 'Dashboard'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Dropdown Section */}
              <div className="relative user-dropdown">
                <div 
                  className="flex items-center space-x-2 cursor-pointer group"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white">
                    <span className="font-medium text-sm">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 hidden sm:block">
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-500 group-hover:text-gray-700 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} 
                  />
                </div>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                        <p className="text-xs text-indigo-600 capitalize mt-1">{user?.role || 'employee'}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                      >
                        <Settings size={16} className="mr-2" />
                        Settings
                      </button>
                      
                      <button
                        onClick={() => {
                          handleLogout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-gray-100"
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
            <MainDashboard />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CentralizedDashboard;