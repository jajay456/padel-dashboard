import type { BarShapeProps } from 'recharts'

// Frosted "glass pill" bars shared by the bar charts: fully rounded caps, a
// gradient that fades toward the baseline, a faint top edge highlight, and
// an optional glow for the one bar being called out.

export type BarTone = 'neutral' | 'accent' | 'amber' | 'blue'

const TONES: Record<BarTone, { top: string; bottom: string; edge: string; glow?: string }> = {
  neutral: { top: 'var(--bar-top)', bottom: 'var(--bar-bottom)', edge: 'var(--bar-edge)' },
  accent:  { top: '#8fb6ff', bottom: '#4f7df0', edge: 'rgba(255,255,255,0.45)', glow: '#5b8cff' },
  amber:   { top: 'rgba(245,165,36,0.95)', bottom: 'rgba(245,165,36,0.12)', edge: 'rgba(255,255,255,0.3)' },
  blue:    { top: 'rgba(110,168,255,0.95)', bottom: 'rgba(110,168,255,0.12)', edge: 'rgba(255,255,255,0.3)' },
}

/** Gradients + glow filter; render once inside each chart, before the bars. */
export function GlassBarDefs({ id, horizontal = false }: { id: string; horizontal?: boolean }) {
  // Vertical bars fade downward; horizontal bars fade toward the left axis.
  const dir = horizontal ? { x1: '1', y1: '0', x2: '0', y2: '0' } : { x1: '0', y1: '0', x2: '0', y2: '1' }
  return (
    <defs>
      {(Object.keys(TONES) as BarTone[]).map(t => (
        <linearGradient key={t} id={`${id}-${t}`} {...dir}>
          <stop offset="0%" style={{ stopColor: TONES[t].top }} />
          <stop offset="100%" style={{ stopColor: TONES[t].bottom }} />
        </linearGradient>
      ))}
      <filter id={`${id}-glow`} x="-60%" y="-30%" width="220%" height="160%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
    </defs>
  )
}

export function GlassBar({ x, y, width, height, id, tone }: BarShapeProps & { id: string; tone: BarTone }) {
  const w = Number(width) || 0
  const h = Number(height) || 0
  if (w <= 0 || h <= 0) return null
  const bx = Number(x)
  const by = Number(y)
  const r = Math.min(w, h) / 2
  const t = TONES[tone]
  return (
    <g>
      {t.glow && (
        <rect x={bx} y={by} width={w} height={h} rx={r} fill={t.glow} opacity={0.55} filter={`url(#${id}-glow)`} />
      )}
      <rect x={bx} y={by} width={w} height={h} rx={r} fill={`url(#${id}-${tone})`} />
      {/* hairline edge so the bar reads as glass, not a flat shape */}
      <rect
        x={bx + 0.5} y={by + 0.5} width={Math.max(0, w - 1)} height={Math.max(0, h - 1)} rx={Math.max(0, r - 0.5)}
        fill="none" stroke={t.edge} strokeWidth={1}
      />
    </g>
  )
}
