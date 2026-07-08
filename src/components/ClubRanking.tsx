import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import type { ClubAggregate } from '../types'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      <p style={{ color: '#22c55e' }}>Occupancy: <strong>{payload[0].value}%</strong></p>
    </div>
  )
}

function getBarColor(pct: number) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 50) return '#f59e0b'
  return '#f472b6'
}

export default function ClubRanking({ data }: { data: ClubAggregate[] }) {
  const top = data.slice(0, 12)
  const chartData = top.map(d => ({
    club: d.club.length > 18 ? d.club.slice(0, 16) + '…' : d.club,
    fullClub: d.club,
    zone: d.zone,
    occ: d.occupancy_pct,
    courts: d.court_count,
  }))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Club Ranking</h3>
        <span className="chart-sub">by occupancy % (top {top.length})</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(280, top.length * 34)}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 60, left: 4, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="club" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} width={130} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="occ" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="occ" position="right" formatter={(v: unknown) => `${v}%`} style={{ fill: 'var(--chart-text)', fontSize: 12, fontWeight: 600 }} />
            {chartData.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.occ)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
