import type { Filters } from '../types'

interface Props {
  filters: Filters
  allZones: string[]
  allClubs: string[]
  minDate: string
  maxDate: string
  onChange: (f: Filters) => void
  onReset: () => void
}

export default function FilterBar({ filters, allZones, allClubs, minDate, maxDate, onChange, onReset }: Props) {
  function toggleZone(zone: string) {
    const zones = filters.zones.includes(zone)
      ? filters.zones.filter(z => z !== zone)
      : [...filters.zones, zone]
    onChange({ ...filters, zones, clubs: [] })
  }

  function toggleClub(club: string) {
    const clubs = filters.clubs.includes(club)
      ? filters.clubs.filter(c => c !== club)
      : [...filters.clubs, club]
    onChange({ ...filters, clubs })
  }

  const visibleClubs = allClubs.filter(_ => {
    if (filters.zones.length === 0) return true
    return true
  })

  const hasFilters = filters.zones.length > 0 || filters.clubs.length > 0
    || filters.dateStart !== minDate || filters.dateEnd !== maxDate

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <div className="date-range">
            <input
              type="date"
              value={filters.dateStart}
              min={minDate}
              max={filters.dateEnd}
              onChange={e => onChange({ ...filters, dateStart: e.target.value })}
            />
            <span className="date-sep">→</span>
            <input
              type="date"
              value={filters.dateEnd}
              min={filters.dateStart}
              max={maxDate}
              onChange={e => onChange({ ...filters, dateEnd: e.target.value })}
            />
          </div>
        </div>
        {hasFilters && (
          <button className="reset-btn" onClick={onReset}>
            Reset Filters
          </button>
        )}
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label className="filter-label">Zone {filters.zones.length > 0 && <span className="filter-count">{filters.zones.length}</span>}</label>
          <div className="chip-group">
            {allZones.map(z => (
              <button
                key={z}
                className={`chip ${filters.zones.includes(z) ? 'chip-active' : ''}`}
                onClick={() => toggleZone(z)}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label className="filter-label">Club {filters.clubs.length > 0 && <span className="filter-count">{filters.clubs.length}</span>}</label>
          <div className="chip-group">
            {visibleClubs.map(c => (
              <button
                key={c}
                className={`chip ${filters.clubs.includes(c) ? 'chip-active' : ''}`}
                onClick={() => toggleClub(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
