import { useState } from 'react'

interface KPIData {
  occupancy_pct: number
  peak_pct: number
  offpeak_pct: number
  booked_total_h: number
  booked_peak_h: number
  booked_offpeak_h: number
  total_h: number
}

interface Props {
  kpi: KPIData
  topZone: string
  topClub: string
}

type IconName = 'bolt' | 'moon' | 'pin' | 'trophy' | 'chart'

function Icon({ name }: { name: IconName }) {
  const p = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'bolt':
      return <svg {...p}><path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" /></svg>
    case 'moon':
      return <svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
    case 'pin':
      return <svg {...p}><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10Z" /><circle cx="12" cy="11" r="2.2" /></svg>
    case 'trophy':
      return <svg {...p}><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M9.5 20h5M12 12v8" /></svg>
    case 'chart':
      return <svg {...p}><path d="M4 5v14h16M8.5 15V11M12.5 15V8M16.5 15v-3" /></svg>
  }
}

function OccBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="occ-bars-row">
      <span>{label}</span>
      <div className="occ-bar-wrap">
        <div className="occ-bar-track">
          <div className="occ-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
        </div>
        <span className="occ-bar-label" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

function SmallCard({ label, value, sub, icon, iconBg, color }: {
  label: string; value: string; sub?: string
  icon: IconName; iconBg: string; color: string
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: iconBg, color }}>
        <Icon name={icon} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color, fontSize: 24 }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function KPICards({ kpi, topZone, topClub }: Props) {
  const [peakPrice, setPeakPrice] = useState('')
  const [offpeakPrice, setOffpeakPrice] = useState('')
  const pp = parseFloat(peakPrice) || 0
  const op = parseFloat(offpeakPrice) || 0
  const revenue = pp * kpi.booked_peak_h + op * kpi.booked_offpeak_h
  const hasPrice = pp > 0 || op > 0

  return (
    <div className="kpi-section">
      {/* Hero dark card */}
      <div className="kpi-card hero" style={{ minWidth: 200 }}>
        <div className="kpi-icon" style={{ background: '#22c55e22', color: '#22c55e' }}>
          <Icon name="chart" />
        </div>
        <div className="kpi-label">Overall Occupancy</div>
        <div className="kpi-value" style={{ color: '#22c55e', fontSize: 40 }}>
          {kpi.occupancy_pct}%
        </div>
        <div className="kpi-sub">
          {kpi.booked_total_h}h booked of {kpi.total_h}h total
        </div>
        <div className="kpi-trend">↑ Active</div>
      </div>

      {/* Revenue Calculator card */}
      <div className="kpi-card hero" style={{ minWidth: 200 }}>
        <div className="kpi-label" style={{ marginBottom: 12 }}>Revenue Calculator</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.08em' }}>PEAK</span>
            <input
              type="number" min="0" placeholder="฿ / hr"
              value={peakPrice}
              onChange={e => setPeakPrice(e.target.value)}
              className="revenue-input-lg"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, letterSpacing: '0.08em' }}>OFF-PEAK</span>
            <input
              type="number" min="0" placeholder="฿ / hr"
              value={offpeakPrice}
              onChange={e => setOffpeakPrice(e.target.value)}
              className="revenue-input-lg"
            />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#f59e0b', fontSize: 34 }}>
          {hasPrice ? `฿${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
        </div>
        <div className="kpi-sub">
          {hasPrice
            ? `Peak ${kpi.booked_peak_h}h · Off ${kpi.booked_offpeak_h}h`
            : 'Enter price per hour'}
        </div>
      </div>

      <div className="kpi-grid">
        <SmallCard label="Peak Hours"     value={`${kpi.peak_pct}%`}    sub="Peak period"     icon="bolt"   iconBg="var(--amber-bg)"  color="var(--amber)"  />
        <SmallCard label="Off-peak"       value={`${kpi.offpeak_pct}%`} sub="Off-peak period" icon="moon"   iconBg="var(--blue-bg)"   color="var(--blue)"   />
        <SmallCard label="Top Zone"       value={topZone}                                    icon="pin"    iconBg="var(--purple-bg)" color="var(--purple)" />
        <SmallCard label="Top Club"       value={topClub}                sub="by occupancy"  icon="trophy" iconBg="var(--pink-bg)"   color="var(--pink)"   />
      </div>

      <div className="occ-bars-card">
        <div className="occ-bars-title">Breakdown</div>
        <OccBar label="Overall"  pct={kpi.occupancy_pct} color="var(--green)" />
        <OccBar label="Peak"     pct={kpi.peak_pct}      color="var(--amber)" />
        <OccBar label="Off-peak" pct={kpi.offpeak_pct}   color="var(--blue)"  />
      </div>
    </div>
  )
}
