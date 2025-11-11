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
  EyeSlashIcon
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

    
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

    const [createUserData, setCreateUserData] = useState({
        name: '',
        userName: '',
        email: '',
        password: '',
        mobile: '',
        role: 'CUSTOMER'
    });

    // Frontend display roles to backend roles mapping
    const roleMapping = {
        'Admin': 'ROLE_ADMIN',
        'HR': 'ROLE_HR',
        'Customer': 'ROLE_CUSTOMER',
        'Inventory': 'ROLE_INVENTORY',
        'Supervisor': 'ROLE_SUPERVISOR',
        'Planner': 'ROLE_PLANNER',
        'None': null
    };

    // Backend roles to frontend display mapping
    const reverseRoleMapping = {
        'ROLE_ADMIN': 'Admin',
        'ROLE_HR': 'HR',
        'ROLE_CUSTOMER': 'Customer',
        'ROLE_INVENTORY': 'Inventory',
        'ROLE_SUPERVISOR': 'Supervisor',
        'ROLE_PLANNER': 'Planner',
        null: 'None'
    };

    const availableRoles = ['Admin', 'HR', 'Customer', 'Inventory', 'Planner', 'Supervisor', 'None'];

    useEffect(() => {
        fetchUsers();
    }, []);

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
            // Convert backend roles to display format
            const usersWithDisplayRoles = data.map(user => ({
                ...user,
                displayRole: reverseRoleMapping[user.role] || user.role || 'None'
            }));
            setUsers(usersWithDisplayRoles);
        } catch (err) {
            console.error('Fetch error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                body: JSON.stringify(createUserData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create user');
            }

            const result = await response.json();
            toast.success('User created successfully!');
            setShowCreateModal(false);
            setCreateUserData({
                name: '',
                userName: '',
                email: '',
                password: '',
                mobile: '',
                role: 'CUSTOMER'
            });
            fetchUsers(); // Refresh the list
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

            const result = await response.json();
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
            
            // Update the user in the local state
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

            // Convert frontend role to backend role format
            const roleValue = tempRole === 'None' ? null : roleMapping[tempRole];

            const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: roleValue }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Update the user in local state
            setUsers(users.map(user => 
                user.id === userId ? { 
                    ...user, 
                    role: roleValue, // Store backend format
                    displayRole: tempRole // Store display format
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
            {/* Sidebar */}
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

            {/* Main Content */}
            <main className="flex-1 p-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-semibold text-gray-800">User Management</h2>
                            <div className="flex items-center space-x-4">
                                <div className="text-sm text-gray-500">
                                    {users.length} {users.length === 1 ? 'user' : 'users'} found
                                </div>
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
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                            No users found in the system
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {user.userName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {user.mobile || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleToggleUserStatus(user)}
                                                    disabled={togglingUserId === user.id}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                        user.enabled ? 'bg-green-600' : 'bg-gray-200'
                                                    } ${togglingUserId === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                            user.enabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                    {togglingUserId === user.id && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <ArrowPathIcon className="h-3 w-3 text-gray-400 animate-spin" />
                                                        </div>
                                                    )}
                                                </button>
                                                <span className={`ml-2 text-xs font-medium ${
                                                    user.enabled ? 'text-green-600' : 'text-red-600'
                                                }`}>
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
                                                        {availableRoles.map((role) => (
                                                            <option key={role} value={role}>
                                                                {role}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                                                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
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
                                                                className="text-green-600 hover:text-green-900 flex items-center"
                                                            >
                                                                <CheckIcon className="h-5 w-5 mr-1" />
                                                                {isUpdating ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={handleCancel}
                                                                className="text-red-600 hover:text-red-900 flex items-center"
                                                            >
                                                                <XMarkIcon className="h-5 w-5 mr-1" />
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditClick(user)}
                                                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                                            >
                                                                <PencilIcon className="h-5 w-5 mr-1" />
                                                                Edit Role
                                                            </button>
                                                            <button
                                                                onClick={() => handleSetPasswordClick(user)}
                                                                className="text-green-600 hover:text-green-900 flex items-center"
                                                            >
                                                                <KeyIcon className="h-5 w-5 mr-1" />
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

                {/* Create User Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Create New User</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={createUserData.name}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username</label>
                                    <input
                                        type="text"
                                        name="userName"
                                        value={createUserData.userName}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={createUserData.email}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={createUserData.password}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={createUserData.mobile}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role</label>
                                    <select
                                        name="role"
                                        value={createUserData.role}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="CUSTOMER">Customer</option>
                                        <option value="HR">HR</option>
                                        <option value="INVENTORY">Inventory</option>
                                        <option value="SUPERVISOR">Supervisor</option>
                                        <option value="PLANNER">Planner</option>
                                    </select>
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Create User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Set Password Modal */}
                {showPasswordModal && selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Set Password for {selectedUser.name}</h3>
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                                    <div className="mt-1 relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={passwordData.password}
                                            onChange={handlePasswordInputChange}
                                            className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
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
                                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                    <div className="mt-1 relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordInputChange}
                                            className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
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
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        Set Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Userpage;