import * as XLSX from 'xlsx';
import { MEAL_DAYS, mealDate } from './mealSelection';

export const employeeCategory = employee => typeof employee.category === 'string'
  ? employee.category : employee.category?.name || 'Uncategorized';

export function exportAssignments(employees, weekStart, getMeal, prefix = 'Lunch assignments') {
  const headers = ['Employee ID', 'Employee', 'Category', 'Department', ...MEAL_DAYS.map(day => `${day} ${mealDate(weekStart, day)}`)];
  const data = employees.map(employee => [String(employee.employeeId || ''),
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim(), employeeCategory(employee),
    typeof employee.department === 'string' ? employee.department : employee.department?.name || '',
    ...MEAL_DAYS.map(day => getMeal(employee, day) || 'No meal')]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  sheet['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, ...MEAL_DAYS.map(() => ({ wch: 28 }))];
  sheet['!autofilter'] = { ref: sheet['!ref'] };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Weekly meals');
  XLSX.writeFile(book, `${prefix}-${weekStart}.xlsx`);
}
