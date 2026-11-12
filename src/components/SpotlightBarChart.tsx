import { useId } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, type BarShapeProps } from 'recharts'
import { GlassBar, GlassBarDefs } from './GlassBar'
import { useIsMobile } from '../utils/useMediaQuery'
import { pctAxis } from '../utils/chartScale'

// One glass bar per category (overall occupancy); the best one is lit up in
// blue. Peak / off-peak stay available in the tooltip.

export interface SpotlightDatum {
  label: string
  fullLabel?: string
  value: number
  peak: number
  offpeak: number
}

function SpotTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SpotlightDatum }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{d.fullLabel ?? d.label}</p>
      <p className="tt-row"><span className="tt-dot" style={{ background: '#8fb6ff' }} />Overall <strong>{d.value}%</strong></p>
      <p className="tt-row"><span className="tt-dot" style={{ background: '#f5a524' }} />Peak <strong>{d.peak}%</strong></p>
      <p className="tt-row"><span className="tt-dot" style={{ background: '#6ea8ff' }} />Off-peak <strong>{d.offpeak}%</strong></p>
    </div>
  )
}

// On phones, long names collide under the bars — keep the first word.
const shortTick = (mobile: boolean) => (v: string) => (mobile && v.length > 7 ? v.split(' ')[0].slice(0, 7) : v)

export default function SpotlightBarChart({ data, height = 260 }: { data: SpotlightDatum[]; height?: number }) {
  const isMobile = useIsMobile()
  const id = `sb${useId().replace(/:/g, '')}`
  const best = data.reduce((m, d, i) => (d.value > (data[m]?.value ?? -1) ? i : m), 0)
  const { max, ticks } = pctAxis(Math.max(0, ...data.map(d => d.value)))

  return (
    <ResponsiveContainer width="100%" height={isMobile ? height - 30 : height}>
      <BarChart data={data} margin={{ top: 22, right: isMobile ? 4 : 12, left: isMobile ? -18 : 0, bottom: 0 }} barCategoryGap={isMobile ? '28%' : '36%'}>
        <GlassBarDefs id={id} />
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: 'var(--chart-text)', fontSize: isMobile ? 10 : 12 }} tickLine={false} axisLine={false} interval={0} tickFormatter={shortTick(isMobile)} />
        <YAxis domain={[0, max]} ticks={ticks} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
        <Tooltip content={<SpotTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 14 } as object} />
        <Bar
          dataKey="value"
          maxBarSize={44}
          isAnimationActive={false}
          shape={(p: BarShapeProps) => <GlassBar {...p} id={id} tone={p.index === best ? 'accent' : 'neutral'} />}
        >
          <LabelList
            dataKey="value"
            position="top"
            offset={8}
            content={(p: { x?: number | string; y?: number | string; width?: number | string; value?: unknown; index?: number }) => (
              <text
                x={Number(p.x) + Number(p.width) / 2}
                y={Number(p.y) - 8}
                textAnchor="middle"
                className={p.index === best ? 'bar-label bar-label-best' : 'bar-label'}
              >
                {/* phones: whole percents so 7 labels fit side by side */}
                {`${isMobile ? Math.round(Number(p.value)) : p.value}%`}
              </text>
            )}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
