import { useState, useEffect } from 'react';
import { productRequestAPI, productsAPI, costCenterAPI } from '../services/api';

/**
 * Custom hook for managing product requests
 * Handles form state, validation, and API interactions
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
          productsAPI.getAllProducts(),
          costCenterAPI.getActiveCostCenters()
        ]);
        setProducts(productsData);
        setCostCenters(costCentersData);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load data');
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
    if (product && product.stock < request.quantity_requested) {
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
      throw new Error('Validation failed');
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
        comments: request.comments
      };

      const response = await productRequestAPI.createProductRequest(requestData);
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
    getTotalCost
  };
}
