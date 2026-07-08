import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'
import type { DayAggregate } from '../types'

const labelStyle = { fill: 'var(--chart-text)', fontSize: 9, fontWeight: 600 } as const
const pctLabel = (v: unknown) => `${v}%`

interface Props {
  data: DayAggregate[]
  compareData?: { date: string; [k: string]: number | string }[]
  compareKeys?: string[]
}

type Granularity = 'day' | 'week' | 'month'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const DEFAULT_SERIES = [
  { key: 'Overall',  color: '#22c55e' },
  { key: 'Peak',     color: '#f59e0b' },
  { key: 'Off-peak', color: '#60a5fa' },
] as const
type DefaultKey = typeof DEFAULT_SERIES[number]['key']

const COMPARE_COLORS = ['#22c55e','#f59e0b','#60a5fa','#a78bfa','#f472b6','#34d399','#fb923c','#38bdf8']

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

function getMonthKey(dateStr: string): string {
  const [, m] = dateStr.split('-')
  return MONTHS[parseInt(m) - 1]
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function groupDefault(data: DayAggregate[], g: Granularity) {
  if (g === 'day') {
    return data.map(d => ({
      date: formatDate(d.date),
      Overall: d.occupancy_pct,
      Peak: d.peak_pct,
      'Off-peak': d.offpeak_pct,
    }))
  }
  const getKey = g === 'week' ? getWeekKey : getMonthKey
  const map = new Map<string, { o: number; p: number; op: number; n: number }>()
  for (const d of data) {
    const k = getKey(d.date)
    const e = map.get(k) ?? { o: 0, p: 0, op: 0, n: 0 }
    map.set(k, { o: e.o + d.occupancy_pct, p: e.p + d.peak_pct, op: e.op + d.offpeak_pct, n: e.n + 1 })
  }
  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    Overall:    Math.round(v.o  / v.n),
    Peak:       Math.round(v.p  / v.n),
    'Off-peak': Math.round(v.op / v.n),
  }))
}

function groupCompare(
  data: { date: string; [k: string]: number | string }[],
  keys: string[],
  g: Granularity
) {
  if (g === 'day') return data.map(d => ({ ...d, date: d.date.slice(5).replace('-', '/') }))
  const getKey = g === 'week' ? getWeekKey : getMonthKey
  const map = new Map<string, { sums: Record<string, number>; n: number }>()
  for (const d of data) {
    const k = getKey(String(d.date))
    const e = map.get(k) ?? { sums: Object.fromEntries(keys.map(key => [key, 0])), n: 0 }
    for (const key of keys) e.sums[key] = (e.sums[key] ?? 0) + (Number(d[key]) || 0)
    e.n++
    map.set(k, e)
  }
  return Array.from(map.entries()).map(([date, { sums, n }]) => ({
    date,
    ...Object.fromEntries(keys.map(k => [k, Math.round(sums[k] / n)])),
  }))
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, marginTop: 4 }}>
          {p.name}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  )
}

const TABS: { key: Granularity; label: string }[] = [
  { key: 'day',   label: 'Day'   },
  { key: 'week',  label: 'Week'  },
  { key: 'month', label: 'Month' },
]

export default function TrendChart({ data, compareData = [], compareKeys = [] }: Props) {
  const [gran, setGran] = useState<Granularity>('day')
  const [hiddenDefault, setHiddenDefault] = useState<Set<DefaultKey>>(new Set())

  const isCompareMode = compareKeys.length > 0

  const chartData = isCompareMode
    ? groupCompare(compareData, compareKeys, gran)
    : groupDefault(data, gran)

  function toggleDefault(key: DefaultKey) {
    setHiddenDefault(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        if (next.size >= DEFAULT_SERIES.length - 1) return prev
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="chart-card">
      <div className="chart-header" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h3>Occupancy Trend</h3>
          <span className="chart-sub">
            {isCompareMode ? `comparing ${compareKeys.length} items` : `% per ${gran}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!isCompareMode && (
            <div className="series-toggles">
              {DEFAULT_SERIES.map(s => (
                <button
                  key={s.key}
                  className={`series-chip${!hiddenDefault.has(s.key) ? ' active' : ''}`}
                  style={{ '--chip-color': s.color } as React.CSSProperties}
                  onClick={() => toggleDefault(s.key)}
                >
                  <span className="chip-dot" />
                  {s.key}
                </button>
              ))}
            </div>
          )}
          <div className="tab-group">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`tab-btn${gran === t.key ? ' active' : ''}`}
                onClick={() => setGran(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={3} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'var(--chart-text)', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--chart-text)' }} />
          {isCompareMode
            ? compareKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COMPARE_COLORS[i % COMPARE_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={32} fillOpacity={0.85}>
                  <LabelList dataKey={k} position="top" formatter={pctLabel} style={labelStyle} />
                </Bar>
              ))
            : DEFAULT_SERIES.filter(s => !hiddenDefault.has(s.key)).map(s => (
                <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={32} fillOpacity={0.85}>
                  <LabelList dataKey={s.key} position="top" formatter={pctLabel} style={labelStyle} />
                </Bar>
              ))
          }
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
