import { invitations } from './invitations.ts'

const millisecondsPerDay = 86_400_000
const firstDay = Date.UTC(2026, 9, 6) / millisecondsPerDay

export function calendarDay(date = new Date()): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / millisecondsPerDay
}

export function dailyInvitation(day: number) {
  const index = (((day - firstDay) % invitations.length) + invitations.length) % invitations.length
  return invitations[index]
}
