import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImportReview, resolveImportRow, parseEmployeeImportDate, getImportDuplicateWarnings, applyImportChoice } from '../src/pages/Eac-attendance/employee/employeeImport.js';

test('bulk choice applies to all conflicts while preserving automatic fills and saved rows', () => {
  const rows = [
    { index: 0, changes: [{ field: 'email', conflict: true }, { field: 'phone', conflict: false }] },
    { index: 1, saved: true, changes: [{ field: 'email', conflict: true }] },
    { index: 2, problem: 'Duplicate ID', changes: [{ field: 'email', conflict: true }] },
  ];
  const original = { '0:email': 'old', '1:email': 'old' };
  assert.deepEqual(applyImportChoice(rows, original, 'new'), { '0:email': 'new', '1:email': 'old' });
  assert.equal(original['0:email'], 'old');
});

test('bulk selected choice changes only selected employees and permits field overrides', () => {
  const rows = [0, 1].map(index => ({ index, changes: [{ field: 'email', conflict: true }, { field: 'phone', conflict: true }] }));
  const all = applyImportChoice(rows, {}, 'new');
  const selected = applyImportChoice(rows, all, 'old', [1]);
  assert.equal(selected['0:email'], 'new');
  assert.equal(selected['1:email'], 'old');
  assert.deepEqual(applyImportChoice(rows, selected, 'new', []), selected);
  const overridden = { ...selected, '1:phone': 'new' };
  const resolved = resolveImportRow({ ...rows[1], current: { email: 'old@example.com', phone: 'old' }, changes: [{ field: 'email', value: 'new@example.com', conflict: true }, { field: 'phone', value: 'new', conflict: true }] }, overridden);
  assert.equal(resolved.email, 'old@example.com');
  assert.equal(resolved.phone, 'new');
});

test('warns about shared identifiers in the database and the file without merging employees', () => {
  const source = { employeeId: 'E-001', email: 'SHARED@example.com', accountNumber: '001-234', ssnitNumber: 'ABC-123', ghanaCard: 'GHA-001' };
  const other = { employeeId: 'E-002', firstName: 'Another', lastName: 'Employee', email: 'shared@example.com', accountNumber: '001234', ssnitNumber: 'ABC123', ghanaCard: 'GHA001' };
  const warnings = getImportDuplicateWarnings(source, 0, [source, other], [other]);
  assert.equal(warnings.length, 8);
  assert.ok(warnings.some(w => w.includes('E-002 · Another Employee in the system')));
  assert.ok(warnings.some(w => w.includes('Excel row 3')));
  assert.equal(buildImportReview([source], [other])[0].current, null);
});

test('does not warn about the same employee, blanks, or placeholders', () => {
  const source = { employeeId: 'E-001', email: 'same@example.com', accountNumber: 'N/A' };
  assert.deepEqual(getImportDuplicateWarnings(source, 0, [source], [{ ...source }, { employeeId: 'E-002', accountNumber: 'N/A' }]), []);
});

test('duplicate warnings reflect edits to preview values', () => {
  const source = { employeeId: 'E-001', email: 'old@example.com' };
  const other = { employeeId: 'E-002', email: source.email };
  assert.equal(getImportDuplicateWarnings(source, 0, [source], [other]).length, 1);
  assert.deepEqual(getImportDuplicateWarnings({ ...source, email: 'different@example.com' }, 0, [source], [other]), []);
});

test('parses ISO and day-first dates without swapping day and month', () => {
  assert.equal(parseEmployeeImportDate('26-05-2024'), '2024-05-26');
  assert.equal(parseEmployeeImportDate('01-09--2025'), '2025-09-01');
  assert.equal(parseEmployeeImportDate('05/06/2024'), '2024-06-05');
  assert.equal(parseEmployeeImportDate('26.05.2024'), '2024-05-26');
  assert.equal(parseEmployeeImportDate('2026-01-01'), '2026-01-01');
  assert.equal(parseEmployeeImportDate('29-02-2024'), '2024-02-29');
});

test('rejects impossible dates instead of silently rolling into another month', () => {
  for (const value of ['31-04-2024', '29-02-2023', '2024-13-01', 'unknown']) assert.equal(parseEmployeeImportDate(value), null);
});

test('supports Excel date systems and blank dates', () => {
  assert.equal(parseEmployeeImportDate(45292), '2024-01-01');
  assert.equal(parseEmployeeImportDate(0, true), '1904-01-01');
  assert.equal(parseEmployeeImportDate(60), null);
  assert.equal(parseEmployeeImportDate(''), null);
});

const existing = [{ id: 7, employeeId: 'E-001', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '', age: 0, active: true }];

test('matches by employee ID, skips equality, fills blanks and preserves blank Excel fields', () => {
  const [row] = buildImportReview([{ employeeId: 'E-001', firstName: 'Jane', lastName: '', phone: '0123456789', age: 0 }], existing);
  assert.equal(row.current.id, 7);
  assert.deepEqual(row.changes.map(c => c.field), ['phone']);
  const result = resolveImportRow(row, {});
  assert.equal(result.lastName, 'Doe');
  assert.equal(result.phone, '0123456789');
});

test('requires explicit choice for differences including false and zero', () => {
  const [row] = buildImportReview([{ employeeId: 'E-001', firstName: 'Janet', active: false, age: 3 }], existing);
  assert.ok(row.changes.every(c => c.conflict));
  const result = resolveImportRow(row, { '0:firstName': 'old', '0:active': 'new', '0:age': 'new' });
  assert.equal(result.firstName, 'Jane');
  assert.equal(result.active, false);
  assert.equal(result.age, 3);
});

test('matches only Employee ID even when email matches another employee', () => {
  const other = { id: 8, employeeId: 'E-002', email: 'other@example.com' };
  const [row] = buildImportReview([{ employeeId: 'E-001', email: other.email }], [...existing, other]);
  assert.equal(row.current.id, 7);
  assert.equal(row.problem, '');
  assert.equal(row.changes.find(c => c.field === 'email').conflict, true);
  const rows = buildImportReview([{ employeeId: 'E-001' }, { email: 'jane@example.com' }], existing);
  assert.equal(rows[1].current, null);
  assert.equal(rows[1].problem, '');
});

test('blocks duplicate Employee IDs in the file or existing records', () => {
  assert.ok(buildImportReview([{ employeeId: 'E-001' }, { employeeId: 'e-001' }], existing)[1].problem);
  assert.ok(buildImportReview([{ employeeId: 'E-001' }], [...existing, { ...existing[0], id: 9 }])[0].problem);
});

test('shared SSNIT or Ghana Card does not match a different Employee ID', () => {
  const [row] = buildImportReview([{ employeeId: 'E-003', ssnitNumber: '123', ghanaCard: 'GHA-123' }], [{ ...existing[0], ssnitNumber: '123', ghanaCard: 'GHA-123' }]);
  assert.equal(row.current, null);
  assert.equal(row.problem, '');
});

test('retains new employee IDs and incomplete names for review', () => {
  const [row] = buildImportReview([{ employeeId: 'E-003', firstName: 'Full Name' }], existing);
  assert.equal(row.current, null);
  assert.equal(resolveImportRow(row, {}).employeeId, 'E-003');
  row.source.lastName = 'Reviewed surname';
  assert.equal(resolveImportRow(row, {}).lastName, 'Reviewed surname');
});
