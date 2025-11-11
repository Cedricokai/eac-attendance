import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TruckIcon,
  UserCircleIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/solid";
import {
  XMarkIcon,
  CalendarIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';

const Outgoing = () => {
    const [outgoingRecords, setOutgoingRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const navigate = useNavigate();

    const locations = ['AHAFO_NORTH', 'NPI', 'LAYDOWN', 'MKV', 'SUG', 'PROCESS PLANT', 'AROPLANT', 'PLANT SITE'];

    // Mock data for demonstration
    const mockOutgoingRecords = [
        {
            id: 1,
            name: 'Steel Beams',
            code: 'STL-BM-001',
            description: 'High-grade steel construction beams',
            productId: 'P1001',
            userName: 'ACME Steel',
            stock: 15,
            quantityMoved: 15,
            location: 'AHAFO_NORTH',
            requestedBy: 'John Smith',
            movementDate: '2024-01-15T10:30:00Z'
        },
        {
            id: 2,
            name: 'Electrical Wiring',
            code: 'ELEC-WR-002',
            description: 'Copper electrical wiring 2.5mm',
            productId: 'P1002',
            userName: 'ElectroCorp',
            stock: 8,
            quantityMoved: 8,
            location: 'NPI',
            requestedBy: 'Sarah Johnson',
            movementDate: '2024-01-14T14:20:00Z'
        },
        {
            id: 3,
            name: 'PVC Pipes',
            code: 'PVC-PP-003',
            description: '3-inch PVC plumbing pipes',
            productId: 'P1003',
            userName: 'PipeMasters',
            stock: 25,
            quantityMoved: 25,
            location: 'LAYDOWN',
            requestedBy: 'Mike Wilson',
            movementDate: '2024-01-13T09:15:00Z'
        },
        {
            id: 4,
            name: 'Safety Helmets',
            code: 'SFY-HL-004',
            description: 'Industrial safety helmets',
            productId: 'P1004',
            userName: 'SafeWork',
            stock: 3,
            quantityMoved: 3,
            location: 'PROCESS PLANT',
            requestedBy: 'Emma Davis',
            movementDate: '2024-01-12T16:45:00Z'
        }
    ];

    // Fetch Outgoing Records - Mock implementation
    const fetchOutgoingRecords = async () => {
        try {
            setLoading(true);
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Use mock data
            setOutgoingRecords(mockOutgoingRecords);
            setFilteredRecords(mockOutgoingRecords);
            setError(null);

        } catch (err) {
            console.error('Error fetching outgoing records:', err);
            setError('Failed to load outgoing inventory data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOutgoingRecords();
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = outgoingRecords;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(record =>
                record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.requestedBy?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Date filter
        if (dateFilter) {
            filtered = filtered.filter(record => {
                const recordDate = new Date(record.movementDate).toISOString().split('T')[0];
                return recordDate === dateFilter;
            });
        }

        // Location filter
        if (locationFilter) {
            filtered = filtered.filter(record => record.location === locationFilter);
        }

        setFilteredRecords(filtered);
    }, [searchTerm, dateFilter, locationFilter, outgoingRecords]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getStatusColor = (quantityMoved) => {
        if (quantityMoved > 10) return 'bg-green-100 text-green-800';
        if (quantityMoved > 5) return 'bg-amber-100 text-amber-800';
        return 'bg-blue-100 text-blue-800';
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDateFilter('');
        setLocationFilter('');
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="mx-auto mt-10 w-96 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6">
                <h2 className="text-xl text-red-600 font-semibold mb-4">Error</h2>
                <p className="text-red-600">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Fixed Header with Burger Menu at TOP */}
            <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <SidebarWithBurgerMenu onToggle={() => {}} />
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                            Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Outgoing Inventory</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            Welcome, Admin
                        </div>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCircleIcon className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 mt-16">
                <div className="p-6 overflow-auto">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Transfers</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{outgoingRecords.length}</p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <TruckIcon className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Items Moved</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {outgoingRecords.reduce((sum, record) => sum + (record.quantityMoved || 0), 0)}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Unique Products</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {new Set(outgoingRecords.map(record => record.productId)).size}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active Locations</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {new Set(outgoingRecords.map(record => record.location)).size}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                                    <MapPinIcon className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Products
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name, code, description, or requester..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div className="w-full lg:w-48">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div className="w-full lg:w-48">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <MapPinIcon className="h-4 w-4 inline mr-1" />
                                    Location
                                </label>
                                <select
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Locations</option>
                                    {locations.map((location) => (
                                        <option key={location} value={location}>
                                            {location.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <button
                                onClick={clearFilters}
                                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                            >
                                Clear Filters
                            </button>
                        </div>
                        
                        {/* Active Filters */}
                        {(searchTerm || dateFilter || locationFilter) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {searchTerm && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                        Search: "{searchTerm}"
                                        <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">
                                            <XMarkIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {dateFilter && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                        Date: {dateFilter}
                                        <button onClick={() => setDateFilter('')} className="ml-1 hover:text-green-900">
                                            <XMarkIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {locationFilter && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                                        Location: {locationFilter.replace('_', ' ')}
                                        <button onClick={() => setLocationFilter('')} className="ml-1 hover:text-amber-900">
                                            <XMarkIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Outgoing Records Table */}
                    <div className="overflow-hidden border border-gray-200 shadow-sm bg-white rounded-lg">
                        <div className="p-4 bg-gray-50 border-b">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Transfer History ({filteredRecords.length} records)
                                </h2>
                                <span className="text-sm text-gray-600">
                                    Last updated: {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-0 overflow-x-auto">
                            {filteredRecords.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    {outgoingRecords.length === 0 ? 
                                        "No outgoing records found" : 
                                        "No records match your filters"
                                    }
                                </div>
                            ) : (
                                <table className="w-full min-w-max table-auto">
                                    <thead>
                                        <tr>
                                            {["Product", "Code", "Description", "Brand", "Quantity", "Location", "Requested By", "Transfer Date"].map((head) => (
                                                <th key={head} className="border-b border-gray-200 bg-gray-50 p-4">
                                                    <div className="text-sm font-semibold text-gray-700 text-left">
                                                        {head}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecords.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 border-b border-gray-200">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        ID: {record.productId}
                                                    </div>
                                                </td>
                                                <td className="p-4 border-b border-gray-200">
                                                    <div className="text-sm text-gray-700 font-mono">
                                                        {record.code || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="p-4 border-b border-gray-200">
                                                    <div className="text-sm text-gray-700 max-w-xs truncate">
                                                        {record.description}
                                                    </div>
                                                </td>
                                                <td className="p-4 border-b border-gray-200">
                                                    <div className="text-sm text-gray-700">
                                                        {record.userName}
                                                    </div>
                                                </td>
                                                <td className="p-4 border-b border-gray-200">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.quantityMoved)}`}>
                                                        {record.stock}
                                                    </span>
                                                </td>
                                                <td className="p-4 border-b border-gray-200">
                                                    <div className="flex items-center gap-2">
                                                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm text-gray-700">
                                                            {record.location?.replace('_', ' ') || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 border-b border-gray-200">
                                                    <div className="text-sm text-gray-700">
                                                        {record.requestedBy}
                                                    </div>
                                                </td>
                                                <td className="p-4 border-b border-gray-200">
                                                    <div className="text-sm text-gray-700">
                                                        {formatDate(record.movementDate)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={fetchOutgoingRecords}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Outgoing;