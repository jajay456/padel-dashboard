import { useState, useMemo, useCallback, useEffect } from 'react'
import FilterBar from './components/FilterBar'
import KPICards from './components/KPICards'
import TrendChart from './components/TrendChart'
import ZoneChart from './components/ZoneChart'
import ClubRanking from './components/ClubRanking'
import PeakOffpeakChart from './components/PeakOffpeakChart'
import DayOfWeekChart from './components/DayOfWeekChart'
import DataTable from './components/DataTable'
import RawDataTable from './components/RawDataTable'
import LoginPage from './components/LoginPage'
import { parseSheetRows, applyFilters, aggregateByDay, aggregateByZone, aggregateByClub, aggregateByDayOfWeek, getKPIs, getUniqueValues, aggregateByDayPerKey } from './utils/dataProcessing'
import { loadGoogleSheet, getSheetTabs } from './utils/loadGoogleSheet'
import { openSheetPicker } from './utils/loadPicker'
import { getUserEmail, checkAuthorization } from './utils/checkAuthorization'
import type { Filters, RawRow } from './types'
import logoFull from './assets/Logo_full.png'
import logoLight from './assets/Logo_light.png'
import './App.css'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string

type AuthState = 'checking' | 'authorized' | 'unauthorized' | 'error'

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const [authState, setAuthState] = useState<AuthState>('checking')
  const [authEmail, setAuthEmail] = useState('')
  const [authReason, setAuthReason] = useState('')

  const [sheetId, setSheetId] = useState<string | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [tabs, setTabs] = useState<string[] | null>(null)
  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const [tabsLoading, setTabsLoading] = useState(false)
  const [pickerError, setPickerError] = useState('')

  const [rows, setRows] = useState<RawRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters | null>(null)
  const [dark, setDark] = useState(false)

  // 🟢 เพิ่มตรงนี้: ดักจับและเตะหน้าจอออกจาก LINE In-App Browser ไปเปิดที่ Safari/Chrome ทันที
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (ua.indexOf('Line') > -1) {
      const currentUrl = window.location.href;
      if (currentUrl.indexOf('openExternalBrowser=1') === -1) {
        const separator = currentUrl.indexOf('?') !== -1 ? '&' : '?';
        window.location.href = currentUrl + separator + 'openExternalBrowser=1';
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setAuthState('checking')

    getUserEmail(accessToken)
      .then(async (email) => {
        if (cancelled) return
        setAuthEmail(email)
        const result = await checkAuthorization(email)
        if (cancelled) return
        if (result.authorized) {
          setAuthState('authorized')
        } else {
          setAuthReason(result.reason ?? 'unauthorized')
          setAuthState('unauthorized')
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState('error')
      })

    return () => { cancelled = true }
  }, [accessToken])

  async function handlePickSheet() {
    if (!accessToken) return
    setPickerError('')
    try {
      const result = await openSheetPicker(accessToken, API_KEY)
      if (!result) return
      setSheetId(result.id)
      setSheetName(result.name)
      setTabsLoading(true)
      const tabList = await getSheetTabs(accessToken, result.id)
      setTabs(tabList)
      setSelectedTab(tabList[0])
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : 'Failed to open picker')
      setSheetId(null)
    } finally {
      setTabsLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken || !sheetId || !selectedTab) return
    setLoading(true)
    setError('')
    loadGoogleSheet(accessToken, sheetId, selectedTab)
      .then(values => {
        const parsed = parseSheetRows(values)
        if (parsed.length === 0) throw new Error('No data found in Sheet')
        setRows(parsed)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [accessToken, sheetId, selectedTab])

  function handleLogout() {
    setAccessToken(null)
    setAuthState('checking')
    setAuthEmail('')
    setAuthReason('')
    setSheetId(null)
    setSheetName('')
    setTabs(null)
    setSelectedTab(null)
    setRows([])
    setFilters(null)
    setError('')
  }

  function handleChangeSheet() {
    setSheetId(null)
    setSheetName('')
    setTabs(null)
    setSelectedTab(null)
    setRows([])
    setFilters(null)
    setError('')
  }

  const { zones, clubs, dates } = useMemo(() => getUniqueValues(rows), [rows])
  const minDate = dates[0] ?? ''
  const maxDate = dates[dates.length - 1] ?? ''

  const defaultFilters: Filters = useMemo(() => ({
    dateStart: minDate,
    dateEnd: maxDate,
    zones: [],
    clubs: [],
  }), [minDate, maxDate])

  const activeFilters = filters ?? defaultFilters
  const filtered = useMemo(() => applyFilters(rows, activeFilters), [rows, activeFilters])
  const byDay = useMemo(() => aggregateByDay(filtered), [filtered])
  const byZone = useMemo(() => aggregateByZone(filtered), [filtered])
  const byClub = useMemo(() => aggregateByClub(filtered), [filtered])
  const byDow = useMemo(() => aggregateByDayOfWeek(filtered), [filtered])
  const kpi = useMemo(() => getKPIs(filtered), [filtered])
  const topZone = byZone[0]?.zone ?? '-'
  const topClub = byClub[0]?.club ?? '-'

  const compareKeys = activeFilters.clubs.length > 0
    ? activeFilters.clubs
    : activeFilters.zones.length > 0 ? activeFilters.zones : []
  const compareType = activeFilters.clubs.length > 0 ? 'club' : 'zone'
  const compareData = useMemo(() =>
    compareKeys.length > 0
      ? aggregateByDayPerKey(filtered, compareKeys, r => compareType === 'club' ? r.club : r.zone)
      : [],
  [filtered, compareKeys, compareType])

  const handleFilterChange = useCallback((f: Filters) => setFilters(f), [])
  const handleReset = useCallback(() => setFilters(null), [])

  if (!accessToken) {
    return <LoginPage onSuccess={setAccessToken} onError={setError} />
  }

  // ส่วนของการ Render หน้าตา UI ด้านล่างคงเดิมทั้งหมด...
  if (authState === 'checking') {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Verifying account access...</p>
      </div>
    )
  }

  if (authState === 'error') {
    return (
      <div className="loading-overlay">
        <p style={{ color: 'var(--red)', marginBottom: 16 }}>
          Could not verify your account. Please try again.
        </p>
        <button className="logout-btn" onClick={handleLogout}>Sign out</button>
      </div>
    )
  }

  if (authState === 'unauthorized') {
    const messages: Record<string, string> = {
      pending: 'Your account request has been received. Please contact sales — access will be enabled shortly.',
      inactive: 'Your subscription is inactive. Please contact sales to renew.',
      expired: 'Your subscription has expired. Please contact sales to renew.',
      unauthorized: "This account doesn't have access to K-Lab Dashboard.",
    }
    return (
      <div className="loading-overlay">
        <h2>Access restricted</h2>
        <p style={{ opacity: 0.7, marginBottom: 8 }}>{authEmail}</p>
        <p style={{ color: 'var(--red)', marginBottom: 16 }}>
          {messages[authReason] ?? messages.unauthorized}
        </p>
        <button className="logout-btn" onClick={handleLogout}>Sign out</button>
      </div>
    )
  }

  if (!sheetId) {
    return (
      <div className="loading-overlay">
        <h2>Choose a Google Sheet</h2>
        <p style={{ opacity: 0.6, marginBottom: 16 }}>
          Browse your Google Drive and pick the spreadsheet to analyze.
        </p>
        <button className="google-btn" onClick={handlePickSheet} style={{ maxWidth: 320, margin: '0 auto' }}>
          Browse Google Drive
        </button>
        {pickerError && <p style={{ color: 'var(--red)', marginTop: 16 }}>{pickerError}</p>}
        <button className="logout-btn" onClick={handleLogout} style={{ marginTop: 24 }}>Sign out</button>
      </div>
    )
  }

  if (tabsLoading || !tabs) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Reading sheet tabs...</p>
      </div>
    )
  }

  if (tabs.length > 0 && !loading && rows.length === 0 && !error) {
    return (
      <div className="loading-overlay">
        <h2>{sheetName}</h2>
        <p style={{ opacity: 0.6, marginBottom: 12 }}>Select the tab to load</p>
        <select
          value={selectedTab ?? tabs[0]}
          onChange={e => setSelectedTab(e.target.value)}
          style={{ padding: 10, fontSize: 14, marginBottom: 16 }}
        >
          {tabs.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="google-btn" onClick={() => setSelectedTab(selectedTab ?? tabs[0])} style={{ maxWidth: 200 }}>
            Load data
          </button>
          <button className="logout-btn" onClick={handleChangeSheet}>Choose a different sheet</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Loading data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-overlay">
        <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
        <button className="logout-btn" onClick={handleChangeSheet}>Choose a different sheet</button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-title">
          <img src={dark ? logoFull : logoLight} alt="K-Lab" height={200} style={{ objectFit: 'contain' }} className="header-logo" />
        </div>
        <div className="dash-meta">
          <span className="meta-badge">{filtered.length.toLocaleString()} records</span>
          <span className="meta-badge">{byClub.length} clubs</span>
          <span className="meta-badge">{byDay.length} days</span>
          <button
            className={`theme-toggle${dark ? ' dark' : ''}`}
            onClick={() => setDark(d => !d)}
            title="Toggle theme"
            role="switch"
            aria-checked={dark}
            aria-label="Toggle dark mode"
          >
            <span className="theme-toggle-icon sun">☀</span>
            <span className="theme-toggle-icon moon">☾</span>
            <span className="theme-toggle-knob" />
          </button>
          <button className="logout-btn" onClick={handleChangeSheet} title="Change sheet">Change sheet</button>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <FilterBar
          filters={activeFilters}
          allZones={zones}
          allClubs={clubs}
          minDate={minDate}
          maxDate={maxDate}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        <KPICards kpi={kpi} topZone={topZone} topClub={topClub} />

        <div className="chart-row">
          <div className="chart-col-full">
            <TrendChart data={byDay} compareData={compareData} compareKeys={compareKeys} />
          </div>
        </div>

        <div className="chart-row chart-row-2">
          <ZoneChart data={byZone} />
          <PeakOffpeakChart data={byZone} />
        </div>

        <div className="chart-row chart-row-2">
          <ClubRanking data={byClub} />
          <DayOfWeekChart data={byDow} />
        </div>

        <div className="chart-row">
          <div className="chart-col-full">
            <DataTable data={byClub} />
          </div>
        </div>

        <div className="chart-row">
          <div className="chart-col-full">
            <RawDataTable rows={filtered} />
          </div>
        </div>
      </main>
    </div>
  )
}