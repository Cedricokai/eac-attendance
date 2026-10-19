import React from 'react';
import { createRoot } from 'react-dom/client';
import ProjectPayrollReport from '../src/components/ProjectPayrollReport';
import '../src/index.css';

// Isolated demonstration: no real payroll, attendance or timesheet API is changed.
const period = { id: 'demo-september', name: 'September payroll (sample)', category: 'Field staff', startDate: '2026-08-26', endDate: '2026-09-25' };
const projectDays = Array.from({ length: 5 }, (_, index) => ({
  date: `2026-09-0${index + 1}`, projectId: 7, projectName: 'Project X',
  timesheetId: index + 101, source: 'Timesheet', normalHours: 8, overtimeHours: 2,
  normalEarnings: 80, overtimeEarnings: 20, totalEarnings: 100,
}));
const days = [...projectDays, { date: '2026-09-10', projectId: null, projectName: null,
  timesheetId: null, source: 'Biometric', normalHours: 8, overtimeHours: 0,
  normalEarnings: 80, overtimeEarnings: 0, totalEarnings: 80 }];
const snapshot = { version: 1, periodStart: period.startDate, periodEnd: period.endDate,
  days, workEarnings: 580, otherPeriodEarnings: 70, periodGross: 650 };
const record = { id: 1, employee: { firstName: 'Sample', lastName: 'Employee', employeeId: 'DEMO-001' },
  period, status: 'Generated', grossSalary: 650, netSalary: 600, payeTax: 20, ssnitEmployee: 30,
  loanDeduction: 0, creditAmount: 0, projectEarningsSnapshot: JSON.stringify(snapshot) };
const originalFetch = window.fetch.bind(window);
window.fetch = async (url, options) => {
  const path = String(url);
  if (path === '/project-payroll-demo/api/payroll/periods') return new Response(JSON.stringify([period]), { headers: { 'Content-Type': 'application/json' } });
  if (path.startsWith('/project-payroll-demo/api/payroll?')) return new Response(JSON.stringify([record]), { headers: { 'Content-Type': 'application/json' } });
  return originalFetch(url, options);
};

function Demo() {
  return <main className="min-h-screen bg-gray-50 p-4 sm:p-6 space-y-5">
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Demonstration · sample data only</p>
      <h1 className="text-2xl font-bold">Project timesheets → payroll earnings</h1>
      <p>Sample Employee worked on Project X from <strong>1–5 September</strong>, recorded by timesheet rather than biometric punches.</p>
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        <li>Save the project timesheets: 8 normal hours + 2 overtime hours each day.</li>
        <li>Sync those timesheets with attendance, preserving the project and timesheet links.</li>
        <li>Generate payroll for 26 August–25 September. The project breakdown is saved with that run.</li>
        <li>Select the sample period below, then filter by Project X and expand its work dates.</li>
      </ol>
      <p className="text-sm"><strong>Sample figures:</strong> Project X GH₵500 + other work GH₵80 + other period earnings GH₵70 = gross GH₵650. After GH₵50 deductions, net pay is GH₵600. Project earnings are already included in the total.</p>
    </div>
    <ProjectPayrollReport apiBaseUrl="/project-payroll-demo" refreshKey={0} />
  </main>;
}
createRoot(document.getElementById('root')).render(<Demo />);
