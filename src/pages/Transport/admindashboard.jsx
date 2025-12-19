import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import axios from 'axios';
import Sidebar from './Sidebar';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);

  const [fuelData, setFuelData] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [vehicleTypeData, setVehicleTypeData] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [expiringInsurances, setExpiringInsurances] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

 const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log("🖥️ Current hostname:", hostname);
  console.log("🔌 Current port:", port);

  // If frontend is opened via localhost → use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  // Public / Tailscale / Cloudflare IP
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }

  // Default fallback
  console.log("🌍 Using PUBLIC API URL (fallback)");
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

  const API_BASE_URL = getApiBaseUrl();
  // Get authentication token
  const getAuthToken = () => {
    return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  };

  // Axios configuration with token
  const getAxiosConfig = () => {
    return {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Mock data
  const mockUsers = [
    { id: 1, name: 'John Doe', email: 'john@eac.com', phone: '+233 24 123 4567', role: 'admin', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@eac.com', phone: '+233 24 234 5678', role: 'manager', status: 'active' },
    { id: 3, name: 'Mike Johnson', email: 'mike@eac.com', phone: '+233 24 345 6789', role: 'user', status: 'active' }
  ];

  const mockVehicles = [
    { id: 1, name: 'Truck A', type: 'Heavy Duty Truck', licensePlate: 'GA-1234-21', fuelType: 'diesel', status: 'active', dvlaLicenseExpiry: '2024-12-31', roadWorthyExpiry: '2024-06-30', insuranceExpiry: '2024-03-15' },
    { id: 2, name: 'Van B', type: 'Delivery Van', licensePlate: 'GA-5678-21', fuelType: 'petrol', status: 'active', dvlaLicenseExpiry: '2024-11-30', roadWorthyExpiry: '2024-05-31', insuranceExpiry: '2024-02-28' },
    { id: 3, name: 'Car C', type: 'Sedan', licensePlate: 'GA-9012-21', fuelType: 'petrol', status: 'maintenance', dvlaLicenseExpiry: '2024-10-31', roadWorthyExpiry: '2024-04-30', insuranceExpiry: '2024-12-31' }
  ];

  const mockDrivers = [
    { id: 1, name: 'Kwame Mensah', licenseNumber: 'DL-123456', licenseExpiry: '2025-03-15', phone: '+233 24 456 7890', email: 'kwame@eac.com', status: 'active' },
    { id: 2, name: 'Ama Boateng', licenseNumber: 'DL-234567', licenseExpiry: '2025-06-20', phone: '+233 24 567 8901', email: 'ama@eac.com', status: 'active' },
    { id: 3, name: 'Kofi Asante', licenseNumber: 'DL-345678', licenseExpiry: '2024-12-10', phone: '+233 24 678 9012', email: 'kofi@eac.com', status: 'on-leave' }
  ];

  const mockFuelEntries = [
    { id: 1, vehicle: 'Truck A', driver: 'Kwame Mensah', date: '2024-01-15', time: '08:30', liters: 120, cost: 1440, odometer: 12500, vendor: 'GOIL Station' },
    { id: 2, vehicle: 'Van B', driver: 'Ama Boateng', date: '2024-01-16', time: '14:15', liters: 60, cost: 720, odometer: 8900, vendor: 'Shell Station' },
    { id: 3, vehicle: 'Truck A', driver: 'Kwame Mensah', date: '2024-01-18', time: '09:45', liters: 110, cost: 1320, odometer: 13100, vendor: 'Total Station' }
  ];

  const mockMaintenanceRecords = [
    { id: 1, vehicle: 'Car C', type: 'Oil Change', date: '2024-01-10', cost: 350, status: 'completed', vendor: 'AutoCare Services', description: 'Regular oil and filter change' },
    { id: 2, vehicle: 'Truck A', type: 'Brake Service', date: '2024-01-20', cost: 1200, status: 'scheduled', vendor: 'Truck Masters', description: 'Brake pad replacement and servicing' },
    { id: 3, vehicle: 'Van B', type: 'Tire Replacement', date: '2024-01-25', cost: 800, status: 'in-progress', vendor: 'Tire Express', description: 'Replace all four tires' }
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    updateStats();
    updateCharts();
    checkExpiringLicenses();
    checkExpiringInsurances();
  }, [users, vehicles, drivers, fuelEntries, maintenanceRecords]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      try {
        await Promise.all([
          fetchUsers(),
          fetchVehicles(),
          fetchDrivers(),
          fetchFuelEntries(),
          fetchMaintenanceRecords()
        ]);
      } catch (error) {
        console.log('API not available, using mock data');
        setUsers(mockUsers);
        setVehicles(mockVehicles);
        setDrivers(mockDrivers);
        setFuelEntries(mockFuelEntries);
        setMaintenanceRecords(mockMaintenanceRecords);
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, getAxiosConfig());
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      throw error;
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vehicles`, getAxiosConfig());
      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      throw error;
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/drivers`, getAxiosConfig());
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      throw error;
    }
  };

  const fetchFuelEntries = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fuel`, getAxiosConfig());
      setFuelEntries(response.data);
    } catch (error) {
      console.error('Error fetching fuel entries:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      throw error;
    }
  };

  const fetchMaintenanceRecords = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fuel`, getAxiosConfig());
      setMaintenanceRecords(response.data);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      throw error;
    }
  };

  const checkExpiringLicenses = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiring = vehicles.filter(vehicle => {
      if (!vehicle.dvlaLicenseExpiry) return false;
      const expiryDate = new Date(vehicle.dvlaLicenseExpiry);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
    });

    setExpiringLicenses(expiring);
  };

  const checkExpiringInsurances = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiring = vehicles.filter(vehicle => {
      if (!vehicle.insuranceExpiry) return false;
      const expiryDate = new Date(vehicle.insuranceExpiry);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
    });

    setExpiringInsurances(expiring);
  };

  const updateStats = () => {
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const totalFuelLiters = fuelEntries.reduce((sum, entry) => sum + (entry.liters || 0), 0);
    
    const newStats = {
      totalVehicles: totalVehicles,
      activeDrivers: drivers.filter(d => d.status === 'active').length,
      totalUsers: users.length,
      totalFuelCost: fuelEntries.reduce((sum, entry) => sum + (entry.cost || 0), 0),
      totalFuelLiters: totalFuelLiters,
      maintenanceCost: totalMaintenanceCost,
      pendingRequests: maintenanceRecords.filter(m => m.status === 'scheduled').length,
      fleetUtilization: totalVehicles > 0 ? `${Math.round((activeVehicles / totalVehicles) * 100)}%` : '0%',
      averageFuelCost: totalFuelLiters > 0 ? (fuelEntries.reduce((sum, entry) => sum + (entry.cost || 0), 0) / totalFuelLiters).toFixed(2) : 0,
      vehiclesInMaintenance: vehicles.filter(v => v.status === 'maintenance').length
    };
    setStats(newStats);
  };

  const updateCharts = () => {
    // Fuel data for chart
    const newFuelData = fuelEntries.map(entry => ({
      ...entry,
      dateTime: `${entry.date} ${entry.time}`,
      costPerLiter: entry.liters > 0 ? ((entry.cost || 0) / entry.liters).toFixed(2) : 0
    }));

    setFuelData(newFuelData);

    // Maintenance data
    const monthlyMaintenance = maintenanceRecords.reduce((acc, record) => {
      const month = new Date(record.date).toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { scheduled: 0, completed: 0, urgent: 0, cost: 0 };
      }
      if (record.status === 'scheduled') acc[month].scheduled++;
      if (record.status === 'completed') acc[month].completed++;
      if (record.status === 'urgent') acc[month].urgent++;
      acc[month].cost += (record.cost || 0);
      return acc;
    }, {});

    const newMaintenanceData = Object.entries(monthlyMaintenance).map(([month, data]) => ({
      month,
      ...data
    }));

    setMaintenanceData(newMaintenanceData);

    // Vehicle type distribution
    const typeDistribution = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.type] = (acc[vehicle.type] || 0) + 1;
      return acc;
    }, {});

    const newVehicleTypeData = Object.entries(typeDistribution).map(([name, value]) => ({
      name,
      value
    }));

    setVehicleTypeData(newVehicleTypeData);
  };

  const formatCedis = (amount) => {
    return `₵${amount?.toLocaleString() || 0}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': case 'in-progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'inactive': case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const StatCard = ({ title, value, subtitle, icon, gradient, trend }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
            {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
          </div>
          <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
            <span className="text-2xl text-white">{icon}</span>
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center">
            <span className={`text-sm font-medium ${trend.color}`}>{trend.value}</span>
            <span className="ml-1 text-xs text-white/60">{trend.label}</span>
          </div>
        )}
      </div>
      {/* Background pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
        <div className="w-24 h-24 bg-white rounded-full"></div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 flex">
        <Sidebar />
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/60">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white">
                  Fleet Management Dashboard
                </h1>
                <p className="text-white/60 mt-2">Complete overview of your fleet operations</p>
              </div>
              <div className="mt-4 lg:mt-0 flex space-x-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
                  <p className="text-sm text-white/80">Welcome back, <span className="font-semibold text-white">Admin</span></p>
                  <p className="text-xs text-white/60">Last updated: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Fleet Overview"
              value={stats.totalVehicles}
              subtitle={`${vehicles.filter(v => v.status === 'active').length} active`}
              icon="🚗"
              gradient="from-blue-500 to-cyan-500"
              trend={{ value: '+2%', label: 'from last month', color: 'text-emerald-300' }}
            />
            
            <StatCard
              title="Financial Summary"
              value={formatCedis(stats.totalFuelCost)}
              subtitle={`${stats.totalFuelLiters}L total fuel`}
              icon="💰"
              gradient="from-emerald-500 to-teal-500"
              trend={{ value: '-5%', label: 'cost reduction', color: 'text-red-300' }}
            />
            
            <StatCard
              title="Personnel"
              value={stats.totalUsers}
              subtitle={`${stats.activeDrivers} active drivers`}
              icon="👥"
              gradient="from-purple-500 to-pink-500"
              trend={{ value: '+3', label: 'new users', color: 'text-emerald-300' }}
            />
            
            <StatCard
              title="Maintenance"
              value={stats.pendingRequests}
              subtitle={`${maintenanceRecords.filter(m => m.status === 'completed').length} completed`}
              icon="🔧"
              gradient="from-orange-500 to-red-500"
              trend={{ value: '2 urgent', label: 'attention needed', color: 'text-amber-300' }}
            />
          </div>

          {/* Charts and Visualizations */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Fuel Consumption Chart */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 xl:col-span-2 transition-all duration-300 hover:bg-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Fuel Consumption & Costs</h2>
                <div className="text-sm text-white/60">
                  Last {fuelEntries.length} entries
                </div>
              </div>
              <div className="h-80">
                {fuelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fuelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="dateTime" stroke="#9CA3AF" />
                      <YAxis yAxisId="left" stroke="#9CA3AF" />
                      <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(17, 24, 39, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          backdropFilter: 'blur(16px)'
                        }}
                        formatter={(value, name) => [
                          name === 'cost' ? `${formatCedis(value)}` : 
                          name === 'costPerLiter' ? `${formatCedis(value)}` : 
                          name === 'liters' ? `${value}L` : value,
                          name === 'cost' ? 'Total Cost' : 
                          name === 'costPerLiter' ? 'Cost/Liter' :
                          name === 'liters' ? 'Fuel' : name
                        ]} 
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="liters" name="Fuel (Liters)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="cost" name="Total Cost" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white/60">
                      <p className="text-lg mb-2">No fuel data available</p>
                      <p className="text-sm">Add fuel entries to see the chart</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Distribution */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:bg-white/10">
              <h2 className="text-xl font-semibold text-white mb-6">Vehicle Distribution</h2>
              <div className="h-80">
                {vehicleTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={vehicleTypeData} 
                        cx="50%" 
                        cy="50%" 
                        labelLine={false} 
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} 
                        outerRadius={80} 
                        fill="#8884d8" 
                        dataKey="value"
                      >
                        {vehicleTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(17, 24, 39, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          backdropFilter: 'blur(16px)'
                        }}
                        formatter={(value) => [`${value} vehicles`, 'Count']} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white/60">
                      <p className="text-lg mb-2">No vehicle data available</p>
                      <p className="text-sm">Add vehicles to see the distribution</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerts and Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Expiring Insurances */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:bg-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Insurance Expiry Alerts</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  expiringInsurances.length > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {expiringInsurances.length} alerts
                </span>
              </div>
              <div className="space-y-3">
                {expiringInsurances.length > 0 ? (
                  expiringInsurances.map((vehicle, index) => {
                    const daysUntilExpiry = getDaysUntilExpiry(vehicle.insuranceExpiry);
                    return (
                      <div key={index} className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/20 backdrop-blur-sm">
                        <div>
                          <p className="font-medium text-white">{vehicle.name}</p>
                          <p className="text-sm text-white/60">{vehicle.licensePlate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-300">
                            {daysUntilExpiry} days
                          </p>
                          <p className="text-xs text-white/40">
                            {new Date(vehicle.insuranceExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <p>No insurance expiry alerts</p>
                    <p className="text-sm">All vehicle insurances are up to date</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Maintenance */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:bg-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Maintenance</h3>
                <span className="text-sm text-white/60">
                  Last {Math.min(maintenanceRecords.length, 5)} records
                </span>
              </div>
              <div className="space-y-3">
                {maintenanceRecords.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                    <div>
                      <p className="font-medium text-white">{record.vehicle}</p>
                      <p className="text-sm text-white/60">{record.type}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                      <p className="text-sm font-semibold text-white mt-1">{formatCedis(record.cost)}</p>
                    </div>
                  </div>
                ))}
                {maintenanceRecords.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🔧</span>
                    </div>
                    <p>No maintenance records</p>
                    <p className="text-sm">Add maintenance records to see them here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:bg-white/10">
            <h3 className="text-lg font-semibold text-white mb-6">Quick Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Fuel Entries', value: fuelEntries.length, color: 'text-blue-400', icon: '⛽' },
                { label: 'Maintenance Records', value: maintenanceRecords.length, color: 'text-emerald-400', icon: '🔧' },
                { label: 'Assigned Vehicles', value: vehicles.filter(v => v.assignedDriver).length, color: 'text-purple-400', icon: '🚙' },
                { label: 'Drivers on Leave', value: drivers.filter(d => d.status === 'on-leave').length, color: 'text-amber-400', icon: '👨‍💼' }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">{stat.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;