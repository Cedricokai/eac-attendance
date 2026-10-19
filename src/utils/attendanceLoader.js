// Keep supporting responses briefly between page changes. Explicit refreshes
// invalidate the cache so edits and recalculations appear immediately.
export function createAttendanceLoader(fetchData = fetch, now = Date.now) {
  const cache = new Map();
  let generation = 0;
  let controller;

  const supportingData = (url, headers) => {
    const key = `${headers.Authorization}:${url}`;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return cached.promise;
    const entry = { expires: Infinity };
    entry.promise = fetchData(url, { headers }).then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      entry.expires = now() + 60000;
      return data;
    }).catch(error => {
      if (cache.get(key) === entry) cache.delete(key);
      throw error;
    });
    if (cache.size >= 6) cache.clear();
    cache.set(key, entry);
    return entry.promise;
  };

  return {
    cancel() {
      generation += 1;
      controller?.abort();
    },
    async load({ pageUrl, leavesUrl, previewUrl, allRecordsUrl, headers, refresh = false,
      onPage, onLeaves, onPreview, onAllRecords, onError, onSupportingError, onPageSettled }) {
      const current = ++generation;
      controller?.abort();
      controller = new AbortController();
      if (refresh) cache.clear();
      // Handle rejections immediately, including when the main request fails.
      const settle = promise => promise.then(data => ({ data }), error => ({ error }));
      const leaves = settle(supportingData(leavesUrl, headers));
      const preview = settle(supportingData(previewUrl, headers));
      const allRecords = allRecordsUrl ? settle(supportingData(allRecordsUrl, headers)) : null;
      try {
        const response = await fetchData(pageUrl, { headers, signal: controller.signal });
        if (!response.ok) throw new Error(await response.text() || `HTTP ${response.status}`);
        const page = await response.json();
        if (current !== generation) return;
        onPage(page);
      } catch (error) {
        if (current === generation) onError(error);
        return;
      } finally {
        if (current === generation) onPageSettled();
      }
      const deliver = async (promise, callback, name) => {
        const result = await promise;
        if (current !== generation) return;
        try {
          if (result.error) throw result.error;
          callback(result.data);
        } catch (error) {
          onSupportingError(name, error);
        }
      };
      await Promise.all([
        deliver(leaves, onLeaves, 'Leave records'),
        deliver(preview, onPreview, 'Report details'),
        ...(allRecords ? [deliver(allRecords, onAllRecords, 'Attendance totals')] : [])
      ]);
    }
  };
}
