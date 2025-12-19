import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar'; // Import Sidebar component

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [userRole, setUserRole] = useState('');
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


  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    type: '',
    dvla: '', // Changed from dvlaNumber to dvla to match backend
    vehicleLicenseNumber: '',
    vehicleLicenseExpiry: '',
    status: 'active',
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

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'admin';
    setUserRole(role);
    fetchVehicles();
    fetchDrivers();
  }, []);

  useEffect(() => {
    checkDvlaExpiry();
  }, [vehicles]);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(API_BASE_URL);
      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get("http://192.168.1.98:8080/api/users");
      setDrivers(response.data);
    } catch (error) {
      console.error("Error loading drivers", error);
    }
  };

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
            dvla: vehicle.dvla, // Changed from dvlaNumber to dvla
            expiryDate: vehicle.vehicleLicenseExpiry,
            daysLeft: daysUntilExpiry,
            type: 'warning'
          });
        } else if (daysUntilExpiry <= 0) {
          notifications.push({
            vehicle: vehicle.name,
            dvla: vehicle.dvla, // Changed from dvlaNumber to dvla
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

  const fetchAttachments = async (vehicleId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vehicle/${vehicleId}`);
      setAttachments(response.data);
    } catch (error) {
      console.error("Error loading attachments", error);
      setAttachments([]);
    }
  };

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
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('vehicleId', vehicleId);

      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200 || response.status === 201) {
        await fetchAttachments(vehicleId);
        setSelectedFiles([]);
        alert('Files uploaded successfully!');
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      if (error.response?.status === 413) {
        alert('File too large! Maximum size is 10MB per file.');
      } else if (error.response?.status === 415) {
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

  const handleViewFile = async (attachment) => {
    setIsLoadingFile(true);
    setViewingFile(attachment);
    
    try {
      const fileType = attachment.fileName.split('.').pop().toLowerCase();
      
      if (isImageFile(fileType) || fileType === 'pdf') {
        const response = await axios.get(`${API_BASE_URL}/download/${attachment.id}`, {
          responseType: 'blob',
          timeout: 15000
        });
        
        const blob = new Blob([response.data], { 
          type: response.headers['content-type'] || getMimeType(fileType)
        });
        
        const url = URL.createObjectURL(blob);
        setFileContent(url);
        
      } else if (isTextFile(fileType)) {
        const response = await axios.get(`${API_BASE_URL}/download/${attachment.id}`, {
          responseType: 'text',
          timeout: 15000
        });
        setFileContent(response.data);
        
      } else {
        setFileContent('preview-not-available');
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

  const handleDeleteAttachment = async (attachmentId) => {
    if (window.confirm('Are you sure you want to delete this attachment?')) {
      try {
        await axios.delete(`${API_BASE_URL}/${attachmentId}`);
        await fetchAttachments(selectedVehicle.id);
        alert('Attachment deleted successfully!');
      } catch (error) {
        console.error('Error deleting attachment:', error);
        alert('Error deleting attachment');
      }
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/download/${attachment.id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingVehicle) {
        await axios.put(`${API_BASE_URL}/${editingVehicle.id}`, vehicleForm);
      } else {
        await axios.post(API_BASE_URL, vehicleForm);
      }
      
      fetchVehicles();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        alert(`Error: ${error.response.status} - ${error.response.data.message || error.response.data}`);
      } else {
        alert('Error saving vehicle. Please check the console for details.');
      }
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      name: vehicle.name || '',
      type: vehicle.type || '',
      dvla: vehicle.dvla || '', // Changed from dvlaNumber to dvla
      vehicleLicenseNumber: vehicle.vehicleLicenseNumber || '',
      vehicleLicenseExpiry: vehicle.vehicleLicenseExpiry || '',
      status: vehicle.status || 'active',
      fuelType: vehicle.fuelType || 'petrol',
      maxFuelCapacity: vehicle.maxFuelCapacity || '',
      lastService: vehicle.lastService || '',
      nextService: vehicle.nextService || '',
      assignedDriver: vehicle.assignedDriver || '',
      vin: vehicle.vin || '',
      year: vehicle.year || '',
      color: vehicle.color || '',
      currentMileage: vehicle.currentMileage || '',
      nextServiceMileage: vehicle.nextServiceMileage || '',
      notes: vehicle.notes || '',
      insuranceExpiry: vehicle.insuranceExpiry || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await axios.delete(`${API_BASE_URL}/${id}`);
        fetchVehicles();
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
      dvla: '', // Changed from dvlaNumber to dvla
      vehicleLicenseNumber: '',
      vehicleLicenseExpiry: '',
      status: 'active',
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
  };

  const cancelEdit = () => {
    resetForm();
    setShowForm(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'maintenance': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-red-500/10 text-red-700 border-red-200';
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
      vehicle.dvla?.toLowerCase().includes(searchTerm.toLowerCase()) || // Changed from dvlaNumber to dvla
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
      matchesTab = vehicle.status === 'maintenance';
    }
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  const isAdmin = userRole === 'admin';

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    assigned: vehicles.filter(v => v.assignedDriver).length,
    expiring: vehicles.filter(v => getExpiryStatus(v.vehicleLicenseExpiry) === 'warning' || getExpiryStatus(v.vehicleLicenseExpiry) === 'critical').length,
    expired: vehicles.filter(v => getExpiryStatus(v.vehicleLicenseExpiry) === 'expired').length
  };

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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">Vehicle Fleet Management</h1>
                    <p className="text-blue-100 text-lg">Manage your entire vehicle fleet in one place</p>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => setShowForm(true)}
                      className="mt-6 md:mt-0 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
                    >
                      <span className="text-xl">+</span>
                      Add Vehicle
                    </button>
                  )}
                </div>
              </div>

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
                          <div className="text-sm text-gray-600">DVLA: {notification.dvla}</div> {/* Changed from dvlaNumber to dvla */}
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
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

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
                  {isAdmin && vehicles.length === 0 && (
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
                          {vehicle.status}
                        </span>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-sm">DVLA</span>
                          <span className="font-mono font-bold text-gray-800">{vehicle.dvla}</span> {/* Changed from dvlaNumber to dvla */}
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
                          {attachments.filter(att => att.vehicleId === vehicle.id).length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                              {attachments.filter(att => att.vehicleId === vehicle.id).length}
                            </span>
                          )}
                        </button>
                        
                        {isAdmin && (
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {viewingFile && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
                  {/* File viewer content */}
                </div>
              </div>
            )}

            {showAttachments && selectedVehicle && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
                  {/* Attachments modal content */}
                </div>
              </div>
            )}

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
                          value={vehicleForm.dvla} // Changed from dvlaNumber to dvla
                          onChange={(e) => setVehicleForm({...vehicleForm, dvla: e.target.value})} // Changed from dvlaNumber to dvla
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
                          <option value="active">Active</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="inactive">Inactive</option>
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
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.fullName}>
                              {driver.fullName}
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
        </div>
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