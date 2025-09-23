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
  ChartBarIcon
} from '@heroicons/react/24/outline';

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome');

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
    { icon: <CubeIcon className="h-5 w-5" />, title: "Products", path: "/products"},
    { icon: <ServerIcon className="h-5 w-5" />, title: "Assets", path: "/assets" },
    { icon: <TruckIcon className="h-5 w-5" />, title: "Outgoing", path: "/outgoing" },
    { icon: <MagnifyingGlassIcon className="h-5 w-5" />, title: "Search", path: "/search" },
    { icon: <InboxIcon className="h-5 w-5" />, title: "Received", path: "/received" },
    { icon: <ChartBarIcon className="h-5 w-5" />, title: "Reports", path: "/reports" }
  ];

  const handleSidebarToggle = (open) => {
    setIsSidebarOpen(open);
  };

  return (
    <div className={`flex h-screen bg-gray-50 transition-all duration-300 ${isSidebarOpen ? 'opacity-70' : 'opacity-100'}`}>
      <SidebarWithBurgerMenu onToggle={handleSidebarToggle}/>
      
      <main className="flex-1 overflow-auto p-6">
        {/* Header with animated welcome */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center items-center mb-8"
        >
          <div className="flex-col justify-center items-center text-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Typography variant="h4" className="font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Inventory Management
              </Typography>
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
                <Typography className="text-gray-600 text-lg">
                  {welcomeMessage}
                </Typography>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Quick Actions with staggered animation */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        >
          {features.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="p-4 hover:shadow-md transition-all cursor-pointer h-full"
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-2 rounded-lg bg-blue-400 text-white"
                    whileHover={{ rotate: 10 }}
                  >
                    {item.icon}
                  </motion.div>
                  <Typography variant="h6" className="font-medium">
                    {item.title}
                  </Typography>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Overview with animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 mb-8">
            <Typography variant="h5" className="font-medium mb-4">
              Inventory Overview
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Products" value="1,248" trend="up" />
              <StatCard title="Low Stock Items" value="24" trend="down" />
              <StatCard title="Recent Transactions" value="56" trend="up" />
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity with animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6">
            <Typography variant="h5" className="font-medium mb-4">
              Recent Activity
            </Typography>
            <div className="space-y-4">
              <ActivityItem action="Updated" item="Product #A2034" time="2 mins ago" />
              <ActivityItem action="Received" item="Shipment #B5561" time="1 hour ago" />
              <ActivityItem action="Processed" item="Order #C7892" time="3 hours ago" />
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

// Enhanced Stat Card Component with animation
const StatCard = ({ title, value, trend }) => (
  <motion.div 
    className="border rounded-lg p-4 hover:shadow-md transition-all"
    whileHover={{ y: -5 }}
  >
    <Typography className="text-gray-600 text-sm">{title}</Typography>
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h3" className="my-2 font-bold">
        {value}
      </Typography>
    </motion.div>
    <Typography 
      className={`text-xs font-medium ${
        trend === 'up' ? 'text-green-500' : 'text-red-500'
      }`}
    >
      {trend === 'up' ? '↑ 5.2%' : '↓ 2.1%'} from last week
    </Typography>
  </motion.div>
);

// Enhanced Activity Item Component with animation
const ActivityItem = ({ action, item, time }) => (
  <motion.div 
    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    <motion.div 
      className="h-2 w-2 rounded-full bg-blue-500"
      animate={{ scale: [1, 1.5, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <Typography className="flex-1">
      <span className="font-medium">{action}</span> {item}
    </Typography>
    <Typography className="text-gray-500 text-sm">{time}</Typography>
  </motion.div>
);

export default InventoryDashboard;