export const MEAL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export function changedMealDays(saved, selections) {
  return Object.fromEntries(MEAL_DAYS
    .filter(day => (saved[day] ?? null) !== (selections[day] ?? null))
    .map(day => [day, selections[day] ?? null]));
}

export function mealDayEditable(date, deadline, now, policy) {
  if (policy?.frequency === 'MONTHLY') {
    const today = new Date(now);
    const lastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
    const day = Math.min(Number(policy.monthlyDay), lastDay);
    const cutoff = policy.cutoffTime || '17:00';
    if (today.getUTCDate() !== day || today.toISOString().slice(11, 16) >= cutoff.slice(0, 5)) return false;
  }
  // Ghana uses UTC; deadlines come from the server with an explicit offset.
  return Boolean(deadline) && date >= new Date(now).toISOString().slice(0, 10)
    && now < Date.parse(deadline);
}

export function mealDate(weekStart, day) {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + MEAL_DAYS.indexOf(day));
  return date.toISOString().slice(0, 10);
}

export function formatMealDeadline(deadline) {
  return deadline ? new Date(deadline).toLocaleString('en-GB', {
    timeZone: 'Africa/Accra', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) : 'Loading deadline';
}
