import { useCallback, useEffect, useRef, useState } from 'react';
import { lunchApi } from './Services/lunchApi';
import { createMealPlanningPdf } from './utils/mealPlanningPdf';
import { formatMealDeadline } from './utils/mealSelection';

export default function MealPlanning() {
  const [date, setDate] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const data = await lunchApi.getMealPlanning(date);
      if (id === requestId.current) { setPlan(data); setError(''); }
      return data;
    } catch (err) {
      if (id === requestId.current) setError(err.message || 'Could not load meal totals.');
      return null;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setPlan(null);
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); requestId.current++; };
  }, [refresh]);

  const download = async () => {
    setExporting(true);
    try {
      const latest = await refresh();
      if (latest) createMealPlanningPdf(latest).save(`lunch-plan-${latest.date}.pdf`);
    } catch (err) {
      setError(`Could not create PDF: ${err.message}`);
    } finally { setExporting(false); }
  };
  const money = value => `GHS ${Number(value || 0).toFixed(2)}`;

  return <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Kitchen planning</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Next-day meals</h1><p className="mt-2 text-sm text-gray-600">Plan food quantities from saved weekly assignments and employee choices.</p></div>
      <div className="flex gap-2">
        <button onClick={refresh} disabled={loading || exporting} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
        <button onClick={download} disabled={!plan || exporting || loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{exporting ? 'Preparing PDF…' : 'Download PDF'}</button>
      </div>
    </header>
    <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4">
      <label className="text-sm font-medium text-gray-700">Meal date<input aria-label="Meal date" type="date" value={date || plan?.date || ''} disabled={exporting} onChange={e => setDate(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" /></label>
      <button onClick={() => { if (date) setDate(''); else refresh(); }} disabled={exporting} className="rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-700">Tomorrow</button>
      <p className="pb-2 text-xs text-gray-500">Refreshes every 30 seconds. All dates and deadlines use Ghana time.</p>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} {plan && 'The totals below are from the last successful refresh.'}</div>}
    {!plan && loading && <p role="status" className="p-8 text-center text-gray-500">Loading meal totals…</p>}
    {plan && <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Employees eating</p><p className="mt-2 text-3xl font-bold text-gray-900">{plan.totalEmployees}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Estimated food cost</p><p className="mt-2 text-3xl font-bold text-gray-900">{money(plan.estimatedCost)}</p></div>
        <div className={`rounded-xl border p-5 ${plan.changesOpen ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><p className="text-sm font-semibold">{plan.changesOpen ? 'Employee changes are open' : 'Employee changes are closed'}</p><p className="mt-2 text-sm">Deadline: {formatMealDeadline(plan.deadline)}</p><p className="mt-1 text-xs">{plan.changesOpen ? 'Totals may change before the deadline.' : 'Admins can still correct assignments.'}</p></div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="px-5 py-4">Food</th><th className="px-5 py-4 text-right">Employees</th><th className="px-5 py-4 text-right">Cost per meal</th><th className="px-5 py-4 text-right">Estimated total</th></tr></thead><tbody className="divide-y">
          {plan.meals.map(meal => <tr key={meal.mealId}><td className="px-5 py-4 font-medium text-gray-900">{meal.mealName}</td><td className="px-5 py-4 text-right font-semibold">{meal.employeeCount}</td><td className="px-5 py-4 text-right">{money(meal.unitCost)}</td><td className="px-5 py-4 text-right">{money(meal.estimatedCost)}</td></tr>)}
          {!plan.meals.length && <tr><td colSpan={4} className="p-10 text-center text-gray-500">No meals assigned or configured for this date.</td></tr>}
        </tbody><tfoot className="border-t bg-indigo-50 font-semibold"><tr><td className="px-5 py-4">Total</td><td className="px-5 py-4 text-right">{plan.totalEmployees}</td><td /><td className="px-5 py-4 text-right">{money(plan.estimatedCost)}</td></tr></tfoot></table>
      </div>
      <p className="text-xs leading-5 text-gray-500">Updated {formatMealDeadline(plan.generatedAt)}. Counts include active employees with a saved meal for this date, counted once each. Costs use meal prices, falling back to the cost per lunch in Settings. PDF downloads refresh the totals first.</p>
    </>}
  </div>;
}
