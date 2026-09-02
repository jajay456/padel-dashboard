import { DRIVE_IMPORT_MIME_TYPES } from './loadLocalFile'

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

let gapiLoaded: Promise<void> | null = null

function loadGapiScript(): Promise<void> {
  if (gapiLoaded) return gapiLoaded
  gapiLoaded = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => {
      window.gapi.load('picker', { callback: () => resolve() })
    }
    script.onerror = () => reject(new Error('Failed to load Google API script'))
    document.body.appendChild(script)
  })
  return gapiLoaded
}

export const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet'

export interface PickedFile {
  id: string
  name: string
  mimeType: string
}

/** GCP project number, used as the Picker "app id" so that files the user
 *  selects become readable by this OAuth client under the `drive.file` scope.
 *  It is the numeric prefix of the OAuth client id (before the first "-"). */
export function appIdFromClientId(clientId: string | undefined): string | undefined {
  const m = /^(\d+)-/.exec(clientId ?? '')
  return m ? m[1] : undefined
}

export async function openSheetPicker(
  accessToken: string,
  apiKey: string,
  appId?: string,
): Promise<PickedFile | null> {
  await loadGapiScript()
  const picker = window.google.picker

  return new Promise((resolve) => {
    // Native Google Sheets + uploaded CSV / Excel / ODS files sitting in Drive.
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setMimeTypes([GOOGLE_SHEET_MIME, ...DRIVE_IMPORT_MIME_TYPES].join(','))
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)

    const builder = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setTitle('Select a spreadsheet or CSV/Excel file')

    if (appId) builder.setAppId(appId)
      .setCallback((data: any) => {
        if (data.action === picker.Action.PICKED) {
          const doc = data.docs[0]
          resolve({ id: doc.id, name: doc.name, mimeType: doc.mimeType })
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null)
        }
      })

    builder.build().setVisible(true)
  })
}
