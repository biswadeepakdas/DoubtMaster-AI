/**
 * API utility for DoubtMaster web frontend.
 *
 * Handles:
 *  - Base URL configuration via NEXT_PUBLIC_API_URL
 *  - Automatic Bearer token attachment from localStorage
 *  - 401 interceptor that clears the token and redirects to /login
 *  - Normalised error objects  { message, code, status }
 */

const BASE_URL =
  (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:3001';

/**
 * Lightweight wrapper around fetch.
 *
 * @param {string} path    – API path, e.g. "/api/v1/auth/me"
 * @param {object} options – Standard fetch options (method, body, headers, …)
 * @returns {Promise<any>} Parsed JSON response body.
 * @throws {{ message: string, code: string, status: number }}
 */
export async function apiFetch(path, options = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('dm-token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If body is FormData, drop Content-Type so the browser sets the boundary.
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // --- 401: token expired / invalid ---
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dm-token');
      localStorage.removeItem('dm-refresh-token');
      // Avoid redirect loops if already on /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    throw { message: 'Session expired. Please log in again.', code: 'UNAUTHORIZED', status: 401 };
  }

  // --- Parse body (even error responses are JSON from our API) ---
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw {
      message: body?.error || body?.message || `Request failed (${res.status})`,
      code: body?.code || 'API_ERROR',
      status: res.status,
    };
  }

  return body;
}

/* ---- Convenience helpers ---- */

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => apiFetch(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};

export default api;
