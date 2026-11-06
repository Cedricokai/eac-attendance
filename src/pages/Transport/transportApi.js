import { getApiBaseUrl } from "../../utils/api";
import { getToken } from "../../utils/auth";

export async function transportApi(path = "", options = {}) {
  const token = getToken();
  if (!token) throw Object.assign(new Error("Your session has expired. Sign in again before continuing."), { status: 401 });
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = window.setTimeout(abort, 30000);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/transport${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
    if (options.blob && response.ok) return response.blob();
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
      if (response.status === 401) {
        throw Object.assign(new Error("Your session could not be authenticated. Sign in again, then retry. If only photo or receipt uploads fail, restart EAC with the latest backend."), { status: 401 });
      }
      const message = typeof data === "string" ? data : data?.detail || data?.message || data?.error;
      throw Object.assign(new Error(message || `Transport request failed (${response.status}).`), { status: response.status });
    }
    return data;
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export const transportCommand = (method, body, key) => ({ method, body: JSON.stringify(body), headers: key ? { "Idempotency-Key": key } : {} });
export const transportQuery = filters => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== "" && value !== null && value !== undefined) params.set(key, String(value)); });
  return params.size ? `?${params}` : "";
};
