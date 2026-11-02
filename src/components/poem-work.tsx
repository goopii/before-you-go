import { Fragment, useEffect, useId, useState } from 'react'
import { Popover } from 'radix-ui'
import { loadDefinition, type Definition } from '@/lib/dictionary'
import type { Poem, PoemWord } from '@/lib/invitations'
import './poem-work.css'

type LookupState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; definition: Definition }

function DictionaryWord({
  word,
  children,
}: {
  word: PoemWord
  children: string
}) {
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LookupState>({ status: 'loading' })
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    setState({ status: 'loading' })
    loadDefinition(word, controller.signal)
      .then((definition) => {
        if (active) setState({ status: 'ready', definition })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })
      .finally(() => clearTimeout(timeout))
    return () => {
      active = false
      controller.abort()
      clearTimeout(timeout)
    }
  }, [open, word, attempt])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="poem-word"
          type="button"
          aria-label={`Define ${children}`}
        >
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="dictionary-popover"
          side="bottom"
          align="start"
          sideOffset={10}
          collisionPadding={16}
          aria-labelledby={titleId}
        >
          <div className="dictionary-heading">
            <h2 id={titleId}>{children}</h2>
            <Popover.Close
              className="dictionary-close"
              aria-label="Close definition"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M6 18 18 6" strokeLinecap="round" />
              </svg>
            </Popover.Close>
          </div>
          <p className="dictionary-form">
            {word.lookup !== children.toLowerCase() ? `${word.lookup} ` : ''}
            <span>{word.partOfSpeech}</span>
          </p>
          <div className="dictionary-body" role="status" aria-live="polite">
            {state.status === 'loading' ? (
              <p>Looking up the word…</p>
            ) : state.status === 'error' ? (
              <>
                <p>
                  The definition couldn’t load. Check your connection and try
                  again.
                </p>
                <button
                  type="button"
                  className="dictionary-retry"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <p>{state.definition.text}</p>
                <footer>
                  <a
                    href={state.definition.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Wiktionary
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <a
                    href="https://freedictionaryapi.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    FreeDictionaryAPI.com
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {state.definition.license && (
                    <a
                      href={state.definition.license.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {state.definition.license.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </footer>
              </>
            )}
          </div>
          <Popover.Arrow className="dictionary-arrow" width={16} height={8} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function PoemLine({ line, words }: { line: string; words: PoemWord[] }) {
  return (
    <>
      {line.split(/([\p{L}]+(?:['’][\p{L}]+)?)/u).map((part, index) => {
        const word = words.find(
          (item) => item.word.toLowerCase() === part.toLowerCase(),
        )
        return word ? (
          <DictionaryWord key={index} word={word}>
            {part}
          </DictionaryWord>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      })}
    </>
  )
}

export function PoemWork({ poem }: { poem: Poem }) {
  const stanzas = poem.lines.join('\n').split(/\n\s*\n/)
  return (
    <figure
      className="poem-work"
      aria-label={`${poem.title}, by ${poem.author}`}
    >
      <blockquote className="poem-sheet">
        {stanzas.map((stanza, index) => (
          <p className="poem-stanza" key={index}>
            {stanza.split('\n').map((line, number) => (
              <span className="poem-line" key={number}>
                <PoemLine line={line} words={poem.words ?? []} />
              </span>
            ))}
          </p>
        ))}
      </blockquote>
      <figcaption className="poem-attribution">
        <p className="poem-title">{poem.title}</p>
        <p>{poem.author}</p>
        <a href={poem.url} target="_blank" rel="noreferrer">
          Poem source<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </figcaption>
    </figure>
  )
}
