
import { createContext, useState, useEffect } from 'react';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    hourlyRate: 0,
    overtimeHourlyRate: 0,
    weekendRate: 1.25,
    holidayRate: 1.5,
    weekendDays: [],
    dateWeekends: [],
    weekendConfigName: '',
    holidays: [],
    employeeCategories: ["Projects", "Site Services", "Ahafo North"] // Default categories
  });

  // Load settings from localStorage on initial load
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};