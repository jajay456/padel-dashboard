import type { RawRow, DayAggregate, ZoneAggregate, ClubAggregate, DayOfWeekAggregate, Filters } from '../types'

const DOW_ORDER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
  Friday: 5, Saturday: 6, Sunday: 7,
}

export function parseSheetRows(values: string[][]): RawRow[] {
  const [header, ...rows] = values
  const col = {
    date: header.indexOf('date'),
    zone: header.indexOf('zone'),
    club: header.indexOf('club'),
    court_id: header.indexOf('court_id'),
    booked_peak_h: header.indexOf('booked_peak_h'),
    booked_offpeak_h: header.indexOf('booked_offpeak_h'),
    booked_total_h: header.indexOf('booked_total_h'),
    total_peak_h: header.indexOf('total_peak_h'),
    total_offpeak_h: header.indexOf('total_offpeak_h'),
    total_h: header.indexOf('total_h'),
    day_of_week: header.indexOf('day_of_week'),
  }
  const cell = (r: string[], i: number) => (i >= 0 && i < r.length ? r[i] ?? '' : '')

  const parsed = rows
    // The Sheets API drops trailing empty cells, so a valid row whose last
    // column (e.g. day_of_week) is blank comes back short. Don't discard those
    // — only skip rows that are completely empty.
    .filter(r => r.some(c => (c ?? '').toString().trim() !== ''))
    .map((r, i) => ({
      _rowIndex: i + 2, // row 1 = header, data starts at row 2
      date: cell(r, col.date),
      zone: cell(r, col.zone),
      club: cell(r, col.club),
      court_id: cell(r, col.court_id),
      booked_peak_h: parseFloat(cell(r, col.booked_peak_h)) || 0,
      booked_offpeak_h: parseFloat(cell(r, col.booked_offpeak_h)) || 0,
      booked_total_h: parseFloat(cell(r, col.booked_total_h)) || 0,
      total_peak_h: parseFloat(cell(r, col.total_peak_h)) || 0,
      total_offpeak_h: parseFloat(cell(r, col.total_offpeak_h)) || 0,
      total_h: parseFloat(cell(r, col.total_h)) || 0,
      day_of_week: cell(r, col.day_of_week),
    }))
  return dedupeRows(parsed)
}

// Drops exact duplicate rows (same date + court + values), keeping the first
// occurrence, so a repeated line in the Sheet doesn't double-count in aggregates.
export function dedupeRows(rows: RawRow[]): RawRow[] {
  const seen = new Set<string>()
  const result: RawRow[] = []
  for (const r of rows) {
    const key = [
      r.date, r.zone, r.club, r.court_id,
      r.booked_peak_h, r.booked_offpeak_h, r.booked_total_h,
      r.total_peak_h, r.total_offpeak_h, r.total_h, r.day_of_week,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(r)
  }
  return result
}

function pct(booked: number, total: number) {
  return total > 0 ? Math.round((booked / total) * 1000) / 10 : 0
}

export function applyFilters(rows: RawRow[], filters: Filters): RawRow[] {
  return rows.filter(r => {
    if (r.date < filters.dateStart || r.date > filters.dateEnd) return false
    if (filters.zones.length > 0 && !filters.zones.includes(r.zone)) return false
    if (filters.clubs.length > 0 && !filters.clubs.includes(r.club)) return false
    return true
  })
}

export function aggregateByDay(rows: RawRow[]): DayAggregate[] {
  const map = new Map<string, DayAggregate>()
  for (const r of rows) {
    const existing = map.get(r.date)
    if (!existing) {
      map.set(r.date, {
        date: r.date,
        day_of_week: r.day_of_week,
        booked_total_h: r.booked_total_h,
        total_h: r.total_h,
        booked_peak_h: r.booked_peak_h,
        total_peak_h: r.total_peak_h,
        booked_offpeak_h: r.booked_offpeak_h,
        total_offpeak_h: r.total_offpeak_h,
        occupancy_pct: 0,
        peak_pct: 0,
        offpeak_pct: 0,
      })
    } else {
      existing.booked_total_h += r.booked_total_h
      existing.total_h += r.total_h
      existing.booked_peak_h += r.booked_peak_h
      existing.total_peak_h += r.total_peak_h
      existing.booked_offpeak_h += r.booked_offpeak_h
      existing.total_offpeak_h += r.total_offpeak_h
    }
  }
  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      occupancy_pct: pct(d.booked_total_h, d.total_h),
      peak_pct: pct(d.booked_peak_h, d.total_peak_h),
      offpeak_pct: pct(d.booked_offpeak_h, d.total_offpeak_h),
    }))
}

export function aggregateByZone(rows: RawRow[]): ZoneAggregate[] {
  const map = new Map<string, ZoneAggregate>()
  for (const r of rows) {
    const existing = map.get(r.zone)
    if (!existing) {
      map.set(r.zone, {
        zone: r.zone,
        booked_total_h: r.booked_total_h,
        total_h: r.total_h,
        booked_peak_h: r.booked_peak_h,
        total_peak_h: r.total_peak_h,
        booked_offpeak_h: r.booked_offpeak_h,
        total_offpeak_h: r.total_offpeak_h,
        occupancy_pct: 0,
        peak_pct: 0,
        offpeak_pct: 0,
      })
    } else {
      existing.booked_total_h += r.booked_total_h
      existing.total_h += r.total_h
      existing.booked_peak_h += r.booked_peak_h
      existing.total_peak_h += r.total_peak_h
      existing.booked_offpeak_h += r.booked_offpeak_h
      existing.total_offpeak_h += r.total_offpeak_h
    }
  }
  return Array.from(map.values())
    .map(d => ({
      ...d,
      occupancy_pct: pct(d.booked_total_h, d.total_h),
      peak_pct: pct(d.booked_peak_h, d.total_peak_h),
      offpeak_pct: pct(d.booked_offpeak_h, d.total_offpeak_h),
    }))
    .sort((a, b) => b.occupancy_pct - a.occupancy_pct)
}

export function aggregateByClub(rows: RawRow[]): ClubAggregate[] {
  const map = new Map<string, ClubAggregate>()
  const courtSets = new Map<string, Set<string>>()
  for (const r of rows) {
    const existing = map.get(r.club)
    if (!existing) {
      map.set(r.club, {
        club: r.club,
        zone: r.zone,
        booked_total_h: r.booked_total_h,
        total_h: r.total_h,
        booked_peak_h: r.booked_peak_h,
        total_peak_h: r.total_peak_h,
        booked_offpeak_h: r.booked_offpeak_h,
        total_offpeak_h: r.total_offpeak_h,
        occupancy_pct: 0,
        peak_pct: 0,
        offpeak_pct: 0,
        court_count: 0,
      })
      courtSets.set(r.club, new Set([r.court_id]))
    } else {
      existing.booked_total_h += r.booked_total_h
      existing.total_h += r.total_h
      existing.booked_peak_h += r.booked_peak_h
      existing.total_peak_h += r.total_peak_h
      existing.booked_offpeak_h += r.booked_offpeak_h
      existing.total_offpeak_h += r.total_offpeak_h
      courtSets.get(r.club)!.add(r.court_id)
    }
  }
  return Array.from(map.values())
    .map(d => ({
      ...d,
      court_count: courtSets.get(d.club)?.size ?? 0,
      occupancy_pct: pct(d.booked_total_h, d.total_h),
      peak_pct: pct(d.booked_peak_h, d.total_peak_h),
      offpeak_pct: pct(d.booked_offpeak_h, d.total_offpeak_h),
    }))
    .sort((a, b) => b.occupancy_pct - a.occupancy_pct)
}

export function aggregateByDayOfWeek(rows: RawRow[]): DayOfWeekAggregate[] {
  const map = new Map<string, { booked: number; total: number; bpeak: number; tpeak: number; boff: number; toff: number; dates: Set<string> }>()
  for (const r of rows) {
    const existing = map.get(r.day_of_week)
    if (!existing) {
      map.set(r.day_of_week, { booked: r.booked_total_h, total: r.total_h, bpeak: r.booked_peak_h, tpeak: r.total_peak_h, boff: r.booked_offpeak_h, toff: r.total_offpeak_h, dates: new Set([r.date]) })
    } else {
      existing.booked += r.booked_total_h
      existing.total += r.total_h
      existing.bpeak += r.booked_peak_h
      existing.tpeak += r.total_peak_h
      existing.boff += r.booked_offpeak_h
      existing.toff += r.total_offpeak_h
      existing.dates.add(r.date)
    }
  }
  return Array.from(map.entries())
    .map(([dow, v]) => ({
      day_of_week: dow,
      order: DOW_ORDER[dow] ?? 8,
      booked_total_h: v.booked,
      total_h: v.total,
      occupancy_pct: pct(v.booked, v.total),
      peak_pct: pct(v.bpeak, v.tpeak),
      offpeak_pct: pct(v.boff, v.toff),
      day_count: v.dates.size,
    }))
    .sort((a, b) => a.order - b.order)
}

export function getKPIs(rows: RawRow[]) {
  const booked = rows.reduce((s, r) => s + r.booked_total_h, 0)
  const total = rows.reduce((s, r) => s + r.total_h, 0)
  const bpeak = rows.reduce((s, r) => s + r.booked_peak_h, 0)
  const tpeak = rows.reduce((s, r) => s + r.total_peak_h, 0)
  const boff = rows.reduce((s, r) => s + r.booked_offpeak_h, 0)
  const toff = rows.reduce((s, r) => s + r.total_offpeak_h, 0)
  return {
    occupancy_pct: pct(booked, total),
    peak_pct: pct(bpeak, tpeak),
    offpeak_pct: pct(boff, toff),
    booked_total_h: Math.round(booked * 10) / 10,
    booked_peak_h: Math.round(bpeak * 10) / 10,
    booked_offpeak_h: Math.round(boff * 10) / 10,
    total_h: Math.round(total * 10) / 10,
  }
}

export function aggregateByDayPerKey(
  rows: RawRow[],
  keys: string[],
  getKey: (r: RawRow) => string
): { date: string; [k: string]: number | string }[] {
  const map = new Map<string, Map<string, { booked: number; total: number }>>()
  for (const r of rows) {
    const k = getKey(r)
    if (!keys.includes(k)) continue
    const dateMap = map.get(r.date) ?? new Map<string, { booked: number; total: number }>()
    const e = dateMap.get(k) ?? { booked: 0, total: 0 }
    dateMap.set(k, { booked: e.booked + r.booked_total_h, total: e.total + r.total_h })
    map.set(r.date, dateMap)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, keyMap]) => {
      const point: { date: string; [k: string]: number | string } = { date }
      for (const k of keys) {
        const e = keyMap.get(k)
        point[k] = e && e.total > 0 ? Math.round(e.booked / e.total * 100) : 0
      }
      return point
    })
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function getUniqueValues(rows: RawRow[]) {
  return {
    zones: [...new Set(rows.map(r => r.zone))].filter(Boolean).sort(),
    clubs: [...new Set(rows.map(r => r.club))].filter(Boolean).sort(),
    // Only keep well-formed YYYY-MM-DD values so the first/last entry are a
    // reliable earliest/latest day for the default date range.
    dates: [...new Set(rows.map(r => r.date))].filter(d => ISO_DATE.test(d)).sort(),
  }
}
