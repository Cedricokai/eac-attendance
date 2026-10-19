import { employeeCategory, exportAssignments } from './utils/assignmentExport';
import { useState, useEffect, useMemo } from 'react';
import { lunchApi } from './Services/lunchApi';
import EmployeeWeeklyAssignmentModal from './components/EmployeeWeeklyAssignmentModal';
import { MEAL_DAYS, mealDate } from './utils/mealSelection';
import { assignedMeal, assignmentsByEmployee, unwrapList, weekMonday } from './utils/assignmentDisplay';

const EmployeeLunchAssignment = () => {
  const [employees, setEmployees] = useState([]);
  const [weeks, setWeeks] = useState({});
  const [weekStart, setWeekStart] = useState(weekMonday());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set(employees.map(employeeCategory))].sort();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sort, setSort] = useState({ key: 'name', direction: 1 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      lunchApi.getAllEmployees(),
      ...MEAL_DAYS.map(day => lunchApi.getAssignmentsForDate(mealDate(weekStart, day))),
    ]).then(([people, ...days]) => {
      if (cancelled) return;
      setEmployees(unwrapList(people));
      setWeeks(Object.fromEntries(MEAL_DAYS.map((day, index) => [day,
        assignmentsByEmployee(unwrapList(days[index]), mealDate(weekStart, day))])));
    }).catch(err => { if (!cancelled) setError(err.message || 'Unable to load meal assignments.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [weekStart, revision]);

  const rows = useMemo(() => employees.map(employee => ({
    ...employee,
    name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
    department: employee.department || employee.category?.name || '',
    assignedDays: MEAL_DAYS.filter(day => assignedMeal(weeks[day]?.[employee.id]).id != null).length,
  })).filter(employee => !category || employeeCategory(employee) === category).filter(employee => [employee.name, employee.employeeId, employee.department, employee.email]
    .some(value => String(value || '').toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => String(a[sort.key] || '').localeCompare(String(b[sort.key] || '')) * sort.direction),
  [employees, weeks, search, sort, category]);

  const changeSort = key => setSort(prev => ({ key, direction: prev.key === key ? -prev.direction : 1 }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800">Employee Lunch Assignment</h1>
      <p className="mt-1 text-gray-500">Saved meals for the selected week. Click an employee to update their Monday–Friday plan.</p>
      <div className="my-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-gray-700">Category
          <select aria-label="Filter by category" value={category} onChange={e => { setCategory(e.target.value);  }} className="mt-1 block rounded-lg border px-3 py-2">
            <option value="">All categories</option>{categories.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button disabled={loading || !!error || !rows.length} onClick={() => exportAssignments(rows, weekStart, (employee, day) => assignedMeal(weeks[day]?.[employee.id]).name || (assignedMeal(weeks[day]?.[employee.id]).id ? `Meal #${assignedMeal(weeks[day][employee.id]).id}` : 'No meal'), 'Employee lunch assignments')}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">Export Excel ({rows.length})</button>
        <p className="text-xs text-gray-500">Exports the filtered saved assignments for this week.</p>
      </div>
      <div className="my-6 flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium text-gray-700">Week beginning
          <input type="date" value={weekStart} onChange={e => { if (e.target.value) setWeekStart(weekMonday(e.target.value)); }}
            className="mt-1 block rounded-lg border px-3 py-2" />
        </label>
        <input aria-label="Search employees" placeholder="Search name, ID, department, or email..." value={search}
          onChange={e => setSearch(e.target.value)} className="min-w-64 flex-1 rounded-lg border px-3 py-2" />
        <button onClick={() => setRevision(value => value + 1)} disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">Refresh</button>
      </div>
      {error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">Could not load assignments: {error} Use Refresh to try again.</div>
        : loading ? <p className="p-6 text-gray-500">Loading employees and saved meals…</p>
          : <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                {[['name', 'Employee'], ['employeeId', 'Employee ID'], ['department', 'Department']].map(([key, label]) => (
                  <th key={key} className="px-4 py-3 text-left text-sm text-gray-600"><button onClick={() => changeSort(key)}>{label} {sort.key === key ? sort.direction === 1 ? '↑' : '↓' : ''}</button></th>
                ))}
                {MEAL_DAYS.map(day => <th key={day} className="px-4 py-3 text-left text-sm text-gray-600">{day[0] + day.slice(1).toLowerCase()}</th>)}
                <th className="px-4 py-3 text-left text-sm text-gray-600">Assigned days</th>
                <th className="px-4 py-3 text-left text-sm text-gray-600">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(employee => <tr key={employee.id} onClick={() => setSelectedEmployee(employee)} className="cursor-pointer hover:bg-indigo-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{employee.name || 'Unnamed'}</td>
                  <td className="px-4 py-3 text-sm">{employee.employeeId || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{employee.department || 'N/A'}</td>
                  {MEAL_DAYS.map(day => { const meal = assignedMeal(weeks[day]?.[employee.id]); return <td key={day} className="px-4 py-3 text-sm">{meal.name || (meal.id ? `Meal #${meal.id}` : 'No meal')}</td>; })}
                  <td className="px-4 py-3 text-sm">{employee.assignedDays}/5</td>
                  <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); setSelectedEmployee(employee); }} className="text-sm font-medium text-indigo-600">Edit meals</button></td>
                </tr>)}
                {!rows.length && <tr><td colSpan={10} className="p-8 text-center text-gray-500">No employees found.</td></tr>}
              </tbody>
            </table>
            <p className="border-t px-4 py-3 text-sm text-gray-500">{rows.length} employees</p>
          </div>}
      {selectedEmployee && <EmployeeWeeklyAssignmentModal employee={selectedEmployee} initialWeekStart={weekStart}
        onClose={() => setSelectedEmployee(null)} onSaved={() => setRevision(value => value + 1)} />}
    </div>
  );
};

export default EmployeeLunchAssignment;
