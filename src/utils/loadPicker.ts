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

export interface PickedSheet {
  id: string
  name: string
}

export async function openSheetPicker(
  accessToken: string,
  apiKey: string
): Promise<PickedSheet | null> {
  await loadGapiScript()

  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(
      window.google.picker.ViewId.SPREADSHEETS
    )
      .setMimeTypes('application/vnd.google-apps.spreadsheet')
      .setIncludeFolders(true)

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setTitle('Select a Google Sheet')
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0]
          resolve({ id: doc.id, name: doc.name })
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .build()

    picker.setVisible(true)
  })
}
