import { afterEach, describe, expect, it, vi } from 'vitest'

import { articleMetadata, pageMetadata, urlOf } from './metadata'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('urlOf', () => {
  it.each([
    ['local', 'http://localhost:3000/bronnen'],
    ['acceptance', 'https://acc.sc.heerenveen.org/bronnen'],
    ['production', 'https://sc.heerenveen.org/bronnen'],
  ])('starts with the address of %s', (siteEnv, url) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(urlOf('/bronnen')).toBe(url)
  })
})

describe('pageMetadata', () => {
  it('puts the query in the canonical URL and the Open Graph address when the page has one, and nothing for an empty one', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(pageMetadata('/nieuws/podcasts', 'Podcasts', 'pagina=2').alternates?.canonical).toBe(
      'https://sc.heerenveen.org/nieuws/podcasts?pagina=2',
    )
    expect(pageMetadata('/nieuws/podcasts', 'Podcasts', 'pagina=2').openGraph?.url).toBe(
      'https://sc.heerenveen.org/nieuws/podcasts?pagina=2',
    )
    expect(pageMetadata('/nieuws/podcasts', 'Podcasts', '').alternates?.canonical).toBe(
      'https://sc.heerenveen.org/nieuws/podcasts',
    )
  })

  it('gives the page its canonical URL, description and Open Graph tags, with the picture of our own domain', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(pageMetadata('/bronnen', 'Onze bronnen')).toEqual({
      alternates: { canonical: 'https://sc.heerenveen.org/bronnen' },
      description: expect.any(String),
      openGraph: {
        description: expect.any(String),
        images: [
          {
            alt: expect.any(String),
            height: 630,
            url: 'https://sc.heerenveen.org/share-image.png',
            width: 1200,
          },
        ],
        locale: 'nl_NL',
        siteName: 'sc Heerenveen Fansite',
        title: 'Onze bronnen',
        type: 'website',
        url: 'https://sc.heerenveen.org/bronnen',
      },
      title: 'Onze bronnen',
    })
  })

  it('leaves the title to the layout for a page without one, and names the site in og:title', () => {
    vi.stubEnv('SITE_ENV', 'local')

    const metadata = pageMetadata('/')

    expect(metadata).not.toHaveProperty('title')
    expect(metadata).not.toHaveProperty('twitter')
    expect(metadata.openGraph).toMatchObject({ title: 'sc Heerenveen Fansite', url: 'http://localhost:3000/' })
    expect(metadata.alternates?.canonical).toBe('http://localhost:3000/')
  })
})

describe('articleMetadata', () => {
  const article = {
    intro: 'Een verzonnen inleiding.',
    publishedAt: new Date('2026-10-25T08:00:00Z'),
    slug: 'dit-zijn-wij',
    title: 'Dit zijn wij',
  }

  it('gives the article its title, the intro as description, its own canonical URL and Open Graph tags of the type article', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(articleMetadata(article)).toEqual({
      alternates: { canonical: 'https://sc.heerenveen.org/redactie/dit-zijn-wij' },
      description: 'Een verzonnen inleiding.',
      openGraph: {
        description: 'Een verzonnen inleiding.',
        images: [
          {
            alt: expect.any(String),
            height: 630,
            url: 'https://sc.heerenveen.org/share-image.png',
            width: 1200,
          },
        ],
        locale: 'nl_NL',
        publishedTime: '2026-10-25T08:00:00.000Z',
        siteName: 'sc Heerenveen Fansite',
        title: 'Dit zijn wij',
        type: 'article',
        url: 'https://sc.heerenveen.org/redactie/dit-zijn-wij',
      },
      title: 'Dit zijn wij',
    })
  })

  it('uses the address of the environment', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(articleMetadata(article).alternates?.canonical).toBe('https://acc.sc.heerenveen.org/redactie/dit-zijn-wij')
  })
})
