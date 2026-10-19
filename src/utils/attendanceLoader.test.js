import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';
import { createAttendanceLoader } from './attendanceLoader.js';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const response = data => ({ ok: true, json: async () => data });
const options = overrides => ({
  pageUrl: 'page', leavesUrl: 'leaves', previewUrl: 'preview',
  headers: { Authorization: 'Bearer test' },
  onPage() {}, onLeaves() {}, onPreview() {}, onError() {},
  onSupportingError() {}, onPageSettled() {}, ...overrides
});

test('all-record totals are independent of the page and cached across page changes', async () => {
  const calls = [];
  const all = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const loader = createAttendanceLoader(async url => {
    calls.push(url);
    return response(url === 'all' ? all : { content: [{ id: 1 }] });
  });
  const received = [];
  const settings = options({ allRecordsUrl: 'all', onAllRecords: data => received.push(data) });
  await loader.load(settings);
  await loader.load({ ...settings, pageUrl: 'page2' });
  assert.deepEqual(received, [all, all]);
  assert.equal(calls.filter(url => url === 'all').length, 1);
  await loader.load({ ...settings, refresh: true });
  assert.equal(calls.filter(url => url === 'all').length, 2);
});

test('a failed totals request preserves the page and reports unavailable totals', async () => {
  const events = [];
  const loader = createAttendanceLoader(async url => url === 'all'
    ? { ok: false, status: 500 } : response({}));
  await loader.load(options({ allRecordsUrl: 'all',
    onPage: () => events.push('page'),
    onAllRecords: () => events.push('unexpected totals'),
    onSupportingError: name => events.push(name)
  }));
  assert.deepEqual(events, ['page', 'Attendance totals']);
});

test('cancelled totals requests cannot overwrite a newer date range', async () => {
  const old = deferred();
  const shown = deferred();
  const events = [];
  const loader = createAttendanceLoader(async url => url === 'old-all' ? old.promise : response([]));
  const first = loader.load(options({ allRecordsUrl: 'old-all', onAllRecords: () => events.push('old'), onPageSettled: () => shown.resolve() }));
  await shown.promise;
  await loader.load(options({ allRecordsUrl: 'new-all', onAllRecords: () => events.push('new') }));
  old.resolve(response([]));
  await first;
  assert.deepEqual(events, ['new']);
});

test('shows the page before either supporting request and handles them independently', async () => {
  const leaves = deferred();
  const preview = deferred();
  const shown = deferred();
  const events = [];
  const loader = createAttendanceLoader(url => url === 'page'
    ? Promise.resolve(response({ content: [{ id: 1 }] }))
    : url === 'leaves' ? leaves.promise : preview.promise);
  const pending = loader.load(options({
    onPage: data => { events.push(data.content[0].id); },
    onPageSettled: () => { events.push('page done'); shown.resolve(); },
    onLeaves: () => events.push('leaves'),
    onSupportingError: name => events.push(name)
  }));
  await shown.promise;
  assert.deepEqual(events, [1, 'page done']);
  leaves.resolve(response([]));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, [1, 'page done', 'leaves']);
  preview.resolve({ ok: false, status: 500 });
  await pending;
  assert.deepEqual(events, [1, 'page done', 'leaves', 'Report details']);
});

test('reuses supporting data, expires it, and refreshes after an explicit reload', async () => {
  const calls = [];
  let time = 0;
  const loader = createAttendanceLoader(async url => {
    calls.push(url);
    return response({});
  }, () => time);
  await loader.load(options());
  await loader.load(options({ pageUrl: 'page2' }));
  assert.deepEqual(calls, ['leaves', 'preview', 'page', 'page2']);
  time = 60001;
  await loader.load(options());
  await loader.load(options({ refresh: true }));
  assert.equal(calls.filter(url => url === 'leaves').length, 3);
  assert.equal(calls.filter(url => url === 'preview').length, 3);
});

test('late responses from an older page cannot overwrite the current page', async () => {
  const oldPage = deferred();
  const events = [];
  const loader = createAttendanceLoader(async url => url === 'old'
    ? oldPage.promise : response({}));
  const first = loader.load(options({ pageUrl: 'old', onPage: () => events.push('old'),
    onLeaves: () => events.push('old leaves'), onPageSettled: () => events.push('old done') }));
  await loader.load(options({ onPage: () => events.push('new') }));
  oldPage.resolve(response({}));
  await first;
  assert.deepEqual(events, ['new']);
});

test('cancelling suppresses late supporting updates and retries failed requests', async () => {
  const preview = deferred();
  const shown = deferred();
  const events = [];
  let previewCalls = 0;
  const loader = createAttendanceLoader(async url => {
    if (url !== 'preview') return response({});
    previewCalls++;
    return previewCalls === 1 ? preview.promise : response({});
  });
  const pending = loader.load(options({ onPageSettled: () => shown.resolve(),
    onPreview: () => events.push('stale'), onSupportingError: () => events.push('stale error') }));
  await shown.promise;
  loader.cancel();
  preview.resolve({ ok: false, status: 500 });
  await pending;
  assert.deepEqual(events, []);
  await loader.load(options());
  assert.equal(previewCalls, 2);
});

test('page failure finishes loading without publishing supporting rows', async () => {
  const events = [];
  const loader = createAttendanceLoader(async url => url === 'page'
    ? { ok: false, text: async () => 'Attendance unavailable' } : response({}));
  await loader.load(options({
    onError: error => events.push(error.message),
    onPageSettled: () => events.push('done'),
    onLeaves: () => events.push('unexpected leaves'),
    onPreview: () => events.push('unexpected preview')
  }));
  assert.deepEqual(events, ['Attendance unavailable', 'done']);
});

test('malformed supporting data does not turn a successful page into a page error', async () => {
  const events = [];
  const loader = createAttendanceLoader(async () => response(null));
  await loader.load(options({
    onPage: () => events.push('page'),
    onPreview: data => data.rows.map(row => row.id),
    onSupportingError: name => events.push(name),
    onError: () => events.push('unexpected page error')
  }));
  assert.deepEqual(events, ['page', 'Report details']);
});
