/**
 * API Service - Handles all backend communication
 */
import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(error.config);
      } catch {
        useAuthStore.getState().logout();
      }
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

// Question API
export const questionAPI = {
  solveImage: (formData) => api.post('/questions/solve', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }),
  solveText: (data) => api.post('/questions/text-solve', data),
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
