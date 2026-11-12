import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export type Role = 'admin' | 'user'

export interface AuthCheckResult {
  authorized: boolean
  email: string
  reason?: string
  role: Role
}

export interface UserProfile {
  email: string
  name: string
  givenName: string
  picture: string
}

/**
 * Calls Google's userinfo endpoint with the OAuth access token to get the
 * signed-in user's email address. Requires the 'email' scope, which is
 * already requested in LoginPage.tsx.
 */
export async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user info from Google')
  const json = await res.json()
  if (!json.email) throw new Error('Google account has no email on file')
  return {
    email: json.email as string,
    name: (json.name as string | undefined) ?? '',
    givenName: (json.given_name as string | undefined) ?? '',
    picture: (json.picture as string | undefined) ?? '',
  }
}

export async function getUserEmail(accessToken: string): Promise<string> {
  return (await getUserProfile(accessToken)).email
}

/**
 * Looks up the user's email in the Firestore 'customers' collection.
 * Expected document shape at customers/{email}:
 *   { active: boolean, expiresAt?: Timestamp, plan?: string, createdAt?: Timestamp,
 *     role?: 'admin' | 'user' }
 *
 * `role` only decides what the UI shows. What an admin can actually do is
 * enforced by firestore.rules, which reads the same field server-side.
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
    return { authorized: false, email: normalizedEmail, reason: 'pending', role: 'user' }
  }

  const data = snap.data()
  const role: Role = data.role === 'admin' ? 'admin' : 'user'

  if (data.active !== true) {
    return { authorized: false, email: normalizedEmail, reason: 'inactive', role }
  }

  if (data.expiresAt) {
    const expiresAt: Timestamp = data.expiresAt
    if (expiresAt.toMillis() < Date.now()) {
      return { authorized: false, email: normalizedEmail, reason: 'expired', role }
    }
  }

  return { authorized: true, email: normalizedEmail, role }
}