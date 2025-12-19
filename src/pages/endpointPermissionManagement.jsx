import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HomeIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  UserPlusIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  TrashIcon,
  Cog6ToothIcon,
  UsersIcon,
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  LockClosedIcon,
  LinkIcon,
  ServerStackIcon,
  UserIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EndpointPermissionManagement = () => {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [assignType, setAssignType] = useState('role');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [allEndpoints, setAllEndpoints] = useState([]);
  const [showEndpointsDropdown, setShowEndpointsDropdown] = useState(false);
  
  const [newPermission, setNewPermission] = useState({
    httpMethod: 'GET',
    endpointPattern: '',
    description: ''
  });

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
  };

  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    fetchPermissions();
    fetchRoles();
    fetchUsers();
    loadAllEndpointsFromConfig();
  }, []);

  // Hardcoded list of all endpoints from your SecurityConfig.java
  const loadAllEndpointsFromConfig = () => {
    const endpoints = [
      // ========== AUTH ENDPOINTS ==========
      { method: 'GET', pattern: '/auth/**', description: 'Auth endpoints (public)' },
      { method: 'POST', pattern: '/auth/**', description: 'Auth endpoints (public)' },
      { method: 'GET', pattern: '/auth/signin', description: 'Login page' },
      { method: 'POST', pattern: '/auth/signin', description: 'Login action' },
      { method: 'POST', pattern: '/auth/signup', description: 'User registration' },
      { method: 'GET', pattern: '/auth/me', description: 'Get current user info' },
      { method: 'POST', pattern: '/auth/logout', description: 'Logout user' },
      { method: 'GET', pattern: '/auth/roles', description: 'Get all roles (Admin only)' },
      { method: 'POST', pattern: '/auth/roles', description: 'Create role (Admin only)' },
      { method: 'DELETE', pattern: '/auth/roles/**', description: 'Delete role (Admin only)' },
      { method: 'GET', pattern: '/auth/admin/**', description: 'Admin endpoints' },
      { method: 'GET', pattern: '/auth/users/**', description: 'User management (Admin only)' },
      { method: 'POST', pattern: '/auth/users/**/password', description: 'Set user password (Admin only)' },
      { method: 'POST', pattern: '/auth/users/**/toggle-status', description: 'Toggle user status (Admin only)' },

      // ========== PRODUCT ENDPOINTS ==========
      { method: 'GET', pattern: '/api/products', description: 'Get all products' },
      { method: 'GET', pattern: '/api/products/{id}', description: 'Get product by ID' },
      { method: 'GET', pattern: '/api/products/search', description: 'Search products' },
      { method: 'GET', pattern: '/api/products/{id}/stock', description: 'Get product stock' },
      { method: 'POST', pattern: '/api/products', description: 'Create product' },
      { method: 'PUT', pattern: '/api/products/{id}', description: 'Update product' },
      { method: 'DELETE', pattern: '/api/products/{id}', description: 'Delete product' },

      // ========== MOVEMENT ENDPOINTS ==========
      { method: 'POST', pattern: '/api/movement/move-products', description: 'Move products between locations' },
      { method: 'POST', pattern: '/api/movement/preview-move', description: 'Preview product movement' },

      // ========== OUTGOING ENDPOINTS ==========
      { method: 'GET', pattern: '/api/outgoing', description: 'Get outgoing transactions' },
      { method: 'POST', pattern: '/api/outgoing', description: 'Create outgoing transaction' },

      // ========== INVENTORY REQUEST ENDPOINTS ==========
      { method: 'GET', pattern: '/api/inventory-requests', description: 'Get all inventory requests' },
      { method: 'POST', pattern: '/api/inventory-requests', description: 'Create inventory request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/planner-approve', description: 'Planner approve request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/planner-reject', description: 'Planner reject request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/procurement-approve', description: 'Procurement approve request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/procurement-reject', description: 'Procurement reject request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/store-approve', description: 'Store approve request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/store-reject', description: 'Store reject request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/receive', description: 'Receive inventory' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/issue', description: 'Issue inventory' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/reject', description: 'Reject request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}/approve', description: 'Approve request' },
      { method: 'PUT', pattern: '/api/inventory-requests/{id}', description: 'Update inventory request' },
      { method: 'DELETE', pattern: '/api/inventory-requests/{id}', description: 'Delete inventory request' },
      { method: 'POST', pattern: '/api/inventory-requests/{id}/send-to-procurement', description: 'Send to procurement' },
      { method: 'POST', pattern: '/api/inventory-requests/{id}/send-to-store', description: 'Send to store' },
      { method: 'GET', pattern: '/api/inventory-requests/my-requests', description: 'Get my requests' },
      { method: 'GET', pattern: '/api/inventory-requests/pending', description: 'Get pending requests' },
      { method: 'GET', pattern: '/api/inventory-requests/for-planner', description: 'Get requests for planner' },
      { method: 'GET', pattern: '/api/inventory-requests/for-procurement', description: 'Get requests for procurement' },
      { method: 'GET', pattern: '/api/inventory-requests/for-store', description: 'Get requests for store' },
      { method: 'GET', pattern: '/api/inventory-requests/procured', description: 'Get procured requests' },
      { method: 'GET', pattern: '/api/inventory-requests/issued', description: 'Get issued requests' },
      { method: 'GET', pattern: '/api/inventory-requests/by-user/{username}', description: 'Get requests by user' },

      // ========== PPE ENDPOINTS ==========
      { method: 'GET', pattern: '/api/ppe', description: 'Get all PPE items' },
      { method: 'POST', pattern: '/api/ppe', description: 'Create PPE item' },
      { method: 'PUT', pattern: '/api/ppe/{id}', description: 'Update PPE item' },
      { method: 'DELETE', pattern: '/api/ppe/{id}', description: 'Delete PPE item' },

      // ========== SETTINGS ENDPOINTS ==========
      { method: 'GET', pattern: '/api/settings/**', description: 'Get settings' },
      { method: 'POST', pattern: '/api/settings/**', description: 'Create setting' },
      { method: 'PUT', pattern: '/api/settings/**', description: 'Update setting' },
      { method: 'DELETE', pattern: '/api/settings/**', description: 'Delete setting' },

      // ========== ASSET ENDPOINTS ==========
      { method: 'GET', pattern: '/api/assets/**', description: 'Asset management' },
      { method: 'POST', pattern: '/api/assets/**', description: 'Asset management' },
      { method: 'PUT', pattern: '/api/assets/**', description: 'Asset management' },
      { method: 'DELETE', pattern: '/api/assets/**', description: 'Asset management' },

      // ========== EMPLOYEE ENDPOINTS ==========
      { method: 'GET', pattern: '/api/employee/**', description: 'Employee management' },
      { method: 'POST', pattern: '/api/employee/**', description: 'Employee management' },
      { method: 'PUT', pattern: '/api/employee/**', description: 'Employee management' },
      { method: 'DELETE', pattern: '/api/employee/**', description: 'Employee management' },

      // ========== ATTENDANCE ENDPOINTS ==========
      { method: 'GET', pattern: '/api/attendance/**', description: 'Attendance management' },
      { method: 'POST', pattern: '/api/attendance/**', description: 'Attendance management' },
      { method: 'PUT', pattern: '/api/attendance/**', description: 'Attendance management' },
      { method: 'DELETE', pattern: '/api/attendance/**', description: 'Attendance management' },

      // ========== HOLIDAY ENDPOINTS ==========
      { method: 'GET', pattern: '/api/holiday/**', description: 'Holiday management' },
      { method: 'POST', pattern: '/api/holiday/**', description: 'Holiday management' },
      { method: 'PUT', pattern: '/api/holiday/**', description: 'Holiday management' },
      { method: 'DELETE', pattern: '/api/holiday/**', description: 'Holiday management' },

      // ========== LEAVE ENDPOINTS ==========
      { method: 'GET', pattern: '/api/leave/**', description: 'Leave management (public)' },
      { method: 'POST', pattern: '/api/leave/**', description: 'Leave management (public)' },
      { method: 'PUT', pattern: '/api/leave/**', description: 'Leave management (public)' },
      { method: 'DELETE', pattern: '/api/leave/**', description: 'Leave management (public)' },

      // ========== OVERTIME ENDPOINTS ==========
      { method: 'GET', pattern: '/api/overtime/**', description: 'Overtime management' },
      { method: 'POST', pattern: '/api/overtime/**', description: 'Overtime management' },
      { method: 'PUT', pattern: '/api/overtime/**', description: 'Overtime management' },
      { method: 'DELETE', pattern: '/api/overtime/**', description: 'Overtime management' },

      // ========== PAYROLL ENDPOINTS ==========
      { method: 'GET', pattern: '/api/payroll/**', description: 'Payroll management' },
      { method: 'POST', pattern: '/api/payroll/**', description: 'Payroll management' },
      { method: 'PUT', pattern: '/api/payroll/**', description: 'Payroll management' },
      { method: 'DELETE', pattern: '/api/payroll/**', description: 'Payroll management' },

      // ========== JOB ENDPOINTS ==========
      { method: 'GET', pattern: '/api/jobs', description: 'Get all jobs' },
      { method: 'GET', pattern: '/api/jobs/**', description: 'Get job details' },
      { method: 'POST', pattern: '/api/jobs', description: 'Create job' },
      { method: 'POST', pattern: '/api/jobs/**', description: 'Job operations' },
      { method: 'PUT', pattern: '/api/jobs/**', description: 'Update job' },
      { method: 'DELETE', pattern: '/api/jobs/**', description: 'Delete job' },
      { method: 'PATCH', pattern: '/api/jobs/**', description: 'Partial update job' },
      { method: 'GET', pattern: '/api/jobs/*/products', description: 'Get job products' },
      { method: 'POST', pattern: '/api/jobs/*/products', description: 'Add job product' },
      { method: 'DELETE', pattern: '/api/jobs/products/**', description: 'Remove job product' },

      // ========== COST CENTER ENDPOINTS ==========
      { method: 'GET', pattern: '/api/cost-centers/job/*', description: 'Get job cost centers' },
      { method: 'GET', pattern: '/api/cost-centers/*/transactions', description: 'Get cost center transactions' },
      { method: 'GET', pattern: '/api/cost-centers/job/*/transactions', description: 'Get job cost center transactions' },
      { method: 'GET', pattern: '/api/cost-centers/job/*/total-spent', description: 'Get job total spent' },
      { method: 'PUT', pattern: '/api/cost-centers/*/budget', description: 'Update cost center budget' },
      { method: 'POST', pattern: '/api/cost-centers/*/manual-transaction', description: 'Add manual transaction' },

      // ========== TRANSPORT ENDPOINTS ==========
// Attachments Controller
{ method: 'POST', pattern: '/api/attachments/upload', description: 'Upload files for vehicle' },
{ method: 'GET', pattern: '/api/attachments/vehicle/{vehicleId}', description: 'Get vehicle attachments' },
{ method: 'GET', pattern: '/api/attachments/download/{attachmentId}', description: 'Download attachment file' },
{ method: 'GET', pattern: '/api/attachments/view/{attachmentId}', description: 'View attachment file' },
{ method: 'DELETE', pattern: '/api/attachments/{attachmentId}', description: 'Delete attachment' },

// Drivers Controller
{ method: 'POST', pattern: '/api/drivers', description: 'Create driver' },
{ method: 'GET', pattern: '/api/drivers', description: 'Get all drivers' },
{ method: 'GET', pattern: '/api/drivers/{id}', description: 'Get driver by ID' },
{ method: 'PUT', pattern: '/api/drivers/{id}', description: 'Update driver' },
{ method: 'DELETE', pattern: '/api/drivers/{id}', description: 'Delete driver' },

// Fuel Controller
{ method: 'POST', pattern: '/api/fuel', description: 'Create fuel entry' },
{ method: 'GET', pattern: '/api/fuel', description: 'Get all fuel entries' },
{ method: 'GET', pattern: '/api/fuel/{id}', description: 'Get fuel entry by ID' },
{ method: 'PUT', pattern: '/api/fuel/{id}', description: 'Update fuel entry' },
{ method: 'DELETE', pattern: '/api/fuel/{id}', description: 'Delete fuel entry' },
{ method: 'GET', pattern: '/api/fuel/vehicle/{vehicle}', description: 'Get fuel entries by vehicle' },
{ method: 'GET', pattern: '/api/fuel/driver/{driver}', description: 'Get fuel entries by driver' },
{ method: 'GET', pattern: '/api/fuel/total-cost', description: 'Get total fuel cost' },
{ method: 'GET', pattern: '/api/fuel/total-liters', description: 'Get total liters' },

// Users Controller (Transport)
{ method: 'POST', pattern: '/api/users', description: 'Create transport user' },
{ method: 'GET', pattern: '/api/users', description: 'Get all transport users' },
{ method: 'GET', pattern: '/api/users/{id}', description: 'Get transport user by ID' },
{ method: 'PUT', pattern: '/api/users/{id}', description: 'Update transport user' },
{ method: 'DELETE', pattern: '/api/users/{id}', description: 'Delete transport user' },

      // ========== TEST ENDPOINTS ==========
      { method: 'GET', pattern: '/api/test/**', description: 'Test endpoints (public)' },
      { method: 'POST', pattern: '/api/test/**', description: 'Test endpoints (public)' },
      { method: 'PUT', pattern: '/api/test/**', description: 'Test endpoints (public)' },
      { method: 'DELETE', pattern: '/api/test/**', description: 'Test endpoints (public)' },

      // ========== ERROR ENDPOINT ==========
      { method: 'GET', pattern: '/error', description: 'Error endpoint (public)' },
      { method: 'POST', pattern: '/error', description: 'Error endpoint (public)' },
    ];

    setAllEndpoints(endpoints);
  };

  // In your fetchPermissions function:
const fetchPermissions = async () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) {
    setError('No token found. Please login again.');
    setLoading(false);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/endpoint-permissions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        setPermissions([]);
      } else {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
    } else {
      const data = await response.json();
      if (Array.isArray(data)) {
        // Convert DTO to frontend format
        const formattedPermissions = data.map(permission => ({
          id: permission.id,
          httpMethod: permission.httpMethod,
          endpointPattern: permission.endpointPattern,
          description: permission.description,
          enabled: permission.enabled,
          // Convert role names to role objects
          roles: permission.roleNames ? permission.roleNames.map(name => ({ 
            id: 0, // placeholder, you might want to fetch actual IDs
            name: name 
          })) : [],
          // Convert user names to user objects
          users: permission.userNames ? permission.userNames.map(name => ({
            id: 0, // placeholder
            userName: name
          })) : []
        }));
        setPermissions(formattedPermissions);
      } else {
        setPermissions([]);
      }
    }
  } catch (err) {
    console.error('Fetch permissions error:', err);
    setPermissions([]);
  } finally {
    setLoading(false);
  }
};

  const fetchRoles = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setRoles(data);
        } else {
          setRoles([]);
        }
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setRoles([]);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    }
  };

 const handleCreatePermission = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('jwtToken');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/endpoint-permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        httpMethod: newPermission.httpMethod,
        endpointPattern: newPermission.endpointPattern,
        description: newPermission.description
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      toast.success('Permission created successfully');
      setShowCreateModal(false);
      setNewPermission({
        httpMethod: 'GET',
        endpointPattern: '',
        description: ''
      });
      fetchPermissions();
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create permission');
    }
  } catch (err) {
    toast.error(err.message);
  }
};

  const handleAssignPermission = async () => {
    const token = localStorage.getItem('jwtToken');
    let url = '';
    
    if (assignType === 'role' && selectedRoleId) {
      url = `${API_BASE_URL}/api/endpoint-permissions/${selectedPermission.id}/assign-to-role/${selectedRoleId}`;
    } else if (assignType === 'user' && selectedUserId) {
      url = `${API_BASE_URL}/api/endpoint-permissions/${selectedPermission.id}/assign-to-user/${selectedUserId}`;
    } else {
      toast.error('Please select a role or user');
      return;
    }
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        toast.success('Permission assigned successfully');
        setShowAssignModal(false);
        setSelectedRoleId('');
        setSelectedUserId('');
        fetchPermissions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign permission');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveAssignment = async (permissionId, type, id) => {
    const token = localStorage.getItem('jwtToken');
    let url = '';
    
    if (type === 'role') {
      url = `${API_BASE_URL}/api/endpoint-permissions/${permissionId}/remove-from-role/${id}`;
    } else {
      url = `${API_BASE_URL}/api/endpoint-permissions/${permissionId}/remove-from-user/${id}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        toast.success('Assignment removed');
        fetchPermissions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove assignment');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSelectEndpoint = (endpoint) => {
    setNewPermission({
      ...newPermission,
      endpointPattern: endpoint.pattern,
      description: endpoint.description
    });
    setShowEndpointsDropdown(false);
  };

  // Ensure permissions is always an array before filtering
  const filteredPermissions = Array.isArray(permissions) 
    ? permissions.filter(permission => {
        if (!permission) return false;
        const endpointMatch = permission.endpointPattern 
          ? permission.endpointPattern.toLowerCase().includes(searchTerm.toLowerCase())
          : false;
        const descMatch = permission.description 
          ? permission.description.toLowerCase().includes(searchTerm.toLowerCase())
          : false;
        const methodMatch = permission.httpMethod 
          ? permission.httpMethod.toLowerCase().includes(searchTerm.toLowerCase())
          : false;
        return endpointMatch || descMatch || methodMatch;
      })
    : [];

  // Filter endpoints for dropdown search
  const filteredEndpoints = allEndpoints.filter(endpoint => 
    endpoint.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endpoint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endpoint.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-700">Loading endpoint permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-600 to-blue-800 p-4 shadow-lg">
        <div className="mb-8 p-4">
          <h1 className="text-white text-2xl font-bold">Admin Portal</h1>
          <p className="text-blue-200 text-sm">Endpoint Permissions</p>
        </div>
        
        <nav className="space-y-2">
          <Link 
            to="/centralizedDashboard" 
            className="flex items-center gap-3 p-3 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <HomeIcon className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>

          <Link 
            to="/History" 
            className="flex items-center gap-3 p-3 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <ClockIcon className="h-5 w-5" />
            <span>History</span>
          </Link>

          <Link 
            to="/userpage" 
            className="flex items-center gap-3 p-3 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <UserGroupIcon className="h-5 w-5" />
            <span>Users</span>
          </Link>

          <div className="flex items-center gap-3 p-3 text-white bg-blue-700 rounded-lg">
            <LinkIcon className="h-5 w-5" />
            <span>Endpoint Permissions</span>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Endpoint Permission Management</h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {Array.isArray(permissions) ? permissions.length : 0} permission{permissions.length !== 1 ? 's' : ''} found
                </div>
                <button
                  onClick={() => navigate('/userpage')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <UserGroupIcon className="h-5 w-5" />
                  User Management
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  New Permission
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-6 border-b border-gray-100">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* All Available Endpoints Section */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">All Available Endpoints</h3>
              <button
                onClick={() => setShowEndpointsDropdown(!showEndpointsDropdown)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                {showEndpointsDropdown ? 'Hide' : 'Show'} All Endpoints
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${showEndpointsDropdown ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {showEndpointsDropdown && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allEndpoints.map((endpoint, index) => (
                    <div 
                      key={index} 
                      className="bg-white p-3 rounded border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-colors cursor-pointer"
                      onClick={() => handleSelectEndpoint(endpoint)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                              endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                              endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {endpoint.method}
                            </span>
                          </div>
                          <div className="font-mono text-sm text-gray-900 truncate">
                            {endpoint.pattern}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {endpoint.description}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEndpoint(endpoint);
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-500 text-center">
                  Total: {allEndpoints.length} endpoints available
                </div>
              </div>
            )}
          </div>

          {/* Permissions Table */}
          <div className="overflow-x-auto">
            {filteredPermissions.length === 0 ? (
              <div className="text-center py-12">
                <ServerStackIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No permissions match your search' : 'No permissions configured yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm 
                    ? 'Try a different search term'
                    : 'Start by creating your first endpoint permission using the "New Permission" button'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Create First Permission
                  </button>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Roles</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Users</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPermissions.map((permission) => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          permission.httpMethod === 'GET' ? 'bg-green-100 text-green-800' :
                          permission.httpMethod === 'POST' ? 'bg-blue-100 text-blue-800' :
                          permission.httpMethod === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          permission.httpMethod === 'DELETE' ? 'bg-red-100 text-red-800' :
                          permission.httpMethod === 'PATCH' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {permission.httpMethod || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">
                        {permission.endpointPattern || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {permission.description || 'No description'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {permission.roles && Array.isArray(permission.roles) && permission.roles.length > 0 ? (
                            permission.roles.map((role) => (
                              <div key={role.id} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                <ShieldCheckIcon className="h-3 w-3" />
                                {role.name ? role.name.replace('ROLE_', '') : 'Unknown'}
                                <button
                                  onClick={() => handleRemoveAssignment(permission.id, 'role', role.id)}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {permission.users && Array.isArray(permission.users) && permission.users.length > 0 ? (
                            permission.users.map((user) => (
                              <div key={user.id} className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                                <UserIcon className="h-3 w-3" />
                                {user.userName || user.name || 'Unknown'}
                                <button
                                  onClick={() => handleRemoveAssignment(permission.id, 'user', user.id)}
                                  className="text-green-500 hover:text-green-700"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPermission(permission);
                              setShowAssignModal(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create Permission Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Create New Endpoint Permission</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreatePermission} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HTTP Method</label>
                  <select
                    value={newPermission.httpMethod}
                    onChange={(e) => setNewPermission({...newPermission, httpMethod: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint Pattern</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newPermission.endpointPattern}
                      onChange={(e) => setNewPermission({...newPermission, endpointPattern: e.target.value})}
                      placeholder="Select or type endpoint pattern"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowEndpointsDropdown(true)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <DocumentTextIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Use ** for wildcard (e.g., /api/products/**). Select from available endpoints above.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newPermission.description}
                    onChange={(e) => setNewPermission({...newPermission, description: e.target.value})}
                    placeholder="Enter description for this permission"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Permission
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Permission Modal */}
        {showAssignModal && selectedPermission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assign Permission: {selectedPermission.httpMethod} {selectedPermission.endpointPattern}
                </h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedPermission(null);
                    setSelectedRoleId('');
                    setSelectedUserId('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => {
                      setAssignType('role');
                      setSelectedUserId('');
                    }}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      assignType === 'role' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    To Role
                  </button>
                  <button
                    onClick={() => {
                      setAssignType('user');
                      setSelectedRoleId('');
                    }}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      assignType === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    To User
                  </button>
                </div>
                
                {assignType === 'role' ? (
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a role</option>
                    {Array.isArray(roles) && roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name ? role.name.replace('ROLE_', '') : 'Unknown'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a user</option>
                    {Array.isArray(users) && users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.userName})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedPermission(null);
                    setSelectedRoleId('');
                    setSelectedUserId('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignPermission}
                  disabled={assignType === 'role' ? !selectedRoleId : !selectedUserId}
                  className={`px-4 py-2 rounded-md ${
                    (assignType === 'role' ? !selectedRoleId : !selectedUserId)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EndpointPermissionManagement;