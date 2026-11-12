import { useId } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, type BarShapeProps } from 'recharts'
import { GlassBar, GlassBarDefs } from './GlassBar'
import { useIsMobile } from '../utils/useMediaQuery'
import { pctAxis } from '../utils/chartScale'
import type { ZoneAggregate } from '../types'

const SERIES = [
  { key: 'Peak', tone: 'amber', color: '#f5a524' },
  { key: 'Off-peak', tone: 'blue', color: '#6ea8ff' },
] as const

// On phones, long zone names collide under the bars — keep the first word.
const shortTick = (mobile: boolean) => (v: string) => (mobile && v.length > 7 ? v.split(' ')[0].slice(0, 7) : v)

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="tt-row">
          <span className="tt-dot" style={{ background: SERIES.find(s => s.key === p.name)?.color }} />
          {p.name} <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  )
}

export default function PeakOffpeakChart({ data }: { data: ZoneAggregate[] }) {
  const isMobile = useIsMobile()
  const id = `po${useId().replace(/:/g, '')}`
  const chartData = data.map(d => ({ zone: d.zone, Peak: d.peak_pct, 'Off-peak': d.offpeak_pct }))
  const { max, ticks } = pctAxis(Math.max(0, ...data.flatMap(d => [d.peak_pct, d.offpeak_pct])))
  const showLabels = chartData.length * SERIES.length <= (isMobile ? 8 : 16)

  return (
    <div className="chart-card">
      <div className="chart-header chart-header-split">
        <div className="chart-title">
          <h3>Peak vs Off-peak by Zone</h3>
          <span className="chart-sub">% occupancy</span>
        </div>
        <div className="mini-legend">
          {SERIES.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.key}</span>)}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={isMobile ? 230 : 260}>
        <BarChart data={chartData} margin={{ top: showLabels ? 22 : 8, right: isMobile ? 4 : 12, left: isMobile ? -18 : 0, bottom: 0 }} barGap={4} barCategoryGap={isMobile ? '22%' : '30%'}>
          <GlassBarDefs id={id} />
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="zone" tick={{ fill: 'var(--chart-text)', fontSize: isMobile ? 10 : 12 }} tickLine={false} axisLine={false} interval={0} tickFormatter={shortTick(isMobile)} />
          <YAxis domain={[0, max]} ticks={ticks} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 14 } as object} />
          {SERIES.map(s => (
            <Bar
              key={s.key}
              dataKey={s.key}
              maxBarSize={26}
              isAnimationActive={false}
              shape={(p: BarShapeProps) => <GlassBar {...p} id={id} tone={s.tone} />}
            >
              {showLabels && (
                // Whole percents: a decimal label is wider than the bar and collides with its neighbour.
                <LabelList dataKey={s.key} position="top" offset={6} formatter={(v: unknown) => `${Math.round(Number(v))}%`} className="bar-label" />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
