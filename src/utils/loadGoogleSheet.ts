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
