import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { lunchApi } from '../services/lunchApi';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const EmployeeMealAssignmentModal = ({ employee, onClose, onUpdate }) => {
  const [meals, setMeals] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState(() => {
    // Get current week's Monday
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchMeals();
    fetchAssignments();
  }, [employee.id, weekStart]);

  const fetchMeals = async () => {
    try {
      const res = await lunchApi.getMeals();
      setMeals(res.data || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Fetch existing assignments for this employee for the week
      const res = await lunchApi.getEmployeeWeekAssignments(employee.id, weekStart);
      const data = res.data || [];
      // Build a map: day -> mealId
      const map = {};
      data.forEach(item => {
        const date = new Date(item.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        map[dayName] = item.mealId;
      });
      setAssignments(map);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      // If not implemented, just leave empty
    } finally {
      setLoading(false);
    }
  };

  const handleMealChange = (day, mealId) => {
    setAssignments(prev => ({ ...prev, [day]: mealId }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build payload: list of { employeeId, date, mealId }
      const payload = DAYS.map(day => {
        const mealId = assignments[day];
        if (!mealId) return null; // skip if no meal selected
        // Compute the date for this day in the week
        const dayIndex = DAYS.indexOf(day);
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        return {
          employeeId: employee.id,
          date: date.toISOString().split('T')[0],
          mealId: mealId,
        };
      }).filter(item => item !== null);

      await lunchApi.saveWeeklyMealAssignments(payload);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleClearDay = (day) => {
    setAssignments(prev => {
      const newAssign = { ...prev };
      delete newAssign[day];
      return newAssign;
    });
  };

  const weekDates = DAYS.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date.toISOString().split('T')[0];
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Weekly Meal Assignment</h2>
            <p className="text-sm text-gray-500">
              {employee.firstName} {employee.lastName} – {employee.employeeId}
            </p>
            <p className="text-xs text-gray-400">Week starting {weekStart}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {DAYS.map((day, index) => {
                    const date = weekDates[index];
                    const selectedMealId = assignments[day] || '';
                    return (
                      <tr key={day}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{day}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{date}</td>
                        <td className="px-4 py-3">
                          <select
                            value={selectedMealId}
                            onChange={(e) => handleMealChange(day, e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Select Meal</option>
                            {meals.map(meal => (
                              <option key={meal.id} value={meal.id}>
                                {meal.name} (₵{meal.price})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {selectedMealId && (
                            <button
                              onClick={() => handleClearDay(day)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Clear
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5" />
                Save Weekly Meals
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeMealAssignmentModal;