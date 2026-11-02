import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import '@fontsource-variable/literata'
import { PoemWork } from '@/components/poem-work'
import { invitations, isBundledPoem, type Invitation } from '@/lib/invitations'
import { dailyInvitation } from '@/lib/daily'
import { journalId } from '@/lib/journal'
import { JournalScreen, PhotoImage, useWalkJournal } from '@/components/journal-ui'
import { useDeckGesture } from '@/hooks/use-deck-gesture'
import { useDeckTransition } from '@/hooks/use-deck-transition'
import { useNativeNavigation } from '@/hooks/use-native-navigation'
import './journal.css'
import './walk-app.css'

type Panel = 'poem' | 'guidance' | 'reflection'
type IconName =
  | 'leaf'
  | 'book'
  | 'walk'
  | 'close'
  | 'shuffle'
  | 'camera'
  | 'check'
const paths: Record<IconName, ReactNode> = {
  leaf: (
    <>
      <path d="M19 4C10 3 4 7 5 13s9 8 12 2c2-3 2-7 2-11Z" />
      <path d="M4 21 15 10" />
    </>
  ),
  book: (
    <>
      <path d="M5 3h12a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
      <path d="M3 17h16M8 7h6M8 10h5" />
    </>
  ),
  walk: (
    <>
      <path d="M18 8L22 12L18 16" />
      <path d="M2 12H22" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  shuffle: (
    <>
      <path d="M4 6h3c4 0 6 12 10 12h3M4 18h3c1 0 2-1 3-3m4-6c1-2 2-3 3-3h3" />
      <path d="m17 3 3 3-3 3m0 6 3 3-3 3" />
    </>
  ),
  camera: (
    <>
      <path d="M8 5h8l2 3h3v12H3V8h3Z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
}

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="app-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function invitationIndex(id: string) {
  return Math.max(
    0,
    invitations.findIndex((item) => item.id === id),
  )
}

function useModel(dailyInvitationId: string) {
  const journal = useWalkJournal()
  const [index, setIndex] = useState(() => invitationIndex(dailyInvitationId))
  const [panel, setPanel] = useState<Panel>('guidance')
  useEffect(() => {
    setIndex(invitationIndex(dailyInvitationId))
  }, [dailyInvitationId])
  const selected = journal.view === 'walk' && !!journal.active
  const screen: Panel = selected ? panel : 'poem'
  const reading = journal.view === 'invitation' || selected
  const invitation = selected ? journal.active!.invitation : invitations[index]
  function next(offset = 1) {
    if (journal.busy) return
    if (selected) journal.show('invitation')
    setIndex(
      (current) => (current + offset + invitations.length) % invitations.length,
    )
    window.scrollTo({ top: 0 })
  }
  function browse() {
    setPanel('guidance')
    journal.show('invitation')
  }
  function primary(commit?: (update: () => void) => void | Promise<void>) {
    setPanel('guidance')
    void journal.take(invitation, commit)
  }
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [journal.view])
  return {
    journal,
    index,
    invitation,
    screen,
    selected,
    reading,
    panel,
    setPanel,
    next,
    browse,
    primary,
  }
}
type Model = ReturnType<typeof useModel>

function ErrorLine({ model }: { model: Model }) {
  return model.journal.error ? (
    <p className="app-error" role="alert">
      {model.journal.error}
    </p>
  ) : null
}

function Verse({ invitation }: { invitation: Invitation }) {
  return (
    <section className="app-verse" aria-label="Poem">
      <div className="app-work-heading">
        <h1>{invitation.title}</h1>
        <p>
          {invitation.source?.kind === 'poetry' ? invitation.source.author : ''}
        </p>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {isBundledPoem(invitation.source) && (
          <PoemWork key={invitation.id} poem={invitation.source} />
        )}
      </div>
    </section>
  )
}

function ScrollingVerse({ invitation }: { invitation: Invitation }) {
  const frame = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = frame.current!
    element.scrollTop = 0
    function paintFades() {
      const { scrollTop, scrollHeight, clientHeight } = element
      const remaining = Math.floor(scrollHeight - clientHeight - scrollTop)
      element.style.setProperty(
        '--poem-fade-top',
        `${Math.min(scrollTop, 32)}px`,
      )
      element.style.setProperty(
        '--poem-fade-bottom',
        `${Math.max(0, Math.min(remaining, 56))}px`,
      )
    }
    paintFades()
    element.addEventListener('scroll', paintFades, { passive: true })
    const resize = new ResizeObserver(paintFades)
    resize.observe(element)
    resize.observe(element.firstElementChild!)
    return () => {
      element.removeEventListener('scroll', paintFades)
      resize.disconnect()
    }
  }, [invitation.id])
  return (
    <div className="app-poem-frame" ref={frame}>
      <Verse invitation={invitation} />
    </div>
  )
}

function Guidance({ model }: { model: Model }) {
  return (
    <section className="app-guidance">
      <h1>For your walk</h1>
      <p className="app-introduction">{model.invitation.introduction}</p>
      <ul>
        {model.invitation.reflections.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </section>
  )
}

function Reflection({ model }: { model: Model }) {
  const { journal } = model
  return (
    <section className="app-return">
      <h1>After your walk</h1>
      <form id="app-reflection-form" onSubmit={journal.finish}>
        <label htmlFor="app-notes">
          Your thoughts <span>(optional)</span>
        </label>
        <textarea
          id="app-notes"
          rows={5}
          value={journal.notes}
          disabled={journal.busy}
          onChange={(event) => journal.setNotes(event.target.value)}
          placeholder="What stayed with you?"
        />
        <label className="app-photo-add">
          <Icon name="camera" />
          <span>Add pictures</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={journal.busy}
            onChange={(event) => {
              const selected = Array.from(
                event.currentTarget.files ?? [],
              ).filter((file) => file.type.startsWith('image/'))
              journal.setPhotos((previous) => [
                ...previous,
                ...selected.map((file) => ({
                  id: journalId(),
                  name: file.name,
                  blob: file,
                })),
              ])
              event.currentTarget.value = ''
            }}
          />
        </label>
        {journal.photos.length > 0 && (
          <div className="app-photo-drafts">
            {journal.photos.map((photo) => (
              <figure key={photo.id}>
                <PhotoImage photo={photo} />
                <button
                  type="button"
                  disabled={journal.busy}
                  aria-label={`Remove ${photo.name}`}
                  onClick={() =>
                    journal.setPhotos((previous) =>
                      previous.filter((item) => item.id !== photo.id),
                    )
                  }
                >
                  <Icon name="close" />
                </button>
              </figure>
            ))}
          </div>
        )}
      </form>
    </section>
  )
}

function Content({ model }: { model: Model }) {
  return (
    <>
      <ErrorLine model={model} />
      {model.screen === 'poem' ? (
        <Verse invitation={model.invitation} />
      ) : model.screen === 'guidance' ? (
        <Guidance model={model} />
      ) : (
        <Reflection model={model} />
      )}
    </>
  )
}

function Primary({ model }: { model: Model }) {
  const saving = model.journal.busy
  const saveable = model.screen === 'reflection'
  return (
    <button
      className="app-primary"
      data-action="primary"
      disabled={saving || model.journal.loading}
      form={saveable ? 'app-reflection-form' : undefined}
      type={saveable ? 'submit' : 'button'}
      onClick={
        saveable
          ? undefined
          : (event) => {
              event.preventDefault()
              model.primary()
            }
      }
    >
      <span>
        {saveable
          ? saving
            ? 'Saving…'
            : 'Save walk'
          : saving
            ? 'Taking it with you…'
            : 'Take this on a walk'}
      </span>
      <Icon name={saveable ? 'check' : 'walk'} />
    </button>
  )
}

function History({ model }: { model: Model }) {
  return (
    <button
      className="app-history"
      aria-label="My walks"
      disabled={model.journal.busy}
      onClick={() => model.journal.show('calendar')}
    >
      <Icon name="book" />
      <span>My walks</span>
    </button>
  )
}

function Header({ model }: { model: Model }) {
  return (
    <header className="app-top">
      <button
        className="app-brand"
        onClick={model.browse}
        disabled={model.journal.busy}
      >
        <Icon name="leaf" />
        <span>
          Before<br />you go.
        </span>
      </button>
      <History model={model} />
    </header>
  )
}

function Journal({ model }: { model: Model }) {
  return (
    <div className="app-journal">
      <ErrorLine model={model} />
      <JournalScreen journal={model.journal} />
    </div>
  )
}

function StageNavigation({
  model,
  onNavigate,
}: {
  model: Model
  onNavigate: (panel: Panel) => void
}) {
  const stages: { panel: Panel; label: string }[] = [
    { panel: 'poem', label: 'Poem' },
    { panel: 'guidance', label: 'Walk' },
    { panel: 'reflection', label: 'After' },
  ]
  return (
    <nav className="app-stage-nav" aria-label="Invitation stages">
      <span className="app-stage-pill" aria-hidden="true" />
      {stages.map((stage) => (
        <button
          key={stage.panel}
          aria-current={model.screen === stage.panel ? 'step' : undefined}
          disabled={
            model.journal.busy || (!model.selected && stage.panel !== 'poem')
          }
          onClick={() => onNavigate(stage.panel)}
        >
          {stage.label}
        </button>
      ))}
    </nav>
  )
}

function BackToPoemPicker({ model }: { model: Model }) {
  return (
    <div className="app-card-actions">
      <button
        className="app-text-button"
        onClick={model.browse}
        disabled={model.journal.busy}
      >
        <Icon name="shuffle" />
        <span>Something else</span>
      </button>
    </div>
  )
}

function DeckPreview({ model }: { model: Model }) {
  return (
    <>
      {model.screen === 'reflection' ? (
        <section className="app-return">
          <h1>After your walk</h1>
          <div className="app-reflection-preview">
            <span>
              Your thoughts <span>(optional)</span>
            </span>
            <div className="app-notes-preview" data-empty={!model.journal.notes}>
              {model.journal.notes || 'What stayed with you?'}
            </div>
            <div className="app-photo-add">
              <Icon name="camera" />
              <span>Add pictures</span>
            </div>
            {model.journal.photos.length > 0 && (
              <div className="app-photo-drafts">
                {model.journal.photos.map(photo => (
                  <figure key={photo.id}>
                    <PhotoImage photo={photo} />
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : model.screen === 'poem' ? (
        model.selected ? (
          <Verse invitation={model.invitation} />
        ) : (
          <ScrollingVerse invitation={model.invitation} />
        )
      ) : (
        <Guidance model={model} />
      )}
      {model.screen === 'reflection' && (
        <div className="app-card-actions">
          <div className="app-primary">
            <span>Save walk</span>
            <Icon name="check" />
          </div>
        </div>
      )}
      {model.screen === 'poem' && model.selected && (
        <BackToPoemPicker model={model} />
      )}
    </>
  )
}

function PocketDeck({ model }: { model: Model }) {
  const panels: Panel[] = ['poem', 'guidance', 'reflection']
  const [destination, setDestination] = useState<Panel>()
  const navigation = useRef<HTMLDivElement>(null)
  const transition = useDeckTransition()
  const screenModel = {
    ...model,
    journal: { ...model.journal, busy: model.journal.busy || transition.busy },
    primary: () => model.primary(update => transition.run('forward', update)),
    browse: () => {
      if (model.selected) void transition.run('backward', model.browse)
      else model.browse()
    },
  }
  const position = panels.indexOf(model.screen)
  const gesture = useDeckGesture({
    identity: `${model.journal.view}/${model.screen}/${model.invitation.id}`,
    enabled: model.reading && !screenModel.journal.busy && !model.journal.loading,
    browsing: !model.selected,
    canMove: direction => !model.selected || !!panels[position + direction],
    onMove: direction => {
      if (model.selected)
        model.setPanel(destination ?? panels[position + direction])
      else model.next(direction)
      setDestination(undefined)
    },
    onProgress: (progress, settling) => {
      const dock = navigation.current
      if (!dock) return
      const steps = destination
        ? Math.abs(panels.indexOf(destination) - position)
        : 1
      const pillPosition = Math.max(
        0,
        Math.min(panels.length - 1, position + progress * steps),
      )
      dock.dataset.settling = String(settling)
      dock.style.setProperty('--stage-position', String(pillPosition))
    },
  })
  useLayoutEffect(() => {
    if (destination) gesture.turn(panels.indexOf(destination) > position ? 1 : -1)
  }, [destination])
  return (
    <div
      className="app-deck"
      data-picking={model.reading && !model.selected}
      data-transition={transition.phase}
      ref={transition.root}
    >
      <Header model={screenModel} />
      {model.reading ? (
        <main className="app-deck-main" ref={gesture.surface}>
          <div
            className="app-card-stack"
            ref={gesture.stack}
            data-mode={model.selected ? 'pages' : 'browse'}
          >
            {([-1, 1] as const).map(direction => {
              const screen = model.selected
                ? (destination ?? panels[position + direction])
                : 'poem'
              if (!screen) return null
              const invitation = model.selected
                ? model.invitation
                : invitations[
                    (model.index + direction + invitations.length) %
                      invitations.length
                  ]
              return (
                <div
                  key={direction}
                  className="app-card app-card-preview"
                  data-side={direction === 1 ? 'next' : 'previous'}
                  aria-hidden="true"
                  inert
                >
                  <DeckPreview model={{ ...model, screen, invitation }} />
                </div>
              )
            })}
            <div className="app-card app-card-current">
              {model.selected ? (
                <Content model={model} />
              ) : (
                <ScrollingVerse invitation={model.invitation} />
              )}
              {model.screen === 'reflection' && (
                <div className="app-card-actions">
                  <Primary model={screenModel} />
                </div>
              )}
              {model.screen === 'poem' && model.selected && (
                <BackToPoemPicker model={screenModel} />
              )}
            </div>
          </div>
          {!model.selected && (
            <>
              <ErrorLine model={model} />
              <div className="app-picker-actions">
                <Primary model={screenModel} />
                <button
                  className="app-shuffle"
                  aria-label="Something else"
                  onClick={() => gesture.turn(1)}
                  disabled={screenModel.journal.busy || model.journal.loading}
                >
                  <Icon name="shuffle" />
                </button>
              </div>
            </>
          )}
        </main>
      ) : (
        <Journal model={model} />
      )}
      {model.reading && model.selected && (
        <div
          className="app-deck-dock"
          ref={navigation}
          style={{ '--stage-position': position } as CSSProperties}
        >
          <StageNavigation
            model={screenModel}
            onNavigate={panel => {
              if (panel === model.screen) return
              setDestination(panel)
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function WalkApp({ day }: { day: number }) {
  const model = useModel(dailyInvitation(day).id)
  const lastScreen = useRef(`${model.journal.view}/${model.screen}`)
  useNativeNavigation(() => {
    if (
      model.journal.busy ||
      model.journal.loading ||
      document.querySelector(
        '.app-deck:not([data-transition="idle"]), .app-card-stack[data-gesture="settling"]',
      )
    ) return true
    if (document.querySelector('[role="dialog"]')) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      return true
    }
    if (model.journal.view === 'day') model.journal.show('calendar')
    else if (model.journal.view === 'calendar')
      model.journal.show(model.journal.active ? 'walk' : 'invitation')
    else if (model.selected && model.screen === 'reflection') model.setPanel('guidance')
    else if (model.selected && model.screen === 'guidance') model.setPanel('poem')
    else if (model.selected) model.browse()
    else return false
    return true
  })

  useEffect(() => {
    document.title = 'Before You Go'
  }, [])
  useEffect(() => {
    const current = `${model.journal.view}/${model.screen}`
    if (lastScreen.current === current) return
    lastScreen.current = current
    const main = document.querySelector<HTMLElement>('.app-shell main')
    main?.setAttribute('tabindex', '-1')
    main?.focus({ preventScroll: true })
  }, [model.journal.view, model.screen])

  return (
    <div className="app-host">
      <div className="app-shell">
        <PocketDeck model={model} />
      </div>
    </div>
  )
}
