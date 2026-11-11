import type { Person } from '@fansite/db/schema'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadPlayerPage, periodsOf, type PlayerPage, playerPageOf } from '#src/player-page'
import { withoutIcons } from '#src/without-icons'

import { playerMetadata, PlayerPageView } from './player-page'

vi.mock('#src/player-page', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadPlayerPage: vi.fn(),
}))

// A made-up player of ours.
const player: PlayerPage = {
  birthPlace: 'Emmen',
  birthYear: '1974',
  country: 'NL',
  edited: false,
  line: 'aanvaller',
  name: 'Jan de Vries',
  nameParts: { givenName: 'Jan', surname: 'de Vries' },
  personId: 7,
  readAt: new Date('2026-11-10T12:05:00Z'),
  seasons: ['2002/03', '2003/04', '2007/08'],
  slug: 'jan-de-vries',
  wikipedia: { language: 'nl', title: 'Jan de Vries (voetballer)' },
}

const render = async (page: Partial<PlayerPage> = {}) => {
  vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'found', page: { ...player, ...page } })

  return withoutIcons(renderToStaticMarkup(await PlayerPageView({ slug: 'jan-de-vries' })))
}

/** The digest of the error that `notFound()` and `redirect()` throw, which Next.js answers. */
const digestOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => (error as { digest?: string }).digest,
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
  vi.stubEnv('SITE_ENV', 'production')
})

afterEach(() => {
  vi.useRealTimers()
  vi.mocked(loadPlayerPage).mockReset()
  vi.unstubAllEnvs()
})

describe('the page of a player', () => {
  it('has a breadcrumb to Spelers and his name as the heading, in parts', async () => {
    const html = await render()

    expect(html).toMatch(/<nav aria-label="Kruimelpad".*?href="\/spelers">Spelers<\/a>.*?Jan de Vries/s)
    expect(html).toContain(
      '<h1 class="hf-heading-1"><span class="hf-player-name"><span class="hf-player-name-given">Jan</span> <span class="hf-player-name-surname">de Vries</span></span></h1>',
    )
  })

  it('has one line with the line, the flag as decoration with the country in words, and the year and place of birth', async () => {
    const html = await render()
    const line = /<p class="hf-meta">(Aanvaller · .*?)<\/p>/s.exec(html)?.[1] ?? ''

    expect(line).toMatch(/^Aanvaller · <span aria-hidden="true" class="hf-player-name [^"]*">.*?<img alt="Nederland"/s)
    expect(line).toMatch(/<\/span>Nederland · geboren in 1974 in Emmen$/s)
  })

  it('leaves out what we do not know, with its separator', async () => {
    expect(await render({ birthPlace: undefined, country: undefined, line: undefined })).toContain(
      '<p class="hf-meta">Geboren in 1974</p>',
    )
    expect(await render({ birthPlace: undefined, birthYear: undefined })).toMatch(
      /<p class="hf-meta">Aanvaller · .*?Nederland<\/p>/s,
    )
    expect(
      await render({ birthPlace: undefined, birthYear: undefined, country: undefined, line: undefined }),
    ).not.toContain('class="hf-meta">')
  })

  it('names his seasons as periods, each season a link to its page Spelers', async () => {
    expect(await render()).toContain(
      '<p>Bij sc Heerenveen van <a href="/spelers/2002-03">2002/03</a> tot en met <a href="/spelers/2003-04">2003/04</a> en in <a href="/spelers/2007-08">2007/08</a>.</p>',
    )
    expect(await render({ seasons: ['2026/27'] })).toContain(
      '<p>Bij sc Heerenveen in <a href="/spelers">2026/27</a>.</p>',
    )
  })

  it('ends with the full credit of Wikipedia with his article, and the archive for a season up to 2006/07', async () => {
    const html = await render()

    expect(html).toContain('Bron: Wikipedia en het archief van de oude sc Heerenveen Fansite')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Jan_de_Vries_(voetballer)"')
    expect(html).toContain('Onze spelersgegevens zijn ook CC BY-SA 4.0.')
    expect(await render({ seasons: ['2007/08'] })).not.toContain('archief')
  })

  it('names the sources there are for a player without an article', async () => {
    expect(await render({ wikipedia: undefined })).toContain('Bron: het archief van de oude sc Heerenveen Fansite')
    expect(await render({ seasons: ['2025/26'], wikipedia: undefined })).toContain(
      '<p class="hf-meta">Bron: onze redactie.</p>',
    )
    expect(await render({ readAt: undefined, seasons: ['2025/26'] })).toContain('Bron: Wikipedia')
  })

  it('has no photo and no request to another domain', async () => {
    const html = await render()

    expect([...html.matchAll(/<img [^>]*src="([^"]*)"/g)].every(([, src]) => src?.startsWith('data:'))).toBe(true)
    expect(html).not.toMatch(/<(?:script|iframe|link)[^>]+(?:src|href)="https?:/)
  })

  it('leads an old address to the address of now, for good', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'moved', slug: 'johannes-de-vries' })

    const digest = await digestOf(PlayerPageView({ slug: 'jan-de-vries' }))

    expect(digest).toContain('/spelers/johannes-de-vries;308')
  })

  it('is "niet gevonden" for nobody, or a player of an opponent', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'unknown' })

    expect(await digestOf(PlayerPageView({ slug: 'niemand' }))).toContain('404')
  })

  it('shows the error page when the database cannot be read', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'error', reason: 'connect ECONNREFUSED' })

    expect(renderToStaticMarkup(await PlayerPageView({ slug: 'jan-de-vries' }))).toContain(
      'href="/spelers/jan-de-vries"',
    )
  })

  it('has a title and a description without the date of birth', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'found', page: player })

    const metadata = await playerMetadata('jan-de-vries')

    expect(metadata.title).toBe('Jan de Vries – Spelers')
    expect(metadata.description).toBe(
      'Jan de Vries, aanvaller uit Nederland, speelde bij sc Heerenveen van 2002/03 tot en met 2003/04 en in 2007/08. Met de bron erbij.',
    )
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/spelers/jan-de-vries')
  })
})

describe('periodsOf', () => {
  it('makes one period of seasons that follow each other, also across the turn of the century', () => {
    expect(periodsOf(['2007/08', '1999/00', '2000/01', '2002/03', '2003/04'])).toEqual([
      { first: '1999/00', last: '2000/01' },
      { first: '2002/03', last: '2003/04' },
      { first: '2007/08', last: '2007/08' },
    ])
  })
})

describe('playerPageOf', () => {
  // A made-up person, with the columns a row of `persons` has.
  const person = {
    birthDate: '1974-05-06',
    birthDatePrecision: 'day',
    country: 'NL',
    familyName: 'Vries',
    familyNamePrefix: 'de',
    givenName: 'Jan',
    id: 7,
    line: 'aanvaller',
    lineSource: 'wikidata',
    name: 'Jan de Vries',
    nameSource: 'wikipedia',
    slug: 'jan-de-vries',
    wikidataReadAt: null,
    wikipediaPage: null,
  } as unknown as Person

  it('keeps the year of birth and never the whole date', () => {
    const page = playerPageOf(person, [{ name: 'Jan de Vries', season: '2004/05' }], 'Emmen')

    expect(page.birthYear).toBe('1974')
    expect(JSON.stringify(page)).not.toContain('1974-05-06')
  })

  it('takes the name of his newest row while the person has none', () => {
    const page = playerPageOf(
      { ...person, familyName: null, familyNamePrefix: null, givenName: null, name: null },
      [
        { name: 'Jan Vries', season: '2005/06' },
        { name: 'J. de Vries', season: '2004/05' },
      ],
      undefined,
    )

    expect(page.name).toBe('Jan Vries')
    expect(page.seasons).toEqual(['2004/05', '2005/06'])
  })
})
