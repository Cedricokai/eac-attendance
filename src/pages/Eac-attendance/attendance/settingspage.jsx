import React, { useState, useEffect } from 'react';

const SettingsPage = () => {
  // Local state for all settings
  const [settings, setSettings] = useState({
    hourlyRate: 0,
    overtimeHourlyRate: 0,
    standardWorkHours: 8,
    weekendDays: [],
    doubleTimeOnSunday: false,
    timeAndHalfAfter8Hours: false,
    weekendRate: 1.0,
    holidayRate: 1.0,
    holidays: [],
    jobPositions: []
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
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
    standardWorkHours: 8
  });
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080').replace(/\/$/, '');

 // And update the loadAllSettings function to use existing endpoints:
const loadAllSettings = async () => {
  try {
    setLoading(true);
    const token = getToken();
    
    if (!token) {
      console.warn('No JWT token found');
      setLoading(false);
      return;
    }

    // Instead of using /api/settings/all, fetch each endpoint separately
    const [systemRes, holidaysRes, positionsRes] = await Promise.all([
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
      })
    ]);

    if (!systemRes.ok || !holidaysRes.ok || !positionsRes.ok) {
      throw new Error('Failed to load some settings');
    }

    const systemSettings = await systemRes.json();
    const holidays = await holidaysRes.json();
    const jobPositions = await positionsRes.json();
    
    setSettings(prev => ({
      ...prev,
      hourlyRate: systemSettings.hourlyRate || 0,
      overtimeHourlyRate: systemSettings.overtimeHourlyRate || 0,
      standardWorkHours: systemSettings.standardWorkHours || 8,
      weekendDays: systemSettings.weekendDays || [],
      doubleTimeOnSunday: systemSettings.doubleTimeOnSunday || false,
      timeAndHalfAfter8Hours: systemSettings.timeAndHalfAfter8Hours || false,
      weekendRate: systemSettings.weekendRate || 1.0,
      holidayRate: systemSettings.holidayRate || 1.0,
      holidays: holidays || [],
      jobPositions: jobPositions || []
    }));
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

  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Load all settings from backend
 

// In your SettingsPage component, change the API_BASE_URL




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
    const currentDays = settings.weekendDays;
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
        hourlyRate: settings.hourlyRate,
        overtimeHourlyRate: settings.overtimeHourlyRate,
        standardWorkHours: settings.standardWorkHours,
        weekendDays: settings.weekendDays,
        doubleTimeOnSunday: settings.doubleTimeOnSunday,
        timeAndHalfAfter8Hours: settings.timeAndHalfAfter8Hours,
        weekendRate: settings.weekendRate,
        holidayRate: settings.holidayRate
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
        await loadAllSettings(); // Reload to get any server-side changes
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      showMessage('error', 'Failed to update system settings');
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
        setJobPositionForm({ name: '', category: '', description: '', baseRate: 0, standardWorkHours: 8 });
        setEditingPosition(null);
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
      standardWorkHours: position.standardWorkHours
    });
    setEditingPosition(position);
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

  // Tab navigation
  const tabs = [
    { id: 'general', name: 'General Settings', icon: '⚙️' },
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your payroll system configuration, holidays, and job positions
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
                {/* Rate Settings */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                      Standard Hourly Rate (₵)
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
                      Overtime Hourly Rate (₵)
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

                {/* Work Hours */}
                <div>
                  <label htmlFor="standardWorkHours" className="block text-sm font-medium text-gray-700">
                    Standard Work Hours Per Day
                  </label>
                  <input
                    type="number"
                    id="standardWorkHours"
                    value={settings.standardWorkHours}
                    onChange={(e) => handleSystemSettingsChange('standardWorkHours', parseInt(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

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

                {/* Rate Multipliers */}
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

        {/* Holidays Tab */}
        {activeTab === 'holidays' && (
          <div className="space-y-6">
            {/* Add/Edit Holiday Form */}
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
                    {editingHoliday && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHoliday(null);
                          setHolidayForm({ name: '', date: '', recurring: false, payMultiplier: 1.0 });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                    )}
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

            {/* Holidays List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Manage Holidays
                </h3>
                
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
                      {settings.holidays.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                            No holidays configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Positions Tab */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            {/* Add/Edit Position Form */}
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
                      <input
                        type="text"
                        id="positionCategory"
                        value={jobPositionForm.category}
                        onChange={(e) => setJobPositionForm(prev => ({ ...prev, category: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
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
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    {editingPosition && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPosition(null);
                          setJobPositionForm({ name: '', category: '', description: '', baseRate: 0, standardWorkHours: 8 });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                    )}
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

            {/* Positions List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Manage Job Positions
                </h3>
                
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
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {settings.jobPositions.map((position) => (
                        <tr key={position.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{position.name}</div>
                            {position.description && (
                              <div className="text-sm text-gray-500">{position.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {position.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₵{position.baseRate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {position.standardWorkHours} hours
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
                      ))}
                      {settings.jobPositions.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                            No job positions configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;