/**
 * Auth Store - Zustand state management for authentication
 * Tokens are persisted to AsyncStorage and rehydrated on app start.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'dm_access_token';
const REFRESH_KEY = 'dm_refresh_token';
const USER_KEY = 'dm_user';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  /**
   * Rehydrate auth state from persistent storage.
   * Call once at app startup (e.g. in the root component).
   */
  initializeAuth: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      const user = userJson ? JSON.parse(userJson) : null;
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: !!accessToken,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setUser: (user) => {
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
    set({ user, isAuthenticated: !!user, isLoading: false });
  },

  setTokens: (accessToken, refreshToken) => {
    const ops = [];
    if (accessToken) ops.push(AsyncStorage.setItem(TOKEN_KEY, accessToken));
    if (refreshToken) ops.push(AsyncStorage.setItem(REFRESH_KEY, refreshToken));
    Promise.all(ops).catch(() => {});
    set({ accessToken, refreshToken });
  },

  /**
   * Full login — accepts flexible token shapes from the API.
   * @param {object} user
   * @param {string|object} tokenData - either a string token or { accessToken, token }
   * @param {string} [refreshToken]
   */
  login: async (user, tokenData, refreshToken) => {
    const accessToken =
      typeof tokenData === 'object'
        ? tokenData.accessToken || tokenData.token
        : tokenData;

    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, accessToken || ''),
      AsyncStorage.setItem(REFRESH_KEY, refreshToken || ''),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]).catch(() => {});

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]).catch(() => {});

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export const useAppStore = create((set) => ({
  // Theme
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  // Language
  language: 'en',
  setLanguage: (language) => set({ language }),

  // Offline
  isOfflineMode: false,
  setOfflineMode: (isOfflineMode) => set({ isOfflineMode }),

  // Recent questions
  recentQuestions: [],
  addRecentQuestion: (question) =>
    set((state) => ({
      recentQuestions: [question, ...state.recentQuestions.slice(0, 49)],
    })),

  // Streak
  currentStreak: 0,
  todaySolved: 0,
  setStreak: (currentStreak) => set({ currentStreak }),
  incrementSolved: () =>
    set((state) => ({ todaySolved: state.todaySolved + 1 })),
}));
