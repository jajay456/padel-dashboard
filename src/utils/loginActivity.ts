import {
  addDoc, collection, doc, getDocs, increment, limit, orderBy, query, serverTimestamp,
  Timestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../firebase'

// Sign-in history.
//
//  • loginEvents/{auto-id}   one doc per sign-in: { email, at, result, userAgent }
//  • customers/{email}       lastLoginAt, lastSeenAt, loginCount
//
// Users can only write their own entries (see firestore.rules); only admins
// can read them. Every write here is best-effort: if the rules aren't
// deployed yet, tracking silently stops but the dashboard keeps working.

export type LoginResult = 'ok' | 'pending' | 'inactive' | 'expired'

export interface LoginEvent {
  id: string
  email: string
  at: Date | null
  result: LoginResult
  userAgent: string
}

const SESSION_KEY = 'klab.loginLogged'
const SEEN_KEY = 'klab.lastSeenWrite'
const SEEN_THROTTLE_MS = 5 * 60 * 1000

/**
 * Records one sign-in per browser tab session. Reloading the page reuses the
 * stored Google token and runs the auth check again; that's a resumed session,
 * not a new sign-in, so it's skipped.
 */
export async function recordLogin(email: string, result: LoginResult): Promise<void> {
  const key = `${email}|${result}`
  try {
    if (sessionStorage.getItem(SESSION_KEY) === key) return
  } catch { /* no sessionStorage → just log it */ }

  try {
    await addDoc(collection(db, 'loginEvents'), {
      email,
      at: serverTimestamp(),
      result,
      userAgent: navigator.userAgent.slice(0, 380),
    })
    // Mark as logged as soon as the event exists, so a failure below can't
    // cause a duplicate event on the next reload.
    try { sessionStorage.setItem(SESSION_KEY, key) } catch { /* ignore */ }
  } catch (e) {
    console.warn('Could not record sign-in (are the Firestore rules deployed?)', e)
    return
  }

  try {
    await updateDoc(doc(db, 'customers', email), {
      lastLoginAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      loginCount: increment(1),
    })
    try { localStorage.setItem(SEEN_KEY, String(Date.now())) } catch { /* ignore */ }
  } catch (e) {
    console.warn('Could not update last sign-in time', e)
  }
}

/** Bumps "last active" at most once every few minutes. */
export async function touchLastSeen(email: string): Promise<void> {
  try {
    const last = Number(localStorage.getItem(SEEN_KEY) || 0)
    if (Date.now() - last < SEEN_THROTTLE_MS) return
    localStorage.setItem(SEEN_KEY, String(Date.now()))
  } catch { /* no storage → write anyway */ }
  try {
    await updateDoc(doc(db, 'customers', email), { lastSeenAt: serverTimestamp() })
  } catch (e) {
    console.warn('Could not update last-active time', e)
  }
}

export function clearLoginSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

const toEvent = (id: string, x: Record<string, unknown>): LoginEvent => ({
  id,
  email: String(x.email ?? ''),
  at: x.at instanceof Timestamp ? x.at.toDate() : null,
  result: (['ok', 'pending', 'inactive', 'expired'].includes(String(x.result)) ? x.result : 'ok') as LoginResult,
  userAgent: String(x.userAgent ?? ''),
})

/** Latest sign-ins across everyone (admin only). */
export async function listRecentLogins(max = 100): Promise<LoginEvent[]> {
  const snap = await getDocs(query(collection(db, 'loginEvents'), orderBy('at', 'desc'), limit(max)))
  return snap.docs.map(d => toEvent(d.id, d.data()))
}

/**
 * One user's sign-ins, newest first (admin only). Filtering on email and
 * ordering by time in the same query would need a composite index, so the
 * sort happens here instead.
 */
export async function listUserLogins(email: string, max = 50): Promise<LoginEvent[]> {
  const snap = await getDocs(query(collection(db, 'loginEvents'), where('email', '==', email), limit(500)))
  return snap.docs
    .map(d => toEvent(d.id, d.data()))
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
    .slice(0, max)
}

/** "Chrome · macOS", "Safari · iPhone", "LINE · Android"… */
export function describeDevice(ua: string): string {
  if (!ua) return 'Unknown device'
  const browser =
    /Line\//i.test(ua) ? 'LINE'
    : /EdgA?\//.test(ua) ? 'Edge'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'
  const os =
    /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Linux/.test(ua) ? 'Linux'
    : ''
  return os ? `${browser} · ${os}` : browser
}
