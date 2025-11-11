import React, { useState, useEffect } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  ClockIcon,
  ArchiveBoxIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

const StorekeeperRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwtToken');
      
      // Try endpoints in priority order - ProductController endpoints first
      const endpoints = [
        {
          url: `${API_BASE_URL}/api/products/requests`,
          pendingUrl: `${API_BASE_URL}/api/products/requests/pending`
        },
        {
          url: `${API_BASE_URL}/api/requests`,
          pendingUrl: `${API_BASE_URL}/api/requests/pending`
        }
      ];

      let response = null;
      let data = null;
      let workingEndpoint = null;

      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          const url = filter === 'pending' ? endpoint.pendingUrl : endpoint.url;
          
          console.log('🔍 Trying endpoint:', url);
          
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });

          console.log('📊 Response status:', response.status, response.statusText);

          if (response.ok) {
            data = await response.json();
            workingEndpoint = url;
            console.log('✅ Success with endpoint:', url);
            console.log('📦 Data received:', data);
            break; // Exit loop if successful
          } else {
            console.log('❌ Endpoint failed:', url, 'Status:', response.status);
          }
        } catch (err) {
          console.log('🚨 Endpoint error:', err.message);
          // Continue to next endpoint
        }
      }

      if (!response || !response.ok) {
        let errorMsg = 'Failed to fetch requests from all endpoints. ';
        if (response) {
          errorMsg += `Last response: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      setRequests(data || []);
      setError('');
      
      // Show which endpoint is working
      console.log('🎯 Using endpoint:', workingEndpoint);
      
    } catch (err) {
      setError(err.message);
      console.error('💥 Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const processRequest = async (requestId, action) => {
    try {
      const token = localStorage.getItem('jwtToken');
      
      // Try endpoints in priority order
      const endpoints = [
        `${API_BASE_URL}/api/products/requests/${requestId}/process?action=${action}`,
        `${API_BASE_URL}/api/requests/${requestId}/process?action=${action}`
      ];

      let response = null;
      let workingEndpoint = null;

      for (const endpoint of endpoints) {
        try {
          console.log('🔍 Trying process endpoint:', endpoint);
          response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });

          console.log('📊 Process response status:', response.status);

          if (response.ok) {
            workingEndpoint = endpoint;
            console.log('✅ Success with process endpoint:', endpoint);
            break;
          } else {
            console.log('❌ Process endpoint failed:', endpoint, 'Status:', response.status);
          }
        } catch (err) {
          console.log('🚨 Process endpoint error:', err.message);
        }
      }

      if (!response || !response.ok) {
        let errorMsg = 'Failed to process request. ';
        if (response?.status === 403) {
          errorMsg = 'Access denied: You need storekeeper role to process requests';
        } else if (response?.status === 405) {
          errorMsg = 'Method not allowed. The server rejected the request.';
        } else if (response) {
          errorMsg += `Last status: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      setSuccessMessage(`Request ${action}ed successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchRequests();
    } catch (err) {
      setError(err.message);
      console.error('💥 Error processing request:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      APPROVED: { color: 'bg-blue-100 text-blue-800', icon: CheckIcon },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: XMarkIcon },
      FULFILLED: { color: 'bg-green-100 text-green-800', icon: TruckIcon }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-2 text-gray-600">Loading requests...</span>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory Requests</h2>
        
        <div className="flex gap-4">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg p-2"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
          
          <button 
            onClick={fetchRequests}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex items-center gap-2">
            <XMarkIcon className="h-5 w-5" />
            <strong>Error:</strong> {error}
          </div>
          <p className="mt-2 text-sm">Check browser console for detailed logs.</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="flex items-center gap-2">
            <CheckIcon className="h-5 w-5" />
            {successMessage}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ArchiveBoxIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p>No requests found</p>
            <p className="text-sm mt-1">Try refreshing or check if any requests were created.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{request.productName}</div>
                        {request.productCode && (
                          <div className="text-sm text-gray-500">Code: {request.productCode}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{request.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-5 w-5 text-gray-400" />
                        <span>{request.requestedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{request.department || 'N/A'}</td>
                    <td className="px-6 py-4">{request.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(request.requestDate)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4">
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => processRequest(request.id, 'approve')}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => processRequest(request.id, 'reject')}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status === 'APPROVED' && (
                        <button
                          onClick={() => processRequest(request.id, 'fulfill')}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          Mark Fulfilled
                        </button>
                      )}
                      {(request.status === 'REJECTED' || request.status === 'FULFILLED') && (
                        <span className="text-gray-400 text-sm">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {requests.length} request{requests.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default StorekeeperRequests;