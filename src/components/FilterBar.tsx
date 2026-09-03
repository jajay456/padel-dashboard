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
            {/* Every day is selectable — no min/max cap. The range defaults to
                the full span of the data; pick the start (and end) yourself.
                If the range ends up reversed, the other end follows along. */}
            <input
              type="date"
              value={filters.dateStart}
              onChange={e => {
                const dateStart = e.target.value
                if (!dateStart) return
                onChange({
                  ...filters,
                  dateStart,
                  dateEnd: dateStart > filters.dateEnd ? dateStart : filters.dateEnd,
                })
              }}
            />
            <span className="date-sep">→</span>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={e => {
                const dateEnd = e.target.value
                if (!dateEnd) return
                onChange({
                  ...filters,
                  dateEnd,
                  dateStart: dateEnd < filters.dateStart ? dateEnd : filters.dateStart,
                })
              }}
            />
            {(minDate || maxDate) && (
              <button
                type="button"
                className="date-all-btn"
                onClick={() => onChange({ ...filters, dateStart: minDate, dateEnd: maxDate })}
                disabled={filters.dateStart === minDate && filters.dateEnd === maxDate}
                title={`Show every day (${minDate} → ${maxDate})`}
              >
                All days
              </button>
            )}
          </div>
          {(minDate || maxDate) && (
            <span className="date-hint">Data available: {minDate || '—'} → {maxDate || '—'}</span>
          )}
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
