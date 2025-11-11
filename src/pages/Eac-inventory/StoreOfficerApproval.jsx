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
  Badge,
  Progress
} from "@material-tailwind/react";
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
import { productRequestAPI, productsAPI } from '../../services/api';
import { REQUEST_STATUS, STATUS_LABELS, STATUS_COLORS } from '../../config/dataModels';

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
        productRequestAPI.getStoreApprovalRequests(),
        productsAPI.getAllProducts()
      ]);
      setRequests(requestsData || []);
      setProducts(productsData || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      toast.error(err.message);
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

    setIsSubmitting(true);
    try {
      const issueData = {
        quantity_issued: parseInt(issueForm.quantity_issued),
        serial_numbers: issueForm.serial_numbers,
        batch_number: issueForm.batch_number,
        comments: issueForm.comments
      };

      await productRequestAPI.issueProduct(currentRequest.id, issueData);
      toast.success('Product issued successfully!');
      fetchData();
      closeIssueModal();
    } catch (err) {
      toast.error(err.message || 'Failed to issue product');
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
      const rejectionData = {
        comments: rejectForm.reason
      };

      await productRequestAPI.rejectByStore(currentRequest.id, rejectionData);
      toast.success('Request rejected successfully!');
      fetchData();
      closeRejectModal();
    } catch (err) {
      toast.error(err.message || 'Failed to reject request');
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
      req.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Group requests
  const approvedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.APPROVED_BY_STORE);
  const issuedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.ISSUED);
  const rejectedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.REJECTED_BY_STORE);

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
                  "Qty Approved",
                  "Stock Available",
                  "Unit Cost",
                  "Total Cost",
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
                requestList.map((req, index) => {
                  const stockCheck = checkStockAvailability(
                    req.product_id,
                    req.quantity_approved || req.quantity_requested
                  );

                  return (
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
                          {req.quantity_approved || req.quantity_requested} units
                        </Typography>
                      </td>
                      <td className="p-4 border-b border-blue-gray-50">
                        <div className="flex items-center gap-2">
                          <Chip
                            value={`${stockCheck.stock} units`}
                            color={stockCheck.available ? 'green' : 'red'}
                            variant="outlined"
                            size="sm"
                          />
                          {!stockCheck.available && (
                            <Tooltip content={`Short by ${stockCheck.deficit} units`}>
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="p-4 border-b border-blue-gray-50">
                        <Typography variant="small">
                          ${parseFloat(req.unit_cost).toFixed(2)}
                        </Typography>
                      </td>
                      <td className="p-4 border-b border-blue-gray-50">
                        <Typography variant="small" className="font-semibold text-blue-600">
                          ${((req.quantity_approved || req.quantity_requested) * req.unit_cost).toFixed(2)}
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
                            {req.status === REQUEST_STATUS.APPROVED_BY_STORE && (
                              <>
                                <Tooltip 
                                  content={stockCheck.available ? 'Issue Product' : 'Insufficient Stock'}
                                >
                                  <IconButton
                                    variant="text"
                                    color="green"
                                    size="sm"
                                    disabled={!stockCheck.available}
                                    onClick={() => handleIssueRequest(req)}
                                  >
                                    <TruckIcon className="h-5 w-5" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip content="Reject Request">
                                  <IconButton
                                    variant="text"
                                    color="red"
                                    size="sm"
                                    onClick={() => handleRejectRequest(req)}
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
                  );
                })
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
              Store Officer Approval & Issuance
            </Typography>
            <Typography variant="small" color="gray">
              Review approved requests and issue products to employees
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
                <Typography variant="small" color="gray">Ready to Issue</Typography>
                <Typography variant="h4">{approvedRequests.length}</Typography>
              </div>
              <Badge content={approvedRequests.length} color="orange">
                <ShoppingCartIcon className="h-8 w-8 text-orange-500" />
              </Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" color="gray">Issued</Typography>
                <Typography variant="h4">{issuedRequests.length}</Typography>
              </div>
              <Badge content={issuedRequests.length} color="green">
                <TruckIcon className="h-8 w-8 text-green-500" />
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
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search */}
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

      {/* Requests by Status */}
      <Card>
        <Tabs value={activeTab} className="overflow-visible">
          <TabsHeader className="bg-transparent border-b border-gray-200 p-0">
            <Tab
              value="approved"
              onClick={() => setActiveTab('approved')}
              className="py-4 px-6 font-semibold"
            >
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="h-5 w-5" />
                Ready to Issue ({approvedRequests.length})
              </div>
            </Tab>
            <Tab
              value="issued"
              onClick={() => setActiveTab('issued')}
              className="py-4 px-6 font-semibold"
            >
              <div className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5" />
                Issued ({issuedRequests.length})
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
            <TabPanel value="approved">
              <RequestsTable requestList={approvedRequests} showActions={true} />
            </TabPanel>
            <TabPanel value="issued">
              <RequestsTable requestList={issuedRequests} showActions={false} />
            </TabPanel>
            <TabPanel value="rejected">
              <RequestsTable requestList={rejectedRequests} showActions={false} />
            </TabPanel>
          </TabsBody>
        </Tabs>
      </Card>

      {/* Issue Product Modal */}
      <Dialog open={isIssueModalOpen} handler={closeIssueModal} size="lg">
        <DialogHeader className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <TruckIcon className="h-6 w-6 text-green-500" />
            <Typography variant="h5" color="blue-gray">
              Issue Product to Employee
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
                  <Typography variant="small" color="gray">Quantity Approved</Typography>
                  <Typography variant="small" className="font-semibold">
                    {currentRequest.quantity_approved || currentRequest.quantity_requested} units
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" color="gray">Employee</Typography>
                  <Typography variant="small" className="font-semibold">
                    Employee #{currentRequest.employee_id}
                  </Typography>
                </div>
              </div>
            </div>
          )}

          {/* Issue Form */}
          <div className="space-y-4">
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Quantity to Issue *
              </Typography>
              <Input
                type="number"
                name="quantity_issued"
                value={issueForm.quantity_issued}
                onChange={handleInputChange}
                label="Enter quantity to issue"
                min="1"
                max={currentRequest?.quantity_approved || currentRequest?.quantity_requested}
                className="bg-white"
              />
            </div>

            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Batch Number (Optional)
              </Typography>
              <Input
                name="batch_number"
                value={issueForm.batch_number}
                onChange={handleInputChange}
                label="Enter batch number for tracking"
                className="bg-white"
              />
            </div>

            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Serial Numbers (Optional)
              </Typography>
              <Textarea
                name="serial_numbers"
                value={issueForm.serial_numbers}
                onChange={handleInputChange}
                label="Enter serial numbers (one per line)"
                rows={3}
                className="bg-white"
              />
            </div>

            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Comments (Optional)
              </Typography>
              <Textarea
                name="comments"
                value={issueForm.comments}
                onChange={handleInputChange}
                label="Add any additional notes"
                rows={3}
                className="bg-white"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
          <Button
            variant="outlined"
            color="gray"
            onClick={closeIssueModal}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleSubmitIssue}
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
                <TruckIcon className="h-5 w-5" />
                Issue Product
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} handler={closeRejectModal} size="md">
        <DialogHeader className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <XCircleIcon className="h-6 w-6 text-red-500" />
            <Typography variant="h5" color="blue-gray">
              Reject Request
            </Typography>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-4">
          {currentRequest && (
            <>
              <Alert color="amber" className="mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <Typography variant="small">
                  Request #{currentRequest.request_number} will be rejected
                </Typography>
              </Alert>

              <div>
                <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                  Reason for Rejection *
                </Typography>
                <Textarea
                  name="reason"
                  value={rejectForm.reason}
                  onChange={handleRejectInputChange}
                  label="Explain why this request is being rejected"
                  rows={4}
                  className="bg-white"
                />
              </div>
            </>
          )}
        </DialogBody>

        <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
          <Button
            variant="outlined"
            color="gray"
            onClick={closeRejectModal}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color="red"
            onClick={handleSubmitReject}
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
                <XMarkIcon className="h-5 w-5" />
                Reject Request
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default StoreOfficerApproval;
