/**
 * API Service - Handles all backend communication
 */
import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// UUID generator for idempotency keys (no external dependency)
// ---------------------------------------------------------------------------
function generateUUID() {
  // RFC 4122 v4 UUID using Math.random (sufficient for idempotency keys)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Token refresh mutex — prevents concurrent refresh attempts
// ---------------------------------------------------------------------------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ---------------------------------------------------------------------------
// Retry helper — exponential backoff for network errors only
// ---------------------------------------------------------------------------
function isNetworkError(error) {
  return (
    !error.response &&
    Boolean(error.code) &&
    ['ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'].includes(error.code)
  );
}

async function retryWithBackoff(requestFn, { retries = 1, baseDelay = 2000 } = {}) {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && isNetworkError(error)) {
      await new Promise((resolve) => setTimeout(resolve, baseDelay));
      return retryWithBackoff(requestFn, {
        retries: retries - 1,
        baseDelay: baseDelay * 2,
      });
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT token
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — mutex-based token refresh on 401
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      // Mark so we don't retry this request again on a second 401
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another refresh is already in-flight — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.accessToken || data.token;
        useAuthStore.getState().setTokens(newAccessToken, data.refreshToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Resolve all queued requests with the new token
        processQueue(null, newAccessToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // -------------------------------------------------------------------
    // Normalize all error responses to a consistent shape:
    // error.normalizedMessage — human-readable string
    // error.statusCode        — HTTP status or 0 for network errors
    // -------------------------------------------------------------------
    if (error.response) {
      const d = error.response.data;
      error.normalizedMessage =
        d?.error || d?.message || d?.detail || `Request failed (${error.response.status})`;
      error.statusCode = error.response.status;
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      error.normalizedMessage = 'Request timed out. Please check your connection.';
      error.statusCode = 0;
    } else {
      error.normalizedMessage = 'Network error. Please check your connection.';
      error.statusCode = 0;
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Question API — solve endpoints use idempotency keys + retry
export const questionAPI = {
  solveImage: (formData) => {
    const idempotencyKey = generateUUID();
    return retryWithBackoff(
      () =>
        api.post('/questions/solve', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Idempotency-Key': idempotencyKey,
          },
          timeout: 60000,
        }),
      { retries: 1, baseDelay: 2000 }
    );
  },

  solveText: (data) => {
    const idempotencyKey = generateUUID();
    return retryWithBackoff(
      () =>
        api.post('/questions/text-solve', data, {
          headers: {
            'X-Idempotency-Key': idempotencyKey,
          },
        }),
      { retries: 1, baseDelay: 2000 }
    );
  },

  getHistory: (page = 1) => api.get(`/questions/history?page=${page}`),
  getQuestion: (id) => api.get(`/questions/${id}`),
  submitLearnMode: (id, response) => api.post(`/questions/${id}/learn`, { response }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getProgress: () => api.get('/user/progress'),
  getWeaknesses: () => api.get('/user/weaknesses'),
  getStreak: () => api.get('/user/streak'),
};

// Subscription API
export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  create: (data) => api.post('/subscriptions/create', data),
  getStatus: () => api.get('/subscriptions/status'),
};

// Search API
export const searchAPI = {
  searchNCERT: (params) => api.get('/search/ncert', { params }),
  searchPYQ: (params) => api.get('/search/pyq', { params }),
};

export default api;
