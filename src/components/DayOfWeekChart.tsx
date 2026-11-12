import SpotlightBarChart from './SpotlightBarChart'
import type { DayOfWeekAggregate } from '../types'

export default function DayOfWeekChart({ data }: { data: DayOfWeekAggregate[] }) {
  const chartData = data.map(d => ({
    label: d.day_of_week.slice(0, 3),
    fullLabel: d.day_of_week,
    value: d.occupancy_pct,
    peak: d.peak_pct,
    offpeak: d.offpeak_pct,
  }))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Occupancy by Day of Week</h3>
        <span className="chart-sub">average % · busiest day highlighted</span>
      </div>
      <SpotlightBarChart data={chartData} />
    </div>
  )
}
