import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getArticlesPage } from '#src/articles'

import EditorsPage, { generateMetadata } from './page'

vi.mock('#src/articles', () => ({ getArticlesPage: vi.fn() }))

// The afternoon of Friday 30 October 2026 in the Netherlands.
const now = new Date('2026-10-30T13:40:00Z')

const articles = [
  {
    intro: 'Wat we dit seizoen willen laten zien & <b>waarom</b>.',
    publishedAt: new Date('2026-10-25T10:00:00Z'),
    slug: 'dit-zijn-wij',
    title: 'Dit zijn wij',
  },
  {
    intro: 'Hoe we werken.',
    publishedAt: new Date('2026-10-01T10:00:00Z'),
    slug: 'zo-werken-wij',
    title: 'Zo werken wij',
  },
]

type Query = Record<string, string | string[] | undefined>

const props = (query: Query = {}) => ({ searchParams: Promise.resolve(query) })

async function render(query: Query = {}) {
  return renderToStaticMarkup(await EditorsPage(props(query)))
}

/** The page the visitor sees: Next.js stops at a notFound() with an error with this digest. */
const notFound = expect.objectContaining({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }) as unknown

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.mocked(getArticlesPage).mockReset()
  vi.mocked(getArticlesPage).mockResolvedValue({ articles, pageCount: 1 })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the page Redactie', () => {
  it('has one h1, Redactie, and a heading of level 2 with a link for each article', async () => {
    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Redactie</h1>'])
    expect(html.match(/<h2[^>]*><a [^>]*>.*?<\/a><\/h2>/g)).toHaveLength(2)
    expect(html).toContain('href="/redactie/dit-zijn-wij"')
    expect(html).toContain('>Dit zijn wij</a>')
  })

  it('is the one main of the page, with the list in a card and no sidebar', async () => {
    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(
      /<main class="hf-page-main hf-page-main-grid"[^>]*><div class="hf-page-cell" style="grid-area:head"><h1[^>]*>Redactie<\/h1><\/div>/,
    )
    expect(html).toMatch(/<div class="hf-page-cell" style="grid-area:main"><div class="hf-card"><ul role="list">/)
    expect(html).not.toContain('<aside')
    expect(html).not.toContain('hf-page-section')
    expect(html).not.toContain('/contact')
  })

  it('shows the articles in the order it was given (the newest first), with the day and the intro', async () => {
    const html = await render()

    expect(html.indexOf('Dit zijn wij')).toBeLessThan(html.indexOf('Zo werken wij'))
    expect(html).toContain('<time dateTime="2026-10-25">25 oktober 2026</time>')
    expect(html).toContain('<time dateTime="2026-10-01">1 oktober 2026</time>')
    expect(html).toContain('Hoe we werken.')
  })

  it('escapes the intro', async () => {
    const html = await render()

    expect(html).toContain('Wat we dit seizoen willen laten zien &amp; &lt;b&gt;waarom&lt;/b&gt;.')
    expect(html).not.toContain('<b>waarom')
  })

  it('says there are no articles, in place of the list, without an article', async () => {
    vi.mocked(getArticlesPage).mockResolvedValue({ articles: [], pageCount: 1 })

    const html = await render()

    expect(html).toContain('We hebben nog geen artikelen.')
    expect(html).not.toContain('<ul')
    expect(html).not.toContain('Paginering')
  })

  it('has no pagination on one page', async () => {
    expect(await render()).not.toContain('Paginering')
  })

  it('has pagination on more pages, with the next page and no previous on the first', async () => {
    vi.mocked(getArticlesPage).mockResolvedValue({ articles, pageCount: 3 })

    const html = await render()

    expect(html).toContain('<nav aria-label="Paginering"')
    expect(html).toContain('href="/redactie?pagina=2"')
    expect(html).not.toContain('href="/redactie?pagina=0"')
  })

  it('links the previous page of the second page to the plain address, and the next to the third', async () => {
    vi.mocked(getArticlesPage).mockResolvedValue({ articles, pageCount: 3 })

    const html = await render({ pagina: '2' })

    expect(getArticlesPage).toHaveBeenCalledExactlyOnceWith(2)
    expect(html).toContain('href="/redactie"')
    expect(html).toContain('href="/redactie?pagina=3"')
  })

  it.each(['0', '-1', '2.5', 'abc', ''])('says "niet gevonden" for the page %j', async (pagina) => {
    await expect(render({ pagina })).rejects.toEqual(notFound)
    expect(getArticlesPage).not.toHaveBeenCalled()
  })

  it('says "niet gevonden" for a page twice in the address', async () => {
    await expect(render({ pagina: ['1', '2'] })).rejects.toEqual(notFound)
  })

  it('says "niet gevonden" for a page after the last one', async () => {
    vi.mocked(getArticlesPage).mockResolvedValue(undefined)

    await expect(render({ pagina: '4' })).rejects.toEqual(notFound)
  })

  it('asks for the first page without a parameter, and ignores a parameter it does not know', async () => {
    await render({ utm_source: 'nieuwsbrief' })

    expect(getArticlesPage).toHaveBeenCalledExactlyOnceWith(1)
  })
})

describe('the metadata of the page Redactie', () => {
  beforeEach(() => {
    vi.stubEnv('SITE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('titles the first page Redactie, with its own address', async () => {
    const metadata = await generateMetadata(props())

    expect(metadata.title).toBe('Redactie')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/redactie')
  })

  it('titles a later page with its number, and gives it its own address', async () => {
    vi.mocked(getArticlesPage).mockResolvedValue({ articles, pageCount: 3 })

    const metadata = await generateMetadata(props({ pagina: '2' }))

    expect(metadata.title).toBe('Redactie, pagina 2')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/redactie?pagina=2')
  })
})

describe('when the database can not be read', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getArticlesPage).mockRejectedValue(new Error('Failed query: select 1 (connect ECONNREFUSED)'))
  })

  it('shows the error page in the HTML, with a link to try again at the same address', async () => {
    const html = await render({ pagina: '2' })

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/redactie?pagina=2">Probeer het opnieuw</a>')
  })

  it('titles the page Er ging iets mis and keeps it out of the search engines', async () => {
    expect(await generateMetadata(props())).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('writes the reason to the log', async () => {
    await render()

    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the articles for /redactie: Failed query: select 1 (connect ECONNREFUSED)',
    )
  })
})
