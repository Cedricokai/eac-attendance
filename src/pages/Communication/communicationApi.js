import { apiFetch, getApiBaseUrl } from "../../utils/api";
import { getToken } from "../../utils/auth";
export const communicationApi = (path = "", options = {}) =>
  apiFetch(`/api/communication${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken() || ""}`,
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
export const request = (method, body) => ({
  method,
  body: JSON.stringify(body),
});
export const reviewHeaders = (reason) => ({
  "X-Communication-Review-Reason": reason,
});
export const socketUrl = () =>
  getApiBaseUrl().replace(/^http/, "ws") + "/communication-ws";
export async function attachmentBlob(message, file, reason) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/communication/messages/${message}/attachments/${file}`,
    {
      headers: {
        Authorization: `Bearer ${getToken() || ""}`,
        ...(reason ? reviewHeaders(reason) : {}),
      },
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Error(error.message || "Attachment unavailable");
  }
  return response.blob();
}
export const initials = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
export const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
