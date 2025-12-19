import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const Maintenance = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    vehicles: '',
    maintenanceType: '',
    date: '',
    cost: '',
    status: 'Scheduled',
    nextDue: '',
    vendor: '',
    description: ''
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  
  // Maintenance type states
  const [maintenanceTypes, setMaintenanceTypes] = useState([
    'Oil Change',
    'Brake Service',
    'Tire Rotation',
    'Engine Tune-up',
    'Transmission Service',
    'Battery Replacement',
    'AC Service',
    'Wheel Alignment',
    'Suspension Repair',
    'Electrical System Repair'
  ]);
  const [customMaintenanceType, setCustomMaintenanceType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

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

  // Fetch configuration with token
  const getFetchConfig = (method = 'GET', body = null) => {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    };
    
    if (body) {
      config.body = JSON.stringify(body);
    }
    
    return config;
  };

  useEffect(() => {
    loadMaintenanceData();
    loadVehicles();
  }, []);

  const loadMaintenanceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}`, getFetchConfig());
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setMaintenanceRecords(data);
      } else {
        console.error('Failed to fetch maintenance data');
        setMaintenanceRecords([]);
      }
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      setMaintenanceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}`, getFetchConfig());
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      } else {
        console.error('Failed to fetch vehicles data');
        setVehicles([]);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  };

  // Filter records based on search and filters
  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.vehicles?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.maintenanceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || record.vehicles === vehicleFilter;
    
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this maintenance record?')) {
      try {
        const response = await fetch(`${`${API_BASE_URL}`}/${id}`, 
          getFetchConfig('DELETE'));

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }

        if (response.ok) {
          setMaintenanceRecords(maintenanceRecords.filter(record => record.id !== id));
        } else {
          alert('Failed to delete maintenance record');
        }
      } catch (error) {
        console.error('Error deleting maintenance record:', error);
        alert('Error deleting maintenance record');
      }
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleMaintenanceTypeChange = (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      maintenanceType: value
    });
    
    // If user selects "Other", show custom input
    if (value === 'Other') {
      setShowCustomInput(true);
      setCustomMaintenanceType('');
    } else {
      setShowCustomInput(false);
      setCustomMaintenanceType('');
    }
  };

  const handleCustomMaintenanceTypeChange = (e) => {
    const value = e.target.value;
    setCustomMaintenanceType(value);
    setFormData({
      ...formData,
      maintenanceType: value
    });
  };

  const handleAddCustomType = () => {
    if (customMaintenanceType.trim() && !maintenanceTypes.includes(customMaintenanceType.trim())) {
      setMaintenanceTypes([...maintenanceTypes, customMaintenanceType.trim()]);
      setShowCustomInput(false);
      setCustomMaintenanceType('');
      
      // Reset to the new custom type in dropdown
      const select = document.querySelector('select[name="maintenanceType"]');
      if (select) {
        select.value = customMaintenanceType.trim();
        setFormData({
          ...formData,
          maintenanceType: customMaintenanceType.trim()
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let response;
      const payload = {
        ...formData,
        cost: parseFloat(formData.cost),
        date: formData.date,
        nextDue: formData.nextDue || null
      };

      if (editingRecord) {
        response = await fetch(`${`${API_BASE_URL}`}/${editingRecord.id}`, 
          getFetchConfig('PUT', payload));
      } else {
        response = await fetch(`${API_BASE_URL}`, 
          getFetchConfig('POST', payload));
      }

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        await loadMaintenanceData();
        resetForm();
        setShowForm(false);
        setEditingRecord(null);
        setShowCustomInput(false);
        setCustomMaintenanceType('');
      } else {
        const errorText = await response.text();
        alert(`Failed to ${editingRecord ? 'update' : 'create'} maintenance record: ${errorText}`);
      }
    } catch (error) {
      alert(`Error ${editingRecord ? 'updating' : 'creating'} maintenance record`);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      vehicles: record.vehicles || '',
      maintenanceType: record.maintenanceType || '',
      date: record.date || '',
      cost: record.cost ? record.cost.toString() : '',
      status: record.status || 'Scheduled',
      nextDue: record.nextDue || '',
      vendor: record.vendor || '',
      description: record.description || ''
    });
    
    // Check if the maintenance type exists in our list
    if (record.maintenanceType && !maintenanceTypes.includes(record.maintenanceType)) {
      setMaintenanceTypes([...maintenanceTypes, record.maintenanceType]);
    }
    
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      vehicles: '',
      maintenanceType: '',
      date: '',
      cost: '',
      status: 'Scheduled',
      nextDue: '',
      vendor: '',
      description: ''
    });
    setShowCustomInput(false);
    setCustomMaintenanceType('');
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setShowForm(false);
    resetForm();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'Scheduled': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'In Progress': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'Overdue': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (amount) => {
    return `₵${amount?.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate statistics
  const stats = {
    totalCost: maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0),
    completed: maintenanceRecords.filter(r => r.status === 'Completed').length,
    scheduled: maintenanceRecords.filter(r => r.status === 'Scheduled').length,
    inProgress: maintenanceRecords.filter(r => r.status === 'In Progress').length,
    overdue: maintenanceRecords.filter(r => r.status === 'Overdue').length,
    totalRecords: maintenanceRecords.length
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Sidebar />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-blue-600 text-2xl">🔧</span>
              </div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading maintenance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Sidebar />
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3">Vehicle Maintenance</h1>
                <p className="text-blue-100 text-lg">Track and manage all vehicle servicing activities</p>
              </div>
              <button 
                onClick={() => setShowForm(true)}
                disabled={vehicles.length === 0}
                className={`mt-6 md:mt-0 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 ${
                  vehicles.length === 0 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-white text-blue-600 hover:bg-blue-50 hover:scale-105'
                }`}
              >
                <span className="text-xl">+</span>
                Add Maintenance
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Cost</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.totalCost)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <span className="text-2xl text-blue-600">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <span className="text-2xl text-green-600">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgress}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <span className="text-2xl text-amber-600">⏳</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalRecords}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <span className="text-2xl text-purple-600">📋</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search maintenance records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Vehicles</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.name}>{vehicle.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-gray-600 text-sm">
                Showing {filteredRecords.length} of {maintenanceRecords.length} records
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {vehicles.length === 0 && (
            <div className="mb-6 p-6 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl mx-6 mt-6">
              <div className="flex items-center">
                <div className="p-3 bg-amber-500/20 rounded-lg mr-4">
                  <span className="text-2xl text-amber-600">⚠️</span>
                </div>
                <div>
                  <p className="text-amber-800 font-medium">
                    No vehicles available. Please add vehicles first before creating maintenance records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full">
                  <span className="text-4xl">🔧</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No maintenance records found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {vehicles.length === 0 
                  ? "Start by adding vehicles to your fleet, then track their maintenance history here."
                  : "Begin tracking your vehicle maintenance to ensure optimal performance and safety."
                }
              </p>
              {vehicles.length > 0 && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  Create First Maintenance Record
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Next Due</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-blue-50/50 transition-colors duration-150 group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 text-lg">🚗</span>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{record.vehicles}</div>
                            <div className="text-sm text-gray-500">{record.maintenanceType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.maintenanceType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{formatDate(record.date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-blue-600">{formatCurrency(record.cost)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(record.status)}`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            record.status === 'Completed' ? 'bg-green-500' :
                            record.status === 'Scheduled' ? 'bg-blue-500' :
                            record.status === 'In Progress' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}></span>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${record.nextDue ? 'text-gray-900' : 'text-gray-400'}`}>
                          {formatDate(record.nextDue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.vendor}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button 
                            onClick={() => handleEdit(record)}
                            className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 hover:scale-105"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(record.id)}
                            className="p-2 bg-gradient-to-br from-red-50 to-red-100 text-red-600 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 hover:scale-105"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        {maintenanceRecords.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h3>
              <div className="space-y-3">
                {['Completed', 'Scheduled', 'In Progress', 'Overdue'].map((status) => {
                  const count = maintenanceRecords.filter(r => r.status === status).length;
                  const percentage = (count / maintenanceRecords.length) * 100;
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-3 ${
                          status === 'Completed' ? 'bg-green-500' :
                          status === 'Scheduled' ? 'bg-blue-500' :
                          status === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-sm text-gray-700">{status}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">{count}</span>
                        <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Maintenance Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                  <div className="text-sm text-blue-700 font-medium mt-1">Completed</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-600">{stats.scheduled}</div>
                  <div className="text-sm text-amber-700 font-medium mt-1">Scheduled</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{stats.inProgress}</div>
                  <div className="text-sm text-green-700 font-medium mt-1">In Progress</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                  <div className="text-sm text-red-700 font-medium mt-1">Overdue</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{stats.totalRecords}</div>
                  <div className="text-sm text-purple-700 font-medium mt-1">Total Records</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.totalCost)}</div>
                  <div className="text-sm text-indigo-700 font-medium mt-1">Total Cost</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
                  </h2>
                  <p className="text-gray-600 mt-1">Track vehicle servicing and maintenance activities</p>
                </div>
                <button
                  onClick={cancelEdit}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Vehicle
                  </label>
                  <select
                    name="vehicles"
                    value={formData.vehicles}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.name}>
                        {vehicle.name} - {vehicle.licensePlate} {vehicle.status !== 'active' ? `(${vehicle.status})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Maintenance Type
                  </label>
                  <select
                    name="maintenanceType"
                    value={formData.maintenanceType}
                    onChange={handleMaintenanceTypeChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Type</option>
                    {maintenanceTypes.map((type, index) => (
                      <option key={index} value={type}>{type}</option>
                    ))}
                    <option value="Other">Other (Enter Custom)</option>
                  </select>
                  
                  {showCustomInput && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={customMaintenanceType}
                        onChange={handleCustomMaintenanceTypeChange}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter custom maintenance type"
                      />
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomInput(false);
                            setFormData({
                              ...formData,
                              maintenanceType: ''
                            });
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCustomType}
                          disabled={!customMaintenanceType.trim()}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            customMaintenanceType.trim()
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Add Custom Type
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Service Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Cost (₵)
                  </label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    name="nextDue"
                    value={formData.nextDue}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Vendor
                  </label>
                  <input
                    type="text"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., AutoCare Center"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter maintenance details, notes, or special instructions..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={vehicles.length === 0 || !formData.maintenanceType}
                >
                  {editingRecord ? 'Update Record' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;