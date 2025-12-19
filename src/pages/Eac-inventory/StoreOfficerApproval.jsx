import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HomeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ShoppingCartIcon
} from "@heroicons/react/24/outline";
import { REQUEST_STATUS, STATUS_LABELS, STATUS_COLORS } from '../../config/dataModels';

// Mock data for products
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Laptop Dell XPS 13',
    category: 'ELECTRONICS',
    unitCost: 1200.00,
    description: 'High-performance laptop for professionals',
    status: 'ACTIVE',
    stock: 15
  },
  {
    id: 2,
    name: 'Office Chair Ergonomic',
    category: 'FURNITURE',
    unitCost: 250.00,
    description: 'Ergonomic office chair with lumbar support',
    status: 'ACTIVE',
    stock: 8
  },
  {
    id: 3,
    name: 'Monitor 24" HD',
    category: 'ELECTRONICS',
    unitCost: 300.00,
    description: '24-inch HD monitor for office use',
    status: 'ACTIVE',
    stock: 12
  },
  {
    id: 4,
    name: 'Wireless Keyboard and Mouse',
    category: 'ELECTRONICS',
    unitCost: 89.99,
    description: 'Wireless keyboard and mouse combo',
    status: 'ACTIVE',
    stock: 25
  }
];

// Mock data for product requests
const MOCK_REQUESTS = [
  {
    id: 1,
    request_number: 'REQ-001',
    employee_id: 'EMP-1001',
    employee_name: 'John Smith',
    product_id: 1,
    product_name: 'Laptop Dell XPS 13',
    quantity_requested: 2,
    quantity_approved: 2,
    unit_cost: 1200.00,
    purpose: 'New hire equipment for marketing team',
    status: REQUEST_STATUS.APPROVED_BY_STORE,
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    request_number: 'REQ-002',
    employee_id: 'EMP-1002',
    employee_name: 'Sarah Johnson',
    product_id: 2,
    product_name: 'Office Chair Ergonomic',
    quantity_requested: 5,
    quantity_approved: 3,
    unit_cost: 250.00,
    purpose: 'Office furniture upgrade',
    status: REQUEST_STATUS.APPROVED_BY_STORE,
    created_at: '2024-01-14T14:20:00Z'
  },
  {
    id: 3,
    request_number: 'REQ-003',
    employee_id: 'EMP-1003',
    employee_name: 'Mike Chen',
    product_id: 3,
    product_name: 'Monitor 24" HD',
    quantity_requested: 3,
    quantity_approved: 3,
    unit_cost: 300.00,
    purpose: 'Dual monitor setup for development team',
    status: REQUEST_STATUS.ISSUED,
    created_at: '2024-01-13T09:15:00Z',
    issued_at: '2024-01-16T11:00:00Z',
    quantity_issued: 3
  },
  {
    id: 4,
    request_number: 'REQ-004',
    employee_id: 'EMP-1004',
    employee_name: 'Lisa Wong',
    product_id: 4,
    product_name: 'Wireless Keyboard and Mouse',
    quantity_requested: 10,
    quantity_approved: 10,
    unit_cost: 89.99,
    purpose: 'IT department equipment',
    status: REQUEST_STATUS.REJECTED_BY_STORE,
    created_at: '2024-01-12T16:45:00Z',
    rejected_at: '2024-01-15T14:30:00Z',
    rejection_reason: 'Insufficient stock available'
  }
];

// Simulate API delay
const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
const mockProductRequestAPI = {
  getStoreApprovalRequests: async () => {
    await simulateDelay();
    return MOCK_REQUESTS;
  },

  issueProduct: async (id, issueData) => {
    await simulateDelay(1000);
    const requestIndex = MOCK_REQUESTS.findIndex(req => req.id === parseInt(id));
    if (requestIndex === -1) throw new Error('Request not found');
    
    MOCK_REQUESTS[requestIndex] = {
      ...MOCK_REQUESTS[requestIndex],
      status: REQUEST_STATUS.ISSUED,
      quantity_issued: issueData.quantity_issued,
      batch_number: issueData.batch_number,
      serial_numbers: issueData.serial_numbers,
      store_comments: issueData.comments,
      issued_at: new Date().toISOString()
    };
    
    // Update product stock
    const productIndex = MOCK_PRODUCTS.findIndex(p => p.id === MOCK_REQUESTS[requestIndex].product_id);
    if (productIndex !== -1) {
      MOCK_PRODUCTS[productIndex].stock -= issueData.quantity_issued;
    }
    
    return MOCK_REQUESTS[requestIndex];
  },

  rejectByStore: async (id, rejectionData) => {
    await simulateDelay(1000);
    const requestIndex = MOCK_REQUESTS.findIndex(req => req.id === parseInt(id));
    if (requestIndex === -1) throw new Error('Request not found');
    
    MOCK_REQUESTS[requestIndex] = {
      ...MOCK_REQUESTS[requestIndex],
      status: REQUEST_STATUS.REJECTED_BY_STORE,
      store_comments: rejectionData.comments,
      rejected_at: new Date().toISOString()
    };
    
    return MOCK_REQUESTS[requestIndex];
  }
};

const mockProductsAPI = {
  getAllProducts: async () => {
    await simulateDelay();
    return MOCK_PRODUCTS;
  }
};

const StoreOfficerApproval = () => {
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('approved');
  
  // Modal states
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  
  // Issue form state
  const [issueForm, setIssueForm] = useState({
    quantity_issued: '',
    serial_numbers: '',
    batch_number: '',
    comments: ''
  });

  // Reject form state
  const [rejectForm, setRejectForm] = useState({
    reason: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsData, productsData] = await Promise.all([
        mockProductRequestAPI.getStoreApprovalRequests(),
        mockProductsAPI.getAllProducts()
      ]);
      setRequests(requestsData || []);
      setProducts(productsData || []);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Check stock availability
  const checkStockAvailability = (productId, requestedQty) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { available: false, stock: 0 };
    return {
      available: product.stock >= requestedQty,
      stock: product.stock,
      deficit: requestedQty - product.stock
    };
  };

  // Open issue modal
  const handleIssueRequest = (request) => {
    setCurrentRequest(request);
    setIssueForm({
      quantity_issued: request.quantity_approved || request.quantity_requested,
      serial_numbers: '',
      batch_number: '',
      comments: ''
    });
    setIsIssueModalOpen(true);
  };

  // Open reject modal
  const handleRejectRequest = (request) => {
    setCurrentRequest(request);
    setRejectForm({
      reason: ''
    });
    setIsRejectModalOpen(true);
  };

  // Close modals
  const closeIssueModal = () => {
    setIsIssueModalOpen(false);
    setCurrentRequest(null);
    setIssueForm({
      quantity_issued: '',
      serial_numbers: '',
      batch_number: '',
      comments: ''
    });
  };

  const closeRejectModal = () => {
    setIsRejectModalOpen(false);
    setCurrentRequest(null);
    setRejectForm({
      reason: ''
    });
  };

  // Submit issue
  const handleSubmitIssue = async () => {
    if (!currentRequest) return;

    if (!issueForm.quantity_issued || issueForm.quantity_issued <= 0) {
      toast.error('Please enter a valid quantity to issue');
      return;
    }

    if (issueForm.quantity_issued > (currentRequest.quantity_approved || currentRequest.quantity_requested)) {
      toast.error('Issued quantity cannot exceed approved quantity');
      return;
    }

    const stockCheck = checkStockAvailability(currentRequest.product_id, issueForm.quantity_issued);
    if (!stockCheck.available) {
      toast.error(`Only ${stockCheck.stock} units available in stock`);
      return;
    }

    setIsSubmitting(true);
    try {
      await mockProductRequestAPI.issueProduct(currentRequest.id, issueForm);
      toast.success('Product issued successfully!');
      fetchData();
      closeIssueModal();
    } catch (err) {
      toast.error('Failed to issue product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit rejection
  const handleSubmitReject = async () => {
    if (!currentRequest) return;

    if (!rejectForm.reason || rejectForm.reason.trim() === '') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      await mockProductRequestAPI.rejectByStore(currentRequest.id, { comments: rejectForm.reason });
      toast.success('Request rejected successfully!');
      fetchData();
      closeRejectModal();
    } catch (err) {
      toast.error('Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setIssueForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRejectInputChange = (e) => {
    const { name, value } = e.target;
    setRejectForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.employee_id.toString().includes(searchTerm) ||
      req.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Group requests
  const approvedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.APPROVED_BY_STORE);
  const issuedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.ISSUED);
  const rejectedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.REJECTED_BY_STORE);

  // Chip component
  const Chip = ({ value, color = 'gray', variant = 'filled', size = 'md', className = '' }) => {
    const colorClasses = {
      blue: variant === 'filled' ? 'bg-blue-500 text-white' : 'border border-blue-500 text-blue-500',
      green: variant === 'filled' ? 'bg-green-500 text-white' : 'border border-green-500 text-green-500',
      red: variant === 'filled' ? 'bg-red-500 text-white' : 'border border-red-500 text-red-500',
      orange: variant === 'filled' ? 'bg-orange-500 text-white' : 'border border-orange-500 text-orange-500',
      gray: variant === 'filled' ? 'bg-gray-500 text-white' : 'border border-gray-500 text-gray-500',
    };

    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base'
    };

    return (
      <span className={`inline-flex items-center rounded-full font-medium ${colorClasses[color]} ${sizeClasses[size]} ${className}`}>
        {value}
      </span>
    );
  };

  // Badge component
  const Badge = ({ content, color = 'gray', children, className = '' }) => {
    const colorClasses = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white',
      orange: 'bg-orange-500 text-white',
      gray: 'bg-gray-500 text-white',
    };

    return (
      <div className={`relative inline-flex ${className}`}>
        {children}
        {content > 0 && (
          <span className={`absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${colorClasses[color]}`}>
            {content}
          </span>
        )}
      </div>
    );
  };

  // Tooltip component
  const Tooltip = ({ content, children }) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {children}
        </div>
        {show && (
          <div className="absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm tooltip -top-10 left-1/2 transform -translate-x-1/2">
            {content}
            <div className="tooltip-arrow absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  };

  // Spinner component
  const Spinner = ({ className = '' }) => (
    <div className={`inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${className}`} role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );

  // Alert component
  const Alert = ({ color = 'blue', children, className = '' }) => {
    const colorClasses = {
      red: 'bg-red-50 border-red-200 text-red-800',
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      amber: 'bg-amber-50 border-amber-200 text-amber-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };

    return (
      <div className={`flex items-center p-4 mb-4 border rounded-lg ${colorClasses[color]} ${className}`}>
        {children}
      </div>
    );
  };

  const RequestsTable = ({ requestList, showActions = true }) => (
    <div className="overflow-hidden border border-gray-200 rounded-lg bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-100">
              {[
                "Request #",
                "Employee",
                "Product",
                "Qty Approved",
                "Stock Available",
                "Unit Cost",
                "Total Cost",
                "Status",
                ...(showActions ? ["Actions"] : [])
              ].map((head) => (
                <th key={head} className="p-4 border-b border-gray-200 text-left">
                  <span className="text-sm font-semibold text-gray-700">
                    {head}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requestList.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-4 text-center">
                  <span className="text-sm text-gray-500">
                    No requests found
                  </span>
                </td>
              </tr>
            ) : (
              requestList.map((req, index) => {
                const stockCheck = checkStockAvailability(
                  req.product_id,
                  req.quantity_approved || req.quantity_requested
                );

                return (
                  <tr key={req.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-4 border-b border-gray-200">
                      <Chip 
                        value={req.request_number} 
                        color="blue" 
                        variant="outlined"
                      />
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">
                          {req.employee_name}
                        </span>
                        <span className="text-sm text-gray-500 block">
                          ID: {req.employee_id}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <span className="text-sm text-gray-700">
                        {req.product_name || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-900">
                        {req.quantity_approved || req.quantity_requested} units
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Chip
                          value={`${stockCheck.stock} units`}
                          color={stockCheck.available ? 'green' : 'red'}
                          variant="outlined"
                          size="sm"
                        />
                        {!stockCheck.available && (
                          <Tooltip content={`Short by ${stockCheck.deficit} units`}>
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 cursor-help" />
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <span className="text-sm text-gray-700">
                        ${parseFloat(req.unit_cost).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <span className="text-sm font-semibold text-blue-600">
                        ${((req.quantity_approved || req.quantity_requested) * req.unit_cost).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <Chip
                        value={STATUS_LABELS[req.status] || req.status}
                        color={STATUS_COLORS[req.status] || 'gray'}
                        size="sm"
                      />
                    </td>
                    {showActions && (
                      <td className="p-4 border-b border-gray-200">
                        <div className="flex gap-2">
                          {req.status === REQUEST_STATUS.APPROVED_BY_STORE && (
                            <>
                              <Tooltip 
                                content={stockCheck.available ? 'Issue Product' : 'Insufficient Stock'}
                              >
                                <button
                                  className={`p-2 rounded-lg transition-colors ${
                                    stockCheck.available 
                                      ? 'text-green-600 hover:bg-green-50' 
                                      : 'text-gray-400 cursor-not-allowed'
                                  }`}
                                  disabled={!stockCheck.available}
                                  onClick={() => handleIssueRequest(req)}
                                >
                                  <TruckIcon className="h-5 w-5" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Reject Request">
                                <button
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  onClick={() => handleRejectRequest(req)}
                                >
                                  <XCircleIcon className="h-5 w-5" />
                                </button>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip content="View Details">
                            <button
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={() => navigate(`/product-request/${req.id}`)}
                            >
                              <MagnifyingGlassIcon className="h-5 w-5" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="h-12 w-12 border-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Tooltip content="Go Back">
            <button
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              onClick={() => navigate(-1)}
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
          </Tooltip>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Store Officer Approval & Issuance
            </h1>
            <p className="text-sm text-gray-600">
              Review approved requests and issue products to employees
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert color="red" className="mb-6">
          <ExclamationTriangleIcon className="h-5 w-5 mr-3" />
          <span>{error}</span>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Ready to Issue', count: approvedRequests.length, color: 'orange', icon: ShoppingCartIcon },
          { title: 'Issued', count: issuedRequests.length, color: 'green', icon: TruckIcon },
          { title: 'Rejected', count: rejectedRequests.length, color: 'red', icon: XCircleIcon },
          { title: 'Total', count: filteredRequests.length, color: 'gray', icon: ClipboardDocumentListIcon }
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              </div>
              <Badge content={stat.count} color={stat.color}>
                <stat.icon className={`h-8 w-8 text-${stat.color}-500`} />
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by request #, employee, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Requests by Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { value: 'approved', label: 'Ready to Issue', icon: ShoppingCartIcon, count: approvedRequests.length },
              { value: 'issued', label: 'Issued', icon: TruckIcon, count: issuedRequests.length },
              { value: 'rejected', label: 'Rejected', icon: XCircleIcon, count: rejectedRequests.length }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-0">
          {activeTab === 'approved' && <RequestsTable requestList={approvedRequests} showActions={true} />}
          {activeTab === 'issued' && <RequestsTable requestList={issuedRequests} showActions={false} />}
          {activeTab === 'rejected' && <RequestsTable requestList={rejectedRequests} showActions={false} />}
        </div>
      </div>

      {/* Issue Product Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <TruckIcon className="h-6 w-6 text-green-500" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Issue Product to Employee
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Request Details */}
              {currentRequest && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Request Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Request Number</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentRequest.request_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Product</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentRequest.product_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Quantity Approved</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentRequest.quantity_approved || currentRequest.quantity_requested} units
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Employee</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentRequest.employee_name} (ID: {currentRequest.employee_id})
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Issue Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity to Issue *
                  </label>
                  <input
                    type="number"
                    name="quantity_issued"
                    value={issueForm.quantity_issued}
                    onChange={handleInputChange}
                    placeholder="Enter quantity to issue"
                    min="1"
                    max={currentRequest?.quantity_approved || currentRequest?.quantity_requested}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Batch Number (Optional)
                  </label>
                  <input
                    name="batch_number"
                    value={issueForm.batch_number}
                    onChange={handleInputChange}
                    placeholder="Enter batch number for tracking"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Serial Numbers (Optional)
                  </label>
                  <textarea
                    name="serial_numbers"
                    value={issueForm.serial_numbers}
                    onChange={handleInputChange}
                    placeholder="Enter serial numbers (one per line)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    name="comments"
                    value={issueForm.comments}
                    onChange={handleInputChange}
                    placeholder="Add any additional notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={closeIssueModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmitIssue}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 border-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TruckIcon className="h-5 w-5" />
                    Issue Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <XCircleIcon className="h-6 w-6 text-red-500" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Reject Request
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {currentRequest && (
                <>
                  <Alert color="amber" className="mb-4">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    <span className="text-sm">
                      Request #{currentRequest.request_number} will be rejected
                    </span>
                  </Alert>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for Rejection *
                    </label>
                    <textarea
                      name="reason"
                      value={rejectForm.reason}
                      onChange={handleRejectInputChange}
                      placeholder="Explain why this request is being rejected"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={closeRejectModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmitReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 border-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XMarkIcon className="h-5 w-5" />
                    Reject Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreOfficerApproval;