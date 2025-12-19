import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const TransportReports = () => {
  const [fuelEntries, setFuelEntries] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState('combined');
  const [expandedSections, setExpandedSections] = useState({
    systemOverview: true,
    vehicleReport: true,
    fuelSummary: true,
    maintenanceSummary: true,
    driverActivity: true,
    financialSummary: true
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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
  
  useEffect(() => {
    loadReportData();
  }, [selectedMonth]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [fuelResponse, maintenanceResponse, vehiclesResponse, driversResponse, usersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/fuel`),
        fetch(`${API_BASE_URL}/maintenance`),
        fetch(`${API_BASE_URL}/vehicles`),
        fetch(`${API_BASE_URL}/drivers`),
        fetch(`${API_BASE_URL}/users`)
      ]);

      const data = await Promise.all([
        fuelResponse.ok ? fuelResponse.json() : [],
        maintenanceResponse.ok ? maintenanceResponse.json() : [],
        vehiclesResponse.ok ? vehiclesResponse.json() : [],
        driversResponse.ok ? driversResponse.json() : [],
        usersResponse.ok ? usersResponse.json() : []
      ]);

      setFuelEntries(data[0]);
      setMaintenanceRecords(data[1]);
      setVehicles(data[2]);
      setDrivers(data[3]);
      setUsers(data[4]);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterByMonth = (data, dateField = 'date') => {
    return data.filter(item => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      const itemMonth = itemDate.toISOString().slice(0, 7);
      return itemMonth === selectedMonth;
    });
  };

  const monthlyFuelEntries = filterByMonth(fuelEntries);
  const monthlyMaintenanceRecords = filterByMonth(maintenanceRecords);

  // Enhanced statistics with additional metrics
  const systemStats = {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === 'active').length,
    totalDrivers: drivers.length,
    activeDrivers: drivers.filter(d => d.status === 'active').length,
    totalUsers: users.length,
    vehiclesInMaintenance: vehicles.filter(v => v.status === 'maintenance').length
  };

  const fuelStats = {
    totalCost: monthlyFuelEntries.reduce((sum, entry) => sum + parseFloat(entry.cost || 0), 0),
    totalLitres: monthlyFuelEntries.reduce((sum, entry) => sum + parseFloat(entry.litres || 0), 0),
    totalEntries: monthlyFuelEntries.length,
    avgCostPerLitre: monthlyFuelEntries.length > 0 ? 
      monthlyFuelEntries.reduce((sum, entry) => sum + parseFloat(entry.cost || 0), 0) / 
      monthlyFuelEntries.reduce((sum, entry) => sum + parseFloat(entry.litres || 0), 1) : 0
  };

  const maintenanceStats = {
    totalCost: monthlyMaintenanceRecords.reduce((sum, record) => sum + parseFloat(record.cost || 0), 0),
    totalRecords: monthlyMaintenanceRecords.length,
    completed: monthlyMaintenanceRecords.filter(r => r.status === 'Completed').length,
    scheduled: monthlyMaintenanceRecords.filter(r => r.status === 'Scheduled').length,
    inProgress: monthlyMaintenanceRecords.filter(r => r.status === 'In Progress').length,
    overdue: monthlyMaintenanceRecords.filter(r => r.status === 'Overdue').length
  };

  // Grouping functions
  const fuelByVehicle = monthlyFuelEntries.reduce((acc, entry) => {
    if (!acc[entry.vehicle]) {
      acc[entry.vehicle] = {
        totalCost: 0,
        totalLitres: 0,
        entries: 0
      };
    }
    acc[entry.vehicle].totalCost += parseFloat(entry.cost || 0);
    acc[entry.vehicle].totalLitres += parseFloat(entry.litres || 0);
    acc[entry.vehicle].entries += 1;
    return acc;
  }, {});

  const maintenanceByVehicle = monthlyMaintenanceRecords.reduce((acc, record) => {
    if (!acc[record.vehicles]) {
      acc[record.vehicles] = {
        totalCost: 0,
        records: 0,
        types: {}
      };
    }
    acc[record.vehicles].totalCost += parseFloat(record.cost || 0);
    acc[record.vehicles].records += 1;
    
    if (!acc[record.vehicles].types[record.maintenanceType]) {
      acc[record.vehicles].types[record.maintenanceType] = 0;
    }
    acc[record.vehicles].types[record.maintenanceType] += parseFloat(record.cost || 0);
    
    return acc;
  }, {});

  // Driver activity summary
  const driverActivity = monthlyFuelEntries.reduce((acc, entry) => {
    if (!acc[entry.driver]) {
      acc[entry.driver] = {
        trips: 0,
        totalFuel: 0,
        vehicles: new Set()
      };
    }
    acc[entry.driver].trips += 1;
    acc[entry.driver].totalFuel += parseFloat(entry.litres || 0);
    acc[entry.driver].vehicles.add(entry.vehicle);
    return acc;
  }, {});

  // Financial Summary
  const financialSummary = {
    totalExpenses: fuelStats.totalCost + maintenanceStats.totalCost,
    fuelPercentage: ((fuelStats.totalCost / (fuelStats.totalCost + maintenanceStats.totalCost)) * 100) || 0,
    maintenancePercentage: ((maintenanceStats.totalCost / (fuelStats.totalCost + maintenanceStats.totalCost)) * 100) || 0
  };

  // Utility functions
  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMonthName = (monthString) => {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <div className={`bg-gradient-to-br ${color} p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium opacity-90">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {subtitle && <div className="text-xs opacity-75 mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ percentage, color, label }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-700">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );

  const ReportCard = ({ title, icon, children, sectionKey, badge }) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6 overflow-hidden hover:shadow-xl transition-all duration-300">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-6 py-5 text-left hover:bg-gray-50 transition-all duration-300 flex items-center justify-between group"
        >
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <span className="text-xl text-white">{icon}</span>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{badge}</span>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                {isExpanded ? 'Expanded' : 'Collapsed'}
              </p>
            </div>
          </div>
          <svg
            className={`w-6 h-6 text-gray-400 transform transition-all duration-300 ${
              isExpanded ? 'rotate-180 text-blue-500' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div className={`transition-all duration-500 ease-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-6 pb-6 pt-2">
            {children}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Sidebar />
        <div className="flex-1 p-6 flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-100 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-2xl">📊</div>
              </div>
            </div>
            <p className="mt-6 text-gray-600 font-medium animate-pulse">Preparing your analytics dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 mb-8 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Transport Analytics Dashboard</h1>
                    <p className="text-blue-100 text-lg">Comprehensive insights for {getMonthName(selectedMonth)}</p>
                  </div>
                  <div className="mt-6 lg:mt-0">
                    <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
                      <span className="text-white mr-3">📅</span>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-white placeholder-blue-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                  title="Total Vehicles" 
                  value={systemStats.totalVehicles}
                  subtitle={`${systemStats.activeVehicles} active`}
                  icon="🚗"
                  color="from-blue-500 to-blue-600"
                />
                <StatCard 
                  title="Active Drivers" 
                  value={systemStats.activeDrivers}
                  subtitle={`${systemStats.totalDrivers} total`}
                  icon="👨‍✈️"
                  color="from-emerald-500 to-emerald-600"
                />
                <StatCard 
                  title="Fuel Consumption" 
                  value={formatCurrency(fuelStats.totalCost)}
                  subtitle={`${fuelStats.totalLitres.toFixed(0)} litres`}
                  icon="⛽"
                  color="from-amber-500 to-amber-600"
                />
                <StatCard 
                  title="Maintenance" 
                  value={formatCurrency(maintenanceStats.totalCost)}
                  subtitle={`${maintenanceStats.totalRecords} records`}
                  icon="🔧"
                  color="from-purple-500 to-purple-600"
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
              {/* System Overview */}
              <ReportCard 
                title="System Overview" 
                icon="🏢"
                sectionKey="systemOverview"
                badge=""
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                        <span className="font-medium text-gray-700">Vehicle Utilization</span>
                        <span className="text-2xl font-bold text-blue-600">
                          {((systemStats.activeVehicles / systemStats.totalVehicles) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl">
                        <span className="font-medium text-gray-700">Driver Engagement</span>
                        <span className="text-2xl font-bold text-emerald-600">
                          {((systemStats.activeDrivers / systemStats.totalDrivers) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h4>
                    <div className="space-y-3">
                      <ProgressBar 
                        percentage={(systemStats.activeVehicles / systemStats.totalVehicles) * 100}
                        color="bg-gradient-to-r from-green-400 to-green-500"
                        label="Active Vehicles"
                      />
                      <ProgressBar 
                        percentage={(systemStats.vehiclesInMaintenance / systemStats.totalVehicles) * 100}
                        color="bg-gradient-to-r from-yellow-400 to-yellow-500"
                        label="In Maintenance"
                      />
                    </div>
                  </div>
                </div>
              </ReportCard>

              {/* Vehicle Fleet Report */}
              <ReportCard 
                title="Vehicle Fleet Report" 
                icon="🚗"
                sectionKey="vehicleReport"
                badge={vehicles.length}
              >
                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <div className="grid grid-cols-5 gap-4 p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <div className="font-semibold text-gray-700">Vehicle Details</div>
                    <div className="font-semibold text-gray-700">Registration</div>
                    <div className="font-semibold text-gray-700">Driver</div>
                    <div className="font-semibold text-gray-700">Status</div>
                    <div className="font-semibold text-gray-700">Last Service</div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="grid grid-cols-5 gap-4 p-6 hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="font-medium text-gray-900">{vehicle.name || `Vehicle ${vehicle.id}`}</div>
                          <div className="text-sm text-gray-500">{vehicle.type}</div>
                        </div>
                        <div>
                          <span className="font-mono font-bold text-gray-800 px-3 py-1 bg-gray-100 rounded-lg">
                            {vehicle.licensePlate}
                          </span>
                        </div>
                        <div className="text-gray-700">{vehicle.assignedDriver || '—'}</div>
                        <div>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                            vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                            vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              vehicle.status === 'active' ? 'bg-green-500' :
                              vehicle.status === 'maintenance' ? 'bg-yellow-500' : 'bg-gray-500'
                            }`}></span>
                            {vehicle.status}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          {vehicle.lastMaintenanceDate ? formatDate(vehicle.lastMaintenanceDate) : 'No record'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ReportCard>

              {/* Fuel Consumption */}
              {(reportType === 'combined' || reportType === 'fuel') && (
                <ReportCard 
                  title="Fuel Consumption Analysis" 
                  icon="⛽"
                  sectionKey="fuelSummary"
                  badge={fuelStats.totalEntries}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <h4 className="text-lg font-semibold text-gray-800 mb-6">Monthly Fuel Statistics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
                          <div className="text-sm text-blue-600 font-semibold mb-2">Total Cost</div>
                          <div className="text-2xl font-bold text-blue-800">{formatCurrency(fuelStats.totalCost)}</div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200">
                          <div className="text-sm text-emerald-600 font-semibold mb-2">Total Volume</div>
                          <div className="text-2xl font-bold text-emerald-800">{fuelStats.totalLitres.toFixed(1)} L</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl border border-purple-200">
                          <div className="text-sm text-purple-600 font-semibold mb-2">Total Entries</div>
                          <div className="text-2xl font-bold text-purple-800">{fuelStats.totalEntries}</div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-2xl border border-amber-200">
                          <div className="text-sm text-amber-600 font-semibold mb-2">Avg Cost/L</div>
                          <div className="text-2xl font-bold text-amber-800">{formatCurrency(fuelStats.avgCostPerLitre)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Vehicles by Fuel</h4>
                      <div className="space-y-4">
                        {Object.entries(fuelByVehicle)
                          .slice(0, 4)
                          .sort(([,a], [,b]) => b.totalCost - a.totalCost)
                          .map(([vehicle, data], index) => (
                            <div key={vehicle} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800">{vehicle}</div>
                                  <div className="text-sm text-gray-500">{data.entries} entries</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-800">{formatCurrency(data.totalCost)}</div>
                                <div className="text-sm text-gray-500">{data.totalLitres.toFixed(1)} L</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </ReportCard>
              )}

              {/* Maintenance Overview */}
              <ReportCard 
                title="Maintenance Overview" 
                icon="🔧"
                sectionKey="maintenanceSummary"
                badge={maintenanceStats.totalRecords}
              >
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                      <div className="text-3xl font-bold text-green-600">{maintenanceStats.completed}</div>
                      <div className="text-sm text-green-700 font-medium mt-2">Completed</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                      <div className="text-3xl font-bold text-blue-600">{maintenanceStats.scheduled}</div>
                      <div className="text-sm text-blue-700 font-medium mt-2">Scheduled</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl">
                      <div className="text-3xl font-bold text-yellow-600">{maintenanceStats.inProgress}</div>
                      <div className="text-sm text-yellow-700 font-medium mt-2">In Progress</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl">
                      <div className="text-3xl font-bold text-red-600">{maintenanceStats.overdue}</div>
                      <div className="text-sm text-red-700 font-medium mt-2">Overdue</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Maintenance Activities</h4>
                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      {monthlyMaintenanceRecords.slice(0, 5).map((record, index) => (
                        <div key={index} className={`p-4 flex items-center justify-between ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-blue-50 transition-colors`}>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-4 ${
                              record.status === 'Completed' ? 'bg-green-500' :
                              record.status === 'Scheduled' ? 'bg-blue-500' :
                              record.status === 'In Progress' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <div className="font-medium text-gray-800">{record.vehicles || 'Unknown Vehicle'}</div>
                              <div className="text-sm text-gray-500">{record.maintenanceType}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-800">{formatCurrency(record.cost)}</div>
                            <div className="text-sm text-gray-500">{formatDate(record.date)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ReportCard>

              {/* Driver Activity */}
              <ReportCard 
                title="Driver Performance" 
                icon="👨‍✈️"
                sectionKey="driverActivity"
                badge={Object.keys(driverActivity).length}
              >
                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Driver</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Trips</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fuel Used</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Efficiency</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {Object.entries(driverActivity).map(([driver, data], index) => (
                        <tr key={driver} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">{driver.charAt(0)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{driver}</div>
                                <div className="text-sm text-gray-500">{Array.from(data.vehicles).join(', ')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-gray-800">{data.trips}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-gray-800">{data.totalFuel.toFixed(1)} L</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-emerald-600">
                              {(data.totalFuel / data.trips || 0).toFixed(1)} L/trip
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={`text-xl ${
                                  i < Math.min(5, Math.floor(data.trips / 2))
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}>★</span>
                              ))}
                              <span className="ml-2 text-sm text-gray-600">
                                {data.trips > 10 ? 'Excellent' : data.trips > 5 ? 'Good' : 'Average'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportCard>

              {/* Financial Summary */}
              <ReportCard 
                title="Financial Summary" 
                icon="💰"
                sectionKey="financialSummary"
                badge="Analysis"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl">
                    <h4 className="text-lg font-semibold text-gray-800 mb-6">Expense Breakdown</h4>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium text-gray-700">Fuel Costs</span>
                          <span className="font-bold text-gray-800">{formatCurrency(fuelStats.totalCost)}</span>
                        </div>
                        <ProgressBar 
                          percentage={financialSummary.fuelPercentage} 
                          color="bg-gradient-to-r from-blue-500 to-blue-600"
                          label={`${financialSummary.fuelPercentage.toFixed(1)}% of total`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium text-gray-700">Maintenance Costs</span>
                          <span className="font-bold text-gray-800">{formatCurrency(maintenanceStats.totalCost)}</span>
                        </div>
                        <ProgressBar 
                          percentage={financialSummary.maintenancePercentage} 
                          color="bg-gradient-to-r from-purple-500 to-purple-600"
                          label={`${financialSummary.maintenancePercentage.toFixed(1)}% of total`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl flex flex-col justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-blue-800 mb-4">
                        {formatCurrency(financialSummary.totalExpenses)}
                      </div>
                      <p className="text-lg text-blue-700 font-medium">Total Monthly Expenses</p>
                      <p className="text-sm text-blue-600 mt-2">Combined operational costs for {getMonthName(selectedMonth)}</p>
                    </div>
                  </div>
                </div>
              </ReportCard>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-4 text-gray-500">
                <span className="text-sm">Generated on {new Date().toLocaleString()}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span className="text-sm">EAC Transport Management System</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span className="text-sm font-medium text-blue-600">v2.1.4</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-7xl,
          .max-w-7xl * {
            visibility: visible;
          }
          .max-w-7xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .bg-gradient-to-br {
            background: none !important;
          }
          .shadow-lg, .shadow-xl {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
          @page {
            margin: 0.5in;
            size: A4 landscape;
          }
        }
      `}</style>
    </div>
  );
};

export default TransportReports;