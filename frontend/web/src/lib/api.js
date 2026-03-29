/**
 * API utility for DoubtMaster web frontend.
 *
 * Handles:
 *  - Base URL configuration via NEXT_PUBLIC_API_URL
 *  - Automatic Bearer token attachment from localStorage
 *  - 401 interceptor: tries token refresh before redirecting to /login
 *  - Normalised error objects  { message, code, status }
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let _refreshPromise = null;

async function _tryRefresh() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('dm-refresh-token') : null;
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const newToken = data.accessToken || data.access_token;
      const newRefresh = data.refreshToken || data.refresh_token;
      if (!newToken) return false;
      localStorage.setItem('dm-token', newToken);
      if (newRefresh) localStorage.setItem('dm-refresh-token', newRefresh);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/**
 * Lightweight wrapper around fetch.
 *
 * @param {string} path    – API path, e.g. "/api/v1/auth/me"
 * @param {object} options – Standard fetch options (method, body, headers, …)
 * @returns {Promise<any>} Parsed JSON response body.
 * @throws {{ message: string, code: string, status: number }}
 */
export async function apiFetch(path, options = {}, _isRetry = false) {
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

  // --- 401: try token refresh once, then redirect ---
  if (res.status === 401) {
    if (!_isRetry && typeof window !== 'undefined') {
      const refreshed = await _tryRefresh();
      if (refreshed) {
        return apiFetch(path, options, true);
      }
      localStorage.removeItem('dm-token');
      localStorage.removeItem('dm-refresh-token');
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
