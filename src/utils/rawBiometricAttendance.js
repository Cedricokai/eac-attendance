export const canConvertRawEvent = event => event.attendanceId == null &&
  Object.hasOwn(event, 'conversionIssue') && !event.conversionIssue;

export function groupRawBiometricEvents(events) {
  const groups = new Map();
  for (const event of events) {
    const date = event.attendanceDate || event.eventTimestamp?.slice(0, 10);
    // Unmatched employees and missing dates must never be merged together.
    const key = event.employeeId != null && date ? `${event.employeeId}:${date}` : `event:${event.id}`;
    const group = groups.get(key) || { key, employeeId: event.employeeId, date, events: [], checkIn: null, checkOut: null };
    group.events.push(event);
    const timestamp = event.eventTimestamp;
    if (timestamp && event.punchType === 'SIGN ON' && (!group.checkIn || timestamp < group.checkIn)) group.checkIn = timestamp;
    if (timestamp && event.punchType === 'SIGN OFF' && (!group.checkOut || timestamp > group.checkOut)) group.checkOut = timestamp;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.key.localeCompare(b.key));
}

export async function loadAllRawBiometricEvents(baseUrl, filters, options, fetchData = fetch) {
  const events = new Map();
  let page = 0;
  let totalPages = 1;
  do {
    const params = new URLSearchParams({ page: String(page), size: '500' });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    const response = await fetchData(`${baseUrl}/api/biometric/raw-events?${params}`, options);
    if (!response.ok) throw new Error(`Could not load raw biometric events (${response.status}). Please retry.`);
    const data = await response.json();
    if (!Array.isArray(data.content)) throw new Error('Invalid raw biometric response');
    data.content.forEach(event => events.set(event.id, event));
    totalPages = Math.max(Number(data.totalPages || 1), 1);
    page++;
  } while (page < totalPages);
  return [...events.values()];
}
