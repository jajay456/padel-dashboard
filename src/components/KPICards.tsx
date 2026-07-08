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
  icon: string; iconBg: string; color: string
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: iconBg }}>
        <span>{icon}</span>
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
        <div className="kpi-icon" style={{ background: '#22c55e22' }}>
          <span>📊</span>
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
        <SmallCard label="Peak Hours"     value={`${kpi.peak_pct}%`}    sub="Peak period"     icon="⚡" iconBg="var(--amber-bg)"  color="var(--amber)"  />
        <SmallCard label="Off-peak"       value={`${kpi.offpeak_pct}%`} sub="Off-peak period" icon="🌙" iconBg="var(--blue-bg)"   color="var(--blue)"   />
        <SmallCard label="Top Zone"       value={topZone}                                    icon="📍" iconBg="var(--purple-bg)" color="var(--purple)" />
        <SmallCard label="Top Club"       value={topClub}                sub="by occupancy"  icon="🏆" iconBg="var(--pink-bg)"   color="var(--pink)"   />
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
