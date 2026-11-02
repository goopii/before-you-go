import type { PoemWord } from './invitations.ts'

export type Definition = {
  text: string
  partOfSpeech: string
  sourceUrl: string
  license?: { name: string; url: string }
}

const definitions = new Map<string, Definition>()

function httpsUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('https://')
}

export async function loadDefinition(
  word: PoemWord,
  signal: AbortSignal,
): Promise<Definition> {
  const key = `${word.lookup}:${word.partOfSpeech}:${word.sense}`
  const cached = definitions.get(key)
  if (cached) return cached

  const response = await fetch(
    `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word.lookup)}`,
    { signal },
  )
  if (!response.ok) throw new Error('The definition could not load')
  const result: unknown = await response.json()
  if (
    typeof result !== 'object' ||
    result === null ||
    !('entries' in result) ||
    !Array.isArray(result.entries)
  ) {
    throw new Error('No dictionary entry was returned')
  }
  const source =
    'source' in result &&
    typeof result.source === 'object' &&
    result.source !== null
      ? (result.source as {
          url?: unknown
          license?: { name?: unknown; url?: unknown }
        })
      : undefined

  for (const entry of result.entries) {
    if (
      entry?.partOfSpeech !== word.partOfSpeech ||
      !Array.isArray(entry.senses)
    )
      continue
    const match = entry.senses.find(
      (item: { definition?: unknown } | null) =>
        typeof item?.definition === 'string' &&
        new RegExp(word.sense, 'i').test(item.definition),
    )
    if (!match) continue
    const license = source?.license
    const definition: Definition = {
      text: match.definition,
      partOfSpeech: word.partOfSpeech,
      sourceUrl: httpsUrl(source?.url)
        ? source.url
        : `https://en.wiktionary.org/wiki/${encodeURIComponent(word.lookup)}`,
      ...(typeof license?.name === 'string' && httpsUrl(license?.url)
        ? { license: { name: license.name, url: license.url } }
        : {}),
    }
    if (signal.aborted) throw new DOMException('Lookup cancelled', 'AbortError')
    definitions.set(key, definition)
    return definition
  }
  throw new Error('A definition for this use of the word was not returned')
}
