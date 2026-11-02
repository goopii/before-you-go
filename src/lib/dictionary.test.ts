import test from 'node:test'
import assert from 'node:assert/strict'
import { loadDefinition } from './dictionary.ts'

test('an older spelling requests the canonical word, selects its sense and reuses the fetched definition', async (t) => {
  const word = {
    word: 'revery',
    lookup: 'reverie',
    partOfSpeech: 'noun',
    sense: 'daydream',
  }
  const signal = new AbortController().signal
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (url: unknown, options?: RequestInit) => {
      assert.equal(
        url,
        'https://freedictionaryapi.com/api/v1/entries/en/reverie',
      )
      assert.equal(options?.signal, signal)
      return Response.json({
        entries: [
          {
            partOfSpeech: 'noun',
            senses: [
              { definition: 'A caper, a frolic; merriment.' },
              { definition: 'A state of dreaming while awake; daydream.' },
            ],
          },
        ],
        source: {
          url: 'https://en.wiktionary.org/wiki/reverie',
          license: {
            name: 'CC BY-SA 4.0',
            url: 'https://creativecommons.org/licenses/by-sa/4.0/',
          },
        },
      })
    },
  )
  const definition = await loadDefinition(word, signal)
  assert.equal(definition.text, 'A state of dreaming while awake; daydream.')
  assert.equal(definition.sourceUrl, 'https://en.wiktionary.org/wiki/reverie')
  assert.equal(definition.license?.name, 'CC BY-SA 4.0')
  assert.deepEqual(await loadDefinition(word, signal), definition)
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('context and part of speech prevent a tree from being defined as poison', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      entries: [
        { partOfSpeech: 'verb', senses: [{ definition: 'To poison trees.' }] },
        {
          partOfSpeech: 'noun',
          senses: [
            { definition: 'The poison obtained from a plant.' },
            {
              definition: 'Any of several coniferous trees of the genus Tsuga.',
            },
          ],
        },
      ],
    }),
  )
  const definition = await loadDefinition(
    {
      word: 'hemlock',
      lookup: 'hemlock',
      partOfSpeech: 'noun',
      sense: 'trees',
    },
    new AbortController().signal,
  )
  assert.equal(
    definition.text,
    'Any of several coniferous trees of the genus Tsuga.',
  )
})

test('failed or irrelevant responses are not cached, so a retry can succeed', async (t) => {
  const word = {
    word: 'rued',
    lookup: 'rue',
    partOfSpeech: 'verb',
    sense: 'regret',
  }
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 503 }),
  )
  const signal = new AbortController().signal
  await assert.rejects(loadDefinition(word, signal))
  fetchMock.mock.mockImplementation(async () =>
    Response.json({
      entries: [
        null,
        { partOfSpeech: 'noun', senses: [{ definition: 'An herb.' }] },
      ],
    }),
  )
  await assert.rejects(loadDefinition(word, signal))
  fetchMock.mock.mockImplementation(async () =>
    Response.json({
      entries: [
        {
          partOfSpeech: 'verb',
          senses: [{ definition: 'To regret a past action.' }],
        },
      ],
    }),
  )
  assert.equal(
    (await loadDefinition(word, signal)).text,
    'To regret a past action.',
  )
})

test('a lookup cancelled while fetching cannot populate the cache', async (t) => {
  const word = {
    word: 'livelong',
    lookup: 'livelong',
    partOfSpeech: 'adjective',
    sense: 'whole',
  }
  const controller = new AbortController()
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    controller.abort()
    return Response.json({
      entries: [
        {
          partOfSpeech: 'adjective',
          senses: [{ definition: 'Total, complete, whole.' }],
        },
      ],
    })
  })
  await assert.rejects(loadDefinition(word, controller.signal), {
    name: 'AbortError',
  })
  fetchMock.mock.mockImplementation(
    async () => new Response(null, { status: 500 }),
  )
  await assert.rejects(loadDefinition(word, new AbortController().signal))
  assert.equal(fetchMock.mock.callCount(), 2)
})
