import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { withoutIcons } from '../../without-icons'
import PrivacyPage, { generateMetadata } from './page'

const html = renderToStaticMarkup(<PrivacyPage />)

/** The href and the text of each link, in the order of the page. */
const links = [...withoutIcons(html).matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [
  href,
  label,
])

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

  it('has one h1, and an h2 for each part, in order, without an anchor of its own', () => {
    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Privacy</h1>',
      '<h2 class="hf-heading-2">Wat we tellen</h2>',
      '<h2 class="hf-heading-2">Hoe een bezoeker één keer telt</h2>',
      '<h2 class="hf-heading-2">Wat de hosting bewaart</h2>',
      '<h2 class="hf-heading-2">Wat je browser bewaart</h2>',
      '<h2 class="hf-heading-2">Als je ons een bericht stuurt</h2>',
      '<h2 class="hf-heading-2">Andere sites</h2>',
      '<h2 class="hf-heading-2">Vragen en klachten</h2>',
    ])
    expect(html).not.toContain(' id=')
  })

  it('shows the first paragraph under the h1 as the intro, in a b, and no other paragraph', () => {
    expect(html).toContain('</h1><p class="hf-intro"><b>De site zet geen cookies, volgt niemand')
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
    expect(html.match(/<b>/g)).toHaveLength(1)
  })

  it('says that the site sets no cookies, follows nobody and loads nothing from another domain, and nothing more in the intro', () => {
    expect(html).toContain('<b>De site zet geen cookies, volgt niemand en laadt niets van een ander domein.</b></p><h2')
    expect(html).not.toContain('Toch moeten we')
  })

  it('says what we count and for how long we keep it: counters, per day and per page, and nothing on the device', () => {
    const paragraph = html.match(/<p[^>]*>(We tellen per dag.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('hoe vaak elke pagina is bekeken en hoeveel verschillende bezoekers er waren')
    expect(paragraph).toContain('op onze eigen server')
    expect(paragraph).toContain('Het zijn alleen getallen, en die bewaren we zolang de site bestaat.')
    expect(paragraph).toContain('Er komt niets op je apparaat te staan.')
  })

  it('says who is not counted: bots, the checks of the hosting, our importer and whoever asks not to be followed', () => {
    const paragraph = html.match(/<p[^>]*>(Bots, de controles.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('Bots, de controles van onze hosting en onze eigen importer tellen niet mee.')
    expect(paragraph).toContain('Do Not Track of Global Privacy Control')
  })

  it('says how the code of the day works, what is not kept and what is thrown away when the day is over', () => {
    const paragraph = html.match(/<p[^>]*>(De server maakt.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('van je IP-adres en je browser een code')
    expect(paragraph).toContain('een willekeurig getal dat alleen voor die dag bestaat')
    expect(paragraph).toContain('Het adres en de naam van je browser schrijft hij nergens op, ook niet in het logboek.')
    expect(paragraph).toContain(
      'Tot het einde van de dag staan het getal en de codes in onze database. Daarna gooien we ze weg.',
    )
    expect(paragraph).toContain('we herkennen je niet van dag tot dag')
  })

  it('says that the browser keeps the choice for Licht or Donker on the device, that we do not see it, and how to remove it', () => {
    const paragraph = html.match(/<p[^>]*>(Kies je Licht of Donker.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('bewaart je browser die keuze, alleen op dit apparaat')
    expect(paragraph).toContain('Wij zien hem niet')
    expect(paragraph).toContain('de gegevens van de site in je browser te wissen')
  })

  it('says that only whoever logs in to the admin gets a cookie, with a number and nothing about the visitor', () => {
    const paragraph = html.match(/<p[^>]*>(Alleen wie inlogt in het beheer.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('krijgt een cookie')
    expect(paragraph).toContain('de paar mensen van de redactie')
    expect(paragraph).toContain('een nummer voor die sessie, niets over jou')
    expect(paragraph).toContain('hooguit 7 dagen')
  })

  it('says in paragraphs, not a list, what the logs, the theme, the cookie of the admin, other sites, email, questions and complaints are about', () => {
    const paragraphs = [...withoutIcons(html).matchAll(/<p[^>]*>(.*?)<\/p>/g)].map(([, paragraph]) => paragraph)

    expect(html).not.toMatch(/<(ul|ol|li)[ >]/)
    expect(paragraphs).toHaveLength(10)
    expect(paragraphs[1]).toContain('We tellen per dag')
    expect(paragraphs[2]).toContain('Bots, de controles')
    expect(paragraphs[3]).toContain('De server maakt')
    expect(paragraphs[4]).toContain('logbestanden bij, met onder meer IP-adressen')
    expect(paragraphs[5]).toContain('Kies je Licht of Donker in de footer')
    expect(paragraphs[6]).toContain('Alleen wie inlogt in het beheer')
    expect(paragraphs[7]).toContain('dan komt het in de mailbox van de redactie')
    expect(paragraphs[7]).toContain('bewaren het tot de zaak is afgehandeld, hoogstens een jaar')
    expect(paragraphs[7]).toContain('Het formulier slaat niets op de site zelf op.')
    expect(paragraphs[8]).toContain('Klik je door naar een medium of naar ons forum, dan verlaat je deze site.')
    expect(paragraphs[9]).toContain('Vragen over je gegevens stel je aan de redactie')
    expect(paragraphs[9]).toContain('Autoriteit Persoonsgegevens')
  })

  it('no longer says that we have no data of the visitor', () => {
    expect(html).not.toContain('we hebben geen gegevens van je')
  })

  it('draws the icon for a link to another site behind the Autoriteit Persoonsgegevens only, hidden from screen readers', () => {
    const iconLinks = [
      ...html.matchAll(/<a href="([^"]*)">(?:[^<]*)<span class="hf-icon-tail">[^<]*<svg aria-hidden="true"/g),
    ]

    expect(iconLinks.map(([, href]) => href)).toEqual(['https://www.autoriteitpersoonsgegevens.nl'])
    // The other icon is the envelope before the address.
    expect(html.match(/<svg /g)).toHaveLength(2)
  })

  it('draws the envelope in front of the address, hidden from screen readers', () => {
    expect(html).toMatch(
      /<a href="mailto:fansite@heerenveen\.org"><span class="hf-icon-head"><svg aria-hidden="true" class="hf-icon"[^>]*>.*?<\/svg>f<\/span>ansite@heerenveen\.org<\/a>/,
    )
  })

  it('links to the contact form, the editors by email and the Autoriteit Persoonsgegevens, and to nothing else', () => {
    expect(links).toEqual([
      ['/contact', 'Contact'],
      ['mailto:fansite@heerenveen.org', 'fansite@heerenveen.org'],
      ['https://www.autoriteitpersoonsgegevens.nl', 'Autoriteit Persoonsgegevens'],
    ])
  })
})
