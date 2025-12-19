import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Building, Calendar, DollarSign, FileText, Users, Upload, X, Clock, Crown, Package, User, Search, Filter, DollarSign as DollarIcon } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function JobsManagement() {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [jobForm, setJobForm] = useState({
    name: '',
    description: '',
    client: '',
    startDate: '',
    endDate: '',
    billingCycle: 'MONTHLY',
    budget: '',
    hourlyRate: '',
    standardWorkHours: 8,
    status: 'ACTIVE',
    supervisorId: ''
  });
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState(false);
  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState(null);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedJobForAttachments, setSelectedJobForAttachments] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [jobEmployees, setJobEmployees] = useState([]);
  const [jobProducts, setJobProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [selectedEmployeesForNewJob, setSelectedEmployeesForNewJob] = useState([]);
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);

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
    fetchJobs();
    fetchEmployees();
    fetchProducts();
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const costCentersData = await apiRequest('/api/cost-centers');
      setCostCenters(costCentersData || []);
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
      setLoading(true);
      const jobsData = await apiRequest('/api/jobs');
      setJobs(jobsData || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError('Error loading jobs. Please check your connection.');
      toast.error('Error loading jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const employeesData = await apiRequest('/api/employee');
      setEmployees(employeesData || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]);
    }
  };

  const fetchJobProducts = async (jobId) => {
    try {
      const jobProductsData = await apiRequest(`/api/jobs/${jobId}/products`);
      return (jobProductsData || []).map(jp => ({
        id: jp.id,
        jobQuantity: jp.quantity,
        estimatedUsage: jp.estimatedUsage,
        jobProductId: jp.id,
        ...jp.product
      }));
    } catch (err) {
      console.error("Error fetching job products:", err);
      return [];
    }
  };

  const fetchJobEmployees = async (jobId) => {
    try {
      const jobEmployeesData = await apiRequest(`/api/jobs/${jobId}/employees`);
      return jobEmployeesData || [];
    } catch (err) {
      console.error("Error fetching job employees:", err);
      return [];
    }
  };

  const fetchJobCostCenter = async (jobId) => {
    try {
      const costCenterData = await apiRequest(`/api/cost-centers/job/${jobId}`);
      return costCenterData;
    } catch (err) {
      console.error("Error fetching job cost center:", err);
      return null;
    }
  };

  const fetchJobTransactions = async (jobId) => {
    try {
      const transactionsData = await apiRequest(`/api/cost-centers/job/${jobId}/transactions`);
      return transactionsData || [];
    } catch (err) {
      console.error("Error fetching job transactions:", err);
      return [];
    }
  };

  const viewJobDetails = async (job) => {
    try {
      setLoading(true);
      setSelectedJobDetails(job);
      
      const employeesData = await fetchJobEmployees(job.id);
      setJobEmployees(employeesData);
      
      const productsData = await fetchJobProducts(job.id);
      setJobProducts(productsData);
      
      const costCenterData = await fetchJobCostCenter(job.id);
      setJobCostCenter(costCenterData);
      
      const transactionsData = await fetchJobTransactions(job.id);
      setJobTransactions(transactionsData);
      
      setShowJobDetails(true);
    } catch (err) {
      console.error("Error loading job details:", err);
      toast.error('Error loading job details');
    } finally {
      setLoading(false);
    }
  };

  const [jobCostCenter, setJobCostCenter] = useState(null);
  const [jobTransactions, setJobTransactions] = useState([]);

  const handleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, { 
          ...product, 
          jobQuantity: 1, 
          estimatedUsage: '',
          jobProductId: null 
        }];
      }
    });
  };

  const updateProductQuantity = (productId, quantity) => {
    setSelectedProducts(prev =>
      prev.map(product =>
        product.id === productId 
          ? { ...product, jobQuantity: Math.max(1, Math.min(quantity, product.stock)) }
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

  const saveProductsToJob = async (jobId) => {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }
      
      if (selectedProducts.length === 0) {
        return;
      }

      const existingProducts = await fetchJobProducts(jobId);
      
      for (const existingProduct of existingProducts) {
        if (existingProduct.jobProductId) {
          await apiRequest(`/api/jobs/products/${existingProduct.jobProductId}`, {
            method: 'DELETE'
          });
        }
      }

      const addPromises = selectedProducts.map(async (product) => {
        const response = await apiRequest(`/api/jobs/${jobId}/products`, {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            quantity: product.jobQuantity,
            estimatedUsage: product.estimatedUsage || ''
          })
        });
        
        return response;
      });

      await Promise.all(addPromises);
      
      setSuccessMessage('Products added to job successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error("Error saving products:", err);
      setError(`Error saving products: ${err.message}`);
      setTimeout(() => setError(''), 5000);
      throw err;
    }
  };

  const assignEmployeesToJob = async (jobId, employeesToAssign) => {
    try {
      const employeeIds = employeesToAssign.map(emp => emp.id);
      const supervisor = employeesToAssign.find(emp => emp.isSupervisor);
      
      const response = await apiRequest(`/api/jobs/${jobId}/assign-employees`, {
        method: 'POST',
        body: JSON.stringify({
          employeeIds: employeeIds,
          supervisorId: supervisor ? supervisor.id : null
        })
      });
      
      console.log(`Successfully assigned ${employeesToAssign.length} employees to job ${jobId}`);
      return response;
    } catch (err) {
      console.error("Error assigning employees to job:", err);
      throw err;
    }
  };

 // In your JobsManagement component, modify the handleJobSubmit function:
// Modify the handleJobSubmit function to handle missing jobs:
const handleJobSubmit = async (e) => {
  e.preventDefault();
  try {
    setLoading(true);

    const submitData = {
      ...jobForm,
      budget: jobForm.budget ? parseFloat(jobForm.budget) : null,
      hourlyRate: jobForm.hourlyRate ? parseFloat(jobForm.hourlyRate) : null,
      standardWorkHours: jobForm.standardWorkHours ? parseInt(jobForm.standardWorkHours) : 8,
      supervisorId: jobForm.supervisorId || null
    };

    let savedJob;
    
    if (editingJob && editingJob.id) {
      try {
        // Try to update first
        savedJob = await apiRequest(`/api/jobs/${editingJob.id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData)
        });
        
        console.log('Job updated successfully:', savedJob);
        toast.success('Job updated successfully!');
        
      } catch (updateError) {
        console.warn('Update failed, trying to create new job instead:', updateError.message);
        
        // If update fails (job not found), create a new one
        savedJob = await apiRequest('/api/jobs', {
          method: 'POST',
          body: JSON.stringify(submitData)
        });
        
        toast.success('Job created successfully (original job not found)!');
        
        // Update the editingJob ID to the new one
        setEditingJob({...editingJob, id: savedJob.id});
      }
      
      if (selectedProducts.length > 0) {
        await saveProductsToJob(savedJob.id);
      }
      
    } else {
      // Create new job
      savedJob = await apiRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(submitData)
      });
      
      if (selectedEmployeesForNewJob.length > 0) {
        await assignEmployeesToJob(savedJob.id, selectedEmployeesForNewJob);
      }

      if (selectedProducts.length > 0) {
        await saveProductsToJob(savedJob.id);
      }
      
      // Try to create cost center
      try {
        await apiRequest('/api/cost-centers', {
          method: 'POST',
          body: JSON.stringify({
            jobId: savedJob.id,
            name: `${savedJob.name} - Cost Center`,
            code: `CC-${savedJob.id}-${Date.now().toString().slice(-4)}`,
            description: `Cost center for job: ${savedJob.name}`,
            type: 'PROJECT',
            status: 'ACTIVE',
            budget: savedJob.budget || 100000
          })
        });
        toast.success('Job created successfully with cost center!');
      } catch (costCenterErr) {
        console.log('Cost center creation failed, but job was created');
        toast.success('Job created successfully!');
      }
    }
    
    resetJobForm();
    await fetchJobs();
    
  } catch (err) {
    console.error("Error saving job:", err);
    toast.error(`Error saving job: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

const fetchIssuedProductsForJob = async (jobId) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cost-centers/job/${jobId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const transactions = await response.json();
      // Filter for product issue transactions and transform
      return transactions
        .filter(t => t.transactionType === 'PRODUCT_ISSUE' && t.product)
        .map(t => ({
          id: t.id,
          name: t.product.name,
          code: t.product.code,
          quantity: t.quantity,
          unitCost: t.unitCost,
          totalCost: t.amount,
          issuedDate: t.transactionDate,
          issuedBy: t.issuedBy?.username || 'Unknown',
          issuedTo: t.issuedTo ? `${t.issuedTo.firstName} ${t.issuedTo.lastName}` : 'Unknown',
          requestNumber: t.description?.match(/request\s+([A-Z0-9-]+)/i)?.[1] || 'N/A'
        }));
    }
    return [];
  } catch (err) {
    console.error('Error fetching issued products:', err);
    return [];
  }
};


  const openInventoryModal = async (job = null) => {
    setEditingJob(job);
    
    if (job && job.id) {
      try {
        const jobProducts = await fetchJobProducts(job.id);
        setSelectedProducts(jobProducts);
      } catch (err) {
        console.error("Error loading job products:", err);
        setSelectedProducts([]);
      }
    }
    
    setShowInventoryModal(true);
  };

  const handleEmployeeSelection = (employee) => {
    setSelectedEmployeesForNewJob(prev => {
      const existing = prev.find(emp => emp.id === employee.id);
      if (existing) {
        return prev.filter(emp => emp.id !== employee.id);
      } else {
        return [...prev, { ...employee, isSupervisor: false }];
      }
    });
  };

  const setSupervisorForNewJob = (employeeId) => {
    setSelectedEmployeesForNewJob(prev =>
      prev.map(emp => ({
        ...emp,
        isSupervisor: emp.id === employeeId
      }))
    );
  };

  const getAvailableEmployeesForNewJob = () => {
    return employees.filter(emp => 
      !emp.job || emp.job.id === null || !selectedEmployeesForNewJob.find(selected => selected.id === emp.id)
    );
  };

  const openEmployeeAssignment = async (job) => {
    setSelectedJobForAssignment(job);
    
    try {
      const freshEmployees = await apiRequest('/api/employee');
      setEmployees(freshEmployees);
      
      const assigned = await fetchJobEmployees(job.id);
      setAssignedEmployees(assigned);
      
      const available = freshEmployees.filter(emp => 
        !emp.job || emp.job.id !== job.id
      );
      setAvailableEmployees(available);
      
    } catch (err) {
      console.error("Error fetching employee data:", err);
      const assigned = employees.filter(emp => 
        emp.job && emp.job.id === job.id
      );
      setAssignedEmployees(assigned);
      
      const available = employees.filter(emp => 
        !emp.job || emp.job.id !== job.id
      );
      setAvailableEmployees(available);
    }
    
    setShowEmployeeAssignment(true);
  };

  const assignEmployee = async (employee) => {
    try {
      const response = await apiRequest(`/api/jobs/${selectedJobForAssignment.id}/assign-employee`, {
        method: 'POST',
        body: JSON.stringify({
          employeeId: employee.id,
          isSupervisor: false
        })
      });

      setAssignedEmployees(prev => [...prev, response]);
      setAvailableEmployees(prev => prev.filter(emp => emp.id !== employee.id));
      
      await fetchJobs();
      
      toast.success(`Employee ${employee.firstName} ${employee.lastName} assigned successfully.`);
    } catch (err) {
      console.error("Error assigning employee:", err);
      toast.error('Error assigning employee');
    }
  };

  const assignAsSupervisor = async (employee) => {
    try {
      const response = await apiRequest(`/api/jobs/${selectedJobForAssignment.id}/supervisor`, {
        method: 'POST',
        body: JSON.stringify({
          employeeId: employee.id
        })
      });

      await fetchEmployees();
      await fetchJobs();
      
      await openEmployeeAssignment(selectedJobForAssignment);
      toast.success(`${employee.firstName} ${employee.lastName} is now the supervisor for this job.`);
    } catch (err) {
      console.error("Error assigning supervisor:", err);
      toast.error('Error assigning supervisor');
    }
  };

  const unassignSupervisor = async (employee) => {
    try {
      await apiRequest(`/api/jobs/${selectedJobForAssignment.id}/supervisor`, {
        method: 'DELETE'
      });

      await fetchEmployees();
      await fetchJobs();
      await openEmployeeAssignment(selectedJobForAssignment);
      toast.success(`${employee.firstName} ${employee.lastName} is no longer the supervisor.`);
    } catch (err) {
      console.error("Error removing supervisor:", err);
      toast.error('Error removing supervisor');
    }
  };

  const unassignEmployee = async (employee) => {
    try {
      const response = await apiRequest(`/api/jobs/${selectedJobForAssignment.id}/employees/${employee.id}`, {
        method: 'DELETE'
      });

      setAvailableEmployees(prev => [...prev, response]);
      setAssignedEmployees(prev => prev.filter(emp => emp.id !== employee.id));
      
      await fetchJobs();
      
      toast.success(`Employee ${employee.firstName} ${employee.lastName} unassigned successfully.`);
    } catch (err) {
      console.error("Error unassigning employee:", err);
      toast.error('Error unassigning employee');
    }
  };

  const unassignAllEmployeesFromJob = async (jobId) => {
    try {
      const assignedEmployees = await fetchJobEmployees(jobId);
      
      if (assignedEmployees.length === 0) return true;

      const unassignPromises = assignedEmployees.map(employee =>
        apiRequest(`/api/jobs/${jobId}/employees/${employee.id}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(unassignPromises);
      await fetchEmployees();
      await fetchJobs();
      
      return true;
    } catch (err) {
      console.error("Error unassigning employees:", err);
      return false;
    }
  };

  const deleteJob = async (jobId, jobName) => {
    if (!window.confirm(`Are you sure you want to delete the job "${jobName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      await apiRequest(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      fetchJobs();
      toast.success(`Job "${jobName}" deleted successfully!`);
    } catch (err) {
      console.error("Delete error:", err);
      
      const assignedEmployees = await fetchJobEmployees(jobId);
      const assignedCount = assignedEmployees.length;
      
      const choice = window.confirm(
        `Cannot delete "${jobName}" - ${assignedCount} employee(s) are assigned.\n\n` +
        'Click OK to automatically unassign them and delete the job.\n' +
        'Click Cancel to manually manage assignments first.'
      );
      
      if (choice) {
        const success = await unassignAllEmployeesFromJob(jobId);
        if (success) {
          await apiRequest(`/api/jobs/${jobId}`, {
            method: 'DELETE'
          });
          fetchJobs();
          toast.success(`"${jobName}" deleted successfully. ${assignedCount} employee(s) were unassigned.`);
        } else {
          toast.error('Failed to unassign employees. Please try manually removing employees first.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

const handleEditJob = async (job) => {
  console.log('Editing job:', job);
  console.log('Job ID:', job.id);
  console.log('Job object:', JSON.stringify(job, null, 2));
  
  // Verify the job has an ID
  if (!job.id) {
    console.error('Job has no ID!', job);
    toast.error('Cannot edit job: No ID found');
    return;
  }
  
  setEditingJob(job);
  setJobForm({
    name: job.name || '',
    description: job.description || '',
    client: job.client || '',
    startDate: job.startDate || '',
    endDate: job.endDate || '',
    billingCycle: job.billingCycle || 'MONTHLY',
    budget: job.budget || '',
    hourlyRate: job.hourlyRate || '',
    standardWorkHours: job.standardWorkHours || 8,
    status: job.status || 'ACTIVE',
    supervisorId: job.supervisor?.id || ''
  });
  
  try {
    const jobProducts = await fetchJobProducts(job.id);
    console.log('Loaded job products:', jobProducts);
    setSelectedProducts(jobProducts);
  } catch (err) {
    console.error("Error loading job products:", err);
    setSelectedProducts([]);
  }
  
  setShowJobForm(true);
};

  const openAttachments = async (job) => {
    setSelectedJobForAttachments(job);
    try {
      const attachmentsData = await apiRequest(`/api/jobs/${job.id}/attachments`);
      
      const formattedAttachments = (attachmentsData || []).map(att => ({
        id: att.id,
        jobId: att.jobId,
        fileName: att.fileName,
        filePath: att.filePath,
        fileSize: att.fileSize,
        fileType: att.fileType,
        uploadedAt: att.uploadedAt,
        description: att.description || `Attachment for ${job.name}`
      }));
      
      setAttachments(formattedAttachments);
      setShowAttachments(true);
    } catch (err) {
      console.error("Error fetching attachments:", err);
      toast.error('Error loading attachments');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedJobForAttachments) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setUploadingFile(true);
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Attachment for ${selectedJobForAttachments.name}`);

      const response = await fetch(`${API_BASE_URL}/api/jobs/${selectedJobForAttachments.id}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const newAttachment = await response.json();
        setAttachments(prev => [...prev, newAttachment]);
        event.target.value = '';
        toast.success('File uploaded successfully!');
      } else {
        const errorText = await response.text();
        toast.error('Error uploading file: ' + errorText);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error('Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await apiRequest(`/api/jobs/attachments/${attachmentId}`, {
        method: 'DELETE'
      });

      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      toast.success('Attachment deleted successfully!');
    } catch (err) {
      console.error("Error deleting attachment:", err);
      toast.error('Error deleting attachment');
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/files/download/${attachment.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const errorText = await response.text();
        toast.error('Error downloading file: ' + errorText);
      }
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error('Error downloading file');
    }
  };

  const resetJobForm = () => {
    setJobForm({
      name: '',
      description: '',
      client: '',
      startDate: '',
      endDate: '',
      billingCycle: 'MONTHLY',
      budget: '',
      hourlyRate: '',
      standardWorkHours: 8,
      status: 'ACTIVE',
      supervisorId: ''
    });
    setEditingJob(null);
    setShowJobForm(false);
    setSelectedProducts([]);
    setSelectedEmployeesForNewJob([]);
  };

  const openTimesheetForJob = (job) => {
    localStorage.setItem('selectedJobForTimesheet', job.id.toString());
    navigate(`/timesheets?jobId=${job.id}`);
    localStorage.setItem('selectedJobName', job.name);
    localStorage.setItem('selectedJobData', JSON.stringify(job));
  };

  const handleEmployeeAssignmentClose = () => {
    setShowEmployeeAssignment(false);
    setSelectedJobForAssignment(null);
    fetchEmployees();
    fetchJobs();
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const previewAttachmentFile = async (attachment) => {
    try {
      setPreviewLoading(true);
      setPreviewAttachment(attachment);
      
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/jobs/attachments/${attachment.id}/preview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        setPreviewContent({
          type: contentType,
          url: url,
          blob: blob
        });
        
        setShowPreviewModal(true);
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (err) {
      console.error("Error previewing file:", err);
      toast.error('Cannot preview this file type. Please download instead.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const canPreviewFile = (attachment) => {
    if (!attachment?.fileType) return false;
    
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'text/html',
      'application/json'
    ];
    
    return previewableTypes.some(type => attachment.fileType.includes(type));
  };

  const EmployeeSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Select Employees for New Job
          </h2>
          <button
            onClick={() => setShowEmployeeSelection(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-green-600 mb-3">
              Selected Employees ({selectedEmployeesForNewJob.length})
            </h3>
            {selectedEmployeesForNewJob.length > 0 ? (
              <div className="space-y-2">
                {selectedEmployeesForNewJob.map(employee => (
                  <div key={employee.id} className={`flex justify-between items-center p-3 border rounded-lg ${
                    employee.isSupervisor ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-gray-200'
                  }`}>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {employee.firstName} {employee.lastName}
                        {employee.isSupervisor && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <Crown size={12} />
                            Supervisor
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.jobPosition} • {employee.employeeId}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!employee.isSupervisor && (
                        <button
                          onClick={() => setSupervisorForNewJob(employee.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Make Supervisor
                        </button>
                      )}
                      <button
                        onClick={() => handleEmployeeSelection(employee)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4 border border-dashed border-gray-300 rounded-lg">
                No employees selected yet
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">
              Available Employees ({getAvailableEmployeesForNewJob().length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getAvailableEmployeesForNewJob().map(employee => (
                <div 
                  key={employee.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEmployeesForNewJob.find(emp => emp.id === employee.id) 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                  onClick={() => handleEmployeeSelection(employee)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {employee.firstName} {employee.lastName}
                        {selectedEmployeesForNewJob.find(emp => emp.id === employee.id) && (
                          <span className="text-green-600 text-sm">✓ Selected</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.jobPosition} • {employee.employeeId}
                        {employee.job && (
                          <span className="text-orange-600 ml-2">
                            (Currently: {employee.job.name})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {getAvailableEmployeesForNewJob().length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No available employees
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedEmployeesForNewJob.length} employees selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEmployeeSelection(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowEmployeeSelection(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const JobDetailsModal = () => {
    const costCenter = jobCostCenter;
    const transactions = jobTransactions || [];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {selectedJobDetails?.name} - Complete Details
            </h2>
            <button
              onClick={() => setShowJobDetails(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-lg">Loading job details...</span>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <Building className="text-blue-600" />
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Client</label>
                      <p className="mt-1 text-lg font-semibold">{selectedJobDetails?.client}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Status</label>
                      <span className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedJobDetails?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        selectedJobDetails?.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                        selectedJobDetails?.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedJobDetails?.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Billing Cycle</label>
                      <p className="mt-1 text-lg font-semibold">{selectedJobDetails?.billingCycle?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Budget</label>
                      <p className="mt-1 text-lg font-semibold text-green-600">
                        ${selectedJobDetails?.budget ? parseFloat(selectedJobDetails.budget).toLocaleString() : '0.00'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Hourly Rate</label>
                      <p className="mt-1 text-lg font-semibold">
                        ${selectedJobDetails?.hourlyRate ? parseFloat(selectedJobDetails.hourlyRate).toLocaleString() : '0.00'}/hr
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Standard Hours</label>
                      <p className="mt-1 text-lg font-semibold flex items-center gap-1">
                        <Clock size={16} />
                        {selectedJobDetails?.standardWorkHours || 8}h/day
                      </p>
                    </div>
                  </div>
                  {selectedJobDetails?.description && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-blue-700">Description</label>
                      <p className="mt-1 text-gray-700 bg-white p-3 rounded border">{selectedJobDetails.description}</p>
                    </div>
                  )}
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-purple-800 mb-4 flex items-center gap-2">
                    <DollarIcon className="text-purple-600" />
                    Cost Center Information
                  </h3>
                  {costCenter ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-700">Budget</div>
                          <div className="text-2xl font-bold text-purple-800">
                            ${costCenter.budget?.toLocaleString() || '0.00'}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-700">Spent</div>
                          <div className="text-2xl font-bold text-red-600">
                            ${costCenter.spentAmount?.toLocaleString() || '0.00'}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-700">Remaining</div>
                          <div className="text-2xl font-bold text-green-600">
                            ${((costCenter.budget || 0) - (costCenter.spentAmount || 0))?.toLocaleString() || '0.00'}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-700">Utilization</div>
                          <div className="text-2xl font-bold">
                            {(((costCenter.spentAmount || 0) / (costCenter.budget || 1)) * 100).toFixed(1)}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full ${
                                ((costCenter.spentAmount || 0) / (costCenter.budget || 1)) * 100 > 90 ? 'bg-red-500' :
                                ((costCenter.spentAmount || 0) / (costCenter.budget || 1)) * 100 > 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(((costCenter.spentAmount || 0) / (costCenter.budget || 1)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">Recent Transactions</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {transactions.slice(0, 5).map(transaction => (
                            <div key={transaction.id} className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{transaction.description}</div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(transaction.transactionDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${
                                    transaction.transactionType === 'PRODUCT_ISSUE' ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    ${transaction.amount?.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {transaction.transactionType?.replace('_', ' ')}
                                  </div>
                                </div>
                              </div>
                              {transaction.product && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Product: {transaction.product.name} (Qty: {transaction.quantity})
                                </div>
                              )}
                            </div>
                          ))}
                          {transactions.length === 0 && (
                            <div className="text-center text-gray-500 py-4">
                              No transactions yet
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/CostCenterManagement?jobId=${selectedJobDetails.id}`)}
                          className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full"
                        >
                          View All Transactions & Manage Cost Center
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-gray-500">Cost center not created yet</div>
                      <button
                        onClick={async () => {
                          try {
                            const costCenterResponse = await apiRequest('/api/cost-centers/create-for-job', {
                              method: 'POST',
                              body: JSON.stringify({
                                jobId: selectedJobDetails.id,
                                jobName: selectedJobDetails.name,
                                budget: selectedJobDetails.budget || 100000.00
                              })
                            });
                            setJobCostCenter(costCenterResponse);
                            toast.success('Cost center created successfully!');
                          } catch (err) {
                            console.error('Error creating cost center:', err);
                            toast.error('Failed to create cost center');
                          }
                        }}
                        className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Create Cost Center
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <Users className="text-green-600" />
                    Assigned Employees ({jobEmployees.length})
                  </h3>
                  {jobEmployees.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {jobEmployees.map(employee => (
                        <div key={employee.id} className={`bg-white rounded-lg border p-4 ${
                          employee.isSupervisor ? 'border-green-300 bg-green-25' : 'border-gray-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="text-blue-600" size={20} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  {employee.firstName} {employee.lastName}
                                  {employee.isSupervisor && (
                                    <Crown size={16} className="text-green-600" />
                                  )}
                                </h4>
                                <p className="text-sm text-gray-600">{employee.jobPosition}</p>
                                <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                              </div>
                            </div>
                            {employee.isSupervisor && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Supervisor
                              </span>
                            )}
                          </div>
                          <div className="mt-3 text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Email:</span>
                              <span className="font-medium">{employee.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Phone:</span>
                              <span className="font-medium">{employee.phone || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Category:</span>
                              <span className="font-medium">{employee.category || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded border border-gray-200">
                      <Users className="mx-auto text-gray-300" size={48} />
                      <p className="text-gray-500 mt-2">No employees assigned to this job</p>
                      <button
                        onClick={() => {
                          setShowJobDetails(false);
                          openEmployeeAssignment(selectedJobDetails);
                        }}
                        className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Assign Employees
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-orange-800 mb-4 flex items-center gap-2">
                    <Package className="text-orange-600" />
                    Assigned Products ({jobProducts.length})
                  </h3>
                  {jobProducts.length > 0 ? (
                    <div className="space-y-3">
                      {jobProducts.map(product => (
                        <div key={product.id} className="bg-white rounded-lg border border-orange-200 p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{product.name}</h4>
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                <div className="flex flex-wrap gap-4">
                                  <span><strong>Code:</strong> {product.code || 'N/A'}</span>
                                  <span><strong>Brand:</strong> {product.userName || 'N/A'}</span>
                                  <span><strong>Type:</strong> {product.productType || 'N/A'}</span>
                                </div>
                                <div className="flex flex-wrap gap-4 mt-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    product.stock > 10 ? 'bg-green-100 text-green-800' :
                                    product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    Available Stock: {product.stock} units
                                  </span>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                    Assigned Quantity: {product.jobQuantity} units
                                  </span>
                                </div>
                              </div>
                              {product.estimatedUsage && (
                                <div className="mt-2">
                                  <label className="text-sm font-medium text-gray-700">Estimated Usage:</label>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                    {product.estimatedUsage}
                                  </p>
                                </div>
                              )}
                              {product.description && (
                                <p className="text-sm text-gray-500 mt-2">{product.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded border border-gray-200">
                      <Package className="mx-auto text-gray-300" size={48} />
                      <p className="text-gray-500 mt-2">No products assigned to this job</p>
                      <button
                        onClick={() => openInventoryModal(selectedJobDetails)}
                        className="mt-3 px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 text-sm font-medium"
                      >
                        Add Products
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => setShowJobDetails(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            {selectedJobDetails && (
              <button
                onClick={() => handleEditJob(selectedJobDetails)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Job
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const InventoryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Select Products for Job
          </h2>
          <button
            onClick={() => setShowInventoryModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {selectedProducts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-green-600">
                Selected Products ({selectedProducts.length})
              </h3>
              <div className="space-y-3">
                {selectedProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">
                        Code: {product.code} | Current Stock: {product.stock} | Type: {product.productType}
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500 mt-1">{product.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max={product.stock}
                          value={product.jobQuantity}
                          onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value))}
                          className="w-20 ml-2 p-1 border border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-500 ml-1">max: {product.stock}</span>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Usage:</label>
                        <input
                          type="text"
                          placeholder="How will this be used?"
                          value={product.estimatedUsage}
                          onChange={(e) => updateProductUsage(product.id, e.target.value)}
                          className="w-48 ml-2 p-1 border border-gray-300 rounded"
                        />
                      </div>
                      <button
                        onClick={() => handleProductSelection(product)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">
              Available Products ({products.filter(p => p.stock > 0).length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {products.filter(product => product.stock > 0).map(product => (
                <div 
                  key={product.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProducts.find(p => p.id === product.id) 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                  onClick={() => handleProductSelection(product)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {product.name}
                        {selectedProducts.find(p => p.id === product.id) && (
                          <span className="text-green-600 text-sm">✓ Selected</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div>Code: {product.code || 'N/A'}</div>
                        <div>Brand: {product.userName || 'N/A'}</div>
                        <div>Type: {product.productType || 'N/A'}</div>
                        <div className={`font-medium ${
                          product.stock > 10 ? 'text-green-600' : 
                          product.stock > 0 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          Stock: {product.stock} units
                        </div>
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {products.filter(product => product.stock > 0).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Package size={48} className="mx-auto mb-2 text-gray-300" />
                <div>No products available in inventory</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedProducts.length} products selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowInventoryModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  let targetJobId = null;
                  
                  if (editingJob && editingJob.id) {
                    targetJobId = editingJob.id;
                  } else if (selectedJobDetails && selectedJobDetails.id) {
                    targetJobId = selectedJobDetails.id;
                  } else {
                    setError('Please save the job first before adding products');
                    return;
                  }
                  
                  if (targetJobId) {
                    await saveProductsToJob(targetJobId);
                    setSuccessMessage('Products saved successfully!');
                    setShowInventoryModal(false);
                  }
                } catch (err) {
                  console.error('Error saving products:', err);
                  setError(`Failed to save products: ${err.message}`);
                }
              }}
              disabled={selectedProducts.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Save Products to Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const PreviewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            {previewAttachment?.fileName}
          </h2>
          <button
            onClick={() => {
              setShowPreviewModal(false);
              setPreviewAttachment(null);
              setPreviewContent(null);
              if (previewContent?.url) {
                URL.revokeObjectURL(previewContent.url);
              }
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden p-1">
          {previewLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg">Loading preview...</span>
            </div>
          ) : previewContent ? (
            <div className="h-full w-full overflow-auto">
              {previewContent.type.includes('pdf') && (
                <embed
                  src={previewContent.url}
                  type="application/pdf"
                  className="w-full h-full min-h-[70vh]"
                  title={previewAttachment.fileName}
                />
              )}
              
              {(previewContent.type.includes('image/jpeg') || 
                previewContent.type.includes('image/png') || 
                previewContent.type.includes('image/gif')) && (
                <div className="flex justify-center items-center h-full">
                  <img
                    src={previewContent.url}
                    alt={previewAttachment.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              
              {(previewContent.type.includes('text/plain') || 
                previewContent.type.includes('text/csv') || 
                previewContent.type.includes('text/html')) && (
                <div className="h-full">
                  <div className="bg-gray-800 text-gray-100 p-4 h-full overflow-auto font-mono text-sm">
                    <pre>{previewContent.content || 'Loading text content...'}</pre>
                  </div>
                </div>
              )}
              
              {!previewContent.type.includes('pdf') && 
               !previewContent.type.includes('image/') && 
               !previewContent.type.includes('text/') && (
                <div className="flex flex-col justify-center items-center h-full p-8 text-center">
                  <FileText size={64} className="text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Preview not available
                  </h3>
                  <p className="text-gray-500 mb-4">
                    This file type cannot be previewed in the browser.
                  </p>
                  <button
                    onClick={() => downloadAttachment(previewAttachment)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-gray-500">Preview not available</div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="text-sm text-gray-600">
            File size: {(previewAttachment?.fileSize / 1024 / 1024).toFixed(2)} MB
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadAttachment(previewAttachment)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-gray-50 flex">
      <main className="flex-1 overflow-y-auto">
        <header className="flex justify-between items-center bg-white h-16 w-full px-6 shadow-md sticky top-0 z-10">
          <h1 className="text-lg font-semibold">Job & Contract Management</h1>
          <button 
            onClick={() => setShowJobForm(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            {loading ? 'Loading...' : 'New Job'}
          </button>
        </header>

        <div className="p-6">
          <div className="mb-6 bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search jobs by name, client, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </div>
          </div>

          {showJobForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {editingJob ? 'Edit Job' : 'Create New Job'}
                  </h2>
                  <button
                    onClick={resetJobForm}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  <form onSubmit={handleJobSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Job Name *</label>
                        <input
                          type="text"
                          value={jobForm.name}
                          onChange={(e) => setJobForm({...jobForm, name: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Client *</label>
                        <input
                          type="text"
                          value={jobForm.client}
                          onChange={(e) => setJobForm({...jobForm, client: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={jobForm.description}
                        onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        rows="3"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                        <input
                          type="date"
                          value={jobForm.startDate}
                          onChange={(e) => setJobForm({...jobForm, startDate: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                          type="date"
                          value={jobForm.endDate}
                          onChange={(e) => setJobForm({...jobForm, endDate: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Billing Cycle *</label>
                        <select
                          value={jobForm.billingCycle}
                          onChange={(e) => setJobForm({...jobForm, billingCycle: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required
                          disabled={loading}
                        >
                          <option value="WEEKLY">Weekly</option>
                          <option value="BI_WEEKLY">Bi-Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="QUARTERLY">Quarterly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status *</label>
                        <select
                          value={jobForm.status}
                          onChange={(e) => setJobForm({...jobForm, status: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required
                          disabled={loading}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Budget ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={jobForm.budget}
                          onChange={(e) => setJobForm({...jobForm, budget: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={jobForm.hourlyRate}
                          onChange={(e) => setJobForm({...jobForm, hourlyRate: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Standard Work Hours *</label>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400" />
                          <input
                            type="number"
                            value={jobForm.standardWorkHours}
                            onChange={(e) => setJobForm({...jobForm, standardWorkHours: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            min="1"
                            max="24"
                            placeholder="8"
                            required
                            disabled={loading}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Hours beyond this will be considered overtime in timesheets
                        </p>
                      </div>
                      <div></div>
                    </div>

                    {!editingJob && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Assign Employees (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowEmployeeSelection(true)}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <Users size={16} />
                            {selectedEmployeesForNewJob.length > 0 ? 
                              `View/Edit Employees (${selectedEmployeesForNewJob.length})` : 
                              'Select Employees'
                            }
                          </button>
                        </div>
                        
                        {selectedEmployeesForNewJob.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Selected Employees:</h4>
                            {selectedEmployeesForNewJob.map(employee => (
                              <div key={employee.id} className={`flex justify-between items-center p-2 rounded border ${
                                employee.isSupervisor ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                              }`}>
                                <span className="text-sm flex items-center gap-2">
                                  {employee.firstName} {employee.lastName}
                                  {employee.isSupervisor && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                      <Crown size={12} />
                                      Supervisor
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {employee.jobPosition}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">
                          Select employees to assign to this job during creation
                        </p>
                      </div>
                    )}

                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Assign Supervisor (Optional)
                      </label>
                      <select
                        value={jobForm.supervisorId}
                        onChange={(e) => setJobForm({...jobForm, supervisorId: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={loading}
                      >
                        <option value="">Select Supervisor</option>
                        {employees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} 
                            {employee.jobPosition && ` - ${employee.jobPosition}`}
                            {employee.job && ` (Currently: ${employee.job.name})`}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        You can assign employees and supervisors after creating the job
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Assign Products (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingJob) {
                              openInventoryModal(editingJob);
                            } else {
                              setShowInventoryModal(true);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          <Package size={16} />
                          {selectedProducts.length > 0 ? 
                            `View/Edit Products (${selectedProducts.length})` : 
                            'Select Products from Inventory'
                          }
                        </button>
                      </div>
                      
                      {selectedProducts.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Selected Products:</h4>
                          {selectedProducts.map(product => (
                            <div key={product.id} className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                              <span className="text-sm">
                                {product.name} (Qty: {product.jobQuantity})
                              </span>
                              <span className="text-xs text-gray-500">
                                Usage: {product.estimatedUsage || 'Not specified'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Select products from inventory that will be used for this job
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={resetJobForm}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (editingJob) {
                              await saveProductsToJob(editingJob.id);
                            }
                            setShowInventoryModal(false);
                          } catch (err) {
                            console.error('Error saving products:', err);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Job
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showEmployeeSelection && <EmployeeSelectionModal />}
          {showJobDetails && <JobDetailsModal />}
          {showInventoryModal && <InventoryModal />}
          {showPreviewModal && <PreviewModal />}

          {showEmployeeAssignment && selectedJobForAssignment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    Assign Employees to {selectedJobForAssignment.name}
                  </h2>
                  <button
                    onClick={handleEmployeeAssignmentClose}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-green-600">
                        Available Employees ({availableEmployees.length})
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {availableEmployees.map(employee => (
                          <div key={employee.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                            <div>
                              <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                              <div className="text-sm text-gray-500">{employee.jobPosition} • {employee.employeeId}</div>
                            </div>
                            <button
                              onClick={() => assignEmployee(employee)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                              Assign
                            </button>
                          </div>
                        ))}
                        {availableEmployees.length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No available employees
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-blue-600">
                        Assigned Employees ({assignedEmployees.length})
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {assignedEmployees.map(employee => (
                          <div key={employee.id} className={`flex justify-between items-center p-3 border rounded-lg ${
                            employee.isSupervisor ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-gray-200'
                          }`}>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {employee.firstName} {employee.lastName}
                                {employee.isSupervisor && (
                                  <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    <Crown size={12} />
                                    Supervisor
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{employee.jobPosition} • {employee.employeeId}</div>
                            </div>
                            <div className="flex gap-2">
                              {!employee.isSupervisor && (
                                <button
                                  onClick={() => assignAsSupervisor(employee)}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                >
                                  Make Supervisor
                                </button>
                              )}
                              {employee.isSupervisor && (
                                <button
                                  onClick={() => unassignSupervisor(employee)}
                                  className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                                >
                                  Remove as Supervisor
                                </button>
                              )}
                              <button
                                onClick={() => unassignEmployee(employee)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {assignedEmployees.length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No employees assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={handleEmployeeAssignmentClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAttachments && selectedJobForAttachments && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    Attachments for {selectedJobForAttachments.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAttachments(false);
                      setSelectedJobForAttachments(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload New File (Max 10MB)
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="flex-1 p-2 border border-gray-300 rounded-lg"
                        disabled={uploadingFile}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                      />
                      {uploadingFile && (
                        <div className="flex items-center text-blue-600">
                          Uploading...
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Files ({attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {attachments.map(attachment => (
                        <div key={attachment.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-gray-400" />
                            <div>
                              <div className="font-medium">{attachment.fileName}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(attachment.uploadedAt).toLocaleDateString()} • 
                                {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                              </div>
                              {attachment.description && (
                                <div className="text-sm text-gray-600">{attachment.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {canPreviewFile(attachment) && (
                              <button
                                onClick={() => previewAttachmentFile(attachment)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                              >
                                Preview
                              </button>
                            )}
                            <button
                              onClick={() => downloadAttachment(attachment)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => deleteAttachment(attachment.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {attachments.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          <FileText size={48} className="mx-auto mb-2 text-gray-300" />
                          <div>No attachments yet</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => {
                      setShowAttachments(false);
                      setSelectedJobForAttachments(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading...</span>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map(job => {
                const assignedEmployeesForJob = job.assignedEmployees || [];
                const assignedCount = assignedEmployeesForJob.length;
                
                const supervisor = assignedEmployeesForJob.find(emp => emp.isSupervisor) || 
                                  (job.supervisor ? {
                                    firstName: job.supervisor.firstName,
                                    lastName: job.supervisor.lastName
                                  } : null);

                const jobCostCenter = costCenters.find(cc => cc.job?.id === job.id);
                const spentAmount = jobCostCenter?.spentAmount || 0;
                const budget = jobCostCenter?.budget || job.budget || 0;
                const utilizationPercentage = budget > 0 ? (spentAmount / budget) * 100 : 0;

                return (
                  <div key={job.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{job.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          job.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          job.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                          job.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {job.status?.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">{job.description}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building size={16} />
                          <span className="font-medium">Client:</span>
                          <span>{job.client}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span className="font-medium">Period:</span>
                          <span>{new Date(job.startDate).toLocaleDateString()} - {job.endDate ? new Date(job.endDate).toLocaleDateString() : 'Ongoing'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} />
                          <span className="font-medium">Budget:</span>
                          <span>${budget.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span className="font-medium">Standard Hours:</span>
                          <span>{job.standardWorkHours || 8}h/day</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <span className="font-medium">Billing:</span>
                          <span>{job.billingCycle?.replace('_', '-').toLowerCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          <span className="font-medium">Employees:</span>
                          <span>{assignedCount} assigned</span>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Cost Center:</span>
                            <span className={`font-bold ${
                              utilizationPercentage > 90 ? 'text-red-600' :
                              utilizationPercentage > 75 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              ${spentAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                utilizationPercentage > 90 ? 'bg-red-500' :
                                utilizationPercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {utilizationPercentage.toFixed(1)}% of budget utilized
                          </div>
                        </div>
                        
                        {assignedEmployeesForJob.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-500 mb-1">Assigned Team:</div>
                            <div className="space-y-1">
                              {assignedEmployeesForJob.slice(0, 3).map(emp => (
                                <div key={emp.id} className="flex items-center gap-2 text-xs">
                                  <div className={`w-2 h-2 rounded-full ${
                                    emp.isSupervisor ? 'bg-green-500' : 'bg-blue-500'
                                  }`}></div>
                                  <span className={emp.isSupervisor ? 'font-medium text-green-700' : ''}>
                                    {emp.firstName} {emp.lastName}
                                    {emp.isSupervisor && ' (Supervisor)'}
                                  </span>
                                </div>
                              ))}
                              {assignedEmployeesForJob.length > 3 && (
                                <div className="text-xs text-gray-400">
                                  +{assignedEmployeesForJob.length - 3} more employees
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {supervisor && (
                          <div className="flex items-center gap-2">
                            <Crown size={16} className="text-green-600" />
                            <span className="font-medium text-green-700">Supervisor:</span>
                            <span className="text-green-700">
                              {supervisor.firstName} {supervisor.lastName}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => viewJobDetails(job)}
                          className="flex-1 min-w-[120px] text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleEditJob(job)}
                          className="flex-1 min-w-[80px] text-center px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openEmployeeAssignment(job)}
                          className="flex-1 min-w-[80px] text-center px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 text-sm font-medium"
                        >
                          Employees
                        </button>
                        <button
                          onClick={() => openInventoryModal(job)}
                          className="flex-1 min-w-[80px] text-center px-3 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 text-sm font-medium"
                        >
                          Products
                        </button>
                        <button
                          onClick={() => openAttachments(job)}
                          className="flex-1 min-w-[80px] text-center px-3 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 text-sm font-medium"
                        >
                          Attachments
                        </button>
                        <button
                          onClick={() => openTimesheetForJob(job)}
                          className="flex-1 min-w-[100px] text-center px-3 py-2 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 text-sm font-medium"
                        >
                          Timesheet
                        </button>
                        <button
                          onClick={() => deleteJob(job.id, job.name)}
                          disabled={loading}
                          className="flex-1 min-w-[80px] text-center px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium disabled:border-gray-400 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => navigate('/CostCenterManagement')}
                          className="flex-1 min-w-[100px] text-center px-3 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm font-medium"
                        >
                          Cost Center
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No jobs found</div>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Create your first job to get started'
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default JobsManagement;