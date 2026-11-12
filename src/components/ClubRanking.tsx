import { useId } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, type BarShapeProps } from 'recharts'
import { GlassBar, GlassBarDefs } from './GlassBar'
import { useIsMobile } from '../utils/useMediaQuery'
import { pctAxis } from '../utils/chartScale'
import type { ClubAggregate } from '../types'

interface Row { club: string; fullClub: string; zone: string; occ: number; peak: number; offpeak: number }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{d.fullClub}</p>
      <p className="tt-sub">{d.zone}</p>
      <p className="tt-row"><span className="tt-dot" style={{ background: '#8fb6ff' }} />Overall <strong>{d.occ}%</strong></p>
      <p className="tt-row"><span className="tt-dot" style={{ background: '#f5a524' }} />Peak <strong>{d.peak}%</strong></p>
      <p className="tt-row"><span className="tt-dot" style={{ background: '#6ea8ff' }} />Off-peak <strong>{d.offpeak}%</strong></p>
    </div>
  )
}

export default function ClubRanking({ data }: { data: ClubAggregate[] }) {
  const isMobile = useIsMobile()
  const id = `cr${useId().replace(/:/g, '')}`
  const top = data.slice(0, 12)
  const maxLen = isMobile ? 13 : 18
  const chartData: Row[] = top.map(d => ({
    club: d.club.length > maxLen ? d.club.slice(0, maxLen - 2) + '…' : d.club,
    fullClub: d.club,
    zone: d.zone,
    occ: d.occupancy_pct,
    peak: d.peak_pct,
    offpeak: d.offpeak_pct,
  }))
  const { max, ticks } = pctAxis(Math.max(0, ...chartData.map(d => d.occ)))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Club Ranking</h3>
        <span className="chart-sub">by occupancy % · top {top.length}</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(260, top.length * (isMobile ? 30 : 36))}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: isMobile ? 44 : 52, left: 0, bottom: 4 }} barCategoryGap="30%">
          <GlassBarDefs id={id} horizontal />
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={[0, max]} ticks={ticks} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="club" tick={{ fill: 'var(--chart-text)', fontSize: isMobile ? 11 : 12 }} width={isMobile ? 92 : 130} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 12 } as object} />
          <Bar
            dataKey="occ"
            maxBarSize={18}
            isAnimationActive={false}
            shape={(p: BarShapeProps) => <GlassBar {...p} id={id} tone={p.index === 0 ? 'accent' : 'neutral'} />}
          >
            <LabelList
              dataKey="occ"
              position="right"
              offset={10}
              content={(p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }) => (
                <text
                  x={Number(p.x) + Number(p.width) + 10}
                  y={Number(p.y) + Number(p.height) / 2}
                  dominantBaseline="central"
                  className={p.index === 0 ? 'bar-label bar-label-best' : 'bar-label'}
                >
                  {`${p.value}%`}
                </text>
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
