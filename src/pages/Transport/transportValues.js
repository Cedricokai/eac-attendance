export function nullableNumber(value, label = "Number") {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be a non-negative number or blank.`);
  return number;
}

export function accraToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const text = String(date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const timestamp = Date.parse(`${text}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0,10) !== text) return null;
  return Math.round((timestamp - Date.parse(`${accraToday(now)}T00:00:00Z`)) / 86400000);
}

export function expiryStatus(date, now = new Date(), warningDays = 30, criticalDays = 7) {
  const days = daysUntil(date, now);
  return days === null ? "unknown" : days < 0 ? "expired" : days <= criticalDays ? "critical" : days <= warningDays ? "warning" : "valid";
}
