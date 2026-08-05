import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { lunchApi } from '../services/lunchApi';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday'
};

const EmployeeWeeklyAssignmentModal = ({ employee, onClose, onSaved }) => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getMondayOfCurrentWeek());
  const [dayMeals, setDayMeals] = useState({});
  const [error, setError] = useState(null);

  function getMondayOfCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    return monday.toISOString().split('T')[0];
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [mealsRes, assignmentRes] = await Promise.all([
          lunchApi.getMeals(),
          lunchApi.getEmployeeWeeklyAssignment(employee.id, selectedWeekStart)
        ]);

        console.log('Meals response:', mealsRes);
        console.log('Assignment response:', assignmentRes);

        const mealsData = mealsRes.data || mealsRes;
        const mealsArray = Array.isArray(mealsData) ? mealsData : [];
        setMeals(mealsArray);

        const existing = assignmentRes.data || assignmentRes || null;
        setAssignment(existing);

        if (existing && existing.days) {
          setDayMeals(existing.days);
        } else {
          const empty = {};
          DAYS.forEach(day => (empty[day] = null));
          setDayMeals(empty);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employee.id, selectedWeekStart]);

  const handleDayMealChange = (day, mealId) => {
    setDayMeals(prev => ({
      ...prev,
      [day]: mealId === '' ? null : parseInt(mealId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const daysToSend = {};
      DAYS.forEach(day => {
        const mealId = dayMeals[day];
        daysToSend[day] = (mealId !== null && mealId !== undefined && mealId !== '') ? mealId : null;
      });

      const payload = {
        employeeId: employee.id,
        startDate: selectedWeekStart,
        days: daysToSend
      };

      await lunchApi.createOrUpdateWeeklyAssignment(payload);
      alert('Weekly meal assignment saved successfully!');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving assignment:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error occurred';
      setError(errorMessage);
      alert('Failed to save assignment: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleWeekChange = (e) => {
    setSelectedWeekStart(e.target.value);
  };

  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Weekly Meal Assignment – {fullName || 'Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
              <p className="font-semibold">Error loading data</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Start (Monday)</label>
                <input
                  type="date"
                  value={selectedWeekStart}
                  onChange={handleWeekChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Assign meals for Monday to Friday of this week.
                </p>
              </div>

              {meals.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-sm">No meals available.</p>
                  <p className="text-xs mt-1">Please add meals via the Meal Management page first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-24 font-medium text-gray-700">{DAY_LABELS[day]}</div>
                      <select
                        value={dayMeals[day] !== null && dayMeals[day] !== undefined ? dayMeals[day] : ''}
                        onChange={(e) => handleDayMealChange(day, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">— No meal —</option>
                        {meals.map(meal => (
                          <option key={meal.id} value={meal.id}>
                            {meal.name} {meal.price ? `(₵${meal.price})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || meals.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      Save Assignment
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeWeeklyAssignmentModal;