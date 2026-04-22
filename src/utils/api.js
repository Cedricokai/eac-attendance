export const getApiBaseUrl = () => {
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";

  if (hostname.startsWith("192.168.")) {
    return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://192.168.1.97:8080";
  }

  if (hostname === "100.114.178.13") {
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://100.114.178.13:8080";
  }

  return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
};


export const apiFetch = async (path, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  // Try to parse JSON, fallback to text
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
};
