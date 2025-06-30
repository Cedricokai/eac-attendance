import { useContext, useState } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';

function  SettingsPage() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [activeTab, setActiveTab] = useState('rates');
  const navigate = useNavigate();

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

  // Days of week for weekend configuration
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    updateSettings({
      weekendDays,
      weekendRate,
      dateWeekends,
      weekendConfigName
    });
    alert('Weekend configuration saved!');
  };

  // Save pay rates
  const handleSaveRates = (e) => {
    e.preventDefault();
    updateSettings({
      hourlyRate: parseFloat(hourlyRate),
      overtimeHourlyRate: parseFloat(overtimeRate),
      weekendRate: parseFloat(weekendRate),
      holidayRate: parseFloat(holidayRate)
    });
    alert('Rates saved successfully!');
  };

  // Add holiday
  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) return;
    
    updateSettings({
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
    updateSettings({ holidays: updatedHolidays });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <nav className="flex items-center text-sm text-gray-600 mb-6">
          <a href="/" className="text-blue-500 hover:text-blue-700">Home</a>
          <span className="mx-2">/</span>
          <a href="/settings" className="text-blue-500 hover:text-blue-700">Settings</a>
          <span className="mx-2">/</span>
          <span className="text-gray-500 capitalize">{activeTab}</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">System Settings</h1>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {['rates', 'holidays', 'weekend'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === tab 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'rates' && 'Pay Rates'}
              {tab === 'holidays' && 'Holidays'}
              {tab === 'weekend' && 'Weekend Config'}
            </button>
          ))}
        </div>

        {/* Pay Rates Tab */}
        {activeTab === 'rates' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Pay Rate Configuration</h2>
            </div>

            <div className="p-6">
              <form onSubmit={handleSaveRates} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Hourly Rate</label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Rate</label>
                    <input
                      type="number"
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weekend Rate Multiplier</label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Rate Multiplier</label>
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

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Rates
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Holidays Tab */}
        {activeTab === 'holidays' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Holiday Management</h2>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddHoliday} className="space-y-4">
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
                  <div className="flex items-end">
                    <div className="flex items-center">
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

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Holiday
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
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(holiday.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{holiday.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holiday.payMultiplier}x</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {holiday.recurring ? 'Yes' : 'No'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveHoliday(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No holidays configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weekend Config Tab */}
        {activeTab === 'weekend' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Weekend Configuration</h2>
            </div>

            <div className="p-6 space-y-8">
              {/* Regular Weekend Days */}
              <div>
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
  className={`px-4 py-2 rounded-md text-sm font-medium ${
    weekendDays.includes(index)
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  {day}
</button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weekend Pay Rate Multiplier
                    </label>
                    <input
                      type="number"
                      value={weekendRate}
                      onChange={(e) => setWeekendRate(e.target.value)}
                      step="0.01"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Specific Date Weekends */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Specific Date Weekends
                </h3>
                <div className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Add Specific Weekend Date
                      </label>
                      <input
                        type="date"
                        value={newWeekendDate}
                        onChange={(e) => setNewWeekendDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleAddWeekendDate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add Date
                    </button>
                  </div>

                  {dateWeekends.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Day
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dateWeekends.map((date) => {
                            const dateObj = new Date(date);
                            const dayName = dateObj.toLocaleDateString(undefined, {
                              weekday: 'long',
                            });
                            return (
                              <tr key={date}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {dateObj.toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {dayName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleRemoveWeekendDate(date)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Remove
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

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={saveWeekendConfig}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Weekend Configuration
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