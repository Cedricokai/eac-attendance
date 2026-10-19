import { jsPDF } from 'jspdf';

export function createMealPlanningPdf(plan) {
  const doc = new jsPDF();
  const money = value => Number(value || 0).toFixed(2);
  const dateTime = value => new Date(value).toLocaleString('en-GB', { timeZone: plan.timezone || 'Africa/Accra' });
  let y = 20;
  const header = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Lunch preparation plan', 15, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Meal date: ${plan.date}   |   Ghana time (Africa/Accra)`, 15, y);
    y += 7;
    doc.text(`Changes close: ${dateTime(plan.deadline)}   |   ${plan.changesOpen ? 'Changes still open' : 'Employee changes closed'}`, 15, y);
    y += 7;
    doc.text(`Generated: ${dateTime(plan.generatedAt)}`, 15, y);
    y += 12;
    doc.setFillColor(238, 242, 255);
    doc.rect(15, y - 6, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Food', 18, y);
    doc.text('People', 125, y, { align: 'right' });
    doc.text('Unit (GHS)', 157, y, { align: 'right' });
    doc.text('Total (GHS)', 191, y, { align: 'right' });
    y += 12;
    doc.setFont('helvetica', 'normal');
  };
  header();
  for (const meal of plan.meals) {
    const lines = doc.splitTextToSize(meal.mealName, 87);
    const height = Math.max(10, lines.length * 5 + 5);
    if (y + height > 260) { doc.addPage(); y = 20; header(); }
    doc.text(lines, 18, y);
    doc.text(String(meal.employeeCount), 125, y, { align: 'right' });
    doc.text(money(meal.unitCost), 157, y, { align: 'right' });
    doc.text(money(meal.estimatedCost), 191, y, { align: 'right' });
    y += height;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y - 5, 195, y - 5);
  }
  if (y > 242) { doc.addPage(); y = 20; header(); }
  if (!plan.meals.length) { doc.text('No meals assigned or configured for this date.', 18, y); y += 12; }
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 18, y);
  doc.text(String(plan.totalEmployees), 125, y, { align: 'right' });
  doc.text(money(plan.estimatedCost), 191, y, { align: 'right' });
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize('Counts use saved meal assignments for active employees. Each employee is counted once. Costs are estimates using meal prices, or the default cost per lunch when no price is set.', 178), 15, y);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${page} of ${pages}`, 195, 285, { align: 'right' });
  }
  return doc;
}
