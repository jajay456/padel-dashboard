import { useGoogleLogin } from '@react-oauth/google'
import logoX from '../assets/Logo_X.png'

interface Props {
  onSuccess: (accessToken: string) => void
  onError: (msg: string) => void
}

export default function LoginPage({ onSuccess, onError }: Props) {
  // Access is controlled by Google Sheet sharing: anyone can sign in, but
  // only users the sheet is shared with can load data (the Sheets API call
  // in App uses this token and returns 403 otherwise).
  const login = useGoogleLogin({
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets.readonly',
    onSuccess: (resp) => onSuccess(resp.access_token),
    onError: () => onError('Google login failed. Please try again.'),
  })

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="app-icon">
            <img src={logoX} alt="K-Lab" width={160} height={160} style={{ objectFit: 'contain' }} />
          </div>
        </div>
        <h1 className="login-title">K-Lab Dashboard</h1>
        <p className="login-sub">Racquet Technologies · Court Analytics</p>
        <button className="google-btn" onClick={() => login()}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.3-7.7 19.3-20 0-1.3-.1-2.7-.3-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.7-3.5-11.3-8.2l-6.5 5.1C9.6 39.9 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.4 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="login-note">
          Requires access to your Google Drive (to select a sheet) and Sheets (read-only)
        </p>
      </div>
    </div>
  )
}
