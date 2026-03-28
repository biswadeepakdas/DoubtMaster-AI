"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { AuthUser, TokenPair } from "@doubtmaster/shared-types"

interface AuthContextValue {
  user:          AuthUser | null
  accessToken:   string | null
  login:         (email: string, password: string) => Promise<void>
  logout:        () => Promise<void>
  refreshTokens: () => Promise<string>
  isLoading:     boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(true)

  const refreshTokens = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" })
    if (!res.ok) {
      setUser(null)
      setAccessToken(null)
      throw new Error("Session expired")
    }
    const data: TokenPair & { user: AuthUser } = await res.json()
    setAccessToken(data.access_token)
    setUser(data.user)
    // Re-schedule 1 min before the 15-min token expires
    setTimeout(refreshTokens, 14 * 60 * 1000)
    return data.access_token
  }, [])  // stable reference — no deps change after mount

  // Silent refresh on mount to restore session from httpOnly cookie
  useEffect(() => {
    refreshTokens().catch(() => setUser(null)).finally(() => setIsLoading(false))
  }, [refreshTokens])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail ?? "Login failed")
    }
    const data: TokenPair & { user: AuthUser } = await res.json()
    setAccessToken(data.access_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" })
    setUser(null)
    setAccessToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, refreshTokens, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
