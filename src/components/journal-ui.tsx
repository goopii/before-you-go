import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PoemWork } from '@/components/poem-work'
import {
  journalId,
  localDate,
  monthDays,
  readWalks,
  saveWalk,
  type WalkPhoto,
  type WalkRecord,
} from '@/lib/journal'
import { isBundledPoem, type Invitation } from '@/lib/invitations'

type View = 'invitation' | 'walk' | 'calendar' | 'day'

export function useWalkJournal() {
  const [view, setView] = useState<View>('invitation')
  const [walks, setWalks] = useState<WalkRecord[]>([])
  const [active, setActive] = useState<WalkRecord>()
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<WalkPhoto[]>([])
  const [selectedDate, setSelectedDate] = useState(localDate)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const writing = useRef(false)

  useEffect(() => {
    let cancelled = false
    readWalks()
      .then((records) => {
        if (cancelled) return
        setWalks(records)
        const unfinished = records.find((walk) => !walk.completedAt)
        if (unfinished) {
          setActive(unfinished)
          setNotes(unfinished.notes)
          setPhotos(unfinished.photos)
          setView((current) => (current === 'invitation' ? 'walk' : current))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError('Your saved walks couldn’t load. Try reloading this page.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function show(next: View) {
    setView(next)
    window.scrollTo({ top: 0 })
  }

  function remember(record: WalkRecord) {
    setWalks((previous) => [
      record,
      ...previous.filter((walk) => walk.id !== record.id),
    ])
  }

  async function take(
    invitation: Invitation,
    commit?: (update: () => void) => void | Promise<void>,
  ) {
    if (writing.current || loading) return
    writing.current = true
    setBusy(true)
    setError('')
    try {
      const walk: WalkRecord = {
        id: active?.id ?? journalId(),
        date: localDate(),
        invitation,
        prompt: invitation.title,
        reflectionPrompt: invitation.introduction,
        startedAt: new Date().toISOString(),
        notes: '',
        photos: [],
      }
      await saveWalk(walk)
      remember(walk)
      const openWalk = () => {
        setActive(walk)
        setNotes('')
        setPhotos([])
        show('walk')
      }
      if (commit) await commit(openWalk)
      else openWalk()
    } catch {
      setError('This invitation couldn’t be saved on this device. Try again.')
    } finally {
      writing.current = false
      setBusy(false)
    }
  }

  async function finish(event: FormEvent) {
    event.preventDefault()
    if (!active || writing.current || loading) return
    writing.current = true
    setBusy(true)
    setError('')
    try {
      const record = {
        ...active,
        notes,
        photos,
        completedAt: new Date().toISOString(),
      }
      await saveWalk(record)
      remember(record)
      setSelectedDate(record.date)
      setActive(undefined)
      show('calendar')
    } catch {
      setError(
        'Your walk couldn’t be saved. Your thoughts and pictures are still here; please try again.',
      )
    } finally {
      writing.current = false
      setBusy(false)
    }
  }

  return {
    view,
    show,
    walks,
    active,
    notes,
    setNotes,
    photos,
    setPhotos,
    selectedDate,
    setSelectedDate,
    loading,
    busy,
    error,
    take,
    finish,
  }
}

export type Journal = ReturnType<typeof useWalkJournal>

function readableDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', options)
}

export function PhotoImage({
  photo,
  className = '',
  decorative = false,
}: {
  photo: WalkPhoto
  className?: string
  decorative?: boolean
}) {
  const [url, setUrl] = useState<string>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const next = URL.createObjectURL(photo.blob)
    setUrl(next)
    setFailed(false)
    return () => URL.revokeObjectURL(next)
  }, [photo.blob])
  if (failed)
    return decorative ? null : (
      <span className="photo-unavailable">Preview unavailable</span>
    )
  return url ? (
    <img
      className={className}
      src={url}
      alt={decorative ? '' : photo.name}
      onError={() => setFailed(true)}
    />
  ) : null
}

function InvitationPassage({ invitation }: { invitation: Invitation }) {
  return (
    <section className="poem-passage" aria-label="For your walk">
      <p className="poem-introduction">{invitation.introduction}</p>
      <ol className="poem-questions">
        {invitation.reflections.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ol>
    </section>
  )
}

function Calendar({ journal }: { journal: Journal }) {
  const loggedWalks = journal.walks.filter((walk) => walk.completedAt)
  const [month, setMonth] = useState(journal.selectedDate.slice(0, 7))
  const monthDate = new Date(`${month}-01T12:00:00`)
  const days = monthDays(month)
  function move(offset: number) {
    setMonth(
      localDate(
        new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1),
      ).slice(0, 7),
    )
  }
  return (
    <main className="journal-page calendar-page">
      <h1>My walks</h1>
      <div className="calendar-heading">
        <button aria-label="Previous month" onClick={() => move(-1)}>
          ‹
        </button>
        <h2>
          {monthDate.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <button aria-label="Next month" onClick={() => move(1)}>
          ›
        </button>
      </div>
      <div className="walk-calendar">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <span className="calendar-weekday" key={index} aria-hidden="true">
            {day}
          </span>
        ))}
        {days.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />
          const records = loggedWalks.filter((walk) => walk.date === date)
          const photo = records.flatMap((walk) => walk.photos)[0]
          return records.length ? (
            <button
              key={date}
              className={`calendar-day has-walk ${photo ? 'has-photo' : ''}`}
              aria-label={`Walks on ${readableDate(date)}`}
              onClick={() => {
                journal.setSelectedDate(date)
                journal.show('day')
              }}
            >
              {photo && <PhotoImage photo={photo} decorative />}
              <span>{Number(date.slice(-2))}</span>
              <i aria-hidden="true" />
            </button>
          ) : (
            <span
              className={`calendar-day ${date === localDate() ? 'is-today' : ''}`}
              key={date}
            >
              {Number(date.slice(-2))}
            </span>
          )
        })}
      </div>
      {(journal.active || loggedWalks.length === 0) && (
        <div className="journal-empty">
          <button
            className="journal-primary"
            onClick={() => journal.show(journal.active ? 'walk' : 'invitation')}
          >
            {journal.active ? 'Return to your walk' : 'Find an invitation'}
          </button>
        </div>
      )}
    </main>
  )
}

function SavedWalkCard({ walk }: { walk: WalkRecord }) {
  const [reading, setReading] = useState(false)
  const source = walk.invitation.source
  const title = source?.kind === 'poetry' ? source.title : walk.invitation.title
  const started = new Date(walk.startedAt)
  const time = Number.isNaN(started.getTime())
    ? undefined
    : started.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const headingId = `saved-walk-${walk.id}`
  return (
    <article className="saved-walk saved-walk-card" aria-labelledby={headingId}>
      <header className="saved-walk-heading">
        <div>
          <h2 id={headingId}>{title}</h2>
          {source?.kind === 'poetry' && <p>{source.author}</p>}
        </div>
        {time && <time dateTime={walk.startedAt}>{time}</time>}
      </header>
      <section className="saved-walk-memory" aria-label="Your walk">
        <div className="saved-reflection">
          <h3>Your reflection</h3>
          {walk.notes.trim() ? (
            <p>{walk.notes.trim()}</p>
          ) : (
            <p className="saved-reflection-empty">No reflection added.</p>
          )}
        </div>
        {walk.photos.length > 0 && (
          <section className="saved-walk-photos" aria-label="Photos">
            <h3>Photos</h3>
            <div className="saved-photos" data-single={walk.photos.length === 1}>
              {walk.photos.map(photo => (
                <PhotoImage key={photo.id} photo={photo} />
              ))}
            </div>
          </section>
        )}
      </section>
      <details
        className="saved-walk-reading"
        onToggle={event => setReading(event.currentTarget.open)}
      >
        <summary>
          <span>
            {isBundledPoem(source) ? 'Poem and invitation' : 'Your invitation'}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        {reading && (
          <div className="saved-walk-reading-body">
            {isBundledPoem(source) && (
              <section className="saved-walk-source" aria-label="Poem">
                <h3>Poem</h3>
                <PoemWork poem={source} />
              </section>
            )}
            <div className="saved-walk-passage">
              <h3>For your walk</h3>
              {isBundledPoem(source) ? (
                <InvitationPassage invitation={walk.invitation} />
              ) : (
                <>
                  {walk.prompt !== title && <p>{walk.prompt}</p>}
                  <p>{walk.reflectionPrompt}</p>
                </>
              )}
            </div>
          </div>
        )}
      </details>
    </article>
  )
}

function WalkDay({ journal }: { journal: Journal }) {
  const entries = journal.walks.filter(
    (walk) => walk.date === journal.selectedDate && walk.completedAt,
  )
  return (
    <main className="journal-page day-page">
      <header className="saved-day-heading">
        <h1>{readableDate(journal.selectedDate)}</h1>
        <div className="saved-day-meta">
          <p>{readableDate(journal.selectedDate, { weekday: 'long' })}</p>
          <p>
            {entries.length} {entries.length === 1 ? 'walk' : 'walks'}
          </p>
        </div>
      </header>
      <div className="saved-walk-list">
        {entries.length ? (
          entries.map(walk => <SavedWalkCard key={walk.id} walk={walk} />)
        ) : (
          <p className="journal-muted">No walks saved for this day.</p>
        )}
      </div>
    </main>
  )
}

export function JournalScreen({ journal }: { journal: Journal }) {
  if (journal.view === 'calendar') return <Calendar journal={journal} />
  if (journal.view === 'day') return <WalkDay journal={journal} />
  return null
}
