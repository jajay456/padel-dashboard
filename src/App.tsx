import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
import { parseSheetRows, dedupeRows, applyFilters, aggregateByDay, aggregateByZone, aggregateByClub, aggregateByDayOfWeek, getKPIs, getUniqueValues, aggregateByDayPerKey } from './utils/dataProcessing'
import { loadGoogleSheet, getSheetTabs, downloadDriveFile } from './utils/loadGoogleSheet'
import { openSheetPicker, appIdFromClientId, GOOGLE_SHEET_MIME } from './utils/loadPicker'
import { loadLocalFile, parseWorkbookBuffer, ACCEPTED_FILE_ATTR, type LocalWorkbook } from './utils/loadLocalFile'
import { getUserEmail, checkAuthorization } from './utils/checkAuthorization'
import { loadToken, saveToken, clearToken } from './utils/authToken'
import { saveSheetUpload, getAllUploadRows, deleteUploadsByDate, getUploadedSheets, deleteUploadsBySheet, type UploadedSheet } from './utils/saveUpload'
import type { Filters, RawRow } from './types'
import logoFull from './assets/Logo_full.png'
import logoLight from './assets/Logo_light.png'
import './App.css'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string
const APP_ID = appIdFromClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)

type AuthState = 'checking' | 'authorized' | 'unauthorized' | 'error'

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() => loadToken())

  const handleLoginSuccess = useCallback((token: string, expiresIn: number) => {
    saveToken(token, expiresIn)
    setAccessToken(token)
  }, [])

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
  const [saveError, setSaveError] = useState('')
  const [filters, setFilters] = useState<Filters | null>(null)
  const [dark, setDark] = useState(false)
  const [dataSource, setDataSource] = useState<'sheet' | 'firebase' | 'local' | null>(null)
  const [fbLoading, setFbLoading] = useState(false)
  const [fbError, setFbError] = useState('')

  const [localWb, setLocalWb] = useState<LocalWorkbook | null>(null)
  const [localError, setLocalError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [delYear, setDelYear] = useState(String(new Date().getFullYear()))
  const [delMonth, setDelMonth] = useState('')
  const [delDay, setDelDay] = useState('')
  const [delLoading, setDelLoading] = useState(false)
  const [delMessage, setDelMessage] = useState('')
  const [delError, setDelError] = useState('')

  const [uploadedSheets, setUploadedSheets] = useState<UploadedSheet[]>([])
  const [delSheetId, setDelSheetId] = useState('')
  const [delSheetLoading, setDelSheetLoading] = useState(false)
  const [delSheetMessage, setDelSheetMessage] = useState('')
  const [delSheetError, setDelSheetError] = useState('')

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
        if (cancelled) return
        // Token is unusable (expired / revoked) — drop it so a refresh
        // goes straight to the login screen instead of looping on this error.
        clearToken()
        setAccessToken(null)
        setAuthState('error')
      })

    return () => { cancelled = true }
  }, [accessToken])

  useEffect(() => {
    if (authState !== 'authorized') return
    let cancelled = false
    getUploadedSheets()
      .then(list => { if (!cancelled) setUploadedSheets(list) })
      .catch(e => console.error('Failed to load uploaded sheet list', e))
    return () => { cancelled = true }
  }, [authState])

  async function handlePickSheet() {
    if (!accessToken) return
    setPickerError('')
    setLocalError('')
    try {
      const result = await openSheetPicker(accessToken, API_KEY, APP_ID)
      if (!result) return

      if (result.mimeType && result.mimeType !== GOOGLE_SHEET_MIME) {
        // An uploaded CSV / Excel / ODS file sitting in Drive — download the
        // bytes and run them through the same parser as a device upload.
        setTabsLoading(true)
        const buf = await downloadDriveFile(accessToken, result.id)
        const wb = parseWorkbookBuffer(buf, {
          fileName: result.name,
          fileId: `drive:${result.id}`,
          mimeType: result.mimeType,
        })
        setLocalWb(wb)
        setDataSource('local')
        setSheetId(wb.fileId)
        setSheetName(wb.fileName)
        setRows([])
        setFilters(null)
        setError('')
        setTabs(wb.sheetNames)
        setSelectedTab(wb.sheetNames[0])
        return
      }

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

  async function handlePickLocalFile(file: File) {
    setLocalError('')
    setPickerError('')
    try {
      const wb = await loadLocalFile(file)
      setLocalWb(wb)
      setDataSource('local')
      setSheetId(wb.fileId)
      setSheetName(wb.fileName)
      setRows([])
      setFilters(null)
      setError('')
      setTabs(wb.sheetNames)
      setSelectedTab(wb.sheetNames[0])
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to read file')
      setLocalWb(null)
      setSheetId(null)
      setDataSource(null)
    }
  }

  // Load & save data from a locally-uploaded file (CSV / Excel / etc.)
  useEffect(() => {
    if (dataSource !== 'local' || !localWb || !selectedTab) return
    const values = localWb.sheets[selectedTab]
    if (!values) return
    setLoading(true)
    setError('')
    setSaveError('')
    ;(async () => {
      try {
        const parsed = parseSheetRows(values)
        if (parsed.length === 0) throw new Error('No usable rows found — check the column headers match the expected format')

        try {
          await saveSheetUpload(authEmail, localWb.fileId, localWb.fileName, selectedTab, parsed)
        } catch (e) {
          console.error('Failed to save upload to Firebase', e)
          setSaveError(e instanceof Error ? e.message : 'Failed to save this upload to the database')
        }

        try {
          const allRows = await getAllUploadRows()
          setRows(dedupeRows(allRows.length > 0 ? allRows : parsed))
        } catch (e) {
          console.error('Failed to load combined data from Firebase', e)
          setRows(parsed)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load file')
      } finally {
        setLoading(false)
      }
    })()
  }, [dataSource, localWb, selectedTab, authEmail])

  useEffect(() => {
    if (!accessToken || !sheetId || !selectedTab || dataSource === 'firebase' || dataSource === 'local') return
    setLoading(true)
    setError('')
    setSaveError('')
    loadGoogleSheet(accessToken, sheetId, selectedTab)
      .then(async values => {
        const parsed = parseSheetRows(values)
        if (parsed.length === 0) throw new Error('No data found in Sheet')

        try {
          await saveSheetUpload(authEmail, sheetId, sheetName, selectedTab, parsed)
        } catch (e) {
          console.error('Failed to save upload to Firebase', e)
          setSaveError(e instanceof Error ? e.message : 'Failed to save this upload to the database')
        }

        try {
          const allRows = await getAllUploadRows()
          setRows(dedupeRows(allRows.length > 0 ? allRows : parsed))
        } catch (e) {
          console.error('Failed to load combined data from Firebase', e)
          setRows(parsed)
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [accessToken, sheetId, sheetName, selectedTab, authEmail, dataSource])

  const handleViewAllDashboard = useCallback(async (opts?: { silent?: boolean }) => {
    setFbError('')
    setFbLoading(true)
    try {
      const allRows = await getAllUploadRows()
      if (allRows.length === 0) {
        // On the automatic post-login load this just means "nothing uploaded
        // yet" — fall through to the data-source picker without a scary error.
        if (!opts?.silent) setFbError('No previous uploads found in Firebase yet')
        return
      }
      setDataSource('firebase')
      setSheetId('__all__')
      setSheetName('All uploaded sheets')
      setTabs(['All data'])
      setSelectedTab('All data')
      setRows(dedupeRows(allRows))
      setFilters(null)
      setError('')
      setSaveError('')
      setLocalWb(null)
    } catch (e) {
      setFbError(e instanceof Error ? e.message : 'Failed to load data from Firebase')
    } finally {
      setFbLoading(false)
    }
  }, [])

  // After sign-in the combined dashboard is the landing page: pull every
  // uploaded row from Firebase automatically. Runs once per session; a page
  // refresh re-runs it, so the dashboard is always the first screen when data
  // exists. Falls through to "Choose a data source" only when nothing is stored.
  const autoLoadedRef = useRef(false)
  useEffect(() => {
    if (authState !== 'authorized' || autoLoadedRef.current) return
    autoLoadedRef.current = true
    handleViewAllDashboard({ silent: true })
  }, [authState, handleViewAllDashboard])

  async function handleDeleteUploads() {
    const year = parseInt(delYear, 10)
    if (!Number.isFinite(year)) {
      setDelError('Please enter a valid year')
      return
    }
    const month = delMonth ? parseInt(delMonth, 10) : undefined
    const day = month && delDay ? parseInt(delDay, 10) : undefined

    const label = day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : month ? `${year}-${String(month).padStart(2, '0')}`
      : `${year}`
    if (!window.confirm(`Delete all uploaded data from ${label}? This cannot be undone.`)) return

    setDelError('')
    setDelMessage('')
    setDelLoading(true)
    try {
      const count = await deleteUploadsByDate(year, month, day)
      setDelMessage(`Deleted ${count} upload record(s) from ${label}`)
    } catch (e) {
      setDelError(e instanceof Error ? e.message : 'Failed to delete uploads')
    } finally {
      setDelLoading(false)
    }
  }

  async function handleDeleteBySheet() {
    if (!delSheetId) {
      setDelSheetError('Please choose a sheet')
      return
    }
    const label = uploadedSheets.find(s => s.sheetId === delSheetId)?.sheetName ?? delSheetId
    if (!window.confirm(`Delete all uploaded data for "${label}"? This cannot be undone.`)) return

    setDelSheetError('')
    setDelSheetMessage('')
    setDelSheetLoading(true)
    try {
      const count = await deleteUploadsBySheet(delSheetId)
      setDelSheetMessage(`Deleted ${count} upload record(s) for "${label}"`)
      setUploadedSheets(prev => prev.filter(s => s.sheetId !== delSheetId))
      setDelSheetId('')
    } catch (e) {
      setDelSheetError(e instanceof Error ? e.message : 'Failed to delete uploads')
    } finally {
      setDelSheetLoading(false)
    }
  }

  function handleLogout() {
    clearToken()
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
    setSaveError('')
    setDataSource(null)
    setFbError('')
    setLocalWb(null)
    setLocalError('')
  }

  function handleChangeSheet() {
    setSheetId(null)
    setSheetName('')
    setTabs(null)
    setSelectedTab(null)
    setRows([])
    setFilters(null)
    setError('')
    setSaveError('')
    setDataSource(null)
    setFbError('')
    setLocalWb(null)
    setLocalError('')
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
    return <LoginPage onSuccess={handleLoginSuccess} onError={setError} />
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

  // Auto-loading the combined dashboard right after sign-in / refresh.
  if (!sheetId && fbLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (!sheetId) {
    return (
      <div className="loading-overlay">
        <h2>Choose a data source</h2>
        <p style={{ opacity: 0.6, marginBottom: 16 }}>
          Pick a Google Sheet — or a CSV / Excel file — from your Google Drive.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_ATTR}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) handlePickLocalFile(file)
          }}
        />

        <div className="source-btn-row">
          <div className="source-btn-col">
            <button className="google-btn" onClick={handlePickSheet}>
              Browse Google Drive
            </button>
            <p className="source-btn-caption">
              Google Sheets, plus CSV / TSV / Excel (.xlsx, .xls) / ODS files stored in Drive
            </p>
          </div>
          <div className="source-btn-col">
            <button className="google-btn" onClick={() => fileInputRef.current?.click()}>
              Upload from this device
            </button>
            <p className="source-btn-caption">
              Supports CSV, TSV and Excel (.xlsx, .xls) files
            </p>
          </div>
        </div>

        {pickerError && <p style={{ color: 'var(--red)', marginTop: 16 }}>{pickerError}</p>}
        {localError && <p style={{ color: 'var(--red)', marginTop: 16 }}>{localError}</p>}
        <button
          className="logout-btn"
          onClick={() => handleViewAllDashboard()}
          disabled={fbLoading}
          style={{ maxWidth: 320, margin: '16px auto 0' }}
        >
          {fbLoading ? 'Loading...' : 'View Dashboard (all sheets combined)'}
        </button>
        {fbError && <p style={{ color: 'var(--red)', marginTop: 16 }}>{fbError}</p>}

        <details className="manage-panel">
          <summary>Danger zone: delete uploaded data</summary>

          <div className="manage-row">
            <span className="manage-row-label">By date</span>
            <input
              type="number"
              value={delYear}
              onChange={e => setDelYear(e.target.value)}
              placeholder="Year"
              className="manage-field manage-field-year"
            />
            <select
              value={delMonth}
              onChange={e => { setDelMonth(e.target.value); setDelDay('') }}
              className="manage-field"
            >
              <option value="">All months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <select
              value={delDay}
              onChange={e => setDelDay(e.target.value)}
              disabled={!delMonth}
              className="manage-field"
            >
              <option value="">All days</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
              ))}
            </select>
            <button className="manage-btn" onClick={handleDeleteUploads} disabled={delLoading}>
              {delLoading ? '...' : 'Delete'}
            </button>
          </div>
          {delMessage && <p className="manage-msg" style={{ color: 'var(--green)' }}>{delMessage}</p>}
          {delError && <p className="manage-msg" style={{ color: 'var(--red)' }}>{delError}</p>}

          <div className="manage-row">
            <span className="manage-row-label">By sheet</span>
            <select
              value={delSheetId}
              onChange={e => setDelSheetId(e.target.value)}
              className="manage-field manage-field-sheet"
            >
              <option value="">
                {uploadedSheets.length === 0 ? 'No uploaded sheets yet' : 'Choose a sheet'}
              </option>
              {uploadedSheets.map(s => (
                <option key={s.sheetId} value={s.sheetId}>{s.sheetName}</option>
              ))}
            </select>
            <button className="manage-btn" onClick={handleDeleteBySheet} disabled={delSheetLoading || !delSheetId}>
              {delSheetLoading ? '...' : 'Delete'}
            </button>
          </div>
          {delSheetMessage && <p className="manage-msg" style={{ color: 'var(--green)' }}>{delSheetMessage}</p>}
          {delSheetError && <p className="manage-msg" style={{ color: 'var(--red)' }}>{delSheetError}</p>}
        </details>

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
          <img
            src={dark ? logoFull : logoLight}
            alt="K-Lab — go to dashboard"
            height={200}
            style={{ objectFit: 'contain', cursor: 'pointer' }}
            className="header-logo"
            role="button"
            tabIndex={0}
            title="Go to dashboard (all sheets combined)"
            onClick={() => handleViewAllDashboard()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewAllDashboard() } }}
          />
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
          <button className="logout-btn" onClick={handleChangeSheet} title="Upload sheet">Upload sheet</button>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        {saveError && (
          <div className="save-error-banner" role="alert">
            <span>⚠️ Couldn't save this sheet to the database: {saveError}</span>
            <span style={{ opacity: 0.75 }}>
              The dashboard is showing only the sheet you just picked — it was not merged with previous uploads.
            </span>
            <button className="save-error-close" onClick={() => setSaveError('')} aria-label="Dismiss">×</button>
          </div>
        )}
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