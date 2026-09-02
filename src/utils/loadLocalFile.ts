import * as XLSX from 'xlsx'

/** Parsed workbook: sheet/tab name -> rows of string cells (row 0 is the header). */
export interface LocalWorkbook {
  fileName: string
  /** A stable id derived from the file name + size + last-modified time. */
  fileId: string
  sheets: Record<string, string[][]>
  sheetNames: string[]
}

const SPREADSHEET_EXT = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods']
const TEXT_EXT = ['csv', 'tsv', 'txt']

export const ACCEPTED_FILE_EXT = [...SPREADSHEET_EXT, ...TEXT_EXT]
export const ACCEPTED_FILE_ATTR =
  ACCEPTED_FILE_EXT.map(e => `.${e}`).join(',') +
  ',application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** A real Date cell -> "YYYY-MM-DD" using its *local* parts (SheetJS builds
 *  dates in local time), so the day never shifts across a timezone. */
function cellToString(cell: unknown): string {
  if (cell == null) return ''
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return `${cell.getFullYear()}-${pad2(cell.getMonth() + 1)}-${pad2(cell.getDate())}`
  }
  return String(cell).trim()
}

/** Pads every row out to the width of the widest row so column lookups by
 *  header index never fall off the end of a short/ragged row. */
function normalize(rows: unknown[][]): string[][] {
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0)
  return rows
    .map(r => {
      const out: string[] = new Array(width).fill('')
      for (let i = 0; i < r.length; i++) out[i] = cellToString(r[i])
      return out
    })
    .filter(r => r.some(c => c !== ''))
}

/** Minimal RFC-4180-ish delimited-text parser. Handles quoted fields,
 *  escaped quotes (""), and both \n and \r\n line endings. Everything stays
 *  a string — no date/number coercion, unlike SheetJS's CSV import. */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') { inQuotes = true }
    else if (ch === delimiter) { row.push(field); field = '' }
    else if (ch === '\r') { /* swallow, handled by \n */ }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else { field += ch }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }

  return rows.map(r => r.map(c => c.trim()))
}

function parseTextFile(buf: ArrayBuffer, ext: string): string[][] {
  let text = new TextDecoder('utf-8').decode(buf)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // strip BOM

  let delimiter = ','
  if (ext === 'tsv') {
    delimiter = '\t'
  } else if (ext === 'txt') {
    const firstLine = text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'))
    const tabs = (firstLine.match(/\t/g) ?? []).length
    const semis = (firstLine.match(/;/g) ?? []).length
    const commas = (firstLine.match(/,/g) ?? []).length
    if (tabs >= commas && tabs >= semis && tabs > 0) delimiter = '\t'
    else if (semis > commas) delimiter = ';'
  }

  return normalize(parseDelimited(text, delimiter))
}

function parseSpreadsheetFile(buf: ArrayBuffer): Record<string, string[][]> {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheets: Record<string, string[][]> = {}
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    })
    const normalized = normalize(rows)
    if (normalized.length > 0) sheets[name] = normalized
  }
  return sheets
}

/** Reads a local .csv/.tsv/.xlsx/.xls (etc.) file into a workbook the dashboard
 *  can parse with the same code path as a Google Sheet. */
export async function loadLocalFile(file: File): Promise<LocalWorkbook> {
  const ext = extOf(file.name)
  if (!ACCEPTED_FILE_EXT.includes(ext)) {
    throw new Error(
      `Unsupported file type ".${ext}". Please upload one of: ${ACCEPTED_FILE_EXT.join(', ')}`,
    )
  }

  const buf = await file.arrayBuffer()

  let sheets: Record<string, string[][]>
  try {
    sheets = TEXT_EXT.includes(ext)
      ? { [file.name.replace(/\.[^.]+$/, '')]: parseTextFile(buf, ext) }
      : parseSpreadsheetFile(buf)
  } catch (e) {
    throw new Error(
      `Could not read "${file.name}". It may be corrupted or not a real spreadsheet. (${
        e instanceof Error ? e.message : 'parse error'
      })`,
      { cause: e },
    )
  }

  const sheetNames = Object.keys(sheets).filter(n => sheets[n].length > 0)
  if (sheetNames.length === 0) {
    throw new Error(`No data found in "${file.name}".`)
  }

  return {
    fileName: file.name,
    fileId: `local:${file.name}:${file.size}:${file.lastModified}`,
    sheets: Object.fromEntries(sheetNames.map(n => [n, sheets[n]])),
    sheetNames,
  }
}
