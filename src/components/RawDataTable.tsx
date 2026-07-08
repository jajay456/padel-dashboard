import { useState } from 'react'
import type { RawRow } from '../types'

interface Props {
  rows: RawRow[]
}

const PAGE_SIZE = 15

export default function RawDataTable({ rows }: Props) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const filtered = search
    ? rows.filter(r =>
        r.club.toLowerCase().includes(search.toLowerCase()) ||
        r.zone.toLowerCase().includes(search.toLowerCase()) ||
        r.date.includes(search)
      )
    : rows

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="table-card">
      <div className="chart-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h3>Raw Data</h3>
          <span className="chart-sub">{filtered.length} rows</span>
        </div>
        <input
          type="text"
          placeholder="Search club, zone, date..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="search-input"
        />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Zone</th>
              <th>Club</th>
              <th>Court ID</th>
              <th>Booked Peak h</th>
              <th>Booked Off-peak h</th>
              <th>Total Peak h</th>
              <th>Total Off-peak h</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r._rowIndex}>
                <td className="td-num">{r.date}</td>
                <td><span className="zone-tag">{r.zone}</span></td>
                <td className="td-name">{r.club}</td>
                <td className="td-num" style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.court_id.slice(0, 8)}</td>
                <td className="td-num">{r.booked_peak_h}</td>
                <td className="td-num">{r.booked_offpeak_h}</td>
                <td className="td-num">{r.total_peak_h}</td>
                <td className="td-num">{r.total_offpeak_h}</td>
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
