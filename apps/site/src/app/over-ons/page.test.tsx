import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { headingAnchors, withoutHeadingLinks, withoutIcons } from '../../without-icons'
import AboutPage, { generateMetadata } from './page'

const html = renderToStaticMarkup(<AboutPage />)

// Without the links that the headings are, for the tests about the other links and icons.
const plain = withoutHeadingLinks(html)

/** The href and the text of each link, in the order of the page. */
const links = [...withoutIcons(plain).matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [
  href,
  label,
])

describe('the page Over ons', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is titled Over ons, with a description and a canonical URL of its own', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/over-ons' },
      description: expect.stringMatching(/^Wie we zijn en hoe we werken/),
      openGraph: { title: 'Over ons', url: 'https://acc.sc.heerenveen.org/over-ons' },
      title: 'Over ons',
    })
  })

  it('is the one main of the page, with all its content in one cell', () => {
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><div class="hf-page-cell">.*<\/div><\/main>$/)
  })

  it('shows the first paragraph under the h1, below the h2 Wie we zijn, as the intro, and no other paragraph', () => {
    expect(plain).toContain(
      '<h2 class="hf-heading-2 hf-heading-anchored" id="wie-we-zijn">Wie we zijn</h2><p class="hf-intro"><b>De sc Heerenveen Fansite is een site',
    )
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
    expect(html.match(/<b>/g)).toHaveLength(1)
  })

  it('has one h1 and an h2 per section, and no section or anchor for privacy', () => {
    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Over ons</h1>'])
    expect(html).not.toContain('id="privacy"')
    expect(plain.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2 hf-heading-anchored" id="wie-we-zijn">Wie we zijn</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="hoe-we-werken">Hoe we werken</h2>',
    ])
  })

  it('makes each h2 a link to itself, with a Dutch anchor that the page chose', () => {
    expect(headingAnchors(html)).toEqual([
      ['wie-we-zijn', 'Wie we zijn'],
      ['hoe-we-werken', 'Hoe we werken'],
    ])
  })

  it('links to the forum, the sources, the contact form, the editors by email and the page Privacy', () => {
    expect(links).toEqual([
      ['https://forum.heerenveen.org', 'ons forum'],
      ['/bronnen', 'Onze bronnen'],
      ['/contact', 'Contact'],
      ['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org'],
      ['/privacy', 'Privacy'],
    ])
  })

  it('draws the icon for a link to another site behind "ons forum" only, hidden from screen readers', () => {
    const iconLinks = [
      ...plain.matchAll(/<a href="([^"]*)">(?:[^<]*)<span class="hf-icon-tail">[^<]*<svg aria-hidden="true"/g),
    ]

    expect(iconLinks.map(([, href]) => href)).toEqual(['https://forum.heerenveen.org'])
    // The other icon is the envelope before the address.
    expect(plain.match(/<svg /g)).toHaveLength(2)
  })

  it('draws the envelope in front of the address, hidden from screen readers', () => {
    expect(html).toMatch(
      /<a href="mailto:fansite@heerenveen\.org"><span class="hf-icon-head"><svg aria-hidden="true" class="hf-icon"[^>]*>.*?<\/svg>f<\/span>ansite@heerenveen\.org<\/a>/,
    )
  })

  it('starts a paragraph of its own at "We schrijven niks over", after the intro', () => {
    expect(html).toContain(
      'met een link naar het hele verhaal.</b></p><p>We schrijven niks over en we passen niks aan.',
    )
  })

  it('names the founder without the old name of the site, and writes the club as sc Heerenveen', () => {
    expect(html).toContain('Vincent Smedinga begon de site in 1997. In die jaren hielpen veel mensen mee')
    expect(html).not.toContain('Online')
    expect(html).not.toMatch(/SC Heerenveen/)
  })
})
