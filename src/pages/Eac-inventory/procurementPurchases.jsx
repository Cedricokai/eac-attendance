import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  TruckIcon, 
  BuildingStorefrontIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';
import { toast } from 'react-toastify';

const ProcurementPurchases = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [newOrder, setNewOrder] = useState({
    supplierName: '',
    supplierContact: '',
    expectedDeliveryDate: '',
    deliveryAddress: '',
    notes: '',
    items: [{
      productId: '',
      productName: '',
      productCode: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      isNewProduct: false,
      productType: 'GENERAL',
      ppe: false,
      kitchenTools: false,
      returnableAfterUse: false,
      description: ''
    }]
  });
  
  const [notificationForm, setNotificationForm] = useState({
    notes: '',
    urgent: false
  });
  
  const [receiveForm, setReceiveForm] = useState({
    receivedQuantity: '',
    receivedBy: '',
    condition: 'GOOD',
    notes: ''
  });
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://localhost:8080";
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
  };

  const API_BASE_URL = getApiBaseUrl();

  const getAuthToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const getUserName = () => {
    return localStorage.getItem('username') || 'Procurement Officer';
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (productSearchTerm) {
      const filtered = products.filter(product =>
        product.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.code?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(productSearchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [productSearchTerm, products]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/purchase-orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch purchase orders: ${response.status}`);
      }

      const data = await response.json();
      setPurchaseOrders(data);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setError(err.message);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const loadMockData = () => {
    const mockOrders = [
      {
        id: 1,
        purchaseOrderNumber: 'PO-20240115-001',
        supplierName: 'ABC Industrial Supplies',
        supplierContact: 'contact@abc.com | +1 (555) 123-4567',
        orderDate: '2024-01-15T10:30:00Z',
        expectedDeliveryDate: '2024-01-25T10:30:00Z',
        deliveryAddress: '123 Warehouse St, Industrial Area',
        totalAmount: 12500.75,
        status: 'ORDERED',
        notes: 'Standard industrial supplies order',
        orderedBy: 'procurement@company.com',
        createdAt: '2024-01-15T10:30:00Z',
        storeNotified: false,
        items: [
          {
            id: 1,
            productId: 101,
            productName: 'Industrial Safety Gloves',
            productCode: 'ISG-500',
            quantity: 200,
            unitPrice: 12.50,
            totalPrice: 2500.00,
            isNewProduct: false,
            receivedQuantity: 0,
            status: 'ORDERED'
          },
          {
            id: 2,
            productId: 102,
            productName: 'Safety Helmets',
            productCode: 'SH-300',
            quantity: 100,
            unitPrice: 45.00,
            totalPrice: 4500.00,
            isNewProduct: false,
            receivedQuantity: 0,
            status: 'ORDERED'
          }
        ]
      },
      {
        id: 2,
        purchaseOrderNumber: 'PO-20240116-002',
        supplierName: 'XYZ Tools Corp',
        supplierContact: 'sales@xyz.com | +1 (555) 987-6543',
        orderDate: '2024-01-16T14:20:00Z',
        expectedDeliveryDate: '2024-01-20T14:20:00Z',
        deliveryAddress: '456 Tool Lane, Manufacturing District',
        totalAmount: 8500.25,
        status: 'DELIVERED',
        notes: 'Urgent order for maintenance team',
        orderedBy: 'procurement@company.com',
        createdAt: '2024-01-16T14:20:00Z',
        storeNotified: true,
        storeNotificationDate: '2024-01-18T09:15:00Z',
        items: [
          {
            id: 3,
            productId: 103,
            productName: 'Power Drill Set',
            productCode: 'PDS-200',
            quantity: 25,
            unitPrice: 250.00,
            totalPrice: 6250.00,
            isNewProduct: false,
            receivedQuantity: 25,
            status: 'RECEIVED'
          },
          {
            id: 4,
            productId: null,
            productName: 'Digital Calipers',
            productCode: 'DC-100',
            quantity: 15,
            unitPrice: 150.00,
            totalPrice: 2250.25,
            isNewProduct: true,
            receivedQuantity: 15,
            status: 'RECEIVED'
          }
        ]
      },
      {
        id: 3,
        purchaseOrderNumber: 'PO-20240117-003',
        supplierName: 'Safety Gear Inc',
        supplierContact: 'info@safetygear.com | +1 (555) 456-7890',
        orderDate: '2024-01-17T11:45:00Z',
        expectedDeliveryDate: '2024-01-30T11:45:00Z',
        deliveryAddress: '789 Safety Blvd, Industrial Park',
        totalAmount: 32000.00,
        status: 'PENDING',
        notes: 'Bulk PPE order for Q1',
        orderedBy: 'procurement@company.com',
        createdAt: '2024-01-17T11:45:00Z',
        storeNotified: false,
        items: [
          {
            id: 5,
            productId: 104,
            productName: 'Full Body Harness',
            productCode: 'FBH-500',
            quantity: 50,
            unitPrice: 350.00,
            totalPrice: 17500.00,
            isNewProduct: false,
            receivedQuantity: 0,
            status: 'PENDING'
          },
          {
            id: 6,
            productId: 105,
            productName: 'Safety Goggles',
            productCode: 'SG-200',
            quantity: 500,
            unitPrice: 15.00,
            totalPrice: 7500.00,
            isNewProduct: false,
            receivedQuantity: 0,
            status: 'PENDING'
          }
        ]
      }
    ];
    
    setPurchaseOrders(mockOrders);
  };

  const handleCreateOrder = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication token not found. Please log in again.');
      return;
    }

    const itemsWithTotals = newOrder.items.map(item => ({
      productId: item.productId || null,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
      isNewProduct: item.isNewProduct,
      productDetails: item.isNewProduct ? {
        name: item.productName,
        code: item.productCode,
        description: item.description || '',
        productType: item.productType || 'GENERAL',
        ppe: item.ppe || false,
        kitchenStore: item.kitchenTools || false,
        returnableAfterUse: item.returnableAfterUse || false,
        unitCost: item.unitPrice || 0
      } : null
    }));

    const orderData = {
      supplierName: newOrder.supplierName,
      supplierContact: newOrder.supplierContact,
      expectedDeliveryDate: newOrder.expectedDeliveryDate,
      deliveryAddress: newOrder.deliveryAddress,
      notes: newOrder.notes,
      items: itemsWithTotals
    };

    console.log('Creating purchase order with data:', orderData);

    const response = await fetch(`${API_BASE_URL}/api/purchase-orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create purchase order: ${errorText}`);
    }

    const createdOrder = await response.json();
    setPurchaseOrders(prev => [createdOrder, ...prev]);
    
    toast.success('Purchase order created successfully! Products will be created only when store receives them.');
    setIsCreateModalOpen(false);
    resetNewOrderForm();
    fetchPurchaseOrders();
  } catch (err) {
    console.error('Error creating purchase order:', err);
    toast.error(`Failed to create purchase order: ${err.message}`);
  }
};

  const handleNotifyStore = async () => {
    if (!selectedOrder) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/purchase-orders/${selectedOrder.id}/notify-store`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: notificationForm.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to notify store');
      }

      const updatedOrder = await response.json();
      setPurchaseOrders(prev => 
        prev.map(order => order.id === selectedOrder.id ? updatedOrder : order)
      );

      toast.success('Store notified successfully!');
      setIsNotifyModalOpen(false);
      setSelectedOrder(null);
      setNotificationForm({ notes: '', urgent: false });
    } catch (err) {
      console.error('Error notifying store:', err);
      toast.error('Failed to notify store');
    }
  };

  const handleReceiveItems = async () => {
    if (!selectedOrder || !selectedItem) return;

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/api/purchase-orders/${selectedOrder.id}/receive/${selectedItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receivedQuantity: parseInt(receiveForm.receivedQuantity),
          receivedBy: receiveForm.receivedBy || getUserName()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to receive items');
      }

      const updatedOrder = await response.json();
      setPurchaseOrders(prev => 
        prev.map(order => order.id === selectedOrder.id ? updatedOrder : order)
      );

      toast.success('Items received successfully! Stock updated.');
      setIsReceiveModalOpen(false);
      setSelectedOrder(null);
      setSelectedItem(null);
      setReceiveForm({
        receivedQuantity: '',
        receivedBy: '',
        condition: 'GOOD',
        notes: ''
      });
    } catch (err) {
      console.error('Error receiving items:', err);
      toast.error('Failed to receive items');
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/purchase-orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes: `Status changed to ${status}` })
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setPurchaseOrders(prev => 
          prev.map(order => order.id === orderId ? updatedOrder : order)
        );
        toast.success(`Order status updated to ${status}`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const resetNewOrderForm = () => {
    setNewOrder({
      supplierName: '',
      supplierContact: '',
      expectedDeliveryDate: '',
      deliveryAddress: '',
      notes: '',
      items: [{
        productId: '',
        productName: '',
        productCode: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        isNewProduct: false,
        productType: 'GENERAL',
        ppe: false,
        kitchenTools: false,
        returnableAfterUse: false,
        description: ''
      }]
    });
  };

  const addNewItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: '',
        productName: '',
        productCode: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        isNewProduct: false,
        productType: 'GENERAL',
        ppe: false,
        kitchenTools: false,
        returnableAfterUse: false,
        description: ''
      }]
    }));
  };

  const removeItem = (index) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setNewOrder(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? value : newItems[index].quantity;
        const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice;
        newItems[index].totalPrice = (quantity || 0) * (unitPrice || 0);
      }
      
      return {
        ...prev,
        items: newItems
      };
    });
  };

  const selectProduct = (index, product) => {
    updateItem(index, 'productId', product.id);
    updateItem(index, 'productName', product.name);
    updateItem(index, 'productCode', product.code);
    updateItem(index, 'unitPrice', product.unitCost || 0);
    updateItem(index, 'isNewProduct', false);
    setShowProductSearch(false);
    setProductSearchTerm('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ORDERED': return 'bg-blue-100 text-blue-800';
      case 'DELIVERED': return 'bg-purple-100 text-purple-800';
      case 'RECEIVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrdersByTab = () => {
    let filtered = purchaseOrders;
    
    if (activeTab === 'pending-notify') {
      filtered = filtered.filter(order => 
        !order.storeNotified && 
        (order.status === 'ORDERED' || order.status === 'DELIVERED')
      );
    } else if (activeTab === 'ordered') {
      filtered = filtered.filter(order => order.status === 'ORDERED');
    } else if (activeTab === 'delivered') {
      filtered = filtered.filter(order => order.status === 'DELIVERED');
    } else if (activeTab === 'received') {
      filtered = filtered.filter(order => order.status === 'RECEIVED');
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.purchaseOrderNumber?.toLowerCase().includes(term) ||
        order.supplierName?.toLowerCase().includes(term) ||
        order.supplierContact?.toLowerCase().includes(term) ||
        order.notes?.toLowerCase().includes(term) ||
        order.items?.some(item => 
          item.productName?.toLowerCase().includes(term) ||
          item.productCode?.toLowerCase().includes(term)
        )
      );
    }
    
    return filtered;
  };

  const filteredOrders = getOrdersByTab();
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const calculateOrderTotal = () => {
    return newOrder.items.reduce((total, item) => total + (item.totalPrice || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarWithBurgerMenu onToggle={() => {}} />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <UserCircleIcon className="h-10 w-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Procurement Purchases</h1>
              <p className="text-gray-600 mt-1">Manage purchase orders and notify stores about incoming stock</p>
            </div>
          </div>
          <button
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon className="h-5 w-5" />
            Create Purchase Order
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <div>
              <strong>Error:</strong> {error}
              <p className="text-sm mt-1">Using demonstration data. Some features may be limited.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShoppingCartIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Notification</p>
                <p className="text-2xl font-bold text-gray-900">
                  {purchaseOrders.filter(order => !order.storeNotified && (order.status === 'ORDERED' || order.status === 'DELIVERED')).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TruckIcon className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {purchaseOrders.filter(order => order.status === 'DELIVERED').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BuildingStorefrontIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Store Notified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {purchaseOrders.filter(order => order.storeNotified).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'all' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5" />
                All Orders ({purchaseOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('pending-notify')}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'pending-notify' 
                    ? 'border-yellow-500 text-yellow-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ExclamationTriangleIcon className="h-5 w-5" />
                Pending Notification ({purchaseOrders.filter(order => !order.storeNotified && (order.status === 'ORDERED' || order.status === 'DELIVERED')).length})
              </button>
              <button
                onClick={() => setActiveTab('ordered')}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'ordered' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ClockIcon className="h-5 w-5" />
                Ordered ({purchaseOrders.filter(order => order.status === 'ORDERED').length})
              </button>
              <button
                onClick={() => setActiveTab('delivered')}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'delivered' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <TruckIcon className="h-5 w-5" />
                Delivered ({purchaseOrders.filter(order => order.status === 'DELIVERED').length})
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'received' 
                    ? 'border-green-500 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckCircleIcon className="h-5 w-5" />
                Received ({purchaseOrders.filter(order => order.status === 'RECEIVED').length})
              </button>
            </div>
          </div>
          
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search purchase orders by PO number, supplier, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">PO Number</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Supplier</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Items</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Order Date</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Expected Delivery</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Status</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Store Notified</span>
                  </th>
                  <th className="p-4 border-b border-gray-200 text-left">
                    <span className="text-sm font-semibold text-gray-700">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <DocumentTextIcon className="h-12 w-12 mb-4 text-gray-300" />
                        <p className="text-sm font-medium">No purchase orders found</p>
                        <p className="text-xs mt-1">Try adjusting your search or create a new purchase order</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 border-b border-gray-200">
                        <div className="font-mono font-semibold text-blue-600">
                          {order.purchaseOrderNumber}
                        </div>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <div>
                          <div className="font-medium text-gray-900">{order.supplierName}</div>
                          <div className="text-sm text-gray-500">{order.supplierContact}</div>
                        </div>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                          </div>
                          {order.items && order.items.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {order.items.slice(0, 2).map(item => item.productName).join(', ')}
                              {order.items.length > 2 && ` +${order.items.length - 2} more`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <div className="text-sm text-gray-700">
                          {formatDate(order.orderDate)}
                        </div>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {formatDate(order.expectedDeliveryDate)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          {order.storeNotified ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-700">
                            {order.storeNotified ? 'Notified' : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 border-b border-gray-200">
                        <div className="flex gap-2">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsViewModalOpen(true);
                            }}
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {!order.storeNotified && (order.status === 'ORDERED' || order.status === 'DELIVERED') && (
                            <button
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsNotifyModalOpen(true);
                              }}
                              title="Notify Store"
                            >
                              <BuildingStorefrontIcon className="h-4 w-4" />
                            </button>
                          )}
                          {order.status === 'DELIVERED' && order.items?.some(item => item.status !== 'RECEIVED') && (
                            <button
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              onClick={() => {
                                setSelectedOrder(order);
                                const unreceivedItem = order.items.find(item => item.status !== 'RECEIVED');
                                if (unreceivedItem) {
                                  setSelectedItem(unreceivedItem);
                                  setReceiveForm({
                                    receivedQuantity: unreceivedItem.quantity - (unreceivedItem.receivedQuantity || 0),
                                    receivedBy: getUserName(),
                                    condition: 'GOOD',
                                    notes: ''
                                  });
                                  setIsReceiveModalOpen(true);
                                }
                              }}
                              title="Receive Items"
                            >
                              <TruckIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingCartIcon className="h-6 w-6 text-blue-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Create New Purchase Order</h2>
                  </div>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetNewOrderForm();
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      value={newOrder.supplierName}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, supplierName: e.target.value }))}
                      placeholder="Enter supplier name"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Supplier Contact *
                    </label>
                    <input
                      type="text"
                      value={newOrder.supplierContact}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, supplierContact: e.target.value }))}
                      placeholder="Email / Phone"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expected Delivery Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={newOrder.expectedDeliveryDate}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      value={newOrder.deliveryAddress}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                      placeholder="Enter delivery address"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any notes about this purchase order"
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                    <button
                      onClick={addNewItem}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>

                  {newOrder.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold text-gray-900">Item {index + 1}</h4>
                        {newOrder.items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Selection
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setShowProductSearch(!showProductSearch);
                                setProductSearchTerm('');
                              }}
                              className="w-full p-3 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex justify-between items-center"
                            >
                              <span className={item.productName ? "text-gray-900" : "text-gray-500"}>
                                {item.productName || "Select a product or add new"}
                              </span>
                              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                            </button>

                            {showProductSearch && (
                              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="p-2 border-b border-gray-200">
                                  <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search products..."
                                      value={productSearchTerm}
                                      onChange={(e) => setProductSearchTerm(e.target.value)}
                                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  <button
                                    onClick={() => {
                                      updateItem(index, 'productId', '');
                                      updateItem(index, 'productName', '');
                                      updateItem(index, 'productCode', '');
                                      updateItem(index, 'isNewProduct', true);
                                      updateItem(index, 'description', '');
                                      setShowProductSearch(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 flex items-center gap-2"
                                  >
                                    <PlusIcon className="h-4 w-4 text-blue-500" />
                                    <div>
                                      <div className="font-medium">Add New Product</div>
                                      <div className="text-xs text-gray-500">Create a new product not in inventory</div>
                                    </div>
                                  </button>
                                  {filteredProducts.map(product => (
                                    <button
                                      key={product.id}
                                      onClick={() => selectProduct(index, product)}
                                      className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100"
                                    >
                                      <div className="font-medium">{product.name}</div>
                                      <div className="text-sm text-gray-500">Code: {product.code} | Stock: {product.stock}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.isNewProduct && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Product Name *
                              </label>
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => updateItem(index, 'productName', e.target.value)}
                                placeholder="Enter product name"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Code *
                              </label>
                              <input
                                type="text"
                                value={item.productCode}
                                onChange={(e) => updateItem(index, 'productCode', e.target.value)}
                                placeholder="Enter product code"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {item.isNewProduct && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Type *
                              </label>
                              <select
                                value={item.productType || 'GENERAL'}
                                onChange={(e) => updateItem(index, 'productType', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="GENERAL">General</option>
                                <option value="PPE">PPE</option>
                                <option value="KITCHEN">Kitchen</option>
                                <option value="RAW_MATERIAL">Raw Material</option>
                                <option value="FINISHED_GOOD">Finished Good</option>
                                <option value="CONSUMABLE">Consumable</option>
                              </select>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-6">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.ppe || false}
                                  onChange={(e) => updateItem(index, 'ppe', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">PPE</span>
                              </label>
                              
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.kitchenTools || false}
                                  onChange={(e) => updateItem(index, 'kitchenTools', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Kitchen Tools</span>
                              </label>
                              
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.returnableAfterUse || false}
                                  onChange={(e) => updateItem(index, 'returnableAfterUse', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Returnable</span>
                              </label>
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Product description"
                              rows="2"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit Price (GHS) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Price
                          </label>
                          <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(item.totalPrice)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                      <p className="text-sm text-gray-600">{newOrder.items.length} item{newOrder.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(calculateOrderTotal())}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between p-6 border-t border-gray-200">
                <button
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetNewOrderForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors flex items-center gap-2"
                  onClick={handleCreateOrder}
                  disabled={!newOrder.supplierName || !newOrder.supplierContact || !newOrder.expectedDeliveryDate || !newOrder.deliveryAddress}
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  Create Purchase Order
                </button>
              </div>
            </div>
          </div>
        )}

        {isNotifyModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BuildingStorefrontIcon className="h-6 w-6 text-green-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Notify Store About Incoming Stock</h2>
                  </div>
                  <button
                    onClick={() => setIsNotifyModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Purchase Order Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">PO Number</p>
                      <p className="font-semibold">{selectedOrder.purchaseOrderNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Supplier</p>
                      <p className="font-semibold">{selectedOrder.supplierName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Expected Delivery</p>
                      <p className="font-semibold">{formatDate(selectedOrder.expectedDeliveryDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Items</p>
                      <p className="font-semibold">{selectedOrder.items?.length || 0} items</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Items to be Received</h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-gray-600">Code: {item.productCode}</div>
                            {item.isNewProduct && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 mt-1">
                                New Product
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{item.quantity} units</div>
                            <div className="text-sm text-gray-600">
                              {formatCurrency(item.unitPrice)} each
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notification Notes (Optional)
                  </label>
                  <textarea
                    value={notificationForm.notes}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any special instructions or notes for the store"
                    rows="4"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationForm.urgent}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, urgent: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Mark as urgent notification</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between p-6 border-t border-gray-200">
                <button
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsNotifyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors flex items-center gap-2"
                  onClick={handleNotifyStore}
                >
                  <BuildingStorefrontIcon className="h-5 w-5" />
                  Notify Store
                </button>
              </div>
            </div>
          </div>
        )}

        {isReceiveModalOpen && selectedOrder && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TruckIcon className="h-6 w-6 text-purple-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Receive Items</h2>
                  </div>
                  <button
                    onClick={() => setIsReceiveModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Receiving Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">PO Number</p>
                      <p className="font-semibold">{selectedOrder.purchaseOrderNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Item</p>
                      <p className="font-semibold">{selectedItem.productName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Ordered Quantity</p>
                      <p className="font-semibold">{selectedItem.quantity} units</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Already Received</p>
                      <p className="font-semibold">{selectedItem.receivedQuantity || 0} units</p>
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
                      min="1"
                      max={selectedItem.quantity - (selectedItem.receivedQuantity || 0)}
                      value={receiveForm.receivedQuantity}
                      onChange={(e) => setReceiveForm(prev => ({ ...prev, receivedQuantity: e.target.value }))}
                      placeholder="Enter quantity received"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Maximum: {selectedItem.quantity - (selectedItem.receivedQuantity || 0)} units remaining
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Received By *
                    </label>
                    <input
                      type="text"
                      value={receiveForm.receivedBy}
                      onChange={(e) => setReceiveForm(prev => ({ ...prev, receivedBy: e.target.value }))}
                      placeholder="Enter receiver name"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Condition
                    </label>
                    <select
                      value={receiveForm.condition}
                      onChange={(e) => setReceiveForm(prev => ({ ...prev, condition: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="GOOD">Good</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="PARTIAL">Partially Damaged</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={receiveForm.notes}
                      onChange={(e) => setReceiveForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes about the received items"
                      rows="3"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between p-6 border-t border-gray-200">
                <button
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsReceiveModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors flex items-center gap-2"
                  onClick={handleReceiveItems}
                  disabled={!receiveForm.receivedQuantity || !receiveForm.receivedBy}
                >
                  <TruckIcon className="h-5 w-5" />
                  Confirm Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {isViewModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EyeIcon className="h-6 w-6 text-blue-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Purchase Order Details</h2>
                      <p className="text-sm text-gray-600">{selectedOrder.purchaseOrderNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Date:</span>
                        <span className="text-sm font-medium">{formatDate(selectedOrder.orderDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Expected Delivery:</span>
                        <span className="text-sm font-medium">{formatDate(selectedOrder.expectedDeliveryDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Store Notified:</span>
                        <span className="text-sm font-medium">
                          {selectedOrder.storeNotified ? 
                            `Yes (${formatDate(selectedOrder.storeNotificationDate)})` : 
                            'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Supplier Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Supplier:</span>
                        <span className="text-sm font-medium">{selectedOrder.supplierName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Contact:</span>
                        <span className="text-sm font-medium">{selectedOrder.supplierContact}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Delivery Address:</span>
                        <span className="text-sm font-medium">{selectedOrder.deliveryAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-3 text-left text-xs font-semibold text-gray-700">Product</th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-700">Code</th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-700">Quantity</th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-700">Unit Price</th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-700">Total</th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-700">Received</th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items?.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                {item.isNewProduct && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded">New</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-600">{item.productCode}</td>
                            <td className="p-3 text-sm font-medium">{item.quantity}</td>
                            <td className="p-3 text-sm">{formatCurrency(item.unitPrice)}</td>
                            <td className="p-3 text-sm font-semibold">{formatCurrency(item.totalPrice)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{item.receivedQuantity || 0}</span>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ width: `${((item.receivedQuantity || 0) / item.quantity) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan="4" className="p-3 text-right font-semibold">Total:</td>
                          <td colSpan="3" className="p-3 font-bold text-green-600">
                            {formatCurrency(selectedOrder.totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedOrder.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between p-6 border-t border-gray-200">
                <button
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </button>
                <div className="flex gap-2">
                  {!selectedOrder.storeNotified && (selectedOrder.status === 'ORDERED' || selectedOrder.status === 'DELIVERED') && (
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        setSelectedOrder(selectedOrder);
                        setIsNotifyModalOpen(true);
                      }}
                    >
                      <BuildingStorefrontIcon className="h-4 w-4" />
                      Notify Store
                    </button>
                  )}
                  {selectedOrder.status === 'DELIVERED' && selectedOrder.items?.some(item => item.status !== 'RECEIVED') && (
                    <button
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        setSelectedOrder(selectedOrder);
                        const unreceivedItem = selectedOrder.items.find(item => item.status !== 'RECEIVED');
                        if (unreceivedItem) {
                          setSelectedItem(unreceivedItem);
                          setReceiveForm({
                            receivedQuantity: unreceivedItem.quantity - (unreceivedItem.receivedQuantity || 0),
                            receivedBy: getUserName(),
                            condition: 'GOOD',
                            notes: ''
                          });
                          setIsReceiveModalOpen(true);
                        }
                      }}
                    >
                      <TruckIcon className="h-4 w-4" />
                      Receive Items
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcurementPurchases;