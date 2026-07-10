import React, { useState, useEffect, useRef } from 'react';
import MainSidebar from '../mainSidebar';
import Header from '../../../components/Header';
import EmailSettings from '../../../components/settings/EmailSettings';

const CategoryApproverRow = ({ category, onMessage, API_BASE_URL, getToken, loadAllSettings }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    useCustomApprovers: category.useCustomApprovers || false,
    supervisorEmails: category.supervisorEmails || '',
    plannerEmails: category.plannerEmails || '',
    hrEmails: category.hrEmails || ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...category,
          useCustomApprovers: editData.useCustomApprovers,
          supervisorEmails: editData.supervisorEmails,
          plannerEmails: editData.plannerEmails,
          hrEmails: editData.hrEmails
        })
      });
      
      if (response.ok) {
        onMessage('success', `Approval routing updated for ${category.name}`);
        await loadAllSettings();
        setIsEditing(false);
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating category approvers:', error);
      onMessage('error', 'Failed to update approval routing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{category.name}</div>
        <div className="text-xs text-gray-500">{category.employeeCount || 0} employees</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={editData.useCustomApprovers}
              onChange={(e) => setEditData(prev => ({ ...prev, useCustomApprovers: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">Enable</span>
          </label>
        ) : (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            category.useCustomApprovers 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {category.useCustomApprovers ? 'Custom' : 'Global'}
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.supervisorEmails}
            onChange={(e) => setEditData(prev => ({ ...prev, supervisorEmails: e.target.value }))}
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="email1@company.com, email2@company.com"
            disabled={!editData.useCustomApprovers}
          />
        ) : (
          <div className="text-sm text-gray-600 truncate max-w-xs" title={category.supervisorEmails}>
            {category.useCustomApprovers && category.supervisorEmails ? (
              <div>
                <span className="text-xs text-gray-500">📧 </span>
                {category.supervisorEmails.split(',').length} recipient(s)
              </div>
            ) : (
              <span className="text-gray-400 text-xs">Uses global settings</span>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.plannerEmails}
            onChange={(e) => setEditData(prev => ({ ...prev, plannerEmails: e.target.value }))}
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="email1@company.com, email2@company.com"
            disabled={!editData.useCustomApprovers}
          />
        ) : (
          <div className="text-sm text-gray-600 truncate max-w-xs" title={category.plannerEmails}>
            {category.useCustomApprovers && category.plannerEmails ? (
              <div>
                <span className="text-xs text-gray-500">📋 </span>
                {category.plannerEmails.split(',').length} recipient(s)
              </div>
            ) : (
              <span className="text-gray-400 text-xs">Uses global settings</span>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.hrEmails}
            onChange={(e) => setEditData(prev => ({ ...prev, hrEmails: e.target.value }))}
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="email1@company.com, email2@company.com"
            disabled={!editData.useCustomApprovers}
          />
        ) : (
          <div className="text-sm text-gray-600 truncate max-w-xs" title={category.hrEmails}>
            {category.useCustomApprovers && category.hrEmails ? (
              <div>
                <span className="text-xs text-gray-500">👥 </span>
                {category.hrEmails.split(',').length} recipient(s)
              </div>
            ) : (
              <span className="text-gray-400 text-xs">Uses global settings</span>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {category.useCustomApprovers ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Custom Routing
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Inherited
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-green-600 hover:text-green-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-900"
          >
            Configure
          </button>
        )}
      </td>
    </tr>
  );
};

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    weekendDays: [0, 6],
    doubleTimeOnSunday: false,
    timeAndHalfAfter8Hours: false,
    weekendRate: 1.0,
    holidayRate: 1.0,
    holidays: [],
    jobPositions: [],
    categories: [],
    specialWeekends: [],
    defaultOvertimeMultiplier: 1.5,
    sundayOvertimeMultiplier: 2.0,
    holidayOvertimeMultiplier: 2.5,
    enableTimeAndHalfAfter8Hours: true,
    timeAndHalfMultiplier: 1.5,
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    employeeCategories: '',
    pensionRate: 0,
    socialSecurityRate: 0,
    taxRate: 0,
    lateArrivalTime: '09:00',
    withholdingTaxEnabled: false,
    withholdingTaxRate: 15.0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [emailSubTab, setEmailSubTab] = useState('leaves');

  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    recurring: false,
    payMultiplier: 1.0
  });
  const [jobPositionForm, setJobPositionForm] = useState({
    name: '',
    category: '',
    description: '',
    baseRate: 0,
    standardWorkHours: 8,
    grades: []
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    standardRateHours: 8,
    workStartTime: '09:00',
    useNonTaxableAllowances: false,
    excludeWeekendsFromLeave: true,
    annualLeaveDays: 20,
    skipAutoAbsent: false,
    applyWithholdingTax: false,
    supervisorEmails: '',
    plannerEmails: '',
    hrEmails: '',
    useCustomApprovers: false
  });
  const [specialWeekendForm, setSpecialWeekendForm] = useState({
    name: '',
    date: '',
    rateMultiplier: 1.5
  });

  const [loanNotificationSettings, setLoanNotificationSettings] = useState({
    loanRequestRecipients: '',
    loanApprovalRecipients: '',
    loanRejectionRecipients: '',
    loanConsolidationRecipients: ''
  });
  const [savingLoanNotifications, setSavingLoanNotifications] = useState(false);

  const [leaveSettings, setLeaveSettings] = useState({
    maternityLeaveMonths: 3,
    paternityLeaveMonths: 1,
    nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study'],
    annualLeaveBalance: 20,
    excludeWeekendsForLeaveTypes: ['Annual', 'Casual', 'Study', 'Compassionate', 'Unpaid', 'Sabbatical']
  });

  const [loanSettings, setLoanSettings] = useState({
    maximumLoanLimit: 0
  });
  const [editingLoanSettings, setEditingLoanSettings] = useState(null);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanForm, setLoanForm] = useState({
    maximumLoanLimit: 0
  });

  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSpecialWeekend, setEditingSpecialWeekend] = useState(null);

  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSpecialWeekendForm, setShowSpecialWeekendForm] = useState(false);

  const [workflows, setWorkflows] = useState([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [workflowFormData, setWorkflowFormData] = useState({
    name: '',
    description: '',
    active: true,
    entityType: 'INVENTORY',
    conditionJson: '',
    steps: []
  });
  const [conditions, setConditions] = useState([]);

  const [availableRoles, setAvailableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };
  
  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    console.log("🖥️ Current hostname:", hostname);
    console.log("🔌 Current port:", port);

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🏠 Using LOCALHOST API URL");
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      console.log("🏠 Using LAN API URL");
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      console.log("🌐 Using PUBLIC API URL");
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    console.log("🌍 Using PUBLIC API URL (fallback)");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.hamburger-button')) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setUser({
            name: data.username,
            role: data.role.replace("ROLE_", "").toLowerCase(), 
            email: data.email
          });
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      if (!token) {
        console.warn('No JWT token found');
        setLoading(false);
        return;
      }

      const [systemRes, holidaysRes, positionsRes, categoriesRes, specialWeekendsRes, leaveSettingsRes, loanSettingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/settings/system`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/api/settings/holidays`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/api/settings/job-positions`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/api/settings/categories`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/api/settings/special-weekends`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/api/settings/leave`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/api/settings/loanSettings`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      ]);

      const systemSettings = systemRes.ok ? await systemRes.json() : {};
      const holidays = holidaysRes.ok ? await holidaysRes.json() : [];
      const jobPositions = positionsRes.ok ? await positionsRes.json() : [];
      const categories = categoriesRes.ok ? await categoriesRes.json() : [];
      const specialWeekends = specialWeekendsRes.ok ? await specialWeekendsRes.json() : [];
      const leaveSettingsData = leaveSettingsRes.ok ? await leaveSettingsRes.json() : {
        maternityLeaveMonths: 3,
        paternityLeaveMonths: 1,
        nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study'],
        annualLeaveBalance: 20
      };

      let loanSettingsData = { maximumLoanLimit: 0 };
      if (loanSettingsRes.ok) {
        const loanSettingsArray = await loanSettingsRes.json();
        if (loanSettingsArray.length > 0) {
          loanSettingsData = loanSettingsArray[0];
        }
      }

      const weekendDaysFromBackend = systemSettings.weekendDaysArray || [0, 6];
      
      setSettings(prev => ({
        ...prev,
        weekendDays: weekendDaysFromBackend,
        doubleTimeOnSunday: systemSettings.doubleTimeOnSunday || false,
        timeAndHalfAfter8Hours: systemSettings.timeAndHalfAfter8Hours || false,
        weekendRate: systemSettings.weekendRate || 1.0,
        holidayRate: systemSettings.holidayRate || 1.0,
        hourlyRate: systemSettings.hourlyRate || 10,
        overtimeHourlyRate: systemSettings.overtimeHourlyRate || 15,
        standardWorkHours: systemSettings.standardWorkHours || 8,
        defaultOvertimeMultiplier: systemSettings.defaultOvertimeMultiplier || 1.5,
        sundayOvertimeMultiplier: systemSettings.sundayOvertimeMultiplier || 2.0,
        holidayOvertimeMultiplier: systemSettings.holidayOvertimeMultiplier || 2.5,
        enableTimeAndHalfAfter8Hours: systemSettings.enableTimeAndHalfAfter8Hours !== undefined ? systemSettings.enableTimeAndHalfAfter8Hours : true,
        timeAndHalfMultiplier: systemSettings.timeAndHalfMultiplier || 1.5,
        lateArrivalTime: systemSettings.lateArrivalTime || '09:00',
        companyName: systemSettings.companyName || '',
        companyEmail: systemSettings.companyEmail || '',
        companyPhone: systemSettings.companyPhone || '',
        companyAddress: systemSettings.companyAddress || '',
        employeeCategories: systemSettings.employeeCategories 
          ? JSON.parse(systemSettings.employeeCategories) 
          : [],
        withholdingTaxEnabled: systemSettings.withholdingTaxEnabled || false,
        withholdingTaxRate: systemSettings.withholdingTaxRate || 15.0,
        pensionRate: systemSettings.pensionRate || 0,
        socialSecurityRate: systemSettings.socialSecurityRate || 0,
        taxRate: systemSettings.taxRate || 0,
        holidays: holidays,
        jobPositions: jobPositions,
        categories: categories,
        specialWeekends: specialWeekends
      }));

      setLeaveSettings(leaveSettingsData);
      setLoanSettings(loanSettingsData);

    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    setWorkflowLoading(true);
    try {
      const token = getToken();
      if (!token) {
        showMessage('error', 'No authentication token found');
        setWorkflowLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/settings/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          showMessage('error', 'Session expired. Please log in again.');
          setWorkflowLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setWorkflows(data);
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to load workflows: ' + err.message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const fetchRoles = async () => {
    const token = getToken();
    if (!token) return;
    setRolesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAvailableRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      showMessage('error', 'Could not load roles from server.');
    } finally {
      setRolesLoading(false);
    }
  };

  const resetWorkflowForm = () => {
    setWorkflowFormData({
      name: '',
      description: '',
      active: true,
      entityType: 'INVENTORY',
      conditionJson: '',
      steps: []
    });
    setConditions([]);
  };

  const addWorkflowStep = () => {
    setWorkflowFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepOrder: prev.steps.length,
          stepName: '',
          requiredRole: '',
          targetStatus: '',
          rejectStatus: '',
          requiresApproval: true,
          finalStep: false
        }
      ]
    }));
  };

  const updateWorkflowStep = (idx, field, value) => {
    const newSteps = [...workflowFormData.steps];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setWorkflowFormData({ ...workflowFormData, steps: newSteps });
  };

  const removeWorkflowStep = (idx) => {
    setWorkflowFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx)
    }));
  };

  const moveWorkflowStep = (idx, direction) => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === workflowFormData.steps.length - 1)) return;
    const newSteps = [...workflowFormData.steps];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    setWorkflowFormData({ ...workflowFormData, steps: newSteps });
  };

  const updateWorkflowConditions = (newConditions) => {
    setConditions(newConditions);
    setWorkflowFormData({
      ...workflowFormData,
      conditionJson: newConditions.length ? JSON.stringify(newConditions) : ''
    });
  };

  const addWorkflowCondition = () => {
    updateWorkflowConditions([
      ...conditions,
      { field: 'ppeRequest', operator: 'eq', value: false }
    ]);
  };

  const updateWorkflowCondition = (idx, field, value) => {
    const newConds = [...conditions];
    newConds[idx][field] = value;
    updateWorkflowConditions(newConds);
  };

  const removeWorkflowCondition = (idx) => {
    updateWorkflowConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleSaveWorkflow = async () => {
    const token = getToken();
    if (!token) {
      showMessage('error', 'No authentication token found');
      return;
    }

    const method = editingWorkflow ? 'PUT' : 'POST';
    const url = editingWorkflow
      ? `${API_BASE_URL}/api/settings/workflows/${editingWorkflow.id}`
      : `${API_BASE_URL}/api/settings/workflows`;

    const payload = {
      ...workflowFormData,
      steps: workflowFormData.steps.map((step, idx) => ({
        ...step,
        stepOrder: idx,
        finalStep: step.finalStep || false,
        requiresApproval: step.requiresApproval !== false,
        rejectStatus: step.rejectStatus || null
      }))
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Save failed');
      }
      showMessage('success', `Workflow ${editingWorkflow ? 'updated' : 'created'} successfully`);
      loadWorkflows();
      setShowWorkflowForm(false);
      setEditingWorkflow(null);
      resetWorkflowForm();
    } catch (err) {
      showMessage('error', 'Error: ' + err.message);
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    const token = getToken();
    if (!token) {
      showMessage('error', 'No authentication token found');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/workflows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Delete failed');
      showMessage('success', 'Workflow deleted');
      loadWorkflows();
    } catch (err) {
      showMessage('error', 'Error: ' + err.message);
    }
  };

  useEffect(() => {
    if (workflowFormData.conditionJson && workflowFormData.conditionJson.trim()) {
      try {
        setConditions(JSON.parse(workflowFormData.conditionJson));
      } catch (e) {
        setConditions([]);
      }
    } else {
      setConditions([]);
    }
  }, [workflowFormData.conditionJson]);

  useEffect(() => {
    if (activeTab === 'workflows') {
      loadWorkflows();
      fetchRoles();
    }
    if (activeTab === 'email') {
      loadLoanNotificationSettings();
    }
  }, [activeTab]);

  useEffect(() => {
    loadAllSettings();
    loadAttendanceScheduleSettings();
  }, []);

  const loadLoanNotificationSettings = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/loan-notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLoanNotificationSettings({
          loanRequestRecipients: data.loanRequestRecipients || '',
          loanApprovalRecipients: data.loanApprovalRecipients || '',
          loanRejectionRecipients: data.loanRejectionRecipients || '',
          loanConsolidationRecipients: data.loanConsolidationRecipients || ''
        });
      }
    } catch (error) {
      console.error('Error loading loan notification settings:', error);
    }
  };

  const saveLoanNotificationSettings = async () => {
    setSavingLoanNotifications(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/loan-notifications`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanNotificationSettings)
      });
      
      if (response.ok) {
        showMessage('success', 'Loan notification settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving loan notification settings:', error);
      showMessage('error', 'Failed to save loan notification settings');
    } finally {
      setSavingLoanNotifications(false);
    }
  };

  const handleLoanSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const method = editingLoanSettings ? 'PUT' : 'POST';
      const url = editingLoanSettings 
        ? `${API_BASE_URL}/api/settings/loanSettings/${editingLoanSettings.id}`
        : `${API_BASE_URL}/api/settings/loanSettings`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanForm)
      });

      if (response.ok) {
        showMessage('success', editingLoanSettings ? 'Loan settings updated successfully!' : 'Loan settings added successfully!');
        setLoanForm({ maximumLoanLimit: 0 });
        setEditingLoanSettings(null);
        setShowLoanForm(false);
        await loadAllSettings();
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to save loan settings: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving loan settings:', error);
      showMessage('error', `Failed to save loan settings: ${error.message}`);
    }
  };

  const handleEditLoanSettings = (settings) => {
    setLoanForm({ maximumLoanLimit: settings.maximumLoanLimit });
    setEditingLoanSettings(settings);
    setShowLoanForm(true);
  };

  const handleCancelLoanForm = () => {
    setShowLoanForm(false);
    setEditingLoanSettings(null);
    setLoanForm({ maximumLoanLimit: 0 });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSystemSettingsChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleWeekendDayToggle = (day) => {
    const currentDays = Array.isArray(settings.weekendDays) ? settings.weekendDays : [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    handleSystemSettingsChange('weekendDays', newDays);
  };

  const handleSaveSystemSettings = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const systemSettings = {
        hourlyRate: parseFloat(settings.hourlyRate) || 10,
        overtimeHourlyRate: parseFloat(settings.overtimeHourlyRate) || 15,
        standardWorkHours: parseInt(settings.standardWorkHours) || 8,
        weekendDays: Array.isArray(settings.weekendDays) && settings.weekendDays.length > 0 
          ? settings.weekendDays.map(day => parseInt(day)).filter(day => !isNaN(day))
          : [0, 6],
        doubleTimeOnSunday: Boolean(settings.doubleTimeOnSunday),
        timeAndHalfAfter8Hours: Boolean(settings.timeAndHalfAfter8Hours),
        weekendRate: parseFloat(settings.weekendRate) || 1.0,
        holidayRate: parseFloat(settings.holidayRate) || 1.0,
        defaultOvertimeMultiplier: parseFloat(settings.defaultOvertimeMultiplier) || 1.5,
        sundayOvertimeMultiplier: parseFloat(settings.sundayOvertimeMultiplier) || 2.0,
        holidayOvertimeMultiplier: parseFloat(settings.holidayOvertimeMultiplier) || 2.5,
        enableTimeAndHalfAfter8Hours: Boolean(settings.enableTimeAndHalfAfter8Hours),
        timeAndHalfMultiplier: parseFloat(settings.timeAndHalfMultiplier) || 1.5,
        lateArrivalTime: settings.lateArrivalTime || '09:00',
        companyName: settings.companyName || 'Your Company',
        companyEmail: settings.companyEmail || 'company@example.com',
        companyPhone: settings.companyPhone || '+233000000000',
        companyAddress: settings.companyAddress || 'Company Address',
        employeeCategories: Array.isArray(settings.employeeCategories) 
          ? settings.employeeCategories 
          : (settings.employeeCategories && typeof settings.employeeCategories === 'string' && settings.employeeCategories.startsWith('['))
              ? JSON.parse(settings.employeeCategories)
              : [settings.employeeCategories || 'General'],
        pensionRate: parseFloat(settings.pensionRate) || 5.0,
        socialSecurityRate: parseFloat(settings.socialSecurityRate) || 5.5,
        taxRate: parseFloat(settings.taxRate) || 10.0,
        withholdingTaxEnabled: settings.withholdingTaxEnabled || false,
        withholdingTaxRate: parseFloat(settings.withholdingTaxRate) || 15.0
      };

      const response = await fetch(`${API_BASE_URL}/api/settings/system`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings)
      });

      if (response.ok) {
        showMessage('success', 'System settings updated successfully!');
        await loadAllSettings();
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to update settings: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      showMessage('error', `Failed to update system settings: ${error.message}`);
    }
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingHoliday ? `${API_BASE_URL}/api/settings/holidays/${editingHoliday.id}` : `${API_BASE_URL}/api/settings/holidays`;
      const method = editingHoliday ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(holidayForm)
      });

      if (response.ok) {
        showMessage('success', editingHoliday ? 'Holiday updated successfully!' : 'Holiday added successfully!');
        setHolidayForm({ name: '', date: '', recurring: false, payMultiplier: 1.0 });
        setEditingHoliday(null);
        setShowHolidayForm(false);
        await loadAllSettings();
      } else {
        throw new Error('Failed to save holiday');
      }
    } catch (error) {
      console.error('Error saving holiday:', error);
      showMessage('error', 'Failed to save holiday');
    }
  };

  const handleEditHoliday = (holiday) => {
    setHolidayForm({
      name: holiday.name,
      date: holiday.date,
      recurring: holiday.recurring,
      payMultiplier: holiday.payMultiplier
    });
    setEditingHoliday(holiday);
    setShowHolidayForm(true);
  };

  const handleDeleteHoliday = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/settings/holidays/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          showMessage('success', 'Holiday deleted successfully!');
          await loadAllSettings();
        } else {
          throw new Error('Failed to delete holiday');
        }
      } catch (error) {
        console.error('Error deleting holiday:', error);
        showMessage('error', 'Failed to delete holiday');
      }
    }
  };

  const handleCancelHolidayForm = () => {
    setShowHolidayForm(false);
    setEditingHoliday(null);
    setHolidayForm({ name: '', date: '', recurring: false, payMultiplier: 1.0 });
  };

  const handleJobPositionSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingPosition ? `${API_BASE_URL}/api/settings/job-positions/${editingPosition.id}` : `${API_BASE_URL}/api/settings/job-positions`;
      const method = editingPosition ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobPositionForm)
      });

      if (response.ok) {
        showMessage('success', editingPosition ? 'Job position updated successfully!' : 'Job position added successfully!');
        setJobPositionForm({ name: '', category: '', description: '', baseRate: 0, standardWorkHours: 8, grades: [] });
        setEditingPosition(null);
        setShowPositionForm(false);
        await loadAllSettings();
      } else {
        throw new Error('Failed to save job position');
      }
    } catch (error) {
      console.error('Error saving job position:', error);
      showMessage('error', 'Failed to save job position');
    }
  };

  const handleEditPosition = (position) => {
    setJobPositionForm({
      name: position.name,
      category: position.category,
      description: position.description,
      baseRate: position.baseRate,
      standardWorkHours: position.standardWorkHours,
      grades: position.grades || []
    });
    setEditingPosition(position);
    setShowPositionForm(true);
  };

  const handleDeletePosition = async (id) => {
    if (window.confirm('Are you sure you want to delete this job position?')) {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/settings/job-positions/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          showMessage('success', 'Job position deleted successfully!');
          await loadAllSettings();
        } else {
          throw new Error('Failed to delete job position');
        }
      } catch (error) {
        console.error('Error deleting job position:', error);
        showMessage('error', 'Failed to delete job position');
      }
    }
  };

  const handleCancelPositionForm = () => {
    setShowPositionForm(false);
    setEditingPosition(null);
    setJobPositionForm({ name: '', category: '', description: '', baseRate: 0, standardWorkHours: 8, grades: [] });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingCategory ? `${API_BASE_URL}/api/settings/categories/${editingCategory.id}` : `${API_BASE_URL}/api/settings/categories`;
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm)
      });

      if (response.ok) {
        showMessage('success', editingCategory ? 'Category updated successfully!' : 'Category added successfully!');
        setCategoryForm({ 
          name: '', 
          standardRateHours: 8, 
          workStartTime: '09:00', 
          useNonTaxableAllowances: false, 
          excludeWeekendsFromLeave: true, 
          annualLeaveDays: 20,
          skipAutoAbsent: false,
          applyWithholdingTax: false,
          supervisorEmails: '',
          plannerEmails: '',
          hrEmails: '',
          useCustomApprovers: false
        });
        setEditingCategory(null);
        setShowCategoryForm(false);
        await loadAllSettings();
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      showMessage('error', 'Failed to save category');
    }
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      name: category.name,
      standardRateHours: category.standardRateHours,
      workStartTime: category.workStartTime || '09:00',
      useNonTaxableAllowances: category.useNonTaxableAllowances || false,
      excludeWeekendsFromLeave: category.excludeWeekendsFromLeave !== false,
      annualLeaveDays: category.annualLeaveDays || 20,
      skipAutoAbsent: category.skipAutoAbsent || false,
      applyWithholdingTax: category.applyWithholdingTax || false,
      supervisorEmails: category.supervisorEmails || '',
      plannerEmails: category.plannerEmails || '',
      hrEmails: category.hrEmails || '',
      useCustomApprovers: category.useCustomApprovers || false
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This may affect job positions linked to it.')) {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/settings/categories/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          showMessage('success', 'Category deleted successfully!');
          await loadAllSettings();
        } else {
          throw new Error('Failed to delete category');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        showMessage('error', 'Failed to delete category');
      }
    }
  };

  const handleCancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({ 
      name: '', 
      standardRateHours: 8, 
      workStartTime: '09:00', 
      useNonTaxableAllowances: false, 
      excludeWeekendsFromLeave: true, 
      annualLeaveDays: 20,
      skipAutoAbsent: false,
      applyWithholdingTax: false,
      supervisorEmails: '',
      plannerEmails: '',
      hrEmails: '',
      useCustomApprovers: false
    });
  };

  const handleSpecialWeekendSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingSpecialWeekend ? `${API_BASE_URL}/api/settings/special-weekends/${editingSpecialWeekend.id}` : `${API_BASE_URL}/api/settings/special-weekends`;
      const method = editingSpecialWeekend ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(specialWeekendForm)
      });

      if (response.ok) {
        showMessage('success', editingSpecialWeekend ? 'Special weekend updated successfully!' : 'Special weekend added successfully!');
        setSpecialWeekendForm({ name: '', date: '', rateMultiplier: 1.5 });
        setEditingSpecialWeekend(null);
        setShowSpecialWeekendForm(false);
        await loadAllSettings();
      } else {
        throw new Error('Failed to save special weekend');
      }
    } catch (error) {
      console.error('Error saving special weekend:', error);
      showMessage('error', 'Failed to save special weekend');
    }
  };

  const handleEditSpecialWeekend = (specialWeekend) => {
    setSpecialWeekendForm({
      name: specialWeekend.name,
      date: specialWeekend.date,
      rateMultiplier: specialWeekend.rateMultiplier
    });
    setEditingSpecialWeekend(specialWeekend);
    setShowSpecialWeekendForm(true);
  };

  const handleDeleteSpecialWeekend = async (id) => {
    if (window.confirm('Are you sure you want to delete this special weekend?')) {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/settings/special-weekends/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          showMessage('success', 'Special weekend deleted successfully!');
          await loadAllSettings();
        } else {
          throw new Error('Failed to delete special weekend');
        }
      } catch (error) {
        console.error('Error deleting special weekend:', error);
        showMessage('error', 'Failed to delete special weekend');
      }
    }
  };

  const handleCancelSpecialWeekendForm = () => {
    setShowSpecialWeekendForm(false);
    setEditingSpecialWeekend(null);
    setSpecialWeekendForm({ name: '', date: '', rateMultiplier: 1.5 });
  };

  const handleSaveLeaveSettings = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/leave`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveSettings)
      });

      if (response.ok) {
        showMessage('success', 'Leave settings updated successfully!');
        await loadAllSettings();
      } else {
        throw new Error('Failed to update leave settings');
      }
    } catch (error) {
      console.error('Error updating leave settings:', error);
      showMessage('error', 'Failed to update leave settings');
    }
  };

  const [attendanceSchedule, setAttendanceSchedule] = useState({
    enabled: true,
    runTime: "00:30",
    skipCategories: []
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const loadAttendanceScheduleSettings = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/attendance-schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAttendanceSchedule({
          enabled: data.enabled !== undefined ? data.enabled : true,
          runTime: data.runTime || "00:30",
          skipCategories: data.skipCategories || []
        });
      }
    } catch (error) {
      console.error('Error loading attendance schedule:', error);
    }
  };

  const saveAttendanceScheduleSettings = async () => {
    setScheduleSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/attendance-schedule`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceSchedule)
      });
      
      if (response.ok) {
        showMessage('success', 'Attendance auto-mark schedule saved successfully!');
      } else {
        throw new Error('Failed to save schedule settings');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      showMessage('error', `Failed to save: ${error.message}`);
    } finally {
      setScheduleSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General Settings', icon: '⚙️' },
    { id: 'attendance', name: 'Attendance Auto-Mark', icon: '⏰' },
    { id: 'leave', name: 'Leave Settings', icon: '🏖️' },
    { id: 'loan', name: 'Loan Settings', icon: '💰' },
    { id: 'email', name: 'Email Notifications', icon: '📧' }, 
    { id: 'categories', name: 'Categories', icon: '📁' },
    { id: 'specialWeekends', name: 'Special Weekends', icon: '🎯' },
    { id: 'holidays', name: 'Holidays', icon: '🎉' },
    { id: 'positions', name: 'Job Positions', icon: '💼' },
    { id: 'workflows', name: 'Workflows', icon: '⚙️' }
  ];

  const importInputRefs = {
    general: useRef(null),
    leave: useRef(null),
    categories: useRef(null),
    specialWeekends: useRef(null),
    holidays: useRef(null),
    positions: useRef(null),
  };

  const downloadJson = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const safeJsonParse = async (file) => {
    const text = await file.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON file.');
    }
  };

  const getExportPayloadForTab = (tabId) => {
    switch (tabId) {
      case 'general':
        return {
          system: {
            hourlyRate: settings.hourlyRate,
            overtimeHourlyRate: settings.overtimeHourlyRate,
            standardWorkHours: settings.standardWorkHours,
            weekendDays: settings.weekendDays,
            doubleTimeOnSunday: settings.doubleTimeOnSunday,
            timeAndHalfAfter8Hours: settings.timeAndHalfAfter8Hours,
            weekendRate: settings.weekendRate,
            holidayRate: settings.holidayRate,
            defaultOvertimeMultiplier: settings.defaultOvertimeMultiplier,
            sundayOvertimeMultiplier: settings.sundayOvertimeMultiplier,
            holidayOvertimeMultiplier: settings.holidayOvertimeMultiplier,
            enableTimeAndHalfAfter8Hours: settings.enableTimeAndHalfAfter8Hours,
            timeAndHalfMultiplier: settings.timeAndHalfMultiplier,
            lateArrivalTime: settings.lateArrivalTime,
            companyName: settings.companyName,
            companyEmail: settings.companyEmail,
            companyPhone: settings.companyPhone,
            companyAddress: settings.companyAddress,
            employeeCategories: settings.employeeCategories,
            pensionRate: settings.pensionRate,
            socialSecurityRate: settings.socialSecurityRate,
            taxRate: settings.taxRate,
          }
        };
      case 'leave':
        return { leave: leaveSettings };
      case 'categories':
        return { categories: settings.categories || [] };
      case 'specialWeekends':
        return { specialWeekends: settings.specialWeekends || [] };
      case 'holidays':
        return { holidays: settings.holidays || [] };
      case 'positions':
        return { jobPositions: settings.jobPositions || [] };
      default:
        return {};
    }
  };

  const handleExportTab = (tabId) => {
    const payload = getExportPayloadForTab(tabId);
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`settings-${tabId}-${date}.json`, payload);
  };

  const handleImportClick = (tabId) => {
    const ref = importInputRefs[tabId];
    if (ref?.current) ref.current.click();
  };

  const upsertListItems = async (endpointBase, items, token) => {
    if (!Array.isArray(items)) throw new Error('Import payload must be an array.');
    for (const item of items) {
      const hasId = item && (item.id !== undefined && item.id !== null);
      const url = hasId ? `${API_BASE_URL}${endpointBase}/${item.id}` : `${API_BASE_URL}${endpointBase}`;
      const method = hasId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to import item into ${endpointBase}. Server said: ${t}`);
      }
    }
  };

  const handleImportFile = async (tabId, file) => {
    const token = getToken();
    if (!token) {
      showMessage('error', 'No JWT token found. Please log in again.');
      return;
    }
    try {
      const json = await safeJsonParse(file);
      if (tabId === 'general') {
        const system = json?.system;
        if (!system || typeof system !== 'object') throw new Error('Expected { "system": { ... } }.');
        const res = await fetch(`${API_BASE_URL}/api/settings/system`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(system),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Failed to import system settings: ${t}`);
        }
      }
      if (tabId === 'leave') {
        const leave = json?.leave;
        if (!leave || typeof leave !== 'object') throw new Error('Expected { "leave": { ... } }.');
        const res = await fetch(`${API_BASE_URL}/api/settings/leave`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(leave),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Failed to import leave settings: ${t}`);
        }
      }
      if (tabId === 'categories') {
        await upsertListItems('/api/settings/categories', json?.categories, token);
      }
      if (tabId === 'specialWeekends') {
        await upsertListItems('/api/settings/special-weekends', json?.specialWeekends, token);
      }
      if (tabId === 'holidays') {
        await upsertListItems('/api/settings/holidays', json?.holidays, token);
      }
      if (tabId === 'positions') {
        await upsertListItems('/api/settings/job-positions', json?.jobPositions, token);
      }
      showMessage('success', `Imported ${tabId} data successfully.`);
      await loadAllSettings();
    } catch (err) {
      console.error(err);
      showMessage('error', err.message || `Failed to import ${tabId} data.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'
        }`}
      >
        <Header
          toggleSidebar={toggleSidebar}
          user={user}
          onLogout={handleLogout}
        />

        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-gray-400">Settings</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your payroll system configuration, categories, weekends, holidays, and job positions
            </p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          <input ref={importInputRefs.general} type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleImportFile('general', file); }} />
          <input ref={importInputRefs.leave} type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleImportFile('leave', file); }} />
          <input ref={importInputRefs.categories} type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleImportFile('categories', file); }} />
          <input ref={importInputRefs.specialWeekends} type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleImportFile('specialWeekends', file); }} />
          <input ref={importInputRefs.holidays} type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleImportFile('holidays', file); }} />
          <input ref={importInputRefs.positions} type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleImportFile('positions', file); }} />

          <div className="border-b border-gray-200 mb-8 overflow-x-auto">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'general' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Payroll & System Settings</h3>
                <div className="flex gap-2 justify-end mb-4">
                  <button type="button" onClick={() => handleExportTab('general')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Export</button>
                  <button type="button" onClick={() => handleImportClick('general')} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Import</button>
                </div>
                <form onSubmit={handleSaveSystemSettings} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Weekend Days</label>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <button key={day} type="button" onClick={() => handleWeekendDayToggle(day)} className={`px-4 py-2 rounded-md text-sm font-medium ${settings.weekendDays.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Company Information</h4>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name</label>
                        <input type="text" id="companyName" value={settings.companyName || ''} onChange={(e) => handleSystemSettingsChange('companyName', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">Company Email</label>
                        <input type="email" id="companyEmail" value={settings.companyEmail || ''} onChange={(e) => handleSystemSettingsChange('companyEmail', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">Company Phone</label>
                        <input type="text" id="companyPhone" value={settings.companyPhone || ''} onChange={(e) => handleSystemSettingsChange('companyPhone', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Company Address</label>
                        <input type="text" id="companyAddress" value={settings.companyAddress || ''} onChange={(e) => handleSystemSettingsChange('companyAddress', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Withholding Tax Configuration</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="withholdingTaxEnabled"
                              checked={settings.withholdingTaxEnabled || false}
                              onChange={(e) => handleSystemSettingsChange('withholdingTaxEnabled', e.target.checked)}
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <label htmlFor="withholdingTaxEnabled" className="font-medium text-gray-900">
                              Enable Withholding Tax
                            </label>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 ml-6">
                            When enabled, eligible employees/categories will use withholding tax instead of standard PAYE
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label htmlFor="withholdingTaxRate" className="block text-sm font-medium text-gray-700">
                            Withholding Tax Rate (%)
                          </label>
                          <input 
                            type="number" 
                            step="0.1" 
                            id="withholdingTaxRate" 
                            value={settings.withholdingTaxRate || 0} 
                            onChange={(e) => handleSystemSettingsChange('withholdingTaxRate', parseFloat(e.target.value))} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500" 
                            min="0" 
                            max="100" 
                            disabled={!settings.withholdingTaxEnabled}
                          />
                          <p className="mt-1 text-sm text-gray-500">Tax rate applied to gross salary for withholding tax (e.g., 15% for contract workers)</p>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h5 className="text-sm font-medium text-yellow-800 mb-2">How Withholding Tax Works:</h5>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          <li>• Employees/Categories with "Apply Withholding Tax" checked will NOT have standard PAYE calculated</li>
                          <li>• Instead, withholding tax = (Gross Salary - SSNIT) × Withholding Tax Rate</li>
                          <li>• Useful for contractors, foreign workers, or special tax arrangements</li>
                          <li>• Employee-level setting overrides category setting</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Tax & Deductions</h4>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div>
                        <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                        <input type="number" step="0.01" id="taxRate" value={settings.taxRate || 0} onChange={(e) => handleSystemSettingsChange('taxRate', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label htmlFor="pensionRate" className="block text-sm font-medium text-gray-700">Pension Rate (%)</label>
                        <input type="number" step="0.01" id="pensionRate" value={settings.pensionRate || 0} onChange={(e) => handleSystemSettingsChange('pensionRate', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label htmlFor="socialSecurityRate" className="block text-sm font-medium text-gray-700">Social Security Rate (%)</label>
                        <input type="number" step="0.01" id="socialSecurityRate" value={settings.socialSecurityRate || 0} onChange={(e) => handleSystemSettingsChange('socialSecurityRate', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Overtime Multiplier Settings</h4>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label htmlFor="defaultOvertimeMultiplier" className="block text-sm font-medium text-gray-700">Default Overtime Multiplier</label>
                        <input type="number" step="0.1" id="defaultOvertimeMultiplier" value={settings.defaultOvertimeMultiplier || 1.5} onChange={(e) => handleSystemSettingsChange('defaultOvertimeMultiplier', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1.0" max="3.0" />
                        <p className="mt-1 text-sm text-gray-500">Regular overtime multiplier (e.g., 1.5x)</p>
                      </div>
                      <div>
                        <label htmlFor="sundayOvertimeMultiplier" className="block text-sm font-medium text-gray-700">Sunday Overtime Multiplier</label>
                        <input type="number" step="0.1" id="sundayOvertimeMultiplier" value={settings.sundayOvertimeMultiplier || 2.0} onChange={(e) => handleSystemSettingsChange('sundayOvertimeMultiplier', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1.0" max="3.0" />
                        <p className="mt-1 text-sm text-gray-500">Sunday overtime multiplier (e.g., 2.0x)</p>
                      </div>
                      <div>
                        <label htmlFor="holidayOvertimeMultiplier" className="block text-sm font-medium text-gray-700">Holiday Overtime Multiplier</label>
                        <input type="number" step="0.1" id="holidayOvertimeMultiplier" value={settings.holidayOvertimeMultiplier || 2.5} onChange={(e) => handleSystemSettingsChange('holidayOvertimeMultiplier', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1.0" max="3.0" />
                        <p className="mt-1 text-sm text-gray-500">Holiday overtime multiplier (e.g., 2.5x)</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="timeAndHalfMultiplier" className="block text-sm font-medium text-gray-700">Time & Half Multiplier</label>
                        <input type="number" step="0.1" id="timeAndHalfMultiplier" value={settings.timeAndHalfMultiplier || 1.5} onChange={(e) => handleSystemSettingsChange('timeAndHalfMultiplier', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1.0" max="3.0" />
                        <p className="mt-1 text-sm text-gray-500">Multiplier for time and half calculations</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="weekendRate" className="block text-sm font-medium text-gray-700">Weekend Pay Multiplier</label>
                      <input type="number" step="0.1" id="weekendRate" value={settings.weekendRate} onChange={(e) => handleSystemSettingsChange('weekendRate', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label htmlFor="holidayRate" className="block text-sm font-medium text-gray-700">Holiday Pay Multiplier</label>
                      <input type="number" step="0.1" id="holidayRate" value={settings.holidayRate} onChange={(e) => handleSystemSettingsChange('holidayRate', parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input type="checkbox" id="doubleTimeOnSunday" checked={settings.doubleTimeOnSunday} onChange={(e) => handleSystemSettingsChange('doubleTimeOnSunday', e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <label htmlFor="doubleTimeOnSunday" className="ml-2 block text-sm text-gray-900">Double Time on Sundays</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="timeAndHalfAfter8Hours" checked={settings.timeAndHalfAfter8Hours} onChange={(e) => handleSystemSettingsChange('timeAndHalfAfter8Hours', e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <label htmlFor="timeAndHalfAfter8Hours" className="ml-2 block text-sm text-gray-900">Time and Half After 8 Hours</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="enableTimeAndHalfAfter8Hours" checked={settings.enableTimeAndHalfAfter8Hours} onChange={(e) => handleSystemSettingsChange('enableTimeAndHalfAfter8Hours', e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <label htmlFor="enableTimeAndHalfAfter8Hours" className="ml-2 block text-sm text-gray-900">Enable Time and Half Multiplier</label>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Overtime Calculation Preview</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Regular overtime: {settings.hourlyRate} × {settings.defaultOvertimeMultiplier || 1.5} = ₵{(settings.hourlyRate * (settings.defaultOvertimeMultiplier || 1.5)).toFixed(2)} per hour</p>
                      <p>• Sunday overtime: {settings.hourlyRate} × {settings.sundayOvertimeMultiplier || 2.0} = ₵{(settings.hourlyRate * (settings.sundayOvertimeMultiplier || 2.0)).toFixed(2)} per hour</p>
                      <p>• Holiday overtime: {settings.hourlyRate} × {settings.holidayOvertimeMultiplier || 2.5} = ₵{(settings.hourlyRate * (settings.holidayOvertimeMultiplier || 2.5)).toFixed(2)} per hour</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Save Settings</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Email notification categories">
                  <button onClick={() => setEmailSubTab('attendance')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${emailSubTab === 'attendance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><span className="mr-2">⏰</span>Attendance Notifications</button>
                  <button onClick={() => setEmailSubTab('leaves')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${emailSubTab === 'leaves' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><span className="mr-2">🏖️</span>Leaves Notifications</button>
                  <button onClick={() => setEmailSubTab('payroll')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${emailSubTab === 'payroll' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><span className="mr-2">💰</span>Payroll Notifications</button>
                  <button onClick={() => setEmailSubTab('loans')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${emailSubTab === 'loans' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><span className="mr-2">💳</span>Loans Notifications</button>
                  <button onClick={() => setEmailSubTab('general')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${emailSubTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><span className="mr-2">⚙️</span>General Settings</button>
                </nav>
              </div>

              {emailSubTab === 'attendance' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4"><span className="text-2xl">⏰</span><h3 className="text-lg leading-6 font-medium text-gray-900">Attendance Email Notifications</h3></div>
                    <p className="text-sm text-gray-500 mb-6">Configure email notifications for attendance-related events</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">When to send attendance notifications</h4>
                        <div className="space-y-3">
                          <label className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300" /><span className="ml-2 text-sm text-gray-700">Employee marked as Absent</span></label>
                          <label className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300" /><span className="ml-2 text-sm text-gray-700">Employee marked as Late</span></label>
                          <label className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300" /><span className="ml-2 text-sm text-gray-700">Daily attendance summary</span></label>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Recipients</h4>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Send to</label><input type="text" className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="manager@company.com, hr@company.com" /><p className="mt-1 text-xs text-gray-500">Comma-separated email addresses</p></div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-6"><button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Attendance Settings</button></div>
                  </div>
                </div>
              )}

              {emailSubTab === 'leaves' && (
                <div className="space-y-6">
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4"><span className="text-2xl">🌍</span><h3 className="text-lg leading-6 font-medium text-gray-900">Global Leave Email Settings</h3></div>
                      <p className="text-sm text-gray-500 mb-6">These settings apply to all leave requests unless overridden by category-specific settings below.</p>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">Leave Request Notifications</h4>
                          <div className="space-y-3">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Default Approver Email(s)</label><input type="text" className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="approver1@company.com, approver2@company.com" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">CC Email(s)</label><input type="text" className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="hr@company.com, payroll@company.com" /></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                      <div className="flex items-center gap-2"><span className="text-xl">📋</span><h4 className="text-md font-semibold text-gray-800">Category-Based Leave Approval Routing</h4><span className="ml-auto text-xs text-gray-500">Overrides global settings</span></div>
                    </div>
                    {settings.categories && settings.categories.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <h4 className="mt-2 text-sm font-medium text-gray-900">No categories found</h4>
                        <p className="mt-1 text-sm text-gray-500">Create categories first in the Categories tab to configure leave approval routing.</p>
                        <button onClick={() => setActiveTab('categories')} className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Go to Categories Tab</button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Routing</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor Email(s)</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planner Email(s)</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HR Email(s)</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {settings.categories.map((category) => (
                              <CategoryApproverRow key={category.id} category={category} onMessage={showMessage} API_BASE_URL={API_BASE_URL} getToken={getToken} loadAllSettings={loadAllSettings} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 rounded-lg border border-blue-200">
                    <div className="px-4 py-3 bg-blue-100 border-b border-blue-200"><div className="flex items-center gap-2"><span className="text-xl">ℹ️</span><h4 className="text-sm font-semibold text-blue-900">How Leave Approval Routing Works</h4></div></div>
                    <div className="p-4"><div className="space-y-2 text-sm text-blue-800"><p>✓ When <strong>"Enable Custom Routing"</strong> is enabled for a category:</p><ul className="list-disc list-inside ml-4 space-y-1"><li>Leave requests go to the specified category approvers</li><li>Supervisor → Planner → HR approval chain</li></ul><p className="mt-2">✓ When disabled, uses <strong>Global Leave Email Settings</strong></p></div></div>
                  </div>
                </div>
              )}

              {emailSubTab === 'payroll' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4"><span className="text-2xl">💰</span><h3 className="text-lg leading-6 font-medium text-gray-900">Payroll Email Notifications</h3></div>
                    <p className="text-sm text-gray-500 mb-6">Configure email notifications for payroll-related events</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">When to send payroll notifications</h4>
                        <div className="space-y-3">
                          <label className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300" /><span className="ml-2 text-sm text-gray-700">Payroll processed successfully</span></label>
                          <label className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300" /><span className="ml-2 text-sm text-gray-700">Payslip generated</span></label>
                          <label className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300" /><span className="ml-2 text-sm text-gray-700">Payroll errors or warnings</span></label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-6"><button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Payroll Settings</button></div>
                  </div>
                </div>
              )}

              {emailSubTab === 'loans' && (
                <div className="space-y-6">
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4"><span className="text-2xl">📝</span><h3 className="text-lg leading-6 font-medium text-gray-900">Loan Request Notifications</h3></div>
                      <p className="text-sm text-gray-500 mb-6">Configure who receives notifications when employees submit loan requests</p>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Request Recipients</label>
                          <input type="text" value={loanNotificationSettings.loanRequestRecipients || ''} onChange={(e) => setLoanNotificationSettings(prev => ({ ...prev, loanRequestRecipients: e.target.value }))} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="finance@company.com, manager@company.com, hr@company.com" />
                          <p className="mt-1 text-xs text-gray-500">Comma-separated email addresses. These recipients will be notified when ANY employee submits a loan request.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4"><span className="text-2xl">✅</span><h3 className="text-lg leading-6 font-medium text-gray-900">Loan Approval & Rejection Notifications</h3></div>
                      <p className="text-sm text-gray-500 mb-6">Configure who receives notifications when loans are approved or rejected</p>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Approval Recipients</label>
                          <input type="text" value={loanNotificationSettings.loanApprovalRecipients || ''} onChange={(e) => setLoanNotificationSettings(prev => ({ ...prev, loanApprovalRecipients: e.target.value }))} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500" placeholder="finance@company.com, ceo@company.com" />
                          <p className="mt-1 text-xs text-gray-500">Recipients notified when loan requests are approved (in addition to the employee)</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Rejection Recipients</label>
                          <input type="text" value={loanNotificationSettings.loanRejectionRecipients || ''} onChange={(e) => setLoanNotificationSettings(prev => ({ ...prev, loanRejectionRecipients: e.target.value }))} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500" placeholder="hr@company.com, manager@company.com" />
                          <p className="mt-1 text-xs text-gray-500">Recipients notified when loan requests are rejected (in addition to the employee)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4"><span className="text-2xl">🔄</span><h3 className="text-lg leading-6 font-medium text-gray-900">Loan Consolidation Notifications</h3></div>
                      <p className="text-sm text-gray-500 mb-6">Configure notifications for loan consolidation events</p>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Consolidation Recipients</label>
                          <input type="text" value={loanNotificationSettings.loanConsolidationRecipients || ''} onChange={(e) => setLoanNotificationSettings(prev => ({ ...prev, loanConsolidationRecipients: e.target.value }))} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" placeholder="finance@company.com, accounting@company.com" />
                          <p className="mt-1 text-xs text-gray-500">Recipients notified when multiple loans are consolidated into one</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg border border-blue-200">
                    <div className="px-4 py-3 bg-blue-100 border-b border-blue-200"><div className="flex items-center gap-2"><span className="text-xl">ℹ️</span><h4 className="text-sm font-semibold text-blue-900">How Loan Notifications Work</h4></div></div>
                    <div className="p-4"><div className="space-y-2 text-sm text-blue-800"><p>✓ <strong>Loan Request Submitted:</strong> Employee receives confirmation email + configured recipients get notification</p><p>✓ <strong>Loan Approved:</strong> Employee receives approval email + configured recipients get notification</p><p>✓ <strong>Loan Rejected:</strong> Employee receives rejection email + configured recipients get notification</p><p>✓ <strong>Loan Consolidated:</strong> Employee receives consolidation details + configured recipients get notification</p><p className="mt-2 pt-2 border-t border-blue-200 text-xs">💡 All notifications include loan amount, repayment terms, and remaining balance information</p></div></div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={saveLoanNotificationSettings} disabled={savingLoanNotifications} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      {savingLoanNotifications ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</>) : 'Save Loan Notification Settings'}
                    </button>
                  </div>
                </div>
              )}

              {emailSubTab === 'general' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4"><span className="text-2xl">⚙️</span><h3 className="text-lg leading-6 font-medium text-gray-900">General Email Settings</h3></div>
                    <EmailSettings />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-6">
              {workflowLoading ? (
                <div className="text-center py-8">Loading workflows...</div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Inventory Request Workflows</h3>
                    <button
                      onClick={() => {
                        setEditingWorkflow(null);
                        resetWorkflowForm();
                        setShowWorkflowForm(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      + Add Workflow
                    </button>
                  </div>

                  {showWorkflowForm && (
                    <div className="bg-white shadow rounded-lg p-6 border">
                      <h4 className="text-md font-semibold mb-4">{editingWorkflow ? 'Edit' : 'New'} Workflow</h4>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Workflow Name *"
                          className="w-full border rounded p-2"
                          value={workflowFormData.name}
                          onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                        />
                        <textarea
                          placeholder="Description"
                          className="w-full border rounded p-2"
                          value={workflowFormData.description}
                          onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })}
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                          <select
                            value={workflowFormData.entityType}
                            onChange={(e) => setWorkflowFormData({ ...workflowFormData, entityType: e.target.value })}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="INVENTORY">Inventory Request</option>
                            <option value="DIRECT_PURCHASE">Direct Purchase</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">Select which type of request this workflow applies to.</p>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={workflowFormData.active}
                            onChange={(e) => setWorkflowFormData({ ...workflowFormData, active: e.target.checked })}
                          />
                          <span>Active (workflow will be used for matching requests)</span>
                        </label>

                        <div className="border rounded p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium">Conditions (all must match)</h5>
                            <button type="button" onClick={addWorkflowCondition} className="text-blue-600 text-sm">
                              + Add Condition
                            </button>
                          </div>
                          {conditions.length === 0 && (
                            <p className="text-gray-500 text-sm">No conditions – this workflow matches all requests.</p>
                          )}
                          {conditions.map((cond, idx) => (
                            <div key={idx} className="flex gap-2 items-center mb-2">
                              <select
                                value={cond.field}
                                onChange={(e) => updateWorkflowCondition(idx, 'field', e.target.value)}
                                className="border rounded p-1"
                              >
                                <option value="ppeRequest">PPE Request</option>
                                <option value="hasManualProducts">Has Manual Products</option>
                                <option value="department">Department</option>
                                <option value="projectName">Project Name</option>
                                <option value="totalQuantity">Total Quantity</option>
                              </select>
                              <select
                                value={cond.operator}
                                onChange={(e) => updateWorkflowCondition(idx, 'operator', e.target.value)}
                                className="border rounded p-1"
                              >
                                <option value="eq">equals</option>
                                <option value="ne">not equals</option>
                                <option value="gt">greater than</option>
                                <option value="lt">less than</option>
                                <option value="contains">contains</option>
                              </select>
                              <input
                                type={cond.field === 'totalQuantity' ? 'number' : 'text'}
                                value={cond.value}
                                onChange={(e) => updateWorkflowCondition(idx, 'value', e.target.value)}
                                className="border rounded p-1 flex-1"
                                placeholder="Value"
                              />
                              <button onClick={() => removeWorkflowCondition(idx)} className="text-red-600">✖</button>
                            </div>
                          ))}
                        </div>

                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Workflow Steps (order matters)</h5>
                          {workflowFormData.steps.length === 0 && (
                            <p className="text-gray-500 text-sm mb-2">No steps defined. Click "Add Step" to create approval chain.</p>
                          )}
                          {workflowFormData.steps.map((step, idx) => (
                            <div key={idx} className="border p-4 mb-4 rounded bg-gray-50 relative">
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={() => moveWorkflowStep(idx, 'up')} className="text-gray-600">▲</button>
                                <button onClick={() => moveWorkflowStep(idx, 'down')} className="text-gray-600">▼</button>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                <div>
                                  <input
                                    placeholder="Step Name (e.g., Planner Approval)"
                                    value={step.stepName}
                                    onChange={(e) => updateWorkflowStep(idx, 'stepName', e.target.value)}
                                    className="border p-2 rounded w-full"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">A descriptive name for this step.</p>
                                </div>
                                <div>
                               <select
  multiple
  value={step.requiredRole ? step.requiredRole.split(',') : []}
  onChange={(e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    updateWorkflowStep(idx, 'requiredRole', selected.join(','));
  }}
  className="border p-2 rounded w-full h-24"
  disabled={rolesLoading}
>
  {availableRoles.map((role) => (
    <option key={role.id} value={role.name}>
      {role.name.replace(/^ROLE_/, '')}
    </option>
  ))}
</select>
<p className="text-xs text-gray-500 mt-1">
  Hold <kbd>Ctrl</kbd> (Windows) or <kbd>Cmd</kbd> (Mac) to select multiple roles. 
  <strong> Any of these roles can approve this step.</strong>
</p>
                                  <p className="text-xs text-gray-500 mt-1">The role that must approve this step.</p>
                                </div>
                                <div>
                                  <input
                                    placeholder="Target Status (e.g., PLANNER_APPROVED)"
                                    value={step.targetStatus}
                                    onChange={(e) => updateWorkflowStep(idx, 'targetStatus', e.target.value)}
                                    className="border p-2 rounded w-full"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Status set after this step is approved.</p>
                                </div>
                                <div>
                                  <input
                                    placeholder="Reject Status (optional)"
                                    value={step.rejectStatus || ''}
                                    onChange={(e) => updateWorkflowStep(idx, 'rejectStatus', e.target.value)}
                                    className="border p-2 rounded w-full"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">If set, request moves to this status on rejection.</p>
                                </div>
                                <div className="col-span-2 flex gap-4">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={step.requiresApproval}
                                      onChange={(e) => updateWorkflowStep(idx, 'requiresApproval', e.target.checked)}
                                    />
                                    Requires Approval
                                    <span className="text-xs text-gray-400 ml-1">(uncheck for auto‑approve)</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={step.finalStep}
                                      onChange={(e) => updateWorkflowStep(idx, 'finalStep', e.target.checked)}
                                    />
                                    Final Step
                                    <span className="text-xs text-gray-400 ml-1">(workflow ends here)</span>
                                  </label>
                                </div>
                              </div>
                              <button onClick={() => removeWorkflowStep(idx)} className="mt-2 text-red-600 text-sm">
                                Remove Step
                              </button>
                            </div>
                          ))}
                          <button onClick={addWorkflowStep} className="text-blue-600 text-sm border border-blue-300 px-3 py-1 rounded">
                            + Add Step
                          </button>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <button onClick={() => setShowWorkflowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                          <button onClick={handleSaveWorkflow} className="px-4 py-2 bg-blue-600 text-white rounded">Save Workflow</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conditions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steps</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workflows.map((wf) => (
                          <tr key={wf.id}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{wf.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{wf.description || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{wf.entityType || 'INVENTORY'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                              {wf.conditionJson ? '✅ Custom' : 'Default (all requests)'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{wf.steps?.length || 0} steps</td>
                            <td className="px-6 py-4 text-sm">
                              {wf.active ? <span className="text-green-600">● Active</span> : <span className="text-gray-400">● Inactive</span>}
                            </td>
                            <td className="px-6 py-4 text-right text-sm">
                              <button
                                onClick={() => {
                                  setEditingWorkflow(wf);
                                  setWorkflowFormData({
                                    name: wf.name,
                                    description: wf.description || '',
                                    active: wf.active,
                                    entityType: wf.entityType || 'INVENTORY',
                                    conditionJson: wf.conditionJson || '',
                                    steps: (wf.steps || []).sort((a,b) => a.stepOrder - b.stepOrder)
                                  });
                                  if (wf.conditionJson) {
                                    try { setConditions(JSON.parse(wf.conditionJson)); } catch(e) { setConditions([]); }
                                  } else { setConditions([]); }
                                  setShowWorkflowForm(true);
                                }}
                                className="text-blue-600 mr-3"
                              >
                                Edit
                              </button>
                              <button onClick={() => handleDeleteWorkflow(wf.id)} className="text-red-600">Delete</button>
                            </td>
                          </tr>
                        ))}
                        {workflows.length === 0 && (
                          <tr>
                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                              No workflows defined. Click "Add Workflow" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => handleExportTab('categories')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Export</button>
                <button type="button" onClick={() => handleImportClick('categories')} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Import</button>
              </div>
              {!showCategoryForm && (
                <div className="flex justify-end">
                  <button onClick={() => setShowCategoryForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Category
                  </button>
                </div>
              )}
              {showCategoryForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">Category Name</label><input type="text" id="categoryName" value={categoryForm.name} onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                        <div><label htmlFor="standardRateHours" className="block text-sm font-medium text-gray-700">Standard Rate Hours</label><input type="number" id="standardRateHours" value={categoryForm.standardRateHours} onChange={(e) => setCategoryForm(prev => ({ ...prev, standardRateHours: parseInt(e.target.value) }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required min="1" max="24" /></div>
                        <div><label htmlFor="annualLeaveDays" className="block text-sm font-medium text-gray-700">Annual Leave Days</label><input type="number" id="annualLeaveDays" value={categoryForm.annualLeaveDays || 20} onChange={(e) => setCategoryForm(prev => ({ ...prev, annualLeaveDays: parseInt(e.target.value) || 20 }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="0" max="365" required /></div>
                        <div><label htmlFor="workStartTime" className="block text-sm font-medium text-gray-700">Work Start Time</label><input type="time" id="workStartTime" value={categoryForm.workStartTime} onChange={(e) => setCategoryForm(prev => ({ ...prev, workStartTime: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required /></div>
                      </div>
                      <div className="flex items-center"><input type="checkbox" id="excludeWeekendsFromLeave" checked={categoryForm.excludeWeekendsFromLeave !== false} onChange={(e) => setCategoryForm(prev => ({ ...prev, excludeWeekendsFromLeave: e.target.checked }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /><label htmlFor="excludeWeekendsFromLeave" className="ml-2 block text-sm text-gray-900">Exclude Weekends from Leave Days</label></div>
                      <div className="flex items-center"><input type="checkbox" id="skipAutoAbsent" checked={categoryForm.skipAutoAbsent || false} onChange={(e) => setCategoryForm(prev => ({ ...prev, skipAutoAbsent: e.target.checked }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /><label htmlFor="skipAutoAbsent" className="ml-2 block text-sm text-gray-900">Skip Auto-Absent Marking</label><p className="ml-2 text-xs text-gray-500">Employees in this category will NOT be automatically marked absent</p></div>
                      <div className="flex items-center"><input type="checkbox" id="applyWithholdingTax" checked={categoryForm.applyWithholdingTax || false} onChange={(e) => setCategoryForm(prev => ({ ...prev, applyWithholdingTax: e.target.checked }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /><label htmlFor="applyWithholdingTax" className="ml-2 block text-sm text-gray-900">Apply Withholding Tax (instead of PAYE)</label><p className="ml-2 text-xs text-gray-500">Employees in this category will have withholding tax deducted instead of standard PAYE</p></div>
                      <p className="text-xs text-gray-500 ml-6">When checked, weekends are not counted as leave days (standard business days only). When unchecked, all calendar days count toward leave.</p>
                      <div className="flex items-center"><input type="checkbox" id="useNonTaxableAllowances" checked={categoryForm.useNonTaxableAllowances} onChange={(e) => setCategoryForm(prev => ({ ...prev, useNonTaxableAllowances: e.target.checked }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /><label htmlFor="useNonTaxableAllowances" className="ml-2 block text-sm text-gray-900">Use Non-Taxable Allowances for this category</label></div>
                      
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Leave Approval Routing (Optional)</h4>
                        <div className="flex items-center mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <input type="checkbox" id="useCustomApprovers" checked={categoryForm.useCustomApprovers} onChange={(e) => setCategoryForm(prev => ({ ...prev, useCustomApprovers: e.target.checked }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                          <label htmlFor="useCustomApprovers" className="ml-2 block text-sm font-medium text-gray-900">Use custom approvers for this category</label>
                          <p className="ml-2 text-xs text-gray-500">When checked, leave requests from this category go to specific approvers below</p>
                        </div>
                        {categoryForm.useCustomApprovers && (
                          <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                            <div><label htmlFor="supervisorEmails" className="block text-sm font-medium text-gray-700">Supervisor Email(s)</label><input type="text" id="supervisorEmails" value={categoryForm.supervisorEmails} onChange={(e) => setCategoryForm(prev => ({ ...prev, supervisorEmails: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="supervisor1@company.com, supervisor2@company.com" /><p className="mt-1 text-xs text-gray-500">Comma-separated email addresses for supervisor approval</p></div>
                            <div><label htmlFor="plannerEmails" className="block text-sm font-medium text-gray-700">Planner Email(s)</label><input type="text" id="plannerEmails" value={categoryForm.plannerEmails} onChange={(e) => setCategoryForm(prev => ({ ...prev, plannerEmails: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="planner1@company.com, planner2@company.com" /><p className="mt-1 text-xs text-gray-500">Comma-separated email addresses for planner approval</p></div>
                            <div><label htmlFor="hrEmails" className="block text-sm font-medium text-gray-700">HR Email(s)</label><input type="text" id="hrEmails" value={categoryForm.hrEmails} onChange={(e) => setCategoryForm(prev => ({ ...prev, hrEmails: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="hr1@company.com, hr2@company.com" /><p className="mt-1 text-xs text-gray-500">Comma-separated email addresses for HR approval</p></div>
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200"><p className="text-xs text-yellow-700"><strong>Note:</strong> When custom approvers are enabled, leave requests from employees in this category will be sent to the specified emails instead of the global settings or default supervisors.</p></div>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button type="button" onClick={handleCancelCategoryForm} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                        <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingCategory ? 'Update Category' : 'Add Category'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Manage Categories</h3>
                  {settings.categories.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first category.</p>
                      <div className="mt-6"><button onClick={() => setShowCategoryForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"><svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Add Category</button></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Hours</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Leave</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Start</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto-Absent</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Routing</th><th className="relative px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.categories.map((category) => (
                            <tr key={category.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.standardRateHours} hrs</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.annualLeaveDays || 20} days</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.workStartTime || '09:00'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.applyWithholdingTax ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Withholding</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">PAYE</span>}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.skipAutoAbsent ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Skipped</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Auto-Mark</span>}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.useCustomApprovers ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Custom</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Global</span>}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleEditCategory(category)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                <button onClick={() => handleDeleteCategory(category.id)} className="text-red-600 hover:text-red-900">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specialWeekends' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => handleExportTab('specialWeekends')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Export</button>
                <button type="button" onClick={() => handleImportClick('specialWeekends')} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Import</button>
              </div>
              {!showSpecialWeekendForm && (
                <div className="flex justify-end">
                  <button onClick={() => setShowSpecialWeekendForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Special Weekend
                  </button>
                </div>
              )}
              {showSpecialWeekendForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">{editingSpecialWeekend ? 'Edit Special Weekend' : 'Add New Special Weekend'}</h3>
                    <form onSubmit={handleSpecialWeekendSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="specialWeekendName" className="block text-sm font-medium text-gray-700">Weekend Name</label><input type="text" id="specialWeekendName" value={specialWeekendForm.name} onChange={(e) => setSpecialWeekendForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., Christmas Eve, New Year's Day" required /></div>
                        <div><label htmlFor="specialWeekendDate" className="block text-sm font-medium text-gray-700">Date</label><input type="date" id="specialWeekendDate" value={specialWeekendForm.date} onChange={(e) => setSpecialWeekendForm(prev => ({ ...prev, date: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                      </div>
                      <div><label htmlFor="rateMultiplier" className="block text-sm font-medium text-gray-700">Rate Multiplier</label><input type="number" step="0.1" id="rateMultiplier" value={specialWeekendForm.rateMultiplier} onChange={(e) => setSpecialWeekendForm(prev => ({ ...prev, rateMultiplier: parseFloat(e.target.value) }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1.0" required /><p className="mt-1 text-sm text-gray-500">Multiplier applied to base rate for this special weekend (e.g., 1.5 for time and half)</p></div>
                      <div className="flex justify-end space-x-3">
                        <button type="button" onClick={handleCancelSpecialWeekendForm} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                        <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingSpecialWeekend ? 'Update Special Weekend' : 'Add Special Weekend'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Manage Special Weekends</h3>
                  {settings.specialWeekends.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No special weekends</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first special weekend.</p>
                      <div className="mt-6"><button onClick={() => setShowSpecialWeekendForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"><svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Add Special Weekend</button></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Multiplier</th><th className="relative px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.specialWeekends.map((specialWeekend) => (
                            <tr key={specialWeekend.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{specialWeekend.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(specialWeekend.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{specialWeekend.rateMultiplier}x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleEditSpecialWeekend(specialWeekend)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                <button onClick={() => handleDeleteSpecialWeekend(specialWeekend.id)} className="text-red-600 hover:text-red-900">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holidays' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => handleExportTab('holidays')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Export</button>
                <button type="button" onClick={() => handleImportClick('holidays')} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Import</button>
              </div>
              {!showHolidayForm && (
                <div className="flex justify-end">
                  <button onClick={() => setShowHolidayForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Holiday
                  </button>
                </div>
              )}
              {showHolidayForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>
                    <form onSubmit={handleHolidaySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="holidayName" className="block text-sm font-medium text-gray-700">Holiday Name</label><input type="text" id="holidayName" value={holidayForm.name} onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                        <div><label htmlFor="holidayDate" className="block text-sm font-medium text-gray-700">Date</label><input type="date" id="holidayDate" value={holidayForm.date} onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="payMultiplier" className="block text-sm font-medium text-gray-700">Pay Multiplier</label><input type="number" step="0.1" id="payMultiplier" value={holidayForm.payMultiplier} onChange={(e) => setHolidayForm(prev => ({ ...prev, payMultiplier: parseFloat(e.target.value) }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                        <div className="flex items-center pt-6"><input type="checkbox" id="recurring" checked={holidayForm.recurring} onChange={(e) => setHolidayForm(prev => ({ ...prev, recurring: e.target.checked }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /><label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">Recurring Holiday (Yearly)</label></div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button type="button" onClick={handleCancelHolidayForm} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                        <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingHoliday ? 'Update Holiday' : 'Add Holiday'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Manage Holidays</h3>
                  {settings.holidays.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No holidays</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first holiday.</p>
                      <div className="mt-6"><button onClick={() => setShowHolidayForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"><svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Add Holiday</button></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Multiplier</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th><th className="relative px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.holidays.map((holiday) => (
                            <tr key={holiday.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{holiday.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(holiday.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holiday.payMultiplier}x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holiday.recurring ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Recurring</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">One-time</span>}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleEditHoliday(holiday)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                <button onClick={() => handleDeleteHoliday(holiday.id)} className="text-red-600 hover:text-red-900">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Leave Settings & Policies</h3>
                <div className="flex gap-2 justify-end mb-4">
                  <button type="button" onClick={() => handleExportTab('leave')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Export</button>
                  <button type="button" onClick={() => handleImportClick('leave')} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Import</button>
                </div>
                <form onSubmit={handleSaveLeaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div><label htmlFor="maternityLeaveMonths" className="block text-sm font-medium text-gray-700">Maternity Leave Duration (Months)</label><input type="number" id="maternityLeaveMonths" value={leaveSettings.maternityLeaveMonths} onChange={(e) => setLeaveSettings(prev => ({ ...prev, maternityLeaveMonths: parseInt(e.target.value) || 3 }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1" max="12" required /><p className="mt-1 text-sm text-gray-500">Standard maternity leave duration in months</p></div>
                    <div><label htmlFor="paternityLeaveMonths" className="block text-sm font-medium text-gray-700">Paternity Leave Duration (Months)</label><input type="number" id="paternityLeaveMonths" value={leaveSettings.paternityLeaveMonths} onChange={(e) => setLeaveSettings(prev => ({ ...prev, paternityLeaveMonths: parseInt(e.target.value) || 1 }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1" max="12" required /><p className="mt-1 text-sm text-gray-500">Standard paternity leave duration in months</p></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Non-Deductible Leave Types</label>
                    <p className="text-sm text-gray-500 mb-4">Select leave types that should NOT be deducted from employee's annual leave balance</p>
                    <div className="space-y-3">
                      {['Maternity', 'Paternity', 'Sick', 'Study', 'Annual', 'Casual', 'Bereavement', 'Other'].map((leaveType) => (
                        <div key={leaveType} className="flex items-center">
                          <input type="checkbox" id={`leaveType-${leaveType}`} checked={leaveSettings.nonDeductibleLeaveTypes.includes(leaveType)} onChange={(e) => { const isChecked = e.target.checked; setLeaveSettings(prev => ({ ...prev, nonDeductibleLeaveTypes: isChecked ? [...prev.nonDeductibleLeaveTypes, leaveType] : prev.nonDeductibleLeaveTypes.filter(type => type !== leaveType) })); }} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                          <label htmlFor={`leaveType-${leaveType}`} className="ml-2 block text-sm text-gray-900">{leaveType} Leave{leaveType === 'Maternity' && ` (${leaveSettings.maternityLeaveMonths} months)`}{leaveType === 'Paternity' && ` (${leaveSettings.paternityLeaveMonths} month)`}</label>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">How it works:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Checked leaves: NOT deducted from annual leave balance</li>
                        <li>• Unchecked leaves: Deducted from annual leave balance</li>
                        <li>• Maternity/Paternity: Auto-calculated based on duration above</li>
                        <li>• Study Leave: No fixed duration (specified per request)</li>
                        <li>• Sick Leave: Requires medical certificate</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Save Leave Settings</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-start mb-6">
                  <div><h3 className="text-lg leading-6 font-medium text-gray-900">Attendance Auto-Mark Schedule</h3><p className="mt-1 text-sm text-gray-500">Configure when and how the system automatically marks absent employees</p></div>
                  <div className="flex items-center gap-2"><span className={`text-sm ${attendanceSchedule.enabled ? 'text-green-600' : 'text-red-600'}`}>{attendanceSchedule.enabled ? '● Active' : '● Disabled'}</span></div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); saveAttendanceScheduleSettings(); }} className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
                    <div><h4 className="font-medium text-gray-900">Enable Auto-Absent Marking</h4><p className="text-sm text-gray-500 mt-1">Automatically mark employees as "Absent" when they have no attendance record for the previous day</p><div className="mt-2 text-xs text-gray-400">Current status: {attendanceSchedule.enabled ? 'Running daily' : 'Paused'}</div></div>
                    <button type="button" onClick={() => setAttendanceSchedule({...attendanceSchedule, enabled: !attendanceSchedule.enabled})} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${attendanceSchedule.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${attendanceSchedule.enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="border-b border-gray-200 pb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Run Time</label>
                    <div className="flex items-center gap-4">
                      <input type="time" value={attendanceSchedule.runTime} onChange={(e) => setAttendanceSchedule({...attendanceSchedule, runTime: e.target.value})} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled={!attendanceSchedule.enabled} step="60" />
                      <div className="text-sm text-gray-500"><span className="font-medium">Example:</span> 00:30 = 12:30 AM (runs 30 minutes after midnight)</div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">The system will check the previous day's attendance at this time and create "Absent" records for employees without attendance</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Skip Auto-Absent for Specific Categories</label>
                    <p className="text-sm text-gray-500 mb-3">Employees in these categories will NOT be automatically marked as absent <span className="text-xs text-gray-400 block mt-1">(This works alongside the "Skip Auto-Absent Marking" checkbox in each category)</span></p>
                    {settings.categories && settings.categories.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200"><span className="text-xs font-medium text-gray-600 uppercase">Available Categories</span></div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                          {settings.categories.map((category) => (
                            <label key={category.id} className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                              <div className="flex items-center flex-1">
                                <input type="checkbox" checked={attendanceSchedule.skipCategories.includes(category.id)} onChange={(e) => { if (e.target.checked) { setAttendanceSchedule({ ...attendanceSchedule, skipCategories: [...attendanceSchedule.skipCategories, category.id] }); } else { setAttendanceSchedule({ ...attendanceSchedule, skipCategories: attendanceSchedule.skipCategories.filter(id => id !== category.id) }); } }} className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" disabled={!attendanceSchedule.enabled} />
                                <div className="ml-3"><div className="text-sm font-medium text-gray-900">{category.name}</div><div className="text-xs text-gray-500">{category.standardRateHours} hours/day • {category.workStartTime || '09:00'} start</div></div>
                              </div>
                              {category.skipAutoAbsent && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Category has "Skip" flag</span>}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200"><p className="text-gray-500">No categories found. Create categories first.</p></div>
                    )}
                    {attendanceSchedule.skipCategories.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700">⚠️ {attendanceSchedule.skipCategories.length} category(s) will be skipped: {settings.categories.filter(c => attendanceSchedule.skipCategories.includes(c.id)).map(c => c.name).join(', ')}</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>How Auto-Absent Marking Works</h4>
                    <div className="space-y-2 text-sm text-blue-700">
                      <p>✓ Runs daily at <strong>{attendanceSchedule.runTime || '00:30'}</strong></p>
                      <p>✓ Checks ALL <strong>active employees</strong> for the <strong>previous calendar day</strong></p>
                      <p>✓ Skips employees who already have <strong>any attendance record</strong> (Present, Late, Holiday Present, etc.)</p>
                      <p>✓ Skips employees on <strong>approved leave</strong></p>
                      <p>✓ Skips employees whose category is <strong>checked above</strong> OR has <strong>"Skip Auto-Absent" flag</strong> enabled</p>
                      <p className="mt-2 pt-2 border-t border-blue-200 text-xs">⏰ Last run would be at {new Date().toLocaleString()} • Affects previous day's records</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={() => loadAttendanceScheduleSettings()} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition" disabled={scheduleSaving}>Reset</button>
                    <button type="submit" disabled={scheduleSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      {scheduleSaving ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</>) : 'Save Schedule Settings'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'loan' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => handleExportTab('loan')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Export</button>
                <button type="button" onClick={() => handleImportClick('loan')} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Import</button>
              </div>
              {!showLoanForm ? (
                <div className="flex justify-end">
                  <button onClick={() => setShowLoanForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Configure Loan Settings
                  </button>
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">{editingLoanSettings ? 'Edit Loan Settings' : 'Configure Loan Settings'}</h3>
                    <form onSubmit={handleLoanSettingsSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="maximumLoanLimit" className="block text-sm font-medium text-gray-700">Maximum Loan Amount (GHS) <span className="text-red-500">*</span></label>
                        <div className="relative mt-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500">₵</span></div>
                          <input type="number" id="maximumLoanLimit" value={loanForm.maximumLoanLimit} onChange={(e) => setLoanForm({ maximumLoanLimit: parseFloat(e.target.value) || 0 })} className="block w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" min="0" step="0.01" required />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Set the maximum loan amount employees can request. Leave at 0 for no limit.</p>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button type="button" onClick={handleCancelLoanForm} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                        <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingLoanSettings ? 'Update Settings' : 'Save Settings'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Current Loan Settings</h3>
                  {!loanSettings || loanSettings.maximumLoanLimit === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No loan settings configured</h3>
                      <p className="mt-1 text-sm text-gray-500">Click "Configure Loan Settings" to set the maximum loan amount.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maximum Loan Amount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="relative px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(loanSettings.maximumLoanLimit || 0)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loanSettings.maximumLoanLimit === 0 ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No Limit</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleEditLoanSettings(loanSettings)} className="text-blue-600 hover:text-blue-900">Edit</button></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => handleExportTab('positions')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Export</button>
                <button type="button" onClick={() => handleImportClick('positions')} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Import</button>
              </div>
              {!showPositionForm && (
                <div className="flex justify-end">
                  <button onClick={() => setShowPositionForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Job Position
                  </button>
                </div>
              )}
              {showPositionForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">{editingPosition ? 'Edit Job Position' : 'Add New Job Position'}</h3>
                    <form onSubmit={handleJobPositionSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="positionName" className="block text-sm font-medium text-gray-700">Position Name</label><input type="text" id="positionName" value={jobPositionForm.name} onChange={(e) => setJobPositionForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                        <div><label htmlFor="positionCategory" className="block text-sm font-medium text-gray-700">Category</label><select id="positionCategory" value={jobPositionForm.category?.id || ''} onChange={(e) => { const categoryId = e.target.value; const selectedCategory = settings.categories.find(cat => cat.id === parseInt(categoryId)); setJobPositionForm(prev => ({ ...prev, category: selectedCategory })); }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required><option value="">Select a category</option>{settings.categories.map(category => (<option key={category.id} value={category.id}>{category.name}</option>))}</select></div>
                      </div>
                      <div><label htmlFor="positionDescription" className="block text-sm font-medium text-gray-700">Description</label><textarea id="positionDescription" rows={3} value={jobPositionForm.description} onChange={(e) => setJobPositionForm(prev => ({ ...prev, description: e.target.value }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="baseRate" className="block text-sm font-medium text-gray-700">Base Rate (₵)</label><input type="number" step="0.01" id="baseRate" value={jobPositionForm.baseRate} onChange={(e) => setJobPositionForm(prev => ({ ...prev, baseRate: parseFloat(e.target.value) }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                        <div><label htmlFor="standardWorkHours" className="block text-sm font-medium text-gray-700">Standard Work Hours</label><input type="number" id="standardWorkHours" value={jobPositionForm.standardWorkHours} onChange={(e) => setJobPositionForm(prev => ({ ...prev, standardWorkHours: parseInt(e.target.value) }))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1" max="24" required /></div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Job Grades</h4>
                        {jobPositionForm.grades?.map((grade, index) => (
                          <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-4 p-4 border border-gray-200 rounded-md">
                            <div><label className="block text-sm font-medium text-gray-700">Grade Level</label><input type="text" value={grade.level} onChange={(e) => { const newGrades = [...jobPositionForm.grades]; newGrades[index].level = e.target.value; setJobPositionForm(prev => ({ ...prev, grades: newGrades })); }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., Junior, Senior, Manager" required /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Hourly Rate (₵)</label><input type="number" step="0.01" value={grade.rate} onChange={(e) => { const newGrades = [...jobPositionForm.grades]; newGrades[index].rate = parseFloat(e.target.value); setJobPositionForm(prev => ({ ...prev, grades: newGrades })); }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Standard Hours</label><input type="number" value={grade.standardWorkHours || jobPositionForm.standardWorkHours} onChange={(e) => { const newGrades = [...jobPositionForm.grades]; newGrades[index].standardWorkHours = parseInt(e.target.value); setJobPositionForm(prev => ({ ...prev, grades: newGrades })); }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1" max="24" /></div>
                            <div className="flex items-end"><button type="button" onClick={() => { const newGrades = jobPositionForm.grades.filter((_, i) => i !== index); setJobPositionForm(prev => ({ ...prev, grades: newGrades })); }} className="px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">Remove</button></div>
                          </div>
                        ))}
                        <button type="button" onClick={() => { const newGrades = [...(jobPositionForm.grades || []), { level: '', rate: 0 }]; setJobPositionForm(prev => ({ ...prev, grades: newGrades })); }} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"><svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Add Grade</button>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button type="button" onClick={handleCancelPositionForm} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                        <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingPosition ? 'Update Position' : 'Add Position'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Manage Job Positions</h3>
                  {settings.jobPositions.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" /></svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No job positions</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first job position.</p>
                      <div className="mt-6"><button onClick={() => setShowPositionForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"><svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Add Job Position</button></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Rate</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Hours</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grades</th><th className="relative px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.jobPositions.map((position) => {
                            const category = position.category;
                            return (
                              <tr key={position.id}>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{position.name}</div>{position.description && <div className="text-sm text-gray-500">{position.description}</div>}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category ? category.name : 'No Category'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₵{position.baseRate}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.standardWorkHours} hours</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{position.grades && position.grades.length > 0 ? position.grades.map((grade, index) => <div key={index} className="flex justify-between"><span>{grade.level}:</span><span>₵{grade.rate}</span></div>) : <span className="text-gray-400">No grades</span>}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button onClick={() => handleEditPosition(position)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                  <button onClick={() => handleDeletePosition(position.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;