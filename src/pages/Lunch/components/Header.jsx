import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const Header = ({ toggleSidebar, user, onLogout }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user || null);

  useEffect(() => {
    if (!user) {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    } else {
      setCurrentUser(user);
    }
  }, [user]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      window.location.href = '/';
    }
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 border-b border-gray-200 sticky top-0 z-20">
      <div className="flex items-center">
        {/* Sidebar Toggle Button */}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 mr-2"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          </button>
        )}

        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 ml-2 focus-within:ring-2 focus-within:ring-indigo-500">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none focus:outline-none text-sm ml-2 w-40 lg:w-64"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
          >
            <BellIcon className="h-6 w-6 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">Notifications</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                  <p className="text-sm text-gray-800">New lunch assignment created</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                  <p className="text-sm text-gray-800">Attendance sync completed</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50">
                  <p className="text-sm text-gray-800">Budget alert: 80% used</p>
                  <p className="text-xs text-gray-500">3 hours ago</p>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-gray-100 text-center">
                <Link to="/notifications" className="text-sm text-indigo-600 hover:text-indigo-800">
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white">
              <span className="font-medium text-sm">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 group-hover:text-gray-900">
              {currentUser?.name || 'User'}
            </span>
            <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentUser?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser?.email || ''}
                </p>
                <p className="text-xs text-indigo-600 capitalize mt-1">
                  {currentUser?.role || 'Employee'}
                </p>
              </div>

              <Link
                to="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <UserCircleIcon className="h-5 w-5 mr-3 text-gray-400" />
                Profile
              </Link>
              <Link
                to="/settingspage"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-400" />
                Settings
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-red-400" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;