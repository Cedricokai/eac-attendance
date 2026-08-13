import { apiFetch } from "../utils/api";

const authHeaders = () => {
  const token = localStorage.getItem("jwtToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonOptions = (method, body) => ({
  method,
  headers: { ...authHeaders(), "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const medicalVisitApi = {
  lookupEmployee: (token, tagNumber) =>
    apiFetch(`/api/public/hospital-visits/${encodeURIComponent(token)}/employee?tagNumber=${encodeURIComponent(tagNumber)}`),

  submitPublicVisit: (token, payload) =>
    apiFetch(`/api/public/hospital-visits/${encodeURIComponent(token)}`, jsonOptions("POST", payload)),

  uploadPublicAttachment: (token, visitId, file) => {
    const body = new FormData();
    body.append("file", file);
    return apiFetch(`/api/public/hospital-visits/${encodeURIComponent(token)}/${visitId}/attachment`, {
      method: "POST",
      body,
    });
  },

  getHospitals: () => apiFetch("/api/hospitals", { headers: authHeaders() }),
  createHospital: (payload) => apiFetch("/api/hospitals", jsonOptions("POST", payload)),
  createAccessLink: (hospitalId) =>
    apiFetch(`/api/hospitals/${hospitalId}/access-link`, jsonOptions("POST", {})),
  revokeAccessLink: (hospitalId) =>
    apiFetch(`/api/hospitals/${hospitalId}/revoke-link`, jsonOptions("POST", {})),

  getVisits: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== "" && value != null)
    );
    return apiFetch(`/api/medical-visits${query.size ? `?${query}` : ""}`, { headers: authHeaders() });
  },
  getVisit: (id) => apiFetch(`/api/medical-visits/${id}`, { headers: authHeaders() }),
  verifyVisit: (id, payload) =>
    apiFetch(`/api/medical-visits/${id}/verify`, jsonOptions("PUT", payload)),
  rejectVisit: (id, payload) =>
    apiFetch(`/api/medical-visits/${id}/reject`, jsonOptions("PUT", payload)),
  getEmployeeHistory: () =>
    apiFetch("/api/medical-visits/me", { headers: authHeaders() }),
};

export const unwrapList = (value) => {
  if (Array.isArray(value)) return value;
  return value?.content || value?.data || value?.items || [];
};
