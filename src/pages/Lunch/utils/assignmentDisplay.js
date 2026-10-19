export const unwrapList = response => {
  const data = response?.data ?? response;
  return Array.isArray(data) ? data : data?.content ?? [];
};

export const getEmployeeId = record => record?.employee?.id ?? record?.employeeDto?.id ?? record?.employeeId;

export function assignedMeal(assignment) {
  const meal = assignment?.meal ?? assignment?.mealDto ?? assignment?.mealDetails;
  return { id: meal?.id ?? assignment?.mealId ?? null,
    name: (typeof meal === 'string' ? meal : meal?.name) ?? assignment?.mealName ?? null };
}

export function assignmentsByEmployee(assignments, date) {
  const result = {};
  for (const assignment of assignments) {
    if (assignment.deleted || assignment.status !== 'ACTIVE'
      || assignment.startDate > date || assignment.endDate < date) continue;
    const id = getEmployeeId(assignment);
    if (id == null) continue;
    const previous = result[id];
    // Same precedence as the employee portal and backend serving lookup.
    if (!previous || assignment.startDate > previous.startDate
      || (assignment.startDate === previous.startDate && Number(assignment.id) > Number(previous.id))) {
      result[id] = assignment;
    }
  }
  return result;
}

export function isAttendancePresent(attendance) {
  const checkIn = attendance?.checkIn;
  const status = String(attendance?.status ?? '').trim().toUpperCase().replaceAll('_', ' ');
  return Boolean(checkIn && checkIn !== '--:--')
    || ['PRESENT', 'LATE', 'HOLIDAY PRESENT', 'WEEKEND PRESENT'].includes(status);
}

export function weekMonday(date = new Date().toISOString().slice(0, 10)) {
  const monday = new Date(`${date}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return monday.toISOString().slice(0, 10);
}

export function applyMealToEmployees(assignments, employeeIds, days, mealId) {
  const next = { ...assignments };
  for (const id of employeeIds) {
    next[id] = { ...assignments[id], ...Object.fromEntries(days.map(day => [day, mealId])) };
  }
  return next;
}
