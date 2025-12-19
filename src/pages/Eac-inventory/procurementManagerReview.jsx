import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  XCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BeakerIcon,
  CubeIcon,
  WrenchScrewdriverIcon
} from "@heroicons/react/24/outline";
import { REQUEST_STATUS, STATUS_LABELS, STATUS_COLORS } from '../../config/dataModels';


const ProcurementManagerReview = () => {
  const navigate = useNavigate();
  
  // State for both types of requests
  const [inventoryRequests, setInventoryRequests] = useState([]);
  const [ppeRequests, setPpeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [requestType, setRequestType] = useState('inventory'); // 'inventory' or 'ppe'
  
  // Modal states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  
  // Review form state
  const [reviewForm, setReviewForm] = useState({
    quantity_approved: '',
    comments: '',
    size_requirements: '',
    training_required: false,
    safety_certifications: []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

   const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log("🖥️ Current hostname:", hostname);
  console.log("🔌 Current port:", port);

  // If frontend is opened via localhost → use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  // Public / Tailscale / Cloudflare IP
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }

  // Default fallback
  console.log("🌍 Using PUBLIC API URL (fallback)");
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

  const API_BASE_URL = getApiBaseUrl();

  // Fetch both types of requests
  useEffect(() => {
    fetchAllRequests();
  }, []);

  // FIXED VERSION
const fetchAllRequests = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('jwtToken');
    
    const response = await fetch(`${API_BASE_URL}/api/inventory-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch requests: ${response.status}`);
    }

    const data = await response.json();
    
    // DEBUG: Log all received requests
    console.log("DEBUG - All requests from API:", data);
    console.log("DEBUG - Request count:", data.length);
    
    data.forEach((request, index) => {
      console.log(`DEBUG - Request ${index}:`, {
        id: request.id,
        status: request.status,
        ppeRequest: request.ppeRequest,
        requestNumber: request.requestNumber
      });
    });
    
    const inventoryReqs = [];
    const ppeReqs = [];
    
    data.forEach(request => {
      const transformedRequest = transformRequestData(request);
      
      console.log(`DEBUG - Checking request ${request.id}: status=${request.status}, ppe=${request.ppeRequest}`);
      
     const isProcurementVisible = 
  request.status === 'PROCUREMENT_PENDING' || 
  request.status === 'APPROVED_BY_PLANNER' ||  // Some might still be in this state
  request.status === 'PROCURED' ||
  request.status === 'REJECTED_BY_PROCUREMENT' ||
  request.status === 'STORE_REVIEW';  // For tracking after procurement approval
      
      console.log(`DEBUG - isProcurementVisible: ${isProcurementVisible}`);
      
      if (isProcurementVisible) {
        if (request.ppeRequest) {
          ppeReqs.push(transformedRequest);
          console.log(`DEBUG - Added to PPE: ${request.requestNumber}`);
        } else {
          inventoryReqs.push(transformedRequest);
          console.log(`DEBUG - Added to Inventory: ${request.requestNumber}`);
        }
      }
    });
    
    console.log(`DEBUG - Final counts: Inventory=${inventoryReqs.length}, PPE=${ppeReqs.length}`);
    
    setInventoryRequests(inventoryReqs);
    setPpeRequests(ppeReqs);
    setError(null);
    
  } catch (err) {
    console.error('Error fetching requests:', err);
    setError('Failed to load requests from server');
    loadMockData();
  } finally {
    setLoading(false);
  }
};

const transformRequestData = (request) => {
  const totalQuantity = request.items?.reduce((sum, item) => sum + (item.requestedQuantity || 0), 0) || 0;
  const approvedQuantity = request.items?.reduce((sum, item) => sum + (item.approvedQuantity || 0), 0) || 0;
  
  // Create product_details from items
  const product_details = request.items?.map(item => ({
    name: item.productName,
    quantity: item.requestedQuantity,
    code: item.productCode,
    category: item.category || '',
    currentStock: item.currentStock
  })) || [];
  
  return {
    id: request.id,
    request_number: request.requestNumber || `REQ-${request.id}`,
    type: request.ppeRequest ? 'ppe' : 'inventory',
    employee_id: request.requestedBy || 'Unknown',
    employee_name: request.requestedBy,
    department: request.department || 'Unknown',
    product_name: request.items?.map(item => item.productName).join(', ') || 'Multiple Items',
    product_details: product_details, // ← Use the transformed array
    ppe_items: request.items || [],
    ppe_categories: request.items?.map(item => item.productName).filter((v, i, a) => a.indexOf(v) === i) || [],
    quantity_requested: totalQuantity,
    quantity_approved: approvedQuantity,
    unit_cost: request.estimatedCost || 0,
    total_cost: request.estimatedCost || 0,
     estimated_cost: request.estimatedCost || 0,
    purpose: request.notes || request.projectName || 'No purpose provided',
    status: mapInventoryStatus(request.status),
    originalStatus: request.status,
    created_at: request.requestDate || new Date().toISOString(),
    location: request.location || 'Main Store',
    job: request.jobDescription || request.projectName || 'General Request',
    urgency: request.urgency || 'normal',
    is_ppe: request.ppeRequest || false,
    items: request.items || [],
    planner_notes: request.plannerNotes,
    procurement_notes: request.procurementNotes,
    estimated_cost: request.estimatedCost,
    delivery_date: request.deliveryDate
  };
};

const mapInventoryStatus = (status) => {
  const statusMap = {
    'PENDING': REQUEST_STATUS.PENDING,
    'PENDING_PLANNER': REQUEST_STATUS.PENDING,
    'PROCUREMENT_PENDING': REQUEST_STATUS.PENDING,
    'APPROVED_BY_PLANNER': REQUEST_STATUS.PENDING,
    'PROCURED': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
    'REJECTED_BY_PLANNER': REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
    'REJECTED_BY_PROCUREMENT': REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
    'STORE_REVIEW': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,  // After procurement
    'PENDING_STORE': REQUEST_STATUS.PENDING,  // For non-PPE that skip procurement
    'APPROVED_BY_STORE': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
    'REJECTED_BY_STORE': REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
    'ISSUED': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
    'RECEIVED_IN_STORE': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
  };
  return statusMap[status] || REQUEST_STATUS.PENDING;
};


  const fetchInventoryRequests = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      
      // Fetch inventory requests
      const response = await fetch(`${API_BASE_URL}/api/products/requests?type=inventory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory requests: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform API data for inventory requests
      const transformedRequests = data.requests?.map(request => ({
        id: request.id || request.request_id,
        request_number: request.requestNumber || `INV-${request.id}`,
        type: 'inventory',
        employee_id: request.requestedBy || 'Unknown',
        employee_name: request.employeeName || request.requestedBy,
        department: request.department || 'Unknown',
        product_name: request.productNames?.join(', ') || 'Multiple Items',
        product_details: request.products || [],
        quantity_requested: request.totalQuantity || 1,
        quantity_approved: request.quantity_approved || 0,
        unit_cost: request.estimatedCost || request.totalCost || 0,
        total_cost: request.totalCost || 0,
        purpose: request.notes || request.projectName || 'No purpose provided',
        status: mapStatusToRequestStatus(request.status),
        created_at: request.createdAt || new Date().toISOString(),
        location: request.location || 'Main Store',
        job: request.job || request.projectName || 'General Request',
        urgency: request.urgency || 'normal',
        is_ppe: false
      })) || [];

      setInventoryRequests(transformedRequests);
    } catch (err) {
      console.error('Error fetching inventory requests:', err);
      // Will fall back to mock data if needed
    }
  };

  const fetchPpeRequests = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      
      // Fetch PPE requests (using separate endpoint)
      const response = await fetch(`${API_BASE_URL}/api/ppe/requests?type=ppe`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // Try alternative endpoint
        const altResponse = await fetch(`${API_BASE_URL}/api/products/requests?type=ppe`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!altResponse.ok) {
          throw new Error('Failed to fetch PPE requests');
        }

        const altData = await altResponse.json();
        processPpeData(altData);
      } else {
        const data = await response.json();
        processPpeData(data);
      }
    } catch (err) {
      console.error('Error fetching PPE requests:', err);
      // Will fall back to mock data if needed
    }
  };

  const processPpeData = (data) => {
    const transformedRequests = data.requests?.map(request => ({
      id: request.id || request.request_id,
      request_number: request.requestNumber || `PPE-${request.id}`,
      type: 'ppe',
      employee_id: request.requestedBy || 'Unknown',
      employee_name: request.employeeName || request.requestedBy,
      department: request.department || 'Unknown',
      ppe_items: request.ppeItems || request.products || [],
      ppe_categories: request.categories || [],
      quantity_requested: request.personnelCount || request.totalQuantity || 1,
      quantity_approved: request.quantity_approved || 0,
      unit_cost: request.estimatedCost || request.totalCost || 0,
      total_cost: request.totalCost || 0,
      purpose: request.notes || request.projectName || 'Safety equipment request',
      status: mapStatusToRequestStatus(request.status),
      created_at: request.createdAt || new Date().toISOString(),
      location: request.location || 'Safety Store',
      job: request.job || request.projectName || 'Safety Equipment',
      urgency: request.urgency || 'normal',
      is_ppe: true,
      size_requirements: request.sizeRequirements || '',
      training_required: request.trainingRequired || false,
      safety_certifications: request.safetyCertifications || []
    })) || [];

    setPpeRequests(transformedRequests);
  };

  // Map inventory status to procurement status
  const mapStatusToRequestStatus = (inventoryStatus) => {
    const statusMap = {
      'pending': REQUEST_STATUS.PENDING,
      'approved': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
      'rejected': REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
      'processing': REQUEST_STATUS.PENDING,
      'completed': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
      'cancelled': REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
      'awaiting_safety_review': REQUEST_STATUS.PENDING,
      'safety_approved': REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
      'safety_rejected': REQUEST_STATUS.REJECTED_BY_PROCUREMENT
    };
    
    return statusMap[inventoryStatus] || REQUEST_STATUS.PENDING;
  };

  // Load mock data for demonstration
  const loadMockData = () => {
    const mockInventoryRequests = [
      {
        id: 1,
        request_number: 'INV-001',
        type: 'inventory',
        employee_id: 'EMP-1001',
        employee_name: 'John Smith',
        department: 'Maintenance',
        product_name: 'Safety Helmet, Safety Gloves',
        product_details: [
          { name: 'Safety Helmet', quantity: 5, code: 'SH-001', category: 'Head Protection' },
          { name: 'Safety Gloves', quantity: 10, code: 'SG-001', category: 'Hand Protection' }
        ],
        quantity_requested: 15,
        unit_cost: 45.00,
        total_cost: 675.00,
        purpose: 'Safety equipment for construction team',
        status: REQUEST_STATUS.PENDING,
        created_at: '2024-01-15T10:30:00Z',
        location: 'Main Store',
        job: 'Construction Project - Phase 2',
        urgency: 'high',
        is_ppe: false
      },
      {
        id: 2,
        request_number: 'INV-002',
        type: 'inventory',
        employee_id: 'EMP-1002',
        employee_name: 'Sarah Johnson',
        department: 'Engineering',
        product_name: 'Power Tools Set',
        product_details: [
          { name: 'Drill Machine', quantity: 3, code: 'DRL-001', category: 'Tools' },
          { name: 'Angle Grinder', quantity: 2, code: 'AGR-001', category: 'Tools' }
        ],
        quantity_requested: 5,
        unit_cost: 250.00,
        total_cost: 1250.00,
        purpose: 'Equipment for maintenance work',
        status: REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
        created_at: '2024-01-14T14:20:00Z',
        location: 'Engineering Store',
        job: 'Preventive Maintenance',
        urgency: 'normal',
        is_ppe: false
      }
    ];

    const mockPpeRequests = [
      {
        id: 101,
        request_number: 'PPE-001',
        type: 'ppe',
        employee_id: 'EMP-2001',
        employee_name: 'Michael Brown',
        department: 'Safety Department',
        ppe_items: [
          { name: 'Safety Harness', quantity: 8, code: 'SH-200', category: 'Fall Protection', size: 'Large' },
          { name: 'Full Body Harness', quantity: 8, code: 'FBH-100', category: 'Fall Protection', size: 'XL' }
        ],
        ppe_categories: ['Fall Protection'],
        quantity_requested: 8,
        unit_cost: 120.00,
        total_cost: 960.00,
        purpose: 'Height work safety equipment for new construction team',
        status: REQUEST_STATUS.PENDING,
        created_at: '2024-01-16T09:15:00Z',
        location: 'Safety Equipment Store',
        job: 'Construction - High Rise Building',
        urgency: 'urgent',
        is_ppe: true,
        size_requirements: 'Large and XL sizes required',
        training_required: true,
        safety_certifications: ['Fall Protection Training', 'OSHA Certified']
      },
      {
        id: 102,
        request_number: 'PPE-002',
        type: 'ppe',
        employee_id: 'EMP-2002',
        employee_name: 'Lisa Wilson',
        department: 'Chemical Lab',
        ppe_items: [
          { name: 'Chemical Resistant Suit', quantity: 5, code: 'CRS-500', category: 'Chemical Protection', size: 'Medium' },
          { name: 'Respirator Mask', quantity: 5, code: 'RM-300', category: 'Respiratory Protection' }
        ],
        ppe_categories: ['Chemical Protection', 'Respiratory Protection'],
        quantity_requested: 5,
        unit_cost: 350.00,
        total_cost: 1750.00,
        purpose: 'Chemical handling safety equipment',
        status: REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
        created_at: '2024-01-15T16:45:00Z',
        location: 'Chemical Safety Store',
        job: 'Chemical Research Project',
        urgency: 'high',
        is_ppe: true,
        size_requirements: 'Medium size suits',
        training_required: true,
        safety_certifications: ['Chemical Safety Training']
      }
    ];

    setInventoryRequests(mockInventoryRequests);
    setPpeRequests(mockPpeRequests);
  };

  // Get current requests based on selected type
  const getCurrentRequests = () => {
    return requestType === 'inventory' ? inventoryRequests : ppeRequests;
  };

  // Open review modal
  const handleReviewRequest = (request, action) => {
    setCurrentRequest(request);
    setReviewAction(action);
    
    // Initialize form based on request type
    const baseForm = {
      quantity_approved: request.quantity_requested || '',
      comments: '',
      size_requirements: request.size_requirements || '',
      training_required: request.training_required || false,
      safety_certifications: request.safety_certifications || []
    };
    
    setReviewForm(baseForm);
    setIsReviewModalOpen(true);
  };

  // Close review modal
  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setCurrentRequest(null);
    setReviewAction(null);
    setReviewForm({
      quantity_approved: '',
      comments: '',
      size_requirements: '',
      training_required: false,
      safety_certifications: []
    });
  };
// Submit approval
// Submit approval
const handleApprove = async () => {
  if (!currentRequest) return;

  console.log("DEBUG handleApprove - currentRequest:", currentRequest);
  console.log("DEBUG handleApprove - originalStatus:", currentRequest.originalStatus);
  console.log("DEBUG handleApprove - mapped status:", currentRequest.status);
  console.log("DEBUG handleApprove - is_ppe:", currentRequest.is_ppe);

  // Check if request is in a state that procurement can approve
  // Procurement can ONLY approve PROCUREMENT_PENDING or APPROVED_BY_PLANNER
  const procurementApprovableStatuses = ['PROCUREMENT_PENDING', 'APPROVED_BY_PLANNER'];
  const apiStatus = currentRequest.originalStatus || currentRequest.status;
  
  console.log("DEBUG handleApprove - Checking status:", apiStatus);
  
  if (!procurementApprovableStatuses.includes(apiStatus)) {
    let errorMessage = `Cannot approve request. Current status: ${apiStatus}`;
    
    if (apiStatus === 'PENDING') {
      errorMessage = 'Request is still pending planner approval. Cannot approve yet.';
    } else if (apiStatus === 'PROCURED') {
      errorMessage = 'Request already approved by procurement and sent to store.';
    } else if (apiStatus === 'REJECTED_BY_PROCUREMENT') {
      errorMessage = 'Request already rejected by procurement.';
    } else if (apiStatus === 'STORE_REVIEW') {
      errorMessage = 'Request already sent to store for review.';
    } else if (apiStatus === 'APPROVED_BY_STORE') {
      errorMessage = 'Request already approved by store.';
    } else if (apiStatus === 'ISSUED') {
      errorMessage = 'Request already issued to employee.';
    } else if (apiStatus === 'RECEIVED_IN_STORE') {
      errorMessage = 'Request already received in store.';
    }
    
    toast.error(errorMessage);
    return;
  }

  // Validation based on request type
  if (currentRequest.type === 'inventory') {
    if (!reviewForm.quantity_approved || reviewForm.quantity_approved <= 0) {
      toast.error('Please enter a valid approved quantity');
      return;
    }
    if (reviewForm.quantity_approved > currentRequest.quantity_requested) {
      toast.error(`Approved quantity cannot exceed requested quantity (${currentRequest.quantity_requested})`);
      return;
    }
  } else {
    // PPE specific validation
    if (reviewForm.training_required && !reviewForm.comments) {
      toast.error('Please specify training requirements in comments');
      return;
    }
    if (!reviewForm.quantity_approved || reviewForm.quantity_approved <= 0) {
      toast.error('Please enter a valid approved personnel count');
      return;
    }
    if (reviewForm.quantity_approved > currentRequest.quantity_requested) {
      toast.error(`Approved personnel count cannot exceed requested count (${currentRequest.quantity_requested})`);
      return;
    }
  }

  // Optional: Validate comments are not empty
  if (!reviewForm.comments || reviewForm.comments.trim() === '') {
    if (!confirm('You haven\'t added any comments. Continue without comments?')) {
      return;
    }
  }

  setIsSubmitting(true);
  try {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      toast.error('Authentication token not found. Please log in again.');
      setIsSubmitting(false);
      return;
    }

    const username = localStorage.getItem('username') || 'Procurement Manager';
    
    // FIXED ENDPOINT - for both inventory and PPE
    const endpoint = `${API_BASE_URL}/api/inventory-requests/${currentRequest.id}/procurement-approve`;
    
    const payload = {
      approvedBy: username,
      notes: reviewForm.comments || '',
      estimatedCost: currentRequest.estimated_cost || 0,
      // You can add deliveryDate if you have a date picker in your form
      // deliveryDate: reviewForm.delivery_date || new Date().toISOString()
    };

    console.log("DEBUG handleApprove - Calling endpoint:", endpoint);
    console.log("DEBUG handleApprove - Payload:", payload);

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log("DEBUG handleApprove - Response status:", response.status);
    
    if (!response.ok) {
      let errorMessage = `Failed to approve request: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error("DEBUG handleApprove - Error response text:", errorText);
        
        // Try to parse as JSON for structured error
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText || `Server error: ${response.status}`;
        }
      } catch (textError) {
        console.error("DEBUG handleApprove - Could not read error response:", textError);
      }
      
      // Check for specific status codes
      if (response.status === 400) {
        errorMessage = 'Bad request. Please check your input.';
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to approve requests.';
      } else if (response.status === 404) {
        errorMessage = 'Request not found. It may have been deleted.';
      } else if (response.status === 409) {
        errorMessage = 'Request status conflict. Cannot approve in current state.';
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log("DEBUG handleApprove - Success response:", responseData);

    // Update local state based on response
    const updatedStatus = responseData.status || 'PROCURED';
    
    if (currentRequest.type === 'inventory') {
      setInventoryRequests(prev => 
        prev.map(req => 
          req.id === currentRequest.id 
            ? { 
                ...req, 
                status: REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
                originalStatus: updatedStatus,
                quantity_approved: parseInt(reviewForm.quantity_approved),
                procurement_notes: reviewForm.comments,
                estimated_cost: payload.estimatedCost
              }
            : req
        )
      );
    } else {
      setPpeRequests(prev => 
        prev.map(req => 
          req.id === currentRequest.id 
            ? { 
                ...req, 
                status: REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
                originalStatus: updatedStatus,
                quantity_approved: parseInt(reviewForm.quantity_approved),
                size_requirements: reviewForm.size_requirements,
                training_required: reviewForm.training_required,
                safety_certifications: reviewForm.safety_certifications,
                procurement_notes: reviewForm.comments,
                estimated_cost: payload.estimatedCost
              }
            : req
        )
      );
    }
    
    toast.success('Request approved successfully! Moving to store review.');
    closeReviewModal();
    
    // Optional: Refresh data after approval to get latest status
    setTimeout(() => {
      fetchAllRequests();
    }, 1000);
    
  } catch (err) {
    console.error('Error approving request:', err);
    
    // Show user-friendly error message
    let userErrorMessage = `Failed to approve request: ${err.message}`;
    
    if (err.message.includes('Request is not in procurement pending status')) {
      userErrorMessage = 'Cannot approve this request. It may have already been processed or is not in the correct status for procurement approval.';
    } else if (err.message.includes('Failed to fetch')) {
      userErrorMessage = 'Cannot connect to server. Please check your internet connection.';
    } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      userErrorMessage = 'Session expired. Please log in again.';
    } else if (err.message.includes('NetworkError')) {
      userErrorMessage = 'Network error. Please check your connection.';
    }
    
    toast.error(userErrorMessage);
    
    // Optional: Log to error tracking service
    // logErrorToService(err, { requestId: currentRequest.id, action: 'approve' });
    
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

  // Check if request is in a state that procurement can reject
  const procurementRejectableStatuses = ['PROCUREMENT_PENDING', 'APPROVED_BY_PLANNER'];
  const apiStatus = currentRequest.originalStatus || currentRequest.status;
  
  if (!procurementRejectableStatuses.includes(apiStatus)) {
    let errorMessage = `Cannot reject request. Current status: ${apiStatus}`;
    
    if (apiStatus === 'PROCURED') {
      errorMessage = 'Request already approved by procurement and sent to store. Cannot reject.';
    } else if (apiStatus === 'REJECTED_BY_PROCUREMENT') {
      errorMessage = 'Request already rejected by procurement.';
    } else if (apiStatus === 'STORE_REVIEW') {
      errorMessage = 'Request already sent to store for review. Cannot reject.';
    } else if (apiStatus === 'PENDING') {
      errorMessage = 'Request is still pending planner approval. Cannot reject yet.';
    }
    
    toast.error(errorMessage);
    return;
  }

  setIsSubmitting(true);
  try {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      toast.error('Authentication token not found. Please log in again.');
      setIsSubmitting(false);
      return;
    }
    
    // FIXED ENDPOINT - for both inventory and PPE
    const endpoint = `${API_BASE_URL}/api/inventory-requests/${currentRequest.id}/procurement-reject`;
    
    const payload = {
      approvedBy: localStorage.getItem('username') || 'Procurement Manager',
      notes: reviewForm.comments
    };

    console.log("DEBUG handleReject - Calling endpoint:", endpoint);
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = `Failed to reject request: ${response.status}`;
      try {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      } catch {
        // Ignore if can't read response
      }
      throw new Error(errorMessage);
    }

    // Update local state
    if (currentRequest.type === 'inventory') {
      setInventoryRequests(prev => 
        prev.map(req => 
          req.id === currentRequest.id 
            ? { 
                ...req, 
                status: REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
                originalStatus: 'REJECTED_BY_PROCUREMENT',
                procurement_notes: reviewForm.comments
              }
            : req
        )
      );
    } else {
      setPpeRequests(prev => 
        prev.map(req => 
          req.id === currentRequest.id 
            ? { 
                ...req, 
                status: REQUEST_STATUS.REJECTED_BY_PROCUREMENT,
                originalStatus: 'REJECTED_BY_PROCUREMENT',
                procurement_notes: reviewForm.comments
              }
            : req
        )
      );
    }
    
    toast.success('Request rejected successfully!');
    closeReviewModal();
    
  } catch (err) {
    console.error('Error rejecting request:', err);
    
    let userErrorMessage = `Failed to reject request: ${err.message}`;
    
    if (err.message.includes('Request is not in procurement pending status')) {
      userErrorMessage = 'Cannot reject this request. It may have already been processed.';
    } else if (err.message.includes('Failed to fetch')) {
      userErrorMessage = 'Cannot connect to server. Please check your connection.';
    }
    
    toast.error(userErrorMessage);
  } finally {
    setIsSubmitting(false);
  }
};

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setReviewForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Filter requests based on selected type
  const filterRequests = (requests) => {
    return requests.filter(req => {
      const matchesSearch = 
        req.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employee_id?.toString().includes(searchTerm) ||
        req.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.type === 'inventory' 
          ? req.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
          : req.ppe_items?.some(item => 
              item.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        ) ||
        req.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.job?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Get filtered requests
  const filteredRequests = filterRequests(getCurrentRequests());

  // Group requests by status
  const pendingRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.PENDING);
  const approvedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT);
  const rejectedRequests = filteredRequests.filter(r => r.status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Chip component
  const Chip = ({ value, color = 'gray', variant = 'filled', size = 'md', className = '' }) => {
    const colorClasses = {
      blue: variant === 'filled' ? 'bg-blue-100 text-blue-800' : 'border border-blue-500 text-blue-500',
      green: variant === 'filled' ? 'bg-green-100 text-green-800' : 'border border-green-500 text-green-500',
      red: variant === 'filled' ? 'bg-red-100 text-red-800' : 'border border-red-500 text-red-500',
      yellow: variant === 'filled' ? 'bg-yellow-100 text-yellow-800' : 'border border-yellow-500 text-yellow-500',
      purple: variant === 'filled' ? 'bg-purple-100 text-purple-800' : 'border border-purple-500 text-purple-500',
      gray: variant === 'filled' ? 'bg-gray-100 text-gray-800' : 'border border-gray-500 text-gray-500',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
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
      purple: 'bg-purple-500 text-white',
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
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };

    return (
      <div className={`flex items-center p-4 mb-4 border rounded-lg ${colorClasses[color]} ${className}`}>
        {children}
      </div>
    );
  };

  // Urgency Badge component
  const UrgencyBadge = ({ urgency }) => {
    const urgencyConfig = {
      low: { color: 'green', label: 'Low' },
      normal: { color: 'blue', label: 'Normal' },
      high: { color: 'yellow', label: 'High' },
      urgent: { color: 'red', label: 'Urgent' }
    };

    const config = urgencyConfig[urgency] || urgencyConfig.normal;
    
    return (
      <Chip 
        value={config.label} 
        color={config.color}
        size="sm"
        className="capitalize"
      />
    );
  };

  // Request Type Badge component
  const RequestTypeBadge = ({ type }) => {
    const typeConfig = {
      inventory: { color: 'blue', icon: CubeIcon, label: 'Inventory' },
      ppe: { color: 'purple', icon: ShieldCheckIcon, label: 'PPE' }
    };

    const config = typeConfig[type] || typeConfig.inventory;
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-1">
        <Icon className={`h-4 w-4 text-${config.color}-500`} />
        <Chip 
          value={config.label} 
          color={config.color}
          size="sm"
        />
      </div>
    );
  };

  const RequestsTable = ({ requestList, showActions = true }) => (
    <div className="overflow-hidden border border-gray-200 rounded-lg bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-50">
              {[
                "Type",
                "Request #",
                "Employee",
                "Department",
                requestType === 'inventory' ? "Product(s)" : "PPE Items",
                "Quantity",
                "Total Cost",
                "Job/Purpose",
                "Urgency",
                "Date",
                "Status",
                ...(showActions ? ["Actions"] : [])
              ].map((head) => (
                <th key={head} className="p-4 border-b border-gray-200 text-left">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {head}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requestList.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 12 : 11} className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <ClipboardDocumentListIcon className="h-12 w-12 mb-4 text-gray-300" />
                    <p className="text-sm font-medium">No {requestType} requests found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filter</p>
                  </div>
                </td>
              </tr>
            ) : (
              requestList.map((req, index) => (
                <tr key={req.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100 transition-colors"}>
                  <td className="p-4 border-b border-gray-200">
                    <RequestTypeBadge type={req.type} />
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {req.request_number}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {req.id}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {req.employee_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {req.employee_id}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <Chip 
                      value={req.department} 
                      color="blue"
                      variant="outlined"
                      size="sm"
                    />
                  </td>
            <td className="p-4 border-b border-gray-200">
  <div className="flex flex-col">
    {req.type === 'inventory' ? (
      <>
        {Array.isArray(req.items) && req.items.length > 0 ? (
          <div className="space-y-1.5">
            {req.items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="text-xs">
                {/* Product Name and Quantity */}
                <div className="flex items-baseline justify-between mb-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-medium text-gray-900 min-w-[25px]">
                      {item.requestedQuantity}x
                    </span>
                    <span className="text-gray-700 flex-1 truncate">
                      {item.productName}
                    </span>
                  </div>
                  {/* Stock Info */}
                  <div className="text-[10px] font-medium">
                    <span className={
                      item.currentStock < item.requestedQuantity 
                        ? "text-red-600" 
                        : "text-green-600"
                    }>
                      Stock: {item.currentStock}
                    </span>
                  </div>
                </div>
                
                {/* Code and Stock Status */}
                <div className="flex justify-between items-center">
                  <div className="text-gray-500 text-[10px] ml-6">
                    {item.productCode ? `Code: ${item.productCode}` : 'No code'}
                  </div>
                  {/* Stock Warning */}
                  {item.currentStock < item.requestedQuantity && (
                    <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Low Stock
                    </span>
                  )}
                </div>
              </div>
            ))}
            {req.items.length > 3 && (
              <div className="text-xs text-blue-600 pt-1">
                +{req.items.length - 3} more items
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500">No items</span>
        )}
      </>
    ) : (
                        <>
                          <span className="text-sm text-gray-900 font-medium">
                            {req.ppe_items?.length || 0} PPE Items
                          </span>
                          {Array.isArray(req.ppe_items) && req.ppe_items.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {req.ppe_items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="text-xs text-purple-600 flex items-center gap-1">
                                  <ShieldCheckIcon className="h-3 w-3" />
                                  <span className="font-medium">{item.quantity}x</span>
                                  <span>{item.name}</span>
                                </div>
                              ))}
                              {req.ppe_items.length > 2 && (
                                <div className="text-xs text-purple-600">
                                  +{req.ppe_items.length - 2} more items
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {req.quantity_requested} {req.type === 'ppe' ? 'personnel' : 'units'}
                      </span>
                      {req.quantity_approved > 0 && (
                        <span className="text-xs text-green-600">
                          Approved: {req.quantity_approved} {req.type === 'ppe' ? 'personnel' : 'units'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <span className="text-sm font-semibold text-blue-600">
                      {formatCurrency(req.total_cost || req.unit_cost * req.quantity_requested)}
                    </span>
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <div className="flex flex-col max-w-xs">
                      <span className="text-sm text-gray-900 font-medium truncate">
                        {req.job}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {req.purpose}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <UrgencyBadge urgency={req.urgency} />
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(req.created_at)}
                    </div>
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
                        {req.status === REQUEST_STATUS.PENDING && (
                          <>
                            <Tooltip content="Approve Request">
                              <button
                                className={`p-2 rounded-lg transition-colors border ${
                                  req.type === 'inventory'
                                    ? 'text-green-600 hover:bg-green-50 border-green-200 hover:border-green-300'
                                    : 'text-purple-600 hover:bg-purple-50 border-purple-200 hover:border-purple-300'
                                }`}
                                onClick={() => handleReviewRequest(req, 'approve')}
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Reject Request">
                              <button
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                                onClick={() => handleReviewRequest(req, 'reject')}
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip content="View Details">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                            onClick={() => navigate(`/${req.type === 'inventory' ? 'product' : 'ppe'}-request/${req.id}`)}
                          >
                            <MagnifyingGlassIcon className="h-5 w-5" />
                          </button>
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
    </div>
  );

  if (loading && inventoryRequests.length === 0 && ppeRequests.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Spinner className="h-12 w-12 border-4 border-blue-500" />
          <p className="mt-4 text-gray-600">Loading requests from system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Tooltip content="Go Back">
              <button
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors border border-blue-200 hover:border-blue-300"
                onClick={() => navigate(-1)}
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
            </Tooltip>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Procurement Manager Review
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve/reject inventory and PPE requests
              </p>
            </div>
          </div>
          <button
            onClick={fetchAllRequests}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
            Refresh All
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert color="red" className="mb-6">
          <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium">{error}</span>
            <p className="text-sm mt-1">
              Using demonstration data. Some features may be limited.
            </p>
          </div>
        </Alert>
      )}

      {/* Request Type Toggle */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Request Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRequestType('inventory')}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                requestType === 'inventory'
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700"
                  : "border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CubeIcon className="h-6 w-6" />
                <div>
                  <div className="font-medium">Inventory Items</div>
                  <div className="text-sm mt-1">Tools, Materials, Equipment</div>
                  <div className="text-xs mt-2 text-gray-600">
                    {inventoryRequests.length} requests
                  </div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setRequestType('ppe')}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                requestType === 'ppe'
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700"
                  : "border-gray-300 bg-gray-50 text-gray-700 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ShieldCheckIcon className="h-6 w-6" />
                <div>
                  <div className="font-medium">PPE Items</div>
                  <div className="text-sm mt-1">Safety Equipment & Gear</div>
                  <div className="text-xs mt-2 text-gray-600">
                    {ppeRequests.length} requests
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { 
            title: 'Pending Review', 
            count: pendingRequests.length, 
            color: requestType === 'inventory' ? 'blue' : 'purple', 
            icon: ClipboardDocumentListIcon,
            description: `Awaiting ${requestType} decision`
          },
          { 
            title: 'Approved', 
            count: approvedRequests.length, 
            color: 'green', 
            icon: CheckCircleIcon,
            description: 'Approved requests'
          },
          { 
            title: 'Rejected', 
            count: rejectedRequests.length, 
            color: 'red', 
            icon: XCircleIcon,
            description: 'Rejected requests'
          },
          { 
            title: 'Total', 
            count: filteredRequests.length, 
            color: 'gray', 
            icon: DocumentTextIcon,
            description: `All ${requestType} requests`
          }
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${stat.color}-50`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search {requestType === 'inventory' ? 'Inventory' : 'PPE'} Requests
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={`Search by request #, employee, ${requestType === 'inventory' ? 'product' : 'PPE item'}, department, or job...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
            >
              <option value="all">All Status</option>
              <option value={REQUEST_STATUS.PENDING}>Pending</option>
              <option value={REQUEST_STATUS.APPROVED_BY_PROCUREMENT}>Approved</option>
              <option value={REQUEST_STATUS.REJECTED_BY_PROCUREMENT}>Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests by Status Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {[
              { 
                value: 'pending', 
                label: 'Pending Review', 
                icon: ClipboardDocumentListIcon, 
                count: pendingRequests.length,
                color: requestType === 'inventory' ? 'blue' : 'purple'
              },
              { 
                value: 'approved', 
                label: 'Approved', 
                icon: CheckCircleIcon, 
                count: approvedRequests.length,
                color: 'green'
              },
              { 
                value: 'rejected', 
                label: 'Rejected', 
                icon: XCircleIcon, 
                count: rejectedRequests.length,
                color: 'red'
              }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.value
                    ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className={`h-5 w-5 ${activeTab === tab.value ? `text-${tab.color}-500` : 'text-gray-400'}`} />
                {tab.label}
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.value 
                    ? `bg-${tab.color}-100 text-${tab.color}-800` 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-0">
          {activeTab === 'pending' && <RequestsTable requestList={pendingRequests} showActions={true} />}
          {activeTab === 'approved' && <RequestsTable requestList={approvedRequests} showActions={false} />}
          {activeTab === 'rejected' && <RequestsTable requestList={rejectedRequests} showActions={false} />}
        </div>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && currentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${reviewAction === 'approve' 
                    ? currentRequest.type === 'inventory' ? 'bg-green-50' : 'bg-purple-50'
                    : 'bg-red-50'
                  }`}>
                    {reviewAction === 'approve' ? (
                      currentRequest.type === 'inventory' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                      )
                    ) : (
                      <XCircleIcon className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <RequestTypeBadge type={currentRequest.type} />
                      <h2 className="text-xl font-semibold text-gray-900">
                        {reviewAction === 'approve' ? 'Approve' : 'Reject'} Request
                      </h2>
                    </div>
                    <p className="text-sm text-gray-600">
                      {reviewAction === 'approve' 
                        ? `Review and ${currentRequest.type === 'inventory' ? 'approve this inventory request' : 'approve this PPE request'}`
                        : 'Provide reason for rejecting this request'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeReviewModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Request Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4" />
                  Request Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600">Request Number</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentRequest.request_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Submitted By</p>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-900">
                          {currentRequest.employee_name}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Department</p>
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-900">
                          {currentRequest.department}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600">Job/Project</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentRequest.job}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Urgency Level</p>
                      <UrgencyBadge urgency={currentRequest.urgency} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Request Date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(currentRequest.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Details */}
<div className={`rounded-lg p-4 border ${
  currentRequest.type === 'inventory' 
    ? 'bg-blue-50 border-blue-200' 
    : 'bg-purple-50 border-purple-200'
}`}>
  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
    {currentRequest.type === 'inventory' ? (
      <>
        <CubeIcon className="h-4 w-4 text-blue-500" />
        Product Details
      </>
    ) : (
      <>
        <ShieldCheckIcon className="h-4 w-4 text-purple-500" />
        PPE Items Details
      </>
    )}
  </h3>
  
  {currentRequest.type === 'inventory' ? (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-600">Product(s)</p>
          <p className="text-sm font-semibold text-gray-900">
            {currentRequest.product_name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">Quantity Requested</p>
          <p className="text-sm font-semibold text-gray-900">
            {currentRequest.quantity_requested} units
          </p>
        </div>
      </div>
      
      {Array.isArray(currentRequest.items) && currentRequest.items.length > 0 && (
        <div className="mt-3 border-t border-blue-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Item Breakdown:</h4>
          <div className="space-y-2">
            {currentRequest.items.map((item, idx) => (
              <div key={idx} className="bg-white p-3 rounded border border-blue-100">
                {/* Product Name and Quantity Row */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <CubeIcon className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      {item.productCode && (
                        <p className="text-xs text-gray-500">Code: {item.productCode}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">{item.requestedQuantity} units</p>
                  </div>
                </div>
                
                {/* Stock Information Row */}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-50">
                  <div>
                    <p className="text-xs text-gray-600">Current Stock</p>
                    <p className={`text-sm font-semibold ${
                      item.currentStock < item.requestedQuantity 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {item.currentStock} units
                    </p>
                  </div>
                  
                  {/* Stock Status Indicators */}
                  <div className="flex items-center gap-2">
                    {/* Stock Shortage Warning */}
                    {item.currentStock < item.requestedQuantity && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        Shortage: {item.requestedQuantity - item.currentStock}
                      </span>
                    )}
                    
                    {/* Stock Adequacy Indicator */}
                    {item.currentStock >= item.requestedQuantity && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckIcon className="h-3 w-3" />
                        Stock Available
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Additional Information */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-50">
                  <div>
                    <p className="text-xs text-gray-600">Category</p>
                    <p className="text-xs font-medium text-gray-900">
                      {item.category || 'General'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Unit Cost</p>
                    <p className="text-xs font-medium text-gray-900">
                      {formatCurrency(item.unitCost || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Stock Summary */}
          <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <ClipboardDocumentListIcon className="h-3 w-3" />
              Stock Summary
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600">Total Requested</p>
                <p className="text-sm font-semibold text-blue-700">
                  {currentRequest.items.reduce((sum, item) => sum + (item.requestedQuantity || 0), 0)} units
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Available</p>
                <p className="text-sm font-semibold text-green-700">
                  {currentRequest.items.reduce((sum, item) => sum + (item.currentStock || 0), 0)} units
                </p>
              </div>
            </div>
            
            {/* Stock Alerts */}
            {currentRequest.items.some(item => item.currentStock < item.requestedQuantity) && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-red-700 font-medium">
                    Some items have insufficient stock and will need procurement
                  </p>
                </div>
              </div>
            )}
            
            {currentRequest.items.every(item => item.currentStock >= item.requestedQuantity) && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">
                    All items have sufficient stock available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-600">PPE Items</p>
          <p className="text-sm font-semibold text-gray-900">
            {currentRequest.ppe_items?.length || 0} PPE Items
          </p>
          {currentRequest.ppe_categories && currentRequest.ppe_categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {currentRequest.ppe_categories.map((category, idx) => (
                <span key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">Personnel Count</p>
          <p className="text-sm font-semibold text-gray-900">
            {currentRequest.quantity_requested} personnel
          </p>
        </div>
      </div>
      
      {Array.isArray(currentRequest.ppe_items) && currentRequest.ppe_items.length > 0 && (
        <div className="mt-3 border-t border-purple-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">PPE Items Breakdown:</h4>
          <div className="space-y-2">
            {currentRequest.ppe_items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-purple-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.category && (
                        <p className="text-xs text-purple-600">{item.category}</p>
                      )}
                      {item.code && (
                        <p className="text-xs text-gray-500">Code: {item.code}</p>
                      )}
                      {item.size && (
                        <p className="text-xs text-gray-500">Size: {item.size}</p>
                      )}
                      
                      {/* PPE Stock Information */}
                      {item.currentStock !== undefined && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-xs font-medium ${
                            item.currentStock < item.quantity 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            Stock: {item.currentStock} units
                          </span>
                          {item.currentStock < item.quantity && (
                            <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              Need {item.quantity - item.currentStock} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-purple-600">{item.quantity} units</p>
                  <p className="text-xs text-gray-500">per person</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* PPE Stock Summary */}
      {currentRequest.ppe_items && currentRequest.ppe_items.some(item => item.currentStock !== undefined) && (
        <div className="mt-4 bg-purple-50 p-3 rounded border border-purple-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <ShieldCheckIcon className="h-3 w-3" />
            PPE Stock Status
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-600">Total Required</p>
              <p className="text-sm font-semibold text-purple-700">
                {currentRequest.ppe_items.reduce((sum, item) => sum + (item.quantity || 0), 0)} units
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Available</p>
              <p className="text-sm font-semibold text-green-700">
                {currentRequest.ppe_items.reduce((sum, item) => sum + (item.currentStock || 0), 0)} units
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* PPE Specific Information */}
      {currentRequest.size_requirements && (
        <div className="mt-3 border-t border-purple-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Size Requirements:</h4>
          <p className="text-sm text-gray-900">{currentRequest.size_requirements}</p>
        </div>
      )}
      
      {currentRequest.safety_certifications && currentRequest.safety_certifications.length > 0 && (
        <div className="mt-3 border-t border-purple-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Required Certifications:</h4>
          <div className="flex flex-wrap gap-1">
            {currentRequest.safety_certifications.map((cert, idx) => (
              <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )}
  
  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
    <div>
      <p className="text-xs text-gray-600">Total Estimated Cost</p>
      <p className="text-lg font-bold text-green-600">
        {formatCurrency(currentRequest.total_cost || currentRequest.unit_cost * currentRequest.quantity_requested)}
      </p>
    </div>
    <div className="text-right">
      <p className="text-xs text-gray-600">Purpose</p>
      <p className="text-sm font-medium text-gray-900 max-w-xs">
        {currentRequest.purpose}
      </p>
    </div>
  </div>
</div>

              {/* Review Form */}
              <div className="space-y-4">
                {reviewAction === 'approve' && currentRequest.type === 'inventory' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quantity to Approve *
                      <span className="text-xs text-gray-500 font-normal ml-1">
                        (Max: {currentRequest.quantity_requested} units)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="quantity_approved"
                      value={reviewForm.quantity_approved}
                      onChange={handleInputChange}
                      placeholder="Enter approved quantity"
                      min="1"
                      max={currentRequest.quantity_requested}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                    />
                  </div>
                )}

                {reviewAction === 'approve' && currentRequest.type === 'ppe' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Personnel Count to Approve *
                        <span className="text-xs text-gray-500 font-normal ml-1">
                          (Max: {currentRequest.quantity_requested} personnel)
                        </span>
                      </label>
                      <input
                        type="number"
                        name="quantity_approved"
                        value={reviewForm.quantity_approved}
                        onChange={handleInputChange}
                        placeholder="Enter approved personnel count"
                        min="1"
                        max={currentRequest.quantity_requested}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Size Requirements
                      </label>
                      <input
                        type="text"
                        name="size_requirements"
                        value={reviewForm.size_requirements}
                        onChange={handleInputChange}
                        placeholder="Enter size requirements or adjustments"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="training_required"
                        name="training_required"
                        checked={reviewForm.training_required}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="training_required" className="text-sm font-semibold text-gray-700">
                        Training Required
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {reviewAction === 'approve' ? 'Comments' : 'Reason for Rejection *'}
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      {reviewAction === 'approve' 
                        ? currentRequest.type === 'inventory'
                          ? 'Add notes or instructions for procurement'
                          : 'Add notes about safety requirements or special instructions'
                        : 'Explain why this request is being rejected'
                      }
                    </span>
                  </label>
                  <textarea
                    name="comments"
                    value={reviewForm.comments}
                    onChange={handleInputChange}
                    placeholder={
                      reviewAction === 'approve'
                        ? currentRequest.type === 'inventory'
                          ? "Add comments or procurement instructions..."
                          : "Add notes about safety requirements, training needs, or special instructions..."
                        : "Provide detailed reason for rejection..."
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={closeReviewModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                  reviewAction === 'approve' 
                    ? currentRequest.type === 'inventory'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-red-600 hover:bg-red-700'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={reviewAction === 'approve' ? handleApprove : handleReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 border-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    {reviewAction === 'approve' ? (
                      <>
                        <CheckIcon className="h-5 w-5" />
                        {currentRequest.type === 'inventory' ? 'Approve Inventory Request' : 'Approve PPE Request'}
                      </>
                    ) : (
                      <>
                        <XMarkIcon className="h-5 w-5" />
                        Reject Request
                      </>
                    )}
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

export default ProcurementManagerReview;