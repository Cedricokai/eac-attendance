// src/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./assets/logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("isUserLoggedIn");
    localStorage.removeItem("loggedInUser");
    
    if (userRole === "admin") {
      navigate("/adminlogin");
    } else {
      navigate("/userlogin");
    }
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", icon: "🏠", label: "Home", roles: ["user", "admin", null] },
    { path: "/vehicles", icon: "🚚", label: "Vehicles", roles: ["user", "admin"] },
    { path: "/drivers", icon: "👨‍✈️", label: "Drivers", roles: ["user", "admin"] },
    { path: "/maintenance", icon: "🛠️", label: "Maintenance", roles: ["user", "admin"] },
    { path: "/fuel", icon: "⛽", label: "Fuel Log", roles: ["user", "admin"] },
    { path: "/admindashboard", icon: "📊", label: "Admin Dashboard", roles: ["admin"] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-700 text-white p-2 rounded-lg shadow-lg"
      >
        {isCollapsed ? "→" : "←"}
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {!isCollapsed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsCollapsed(true)}
            />
            
            {/* Navigation Sidebar */}
            <motion.nav
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-blue-800 to-blue-900 text-white shadow-2xl flex flex-col z-50 lg:static lg:translate-x-0"
            >
              {/* Header Section */}
              <div className="flex flex-col items-center py-8 px-6 border-b border-blue-600/30">
                <div className="relative mb-4">
                  <img
                    src={logo}
                    alt="EAC Electrical Company"
                    className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <h1 className="text-2xl font-bold text-white text-center mb-1">
                  EAC Transport
                </h1>
                <p className="text-blue-200 text-sm text-center">
                  Fleet Management System
                </p>
                
                {/* User Role Display Section - Added Here */}
                {userRole && (
                  <div className="mt-3 text-center p-3 bg-blue-700/30 rounded-xl border border-blue-500/20 w-full">
                    <p className="text-blue-200 text-sm">Logged in as</p>
                    <p className="text-white font-semibold capitalize">{userRole}</p>
                    {userRole === 'user' && (
                      <p className="text-blue-300 text-xs mt-1">View Only Access</p>
                    )}
                    {userRole === 'admin' && (
                      <p className="text-green-300 text-xs mt-1">Full Administrative Access</p>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <div className="flex-1 py-6 px-6 overflow-y-auto">
                <ul className="space-y-2">
                  {filteredNavItems.map((item, index) => (
                    <motion.li
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        to={item.path}
                        onClick={() => window.innerWidth < 1024 && setIsCollapsed(true)}
                        className={`flex items-center space-x-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                          isActiveLink(item.path)
                            ? "bg-white/10 text-yellow-300 shadow-lg border border-white/20"
                            : "text-blue-100 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="text-xl transition-transform duration-200 group-hover:scale-110">
                          {item.icon}
                        </span>
                        <span className="text-lg">{item.label}</span>
                        {isActiveLink(item.path) && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="w-2 h-2 bg-yellow-400 rounded-full ml-auto"
                          />
                        )}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* User Section */}
              <div className="p-6 border-t border-blue-600/30">
                {!userRole ? (
                  <div className="space-y-3">
                    <Link
                      to="/userlogin"
                      onClick={() => window.innerWidth < 1024 && setIsCollapsed(true)}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 px-6 py-3 rounded-xl font-semibold hover:from-yellow-300 hover:to-yellow-400 transition-all duration-200 shadow-lg hover:shadow-yellow-500/25 hover:scale-105"
                    >
                      <span>🔐</span>
                      <span>User Login</span>
                    </Link>
                    <Link
                      to="/adminlogin"
                      onClick={() => window.innerWidth < 1024 && setIsCollapsed(true)}
                      className="flex items-center justify-center space-x-2 bg-white/10 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30"
                    >
                      <span>⚡</span>
                      <span>Admin Login</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Additional user info can go here if needed */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-red-500/25 hover:scale-105"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-blue-600/30">
                <p className="text-blue-300 text-xs text-center">
                  © 2024 EAC Electrical Co.
                  <br />
                  Transport Management
                </p>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;