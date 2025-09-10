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
  return res.data; // { score, level, reasons, feature_scores, weights, thresholds }
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

// Chat API functions
export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  intent?: string;
  abuse_type?: string;
  sentiment_score?: number;
  risk_points?: number;
  severity_score?: number;
  escalation_index?: number;
  is_high_risk: boolean;
}

export interface ChatSession {
  session_id: string;
  created_at: string;
  message_count: number;
}

export async function createChatSession(): Promise<ChatSession> {
  const res = await api.post(`/chat/sessions`);
  return res.data;
}

export async function listChatSessions(): Promise<ChatSession[]> {
  const res = await api.get(`/chat/sessions`);
  return res.data;
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await api.get(`/chat/sessions/${sessionId}/messages`);
  return res.data;
}

export async function deleteChatSession(sessionId: string) {
  await api.delete(`/chat/sessions/${sessionId}`);
}

export interface ChatStreamEvent {
  type: 'analysis' | 'warning' | 'content' | 'complete' | 'error';
  data?: any;
  content?: string;
  message?: string;
  session_id?: string;
}

export async function streamChatMessage(
  message: string,
  sessionId?: string,
  onEvent?: (event: ChatStreamEvent) => void,
  meta?: { jurisdiction?: string; children_present?: boolean|null; confidentiality?: string; share_with?: string }
): Promise<string> {
  const response = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ message, session_id: sessionId, ...meta }),
  });

  if (!response.ok) {
    throw new Error(`Chat stream failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let assistantContent = '';
  let currentSessionId = sessionId;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: ChatStreamEvent = JSON.parse(line.slice(6));
            
            if (event.type === 'content') {
              assistantContent += event.content || '';
            } else if (event.type === 'complete') {
              currentSessionId = event.session_id;
            }
            
            onEvent?.(event);
          } catch (e) {
            console.warn('Failed to parse SSE event:', line);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return assistantContent;
}
