import { collection, getDocs, doc, updateDoc, deleteDoc, deleteField, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { Role } from './checkAuthorization'

// Admin-only operations on customers/{email}. The UI hides these from
// non-admins, but firestore.rules is what actually blocks them.

export type CustomerStatus = 'active' | 'pending' | 'inactive' | 'expired'

export interface Customer {
  email: string
  active: boolean
  role: Role
  plan: string
  createdAt: Date | null
  expiresAt: Date | null
  updatedAt: Date | null
  updatedBy: string
  status: CustomerStatus
  lastLoginAt: Date | null
  /** Last time the dashboard was open (updated every few minutes). */
  lastSeenAt: Date | null
  loginCount: number
}

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null)

function statusOf(active: boolean, expiresAt: Date | null, updatedAt: Date | null): CustomerStatus {
  if (active) return expiresAt && expiresAt.getTime() < Date.now() ? 'expired' : 'active'
  // Never touched by an admin → a sign-up still waiting for approval.
  return updatedAt ? 'inactive' : 'pending'
}

export async function listCustomers(): Promise<Customer[]> {
  const snap = await getDocs(collection(db, 'customers'))
  return snap.docs.map(d => {
    const x = d.data()
    const active = x.active === true
    const expiresAt = toDate(x.expiresAt)
    const updatedAt = toDate(x.updatedAt)
    return {
      email: d.id,
      active,
      role: x.role === 'admin' ? 'admin' : 'user',
      plan: typeof x.plan === 'string' ? x.plan : '',
      createdAt: toDate(x.createdAt),
      expiresAt,
      updatedAt,
      updatedBy: typeof x.updatedBy === 'string' ? x.updatedBy : '',
      status: statusOf(active, expiresAt, updatedAt),
      lastLoginAt: toDate(x.lastLoginAt),
      lastSeenAt: toDate(x.lastSeenAt) ?? toDate(x.lastLoginAt),
      loginCount: typeof x.loginCount === 'number' ? x.loginCount : 0,
    }
  })
}

export interface CustomerPatch {
  active?: boolean
  role?: Role
  /** null clears the expiry (= never expires). */
  expiresAt?: Date | null
}

export async function updateCustomer(email: string, patch: CustomerPatch, adminEmail: string): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp(), updatedBy: adminEmail }
  if (patch.active !== undefined) data.active = patch.active
  if (patch.role !== undefined) data.role = patch.role
  if (patch.expiresAt !== undefined) {
    data.expiresAt = patch.expiresAt ? Timestamp.fromDate(patch.expiresAt) : deleteField()
  }
  await updateDoc(doc(db, 'customers', email), data)
}

export async function deleteCustomer(email: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', email))
}

/** Turns Firestore's terse permission error into something actionable. */
export function adminErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code
  if (code === 'permission-denied') {
    return 'Permission denied by Firestore rules. Make sure firestore.rules is deployed and your account has role "admin".'
  }
  return e instanceof Error ? e.message : 'Something went wrong'
}
