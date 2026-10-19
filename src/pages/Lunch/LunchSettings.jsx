import { useState, useEffect } from 'react';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { lunchApi } from './Services/lunchApi';

const LunchSettings = () => {
  const [settings, setSettings] = useState({
    costPerLunch: 5.50,
    monthlyBudget: 5000,
    weeklyBudget: 1500,
    departmentBudgets: {},
    mealChangeCutoffTime: '17:00',
    mealChangeDaysBefore: '1',
    mealChangeFrequency: 'DAILY',
    mealChangeMonthlyDay: '1',
    mealChangeNotificationEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

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

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      // Since the backend expects a single setting at a time or a map, we need to send the whole object.
      // If your backend has a PUT endpoint that accepts the whole object, use that.
      // Otherwise, you might need to loop and save each key individually.
      // For simplicity, we assume updateSettings expects the whole object.
      await lunchApi.updateSettings({
        costPerLunch: settings.costPerLunch,
        monthlyBudget: settings.monthlyBudget,
        weeklyBudget: settings.weeklyBudget,
        mealChangeCutoffTime: settings.mealChangeCutoffTime,
        mealChangeFrequency: settings.mealChangeFrequency,
        mealChangeMonthlyDay: String(settings.mealChangeMonthlyDay),
        mealChangeDaysBefore: String(settings.mealChangeDaysBefore),
        mealChangeNotificationEmail: settings.mealChangeNotificationEmail.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lunch Settings</h1>
          <p className="text-gray-500">Configure food cost, budgets, and preferences</p>
        </div>
        <button
          type="submit"
          disabled={loading || saving || !!error}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : <><CheckIcon className="h-5 w-5" /> Save Changes</>}
        </button>
      </div>

      {saveError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{saveError}</p>}
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
              type="button"
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
          <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Employee meal change deadline</h2>
              <p className="mt-1 text-sm text-gray-600">Employees can change upcoming meals until this deadline. After it passes, their saved meal is used for kitchen planning. Admins can still update assignments.</p>
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="text-sm font-medium">Meal change schedule<select value={settings.mealChangeFrequency} onChange={e => setSettings({...settings, mealChangeFrequency:e.target.value})} className="mt-2 block rounded-lg border px-3 py-2"><option value="DAILY">Before each meal deadline</option><option value="MONTHLY">One change day each month</option></select></label>
              {settings.mealChangeFrequency === 'MONTHLY' && <label className="text-sm font-medium">Day of each month<input type="number" min="1" max="31" required value={settings.mealChangeMonthlyDay} onChange={e => setSettings({...settings,mealChangeMonthlyDay:e.target.value})} className="mt-2 block w-24 rounded-lg border px-3 py-2"/><span className="block text-xs text-gray-500 mt-2">If the month is shorter, use its last day. Changes open only on this day until the cutoff time; meal deadlines still apply.</span></label>}
              <label className="text-sm font-medium text-gray-700">Close changes
                <select value={settings.mealChangeDaysBefore} onChange={e => setSettings({ ...settings, mealChangeDaysBefore: e.target.value })} className="mt-2 block rounded-lg border border-gray-300 bg-white px-3 py-2">
                  <option value="1">The day before the meal</option>
                  <option value="0">On the meal day</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">Cutoff time (Ghana)
                <input type="time" required value={settings.mealChangeCutoffTime} onChange={e => setSettings({ ...settings, mealChangeCutoffTime: e.target.value })} className="mt-2 block rounded-lg border border-gray-300 bg-white px-3 py-2" />
              </label>
            </div>
            <p className="text-sm text-indigo-800">Example: {settings.mealChangeCutoffTime} the {String(settings.mealChangeDaysBefore) === '1' ? 'day before means Wednesday’s meal closes on Tuesday' : 'same day means Wednesday’s meal closes on Wednesday'}. All deadlines use Africa/Accra time.</p>
          </section>
          <section className="rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Employee meal change notifications</h2>
            <p className="text-sm text-gray-600">Send an email when an employee saves a meal change in their portal. The email includes their name, day of the week, previous meal, and new meal.</p>
            <label htmlFor="meal-change-recipient" className="block text-sm font-medium text-gray-700">Recipient email</label>
            <input id="meal-change-recipient" type="email" maxLength={254}
              value={settings.mealChangeNotificationEmail || ''}
              onChange={e => setSettings({ ...settings, mealChangeNotificationEmail: e.target.value })}
              placeholder="kitchen@example.com" aria-describedby="meal-change-recipient-help"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2" />
            <p id="meal-change-recipient-help" className="text-sm text-gray-500">Leave blank to turn off notifications. Changes made by administrators do not send an email.</p>
          </section>
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
    </form>
  );
};

export default LunchSettings;
