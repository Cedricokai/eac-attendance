import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { lunchApi } from './services/lunchApi';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday'
};

const MealManagement = () => {
  // ----- Master Meal List -----
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealForm, setMealForm] = useState({ name: '', description: '', price: 0, category: '' });

  // ----- Daily Meal Assignments -----
  const [dailyMeals, setDailyMeals] = useState({}); // { MONDAY: { meal1Id, meal2Id }, ... }
  const [savingDaily, setSavingDaily] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch master meals
      const mealsRes = await lunchApi.getMeals();
      const mealsArray = Array.isArray(mealsRes) ? mealsRes : (mealsRes.data || []);
      setMeals(mealsArray);

      // Fetch daily meal assignments
      const dailyRes = await lunchApi.getDailyMeals();
      const dailyData = dailyRes || {};
      setDailyMeals(dailyData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ----- Master Meal CRUD -----
  const handleMealSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMeal) {
        await lunchApi.updateMeal(editingMeal.id, mealForm);
      } else {
        await lunchApi.createMeal(mealForm);
      }
      await fetchAllData();
      setShowMealModal(false);
      setEditingMeal(null);
      setMealForm({ name: '', description: '', price: 0, category: '' });
    } catch (error) {
      console.error('Error saving meal:', error);
      alert('Failed to save meal');
    }
  };

  const handleDeleteMeal = async (id) => {
    if (window.confirm('Delete this meal?')) {
      await lunchApi.deleteMeal(id);
      await fetchAllData();
    }
  };

  // ----- Daily Meal Assignment -----
  const handleDailyMealChange = (day, slot, mealId) => {
    setDailyMeals(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: mealId === '' ? null : parseInt(mealId)
      }
    }));
  };

  const saveDailyMeals = async () => {
    setSavingDaily(true);
    try {
      await lunchApi.updateDailyMeals(dailyMeals);
      alert('Daily meal options saved successfully!');
    } catch (error) {
      console.error('Error saving daily meals:', error);
      alert('Failed to save daily meals');
    } finally {
      setSavingDaily(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Meal Management</h1>

      {/* ===== SECTION 1: Master Meal List ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Master Meal List</h2>
          <button
            onClick={() => { setEditingMeal(null); setMealForm({ name: '', description: '', price: 0, category: '' }); setShowMealModal(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm transition"
          >
            <PlusIcon className="h-4 w-4" /> Add Meal
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {meals.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No meals found.</td></tr>
              ) : (
                meals.map(meal => (
                  <tr key={meal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{meal.name}</td>
                    <td className="px-4 py-3">{meal.description}</td>
                    <td className="px-4 py-3">₵{meal.price.toFixed(2)}</td>
                    <td className="px-4 py-3">{meal.category}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => { setEditingMeal(meal); setMealForm(meal); setShowMealModal(true); }}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <PencilIcon className="h-4 w-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== SECTION 2: Daily Meal Assignments ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Daily Meal Options</h2>
          <button
            onClick={saveDailyMeals}
            disabled={savingDaily}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm transition disabled:opacity-50"
          >
            {savingDaily ? 'Saving...' : <><CheckIcon className="h-4 w-4" /> Save Daily Options</>}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Option 1</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Option 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {DAYS.map(day => {
                const dayData = dailyMeals[day] || { meal1Id: null, meal2Id: null };
                return (
                  <tr key={day} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{DAY_LABELS[day]}</td>
                    <td className="px-4 py-3">
                      <select
                        value={dayData.meal1Id || ''}
                        onChange={(e) => handleDailyMealChange(day, 'meal1Id', e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">— Select —</option>
                        {meals.map(meal => (
                          <option key={meal.id} value={meal.id}>{meal.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={dayData.meal2Id || ''}
                        onChange={(e) => handleDailyMealChange(day, 'meal2Id', e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">— Select —</option>
                        {meals.map(meal => (
                          <option key={meal.id} value={meal.id}>{meal.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Meal Modal (Add/Edit) ===== */}
      {showMealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{editingMeal ? 'Edit Meal' : 'Add Meal'}</h3>
              <button onClick={() => setShowMealModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleMealSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={mealForm.name}
                  onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows="2"
                  value={mealForm.description}
                  onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price (₵)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={mealForm.price}
                  onChange={(e) => setMealForm({ ...mealForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={mealForm.category}
                  onChange={(e) => setMealForm({ ...mealForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowMealModal(false)} className="px-4 py-2 border rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealManagement;