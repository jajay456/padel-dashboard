import { useCallback, useEffect, useState } from 'react'
import { listRecentLogins, listUserLogins, describeDevice, type LoginEvent, type LoginResult } from '../utils/loginActivity'
import { adminErrorMessage } from '../utils/customers'
import { timeAgo, formatDateTime } from '../utils/dates'
import { RefreshIcon, ClockIcon } from './Icons'

const RESULT_LABEL: Record<LoginResult, string> = {
  ok: 'Signed in',
  pending: 'Waiting approval',
  inactive: 'Blocked · inactive',
  expired: 'Blocked · expired',
}

function initials(email: string) {
  const parts = email.split('@')[0].split(/[._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase()
}

/** Groups events under "Today", "Yesterday", or a date heading. */
function dayHeading(d: Date | null): string {
  if (!d) return 'Unknown date'
  const ago = timeAgo(d)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return days < 7 ? d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) : ago
}

export default function LoginHistory({ filterEmail, onClearFilter, onPickEmail }: {
  filterEmail: string | null
  onClearFilter: () => void
  onPickEmail: (email: string) => void
}) {
  const [events, setEvents] = useState<LoginEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const req = filterEmail ? listUserLogins(filterEmail) : listRecentLogins()
    req
      .then(list => { if (!cancelled) { setEvents(list); setError('') } })
      .catch(e => { if (!cancelled) setError(adminErrorMessage(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filterEmail, reloadKey])

  const reload = useCallback(() => { setLoading(true); setReloadKey(k => k + 1) }, [])

  // Build day groups in order.
  const groups: { heading: string; items: LoginEvent[] }[] = []
  for (const ev of events) {
    const h = dayHeading(ev.at)
    const last = groups[groups.length - 1]
    if (last && last.heading === h) last.items.push(ev)
    else groups.push({ heading: h, items: [ev] })
  }

  return (
    <div className="glass-card history-panel" id="login-history">
      <div className="admin-toolbar">
        <div className="history-title">
          <ClockIcon size={16} />
          <h3>Recent sign-ins</h3>
          {filterEmail && (
            <button className="filter-chip" onClick={onClearFilter} title="Show everyone">
              {filterEmail}
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
        <button className="icon-btn" onClick={reload} disabled={loading} title="Reload history" aria-label="Reload history">
          <RefreshIcon className={loading ? 'spin' : undefined} />
        </button>
      </div>

      {error && <div className="admin-error" role="alert">{error}</div>}
      {loading && events.length === 0 && <p className="user-empty">Loading sign-ins…</p>}
      {!loading && !error && events.length === 0 && (
        <p className="user-empty">
          {filterEmail ? 'No sign-ins recorded for this user yet.' : 'No sign-ins recorded yet.'}
        </p>
      )}

      {groups.map(g => (
        <div key={g.heading} className="history-group">
          <div className="history-day">{g.heading}</div>
          {g.items.map(ev => (
            <div key={ev.id} className="history-row">
              <span className={`avatar avatar-sm${ev.result === 'ok' ? ' avatar-active' : ev.result === 'pending' ? ' avatar-pending' : ' avatar-expired'}`}>
                {initials(ev.email)}
              </span>
              <div className="history-main">
                {filterEmail
                  ? <span className="history-email">{describeDevice(ev.userAgent)}</span>
                  : (
                    <button className="history-email link-plain" onClick={() => onPickEmail(ev.email)} title="Show only this user">
                      {ev.email}
                    </button>
                  )}
                <span className="history-meta">
                  {!filterEmail && <>{describeDevice(ev.userAgent)} · </>}
                  <span className={`history-result result-${ev.result}`}>{RESULT_LABEL[ev.result]}</span>
                </span>
              </div>
              <time className="history-time" dateTime={ev.at?.toISOString()} title={formatDateTime(ev.at)}>
                {ev.at ? ev.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </time>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
