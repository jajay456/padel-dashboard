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
import AdminUsers from './components/AdminUsers'
import { SunIcon, MoonIcon, RefreshIcon, AlertIcon, HomeIcon, UsersIcon, UploadIcon, LogoutIcon } from './components/Icons'
import { parseSheetRows, dedupeRows, applyFilters, aggregateByDay, aggregateByZone, aggregateByClub, aggregateByDayOfWeek, getKPIs, getUniqueValues, aggregateByDayPerKey } from './utils/dataProcessing'
import { loadGoogleSheet, getSheetTabs, downloadDriveFile } from './utils/loadGoogleSheet'
import { openSheetPicker, appIdFromClientId, GOOGLE_SHEET_MIME } from './utils/loadPicker'
import { loadLocalFile, parseWorkbookBuffer, ACCEPTED_FILE_ATTR, type LocalWorkbook } from './utils/loadLocalFile'
import { getUserProfile, checkAuthorization, type Role, type UserProfile } from './utils/checkAuthorization'
import { signInFirebase, signOutFirebase } from './firebase'
import { recordLogin, touchLastSeen, clearLoginSession, type LoginResult } from './utils/loginActivity'
import { loadToken, saveToken, clearToken } from './utils/authToken'
import { saveLastSheet, loadLastSheet, clearLastSheet } from './utils/lastSheet'
import { upsertSheetUpload, getAllUploadRows, deleteUploadsByDate, getUploadedSheets, deleteUploadsBySheet, type UploadedSheet } from './utils/saveUpload'
import type { Filters, RawRow } from './types'
import logoFull from './assets/Logo_full.png'
import logoLight from './assets/Logo_light.png'
import './App.css'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string
const APP_ID = appIdFromClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)
const SHEET_SYNC_INTERVAL_MS = 5 * 60 * 1000

type AuthState = 'checking' | 'authorized' | 'unauthorized' | 'error'
type View = 'dashboard' | 'users'

const THEME_KEY = 'klab.theme'
function loadDark(): boolean {
  try { return localStorage.getItem(THEME_KEY) !== 'light' } catch { return true }
}

function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() => loadToken())

  // Why the last sign-in attempt failed; shown on the login page.
  const [authError, setAuthError] = useState('')

  const handleLoginSuccess = useCallback((token: string, expiresIn: number) => {
    setAuthError('')
    saveToken(token, expiresIn)
    setAccessToken(token)
  }, [])

  const [authState, setAuthState] = useState<AuthState>('checking')
  const [authEmail, setAuthEmail] = useState('')
  const [authReason, setAuthReason] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = authState === 'authorized' && role === 'admin'

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
  const [dark, setDark] = useState(loadDark)
  const [dataSource, setDataSource] = useState<'sheet' | 'firebase' | 'local' | null>(null)
  const [fbLoading, setFbLoading] = useState(false)
  const [fbError, setFbError] = useState('')

  const [localWb, setLocalWb] = useState<LocalWorkbook | null>(null)
  const [localError, setLocalError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState('')

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
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light') } catch { /* not persisted */ }
  }, [dark])

  // Close the avatar menu on any outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e.target instanceof Element && e.target.closest('.avatar-menu-wrap')) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setAuthState('checking')

    getUserProfile(accessToken)
      .then(async (prof) => {
        if (cancelled) return
        setProfile(prof)
        setAuthEmail(prof.email)
        // Firestore rules key off the Firebase Auth identity, so sign in
        // there before touching the customers collection. Non-fatal: with the
        // old (anonymous) rules the dashboard still works; only admin actions
        // need it, and they report the permission error themselves.
        let firebaseAuthError = ''
        try {
          await signInFirebase(accessToken)
        } catch (e) {
          console.warn('Firebase Auth sign-in failed — is the Google provider enabled?', e)
          firebaseAuthError = (e as { code?: string })?.code ?? (e instanceof Error ? e.message : String(e))
        }
        if (cancelled) return
        let result
        try {
          result = await checkAuthorization(prof.email)
        } catch (e) {
          // With the new rules deployed, a failed Firebase sign-in means the
          // access check itself is refused; say why instead of a generic error.
          if (firebaseAuthError && (e as { code?: string })?.code === 'permission-denied') {
            const fix = firebaseAuthError === 'auth/invalid-credential'
              // "access_token audience is not for this project": the Google
              // OAuth client belongs to another Google Cloud project.
              ? 'The Google OAuth client (VITE_GOOGLE_CLIENT_ID) is from a different project. An admin needs to add it under Firebase Console → Authentication → Sign-in method → Google → Safelist client IDs from external projects.'
              : firebaseAuthError === 'auth/operation-not-allowed'
                ? 'An admin needs to enable the Google provider in Firebase Console → Authentication → Sign-in method.'
                : 'Check the Google provider settings in Firebase Console → Authentication → Sign-in method.'
            throw new Error(
              `Firebase sign-in failed (${firebaseAuthError}), so Firestore refused the access check. ${fix}`,
              { cause: e },
            )
          }
          throw e
        }
        if (cancelled) return
        // Log every sign-in, including refused ones, so admins can see who
        // tried to get in. Fire-and-forget: never blocks the dashboard.
        recordLogin(result.email, (result.authorized ? 'ok' : result.reason ?? 'inactive') as LoginResult)
        setRole(result.role)
        if (result.authorized) {
          setAuthState('authorized')
        } else {
          setAuthReason(result.reason ?? 'unauthorized')
          setAuthState('unauthorized')
        }
      })
      .catch((e) => {
        if (cancelled) return
        console.error('Account verification failed', e)
        setAuthError(e instanceof Error ? e.message : String(e))
        // Token is unusable (expired / revoked) — drop it so a refresh
        // goes straight to the login screen instead of looping on this error.
        clearToken()
        setAccessToken(null)
        setAuthState('error')
      })

    return () => { cancelled = true }
  }, [accessToken])

  // "Last active": refresh while the dashboard is open and whenever the tab
  // comes back into focus (writes are throttled inside touchLastSeen).
  useEffect(() => {
    if (authState !== 'authorized' || !authEmail) return
    const email = authEmail.trim().toLowerCase()
    const touch = () => { if (document.visibilityState === 'visible') touchLastSeen(email) }
    const timer = window.setInterval(touch, 5 * 60 * 1000)
    window.addEventListener('focus', touch)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', touch)
    }
  }, [authState, authEmail])

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
      saveLastSheet({ sheetId: result.id, sheetName: result.name, tab: tabList[0] })
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
          await upsertSheetUpload(authEmail, localWb.fileId, localWb.fileName, selectedTab, parsed)
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

  const isLiveSheet =
    dataSource === null && !!sheetId && sheetId !== '__all__' && !!selectedTab

  // Re-reads the picked Google Sheet, overwrites its snapshot in Firebase, and
  // refreshes the dashboard. `silent` = a background poll (no full-screen
  // spinner, failures don't blow away the current view).
  const syncFromGoogleSheet = useCallback(async (opts?: { silent?: boolean }) => {
    if (!accessToken || !sheetId || !selectedTab || sheetId === '__all__' || dataSource !== null) return
    const silent = opts?.silent ?? false
    if (silent) setSyncing(true)
    else { setLoading(true); setError('') }
    setSyncError('')
    setSaveError('')
    try {
      const values = await loadGoogleSheet(accessToken, sheetId, selectedTab)
      const parsed = parseSheetRows(values)
      if (parsed.length === 0) throw new Error('No data found in Sheet')

      try {
        await upsertSheetUpload(authEmail, sheetId, sheetName, selectedTab, parsed)
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
      setLastSyncedAt(new Date())
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data'
      if (silent) setSyncError(msg)
      else setError(msg)
    } finally {
      if (silent) setSyncing(false)
      else setLoading(false)
    }
  }, [accessToken, sheetId, sheetName, selectedTab, authEmail, dataSource])

  // Initial load whenever the picked sheet / tab changes.
  useEffect(() => {
    if (!isLiveSheet) return
    syncFromGoogleSheet({ silent: false })
  }, [isLiveSheet, syncFromGoogleSheet])

  // Auto-refresh while the dashboard is open: every few minutes and whenever
  // the tab regains focus.
  useEffect(() => {
    if (!isLiveSheet) return
    const tick = () => syncFromGoogleSheet({ silent: true })
    const timer = window.setInterval(tick, SHEET_SYNC_INTERVAL_MS)
    const onFocus = () => {
      if (!lastSyncedAt || Date.now() - lastSyncedAt.getTime() > 60_000) tick()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [isLiveSheet, syncFromGoogleSheet, lastSyncedAt])

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

  // Keep the "last sheet" pointer current while viewing a live Google Sheet,
  // so switching tabs is remembered too.
  useEffect(() => {
    if (isLiveSheet && sheetId && selectedTab) {
      saveLastSheet({ sheetId, sheetName, tab: selectedTab })
    }
  }, [isLiveSheet, sheetId, sheetName, selectedTab])

  // On sign-in / refresh, go straight back to the last Google Sheet the user
  // loaded and re-pull it fresh — no need to pick it from Drive again. If
  // there's no remembered sheet, land on the combined Firebase dashboard
  // instead. Runs once per session.
  const autoLoadedRef = useRef(false)
  useEffect(() => {
    if (authState !== 'authorized' || autoLoadedRef.current) return
    autoLoadedRef.current = true
    const last = loadLastSheet()
    if (last) {
      setSheetId(last.sheetId)
      setSheetName(last.sheetName)
      setTabs([last.tab])
      setSelectedTab(last.tab)
    } else {
      handleViewAllDashboard({ silent: true })
    }
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
    setAuthError('')
    clearLoginSession()
    signOutFirebase()
    setRole('user')
    setProfile(null)
    setView('dashboard')
    setMenuOpen(false)
    clearToken()
    clearLastSheet()
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
    setSyncError('')
    setLastSyncedAt(null)
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
    setSyncError('')
    setLastSyncedAt(null)
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

  const displayName = profile?.givenName || profile?.name.split(' ')[0] || authEmail.split('@')[0]
  const avatarText = (profile?.name || authEmail)
    .split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const renderHeader = () => (
    <header className="topbar">
      <span
        className="header-logo"
        role="button"
        tabIndex={0}
        title="Go to dashboard (all sheets combined)"
        onClick={() => { setView('dashboard'); handleViewAllDashboard() }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('dashboard'); handleViewAllDashboard() } }}
      >
        <img src={dark ? logoFull : logoLight} alt="K-Lab — go to dashboard" />
      </span>

      {isAdmin && (
        <nav className="nav-pills" aria-label="Sections">
          <button className={view === 'dashboard' ? 'active' : ''} aria-current={view === 'dashboard' ? 'page' : undefined} onClick={() => setView('dashboard')}>
            <HomeIcon size={14} /> Dashboard
          </button>
          <button className={view === 'users' ? 'active' : ''} aria-current={view === 'users' ? 'page' : undefined} onClick={() => setView('users')}>
            <UsersIcon size={14} /> Users
          </button>
        </nav>
      )}

      <div className="topbar-actions">
        {isLiveSheet && view === 'dashboard' && (
          <button
            className="icon-btn round"
            onClick={() => syncFromGoogleSheet({ silent: true })}
            disabled={syncing || loading}
            title={syncError ? `Sync failed: ${syncError}` : 'Re-read the Google Sheet now'}
            aria-label="Refresh from Google Sheet"
          >
            <RefreshIcon className={syncing ? 'spin' : undefined} />
          </button>
        )}
        <button
          className="icon-btn round"
          onClick={() => setDark(d => !d)}
          title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle dark mode"
        >
          {dark ? <SunIcon size={15} /> : <MoonIcon size={14} />}
        </button>
        <button
          className="icon-btn round"
          onClick={() => { setView('dashboard'); handleChangeSheet() }}
          title="Upload sheet"
          aria-label="Upload sheet"
        >
          <UploadIcon size={15} />
        </button>
        <div className="avatar-menu-wrap">
          <button
            className="avatar-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            {profile?.picture
              ? <img src={profile.picture} alt="" referrerPolicy="no-referrer" />
              : avatarText}
            <span className="avatar-online" />
          </button>
          {menuOpen && (
            <div className="avatar-menu" role="menu">
              <div className="avatar-menu-head">
                <strong>{profile?.name || displayName}</strong>
                <span>{authEmail}</span>
                {isAdmin && <span className="role-tag">Admin</span>}
              </div>
              <button role="menuitem" onClick={handleLogout}>
                <LogoutIcon size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )

  if (!accessToken) {
    // authError is set when the access check after Google sign-in failed
    // (the token is dropped, so we land back here and must say why).
    return <LoginPage onSuccess={handleLoginSuccess} onError={setAuthError} message={authError} />
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
        <p style={{ color: 'var(--red)', marginBottom: 4 }}>
          Could not verify your account. Please try again.
        </p>
        {authError && <p className="overlay-detail">{authError}</p>}
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

  if (view === 'users' && isAdmin) {
    return (
      <div className="dashboard">
        {renderHeader()}
        <main className="dash-main">
          <div className="page-head">
            <div>
              <h1>Users</h1>
              <p>Approve sign-ups, set how long access lasts, and choose who can administer K-Lab.</p>
            </div>
          </div>
          <AdminUsers adminEmail={authEmail} />
        </main>
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
          className="login-btn"
          onClick={() => handleViewAllDashboard()}
          disabled={fbLoading}
          style={{ maxWidth: 320, margin: '16px auto 0' }}
        >
          {fbLoading ? 'Loading...' : 'View Dashboard (all sheets combined)'}
        </button>
        {fbError && <p style={{ color: 'var(--red)', marginTop: 16 }}>{fbError}</p>}

        {isAdmin && (
          <button className="login-btn" onClick={() => setView('users')} style={{ marginTop: 12 }}>
            Manage users
          </button>
        )}

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
      {renderHeader()}

      <main className="dash-main">
        <div className="page-head">
          <div>
            <h1>{greeting()}, {displayName}</h1>
            <p>Here's how your courts are filling up{sheetName ? <> · <span className="page-head-src">{sheetName}</span></> : null}</p>
          </div>
          <div className="dash-meta">
            <span className="meta-badge"><strong>{filtered.length.toLocaleString()}</strong> records</span>
            <span className="meta-badge"><strong>{byClub.length}</strong> clubs</span>
            <span className="meta-badge"><strong>{byDay.length}</strong> days</span>
            {isLiveSheet && (
              <span className={`meta-badge sync-badge${syncError ? ' is-error' : ''}`} title={syncError || undefined}>
                <span className="sync-dot" />
                {syncError
                  ? 'Sync failed'
                  : syncing
                    ? 'Syncing…'
                    : lastSyncedAt
                      ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Auto-sync on'}
              </span>
            )}
          </div>
        </div>
        {saveError && (
          <div className="save-error-banner" role="alert">
            <span className="save-error-title"><AlertIcon /> Couldn't save this sheet to the database: {saveError}</span>
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