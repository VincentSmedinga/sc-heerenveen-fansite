import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AccessibilityPage, { generateMetadata } from './page'

const html = renderToStaticMarkup(<AccessibilityPage />)

/** The href and the text of each link, in the order of the page. */
const links = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

/** The words of the visible text, without the tags. */
const words = html
  .replaceAll(/<[^>]*>/g, ' ')
  .split(/\s+/)
  .filter(Boolean)

describe('the page Toegankelijkheid', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is titled Toegankelijkheid, with a description and a canonical URL of its own', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/toegankelijkheid' },
      description: expect.stringMatching(/^Wat we beloven/),
      openGraph: { title: 'Toegankelijkheid', url: 'https://acc.sc.heerenveen.org/toegankelijkheid' },
      title: 'Toegankelijkheid',
    })
  })

  it('is the one main of the page, with all its content in one cell', () => {
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><div class="hf-page-cell">.*<\/div><\/main>$/)
  })

  it('has one h1 and the four parts as h2, in order', () => {
    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Toegankelijkheid</h1>'])
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2">Wat we beloven</h2>',
      '<h2 class="hf-heading-2">Wat we al doen</h2>',
      '<h2 class="hf-heading-2">Hoe je ons bereikt</h2>',
      '<h2 class="hf-heading-2">Wanneer we het nakeken</h2>',
    ])
  })

  it('has no h3 to skip a level and is at most 200 words', () => {
    expect(html).not.toMatch(/<h[3-6]/)
    expect(words.length).toBeLessThanOrEqual(200)
  })

  it('aims for WCAG 2.2 AA and leaves out the sites of others', () => {
    expect(html).toContain('<p class="hf-intro"><b>We streven naar WCAG 2.2, niveau AA.')
    expect(html).toContain('niet van ons')
    expect(html).not.toMatch(/voldoet/)
  })

  it('says that accessibility matters and what we already do, in a sentence and not a list', () => {
    expect(html).toContain('We vinden toegankelijkheid belangrijk.')
    expect(html).toContain('Alles wat we toevoegen, maken we vanaf het begin toegankelijk.')
    expect(html).toContain('een mens heeft de site nagekeken.')
    expect(html).not.toMatch(/<[ou]l/)
  })

  it('links only to the editors by email', () => {
    expect(links).toEqual([['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org']])
    expect(html).toContain('We pakken een melding zo snel mogelijk op.')
  })

  it('shows the date of the statement in a time element with the full date', () => {
    expect(html).toContain('<time dateTime="2026-10-24">24 oktober 2026</time>')
  })

  it('writes the club as sc Heerenveen', () => {
    expect(html).not.toMatch(/SC Heerenveen/)
  })
})
