const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklyOffDays({ value, onChange, employee = false }) {
  const inherited = value == null || value === 'INHERIT';
  const selected = (inherited ? '' : value).split(',').filter(Boolean);
  return (
    <fieldset className="col-span-full rounded-lg border border-gray-200 p-4 space-y-3">
      <legend className="px-1 text-sm font-medium">Weekly off days</legend>
      {employee && <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={inherited} onChange={e => onChange(e.target.checked ? 'INHERIT' : '')} />
        Use category off days
      </label>}
      <div className="flex flex-wrap gap-3">
        {days.map((day, index) => <label key={day} className="flex items-center gap-1 text-sm">
          <input type="checkbox" disabled={employee && inherited} checked={selected.includes(String(index))}
            onChange={e => onChange((e.target.checked ? [...selected, String(index)] : selected.filter(d => d !== String(index))).sort().join(','))} />
          {day}
        </label>)}
      </div>
      <p className="text-xs text-gray-500">Selected days are OFF when there is no attendance or approved leave. Other days follow the absence cutoff. No days selected means no weekly off days. Changes apply to future automatic marking.</p>
    </fieldset>
  );
}
