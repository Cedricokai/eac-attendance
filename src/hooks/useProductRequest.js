import { useState, useEffect } from 'react';

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
  },
  {
    id: 5,
    name: 'Desk Lamp LED',
    category: 'FURNITURE',
    unitCost: 45.50,
    description: 'LED desk lamp with adjustable brightness',
    status: 'ACTIVE',
    stock: 30
  }
];

// Mock data for cost centers
const MOCK_COST_CENTERS = [
  {
    id: 1,
    name: 'Marketing Campaign Q4',
    code: 'MKT-Q4-2024',
    type: 'PROJECT',
    status: 'ACTIVE',
    budget: 50000,
    spent_amount: 32500
  },
  {
    id: 2,
    name: 'IT Infrastructure',
    code: 'IT-INFRA-2024',
    type: 'DEPARTMENT',
    status: 'ACTIVE',
    budget: 150000,
    spent_amount: 142000
  },
  {
    id: 3,
    name: 'New York Office',
    code: 'NY-OFFICE',
    type: 'LOCATION',
    status: 'ACTIVE',
    budget: 75000,
    spent_amount: 45000
  },
  {
    id: 4,
    name: 'Product Research',
    code: 'RND-2024',
    type: 'PROJECT',
    status: 'ACTIVE',
    budget: 100000,
    spent_amount: 25000
  }
];

// Mock data for product requests
const MOCK_PRODUCT_REQUESTS = [];

// Simulate API delay
const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
const mockProductRequestAPI = {
  createProductRequest: async (requestData) => {
    await simulateDelay(1000);
    
    const newRequest = {
      id: Date.now(),
      request_number: `REQ-${String(Date.now()).slice(-6)}`,
      ...requestData,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      employee_id: 'EMP-1001', // Mock employee ID
      employee_name: 'John Doe' // Mock employee name
    };
    
    MOCK_PRODUCT_REQUESTS.push(newRequest);
    console.log('Created product request:', newRequest);
    return newRequest;
  },

  getMyRequests: async () => {
    await simulateDelay();
    return MOCK_PRODUCT_REQUESTS;
  },

  updateProductRequest: async (id, data) => {
    await simulateDelay();
    const index = MOCK_PRODUCT_REQUESTS.findIndex(req => req.id === parseInt(id));
    if (index === -1) throw new Error('Product request not found');
    
    MOCK_PRODUCT_REQUESTS[index] = { ...MOCK_PRODUCT_REQUESTS[index], ...data };
    return MOCK_PRODUCT_REQUESTS[index];
  },

  deleteProductRequest: async (id) => {
    await simulateDelay();
    const index = MOCK_PRODUCT_REQUESTS.findIndex(req => req.id === parseInt(id));
    if (index === -1) throw new Error('Product request not found');
    
    MOCK_PRODUCT_REQUESTS.splice(index, 1);
    return { message: 'Product request deleted successfully' };
  }
};

const mockProductsAPI = {
  getAllProducts: async () => {
    await simulateDelay();
    return MOCK_PRODUCTS;
  },

  getProduct: async (id) => {
    await simulateDelay();
    const product = MOCK_PRODUCTS.find(p => p.id === parseInt(id));
    if (!product) throw new Error('Product not found');
    return product;
  }
};

const mockCostCenterAPI = {
  getActiveCostCenters: async () => {
    await simulateDelay();
    return MOCK_COST_CENTERS.filter(cc => cc.status === 'ACTIVE');
  },

  getCostCenter: async (id) => {
    await simulateDelay();
    const center = MOCK_COST_CENTERS.find(cc => cc.id === parseInt(id));
    if (!center) throw new Error('Cost center not found');
    return center;
  }
};

/**
 * Custom hook for managing product requests
 * Handles form state, validation, and mock data interactions
 */
export default function useProductRequest() {
  const [request, setRequest] = useState({
    product_id: '',
    cost_center_id: '',
    quantity_requested: '',
    purpose: '',
    comments: ''
  });

  const [products, setProducts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch products and cost centers on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsData, costCentersData] = await Promise.all([
          mockProductsAPI.getAllProducts(),
          mockCostCenterAPI.getActiveCostCenters()
        ]);
        setProducts(productsData);
        setCostCenters(costCentersData);
        setError(null);
      } catch (err) {
        setError('Failed to load data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!request.product_id) {
      newErrors.product_id = 'Please select a product';
    }
    if (!request.cost_center_id) {
      newErrors.cost_center_id = 'Please select a cost center';
    }
    if (!request.quantity_requested || request.quantity_requested <= 0) {
      newErrors.quantity_requested = 'Please enter a valid quantity';
    }
    if (!request.purpose || request.purpose.trim() === '') {
      newErrors.purpose = 'Purpose is required';
    }

    // Check if product has available stock
    const product = products.find(p => p.id === parseInt(request.product_id));
    if (product && product.stock < parseInt(request.quantity_requested)) {
      newErrors.quantity_requested = `Only ${product.stock} units available`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setRequest(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle product selection change
  const handleProductChange = (productId) => {
    setRequest(prev => ({
      ...prev,
      product_id: productId
    }));
    const product = products.find(p => p.id === parseInt(productId));
    setSelectedProduct(product);
    if (errors.product_id) {
      setErrors(prev => ({
        ...prev,
        product_id: ''
      }));
    }
  };

  // Handle cost center change
  const handleCostCenterChange = (costCenterId) => {
    setRequest(prev => ({
      ...prev,
      cost_center_id: costCenterId
    }));
    if (errors.cost_center_id) {
      setErrors(prev => ({
        ...prev,
        cost_center_id: ''
      }));
    }
  };

  // Submit product request
  const submitRequest = async () => {
    if (!validate()) {
      throw new Error('Please fix the validation errors');
    }

    setLoading(true);
    try {
      // Get unit cost from selected product
      const product = products.find(p => p.id === parseInt(request.product_id));
      
      const requestData = {
        product_id: parseInt(request.product_id),
        cost_center_id: parseInt(request.cost_center_id),
        quantity_requested: parseInt(request.quantity_requested),
        unit_cost: product.unitCost,
        purpose: request.purpose,
        comments: request.comments,
        product_name: product.name
      };

      const response = await mockProductRequestAPI.createProductRequest(requestData);
      setError(null);
      return response;
    } catch (err) {
      const errorMsg = err.message || 'Failed to create request';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setRequest({
      product_id: '',
      cost_center_id: '',
      quantity_requested: '',
      purpose: '',
      comments: ''
    });
    setSelectedProduct(null);
    setErrors({});
  };

  // Get product details by ID
  const getProductDetails = (productId) => {
    return products.find(p => p.id === productId);
  };

  // Get cost center details by ID
  const getCostCenterDetails = (costCenterId) => {
    return costCenters.find(cc => cc.id === costCenterId);
  };

  // Calculate total cost
  const getTotalCost = () => {
    if (selectedProduct && request.quantity_requested) {
      return parseFloat(
        (selectedProduct.unitCost * request.quantity_requested).toFixed(2)
      );
    }
    return 0;
  };

  // Get available stock for selected product
  const getAvailableStock = () => {
    if (selectedProduct) {
      return selectedProduct.stock;
    }
    return 0;
  };

  return {
    request,
    products,
    costCenters,
    selectedProduct,
    loading,
    error,
    errors,
    handleChange,
    handleProductChange,
    handleCostCenterChange,
    validate,
    submitRequest,
    resetForm,
    getProductDetails,
    getCostCenterDetails,
    getTotalCost,
    getAvailableStock
  };
}