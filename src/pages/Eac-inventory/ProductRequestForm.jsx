import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  DocumentCheckIcon,
  BriefcaseIcon,
  BuildingOfficeIcon
} from "@heroicons/react/24/outline";

const ProductRequestForm = () => {
  const navigate = useNavigate();
  const {
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
    getCostCenterDetails,
    getTotalCost
  } = useProductRequest();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Mock departments and projects to match Received component structure
  const departments = ['Marketing', 'IT', 'Facilities', 'Operations', 'HR', 'Finance'];
  const jobProjects = [
    'Marketing Campaign 2024',
    'Office Renovation Q1', 
    'Software Development Platform',
    'IT Infrastructure Upgrade',
    'Field Operations Q1',
    'HR System Implementation'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await submitRequest();
      setSuccessMessage('Product request submitted successfully!');
      toast.success('Request submitted! Request number: ' + response.request_number);
      
      setTimeout(() => {
        navigate('/product-requests-history');
      }, 2000);
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalCost = getTotalCost();
  const selectedCostCenter = getCostCenterDetails(parseInt(request.cost_center_id));

  // Chip component to match Received component
  const Chip = ({ value, color = 'gray', variant = 'filled', size = 'md', className = '' }) => {
    const colorClasses = {
      blue: variant === 'filled' ? 'bg-blue-500 text-white' : 'border border-blue-500 text-blue-500',
      green: variant === 'filled' ? 'bg-green-500 text-white' : 'border border-green-500 text-green-500',
      red: variant === 'filled' ? 'bg-red-500 text-white' : 'border border-red-500 text-red-500',
      yellow: variant === 'filled' ? 'bg-yellow-500 text-white' : 'border border-yellow-500 text-yellow-500',
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header - Matching Received component style */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Request Products from Store
            </h1>
            <p className="text-sm text-gray-600">
              Submit a product request that will go through approval workflow
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Error Alert - Matching Received component style */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
            <div className="text-red-600 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success Alert - Matching Received component style */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <div className="text-green-600 flex items-center gap-2">
              <CheckIcon className="h-5 w-5" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Form Card - Matching Received component style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Section 1: Product Selection */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingCartIcon className="h-5 w-5 text-blue-500" />
                  Select Product
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <select
                      value={request.product_id}
                      onChange={handleProductChange}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white ${
                        errors.product_id ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id.toString()}>
                          {product.name} (Stock: {product.stock} units)
                        </option>
                      ))}
                    </select>
                    {errors.product_id && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.product_id}
                      </p>
                    )}
                  </div>

                  {/* Product Details - Matching Received component style */}
                  {selectedProduct && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Product Type</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedProduct.productType}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Brand</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedProduct.userName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Unit Cost</p>
                          <p className="text-sm font-semibold text-green-600">
                            ${parseFloat(selectedProduct.unitCost || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Available</p>
                          <Chip
                            value={`${selectedProduct.stock} units`}
                            color={selectedProduct.stock > 10 ? 'green' : selectedProduct.stock > 0 ? 'orange' : 'red'}
                            variant="outlined"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        Description: {selectedProduct.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Quantity and Project Details */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DocumentCheckIcon className="h-5 w-5 text-blue-500" />
                  Request Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quantity Requested */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quantity Requested *
                    </label>
                    <input
                      type="number"
                      name="quantity_requested"
                      value={request.quantity_requested}
                      onChange={handleChange}
                      min="1"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white ${
                        errors.quantity_requested ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter quantity"
                    />
                    {errors.quantity_requested && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.quantity_requested}
                      </p>
                    )}
                  </div>

                  {/* Cost Center */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cost Center / Project *
                    </label>
                    <select
                      value={request.cost_center_id}
                      onChange={handleCostCenterChange}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white ${
                        errors.cost_center_id ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a cost center</option>
                      {costCenters.map(cc => (
                        <option key={cc.id} value={cc.id.toString()}>
                          {cc.name} ({cc.code})
                        </option>
                      ))}
                    </select>
                    {errors.cost_center_id && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.cost_center_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* NEW: Job/Project and Department Fields - Matching Received component */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Job/Project */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job/Project *
                    </label>
                    <select
                      name="job_project"
                      value={request.job_project || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                    >
                      <option value="">Select a project</option>
                      {jobProjects.map(project => (
                        <option key={project} value={project}>
                          {project}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={request.department || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                    >
                      <option value="">Select a department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cost Center Details - Enhanced to match Received */}
                {selectedCostCenter && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Type</p>
                        <p className="text-sm font-semibold text-gray-900 capitalize">
                          {selectedCostCenter.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Status</p>
                        <Chip
                          value={selectedCostCenter.status}
                          color={selectedCostCenter.status === 'ACTIVE' ? 'green' : 'orange'}
                          variant="outlined"
                          size="sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Budget</p>
                        <p className="text-sm font-semibold text-gray-900">
                          ${parseFloat(selectedCostCenter.budget).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Spent</p>
                        <p className="text-sm font-semibold text-orange-600">
                          ${parseFloat(selectedCostCenter.spent_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Purpose and Comments */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Additional Information
                </h2>

                <div className="space-y-4">
                  {/* Purpose */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Purpose / Reason *
                    </label>
                    <input
                      name="purpose"
                      value={request.purpose}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white ${
                        errors.purpose ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="What is this product needed for?"
                    />
                    {errors.purpose && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.purpose}
                      </p>
                    )}
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Additional Comments (Optional)
                    </label>
                    <textarea
                      name="comments"
                      value={request.comments}
                      onChange={handleChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white resize-vertical"
                      placeholder="Add any additional notes"
                    />
                  </div>
                </div>
              </div>

              {/* Cost Summary - Matching Received component style */}
              {selectedProduct && request.quantity_requested && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Cost
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          ${totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">
                        {request.quantity_requested} units × ${parseFloat(selectedProduct.unitCost).toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600 font-semibold">
                        Pending Approval
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer - Matching Received component style */}
          <div className="flex justify-between p-6 bg-gray-50 border-t border-gray-200">
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Form
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedProduct}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <DocumentCheckIcon className="h-5 w-5" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Box - Matching Received component style */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Request Workflow
          </p>
          <div className="text-sm text-gray-600 space-y-1">
            <div>1. <strong>You submit</strong> a product request → Status: <Chip value="Pending" size="sm" className="inline-block ml-2" /></div>
            <div>2. <strong>Procurement Manager</strong> reviews and approves/rejects</div>
            <div>3. <strong>Store Officer</strong> verifies stock and issues the product</div>
            <div>4. <strong>You receive</strong> the product → Status: <Chip value="Issued" color="green" size="sm" className="inline-block ml-2" /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductRequestForm;