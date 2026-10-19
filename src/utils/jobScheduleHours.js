// Fixed job schedule: late arrival reduces normal time, not time worked after the normal window.
export function calculateJobScheduleHours(startTime, standardHours, checkIn, checkOut) {
  const minutes = value => {
    const [hours, mins] = value.split(':').map(Number);
    return hours * 60 + mins;
  };
  const start = minutes(startTime);
  const normalEnd = start + Math.round(Number(standardHours) * 60);
  let arrival = minutes(checkIn);
  let departure = minutes(checkOut);
  if (normalEnd >= 1440 && arrival < normalEnd % 1440) arrival += 1440;
  departure += Math.floor(arrival / 1440) * 1440;
  if (departure < arrival) departure += 1440;
  const effectiveStart = Math.max(start, arrival);
  return {
    normalHours: Math.max(0, Math.min(departure, normalEnd) - effectiveStart) / 60,
    overtimeHours: Math.max(0, departure - Math.max(effectiveStart, normalEnd)) / 60,
  };
}
