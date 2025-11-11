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
  Select,
  Option,
  Progress,
  Badge
} from "@material-tailwind/react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  FolderIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";
import { costCenterAPI } from '../../services/api';
import { checkBudgetStatus, formatCurrency } from '../../utils/costCalculations';

const CostCenterManagement = () => {
  const navigate = useNavigate();

  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCostCenter, setCurrentCostCenter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
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

  // Fetch cost centers
  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    setLoading(true);
    try {
      const response = await costCenterAPI.getAllCostCenters();
      setCostCenters(response || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load cost centers');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Validate form
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

  // Handle input change
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

  // Open modal for create
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

  // Open modal for edit
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

  // Close modal
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

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        budget: parseFloat(formData.budget)
      };

      if (isEditMode && currentCostCenter) {
        await costCenterAPI.updateCostCenter(currentCostCenter.id, submitData);
        toast.success('Cost center updated successfully!');
      } else {
        await costCenterAPI.createCostCenter(submitData);
        toast.success('Cost center created successfully!');
      }

      fetchCostCenters();
      handleCloseModal();
    } catch (err) {
      toast.error(err.message || 'Failed to save cost center');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete cost center
  const handleDeleteCostCenter = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cost center?')) return;

    try {
      await costCenterAPI.deleteCostCenter(id);
      toast.success('Cost center deleted successfully!');
      fetchCostCenters();
    } catch (err) {
      toast.error(err.message || 'Failed to delete cost center');
    }
  };

  // Filter cost centers
  const filteredCostCenters = costCenters.filter(cc =>
    cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cc.code.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <IconButton
              variant="text"
              color="blue"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </IconButton>
            <div>
              <Typography variant="h3" color="blue-gray">
                Cost Center Management
              </Typography>
              <Typography variant="small" color="gray">
                Create and manage projects, departments, and cost centers
              </Typography>
            </div>
          </div>
          <Button
            variant="gradient"
            className="flex items-center gap-2"
            onClick={handleOpenModal}
          >
            <PlusIcon className="h-5 w-5" />
            New Cost Center
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert color="red" className="mb-6 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <Typography>{error}</Typography>
        </Alert>
      )}

      {/* Search */}
      <Card className="mb-6 p-4">
        <Input
          placeholder="Search by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<MagnifyingGlassIcon className="h-5 w-5" />}
        />
      </Card>

      {/* Cost Centers Table */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-100">
                  {[
                    "Name",
                    "Code",
                    "Type",
                    "Status",
                    "Budget",
                    "Spent",
                    "Remaining",
                    "Usage",
                    "Manager",
                    "Actions"
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
                {filteredCostCenters.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-4 text-center">
                      <Typography variant="small" color="gray">
                        No cost centers found
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  filteredCostCenters.map((center, index) => {
                    const budgetStatus = checkBudgetStatus(center.spent_amount, center.budget);

                    return (
                      <tr
                        key={center.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="p-4 border-b border-blue-gray-50">
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-5 w-5 text-blue-500" />
                            <Typography variant="small" className="font-semibold">
                              {center.name}
                            </Typography>
                          </div>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Chip value={center.code} color="blue" variant="outlined" />
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" className="capitalize">
                            {center.type}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Chip
                            value={center.status}
                            color={center.status === 'ACTIVE' ? 'green' : 'orange'}
                            variant="outlined"
                            size="sm"
                          />
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" className="font-semibold">
                            {formatCurrency(center.budget)}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" className="font-semibold text-orange-600">
                            {formatCurrency(center.spent_amount)}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" className="font-semibold text-blue-600">
                            {formatCurrency(budgetStatus.remaining)}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <div className="w-full">
                            <Progress
                              value={budgetStatus.percentage_used}
                              color={
                                budgetStatus.is_critical
                                  ? 'red'
                                  : budgetStatus.is_warning
                                  ? 'amber'
                                  : 'green'
                              }
                            />
                            <Typography variant="small" color="gray" className="mt-1">
                              {budgetStatus.percentage_used}%
                            </Typography>
                          </div>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <Typography variant="small" color="gray">
                            {center.manager_id ? `ID: ${center.manager_id}` : 'Unassigned'}
                          </Typography>
                        </td>
                        <td className="p-4 border-b border-blue-gray-50">
                          <div className="flex gap-2">
                            <Tooltip content="Edit">
                              <IconButton
                                variant="text"
                                color="blue"
                                onClick={() => handleEditCostCenter(center)}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip content="Delete">
                              <IconButton
                                variant="text"
                                color="red"
                                onClick={() => handleDeleteCostCenter(center.id)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} handler={handleCloseModal} size="lg">
        <DialogHeader className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <FolderIcon className="h-6 w-6 text-blue-500" />
            <Typography variant="h5" color="blue-gray">
              {isEditMode ? 'Edit Cost Center' : 'Create New Cost Center'}
            </Typography>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Name *
              </Typography>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                label="e.g., Project A"
                error={!!errors.name}
                className="bg-white"
              />
              {errors.name && (
                <Typography variant="small" color="red" className="mt-1">
                  {errors.name}
                </Typography>
              )}
            </div>

            {/* Code */}
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Code *
              </Typography>
              <Input
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                label="e.g., PROJ-A"
                error={!!errors.code}
                className="bg-white"
              />
              {errors.code && (
                <Typography variant="small" color="red" className="mt-1">
                  {errors.code}
                </Typography>
              )}
            </div>

            {/* Type */}
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Type *
              </Typography>
              <Select
                name="type"
                value={formData.type}
                onChange={(value) => handleInputChange({ target: { name: 'type', value } })}
              >
                <Option value="PROJECT">Project</Option>
                <Option value="DEPARTMENT">Department</Option>
                <Option value="LOCATION">Location</Option>
              </Select>
              {errors.type && (
                <Typography variant="small" color="red" className="mt-1">
                  {errors.type}
                </Typography>
              )}
            </div>

            {/* Status */}
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Status
              </Typography>
              <Select
                name="status"
                value={formData.status}
                onChange={(value) => handleInputChange({ target: { name: 'status', value } })}
              >
                <Option value="ACTIVE">Active</Option>
                <Option value="INACTIVE">Inactive</Option>
                <Option value="ON_HOLD">On Hold</Option>
              </Select>
            </div>

            {/* Budget */}
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Budget ($) *
              </Typography>
              <Input
                type="number"
                step="0.01"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                label="0.00"
                error={!!errors.budget}
                className="bg-white"
              />
              {errors.budget && (
                <Typography variant="small" color="red" className="mt-1">
                  {errors.budget}
                </Typography>
              )}
            </div>

            {/* Start Date */}
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                Start Date
              </Typography>
              <Input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="bg-white"
              />
            </div>

            {/* End Date */}
            <div>
              <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
                End Date
              </Typography>
              <Input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Typography variant="small" color="blue-gray" className="font-semibold mb-2">
              Description
            </Typography>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              label="Add any additional details..."
              rows={3}
              className="bg-white"
            />
          </div>
        </DialogBody>

        <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
          <Button
            variant="outlined"
            color="gray"
            onClick={handleCloseModal}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5" />
                {isEditMode ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default CostCenterManagement;
