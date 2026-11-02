import { useEffect, useState } from 'react'
import { calendarDay } from '@/lib/daily'
import WalkApp from './components/walk-app'

export default function App() {
  const [day, setDay] = useState(calendarDay)

  useEffect(() => {
    const refresh = () => setDay(calendarDay())
    const interval = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return <WalkApp day={day} />
}
