const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

function buildHeaders(token, extra = {}) {
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseResponse(response) {
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    const message = payload.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function apiRequest(path, { method = 'GET', token, body, isForm = false } = {}) {
  const options = { method };

  if (body !== undefined) {
    if (isForm) {
      options.body = body;
      options.headers = buildHeaders(token);
    } else {
      options.body = JSON.stringify(body);
      options.headers = buildHeaders(token, { 'Content-Type': 'application/json' });
    }
  } else {
    options.headers = buildHeaders(token);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  return parseResponse(response);
}

export const api = {
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  respondToEmail: (token, inquiry) => apiRequest('/email/respond', { method: 'POST', token, body: { inquiry } }),
  listAutomations: (token) => apiRequest('/automations', { token }),
  dashboard: (token) => apiRequest('/admin/dashboard', { token }),
  getSettings: (token) => apiRequest('/admin/settings', { token }),
  updateSettings: (token, payload) => apiRequest('/admin/settings', { method: 'PUT', token, body: payload }),
  listDrafts: (token) => apiRequest('/drafts', { token }),
  getDraft: (token, id) => apiRequest(`/drafts/${id}`, { token }),
  createDraft: (token, payload) => apiRequest('/drafts', { method: 'POST', token, body: payload }),
  updateDraft: (token, id, payload) => apiRequest(`/drafts/${id}`, { method: 'PUT', token, body: payload }),
  deleteDraft: async (token, id) => {
    const response = await fetch(`${API_BASE}/drafts/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(token),
    });
    if (!response.ok && response.status !== 204) {
      const payload = await parseResponse(response);
      throw new Error(payload.error || 'Unable to delete draft');
    }
    return { ok: true };
  },
  previewInvoiceWithText: (token, rawText) => apiRequest('/invoices/preview', { method: 'POST', token, body: { rawText } }),
  previewInvoiceWithFile: (token, file) => {
    const formData = new FormData();
    formData.append('invoice', file);
    return apiRequest('/invoices/preview', { method: 'POST', token, body: formData, isForm: true });
  },
  saveInvoice: (token, payload) => apiRequest('/invoices', { method: 'POST', token, body: payload }),
  uploadInvoice: (token, file) => {
    const formData = new FormData();
    formData.append('invoice', file);
    return apiRequest('/invoices/upload', { method: 'POST', token, body: formData, isForm: true });
  },
  listInvoices: (token) => apiRequest('/invoices', { token }),
  scheduleMeeting: (token, payload) => apiRequest('/schedule/meetings', { method: 'POST', token, body: payload }),
  listMeetings: (token) => apiRequest('/meetings', { token }),
};
