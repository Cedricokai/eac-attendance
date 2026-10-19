// src/layouts/LunchLayout.jsx
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LunchSidebar from '../pages/Lunch/components/LunchSidebar';
import Header from '../components/Header';

const LunchLayout = () => {
  const location = useLocation();
  const isEmployeeMealSelection = location.pathname.startsWith('/lunch/meal-selection');
  const [sidebarOpen, setSidebarOpen] = useState(!isEmployeeMealSelection);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="relative min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <LunchSidebar isCollapsed={!sidebarOpen} />
      </div>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header toggleSidebar={toggleSidebar} showSidebarToggle={true} />
        <main className={isEmployeeMealSelection ? 'p-2 sm:p-4' : 'p-4 sm:p-6'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LunchLayout;
