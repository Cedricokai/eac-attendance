import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TruckIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  CubeIcon,
  CheckIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowPathIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  TagIcon,
  HomeIcon
} from "@heroicons/react/24/solid";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';

const REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED_BY_PROCUREMENT: 'APPROVED_BY_PROCUREMENT',
  APPROVED_BY_STORE: 'APPROVED_BY_STORE',
  ISSUED: 'ISSUED',
  RECEIVED: 'RECEIVED',
  REJECTED_BY_STORE: 'REJECTED_BY_STORE',
  REJECTED_BY_PROCUREMENT: 'REJECTED_BY_PROCUREMENT'
};

const STATUS_LABELS = {
  PENDING: 'Pending Procurement',
  APPROVED_BY_PROCUREMENT: 'Approved by Procurement',
  APPROVED_BY_STORE: 'Ready to Issue',
  ISSUED: 'Issued',
  RECEIVED: 'Received',
  REJECTED_BY_STORE: 'Rejected by Store',
  REJECTED_BY_PROCUREMENT: 'Rejected by Procurement'
};

const STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED_BY_PROCUREMENT: 'blue',
  APPROVED_BY_STORE: 'green',
  ISSUED: 'purple',
  RECEIVED: 'green',
  REJECTED_BY_STORE: 'red',
  REJECTED_BY_PROCUREMENT: 'red'
};

// Use consistent property names with Products.jsx
const STORE_TYPES = {
  REGULAR: 'regular',
  PPE: 'ppe',
  KITCHEN: 'kitchenStore',
  RETURNABLE: 'returnable'
};

const Received = () => {
    const [activeTab, setActiveTab] = useState('transfer');
    const [products, setProducts] = useState([]);
    const [filteredTransferProducts, setFilteredTransferProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectedItemDetails, setSelectedItemDetails] = useState([]);
    const [transferSearchTerm, setTransferSearchTerm] = useState('');
    const [isMoveToMenuOpen, setIsMoveToMenuOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [requestedBy, setRequestedBy] = useState('');
    const [movementDate, setMovementDate] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [moveLoading, setMoveLoading] = useState(false);
    const [moveError, setMoveError] = useState(null);
    const [individualQuantities, setIndividualQuantities] = useState({});
    
    const [inventoryRequests, setInventoryRequests] = useState([]);
    const [ppeRequests, setPpeRequests] = useState([]);
    const [receiptTracking, setReceiptTracking] = useState([]);
    
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [currentReceipt, setCurrentReceipt] = useState(null);
    
    const [selectedInventoryRequests, setSelectedInventoryRequests] = useState([]);
    const [selectedPpeRequests, setSelectedPpeRequests] = useState([]);
    const [requestQuantities, setRequestQuantities] = useState({});
    const [issueLocation, setIssueLocation] = useState('');
    
    const [issueForm, setIssueForm] = useState({
        quantity_issued: '',
        serial_numbers: '',
        batch_number: '',
        comments: ''
    });
    const [rejectForm, setRejectForm] = useState({ reason: '' });
    const [receiveForm, setReceiveForm] = useState({
        quantity_received: '',
        condition: 'GOOD',
        notes: ''
    });
    
    const [requestType, setRequestType] = useState('inventory');
    const [requestSearchTerm, setRequestSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [storeTypeFilter, setStoreTypeFilter] = useState('all');
    
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
    const [quantityFilter, setQuantityFilter] = useState({ min: '', max: '' });
    const [costFilter, setCostFilter] = useState({ min: '', max: '' });
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    
    const [transferStoreTypeFilter, setTransferStoreTypeFilter] = useState('all');
    const [showTransferAdvancedFilters, setShowTransferAdvancedFilters] = useState(false);
    const [transferStockFilter, setTransferStockFilter] = useState('all');
    const [transferProductTypeFilter, setTransferProductTypeFilter] = useState('');
    const [transferBrandFilter, setTransferBrandFilter] = useState('');
    const [transferDateRangeFilter, setTransferDateRangeFilter] = useState({ start: '', end: '' });
    const [transferSortBy, setTransferSortBy] = useState('name');
    const [transferSortOrder, setTransferSortOrder] = useState('asc');
    
    const [activeReceiptTab, setActiveReceiptTab] = useState('pending');
    const [receiptSearchTerm, setReceiptSearchTerm] = useState('');
    const [filterReceiptType, setFilterReceiptType] = useState('all');
    const [receiptStoreTypeFilter, setReceiptStoreTypeFilter] = useState('all');
    const [filteredReceipts, setFilteredReceipts] = useState([]);
    
    const [filteredRequests, setFilteredRequests] = useState([]);
    
    const locations = ['AHAFO_NORTH', 'NPI', 'LAYDOWN', 'MKV', 'SUG', 'RANK CAMP', 'RO PLANT', 'PLANT SITE'];
    const departments = ['Maintenance', 'Engineering', 'IT', 'Safety Department', 'Chemical Lab', 'Fire Department', 'Procurement', 'Operations'];
    const urgencyLevels = ['all', 'urgent', 'high', 'normal', 'low'];
    
    // Use same store types as Products.jsx
    const storeTypes = [
        { value: 'all', label: 'All Stores', icon: BuildingOfficeIcon },
        { value: 'ppe', label: 'PPE Only', icon: ShieldCheckIcon },
        { value: 'kitchenStore', label: 'Kitchen Store', icon: HomeIcon },
        { value: 'returnable', label: 'Returnable Tools', icon: ArrowPathIcon },
        { value: 'regular', label: 'Regular Products', icon: CubeIcon }
    ];

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
    
    const navigate = useNavigate();

    const getAuthToken = () => {
        return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchProducts(),
                fetchInventoryRequests(),
                fetchPpeRequests(),
                fetchReceiptTracking()
            ]);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Using demonstration data.');
            loadMockData();
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.warn('No authentication token found');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/products`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch products: ${response.status}`);
            }

            const productsData = await response.json();
            setProducts(productsData);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const determineProductStoreType = (product) => {
        if (product.ppe) {
            return STORE_TYPES.PPE;
        }
        
        if (product.returnableAfterUse) {
            return STORE_TYPES.RETURNABLE;
        }
        
        if (product.kitchenStore) {
            return STORE_TYPES.KITCHEN;
        }
        
        return STORE_TYPES.REGULAR;
    };

    const fetchInventoryRequests = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/inventory-requests/for-store`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          const transformedRequests = data.map(request => ({
            id: request.id,
            request_number: request.requestNumber || `REQ-${request.id}`,
            type: 'inventory',
            employee_id: request.requestedBy || 'Unknown',
            employee_name: request.requestedBy,
            department: request.department || 'Unknown',
            product_name: request.items?.map(item => item.productName).join(', ') || 'Multiple Items',
            product_details: request.items || [],
            quantity_requested: request.items?.reduce((sum, item) => sum + (item.requestedQuantity || 0), 0) || 0,
            quantity_approved: request.items?.reduce((sum, item) => sum + (item.approvedQuantity || 0), 0) || 0,
            unit_cost: request.estimatedCost || 0,
            total_cost: request.estimatedCost || 0,
            purpose: request.notes || request.projectName || 'No purpose provided',
            status: mapStatusToStoreStatus(request.status),
            originalStatus: request.status,
            created_at: request.requestDate || new Date().toISOString(),
            location: request.location || 'Main Store',
            job: request.jobDescription || request.projectName || 'General Request',
            urgency: request.urgency || 'normal',
            items: request.items || [],
            planner_notes: request.plannerNotes,
            procurement_notes: request.procurementNotes,
            estimated_cost: request.estimatedCost,
            delivery_date: request.deliveryDate,
            returnable_items: request.items?.filter(item => item.returnableAfterUse) || [],
            store_type: determineStoreType(request)
          }));

          setInventoryRequests(transformedRequests);
        }
      } catch (err) {
        console.error('Error fetching inventory requests:', err);
      }
    };

    const determineStoreType = (request) => {
        if (request.ppeRequest) return STORE_TYPES.PPE;
        
        const hasReturnableItems = request.items?.some(item => item.returnableAfterUse);
        if (hasReturnableItems) return STORE_TYPES.RETURNABLE;
        
        const isKitchenItem = request.items?.some(item => 
            item.productName?.toLowerCase().includes('kitchen') || 
            item.category?.toLowerCase().includes('kitchen') ||
            item.productName?.toLowerCase().includes('food') ||
            item.productName?.toLowerCase().includes('utensil')
        );
        
        if (isKitchenItem) return STORE_TYPES.KITCHEN;
        
        return STORE_TYPES.REGULAR;
    };

    const fetchPpeRequests = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/inventory-requests/for-store`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const ppeRequests = data.filter(request => request.ppeRequest === true);
          
          const transformedRequests = ppeRequests.map(request => ({
            id: request.id,
            request_number: request.requestNumber || `PPE-${request.id}`,
            type: 'ppe',
            employee_id: request.requestedBy || 'Unknown',
            employee_name: request.requestedBy,
            department: request.department || 'Unknown',
            ppe_items: request.items || [],
            ppe_categories: request.items?.map(item => item.productName).filter((v, i, a) => a.indexOf(v) === i) || [],
            quantity_requested: request.items?.reduce((sum, item) => sum + (item.requestedQuantity || 0), 0) || 0,
            quantity_approved: request.items?.reduce((sum, item) => sum + (item.approvedQuantity || 0), 0) || 0,
            unit_cost: request.estimatedCost || 0,
            total_cost: request.estimatedCost || 0,
            purpose: request.notes || request.projectName || 'Safety equipment request',
            status: mapStatusToStoreStatus(request.status),
            originalStatus: request.status,
            created_at: request.requestDate || new Date().toISOString(),
            location: request.location || 'Safety Store',
            urgency: request.urgency || 'normal',
            is_ppe: true,
            size_requirements: '',
            training_required: false,
            safety_certifications: [],
            items: request.items || [],
            planner_notes: request.plannerNotes,
            procurement_notes: request.procurementNotes,
            estimated_cost: request.estimatedCost,
            delivery_date: request.deliveryDate,
            returnable_items: request.items?.filter(item => item.returnableAfterUse) || [],
            store_type: STORE_TYPES.PPE
          }));

          setPpeRequests(transformedRequests);
        }
      } catch (err) {
        console.error('Error fetching PPE requests:', err);
      }
    };

    const mapStatusToStoreStatus = (status) => {
      const statusMap = {
        'STORE_REVIEW': 'STORE_REVIEW',
        'PENDING_STORE': 'STORE_REVIEW',
        'APPROVED_BY_STORE': 'APPROVED_BY_STORE',
        'REJECTED_BY_STORE': 'REJECTED_BY_STORE',
        'ISSUED': 'ISSUED',
        'RECEIVED_IN_STORE': 'RECEIVED_IN_STORE',
        'PROCURED': 'PROCURED',
        'PROCUREMENT_PENDING': 'PROCUREMENT_PENDING',
        'APPROVED_BY_PLANNER': 'APPROVED_BY_PLANNER',
        'PENDING': 'PENDING',
      };
      return statusMap[status] || 'PENDING';
    };

    const fetchReceiptTracking = async () => {
        try {
            const token = getAuthToken();
            const endpoints = [
                `${API_BASE_URL}/api/receipts/tracking`,
                `${API_BASE_URL}/api/receipts`,
                `${API_BASE_URL}/api/outgoing?recordType=ISSUED`
            ];
            
            let response;
            for (const endpoint of endpoints) {
                response = await fetch(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) break;
            }
            
            if (response.ok) {
                const data = await response.json();
                const transformedData = (data.receipts || data || []).map(receipt => ({
                    ...receipt,
                    store_type: determineReceiptStoreType(receipt)
                }));
                setReceiptTracking(transformedData);
            }
        } catch (err) {
            console.error('Error fetching receipt tracking:', err);
        }
    };

    const determineReceiptStoreType = (receipt) => {
        if (receipt.request_type === 'ppe') return STORE_TYPES.PPE;
        
        if (receipt.returnable) return STORE_TYPES.RETURNABLE;
        
        const isKitchen = receipt.product_name?.toLowerCase().includes('kitchen') || 
                         receipt.product_name?.toLowerCase().includes('food') ||
                         receipt.department?.toLowerCase().includes('kitchen');
        
        if (isKitchen) return STORE_TYPES.KITCHEN;
        
        return STORE_TYPES.REGULAR;
    };

    useEffect(() => {
        let filtered = [...products];
        
        // Filter by store type using consistent property names
        if (transferStoreTypeFilter !== 'all') {
            filtered = filtered.filter(product => {
                const storeType = determineProductStoreType(product);
                return storeType === transferStoreTypeFilter;
            });
        }
        
        if (transferSearchTerm) {
            const term = transferSearchTerm.toLowerCase();
            filtered = filtered.filter(product => 
                product.name?.toLowerCase().includes(term) ||
                product.code?.toLowerCase().includes(term) ||
                product.description?.toLowerCase().includes(term) ||
                product.userName?.toLowerCase().includes(term) ||
                product.productType?.toLowerCase().includes(term) ||
                product.category?.toLowerCase().includes(term)
            );
        }
        
        if (transferStockFilter !== 'all') {
            switch(transferStockFilter) {
                case 'low':
                    filtered = filtered.filter(product => product.stock <= 10);
                    break;
                case 'medium':
                    filtered = filtered.filter(product => product.stock > 10 && product.stock <= 50);
                    break;
                case 'high':
                    filtered = filtered.filter(product => product.stock > 50);
                    break;
                case 'out':
                    filtered = filtered.filter(product => product.stock === 0);
                    break;
            }
        }
        
        if (transferProductTypeFilter) {
            filtered = filtered.filter(product => 
                product.productType?.toLowerCase().includes(transferProductTypeFilter.toLowerCase())
            );
        }
        
        if (transferBrandFilter) {
            filtered = filtered.filter(product => 
                product.userName?.toLowerCase().includes(transferBrandFilter.toLowerCase())
            );
        }
        
        if (transferDateRangeFilter.start) {
            const startDate = new Date(transferDateRangeFilter.start);
            filtered = filtered.filter(product => new Date(product.entryDate) >= startDate);
        }
        
        if (transferDateRangeFilter.end) {
            const endDate = new Date(transferDateRangeFilter.end);
            filtered = filtered.filter(product => new Date(product.entryDate) <= endDate);
        }
        
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch(transferSortBy) {
                case 'name':
                    aValue = a.name?.toLowerCase() || '';
                    bValue = b.name?.toLowerCase() || '';
                    return transferSortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                case 'stock':
                    aValue = a.stock;
                    bValue = b.stock;
                    break;
                case 'date':
                    aValue = new Date(a.entryDate);
                    bValue = new Date(b.entryDate);
                    break;
                case 'code':
                    aValue = a.code?.toLowerCase() || '';
                    bValue = b.code?.toLowerCase() || '';
                    return transferSortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                default:
                    aValue = a.name?.toLowerCase() || '';
                    bValue = b.name?.toLowerCase() || '';
                    return transferSortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            
            if (transferSortOrder === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });
        
        setFilteredTransferProducts(filtered);
    }, [products, transferStoreTypeFilter, transferSearchTerm, transferStockFilter, transferProductTypeFilter, transferBrandFilter, transferDateRangeFilter, transferSortBy, transferSortOrder]);

    useEffect(() => {
        let filtered = requestType === 'inventory' ? [...inventoryRequests] : [...ppeRequests];
        
        if (storeTypeFilter !== 'all') {
            filtered = filtered.filter(req => req.store_type === storeTypeFilter);
        }
        
        if (requestSearchTerm) {
            const term = requestSearchTerm.toLowerCase();
            filtered = filtered.filter(req => 
                req.request_number?.toLowerCase().includes(term) ||
                req.employee_name?.toLowerCase().includes(term) ||
                req.department?.toLowerCase().includes(term) ||
                (req.type === 'inventory' ? req.product_name?.toLowerCase().includes(term) : 
                 req.ppe_categories?.some(cat => cat.toLowerCase().includes(term))) ||
                req.job?.toLowerCase().includes(term) ||
                req.purpose?.toLowerCase().includes(term)
            );
        }
        
        if (filterStatus !== 'all') {
            filtered = filtered.filter(req => {
                if (filterStatus === 'pending') return req.status === REQUEST_STATUS.PENDING;
                if (filterStatus === 'approved') return req.status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT;
                if (filterStatus === 'ready_to_issue') return req.status === REQUEST_STATUS.APPROVED_BY_STORE;
                if (filterStatus === 'issued') return req.status === REQUEST_STATUS.ISSUED;
                if (filterStatus === 'rejected') return req.status === REQUEST_STATUS.REJECTED_BY_STORE || 
                                                       req.status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT;
                return true;
            });
        }
        
        if (departmentFilter) {
            filtered = filtered.filter(req => req.department === departmentFilter);
        }
        
        if (urgencyFilter !== 'all') {
            filtered = filtered.filter(req => req.urgency === urgencyFilter);
        }
        
        if (dateRangeFilter.start) {
            const startDate = new Date(dateRangeFilter.start);
            filtered = filtered.filter(req => new Date(req.created_at) >= startDate);
        }
        
        if (dateRangeFilter.end) {
            const endDate = new Date(dateRangeFilter.end);
            filtered = filtered.filter(req => new Date(req.created_at) <= endDate);
        }
        
        if (quantityFilter.min) {
            filtered = filtered.filter(req => req.quantity_requested >= parseInt(quantityFilter.min));
        }
        
        if (quantityFilter.max) {
            filtered = filtered.filter(req => req.quantity_requested <= parseInt(quantityFilter.max));
        }
        
        if (costFilter.min) {
            filtered = filtered.filter(req => req.total_cost >= parseFloat(costFilter.min));
        }
        
        if (costFilter.max) {
            filtered = filtered.filter(req => req.total_cost <= parseFloat(costFilter.max));
        }
        
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch(sortBy) {
                case 'date':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                case 'quantity':
                    aValue = a.quantity_requested;
                    bValue = b.quantity_requested;
                    break;
                case 'cost':
                    aValue = a.total_cost;
                    bValue = b.total_cost;
                    break;
                case 'urgency':
                    const urgencyOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
                    aValue = urgencyOrder[a.urgency] || 0;
                    bValue = urgencyOrder[b.urgency] || 0;
                    break;
                case 'store_type':
                    aValue = a.store_type;
                    bValue = b.store_type;
                    return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                default:
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
            }
            
            if (sortOrder === 'desc') {
                return bValue - aValue;
            } else {
                return aValue - bValue;
            }
        });
        
        setFilteredRequests(filtered);
    }, [inventoryRequests, ppeRequests, requestType, storeTypeFilter, requestSearchTerm, filterStatus, departmentFilter, urgencyFilter, dateRangeFilter, quantityFilter, costFilter, sortBy, sortOrder]);

    useEffect(() => {
        const pendingReceipts = receiptTracking.filter(r => r.status === 'PENDING_RECEIPT');
        const receivedItems = receiptTracking.filter(r => r.status === 'RECEIVED');
        let filtered = activeReceiptTab === 'pending' ? pendingReceipts : receivedItems;
        
        if (receiptStoreTypeFilter !== 'all') {
            filtered = filtered.filter(r => r.store_type === receiptStoreTypeFilter);
        }
        
        if (receiptSearchTerm) {
            const term = receiptSearchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                r.request_number?.toLowerCase().includes(term) ||
                r.employee_name?.toLowerCase().includes(term) ||
                r.product_name?.toLowerCase().includes(term) ||
                r.department?.toLowerCase().includes(term) ||
                r.job_project?.toLowerCase().includes(term)
            );
        }
        
        if (filterReceiptType !== 'all') {
            filtered = filtered.filter(r => r.request_type === filterReceiptType);
        }
        
        setFilteredReceipts(filtered);
    }, [receiptTracking, activeReceiptTab, receiptStoreTypeFilter, receiptSearchTerm, filterReceiptType]);

    const loadMockData = () => {
        const mockProducts = [
            {
                id: 1,
                name: 'Safety Helmet',
                code: 'SH-001',
                description: 'Industrial safety helmet with chin strap',
                stock: 50,
                userName: '3M',
                productType: 'Safety Equipment',
                entryDate: '2024-01-01T10:00:00Z',
                category: 'Head Protection',
                ppe: true,
                kitchenStore: false,
                returnableAfterUse: false
            },
            {
                id: 2,
                name: 'Safety Gloves',
                code: 'SG-001',
                description: 'Cut-resistant safety gloves',
                stock: 100,
                userName: 'Ansell',
                productType: 'Hand Protection',
                entryDate: '2024-01-02T11:00:00Z',
                category: 'Hand Protection',
                ppe: true,
                kitchenStore: false,
                returnableAfterUse: false
            },
            {
                id: 3,
                name: 'Drill Machine',
                code: 'DRL-001',
                description: 'Electric drill machine',
                stock: 15,
                userName: 'Bosch',
                productType: 'Power Tool',
                entryDate: '2024-01-03T09:00:00Z',
                category: 'Tools',
                ppe: false,
                kitchenStore: false,
                returnableAfterUse: true
            },
            {
                id: 4,
                name: 'Kitchen Knife Set',
                code: 'KT-KNIFE',
                description: 'Professional kitchen knife set',
                stock: 8,
                userName: 'Wusthof',
                productType: 'Kitchen Equipment',
                entryDate: '2024-01-04T14:00:00Z',
                category: 'Kitchen',
                ppe: false,
                kitchenStore: true,
                returnableAfterUse: false
            },
            {
                id: 5,
                name: 'Cooking Pots',
                code: 'KT-POT',
                description: 'Stainless steel cooking pots',
                stock: 12,
                userName: 'T-fal',
                productType: 'Kitchen Utensils',
                entryDate: '2024-01-05T13:00:00Z',
                category: 'Kitchen',
                ppe: false,
                kitchenStore: true,
                returnableAfterUse: false
            },
            {
                id: 6,
                name: 'Industrial Wrench',
                code: 'WR-001',
                description: 'Heavy duty industrial wrench',
                stock: 25,
                userName: 'Stanley',
                productType: 'Tool',
                entryDate: '2024-01-06T10:00:00Z',
                category: 'Tools',
                ppe: false,
                kitchenStore: false,
                returnableAfterUse: true
            }
        ];

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
                    { name: 'Safety Helmet', quantity: 5, code: 'SH-001', category: 'Head Protection', requestedQuantity: 5, approvedQuantity: 5, currentStock: 3 },
                    { name: 'Safety Gloves', quantity: 10, code: 'SG-001', category: 'Hand Protection', requestedQuantity: 10, approvedQuantity: 10, currentStock: 15 }
                ],
                items: [
                    { productName: 'Safety Helmet', requestedQuantity: 5, approvedQuantity: 5, currentStock: 3, productCode: 'SH-001' },
                    { productName: 'Safety Gloves', requestedQuantity: 10, approvedQuantity: 10, currentStock: 15, productCode: 'SG-001' }
                ],
                quantity_requested: 15,
                quantity_approved: 15,
                unit_cost: 45.00,
                total_cost: 675.00,
                purpose: 'Safety equipment for construction team',
                status: REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
                created_at: '2024-01-15T10:30:00Z',
                location: 'Main Store',
                job: 'Construction Project - Phase 2',
                urgency: 'high',
                store_type: STORE_TYPES.REGULAR
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
                    { name: 'Drill Machine', quantity: 3, code: 'DRL-001', category: 'Tools', requestedQuantity: 3, approvedQuantity: 3, currentStock: 5 },
                    { name: 'Angle Grinder', quantity: 2, code: 'AGR-001', category: 'Tools', requestedQuantity: 2, approvedQuantity: 2, currentStock: 1 }
                ],
                items: [
                    { productName: 'Drill Machine', requestedQuantity: 3, approvedQuantity: 3, currentStock: 5, productCode: 'DRL-001' },
                    { productName: 'Angle Grinder', requestedQuantity: 2, approvedQuantity: 2, currentStock: 1, productCode: 'AGR-001' }
                ],
                quantity_requested: 5,
                quantity_approved: 5,
                unit_cost: 250.00,
                total_cost: 1250.00,
                purpose: 'Equipment for maintenance work',
                status: REQUEST_STATUS.APPROVED_BY_STORE,
                created_at: '2024-01-14T14:20:00Z',
                location: 'Engineering Store',
                job: 'Preventive Maintenance',
                urgency: 'normal',
                store_type: STORE_TYPES.RETURNABLE
            },
            {
                id: 3,
                request_number: 'INV-003',
                type: 'inventory',
                employee_id: 'EMP-1003',
                employee_name: 'Mike Chen',
                product_name: 'Kitchen Utensils Set',
                items: [
                    { productName: 'Kitchen Knife Set', requestedQuantity: 2, approvedQuantity: 2, currentStock: 5, productCode: 'KT-KNIFE' },
                    { productName: 'Cooking Pots', requestedQuantity: 3, approvedQuantity: 3, currentStock: 8, productCode: 'KT-POT' }
                ],
                quantity_requested: 5,
                quantity_approved: 5,
                unit_cost: 150.00,
                total_cost: 750.00,
                purpose: 'Kitchen equipment for staff cafeteria',
                status: REQUEST_STATUS.APPROVED_BY_STORE,
                created_at: '2024-01-13T09:15:00Z',
                location: 'Kitchen Store',
                job: 'Cafeteria Maintenance',
                urgency: 'normal',
                store_type: STORE_TYPES.KITCHEN
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
                    { name: 'Safety Harness', quantity: 8, code: 'SH-200', category: 'Fall Protection', size: 'Large', requestedQuantity: 8, approvedQuantity: 8, currentStock: 12 },
                    { name: 'Full Body Harness', quantity: 8, code: 'FBH-100', category: 'Fall Protection', size: 'XL', requestedQuantity: 8, approvedQuantity: 8, currentStock: 4 }
                ],
                items: [
                    { productName: 'Safety Harness', requestedQuantity: 8, approvedQuantity: 8, currentStock: 12, productCode: 'SH-200' },
                    { productName: 'Full Body Harness', requestedQuantity: 8, approvedQuantity: 8, currentStock: 4, productCode: 'FBH-100' }
                ],
                ppe_categories: ['Fall Protection'],
                quantity_requested: 16,
                quantity_approved: 16,
                unit_cost: 120.00,
                total_cost: 1920.00,
                purpose: 'Height work safety equipment for new construction team',
                status: REQUEST_STATUS.APPROVED_BY_PROCUREMENT,
                created_at: '2024-01-16T09:15:00Z',
                location: 'Safety Equipment Store',
                urgency: 'urgent',
                store_type: STORE_TYPES.PPE
            }
        ];

        const mockReceiptTracking = [
            {
                id: 1,
                request_number: 'INV-001',
                employee_id: 'EMP-1001',
                employee_name: 'John Smith',
                product_name: 'Safety Helmet, Safety Gloves',
                quantity_issued: 15,
                issued_at: '2024-01-16T11:00:00Z',
                status: 'PENDING_RECEIPT',
                expected_by: '2024-01-18T11:00:00Z',
                job_project: 'Construction Project - Phase 2',
                department: 'Maintenance',
                request_type: 'inventory',
                store_type: STORE_TYPES.REGULAR
            },
            {
                id: 2,
                request_number: 'PPE-001',
                employee_id: 'EMP-2001',
                employee_name: 'Michael Brown',
                product_name: 'Safety Harness, Full Body Harness',
                quantity_issued: 16,
                issued_at: '2024-01-17T10:00:00Z',
                status: 'PENDING_RECEIPT',
                expected_by: '2024-01-19T10:00:00Z',
                job_project: 'Construction Safety',
                department: 'Safety Department',
                request_type: 'ppe',
                store_type: STORE_TYPES.PPE
            }
        ];

        setProducts(mockProducts);
        setInventoryRequests(mockInventoryRequests);
        setPpeRequests(mockPpeRequests);
        setReceiptTracking(mockReceiptTracking);
    };

    const getProductBrands = () => {
        const brands = new Set();
        products.forEach(product => {
            if (product.userName) {
                brands.add(product.userName);
            }
        });
        return Array.from(brands).sort();
    };

    const getProductTypes = () => {
        const types = new Set();
        products.forEach(product => {
            if (product.productType) {
                types.add(product.productType);
            }
        });
        return Array.from(types).sort();
    };

    const toggleRequestSelection = (requestId) => {
        if (requestType === 'inventory') {
            setSelectedInventoryRequests((prevSelected) => {
                const isSelected = prevSelected.includes(requestId);
                const newSelected = isSelected
                    ? prevSelected.filter((id) => id !== requestId)
                    : [...prevSelected, requestId];
                
                if (!isSelected) {
                    const request = inventoryRequests.find(r => r.id === requestId);
                    setRequestQuantities(prev => ({
                        ...prev,
                        [requestId]: request.quantity_approved || request.quantity_requested
                    }));
                } else {
                    setRequestQuantities(prev => {
                        const newQuantities = { ...prev };
                        delete newQuantities[requestId];
                        return newQuantities;
                    });
                }
                
                return newSelected;
            });
        } else {
            setSelectedPpeRequests((prevSelected) => {
                const isSelected = prevSelected.includes(requestId);
                const newSelected = isSelected
                    ? prevSelected.filter((id) => id !== requestId)
                    : [...prevSelected, requestId];
                
                if (!isSelected) {
                    const request = ppeRequests.find(r => r.id === requestId);
                    setRequestQuantities(prev => ({
                        ...prev,
                        [requestId]: request.quantity_approved || request.quantity_requested
                    }));
                } else {
                    setRequestQuantities(prev => {
                        const newQuantities = { ...prev };
                        delete newQuantities[requestId];
                        return newQuantities;
                    });
                }
                
                return newSelected;
            });
        }
    };

    const toggleAllRequests = () => {
        const selectedRequests = getSelectedRequests();
        
        if (selectedRequests.length === filteredRequests.length) {
            if (requestType === 'inventory') {
                setSelectedInventoryRequests([]);
            } else {
                setSelectedPpeRequests([]);
            }
            setRequestQuantities({});
        } else {
            const allRequestIds = filteredRequests.map(r => r.id);
            if (requestType === 'inventory') {
                setSelectedInventoryRequests(allRequestIds);
            } else {
                setSelectedPpeRequests(allRequestIds);
            }
            
            const initialQuantities = {};
            allRequestIds.forEach(id => {
                const request = filteredRequests.find(r => r.id === id);
                initialQuantities[id] = request.quantity_approved || request.quantity_requested;
            });
            setRequestQuantities(initialQuantities);
        }
    };

    const updateRequestQuantity = (requestId, quantity) => {
        const request = filteredRequests.find(r => r.id === requestId);
        if (!request) return;

        const maxQuantity = request.quantity_approved || request.quantity_requested;
        const validQuantity = Math.max(1, Math.min(maxQuantity, quantity));
        
        setRequestQuantities(prev => ({
            ...prev,
            [requestId]: validQuantity
        }));
    };

    const toggleItemSelection = (itemId) => {
        setSelectedItems((prevSelected) => {
            const isSelected = prevSelected.includes(itemId);
            const newSelected = isSelected
                ? prevSelected.filter((id) => id !== itemId)
                : [...prevSelected, itemId];
        
            const updatedDetails = newSelected.map((id) => {
                const product = products.find((p) => p.id === id);
                
                if (product) {
                    return {
                        id: product.id,
                        name: product.name,
                        code: product.code,
                        description: product.description,
                        stock: product.stock,
                        userName: product.userName,
                        productType: product.productType,
                        ppe: product.ppe,
                        kitchenStore: product.kitchenStore,
                        returnableAfterUse: product.returnableAfterUse
                    };
                }
                return null;
            }).filter(Boolean);
    
            setSelectedItemDetails(updatedDetails);
            
            if (!isSelected) {
                setIndividualQuantities(prev => ({
                    ...prev,
                    [itemId]: 1
                }));
            } else {
                setIndividualQuantities(prev => {
                    const newQuantities = { ...prev };
                    delete newQuantities[itemId];
                    return newQuantities;
                });
            }
            
            return newSelected;
        });
    };

    const toggleAllProducts = () => {
        if (selectedItems.length === filteredTransferProducts.length) {
            setSelectedItems([]);
            setSelectedItemDetails([]);
            setIndividualQuantities({});
        } else {
            const allProductIds = filteredTransferProducts.map(p => p.id);
            setSelectedItems(allProductIds);
            setSelectedItemDetails(filteredTransferProducts.map(p => ({
                id: p.id,
                name: p.name,
                code: p.code,
                description: p.description,
                stock: p.stock,
                userName: p.userName,
                productType: p.productType,
                ppe: p.ppe,
                kitchenStore: p.kitchenStore,
                returnableAfterUse: p.returnableAfterUse
            })));
            const initialQuantities = {};
            allProductIds.forEach(id => {
                initialQuantities[id] = 1;
            });
            setIndividualQuantities(initialQuantities);
        }
    };

    const recordProductCostToCostCenter = async (jobId, product, quantity, issuedToEmployee, requestNumber) => {
      try {
        const token = getAuthToken();
        
        const costCenterResponse = await fetch(`${API_BASE_URL}/api/cost-centers/job/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!costCenterResponse.ok) {
            const jobResponse = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (jobResponse.ok) {
                const job = await jobResponse.json();
                const createCostCenterResponse = await fetch(`${API_BASE_URL}/api/cost-centers/create-for-job`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    jobId: jobId,
                    jobName: job.name,
                    budget: job.budget || 100000.00
                  })
                });
            }
        }

        const transactionResponse = await fetch(`${API_BASE_URL}/api/cost-centers/product-issue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: jobId,
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            unitCost: product.unitCost || product.estimatedCost || 0,
            issuedToEmployeeId: issuedToEmployee.id,
            issuedToEmployeeName: issuedToEmployee.name,
            requestNumber: requestNumber,
            description: `Product issued: ${product.name} (${quantity} units) for request ${requestNumber}`,
            location: issueLocation
          })
        });
        
      } catch (err) {
        console.error('Error recording cost:', err);
      }
    };

    const updateQuantity = (productId, quantity) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const validQuantity = Math.max(1, Math.min(product.stock, quantity));
        
        setIndividualQuantities(prev => ({
            ...prev,
            [productId]: validQuantity
        }));
    };

    const handleApproveRequest = async (request) => {
        setMoveLoading(true);
        setMoveError(null);

        try {
            const token = getAuthToken();
            const endpoint = `${API_BASE_URL}/api/inventory-requests/${request.id}/store-approve`;
            
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    approvedBy: localStorage.getItem('username') || 'Store Keeper',
                    notes: 'Approved by store'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to approve request: ${errorText}`);
            }

            const updatedRequest = await response.json();
            
            if (request.items && Array.isArray(request.items)) {
               const outgoingItems = request.items.map(item => {
    const quantityToIssue = item.approvedQuantity || item.requestedQuantity || 0;
    
    return {
        name: item.productName,
        code: item.productCode || `ITEM-${item.id}`,
        description: `Issued from request ${request.request_number}`,
        location: issueLocation || request.location || 'AHAFO_NORTH',
        requestedBy: request.employee_name,
        quantityMoved: quantityToIssue,
        stock: quantityToIssue,
        productId: item.productId || 0,
        userName: localStorage.getItem('username') || 'Store Keeper',
        movementDate: new Date().toISOString(),
        recordType: "ISSUED",
        status: "ISSUED",
        requestId: request.id,
        requestNumber: request.request_number,
        employeeName: request.employee_name,
        employeeId: request.employee_id,
        department: request.department,
        projectName: request.job,
        notes: `Issued to ${request.employee_name} from ${request.department} department at ${issueLocation || request.location || 'AHAFO_NORTH'}`
    };
});

                if (outgoingItems.length > 0) {
                    const outgoingResponse = await fetch(`${API_BASE_URL}/api/outgoing`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(outgoingItems),
                    });

                    if (outgoingResponse.ok) {
                        console.log(`Created outgoing records for approved request ${request.request_number}`);
                    }
                }
            }
            
            if (request.type === 'inventory') {
                setInventoryRequests(prev => 
                    prev.map(req => 
                        req.id === request.id 
                            ? { 
                                ...req, 
                                status: REQUEST_STATUS.APPROVED_BY_STORE,
                                originalStatus: updatedRequest.status || 'APPROVED_BY_STORE'
                              }
                            : req
                    )
                );
            } else {
                setPpeRequests(prev => 
                    prev.map(req => 
                        req.id === request.id 
                            ? { 
                                ...req, 
                                status: REQUEST_STATUS.APPROVED_BY_STORE,
                                originalStatus: updatedRequest.status || 'APPROVED_BY_STORE'
                              }
                            : req
                    )
                );
            }
            
            setSuccessMessage(`${request.type === 'inventory' ? 'Inventory' : 'PPE'} request ${request.request_number} approved successfully! Outgoing record created.`);
            setTimeout(() => setSuccessMessage(""), 4000);

        } catch (err) {
            console.error('Error approving request:', err);
            setMoveError(`Failed to approve ${request.type} request: ${err.message}`);
        } finally {
            setMoveLoading(false);
        }
    };

    const handleRejectRequest = (request) => {
        setCurrentRequest(request);
        setRejectForm({ reason: '' });
        setIsRejectModalOpen(true);
    };

    const handleSubmitReject = async () => {
      if (!currentRequest) return;

      if (!rejectForm.reason || rejectForm.reason.trim() === '') {
        alert('Please provide a reason for rejection');
        return;
      }

      setMoveLoading(true);
      try {
        const token = getAuthToken();
        const endpoint = `${API_BASE_URL}/api/inventory-requests/${currentRequest.id}/store-reject`;
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approvedBy: localStorage.getItem('username') || 'Store Keeper',
            notes: rejectForm.reason
          })
        });

        if (!response.ok) {
          throw new Error('Failed to reject request');
        }

        const updatedRequest = await response.json();
        
        if (currentRequest.type === 'inventory') {
          setInventoryRequests(prev => 
            prev.map(req => 
              req.id === currentRequest.id 
                ? { 
                    ...req, 
                    status: REQUEST_STATUS.REJECTED_BY_STORE,
                    originalStatus: updatedRequest.status || 'REJECTED_BY_STORE',
                    rejection_reason: rejectForm.reason 
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
                    status: REQUEST_STATUS.REJECTED_BY_STORE,
                    originalStatus: updatedRequest.status || 'REJECTED_BY_STORE',
                    rejection_reason: rejectForm.reason 
                  }
                : req
            )
          );
        }
        
        setSuccessMessage(`${currentRequest.type === 'inventory' ? 'Inventory' : 'PPE'} request ${currentRequest.request_number} rejected successfully!`);
        setIsRejectModalOpen(false);
        setCurrentRequest(null);
        setTimeout(() => setSuccessMessage(""), 4000);

      } catch (err) {
        console.error('Error rejecting request:', err);
        setMoveError(`Failed to reject ${currentRequest?.type} request: ${err.message}`);
      } finally {
        setMoveLoading(false);
      }
    };

    const getSelectedRequests = () => {
        return requestType === 'inventory' ? selectedInventoryRequests : selectedPpeRequests;
    };

    const issueItemsToEmployees = async () => {
      setMoveLoading(true);
      setMoveError(null);

      try {
        const selectedRequests = getSelectedRequests();
        if (selectedRequests.length === 0) {
          setMoveError("Please select at least one request to issue.");
          setMoveLoading(false);
          return;
        }

        if (!issueLocation) {
          setMoveError("Please select an issue location.");
          setMoveLoading(false);
          return;
        }

        const requestsToIssue = filteredRequests.filter(r => selectedRequests.includes(r.id));

        const alreadyIssuedRequests = requestsToIssue.filter(request => 
          request.status === REQUEST_STATUS.ISSUED || 
          request.originalStatus === 'ISSUED'
        );

        if (alreadyIssuedRequests.length > 0) {
          const requestNumbers = alreadyIssuedRequests.map(r => r.request_number).join(', ');
          setMoveError(`Cannot issue already issued requests: ${requestNumbers}. Please refresh the page.`);
          setMoveLoading(false);
          return;
        }

        const nonIssuableRequests = requestsToIssue.filter(request => {
          const apiStatus = request.originalStatus || request.status;
          
          const isIssuable = 
            apiStatus === 'APPROVED_BY_STORE' ||
            apiStatus === 'RECEIVED_IN_STORE' ||
            apiStatus === 'RECEIVED' ||
            apiStatus === 'STORE_REVIEW' ||
            apiStatus === 'PROCURED' ||
            apiStatus === 'APPROVED_BY_PROCUREMENT';
          
          return !isIssuable;
        });

        if (nonIssuableRequests.length > 0) {
          const requestNumbers = nonIssuableRequests.map(r => r.request_number).join(', ');
          const statuses = nonIssuableRequests.map(r => r.originalStatus || r.status).join(', ');
          setMoveError(`Cannot issue requests: ${requestNumbers}. Current statuses: ${statuses}. Requests must be in "Approved by Store", "Received", "Store Review", or "Procured" status.`);
          setMoveLoading(false);
          return;
        }

        const token = getAuthToken();
        if (!token) {
          setMoveError("Authentication token not found. Please log in again.");
          setMoveLoading(false);
          return;
        }

        const successfulIssuances = [];
        
        for (let request of requestsToIssue) {
          const quantity = requestQuantities[request.id] || 1;

          if (quantity <= 0) {
            setMoveError(`Quantity must be at least 1 for ${request.type === 'inventory' ? request.product_name : 'PPE items'}.`);
            setMoveLoading(false);
            return;
          }

          if (quantity > (request.quantity_approved || request.quantity_requested)) {
            setMoveError(`Cannot issue ${quantity} items. Only ${request.quantity_approved || request.quantity_requested} approved.`);
            setMoveLoading(false);
            return;
          }

          const requestBody = {
            quantity: requestQuantities[request.id],
            issuedBy: localStorage.getItem('username') || 'Store Keeper'
          };

          try {
            const issueResponse = await fetch(`${API_BASE_URL}/api/inventory-requests/${request.id}/issue`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody)
            });

            if (!issueResponse.ok) {
              const errorText = await issueResponse.text();
              
              if (errorText.includes("already been issued") || errorText.includes("already issued")) {
                continue;
              }
              
              throw new Error(`Failed to issue request ${request.request_number}: ${errorText}`);
            }

            const updatedRequest = await issueResponse.json();
            
            successfulIssuances.push({
              request: request,
              updatedRequest: updatedRequest,
              quantity: requestQuantities[request.id] || 1
            });
            
            if (request.type === 'inventory') {
              setInventoryRequests(prev => 
                prev.map(req => 
                  req.id === request.id 
                    ? { 
                        ...req, 
                        status: REQUEST_STATUS.ISSUED, 
                        originalStatus: 'ISSUED',
                        quantity_issued: requestQuantities[req.id] || req.quantity_approved 
                      }
                    : req
                )
              );
            } else {
              setPpeRequests(prev => 
                prev.map(req => 
                  req.id === request.id 
                    ? { 
                        ...req, 
                        status: REQUEST_STATUS.ISSUED, 
                        originalStatus: 'ISSUED',
                        quantity_issued: requestQuantities[req.id] || req.quantity_approved 
                      }
                    : req
                )
              );
            }

          } catch (error) {
            continue;
          }
        }

        if (successfulIssuances.length > 0) {
          try {
            const token = getAuthToken();
            
            for (const issuance of successfulIssuances) {
              const { request, quantity } = issuance;
              
              let jobId = null;
              let jobName = null;
              
              if (request.job && request.job.id) {
                jobId = request.job.id;
                jobName = request.job.name;
              } else if (request.job) {
                try {
                  const jobsResponse = await fetch(`${API_BASE_URL}/api/jobs/search?q=${encodeURIComponent(request.job)}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (jobsResponse.ok) {
                    const jobs = await jobsResponse.json();
                    if (jobs && jobs.length > 0) {
                      jobId = jobs[0].id;
                      jobName = jobs[0].name;
                    }
                  }
                } catch (err) {
                  console.error('Error finding job:', err);
                }
              }
              
              if (jobId && Array.isArray(request.items)) {
                for (const item of request.items) {
                  await recordProductCostToCostCenter(
                    jobId,
                    {
                      id: item.productId,
                      name: item.productName,
                      unitCost: item.unitCost || 0
                    },
                    item.approvedQuantity || item.requestedQuantity || quantity,
                    {
                      id: request.employee_id,
                      name: request.employee_name
                    },
                    request.request_number
                  );
                }
              }
            }
            
          } catch (err) {
            console.error('Error recording cost transactions:', err);
          }
        }

        const newReceipts = successfulIssuances.map(issuance => {
          const { request, quantity } = issuance;
          return {
            id: Date.now() + request.id,
            request_number: request.request_number,
            employee_id: request.employee_id,
            employee_name: request.employee_name,
            product_name: request.type === 'inventory' ? request.product_name : `${request.ppe_items?.length || 0} PPE Items`,
            quantity_issued: quantity,
            issued_at: new Date().toISOString(),
            status: 'PENDING_RECEIPT',
            expected_by: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            job_project: request.job?.name || request.job,
            department: request.department,
            request_type: request.type,
            issue_location: issueLocation,
            job_id: request.job?.id,
            cost_recorded: true,
            store_type: request.store_type
          };
        });
        
        setReceiptTracking(prev => [...prev, ...newReceipts]);
        setIsIssueModalOpen(false);
        
        if (requestType === 'inventory') {
          setSelectedInventoryRequests([]);
        } else {
          setSelectedPpeRequests([]);
        }
        setRequestQuantities({});
        setIssueLocation('');
        
        const costSummary = successfulIssuances.filter(s => s.request.job).length > 0
          ? 'Costs have been recorded to respective job cost centers.'
          : 'Note: Some requests had no job association - costs were not recorded.';
        
        setSuccessMessage(`Successfully issued ${successfulIssuances.length} ${requestType} request(s) to employees! ${costSummary}`);
        setTimeout(() => setSuccessMessage(""), 5000);

      } catch (error) {
        console.error("Issue to employees failed:", error);
        setMoveError('Failed to issue items to employees: ' + error.message);
      } finally {
        setMoveLoading(false);
      }
    };

    const handleReceiveItem = (receipt) => {
        setCurrentReceipt(receipt);
        setReceiveForm({
            quantity_received: receipt.quantity_issued,
            condition: 'GOOD',
            notes: ''
        });
        setIsReceiveModalOpen(true);
    };

    const handleSubmitReceive = async () => {
        if (!currentReceipt) return;

        if (!receiveForm.quantity_received || receiveForm.quantity_received <= 0) {
            alert('Please enter a valid quantity received');
            return;
        }

        if (receiveForm.quantity_received > currentReceipt.quantity_issued) {
            alert('Received quantity cannot exceed issued quantity');
            return;
        }

        setSuccessMessage(`Receipt confirmed for ${currentReceipt.employee_name}!`);
        
        const updatedReceipts = receiptTracking.map(receipt => 
            receipt.id === currentReceipt.id 
                ? { ...receipt, status: 'RECEIVED', received_at: new Date().toISOString() }
                : receipt
        );
        setReceiptTracking(updatedReceipts);
        
        setIsReceiveModalOpen(false);
        setCurrentReceipt(null);
        setTimeout(() => setSuccessMessage(""), 4000);
    };

    const moveItemsToOutgoing = async () => {
        setMoveLoading(true);
        setMoveError(null);

        try {
            if (!requestedBy) {
                setMoveError("Please enter the requester name.");
                setMoveLoading(false);
                return;
            }

            if (!selectedLocation) {
                setMoveError("Please select a destination location.");
                setMoveLoading(false);
                return;
            }

            const token = getAuthToken();
            if (!token) {
                setMoveError("Authentication token not found. Please log in again.");
                setMoveLoading(false);
                return;
            }

            for (let itemId of selectedItems) {
                const product = products.find(p => p.id === itemId);
                const quantity = individualQuantities[itemId] || 1;

                if (!product) {
                    setMoveError(`Product with ID ${itemId} not found.`);
                    setMoveLoading(false);
                    return;
                }

                if (quantity > product.stock) {
                    setMoveError(`Cannot move ${quantity} items of ${product.name}. Only ${product.stock} available.`);
                    setMoveLoading(false);
                    return;
                }

                if (quantity <= 0) {
                    setMoveError(`Quantity must be at least 1 for ${product.name}.`);
                    setMoveLoading(false);
                    return;
                }
            }

            const outgoingItems = selectedItems.map(itemId => {
    const product = products.find(p => p.id === itemId);
    const quantity = individualQuantities[itemId] || 1;
    
    return {
        name: product.name,
        code: product.code,
        description: product.description,
        location: selectedLocation,
        requestedBy: requestedBy,
        quantityMoved: quantity,
        stock: quantity,
        productId: product.id,
        userName: localStorage.getItem('username') || 'Store Keeper',
        movementDate: movementDate ? new Date(movementDate).toISOString() : new Date().toISOString(),
        recordType: "TRANSFER",
        status: "TRANSFERRED",
        department: requestedBy.includes('Department') ? requestedBy : 'Store',
        notes: `Transferred to ${selectedLocation} by ${requestedBy}`,
        // Add store type information
        ppe: product.ppe,
        kitchenStore: product.kitchenStore,
        returnableAfterUse: product.returnableAfterUse,
        storeType: determineProductStoreType(product) // Use the same function
    };
});

            const outgoingResponse = await fetch(`${API_BASE_URL}/api/outgoing`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(outgoingItems),
            });

            if (!outgoingResponse.ok) {
                const errorText = await outgoingResponse.text();
                console.error('Outgoing server error:', errorText);
                throw new Error(`Failed to save outgoing records: ${outgoingResponse.status}`);
            }

            for (const itemId of selectedItems) {
                const product = products.find(p => p.id === itemId);
                const quantityMoved = individualQuantities[itemId] || 1;
                const newStock = product.stock - quantityMoved;

                await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...product,
                        stock: newStock
                    }),
                });
            }

            const updatedProducts = products.map(product => {
                if (selectedItems.includes(product.id)) {
                    const quantityMoved = individualQuantities[product.id] || 1;
                    return {
                        ...product,
                        stock: product.stock - quantityMoved
                    };
                }
                return product;
            });

            setProducts(updatedProducts);

            resetSelections();
            setIsMoveToMenuOpen(false);

            const totalMoved = selectedItems.reduce((sum, id) => sum + (individualQuantities[id] || 1), 0);
            setSuccessMessage(`Successfully transferred ${totalMoved} item(s) to outgoing. Outgoing records created.`);
            setTimeout(() => setSuccessMessage(""), 4000);

        } catch (error) {
            console.error("Move to outgoing failed:", error);
            setMoveError(error.message || 'Failed to transfer items');
        } finally {
            setMoveLoading(false);
        }
    };

    const resetSelections = () => {
        setSelectedLocation('');
        setSelectedItems([]);
        setSelectedItemDetails([]);
        setIndividualQuantities({});
        setRequestedBy('');
        setMovementDate('');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const Chip = ({ value, color = 'gray', variant = 'filled', size = 'md', className = '' }) => {
        const colorClasses = {
            blue: variant === 'filled' ? 'bg-blue-500 text-white' : 'border border-blue-500 text-blue-500',
            green: variant === 'filled' ? 'bg-green-500 text-white' : 'border border-green-500 text-green-500',
            red: variant === 'filled' ? 'bg-red-500 text-white' : 'border border-red-500 text-red-500',
            yellow: variant === 'filled' ? 'bg-yellow-500 text-white' : 'border border-yellow-500 text-yellow-500',
            purple: variant === 'filled' ? 'bg-purple-500 text-white' : 'border border-purple-500 text-purple-500',
            orange: variant === 'filled' ? 'bg-orange-500 text-white' : 'border border-orange-500 text-orange-500',
            gray: variant === 'filled' ? 'bg-gray-500 text-white' : 'border border-gray-500 text-gray-500',
            teal: variant === 'filled' ? 'bg-teal-500 text-white' : 'border border-teal-500 text-teal-500',
            pink: variant === 'filled' ? 'bg-pink-500 text-white' : 'border border-pink-500 text-pink-500',
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

    const StoreTypeBadge = ({ storeType }) => {
        const typeConfig = {
            regular: { color: 'green', label: 'Regular Products', icon: CubeIcon },
            ppe: { color: 'orange', label: 'PPE Only', icon: ShieldCheckIcon },
            kitchenStore: { color: 'pink', label: 'Kitchen Store', icon: HomeIcon },
            returnable: { color: 'teal', label: 'Returnable Tools', icon: ArrowPathIcon }
        };

        const config = typeConfig[storeType] || typeConfig.regular;
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

    const TransferFiltersPanel = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Transfer Inventory Filters</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setTransferStoreTypeFilter('all');
                            setTransferSearchTerm('');
                            setTransferStockFilter('all');
                            setTransferProductTypeFilter('');
                            setTransferBrandFilter('');
                            setTransferDateRangeFilter({ start: '', end: '' });
                            setTransferSortBy('name');
                            setTransferSortOrder('asc');
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={() => setShowTransferAdvancedFilters(!showTransferAdvancedFilters)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {showTransferAdvancedFilters ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        )}
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Type Filter
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {storeTypes.map(type => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setTransferStoreTypeFilter(type.value)}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                        transferStoreTypeFilter === type.value
                                            ? `bg-${type.value === 'ppe' ? 'orange' : type.value === 'kitchenStore' ? 'pink' : type.value === 'returnable' ? 'teal' : type.value === 'regular' ? 'green' : 'blue'}-500 text-white`
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{type.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Level
                    </label>
                    <select
                        value={transferStockFilter}
                        onChange={(e) => setTransferStockFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Stock Levels</option>
                        <option value="low">Low Stock (≤ 10)</option>
                        <option value="medium">Medium Stock (11-50)</option>
                        <option value="high">High Stock (&gt; 50)</option>
                        <option value="out">Out of Stock</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={transferSortBy}
                            onChange={(e) => setTransferSortBy(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="name">Name</option>
                            <option value="stock">Stock</option>
                            <option value="code">Code</option>
                            <option value="date">Entry Date</option>
                        </select>
                        <button
                            onClick={() => setTransferSortOrder(transferSortOrder === 'asc' ? 'desc' : 'asc')}
                            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            {transferSortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mb-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search products by name, code, description, category, or brand..."
                        value={transferSearchTerm}
                        onChange={(e) => setTransferSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {transferSearchTerm && (
                        <button
                            onClick={() => setTransferSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>
            </div>
            
            {showTransferAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Type
                        </label>
                        <select
                            value={transferProductTypeFilter}
                            onChange={(e) => setTransferProductTypeFilter(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Types</option>
                            {getProductTypes().map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Brand
                        </label>
                        <select
                            value={transferBrandFilter}
                            onChange={(e) => setTransferBrandFilter(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Brands</option>
                            {getProductBrands().map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Entry Date Range
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={transferDateRangeFilter.start}
                                onChange={(e) => setTransferDateRangeFilter(prev => ({...prev, start: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                                type="date"
                                value={transferDateRangeFilter.end}
                                onChange={(e) => setTransferDateRangeFilter(prev => ({...prev, end: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {(transferStoreTypeFilter !== 'all' || transferStockFilter !== 'all' || transferProductTypeFilter || 
              transferBrandFilter || transferDateRangeFilter.start || transferDateRangeFilter.end || 
              transferSearchTerm) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
                    <div className="flex flex-wrap gap-2">
                        {transferStoreTypeFilter !== 'all' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                                Store: {storeTypes.find(t => t.value === transferStoreTypeFilter)?.label}
                                <button onClick={() => setTransferStoreTypeFilter('all')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {transferStockFilter !== 'all' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                Stock: {transferStockFilter}
                                <button onClick={() => setTransferStockFilter('all')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {transferProductTypeFilter && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                Type: {transferProductTypeFilter}
                                <button onClick={() => setTransferProductTypeFilter('')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {transferBrandFilter && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                Brand: {transferBrandFilter}
                                <button onClick={() => setTransferBrandFilter('')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {transferDateRangeFilter.start && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                From: {transferDateRangeFilter.start}
                                <button onClick={() => setTransferDateRangeFilter(prev => ({...prev, start: ''}))} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {transferDateRangeFilter.end && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                To: {transferDateRangeFilter.end}
                                <button onClick={() => setTransferDateRangeFilter(prev => ({...prev, end: ''}))} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {transferSearchTerm && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                Search: "{transferSearchTerm}"
                                <button onClick={() => setTransferSearchTerm('')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const EnhancedFiltersPanel = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setFilterStatus('all');
                            setStoreTypeFilter('all');
                            setDepartmentFilter('');
                            setUrgencyFilter('all');
                            setDateRangeFilter({ start: '', end: '' });
                            setQuantityFilter({ min: '', max: '' });
                            setCostFilter({ min: '', max: '' });
                            setRequestSearchTerm('');
                            setSortBy('date');
                            setSortOrder('desc');
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {showAdvancedFilters ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        )}
                    </button>
                </div>
            </div>
            
            {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Store Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {storeTypes.map(type => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.value}
                                        onClick={() => setStoreTypeFilter(type.value)}
                                        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                            storeTypeFilter === type.value
                                                ? `bg-${type.value === 'ppe' ? 'orange' : type.value === 'kitchenStore' ? 'pink' : type.value === 'returnable' ? 'teal' : type.value === 'regular' ? 'green' : 'blue'}-500 text-white`
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Department
                        </label>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Urgency
                        </label>
                        <select
                            value={urgencyFilter}
                            onChange={(e) => setUrgencyFilter(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {urgencyLevels.map(level => (
                                <option key={level} value={level}>
                                    {level === 'all' ? 'All Urgency Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sort By
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="date">Date</option>
                                <option value="quantity">Quantity</option>
                                <option value="cost">Cost</option>
                                <option value="urgency">Urgency</option>
                                <option value="store_type">Store Type</option>
                            </select>
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date Range
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={dateRangeFilter.start}
                                onChange={(e) => setDateRangeFilter(prev => ({...prev, start: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                                type="date"
                                value={dateRangeFilter.end}
                                onChange={(e) => setDateRangeFilter(prev => ({...prev, end: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity Range
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min"
                                value={quantityFilter.min}
                                onChange={(e) => setQuantityFilter(prev => ({...prev, min: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={quantityFilter.max}
                                onChange={(e) => setQuantityFilter(prev => ({...prev, max: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cost Range ($)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min"
                                value={costFilter.min}
                                onChange={(e) => setCostFilter(prev => ({...prev, min: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={costFilter.max}
                                onChange={(e) => setCostFilter(prev => ({...prev, max: e.target.value}))}
                                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {(storeTypeFilter !== 'all' || departmentFilter || urgencyFilter !== 'all' || dateRangeFilter.start || 
              dateRangeFilter.end || quantityFilter.min || quantityFilter.max || 
              costFilter.min || costFilter.max || requestSearchTerm) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
                    <div className="flex flex-wrap gap-2">
                        {storeTypeFilter !== 'all' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                                Store: {storeTypes.find(t => t.value === storeTypeFilter)?.label}
                                <button onClick={() => setStoreTypeFilter('all')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {departmentFilter && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                Department: {departmentFilter}
                                <button onClick={() => setDepartmentFilter('')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {urgencyFilter !== 'all' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                Urgency: {urgencyFilter}
                                <button onClick={() => setUrgencyFilter('all')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {dateRangeFilter.start && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                From: {dateRangeFilter.start}
                                <button onClick={() => setDateRangeFilter(prev => ({...prev, start: ''}))} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {dateRangeFilter.end && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                To: {dateRangeFilter.end}
                                <button onClick={() => setDateRangeFilter(prev => ({...prev, end: ''}))} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {(quantityFilter.min || quantityFilter.max) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                Qty: {quantityFilter.min || '0'} - {quantityFilter.max || '∞'}
                                <button onClick={() => setQuantityFilter({ min: '', max: '' })} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {(costFilter.min || costFilter.max) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                Cost: ${costFilter.min || '0'} - ${costFilter.max || '∞'}
                                <button onClick={() => setCostFilter({ min: '', max: '' })} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {requestSearchTerm && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                Search: "{requestSearchTerm}"
                                <button onClick={() => setRequestSearchTerm('')} className="ml-1">
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const RequestsTable = () => {
        const selectedRequests = getSelectedRequests();

        return (
            <div className="space-y-6">
                <EnhancedFiltersPanel />
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full">
                            <div className="relative w-full lg:w-96">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search requests by number, employee, product, department..."
                                    value={requestSearchTerm}
                                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {requestSearchTerm && (
                                    <button
                                        onClick={() => setRequestSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="text-sm font-semibold text-gray-700">
                                    Request Type:
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRequestType('inventory')}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${
                                            requestType === 'inventory'
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <CubeIcon className="h-4 w-4" />
                                            Inventory ({inventoryRequests.length})
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setRequestType('ppe')}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${
                                            requestType === 'ppe'
                                                ? 'bg-purple-500 text-white border-purple-500'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ShieldCheckIcon className="h-4 w-4" />
                                            PPE ({ppeRequests.length})
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-gray-700">
                                    Filter Status:
                                </label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending Procurement</option>
                                    <option value="approved">Approved by Procurement</option>
                                    <option value="ready_to_issue">Ready to Issue</option>
                                    <option value="issued">Issued</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-gray-700">
                                    Store Type:
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {storeTypes.map(type => {
                                        const Icon = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => setStoreTypeFilter(type.value)}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                                    storeTypeFilter === type.value
                                                        ? `bg-${type.value === 'ppe' ? 'orange' : type.value === 'kitchenStore' ? 'pink' : type.value === 'returnable' ? 'teal' : type.value === 'regular' ? 'green' : 'blue'}-500 text-white`
                                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span className="text-xs">{type.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <button
                                onClick={() => {
                                    const requests = filteredRequests;
                                    if (requests.length === 0) {
                                        setError("No requests to export");
                                        return;
                                    }

                                    const headers = [
                                        "Request Number",
                                        "Type",
                                        "Store Type",
                                        "Employee Name",
                                        "Department",
                                        "Product(s)",
                                        "Quantity Requested",
                                        "Quantity Approved",
                                        "Total Cost",
                                        "Status",
                                        "Created Date",
                                        "Urgency",
                                        "Location",
                                        "Purpose"
                                    ];

                                    const rows = requests.map(request => [
                                        request.request_number,
                                        request.type.toUpperCase(),
                                        request.store_type ? storeTypes.find(t => t.value === request.store_type)?.label || request.store_type : 'Regular Products',
                                        request.employee_name,
                                        request.department,
                                        request.type === 'inventory' ? request.product_name : request.ppe_categories?.join(', '),
                                        request.quantity_requested,
                                        request.quantity_approved,
                                        formatCurrency(request.total_cost),
                                        STATUS_LABELS[request.status] || request.status,
                                        formatDate(request.created_at),
                                        request.urgency.toUpperCase(),
                                        request.location,
                                        request.purpose
                                    ]);

                                    const csvContent = [headers, ...rows]
                                        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
                                        .join("\n");

                                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `${requestType}-requests-export-${new Date().toISOString().split("T")[0]}.csv`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);

                                    setSuccessMessage(`${requestType} requests exported successfully!`);
                                    setTimeout(() => setSuccessMessage(''), 3000);
                                }}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Export CSV
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-600">
                                <span className="font-medium">{filteredRequests.length}</span> {requestType} requests
                            </div>
                            {selectedRequests.length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {selectedRequests.length} selected
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden border border-gray-200 rounded-lg bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-4 border-b border-gray-200 w-10">
                                        <input 
                                            type="checkbox"
                                            checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                                            onChange={toggleAllRequests}
                                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    </th>
                                    {[
                                        "Type",
                                        "Store Type",
                                        "Request #",
                                        "Employee",
                                        "Product(s)",
                                        "Qty Requested",
                                        "Qty Approved",
                                        "Total Cost",
                                        "Department",
                                        "Urgency",
                                        "Created Date",
                                        "Status",
                                        "Actions"
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
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="13" className="p-8 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <ClipboardDocumentListIcon className="h-12 w-12 mb-4 text-gray-300" />
                                                <p className="text-sm font-medium">No {requestType} requests found</p>
                                                <p className="text-xs mt-1">Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req, index) => (
                                        <tr key={req.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}>
                                            <td className="p-4 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedRequests.includes(req.id)}
                                                    onChange={() => toggleRequestSelection(req.id)}
                                                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                                    disabled={req.status === REQUEST_STATUS.ISSUED || req.status === REQUEST_STATUS.REJECTED_BY_STORE}
                                                />
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <RequestTypeBadge type={req.type} />
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <StoreTypeBadge storeType={req.store_type} />
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <Chip 
                                                    value={req.request_number} 
                                                    color={req.type === 'inventory' ? 'blue' : 'purple'} 
                                                    variant="outlined"
                                                    size="sm"
                                                />
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-900 block">
                                                        {req.employee_name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ID: {req.employee_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="flex flex-col space-y-1 max-w-xs">
                                                    {req.type === 'inventory' ? (
                                                        <>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {req.product_name}
                                                            </div>
                                                            {Array.isArray(req.items) && req.items.length > 0 && (
                                                                <div className="text-xs text-gray-600">
                                                                    {req.items.length} item{req.items.length !== 1 ? 's' : ''}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-sm font-medium text-purple-900">
                                                                {req.ppe_items?.length || 0} PPE Items
                                                            </div>
                                                            {Array.isArray(req.ppe_categories) && req.ppe_categories.length > 0 && (
                                                                <div className="text-xs text-purple-600">
                                                                    {req.ppe_categories.slice(0, 2).join(', ')}
                                                                    {req.ppe_categories.length > 2 && '...'}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="text-center">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {req.quantity_requested}
                                                    </span>
                                                    <div className="text-xs text-gray-500">
                                                        {req.type === 'ppe' ? 'personnel' : 'units'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="text-center">
                                                    <span className="text-sm font-semibold text-green-600">
                                                        {req.quantity_approved}
                                                    </span>
                                                    <div className="text-xs text-gray-500">
                                                        {req.type === 'ppe' ? 'personnel' : 'units'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="text-center">
                                                    <span className="text-sm font-semibold text-blue-600">
                                                        {formatCurrency(req.total_cost || req.unit_cost * req.quantity_approved)}
                                                    </span>
                                                    <div className="text-xs text-gray-500">
                                                        Estimated
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <BuildingOfficeIcon className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm text-gray-700">
                                                        {req.department}
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
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="flex gap-2">
                                                    {req.status === REQUEST_STATUS.APPROVED_BY_PROCUREMENT && (
                                                        <>
                                                            <Tooltip content="Approve Request">
                                                                <button
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                    onClick={() => handleApproveRequest(req)}
                                                                >
                                                                    <CheckCircleIcon className="h-5 w-5" />
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
                                                    {req.status === REQUEST_STATUS.APPROVED_BY_STORE && selectedRequests.includes(req.id) && (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={req.quantity_approved}
                                                                value={requestQuantities[req.id] || req.quantity_approved}
                                                                onChange={(e) => updateRequestQuantity(req.id, parseInt(e.target.value) || 1)}
                                                                className="w-20 p-1 border border-gray-300 rounded text-sm text-center"
                                                            />
                                                        </div>
                                                    )}
                                                    <Tooltip content="View Details">
                                                        <button
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            onClick={() => navigate(`/${req.type === 'inventory' ? 'product' : 'ppe'}-request/${req.id}`)}
                                                        >
                                                            <MagnifyingGlassIcon className="h-5 w-5" />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const ReceiptTrackingTable = () => {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full">
                            <div className="relative w-full lg:w-96">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search receipts by request number, employee, product, department..."
                                    value={receiptSearchTerm}
                                    onChange={(e) => setReceiptSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {receiptSearchTerm && (
                                    <button
                                        onClick={() => setReceiptSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-gray-700">
                                    Receipt Type:
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFilterReceiptType('all')}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${
                                            filterReceiptType === 'all'
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        All Types
                                    </button>
                                    <button
                                        onClick={() => setFilterReceiptType('inventory')}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${
                                            filterReceiptType === 'inventory'
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <CubeIcon className="h-4 w-4" />
                                            Inventory
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setFilterReceiptType('ppe')}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${
                                            filterReceiptType === 'ppe'
                                                ? 'bg-purple-500 text-white border-purple-500'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ShieldCheckIcon className="h-4 w-4" />
                                            PPE
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-gray-700">
                                    Store Type:
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {storeTypes.map(type => {
                                        const Icon = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => setReceiptStoreTypeFilter(type.value)}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                                    receiptStoreTypeFilter === type.value
                                                        ? `bg-${type.value === 'ppe' ? 'orange' : type.value === 'kitchenStore' ? 'pink' : type.value === 'returnable' ? 'teal' : type.value === 'regular' ? 'green' : 'blue'}-500 text-white`
                                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span className="text-xs">{type.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600">
                            <span className="font-medium">{filteredReceipts.length}</span> receipts found
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden border border-gray-200 rounded-lg bg-white">
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            <button
                                onClick={() => setActiveReceiptTab('pending')}
                                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors ${
                                    activeReceiptTab === 'pending' 
                                        ? 'border-blue-500 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <ClipboardDocumentListIcon className="h-5 w-5" />
                                Awaiting Receipt ({receiptTracking.filter(r => r.status === 'PENDING_RECEIPT').length})
                            </button>
                            <button
                                onClick={() => setActiveReceiptTab('received')}
                                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors ${
                                    activeReceiptTab === 'received' 
                                        ? 'border-blue-500 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <CheckCircleIcon className="h-5 w-5" />
                                Received History ({receiptTracking.filter(r => r.status === 'RECEIVED').length})
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max">
                            <thead>
                                <tr className="bg-gray-100">
                                    {[
                                        "Type",
                                        "Store Type",
                                        "Request #",
                                        "Employee",
                                        "Product/Items",
                                        "Qty Issued",
                                        "Job/Project",
                                        "Department",
                                        "Issued Date",
                                        "Expected By",
                                        "Status",
                                        "Actions"
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
                                {filteredReceipts.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="p-8 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <ClipboardDocumentListIcon className="h-12 w-12 mb-4 text-gray-300" />
                                                <p className="text-sm font-medium">No {activeReceiptTab} receipts</p>
                                                <p className="text-xs mt-1">Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReceipts.map((receipt, index) => (
                                        <tr key={receipt.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="p-4 border-b border-gray-200">
                                                <RequestTypeBadge type={receipt.request_type || 'inventory'} />
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <StoreTypeBadge storeType={receipt.store_type} />
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <Chip 
                                                    value={receipt.request_number} 
                                                    color={receipt.request_type === 'ppe' ? 'purple' : 'blue'} 
                                                    variant="outlined"
                                                />
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-900 block">
                                                        {receipt.employee_name}
                                                    </span>
                                                    <span className="text-sm text-gray-500 block">
                                                        ID: {receipt.employee_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <span className="text-sm text-gray-700">
                                                    {receipt.product_name}
                                                </span>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {receipt.quantity_issued} units
                                                </span>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <BriefcaseIcon className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {receipt.job_project}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <BuildingOfficeIcon className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm text-gray-700">
                                                        {receipt.department}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <span className="text-sm text-gray-700">
                                                    {formatDate(receipt.issued_at)}
                                                </span>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <span className="text-sm text-gray-700">
                                                    {formatDate(receipt.expected_by)}
                                                </span>
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <Chip
                                                    value={receipt.status === 'PENDING_RECEIPT' ? 'Pending Receipt' : 'Received'}
                                                    color={receipt.status === 'PENDING_RECEIPT' ? 'yellow' : 'green'}
                                                    size="sm"
                                                />
                                                {receipt.received_at && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Received: {formatDate(receipt.received_at)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 border-b border-gray-200">
                                                <div className="flex gap-2">
                                                    {receipt.status === 'PENDING_RECEIPT' && (
                                                        <Tooltip content="Confirm Receipt">
                                                            <button
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                onClick={() => handleReceiveItem(receipt)}
                                                            >
                                                                <CheckCircleIcon className="h-5 w-5" />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip content="Report Issue">
                                                        <button
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            onClick={() => {}}
                                                        >
                                                            <ExclamationTriangleIcon className="h-5 w-5" />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && products.length === 0 && inventoryRequests.length === 0 && ppeRequests.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error && products.length === 0) return (
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
            <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <SidebarWithBurgerMenu onToggle={() => {}} />
                        <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            Welcome, Store Keeper
                        </div>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCircleIcon className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 mt-16">
                <div className="p-6 overflow-auto">
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                            <div className="text-green-600 flex items-center gap-2">
                                <CheckCircleIcon className="h-5 w-5" />
                                {successMessage}
                            </div>
                        </div>
                    )}

                    {moveError && (
                        <div className="mb-6 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                            <div className="text-red-600 flex items-center gap-2">
                                <XCircleIcon className="h-5 w-5" />
                                {moveError}
                            </div>
                        </div>
                    )}

                    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('transfer')}
                                className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition-colors ${
                                    activeTab === 'transfer' 
                                        ? 'border-blue-500 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <TruckIcon className="h-5 w-5 inline-block mr-2" />
                                Transfer Inventory
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition-colors ${
                                    activeTab === 'requests' 
                                        ? 'border-blue-500 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <ClipboardDocumentListIcon className="h-5 w-5 inline-block mr-2" />
                                Manage Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('receipts')}
                                className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition-colors ${
                                    activeTab === 'receipts' 
                                        ? 'border-blue-500 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <CheckCircleIcon className="h-5 w-5 inline-block mr-2" />
                                Receipt Tracking
                            </button>
                        </div>
                    </div>

                    {activeTab === 'transfer' && (
                        <div className="space-y-6">
                            <TransferFiltersPanel />
                            
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="checkbox"
                                            checked={selectedItems.length === filteredTransferProducts.length && filteredTransferProducts.length > 0}
                                            onChange={toggleAllProducts}
                                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">Products ({filteredTransferProducts.length})</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <TagIcon className="h-4 w-4 text-gray-400" />
                                                <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                                        Regular: {filteredTransferProducts.filter(p => determineProductStoreType(p) === STORE_TYPES.REGULAR).length}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                                                        PPE: {filteredTransferProducts.filter(p => determineProductStoreType(p) === STORE_TYPES.PPE).length}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                                                        Kitchen: {filteredTransferProducts.filter(p => determineProductStoreType(p) === STORE_TYPES.KITCHEN).length}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                                                        Returnable: {filteredTransferProducts.filter(p => determineProductStoreType(p) === STORE_TYPES.RETURNABLE).length}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-gray-600">
                                            <span className="font-medium">{filteredTransferProducts.length}</span> products found
                                        </div>
                                        {selectedItems.length > 0 && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {selectedItems.length} selected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden border border-gray-200 shadow-sm bg-white rounded-lg">
                                <div className="p-0 overflow-x-auto">
                                    {filteredTransferProducts.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            {transferSearchTerm ? 'No products found matching your search.' : 'No products found'}
                                        </div>
                                    ) : (
                                        <table className="w-full min-w-max table-auto">
                                            <thead>
                                                <tr>
                                                    <th className="border-b border-gray-200 bg-gray-50 p-4 w-10"></th>
                                                    {["Name", "Code", "Description", "Store Type", "Brand", "Stock", "Product Type", "Entry Date"].map((head) => (
                                                        <th key={head} className="border-b border-gray-200 bg-gray-50 p-4">
                                                            <div className="text-sm font-semibold text-gray-700">
                                                                {head}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTransferProducts.map((product) => {
                                                    const storeType = determineProductStoreType(product);
                                                    return (
                                                        <tr
                                                            key={product.id}
                                                            className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${
                                                                selectedItems.includes(product.id) ? 'bg-blue-50' : ''
                                                            }`}
                                                        >
                                                            <td className="p-4 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={selectedItems.includes(product.id)}
                                                                    onChange={() => toggleItemSelection(product.id)}
                                                                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <div className="flex items-center gap-2">
                                                                    {product.ppe && (
                                                                        <ShieldCheckIcon className="h-4 w-4 text-orange-500" title="PPE Item" />
                                                                    )}
                                                                    {product.kitchenStore && (
                                                                        <HomeIcon className="h-4 w-4 text-pink-500" title="Kitchen Store Item" />
                                                                    )}
                                                                    {product.returnableAfterUse && (
                                                                        <ArrowPathIcon className="h-4 w-4 text-teal-500" title="Returnable After Use" />
                                                                    )}
                                                                    <div className="text-sm font-medium whitespace-nowrap max-w-[150px] truncate" title={product.name}>
                                                                        {product.name}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <div className="text-sm text-gray-700">
                                                                    {product.code || 'N/A'}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <div className="text-sm text-gray-700 max-w-xs truncate">
                                                                    {product.description}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <StoreTypeBadge storeType={storeType} />
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <div className="text-sm text-gray-700">
                                                                    {product.userName}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                                    product.stock > 10 ? 'bg-green-100 text-green-800' : 
                                                                    product.stock > 0 ? 'bg-amber-100 text-amber-800' : 
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {product.stock}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <div className="text-sm text-gray-700">
                                                                    {product.productType}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                                <div className="text-sm text-gray-700">
                                                                    {formatDate(product.entryDate)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <RequestsTable />
                    )}

                    {activeTab === 'receipts' && (
                        <ReceiptTrackingTable />
                    )}

                    {activeTab === 'transfer' && selectedItems.length > 0 && (
                        <div className="fixed bottom-8 right-8 z-10">
                            <button
                                className="rounded-full px-6 py-5 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 text-lg font-semibold"
                                onClick={() => setIsMoveToMenuOpen(true)}
                            >
                                <TruckIcon className="h-5 w-5" />
                                <span>Transfer {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'requests' && getSelectedRequests().length > 0 && (
                        <div className="fixed bottom-8 right-8 z-10">
                            <button
                                className="rounded-full px-6 py-5 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 text-lg font-semibold"
                                onClick={() => setIsIssueModalOpen(true)}
                            >
                                <TruckIcon className="h-5 w-5" />
                                <span>Issue {getSelectedRequests().length} Request{getSelectedRequests().length !== 1 ? 's' : ''}</span>
                            </button>
                        </div>
                    )}

                    {isMoveToMenuOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
                                <div className="border-b border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <TruckIcon className="h-6 w-6 text-blue-500" />
                                            <h3 className="text-xl font-semibold text-gray-900">Transfer Inventory</h3>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6 overflow-y-auto max-h-[60vh]">
                                    <div className="mb-6">
                                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                            Selected Items ({selectedItems.length})
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            {selectedItemDetails.map((item, index) => (
                                                <div key={index} className="py-3 px-4 border-b border-gray-100 last:border-0 hover:bg-gray-100/50 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="text-sm font-semibold">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {item.code} • {item.productType}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4 ml-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-600">Qty:</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={item.stock}
                                                                    value={individualQuantities[item.id] || 1}
                                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                                    className="w-20 p-1 border border-gray-300 rounded text-sm text-center"
                                                                />
                                                                <span className="text-xs text-gray-500">
                                                                    Max: {item.stock}
                                                                </span>
                                                            </div>
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                                item.stock > 10 ? 'bg-green-100 text-green-800' : 
                                                                item.stock > 0 ? 'bg-amber-100 text-amber-800' : 
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                Stock: {item.stock}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Brand: {item.userName}
                                                    </div>
                                                    <div className="text-xs text-blue-600 mt-1">
                                                        Will transfer {individualQuantities[item.id] || 1} item(s), leaving {item.stock - (individualQuantities[item.id] || 1)} in stock
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Destination Location
                                            </h4>
                                            <select
                                                value={selectedLocation}
                                                onChange={(e) => setSelectedLocation(e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                            >
                                                <option value="">Select destination</option>
                                                {locations.map((location) => (
                                                    <option key={location} value={location}>
                                                        {location.replace('_', ' ')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Requested By
                                            </h4>
                                            <input
                                                type="text"
                                                value={requestedBy}
                                                onChange={(e) => setRequestedBy(e.target.value)}
                                                placeholder="Enter requester name"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                            />
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Movement Date
                                            </h4>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    value={movementDate}
                                                    onChange={(e) => setMovementDate(e.target.value)}
                                                    max={getTodayDate()}
                                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                                />
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Leave empty to use current date and time
                                            </p>
                                        </div>
                                    </div>

                                    {moveError && (
                                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                            <div className="text-red-600 text-sm flex items-center gap-2">
                                                <XCircleIcon className="h-4 w-4" />
                                                {moveError}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-between p-6 border-t border-gray-200">
                                    <button
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
                                        onClick={() => {
                                            setIsMoveToMenuOpen(false);
                                            setIndividualQuantities({});
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={moveItemsToOutgoing}
                                        disabled={moveLoading || !selectedLocation || !requestedBy}
                                    >
                                        {moveLoading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing Transfer...
                                            </>
                                        ) : (
                                            <>
                                                <TruckIcon className="h-4 w-4" />
                                                Confirm Transfer
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isIssueModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden">
                                <div className="border-b border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <TruckIcon className={`h-6 w-6 ${requestType === 'inventory' ? 'text-green-500' : 'text-purple-500'}`} />
                                            <div>
                                                <h3 className="text-xl font-semibold text-gray-900">
                                                    Issue {requestType === 'inventory' ? 'Inventory' : 'PPE'} Products to Employees
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Review and confirm the issuance of selected requests
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6 overflow-y-auto max-h-[60vh]">
                                    <div className="mb-6">
                                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                            Selected Requests ({getSelectedRequests().length})
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            {filteredRequests
                                                .filter(r => getSelectedRequests().includes(r.id))
                                                .map((request, index) => (
                                                    <div key={request.id} className="py-3 px-4 border-b border-gray-100 last:border-0 hover:bg-gray-100/50 transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <RequestTypeBadge type={request.type} />
                                                                    <StoreTypeBadge storeType={request.store_type} />
                                                                    <div className="text-sm font-semibold">
                                                                        {request.request_number}
                                                                    </div>
                                                                    <UrgencyBadge urgency={request.urgency} />
                                                                </div>
                                                                <div className="text-sm text-gray-600 mb-2">
                                                                    Employee: {request.employee_name} • Department: {request.department}
                                                                </div>
                                                                
                                                                {Array.isArray(request.items) && request.items.length > 0 && (
                                                                    <div className="mt-3 space-y-2">
                                                                        <div className="text-sm font-medium text-gray-700">Items to Issue:</div>
                                                                        {request.items.map((item, idx) => (
                                                                            <div key={idx} className="ml-4 p-2 border border-gray-200 rounded bg-white">
                                                                                <div className="flex justify-between items-center">
                                                                                    <div>
                                                                                        <div className="text-sm font-medium">{item.productName}</div>
                                                                                        <div className="text-xs text-gray-500">Code: {item.productCode || 'N/A'}</div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <div className="text-sm font-semibold text-blue-600">
                                                                                            {item.requestedQuantity} requested
                                                                                        </div>
                                                                                        <div className="text-xs">
                                                                                            <span className="text-gray-600">Approved: </span>
                                                                                            <span className="font-medium text-green-600">{item.approvedQuantity || 0}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <div className="grid grid-cols-2 gap-2 mt-2 border-t border-gray-100 pt-2 text-xs">
                                                                                    <div>
                                                                                        <span className="text-gray-600">Current Stock:</span>
                                                                                        <span className={`font-medium ml-1 ${
                                                                                            (item.currentStock || 0) >= (item.requestedQuantity || 0)
                                                                                                ? 'text-green-600'
                                                                                                : 'text-red-600'
                                                                                        }`}>
                                                                                            {item.currentStock || 0}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-gray-600">Status:</span>
                                                                                        <span className={`font-medium ml-1 ${
                                                                                            (item.currentStock || 0) >= (item.requestedQuantity || 0)
                                                                                                ? 'text-green-600'
                                                                                                : 'text-red-600'
                                                                                        }`}>
                                                                                            {(item.currentStock || 0) >= (item.requestedQuantity || 0)
                                                                                                ? 'Available'
                                                                                                : 'Needs Procurement'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                {(item.currentStock || 0) < (item.requestedQuantity || 0) && (
                                                                                    <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                                                                                        <ExclamationTriangleIcon className="h-3 w-3" />
                                                                                        Stock shortage: {(item.requestedQuantity || 0) - (item.currentStock || 0)} units needed
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-4 ml-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm text-gray-600">Qty to Issue:</span>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max={request.quantity_approved}
                                                                        value={requestQuantities[request.id] || request.quantity_approved}
                                                                        onChange={(e) => updateRequestQuantity(request.id, parseInt(e.target.value) || 1)}
                                                                        className="w-20 p-1 border border-gray-300 rounded text-sm text-center"
                                                                    />
                                                                    <span className="text-xs text-gray-500">
                                                                        Max: {request.quantity_approved}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {Array.isArray(request.items) && request.items.length > 0 && (
                                                            <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100">
                                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                                    <div>
                                                                        <span className="text-gray-600">Total Items:</span>
                                                                        <span className="font-medium ml-1">{request.items.length}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">Stock Status:</span>
                                                                        <span className={`font-medium ml-1 ${
                                                                            request.items.every(item => (item.currentStock || 0) >= (item.requestedQuantity || 0))
                                                                                ? 'text-green-600'
                                                                                : 'text-red-600'
                                                                        }`}>
                                                                            {request.items.every(item => (item.currentStock || 0) >= (item.requestedQuantity || 0))
                                                                                ? 'All in Stock'
                                                                                : 'Stock Issues'}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">Cost:</span>
                                                                        <span className="font-medium text-green-600 ml-1">
                                                                            {formatCurrency(request.total_cost || request.unit_cost * request.quantity_approved)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                            Issue Location *
                                        </h4>
                                        <select
                                            value={issueLocation}
                                            onChange={(e) => setIssueLocation(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                            required
                                        >
                                            <option value="">Select issue location</option>
                                            {locations.map((location) => (
                                                <option key={location} value={location}>
                                                    {location.replace('_', ' ')}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Select where these items are being issued from
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Batch Information (Optional)
                                            </h4>
                                            <input
                                                type="text"
                                                placeholder="Enter batch number for tracking"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                            />
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Additional Notes (Optional)
                                            </h4>
                                            <textarea
                                                placeholder="Add any additional notes about this issuance"
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                                            />
                                        </div>
                                    </div>

                                    {moveError && (
                                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                            <div className="text-red-600 text-sm flex items-center gap-2">
                                                <XCircleIcon className="h-4 w-4" />
                                                {moveError}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-between p-6 border-t border-gray-200">
                                    <button
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
                                        onClick={() => {
                                            setIsIssueModalOpen(false);
                                            setRequestQuantities({});
                                            setIssueLocation('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={`flex items-center gap-2 bg-gradient-to-r text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                            requestType === 'inventory' 
                                                ? 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                                                : 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                                        }`}
                                        onClick={issueItemsToEmployees}
                                        disabled={moveLoading || !issueLocation}
                                    >
                                        {moveLoading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing Issuance...
                                            </>
                                        ) : (
                                            <>
                                                <TruckIcon className="h-4 w-4" />
                                                Issue {getSelectedRequests().length} {requestType} Request{getSelectedRequests().length !== 1 ? 's' : ''}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isRejectModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
                                <div className="border-b border-gray-200 p-6">
                                    <div className="flex items-center gap-3">
                                        <XCircleIcon className="h-6 w-6 text-red-500" />
                                        <h3 className="text-xl font-semibold text-gray-900">Reject Request</h3>
                                    </div>
                                </div>
                                
                                <div className="p-6 overflow-y-auto max-h-[60vh]">
                                    {currentRequest && (
                                        <>
                                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                                                    <span className="text-sm text-amber-800">
                                                        {currentRequest.type === 'inventory' ? 'Inventory' : 'PPE'} Request #{currentRequest.request_number} will be rejected
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-sm text-amber-700">
                                                    {currentRequest.type === 'inventory' && (
                                                        <div><strong>Project:</strong> {currentRequest.job}</div>
                                                    )}
                                                    <div><strong>Department:</strong> {currentRequest.department}</div>
                                                    <div><strong>Employee:</strong> {currentRequest.employee_name}</div>
                                                    <div><strong>Store Type:</strong> <StoreTypeBadge storeType={currentRequest.store_type} /></div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Reason for Rejection *
                                                </label>
                                                <textarea
                                                    name="reason"
                                                    value={rejectForm.reason}
                                                    onChange={(e) => setRejectForm({reason: e.target.value})}
                                                    placeholder="Explain why this request is being rejected"
                                                    rows={4}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                <div className="flex justify-between p-6 border-t border-gray-200">
                                    <button
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsRejectModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                        onClick={handleSubmitReject}
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                        Reject Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isReceiveModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
                                <div className="border-b border-gray-200 p-6">
                                    <div className="flex items-center gap-3">
                                        <CheckCircleIcon className="h-6 w-6 text-green-500" />
                                        <h3 className="text-xl font-semibold text-gray-900">Confirm Receipt</h3>
                                    </div>
                                </div>
                                
                                <div className="p-6 overflow-y-auto max-h-[60vh]">
                                    {currentReceipt && (
                                        <>
                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                                    Receipt Details
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Type:</span>
                                                        <RequestTypeBadge type={currentReceipt.request_type || 'inventory'} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Store Type:</span>
                                                        <StoreTypeBadge storeType={currentReceipt.store_type} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Employee:</span>
                                                        <span className="text-sm font-semibold">{currentReceipt.employee_name}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Product:</span>
                                                        <span className="text-sm font-semibold">{currentReceipt.product_name}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Issued Quantity:</span>
                                                        <span className="text-sm font-semibold">{currentReceipt.quantity_issued} units</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Job/Project:</span>
                                                        <span className="text-sm font-semibold">{currentReceipt.job_project}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Department:</span>
                                                        <span className="text-sm font-semibold">{currentReceipt.department}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Quantity Received *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        name="quantity_received"
                                                        value={receiveForm.quantity_received}
                                                        onChange={(e) => setReceiveForm(prev => ({...prev, quantity_received: e.target.value}))}
                                                        placeholder="Enter quantity received"
                                                        min="1"
                                                        max={currentReceipt.quantity_issued}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Condition
                                                    </label>
                                                    <select
                                                        value={receiveForm.condition}
                                                        onChange={(e) => setReceiveForm(prev => ({...prev, condition: e.target.value}))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                                                    >
                                                        <option value="GOOD">Good</option>
                                                        <option value="DAMAGED">Damaged</option>
                                                        <option value="PARTIAL">Partial Damage</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        name="notes"
                                                        value={receiveForm.notes}
                                                        onChange={(e) => setReceiveForm(prev => ({...prev, notes: e.target.value}))}
                                                        placeholder="Add any additional notes about the receipt"
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                <div className="flex justify-between p-6 border-t border-gray-200">
                                    <button
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsReceiveModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                        onClick={handleSubmitReceive}
                                    >
                                        <CheckCircleIcon className="h-4 w-4" />
                                        Confirm Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Received;