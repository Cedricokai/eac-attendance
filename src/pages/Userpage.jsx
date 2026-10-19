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
  LinkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Userpage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [tempRole, setTempRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [allRoles, setAllRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [deletingRoles, setDeletingRoles] = useState([]);
  const [showAllRoles, setShowAllRoles] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // --- NEW: Bulk selection state ---
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    console.log("🖥️ Current hostname:", hostname);
    console.log("🔌 Current port:", port);

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🏠 Using LOCALHOST API URL");
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      console.log("🏠 Using LAN API URL");
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      console.log("🌐 Using PUBLIC API URL");
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    console.log("🌍 Using PUBLIC API URL (fallback)");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const [createUserData, setCreateUserData] = useState({
    name: '',
    userName: '',
    email: '',
    password: '',
    mobile: '',
    role: 'ROLE_CUSTOMER'
  });

  useEffect(() => {
    fetchUsers();
    fetchAllRoles();
  }, []);

  // --- NEW: Clear selection when search or filter changes ---
  useEffect(() => {
    setSelectedUsers([]);
  }, [searchTerm, statusFilter]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('jwtToken');

    if (!token) {
      setError('No token found - Please login again');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();

      const usersWithDisplayRoles = data.map(user => ({
        ...user,
        displayRole: formatRoleForDisplay(user.role)
      }));

      setUsers(usersWithDisplayRoles);
    } catch (err) {
      console.error('Fetch error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRoles = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const roles = await response.json();
        setAllRoles(roles);
        const roleNames = roles.map(role => role.name);
        setAllRoles(roles);
      } else {
        const defaultRoles = [
          { id: 1, name: 'ROLE_ADMIN', system: true },
          { id: 2, name: 'ROLE_HR', system: true },
          { id: 3, name: 'ROLE_CUSTOMER', system: true },
          { id: 4, name: 'ROLE_INVENTORY', system: true },
          { id: 5, name: 'ROLE_SUPERVISOR', system: true },
          { id: 6, name: 'ROLE_PLANNER', system: true },
          { id: 7, name: 'ROLE_PROCUREMENT_OFFICER', system: true },
          { id: 8, name: 'ROLE_TRANSPORT', system: true },
        ];
        setAllRoles(defaultRoles);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      const defaultRoles = [
        { id: 1, name: 'ROLE_ADMIN', system: true },
        { id: 2, name: 'ROLE_HR', system: true },
        { id: 3, name: 'ROLE_CUSTOMER', system: true },
        { id: 4, name: 'ROLE_INVENTORY', system: true },
        { id: 5, name: 'ROLE_SUPERVISOR', system: true },
        { id: 6, name: 'ROLE_PLANNER', system: true },
        { id: 7, name: 'ROLE_PROCUREMENT_OFFICER', system: true },
        { id: 8, name: 'ROLE_TRANSPORT', system: true },
      ];
      setAllRoles(defaultRoles);
    }
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

  const formatDisplayToBackend = (displayRole) => {
    if (displayRole === 'None') return null;
    const roleName = displayRole
      .toUpperCase()
      .replace(/\s+/g, '_');
    return roleName.startsWith('ROLE_') ? roleName : `ROLE_${roleName}`;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createUserData,
          role: createUserData.role
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      await response.json();
      toast.success('User created successfully!');
      setShowCreateModal(false);
      setCreateUserData({
        name: '',
        userName: '',
        email: '',
        password: '',
        mobile: '',
        role: 'ROLE_CUSTOMER'
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCreateUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSetPasswordClick = (user) => {
    setSelectedUser(user);
    setPasswordData({
      password: '',
      confirmPassword: ''
    });
    setShowPasswordModal(true);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');

    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.password.length < 4) {
      toast.error('Password must be at least 4 characters long');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${selectedUser.id}/password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: passwordData.password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update password');
      }

      await response.json();
      toast.success('Password set successfully!');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setPasswordData({
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const token = localStorage.getItem('jwtToken');
    setTogglingUserId(user.id);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${user.id}/toggle-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle user status');
      }

      const result = await response.json();
      toast.success(result.message);

      setUsers(users.map(u =>
        u.id === user.id ? { ...u, enabled: !u.enabled } : u
      ));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setTempRole(user.displayRole || 'None');
  };

  const handleRoleChange = (e) => {
    setTempRole(e.target.value);
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setTempRole('');
  };

  const handleSave = async (userId) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const backendRole = formatDisplayToBackend(tempRole);

      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: backendRole }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await response.json();

      setUsers(users.map(user =>
        user.id === userId ? {
          ...user,
          role: { name: backendRole },
          displayRole: tempRole
        } : user
      ));

      toast.success('Role updated successfully!');
      setEditingUserId(null);
    } catch (err) {
      console.error('Update failed:', err);
      toast.error(err.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateNewRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create role');
      }

      await response.json();
      toast.success(`Role "${newRoleName}" created successfully!`);
      fetchAllRoles();
      setNewRoleName('');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    const role = allRoles.find(r => r.id === roleId);
    if (role && role.system) {
      toast.error('Cannot delete system role');
      return;
    }

    const usersWithRole = users.filter(user =>
      user.role?.name === roleName || user.displayRole === formatRoleForDisplay(roleName)
    );
    if (usersWithRole.length > 0) {
      toast.error(`Cannot delete role "${roleName}" - ${usersWithRole.length} user(s) assigned to it`);
      return;
    }

    if (!await window.appConfirm(`Are you sure you want to delete the role "${formatRoleForDisplay(roleName)}"?`)) {
      return;
    }

    setDeletingRoles([...deletingRoles, roleId]);
    const token = localStorage.getItem('jwtToken');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete role');
      }

      toast.success(`Role "${formatRoleForDisplay(roleName)}" deleted successfully!`);
      fetchAllRoles();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingRoles(deletingRoles.filter(id => id !== roleId));
    }
  };

  const getAvailableRoles = () => {
    return ['None', ...allRoles.map(role => formatRoleForDisplay(role.name))];
  };

  const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

  const matchesSearch = (user, term) => {
    const t = normalize(term);
    if (!t) return true;

    const haystack = [
      user.id,
      user.name,
      user.userName,
      user.email,
      user.mobile,
      user.displayRole,
      user.enabled ? "enabled" : "disabled",
      user.role?.name,
    ]
      .map(normalize)
      .join(" ");

    return haystack.includes(t);
  };

  const matchesStatus = (user, filter) => {
    if (filter === "ALL") return true;
    if (filter === "ENABLED") return Boolean(user.enabled);
    if (filter === "DISABLED") return !user.enabled;
    return true;
  };

  const filteredUsers = users.filter((u) => matchesStatus(u, statusFilter) && matchesSearch(u, searchTerm));

  // --- NEW: Bulk selection handlers ---
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleBulkToggle = async (enable) => {
    if (selectedUsers.length === 0) {
      toast.warn('No users selected');
      return;
    }
    setIsBulkUpdating(true);
    const token = localStorage.getItem('jwtToken');
    let successCount = 0;
    let failCount = 0;
    const failedUsers = [];

    for (const userId of selectedUsers) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/toggle-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to toggle user ${userId}`);
        }
        successCount++;
      } catch (err) {
        failCount++;
        failedUsers.push(userId);
      }
    }

    // Update local state for all successfully toggled users
    if (successCount > 0) {
      setUsers(prevUsers =>
        prevUsers.map(user =>
          selectedUsers.includes(user.id) && !failedUsers.includes(user.id)
            ? { ...user, enabled: enable }
            : user
        )
      );
      toast.success(`${successCount} user(s) ${enable ? 'enabled' : 'disabled'} successfully.`);
    }
    if (failCount > 0) {
      toast.error(`Failed to ${enable ? 'enable' : 'disable'} ${failCount} user(s).`);
    }
    setSelectedUsers([]);
    setIsBulkUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-700">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 max-w-md bg-red-50 rounded-lg">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-red-800">Error loading data</h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-gradient-to-b from-blue-600 to-blue-800 p-4 shadow-lg">
        <div className="mb-8 p-4">
          <h1 className="text-white text-2xl font-bold">Admin Portal</h1>
          <p className="text-blue-200 text-sm">User Management</p>
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

          <div className="flex items-center gap-3 p-3 text-white bg-blue-700 rounded-lg">
            <UserGroupIcon className="h-5 w-5" />
            <span>Users</span>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">User Management</h2>
                <div className="text-sm text-gray-500 mt-1">
                  {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"} found
                  {searchTerm.trim() || statusFilter !== "ALL" ? (
                    <span className="text-gray-400"> (filtered from {users.length})</span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                {/* Search and filters remain unchanged */}
                <div className="relative w-72">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, username, email, role..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <EyeIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  title="Filter by status"
                >
                  <option value="ALL">All</option>
                  <option value="ENABLED">Enabled</option>
                  <option value="DISABLED">Disabled</option>
                </select>

                {/* --- NEW: Bulk action buttons --- */}
                {selectedUsers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 mr-1">
                      {selectedUsers.length} selected
                    </span>
                    <button
                      onClick={() => handleBulkToggle(true)}
                      disabled={isBulkUpdating}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Enable
                    </button>
                    <button
                      onClick={() => handleBulkToggle(false)}
                      disabled={isBulkUpdating}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Disable
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      disabled={isBulkUpdating}
                      className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setShowAllRoles(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  View All Roles
                </button>

                <button
                  onClick={() => navigate('/pagePermissionManagement')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <LinkIcon className="h-5 w-5" />
                  Page Permissions
                </button>

                <button
                  onClick={() => setShowRoleManagement(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                  Manage Roles
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlusIcon className="h-5 w-5" />
                  Create User
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* --- NEW: Checkbox column header --- */}
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                      onChange={handleSelectAll}
                      disabled={isBulkUpdating}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                      {users.length === 0 ? "No users found in the system" : "No users match your search/filter"}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      {/* --- NEW: Checkbox cell --- */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          disabled={isBulkUpdating}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        <div className="flex items-center">
                          <UsersIcon className="h-4 w-4 mr-2" />
                          {user.userName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-2" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        <div className="flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          {user.mobile || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={togglingUserId === user.id || isBulkUpdating}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${user.enabled ? 'bg-green-600' : 'bg-gray-200'} ${togglingUserId === user.id || isBulkUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                          {togglingUserId === user.id && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ArrowPathIcon className="h-3 w-3 text-gray-400 animate-spin" />
                            </div>
                          )}
                        </button>
                        <span className={`ml-2 text-xs font-medium ${user.enabled ? 'text-green-600' : 'text-red-600'}`}>
                          {user.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUserId === user.id ? (
                          <select
                            value={tempRole}
                            onChange={handleRoleChange}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            {getAvailableRoles().map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                            <span className={`text-sm px-2 py-1 rounded-full ${user.displayRole === 'Admin' ? 'bg-purple-100 text-purple-800' : user.displayRole === 'Customer' ? 'bg-blue-100 text-blue-800' : user.displayRole === 'Hr' ? 'bg-green-100 text-green-800' : user.displayRole === 'Inventory' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                              {user.displayRole || 'None'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          {editingUserId === user.id ? (
                            <>
                              <button
                                onClick={() => handleSave(user.id)}
                                disabled={isUpdating}
                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckIcon className="h-4 w-4 mr-1" />
                                {isUpdating ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancel}
                                className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                              >
                                <XMarkIcon className="h-4 w-4 mr-1" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditClick(user)}
                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                              >
                                <PencilIcon className="h-4 w-4 mr-1" />
                                Edit Role
                              </button>
                              <button
                                onClick={() => handleSetPasswordClick(user)}
                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                              >
                                <KeyIcon className="h-4 w-4 mr-1" />
                                Set Password
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal - unchanged */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={createUserData.name}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    name="userName"
                    value={createUserData.userName}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={createUserData.email}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={createUserData.password}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={createUserData.mobile}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    name="role"
                    value={createUserData.role}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {allRoles
                      .filter(role => role.name !== 'ROLE_NONE')
                      .map(role => (
                        <option key={role.name} value={role.name}>
                          {formatRoleForDisplay(role.name)}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Set Password Modal - unchanged */}
        {showPasswordModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Set Password for {selectedUser.name}
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={passwordData.password}
                      onChange={handlePasswordInputChange}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Set Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Role Management Modal - unchanged */}
        {showRoleManagement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Role Management</h3>
                  <p className="text-sm text-gray-500 mt-1">Create, view, and manage system roles</p>
                </div>
                <button
                  onClick={() => setShowRoleManagement(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-8">
                <h4 className="text-lg font-medium text-gray-700 mb-4">Create New Role</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Enter new role name (e.g., Auditor)"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleCreateNewRole}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Role
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-700">Existing Roles</h4>
                  <span className="text-sm text-gray-500">
                    {allRoles.length} roles total
                  </span>
                </div>
                <div className="space-y-3">
                  {allRoles.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No roles found</p>
                  ) : (
                    allRoles.map((role) => {
                      const usersWithRole = users.filter(user =>
                        user.role?.name === role.name ||
                        user.displayRole === formatRoleForDisplay(role.name)
                      );
                      return (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${role.system ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                              <ShieldCheckIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {formatRoleForDisplay(role.name)}
                                {role.system && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    System
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {role.name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600">
                              {usersWithRole.length} user(s)
                            </div>
                            <button
                              onClick={() => handleDeleteRole(role.id, role.name)}
                              disabled={deletingRoles.includes(role.id) || role.system}
                              className={`flex items-center gap-2 px-3 py-1 rounded-md transition-colors ${deletingRoles.includes(role.id) || role.system
                                ? 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-500'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                            >
                              {deletingRoles.includes(role.id) ? (
                                <>
                                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <TrashIcon className="h-4 w-4" />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowRoleManagement(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View All Roles Modal - unchanged */}
        {showAllRoles && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">All Available Roles</h3>
                  <p className="text-sm text-gray-500 mt-1">View all roles in the system and their usage</p>
                </div>
                <button
                  onClick={() => setShowAllRoles(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allRoles.map((role) => {
                  const usersWithRole = users.filter(user =>
                    user.role?.name === role.name || user.displayRole === formatRoleForDisplay(role.name)
                  );
                  return (
                    <div
                      key={role.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${role.name === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-600' :
                            role.name === 'ROLE_CUSTOMER' ? 'bg-blue-100 text-blue-600' :
                              role.system ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                            <ShieldCheckIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {formatRoleForDisplay(role.name)}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {role.name}
                            </p>
                          </div>
                        </div>
                        {role.system && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            System Role
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <UsersIcon className="h-4 w-4 mr-2" />
                          <span>
                            {usersWithRole.length} user{usersWithRole.length !== 1 ? 's' : ''} assigned
                          </span>
                        </div>

                        {usersWithRole.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Users with this role:</h5>
                            <div className="space-y-2">
                              {usersWithRole.slice(0, 3).map(user => (
                                <div key={user.id} className="flex items-center text-sm">
                                  <UserCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600">{user.name}</span>
                                  <span className="text-gray-400 ml-2">({user.userName})</span>
                                </div>
                              ))}
                              {usersWithRole.length > 3 && (
                                <div className="text-sm text-gray-500">
                                  + {usersWithRole.length - 3} more user{usersWithRole.length - 3 > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {allRoles.length} role{allRoles.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowRoleManagement(true)}
                      className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Manage Roles
                    </button>
                    <button
                      onClick={() => setShowAllRoles(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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

export default Userpage;