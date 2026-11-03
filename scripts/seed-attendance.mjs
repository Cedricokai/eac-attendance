// scripts/seed-attendance.mjs
async function seed() {
  console.log('--- Step 1: Sign in as Admin ---');
  const loginRes = await fetch('http://localhost:8080/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'admin', password: 'admin123' })
  });
  if (!loginRes.ok) throw new Error('Admin signin failed: ' + (await loginRes.text()));
  const { token } = await loginRes.json();
  console.log('Logged in successfully, token retrieved.');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  console.log('--- Step 2: Fetch Active Employees ---');
  const getEmpRes = await fetch('http://localhost:8080/api/employee', {
    headers: authHeaders
  });
  const allEmployees = await getEmpRes.json();
  const activeEmployees = allEmployees.filter(e => e.firstName && e.lastName);
  console.log(`Active employees found: ${activeEmployees.length}`);

  console.log('--- Step 3: Seed Attendance Records ---');
  const attendanceSchedules = [
    // Today: 2026-10-21
    { empIdx: 0, date: '2026-10-21', inTime: '07:55:00', outTime: '17:00:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 1, date: '2026-10-21', inTime: '08:02:00', outTime: '16:30:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 2, date: '2026-10-21', inTime: '07:45:00', outTime: '18:00:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 3, date: '2026-10-21', inTime: '08:15:00', outTime: '16:15:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 4, date: '2026-10-21', inTime: '08:00:00', outTime: '17:00:00', shift: 'Day Shift', status: 'Present' },
    // Yesterday: 2026-10-20
    { empIdx: 0, date: '2026-10-20', inTime: '08:00:00', outTime: '17:00:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 1, date: '2026-10-20', inTime: '08:00:00', outTime: '16:00:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 2, date: '2026-10-20', inTime: '08:00:00', outTime: '17:30:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 3, date: '2026-10-20', inTime: '08:30:00', outTime: '16:30:00', shift: 'Day Shift', status: 'Present' },
    { empIdx: 4, date: '2026-10-20', inTime: '08:00:00', outTime: '17:00:00', shift: 'Day Shift', status: 'Present' }
  ];

  for (const s of attendanceSchedules) {
    const emp = activeEmployees[s.empIdx];
    if (!emp) continue;
    const body = {
      employee: { id: emp.id },
      date: s.date,
      shift: s.shift,
      workType: 'FULL_TIME',
      status: s.status,
      checkIn: s.inTime,
      checkOut: s.outTime,
      biometric: true
    };
    const res = await fetch('http://localhost:8080/api/attendance', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const saved = await res.json();
      console.log(`[Created] ${s.date} - ${emp.firstName} ${emp.lastName}: In=${saved.checkIn}, Out=${saved.checkOut}, NH=${saved.minimumHour}, OT=${saved.overtime}`);
    } else {
      console.log(`[Skip/Err] ${s.date} - ${emp.firstName} ${emp.lastName}: Status ${res.status}`);
    }
  }

  console.log('--- Step 4: Verify Today Attendance via API ---');
  const verifyRes = await fetch('http://localhost:8080/api/attendance/today', {
    headers: authHeaders
  });
  const todayRecords = await verifyRes.json();
  console.log(`\nSuccessfully verified ${todayRecords.length} records for Today (2026-10-21):`);
  todayRecords.forEach(r => {
    console.log(`  * ${r.employee?.firstName} ${r.employee?.lastName} (${r.employee?.category?.name || 'Staff'}): Status=${r.status}, In=${r.checkIn}, Out=${r.checkOut}, NH=${r.minimumHour}h, OT=${r.overtime}h`);
  });
}

seed().catch(console.error);
