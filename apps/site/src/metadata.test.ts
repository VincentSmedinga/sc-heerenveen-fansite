import { afterEach, describe, expect, it, vi } from 'vitest'

import { pageMetadata, urlOf } from './metadata'

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

    expect(pageMetadata('/podcasts', 'Podcasts', 'pagina=2').alternates?.canonical).toBe(
      'https://sc.heerenveen.org/podcasts?pagina=2',
    )
    expect(pageMetadata('/podcasts', 'Podcasts', 'pagina=2').openGraph?.url).toBe(
      'https://sc.heerenveen.org/podcasts?pagina=2',
    )
    expect(pageMetadata('/podcasts', 'Podcasts', '').alternates?.canonical).toBe('https://sc.heerenveen.org/podcasts')
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
