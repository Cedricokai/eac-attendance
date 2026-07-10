import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Building, Calendar, DollarSign, FileText, Users, Upload, X, Clock, Crown, Package, User, Search, Filter, DollarSign as DollarIcon, Bell, Clock as ClockIcon, Settings, AlarmClock, Mail, Send, Eye, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

function JobsManagement({ initialJobId = null, initialJobData = null }) {
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
    billingAnchorDay: '',
    billOn15NextMonth: false,
    billingReminderEnabled: false,
    billingReminderEmails: '',
    nextBillingDate: '',
    budget: '',
    hourlyRate: '',
    standardWorkHours: 8,
    status: 'ACTIVE',
    supervisorId: '',
    enableAdvanceReminders: true,
    reminderDaysBefore: '7,3,1',
    reminderTimeHour: 8,
    reminderTimeMinute: 0,
    reminderTimePeriod: 'AM',
    enableOverdueReminders: true,
    overdueReminderDays: 1,
    overtimeMultiplier: '',
  });
  const [bulkNormalRate, setBulkNormalRate] = useState('');
  const [bulkOvertimeRate, setBulkOvertimeRate] = useState('');
  const [jobDetailsRates, setJobDetailsRates] = useState({});
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
  const [showReminderConfig, setShowReminderConfig] = useState(true);
  const [showEmailList, setShowEmailList] = useState(false);

  const [selectedEmployeesForNewJob, setSelectedEmployeesForNewJob] = useState([]);
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);
  const [jobCostCenter, setJobCostCenter] = useState(null);
  const [jobTransactions, setJobTransactions] = useState([]);
  const [currentPreviewSheet, setCurrentPreviewSheet] = useState(0);
  const [previewSheetNames, setPreviewSheetNames] = useState([]);
  const [previewSheetData, setPreviewSheetData] = useState(null);

  const [jobEmployeeRates, setJobEmployeeRates] = useState({});
  const [jobEmployeeCounts, setJobEmployeeCounts] = useState({});
  const [uploadDocumentDate, setUploadDocumentDate] = useState('');

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://192.168.1.100:8080";
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://100.114.178.13:8080";
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

  const applyBulkRates = () => {
    const nh = parseFloat(bulkNormalRate);
    const ot = parseFloat(bulkOvertimeRate);
    
    if (isNaN(nh) || isNaN(ot) || nh < 0 || ot < 0) {
      toast.error('Please enter valid positive numbers for both rates.');
      return;
    }

    if (assignedEmployees.length === 0) {
      toast.warning('No employees assigned to apply rates to.');
      return;
    }

    const updatedRates = {};
    assignedEmployees.forEach(emp => {
      updatedRates[emp.id] = { normalRate: nh, overtimeRate: ot };
    });
    
    setJobEmployeeRates(updatedRates);
    toast.success(`Applied rates to ${assignedEmployees.length} employees successfully!`);
  };

  useEffect(() => {
    const openJobDetails = async () => {
      if (initialJobId && initialJobData) {
        setSelectedJobDetails(initialJobData);
        setShowJobDetails(true);
        
        try {
          const employeesData = await fetchJobEmployees(initialJobId);
          setJobEmployees(employeesData);
          
          const productsData = await fetchJobProducts(initialJobId);
          setJobProducts(productsData);
          
          const costCenterData = await fetchJobCostCenter(initialJobId);
          setJobCostCenter(costCenterData);
          
          const transactionsData = await fetchJobTransactions(initialJobId);
          setJobTransactions(transactionsData);
        } catch (err) {
          console.error("Error loading job details data:", err);
        }
      }
    };
    
    openJobDetails();
  }, [initialJobId, initialJobData]);

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
      console.log('Fetched jobs:', jobsData);
      jobsData.forEach(job => {
        console.log(`Job ${job.id} - ${job.name}: billingReminderEmails =`, job.billingReminderEmails);
      });
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
        id: jp.product?.id || jp.id,
        jobQuantity: jp.quantity,
        estimatedUsage: jp.estimatedUsage,
        jobProductId: jp.id,
        name: jp.product?.name,
        code: jp.product?.code,
        stock: jp.product?.stock,
        productType: jp.product?.productType,
        description: jp.product?.description,
        userName: jp.product?.userName
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

  const fetchJobRates = async (jobId) => {
    try {
      const rates = await apiRequest(`/api/job-employee-rates/job/${jobId}`);
      const map = {};
      rates.forEach(r => {
        map[r.employee.id] = {
          normalRate: r.normalHourRate,
          overtimeRate: r.overtimeRate
        };
      });
      return map;
    } catch (err) {
      console.error("Error fetching job rates:", err);
      return {};
    }
  };

  const fetchAllJobEmployeeCounts = async () => {
    const counts = {};
    for (const job of jobs) {
      try {
        const employees = await fetchJobEmployees(job.id);
        counts[job.id] = employees.length;
      } catch (err) {
        counts[job.id] = 0;
      }
    }
    setJobEmployeeCounts(counts);
  };

  useEffect(() => {
    if (jobs.length > 0) {
      fetchAllJobEmployeeCounts();
    }
  }, [jobs]);

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

  const getDaySuffix = (day) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const convertTo24Hour = (hour, period) => {
    let convertedHour = hour;
    if (period === 'PM' && hour !== 12) {
      convertedHour = hour + 12;
    } else if (period === 'AM' && hour === 12) {
      convertedHour = 0;
    }
    return convertedHour;
  };

  const convertTo12Hour = (hour24) => {
    if (hour24 === undefined || hour24 === null) return { hour: 8, period: 'AM' };
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return { hour: hour12, period };
  };

  const getReminderDaysBeforeString = (reminderDaysBefore) => {
    if (!reminderDaysBefore) return '7,3,1';
    if (typeof reminderDaysBefore === 'string') return reminderDaysBefore;
    if (typeof reminderDaysBefore === 'object' && reminderDaysBefore !== null) {
      if (reminderDaysBefore.value) return String(reminderDaysBefore.value);
      if (reminderDaysBefore.days) return String(reminderDaysBefore.days);
      try {
        const values = Object.values(reminderDaysBefore);
        if (values.length > 0 && values.every(v => typeof v === 'number' || typeof v === 'string')) {
          return values.join(',');
        }
        return '7,3,1';
      } catch(e) {
        return '7,3,1';
      }
    }
    return String(reminderDaysBefore);
  };

  const viewJobDetails = async (job) => {
    try {
      setLoading(true);
      const fullJob = await apiRequest(`/api/jobs/${job.id}`);
      setSelectedJobDetails(fullJob);
      
      const employeesData = await fetchJobEmployees(job.id);
      setJobEmployees(employeesData);
      
      const rates = await fetchJobRates(job.id);
      setJobDetailsRates(rates);
      
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

  const handleEditJob = async (job) => {
    console.log('=== EDITING JOB ===', job);
    
    if (!job.id) {
      toast.error('Cannot edit job: No ID found');
      return;
    }
    
    let freshJob = job;
    try {
      freshJob = await apiRequest(`/api/jobs/${job.id}`);
      console.log('Fresh job data - billingReminderEmails:', freshJob.billingReminderEmails);
    } catch (err) {
      console.warn('Could not fetch fresh job data, using existing:', err);
    }
    
    const rawHour = freshJob.reminderTimeHour !== null && freshJob.reminderTimeHour !== undefined ? freshJob.reminderTimeHour : 8;
    const { hour: reminderHour12, period: reminderPeriod } = convertTo12Hour(rawHour);
    const reminderMinute = freshJob.reminderTimeMinute !== null && freshJob.reminderTimeMinute !== undefined ? freshJob.reminderTimeMinute : 0;
    
    setEditingJob(freshJob);
    setJobForm({
      name: freshJob.name || '',
      description: freshJob.description || '',
      client: freshJob.client || '',
      startDate: freshJob.startDate || '',
      endDate: freshJob.endDate || '',
      billingCycle: freshJob.billingCycle || 'MONTHLY',
      billingAnchorDay: freshJob.billingAnchorDay ? String(freshJob.billingAnchorDay) : '',
      billOn15NextMonth: Boolean(freshJob.billOn15NextMonth),
      billingReminderEnabled: Boolean(freshJob.billingReminderEnabled),
      billingReminderEmails: freshJob.billingReminderEmails || '',
      nextBillingDate: freshJob.nextBillingDate || '',
      budget: freshJob.budget || '',
      hourlyRate: freshJob.hourlyRate || '',
      standardWorkHours: freshJob.standardWorkHours || 8,
      status: freshJob.status || 'ACTIVE',
      supervisorId: freshJob.supervisor?.id || '',
      enableAdvanceReminders: freshJob.enableAdvanceReminders !== undefined ? freshJob.enableAdvanceReminders : true,
      reminderDaysBefore: getReminderDaysBeforeString(freshJob.reminderDaysBefore),
      reminderTimeHour: reminderHour12,
      reminderTimeMinute: reminderMinute,
      reminderTimePeriod: reminderPeriod,
      enableOverdueReminders: freshJob.enableOverdueReminders !== undefined ? freshJob.enableOverdueReminders : true,
      overdueReminderDays: freshJob.overdueReminderDays || 1,
      overtimeMultiplier: freshJob.overtimeMultiplier ?? ''
    });
    
    try {
      const jobProducts = await fetchJobProducts(freshJob.id);
      setSelectedProducts(jobProducts);
    } catch (err) {
      console.error("Error loading job products:", err);
      setSelectedProducts([]);
    }
    
    setShowJobForm(true);
  };

  const deleteJob = async (jobId, jobName) => {
    const userConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Delete Job</h3>
          <p class="text-gray-600 mb-4">Are you sure you want to delete "${jobName}"?</p>
          <div class="flex items-center gap-3 mb-6">
            <input type="checkbox" id="deleteTimesheetsCheckbox" class="h-4 w-4 text-blue-600" />
            <label for="deleteTimesheetsCheckbox" class="text-sm text-gray-700">Also delete all timesheets linked to this job</label>
          </div>
          <div class="flex justify-end gap-3">
            <button id="cancelDeleteBtn" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button id="confirmDeleteBtn" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const checkbox = modal.querySelector('#deleteTimesheetsCheckbox');
      const confirmBtn = modal.querySelector('#confirmDeleteBtn');
      const cancelBtn = modal.querySelector('#cancelDeleteBtn');

      confirmBtn.onclick = () => {
        const shouldDeleteTimesheets = checkbox.checked;
        document.body.removeChild(modal);
        resolve(shouldDeleteTimesheets);
      };
      cancelBtn.onclick = () => {
        document.body.removeChild(modal);
        resolve(null);
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      };
    });

    if (userConfirmed === null) return;

    try {
      setLoading(true);
      await apiRequest(`/api/jobs/${jobId}?deleteTimesheets=${userConfirmed}`, { method: 'DELETE' });
      fetchJobs();
      toast.success(`Job "${jobName}" deleted!`);
    } catch (err) {
      const assigned = await fetchJobEmployees(jobId);
      if (assigned.length > 0 && window.confirm(`${assigned.length} employee(s) assigned. Unassign and delete?`)) {
        if (await unassignAllEmployeesFromJob(jobId)) {
          await apiRequest(`/api/jobs/${jobId}?deleteTimesheets=${userConfirmed}`, { method: 'DELETE' });
          fetchJobs();
          toast.success(`Job deleted, ${assigned.length} employee(s) unassigned.`);
        }
      } else {
        toast.error(`Failed to delete job: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const unassignAllEmployeesFromJob = async (jobId) => {
    try {
      const assigned = await fetchJobEmployees(jobId);
      if (assigned.length === 0) return true;

      for (const employee of assigned) {
        await apiRequest(`/api/jobs/${jobId}/employees/${employee.id}`, { method: 'DELETE' });
      }
      await fetchEmployees();
      await fetchJobs();
      return true;
    } catch (err) {
      console.error("Error unassigning employees:", err);
      return false;
    }
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const reminderHour24 = convertTo24Hour(jobForm.reminderTimeHour, jobForm.reminderTimePeriod);
      const billingAnchorDayValue = jobForm.billingAnchorDay ? parseInt(jobForm.billingAnchorDay) : null;

      const submitData = {
        name: jobForm.name,
        description: jobForm.description,
        client: jobForm.client,
        startDate: jobForm.startDate,
        endDate: jobForm.endDate || null,
        billingCycle: jobForm.billingCycle,
        billingAnchorDay: billingAnchorDayValue,
        billOn15NextMonth: !billingAnchorDayValue && jobForm.billOn15NextMonth,
        billingReminderEnabled: Boolean(jobForm.billingReminderEnabled),
        billingReminderEmails: jobForm.billingReminderEmails ? jobForm.billingReminderEmails.trim() : '',
        nextBillingDate: jobForm.nextBillingDate || null,
        budget: jobForm.budget ? parseFloat(jobForm.budget) : null,
        hourlyRate: jobForm.hourlyRate ? parseFloat(jobForm.hourlyRate) : null,
        standardWorkHours: jobForm.standardWorkHours ? parseInt(jobForm.standardWorkHours) : 8,
        status: jobForm.status,
        supervisorId: jobForm.supervisorId || null,
        enableAdvanceReminders: jobForm.enableAdvanceReminders,
        reminderDaysBefore: jobForm.reminderDaysBefore,
        reminderTimeHour: reminderHour24,
        reminderTimeMinute: parseInt(jobForm.reminderTimeMinute),
        enableOverdueReminders: jobForm.enableOverdueReminders,
        overdueReminderDays: parseInt(jobForm.overdueReminderDays),
        overtimeMultiplier: jobForm.overtimeMultiplier ? parseFloat(jobForm.overtimeMultiplier) : null,
      };
         
      let savedJob;
      
      if (editingJob && editingJob.id) {
        savedJob = await apiRequest(`/api/jobs/${editingJob.id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData)
        });
        toast.success('Job updated successfully!');
        
        if (selectedProducts.length > 0) {
          await saveProductsToJob(savedJob.id);
        }
      } else {
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

  const resetJobForm = () => {
    setJobForm({
      name: '',
      description: '',
      client: '',
      startDate: '',
      endDate: '',
      billingCycle: 'MONTHLY',
      billingAnchorDay: '',
      billOn15NextMonth: false,
      billingReminderEnabled: false,
      billingReminderEmails: '',
      nextBillingDate: '',
      budget: '',
      hourlyRate: '',
      standardWorkHours: 8,
      status: 'ACTIVE',
      supervisorId: '',
      enableAdvanceReminders: true,
      reminderDaysBefore: '7,3,1',
      reminderTimeHour: 8,
      reminderTimeMinute: 0,
      reminderTimePeriod: 'AM',
      enableOverdueReminders: true,
      overdueReminderDays: 1,

    });
    setEditingJob(null);
    setShowJobForm(false);
    setSelectedProducts([]);
    setSelectedEmployeesForNewJob([]);
  };

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
          ? { ...product, jobQuantity: Math.max(1, Math.min(quantity, product.stock || 999)) }
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
      if (!jobId) throw new Error('Job ID is required');
      if (selectedProducts.length === 0) return;

      const existingProducts = await fetchJobProducts(jobId);
      
      for (const existingProduct of existingProducts) {
        if (existingProduct.jobProductId) {
          await apiRequest(`/api/jobs/products/${existingProduct.jobProductId}`, {
            method: 'DELETE'
          });
        }
      }

      const addPromises = selectedProducts.map(async (product) => {
        return await apiRequest(`/api/jobs/${jobId}/products`, {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            quantity: product.jobQuantity,
            estimatedUsage: product.estimatedUsage || ''
          })
        });
      });

      await Promise.all(addPromises);
      toast.success('Products added to job successfully!');
    } catch (err) {
      console.error("Error saving products:", err);
      toast.error(`Error saving products: ${err.message}`);
      throw err;
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
    } else {
      setSelectedProducts([]);
    }
    
    setShowInventoryModal(true);
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
      
      return response;
    } catch (err) {
      console.error("Error assigning employees to job:", err);
      throw err;
    }
  };

  const openEmployeeAssignment = async (job) => {
    setSelectedJobForAssignment(job);
    
    try {
      const freshEmployees = await apiRequest('/api/employee');
      setEmployees(freshEmployees);
      
      const assigned = await fetchJobEmployees(job.id);
      setAssignedEmployees(assigned);

      const rates = await fetchJobRates(job.id);
      setJobEmployeeRates(rates);
      
      const assignedIds = new Set(assigned.map(emp => emp.id));
      const available = freshEmployees.filter(emp => !assignedIds.has(emp.id));
      setAvailableEmployees(available);
    } catch (err) {
      console.error("Error fetching employee data:", err);
      toast.error('Error loading employees');
    }
    
    setShowEmployeeAssignment(true);
  };

  const assignEmployee = async (employee) => {
    try {
      const response = await apiRequest(`/api/jobs/${selectedJobForAssignment.id}/assign-employee`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: employee.id, isSupervisor: false })
      });

      setAssignedEmployees(prev => [...prev, response]);
      setAvailableEmployees(prev => prev.filter(emp => emp.id !== employee.id));
      await fetchJobs();
      await fetchEmployees();
      await fetchAllJobEmployeeCounts();
      toast.success(`Employee ${employee.firstName} ${employee.lastName} assigned successfully.`);
    } catch (err) {
      console.error("Error assigning employee:", err);
      toast.error('Error assigning employee');
    }
  };

  const assignAsSupervisor = async (employee) => {
    try {
      await apiRequest(`/api/jobs/${selectedJobForAssignment.id}/supervisor`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: employee.id })
      });

      await fetchEmployees();
      await fetchJobs();
      await fetchAllJobEmployeeCounts();
      await openEmployeeAssignment(selectedJobForAssignment);
      toast.success(`${employee.firstName} ${employee.lastName} is now the supervisor.`);
    } catch (err) {
      console.error("Error assigning supervisor:", err);
      toast.error('Error assigning supervisor');
    }
  };

  const unassignSupervisor = async (employee) => {
    try {
      await apiRequest(`/api/jobs/${selectedJobForAssignment.id}/supervisor`, { method: 'DELETE' });
      await fetchEmployees();
      await fetchJobs();
      await fetchAllJobEmployeeCounts();
      await openEmployeeAssignment(selectedJobForAssignment);
      toast.success(`${employee.firstName} ${employee.lastName} is no longer supervisor.`);
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
      await fetchEmployees();
      await fetchJobs();
      await fetchAllJobEmployeeCounts();
      toast.success(`Employee ${employee.firstName} ${employee.lastName} unassigned.`);
    } catch (err) {
      console.error("Error unassigning employee:", err);
      toast.error('Error unassigning employee');
    }
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
      !selectedEmployeesForNewJob.find(selected => selected.id === emp.id)
    );
  };

  const handleEmployeeAssignmentClose = () => {
    setShowEmployeeAssignment(false);
    setSelectedJobForAssignment(null);
    fetchEmployees();
    fetchJobs();
  };

  const saveEmployeeRates = async () => {
    if (!selectedJobForAssignment) return;
    try {
      const payload = Object.entries(jobEmployeeRates).map(([employeeId, rates]) => ({
        employeeId: parseInt(employeeId),
        normalHourRate: rates.normalRate || 0,
        overtimeRate: rates.overtimeRate || 0
      }));
      await apiRequest(`/api/job-employee-rates/job/${selectedJobForAssignment.id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      toast.success('Rates saved successfully!');
    } catch (err) {
      toast.error('Failed to save rates: ' + err.message);
    }
  };

  const sendManualBillingReminder = async (jobId, jobName) => {
    if (!window.confirm(`Send billing reminder for "${jobName}" now?`)) return;
    
    try {
      setLoading(true);
      await apiRequest(`/api/jobs/${jobId}/send-billing-reminder`, { method: 'POST' });
      toast.success(`Billing reminder sent for "${jobName}"`);
    } catch (err) {
      console.error("Error sending reminder:", err);
      toast.error(`Failed to send reminder: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openAttachments = async (job) => {
    setSelectedJobForAttachments(job);
    setUploadDocumentDate('');
    try {
      const attachmentsData = await apiRequest(`/api/jobs/${job.id}/attachments`);
      const formattedAttachments = (attachmentsData || []).map(att => ({
        id: att.id,
        fileName: att.fileName,
        fileSize: att.fileSize,
        fileType: att.fileType,
        uploadedAt: att.uploadedAt,
        description: att.description
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

    if (!uploadDocumentDate) {
      toast.error('Please select a document date');
      return;
    }

    try {
      setUploadingFile(true);
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Attachment for ${selectedJobForAttachments.name}`);
      formData.append('documentDate', uploadDocumentDate);

      const response = await fetch(`${API_BASE_URL}/api/jobs/${selectedJobForAttachments.id}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const newAttachment = await response.json();
        setAttachments(prev => [...prev, newAttachment]);
        event.target.value = '';
        setUploadDocumentDate('');
        toast.success('File uploaded successfully!');
      } else {
        toast.error('Error uploading file');
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error('Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteAttachment = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;

    try {
      await apiRequest(`/api/jobs/attachments/${attachmentId}`, { method: 'DELETE' });
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      toast.success('Attachment deleted!');
    } catch (err) {
      console.error("Error deleting attachment:", err);
      toast.error('Error deleting attachment');
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/files/download/${attachment.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
        toast.error('Error downloading file');
      }
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error('Error downloading file');
    }
  };

  const previewAttachmentFile = async (attachment) => {
    try {
      setPreviewLoading(true);
      setPreviewAttachment(attachment);
      
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/jobs/attachments/${attachment.id}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const blob = await response.blob();
        
        if (contentType?.includes('sheet') || attachment.fileName?.match(/\.(xlsx|xls)$/i)) {
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetNames = workbook.SheetNames;
          const firstSheet = workbook.Sheets[sheetNames[0]];
          const data = XLSX.utils.sheet_to_json(firstSheet);
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          
          setPreviewSheetNames(sheetNames);
          setCurrentPreviewSheet(0);
          setPreviewSheetData({ data, columns, workbook });
          setPreviewContent({
            type: 'spreadsheet',
            data: data,
            columns: columns,
            workbook: workbook,
            sheetNames: sheetNames
          });
          setShowPreviewModal(true);
        } else {
          const url = URL.createObjectURL(blob);
          setPreviewContent({ type: contentType, url: url });
          setShowPreviewModal(true);
        }
      }
    } catch (err) {
      console.error("Error previewing file:", err);
      toast.error('Cannot preview this file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const canPreviewFile = (attachment) => {
    const previewable = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'text/csv'];
    return previewable.some(type => attachment.fileType?.includes(type)) ||
           attachment.fileName?.match(/\.(xlsx|xls)$/i);
  };

  const openTimesheetForJob = (job) => {
    localStorage.setItem('selectedJobForTimesheet', job.id.toString());
    navigate(`/timesheets?jobId=${job.id}`);
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const BillingDayDropdown = () => {
    const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Billing Day of Month
        </label>
        <select
          value={jobForm.billingAnchorDay}
          onChange={(e) => {
            const value = e.target.value;
            setJobForm({ 
              ...jobForm, 
              billingAnchorDay: value,
              billingCycle: value ? 'MONTHLY' : jobForm.billingCycle
            });
          }}
          className="w-full p-2 border border-gray-300 rounded-lg"
        >
          <option value="">-- Select Day of Month --</option>
          {dayOptions.map(day => (
            <option key={day} value={day}>
              {day}{getDaySuffix(day)} of every month
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Select a day - billing will occur on that day EVERY month
        </p>
      </div>
    );
  };

  const ReminderConfigPanel = () => {
    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const periodOptions = ['AM', 'PM'];

    const emailList = jobForm.billingReminderEmails 
      ? jobForm.billingReminderEmails.split(',').map(email => email.trim()).filter(email => email)
      : [];

    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
            <AlarmClock size={18} className="text-purple-600" />
            Billing Reminder Schedule
          </h4>
          <button
            type="button"
            onClick={() => setShowReminderConfig(!showReminderConfig)}
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            {showReminderConfig ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {showReminderConfig && (
          <div className="space-y-4 mt-4">
            <div className="border-b border-gray-200 pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <ClockIcon size={16} />
                Reminder Send Time
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <select
                    value={jobForm.reminderTimeHour}
                    onChange={(e) => setJobForm({...jobForm, reminderTimeHour: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {hourOptions.map(hour => (
                      <option key={hour} value={hour}>{hour.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hour</p>
                </div>
                
                <span className="text-xl font-bold text-gray-400">:</span>
                
                <div className="flex-1">
                  <select
                    value={jobForm.reminderTimeMinute}
                    onChange={(e) => setJobForm({...jobForm, reminderTimeMinute: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {minuteOptions.map(minute => (
                      <option key={minute} value={minute}>{minute.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Minute</p>
                </div>
                
                <div className="flex-1">
                  <select
                    value={jobForm.reminderTimePeriod}
                    onChange={(e) => setJobForm({...jobForm, reminderTimePeriod: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {periodOptions.map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Period</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                ⏰ Reminders will be sent at {jobForm.reminderTimeHour}:{String(jobForm.reminderTimeMinute).padStart(2, '0')} {jobForm.reminderTimePeriod}
              </p>
            </div>

            {jobForm.billingReminderEnabled && (
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail size={16} className="text-green-600" />
                    Email Recipients ({emailList.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEmailList(!showEmailList)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {showEmailList ? 'Hide List' : 'Show List'}
                  </button>
                </div>
                {showEmailList && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {emailList.map((email, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-1 rounded bg-gray-50">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700">{email}</span>
                      </div>
                    ))}
                    {emailList.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No email recipients configured</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Bell size={16} />
                  Enable Advance Reminders
                </label>
                <input
                  type="checkbox"
                  checked={jobForm.enableAdvanceReminders}
                  onChange={(e) => setJobForm({...jobForm, enableAdvanceReminders: e.target.checked})}
                  className="h-4 w-4 text-purple-600"
                />
              </div>
              
              {jobForm.enableAdvanceReminders && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder Days Before Due
                  </label>
                  <input
                    type="text"
                    value={jobForm.reminderDaysBefore}
                    onChange={(e) => setJobForm({...jobForm, reminderDaysBefore: e.target.value})}
                    placeholder="7,3,1"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated days (e.g., 7,3,1 sends reminders 7, 3, and 1 day before)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setJobForm({...jobForm, reminderDaysBefore: '7,3,1'})}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      7,3,1 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobForm({...jobForm, reminderDaysBefore: '5,2'})}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      5,2 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobForm({...jobForm, reminderDaysBefore: '3,1'})}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      3,1 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobForm({...jobForm, reminderDaysBefore: '1'})}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      1 day only
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Bell size={16} />
                  Enable Overdue Reminders
                </label>
                <input
                  type="checkbox"
                  checked={jobForm.enableOverdueReminders}
                  onChange={(e) => setJobForm({...jobForm, enableOverdueReminders: e.target.checked})}
                  className="h-4 w-4 text-red-600"
                />
              </div>
              
              {jobForm.enableOverdueReminders && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overdue Reminder Days
                  </label>
                  <select
                    value={jobForm.overdueReminderDays}
                    onChange={(e) => setJobForm({...jobForm, overdueReminderDays: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="1">1 day after due date</option>
                    <option value="2">2 days after due date</option>
                    <option value="3">3 days after due date</option>
                    <option value="5">5 days after due date</option>
                    <option value="7">7 days after due date</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Send reminder this many days after the due date if billing is not completed
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700">
                <strong>📋 Reminder Schedule Summary:</strong><br/>
                {jobForm.billingReminderEnabled ? (
                  <>
                    ✓ Reminders will be sent to: {jobForm.billingReminderEmails || 'No emails configured'}<br/>
                    ✓ Send time: {jobForm.reminderTimeHour}:{String(jobForm.reminderTimeMinute).padStart(2, '0')} {jobForm.reminderTimePeriod}<br/>
                    {jobForm.enableAdvanceReminders && (
                      <>✓ Advance reminders: {jobForm.reminderDaysBefore} days before due date<br/></>
                    )}
                    {jobForm.enableOverdueReminders && (
                      <>✓ Overdue reminder: {jobForm.overdueReminderDays} day(s) after due date<br/></>
                    )}
                    {!jobForm.enableAdvanceReminders && !jobForm.enableOverdueReminders && (
                      <>⚠️ No reminders configured (only due date reminder will be sent)<br/></>
                    )}
                  </>
                ) : (
                  <>⚠️ Billing reminders are currently disabled. Enable above to start sending notifications.</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const JobDetailsModal = () => {
    const costCenter = jobCostCenter;
    const transactions = jobTransactions || [];
    
    const emailList = selectedJobDetails?.billingReminderEmails 
      ? selectedJobDetails.billingReminderEmails.split(',').map(email => email.trim()).filter(email => email)
      : [];
    
    const reminderDaysBeforeStr = getReminderDaysBeforeString(selectedJobDetails?.reminderDaysBefore);
    
    const getBillingDayDisplay = () => {
      if (selectedJobDetails?.billingAnchorDay) {
        return `${selectedJobDetails.billingAnchorDay}${getDaySuffix(selectedJobDetails.billingAnchorDay)} of every month`;
      }
      if (selectedJobDetails?.billOn15NextMonth) {
        return "15th of next month (from start date)";
      }
      return "Based on start date + billing cycle";
    };

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
                        ₵{selectedJobDetails?.budget ? parseFloat(selectedJobDetails.budget).toLocaleString() : '0.00'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Hourly Rate</label>
                      <p className="mt-1 text-lg font-semibold">
                        ₵{selectedJobDetails?.hourlyRate ? parseFloat(selectedJobDetails.hourlyRate).toLocaleString() : '0.00'}/hr
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Standard Hours</label>
                      <p className="mt-1 text-lg font-semibold flex items-center gap-1">
                        <Clock size={16} />
                        {selectedJobDetails?.standardWorkHours || 8}h/day
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-indigo-200">
                      <label className="block text-sm font-medium text-indigo-700 flex items-center gap-1">
                        <Clock size={14} />
                        Overtime Multiplier
                      </label>
                      <p className="mt-1 text-md font-semibold text-gray-800">
                        {selectedJobDetails?.overtimeMultiplier 
                          ? `${selectedJobDetails.overtimeMultiplier}x` 
                          : 'System Default (1.5x)'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Used to calculate overtime rate if no employee‑specific OT rate is set.
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

                <div className="bg-indigo-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                    <Calendar className="text-indigo-600" />
                    Billing Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-indigo-200">
                      <label className="block text-sm font-medium text-indigo-700 flex items-center gap-1">
                        <Calendar size={14} />
                        Billing Day
                      </label>
                      <p className="mt-1 text-md font-semibold text-gray-800">
                        {getBillingDayDisplay()}
                      </p>
                      {selectedJobDetails?.billingAnchorDay && (
                        <p className="text-xs text-gray-500 mt-1">
                          Bills every month on the {selectedJobDetails.billingAnchorDay}{getDaySuffix(selectedJobDetails.billingAnchorDay)}
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-indigo-200">
                      <label className="block text-sm font-medium text-indigo-700 flex items-center gap-1">
                        <Calendar size={14} />
                        Next Billing Date
                      </label>
                      <p className="mt-1 text-md font-semibold text-gray-800">
                        {selectedJobDetails?.nextBillingDate 
                          ? new Date(selectedJobDetails.nextBillingDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : 'Not scheduled'}
                      </p>
                      {selectedJobDetails?.nextBillingDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.ceil((new Date(selectedJobDetails.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24))} days from today
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-indigo-200">
                      <label className="block text-sm font-medium text-indigo-700 flex items-center gap-1">
                        <Clock size={14} />
                        Reminder Time
                      </label>
                      <p className="mt-1 text-md font-semibold text-gray-800">
                        {(() => {
                          const hour24 = selectedJobDetails?.reminderTimeHour ?? 8;
                          const minute = selectedJobDetails?.reminderTimeMinute ?? 0;
                          let hour12 = hour24 % 12;
                          if (hour12 === 0) hour12 = 12;
                          const period = hour24 >= 12 ? 'PM' : 'AM';
                          const minuteStr = minute.toString().padStart(2, '0');
                          return `${hour12}:${minuteStr} ${period}`;
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reminders sent at this time on scheduled days
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-indigo-200">
                      <label className="block text-sm font-medium text-indigo-700 flex items-center gap-1">
                        <Bell size={14} />
                        Reminder Status
                      </label>
                      <p className="mt-1">
                        {selectedJobDetails?.billingReminderEnabled ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            ✗ Disabled
                          </span>
                        )}
                      </p>
                      {selectedJobDetails?.billingReminderEnabled && (
                        <div className="mt-2 text-xs text-gray-600">
                          <div>• Advance: {selectedJobDetails?.enableAdvanceReminders ? 'Yes' : 'No'}</div>
                          {selectedJobDetails?.enableAdvanceReminders && (
                            <div>• Days before: {reminderDaysBeforeStr}</div>
                          )}
                          <div>• Overdue: {selectedJobDetails?.enableOverdueReminders ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {emailList.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center gap-2">
                      <Mail className="text-green-600" />
                      Billing Reminder Emails ({emailList.length})
                    </h3>
                    <div className="space-y-2">
                      {emailList.map((email, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-green-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700">{email}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 mt-3">
                      These recipients will receive billing reminder emails
                    </p>
                  </div>
                )}

                {(selectedJobDetails?.enableAdvanceReminders || selectedJobDetails?.enableOverdueReminders) && (
                  <div className="bg-purple-50 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-purple-800 mb-4 flex items-center gap-2">
                      <AlarmClock className="text-purple-600" />
                      Reminder Schedule Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedJobDetails?.enableAdvanceReminders && (
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <label className="block text-sm font-medium text-purple-700">Advance Reminders</label>
                          <p className="mt-1 text-md font-semibold text-gray-800">
                            {reminderDaysBeforeStr} days before due date
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Reminders sent {reminderDaysBeforeStr} days prior to billing date
                          </p>
                        </div>
                      )}
                      {selectedJobDetails?.enableOverdueReminders && (
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <label className="block text-sm font-medium text-purple-700">Overdue Reminders</label>
                          <p className="mt-1 text-md font-semibold text-gray-800">
                            {selectedJobDetails?.overdueReminderDays || 1} day(s) after due date
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Reminder sent if billing is not completed by due date
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                            ₵{costCenter.budget?.toLocaleString() || '0.00'}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-700">Spent</div>
                          <div className="text-2xl font-bold text-red-600">
                            ₵{costCenter.spentAmount?.toLocaleString() || '0.00'}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-700">Remaining</div>
                          <div className="text-2xl font-bold text-green-600">
                            ₵{((costCenter.budget || 0) - (costCenter.spentAmount || 0))?.toLocaleString() || '0.00'}
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
                                    ₵{transaction.amount?.toFixed(2)}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {jobEmployees.map(employee => {
                        const rates = jobDetailsRates[employee.id] || { normalRate: 0, overtimeRate: 0 };
                        return (
                          <div
                            key={employee.id}
                            className="bg-white border border-green-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-800">
                                  {employee.firstName} {employee.lastName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {employee.jobPosition}
                                </p>
                                <p className="text-sm text-gray-500">
                                  ID: {employee.employeeId}
                                </p>
                                <div className="mt-2 text-sm text-gray-700 border-t border-gray-100 pt-2">
                                  <div className="flex gap-4">
                                    <span><strong>NH Rate:</strong> ₵{rates.normalRate?.toFixed(2) || '0.00'}</span>
                                    <span><strong>OT Rate:</strong> ₵{rates.overtimeRate?.toFixed(2) || '0.00'}</span>
                                  </div>
                                </div>
                              </div>
                              {selectedJobDetails?.supervisor?.id === employee.id && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                  Supervisor
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      No employees assigned
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
              <>
                <button
                  onClick={() => sendManualBillingReminder(selectedJobDetails.id, selectedJobDetails.name)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Send size={16} />
                  Send Reminder Now
                </button>
                <button
                  onClick={() => handleEditJob(selectedJobDetails)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Job
                </button>
              </>
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

  const ExcelPreviewModal = () => {
    const [currentSheet, setCurrentSheet] = useState(0);
    const [sheetData, setSheetData] = useState(null);
    const [sheetNames, setSheetNames] = useState([]);

    useEffect(() => {
      if (previewContent?.workbook) {
        const workbook = previewContent.workbook;
        const names = workbook.SheetNames;
        setSheetNames(names);
        
        const sheet = workbook.Sheets[names[currentSheet]];
        const data = XLSX.utils.sheet_to_json(sheet);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        setSheetData({ data, columns });
      } else if (previewContent?.data) {
        setSheetData({
          data: previewContent.data,
          columns: previewContent.columns
        });
        if (previewContent.sheetNames) {
          setSheetNames(previewContent.sheetNames);
        }
      }
    }, [previewContent, currentSheet]);

    if (!sheetData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {previewAttachment?.fileName}
              </h2>
              {sheetNames.length > 1 && (
                <select
                  value={currentSheet}
                  onChange={(e) => setCurrentSheet(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  {sheetNames.map((name, idx) => (
                    <option key={idx} value={idx}>Sheet: {name}</option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={() => {
                setShowPreviewModal(false);
                setPreviewAttachment(null);
                setPreviewContent(null);
              }}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {sheetData.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {sheetData.columns.map((column, idx) => (
                        <th
                          key={idx}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sheetData.data.map((row, rowIdx) => (
                      <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {sheetData.columns.map((column, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200"
                          >
                            {row[column] !== undefined && row[column] !== null 
                              ? String(row[column]) 
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-96 text-center">
                <FileText size={64} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No data found in spreadsheet
                </h3>
                <p className="text-gray-500">
                  The Excel file appears to be empty or has no readable data.
                </p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
            <div className="text-sm text-gray-600">
              Rows: {sheetData.data.length} | Columns: {sheetData.columns.length}
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
  };

  const PreviewModal = () => {
    if (previewContent?.type?.includes('sheet') || 
        previewContent?.type?.includes('spreadsheet') ||
        (previewAttachment?.fileName?.match(/\.(xlsx|xls|xlsm|xlsb|ods)$/i))) {
      return <ExcelPreviewModal />;
    }

    return (
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
                {previewContent.type?.includes('pdf') && (
                  <embed
                    src={previewContent.url}
                    type="application/pdf"
                    className="w-full h-full min-h-[70vh]"
                    title={previewAttachment.fileName}
                  />
                )}
                
                {(previewContent.type?.includes('image/jpeg') || 
                  previewContent.type?.includes('image/png') || 
                  previewContent.type?.includes('image/gif')) && (
                  <div className="flex justify-center items-center h-full">
                    <img
                      src={previewContent.url}
                      alt={previewAttachment.fileName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                
                {(previewContent.type?.includes('text/plain') || 
                  previewContent.type?.includes('text/csv') || 
                  previewContent.type?.includes('text/html')) && (
                  <div className="h-full">
                    <div className="bg-gray-800 text-gray-100 p-4 h-full overflow-auto font-mono text-sm">
                      <pre>{previewContent.content || 'Loading text content...'}</pre>
                    </div>
                  </div>
                )}
                
                {!previewContent.type?.includes('pdf') && 
                 !previewContent.type?.includes('image/') && 
                 !previewContent.type?.includes('text/') && 
                 !previewContent.type?.includes('sheet') && 
                 !previewContent.type?.includes('spreadsheet') && (
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
  };

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

                    <BillingDayDropdown />

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={jobForm.billingReminderEnabled}
                        onChange={(e) => setJobForm({ ...jobForm, billingReminderEnabled: e.target.checked })}
                        disabled={loading}
                        className="h-4 w-4"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Enable Billing Reminder Emails
                      </label>
                    </div>

                    {jobForm.billingReminderEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Billing Reminder Emails (comma-separated)
                        </label>
                        <textarea
                          value={jobForm.billingReminderEmails}
                          onChange={(e) => setJobForm({ ...jobForm, billingReminderEmails: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          rows="2"
                          disabled={loading}
                          placeholder="finance@company.com, admin@company.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter email addresses separated by commas
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Next Billing Date (Auto-calculated, can override)
                      </label>
                      <input
                        type="date"
                        value={jobForm.nextBillingDate || ''}
                        onChange={(e) => setJobForm({ ...jobForm, nextBillingDate: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={loading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Budget (₵)</label>
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
                        <label className="block text-sm font-medium text-gray-700">Hourly Rate (₵)</label>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Overtime Multiplier</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={jobForm.overtimeMultiplier}
                        onChange={(e) => setJobForm({...jobForm, overtimeMultiplier: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., 1.5 (defaults to system setting)"
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use the global system default.
                      </p>
                    </div>

                    <ReminderConfigPanel />

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
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : (editingJob ? 'Update Job' : 'Create Job')}
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
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {assignedEmployees.map(employee => {
                          const rates = jobEmployeeRates[employee.id] || { normalRate: 0, overtimeRate: 0 };
                          return (
                            <div key={employee.id} className={`flex flex-col p-3 border rounded-lg bg-blue-50 border-gray-200`}>
                              <div className="flex justify-between items-center">
                                <div className="font-medium flex items-center gap-2">
                                  {employee.firstName} {employee.lastName}
                                  {employee.isSupervisor && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                      <Crown size={12} />
                                      Supervisor
                                    </span>
                                  )}
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
                              <div className="text-sm text-gray-500 mb-2">{employee.jobPosition} • {employee.employeeId}</div>
                              <div className="flex gap-4 items-end">
                                <div>
                                  <label className="text-xs font-medium text-gray-700">NH Rate</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={rates.normalRate}
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      setJobEmployeeRates(prev => ({
                                        ...prev,
                                        [employee.id]: { ...prev[employee.id], normalRate: newVal }
                                      }));
                                    }}
                                    className="w-24 p-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700">OT Rate</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={rates.overtimeRate}
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      setJobEmployeeRates(prev => ({
                                        ...prev,
                                        [employee.id]: { ...prev[employee.id], overtimeRate: newVal }
                                      }));
                                    }}
                                    className="w-24 p-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {assignedEmployees.length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No employees assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h4 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
                    <Settings size={16} />
                    Bulk Apply Rates to All Assigned Employees
                  </h4>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">NH Rate (₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 50"
                        value={bulkNormalRate}
                        onChange={(e) => setBulkNormalRate(e.target.value)}
                        className="w-24 p-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">OT Rate (₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 75"
                        value={bulkOvertimeRate}
                        onChange={(e) => setBulkOvertimeRate(e.target.value)}
                        className="w-24 p-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <button
                      onClick={applyBulkRates}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Apply to {assignedEmployees.length} Employees
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This will override the rates for all currently assigned employees. You can still edit individual rates below.
                  </p>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                  <button
                    onClick={saveEmployeeRates}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Rates
                  </button>
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
                      Document Date
                    </label>
                    <input
                      type="date"
                      value={uploadDocumentDate}
                      onChange={(e) => setUploadDocumentDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg mb-4"
                      required
                    />
                    <p className="text-xs text-gray-500 mb-4">
                      The date this document covers (e.g., the date of the scanned timesheet)
                    </p>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload New File (Max 10MB)
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="flex-1 p-2 border border-gray-300 rounded-lg"
                        disabled={uploadingFile}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.csv"
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
                const assignedCount = jobEmployeeCounts[job.id] || 0;
                
                const supervisor = employees.find(emp => emp.isSupervisor && emp.job?.id === job.id) || 
                                  (job.supervisor ? {
                                    firstName: job.supervisor.firstName,
                                    lastName: job.supervisor.lastName
                                  } : null);

                const jobCostCenterItem = costCenters.find(cc => cc.job?.id === job.id);
                const budget = jobCostCenterItem?.budget || job.budget || 0;
                
                const { hour: displayHour, period: displayPeriod } = convertTo12Hour(job.reminderTimeHour || 8);
                const reminderTimeDisplay = `${displayHour}:${String(job.reminderTimeMinute || 0).padStart(2, '0')} ${displayPeriod}`;
                
                const emailList = job.billingReminderEmails 
                  ? job.billingReminderEmails.split(',').map(email => email.trim()).filter(email => email).slice(0, 2)
                  : [];
                const hasMoreEmails = job.billingReminderEmails && typeof job.billingReminderEmails === 'string' && job.billingReminderEmails.split(',').length > 2;

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
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">{job.description || 'No description provided'}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building size={16} />
                          <span className="font-medium">Client:</span>
                          <span>{job.client}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span className="font-medium">Period:</span>
                          <span>{job.startDate ? new Date(job.startDate).toLocaleDateString() : 'N/A'} - {job.endDate ? new Date(job.endDate).toLocaleDateString() : 'Ongoing'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} />
                          <span className="font-medium">Budget:</span>
                          <span>₵{budget.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span className="font-medium">Standard Hours:</span>
                          <span>{job.standardWorkHours || 8}h/day</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span className="font-medium">OT Multiplier:</span>
                          <span>{job.overtimeMultiplier ? `${job.overtimeMultiplier}x` : 'Default (1.5x)'}</span>
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
                        
                        {job.nextBillingDate && (
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-orange-600" />
                            <span className="font-medium text-orange-600">Next Billing:</span>
                            <span className="text-orange-600">{new Date(job.nextBillingDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {job.billingReminderEnabled && (
                          <div className="mt-2 p-2 bg-purple-50 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-purple-600">
                              <AlarmClock size={12} />
                              <span>Reminders at {reminderTimeDisplay}</span>
                            </div>
                            {emailList.length > 0 && (
                              <div className="flex items-center gap-2 text-xs text-purple-600 mt-1">
                                <Mail size={12} />
                                <span>
                                  Sending to: {emailList.join(', ')}
                                  {hasMoreEmails && ` +${typeof job.billingReminderEmails === 'string' ? job.billingReminderEmails.split(',').length - 2 : 0} more`}
                                </span>
                              </div>
                            )}
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
                        {job.billingReminderEnabled && (
                          <button
                            onClick={() => sendManualBillingReminder(job.id, job.name)}
                            className="flex-1 min-w-[100px] text-center px-3 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Send size={14} />
                            Send Reminder
                          </button>
                        )}
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