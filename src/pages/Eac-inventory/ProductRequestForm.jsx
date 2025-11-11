import React, { useState } from 'react';
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
  Select,
  Option,
  Spinner,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from "@material-tailwind/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  DocumentCheckIcon
} from "@heroicons/react/24/outline";
import useProductRequest from '../../hooks/useProductRequest';

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
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  const totalCost = getTotalCost();
  const selectedCostCenter = getCostCenterDetails(parseInt(request.cost_center_id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
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
              Request Products from Store
            </Typography>
            <Typography variant="small" color="gray">
              Submit a product request that will go through approval workflow
            </Typography>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Error Alert */}
        {error && (
          <Alert color="red" className="mb-6 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <Typography>{error}</Typography>
          </Alert>
        )}

        {/* Success Alert */}
        {successMessage && (
          <Alert color="green" className="mb-6 flex items-center gap-3">
            <CheckIcon className="h-5 w-5" />
            <Typography>{successMessage}</Typography>
          </Alert>
        )}

        {/* Form Card */}
        <Card className="mb-6 shadow-lg">
          <CardBody className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Section 1: Product Selection */}
              <div className="border-b pb-6">
                <Typography variant="h5" color="blue-gray" className="mb-4 flex items-center gap-2">
                  <ShoppingCartIcon className="h-5 w-5 text-blue-500" />
                  Select Product
                </Typography>
                
                <div className="space-y-4">
                  <div>
                    <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                      Product Name *
                    </Typography>
                    <Select
                      value={request.product_id}
                      onChange={handleProductChange}
                      label="Choose a product"
                      error={!!errors.product_id}
                    >
                      <Option value="">Select a product</Option>
                      {products.map(product => (
                        <Option key={product.id} value={product.id.toString()}>
                          {product.name} (Stock: {product.stock} units)
                        </Option>
                      ))}
                    </Select>
                    {errors.product_id && (
                      <Typography variant="small" color="red" className="mt-1">
                        {errors.product_id}
                      </Typography>
                    )}
                  </div>

                  {/* Product Details */}
                  {selectedProduct && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Typography variant="small" color="gray">Product Type</Typography>
                          <Typography variant="small" className="font-semibold">
                            {selectedProduct.productType}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" color="gray">Brand</Typography>
                          <Typography variant="small" className="font-semibold">
                            {selectedProduct.userName}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" color="gray">Unit Cost</Typography>
                          <Typography variant="small" className="font-semibold text-green-600">
                            ${parseFloat(selectedProduct.unitCost || 0).toFixed(2)}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" color="gray">Available</Typography>
                          <Chip
                            value={`${selectedProduct.stock} units`}
                            color={selectedProduct.stock > 10 ? 'green' : selectedProduct.stock > 0 ? 'amber' : 'red'}
                            variant="outlined"
                          />
                        </div>
                      </div>
                      <Typography variant="small" color="gray" className="mt-3">
                        Description: {selectedProduct.description}
                      </Typography>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Quantity and Cost Center */}
              <div className="border-b pb-6">
                <Typography variant="h5" color="blue-gray" className="mb-4 flex items-center gap-2">
                  <DocumentCheckIcon className="h-5 w-5 text-blue-500" />
                  Request Details
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quantity Requested */}
                  <div>
                    <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                      Quantity Requested *
                    </Typography>
                    <Input
                      type="number"
                      name="quantity_requested"
                      value={request.quantity_requested}
                      onChange={handleChange}
                      label="Enter quantity"
                      min="1"
                      error={!!errors.quantity_requested}
                      className="bg-white"
                    />
                    {errors.quantity_requested && (
                      <Typography variant="small" color="red" className="mt-1">
                        {errors.quantity_requested}
                      </Typography>
                    )}
                  </div>

                  {/* Cost Center */}
                  <div>
                    <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                      Cost Center / Project *
                    </Typography>
                    <Select
                      value={request.cost_center_id}
                      onChange={handleCostCenterChange}
                      label="Select cost center"
                      error={!!errors.cost_center_id}
                    >
                      <Option value="">Select a cost center</Option>
                      {costCenters.map(cc => (
                        <Option key={cc.id} value={cc.id.toString()}>
                          {cc.name} ({cc.code})
                        </Option>
                      ))}
                    </Select>
                    {errors.cost_center_id && (
                      <Typography variant="small" color="red" className="mt-1">
                        {errors.cost_center_id}
                      </Typography>
                    )}
                  </div>
                </div>

                {/* Cost Center Details */}
                {selectedCostCenter && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Typography variant="small" color="gray">Type</Typography>
                        <Typography variant="small" className="font-semibold capitalize">
                          {selectedCostCenter.type}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant="small" color="gray">Status</Typography>
                        <Chip
                          value={selectedCostCenter.status}
                          color={selectedCostCenter.status === 'ACTIVE' ? 'green' : 'orange'}
                          variant="outlined"
                          size="sm"
                        />
                      </div>
                      <div>
                        <Typography variant="small" color="gray">Budget</Typography>
                        <Typography variant="small" className="font-semibold">
                          ${parseFloat(selectedCostCenter.budget).toFixed(2)}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant="small" color="gray">Spent</Typography>
                        <Typography variant="small" className="font-semibold text-orange-600">
                          ${parseFloat(selectedCostCenter.spent_amount).toFixed(2)}
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Purpose and Comments */}
              <div className="border-b pb-6">
                <Typography variant="h5" color="blue-gray" className="mb-4">
                  Additional Information
                </Typography>

                <div className="space-y-4">
                  {/* Purpose */}
                  <div>
                    <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                      Purpose / Reason *
                    </Typography>
                    <Input
                      name="purpose"
                      value={request.purpose}
                      onChange={handleChange}
                      label="What is this product needed for?"
                      error={!!errors.purpose}
                      className="bg-white"
                    />
                    {errors.purpose && (
                      <Typography variant="small" color="red" className="mt-1">
                        {errors.purpose}
                      </Typography>
                    )}
                  </div>

                  {/* Comments */}
                  <div>
                    <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                      Additional Comments (Optional)
                    </Typography>
                    <Textarea
                      name="comments"
                      value={request.comments}
                      onChange={handleChange}
                      label="Add any additional notes"
                      rows={3}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cost Summary */}
              {selectedProduct && request.quantity_requested && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                      <div>
                        <Typography variant="small" color="gray">
                          Total Cost
                        </Typography>
                        <Typography variant="h4" color="green">
                          ${totalCost.toFixed(2)}
                        </Typography>
                      </div>
                    </div>
                    <div className="text-right">
                      <Typography variant="small" color="gray" className="mb-1">
                        {request.quantity_requested} units × ${parseFloat(selectedProduct.unitCost).toFixed(2)}
                      </Typography>
                      <Typography variant="small" className="text-green-600 font-semibold">
                        Pending Approval
                      </Typography>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardBody>

          {/* Footer */}
          <CardFooter className="flex justify-between p-6 bg-gray-50 border-t">
            <Button
              variant="outlined"
              color="gray"
              onClick={resetForm}
              className="flex items-center gap-2"
            >
              Reset Form
            </Button>
            <div className="flex gap-4">
              <Button
                variant="text"
                color="gray"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                color="green"
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedProduct}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <DocumentCheckIcon className="h-5 w-5" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Info Box */}
        <Card className="bg-blue-50 border border-blue-200">
          <CardBody className="p-4">
            <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
              Request Workflow
            </Typography>
            <Typography variant="small" color="gray" className="space-y-1">
              <div>1. <strong>You submit</strong> a product request → Status: <Chip value="Pending" size="sm" className="inline-block ml-2" /></div>
              <div>2. <strong>Procurement Manager</strong> reviews and approves/rejects</div>
              <div>3. <strong>Store Officer</strong> verifies stock and issues the product</div>
              <div>4. <strong>You receive</strong> the product → Status: <Chip value="Issued" color="green" size="sm" className="inline-block ml-2" /></div>
            </Typography>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default ProductRequestForm;
