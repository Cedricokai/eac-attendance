import { useContext, useState } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import MainSidebar from '../mainSidebar';
import { 
  FiSave, FiPlus, FiTrash2, FiEdit, FiX, FiDollarSign, 
  FiCalendar, FiClock, FiUsers, FiBriefcase, FiStar,
  FiChevronRight, FiHome, FiSettings
} from 'react-icons/fi';

function SettingsPage() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [activeTab, setActiveTab] = useState('rates');
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  // Pay Rates State
  const [hourlyRate, setHourlyRate] = useState(settings.hourlyRate || 0);
  const [overtimeRate, setOvertimeRate] = useState(settings.overtimeHourlyRate || 0);
  const [weekendRate, setWeekendRate] = useState(settings.weekendRate || 1.25);
  const [holidayRate, setHolidayRate] = useState(settings.holidayRate || 1.5);

  // Weekend Configuration State
  const [weekendDays, setWeekendDays] = useState(settings.weekendDays || []);
  const [dateWeekends, setDateWeekends] = useState(settings.dateWeekends || []);
  const [newWeekendDate, setNewWeekendDate] = useState('');
  const [weekendConfigName, setWeekendConfigName] = useState(settings.weekendConfigName || '');

  // Holidays State
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    name: '',
    recurring: true,
    payMultiplier: 1.5
  });

  // Job Positions State
  const [newPosition, setNewPosition] = useState({
    name: '',
    description: '',
    category: '',
    grades: [{ level: 'I', rate: 0 }]
  });
  const [editingPositionIndex, setEditingPositionIndex] = useState(null);

  // Days of week for weekend configuration
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Tab definitions with icons
  const tabs = [
    { id: 'rates', label: 'Pay Rates', icon: <FiDollarSign className="mr-2" /> },
    { id: 'holidays', label: 'Holidays', icon: <FiCalendar className="mr-2" /> },
    { id: 'weekend', label: 'Weekend Config', icon: <FiClock className="mr-2" /> },
    { id: 'categories', label: 'Categories', icon: <FiUsers className="mr-2" /> },
    { id: 'positions', label: 'Job Positions', icon: <FiBriefcase className="mr-2" /> },
  ];

  // Save settings with loading state
  const saveSettings = async (newSettings) => {
    setSaving(true);
    try {
      await updateSettings(newSettings);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle day as weekend
  const toggleWeekendDay = (dayIndex) => {
    const newDays = weekendDays.includes(dayIndex)
      ? weekendDays.filter(d => d !== dayIndex)
      : [...weekendDays, dayIndex];
    setWeekendDays(newDays);
  };

  // Add specific date weekend
  const handleAddWeekendDate = () => {
    if (!newWeekendDate) return;
    if (!dateWeekends.includes(newWeekendDate)) {
      setDateWeekends([...dateWeekends, newWeekendDate].sort());
      setNewWeekendDate('');
    }
  };

  // Remove specific date weekend
  const handleRemoveWeekendDate = (date) => {
    setDateWeekends(dateWeekends.filter(d => d !== date));
  };

  // Save weekend configuration
  const saveWeekendConfig = () => {
    saveSettings({
      weekendDays,
      weekendRate,
      dateWeekends,
      weekendConfigName
    });
  };

  // Save pay rates
  const handleSaveRates = (e) => {
    e.preventDefault();
    saveSettings({
      hourlyRate: parseFloat(hourlyRate),
      overtimeHourlyRate: parseFloat(overtimeRate),
      weekendRate: parseFloat(weekendRate),
      holidayRate: parseFloat(holidayRate)
    });
  };

  // Add holiday
  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) return;
    
    saveSettings({
      holidays: [...(settings.holidays || []), {
        ...newHoliday,
        date: newHoliday.date,
        name: newHoliday.name,
        recurring: newHoliday.recurring,
        payMultiplier: newHoliday.payMultiplier
      }]
    });
    
    setNewHoliday({
      date: '',
      name: '',
      recurring: true,
      payMultiplier: 1.5
    });
  };

  // Remove holiday
  const handleRemoveHoliday = (index) => {
    const updatedHolidays = [...settings.holidays];
    updatedHolidays.splice(index, 1);
    saveSettings({ holidays: updatedHolidays });
  };

  // Add category
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const currentCategories = settings.employeeCategories || [];
    if (!currentCategories.includes(newCategory)) {
      saveSettings({
        employeeCategories: [...currentCategories, newCategory]
      });
      setNewCategory('');
    }
  };

  // Remove category
  const handleRemoveCategory = (index) => {
    const updatedCategories = [...(settings.employeeCategories || [])];
    updatedCategories.splice(index, 1);
    saveSettings({ employeeCategories: updatedCategories });
  };

  // Job Positions Functions
  const handleAddGrade = () => {
    const nextLevel = String.fromCharCode(
      newPosition.grades[newPosition.grades.length - 1].level.charCodeAt(0) + 1
    );
    setNewPosition({
      ...newPosition,
      grades: [...newPosition.grades, { level: nextLevel, rate: 0 }]
    });
  };

  const handleRemoveGrade = (index) => {
    if (newPosition.grades.length <= 1) return;
    const updatedGrades = [...newPosition.grades];
    updatedGrades.splice(index, 1);
    setNewPosition({
      ...newPosition,
      grades: updatedGrades
    });
  };

  const handleGradeChange = (index, field, value) => {
    const updatedGrades = [...newPosition.grades];
    updatedGrades[index][field] = field === 'rate' ? parseFloat(value) || 0 : value;
    setNewPosition({
      ...newPosition,
      grades: updatedGrades
    });
  };

  const handleAddPosition = (e) => {
    e.preventDefault();
    if (!newPosition.name.trim()) return;
    
    const currentPositions = settings.jobPositions || [];
    
    if (editingPositionIndex !== null) {
      // Editing existing position
      const updatedPositions = [...currentPositions];
      updatedPositions[editingPositionIndex] = newPosition;
      saveSettings({ jobPositions: updatedPositions });
      setEditingPositionIndex(null);
    } else {
      // Adding new position
      saveSettings({
        jobPositions: [...currentPositions, newPosition]
      });
    }
    
    // Reset form
    setNewPosition({
      name: '',
      description: '',
      category: '',
      grades: [{ level: 'I', rate: 0 }]
    });
  };

  const handleEditPosition = (index) => {
    const positionToEdit = settings.jobPositions[index];
    setNewPosition(positionToEdit);
    setEditingPositionIndex(index);
  };

  const handleDeletePosition = (index) => {
    const updatedPositions = [...(settings.jobPositions || [])];
    updatedPositions.splice(index, 1);
    saveSettings({ jobPositions: updatedPositions });
  };

  const cancelEdit = () => {
    setNewPosition({
      name: '',
      description: '',
      category: '',
      grades: [{ level: 'I', rate: 0 }]
    });
    setEditingPositionIndex(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <MainSidebar />
      <main className="flex-1 p-6 ml-0 lg:ml-64"> {/* Changed ml-64 to ml-0 lg:ml-64 */}
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-600 mb-6">
          <a href="/" className="flex items-center text-blue-500 hover:text-blue-700">
            <FiHome className="mr-1" /> Home
          </a>
          <FiChevronRight className="mx-2" />
          <a href="/settings" className="flex items-center text-blue-500 hover:text-blue-700">
            <FiSettings className="mr-1" /> Settings
          </a>
          <FiChevronRight className="mx-2" />
          <span className="text-gray-500 capitalize">{activeTab}</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
          {saving && (
            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
              Saving...
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 bg-white rounded-lg shadow-sm overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center px-4 py-3 font-medium text-sm ${
                activeTab === tab.id 
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pay Rates Tab */}
        {activeTab === 'rates' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiDollarSign className="mr-2 text-blue-600" /> Pay Rate Configuration
              </h2>
              <p className="text-sm text-gray-600 mt-1">Set base pay rates and multipliers for different work conditions</p>
            </div>

            <div className="p-6">
              <form onSubmit={handleSaveRates} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-gray-50 p-4 rounded-lg">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Base Hourly Rate
  </label>
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span className="text-gray-500">GHS</span>
    </div>
    <input
      type="number"
      value={hourlyRate}
      onChange={(e) => setHourlyRate(e.target.value)}
      className="pl-[300px] w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      required
      min="0"
      step="0.01"
    />
  </div>
</div>

                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Rate</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">GHS</span>
                      </div>
                      <input
                        type="number"
                        value={overtimeRate}
                        onChange={(e) => setOvertimeRate(e.target.value)}
                        className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weekend Rate Multiplier</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">x</span>
                      </div>
                      <input
                        type="number"
                        value={weekendRate}
                        onChange={(e) => setWeekendRate(e.target.value)}
                        step="0.01"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Rate Multiplier</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">x</span>
                      </div>
                      <input
                        type="number"
                        value={holidayRate}
                        onChange={(e) => setHolidayRate(e.target.value)}
                        step="0.01"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={saving}
                  >
                    <FiSave className="mr-2" />
                    {saving ? 'Saving...' : 'Save Rates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiUsers className="mr-2 text-blue-600" /> Employee Categories
              </h2>
              <p className="text-sm text-gray-600 mt-1">Manage employee categories for better organization</p>
            </div>

            <div className="p-6">
              <div className="flex items-end gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add New Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category name"
                  />
                </div>
                <button
                  onClick={handleAddCategory}
                  className="flex items-center px-4 py-2 bg-blue-100 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={saving}
                >
                  <FiPlus className="mr-1" /> Add
                </button>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Current Categories</h3>
                {(settings.employeeCategories && settings.employeeCategories.length > 0) ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category Name
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {settings.employeeCategories.map((category, index) => (
                          <tr key={category} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveCategory(index)}
                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Remove category"
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No categories configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Job Positions Tab */}
        {activeTab === 'positions' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiBriefcase className="mr-2 text-blue-600" /> Job Positions Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">Define job positions with multiple grade levels and pay rates</p>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddPosition} className="space-y-6 mb-8 bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position Name</label>
                    <input
                      type="text"
                      value={newPosition.name}
                      onChange={(e) => setNewPosition({...newPosition, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="e.g., Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newPosition.category}
                      onChange={(e) => setNewPosition({...newPosition, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a category</option>
                      {settings.employeeCategories?.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newPosition.description}
                    onChange={(e) => setNewPosition({...newPosition, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Describe the responsibilities and requirements for this position"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800">Grade Levels & Rates</h3>
                    <button
                      type="button"
                      onClick={handleAddGrade}
                      className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                    >
                      <FiPlus className="mr-1" /> Add Grade
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {newPosition.grades.map((grade, index) => (
                      <div key={index} className="flex items-end gap-2 bg-white p-3 rounded-md border">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                          <input
                            type="text"
                            value={grade.level}
                            onChange={(e) => handleGradeChange(index, 'level', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (GHS)</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">GHS</span>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={grade.rate}
                              onChange={(e) => handleGradeChange(index, 'rate', e.target.value)}
                              className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                        </div>
                        {newPosition.grades.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGrade(index)}
                            className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                            title="Remove grade"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  {editingPositionIndex !== null && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      <FiX className="mr-1" /> Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={saving}
                  >
                    <FiSave className="mr-1" />
                    {editingPositionIndex !== null ? 'Update Position' : 'Add Position'}
                  </button>
                </div>
              </form>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Current Job Positions</h3>
                {settings.jobPositions?.length > 0 ? (
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grades</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {settings.jobPositions.map((position, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{position.name}</div>
                              <div className="text-sm text-gray-500 mt-1">{position.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {position.category || <span className="text-gray-400">Uncategorized</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {position.grades.map(grade => (
                                  <div key={grade.level} className="flex justify-between mb-1 last:mb-0">
                                    <span className="font-medium">Grade {grade.level}:</span>
                                    <span className="text-blue-600">GHS{grade.rate.toFixed(2)}/hr</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditPosition(index)}
                                className="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                title="Edit position"
                              >
                                <FiEdit />
                              </button>
                              <button
                                onClick={() => handleDeletePosition(index)}
                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Delete position"
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FiBriefcase className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No job positions configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Holidays Tab */}
        {activeTab === 'holidays' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiCalendar className="mr-2 text-blue-600" /> Holiday Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">Manage holidays and special pay rates</p>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddHoliday} className="space-y-4 bg-blue-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                    <input
                      type="text"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pay Multiplier</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">x</span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={newHoliday.payMultiplier}
                        onChange={(e) => setNewHoliday({...newHoliday, payMultiplier: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        checked={newHoliday.recurring}
                        onChange={(e) => setNewHoliday({...newHoliday, recurring: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">Recurring annually</label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={saving}
                  >
                    <FiPlus className="mr-1" /> Add Holiday
                  </button>
                </div>
              </form>

              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Current Holidays</h3>
                {settings.holidays?.length > 0 ? (
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurring</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {settings.holidays.map((holiday, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Date(holiday.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{holiday.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holiday.payMultiplier}x</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {holiday.recurring ? 
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span> : 
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">No</span>
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveHoliday(index)}
                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Remove holiday"
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No holidays configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weekend Config Tab */}
        {activeTab === 'weekend' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiClock className="mr-2 text-blue-600" /> Weekend Configuration
              </h2>
              <p className="text-sm text-gray-600 mt-1">Configure weekend days and special date weekends</p>
            </div>

            <div className="p-6 space-y-8">
              {/* Regular Weekend Days */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Regular Weekend Days</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select days that are always weekends:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeekendDay(index)}
                          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            weekendDays.includes(index)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                        >
                          {weekendDays.includes(index) && <FiStar className="mr-1" />}
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weekend Rate Multiplier</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">x</span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={weekendRate}
                        onChange={(e) => setWeekendRate(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Specific Date Weekends */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Specific Date Weekends</h3>
                <div className="flex items-end gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Add Specific Date</label>
                    <input
                      type="date"
                      value={newWeekendDate}
                      onChange={(e) => setNewWeekendDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddWeekendDate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus className="mr-1" /> Add Date
                  </button>
                </div>

                {dateWeekends.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dateWeekends.map((date) => (
                          <tr key={date} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Date(date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                type="button"
                                onClick={() => handleRemoveWeekendDate(date)}
                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Remove date"
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No specific date weekends configured yet</p>
                  </div>
                )}
              </div>

              {/* Config Name */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Configuration Name</label>
                <input
                  type="text"
                  value={weekendConfigName}
                  onChange={(e) => setWeekendConfigName(e.target.value)}
                  placeholder="Name your configuration"
                  className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={saveWeekendConfig}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={saving}
                >
                  <FiSave className="mr-1" />
                  {saving ? 'Saving...' : 'Save Weekend Config'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SettingsPage;