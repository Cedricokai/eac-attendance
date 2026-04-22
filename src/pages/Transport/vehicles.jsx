import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drivers, setDrivers] = useState([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [expiryNotifications, setExpiryNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [inputError, setInputError] = useState('');

  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    type: '',
    dvla: '',
    vehicleLicenseNumber: '',
    vehicleLicenseExpiry: '',
    status: 'ACTIVE',
    fuelType: 'petrol',
    maxFuelCapacity: '',
    lastService: '',
    nextService: '',
    assignedDriver: '',
    vin: '',
    year: '',
    color: '',
    currentMileage: '',
    nextServiceMileage: '',
    notes: '',
    insuranceExpiry: ''
  });

  // API base URL
 // Replace the getApiBaseUrl function in your Vehicles component with this:

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  console.log("🖥️ Current hostname:", hostname);

  // Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access - this is your current IP
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    // Use the same logic as login page - check env vars
    return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://localhost:8080";
  }

  // Public IP
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

  // Fetch configuration with token
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

  // Fetch vehicles data
  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please login again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/vehicles`, getFetchConfig());

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Failed to fetch vehicles: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError(error.message);
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch drivers data
  const fetchDrivers = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.warn('No authentication token found for fetching drivers');
        setDrivers([]);
        return;
      }

      // Try different endpoints
      const endpoints = ['/api/drivers', '/api/users'];
      let driversData = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, getFetchConfig());
          
          if (response.ok) {
            const data = await response.json();
            driversData = Array.isArray(data) ? data : [data];
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${endpoint}:`, err);
        }
      }
      
      setDrivers(driversData);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  useEffect(() => {
    checkDvlaExpiry();
  }, [vehicles]);

  const checkDvlaExpiry = () => {
    const today = new Date();
    const notifications = [];

    vehicles.forEach(vehicle => {
      if (vehicle.vehicleLicenseExpiry) {
        const expiryDate = new Date(vehicle.vehicleLicenseExpiry);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          notifications.push({
            vehicle: vehicle.name,
            dvla: vehicle.dvla,
            expiryDate: vehicle.vehicleLicenseExpiry,
            daysLeft: daysUntilExpiry,
            type: 'warning'
          });
        } else if (daysUntilExpiry <= 0) {
          notifications.push({
            vehicle: vehicle.name,
            dvla: vehicle.dvla,
            expiryDate: vehicle.vehicleLicenseExpiry,
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
      return 'Expires tomorrow';
    } else if (daysUntilExpiry <= 30) {
      return `Expires in ${daysUntilExpiry}d`;
    } else {
      return 'Valid';
    }
  };

  // Fetch attachments for a vehicle
  const fetchAttachments = async (vehicleId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No authentication token found');
        setAttachments([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/attachments`, getFetchConfig());
      
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      } else {
        setAttachments([]);
      }
    } catch (error) {
      console.error("Error loading attachments", error);
      setAttachments([]);
    }
  };

  // Handle file upload
  const handleFileUpload = async (vehicleId, files) => {
    if (!files || files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      alert(`Some files exceed the 10MB limit:\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }

    setUploadingFiles(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('vehicleId', vehicleId);

      const response = await fetch(`${API_BASE_URL}/api/vehicles/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        await fetchAttachments(vehicleId);
        setSelectedFiles([]);
        setSuccessMessage('Files uploaded successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${errorData}`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      if (error.message.includes('413')) {
        alert('File too large! Maximum size is 10MB per file.');
      } else if (error.message.includes('415')) {
        alert('Unsupported file type!');
      } else {
        alert('Error uploading files. Please try again.');
      }
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  // View file
  const handleViewFile = async (attachment) => {
    setIsLoadingFile(true);
    setViewingFile(attachment);
    
    try {
      const token = getAuthToken();
      const fileType = attachment.fileName.split('.').pop().toLowerCase();
      
      const response = await fetch(`${API_BASE_URL}/api/vehicles/download/${attachment.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        if (isImageFile(fileType) || fileType === 'pdf') {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setFileContent(url);
        } else if (isTextFile(fileType)) {
          const text = await response.text();
          setFileContent(text);
        } else {
          setFileContent('preview-not-available');
        }
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      setFileContent('error');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const getMimeType = (fileType) => {
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json'
    };
    return mimeTypes[fileType] || 'application/octet-stream';
  };

  const isTextFile = (fileType) => {
    const textTypes = ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'log'];
    return textTypes.includes(fileType);
  };

  const isImageFile = (fileType) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    return imageTypes.includes(fileType);
  };

  const closeFileViewer = () => {
    setViewingFile(null);
    setFileContent('');
    if (fileContent && fileContent.startsWith('blob:')) {
      URL.revokeObjectURL(fileContent);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId) => {
    if (window.confirm('Are you sure you want to delete this attachment?')) {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/vehicles/attachments/${attachmentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          await fetchAttachments(selectedVehicle.id);
          setSuccessMessage('Attachment deleted successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          throw new Error('Failed to delete attachment');
        }
      } catch (error) {
        console.error('Error deleting attachment:', error);
        alert('Error deleting attachment');
      }
    }
  };

  // Download attachment
  const handleDownloadAttachment = async (attachment) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/vehicles/download/${attachment.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', attachment.fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const showVehicleAttachments = async (vehicle) => {
    setSelectedVehicle(vehicle);
    await fetchAttachments(vehicle.id);
    setShowAttachments(true);
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setInputError('');
    
    // Validate required fields
    if (!vehicleForm.name || !vehicleForm.type || !vehicleForm.dvla) {
      setInputError('Please fill out all required fields (Name, Type, DVLA).');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        setInputError('No authentication token found. Please login again.');
        return;
      }

      let url = `${API_BASE_URL}/api/vehicles`;
      let method = 'POST';
      
      if (editingVehicle) {
        url = `${API_BASE_URL}/api/vehicles/${editingVehicle.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, getFetchConfig(method, vehicleForm));

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        await fetchVehicles();
        resetForm();
        setShowForm(false);
        setSuccessMessage(`Vehicle ${editingVehicle ? 'updated' : 'added'} successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorText = await response.text();
        setInputError(`Failed to ${editingVehicle ? 'update' : 'create'} vehicle: ${errorText}`);
      }
    } catch (error) {
      setInputError(`Error ${editingVehicle ? 'updating' : 'creating'} vehicle: ${error.message}`);
    }
  };

  // Handle edit vehicle
  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      name: vehicle.name || '',
      type: vehicle.type || '',
      dvla: vehicle.dvla || '',
      vehicleLicenseNumber: vehicle.vehicleLicenseNumber || '',
      vehicleLicenseExpiry: vehicle.vehicleLicenseExpiry ? vehicle.vehicleLicenseExpiry.split('T')[0] : '',
      status: vehicle.status || 'ACTIVE',
      fuelType: vehicle.fuelType || 'petrol',
      maxFuelCapacity: vehicle.maxFuelCapacity || '',
      lastService: vehicle.lastService ? vehicle.lastService.split('T')[0] : '',
      nextService: vehicle.nextService ? vehicle.nextService.split('T')[0] : '',
      assignedDriver: vehicle.assignedDriver || '',
      vin: vehicle.vin || '',
      year: vehicle.year || '',
      color: vehicle.color || '',
      currentMileage: vehicle.currentMileage || '',
      nextServiceMileage: vehicle.nextServiceMileage || '',
      notes: vehicle.notes || '',
      insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : ''
    });
    setShowForm(true);
  };

  // Handle delete vehicle
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/vehicles/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }

        if (response.ok) {
          await fetchVehicles();
          setSuccessMessage('Vehicle deleted successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          const errorText = await response.text();
          alert(`Failed to delete vehicle: ${errorText}`);
        }
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        alert('Error deleting vehicle');
      }
    }
  };

  const resetForm = () => {
    setVehicleForm({
      name: '',
      type: '',
      dvla: '',
      vehicleLicenseNumber: '',
      vehicleLicenseExpiry: '',
      status: 'ACTIVE',
      fuelType: 'petrol',
      maxFuelCapacity: '',
      lastService: '',
      nextService: '',
      assignedDriver: '',
      vin: '',
      year: '',
      color: '',
      currentMileage: '',
      nextServiceMileage: '',
      notes: '',
      insuranceExpiry: ''
    });
    setEditingVehicle(null);
    setInputError('');
  };

  const cancelEdit = () => {
    resetForm();
    setShowForm(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'MAINTENANCE': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'INACTIVE': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'svg': return '🖼️';
      case 'zip': case 'rar': case '7z': return '📦';
      case 'txt': return '📃';
      case 'csv': return '📋';
      case 'json': return '🔤';
      case 'mp4': case 'avi': case 'mov': return '🎬';
      case 'mp3': case 'wav': return '🎵';
      default: return '📎';
    }
  };

  const canPreviewFile = (fileName) => {
    const fileType = fileName.split('.').pop().toLowerCase();
    return isTextFile(fileType) || isImageFile(fileType) || fileType === 'pdf';
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.dvla?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.assignedDriver?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    let matchesTab = true;
    if (activeTab === 'expiring') {
      const expiryStatus = getExpiryStatus(vehicle.vehicleLicenseExpiry);
      matchesTab = expiryStatus === 'warning' || expiryStatus === 'critical';
    } else if (activeTab === 'expired') {
      matchesTab = getExpiryStatus(vehicle.vehicleLicenseExpiry) === 'expired';
    } else if (activeTab === 'maintenance') {
      matchesTab = vehicle.status === 'MAINTENANCE';
    }
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'ACTIVE').length,
    maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
    assigned: vehicles.filter(v => v.assignedDriver).length,
    expiring: vehicles.filter(v => getExpiryStatus(v.vehicleLicenseExpiry) === 'warning' || getExpiryStatus(v.vehicleLicenseExpiry) === 'critical').length,
    expired: vehicles.filter(v => getExpiryStatus(v.vehicleLicenseExpiry) === 'expired').length
  };

  // Get driver names for dropdown
  const getDriverNames = () => {
    if (!drivers || drivers.length === 0) {
      return [];
    }

    return drivers
      .map(driver => {
        if (driver.driverName) {
          return driver.driverName.trim();
        } else if (driver.fullName) {
          return driver.fullName.trim();
        } else if (driver.name) {
          return driver.name.trim();
        } else if (driver.firstName && driver.lastName) {
          return `${driver.firstName} ${driver.lastName}`.trim();
        }
        return '';
      })
      .filter(name => name !== '')
      .filter((name, index, self) => self.indexOf(name) === index);
  };

  const driverNames = getDriverNames();

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Sidebar />
        <div className="flex-1 p-6 flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-blue-600 text-2xl">🚗</span>
              </div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading vehicle fleet...</p>
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
            <h2 className="text-lg font-semibold mb-2">Error Loading Vehicles</h2>
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">Vehicle Fleet Management</h1>
                    <p className="text-blue-100 text-lg">Manage your entire vehicle fleet in one place</p>
                  </div>
                  <button 
                    onClick={() => setShowForm(true)}
                    className="mt-6 md:mt-0 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
                  >
                    <span className="text-xl">+</span>
                    Add Vehicle
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <span className="text-xl text-blue-600">🚗</span>
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
                      <p className="text-sm text-gray-500 font-medium">Maintenance</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{stats.maintenance}</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <span className="text-xl text-amber-600">🔧</span>
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
                      <span className="text-xl text-purple-600">👤</span>
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
                      <p className="text-sm text-gray-500 font-medium">Expired</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-xl">
                      <span className="text-xl text-red-600">⛔</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DVLA Expiry Notifications */}
            {expiryNotifications.length > 0 && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-red-500/20 rounded-lg mr-4">
                      <span className="text-xl text-red-600">⚠️</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-800">DVLA Expiry Alerts</h3>
                      <p className="text-red-600">Some vehicle DVLA documents require attention</p>
                    </div>
                  </div>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {expiryNotifications.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {expiryNotifications.slice(0, 4).map((notification, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100"
                    >
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          notification.type === 'expired' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-800">{notification.vehicle}</div>
                          <div className="text-sm text-gray-600">DVLA: {notification.dvla}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          notification.type === 'expired' ? 'text-red-600' : 'text-yellow-600'
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

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {['all', 'active', 'maintenance', 'expiring', 'expired'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                        activeTab === tab 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab === 'all' ? 'All Vehicles' : 
                      tab === 'active' ? 'Active' : 
                      tab === 'maintenance' ? 'In Maintenance' : 
                      tab === 'expiring' ? 'Expiring Soon' : 'Expired'}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search vehicles by name, DVLA, type, or driver..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Vehicles Grid */}
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full">
                      <span className="text-4xl">🚗</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">No vehicles found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {vehicles.length === 0 
                      ? "Start building your fleet by adding your first vehicle."
                      : "No vehicles match your search criteria."
                    }
                  </p>
                  {vehicles.length === 0 && (
                    <button 
                      onClick={() => setShowForm(true)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      Add First Vehicle
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                            <span className="text-xl text-blue-600">🚗</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">{vehicle.name}</h3>
                            <p className="text-gray-600 text-sm">{vehicle.type}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(vehicle.status)}`}>
                          {vehicle.status === 'ACTIVE' ? 'Active' : 
                           vehicle.status === 'MAINTENANCE' ? 'Maintenance' : 
                           vehicle.status === 'INACTIVE' ? 'Inactive' : vehicle.status}
                        </span>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">DVLA</span>
                          <span className="font-mono font-bold text-gray-800">{vehicle.dvla}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">Driver</span>
                          <span className="font-medium text-gray-800">{vehicle.assignedDriver || 'Not assigned'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">Fuel Type</span>
                          <span className="capitalize text-gray-800">{vehicle.fuelType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">DVLA Expiry</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getExpiryColor(vehicle.vehicleLicenseExpiry)}`}>
                            {getExpiryText(vehicle.vehicleLicenseExpiry)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button
                          onClick={() => showVehicleAttachments(vehicle)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-2 hover:scale-105 transition-transform"
                        >
                          <span>📎</span>
                          <span>Attachments</span>
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEdit(vehicle)}
                            className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 hover:scale-105"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(vehicle.id)}
                            className="p-2 bg-gradient-to-br from-red-50 to-red-100 text-red-600 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 hover:scale-105"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Viewer Modal */}
        {viewingFile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">File Viewer</h3>
                <button
                  onClick={closeFileViewer}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-auto">
                {isLoadingFile ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading file...</p>
                    </div>
                  </div>
                ) : fileContent === 'error' ? (
                  <div className="text-center py-12">
                    <p className="text-red-600">Error loading file</p>
                  </div>
                ) : fileContent === 'preview-not-available' ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Preview not available for this file type</p>
                    <button
                      onClick={() => handleDownloadAttachment(viewingFile)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Download File
                    </button>
                  </div>
                ) : viewingFile.fileName.split('.').pop().toLowerCase() === 'pdf' ? (
                  <iframe
                    src={fileContent}
                    className="w-full h-[70vh] border-0"
                    title={viewingFile.fileName}
                  />
                ) : isImageFile(viewingFile.fileName.split('.').pop().toLowerCase()) ? (
                  <div className="flex justify-center">
                    <img
                      src={fileContent}
                      alt={viewingFile.fileName}
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  </div>
                ) : (
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[70vh] whitespace-pre-wrap">
                    {fileContent}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Attachments Modal */}
        {showAttachments && selectedVehicle && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Vehicle Attachments</h2>
                    <p className="text-gray-600 mt-1">{selectedVehicle.name} - {selectedVehicle.dvla}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAttachments(false);
                      setSelectedVehicle(null);
                      setAttachments([]);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* File Upload Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Upload Files</h3>
                  <div className="flex items-center space-x-4">
                    <label className="flex-1">
                      <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">Max 10MB per file</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                    </label>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleFileUpload(selectedVehicle.id, selectedFiles)}
                        disabled={selectedFiles.length === 0 || uploadingFiles}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingFiles ? 'Uploading...' : 'Upload Files'}
                      </button>
                      {selectedFiles.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {selectedFiles.length} file(s) selected
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attachments List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Attachments ({attachments.length})</h3>
                  {attachments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No attachments found for this vehicle.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getFileIcon(attachment.fileName)}</span>
                              <div>
                                <p className="font-medium text-gray-800 truncate max-w-[200px]">
                                  {attachment.fileName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatFileSize(attachment.fileSize)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {canPreviewFile(attachment.fileName) && (
                                <button
                                  onClick={() => handleViewFile(attachment)}
                                  className="p-2 text-blue-600 hover:text-blue-800"
                                  title="View"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadAttachment(attachment)}
                                className="p-2 text-green-600 hover:text-green-800"
                                title="Download"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteAttachment(attachment.id)}
                                className="p-2 text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-30 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                    </h2>
                    <p className="text-gray-600 mt-1">Manage vehicle details and specifications</p>
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
              
              <form onSubmit={handleFormSubmit} className="p-6">
                {inputError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <p>{inputError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.name}
                      onChange={(e) => setVehicleForm({...vehicleForm, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Truck A"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type *
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.type}
                      onChange={(e) => setVehicleForm({...vehicleForm, type: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Heavy Duty Truck"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DVLA Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.dvla}
                      onChange={(e) => setVehicleForm({...vehicleForm, dvla: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., ABC123"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle License Number
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.vehicleLicenseNumber}
                      onChange={(e) => setVehicleForm({...vehicleForm, vehicleLicenseNumber: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Vehicle license registration number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DVLA Expiry Date
                    </label>
                    <input
                      type="date"
                      value={vehicleForm.vehicleLicenseExpiry}
                      onChange={(e) => setVehicleForm({...vehicleForm, vehicleLicenseExpiry: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {vehicleForm.vehicleLicenseExpiry && (
                      <p className={`text-xs mt-1 ${
                        getExpiryStatus(vehicleForm.vehicleLicenseExpiry) === 'expired' ? 'text-red-600' :
                        getExpiryStatus(vehicleForm.vehicleLicenseExpiry) === 'critical' ? 'text-red-600' :
                        getExpiryStatus(vehicleForm.vehicleLicenseExpiry) === 'warning' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getExpiryText(vehicleForm.vehicleLicenseExpiry)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Expiry
                    </label>
                    <input
                      type="date"
                      value={vehicleForm.insuranceExpiry}
                      onChange={(e) => setVehicleForm({...vehicleForm, insuranceExpiry: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {vehicleForm.insuranceExpiry && (
                      <p className={`text-xs mt-1 ${
                        getExpiryStatus(vehicleForm.insuranceExpiry) === 'expired' ? 'text-red-600' :
                        getExpiryStatus(vehicleForm.insuranceExpiry) === 'critical' ? 'text-red-600' :
                        getExpiryStatus(vehicleForm.insuranceExpiry) === 'warning' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getExpiryText(vehicleForm.insuranceExpiry)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VIN
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.vin}
                      onChange={(e) => setVehicleForm({...vehicleForm, vin: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Vehicle Identification Number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Type *
                    </label>
                    <select
                      value={vehicleForm.fuelType}
                      onChange={(e) => setVehicleForm({...vehicleForm, fuelType: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="cng">CNG</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Capacity (Liters) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={vehicleForm.maxFuelCapacity}
                      onChange={(e) => setVehicleForm({...vehicleForm, maxFuelCapacity: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 60.0"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      value={vehicleForm.status}
                      onChange={(e) => setVehicleForm({...vehicleForm, status: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={vehicleForm.year}
                      onChange={(e) => setVehicleForm({...vehicleForm, year: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2023"
                      min="1900"
                      max="2030"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.color}
                      onChange={(e) => setVehicleForm({...vehicleForm, color: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Red"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Driver
                    </label>
                    <select
                      value={vehicleForm.assignedDriver}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, assignedDriver: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Driver</option>
                      {driverNames.map((name, index) => (
                        <option key={index} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Mileage
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={vehicleForm.currentMileage}
                      onChange={(e) => setVehicleForm({...vehicleForm, currentMileage: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 15000"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Service Date
                    </label>
                    <input
                      type="date"
                      value={vehicleForm.lastService}
                      onChange={(e) => setVehicleForm({...vehicleForm, lastService: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Service Date
                    </label>
                    <input
                      type="date"
                      value={vehicleForm.nextService}
                      onChange={(e) => setVehicleForm({...vehicleForm, nextService: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Service Mileage
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={vehicleForm.nextServiceMileage}
                      onChange={(e) => setVehicleForm({...vehicleForm, nextServiceMileage: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 20000"
                      min="0"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={vehicleForm.notes}
                    onChange={(e) => setVehicleForm({...vehicleForm, notes: e.target.value})}
                    rows="3"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes about the vehicle..."
                  />
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
                  >
                    {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

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

export default Vehicles;