import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'
import type { DayOfWeekAggregate } from '../types'

const labelStyle = { fill: 'var(--chart-text)', fontSize: 10, fontWeight: 600 } as const
const pctLabel = (v: unknown) => `${v}%`

const DOW_COLORS: Record<string, string> = {
  Monday: '#60a5fa',
  Tuesday: '#60a5fa',
  Wednesday: '#60a5fa',
  Thursday: '#60a5fa',
  Friday: '#f59e0b',
  Saturday: '#22c55e',
  Sunday: '#22c55e',
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

export default function DayOfWeekChart({ data }: { data: DayOfWeekAggregate[] }) {
  const chartData = data.map(d => ({
    day: d.day_of_week.slice(0, 3),
    fullDay: d.day_of_week,
    Overall: d.occupancy_pct,
    Peak: d.peak_pct,
    'Off-peak': d.offpeak_pct,
    count: d.day_count,
  }))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Occupancy by Day of Week</h3>
        <span className="chart-sub">average % per day</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: 'var(--chart-text)', fontSize: 13 }} />
          <Bar dataKey="Overall" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="Overall" position="top" formatter={pctLabel} style={labelStyle} />
            {chartData.map((entry, i) => (
              <Cell key={i} fill={DOW_COLORS[entry.fullDay] ?? '#94a3b8'} />
            ))}
          </Bar>
          <Bar dataKey="Peak" fill="#f59e0b88" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="Peak" position="top" formatter={pctLabel} style={labelStyle} />
          </Bar>
          <Bar dataKey="Off-peak" fill="#60a5fa88" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="Off-peak" position="top" formatter={pctLabel} style={labelStyle} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="dow-legend">
        <span className="dow-chip weekend">Sat/Sun</span>
        <span className="dow-chip friday">Friday</span>
        <span className="dow-chip weekday">Mon–Thu</span>
      </div>
    </div>
  )
}
