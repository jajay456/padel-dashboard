import { useState, type ReactNode } from 'react'
import { CourtIcon, PeakIcon, OffPeakIcon, FlagIcon, RacketIcon, CoinsIcon } from './Icons'

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

const fmtH = (h: number) => `${Math.round(h).toLocaleString('en-US')}h`

function CardLabel({ icon, children, color }: { icon: ReactNode; children: ReactNode; color: string }) {
  return (
    <div className="kpi-label">
      <span className="kpi-glyph" style={{ color }}>{icon}</span>
      {children}
    </div>
  )
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

function SmallCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: ReactNode; color: string
}) {
  return (
    <div className="kpi-card kpi-small" style={{ '--accent': color } as React.CSSProperties}>
      <CardLabel icon={icon} color={color}>{label}</CardLabel>
      <div className="kpi-value kpi-value-sm" title={value}>{value}</div>
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
      <div className="kpi-card kpi-hero">
        <CardLabel icon={<CourtIcon />} color="var(--green)">Overall occupancy</CardLabel>
        <div className="kpi-value kpi-value-xl" style={{ color: 'var(--green)' }}>
          {kpi.occupancy_pct}<span className="kpi-unit">%</span>
        </div>
        <div className="kpi-meter">
          <div style={{ width: `${Math.min(kpi.occupancy_pct, 100)}%` }} />
        </div>
        <div className="kpi-sub">
          {fmtH(kpi.booked_total_h)} booked of {fmtH(kpi.total_h)}
        </div>
      </div>

      <div className="kpi-card kpi-hero">
        <CardLabel icon={<CoinsIcon />} color="var(--amber)">Revenue estimate</CardLabel>
        <div className="revenue-fields">
          <label className="revenue-field">
            <span style={{ color: 'var(--amber)' }}>Peak</span>
            <input
              type="number" min="0" inputMode="decimal" placeholder="฿ / hr"
              value={peakPrice}
              onChange={e => setPeakPrice(e.target.value)}
              className="revenue-input-lg"
            />
          </label>
          <label className="revenue-field">
            <span style={{ color: 'var(--blue)' }}>Off-peak</span>
            <input
              type="number" min="0" inputMode="decimal" placeholder="฿ / hr"
              value={offpeakPrice}
              onChange={e => setOffpeakPrice(e.target.value)}
              className="revenue-input-lg"
            />
          </label>
        </div>
        <div className="kpi-value kpi-value-lg" style={{ color: 'var(--amber)' }}>
          {hasPrice ? `฿${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
        </div>
        <div className="kpi-sub">
          {hasPrice
            ? `Peak ${fmtH(kpi.booked_peak_h)} · Off-peak ${fmtH(kpi.booked_offpeak_h)}`
            : 'Enter a price per hour'}
        </div>
      </div>

      <div className="kpi-grid">
        <SmallCard label="Peak"      value={`${kpi.peak_pct}%`}    sub="occupancy" icon={<PeakIcon />}    color="var(--amber)"  />
        <SmallCard label="Off-peak"  value={`${kpi.offpeak_pct}%`} sub="occupancy" icon={<OffPeakIcon />} color="var(--blue)"   />
        <SmallCard label="Top zone"  value={topZone}               sub="by occupancy" icon={<FlagIcon />}    color="var(--purple)" />
        <SmallCard label="Top club"  value={topClub}               sub="by occupancy" icon={<RacketIcon />}  color="var(--pink)"   />
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
