import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, XMarkIcon, PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { lunchApi } from './services/lunchApi';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday'
};

const WeeklyLunchAssignment = () => {
  const [employees, setEmployees] = useState([]);
  const [meals, setMeals] = useState([]);
  const [weekStart, setWeekStart] = useState(getMondayOfCurrentWeek());
  const [assignments, setAssignments] = useState({}); // key: employeeId, value: { day: mealId }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [bulkMealId, setBulkMealId] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [search, setSearch] = useState('');

  function getMondayOfCurrentWeek() {
    const today = new Date();
    const day = today.getDay(); // 0=Sun, 1=Mon
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  }

  // Fetch employees, meals, and existing assignments
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Get all employees
        const empRes = await lunchApi.getAllEmployees();
        const empData = empRes.data || empRes || [];
        setEmployees(empData);

        // Get all meals
        const mealRes = await lunchApi.getMeals();
        const mealData = mealRes.data || mealRes || [];
        setMeals(mealData);

        // Fetch assignments for each employee for this week
        // To avoid many requests, we could have a bulk endpoint; for now we fetch per employee.
        // But we can optimize by fetching only for employees that have assignments.
        const assignmentPromises = empData.map(emp =>
          lunchApi.getEmployeeWeeklyAssignment(emp.id, weekStart)
            .then(res => ({ employeeId: emp.id, data: res.data || null }))
            .catch(() => ({ employeeId: emp.id, data: null }))
        );
        const results = await Promise.all(assignmentPromises);
        const assignmentMap = {};
        results.forEach(({ employeeId, data }) => {
          if (data && data.days) {
            assignmentMap[employeeId] = data.days; // { MONDAY: 5, TUESDAY: null, ... }
          }
        });
        setAssignments(assignmentMap);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [weekStart]);

  // Handle individual day change
  const handleDayChange = (employeeId, day, mealId) => {
    setAssignments(prev => {
      const employeeAssign = prev[employeeId] || {};
      const updated = { ...employeeAssign, [day]: mealId === '' ? null : parseInt(mealId) };
      return { ...prev, [employeeId]: updated };
    });
  };

  // Toggle employee selection for bulk
  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) newSet.delete(employeeId);
      else newSet.add(employeeId);
      return newSet;
    });
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)));
    }
  };

  // Bulk apply meal to selected employees for all days
  const applyBulkMeal = () => {
    if (!bulkMealId) {
      alert('Please select a meal.');
      return;
    }
    if (selectedEmployees.size === 0) {
      alert('No employees selected.');
      return;
    }
    const mealId = parseInt(bulkMealId);
    setAssignments(prev => {
      const newAssign = { ...prev };
      selectedEmployees.forEach(empId => {
        const current = newAssign[empId] || {};
        DAYS.forEach(day => {
          current[day] = mealId;
        });
        newAssign[empId] = current;
      });
      return newAssign;
    });
    setShowBulkModal(false);
    setBulkMealId('');
  };

  // Save all assignments for the week
  const saveWeek = async () => {
    setSaving(true);
    try {
      // Prepare payload: for each employee, send their days map
      const promises = employees.map(emp => {
        const days = assignments[emp.id] || {};
        const payload = {
          employeeId: emp.id,
          startDate: weekStart,
          days: days,
        };
        return lunchApi.createOrUpdateWeeklyAssignment(payload);
      });
      await Promise.all(promises);
      alert('Weekly assignments saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save assignments: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const term = search.toLowerCase();
    return employees.filter(emp => {
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      const empId = (emp.employeeId || '').toLowerCase();
      return fullName.includes(term) || empId.includes(term);
    });
  }, [employees, search]);

  const getMealName = (mealId) => {
    if (!mealId) return '—';
    const meal = meals.find(m => m.id === mealId);
    return meal ? meal.name : 'Unknown';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Weekly Lunch Assignment</h1>
          <p className="text-gray-500">Assign meals for each employee for the week (Mon–Fri)</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={saveWeek}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><CheckIcon className="h-5 w-5" /> Save Week</>}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
            onChange={toggleAllEmployees}
            className="h-4 w-4 text-indigo-600 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Select All ({selectedEmployees.size})</span>
        </div>
        <button
          onClick={() => setShowBulkModal(true)}
          disabled={selectedEmployees.size === 0}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          <UsersIcon className="h-4 w-4" />
          Bulk Assign
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Bulk Assign Meal</h3>
              <button onClick={() => setShowBulkModal(false)}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Apply a meal to all {selectedEmployees.size} selected employees for all weekdays.
            </p>
            <select
              value={bulkMealId}
              onChange={(e) => setBulkMealId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a meal</option>
              {meals.map(meal => (
                <option key={meal.id} value={meal.id}>{meal.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyBulkMeal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Apply to All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={toggleAllEmployees}
                      className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  {DAYS.map(day => (
                    <th key={day} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {DAY_LABELS[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp) => {
                  const empAssign = assignments[emp.id] || {};
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                            {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{emp.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {emp.department || emp.category?.name || 'N/A'}
                      </td>
                      {DAYS.map(day => {
                        const mealId = empAssign[day] || '';
                        return (
                          <td key={day} className="px-4 py-3">
                            <select
                              value={mealId}
                              onChange={(e) => handleDayChange(emp.id, day, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">—</option>
                              {meals.map(meal => (
                                <option key={meal.id} value={meal.id}>
                                  {meal.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredEmployees.length} employees • Week starting {weekStart}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyLunchAssignment;