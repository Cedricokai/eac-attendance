import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();

  const menuItems = [
    {
      name: 'Admin Dashboard',
      path: '/admindashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      gradient: 'from-purple-500 to-blue-500'
    },
    {
      name: 'User Management',
      path: '/usersmanagement',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      gradient: 'from-green-500 to-teal-500'
    },
    {
      name: 'Vehicle Management',
      path: '/vehicles',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      gradient: 'from-orange-500 to-red-500'
    },
    {
      name: 'Drivers',
      path: '/drivers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      name: 'Fuel Management',
      path: '/fuel',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      name: 'Maintenance',
      path: '/maintenance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-gray-600 to-gray-700'
    },
    {
      name: 'Reports & Analytics',
      path: '/transportReports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: 'from-purple-600 to-pink-600'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-6 left-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-sm shadow-lg text-white hover:from-gray-700 hover:to-gray-800 transition-all duration-300 hover:shadow-xl"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 transition-all duration-500 ease-in-out
          w-80
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Beautiful Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Logo Section */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <span className="text-white font-bold list-image-img">log</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900 shadow-lg"></div>
              </div>
              <div className={`transition-all duration-300 ${isHovered ? 'opacity-100' : 'lg:opacity-100 opacity-100'}`}>
                <p className="text-xs text-gray-300 font-medium">Management System</p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-8">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                    className={`
                      group relative flex items-center px-4 py-4 text-sm font-semibold rounded-2xl transition-all duration-300
                      ${active 
                        ? 'text-white shadow-2xl transform scale-105' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10 hover:shadow-lg'
                      }
                      ${isHovered ? 'justify-start' : 'lg:justify-center justify-start'}
                    `}
                  >
                    {/* Active background gradient */}
                    {active && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-2xl shadow-2xl`} />
                    )}
                    
                    {/* Hover effect */}
                    {!active && (
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-2xl transition-all duration-300" />
                    )}
                    
                    {/* Icon */}
                    <div className={`relative z-10 transition-all duration-300 ${isHovered ? 'mr-4' : 'lg:mr-0 mr-4'}`}>
                      <div className={`
                        p-2 rounded-xl transition-all duration-300
                        ${active 
                          ? 'bg-white/20 text-white shadow-lg' 
                          : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white group-hover:shadow-md'
                        }
                      `}>
                        {item.icon}
                      </div>
                    </div>
                    
                    {/* Text */}
                    <span className={`relative z-10 transition-all duration-300 ${
                      isHovered ? 'opacity-100 translate-x-0' : 'lg:opacity-0 lg:translate-x-4 opacity-100 translate-x-0'
                    } ${active ? 'text-white' : 'text-gray-300'}`}>
                      {item.name}
                    </span>
                    
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
                      </div>
                    )}
                    
                    {/* Glow effect for active items */}
                    {active && (
                      <div className="absolute inset-0 bg-white/10 rounded-2xl blur-sm" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Profile Section */}
          

          {/* System Status */}
         
        </div>
      </div>
    </>
  );
};

export default Sidebar;