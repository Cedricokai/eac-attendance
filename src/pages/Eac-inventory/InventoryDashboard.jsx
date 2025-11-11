import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  Typography,
} from '@material-tailwind/react';
import {
  CubeIcon,
  ServerIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome');

   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUsername(decoded.username);
        
        // Animated welcome message
        const greetings = ['Welcome back', 'Hello', 'Greetings', 'Good to see you'];
        let currentIndex = 0;
        
        const interval = setInterval(() => {
          setWelcomeMessage(`${greetings[currentIndex]}, ${decoded.username || 'Guest'}`);
          currentIndex = (currentIndex + 1) % greetings.length;
        }, 3000);
        
        return () => clearInterval(interval);
      } catch (error) {
        console.error("Error decoding token: ", error);
      }
    }
  }, []);

  const features = [
    { 
      icon: <CubeIcon className="h-6 w-6" />, 
      title: "Products", 
      path: "/products",
      description: "Manage product inventory",
      color: "from-blue-500 to-blue-600"
    },
    { 
      icon: <ServerIcon className="h-6 w-6" />, 
      title: "Assets", 
      path: "/assets",
      description: "Track company assets",
      color: "from-green-500 to-green-600"
    },
    { 
      icon: <ServerIcon className="h-6 w-6" />, 
      title: "StoreKeeper Requests", 
      path: "/storeKeeperRequests",
      description: "Manage store requests",
      color: "from-emerald-500 to-emerald-600"
    },
    { 
      icon: <TruckIcon className="h-6 w-6" />, 
      title: "Outgoing", 
      path: "/outgoing",
      description: "Manage shipments",
      color: "from-orange-500 to-orange-600"
    },
    { 
      icon: <MagnifyingGlassIcon className="h-6 w-6" />, 
      title: "Search", 
      path: "/search",
      description: "Find items quickly",
      color: "from-purple-500 to-purple-600"
    },
    { 
      icon: <InboxIcon className="h-6 w-6" />, 
      title: "Received", 
      path: "/received",
      description: "Incoming shipments",
      color: "from-indigo-500 to-indigo-600"
    },
    { 
      icon: <ChartBarIcon className="h-6 w-6" />, 
      title: "Reports", 
      path: "/reports",
      description: "Analytics & insights",
      color: "from-pink-500 to-pink-600"
    },
    { 
      icon: <ShieldCheckIcon className="h-6 w-6" />, 
      title: "PPE", 
      path: "/ppe",
      description: "Manage Personal Protective Equipment",
      color: "from-amber-500 to-amber-600"
    }
  ];

  const handleSidebarToggle = (open) => {
    setIsSidebarOpen(open);
  };

  return (
    <div className={`flex h-screen bg-gradient-to-br from-gray-50 to-blue-50 transition-all duration-300 ${isSidebarOpen ? 'opacity-70' : 'opacity-100'}`}>
   
      <main className="flex-1 overflow-auto p-6">
        {/* Header with animated welcome */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center items-center mb-12"
        >
          <div className="flex-col justify-center items-center text-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Typography variant="h3" className="font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Inventory Management System
              </Typography>
                <div className="fixed top-0 left-0 right-0 z-50">
                  <SidebarWithBurgerMenu onToggle={handleSidebarToggle} />
                </div>
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div
                key={welcomeMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-2"
              >
                <Typography className="text-gray-600 text-xl font-light">
                  {welcomeMessage}
                </Typography>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Stats Overview with enhanced animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
            <Typography variant="h4" className="font-bold text-gray-800 mb-8 text-center">
              Inventory Overview
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <EnhancedStatCard 
                title="Total Products" 
                value="1,248" 
                trend="up" 
                icon={<CubeIcon className="h-8 w-8" />}
                color="blue"
              />
              <EnhancedStatCard 
                title="Low Stock Items" 
                value="24" 
                trend="down" 
                icon={<ExclamationTriangleIcon className="h-8 w-8" />}
                color="red"
              />
              <EnhancedStatCard 
                title="Recent Transactions" 
                value="56" 
                trend="up" 
                icon={<ShoppingCartIcon className="h-8 w-8" />}
                color="green"
              />
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions with enhanced staggered animation */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
            <Typography variant="h4" className="font-bold text-gray-800 mb-8 text-center">
              Quick Actions
            </Typography>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ 
                    scale: 1.05,
                    rotateY: 5
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card 
                    className={`p-6 cursor-pointer h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${item.color} text-white group`}
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <motion.div 
                        className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                      >
                        {item.icon}
                      </motion.div>
                      <div>
                        <Typography variant="h5" className="font-bold mb-2">
                          {item.title}
                        </Typography>
                        <Typography className="text-white/80 text-sm font-light">
                          {item.description}
                        </Typography>
                      </div>
                      <motion.div
                        className="w-8 h-1 bg-white/50 rounded-full mt-2"
                        whileHover={{ width: 40 }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Additional Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12"
        >
          <Card className="p-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-xl rounded-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-center md:text-left mb-6 md:mb-0">
                <Typography variant="h4" className="font-bold mb-2">
                  Need Help?
                </Typography>
                <Typography className="text-indigo-100">
                  Our support team is here to assist you with any inventory management needs.
                </Typography>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-white text-indigo-600 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Contact Support
              </motion.button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

// Enhanced Stat Card Component with better styling
const EnhancedStatCard = ({ title, value, trend, icon, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600'
  };

  return (
    <motion.div 
      className={`p-6 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg hover:shadow-2xl transition-all duration-300`}
      whileHover={{ y: -8, scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-3 rounded-xl bg-white/20 backdrop-blur-sm"
        >
          {icon}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`p-1 rounded-full ${trend === 'up' ? 'bg-green-400' : 'bg-red-400'}`}
        >
          <ArrowTrendingUpIcon className={`h-4 w-4 ${trend === 'up' ? '' : 'rotate-180'}`} />
        </motion.div>
      </div>
      
      <Typography className="text-white/80 text-sm font-light mb-2">{title}</Typography>
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Typography variant="h2" className="font-bold mb-2">
          {value}
        </Typography>
      </motion.div>
      <Typography className={`text-xs font-medium ${trend === 'up' ? 'text-green-300' : 'text-red-300'}`}>
        {trend === 'up' ? '↑ 5.2% increase' : '↓ 2.1% decrease'} from last week
      </Typography>
    </motion.div>
  );
};

export default InventoryDashboard;