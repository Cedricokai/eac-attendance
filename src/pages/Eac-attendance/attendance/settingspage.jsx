import React, { useState, useEffect } from 'react';
import MainSidebar from '../mainSidebar';

const SettingsPage = () => {
  // Local state for all settings
  const [settings, setSettings] = useState({
    weekendDays: [0, 6], // Default to Sunday and Saturday
    doubleTimeOnSunday: false,
    timeAndHalfAfter8Hours: false,
    weekendRate: 1.0,
    holidayRate: 1.0,
    holidays: [],
    jobPositions: [],
    categories: [],
    specialWeekends: [],
    hourlyRate: 10,
    overtimeHourlyRate: 15,
    standardWorkHours: 8,
    defaultOvertimeMultiplier: 1.5,
    sundayOvertimeMultiplier: 2.0,
    holidayOvertimeMultiplier: 2.5,
    enableTimeAndHalfAfter8Hours: true,
    timeAndHalfMultiplier: 1.5,
    // Add the missing fields
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    employeeCategories: '',
    pensionRate: 0,
    socialSecurityRate: 0,
    taxRate: 0,
    // NEW: Late arrival time setting
    lateArrivalTime: '09:00', // Default: 9:00 AM
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states and visibility
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
    useNonTaxableAllowances: false
  });
  const [specialWeekendForm, setSpecialWeekendForm] = useState({
    name: '',
    date: '',
    rateMultiplier: 1.5
  });

  const [leaveSettings, setLeaveSettings] = useState({
    maternityLeaveMonths: 3,
    paternityLeaveMonths: 1,
    nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study']
  });

  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSpecialWeekend, setEditingSpecialWeekend] = useState(null);

  // Form visibility states
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSpecialWeekendForm, setShowSpecialWeekendForm] = useState(false);

  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };
  
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

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      if (!token) {
        console.warn('No JWT token found');
        setLoading(false);
        return;
      }

      // Fetch each endpoint separately
      const [systemRes, holidaysRes, positionsRes, categoriesRes, specialWeekendsRes, leaveSettingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/settings/system`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/settings/holidays`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/settings/job-positions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/settings/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/settings/special-weekends`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/settings/leave`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      ]);

      // Handle responses
      const systemSettings = systemRes.ok ? await systemRes.json() : {};
      const holidays = holidaysRes.ok ? await holidaysRes.json() : [];
      const jobPositions = positionsRes.ok ? await positionsRes.json() : [];
      const categories = categoriesRes.ok ? await categoriesRes.json() : [];
      const specialWeekends = specialWeekendsRes.ok ? await specialWeekendsRes.json() : [];
      const leaveSettingsData = leaveSettingsRes.ok ? await leaveSettingsRes.json() : {
        maternityLeaveMonths: 3,
        paternityLeaveMonths: 1,
        nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study']
      };

      // FIX: Simplified weekendDays handling - backend will handle the conversion
      // For now, use default values if not provided
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
        
        // Overtime multipliers
        defaultOvertimeMultiplier: systemSettings.defaultOvertimeMultiplier || 1.5,
        sundayOvertimeMultiplier: systemSettings.sundayOvertimeMultiplier || 2.0,
        holidayOvertimeMultiplier: systemSettings.holidayOvertimeMultiplier || 2.5,
        enableTimeAndHalfAfter8Hours: systemSettings.enableTimeAndHalfAfter8Hours !== undefined 
          ? systemSettings.enableTimeAndHalfAfter8Hours 
          : true,
        timeAndHalfMultiplier: systemSettings.timeAndHalfMultiplier || 1.5,
        
        // NEW: Late arrival time
        lateArrivalTime: systemSettings.lateArrivalTime || '09:00',
        
        // Other fields
        companyName: systemSettings.companyName || '',
        companyEmail: systemSettings.companyEmail || '',
        companyPhone: systemSettings.companyPhone || '',
        companyAddress: systemSettings.companyAddress || '',
        employeeCategories: systemSettings.employeeCategories || '',
        pensionRate: systemSettings.pensionRate || 0,
        socialSecurityRate: systemSettings.socialSecurityRate || 0,
        taxRate: systemSettings.taxRate || 0,
        
        holidays: holidays,
        jobPositions: jobPositions,
        categories: categories,
        specialWeekends: specialWeekends
      }));

      setLeaveSettings(leaveSettingsData);

    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // System Settings Handlers
  const handleSystemSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWeekendDayToggle = (day) => {
    const currentDays = Array.isArray(settings.weekendDays) ? settings.weekendDays : [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    console.log('Toggling weekend day:', day, 'New days:', newDays);
    handleSystemSettingsChange('weekendDays', newDays);
  };

  const handleSaveSystemSettings = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      
      // Prepare system settings - convert weekendDays array to string for backend
      const systemSettings = {
        hourlyRate: parseFloat(settings.hourlyRate) || 10,
        overtimeHourlyRate: parseFloat(settings.overtimeHourlyRate) || 15,
        standardWorkHours: parseInt(settings.standardWorkHours) || 8,
        
        // FIX: Convert weekendDays array to string for backend
        weekendDays: Array.isArray(settings.weekendDays) && settings.weekendDays.length > 0 
          ? settings.weekendDays.map(day => parseInt(day)).filter(day => !isNaN(day))
          : [0, 6], // Keep as array
        
        doubleTimeOnSunday: Boolean(settings.doubleTimeOnSunday),
        timeAndHalfAfter8Hours: Boolean(settings.timeAndHalfAfter8Hours),
        weekendRate: parseFloat(settings.weekendRate) || 1.0,
        holidayRate: parseFloat(settings.holidayRate) || 1.0,
        
        // Overtime multipliers
        defaultOvertimeMultiplier: parseFloat(settings.defaultOvertimeMultiplier) || 1.5,
        sundayOvertimeMultiplier: parseFloat(settings.sundayOvertimeMultiplier) || 2.0,
        holidayOvertimeMultiplier: parseFloat(settings.holidayOvertimeMultiplier) || 2.5,
        enableTimeAndHalfAfter8Hours: Boolean(settings.enableTimeAndHalfAfter8Hours),
        timeAndHalfMultiplier: parseFloat(settings.timeAndHalfMultiplier) || 1.5,
        
        // NEW: Late arrival time
        lateArrivalTime: settings.lateArrivalTime || '09:00',
        
        // Add other required fields with default values
        companyName: settings.companyName || 'Your Company',
        companyEmail: settings.companyEmail || 'company@example.com',
        companyPhone: settings.companyPhone || '+233000000000',
        companyAddress: settings.companyAddress || 'Company Address',
        employeeCategories: Array.isArray(settings.employeeCategories) 
          ? settings.employeeCategories 
          : [settings.employeeCategories || 'General'],
        pensionRate: parseFloat(settings.pensionRate) || 5.0,
        socialSecurityRate: parseFloat(settings.socialSecurityRate) || 5.5,
        taxRate: parseFloat(settings.taxRate) || 10.0
      };

      console.log('Saving system settings:', systemSettings);
      console.log('Weekend days being sent:', systemSettings.weekendDays);

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
        console.error('Server response error:', errorText);
        throw new Error(`Failed to update settings: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      showMessage('error', `Failed to update system settings: ${error.message}`);
    }
  };

  // Holiday Handlers
  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingHoliday 
        ? `${API_BASE_URL}/api/settings/holidays/${editingHoliday.id}`
        : `${API_BASE_URL}/api/settings/holidays`;
      
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

  // Job Position Handlers
  const handleJobPositionSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingPosition 
        ? `${API_BASE_URL}/api/settings/job-positions/${editingPosition.id}`
        : `${API_BASE_URL}/api/settings/job-positions`;
      
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

  // Category Handlers
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingCategory 
        ? `${API_BASE_URL}/api/settings/categories/${editingCategory.id}`
        : `${API_BASE_URL}/api/settings/categories`;
      
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
        setCategoryForm({ name: '', standardRateHours: 8, useNonTaxableAllowances: false });
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
      useNonTaxableAllowances: category.useNonTaxableAllowances
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

  // Special Weekend Handlers
  const handleSpecialWeekendSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingSpecialWeekend 
        ? `${API_BASE_URL}/api/settings/special-weekends/${editingSpecialWeekend.id}`
        : `${API_BASE_URL}/api/settings/special-weekends`;
      
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

  // Cancel form handlers
  const handleCancelHolidayForm = () => {
    setShowHolidayForm(false);
    setEditingHoliday(null);
    setHolidayForm({ name: '', date: '', recurring: false, payMultiplier: 1.0 });
  };

  const handleCancelPositionForm = () => {
    setShowPositionForm(false);
    setEditingPosition(null);
    setJobPositionForm({ name: '', category: '', description: '', baseRate: 0, standardWorkHours: 8, grades: [] });
  };

  const handleCancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', standardRateHours: 8, useNonTaxableAllowances: false });
  };

  const handleCancelSpecialWeekendForm = () => {
    setShowSpecialWeekendForm(false);
    setEditingSpecialWeekend(null);
    setSpecialWeekendForm({ name: '', date: '', rateMultiplier: 1.5 });
  };

  // Tab navigation
  const tabs = [
    { id: 'general', name: 'General Settings', icon: '⚙️' },
    { id: 'leave', name: 'Leave Settings', icon: '🏖️' },
    { id: 'categories', name: 'Categories', icon: '📁' },
    { id: 'specialWeekends', name: 'Special Weekends', icon: '🎯' },
    { id: 'holidays', name: 'Holidays', icon: '🎉' },
    { id: 'positions', name: 'Job Positions', icon: '💼' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <MainSidebar />
      </div>

      <div className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your payroll system configuration, categories, weekends, holidays, and job positions
            </p>
          </div>

          {/* Message Alert */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
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
                  <p className={`text-sm font-medium ${
                    message.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
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

          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Payroll & System Settings
                </h3>
                
                <form onSubmit={handleSaveSystemSettings} className="space-y-6">
                  {/* Weekend Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Weekend Days
                    </label>
                    <div className="flex space-x-4">
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleWeekendDayToggle(day)}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            settings.weekendDays.includes(day)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* NEW: Late Arrival Time Setting */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Attendance Settings</h4>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="lateArrivalTime" className="block text-sm font-medium text-gray-700">
                          Late Arrival Time
                        </label>
                        <input
                          type="time"
                          id="lateArrivalTime"
                          value={settings.lateArrivalTime || '09:00'}
                          onChange={(e) => handleSystemSettingsChange('lateArrivalTime', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Employees arriving after this time will be marked as "Late"
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="standardWorkHours" className="block text-sm font-medium text-gray-700">
                          Standard Work Hours
                        </label>
                        <input
                          type="number"
                          id="standardWorkHours"
                          value={settings.standardWorkHours}
                          onChange={(e) => handleSystemSettingsChange('standardWorkHours', parseInt(e.target.value) || 8)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          max="24"
                          required
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Regular working hours per day
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rate Settings */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                        Base Hourly Rate (₵)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="hourlyRate"
                        value={settings.hourlyRate}
                        onChange={(e) => handleSystemSettingsChange('hourlyRate', parseFloat(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="overtimeHourlyRate" className="block text-sm font-medium text-gray-700">
                        Default Overtime Rate (₵)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="overtimeHourlyRate"
                        value={settings.overtimeHourlyRate}
                        onChange={(e) => handleSystemSettingsChange('overtimeHourlyRate', parseFloat(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Company Information Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Company Information</h4>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                          Company Name
                        </label>
                        <input
                          type="text"
                          id="companyName"
                          value={settings.companyName || ''}
                          onChange={(e) => handleSystemSettingsChange('companyName', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
                          Company Email
                        </label>
                        <input
                          type="email"
                          id="companyEmail"
                          value={settings.companyEmail || ''}
                          onChange={(e) => handleSystemSettingsChange('companyEmail', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
                          Company Phone
                        </label>
                        <input
                          type="text"
                          id="companyPhone"
                          value={settings.companyPhone || ''}
                          onChange={(e) => handleSystemSettingsChange('companyPhone', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">
                          Company Address
                        </label>
                        <input
                          type="text"
                          id="companyAddress"
                          value={settings.companyAddress || ''}
                          onChange={(e) => handleSystemSettingsChange('companyAddress', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tax and Deductions Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Tax & Deductions</h4>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div>
                        <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">
                          Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="taxRate"
                          value={settings.taxRate || 0}
                          onChange={(e) => handleSystemSettingsChange('taxRate', parseFloat(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="pensionRate" className="block text-sm font-medium text-gray-700">
                          Pension Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="pensionRate"
                          value={settings.pensionRate || 0}
                          onChange={(e) => handleSystemSettingsChange('pensionRate', parseFloat(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="socialSecurityRate" className="block text-sm font-medium text-gray-700">
                          Social Security Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="socialSecurityRate"
                          value={settings.socialSecurityRate || 0}
                          onChange={(e) => handleSystemSettingsChange('socialSecurityRate', parseFloat(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* OVERTIME MULTIPLIER SETTINGS */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Overtime Multiplier Settings</h4>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label htmlFor="defaultOvertimeMultiplier" className="block text-sm font-medium text-gray-700">
                          Default Overtime Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          id="defaultOvertimeMultiplier"
                          value={settings.defaultOvertimeMultiplier || 1.5}
                          onChange={(e) => handleSystemSettingsChange('defaultOvertimeMultiplier', parseFloat(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1.0"
                          max="3.0"
                        />
                        <p className="mt-1 text-sm text-gray-500">Regular overtime multiplier (e.g., 1.5x)</p>
                      </div>
                      
                      <div>
                        <label htmlFor="sundayOvertimeMultiplier" className="block text-sm font-medium text-gray-700">
                          Sunday Overtime Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          id="sundayOvertimeMultiplier"
                          value={settings.sundayOvertimeMultiplier || 2.0}
                          onChange={(e) => handleSystemSettingsChange('sundayOvertimeMultiplier', parseFloat(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1.0"
                          max="3.0"
                        />
                        <p className="mt-1 text-sm text-gray-500">Sunday overtime multiplier (e.g., 2.0x)</p>
                      </div>
                      
                      <div>
                        <label htmlFor="holidayOvertimeMultiplier" className="block text-sm font-medium text-gray-700">
                          Holiday Overtime Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          id="holidayOvertimeMultiplier"
                          value={settings.holidayOvertimeMultiplier || 2.5}
                          onChange={(e) => handleSystemSettingsChange('holidayOvertimeMultiplier', parseFloat(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1.0"
                          max="3.0"
                        />
                        <p className="mt-1 text-sm text-gray-500">Holiday overtime multiplier (e.g., 2.5x)</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="timeAndHalfMultiplier" className="block text-sm font-medium text-gray-700">
                          Time & Half Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          id="timeAndHalfMultiplier"
                          value={settings.timeAndHalfMultiplier || 1.5}
                          onChange={(e) => handleSystemSettingsChange('timeAndHalfMultiplier', parseFloat(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1.0"
                          max="3.0"
                        />
                        <p className="mt-1 text-sm text-gray-500">Multiplier for time and half calculations</p>
                      </div>
                    </div>
                  </div>

                  {/* Weekend & Holiday Rate Multipliers */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="weekendRate" className="block text-sm font-medium text-gray-700">
                        Weekend Pay Multiplier
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        id="weekendRate"
                        value={settings.weekendRate}
                        onChange={(e) => handleSystemSettingsChange('weekendRate', parseFloat(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="holidayRate" className="block text-sm font-medium text-gray-700">
                        Holiday Pay Multiplier
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        id="holidayRate"
                        value={settings.holidayRate}
                        onChange={(e) => handleSystemSettingsChange('holidayRate', parseFloat(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Toggle Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="doubleTimeOnSunday"
                        checked={settings.doubleTimeOnSunday}
                        onChange={(e) => handleSystemSettingsChange('doubleTimeOnSunday', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="doubleTimeOnSunday" className="ml-2 block text-sm text-gray-900">
                        Double Time on Sundays
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="timeAndHalfAfter8Hours"
                        checked={settings.timeAndHalfAfter8Hours}
                        onChange={(e) => handleSystemSettingsChange('timeAndHalfAfter8Hours', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="timeAndHalfAfter8Hours" className="ml-2 block text-sm text-gray-900">
                        Time and Half After 8 Hours
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableTimeAndHalfAfter8Hours"
                        checked={settings.enableTimeAndHalfAfter8Hours}
                        onChange={(e) => handleSystemSettingsChange('enableTimeAndHalfAfter8Hours', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="enableTimeAndHalfAfter8Hours" className="ml-2 block text-sm text-gray-900">
                        Enable Time and Half Multiplier
                      </label>
                    </div>
                  </div>

                  {/* Overtime Calculation Preview */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Overtime Calculation Preview</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Regular overtime: {settings.hourlyRate} × {settings.defaultOvertimeMultiplier || 1.5} = ₵{(settings.hourlyRate * (settings.defaultOvertimeMultiplier || 1.5)).toFixed(2)} per hour</p>
                      <p>• Sunday overtime: {settings.hourlyRate} × {settings.sundayOvertimeMultiplier || 2.0} = ₵{(settings.hourlyRate * (settings.sundayOvertimeMultiplier || 2.0)).toFixed(2)} per hour</p>
                      <p>• Holiday overtime: {settings.hourlyRate} × {settings.holidayOvertimeMultiplier || 2.5} = ₵{(settings.hourlyRate * (settings.holidayOvertimeMultiplier || 2.5)).toFixed(2)} per hour</p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Add Category Button */}
              {!showCategoryForm && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowCategoryForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Category
                  </button>
                </div>
              )}

              {/* Add/Edit Category Form */}
              {showCategoryForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                      {editingCategory ? 'Edit Category' : 'Add New Category'}
                    </h3>
                    
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
                            Category Name
                          </label>
                          <input
                            type="text"
                            id="categoryName"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="standardRateHours" className="block text-sm font-medium text-gray-700">
                            Standard Rate Hours
                          </label>
                          <input
                            type="number"
                            id="standardRateHours"
                            value={categoryForm.standardRateHours}
                            onChange={(e) => setCategoryForm(prev => ({ ...prev, standardRateHours: parseInt(e.target.value) }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                            min="1"
                            max="24"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="useNonTaxableAllowances"
                          checked={categoryForm.useNonTaxableAllowances}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, useNonTaxableAllowances: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="useNonTaxableAllowances" className="ml-2 block text-sm text-gray-900">
                          Use Non-Taxable Allowances for this category
                        </label>
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={handleCancelCategoryForm}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {editingCategory ? 'Update Category' : 'Add Category'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Categories List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                    Manage Categories
                  </h3>
                  
                  {settings.categories.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first category.</p>
                      <div className="mt-6">
                        <button
                          onClick={() => setShowCategoryForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Category
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Standard Rate Hours
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tax Configuration
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.categories.map((category) => (
                            <tr key={category.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {category.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {category.standardRateHours} hours
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {category.useNonTaxableAllowances ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Non-Taxable
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Taxable
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEditCategory(category)}
                                  className="text-blue-600 hover:text-blue-900 mr-4"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
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

          {/* Special Weekends Tab */}
          {activeTab === 'specialWeekends' && (
            <div className="space-y-6">
              {/* Add Special Weekend Button */}
              {!showSpecialWeekendForm && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowSpecialWeekendForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Special Weekend
                  </button>
                </div>
              )}

              {/* Add/Edit Special Weekend Form */}
              {showSpecialWeekendForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                      {editingSpecialWeekend ? 'Edit Special Weekend' : 'Add New Special Weekend'}
                    </h3>
                    
                    <form onSubmit={handleSpecialWeekendSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="specialWeekendName" className="block text-sm font-medium text-gray-700">
                            Weekend Name
                          </label>
                          <input
                            type="text"
                            id="specialWeekendName"
                            value={specialWeekendForm.name}
                            onChange={(e) => setSpecialWeekendForm(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Christmas Eve, New Year's Day"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="specialWeekendDate" className="block text-sm font-medium text-gray-700">
                            Date
                          </label>
                          <input
                            type="date"
                            id="specialWeekendDate"
                            value={specialWeekendForm.date}
                            onChange={(e) => setSpecialWeekendForm(prev => ({ ...prev, date: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="rateMultiplier" className="block text-sm font-medium text-gray-700">
                          Rate Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          id="rateMultiplier"
                          value={specialWeekendForm.rateMultiplier}
                          onChange={(e) => setSpecialWeekendForm(prev => ({ ...prev, rateMultiplier: parseFloat(e.target.value) }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1.0"
                          required
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Multiplier applied to base rate for this special weekend (e.g., 1.5 for time and half)
                        </p>
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={handleCancelSpecialWeekendForm}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {editingSpecialWeekend ? 'Update Special Weekend' : 'Add Special Weekend'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Special Weekends List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                    Manage Special Weekends
                  </h3>
                  
                  {settings.specialWeekends.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No special weekends</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first special weekend.</p>
                      <div className="mt-6">
                        <button
                          onClick={() => setShowSpecialWeekendForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Special Weekend
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rate Multiplier
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.specialWeekends.map((specialWeekend) => (
                            <tr key={specialWeekend.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {specialWeekend.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(specialWeekend.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {specialWeekend.rateMultiplier}x
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEditSpecialWeekend(specialWeekend)}
                                  className="text-blue-600 hover:text-blue-900 mr-4"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSpecialWeekend(specialWeekend.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
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

          {/* Holidays Tab */}
          {activeTab === 'holidays' && (
            <div className="space-y-6">
              {/* Add Holiday Button */}
              {!showHolidayForm && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowHolidayForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Holiday
                  </button>
                </div>
              )}

              {/* Add/Edit Holiday Form */}
              {showHolidayForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                      {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                    </h3>
                    
                    <form onSubmit={handleHolidaySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="holidayName" className="block text-sm font-medium text-gray-700">
                            Holiday Name
                          </label>
                          <input
                            type="text"
                            id="holidayName"
                            value={holidayForm.name}
                            onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="holidayDate" className="block text-sm font-medium text-gray-700">
                            Date
                          </label>
                          <input
                            type="date"
                            id="holidayDate"
                            value={holidayForm.date}
                            onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="payMultiplier" className="block text-sm font-medium text-gray-700">
                            Pay Multiplier
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            id="payMultiplier"
                            value={holidayForm.payMultiplier}
                            onChange={(e) => setHolidayForm(prev => ({ ...prev, payMultiplier: parseFloat(e.target.value) }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div className="flex items-center pt-6">
                          <input
                            type="checkbox"
                            id="recurring"
                            checked={holidayForm.recurring}
                            onChange={(e) => setHolidayForm(prev => ({ ...prev, recurring: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                            Recurring Holiday (Yearly)
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={handleCancelHolidayForm}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Holidays List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                    Manage Holidays
                  </h3>
                  
                  {settings.holidays.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No holidays</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first holiday.</p>
                      <div className="mt-6">
                        <button
                          onClick={() => setShowHolidayForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Holiday
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pay Multiplier
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.holidays.map((holiday) => (
                            <tr key={holiday.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {holiday.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(holiday.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {holiday.payMultiplier}x
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {holiday.recurring ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Recurring
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    One-time
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEditHoliday(holiday)}
                                  className="text-blue-600 hover:text-blue-900 mr-4"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteHoliday(holiday.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
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

          {/* Leave Settings Tab */}
          {activeTab === 'leave' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Leave Settings & Policies
                </h3>
                
                <form onSubmit={handleSaveLeaveSettings} className="space-y-6">
                  {/* Maternity & Paternity Leave Settings */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="maternityLeaveMonths" className="block text-sm font-medium text-gray-700">
                        Maternity Leave Duration (Months)
                      </label>
                      <input
                        type="number"
                        id="maternityLeaveMonths"
                        value={leaveSettings.maternityLeaveMonths}
                        onChange={(e) => setLeaveSettings(prev => ({ 
                          ...prev, 
                          maternityLeaveMonths: parseInt(e.target.value) || 3 
                        }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="12"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Standard maternity leave duration in months
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="paternityLeaveMonths" className="block text-sm font-medium text-gray-700">
                        Paternity Leave Duration (Months)
                      </label>
                      <input
                        type="number"
                        id="paternityLeaveMonths"
                        value={leaveSettings.paternityLeaveMonths}
                        onChange={(e) => setLeaveSettings(prev => ({ 
                          ...prev, 
                          paternityLeaveMonths: parseInt(e.target.value) || 1 
                        }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="12"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Standard paternity leave duration in months
                      </p>
                    </div>
                  </div>

                  {/* Non-Deductible Leave Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Non-Deductible Leave Types
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Select leave types that should NOT be deducted from employee's annual leave balance
                    </p>
                    
                    <div className="space-y-3">
                      {['Maternity', 'Paternity', 'Sick', 'Study', 'Annual', 'Casual', 'Bereavement', 'Other'].map((leaveType) => (
                        <div key={leaveType} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`leaveType-${leaveType}`}
                            checked={leaveSettings.nonDeductibleLeaveTypes.includes(leaveType)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setLeaveSettings(prev => ({
                                ...prev,
                                nonDeductibleLeaveTypes: isChecked
                                  ? [...prev.nonDeductibleLeaveTypes, leaveType]
                                  : prev.nonDeductibleLeaveTypes.filter(type => type !== leaveType)
                              }));
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`leaveType-${leaveType}`} className="ml-2 block text-sm text-gray-900">
                            {leaveType} Leave
                            {leaveType === 'Maternity' && ` (${leaveSettings.maternityLeaveMonths} months)`}
                            {leaveType === 'Paternity' && ` (${leaveSettings.paternityLeaveMonths} month)`}
                          </label>
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

                  {/* Submit Button */}
                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Leave Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Job Positions Tab */}
          {activeTab === 'positions' && (
            <div className="space-y-6">
              {/* Add Position Button */}
              {!showPositionForm && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowPositionForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Job Position
                  </button>
                </div>
              )}

              {/* Add/Edit Position Form */}
              {showPositionForm && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                      {editingPosition ? 'Edit Job Position' : 'Add New Job Position'}
                    </h3>
                    
                    <form onSubmit={handleJobPositionSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="positionName" className="block text-sm font-medium text-gray-700">
                            Position Name
                          </label>
                          <input
                            type="text"
                            id="positionName"
                            value={jobPositionForm.name}
                            onChange={(e) => setJobPositionForm(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="positionCategory" className="block text-sm font-medium text-gray-700">
                            Category
                          </label>
                          <select
                            id="positionCategory"
                            value={jobPositionForm.category?.id || ''}
                            onChange={(e) => {
                              const categoryId = e.target.value;
                              const selectedCategory = settings.categories.find(cat => cat.id === parseInt(categoryId));
                              setJobPositionForm(prev => ({ 
                                ...prev, 
                                category: selectedCategory 
                              }));
                            }}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Select a category</option>
                            {settings.categories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="positionDescription" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="positionDescription"
                          rows={3}
                          value={jobPositionForm.description}
                          onChange={(e) => setJobPositionForm(prev => ({ ...prev, description: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="baseRate" className="block text-sm font-medium text-gray-700">
                            Base Rate (₵)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            id="baseRate"
                            value={jobPositionForm.baseRate}
                            onChange={(e) => setJobPositionForm(prev => ({ ...prev, baseRate: parseFloat(e.target.value) }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="standardWorkHours" className="block text-sm font-medium text-gray-700">
                            Standard Work Hours
                          </label>
                          <input
                            type="number"
                            id="standardWorkHours"
                            value={jobPositionForm.standardWorkHours}
                            onChange={(e) => setJobPositionForm(prev => ({ ...prev, standardWorkHours: parseInt(e.target.value) }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                            max="24"
                            required
                          />
                        </div>
                      </div>

                      {/* Job Grades Section */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Job Grades</h4>
                        
                        {jobPositionForm.grades?.map((grade, index) => (
                          <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-4 p-4 border border-gray-200 rounded-md">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Grade Level
                              </label>
                              <input
                                type="text"
                                value={grade.level}
                                onChange={(e) => {
                                  const newGrades = [...jobPositionForm.grades];
                                  newGrades[index].level = e.target.value;
                                  setJobPositionForm(prev => ({ ...prev, grades: newGrades }));
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Junior, Senior, Manager"
                                required
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Hourly Rate (₵)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={grade.rate}
                                onChange={(e) => {
                                  const newGrades = [...jobPositionForm.grades];
                                  newGrades[index].rate = parseFloat(e.target.value);
                                  setJobPositionForm(prev => ({ ...prev, grades: newGrades }));
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Standard Hours
                              </label>
                              <input
                                type="number"
                                value={grade.standardWorkHours || jobPositionForm.standardWorkHours}
                                onChange={(e) => {
                                  const newGrades = [...jobPositionForm.grades];
                                  newGrades[index].standardWorkHours = parseInt(e.target.value);
                                  setJobPositionForm(prev => ({ ...prev, grades: newGrades }));
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                                max="24"
                              />
                            </div>
                            
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const newGrades = jobPositionForm.grades.filter((_, i) => i !== index);
                                  setJobPositionForm(prev => ({ ...prev, grades: newGrades }));
                                }}
                                className="px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={() => {
                            const newGrades = [...(jobPositionForm.grades || []), { level: '', rate: 0 }];
                            setJobPositionForm(prev => ({ ...prev, grades: newGrades }));
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Grade
                        </button>
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={handleCancelPositionForm}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {editingPosition ? 'Update Position' : 'Add Position'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Positions List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                    Manage Job Positions
                  </h3>
                  
                  {settings.jobPositions.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No job positions</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first job position.</p>
                      <div className="mt-6">
                        <button
                          onClick={() => setShowPositionForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Job Position
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Base Rate
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Work Hours
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Grades
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.jobPositions.map((position) => {
                            const category = position.category;
                            return (
                              <tr key={position.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{position.name}</div>
                                  {position.description && (
                                    <div className="text-sm text-gray-500">{position.description}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {category ? category.name : 'No Category'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  ₵{position.baseRate}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {position.standardWorkHours} hours
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {position.grades && position.grades.length > 0 ? (
                                    <div className="space-y-1">
                                      {position.grades.map((grade, index) => (
                                        <div key={index} className="flex justify-between">
                                          <span>{grade.level}:</span>
                                          <span>₵{grade.rate}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">No grades</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleEditPosition(position)}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeletePosition(position.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
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