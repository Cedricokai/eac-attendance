import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Card,
  CardBody,
  CardFooter,
  Typography,
  Button,
  Input,
  Textarea,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Spinner,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Badge
} from "@material-tailwind/react";
import {
  HomeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import { REQUEST_STATUS, STATUS_LABELS, STATUS_COLORS } from '../../config/dataModels';

// === API Base URL detection (same as LoginPage) ===
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
  if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};
const API_BASE_URL = getApiBaseUrl();

// === Helper for authenticated headers ===
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
});

const ProcurementManagerReview = () => {
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Modal states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  
  // Review form state
  const [reviewForm, setReviewForm] = useState({
    quantity_approved: '',
    comments: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch product requests using native fetch
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/for-procurement`, {
        headers: getHeaders()
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Open review modal
  const handleReviewRequest = (request, action) => {
    setCurrentRequest(request);
    setReviewAction(action);
    setReviewForm({
      quantity_approved: request.quantity_requested || request.quantityRequested || 0,
      comments: ''
    });
    setIsReviewModalOpen(true);
  };

  // Close review modal
  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setCurrentRequest(null);
    setReviewAction(null);
    setReviewForm({
      quantity_approved: '',
      comments: ''
    });
  };

  // Submit approval
  const handleApprove = async () => {
    if (!currentRequest) return;

    if (!reviewForm.quantity_approved || reviewForm.quantity_approved <= 0) {
      toast.error('Please enter a valid approved quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      const qty = parseInt(reviewForm.quantity_approved);
      const unitCost = currentRequest.unit_cost || currentRequest.unitCost || 0;
      const estimatedCost = qty * unitCost;
      const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now

      const payload = {
        estimatedCost: estimatedCost,
        deliveryDate: deliveryDate,
        notes: reviewForm.comments || 'Approved by Procurement',
        approvedBy: 'procurement'
      };

      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/${currentRequest.id}/procurement-approve`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Approval failed');
      }

      toast.success('Request approved successfully!');
      fetchRequests();
      closeReviewModal();
    } catch (err) {
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit rejection
  const handleReject = async () => {
    if (!currentRequest) return;

    if (!reviewForm.comments || reviewForm.comments.trim() === '') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        notes: reviewForm.comments,
        approvedBy: 'procurement'
      };

      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/${currentRequest.id}/procurement-reject`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Rejection failed');
      }

      toast.success('Request rejected successfully!');
      fetchRequests();
      closeReviewModal();
    } catch (err) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReviewForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      (req.request_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.employee_id || '').toString().includes(searchTerm) ||
      (req.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Group requests by status
  const pendingRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.PENDING);
  const approvedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT);
  const rejectedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT);

  const RequestsTable = ({ requestList, showActions = true }) => (
    <Card className="overflow-hidden border border-gray-200">
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="bg-gray-100">
                {[
                  "Request #",
                  "Employee",
                  "Product",
                  "Qty Requested",
                  "Unit Cost",
                  "Total Cost",
                  "Purpose",
                  "Status",
                  ...(showActions ? ["Actions"] : [])
                ].map((head) => (
                  <th key={head} className="p-4 border-b border-blue-gray-100">
                    <Typography variant="small" className="font-semibold">
                      {head}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requestList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-4 text-center">
                    <Typography variant="small" color="gray">
                      No requests found
                    </Typography>
                  </td>
                </tr>
              ) : (
                requestList.map((req, index) => (
                  <tr key={req.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Chip 
                        value={req.request_number} 
                        color="blue" 
                        variant="outlined"
                      />
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small" className="font-medium">
                        Employee #{req.employee_id}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small">
                        {req.product_name || 'N/A'}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small" className="font-semibold">
                        {req.quantity_requested} units
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small">
                        ${parseFloat(req.unit_cost).toFixed(2)}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small" className="font-semibold text-blue-600">
                        ${(req.quantity_requested * req.unit_cost).toFixed(2)}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small" className="truncate max-w-xs">
                        {req.purpose}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Chip
                        value={STATUS_LABELS[req.status] || req.status}
                        color={STATUS_COLORS[req.status] || 'gray'}
                        size="sm"
                      />
                    </td>
                    {showActions && (
                      <td className="p-4 border-b border-blue-gray-50">
                        <div className="flex gap-2">
                          {req.status === REQUEST_STATUS.PENDING && (
                            <>
                              <Tooltip content="Approve">
                                <IconButton
                                  variant="text"
                                  color="green"
                                  size="sm"
                                  onClick={() => handleReviewRequest(req, 'approve')}
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip content="Reject">
                                <IconButton
                                  variant="text"
                                  color="red"
                                  size="sm"
                                  onClick={() => handleReviewRequest(req, 'reject')}
                                >
                                  <XCircleIcon className="h-5 w-5" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip content="View Details">
                            <IconButton
                              variant="text"
                              color="blue"
                              size="sm"
                              onClick={() => navigate(`/product-request/${req.id}`)}
                            >
                              <MagnifyingGlassIcon className="h-5 w-5" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Tooltip content="Go Back">
            <IconButton
              variant="text"
              color="blue"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </IconButton>
          </Tooltip>
          <div>
            <Typography variant="h3" color="blue-gray">
              Procurement Manager Review
            </Typography>
            <Typography variant="small" color="gray">
              Review and approve/reject product requests from employees
            </Typography>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert color="red" className="mb-6 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <Typography>{error}</Typography>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray">Pending</Typography>
                <Typography variant="h4">{pendingRequests.length}</Typography>
              </div>
              <Badge content={pendingRequests.length} color="blue">
                <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500" />
              </Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray">Approved</Typography>
                <Typography variant="h4">{approvedRequests.length}</Typography>
              </div>
              <Badge content={approvedRequests.length} color="green">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray">Rejected</Typography>
                <Typography variant="h4">{rejectedRequests.length}</Typography>
              </div>
              <Badge content={rejectedRequests.length} color="red">
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray">Total</Typography>
                <Typography variant="h4">{filteredRequests.length}</Typography>
              </div>
              <Badge content={filteredRequests.length} color="gray">
                <ClipboardDocumentListIcon className="h-8 w-8 text-gray-500" />
              </Badge>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6 p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <Typography variant="small" className="font-semibold mb-2">
              Search
            </Typography>
            <Input
              placeholder="Search by request #, employee, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
        </div>
      </Card>

      {/* Requests by Status Tabs */}
      <Card>
        <Tabs value={activeTab} className="overflow-visible">
          <TabsHeader className="bg-transparent border-b border-gray-200 p-0">
            <Tab
              value="pending"
              onClick={() => setActiveTab('pending')}
              className="py-4 px-6 font-semibold"
            >
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-5 w-5" />
                Pending ({pendingRequests.length})
              </div>
            </Tab>
            <Tab
              value="approved"
              onClick={() => setActiveTab('approved')}
              className="py-4 px-6 font-semibold"
            >
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5" />
                Approved ({approvedRequests.length})
              </div>
            </Tab>
            <Tab
              value="rejected"
              onClick={() => setActiveTab('rejected')}
              className="py-4 px-6 font-semibold"
            >
              <div className="flex items-center gap-2">
                <XCircleIcon className="h-5 w-5" />
                Rejected ({rejectedRequests.length})
              </div>
            </Tab>
          </TabsHeader>
          <TabsBody>
            <TabPanel value="pending">
              <RequestsTable requestList={pendingRequests} showActions={true} />
            </TabPanel>
            <TabPanel value="approved">
              <RequestsTable requestList={approvedRequests} showActions={false} />
            </TabPanel>
            <TabPanel value="rejected">
              <RequestsTable requestList={rejectedRequests} showActions={false} />
            </TabPanel>
          </TabsBody>
        </Tabs>
      </Card>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} handler={closeReviewModal} size="lg">
        <DialogHeader className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-6 w-6 text-blue-500" />
            <Typography variant="h5" color="blue-gray">
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Request
            </Typography>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-6">
          {/* Request Details */}
          {currentRequest && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <Typography variant="small" className="font-semibold mb-3">
                Request Details
              </Typography>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Typography variant="small" color="gray">Request Number</Typography>
                  <Typography variant="small" className="font-semibold">
                    {currentRequest.request_number}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray">Product</Typography>
                  <Typography variant="small" className="font-semibold">
                    {currentRequest.product_name}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray">Quantity Requested</Typography>
                  <Typography variant="small" className="font-semibold">
                    {currentRequest.quantity_requested} units
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray">Unit Cost</Typography>
                  <Typography variant="small" className="font-semibold">
                    ${parseFloat(currentRequest.unit_cost).toFixed(2)}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray">Total Cost</Typography>
                  <Typography variant="small" className="font-semibold text-green-600">
                    ${(currentRequest.quantity_requested * currentRequest.unit_cost).toFixed(2)}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray">Purpose</Typography>
                  <Typography variant="small" className="font-semibold">
                    {currentRequest.purpose}
                  </Typography>
                </div>
              </div>
            </div>
          )}

          {/* Review Form */}
          <div className="space-y-4">
            {reviewAction === 'approve' && (
              <div>
                <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                  Quantity to Approve *
                </Typography>
                <Input
                  type="number"
                  name="quantity_approved"
                  value={reviewForm.quantity_approved}
                  onChange={handleInputChange}
                  label="Enter approved quantity"
                  min="1"
                  max={currentRequest?.quantity_requested}
                  className="bg-white"
                />
              </div>
            )}

            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                {reviewAction === 'approve' ? 'Comments (Optional)' : 'Reason for Rejection *'}
              </Typography>
              <Textarea
                name="comments"
                value={reviewForm.comments}
                onChange={handleInputChange}
                label="Add your comments"
                rows={4}
                className="bg-white"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
          <Button
            variant="outlined"
            color="gray"
            onClick={closeReviewModal}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color={reviewAction === 'approve' ? 'green' : 'red'}
            onClick={reviewAction === 'approve' ? handleApprove : handleReject}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                Processing...
              </>
            ) : (
              <>
                {reviewAction === 'approve' ? (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    Approve
                  </>
                ) : (
                  <>
                    <XMarkIcon className="h-5 w-5" />
                    Reject
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default ProcurementManagerReview;