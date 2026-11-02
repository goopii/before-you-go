export type PoemWord = {
  word: string
  lookup: string
  partOfSpeech: string
  sense: string
}

export type Poem = {
  title: string
  author: string
  lines: string[]
  url: string
  words?: PoemWord[]
}

type PoetrySource = { kind: 'poetry'; title: string; author: string } & Partial<
  Pick<Poem, 'lines' | 'url' | 'words'>
>

export type InvitationSource = PoetrySource | { kind: 'art'; artworkId: number }

export type Invitation = {
  id: string
  title: string
  introduction: string
  reflections: string[]
  source?: InvitationSource
}

export function isBundledPoem(
  source: InvitationSource | undefined,
): source is PoetrySource & Poem {
  return (
    source?.kind === 'poetry' &&
    Array.isArray(source.lines) &&
    typeof source.url === 'string'
  )
}

export const invitations: Invitation[] = [
  {
    id: 'fog',
    title: 'Fog',
    introduction:
      'The fog comes, sits for a while, and moves on. Let something quiet on your walk hold your attention for a moment.',
    reflections: [
      'What comes and goes quietly around you?',
      'What happens to your attention while it is there?',
      'What stays with you after it has gone?',
    ],
    source: {
      kind: 'poetry',
      title: 'Fog',
      author: 'Carl Sandburg',
      lines: [
        'The fog comes',
        'on little cat feet.',
        '',
        'It sits looking',
        'over harbor and city',
        'on silent haunches',
        'and then moves on.',
      ],
      url: 'https://poets.org/poem/fog',
      words: [
        {
          word: 'haunches',
          lookup: 'haunch',
          partOfSpeech: 'noun',
          sense: 'thigh',
        },
      ],
    },
  },
  {
    id: 'red-wheelbarrow',
    title: 'The Red Wheelbarrow',
    introduction:
      'The wheelbarrow is ordinary, yet the poem begins with how much depends on it. Stop with something ordinary you pass and consider what depends on it.',
    reflections: [
      'What would change here if it were gone?',
      'Who or what would feel its absence?',
      'What do you rely on that you rarely give a thought to?',
    ],
    source: {
      kind: 'poetry',
      title: 'The Red Wheelbarrow',
      author: 'William Carlos Williams',
      lines: [
        'so much depends',
        'upon',
        '',
        'a red wheel',
        'barrow',
        '',
        'glazed with rain',
        'water',
        '',
        'beside the white',
        'chickens',
      ],
      url: 'https://poets.org/poem/red-wheelbarrow',
      words: [],
    },
  },
  {
    id: 'prairie',
    title: 'To make a prairie',
    introduction:
      'Dickinson begins with a clover and a bee: small details of a much larger landscape. On your walk, stop with a small detail that catches your eye and spend a little time with it.',
    reflections: [
      'What do you notice as you look more closely?',
      'What does it draw your attention to in the place around it?',
      'Where do your thoughts wander as you stay with it?',
    ],
    source: {
      kind: 'poetry',
      title: 'To make a prairie',
      author: 'Emily Dickinson',
      lines: [
        'To make a prairie it takes a clover and one bee,',
        'One clover, and a bee.',
        'And revery.',
        'The revery alone will do,',
        'If bees are few.',
      ],
      url: 'https://poets.org/poem/make-prairie-1755',
      words: [
        {
          word: 'revery',
          lookup: 'reverie',
          partOfSpeech: 'noun',
          sense: 'daydream',
        },
      ],
    },
  },
  {
    id: 'dust-of-snow',
    title: 'Dust of Snow',
    introduction:
      "A small, unplanned encounter changes part of the speaker's day. Notice the mood you set out with, and what happens to it as you walk.",
    reflections: [
      'Does anything you encounter shift the mood you set out with?',
      'If it does, what is it about that encounter that reaches you?',
    ],
    source: {
      kind: 'poetry',
      title: 'Dust of Snow',
      author: 'Robert Frost',
      lines: [
        'The way a crow',
        'Shook down on me',
        'The dust of snow',
        'From a hemlock tree',
        '',
        'Has given my heart',
        'A change of mood',
        'And saved some part',
        'Of a day I had rued.',
      ],
      url: 'https://poets.org/poem/dust-snow',
      words: [
        {
          word: 'hemlock',
          lookup: 'hemlock',
          partOfSpeech: 'noun',
          sense: 'trees',
        },
        {
          word: 'rued',
          lookup: 'rue',
          partOfSpeech: 'verb',
          sense: 'To repent of or regret',
        },
      ],
    },
  },
  {
    id: 'nobody',
    title: "I'm Nobody! Who are you?",
    introduction:
      'The speaker finds company in being Nobody and little pleasure in being publicly Somebody. Walk for a while without needing to make an impression.',
    reflections: [
      'What is it like to walk for a while without needing to be anybody in particular?',
      'When do you want to be noticed, and when do you prefer to pass unseen?',
      'What kind of company would feel right today?',
    ],
    source: {
      kind: 'poetry',
      title: "I'm Nobody! Who are you?",
      author: 'Emily Dickinson',
      lines: [
        "I'm Nobody! Who are you?",
        'Are you – Nobody – too?',
        "Then there's a pair of us!",
        "Don't tell! they'd advertise – you know!",
        '',
        'How dreary – to be – Somebody!',
        'How public – like a Frog –',
        "To tell one's name – the livelong June –",
        'To an admiring Bog!',
      ],
      url: 'https://poets.org/poem/im-nobody-who-are-you-260',
      words: [
        {
          word: 'livelong',
          lookup: 'livelong',
          partOfSpeech: 'adjective',
          sense: 'whole',
        },
        {
          word: 'Bog',
          lookup: 'bog',
          partOfSpeech: 'noun',
          sense: 'wet spongy',
        },
      ],
    },
  },
  {
    id: 'remember',
    title: 'Remember',
    introduction:
      'The speaker asks to be remembered, then makes room for forgetting. If someone comes to mind as you walk, let the memory come and go, and see how it feels.',
    reflections: [
      'What does remembering bring with it today?',
      'How does it feel when your attention wanders somewhere else?',
    ],
    source: {
      kind: 'poetry',
      title: 'Remember',
      author: 'Christina Rossetti',
      lines: [
        'Remember me when I am gone away,',
        'Gone far away into the silent land;',
        'When you can no more hold me by the hand,',
        'Nor I half turn to go yet turning stay.',
        'Remember me when no more day by day',
        'You tell me of our future that you planned:',
        'Only remember me; you understand',
        'It will be late to counsel then or pray.',
        'Yet if you should forget me for a while',
        'And afterwards remember, do not grieve:',
        'For if the darkness and corruption leave',
        'A vestige of the thoughts that once I had,',
        'Better by far you should forget and smile',
        'Than that you should remember and be sad.',
      ],
      url: 'https://poets.org/poem/remember',
      words: [
        {
          word: 'vestige',
          lookup: 'vestige',
          partOfSpeech: 'noun',
          sense: 'faint mark',
        },
      ],
    },
  },
  {
    id: 'soft-rains',
    title: 'There Will Come Soft Rains',
    introduction:
      'The birds and trees in this poem go on without knowing about the war. Spend part of your walk with lives that are unfolding quite apart from your own.',
    reflections: [
      'What is carrying on around you without needing you?',
      'What does it feel like to be among things that would carry on without us?',
      'Does that change your sense of belonging here?',
    ],
    source: {
      kind: 'poetry',
      title: 'There Will Come Soft Rains',
      author: 'Sara Teasdale',
      lines: [
        '(War Time)',
        '',
        'There will come soft rains and the smell of the ground,',
        'And swallows circling with their shimmering sound;',
        '',
        'And frogs in the pools singing at night,',
        'And wild plum trees in tremulous white,',
        '',
        'Robins will wear their feathery fire',
        'Whistling their whims on a low fence-wire;',
        '',
        'And not one will know of the war, not one',
        'Will care at last when it is done.',
        '',
        'Not one would mind, neither bird nor tree',
        'If mankind perished utterly;',
        '',
        'And Spring herself, when she woke at dawn,',
        'Would scarcely know that we were gone.',
      ],
      url: 'https://poets.org/poem/there-will-come-soft-rains',
      words: [
        {
          word: 'tremulous',
          lookup: 'tremulous',
          partOfSpeech: 'adjective',
          sense: 'trembl|quiver',
        },
        {
          word: 'perished',
          lookup: 'perish',
          partOfSpeech: 'verb',
          sense: 'cease to live',
        },
        {
          word: 'scarcely',
          lookup: 'scarcely',
          partOfSpeech: 'adverb',
          sense: 'hardly at all',
        },
      ],
    },
  },
]
