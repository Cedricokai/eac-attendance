import { apiFetch, getApiBaseUrl } from "../../utils/api";
import { getToken } from "../../utils/auth";

export const fileApi = (path = "", options = {}) =>
  apiFetch(`/api/files${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken() || ""}`,
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
export const jsonRequest = (method, body) => ({
  method,
  body: JSON.stringify(body),
});
export const employeeSharingRecipients = (query, signal) =>
  apiFetch(`/api/employee/file-sharing?q=${encodeURIComponent(query)}`, {
    signal,
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
export async function fileBlob(item, version) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/files/${item.id}/download${version ? `?version=${version}` : ""}`,
    { headers: { Authorization: `Bearer ${getToken() || ""}` } },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || data.message || data.error || "Unable to download file");
  }
  return response.blob();
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function passwordFileBlob(item,password){
  const response=await fetch(`${getApiBaseUrl()}/api/files/${item.id}/download/password`,{method:"POST",headers:{Authorization:`Bearer ${getToken()||""}`,"Content-Type":"application/json"},body:JSON.stringify({password})});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||data.detail||"Unable to prepare a password-protected download");}
  return response.blob();
}
export const bytes = (value) => {
  if (!value) return "0 B";
  const unit = Math.min(3, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${["B", "KB", "MB", "GB"][unit]}`;
};
export const date = (value) => (value ? new Date(value).toLocaleString() : "—");
