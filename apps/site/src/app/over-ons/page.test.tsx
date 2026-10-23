import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AboutPage, { generateMetadata } from './page'

const html = renderToStaticMarkup(<AboutPage />)

/** The href and the text of each link, in the order of the page. */
const links = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

describe('the page Over ons', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is titled Over ons, with a description and a canonical URL of its own', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/over-ons' },
      description: expect.stringMatching(/^Wie we zijn/),
      openGraph: { title: 'Over ons', url: 'https://acc.sc.heerenveen.org/over-ons' },
      title: 'Over ons',
    })
  })

  it('is the one main of the page, with all its content in one cell', () => {
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><div class="hf-page-cell">.*<\/div><\/main>$/)
  })

  it('has one h1 and an h2 per section, with a fixed anchor on the privacy section', () => {
    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Over ons</h1>'])
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2">Wie we zijn</h2>',
      '<h2 class="hf-heading-2">Hoe we werken</h2>',
      '<h2 class="hf-heading-2" id="privacy">Privacy</h2>',
    ])
  })

  it('links to the forum, the sources, the editors by email and the Autoriteit Persoonsgegevens', () => {
    expect(links).toEqual([
      ['https://forum.heerenveen.org', 'ons forum'],
      ['/bronnen', 'Onze bronnen'],
      ['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org'],
      ['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org'],
      ['https://www.autoriteitpersoonsgegevens.nl', 'Autoriteit Persoonsgegevens'],
    ])
  })

  it('names the founder and the old name, and writes the club as sc Heerenveen', () => {
    expect(html).toContain('Vincent Smedinga begon de site in 1997, als SC Heerenveen Online.')
    expect(html.replaceAll('SC Heerenveen Online', '')).not.toMatch(/SC Heerenveen/)
  })
})
