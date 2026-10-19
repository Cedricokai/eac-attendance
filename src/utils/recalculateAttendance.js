// Reuse the edit endpoint without sending stale calculated hours back to it.
export async function recalculateAttendance(records, selectedIds, save, onProgress = () => {}) {
  const result = { succeeded: [], failed: [], skipped: [] };
  const byId = new Map(records.map(record => [record.id, record]));
  const ids = [...selectedIds];
  for (const [index, id] of ids.entries()) {
    const record = byId.get(id);
    if (!record?.checkIn || !record?.checkOut) {
      result.skipped.push(id);
    } else {
      try {
        await save(id, {
          shift: record.shift,
          workType: record.workType,
          date: record.date,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
        });
        result.succeeded.push(id);
      } catch {
        result.failed.push(id);
      }
    }
    onProgress(index + 1, ids.length);
  }
  return result;
}
