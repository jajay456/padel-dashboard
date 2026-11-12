import SpotlightBarChart from './SpotlightBarChart'
import type { ZoneAggregate } from '../types'

export default function ZoneChart({ data }: { data: ZoneAggregate[] }) {
  const chartData = data.map(d => ({
    label: d.zone,
    value: d.occupancy_pct,
    peak: d.peak_pct,
    offpeak: d.offpeak_pct,
  }))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Occupancy by Zone</h3>
        <span className="chart-sub">overall % · busiest zone highlighted</span>
      </div>
      <SpotlightBarChart data={chartData} />
    </div>
  )
}
