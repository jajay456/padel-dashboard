import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'
import type { ZoneAggregate } from '../types'

const labelStyle = { fill: 'var(--chart-text)', fontSize: 10, fontWeight: 600 } as const
const pctLabel = (v: unknown) => `${v}%`

const ZONE_COLORS: Record<string, string> = {
  Bangkok: '#22c55e',
  Phuket: '#f59e0b',
  Samui: '#60a5fa',
  Phangan: '#a78bfa',
  Pattaya: '#f472b6',
  'Chiang Mai': '#34d399',
}

function getColor(zone: string) {
  return ZONE_COLORS[zone] ?? '#94a3b8'
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  )
}

export default function ZoneChart({ data }: { data: ZoneAggregate[] }) {
  const chartData = data.map(d => ({
    zone: d.zone,
    Overall: d.occupancy_pct,
    Peak: d.peak_pct,
    'Off-peak': d.offpeak_pct,
  }))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Occupancy by Zone</h3>
        <span className="chart-sub">% occupancy per zone</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="zone" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: 'var(--chart-text)', fontSize: 13 }} />
          <Bar dataKey="Overall" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="Overall" position="top" formatter={pctLabel} style={labelStyle} />
            {chartData.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.zone)} />
            ))}
          </Bar>
          <Bar dataKey="Peak" fill="#f59e0b66" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="Peak" position="top" formatter={pctLabel} style={labelStyle} />
          </Bar>
          <Bar dataKey="Off-peak" fill="#60a5fa66" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="Off-peak" position="top" formatter={pctLabel} style={labelStyle} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
