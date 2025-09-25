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
  PlusIcon,
  UserPlusIcon
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
    const [createUserData, setCreateUserData] = useState({
        name: '',
        userName: '',
        email: '',
        password: '',
        mobile: '',
        role: 'CUSTOMER'
    });

    const roleMapping = {
        'Admin': 'ROLE_ADMIN',
        'HR': 'ROLE_HR',
        'Customer': 'ROLE_CUSTOMER',
        'Inventory': 'ROLE_INVENTORY',
        'Supervisor': 'ROLE_SUPERVISOR',
        'Planner': 'ROLE_PLANNER',
        'None': null
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
            const response = await fetch('http://localhost:8080/auth', {
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
            setUsers(data);
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
            const response = await fetch('http://localhost:8080/auth/admin/create-user', {
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

    const handleEditClick = (user) => {
        setEditingUserId(user.id);
        setTempRole(user.role || 'None');
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

            const roleValue = tempRole === 'None' ? null : tempRole;

            const response = await fetch(`http://localhost:8080/auth/users/${userId}/role`, {
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

            const updatedUser = await response.json();
            setUsers(users.map(user => 
                user.id === userId ? { ...user, role: updatedUser.role || null } : user
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
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
                                                            {user.role || 'None'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {editingUserId === user.id ? (
                                                    <div className="flex space-x-2">
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
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        className="text-blue-600 hover:text-blue-900 flex items-center"
                                                    >
                                                        <PencilIcon className="h-5 w-5 mr-1" />
                                                        Edit
                                                    </button>
                                                )}
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
            </main>
        </div>
    );
};

export default Userpage;