import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getArticle } from '../../../articles'
import { withoutIcons } from '../../../without-icons'
import ArticlePage, { generateMetadata } from './page'

vi.mock('../../../articles', () => ({ getArticle: vi.fn() }))

const article = {
  author: 'de redactie',
  body: 'Een alinea met **vet** en [de LC](https://www.lc.nl/sport).\n\n## Een kop\n\n- een\n- twee',
  intro: 'Een verzonnen inleiding.',
  publishedAt: new Date('2026-10-25T08:00:00Z'),
  slug: 'dit-zijn-wij',
  title: 'Dit zijn wij',
}

const props = (slug = 'dit-zijn-wij') => ({ params: Promise.resolve({ slug }) })

async function render(slug?: string) {
  return withoutIcons(renderToStaticMarkup(await ArticlePage(props(slug))))
}

/**
 * The page that the visitor sees: Next.js stops at a notFound() with an error that has this
 * digest.
 */
const notFound = expect.objectContaining({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }) as unknown

beforeEach(() => {
  vi.mocked(getArticle).mockReset()
  vi.mocked(getArticle).mockResolvedValue(article)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page of an article', () => {
  it('asks for the article with the slug of the address', async () => {
    await render('dit-zijn-wij')

    expect(getArticle).toHaveBeenCalledWith('dit-zijn-wij')
  })

  it('is one main with one article in it', async () => {
    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html.match(/<article/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><article class="hf-article">.*<\/article><\/main>$/)
  })

  it('has the title as the one h1 and the headings of the text as h2', async () => {
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('<h1 class="hf-heading-1">Dit zijn wij</h1>')
    expect(html.match(/<h[2-6]/g)).toHaveLength(1)
    expect(html).toContain('<h2 class="hf-heading-2">Een kop</h2>')
  })

  it('shows the author and the date, in Dutch, in a time element', async () => {
    const html = await render()

    expect(html).toContain(
      'Door de redactie <span aria-hidden="true">·</span> <time dateTime="2026-10-25">25 oktober 2026</time>',
    )
  })

  it('shows the intro and then the text, with its format turned into elements', async () => {
    const html = await render()

    expect(html).toContain('<p class="hf-intro"><b>Een verzonnen inleiding.</b></p>')
    expect(html).toContain('<strong>vet</strong>')
    expect(html).toContain('<a href="https://www.lc.nl/sport" rel="noopener">de LC</a>')
    expect(html).toContain('<ul><li>een</li><li>twee</li></ul>')
    expect(html.indexOf('hf-intro')).toBeLessThan(html.indexOf('<strong>'))
  })

  it('shows HTML in the text as text', async () => {
    vi.mocked(getArticle).mockResolvedValue({
      ...article,
      author: '<b>x</b>',
      body: '<script>alert(1)</script>\n\n[x](javascript:alert(1))',
      title: '<img src=x onerror=alert(1)>',
    })

    const html = await render()

    expect(html).not.toMatch(/<script|<img|<b>x|href="javascript/)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it.each(['onbekend', 'concept', 'Hoofdletters', '../beheer'])(
    'gives the page "niet gevonden" for %s, which is no published article',
    async (slug) => {
      vi.mocked(getArticle).mockResolvedValue(undefined)

      await expect(ArticlePage(props(slug))).rejects.toEqual(notFound)
      await expect(generateMetadata(props(slug))).rejects.toEqual(notFound)
    },
  )

  it('asks the same of a draft as of an address that is not an article, so nothing tells them apart', async () => {
    vi.mocked(getArticle).mockResolvedValue(undefined)

    const draft = await ArticlePage(props('concept')).catch((error: unknown) => error)
    const unknown = await ArticlePage(props('bestaat-niet')).catch((error: unknown) => error)

    expect(draft).toEqual(unknown)
  })

  it('shows the error page when the database cannot give the article, and logs why', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getArticle).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const html = await render('dit-zijn-wij')

    expect(html).toContain('Er ging iets mis')
    expect(html).toContain('href="/redactie/dit-zijn-wij"')
    expect(error).toHaveBeenCalledWith(
      'Could not read the article for /redactie/dit-zijn-wij: connect ECONNREFUSED 127.0.0.1:3306',
    )
    expect(await generateMetadata(props('dit-zijn-wij'))).toMatchObject({ robots: { index: false } })
  })
})

describe('the metadata of the page of an article', () => {
  it('has the title, the intro as description, a canonical URL and no noindex', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    const metadata = await generateMetadata(props())

    expect(metadata).toMatchObject({
      alternates: { canonical: 'https://sc.heerenveen.org/redactie/dit-zijn-wij' },
      description: 'Een verzonnen inleiding.',
      openGraph: { title: 'Dit zijn wij', type: 'article', url: 'https://sc.heerenveen.org/redactie/dit-zijn-wij' },
      title: 'Dit zijn wij',
    })
    expect(metadata).not.toHaveProperty('robots')
  })
})
