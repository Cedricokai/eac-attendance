import { createContext, useState, useEffect, useContext } from 'react';

export const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? JSON.parse(saved) : {
      hourlyRate: 25,
      overtimeHourlyRate: 37.5,
      weekendRate: 1.25,
      holidayRate: 1.5,
      weekendDays: [0, 6], // Sunday, Saturday
      holidays: [],
      employeeCategories: ["Projects", "Site Services", "Ahafo North", "NSS"],
      jobPositions: []
    };
  });

  const addJobPosition = (position) => {
    const positions = [...(settings.jobPositions || []), position];
    return updateSettings({ jobPositions: positions });
  };

  const updateJobPosition = (index, position) => {
    const positions = [...settings.jobPositions];
    positions[index] = position;
    return updateSettings({ jobPositions: positions });
  };

  const deleteJobPosition = (index) => {
    const positions = settings.jobPositions.filter((_, i) => i !== index);
    return updateSettings({ jobPositions: positions });
  };

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
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('appSettings', JSON.stringify(updated));
    return updated;
  };

  const getPositionRate = (positionName, grade = 'I') => {
    const position = settings.jobPositions?.find(p => p.name === positionName);
    if (!position) return null;
    
    const gradeData = position.grades?.find(g => g.level === grade);
    return gradeData?.rate || position.baseRate || null;
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      addJobPosition,
      updateJobPosition,
      deleteJobPosition,
      getPositionRate
    }}>
      {children}
    </SettingsContext.Provider>
  );
};