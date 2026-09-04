// Persists the Google OAuth access token across page reloads so a refresh
// doesn't force the user to sign in again. Implicit-flow tokens are short
// lived (~1h), so we also store an expiry and treat the token as gone once
// it's within a minute of expiring.

const KEY = 'klab.googleToken'
const SKEW_MS = 60_000

interface StoredToken {
  accessToken: string
  expiresAt: number
}

export function saveToken(accessToken: string, expiresInSeconds: number): void {
  const expiresAt = Date.now() + Math.max(0, expiresInSeconds * 1000 - SKEW_MS)
  try {
    localStorage.setItem(KEY, JSON.stringify({ accessToken, expiresAt } satisfies StoredToken))
  } catch {
    /* storage unavailable (private mode / disabled) — token just won't persist */
  }
}

export function loadToken(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredToken>
    if (typeof parsed.accessToken !== 'string' || typeof parsed.expiresAt !== 'number') return null
    if (Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(KEY)
      return null
    }
    return parsed.accessToken
  } catch {
    return null
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
