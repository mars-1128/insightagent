import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('insightagent_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthRoute = err.config?.url?.includes('/api/auth/');
      if (!isAuthRoute) {
        localStorage.removeItem('insightagent_token');
        localStorage.removeItem('insightagent_user');
        window.dispatchEvent(new Event('auth:expired'));
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Helper to stream Server-Sent Events over POST using Fetch API.
 */
export async function streamAgentPost(path, body, handlers = {}) {
  const token = localStorage.getItem('insightagent_token');
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  });

  if (!response.ok) {
    let errMsg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) errMsg = data.error;
    } catch {}
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      let eventName = 'message';
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataStr += line.slice(5).trim();
        }
      }

      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          handlers[eventName]?.(parsed);
          handlers.onAny?.(eventName, parsed);
        } catch {
          // Ignore malformed keepalive fragments
        }
      }
    }
  }
}

export default api;
