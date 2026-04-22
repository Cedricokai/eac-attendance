import React, { useEffect, useState } from "react";
import Sidebar from './Sidebar';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ 
    fullName: "", 
    userName: "", 
    email: "", 
    phone: "", 
    password: "", 
    role: "" 
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    drivers: 0,
    mechanics: 0,
    managers: 0,
    fuelOfficers: 0
  });
  const [authError, setAuthError] = useState("");

  // Get JWT token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("jwtToken") || localStorage.getItem("authToken");
  };

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

  // Fetch configuration helper
  const getFetchConfig = (method = 'GET', body = null) => {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      credentials: 'include'
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return config;
  };

  // Handle authentication error
  const handleAuthError = () => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    window.location.href = "/login";
  };

  // Fetch users with token
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setAuthError("");
    try {
      const token = getAuthToken();
      if (!token) {
        setAuthError("No authentication token found. Please login.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/users`, getFetchConfig());
      
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      const cleanUsers = data.map(u => ({
        id: u.id,
        fullName: u.fullName || "",
        userName: u.userName || "",
        email: u.email || "",
        phone: u.phone || "",
        role: u.role || "",
        password: u.password || "",
        status: u.status || "active",
        joinedDate: u.joinedDate || new Date().toISOString().split('T')[0]
      }));
      setUsers(cleanUsers);
      calculateStats(cleanUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      if (error.message.includes("401")) {
        setAuthError("Session expired. Please login again.");
      } else {
        setAuthError("Failed to load users. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (userList) => {
    setStats({
      total: userList.length,
      drivers: userList.filter(u => u.role === 'Driver').length,
      mechanics: userList.filter(u => u.role === 'Mechanic').length,
      managers: userList.filter(u => u.role === 'Manager').length,
      fuelOfficers: userList.filter(u => u.role === 'Fuel Officer').length,
    });
  };

  // Add / Update user with token
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!form.fullName || !form.userName || !form.role) {
      alert("Full name, username and role are required");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setAuthError("No authentication token found. Please login.");
      return;
    }

    try {
      if (editingId && editingId !== "new") {
        // Update user
        const response = await fetch(`${API_BASE_URL}/api/users/${editingId}`, getFetchConfig('PUT', form));
        
        if (response.status === 401 || response.status === 403) {
          setAuthError("You don't have permission to perform this action.");
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update user");
        }
        
        const data = await response.json();
        setUsers(users.map(u => (u.id === editingId ? data : u)));
        resetForm();
        fetchUsers();
      } else {
        // Create user
        const response = await fetch(`${API_BASE_URL}/api/users`, getFetchConfig('POST', form));
        
        if (response.status === 401 || response.status === 403) {
          setAuthError("You don't have permission to perform this action.");
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create user");
        }
        
        const data = await response.json();
        setUsers([...users, data]);
        resetForm();
        fetchUsers();
      }
    } catch (error) {
      console.error("Error saving user:", error);
      setAuthError(error.message || "Failed to save user");
    }
  };

  const resetForm = () => {
    setForm({ 
      fullName: "", 
      userName: "", 
      email: "", 
      phone: "", 
      password: "", 
      role: "" 
    });
    setEditingId(null);
    setAuthError("");
  };

  const handleEdit = (user) => {
    setForm(user);
    setEditingId(user.id);
  };

  const handleDelete = async (id) => {
    const token = getAuthToken();
    if (!token) {
      setAuthError("No authentication token found. Please login.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, getFetchConfig('DELETE'));
      
      if (response.status === 401 || response.status === 403) {
        setAuthError("You don't have permission to delete users.");
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      
      setUsers(users.filter(u => u.id !== id));
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setAuthError(error.message || "Failed to delete user");
    }
  };

  // Filter + Search
  const filteredUsers = users.filter(u => {
    const fullName = u.fullName || "";
    const userName = u.userName || "";
    const email = u.email || "";
    const phone = u.phone || "";
    const role = u.role || "";

    const matchSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      userName.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      phone.toLowerCase().includes(search.toLowerCase()) ||
      role.toLowerCase().includes(search.toLowerCase());

    const matchRole = filterRole === "all" || role === filterRole;

    return matchSearch && matchRole;
  });

  // Helper function to get user initial
  const getUserInitial = (user) => {
    if (!user || !user.fullName) return "?";
    return user.fullName.charAt(0).toUpperCase();
  };

  // Role badge color mapping
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Manager': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Driver': return 'bg-green-100 text-green-800 border-green-200';
      case 'Mechanic': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Fuel Officer': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Role icon mapping
  const getRoleIcon = (role) => {
    switch (role) {
      case 'Manager': return '👨‍💼';
      case 'Driver': return '🚚';
      case 'Mechanic': return '🔧';
      case 'Fuel Officer': return '⛽';
      default: return '👤';
    }
  };

  // Stats cards data
  const statCards = [
    { 
      label: "Total Users", 
      value: stats.total, 
      color: "bg-blue-500",
      trend: "+12%"
    },
    { 
      label: "Drivers", 
      value: stats.drivers, 
      color: "bg-green-500",
      trend: "+5%"
    },
    { 
      label: "Mechanics", 
      value: stats.mechanics, 
      color: "bg-yellow-500",
      trend: "+3%"
    },
    { 
      label: "Managers", 
      value: stats.managers, 
      color: "bg-purple-500",
      trend: "+8%"
    },
  ];

  // Add logout function
  const handleLogout = () => {
    handleAuthError();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <Sidebar />
        <div className="flex-1 p-6 flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h2>
                <p className="text-gray-600 mt-1">Manage all user accounts and permissions</p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Auth Status */}
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Authenticated</span>
                </div>
                
                <button
                  onClick={fetchUsers}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setEditingId("new")}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Add User</span>
                </button>
              </div>
            </div>

            {/* Authentication Error Alert */}
            {authError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-800 font-medium">{authError}</p>
                </div>
                {authError.includes("Session expired") && (
                  <p className="text-red-600 text-sm mt-1">Redirecting to login page...</p>
                )}
              </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <div className="flex items-end space-x-2 mt-2">
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                        <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                    <div className={`${stat.color} p-3 rounded-xl text-white`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.623a10.953 10.953 0 01-1.67.62 4.5 4.5 0 01-5.9-4.62M9 21v-1a6 6 0 00-6-6h-1" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="relative max-w-lg">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search users by name, email, phone, or role..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="all">All Roles</option>
                      <option value="Driver">Driver</option>
                      <option value="Mechanic">Mechanic</option>
                      <option value="Fuel Officer">Fuel Officer</option>
                      <option value="Manager">Manager</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <button className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.623a10.953 10.953 0 01-1.67.62 4.5 4.5 0 01-5.9-4.62M9 21v-1a6 6 0 00-6-6h-1" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {search ? "No matching users found" : "No users yet"}
                            </h3>
                            <p className="text-gray-500 mb-4 max-w-md">
                              {search 
                                ? "Try adjusting your search or filter to find what you're looking for."
                                : "Get started by adding your first user to the system."
                              }
                            </p>
                            {!search && (
                              <button
                                onClick={() => setEditingId("new")}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Add First User
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, index) => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {getUserInitial(u)}
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    {u.fullName}
                                  </h4>
                                  {u.status === 'active' && (
                                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-sm text-gray-500">@{u.userName}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-400">
                                    Joined {new Date(u.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>{u.email || 'No email'}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>{u.phone || 'No phone'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getRoleIcon(u.role)}</span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(u.role)}`}>
                                {u.role || "No Role"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              u.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {u.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(u)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(u)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
                                title="More actions"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                                {actionMenu === u.id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center">
                                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View Details
                                    </button>
                                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center">
                                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                      Reset Password
                                    </button>
                                  </div>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer */}
              {filteredUsers.length > 0 && (
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{filteredUsers.length}</span> of <span className="font-semibold">{users.length}</span> users
                  </p>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 transition-colors">
                      Previous
                    </button>
                    <button className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {(editingId === "new" || editingId) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingId === "new" ? "Create New User" : "Edit User"}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {editingId === "new" 
                      ? "Add a new user to the system" 
                      : "Update user information and permissions"
                    }
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Authentication Warning */}
              {!getAuthToken() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-yellow-800 font-medium">You are not authenticated</p>
                  </div>
                  <p className="text-yellow-600 text-sm mt-1">Please login to save changes.</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    placeholder="johndoe"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white"
                      required
                    >
                      <option value="">Select a role</option>
                      <option value="Manager">👨‍💼 Manager</option>
                      <option value="Driver">🚚 Driver</option>
                      <option value="Mechanic">🔧 Mechanic</option>
                      <option value="Fuel Officer">⛽ Fuel Officer</option>
                      <option value="Other">👤 Other</option>
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password {editingId === "new" ? "*" : "(optional)"}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required={editingId === "new"}
                  />
                  {editingId !== "new" && (
                    <p className="text-xs text-gray-500 mt-2">Leave blank to keep current password</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t">
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!getAuthToken()}
                    className={`px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
                      getAuthToken()
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {editingId === "new" ? "Create User" : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Delete User?
              </h3>
              <p className="text-gray-600 mb-8">
                You are about to delete <strong className="text-gray-900">{deleteConfirm.fullName}</strong>. This action cannot be undone and will permanently remove all associated data.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  disabled={!getAuthToken()}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
                    getAuthToken()
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;