import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarDay, dailyInvitation } from './daily.ts'
import { invitations } from './invitations.ts'

test('one calendar date gives the same invitation at different times of day', () => {
  const morning = calendarDay(new Date(2026, 9, 6, 0, 1))
  const evening = calendarDay(new Date(2026, 9, 6, 23, 59))
  assert.deepEqual(dailyInvitation(morning), dailyInvitation(evening))
  assert.equal(dailyInvitation(morning).id, 'fog')
})

test('the daily rotation visits every invitation before repeating', () => {
  const first = calendarDay(new Date(2026, 9, 6))
  for (let offset = -20; offset < 20; offset++) {
    const day = first + offset
    const cycle = invitations.map((_, index) => dailyInvitation(day + index).id)
    assert.equal(new Set(cycle).size, invitations.length)
    assert.equal(dailyInvitation(day + invitations.length).id, cycle[0])
  }
})

test('calendar days advance by one across daylight-saving and month boundaries', () => {
  for (const [before, after] of [
    [new Date(2026, 2, 28, 12), new Date(2026, 2, 29, 12)],
    [new Date(2026, 9, 24, 12), new Date(2026, 9, 25, 12)],
    [new Date(2026, 11, 31, 12), new Date(2027, 0, 1, 12)],
  ])
    assert.equal(calendarDay(after) - calendarDay(before), 1)
})
