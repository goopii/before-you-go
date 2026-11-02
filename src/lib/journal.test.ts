import test from 'node:test'
import assert from 'node:assert/strict'
import { journalId, localDate, monthDays } from './journal.ts'

test('walk and photo ids work without the secure-context-only randomUUID API', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!
  const browserCrypto = globalThis.crypto
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      getRandomValues: browserCrypto.getRandomValues.bind(browserCrypto),
    },
  })
  try {
    assert.equal(typeof crypto.randomUUID, 'undefined')
    const walkId = journalId()
    const photoId = journalId()
    assert.ok(walkId.length > 0)
    assert.ok(photoId.length > 0)
    assert.notEqual(walkId, photoId)
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor)
  }
})

test('journal dates use local calendar fields, including month boundaries', () => {
  assert.equal(localDate(new Date(2026, 9, 25, 0, 1)), '2026-10-25')
  assert.equal(localDate(new Date(2026, 11, 31, 23, 59)), '2026-12-31')
})

test('calendar starts on Monday and includes each day once, including leap day', () => {
  const leap = monthDays('2024-02')
  assert.deepEqual(leap.slice(0, 4), [null, null, null, '2024-02-01'])
  assert.equal(leap.at(-1), '2024-02-29')
  assert.equal(new Set(leap.filter(Boolean)).size, 29)
  assert.equal(monthDays('2026-06')[0], '2026-06-01')
})
