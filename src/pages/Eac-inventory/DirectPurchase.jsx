import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Card,
  CardBody,
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
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  EyeIcon
} from "@heroicons/react/24/outline";

import MainSidebar from "../Eac-attendance/mainSidebar";
import Header from "../../components/Header";

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
  if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};
const API_BASE_URL = getApiBaseUrl();

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
});

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'yellow' },
  ACCOUNTANT_APPROVED: { label: 'Approved by Accountant', color: 'indigo' },
  REVIEWER_APPROVED: { label: 'Approved by Reviewer', color: 'green' },
  REJECTED: { label: 'Rejected', color: 'red' },
  PAID: { label: 'Paid', color: 'blue' }
};

// Map tab keys to status values (for filtering)
const TAB_TO_STATUS = {
  all: 'all',
  pending: 'PENDING',
  accountant: 'ACCOUNTANT_APPROVED',
  reviewer: 'REVIEWER_APPROVED',
  rejected: 'REJECTED',
  paid: 'PAID'
};

const DirectPurchase = () => {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    requestDate: new Date().toISOString().split('T')[0],
    requester: '',
    accountant: '',
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.hamburger-button')) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setUser({
            name: data.username,
            role: data.role.replace("ROLE_", "").toLowerCase(),
            email: data.email
          });
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/direct-purchases`, {
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
      setError(err.message || 'Failed to load direct purchase requests');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAddItemRow = () => {
    setNewRequest(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (newRequest.items.length <= 1) {
      toast.warning('At least one item is required');
      return;
    }
    setNewRequest(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newRequest.items];
    updatedItems[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].unitPrice) || 0;
      updatedItems[index].total = qty * price;
    }
    setNewRequest(prev => ({ ...prev, items: updatedItems }));
  };

  const handleNewRequestChange = (e) => {
    const { name, value } = e.target;
    setNewRequest(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.requester.trim()) {
      toast.error('Requester (Procurement Officer) is required');
      return;
    }
    if (!newRequest.accountant.trim()) {
      toast.error('Accountant is required');
      return;
    }
    if (newRequest.items.some(item => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) {
      toast.error('Please fill all item fields correctly');
      return;
    }
    const grandTotal = newRequest.items.reduce((sum, item) => sum + (item.total || 0), 0);

    const payload = {
      requestDate: newRequest.requestDate,
      requester: newRequest.requester,
      accountant: newRequest.accountant,
      notes: newRequest.notes,
      items: newRequest.items,
      totalAmount: grandTotal
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/direct-purchases`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Creation failed');
      }
      toast.success('Direct purchase request created successfully!');
      fetchRequests();
      setIsCreateModalOpen(false);
      setNewRequest({
        requestDate: new Date().toISOString().split('T')[0],
        requester: '',
        accountant: '',
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
      });
    } catch (err) {
      toast.error(err.message || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openActionModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setActionNotes('');
    setIsActionModalOpen(true);
  };

  const handleActionConfirm = async () => {
    if (!selectedRequest) return;
    const id = selectedRequest.id;
    let endpoint = '';
    let payload = { notes: actionNotes };

    switch (actionType) {
      case 'approve':
        endpoint = `/api/direct-purchases/${id}/approve`;
        break;
      case 'reject':
        endpoint = `/api/direct-purchases/${id}/reject`;
        break;
      case 'reviewer':
        endpoint = `/api/direct-purchases/${id}/reviewer-approve`;
        break;
      case 'pay':
        endpoint = `/api/direct-purchases/${id}/pay`;
        break;
      default:
        return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Action failed');
      }
      toast.success(
        actionType === 'approve' ? 'Request approved by Accountant!' :
        actionType === 'reviewer' ? 'Request approved by Reviewer!' :
        actionType === 'reject' ? 'Request rejected!' :
        'Request marked as paid!'
      );
      fetchRequests();
      setIsActionModalOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setActionNotes('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/direct-purchases/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Delete failed');
      }
      toast.success('Request deleted successfully');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to delete request');
    }
  };

  // Filtered requests based on search + status
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        req.requester?.toLowerCase().includes(searchLower) ||
        req.accountant?.toLowerCase().includes(searchLower) ||
        req.items?.some(item => item.description?.toLowerCase().includes(searchLower)) ||
        req.requestNumber?.toLowerCase().includes(searchLower);
      const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, filterStatus]);

  // Separate lists for each status (unfiltered by search for tab counts)
  const allRequests = requests;
  const pending = allRequests.filter(r => r.status === 'PENDING');
  const accountantApproved = allRequests.filter(r => r.status === 'ACCOUNTANT_APPROVED');
  const reviewerApproved = allRequests.filter(r => r.status === 'REVIEWER_APPROVED');
  const rejected = allRequests.filter(r => r.status === 'REJECTED');
  const paid = allRequests.filter(r => r.status === 'PAID');

  // Stats for cards
  const stats = {
    total: allRequests.length,
    pending: pending.length,
    accountantApproved: accountantApproved.length,
    reviewerApproved: reviewerApproved.length,
    rejected: rejected.length,
    paid: paid.length
  };

  // Click handler for cards
  const handleCardClick = (tabKey) => {
    setActiveTab(tabKey);
    setFilterStatus(TAB_TO_STATUS[tabKey] || 'all');
  };

  const RequestsTable = ({ requestList, showActions = true }) => (
    <Card className="overflow-hidden border border-gray-200">
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-4 border-b text-left">
                  <Typography variant="small" className="font-semibold">Request #</Typography>
                </th>
                <th className="p-4 border-b text-left">
                  <Typography variant="small" className="font-semibold">Date</Typography>
                </th>
                <th className="p-4 border-b text-left">
                  <Typography variant="small" className="font-semibold">Requester</Typography>
                </th>
                <th className="p-4 border-b text-left">
                  <Typography variant="small" className="font-semibold">Accountant</Typography>
                </th>
                <th className="p-4 border-b text-left">
                  <Typography variant="small" className="font-semibold">Items</Typography>
                </th>
                <th className="p-4 border-b text-left">
                  <Typography variant="small" className="font-semibold">Total Amount</Typography>
                </th>
                <th className="p-4 border-b text-left">
                  <Typography variant="small" className="font-semibold">Status</Typography>
                </th>
                {showActions && (
                  <th className="p-4 border-b text-left">
                    <Typography variant="small" className="font-semibold">Actions</Typography>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {requestList.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 8 : 7} className="p-4 text-center">
                    <Typography variant="small" color="gray">No requests found</Typography>
                  </td>
                </tr>
              ) : (
                requestList.map((req, index) => {
                  const statusConfig = STATUS_CONFIG[req.status] || { label: req.status, color: 'gray' };
                  const totalItems = req.items ? req.items.length : 0;
                  const itemDescriptions = req.items ? req.items.map(item => item.description).join(', ') : '';
                  const isPending = req.status === 'PENDING';
                  const isAccountantApproved = req.status === 'ACCOUNTANT_APPROVED';
                  const isReviewerApproved = req.status === 'REVIEWER_APPROVED';
                  const isRejected = req.status === 'REJECTED';
                  const isPaid = req.status === 'PAID';

                  return (
                    <tr key={req.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-4 border-b">
                        <Chip value={req.requestNumber || `DP-${req.id}`} color="blue" variant="outlined" />
                      </td>
                      <td className="p-4 border-b">
                        <Typography variant="small">{new Date(req.requestDate).toLocaleDateString()}</Typography>
                      </td>
                      <td className="p-4 border-b">
                        <Typography variant="small" className="font-medium">{req.requester}</Typography>
                      </td>
                      <td className="p-4 border-b">
                        <Typography variant="small">{req.accountant}</Typography>
                      </td>
                      <td className="p-4 border-b">
                        <Typography variant="small">
                          <span className="font-medium">{totalItems} item(s)</span>
                        </Typography>
                        <div className="text-xs text-gray-600 truncate max-w-xs" title={itemDescriptions}>
                          {itemDescriptions}
                        </div>
                      </td>
                      <td className="p-4 border-b">
                        <Typography variant="small" className="font-bold text-green-600">
                          ${(req.totalAmount || 0).toFixed(2)}
                        </Typography>
                      </td>
                      <td className="p-4 border-b">
                        <Chip value={statusConfig.label} color={statusConfig.color} size="sm" />
                      </td>
                      {showActions && (
                        <td className="p-4 border-b">
                          <div className="flex gap-2 flex-wrap">
                            {isPending && (
                              <>
                                <Tooltip content="Approve (Accountant)">
                                  <IconButton
                                    variant="text"
                                    color="green"
                                    size="sm"
                                    onClick={() => openActionModal(req, 'approve')}
                                  >
                                    <CheckCircleIcon className="h-5 w-5" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip content="Reject">
                                  <IconButton
                                    variant="text"
                                    color="red"
                                    size="sm"
                                    onClick={() => openActionModal(req, 'reject')}
                                  >
                                    <XCircleIcon className="h-5 w-5" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {isAccountantApproved && (
                              <Tooltip content="Reviewer Approve">
                                <IconButton
                                  variant="text"
                                  color="indigo"
                                  size="sm"
                                  onClick={() => openActionModal(req, 'reviewer')}
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isReviewerApproved && (
                              <Tooltip content="Mark as Paid">
                                <IconButton
                                  variant="text"
                                  color="blue"
                                  size="sm"
                                  onClick={() => openActionModal(req, 'pay')}
                                >
                                  <CurrencyDollarIcon className="h-5 w-5" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip content="View Details">
                              <IconButton
                                variant="text"
                                color="blue"
                                size="sm"
                                onClick={() => navigate(`/DirectPurchase/${req.id}`)}
                              >
                                <EyeIcon className="h-5 w-5" />
                              </IconButton>
                            </Tooltip>
                            {(isPending || isRejected) && (
                              <Tooltip content="Delete">
                                <IconButton
                                  variant="text"
                                  color="red"
                                  size="sm"
                                  onClick={() => handleDeleteRequest(req.id)}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </IconButton>
                              </Tooltip>
                            )}
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
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'
        }`}
      >
        <main className="flex-1 mx-auto px-4 md:px-6 py-6">
          <Header
            toggleSidebar={toggleSidebar} 
            user={user} 
            onLogout={handleLogout} 
          />

          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
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
                      Direct Purchases (Minor Items)
                    </Typography>
                    <Typography variant="small" color="gray">
                      Create and manage purchases for items used immediately (not stored in inventory)
                    </Typography>
                  </div>
                </div>
                <Button
                  color="blue"
                  className="flex items-center gap-2"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <PlusIcon className="h-5 w-5" />
                  New Request
                </Button>
              </div>
            </div>

            {error && (
              <Alert color="red" className="mb-6 flex items-center gap-3">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <Typography>{error}</Typography>
              </Alert>
            )}

            {/* ========== CLICKABLE SUMMARY CARDS ========== */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => handleCardClick('all')}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="small" color="gray">Total</Typography>
                      <Typography variant="h4">{stats.total}</Typography>
                    </div>
                    <Badge content={stats.total} color="gray">
                      <ClipboardDocumentListIcon className="h-8 w-8 text-gray-500" />
                    </Badge>
                  </div>
                </CardBody>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => handleCardClick('pending')}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="small" color="gray">Pending</Typography>
                      <Typography variant="h4" className="text-yellow-600">{stats.pending}</Typography>
                    </div>
                    <Badge content={stats.pending} color="yellow">
                      <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-500" />
                    </Badge>
                  </div>
                </CardBody>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => handleCardClick('accountant')}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="small" color="gray">Accountant Approved</Typography>
                      <Typography variant="h4" className="text-indigo-600">{stats.accountantApproved}</Typography>
                    </div>
                    <Badge content={stats.accountantApproved} color="indigo">
                      <CheckCircleIcon className="h-8 w-8 text-indigo-500" />
                    </Badge>
                  </div>
                </CardBody>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => handleCardClick('reviewer')}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="small" color="gray">Reviewer Approved</Typography>
                      <Typography variant="h4" className="text-green-600">{stats.reviewerApproved}</Typography>
                    </div>
                    <Badge content={stats.reviewerApproved} color="green">
                      <CheckCircleIcon className="h-8 w-8 text-green-500" />
                    </Badge>
                  </div>
                </CardBody>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => handleCardClick('rejected')}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="small" color="gray">Rejected</Typography>
                      <Typography variant="h4" className="text-red-600">{stats.rejected}</Typography>
                    </div>
                    <Badge content={stats.rejected} color="red">
                      <XCircleIcon className="h-8 w-8 text-red-500" />
                    </Badge>
                  </div>
                </CardBody>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => handleCardClick('paid')}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="small" color="gray">Paid</Typography>
                      <Typography variant="h4" className="text-blue-600">{stats.paid}</Typography>
                    </div>
                    <Badge content={stats.paid} color="blue">
                      <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card className="mb-6 p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-64">
                  <Typography variant="small" className="font-semibold mb-2">Search</Typography>
                  <Input
                    placeholder="Search by requester, accountant, item description, request #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                  />
                </div>
                <div>
                  <Typography variant="small" className="font-semibold mb-2">Status Filter</Typography>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    {Object.keys(STATUS_CONFIG).map(status => (
                      <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* ========== TABS (including 'All') ========== */}
            <Card>
              <Tabs value={activeTab} className="overflow-visible">
                <TabsHeader className="bg-transparent border-b border-gray-200 p-0">
                  <Tab
                    value="all"
                    onClick={() => { setActiveTab('all'); setFilterStatus('all'); }}
                    className="py-4 px-6 font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardDocumentListIcon className="h-5 w-5" />
                      All ({filteredRequests.length})
                    </div>
                  </Tab>
                  <Tab
                    value="pending"
                    onClick={() => { setActiveTab('pending'); setFilterStatus('PENDING'); }}
                    className="py-4 px-6 font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardDocumentListIcon className="h-5 w-5" />
                      Pending ({pending.length})
                    </div>
                  </Tab>
                  <Tab
                    value="accountant"
                    onClick={() => { setActiveTab('accountant'); setFilterStatus('ACCOUNTANT_APPROVED'); }}
                    className="py-4 px-6 font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5" />
                      Accountant Approved ({accountantApproved.length})
                    </div>
                  </Tab>
                  <Tab
                    value="reviewer"
                    onClick={() => { setActiveTab('reviewer'); setFilterStatus('REVIEWER_APPROVED'); }}
                    className="py-4 px-6 font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5" />
                      Reviewer Approved ({reviewerApproved.length})
                    </div>
                  </Tab>
                  <Tab
                    value="rejected"
                    onClick={() => { setActiveTab('rejected'); setFilterStatus('REJECTED'); }}
                    className="py-4 px-6 font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <XCircleIcon className="h-5 w-5" />
                      Rejected ({rejected.length})
                    </div>
                  </Tab>
                  <Tab
                    value="paid"
                    onClick={() => { setActiveTab('paid'); setFilterStatus('PAID'); }}
                    className="py-4 px-6 font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-5 w-5" />
                      Paid ({paid.length})
                    </div>
                  </Tab>
                </TabsHeader>
                <TabsBody>
                  <TabPanel value="all">
                    <RequestsTable requestList={filteredRequests} showActions={true} />
                  </TabPanel>
                  <TabPanel value="pending">
                    <RequestsTable requestList={filteredRequests} showActions={true} />
                  </TabPanel>
                  <TabPanel value="accountant">
                    <RequestsTable requestList={filteredRequests} showActions={true} />
                  </TabPanel>
                  <TabPanel value="reviewer">
                    <RequestsTable requestList={filteredRequests} showActions={true} />
                  </TabPanel>
                  <TabPanel value="rejected">
                    <RequestsTable requestList={filteredRequests} showActions={true} />
                  </TabPanel>
                  <TabPanel value="paid">
                    <RequestsTable requestList={filteredRequests} showActions={true} />
                  </TabPanel>
                </TabsBody>
              </Tabs>
            </Card>

            {/* ... modals unchanged ... */}
            <Dialog open={isCreateModalOpen} handler={() => setIsCreateModalOpen(false)} size="lg">
              <DialogHeader className="border-b border-gray-200 p-6">
                <Typography variant="h5">New Direct Purchase Request</Typography>
              </DialogHeader>
              <form onSubmit={handleSubmitRequest}>
                <DialogBody className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Typography variant="small" className="font-semibold mb-2">Request Date</Typography>
                      <Input
                        type="date"
                        name="requestDate"
                        value={newRequest.requestDate}
                        onChange={handleNewRequestChange}
                        required
                      />
                    </div>
                    <div>
                      <Typography variant="small" className="font-semibold mb-2">Requester (Procurement Officer)</Typography>
                      <Input
                        type="text"
                        name="requester"
                        value={newRequest.requester}
                        onChange={handleNewRequestChange}
                        placeholder="Enter requester name"
                        required
                      />
                    </div>
                    <div>
                      <Typography variant="small" className="font-semibold mb-2">Accountant (First Approver)</Typography>
                      <Input
                        type="text"
                        name="accountant"
                        value={newRequest.accountant}
                        onChange={handleNewRequestChange}
                        placeholder="Enter accountant name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Typography variant="small" className="font-semibold">Items</Typography>
                      <Button
                        size="sm"
                        color="blue"
                        variant="outlined"
                        onClick={handleAddItemRow}
                        className="flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" /> Add Item
                      </Button>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full min-w-max">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left text-xs font-medium text-gray-500">Description</th>
                            <th className="p-2 text-left text-xs font-medium text-gray-500">Qty</th>
                            <th className="p-2 text-left text-xs font-medium text-gray-500">Unit Price ($)</th>
                            <th className="p-2 text-left text-xs font-medium text-gray-500">Total ($)</th>
                            <th className="p-2 text-center text-xs font-medium text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newRequest.items.map((item, index) => (
                            <tr key={index} className="border-t border-gray-200">
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                  placeholder="Item description"
                                  size="lg"
                                  required
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  min="1"
                                  step="1"
                                  className="w-20"
                                  required
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                  className="w-24"
                                  required
                                />
                              </td>
                              <td className="p-2">
                                <Typography variant="small" className="font-semibold text-green-600">
                                  ${(item.total || 0).toFixed(2)}
                                </Typography>
                              </td>
                              <td className="p-2 text-center">
                                <IconButton
                                  variant="text"
                                  color="red"
                                  size="sm"
                                  onClick={() => handleRemoveItemRow(index)}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </IconButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="3" className="p-2 text-right font-bold">Grand Total:</td>
                            <td className="p-2 font-bold text-lg text-green-600">
                              ${newRequest.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div>
                    <Typography variant="small" className="font-semibold mb-2">Notes (Optional)</Typography>
                    <Textarea
                      name="notes"
                      value={newRequest.notes}
                      onChange={handleNewRequestChange}
                      rows={2}
                      placeholder="Any additional information..."
                    />
                  </div>
                </DialogBody>
                <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
                  <Button variant="outlined" color="gray" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                  <Button type="submit" color="blue" disabled={isSubmitting} className="flex items-center gap-2">
                    {isSubmitting ? <Spinner className="h-4 w-4" /> : <CheckIcon className="h-5 w-5" />}
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </form>
            </Dialog>

            <Dialog open={isActionModalOpen} handler={() => setIsActionModalOpen(false)} size="md">
              <DialogHeader className="border-b border-gray-200 p-6">
                <Typography variant="h5">
                  {actionType === 'approve' && 'Approve by Accountant'}
                  {actionType === 'reviewer' && 'Reviewer Approval'}
                  {actionType === 'reject' && 'Reject Request'}
                  {actionType === 'pay' && 'Mark as Paid'}
                </Typography>
              </DialogHeader>
              <DialogBody className="p-6">
                {selectedRequest && (
                  <div className="mb-4">
                    <Typography variant="small" className="font-semibold">Request #{selectedRequest.requestNumber || selectedRequest.id}</Typography>
                    <Typography variant="small" className="text-gray-600">
                      Requester: {selectedRequest.requester} | Amount: ${(selectedRequest.totalAmount || 0).toFixed(2)}
                    </Typography>
                  </div>
                )}
                <div>
                  <Typography variant="small" className="font-semibold mb-2">
                    {actionType === 'approve' ? 'Approval Notes' :
                     actionType === 'reviewer' ? 'Reviewer Notes' :
                     actionType === 'reject' ? 'Rejection Reason' :
                     'Payment Notes'}
                  </Typography>
                  <Textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                    placeholder={actionType === 'reject' ? 'Why are you rejecting this request?' : 'Add any notes...'}
                    required={actionType === 'reject'}
                  />
                </div>
              </DialogBody>
              <DialogFooter className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <Button variant="outlined" color="gray" onClick={() => setIsActionModalOpen(false)}>Cancel</Button>
                <Button
                  color={actionType === 'approve' ? 'green' : actionType === 'reviewer' ? 'indigo' : actionType === 'reject' ? 'red' : 'blue'}
                  onClick={handleActionConfirm}
                  disabled={isSubmitting || (actionType === 'reject' && !actionNotes.trim())}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? <Spinner className="h-4 w-4" /> :
                    actionType === 'approve' ? <CheckIcon className="h-5 w-5" /> :
                    actionType === 'reviewer' ? <CheckIcon className="h-5 w-5" /> :
                    actionType === 'reject' ? <XMarkIcon className="h-5 w-5" /> :
                    <CurrencyDollarIcon className="h-5 w-5" />
                  }
                  {isSubmitting ? 'Processing...' :
                    actionType === 'approve' ? 'Approve (Accountant)' :
                    actionType === 'reviewer' ? 'Approve (Reviewer)' :
                    actionType === 'reject' ? 'Reject' : 'Mark Paid'}
                </Button>
              </DialogFooter>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DirectPurchase;