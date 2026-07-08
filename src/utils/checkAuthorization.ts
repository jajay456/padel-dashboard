import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export interface AuthCheckResult {
  authorized: boolean
  email: string
  reason?: string
}

/**
 * Calls Google's userinfo endpoint with the OAuth access token to get the
 * signed-in user's email address. Requires the 'email' scope, which is
 * already requested in LoginPage.tsx.
 */
export async function getUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user info from Google')
  const json = await res.json()
  if (!json.email) throw new Error('Google account has no email on file')
  return json.email as string
}

/**
 * Looks up the user's email in the Firestore 'customers' collection.
 * Expected document shape at customers/{email}:
 *   { active: boolean, expiresAt?: Timestamp, plan?: string, createdAt?: Timestamp }
 *
 * If no document exists yet, this AUTO-CREATES one with active: false so the
 * admin can find it in the Firestore console and flip it to true to approve
 * the customer — no need to type the email in manually.
 *
 * A customer is considered authorized if:
 *   - the document exists
 *   - active === true
 *   - expiresAt is either absent or in the future
 */
export async function checkAuthorization(email: string): Promise<AuthCheckResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const ref = doc(db, 'customers', normalizedEmail)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    // First time this email has ever signed in — register a pending record.
    // Firestore rules only allow this create when active is explicitly false,
    // so a client can never self-approve.
    await setDoc(ref, {
      active: false,
      createdAt: serverTimestamp(),
    })
    return { authorized: false, email: normalizedEmail, reason: 'pending' }
  }

  const data = snap.data()

  if (data.active !== true) {
    return { authorized: false, email: normalizedEmail, reason: 'inactive' }
  }

  if (data.expiresAt) {
    const expiresAt: Timestamp = data.expiresAt
    if (expiresAt.toMillis() < Date.now()) {
      return { authorized: false, email: normalizedEmail, reason: 'expired' }
    }
  }

  return { authorized: true, email: normalizedEmail }
}