const API_BASE = '/api/v1';
const TOKEN_KEY = 'agentvault_token';
const USER_KEY = 'agentvault_user';
const LEGACY_TOKEN_KEY = 'esakip_token';
const LEGACY_USER_KEY = 'esakip_user';

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function postAuth(url, body, fallbackMessage, contentType = 'application/x-www-form-urlencoded') {
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError('Cannot reach the Agentvault API. Check that the backend is running, then try again.', 0);
    }
    throw error;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.detail
      || (res.status >= 500
        ? 'The Agentvault API is unavailable right now. Please try again shortly.'
        : fallbackMessage);
    throw new ApiError(message, res.status, data);
  }
  if (!data) {
    throw new ApiError('The Agentvault API returned an invalid response.', res.status);
  }
  return data;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  return legacyToken;
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      data?.detail || `Request failed (${res.status})`,
      res.status,
      data
    );
  }

  return data;
}

// Auth endpoints
export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const data = await postAuth('/auth/login', body, 'Login failed. Check your email and password.');
  setToken(data.access_token);
  // Fetch user profile
  const user = await authFetch('/auth/me');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { token: data, user };
}

export async function signup(email, password, fullName, department = '') {
  const data = await postAuth(
    '/auth/signup',
    JSON.stringify({
      email,
      password,
      full_name: fullName,
      department,
    }),
    'Signup failed.',
    'application/json'
  );
  return data;
}

export async function getMe() {
  return authFetch('/auth/me');
}

export async function updateMyProfile(body) {
  return authFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(body) });
}

// Query endpoints
export async function query(question) {
  return authFetch('/query', { method: 'POST', body: JSON.stringify({ question }) });
}

export function queryStream(
  question, onEvent, onDone, onError, answerMode = 'detailed',
  contextTitles = [], excludedChunkIds = [], conversationId = null
) {
  const token = getToken();
  const controller = new AbortController();

  fetch(`${API_BASE}/query/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      answer_mode: answerMode,
      context_titles: contextTitles,
      excluded_chunk_ids: excludedChunkIds,
      conversation_id: conversationId,
    }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new ApiError(data?.detail || 'Stream failed', res.status, data);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              onEvent(event);
            } catch { /* skip malformed */ }
          }
        }
      }
      onDone?.();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err);
    });

  return controller;
}

// Document endpoints
export async function listDocuments(limit = 50, offset = 0) {
  return authFetch(`/documents?limit=${limit}&offset=${offset}`);
}

export async function getDocument(id) {
  return authFetch(`/documents/${id}`);
}

export async function uploadDocument(file, metadata) {
  const form = new FormData();
  form.append('file', file);
  if (metadata.title) form.append('title', metadata.title);
  if (metadata.source_type) form.append('source_type', metadata.source_type);
  if (metadata.classification) form.append('classification', metadata.classification);
  if (metadata.allowed_roles) form.append('allowed_roles', metadata.allowed_roles);
  if (metadata.source_updated_at) form.append('source_updated_at', metadata.source_updated_at);
  return authFetch('/documents', { method: 'POST', body: form });
}

export async function addSampleLibrary() {
  return authFetch('/documents/sample-pack', { method: 'POST' });
}

export async function getKnowledgeUpdates(days = 30, limit = 50) {
  return authFetch(`/documents/updates?days=${days}&limit=${limit}`);
}

export async function updateDocumentAccess(id, body) {
  return authFetch(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteDocument(id) {
  return authFetch(`/documents/${id}`, { method: 'DELETE' });
}

// Receipt endpoints
export async function listReceipts(status, limit = 50, offset = 0) {
  let url = `/receipts?limit=${limit}&offset=${offset}`;
  if (status) url += `&status=${status}`;
  return authFetch(url);
}

export async function getReceipt(id) {
  return authFetch(`/receipts/${id}`);
}

export async function verifyReceipt(id) {
  return authFetch(`/receipts/${id}/verify`);
}

// Saved conversations
export async function listConversations(limit = 50, offset = 0) {
  return authFetch(`/conversations?limit=${limit}&offset=${offset}`);
}

export async function createConversation(title) {
  return authFetch('/conversations', { method: 'POST', body: JSON.stringify({ title }) });
}

export async function getConversation(id) {
  return authFetch(`/conversations/${id}`);
}

export async function renameConversation(id, title) {
  return authFetch(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export async function deleteConversation(id) {
  return authFetch(`/conversations/${id}`, { method: 'DELETE' });
}

// Dashboard endpoints
export async function getDashboardHealth(days = 7) {
  return authFetch(`/dashboard/health?days=${days}`);
}

export async function getKnowledgeGaps(status = 'open', limit = 50) {
  return authFetch(`/dashboard/knowledge-gaps?status=${status}&limit=${limit}`);
}

export async function resolveKnowledgeGap(id) {
  return authFetch(`/dashboard/knowledge-gaps/${id}/resolve`, { method: 'PATCH' });
}

export async function updateKnowledgeGapFollowUp(id, body) {
  return authFetch(`/dashboard/knowledge-gaps/${id}/follow-up`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function getEvidenceChanges(limit = 50) {
  return authFetch(`/dashboard/evidence-changes?limit=${limit}`);
}

export async function getConnectorOverview() {
  return authFetch('/dashboard/connectors');
}

// Connector endpoints
export async function listConnectors() {
  return authFetch('/connectors');
}

export async function createConnector(body) {
  return authFetch('/connectors', { method: 'POST', body: JSON.stringify(body) });
}

export async function syncConnector(id) {
  return authFetch(`/connectors/${id}/sync`, { method: 'POST' });
}

export async function deleteConnector(id) {
  return authFetch(`/connectors/${id}`, { method: 'DELETE' });
}

// User endpoints
export async function listUsers() {
  return authFetch('/users');
}

export async function getEvaluationCases() {
  return authFetch('/evaluation/cases');
}

export async function createEvaluationCase(body) {
  return authFetch('/evaluation/cases', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateEvaluationCase(id, body) {
  return authFetch(`/evaluation/cases/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteEvaluationCase(id) {
  return authFetch(`/evaluation/cases/${id}`, { method: 'DELETE' });
}

export async function runEvaluationCases(caseIds) {
  return authFetch('/evaluation/run', {
    method: 'POST',
    body: JSON.stringify({ case_ids: caseIds || null }),
  });
}

export async function getMyAnswerFeedback(receiptId) {
  return authFetch(`/feedback/receipt/${receiptId}`);
}

export async function submitAnswerFeedback(body) {
  return authFetch('/feedback', { method: 'POST', body: JSON.stringify(body) });
}

export async function getAnswerFeedbackReview(status = 'open', limit = 100) {
  return authFetch(`/feedback?status=${status}&limit=${limit}`);
}

export async function updateAnswerFeedbackStatus(id, status) {
  return authFetch(`/feedback/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function simulateUserAccessImpact(id, body) {
  return authFetch(`/users/${id}/access-impact`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateUser(id, body) {
  return authFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export { getToken, setToken, clearToken, ApiError };
