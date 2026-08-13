import React, { useState, useEffect } from 'react';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { lunchApi } from './services/lunchApi';

const LunchSettings = () => {
  const [settings, setSettings] = useState({
    costPerLunch: 5.50,
    monthlyBudget: 5000,
    weeklyBudget: 1500,
    departmentBudgets: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lunchApi.getSettings();
      // res could be an object { costPerLunch: "5.50", monthlyBudget: "5000", ... }
      const data = res || {};
      // Convert string values to numbers if needed
      setSettings(prev => ({
        ...prev,
        ...data,
        costPerLunch: parseFloat(data.costPerLunch) || prev.costPerLunch,
        monthlyBudget: parseFloat(data.monthlyBudget) || prev.monthlyBudget,
        weeklyBudget: parseFloat(data.weeklyBudget) || prev.weeklyBudget,
      }));
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Check if it's a 401 error
      const isUnauthorized = err.status === 401 || err.message?.includes('401');
      setError(
        isUnauthorized
          ? 'You do not have permission to view lunch settings. Please contact your administrator.'
          : 'Failed to load settings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Since the backend expects a single setting at a time or a map, we need to send the whole object.
      // If your backend has a PUT endpoint that accepts the whole object, use that.
      // Otherwise, you might need to loop and save each key individually.
      // For simplicity, we assume updateSettings expects the whole object.
      await lunchApi.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lunch Settings</h1>
          <p className="text-gray-500">Configure food cost, budgets, and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || saving || !!error}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : <><CheckIcon className="h-5 w-5" /> Save Changes</>}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">⚠️ Access Denied</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchSettings}
              className="mt-2 text-sm text-red-700 underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        </div>
      ) : saveSuccess ? (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
          <CheckIcon className="h-6 w-6" />
          <span>Settings saved successfully!</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cost Per Lunch (₵)</label>
            <input
              type="number"
              step="0.01"
              value={settings.costPerLunch}
              onChange={(e) => setSettings({ ...settings, costPerLunch: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Monthly Budget (₵)</label>
            <input
              type="number"
              step="0.01"
              value={settings.monthlyBudget}
              onChange={(e) => setSettings({ ...settings, monthlyBudget: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Weekly Budget (₵)</label>
            <input
              type="number"
              step="0.01"
              value={settings.weeklyBudget}
              onChange={(e) => setSettings({ ...settings, weeklyBudget: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500"
            />
          </div>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">Department‑specific budgets can be configured individually.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LunchSettings;