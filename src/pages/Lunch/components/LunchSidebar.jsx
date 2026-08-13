// src/pages/Lunch/components/LunchSidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  FireIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

const LunchSidebar = ({ isCollapsed }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  const menuItems = [
    { path: '/lunch/dashboard', label: 'Dashboard', icon: HomeIcon },
    { path: '/lunch/weekly-assignment', label: 'Weekly Assignment', icon: CalendarIcon },
    { path: '/lunch/employee-assignment', label: 'Employee Assignment', icon: UserGroupIcon }, 
    { path: '/lunch/daily-serving', label: 'Daily Serving', icon: ClipboardDocumentCheckIcon },
    { path: '/lunch/attendance-verification', label: 'Attendance Verification', icon: CheckCircleIcon },
    { path: '/lunch/kitchen-report', label: 'Kitchen Report', icon: FireIcon },
    { path: '/lunch/reports', label: 'Reports', icon: ChartBarIcon },
    { path: '/lunch/meals', label: 'Meals', icon: ShoppingBagIcon },
    { path: '/lunch/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className={`h-full bg-gradient-to-b from-indigo-800 to-indigo-900 text-white flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-indigo-700">
        <div className="flex-shrink-0 w-8 h-8 bg-white rounded-md flex items-center justify-center text-indigo-800 font-bold text-lg">
          L
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-lg font-semibold text-white">Lunch Manager</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-3 py-2 rounded-md transition-colors ${
              isActive(item.path)
                ? 'bg-indigo-700 shadow-inner'
                : 'hover:bg-indigo-700/50'
            }`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 truncate">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-indigo-700 text-center text-xs text-indigo-300">
        {!isCollapsed && 'Lunch Management v1.0'}
      </div>
    </div>
  );
};

export default LunchSidebar;
