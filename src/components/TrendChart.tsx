import { useId, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DayAggregate } from '../types'
import { useIsMobile } from '../utils/useMediaQuery'
import { pctAxis } from '../utils/chartScale'


interface Props {
  data: DayAggregate[]
  compareData?: { date: string; [k: string]: number | string }[]
  compareKeys?: string[]
}

type Granularity = 'day' | 'week' | 'month'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const DEFAULT_SERIES = [
  { key: 'Overall',  color: '#34d27b' },
  { key: 'Peak',     color: '#f5a524' },
  { key: 'Off-peak', color: '#6ea8ff' },
] as const
type DefaultKey = typeof DEFAULT_SERIES[number]['key']

const COMPARE_COLORS = ['#34d27b','#f5a524','#6ea8ff','#a78bfa','#f472b6','#34d399','#fb923c','#38bdf8']

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

// Long daily ranges are too jagged to read as lines, so they're drawn as a
// centred 7-day moving average; each day's actual value is kept under
// `raw:<key>` for the tooltip.
const SMOOTH_FROM_POINTS = 45
const SMOOTH_WINDOW = 7

type Row = Record<string, string | number>

function smooth(rows: Row[], keys: string[]): Row[] {
  const half = Math.floor(SMOOTH_WINDOW / 2)
  return rows.map((r, i) => {
    const out: Row = { ...r }
    for (const k of keys) {
      let sum = 0
      let n = 0
      for (let j = Math.max(0, i - half); j <= Math.min(rows.length - 1, i + half); j++) {
        const v = Number(rows[j][k])
        if (Number.isFinite(v)) { sum += v; n++ }
      }
      out[`raw:${k}`] = r[k]
      out[k] = n ? Math.round((sum / n) * 10) / 10 : r[k]
    }
    return out
  })
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string | number; payload?: Row }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => {
        const raw = p.payload?.[`raw:${p.dataKey}`]
        return (
          <p key={p.name} className="tt-row">
            <span className="tt-dot" style={{ background: p.color }} />
            {p.name} <strong>{p.value}%</strong>
            {raw !== undefined && <span className="tt-raw">day {raw}%</span>}
          </p>
        )
      })}
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
  const isMobile = useIsMobile()

  const isCompareMode = compareKeys.length > 0

  const chartData = isCompareMode
    ? groupCompare(compareData, compareKeys, gran)
    : groupDefault(data, gran)

  // Point markers only while they're far enough apart to read as points.
  const showDots = chartData.length <= (isMobile ? 12 : 24)

  const series = isCompareMode
    ? compareKeys.map((k, i) => ({ key: k, color: COMPARE_COLORS[i % COMPARE_COLORS.length] }))
    : DEFAULT_SERIES.filter(s => !hiddenDefault.has(s.key))

  const smoothed = gran === 'day' && chartData.length > SMOOTH_FROM_POINTS
  const plotData: Row[] = smoothed ? smooth(chartData as Row[], series.map(s => s.key)) : (chartData as Row[])

  // Fit the y-axis to the data so the lines use the chart's height.
  const { max: yMax, ticks: yTicks } = pctAxis(
    Math.max(0, ...plotData.flatMap(d => series.map(s => Number(d[s.key]) || 0))),
  )

  // Latest value is called out at the end of each line. When several lines
  // end close together, nudge their labels apart (in px) so they don't overlap.
  const height = isMobile ? 240 : 300
  const plotH = height - 22 - 30 // top margin + x-axis band
  const lastRow = plotData[plotData.length - 1]
  const endLabelDy: Record<string, number> = {}
  {
    const MIN_GAP = 15
    const ends = series
      .map(s => ({ key: s.key, y: (1 - (Number(lastRow?.[s.key]) || 0) / yMax) * plotH }))
      .sort((a, b) => a.y - b.y)
    let prev = -Infinity
    for (const e of ends) {
      const placed = Math.max(e.y, prev + MIN_GAP)
      endLabelDy[e.key] = placed - e.y
      prev = placed
    }
  }
  const lastIndex = plotData.length - 1
  const multi = series.length > 1

  const gradId = useId().replace(/:/g, '')

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
      <div className="chart-header chart-header-split">
        <div className="chart-title">
          <h3>Occupancy Trend</h3>
          <span className="chart-sub">
            {isCompareMode ? `comparing ${compareKeys.length} items` : `% per ${gran}`}{smoothed ? ' · 7-day average' : ''}
          </span>
        </div>

        <div className="chart-controls">
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

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={plotData} margin={{ top: 22, right: multi ? (isMobile ? 50 : 62) : (isMobile ? 16 : 24), left: isMobile ? -18 : 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${gradId}-f${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'var(--chart-text)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={isMobile ? 16 : 28} />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 11 }} domain={[0, yMax]} ticks={yTicks} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text-3)', strokeWidth: 1 }} />
          {isCompareMode && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--chart-text)' }} iconType="circle" iconSize={8} />}
          {series.map((s, i) => {
            const lead = i === 0
            return (
              <Area
                key={s.key}
                type="linear"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={lead ? 2.75 : 2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                // One flat, low fill under the lead line; stacked fills turn muddy.
                fill={lead ? `url(#${gradId}-f${i})` : 'transparent'}
                dot={(p: { cx?: number; cy?: number; index?: number; value?: unknown }) => {
                  const isLast = p.index === lastIndex
                  if (p.cx == null || p.cy == null || (!isLast && !showDots)) return <g key={`${s.key}-${p.index}`} />
                  if (!isLast) return <circle key={`${s.key}-${p.index}`} cx={p.cx} cy={p.cy} r={3} fill={s.color} />
                  const v = Number(Array.isArray(p.value) ? p.value[1] : p.value)
                  return (
                    <g key={`${s.key}-end`}>
                      <circle cx={p.cx} cy={p.cy} r={6} fill={s.color} />
                      <text
                        className={multi ? 'line-end-label is-compact' : 'line-end-label'}
                        {...(multi
                          ? { x: p.cx + 12, y: p.cy + (endLabelDy[s.key] ?? 0), dominantBaseline: 'central' as const, textAnchor: 'start' as const }
                          : { x: p.cx, y: p.cy - 16, textAnchor: 'middle' as const })}
                      >
                        {Math.round(v * 10) / 10}%
                      </text>
                    </g>
                  )
                }}
                activeDot={{ r: 5, fill: s.color, stroke: 'var(--surface-solid)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
