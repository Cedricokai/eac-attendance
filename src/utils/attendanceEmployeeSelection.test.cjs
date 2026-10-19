const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = fs.readFileSync('src/pages/Eac-attendance/attendance/attendance.jsx', 'utf8');
const body = source.slice(source.indexOf('  const fetchEmployees = async () => {'), source.indexOf('  const fetchJobFilterData = async () => {'));
function setup() {
  const state = {};
  const context = {
    console, encodeURIComponent, API_BASE_URL: 'https://example.test', getToken: () => 'test',
    employeeRequestRef: { current: 0 }, createDateMode: 'single',
    newAttendance: { date: '2026-09-01' }, singleDate: '2026-09-05',
    dateFilterMode: 'range', rangeStart: '2026-09-02', rangeEnd: '2026-09-05', createRangeStart: '2026-09-01',
    setEmployees: value => { state.employees = value; },
    setSelectedEmployees: value => { state.selected = value; },
    setSelectAllEmployees: value => { state.all = value; },
    setError: value => { state.error = value; },
  };
  vm.createContext(context);
  vm.runInContext(body + '\nthis.load = fetchEmployees;', context);
  return { context, state };
}
test('availability follows the add form date regardless of the displayed filter range', async () => {
  const { context, state } = setup();
  const employee = { id: 7, firstName: 'Employee' };
  context.fetch = async url => ({ ok: true, json: async () => new URL(url).searchParams.get('date') === '2026-09-01' ? [employee] : [] });
  await context.load();
  assert.equal(state.employees[0], employee);
  context.newAttendance.date = '2026-09-05';
  await context.load();
  assert.equal(state.employees.length, 0);
  assert.equal(state.selected.length, 0);
});
test('an older availability response cannot overwrite the latest date results', async () => {
  const { context, state } = setup();
  let release;
  context.fetch = () => new Promise(resolve => { release = resolve; });
  const old = context.load();
  context.newAttendance.date = '2026-09-05';
  context.fetch = async () => ({ ok: true, json: async () => [{ id: 9 }] });
  await context.load();
  release({ ok: true, json: async () => [{ id: 7 }] });
  await old;
  assert.equal(state.employees[0].id, 9);
});
