import React, { createContext, useState, useContext, useEffect } from 'react';

export const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    // Payroll Settings - Will be loaded from backend
    hourlyRate: 0,
    overtimeHourlyRate: 0,
    standardWorkHours: 0,
    
    // Time & Attendance Settings
    weekendDays: [],
    doubleTimeOnSunday: false,
    timeAndHalfAfter8Hours: false,
    weekendRate: 0,
    holidayRate: 0,
    
    // Employee Categories
    employeeCategories: [],
    
    // Job Positions
    jobPositions: [],
    
    // Holidays
    holidays: [],
    
    // Allowance Settings
    allowances: {
      rent: 0,
      transport: 0,
      clothing: 0,
      other: 0
    },
    
    // Tax Settings
    taxSettings: {
      ssnitRate: 0,
      taxableIncomeThreshold: 0
    },
    
    // System Settings
    systemSettings: {
      autoCalculateOvertime: false,
      requireApprovalForOvertime: false,
      enableBiometricIntegration: false,
      defaultShift: "Day",
      attendanceValidationRequired: false
    }
  });

  const [loading, setLoading] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Load all settings from backend on component mount
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      if (!token) {
        console.warn('No JWT token found');
        setLoading(false);
        return;
      }

      console.log('🔍 Loading settings from:', `${API_BASE_URL}/api/settings/all`);

      const response = await fetch(`${API_BASE_URL}/api/settings/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Settings loaded successfully:', data);
      
      // Extract system settings properly
      const systemSettings = data.system || {};
      
      setSettings(prev => ({
        ...prev,
        // System settings
        hourlyRate: systemSettings.hourlyRate || 0,
        overtimeHourlyRate: systemSettings.overtimeHourlyRate || 0,
        standardWorkHours: systemSettings.standardWorkHours || 8,
        weekendDays: data.weekendDays || [],
        doubleTimeOnSunday: systemSettings.doubleTimeOnSunday || false,
        timeAndHalfAfter8Hours: systemSettings.timeAndHalfAfter8Hours || false,
        weekendRate: systemSettings.weekendRate || 1.0,
        holidayRate: systemSettings.holidayRate || 1.0,
        employeeCategories: data.employeeCategories || [],
        // Dynamic data
        jobPositions: data.jobPositions || [],
        holidays: data.holidays || []
      }));
    } catch (error) {
      console.error('❌ Error loading settings from backend:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Update system settings
  const updateSystemSettings = async (newSettings) => {
    try {
      const token = getToken();
      
      // Prepare settings - don't stringify arrays, let Spring handle conversion
      const settingsToSend = {
        hourlyRate: parseFloat(newSettings.hourlyRate) || 0,
        overtimeHourlyRate: parseFloat(newSettings.overtimeHourlyRate) || 0,
        standardWorkHours: parseInt(newSettings.standardWorkHours) || 8,
        weekendDays: Array.isArray(newSettings.weekendDays) ? newSettings.weekendDays : [],
        doubleTimeOnSunday: Boolean(newSettings.doubleTimeOnSunday),
        timeAndHalfAfter8Hours: Boolean(newSettings.timeAndHalfAfter8Hours),
        weekendRate: parseFloat(newSettings.weekendRate) || 1.0,
        holidayRate: parseFloat(newSettings.holidayRate) || 1.0,
        employeeCategories: Array.isArray(newSettings.employeeCategories) ? newSettings.employeeCategories : []
      };

      console.log('📤 Sending system settings to backend:', settingsToSend);

      const response = await fetch(`${API_BASE_URL}/api/settings/system`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSend)
      });

      if (response.ok) {
        const savedSettings = await response.json();
        console.log('✅ System settings saved successfully:', savedSettings);
        await loadAllSettings(); // Reload all settings
        return savedSettings;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error updating system settings:', errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('❌ Error updating system settings:', error);
      throw error;
    }
  };

  // Add holiday
  const addHoliday = async (holiday) => {
    try {
      const token = getToken();
      console.log('📤 Adding holiday:', holiday);
      
      const response = await fetch(`${API_BASE_URL}/api/settings/holidays`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(holiday)
      });

      console.log('📨 Holiday response status:', response.status);
      
      if (response.ok) {
        const savedHoliday = await response.json();
        console.log('✅ Holiday saved successfully:', savedHoliday);
        await loadAllSettings();
        return savedHoliday;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error adding holiday:', errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('❌ Error adding holiday:', error);
      throw error;
    }
  };

  // Update holiday
  const updateHoliday = async (id, holiday) => {
    try {
      const token = getToken();
      console.log(`📤 Updating holiday ${id}:`, holiday);
      
      const response = await fetch(`${API_BASE_URL}/api/settings/holidays/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(holiday)
      });

      if (response.ok) {
        const updatedHoliday = await response.json();
        console.log('✅ Holiday updated successfully:', updatedHoliday);
        await loadAllSettings();
        return updatedHoliday;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error updating holiday:', errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('❌ Error updating holiday:', error);
      throw error;
    }
  };

  // Delete holiday
  const deleteHoliday = async (id) => {
    try {
      const token = getToken();
      console.log(`🗑️ Deleting holiday ${id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/settings/holidays/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        console.log('✅ Holiday deleted successfully');
        await loadAllSettings();
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error deleting holiday:', errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('❌ Error deleting holiday:', error);
      throw error;
    }
  };

  // Add job position
  const addJobPosition = async (position) => {
    try {
      const token = getToken();
      console.log('📤 Adding job position:', position);
      
      const response = await fetch(`${API_BASE_URL}/api/settings/job-positions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(position)
      });

      if (response.ok) {
        const savedPosition = await response.json();
        console.log('✅ Job position saved successfully:', savedPosition);
        await loadAllSettings();
        return savedPosition;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error adding job position:', errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('❌ Error adding job position:', error);
      throw error;
    }
  };

  // Update job position
  const updateJobPosition = async (id, position) => {
    try {
      const token = getToken();
      console.log(`📤 Updating job position ${id}:`, position);
      
      const response = await fetch(`${API_BASE_URL}/api/settings/job-positions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(position)
      });

      if (response.ok) {
        const updatedPosition = await response.json();
        console.log('✅ Job position updated successfully:', updatedPosition);
        await loadAllSettings();
        return updatedPosition;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error updating job position:', errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('❌ Error updating job position:', error);
      throw error;
    }
  };

  // Delete job position
  const deleteJobPosition = async (id) => {
    try {
      const token = getToken();
      console.log(`🗑️ Deleting job position ${id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/settings/job-positions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        console.log('✅ Job position deleted successfully');
        await loadAllSettings();
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error deleting job position:', errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('❌ Error deleting job position:', error);
      throw error;
    }
  };

  // Helper functions
  const isHoliday = (date) => {
    if (!date) return false;
    const dateStr = new Date(date).toISOString().split('T')[0];
    
    return settings.holidays?.some(holiday => {
      if (holiday.recurring) {
        const holidayDate = new Date(holiday.date);
        const checkDate = new Date(date);
        return holidayDate.getMonth() === checkDate.getMonth() && 
               holidayDate.getDate() === checkDate.getDate();
      }
      return holiday.date === dateStr;
    }) || false;
  };

  const isWeekend = (date) => {
    if (!date) return false;
    
    try {
      const day = new Date(date).getDay();
      return settings.weekendDays?.includes(day) || false;
    } catch (error) {
      console.error('Error checking weekend:', error);
      return false;
    }
  };

  const getHolidayMultiplier = (date) => {
    const holiday = settings.holidays.find(h => {
      const dateStr = new Date(date).toISOString().split('T')[0];
      if (h.recurring) {
        const holidayDate = new Date(h.date);
        const checkDate = new Date(date);
        return holidayDate.getMonth() === checkDate.getMonth() && 
               holidayDate.getDate() === checkDate.getDate();
      }
      return h.date === dateStr;
    });
    
    return holiday?.payMultiplier || settings.holidayRate;
  };

  // Get position rate
  const getPositionRate = (positionName, grade) => {
    const position = settings.jobPositions?.find(p => p.name === positionName);
    const gradeInfo = position?.grades?.find(g => g.level === grade);
    return gradeInfo?.rate || settings.hourlyRate;
  };

  // Get position standard work hours
  const getPositionStandardHours = (positionName, grade) => {
    const position = settings.jobPositions?.find(p => p.name === positionName);
    const gradeInfo = position?.grades?.find(g => g.level === grade);
    return gradeInfo?.standardWorkHours || settings.standardWorkHours;
  };

  // Get all positions for a category
  const getPositionsByCategory = (category) => {
    return settings.jobPositions?.filter(position => position.category === category) || [];
  };

  // Get all categories
  const getPositionCategories = () => {
    const categories = settings.jobPositions?.map(position => position.category) || [];
    return [...new Set(categories)]; // Remove duplicates
  };

  // Calculate pay for attendance
  const calculatePay = (attendance, employee) => {
    const baseRate = employee?.minimumRate || settings.hourlyRate;
    let multiplier = 1;
    
    if (isHoliday(attendance.date)) {
      multiplier = getHolidayMultiplier(attendance.date);
    } else if (isWeekend(attendance.date)) {
      multiplier = settings.weekendRate;
    }
    
    if (settings.doubleTimeOnSunday && new Date(attendance.date).getDay() === 0) {
      multiplier = Math.max(multiplier, 2);
    }
    
    const standardHours = getPositionStandardHours(employee?.jobPosition, employee?.jobGrade);
    const regularHours = Math.min(attendance.minimumHour, standardHours);
    const overtimeHours = Math.max(attendance.minimumHour - standardHours, 0);
    
    let totalPay = 0;
    
    if (settings.timeAndHalfAfter8Hours) {
      totalPay = (regularHours * baseRate * multiplier) + 
                 (overtimeHours * baseRate * multiplier * (settings.overtimeHourlyRate / settings.hourlyRate));
    } else {
      totalPay = attendance.minimumHour * baseRate * multiplier;
    }
    
    return totalPay;
  };

  // Reset to default settings
  const resetToDefaults = () => {
    const defaultSettings = {
      hourlyRate: 0,
      overtimeHourlyRate: 0,
      standardWorkHours: 0,
      weekendDays: [],
      doubleTimeOnSunday: false,
      timeAndHalfAfter8Hours: false,
      weekendRate: 0,
      holidayRate: 0,
      employeeCategories: [],
    };
    
    setSettings(prevSettings => ({
      ...prevSettings,
      ...defaultSettings
    }));
  };

  const value = {
    settings,
    loading,
    updateSettings: updateSystemSettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addJobPosition,
    updateJobPosition,
    deleteJobPosition,
    isHoliday,
    isWeekend,
    getHolidayMultiplier,
    calculatePay,
    getPositionRate,
    getPositionStandardHours,
    getPositionsByCategory,
    getPositionCategories,
    resetToDefaults,
    refreshSettings: loadAllSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;