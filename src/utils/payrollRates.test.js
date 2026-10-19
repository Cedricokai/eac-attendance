import test from 'node:test';
import assert from 'node:assert/strict';
import { currentEmployeeRate, payrollRateReview } from './payrollRates.js';

test('shows historical rates separately from updated employee rates', () => {
  const review = payrollRateReview([{ rateSnapshotSaved: true, appliedEmployeeRate: 10, appliedMonthlySalary: 1000,
    employee: { id: 1, firstName: 'Ama', lastName: 'Mensah', minimumRate: 20, basicSalary: 2000 } }]);
  assert.equal(review.canKeepSaved, true);
  assert.equal(review.rows[0].savedRate, 10);
  assert.equal(review.rows[0].currentRate, 20);
  assert.equal(review.rows[0].savedSalary, 1000);
  assert.equal(review.rows[0].currentSalary, 2000);
});

test('legacy payroll rates are unknown, not the latest employee rate', () => {
  const review = payrollRateReview([{ employee: { minimumRate: 20, basicSalary: 2000 } }]);
  assert.equal(review.canKeepSaved, false);
  assert.equal(review.rows[0].savedRate, null);
  assert.equal(review.rows[0].savedSalary, null);
});

test('zero is a saved rate and employee hourly fallback follows the calculator', () => {
  assert.equal(currentEmployeeRate({ minimumRate: 0, hourlyRate: 15 }), 15);
  assert.equal(currentEmployeeRate({ minimumRate: 10, hourlyRate: 15 }), 10);
  const review = payrollRateReview([{ rateSnapshotSaved: true, appliedEmployeeRate: 0 }]);
  assert.equal(review.canKeepSaved, true);
  assert.equal(review.rows[0].savedRate, 0);
});
