export const issuedItemsApi = () => {
  const host = window.location.hostname;
  const base = host === "localhost" || host === "127.0.0.1" ? "http://localhost:8080" : host.startsWith("192.168.") ? import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_PUBLIC;
  return `${base}/api/employee-issued-items`;
};
export async function issuedItemsRequest(path = "", method = "GET", body) {
  const response = await fetch(`${issuedItemsApi()}${path}`, {
    method, headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.detail || `Could not ${method === "GET" ? "load" : "save"} issued-item records (${response.status}).`);
  return data;
}
export const ghanaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const displayIssueDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "—";
export const previewReplacementDate = (issueDate, count, unit) => {
  if (!issueDate || !count) return null;
  const [year, month, day] = issueDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + Number(count) * (unit === "YEARS" ? 12 : 1), 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
};
export const replacementCountdown = (record, today = ghanaToday()) => {
  if (["RETURNED", "REPLACED"].includes(record.status)) return { label: "Closed", status: "CLOSED" };
  if (!record.replacementDueDate) return { label: "Not scheduled", status: "NOT_SCHEDULED" };
  const days = Math.round((Date.parse(record.replacementDueDate) - Date.parse(today)) / 86400000);
  return { days, label: days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `${days} days remaining`, status: days < 0 ? "OVERDUE" : days === 0 ? "DUE_TODAY" : days <= 30 ? "DUE_SOON" : "ON_TRACK" };
};
