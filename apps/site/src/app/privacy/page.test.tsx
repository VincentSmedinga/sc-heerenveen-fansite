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
      '<h2 class="hf-heading-2">Wat de hosting bewaart</h2>',
      '<h2 class="hf-heading-2">Wat je browser bewaart</h2>',
      '<h2 class="hf-heading-2">Als je ons een bericht stuurt</h2>',
      '<h2 class="hf-heading-2">Andere sites</h2>',
      '<h2 class="hf-heading-2">Vragen en klachten</h2>',
    ])
    expect(html).not.toContain(' id=')
  })

  it('shows the first paragraph under the h1 as the intro, in a b, and no other paragraph', () => {
    expect(html).toContain('</h1><p class="hf-intro"><b>Je bent welkom')
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
    expect(html.match(/<b>/g)).toHaveLength(1)
  })

  it('welcomes the visitor and says that the site sets no cookies, follows nobody and loads nothing from another domain', () => {
    expect(html).toContain('<b>Je bent welkom en we willen zo weinig mogelijk van je weten.')
    expect(html).toContain('De site zet geen cookies, volgt niemand en laadt niets van een ander domein.</b></p><h2')
    expect(html).not.toContain('Toch moeten we')
    expect(html).not.toContain('niks van je te weten')
  })

  it('says what we count: per day, how often a page was looked at and about how many visitors, on our own server', () => {
    const paragraph = html.match(/<p[^>]*>(We tellen alleen per dag.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('hoe vaak elke pagina is bekeken en hoeveel verschillende bezoekers er ongeveer waren')
    expect(paragraph).toContain('Dat doen we zelf, op onze eigen server.')
  })

  it('says how the code of the day works, and that the address and the browser text are written down nowhere', () => {
    const paragraph = html.match(/<p[^>]*>(Van je IP-adres.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('Van je IP-adres en je browser maakt de server een code')
    expect(paragraph).toContain('een willekeurig getal dat alleen voor die dag bestaat')
    expect(paragraph).toContain('Zo tellen we jou maar één keer per dag.')
    expect(paragraph).toContain('Het adres en de naam van je browser schrijven we nergens op, ook niet in het logboek.')
  })

  it('says, in the order of time, what stays until the end of the day, what is thrown away, what is kept and for how long', () => {
    const paragraph = html.match(/<p[^>]*>(Tot het einde van de dag.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain(
      'Tot het einde van de dag staan het getal en de codes in onze database. Daarna gooien we ze weg.',
    )
    expect(paragraph).toContain('We bewaren alleen de totalen, zolang de site bestaat.')
    expect(paragraph).toContain('we herkennen je niet van dag tot dag')
    expect(paragraph).toContain('Het tellen zet niets op je apparaat.')
  })

  it('says who is not counted: bots, the checks of the hosting, our own program and whoever asks not to be followed', () => {
    const paragraph = html.match(/<p[^>]*>(Bots, de controles.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain(
      'Bots, de controles van onze hosting en ons eigen programma dat de koppen ophaalt tellen niet mee.',
    )
    expect(paragraph).toContain('de instelling Do Not Track of Global Privacy Control')
    expect(html).not.toContain('importer')
  })

  it('says that the hosting keeps logs with IP addresses, that we cannot read them and do not use them', () => {
    const paragraph = html.match(/<p[^>]*>(Onze hosting.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('logbestanden bij, met onder meer IP-adressen')
    expect(paragraph).toContain('Wij kunnen daar niet bij en gebruiken ze niet.')
  })

  it('says that the browser keeps the choice for Licht or Donker on the device, that we do not see it, and how to remove it', () => {
    const paragraph = html.match(/<p[^>]*>(Kies je Licht of Donker.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('bewaart je browser die keuze, alleen op dit apparaat')
    expect(paragraph).toContain('Wij zien dat niet.')
    expect(paragraph).toContain('Wis de gegevens van de site in je browser om hem weg te halen.')
  })

  it('says that only an editor who logs in to the admin gets a cookie, with a number and nothing about the visitor', () => {
    const paragraph = html.match(/<p[^>]*>(Alleen een redacteur.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('Alleen een redacteur die inlogt in het beheer krijgt een cookie.')
    expect(paragraph).toContain('een nummer voor die sessie, niets over jou')
    expect(paragraph).toContain('hooguit 7 dagen')
  })

  it('says in paragraphs, not a list, what the counting, the logs, the theme, the cookie of the admin, email, other sites, questions and complaints are about', () => {
    const paragraphs = [...withoutIcons(html).matchAll(/<p[^>]*>(.*?)<\/p>/g)].map(([, paragraph]) => paragraph)

    expect(html).not.toMatch(/<(ul|ol|li)[ >]/)
    expect(paragraphs).toHaveLength(11)
    expect(paragraphs[1]).toContain('We tellen alleen per dag')
    expect(paragraphs[2]).toContain('Van je IP-adres')
    expect(paragraphs[3]).toContain('Tot het einde van de dag')
    expect(paragraphs[4]).toContain('Bots, de controles')
    expect(paragraphs[5]).toContain('logbestanden bij, met onder meer IP-adressen')
    expect(paragraphs[6]).toContain('Kies je Licht of Donker in de footer')
    expect(paragraphs[7]).toContain('Alleen een redacteur')
    expect(paragraphs[8]).toContain('dan komt het in de mailbox van de redactie')
    expect(paragraphs[8]).toContain('bewaren het tot de zaak is afgehandeld, hoogstens een jaar')
    expect(paragraphs[8]).toContain('Het formulier slaat niets op de site zelf op.')
    expect(paragraphs[9]).toContain('Klik je door naar een medium of naar ons forum, dan verlaat je deze site.')
    expect(paragraphs[10]).toContain('Vragen over je gegevens stel je aan de redactie')
    expect(paragraphs[10]).toContain('Autoriteit Persoonsgegevens')
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
