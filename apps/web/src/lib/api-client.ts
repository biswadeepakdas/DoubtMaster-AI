const API_BASE = process.env.NEXT_PUBLIC_API_URL!

let _getToken: (() => Promise<string>) | null = null

export function setTokenRefresher(fn: () => Promise<string>) {
  _getToken = fn
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = _getToken ? await _getToken() : null
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401 && _getToken) {
    // Token expired mid-session — refresh once and retry
    const fresh = await _getToken()
    headers["Authorization"] = `Bearer ${fresh}`
    const retry = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (!retry.ok) throw new Error("Session expired — please log in again")
    return retry.json() as Promise<T>
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(err.detail ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}
