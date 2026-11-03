import XLSX from 'xlsx';
import fs from 'fs';

async function main() {
  const loginRes = await fetch('http://localhost:8080/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Build a rich multi-sheet workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Attendance Summary
  const attendanceData = [
    ['EAC ERP & ATTENDANCE AUDIT - Q4 2026', '', '', '', ''],
    ['Generated On:', new Date().toISOString().split('T')[0], 'Auditor:', 'System Administrator', 'Status: Certified'],
    [],
    ['Employee ID', 'Full Name', 'Department', 'Total Hours Logged', 'Overtime (Hrs)', 'Attendance Rate', 'Punctuality Score', 'Audit Clearance'],
    ['EMP-1001', 'Cedric Doe', 'Engineering & Dev', 168.5, 12.5, '99.2%', '98.5%', 'APPROVED'],
    ['EMP-1002', 'Sarah Jenkins', 'Human Resources', 160.0, 4.0, '97.8%', '96.0%', 'APPROVED'],
    ['EMP-1003', 'Michael Chang', 'Finance & Accounting', 172.0, 16.0, '100.0%', '99.0%', 'APPROVED'],
    ['EMP-1004', 'Amina Diallo', 'Operations & Logistics', 158.0, 2.0, '96.5%', '94.5%', 'APPROVED'],
    ['EMP-1005', 'Robert Vance', 'Executive Leadership', 160.0, 8.0, '98.0%', '97.0%', 'APPROVED']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(attendanceData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Attendance Audit');

  // Sheet 2: Department Budgets & Petty Cash
  const budgetData = [
    ['DEPARTMENT BUDGET & PETTY CASH LEDGER 2026', '', '', ''],
    [],
    ['Department', 'Allocated Budget ($)', 'Spent YTD ($)', 'Remaining Balance ($)', 'Utilization %'],
    ['Engineering', 150000, 112450, 37550, '75.0%'],
    ['Human Resources', 45000, 32100, 12900, '71.3%'],
    ['Operations', 220000, 185600, 34400, '84.4%'],
    ['Finance & Admin', 80000, 54200, 25800, '67.8%'],
    ['Marketing & Sales', 95000, 78900, 16100, '83.1%']
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(budgetData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Department Budgets');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const xlsxBlob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const form = new FormData();
  form.append('file', xlsxBlob, 'EAC_Financial_and_Attendance_2026.xlsx');
  form.append('description', 'Official multi-sheet Excel spreadsheet for 3rd-party Excel and In-browser testing');

  const uploadRes = await fetch('http://localhost:8080/api/file-manager/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  if (uploadRes.ok) {
    const uploaded = await uploadRes.json();
    console.log('Successfully uploaded Excel:', uploaded.id, uploaded.fileName, uploaded.formattedSize);

    // Test download
    const downloadRes = await fetch(`http://localhost:8080/api/file-manager/files/${uploaded.id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const buf = await downloadRes.arrayBuffer();
    console.log('Downloaded Excel Bytes:', buf.byteLength, 'PK header check:', Buffer.from(buf.slice(0, 2)).toString());
  } else {
    console.error('Failed to upload Excel:', await uploadRes.text());
  }
}

main().catch(console.error);
