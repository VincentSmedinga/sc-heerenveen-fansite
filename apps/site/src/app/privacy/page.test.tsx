import { graceDays, unusedMonths } from '@fansite/db/clean-up-supporters'
import { keepRecordDays } from '@fansite/db/send-reminders'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { monthsKept } from '#src/fans/blocked-addresses'
import { supporterKind } from '#src/fans/supporter-login'
import { headingAnchors, withoutHeadingLinks, withoutIcons } from '#src/without-icons'

import PrivacyPage, { generateMetadata } from './page'

const html = renderToStaticMarkup(<PrivacyPage />)

// Without the links that the headings are, for the tests about the other links and icons.
const plain = withoutHeadingLinks(html)

/** The href and the text of each link, in the order of the page. */
const links = [...withoutIcons(plain).matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [
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

  it('has one h1, and an h2 for each part, in order', () => {
    expect(plain.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Privacy</h1>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="tellen">Wat we tellen</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="hosting">Wat de hosting bewaart</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="cookies">Wat je browser bewaart</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="berichten">Als je ons een bericht stuurt</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="andere-sites">Andere sites</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="vragen">Vragen en klachten</h2>',
    ])
  })

  it('makes each h2 a link to itself, with a Dutch anchor that the page chose', () => {
    expect(headingAnchors(html)).toEqual([
      ['tellen', 'Wat we tellen'],
      ['hosting', 'Wat de hosting bewaart'],
      ['cookies', 'Wat je browser bewaart'],
      ['berichten', 'Als je ons een bericht stuurt'],
      ['andere-sites', 'Andere sites'],
      ['vragen', 'Vragen en klachten'],
    ])
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
    const paragraph = html.match(/<p[^>]*>(We tellen per dag.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('hoe vaak elke pagina is bekeken en hoeveel verschillende bezoekers er ongeveer waren')
    expect(paragraph).toContain('van welke pagina je naar welke pagina gaat, en waar je vandaan kwam')
    expect(paragraph).toContain('Van een andere site bewaren we alleen de soort, nooit het adres.')
    expect(paragraph).toContain('welke soort browser en welk besturingssysteem')
    expect(paragraph).toContain('Dat doen we zelf, op onze eigen server.')
  })

  it('says how the code of the day works, and that the address and the browser text are written down nowhere', () => {
    const paragraph = html.match(/<p[^>]*>(Van je IP-adres.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('Van je IP-adres en je browser maakt de server een code')
    expect(paragraph).toContain('een willekeurig getal dat alleen voor die dag bestaat')
    expect(paragraph).toContain('Zo tellen we jou maar één keer per dag.')
    expect(paragraph).toContain(
      'Je IP-adres, de volledige naam van je browser en de pagina’s die jij bekijkt schrijven we nergens op, ook niet in het logboek.',
    )
    expect(paragraph).toContain('We bewaren alleen totalen van alle bezoekers samen')
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
    expect(paragraph).toContain(
      'ook niet als je browser geen taalinstelling meestuurt of een pagina alleen vooraf laadt',
    )
    expect(paragraph).toContain(
      'Per dag tellen we hoeveel verzoeken we zo overslaan en waarom, zonder iets over wie ze deed.',
    )
    expect(html).not.toContain('importer')
  })

  it('says that the hosting keeps logs with IP addresses and browser names, that the editors can see them and what we use them for', () => {
    const paragraph = html.match(/<p[^>]*>(Onze hosting.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('logbestanden bij, met onder meer je IP-adres en de naam van je browser')
    expect(paragraph).toContain('De redactie kan ze zien in het beheerpaneel van de host.')
    expect(paragraph).toContain('We gebruiken ze alleen om te controleren of de site en onze cijfers kloppen')
    expect(paragraph).toContain('we bewaren er zelf niets van')
    expect(paragraph).not.toContain('Wij kunnen daar niet bij')
  })

  it('says that the browser keeps the choice of the theme button on the device, that we do not see it, and how to remove it', () => {
    const paragraph = html.match(/<p[^>]*>(Kies je met de knop.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('bewaart je browser die keuze, alleen op dit apparaat')
    expect(paragraph).toContain('Wij zien dat niet.')
    expect(paragraph).toContain('Wis de gegevens van de site in je browser om hem weg te halen.')
  })

  it('says that only an editor who logs in to the admin gets a cookie, with a number and nothing about the visitor', () => {
    const paragraph = html.match(/<p[^>]*>(Alleen een redacteur.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('Alleen een redacteur die inlogt in het beheer krijgt een cookie.')
    expect(paragraph).toContain('een nummer voor die sessie, niets over jou')
    expect(paragraph).toContain('hooguit 14 dagen, en 9 dagen zonder gebruik')
  })

  it('says that the browser of that editor also keeps a sign for the menu, which holds nothing and goes nowhere', () => {
    const paragraph = html.match(/<p[^>]*>(Alleen een redacteur.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('bewaart de browser van die redacteur een teken dat zegt: hier is iemand ingelogd')
    expect(paragraph).toContain('Het teken bevat geen gegevens, gaat nergens heen en verandert alleen dat menu')
  })

  it('says that the browser of that editor keeps the input of a match report on the device, until it is saved', () => {
    const paragraph = html.match(/<p[^>]*>(Alleen een redacteur.*?)<\/p>/)?.[1] ?? ''

    expect(paragraph).toContain('bewaart ook de invoer van dat formulier op dit apparaat')
    expect(paragraph).toContain('tot het verslag is opgeslagen, hij uitlogt of er dertig dagen voorbij zijn')
    expect(paragraph).toContain('Die invoer gaat nergens heen.')
  })

  it('says in paragraphs, not a list, what the counting, the logs, the theme, the cookie of the admin, email, other sites, questions and complaints are about', () => {
    const paragraphs = [...withoutIcons(plain).matchAll(/<p[^>]*>(.*?)<\/p>/g)].map(([, paragraph]) => paragraph)

    expect(html).not.toMatch(/<(ul|ol|li)[ >]/)
    expect(paragraphs).toHaveLength(11)
    expect(paragraphs[1]).toContain('We tellen per dag')
    expect(paragraphs[2]).toContain('Van je IP-adres')
    expect(paragraphs[3]).toContain('Tot het einde van de dag')
    expect(paragraphs[4]).toContain('Bots, de controles')
    expect(paragraphs[5]).toContain('logbestanden bij, met onder meer je IP-adres')
    expect(paragraphs[6]).toContain('Kies je met de knop bovenaan een licht of donker thema')
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
      ...plain.matchAll(/<a href="([^"]*)">(?:[^<]*)<span class="hf-icon-tail">[^<]*<svg aria-hidden="true"/g),
    ]

    expect(iconLinks.map(([, href]) => href)).toEqual(['https://www.autoriteitpersoonsgegevens.nl'])
    // The other icon is the envelope before the address.
    expect(plain.match(/<svg /g)).toHaveLength(2)
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

describe('the page Privacy with accounts on', () => {
  const day = 24 * 60 * 60 * 1000

  function withAccounts() {
    vi.stubEnv('FANS_ACCOUNTS', 'on')

    const on = renderToStaticMarkup(<PrivacyPage />)

    return { on, plain: withoutHeadingLinks(on), text: withoutIcons(withoutHeadingLinks(on)) }
  }

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads as before with accounts off: no part about accounts and no cookie of supporters', () => {
    expect(html).not.toContain('Als je een account maakt')
    expect(html).not.toContain('Een fan die inlogt')
    expect(html).not.toContain('tenzij je inlogt')
  })

  it('says in the first sentence that the site sets no cookies unless you log in', () => {
    expect(withAccounts().on).toContain('De site zet geen cookies, tenzij je inlogt, volgt niemand en laadt niets')
  })

  it('has the part about accounts after the cookies and before the messages, with the anchor account', () => {
    const { plain: page } = withAccounts()

    expect(page.match(/<h2[^>]*id="([^"]*)"/g)?.map((tag) => tag.match(/id="([^"]*)"/)?.[1])).toEqual([
      'tellen',
      'hosting',
      'cookies',
      'account',
      'berichten',
      'andere-sites',
      'vragen',
    ])
    expect(headingAnchors(withAccounts().on)).toContainEqual(['account', 'Als je een account maakt'])
  })

  it('describes the cookie of supporters, its path, the sign in the browser and why there is no cookie notice', () => {
    const { text } = withAccounts()

    expect(supporterKind.cookie).toMatchObject({ name: 'fans-sessie', path: '/fans' })
    expect(text).toContain(
      'Een fan die inlogt, krijgt ook een cookie. Het bevat een nummer voor die sessie, niets over jou.',
    )
    expect(text).toContain('alleen naar pagina&#x27;s onder /fans')
    expect(text).toContain('een teken met je schermnaam')
    expect(text).toContain('Een cookiemelding vragen we niet: dit cookie is nodig voor iets waar je zelf om vraagt')
  })

  it('gives the numbers of the code: 90 days idle, a year at most, 15 minutes, 24 months, 30 days, 12 months', () => {
    const { text } = withAccounts()

    expect(supporterKind.idleLifetime / day).toBe(90)
    expect(text).toContain('tot 90 dagen na je laatste bezoek, en hoogstens een jaar na het inloggen')
    expect(supporterKind.absoluteLifetime / day).toBe(365)
    expect(supporterKind.linkLifetime / 60_000).toBe(15)
    expect(text).toContain('Een link of een code uit een mail werkt 15 minuten.')
    expect(unusedMonths).toBe(24)
    expect(text).toContain('Gebruik je het twee jaar niet')
    expect(graceDays).toBe(30)
    expect(text).toContain('het account verdwijnt 30 dagen later')
    expect(monthsKept).toBe(12)
    expect(text).toContain('bewaren we 12 maanden een code van het e-mailadres')
  })

  it('says what we keep, what we do not keep, what others see and what closing does', () => {
    const { text } = withAccounts()

    expect(text).toContain('Met een account bewaren we je schermnaam, je e-mailadres')
    expect(text).toContain('We bewaren geen IP-adres, geen gegevens over je browser, geen echte naam')
    expect(text).toContain('Andere fans zien je schermnaam en je punten in de standen, tenzij je dat uitzet.')
    expect(text).toContain('Een account is een profiel dat je zelf maakt.')
    expect(text).toContain('Dan verdwijnen je schermnaam en je e-mailadres')
    expect(text).toContain('vraag het dan de redactie voordat je opheft')
    expect(text).toContain('Het adres zelf bewaren we niet.')
    expect(text).toContain('één keer als je account twee jaar niet is gebruikt')
  })

  it('no longer says that only an editor gets a cookie', () => {
    const { text } = withAccounts()

    expect(text).toContain('Een redacteur die inlogt in het beheer krijgt een cookie.')
    expect(text).not.toContain('Alleen een redacteur')
  })

  it('says what the reminder is, how it is turned off and what we keep for it, only while Prognose is on', () => {
    vi.stubEnv('FANS_PROGNOSE', 'on')

    const { text } = withAccounts()

    expect(text).toContain('Dat laatste is de herinnering voor de Prognose.')
    expect(text).toContain('de dag voor een wedstrijd, als je nog niet hebt voorspeld')
    expect(text).toContain('een link om de herinnering zonder inloggen uit te zetten')
    expect(text).toContain('Daar staat geen adres bij. Het verdwijnt met je account, en een maand na de wedstrijd.')
    expect(keepRecordDays).toBe(30)

    vi.stubEnv('FANS_PROGNOSE', 'off')

    expect(withAccounts().text).not.toContain('herinnering voor de Prognose')
  })

  it('names the answers to the Fantest among what an account keeps, only while the Fantest is on', () => {
    vi.stubEnv('FANS_FANTEST', 'on')

    expect(withAccounts().text).toContain(
      'Doe je mee aan de Fantest, dan bewaren we je antwoorden, je score en het moment waarop je ze verstuurde.',
    )

    vi.stubEnv('FANS_FANTEST', 'off')

    expect(withAccounts().text).not.toContain('Doe je mee aan de Fantest')
  })

  it('links to Mijn account', () => {
    expect(withAccounts().plain).toContain('<a href="/fans/mijn-account">Mijn account</a>')
  })
})
