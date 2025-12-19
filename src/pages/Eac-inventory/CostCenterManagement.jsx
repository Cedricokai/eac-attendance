import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const checkBudgetStatus = (spent, budget) => {
  const percentage_used = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = budget - spent;
  
  return {
    percentage_used: Math.min(100, Math.round(percentage_used)),
    remaining: Math.max(0, remaining),
    is_critical: percentage_used >= 90,
    is_warning: percentage_used >= 75 && percentage_used < 90
  };
};

const CostCenterManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [costCenters, setCostCenters] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [allJobs, setAllJobs] = useState([]);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [showCreateCostCenterModal, setShowCreateCostCenterModal] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCostCenter, setCurrentCostCenter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCostCenterForProducts, setSelectedCostCenterForProducts] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'PROJECT',
    status: 'ACTIVE',
    budget: '',
    start_date: '',
    end_date: ''
  });

  const [errors, setErrors] = useState({});

  const [productRequests, setProductRequests] = useState([]);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  };

  const apiRequest = async (url, options = {}) => {
    const token = getAuthToken();
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      
      if (response.status === 401) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        navigate('/login');
        throw new Error('Authentication expired. Please login again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const jobIdParam = urlParams.get('jobId');
    
    if (jobIdParam) {
      setSelectedJobId(jobIdParam);
      fetchJobDetails(jobIdParam);
    }
    
    fetchAllData();
  }, [location]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCostCenters(),
        fetchProducts(),
        fetchJobs(),
        fetchProductRequests()
      ]);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check your connection.');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCostCenters = async () => {
    try {
        let url = '/api/cost-centers';
        if (selectedJobId) {
            try {
                const costCenter = await apiRequest(`/api/cost-centers/job/${selectedJobId}`);
                if (costCenter) {
                    // Fetch products for this cost center
                    const products = await apiRequest(`/api/cost-center-products/cost-center/${costCenter.id}`);
                    costCenter.products = products || [];
                    setCostCenters([costCenter]);
                    return;
                }
            } catch (err) {
                console.log("No existing cost center for this job");
            }
        }
        
        const data = await apiRequest(url);
        if (data) {
            // Fetch products for each cost center
            const costCentersWithProducts = await Promise.all(
                data.map(async (cc) => {
                    try {
                        const products = await apiRequest(`/api/cost-center-products/cost-center/${cc.id}`);
                        return { ...cc, products: products || [] };
                    } catch (err) {
                        console.error(`Error fetching products for cost center ${cc.id}:`, err);
                        return { ...cc, products: [] };
                    }
                })
            );
            setCostCenters(costCentersWithProducts);
        } else {
            setCostCenters([]);
        }
    } catch (err) {
        console.error("Error fetching cost centers:", err);
        setCostCenters([]);
    }
};

  const fetchProducts = async () => {
    try {
      const productsData = await apiRequest('/api/products');
      setProducts(productsData || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    }
  };

  const fetchJobs = async () => {
    try {
      const jobsData = await apiRequest('/api/jobs');
      setAllJobs(jobsData || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setAllJobs([]);
    }
  };

  const fetchProductRequests = async () => {
    try {
      const requests = await apiRequest('/api/inventory-requests?includeItems=true');
      setProductRequests(requests || []);
    } catch (err) {
      console.error("Error fetching product requests:", err);
      setProductRequests([]);
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      const jobData = await apiRequest(`/api/jobs/${jobId}`);
      setSelectedJobDetails(jobData);
      
      if (jobData && !jobData.costCenter) {
        setShowCreateCostCenterModal(true);
      }
    } catch (err) {
      console.error("Error fetching job details:", err);
    }
  };

  const createCostCenterForJob = async (job) => {
    try {
      setIsSubmitting(true);
      
      const costCenterData = {
        jobId: job.id,
        name: `${job.name} - Cost Center`,
        code: `CC-${job.id}-${Date.now().toString().slice(-4)}`,
        description: `Cost center for job: ${job.name}`,
        type: 'PROJECT',
        status: 'ACTIVE',
        budget: job.budget || 100000,
        start_date: job.startDate || new Date().toISOString().split('T')[0],
        end_date: job.endDate || null
      };
      
      console.log('Creating cost center with data:', costCenterData);
      
      const response = await apiRequest('/api/cost-centers', {
        method: 'POST',
        body: JSON.stringify(costCenterData)
      });
      
      console.log('Cost center created:', response);
      toast.success('Cost center created successfully for this job!');
      await fetchCostCenters();
      setShowCreateCostCenterModal(false);
      
      return response;
    } catch (err) {
      console.error('Error creating cost center for job:', err);
      toast.error('Failed to create cost center for job');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCostCenterFromJob = async () => {
    if (!selectedJobDetails) {
      toast.error('No job selected');
      return;
    }
    
    await createCostCenterForJob(selectedJobDetails);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.code.trim()) newErrors.code = 'Code is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.budget || parseFloat(formData.budget) < 0) {
      newErrors.budget = 'Please enter a valid budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleOpenModal = () => {
    setIsEditMode(false);
    setFormData({
      name: '',
      code: '',
      description: '',
      type: 'PROJECT',
      status: 'ACTIVE',
      budget: '',
      start_date: '',
      end_date: ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditCostCenter = (costCenter) => {
    setCurrentCostCenter(costCenter);
    setIsEditMode(true);
    setFormData({
      name: costCenter.name,
      code: costCenter.code,
      description: costCenter.description || '',
      type: costCenter.type,
      status: costCenter.status,
      budget: costCenter.budget.toString(),
      start_date: costCenter.start_date ? costCenter.start_date.split('T')[0] : '',
      end_date: costCenter.end_date ? costCenter.end_date.split('T')[0] : ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCostCenter(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      type: 'PROJECT',
      status: 'ACTIVE',
      budget: '',
      start_date: '',
      end_date: ''
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        budget: parseFloat(formData.budget),
        spent_amount: isEditMode && currentCostCenter ? currentCostCenter.spent_amount : 0,
        jobId: selectedJobId
      };

      let savedCostCenter;
      if (isEditMode && currentCostCenter) {
        savedCostCenter = await apiRequest(`/api/cost-centers/${currentCostCenter.id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData)
        });
        toast.success('Cost center updated successfully!');
      } else {
        savedCostCenter = await apiRequest('/api/cost-centers', {
          method: 'POST',
          body: JSON.stringify(submitData)
        });
        toast.success('Cost center created successfully!');
      }

      await fetchCostCenters();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving cost center:', err);
      toast.error(err.message || 'Failed to save cost center');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCostCenter = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cost center?')) return;

    try {
      await apiRequest(`/api/cost-centers/${id}`, {
        method: 'DELETE'
      });
      
      setCostCenters(prev => prev.filter(cc => cc.id !== id));
      toast.success('Cost center deleted successfully!');
    } catch (err) {
      console.error('Error deleting cost center:', err);
      toast.error('Failed to delete cost center');
    }
  };

  const handleOpenProductModal = (costCenter, jobId = null) => {
    setSelectedCostCenterForProducts(costCenter);
    setSelectedProducts(costCenter.products || []);
    
    if (jobId) {
      setSelectedJobId(jobId);
    }
    
    setShowProductModal(true);
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setSelectedCostCenterForProducts(null);
    setSelectedProducts([]);
    setProductSearchTerm('');
  };

  const handleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, { 
          ...product, 
          quantity: 1,
          estimatedUsage: '',
          status: 'PENDING'
        }];
      }
    });
  };

  const updateProductQuantity = (productId, quantity) => {
    setSelectedProducts(prev =>
      prev.map(product =>
        product.id === productId 
          ? { ...product, quantity: Math.max(1, Math.min(quantity, product.stock)) }
          : product
      )
    );
  };

  const updateProductUsage = (productId, usage) => {
    setSelectedProducts(prev =>
      prev.map(product =>
        product.id === productId 
          ? { ...product, estimatedUsage: usage }
          : product
      )
    );
  };

  const saveProductsToCostCenter = async () => {
    try {
        const token = getAuthToken();
        
        if (!selectedCostCenterForProducts) {
            toast.error('No cost center selected');
            return;
        }

        if (selectedProducts.length === 0) {
            toast.error('Please select at least one product');
            return;
        }

        const totalCost = selectedProducts.reduce((total, product) => 
            total + ((product.unitCost || 0) * (product.quantity || 1)), 0);

        const currentSpent = selectedCostCenterForProducts.spentAmount || 0;
        const budget = selectedCostCenterForProducts.budget || 0;
        const remainingBudget = budget - currentSpent;
        
        if (totalCost > remainingBudget) {
            toast.error(`Insufficient budget! Requested: ${formatCurrency(totalCost)}, Available: ${formatCurrency(remainingBudget)}`);
            return;
        }

        // 1. First, save products to the cost center products table
        try {
            const productRequests = selectedProducts.map(product => ({
                productId: product.id,
                requestedQuantity: product.quantity || 1,
                estimatedUsage: product.estimatedUsage || ''
            }));

            console.log('Saving products to cost center:', {
                costCenterId: selectedCostCenterForProducts.id,
                productRequests: productRequests
            });

            // Save to cost center products table
            const productsResponse = await apiRequest(`/api/cost-center-products/cost-center/${selectedCostCenterForProducts.id}/batch`, {
                method: 'POST',
                body: JSON.stringify(productRequests)
            });

            console.log('Products saved to cost center:', productsResponse);
            toast.success(`${selectedProducts.length} product(s) added to cost center`);
            
        } catch (productError) {
            console.error('Error saving to cost center products:', productError);
            toast.error('Failed to save products to cost center. Please try again.');
            return; // Stop here if product saving fails
        }

        // 2. Then create inventory request
        const requestData = {
            items: selectedProducts.map(product => ({
                productId: product.id,
                productName: product.name,
                productCode: product.code,
                quantity: product.quantity || 1,
                unitCost: product.unitCost || 0,
                totalCost: (product.unitCost || 0) * (product.quantity || 1),
                category: product.category || 'General',
                estimatedUsage: product.estimatedUsage || '',
                status: 'PROCUREMENT_PENDING'
            })),
            notes: `Cost Center Request: ${selectedCostCenterForProducts.name} (${selectedCostCenterForProducts.code})`,
            requestedBy: localStorage.getItem('username') || 'Cost Center Manager',
            department: 'Cost Center Management',
            projectName: selectedCostCenterForProducts.name,
            jobDescription: selectedCostCenterForProducts.description || `Cost Center: ${selectedCostCenterForProducts.code}`,
            location: 'Main Store',
            urgency: 'normal',
            skipPlanner: true,
            status: 'PROCUREMENT_PENDING',
            plannerNotes: `Auto-generated from cost center management`,
            estimatedCost: totalCost,
            costCenterId: selectedCostCenterForProducts.id,
            costCenterName: selectedCostCenterForProducts.name,
            costCenterCode: selectedCostCenterForProducts.code,
            jobId: selectedJobId || selectedCostCenterForProducts.job?.id,
            jobName: selectedJobDetails?.name || selectedCostCenterForProducts.job?.name,
            trackingData: {
                requestedDate: new Date().toISOString(),
                requestedByUserId: localStorage.getItem('userId'),
                requestedByUsername: localStorage.getItem('username'),
                itemsCount: selectedProducts.length,
                estimatedTotalCost: totalCost
            }
        };

        console.log('Creating inventory request:', requestData);

        const requestResponse = await fetch(`${API_BASE_URL}/api/inventory-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!requestResponse.ok) {
            const errorText = await requestResponse.text();
            console.error('Inventory request error:', errorText);
            throw new Error(`Failed to create procurement request: ${requestResponse.status} - ${errorText}`);
        }

        const inventoryRequest = await requestResponse.json();

        // 3. Update cost center spent amount
        const updatedSpentAmount = currentSpent + totalCost;

        console.log('Updating cost center spent amount:', {
            costCenterId: selectedCostCenterForProducts.id,
            currentSpent: currentSpent,
            totalCost: totalCost,
            newSpentAmount: updatedSpentAmount
        });

        const updateResponse = await fetch(`${API_BASE_URL}/api/cost-centers/${selectedCostCenterForProducts.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: selectedCostCenterForProducts.name,
                code: selectedCostCenterForProducts.code,
                description: selectedCostCenterForProducts.description,
                type: selectedCostCenterForProducts.type,
                status: selectedCostCenterForProducts.status,
                budget: selectedCostCenterForProducts.budget,
                spentAmount: updatedSpentAmount,
                start_date: selectedCostCenterForProducts.start_date,
                end_date: selectedCostCenterForProducts.end_date
            })
        });

        if (updateResponse.ok) {
            const updatedCostCenter = await updateResponse.json();
            setCostCenters(prev => prev.map(cc => 
                cc.id === selectedCostCenterForProducts.id 
                    ? updatedCostCenter
                    : cc
            ));
            console.log('Cost center updated successfully:', updatedCostCenter);
        } else {
            console.error('Failed to update cost center spent amount');
            const errorText = await updateResponse.text();
            console.error('Update error:', errorText);
        }

        // 4. Refresh data
        await fetchProductRequests();
        await fetchCostCenters(); // Refresh cost centers to get updated spent amount

        const budgetUsed = budget > 0 ? Math.round((updatedSpentAmount / budget) * 100) : 0;
        
        toast.success(
            <div>
                <div className="font-bold">✅ Product Request Submitted Successfully!</div>
                <div className="text-sm">
                    • {selectedProducts.length} product(s) saved to cost center<br/>
                    • Procurement request created successfully<br/>
                    • Request ID: <strong>{inventoryRequest.id}</strong><br/>
                    • Estimated cost: <strong>{formatCurrency(totalCost)}</strong><br/>
                    • Budget used: <strong>{budgetUsed}%</strong><br/>
                    • Remaining budget: <strong>{formatCurrency(budget - updatedSpentAmount)}</strong><br/>
                    • <button 
                        onClick={() => viewRequestDetails(inventoryRequest.id)}
                        className="text-blue-600 hover:text-blue-800 underline mt-1"
                    >
                        Track Request Progress
                    </button>
                </div>
            </div>,
            {
                autoClose: 8000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true
            }
        );
        
        handleCloseProductModal();
        
    } catch (err) {
        console.error('Error in saveProductsToCostCenter:', err);
        toast.error(
            <div>
                <div className="font-bold">❌ Failed to submit product request</div>
                <div className="text-sm">{err.message || 'Unknown error occurred'}</div>
            </div>
        );
    }
};

  const calculateProductCost = (costCenter) => {
    if (!costCenter.transactions || costCenter.transactions.length === 0) {
      return 0;
    }
    
    return costCenter.transactions.reduce((total, transaction) => {
      if (transaction.transactionType === 'PRODUCT_ISSUE') {
        return total + (transaction.amount || 0);
      }
      return total;
    }, 0);
  };

  const viewRequestDetails = async (requestId) => {
    try {
      const request = await apiRequest(`/api/inventory-requests/${requestId}`);
      setSelectedRequestDetails(request);
      setShowRequestDetailsModal(true);
    } catch (err) {
      console.error('Error fetching request details:', err);
      toast.error('Failed to load request details');
    }
  };

  const getRequestsForCostCenter = (costCenterId) => {
    return productRequests.filter(request => 
      request.costCenterId === costCenterId || 
      (request.trackingData && request.trackingData.costCenterId === costCenterId)
    );
  };

  const getRequestStatusSummary = (costCenterId) => {
    const requests = getRequestsForCostCenter(costCenterId);
    const summary = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING' || r.status === 'PROCUREMENT_PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      issued: requests.filter(r => r.status === 'ISSUED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      completed: requests.filter(r => r.status === 'COMPLETED').length
    };
    return summary;
  };

  const updateRequestStatus = async (requestId, newStatus, notes = '') => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: notes,
          updatedBy: localStorage.getItem('username') || 'System',
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        await fetchProductRequests();
        toast.success(`Request status updated to ${newStatus}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating request status:', err);
      toast.error('Failed to update request status');
      return false;
    }
  };

  const filteredCostCenters = costCenters.filter(cc =>
    cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const StatusBadge = ({ status }) => {
    const statusColors = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      ON_HOLD: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      ISSUED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-purple-100 text-purple-800',
      PROCUREMENT_PENDING: 'bg-orange-100 text-orange-800',
      UNDER_REVIEW: 'bg-indigo-100 text-indigo-800',
      PARTIALLY_REJECTED: 'bg-red-100 text-red-800',
      PARTIALLY_PENDING: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace('_', ' ')}
      </span>
    );
  };

  const ProgressBar = ({ percentage, isCritical, isWarning }) => {
    let color = 'bg-green-500';
    if (isCritical) color = 'bg-red-500';
    else if (isWarning) color = 'bg-yellow-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  const RequestStatusBadge = ({ status }) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
      PROCUREMENT_PENDING: { color: 'bg-orange-100 text-orange-800', icon: '📋' },
      UNDER_REVIEW: { color: 'bg-indigo-100 text-indigo-800', icon: '👁️' },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: '✅' },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: '❌' },
      ISSUED: { color: 'bg-blue-100 text-blue-800', icon: '📦' },
      COMPLETED: { color: 'bg-purple-100 text-purple-800', icon: '🏁' },
      PARTIALLY_REJECTED: { color: 'bg-red-100 text-red-800', icon: '⚠️' },
      PARTIALLY_PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: '🚫' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: '❓' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1`}>
        <span>{config.icon}</span>
        <span>{status?.replace('_', ' ')}</span>
      </span>
    );
  };

  const ProductStatusDisplay = ({ request }) => {
    if (!request.items || request.items.length === 0) {
      return <RequestStatusBadge status={request.status} />;
    }

    const itemsByStatus = request.items.reduce((acc, item) => {
      const status = item.status || request.status;
      if (!acc[status]) acc[status] = 0;
      acc[status] += 1;
      return acc;
    }, {});

    const uniqueStatuses = Object.keys(itemsByStatus);

    if (uniqueStatuses.length === 1) {
      return <RequestStatusBadge status={uniqueStatuses[0]} />;
    }

    return (
      <div className="relative group">
        <RequestStatusBadge status={request.status} />
        <div className="absolute hidden group-hover:block z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
          <div className="text-sm font-semibold text-gray-900 mb-2">Product Status Breakdown</div>
          {Object.entries(itemsByStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center mb-1">
              <RequestStatusBadge status={status} />
              <span className="text-sm text-gray-600">{count} items</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const JobSelector = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Select Job</h3>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            <div
              className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50"
              onClick={() => {
                setSelectedJobId(null);
                setSelectedJobDetails(null);
                fetchCostCenters();
                setShowJobSelector(false);
              }}
            >
              <div className="font-medium text-blue-600">All Jobs</div>
              <div className="text-sm text-gray-600">Show cost centers for all jobs</div>
            </div>
            
            {allJobs.map(job => (
              <div
                key={job.id}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedJobId === job.id.toString() 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
                onClick={() => {
                  setSelectedJobId(job.id.toString());
                  setSelectedJobDetails(job);
                  fetchCostCenters();
                  setShowJobSelector(false);
                }}
              >
                <div className="font-medium">{job.name}</div>
                <div className="text-sm text-gray-600">{job.client}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Budget: ${job.budget ? parseFloat(job.budget).toLocaleString() : '0.00'}
                </div>
                {job.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {job.description.substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => setShowJobSelector(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const CreateCostCenterForJobModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Create Cost Center for Job</h2>
          </div>
        </div>

        <div className="p-6">
          {selectedJobDetails ? (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Job Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job Name:</span>
                    <span className="font-semibold">{selectedJobDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-semibold">{selectedJobDetails.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-semibold text-green-600">
                      ${selectedJobDetails.budget ? parseFloat(selectedJobDetails.budget).toLocaleString() : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <StatusBadge status={selectedJobDetails.status} />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Cost Center Details</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost Center Name</label>
                    <input
                      type="text"
                      value={`${selectedJobDetails.name} - Cost Center`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Budget</label>
                    <input
                      type="text"
                      value={`$${selectedJobDetails.budget ? parseFloat(selectedJobDetails.budget).toLocaleString() : '100,000.00'}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    A cost center will be automatically created with the job's budget and details.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500">No job selected</div>
            </div>
          )}
        </div>

        <div className="flex justify-between p-6 border-t border-gray-200">
          <button
            onClick={() => setShowCreateCostCenterModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateCostCenterFromJob}
            disabled={isSubmitting || !selectedJobDetails}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Cost Center
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const RequestDetailsModal = () => {
    if (!selectedRequestDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="border-b border-gray-200 p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">
                Product Request Details
              </h2>
            </div>
            <button
              onClick={() => setShowRequestDetailsModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Request ID</div>
                <div className="font-semibold">{selectedRequestDetails.id}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Status</div>
                <div className="mt-1">
                  <RequestStatusBadge status={selectedRequestDetails.status} />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Estimated Cost</div>
                <div className="font-semibold text-lg">
                  {formatCurrency(selectedRequestDetails.estimatedCost || 0)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Job Information</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job:</span>
                    <span className="font-medium">{selectedRequestDetails.jobName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{selectedJobDetails?.client || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Cost Center</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost Center:</span>
                    <span className="font-medium">{selectedRequestDetails.costCenterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code:</span>
                    <span className="font-medium">{selectedRequestDetails.costCenterCode}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Requested Products</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit Cost</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Cost</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequestDetails.items?.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.category || 'General'}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">{item.productCode}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="font-medium">{item.quantity}</div>
                          <div className="text-xs text-gray-500">Requested</div>
                        </td>
                        <td className="px-4 py-2 text-sm">{formatCurrency(item.unitCost)}</td>
                        <td className="px-4 py-2 text-sm font-medium">{formatCurrency(item.totalCost)}</td>
                        <td className="px-4 py-2">
                          <RequestStatusBadge status={item.status || selectedRequestDetails.status} />
                          {item.estimatedUsage && (
                            <div className="text-xs text-gray-500 mt-1">
                              Usage: {item.estimatedUsage}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Request Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Request Created</div>
                    <div className="text-sm text-gray-600">
                      {new Date(selectedRequestDetails.createdDate || selectedRequestDetails.requestDate).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Requested by: {selectedRequestDetails.requestedBy || 'System'}
                    </div>
                  </div>
                </div>
                
                {selectedRequestDetails.statusHistory?.map((history, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Status Changed: {history.status}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(history.date).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Updated by: {history.by || 'System'}
                        {history.notes && <div className="mt-1">Notes: {history.notes}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between p-6 border-t border-gray-200">
            <button
              onClick={() => setShowRequestDetailsModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                Print Request
              </button>
              <button
                onClick={() => {
                  const newStatus = prompt('Enter new status (APPROVED, REJECTED, ISSUED, etc.):');
                  if (newStatus) {
                    updateRequestStatus(selectedRequestDetails.id, newStatus);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && costCenters.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cost Center Management</h1>
              <p className="text-gray-600">Track projects, budgets, and product requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJobSelector(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {selectedJobId ? 'Change Job' : 'Select Job'}
            </button>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Cost Center
            </button>
          </div>
        </div>
        
        {selectedJobId && selectedJobDetails && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-blue-700 font-medium">Selected Job:</span>
                <span className="ml-2 font-semibold">{selectedJobDetails.name}</span>
                <div className="text-sm text-gray-600 mt-1">
                  Client: {selectedJobDetails.client} • Budget: ${selectedJobDetails.budget ? parseFloat(selectedJobDetails.budget).toLocaleString() : '0.00'}
                </div>
                {costCenters.length === 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowCreateCostCenterModal(true)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Create Cost Center for this Job
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/jobs-management`)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View Job
                </button>
                <button
                  onClick={() => {
                    setSelectedJobId(null);
                    setSelectedJobDetails(null);
                    fetchCostCenters();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
              activeTab === 'overview' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
              activeTab === 'products' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Product Requests
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
              activeTab === 'tracking' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Request Tracking
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    "Name",
                    "Code", 
                    "Type",
                    "Status",
                    "Budget",
                    "Spent",
                    "Remaining",
                    "Usage",
                    "Products",
                    "Requests",
                    "Avg Cost",
                    "Actions"
                  ].map((head) => (
                    <th key={head} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCostCenters.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-8 text-center">
                      {selectedJobId ? (
                        <div className="space-y-4">
                          <div className="text-gray-500">No cost center found for this job</div>
                          {selectedJobDetails && (
                            <button
                              onClick={() => setShowCreateCostCenterModal(true)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Create Cost Center for {selectedJobDetails.name}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">No cost centers found</div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCostCenters.map((center, index) => {
                    const budget = center.budget || 0;
                    const spent = center.spentAmount || 0;
                    const remaining = Math.max(0, budget - spent);
                    const usagePercentage = budget > 0 ? (spent / budget) * 100 : 0;
                    const productCount = center.products?.length || 0;
                    const avgProductCost = productCount > 0 ? spent / productCount : 0;
                    
                    const budgetStatus = checkBudgetStatus(spent, budget);
                    const requestSummary = getRequestStatusSummary(center.id);
                    
                    const productCostFromTransactions = calculateProductCost(center);
                    
                    const actualProducts = center.products || [];
                    const actualProductCount = actualProducts.length;
                    const totalProductCost = actualProducts.reduce((sum, product) => 
                      sum + (product.totalCost || 0), 0
                    );

                    return (
                      <tr key={center.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            </svg>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{center.name}</div>
                              <div className="text-sm text-gray-500">{center.description}</div>
                              {center.job && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Job: {center.job.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {center.code}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {center.type?.toLowerCase() || 'project'}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={center.status} />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(budget)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Allocated
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${
                              spent > budget ? 'text-red-600' : 'text-purple-600'
                            }`}>
                              {formatCurrency(spent)}
                            </span>
                            {productCostFromTransactions > 0 && (
                              <span className="text-xs text-gray-500">
                                From transactions: {formatCurrency(productCostFromTransactions)}
                              </span>
                            )}
                            {totalProductCost > 0 && (
                              <span className="text-xs text-gray-500">
                                From products: {formatCurrency(totalProductCost)}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${
                              remaining < (budget * 0.1) ? 'text-red-600' : 
                              remaining < (budget * 0.25) ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(remaining)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {budget > 0 ? `${((remaining / budget) * 100).toFixed(1)}% of budget` : 'No budget'}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-32">
                            <ProgressBar 
                              percentage={budgetStatus.percentage_used}
                              isCritical={budgetStatus.is_critical}
                              isWarning={budgetStatus.is_warning}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {budgetStatus.percentage_used.toFixed(1)}% used
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatCurrency(spent)} of {formatCurrency(budget)}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {actualProductCount || productCount}
                            </span>
                            <span className="text-xs text-gray-500">
                              {center.transactions?.length || 0} transactions
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-600">
                              Total: <span className="font-semibold">{requestSummary.total}</span>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {requestSummary.pending > 0 && (
                                <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                  {requestSummary.pending}
                                </span>
                              )}
                              {requestSummary.approved > 0 && (
                                <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                  {requestSummary.approved}
                                </span>
                              )}
                              {requestSummary.issued > 0 && (
                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                  {requestSummary.issued}
                                </span>
                              )}
                              {requestSummary.completed > 0 && (
                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                  {requestSummary.completed}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-indigo-600">
                              {formatCurrency(avgProductCost)}
                            </span>
                            <span className="text-xs text-gray-500">
                              per product
                            </span>
                            {actualProductCount > 0 && totalProductCost > 0 && (
                              <span className="text-xs text-gray-500">
                                Actual avg: {formatCurrency(totalProductCost / actualProductCount)}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCostCenter(center)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleOpenProductModal(center, selectedJobId || center.job?.id)}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Manage Products"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('tracking');
                              }}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                              title="Track Requests"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCostCenter(center.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Requests for Selected Job</h2>
            
            {selectedJobId && selectedJobDetails ? (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-800">Job: {selectedJobDetails.name}</h3>
                    <p className="text-sm text-blue-600">Client: {selectedJobDetails.client}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (costCenters.length > 0) {
                          handleOpenProductModal(costCenters[0], selectedJobId);
                        } else {
                          toast.error('Please create a cost center first');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      + New Product Request
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-yellow-700">
                  <strong>Note:</strong> Please select a job to see product requests for that specific job.
                </p>
                <button
                  onClick={() => setShowJobSelector(true)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Select Job
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Request ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Product(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Estimated Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Request Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Product Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Requested By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productRequests.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center">
                        <div className="space-y-2">
                          <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-gray-500">No product requests found</p>
                          {selectedJobId && costCenters.length > 0 && (
                            <button
                              onClick={() => handleOpenProductModal(costCenters[0], selectedJobId)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                              Create First Product Request
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    productRequests
                      .filter(request => {
                        if (!selectedJobId) return true;
                        
                        return (
                          request.jobId === selectedJobId || 
                          request.trackingData?.jobId === selectedJobId ||
                          request.jobName === selectedJobDetails?.name
                        );
                      })
                      .map((request) => {
                        const totalQuantity = request.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
                        
                        const productStatuses = request.items?.map(item => item.status) || [];
                        
                        const getOverallProductStatus = () => {
                          if (!productStatuses.length) return request.status;
                          
                          const uniqueStatuses = [...new Set(productStatuses)];
                          if (uniqueStatuses.length === 1) return uniqueStatuses[0];
                          
                          if (productStatuses.includes('REJECTED')) return 'PARTIALLY_REJECTED';
                          
                          if (productStatuses.includes('PENDING') || productStatuses.includes('PROCUREMENT_PENDING')) {
                            return 'PARTIALLY_PENDING';
                          }
                          
                          return request.status;
                        };

                        return (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-200">
                              <div className="font-mono text-xs">{request.id}</div>
                              {request.costCenterCode && (
                                <div className="text-xs text-gray-500">CC: {request.costCenterCode}</div>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 text-sm text-gray-500 border border-gray-200">
                              <div className="flex flex-col">
                                <span>{new Date(request.createdDate || request.requestDate).toLocaleDateString()}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(request.createdDate || request.requestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3 text-sm border border-gray-200">
                              <div className="max-w-xs">
                                {request.items?.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="mb-1 flex items-center gap-2">
                                    <span className="font-medium truncate">{item.productName}</span>
                                    <span className="text-gray-500 text-xs">({item.quantity || 0})</span>
                                    {item.status && item.status !== request.status && (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {request.items?.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{request.items.length - 3} more items
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            <td className="px-4 py-3 text-sm border border-gray-200">
                              <div className="font-medium">{totalQuantity} units</div>
                              <div className="text-xs text-gray-500">{request.items?.length || 0} items</div>
                            </td>
                            
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-200">
                              <div>{formatCurrency(request.estimatedCost || 0)}</div>
                              {request.actualCost && request.actualCost !== request.estimatedCost && (
                                <div className="text-xs text-gray-500">
                                  Actual: {formatCurrency(request.actualCost)}
                                </div>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 border border-gray-200">
                              <RequestStatusBadge status={request.status} />
                            </td>
                            
                            <td className="px-4 py-3 border border-gray-200">
                              <ProductStatusDisplay request={request} />
                            </td>
                            
                            <td className="px-4 py-3 text-sm text-gray-500 border border-gray-200">
                              <div>{request.requestedBy || 'System'}</div>
                              {request.department && (
                                <div className="text-xs text-gray-400">{request.department}</div>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 border border-gray-200">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => viewRequestDetails(request.id)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                >
                                  View Details
                                </button>
                                {request.status === 'PENDING' || request.status === 'PROCUREMENT_PENDING' ? (
                                  <button
                                    onClick={() => {
                                      if (confirm('Are you sure you want to cancel this request?')) {
                                        updateRequestStatus(request.id, 'CANCELLED', 'Cancelled by user');
                                      }
                                    }}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 text-xs"
                                  >
                                    Cancel Request
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {selectedJobId && productRequests.filter(r => 
              r.jobId === selectedJobId || 
              r.trackingData?.jobId === selectedJobId ||
              r.jobName === selectedJobDetails?.name
            ).length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Summary for {selectedJobDetails?.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Total Requests</div>
                    <div className="text-xl font-semibold">
                      {productRequests.filter(r => 
                        r.jobId === selectedJobId || 
                        r.trackingData?.jobId === selectedJobId ||
                        r.jobName === selectedJobDetails?.name
                      ).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Total Cost</div>
                    <div className="text-xl font-semibold text-green-600">
                      {formatCurrency(
                        productRequests
                          .filter(r => r.jobId === selectedJobId || r.trackingData?.jobId === selectedJobId || r.jobName === selectedJobDetails?.name)
                          .reduce((total, r) => total + (r.estimatedCost || 0), 0)
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Pending</div>
                    <div className="text-xl font-semibold text-yellow-600">
                      {productRequests.filter(r => 
                        (r.jobId === selectedJobId || r.trackingData?.jobId === selectedJobId || r.jobName === selectedJobDetails?.name) &&
                        (r.status === 'PENDING' || r.status === 'PROCUREMENT_PENDING')
                      ).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Approved</div>
                    <div className="text-xl font-semibold text-green-600">
                      {productRequests.filter(r => 
                        (r.jobId === selectedJobId || r.trackingData?.jobId === selectedJobId || r.jobName === selectedJobDetails?.name) &&
                        r.status === 'APPROVED'
                      ).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Issued</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {productRequests.filter(r => 
                        (r.jobId === selectedJobId || r.trackingData?.jobId === selectedJobId || r.jobName === selectedJobDetails?.name) &&
                        r.status === 'ISSUED'
                      ).length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Request Tracking</h2>
            <p className="text-gray-600 mb-6">Track the progress of all product requests across cost centers and jobs</p>
            
            {selectedJobId && selectedJobDetails ? (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-800">Filtered by Job: {selectedJobDetails.name}</h3>
                    <p className="text-sm text-blue-600">Showing requests for this job only</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJobId(null);
                      setSelectedJobDetails(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Filter
                  </button>
                </div>
              </div>
            ) : null}

            {productRequests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Product Requests Found</h3>
                <p className="text-gray-500 mb-4">When you submit product requests, they will appear here for tracking.</p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go to Products
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Total Requests</div>
                    <div className="text-2xl font-semibold">{productRequests.length}</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Pending</div>
                    <div className="text-2xl font-semibold text-yellow-600">
                      {productRequests.filter(r => r.status === 'PENDING' || r.status === 'PROCUREMENT_PENDING').length}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Approved</div>
                    <div className="text-2xl font-semibold text-green-600">
                      {productRequests.filter(r => r.status === 'APPROVED').length}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Issued</div>
                    <div className="text-2xl font-semibold text-blue-600">
                      {productRequests.filter(r => r.status === 'ISSUED').length}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Center</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estimated Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productRequests
                        .filter(request => 
                          !selectedJobId || 
                          request.jobId === selectedJobId || 
                          request.trackingData?.jobId === selectedJobId
                        )
                        .map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {request.id}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium">{request.costCenterName}</div>
                              <div className="text-xs text-gray-500">{request.costCenterCode}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {request.jobName || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {request.items?.length || 0} items
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {formatCurrency(request.estimatedCost || 0)}
                            </td>
                            <td className="px-4 py-3">
                              <ProductStatusDisplay request={request} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(request.createdDate || request.requestDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => viewRequestDetails(request.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Edit Cost Center' : 'Create New Cost Center'}
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Project A"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., PROJ-A"
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleSelectChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="PROJECT">Project</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="LOCATION">Location</option>
                    <option value="TEAM">Team</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleSelectChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.budget ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any additional details..."
                />
              </div>
            </div>

            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditMode ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[80vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900">
                  Manage Products - {selectedCostCenterForProducts?.name}
                </h2>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="mb-6">
                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {selectedProducts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Selected Products ({selectedProducts.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedProducts.map((product) => (
                        <div key={product.id} className="border border-gray-200 rounded-lg p-4 border-l-4 border-l-green-500 bg-green-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-2">{product.name}</h4>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-500">Code</div>
                                  <div className="font-semibold">{product.code}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Unit Cost</div>
                                  <div className="font-semibold">{formatCurrency(product.unitCost || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Stock</div>
                                  <div className="font-semibold">{product.stock || 0} units</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Total Cost</div>
                                  <div className="font-semibold text-green-600">
                                    {formatCurrency((product.unitCost || 0) * (product.quantity || 0))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleProductSelection(product)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">Quantity Requested</label>
                              <input
                                type="number"
                                min="1"
                                max={product.stock || 0}
                                value={product.quantity || 1}
                                onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value))}
                                className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">Estimated Usage</label>
                              <input
                                type="text"
                                value={product.estimatedUsage || ''}
                                onChange={(e) => updateProductUsage(product.id, e.target.value)}
                                placeholder="How will this be used?"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Available Products ({filteredProducts.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredProducts.map((product) => (
                      <div 
                        key={product.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedProducts.find(p => p.id === product.id) 
                            ? 'border-2 border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-blue-500 hover:shadow-md bg-white'
                        }`}
                        onClick={() => handleProductSelection(product)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {product.name}
                              {selectedProducts.find(p => p.id === product.id) && (
                                <svg className="w-4 h-4 text-green-500 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </h4>
                            <p className="text-gray-600 text-sm mb-2">
                              {product.code} • {product.productType}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-gray-500">Cost</div>
                                <div className="font-semibold">{formatCurrency(product.unitCost || 0)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Stock</div>
                                <div className={`font-semibold ${
                                  (product.stock || 0) > 10 ? 'text-green-600' : 
                                  (product.stock || 0) > 0 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {product.stock || 0} units
                                </div>
                              </div>
                            </div>
                            {product.description && (
                              <p className="text-gray-500 text-sm mt-2">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={handleCloseProductModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveProductsToCostCenter}
                disabled={selectedProducts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Submit Product Request ({selectedProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestDetailsModal && <RequestDetailsModal />}

      {showJobSelector && <JobSelector />}
      {showCreateCostCenterModal && <CreateCostCenterForJobModal />}
    </div>
  );
};

export default CostCenterManagement;