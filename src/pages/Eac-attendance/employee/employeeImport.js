export const isEmpty = value => value == null || String(value).trim() === '' || /^(n\/a|null|-)$/i.test(String(value).trim());
const key = value => isEmpty(value) ? '' : String(value).trim().toLowerCase();
export const fieldLabel = field => field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

// Warnings never determine identity or merge records.
export function getImportDuplicateWarnings(source, index, incoming, existing) {
  const normalize = (field, value) => {
    if (isEmpty(value)) return '';
    const text = key(value);
    return field === 'email' ? text : text.replace(/[\s-]+/g, '');
  };
  const sameEmployee = employee => key(source.employeeId) && key(source.employeeId) === key(employee.employeeId);
  const describe = employee => [employee.employeeId, [employee.firstName, employee.lastName].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || 'Unnamed employee';
  const warnings = [];
  for (const field of ['email', 'ssnitNumber', 'ghanaCard', 'accountNumber']) {
    const value = normalize(field, source[field]);
    if (!value) continue;
    for (const employee of existing) {
      if (!sameEmployee(employee) && normalize(field, employee[field]) === value) {
        warnings.push(`${fieldLabel(field)} is already used by ${describe(employee)} in the system.`);
      }
    }
    incoming.forEach((employee, otherIndex) => {
      if (otherIndex !== index && !sameEmployee(employee) && normalize(field, employee[field]) === value) {
        warnings.push(`${fieldLabel(field)} also appears on Excel row ${otherIndex + 2}: ${describe(employee)}.`);
      }
    });
  }
  return [...new Set(warnings)];
}

export function parseEmployeeImportDate(value, date1904 = false) {
  if (isEmpty(value)) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const serial = Math.floor(value);
    // Excel's 1900 calendar includes a fictional 29 February at serial 60.
    if (!Number.isFinite(value) || serial < 0 || (!date1904 && serial === 60)) return null;
    const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
    const date = new Date(epoch + (serial - (!date1904 && serial > 60 ? 1 : 0)) * 86400000);
    return Number.isNaN(date.getTime()) || date.getUTCFullYear() > 9999 ? null : date.toISOString().slice(0, 10);
  }
  const text = String(value).trim().replace(/([/.-])\1+/g, '$1');
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dayFirst = text.match(/^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})$/);
  if (!iso && !dayFirst) return null;
  const [year, month, day] = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : [Number(dayFirst[4]), Number(dayFirst[3]), Number(dayFirst[1])];
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Match only by Employee ID; other identifiers are ordinary comparison fields.
export function buildImportReview(incoming, existing) {
  const seen = new Set();
  const matched = new Set();
  return incoming.map((source, index) => {
    const identity = key(source.employeeId);
    const duplicate = identity && seen.has(identity);
    if (identity) seen.add(identity);
    const byId = existing.filter(e => key(source.employeeId) && key(e.employeeId) === key(source.employeeId));
    const candidates = byId;
    const current = candidates.length === 1 ? candidates[0] : null;
    const repeatedMatch = current && matched.has(current.id);
    if (current) matched.add(current.id);
    const problem = duplicate || repeatedMatch ? 'Duplicate Employee ID in this file. Resolve before importing.' : candidates.length > 1 ? 'Employee ID matches multiple existing employees. Resolve before importing.' : '';
    const changes = Object.entries(source).filter(([f, v]) => f !== 'employeeId' && !isEmpty(v) && (!current || key(current[f]) !== key(v))).map(([field, value]) => ({ field, value, oldValue: current?.[field], conflict: current && !isEmpty(current[field]) }));
    return { index, source, current, changes, problem, saved: false };
  });
}

export function resolveImportRow(row, choices) {
  const result = row.current ? { ...row.current } : { ...row.source };
  for (const change of row.changes) {
    if (!change.conflict || choices[`${row.index}:${change.field}`] === 'new') result[change.field] = change.value;
  }
  return result;
}

export function applyImportChoice(rows, previous, choice, selectedIndices = null) {
  if (!['old', 'new'].includes(choice)) return previous;
  const next = { ...previous };
  for (const row of rows) {
    if (row.saved || row.problem || (selectedIndices && !selectedIndices.includes(row.index))) continue;
    for (const change of row.changes) {
      if (change.conflict) next[`${row.index}:${change.field}`] = choice;
    }
  }
  return next;
}
