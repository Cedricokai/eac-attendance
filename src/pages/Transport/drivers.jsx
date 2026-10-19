import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiryNotifications, setExpiryNotifications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [inputError, setInputError] = useState('');

  const [formData, setFormData] = useState({
    driverName: '',
    licenseNumber: '',
    licenseExpiry: '',
    contact: '',
    email: '',
    status: 'active',
    assignedVehicle: ''
  });

  // Replace the getApiBaseUrl function in Drivers.jsx with this:

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  console.log("🖥️ Current hostname:", hostname);

  // Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://localhost:8080";
  }

  // Public IP - adjust this based on your environment
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
  }

  // Default fallback
  console.log("🌍 Using default API URL");
  return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
};

  const API_BASE_URL = getApiBaseUrl();

  // Get authentication token
  const getAuthToken = () => {
    return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  };

  // Fetch configuration with token - similar to products.jsx
  const getFetchConfig = (method = 'GET', body = null) => {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
      credentials: 'include'
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return config;
  };

  useEffect(() => {
    loadDriversData();
    fetchEmployees();
  }, []);

  useEffect(() => {
    checkLicenseExpiry();
  }, [drivers]);

  // Fetch drivers data
  const loadDriversData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please login again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/drivers`, getFetchConfig());

      if (!response.ok) {
        throw new Error(`Failed to fetch drivers: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers data:', error);
      setError(error.message);
      setDrivers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch employees from employee API
  const fetchEmployees = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.warn('No authentication token found for fetching employees');
        setEmployees([]);
        return;
      }

      console.log("Fetching employees from:", `${API_BASE_URL}/api/employees`);
      
      const response = await fetch(`${API_BASE_URL}/api/employees`, getFetchConfig());
      
      if (!response.ok) {
        console.warn(`Failed to fetch employees from /api/employees: ${response.status}. Trying /api/employee...`);
        
        const altResponse = await fetch(`${API_BASE_URL}/api/employee`, getFetchConfig());
        
        if (!altResponse.ok) {
          console.error('Failed to fetch employees from both endpoints');
          setEmployees([]);
          return;
        }
        
        const altData = await altResponse.json();
        setEmployees(Array.isArray(altData) ? altData : [altData]);
        return;
      }
      
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : [data]);
      
    } catch (error) {
      console.error('Error fetching employees data:', error);
      setEmployees([]);
    }
  };

  const checkLicenseExpiry = () => {
    const today = new Date();
    const notifications = [];

    drivers.forEach(driver => {
      if (driver.licenseExpiry) {
        const expiryDate = new Date(driver.licenseExpiry);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          notifications.push({
            driver: driver.driverName,
            licenseNumber: driver.licenseNumber,
            expiryDate: driver.licenseExpiry,
            daysLeft: daysUntilExpiry,
            type: 'warning'
          });
        } else if (daysUntilExpiry <= 0) {
          notifications.push({
            driver: driver.driverName,
            licenseNumber: driver.licenseNumber,
            expiryDate: driver.licenseExpiry,
            daysLeft: Math.abs(daysUntilExpiry),
            type: 'expired'
          });
        }
      }
    });

    setExpiryNotifications(notifications);
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return 'unknown';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'valid';
  };

  const getExpiryColor = (expiryDate) => {
    const status = getExpiryStatus(expiryDate);
    switch (status) {
      case 'expired': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'critical': return 'bg-red-400/20 text-red-700 border-red-300';
      case 'warning': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'valid': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getExpiryText = (expiryDate) => {
    if (!expiryDate) return 'Not set';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return `Expired ${Math.abs(daysUntilExpiry)}d ago`;
    } else if (daysUntilExpiry === 0) {
      return 'Expires today';
    } else if (daysUntilExpiry === 1) {
      return 'Tomorrow';
    } else if (daysUntilExpiry <= 30) {
      return `${daysUntilExpiry}d`;
    } else {
      return 'Valid';
    }
  };

  // Filter drivers based on search term and status
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.assignedVehicle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle delete driver
  const handleDelete = async (id) => {
    if (await window.appConfirm('Are you sure you want to delete this driver?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/drivers/${id}`, getFetchConfig('DELETE'));

        if (response.ok) {
          setDrivers(drivers.filter(driver => driver.id !== id));
          setSuccessMessage('Driver deleted successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          const errorText = await response.text();
          alert(`Failed to delete driver: ${errorText}`);
        }
      } catch (error) {
        console.error('Error deleting driver:', error);
        alert('Error deleting driver');
      }
    }
  };

  // Handle input change for form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputError('');
    
    if (name === 'driverName') {
      const selectedEmployee = employees.find(emp => {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        return fullName === value;
      });
      
      setFormData({
        ...formData,
        [name]: value,
        ...(selectedEmployee && {
          contact: selectedEmployee.phone || selectedEmployee.contact || '',
          email: selectedEmployee.email || ''
        })
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setInputError('');
    
    if (!formData.driverName || !formData.licenseNumber || !formData.licenseExpiry || 
        !formData.contact || !formData.email || !formData.status) {
      setInputError('Please fill out all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setInputError('Please enter a valid email address.');
      return;
    }

    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanedPhone = formData.contact.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      setInputError('Please enter a valid phone number.');
      return;
    }

    try {
      let response;
      let url = `${API_BASE_URL}/api/drivers`;
      let method = 'POST';
      
      if (editingDriver) {
        url = `${API_BASE_URL}/api/drivers/${editingDriver.id}`;
        method = 'PUT';
      }

      response = await fetch(url, getFetchConfig(method, formData));

      if (response.ok) {
        await loadDriversData();
        resetForm();
        setShowForm(false);
        setEditingDriver(null);
        setSuccessMessage(`Driver ${editingDriver ? 'updated' : 'created'} successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorText = await response.text();
        setInputError(`Failed to ${editingDriver ? 'update' : 'create'} driver: ${errorText}`);
      }
    } catch (error) {
      setInputError(`Error ${editingDriver ? 'updating' : 'creating'} driver: ${error.message}`);
    }
  };

  // Handle edit driver
  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({ 
      driverName: driver.driverName || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.split('T')[0] : '',
      contact: driver.contact || '',
      email: driver.email || '',
      status: driver.status || 'active',
      assignedVehicle: driver.assignedVehicle || ''
    });
    setShowForm(true);
    setInputError('');
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      driverName: '',
      licenseNumber: '',
      licenseExpiry: '',
      contact: '',
      email: '',
      status: 'active',
      assignedVehicle: ''
    });
    setInputError('');
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingDriver(null);
    setShowForm(false);
    resetForm();
  };

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'on-leave': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get unique employee names for dropdown
  const getEmployeeNames = () => {
    if (!employees || employees.length === 0) {
      console.log('No employees available');
      return [];
    }

    const names = employees
      .map(emp => {
        if (emp.firstName && emp.lastName) {
          return `${emp.firstName} ${emp.lastName}`.trim();
        } else if (emp.name) {
          return emp.name.trim();
        } else if (emp.employeeName) {
          return emp.employeeName.trim();
        } else if (emp.driverName) {
          return emp.driverName.trim();
        }
        return '';
      })
      .filter(name => name !== '')
      .filter((name, index, self) => self.indexOf(name) === index);

    console.log('Employee names found:', names);
    return names;
  };

  // Statistics
  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    onLeave: drivers.filter(d => d.status === 'on-leave').length,
    inactive: drivers.filter(d => d.status === 'inactive').length,
    assigned: drivers.filter(d => d.assignedVehicle && d.assignedVehicle.trim() !== '').length,
    expiring: drivers.filter(d => {
      const status = getExpiryStatus(d.licenseExpiry);
      return status === 'warning' || status === 'critical';
    }).length
  };

  const employeeNames = getEmployeeNames();

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Sidebar />
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-blue-600 text-2xl">👨‍✈️</span>
              </div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading driver information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Sidebar />
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="max-w-md p-6 bg-red-50 border border-red-400 text-red-700 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Error Loading Drivers</h2>
            <p className="mb-4">{error}</p>
            <div className="flex space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p>{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {successMessage}
              </div>
            )}

            {/* Header Section */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">Driver Management</h1>
                    <p className="text-blue-100 text-lg">Manage your team of professional drivers</p>
                  </div>
                  <button 
                    onClick={() => setShowForm(true)}
                    className="mt-6 md:mt-0 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
                  >
                    <span className="text-xl">+</span>
                    Add Driver
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Drivers</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <span className="text-xl text-blue-600">👥</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Active</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
                    </div>
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <span className="text-xl text-emerald-600">✅</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">On Leave</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{stats.onLeave}</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <span className="text-xl text-amber-600">🏖️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Assigned</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{stats.assigned}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <span className="text-xl text-purple-600">🚗</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Expiring</p>
                      <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.expiring}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-xl">
                      <span className="text-xl text-yellow-600">⚠️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Inactive</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{stats.inactive}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-xl">
                      <span className="text-xl text-red-600">⏸️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            {expiryNotifications.length > 0 && (
              <div className="mb-6 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-amber-500/20 rounded-lg mr-4">
                      <span className="text-xl text-amber-600">📄</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800">License Expiry Alerts</h3>
                      <p className="text-amber-600">Some driver licenses require attention</p>
                    </div>
                  </div>
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {expiryNotifications.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {expiryNotifications.slice(0, 4).map((notification, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100"
                    >
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          notification.type === 'expired' ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-800">{notification.driver}</div>
                          <div className="text-sm text-gray-600">{notification.licenseNumber}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          notification.type === 'expired' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {notification.type === 'expired' 
                            ? `Expired ${notification.daysLeft}d ago`
                            : `Expires in ${notification.daysLeft}d`
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(notification.expiryDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters and Content */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search drivers by name, license, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="on-leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  
                  <div className="text-sm text-gray-600">
                    Showing {filteredDrivers.length} of {drivers.length} drivers
                  </div>
                </div>
              </div>

              {/* Drivers Grid */}
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full">
                      <span className="text-4xl">👨‍✈️</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">No drivers found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {drivers.length === 0 
                      ? "Start building your driver team by adding your first driver."
                      : "No drivers match your search criteria."
                    }
                  </p>
                  {drivers.length === 0 && (
                    <button 
                      onClick={() => setShowForm(true)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      Add First Driver
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDrivers.map((driver) => (
                    <div key={driver.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                            <span className="text-xl text-blue-600">👨‍✈️</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">{driver.driverName}</h3>
                            <p className="text-gray-600 text-sm">{driver.email}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(driver.status)}`}>
                          {driver.status}
                        </span>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">License</span>
                          <span className="font-mono font-medium text-gray-800">{driver.licenseNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">License Expiry</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getExpiryColor(driver.licenseExpiry)}`}>
                            {getExpiryText(driver.licenseExpiry)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">Contact</span>
                          <span className="font-medium text-gray-800">{driver.contact}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">Vehicle</span>
                          <span className="font-medium text-gray-800">{driver.assignedVehicle || 'Not assigned'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button 
                          onClick={() => handleEdit(driver)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-2 hover:scale-105 transition-transform"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                        
                        <button 
                          onClick={() => handleDelete(driver.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center space-x-2 hover:scale-105 transition-transform"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* License Status Overview */}
            {drivers.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">License Status Overview</h3>
                  <div className="space-y-3">
                    {['valid', 'warning', 'critical', 'expired', 'unknown'].map((status) => {
                      const count = drivers.filter(d => getExpiryStatus(d.licenseExpiry) === status).length;
                      const percentage = drivers.length > 0 ? (count / drivers.length) * 100 : 0;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className={`w-3 h-3 rounded-full mr-3 ${
                              status === 'valid' ? 'bg-emerald-500' :
                              status === 'warning' ? 'bg-amber-500' :
                              status === 'critical' ? 'bg-red-500' :
                              status === 'expired' ? 'bg-red-600' : 'bg-gray-500'
                            }`}></span>
                            <span className="text-sm text-gray-700 capitalize">{status}</span>
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

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/50 rounded-xl">
                      <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
                      <div className="text-sm text-emerald-700 font-medium mt-1">Active</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-xl">
                      <div className="text-2xl font-bold text-amber-600">{stats.onLeave}</div>
                      <div className="text-sm text-amber-700 font-medium mt-1">On Leave</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">{stats.assigned}</div>
                      <div className="text-sm text-purple-700 font-medium mt-1">Assigned</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">{stats.expiring}</div>
                      <div className="text-sm text-blue-700 font-medium mt-1">Expiring Soon</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                    </h2>
                    <p className="text-gray-600 mt-1">Manage driver details and information</p>
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
                      <span className="text-red-500">*</span> Driver Name
                    </label>
                    <select
                      name="driverName"
                      value={formData.driverName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select an employee</option>
                      {employeeNames.length > 0 ? (
                        employeeNames.map((name, index) => (
                          <option key={index} value={name}>
                            {name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No employees found. Please add employees first.</option>
                      )}
                    </select>
                    {employeeNames.length === 0 && (
                      <p className="text-sm text-amber-600 mt-1">
                        No employees found. Please make sure employees are added to the system.
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="text-red-500">*</span> License Number
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., DL123456"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="text-red-500">*</span> License Expiry
                    </label>
                    <input
                      type="date"
                      name="licenseExpiry"
                      value={formData.licenseExpiry}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    {formData.licenseExpiry && (
                      <p className={`text-sm mt-2 px-3 py-1 rounded-lg inline-block ${
                        getExpiryStatus(formData.licenseExpiry) === 'expired' ? 'bg-red-50 text-red-600' :
                        getExpiryStatus(formData.licenseExpiry) === 'critical' ? 'bg-red-100 text-red-600' :
                        getExpiryStatus(formData.licenseExpiry) === 'warning' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {getExpiryText(formData.licenseExpiry)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="text-red-500">*</span> Contact Number
                    </label>
                    <input
                      type="text"
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., +1-555-0101"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="text-red-500">*</span> Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., john.doe@company.com"
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
                      <option value="active">Active</option>
                      <option value="on-leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Vehicle
                    </label>
                    <input
                      type="text"
                      name="assignedVehicle"
                      value={formData.assignedVehicle}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Truck A (Optional)"
                    />
                  </div>
                </div>
                
                {inputError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <p>{inputError}</p>
                  </div>
                )}
                
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
                  >
                    {editingDriver ? 'Update Driver' : 'Add Driver'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Drivers;