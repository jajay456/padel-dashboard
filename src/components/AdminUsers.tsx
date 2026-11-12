import { useCallback, useEffect, useMemo, useState } from 'react'
import { listCustomers, updateCustomer, deleteCustomer, adminErrorMessage, type Customer, type CustomerPatch, type CustomerStatus } from '../utils/customers'
import { RefreshIcon, TrashIcon, ShieldIcon, SearchIcon, ClockIcon } from './Icons'
import LoginHistory from './LoginHistory'
import DatePicker, { type DatePreset } from './DatePicker'
import { monthsFromToday, timeAgo, formatDateTime } from '../utils/dates'

type Tab = 'all' | 'pending' | 'active' | 'off' | 'admins'
type Sort = 'status' | 'recent' | 'joined'

const isToday = (d: Date | null) => {
  if (!d) return false
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'off', label: 'Inactive' },
  { key: 'admins', label: 'Admins' },
]

const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
  expired: 'Expired',
}

const STATUS_ORDER: Record<CustomerStatus, number> = { pending: 0, active: 1, expired: 2, inactive: 3 }

// Recomputed per render so "+1 month" is always relative to today.
const expiryPresets = (): DatePreset[] => [
  { label: '+1 mo', value: monthsFromToday(1) },
  { label: '+3 mo', value: monthsFromToday(3) },
  { label: '+6 mo', value: monthsFromToday(6) },
  { label: '+1 yr', value: monthsFromToday(12) },
]

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const toInputDate = (d: Date | null) => {
  if (!d) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function initials(email: string) {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase()
}

export default function AdminUsers({ adminEmail }: { adminEmail: string }) {
  const [users, setUsers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('status')
  const [historyEmail, setHistoryEmail] = useState<string | null>(null)

  function showHistory(email: string | null) {
    setHistoryEmail(email)
    requestAnimationFrame(() =>
      document.getElementById('login-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const me = adminEmail.trim().toLowerCase()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await listCustomers())
    } catch (e) {
      setError(adminErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch: `loading` already starts true, so only async setState here.
  useEffect(() => {
    let cancelled = false
    listCustomers()
      .then(list => { if (!cancelled) setUsers(list) })
      .catch(e => { if (!cancelled) setError(adminErrorMessage(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function apply(email: string, patch: CustomerPatch) {
    setBusy(email)
    setError('')
    try {
      await updateCustomer(email, patch, me)
      // Re-read so status/updatedAt come from the server, not a guess.
      setUsers(await listCustomers())
    } catch (e) {
      setError(adminErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  async function remove(email: string) {
    if (!window.confirm(`Remove ${email}? They will be registered again as pending if they sign in later.`)) return
    setBusy(email)
    setError('')
    try {
      await deleteCustomer(email)
      setUsers(u => u.filter(x => x.email !== email))
    } catch (e) {
      setError(adminErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  function toggleRole(u: Customer) {
    const next = u.role === 'admin' ? 'user' : 'admin'
    if (next === 'admin' && !window.confirm(`Make ${u.email} an admin? They will be able to approve, revoke and remove any user.`)) return
    apply(u.email, { role: next })
  }

  const counts = useMemo(() => ({
    all: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'active').length,
    off: users.filter(u => u.status === 'inactive' || u.status === 'expired').length,
    admins: users.filter(u => u.role === 'admin').length,
    today: users.filter(u => isToday(u.lastSeenAt)).length,
  }), [users])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter(u => {
        if (tab === 'pending') return u.status === 'pending'
        if (tab === 'active') return u.status === 'active'
        if (tab === 'off') return u.status === 'inactive' || u.status === 'expired'
        if (tab === 'admins') return u.role === 'admin'
        return true
      })
      .filter(u => !q || u.email.includes(q) || u.plan.toLowerCase().includes(q))
      .sort((a, b) => {
        const time = (d: Date | null) => d?.getTime() ?? 0
        if (sort === 'recent') return time(b.lastSeenAt) - time(a.lastSeenAt)
        if (sort === 'joined') return time(b.createdAt) - time(a.createdAt)
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || time(b.createdAt) - time(a.createdAt)
      })
  }, [users, tab, search, sort])

  return (
    <section className="admin-page">
      <div className="admin-stats">
        <StatCard label="Total users" value={counts.all} tone="neutral" />
        <StatCard label="Waiting approval" value={counts.pending} tone="amber" onClick={() => setTab('pending')} />
        <StatCard label="Active" value={counts.active} tone="green" onClick={() => setTab('active')} />
        <StatCard label="Admins" value={counts.admins} tone="purple" onClick={() => setTab('admins')} />
        <StatCard label="Active today" value={counts.today} tone="blue" onClick={() => { setTab('all'); setSort('recent') }} />
      </div>

      <div className="glass-card admin-panel">
        <div className="admin-toolbar">
          <div className="segmented" role="tablist">
            {TABS.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? 'active' : ''}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {counts[t.key] > 0 && <span className="seg-count">{counts[t.key]}</span>}
              </button>
            ))}
          </div>
          <div className="admin-toolbar-right">
            <label className="sort-field">
              <span>Sort</span>
              <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
                <option value="status">Status</option>
                <option value="recent">Last active</option>
                <option value="joined">Newest</option>
              </select>
            </label>
            <label className="search-field">
              <SearchIcon size={14} />
              <input
                type="search"
                placeholder="Search email"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
            <button className="icon-btn" onClick={load} disabled={loading} title="Reload users" aria-label="Reload users">
              <RefreshIcon className={loading ? 'spin' : undefined} />
            </button>
          </div>
        </div>

        {error && <div className="admin-error" role="alert">{error}</div>}

        <div className="user-list">
          <div className="user-row user-head" aria-hidden="true">
            <span>User</span>
            <span>Status</span>
            <span>Access until</span>
            <span>Role</span>
            <span />
          </div>

          {loading && users.length === 0 && <p className="user-empty">Loading users…</p>}
          {!loading && visible.length === 0 && (
            <p className="user-empty">{search ? 'No users match that search.' : 'Nobody here yet.'}</p>
          )}

          {visible.map(u => {
            const isMe = u.email === me
            const isBusy = busy === u.email
            return (
              <div key={u.email} className={`user-row${isBusy ? ' is-busy' : ''}`}>
                <div className="user-id">
                  <span className={`avatar avatar-${u.status}`}>{initials(u.email)}</span>
                  <div className="user-id-text">
                    <span className="user-email" title={u.email}>
                      {u.email}
                      {isMe && <span className="you-tag">You</span>}
                    </span>
                    <span className="user-meta">
                      {u.lastSeenAt
                        ? <span className={isToday(u.lastSeenAt) ? 'seen-today' : undefined} title={`Last active ${formatDateTime(u.lastSeenAt)}${u.loginCount ? ` · ${u.loginCount} sign-ins` : ''}`}>
                            Active {timeAgo(u.lastSeenAt)}
                          </span>
                        : <span>Never signed in</span>}
                      {' · '}Joined {fmtDate(u.createdAt)}
                      {u.plan && <> · {u.plan}</>}
                    </span>
                  </div>
                </div>

                <div className="user-cell" data-label="Status">
                  <span className={`status-pill status-${u.status}`}>
                    <span className="status-dot" />
                    {STATUS_LABEL[u.status]}
                  </span>
                </div>

                <div className="user-cell" data-label="Access until">
                  <div className="expiry-field">
                    <DatePicker
                      value={toInputDate(u.expiresAt)}
                      placeholder="No limit"
                      disabled={isBusy}
                      ariaLabel={`Access expiry for ${u.email}`}
                      presets={expiryPresets()}
                      onChange={v => apply(u.email, { expiresAt: new Date(`${v}T23:59:59`) })}
                      onClear={u.expiresAt ? () => apply(u.email, { expiresAt: null }) : undefined}
                      clearLabel="Remove limit"
                    />
                  </div>
                </div>

                <div className="user-cell" data-label="Role">
                  <button
                    className={`role-pill${u.role === 'admin' ? ' is-admin' : ''}`}
                    onClick={() => toggleRole(u)}
                    disabled={isBusy || isMe}
                    title={isMe ? "You can't remove your own admin role" : u.role === 'admin' ? 'Remove admin role' : 'Make admin'}
                  >
                    <ShieldIcon size={12} />
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </button>
                </div>

                <div className="user-actions">
                  {u.active ? (
                    <button
                      className="pill-btn pill-danger"
                      disabled={isBusy || isMe}
                      onClick={() => apply(u.email, { active: false })}
                      title={isMe ? "You can't revoke your own access" : 'Revoke access'}
                    >
                      Revoke
                    </button>
                  ) : (
                    <button className="pill-btn pill-primary" disabled={isBusy} onClick={() => apply(u.email, { active: true })}>
                      Approve
                    </button>
                  )}
                  <button
                    className="icon-btn icon-btn-sm"
                    onClick={() => showHistory(u.email)}
                    title="Sign-in history"
                    aria-label={`Sign-in history for ${u.email}`}
                  >
                    <ClockIcon size={14} />
                  </button>
                  <button
                    className="icon-btn icon-btn-sm"
                    disabled={isBusy || isMe}
                    onClick={() => remove(u.email)}
                    title={isMe ? "You can't remove yourself" : 'Remove user'}
                    aria-label={`Remove ${u.email}`}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <LoginHistory
        filterEmail={historyEmail}
        onClearFilter={() => setHistoryEmail(null)}
        onPickEmail={email => showHistory(email)}
      />
    </section>
  )
}

function StatCard({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`glass-card admin-stat tone-${tone}`} onClick={onClick}>
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value">{value}</span>
    </Tag>
  )
}
