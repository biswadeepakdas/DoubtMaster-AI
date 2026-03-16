/**
 * Auth Store - Zustand state management for authentication
 */
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

  login: (user, accessToken, refreshToken) => set({
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
    isLoading: false,
  }),

  logout: () => set({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  }),

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
  addRecentQuestion: (question) => set((state) => ({
    recentQuestions: [question, ...state.recentQuestions.slice(0, 49)],
  })),

  // Streak
  currentStreak: 0,
  todaySolved: 0,
  setStreak: (currentStreak) => set({ currentStreak }),
  incrementSolved: () => set((state) => ({ todaySolved: state.todaySolved + 1 })),
}));
