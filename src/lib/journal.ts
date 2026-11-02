import type { Invitation } from './invitations.ts'

export type WalkPhoto = { id: string; name: string; blob: Blob }
export type WalkRecord = {
  id: string
  date: string
  invitation: Invitation
  prompt: string
  reflectionPrompt: string
  startedAt: string
  completedAt?: string
  notes: string
  photos: WalkPhoto[]
}

let database: Promise<IDBDatabase> | undefined

export function journalId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function openJournal() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('before-you-go-journal', 1)
    request.onupgradeneeded = () =>
      request.result.createObjectStore('walks', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      database = undefined
      reject(request.error)
    }
  })
  return database
}

export async function readWalks(): Promise<WalkRecord[]> {
  const db = await openJournal()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('walks', 'readonly')
    const request = transaction.objectStore('walks').getAll()
    transaction.oncomplete = () =>
      resolve(
        (request.result as WalkRecord[]).sort((a, b) =>
          b.startedAt.localeCompare(a.startedAt),
        ),
      )
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function saveWalk(walk: WalkRecord): Promise<void> {
  const db = await openJournal()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('walks', 'readwrite')
    transaction.objectStore('walks').put(walk)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthDays(month: string): (string | null)[] {
  const [year, number] = month.split('-').map(Number)
  const first = new Date(year, number - 1, 1)
  const leading = (first.getDay() + 6) % 7
  const count = new Date(year, number, 0).getDate()
  return [
    ...Array<null>(leading).fill(null),
    ...Array.from(
      { length: count },
      (_, day) => `${month}-${String(day + 1).padStart(2, '0')}`,
    ),
  ]
}
