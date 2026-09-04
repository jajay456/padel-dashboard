// Remembers the last Google Sheet (id + tab) the user loaded, so reopening
// the app goes straight back to it and re-pulls fresh data instead of making
// them pick from the Drive browser every session.

const KEY = 'klab.lastSheet'

export interface LastSheet {
  sheetId: string
  sheetName: string
  tab: string
}

export function saveLastSheet(s: LastSheet): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable — just won't be remembered */
  }
}

export function loadLastSheet(): LastSheet | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<LastSheet>
    if (typeof p.sheetId === 'string' && typeof p.sheetName === 'string' && typeof p.tab === 'string') {
      return { sheetId: p.sheetId, sheetName: p.sheetName, tab: p.tab }
    }
    return null
  } catch {
    return null
  }
}

export function clearLastSheet(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
