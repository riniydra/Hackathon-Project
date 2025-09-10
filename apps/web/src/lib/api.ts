import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

export async function me() {
  const res = await api.get(`/auth/me`);
  return res.data; // { ok, user_id }
}

export async function signup(email: string, password: string) {
  const res = await api.post(`/auth/signup`, { email, password });
  return res.data; // { ok, user_id }
}

export async function login(email: string, password: string) {
  const res = await api.post(`/auth/login`, { email, password });
  return res.data; // { ok, user_id }
}

export async function logout() {
  const res = await api.post(`/auth/logout`);
  return res.data; // { ok }
}

export async function listJournals() {
  const res = await api.get(`/journals/`);
  return res.data;
}

export async function createJournal(text: string) {
  const res = await api.post(`/journals/`, { text });
  return res.data;
}

export async function updateJournal(id: number, text: string) {
  const res = await api.patch(`/journals/${id}`, { text });
  return res.data;
}

export async function deleteJournal(id: number) {
  await api.delete(`/journals/${id}`);
}

// Risk evaluation functions
export async function getRiskScore() {
  const res = await api.get(`/insights/risk`);
  return res.data; // { score, level, reasons, feature_scores, weights, thresholds, timestamp }
}

export async function getRiskHistory(days: number = 30) {
  const res = await api.get(`/insights/risk/history?days=${days}`);
  return res.data; // { history: [{ timestamp, score, level }] }
}

export async function getRiskChanges() {
  const res = await api.get(`/insights/risk/changes`);
  return res.data; // { has_previous, score_change, level_change, new_reasons, resolved_reasons, feature_changes }
}

export async function getRiskRules() {
  const res = await api.get(`/insights/risk/rules`);
  return res.data; // { rules, weights, thresholds, features }
}

// PIN endpoints (to be implemented on backend)
export async function setPin(pin: string, duressPin?: string) {
  const res = await api.post(`/auth/pin`, { pin, duress_pin: duressPin });
  return res.data; // { ok }
}

export async function verifyPin(pin: string) {
  const res = await api.post(`/auth/pin/verify`, { pin });
  return res.data as { ok: boolean; duress?: boolean };
}

export async function updateProfile(fields: { gender?: string|null; relationship_status?: string|null; num_children?: number|null }) {
  const res = await api.post(`/auth/profile`, fields);
  return res.data;
}

// Export functions
export async function exportTableau() {
  const res = await api.post(`/exports/tableau`);
  return res.data; // { ok, path, type, user_hash, data_summary }
}

export async function exportFullData() {
  const res = await api.post(`/exports/full`);
  return res.data; // { ok, path, type, user_hash, journal_count, export_date }
}

export async function listExports() {
  const res = await api.get(`/exports/list`);
  return res.data; // { exports, user_hash }
}

export async function downloadExport(filename: string) {
  const res = await api.get(`/exports/download/${filename}`, {
    responseType: 'blob'
  });
  return res.data; // Blob data for file download
}
