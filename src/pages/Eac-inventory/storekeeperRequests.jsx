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

  // Mock requests data
  const mockRequests = [
    {
      id: 1,
      productName: 'Safety Helmet',
      productCode: 'PPE-001',
      quantity: 10,
      requestedBy: 'John Smith',
      department: 'Construction',
      location: 'Site A',
      requestDate: '2024-01-15T10:30:00',
      status: 'PENDING'
    },
    {
      id: 2,
      productName: 'Safety Gloves',
      productCode: 'PPE-002',
      quantity: 25,
      requestedBy: 'Jane Doe',
      department: 'Maintenance',
      location: 'Warehouse B',
      requestDate: '2024-01-14T14:20:00',
      status: 'APPROVED'
    },
    {
      id: 3,
      productName: 'Safety Boots',
      productCode: 'PPE-003',
      quantity: 5,
      requestedBy: 'Mike Johnson',
      department: 'Operations',
      location: 'Site C',
      requestDate: '2024-01-13T09:15:00',
      status: 'REJECTED'
    },
    {
      id: 4,
      productName: 'Safety Glasses',
      productCode: 'PPE-004',
      quantity: 15,
      requestedBy: 'Sarah Wilson',
      department: 'Quality Control',
      location: 'Lab 2',
      requestDate: '2024-01-12T16:45:00',
      status: 'FULFILLED'
    },
    {
      id: 5,
      productName: 'Ear Protection',
      productCode: 'PPE-005',
      quantity: 30,
      requestedBy: 'Tom Brown',
      department: 'Manufacturing',
      location: 'Plant 1',
      requestDate: '2024-01-15T08:00:00',
      status: 'PENDING'
    }
  ];

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredRequests = [...mockRequests];
      
      // Apply filter
      if (filter !== 'all') {
        filteredRequests = mockRequests.filter(request => 
          request.status === filter.toUpperCase()
        );
      }
      
      setRequests(filteredRequests);
      setError('');
      
    } catch (err) {
      setError('Failed to load requests');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const processRequest = async (requestId, action) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update request status based on action
      const updatedRequests = requests.map(request => {
        if (request.id === requestId) {
          let newStatus = request.status;
          
          switch (action) {
            case 'approve':
              newStatus = 'APPROVED';
              break;
            case 'reject':
              newStatus = 'REJECTED';
              break;
            case 'fulfill':
              newStatus = 'FULFILLED';
              break;
            default:
              newStatus = request.status;
          }
          
          return {
            ...request,
            status: newStatus
          };
        }
        return request;
      });

      setRequests(updatedRequests);
      
      const actionText = action === 'approve' ? 'approved' : 
                        action === 'reject' ? 'rejected' : 
                        'fulfilled';
      
      setSuccessMessage(`Request ${actionText} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      setError('Failed to process request');
      console.error('Error processing request:', err);
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
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
          
          <button 
            onClick={fetchRequests}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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
            <p className="text-sm mt-1">Try changing the filter or check back later.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{request.productName}</div>
                        {request.productCode && (
                          <div className="text-sm text-gray-500">Code: {request.productCode}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{request.quantity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-900">{request.requestedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{request.department || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{request.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.requestDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => processRequest(request.id, 'approve')}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => processRequest(request.id, 'reject')}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status === 'APPROVED' && (
                        <button
                          onClick={() => processRequest(request.id, 'fulfill')}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
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
          {filter !== 'all' && ` (filtered by ${filter})`}
        </div>
      )}

      {/* Demo Information */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Demo Information</h3>
        <p className="text-blue-700 text-sm">
          This is a mock implementation with sample data. In a real application, this would connect to your backend API.
        </p>
        <div className="mt-2 text-xs text-blue-600">
          <strong>Available actions:</strong> Approve/Reject pending requests, Mark approved requests as fulfilled
        </div>
      </div>
    </div>
  );
};

export default StorekeeperRequests;