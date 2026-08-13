import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  FunnelIcon,
  UserIcon,
  UsersIcon,
  DocumentCheckIcon,
  UserPlusIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const PagePermissionManagement = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserAssignmentModal, setShowUserAssignmentModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedPageForUserAssignment, setSelectedPageForUserAssignment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');
  const [filterVisibility, setFilterVisibility] = useState('ALL');
  const [filterQuickAction, setFilterQuickAction] = useState('ALL');
  const [pageUserAssignments, setPageUserAssignments] = useState({});
  
  // Modules from backend
  const modules = [
    { value: 'ALL', label: 'All Modules' },
    { value: 'AUTH', label: 'Authentication' },
    { value: 'ATTENDANCE', label: 'Attendance' },
    { value: 'LEAVE', label: 'Leave Management' },
    { value: 'PAYROLL', label: 'Payroll' },
    { value: 'INVENTORY', label: 'Inventory' },
    { value: 'PROCUREMENT', label: 'Procurement' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'ADMIN', label: 'Administration' },
    { value: 'GENERAL', label: 'General' }
  ];

  // ========== Quick Action paths (matching EmployeeDashboard) ==========
  const quickActionPaths = [
    '/leaveRequestForm',
    '/inventoryRequest',
    '/overtime-request-form',   // <--- changed to match new path
    '/payslip',
    '/leave-balance'
  ];

  const isQuickAction = (path) => quickActionPaths.includes(path);

  const [newPage, setNewPage] = useState({
    name: '',
    path: '',
    description: '',
    iconName: '',
    displayOrder: 0,
    isPublic: false,
    module: 'GENERAL',
    requiresAuth: true,
    roleNames: []
  });

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    fetchPages();
    fetchRoles();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pages, searchTerm, filterModule, filterVisibility, filterQuickAction]);

  const fetchPages = async () => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPages(data);
        setFilteredPages(data);
        
        data.forEach(page => {
          fetchPageUserAssignments(page.id);
        });
      }
    } catch (err) {
      console.error('Fetch pages error:', err);
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
    }
  };

  const fetchAllUsers = async () => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/auth`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const fetchPageUserAssignments = async (pageId) => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userAssignments = await response.json();
        setPageUserAssignments(prev => ({
          ...prev,
          [pageId]: userAssignments
        }));
      }
    } catch (err) {
      console.error(`Fetch user assignments for page ${pageId} error:`, err);
    }
  };

  const applyFilters = () => {
    let filtered = [...pages];
    
    if (searchTerm) {
      filtered = filtered.filter(page =>
        page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.module?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterModule !== 'ALL') {
      filtered = filtered.filter(page => page.module === filterModule);
    }
    
    if (filterVisibility !== 'ALL') {
      if (filterVisibility === 'PUBLIC') {
        filtered = filtered.filter(page => page.isPublic);
      } else if (filterVisibility === 'PRIVATE') {
        filtered = filtered.filter(page => !page.isPublic);
      }
    }

    // Quick Action filter
    if (filterQuickAction === 'SHOW') {
      filtered = filtered.filter(page => isQuickAction(page.path));
    } else if (filterQuickAction === 'HIDE') {
      filtered = filtered.filter(page => !isQuickAction(page.path));
    }
    
    setFilteredPages(filtered);
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPage),
      });
      
      if (response.ok) {
        toast.success('Page created successfully');
        setShowCreateModal(false);
        setNewPage({
          name: '',
          path: '',
          description: '',
          iconName: '',
          displayOrder: 0,
          isPublic: false,
          module: 'GENERAL',
          requiresAuth: true,
          roleNames: []
        });
        fetchPages();
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to create page');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdatePage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${selectedPage.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedPage),
      });
      
      if (response.ok) {
        toast.success('Page updated successfully');
        setShowEditModal(false);
        setSelectedPage(null);
        fetchPages();
      } else {
        throw new Error('Failed to update page');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!await window.appConfirm('Are you sure you want to delete this page?')) return;
    
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        toast.success('Page deleted successfully');
        fetchPages();
      } else {
        throw new Error('Failed to delete page');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTogglePublic = async (pageId, isPublic) => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}/set-public`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(!isPublic),
      });
      
      if (response.ok) {
        toast.success(isPublic ? 'Page set to private' : 'Page set to public');
        fetchPages();
      } else {
        throw new Error('Failed to update page visibility');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (pageId, isActive) => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}/set-active`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(!isActive),
      });
      
      if (response.ok) {
        toast.success(isActive ? 'Page deactivated' : 'Page activated');
        fetchPages();
      } else {
        throw new Error('Failed to update page status');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAssignRole = async (pageId, roleName) => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}/assign-role/${roleName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        toast.success(`Role ${roleName} assigned`);
        fetchPages();
      } else {
        throw new Error('Failed to assign role');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveRole = async (pageId, roleName) => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}/remove-role/${roleName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        toast.success(`Role ${roleName} removed`);
        fetchPages();
      } else {
        throw new Error('Failed to remove role');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAssignUserToPage = async (pageId, userId) => {
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}/assign-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        toast.success('User assigned to page');
        fetchPageUserAssignments(pageId);
      } else {
        throw new Error('Failed to assign user to page');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveUserFromPage = async (pageId, userId) => {
    if (!userId) {
        toast.error('No user selected');
        return;
    }
    
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`${API_BASE_URL}/api/pages/${pageId}/remove-user/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            toast.success('User removed from page');
            fetchPageUserAssignments(pageId);
        } else {
            throw new Error('Failed to remove user from page');
        }
    } catch (err) {
        toast.error(err.message);
    }
  };

  const handleOpenUserAssignmentModal = (page) => {
    setSelectedPageForUserAssignment(page);
    fetchPageUserAssignments(page.id);
    setShowUserAssignmentModal(true);
  };

  const formatRoleForDisplay = (backendRole) => {
    if (!backendRole) return 'None';
    const roleWithoutPrefix = backendRole.replace('ROLE_', '');
    return roleWithoutPrefix
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getModuleBadgeColor = (module) => {
    const colors = {
      AUTH: 'bg-purple-100 text-purple-800',
      ATTENDANCE: 'bg-blue-100 text-blue-800',
      LEAVE: 'bg-green-100 text-green-800',
      PAYROLL: 'bg-yellow-100 text-yellow-800',
      INVENTORY: 'bg-orange-100 text-orange-800',
      PROCUREMENT: 'bg-red-100 text-red-800',
      TRANSPORT: 'bg-indigo-100 text-indigo-800',
      HR: 'bg-pink-100 text-pink-800',
      ADMIN: 'bg-gray-100 text-gray-800',
      GENERAL: 'bg-gray-100 text-gray-800'
    };
    return colors[module] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-700">Loading page permissions...</p>
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
          <p className="text-blue-200 text-sm">Page Permissions</p>
        </div>
        
        <nav className="space-y-2">
          <Link to="/centralizedDashboard" className="flex items-center gap-3 p-3 text-white hover:bg-blue-700 rounded-lg">
            <HomeIcon className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link to="/userpage" className="flex items-center gap-3 p-3 text-white hover:bg-blue-700 rounded-lg">
            <UserGroupIcon className="h-5 w-5" />
            <span>User Management</span>
          </Link>
          <div className="flex items-center gap-3 p-3 text-white bg-blue-700 rounded-lg">
            <LinkIcon className="h-5 w-5" />
            <span>Page Permissions</span>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Page Permission Management</h2>
                <p className="text-gray-500 mt-1">Manage access to all application pages (Roles & Users)</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {filteredPages.length} of {pages.length} pages
                </span>
                <button
                  onClick={() => fetchPages()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Refresh
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Page
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search pages by name, path, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {modules.map(module => (
                    <option key={module.value} value={module.value}>
                      {module.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <select
                  value={filterVisibility}
                  onChange={(e) => setFilterVisibility(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ALL">All Visibility</option>
                  <option value="PUBLIC">Public Only</option>
                  <option value="PRIVATE">Private Only</option>
                </select>
              </div>

              {/* Quick Action filter */}
              <div>
                <select
                  value={filterQuickAction}
                  onChange={(e) => setFilterQuickAction(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ALL">All Pages</option>
                  <option value="SHOW">Quick Actions Only</option>
                  <option value="HIDE">Exclude Quick Actions</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pages Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Roles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPages.map((page) => {
                  const userAssignments = pageUserAssignments[page.id] || [];
                  return (
                    <tr key={page.id} className={`hover:bg-gray-50 ${!page.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-gray-500 text-sm">{page.iconName?.charAt(0) || 'P'}</span>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{page.name}</span>
                                {isQuickAction(page.path) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                    </svg>
                                    Quick Action
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 font-mono">{page.path}</div>
                              {page.description && (
                                <div className="text-xs text-gray-400 mt-1">{page.description}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModuleBadgeColor(page.module)}`}>
                          {page.module}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleTogglePublic(page.id, page.isPublic)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                            page.isPublic 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {page.isPublic ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                          {page.isPublic ? 'Public' : 'Private'}
                        </button>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {page.roleNames && page.roleNames.map((roleName) => (
                              <div key={roleName} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                <ShieldCheckIcon className="h-3 w-3" />
                                {formatRoleForDisplay(roleName)}
                                <button
                                  onClick={() => handleRemoveRole(page.id, roleName)}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {(!page.roleNames || page.roleNames.length === 0) && !page.isPublic && (
                              <span className="text-xs text-gray-400">No roles assigned</span>
                            )}
                          </div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignRole(page.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                            disabled={page.isPublic}
                          >
                            <option value="">Add Role...</option>
                            {roles.map(role => (
                              <option key={role.name} value={role.name}>
                                {formatRoleForDisplay(role.name)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {userAssignments.length > 0 ? (
                              userAssignments.slice(0, 3).map(user => (
                                <div key={user.id} className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                                  <UserIcon className="h-3 w-3" />
                                  {user.username}
                                  <button
                                    onClick={() => handleRemoveUserFromPage(page.id, user.id)}
                                    className="text-purple-500 hover:text-purple-700"
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              ))
                            ) : !page.isPublic ? (
                              <span className="text-xs text-gray-400">No users assigned</span>
                            ) : null}
                            {userAssignments.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{userAssignments.length - 3} more
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleOpenUserAssignmentModal(page)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            disabled={page.isPublic}
                          >
                            <UserPlusIcon className="h-3 w-3" />
                            Manage Users
                          </button>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(page.id, page.isActive)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                            page.isActive 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {page.isActive ? (
                            <ArchiveBoxIcon className="h-4 w-4" />
                          ) : (
                            <ArchiveBoxXMarkIcon className="h-4 w-4" />
                          )}
                          {page.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPage(page);
                              setShowEditModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeletePage(page.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredPages.length === 0 && (
              <div className="text-center py-12">
                <FunnelIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pages found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Page</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleCreatePage} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Page Name *</label>
                      <input
                        type="text"
                        value={newPage.name}
                        onChange={(e) => setNewPage({...newPage, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Path *</label>
                      <input
                        type="text"
                        value={newPage.path}
                        onChange={(e) => setNewPage({...newPage, path: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="/example-page"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newPage.description}
                      onChange={(e) => setNewPage({...newPage, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Icon Name</label>
                      <input
                        type="text"
                        value={newPage.iconName}
                        onChange={(e) => setNewPage({...newPage, iconName: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="CalendarCheck"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                      <select
                        value={newPage.module}
                        onChange={(e) => setNewPage({...newPage, module: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        {modules.filter(m => m.value !== 'ALL').map(module => (
                          <option key={module.value} value={module.value}>
                            {module.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                      <input
                        type="number"
                        value={newPage.displayOrder}
                        onChange={(e) => setNewPage({...newPage, displayOrder: parseInt(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPage.isPublic}
                        onChange={(e) => setNewPage({...newPage, isPublic: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Visible to all users (Public)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPage.requiresAuth}
                        onChange={(e) => setNewPage({...newPage, requiresAuth: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Requires authentication</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Roles (if not public)</label>
                    <div className="space-y-2">
                      {roles.map(role => (
                        <label key={role.name} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newPage.roleNames.includes(role.name)}
                            onChange={(e) => {
                              const updatedRoles = e.target.checked
                                ? [...newPage.roleNames, role.name]
                                : newPage.roleNames.filter(r => r !== role.name);
                              setNewPage({...newPage, roleNames: updatedRoles});
                            }}
                            className="mr-2"
                            disabled={newPage.isPublic}
                          />
                          <span className="text-sm text-gray-700">{formatRoleForDisplay(role.name)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Page
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedPage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Page: {selectedPage.name}</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleUpdatePage} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page Name *</label>
                    <input
                      type="text"
                      value={selectedPage.name}
                      onChange={(e) => setSelectedPage({...selectedPage, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Path *</label>
                    <input
                      type="text"
                      value={selectedPage.path}
                      onChange={(e) => setSelectedPage({...selectedPage, path: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={selectedPage.description}
                    onChange={(e) => setSelectedPage({...selectedPage, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="2"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon Name</label>
                    <input
                      type="text"
                      value={selectedPage.iconName}
                      onChange={(e) => setSelectedPage({...selectedPage, iconName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                    <select
                      value={selectedPage.module}
                      onChange={(e) => setSelectedPage({...selectedPage, module: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {modules.filter(m => m.value !== 'ALL').map(module => (
                        <option key={module.value} value={module.value}>
                          {module.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={selectedPage.displayOrder}
                      onChange={(e) => setSelectedPage({...selectedPage, displayOrder: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Page
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Assignment Modal */}
        {showUserAssignmentModal && selectedPageForUserAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Manage User Access: {selectedPageForUserAssignment.name}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Assign or remove individual user access to this page
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-600">Path:</span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedPageForUserAssignment.path}</code>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowUserAssignmentModal(false)} 
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Assigned Users */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                      <UsersIcon className="h-5 w-5 mr-2 text-green-600" />
                      Assigned Users
                      <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {(pageUserAssignments[selectedPageForUserAssignment.id] || []).length} users
                      </span>
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {(pageUserAssignments[selectedPageForUserAssignment.id] || []).length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                          <UserMinusIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No users assigned to this page</p>
                        </div>
                      ) : (
                        (pageUserAssignments[selectedPageForUserAssignment.id] || []).map(user => (
                          <div 
                            key={user.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-100"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{user.name || user.username}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                                {user.role && (
                                  <div className="text-xs text-gray-400">
                                    Role: {formatRoleForDisplay(user.role.name)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveUserFromPage(selectedPageForUserAssignment.id, user.id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove user from page"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Available Users */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                      <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Available Users
                      <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {users.length} total users
                      </span>
                    </h4>
                    
                    <div className="mb-4">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search users by name, username, or email..."
                          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onChange={(e) => {
                            // Simple client-side filtering can be added here
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {users
                        .filter(user => {
                          const assignedUsers = pageUserAssignments[selectedPageForUserAssignment.id] || [];
                          return !assignedUsers.some(assigned => assigned.id === user.id);
                        })
                        .map(user => (
                          <div 
                            key={user.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-100"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{user.name || user.username}</div>
                                <div className="text-xs text-gray-500">
                                  {user.email} • {formatRoleForDisplay(user.role?.name || 'No Role')}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Status: {user.enabled ? 
                                    <span className="text-green-600">Active</span> : 
                                    <span className="text-red-600">Disabled</span>
                                  }
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAssignUserToPage(selectedPageForUserAssignment.id, user.id)}
                              className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg flex items-center gap-2 transition-colors"
                              title="Assign user to page"
                            >
                              <DocumentCheckIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">Assign</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowUserAssignmentModal(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PagePermissionManagement;