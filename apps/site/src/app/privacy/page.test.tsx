import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PrivacyPage, { generateMetadata } from './page'

const html = renderToStaticMarkup(<PrivacyPage />)

/** The href and the text of each link, in the order of the page. */
const links = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

describe('the page Privacy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is titled Privacy, with a description and a canonical URL of its own', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/privacy' },
      description: expect.stringMatching(/^Wat we met gegevens doen/),
      openGraph: { title: 'Privacy', url: 'https://acc.sc.heerenveen.org/privacy' },
      title: 'Privacy',
    })
  })

  it('is the one main of the page, with all its content in one cell', () => {
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><div class="hf-page-cell">.*<\/div><\/main>$/)
  })

  it('has one h1 and no other heading, and no anchor of its own', () => {
    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual(['<h1 class="hf-heading-1">Privacy</h1>'])
    expect(html).not.toContain(' id=')
  })

  it('says that the site sets no cookies, follows nobody and loads nothing from another domain', () => {
    expect(html).toContain('De site zet geen cookies, volgt niemand en laadt niets van een ander domein.')
  })

  it('says in paragraphs, not a list, what the logs, email, questions and complaints are about', () => {
    const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/g)].map(([, paragraph]) => paragraph)

    expect(html).not.toMatch(/<(ul|ol|li)[ >]/)
    expect(paragraphs).toHaveLength(4)
    expect(paragraphs[1]).toContain('logbestanden bij, met onder meer IP-adressen')
    expect(paragraphs[2]).toContain('Een mail aan ons gebruiken we alleen om te antwoorden.')
    expect(paragraphs[2]).toContain('we hebben geen gegevens van je.')
    expect(paragraphs[3]).toContain('Autoriteit Persoonsgegevens')
  })

  it('links to the editors by email and to the Autoriteit Persoonsgegevens, and to nothing else', () => {
    expect(links).toEqual([
      ['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org'],
      ['https://www.autoriteitpersoonsgegevens.nl', 'Autoriteit Persoonsgegevens'],
    ])
  })
})
