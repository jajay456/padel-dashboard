import { collection, addDoc, query, orderBy, where, getDocs, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { RawRow } from '../types'

export async function saveSheetUpload(
  email: string,
  sheetId: string,
  sheetName: string,
  tab: string,
  rows: RawRow[],
): Promise<void> {
  await addDoc(collection(db, 'uploads'), {
    email,
    sheetId,
    sheetName,
    tab,
    rowCount: rows.length,
    rows,
    uploadedAt: serverTimestamp(),
  })
}

/** Every row from every upload record, across all sheets, combined into one array. */
export async function getAllUploadRows(): Promise<RawRow[]> {
  const snap = await getDocs(collection(db, 'uploads'))
  const all: RawRow[] = []
  for (const d of snap.docs) {
    const data = d.data()
    if (Array.isArray(data.rows)) all.push(...(data.rows as RawRow[]))
  }
  return all
}

/**
 * Deletes every upload record whose uploadedAt falls within the given
 * year (whole year), year+month (whole month), or year+month+day (single day).
 * Returns the number of deleted records.
 */
export async function deleteUploadsByDate(
  year: number,
  month?: number,
  day?: number,
): Promise<number> {
  let start: Date
  let end: Date
  if (month != null && day != null) {
    start = new Date(year, month - 1, day)
    end = new Date(year, month - 1, day + 1)
  } else if (month != null) {
    start = new Date(year, month - 1, 1)
    end = new Date(year, month, 1)
  } else {
    start = new Date(year, 0, 1)
    end = new Date(year + 1, 0, 1)
  }

  const q = query(
    collection(db, 'uploads'),
    where('uploadedAt', '>=', Timestamp.fromDate(start)),
    where('uploadedAt', '<', Timestamp.fromDate(end)),
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'uploads', d.id))))
  return snap.size
}

export interface UploadedSheet {
  sheetId: string
  sheetName: string
}

/** Distinct list of sheets that have ever been uploaded, most recent first. */
export async function getUploadedSheets(): Promise<UploadedSheet[]> {
  const snap = await getDocs(query(collection(db, 'uploads'), orderBy('uploadedAt', 'desc')))
  const seen = new Map<string, string>()
  for (const d of snap.docs) {
    const data = d.data()
    if (!seen.has(data.sheetId)) seen.set(data.sheetId, data.sheetName)
  }
  return Array.from(seen, ([sheetId, sheetName]) => ({ sheetId, sheetName }))
}

/** Deletes every upload record for the given sheetId. Returns the number deleted. */
export async function deleteUploadsBySheet(sheetId: string): Promise<number> {
  const q = query(collection(db, 'uploads'), where('sheetId', '==', sheetId))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'uploads', d.id))))
  return snap.size
}
