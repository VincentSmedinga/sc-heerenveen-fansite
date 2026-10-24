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

  it('shows the first paragraph under the h1 as the intro, in a b, and no other paragraph', () => {
    expect(html).toContain('</h1><p class="hf-intro"><b>De site zet geen cookies, volgt niemand')
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
    expect(html.match(/<b>/g)).toHaveLength(1)
  })

  it('says that the site sets no cookies, follows nobody and loads nothing from another domain', () => {
    expect(html).toContain('De site zet geen cookies, volgt niemand en laadt niets van een ander domein.')
  })

  it('says that the browser keeps the choice for Licht or Donker on the device, that we do not see it, and how to remove it', () => {
    const paragraph = html.match(/<p[^>]*>(Kies je Licht of Donker.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('bewaart je browser die keuze, alleen op dit apparaat')
    expect(paragraph).toContain('Wij zien hem niet')
    expect(paragraph).toContain('de knop te kiezen die je systeem al geeft')
    expect(paragraph).toContain('de gegevens van de site in je browser te wissen')
  })

  it('says in paragraphs, not a list, what the logs, the theme, other sites, email, questions and complaints are about', () => {
    const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/g)].map(([, paragraph]) => paragraph)

    expect(html).not.toMatch(/<(ul|ol|li)[ >]/)
    expect(paragraphs).toHaveLength(7)
    expect(paragraphs[1]).toContain('logbestanden bij, met onder meer IP-adressen')
    expect(paragraphs[2]).toContain('Kies je Licht of Donker in de footer')
    expect(paragraphs[3]).toContain('Klik je door naar een medium of naar ons forum, dan verlaat je deze site.')
    expect(paragraphs[4]).toContain('dan komt het in de mailbox van de redactie')
    expect(paragraphs[4]).toContain('bewaren het tot de zaak is afgehandeld, hoogstens een jaar')
    expect(paragraphs[4]).toContain('Het formulier slaat niets op de site zelf op.')
    expect(paragraphs[5]).toContain('Vragen over je gegevens stel je aan de redactie')
    expect(paragraphs[6]).toContain('Autoriteit Persoonsgegevens')
  })

  it('no longer says that we have no data of the visitor', () => {
    expect(html).not.toContain('we hebben geen gegevens van je')
  })

  it('links to the contact form, the editors by email and the Autoriteit Persoonsgegevens, and to nothing else', () => {
    expect(links).toEqual([
      ['/contact', 'Contact'],
      ['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org'],
      ['https://www.autoriteitpersoonsgegevens.nl', 'Autoriteit Persoonsgegevens'],
    ])
  })
})
