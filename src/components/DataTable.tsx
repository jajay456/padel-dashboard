import { useState } from 'react'
import type { ClubAggregate } from '../types'

type SortKey = keyof Pick<ClubAggregate, 'club' | 'zone' | 'occupancy_pct' | 'peak_pct' | 'offpeak_pct' | 'booked_total_h' | 'total_h' | 'court_count'>

function OccBadge({ pct }: { pct: number }) {
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f472b6'
  return (
    <span className="occ-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {pct}%
    </span>
  )
}

export default function DataTable({ data }: { data: ClubAggregate[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('occupancy_pct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(0)
  }

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    const cmp = typeof va === 'string'
      ? (va as string).localeCompare(vb as string)
      : (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const rows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function SortIcon({ k }: { k: SortKey }) {
    if (k !== sortKey) return <span className="sort-icon neutral">↕</span>
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function Th({ label, k }: { label: string; k: SortKey }) {
    return (
      <th onClick={() => handleSort(k)} className={`th-sortable ${k === sortKey ? 'th-active' : ''}`}>
        {label} <SortIcon k={k} />
      </th>
    )
  }

  return (
    <div className="table-card">
      <div className="chart-header">
        <h3>Club Detail Table</h3>
        <span className="chart-sub">{data.length} clubs</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <Th label="Club" k="club" />
              <Th label="Zone" k="zone" />
              <Th label="Courts" k="court_count" />
              <Th label="Overall %" k="occupancy_pct" />
              <Th label="Peak %" k="peak_pct" />
              <Th label="Off-peak %" k="offpeak_pct" />
              <Th label="Booked h" k="booked_total_h" />
              <Th label="Total h" k="total_h" />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.club}>
                <td className="td-name">{r.club}</td>
                <td><span className="zone-tag">{r.zone}</span></td>
                <td className="td-num">{r.court_count}</td>
                <td><OccBadge pct={r.occupancy_pct} /></td>
                <td><OccBadge pct={r.peak_pct} /></td>
                <td><OccBadge pct={r.offpeak_pct} /></td>
                <td className="td-num">{Math.round(r.booked_total_h * 10) / 10}h</td>
                <td className="td-num">{Math.round(r.total_h * 10) / 10}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>{page + 1} / {totalPages}</span>
          <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
