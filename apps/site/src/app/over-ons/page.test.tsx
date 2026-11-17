import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { headingAnchors, withoutHeadingLinks, withoutIcons } from '#src/without-icons'

import AboutPage, { generateMetadata } from './page'

const html = renderToStaticMarkup(<AboutPage />)

// Without the links that the headings are, for the tests about the other links and icons.
const plain = withoutHeadingLinks(html)

/** The sidebar, and the main column without it. */
const [mainHtml = '', sidebarHtml = ''] = html.split('<section class="hf-page-section"')

/** The card with the data, and the card with the steps for the Home Screen. */
const [dataHtml = '', homeScreenHtml = ''] = sidebarHtml.split(
  '<section class="hf-card hf-card-soft" aria-labelledby="als-app">',
)

/** The words of the text in the card with the data, without the heading. */
const sidebarWords = dataHtml
  .replace(/^[^>]*>/, '')
  .replace(/<h2.*?<\/h2>/, '')
  .replace(/<[^>]*>/g, ' ')
  .split(/\s+/)
  .filter((word) => /[\p{L}\p{N}]/u.test(word))

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

  it('is the one main of the page, with the h1 and all its content in a cell each, and the section after them', () => {
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).not.toContain('<aside')
    expect(html.match(/<section class="hf-page-section"/g)).toHaveLength(1)
    expect(mainHtml).toMatch(
      /^<main class="hf-page-main hf-page-main-grid"[^>]*><div class="hf-page-cell" style="grid-area:head"><h1[^>]*>Over ons<\/h1><\/div><div class="hf-page-cell" style="grid-area:main">.*<\/div>$/,
    )
    expect(sidebarHtml).toMatch(/^ style="grid-area:side" aria-label="Over de gegevens">.*<\/section><\/main>$/)
  })

  it('has a section for the sidebar with two cards, the first named by its h2 Waar de gegevens vandaan komen, with an anchor', () => {
    expect(sidebarHtml.match(/<section/g)).toHaveLength(2)
    expect(sidebarHtml).toContain('<section class="hf-card hf-card-soft" aria-labelledby="gegevens">')
    expect(plain).toContain(
      '<h2 class="hf-heading-3 hf-heading-anchored" id="gegevens">Waar de gegevens vandaan komen</h2>',
    )
  })

  it('names the sources and what can go wrong: Wikipedia and its licence, a late result, other spelling and the filter', () => {
    const text = dataHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

    expect(text).toContain('Nederlandse Wikipedia (CC BY-SA 4.0)')
    expect(text).toContain('een uitslag kan achterlopen')
    expect(text).toContain('soms anders dan bij de club')
    expect(text).toContain('Het mist soms een kop of laat er een te veel staan')
    expect(text).toContain('hoogstens één keer per uur')
    expect(text).toContain('forum')
    expect(text).toContain('podcasts')
  })

  it('keeps the card compact: about 100 words, with a heading per subject and no list', () => {
    expect(sidebarWords.length).toBeLessThanOrEqual(110)
    expect(dataHtml).not.toMatch(/<[ou]l[ >]/)
    expect(dataHtml.match(/<h3 class="hf-heading-4">/g)).toHaveLength(4)
  })

  it('has a second card in the sidebar, Als app op je startscherm, under the data, with the steps to put the site on the Home Screen', () => {
    const text = withoutHeadingLinks(homeScreenHtml)
      .replace(/<\/h2>/, ' ')
      .replace(/<[^>]*>/g, '')

    expect(sidebarHtml.indexOf('id="gegevens"')).toBeLessThan(sidebarHtml.indexOf('id="als-app"'))
    expect(homeScreenHtml).toContain('<h2 class="hf-heading-3 hf-heading-anchored" id="als-app">')
    expect(text).toContain('Als app op je startscherm')
    expect(text).toContain('Doe dit één keer en je opent de Fansite voortaan met één tik op je telefoon of tablet.')
    expect(text).toContain('Op een iPhone: tik op Deel, kies Zet op beginscherm en tik op Voeg toe.')
    expect(text).toContain(
      'Op Android: tik op het menu met de drie puntjes, kies Toevoegen aan startscherm en tik op Toevoegen.',
    )
    expect(homeScreenHtml).toContain('<strong>Zet op beginscherm</strong>')
    expect(homeScreenHtml).toContain('<strong>Toevoegen aan startscherm</strong>')
    expect(withoutHeadingLinks(homeScreenHtml)).not.toMatch(/<(a|button|[ou]l|h3)[ >]/)
  })

  it('shows the first paragraph under the h1, below the h2 Wie we zijn, as the intro, and no other paragraph', () => {
    expect(plain).toContain(
      '<h2 class="hf-heading-2 hf-heading-anchored" id="wie-we-zijn">Wie we zijn</h2><p class="hf-intro"><b>De sc Heerenveen Fansite is een site',
    )
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
    expect(mainHtml.match(/<b>/g)).toHaveLength(1)
  })

  it('has one h1 and an h2 per section, and no section or anchor for privacy', () => {
    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Over ons</h1>'])
    expect(html).not.toContain('id="privacy"')
    expect(plain.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2 hf-heading-anchored" id="wie-we-zijn">Wie we zijn</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="hoe-we-werken">Hoe we werken</h2>',
      '<h2 class="hf-heading-3 hf-heading-anchored" id="gegevens">Waar de gegevens vandaan komen</h2>',
      '<h2 class="hf-heading-3 hf-heading-anchored" id="als-app">Als app op je startscherm</h2>',
    ])
  })

  it('makes each h2 a link to itself, with a Dutch anchor that the page chose', () => {
    expect(headingAnchors(html)).toEqual([
      ['wie-we-zijn', 'Wie we zijn'],
      ['hoe-we-werken', 'Hoe we werken'],
      ['gegevens', 'Waar de gegevens vandaan komen'],
      ['als-app', 'Als app op je startscherm'],
    ])
  })

  it('links to the forum, the sources, the contact form, the editors by email and the page Privacy, and from the sidebar to the contact form', () => {
    expect(links).toEqual([
      ['https://forum.heerenveen.org', 'ons forum'],
      ['/bronnen', 'Onze bronnen'],
      ['/contact', 'Contact'],
      ['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org'],
      ['/privacy', 'Privacy'],
      ['/bronnen#wedstrijden-en-spelers', 'Nederlandse Wikipedia'],
      ['/contact', 'Contact'],
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
      'met de koppen over sc Heerenveen op één plek.</b></p><p>We schrijven niks over en we passen niks aan.',
    )
  })

  it('names the founder without the old name of the site, and writes the club as sc Heerenveen', () => {
    expect(html).toContain('Vincent Smedinga begon de site in 1997. In die jaren hielpen veel mensen mee')
    expect(html).not.toContain('Online')
    expect(html).not.toMatch(/SC Heerenveen/)
  })
})
