import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  ClockIcon,
  CubeIcon,
  UserCircleIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  FunnelIcon
} from "@heroicons/react/24/outline";

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('actionDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // Fetch history data
  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('jwtToken');

      try {
        const response = await fetch('http://localhost:8080/api/product-history', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Filter and sort history
  const filteredAndSortedHistory = history
    .filter(record => {
      const matchesSearch = 
        record.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.actionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `P0${record.productId}`.includes(searchTerm) ||
        `A0${record.assetsId}`.includes(searchTerm);

      const matchesFilter = 
        filterType === 'all' || 
        record.actionType?.toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'actionDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getActionTypeColor = (actionType) => {
    switch (actionType?.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <div className="max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="text-lg font-semibold">Error loading history: {error}</h2>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Enhanced Sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl text-white transition-all duration-300">
        <div className="p-6 border-b border-blue-700 flex items-center gap-3">
          <CubeIcon className="h-7 w-7 text-blue-300" />
          <h5 className="text-xl font-bold">StockFlow</h5>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors text-white"
                onClick={() => navigate('/MasterPage')}
              >
                <HomeIcon className="h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start bg-blue-700/30 rounded-lg p-3 transition-colors text-white"
              >
                <ClockIcon className="h-5 w-5" />
                <span className="font-medium">History</span>
              </button>
            </li>
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors text-white"
                onClick={() => navigate('/Products')}
              >
                <ArchiveBoxIcon className="h-5 w-5" />
                <span className="font-medium">Inventory</span>
              </button>
            </li>
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors text-white"
                onClick={() => navigate('/Search')}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span className="font-medium">Search</span>
              </button>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-blue-700 bg-blue-800/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Admin User</div>
              <div className="text-sm text-blue-300">admin@stockflow.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity History</h1>
          <div className="text-sm text-gray-500">
            {filteredAndSortedHistory.length} records found
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              />
            </div>

            {/* Filter by Action Type */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none"
              >
                <option value="all">All Actions</option>
                <option value="create">Created</option>
                <option value="update">Updated</option>
                <option value="delete">Deleted</option>
                <option value="transfer">Transferred</option>
              </select>
            </div>

            {/* Sort Info */}
            <div className="flex items-center justify-end text-sm text-gray-600">
              Sorted by: {sortField} ({sortDirection})
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    { key: 'productId', label: 'Product ID' },
                    { key: 'assetsId', label: 'Asset ID' },
                    { key: 'actionType', label: 'Action' },
                    { key: 'actionDate', label: 'Date & Time' },
                    { key: 'userEmail', label: 'User' },
                    { key: 'description', label: 'Description' }
                  ].map(({ key, label }) => (
                    <th 
                      key={key}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <ClockIcon className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No history records found</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedHistory.map((record) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => console.log('View details:', record)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-blue-600">
                          {record.productId ? `P0${record.productId}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-green-600">
                          {record.assetsId ? `A0${record.assetsId}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(record.actionType)}`}>
                          {record.actionType || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(record.actionDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.userEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {record.description}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            Inventory Management System © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;