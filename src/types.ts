export interface RawRow {
  _rowIndex: number
  date: string
  zone: string
  club: string
  court_id: string
  booked_peak_h: number
  booked_offpeak_h: number
  booked_total_h: number
  total_peak_h: number
  total_offpeak_h: number
  total_h: number
  day_of_week: string
}

export interface DayAggregate {
  date: string
  day_of_week: string
  booked_total_h: number
  total_h: number
  booked_peak_h: number
  total_peak_h: number
  booked_offpeak_h: number
  total_offpeak_h: number
  occupancy_pct: number
  peak_pct: number
  offpeak_pct: number
}

export interface ZoneAggregate {
  zone: string
  booked_total_h: number
  total_h: number
  booked_peak_h: number
  total_peak_h: number
  booked_offpeak_h: number
  total_offpeak_h: number
  occupancy_pct: number
  peak_pct: number
  offpeak_pct: number
}

export interface ClubAggregate {
  club: string
  zone: string
  booked_total_h: number
  total_h: number
  booked_peak_h: number
  total_peak_h: number
  booked_offpeak_h: number
  total_offpeak_h: number
  occupancy_pct: number
  peak_pct: number
  offpeak_pct: number
  court_count: number
}

export interface DayOfWeekAggregate {
  day_of_week: string
  order: number
  booked_total_h: number
  total_h: number
  occupancy_pct: number
  peak_pct: number
  offpeak_pct: number
  day_count: number
}

export interface Filters {
  dateStart: string
  dateEnd: string
  zones: string[]
  clubs: string[]
}
