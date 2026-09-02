/** Downloads the raw bytes of a non-Google file stored in Drive (an uploaded
 *  CSV / Excel / ODS). Works under the `drive.file` scope because the file was
 *  just granted to the app by the user through the Picker. */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
): Promise<ArrayBuffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const reason: string | undefined = err?.error?.errors?.[0]?.reason
    const detail: string | undefined = err?.error?.message

    // The Drive API itself is switched off for this Google Cloud project — a
    // one-time fix by the app owner, not something each user can do.
    if (reason === 'accessNotConfigured' || /has not been used in project|is disabled/i.test(detail ?? '')) {
      throw new Error(
        'Google Drive API is not enabled for this app yet. The app owner needs to enable "Google Drive API" in the Google Cloud console. ' +
        '(Google Sheets still work in the meantime — or use "Upload from this device".)',
      )
    }
    if (res.status === 403 || res.status === 404) {
      throw new Error(
        detail
          ? `Drive denied access to this file: ${detail}`
          : "Drive denied access to this file. Try picking it again from the Drive browser, or use \"Upload from this device\".",
      )
    }
    throw new Error(detail ?? `Drive API error ${res.status}`)
  }
  return res.arrayBuffer()
}

export async function loadGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      throw new Error("You don't have access to this Sheet. Please ask the owner to share it with your email.")
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Sheets API error ${res.status}`)
  }
  const json = await res.json()
  if (!json.values?.length) throw new Error('No data found in this Sheet')
  return json.values as string[][]
}

export async function getSheetTabs(
  accessToken: string,
  spreadsheetId: string,
): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      throw new Error("You don't have access to this Sheet. Please ask the owner to share it with your email.")
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Sheets API error ${res.status}`)
  }
  const json = await res.json()
  const tabs = (json.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean)
  if (tabs.length === 0) throw new Error('No sheet tabs found')
  return tabs as string[]
}
