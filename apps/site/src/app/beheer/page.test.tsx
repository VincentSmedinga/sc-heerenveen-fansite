import { seasonOf } from '@fansite/db/season'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ConfirmPage, { metadata as confirmMetadata } from './inloggen/bevestigen/page'
import LoginPage, { metadata as loginMetadata } from './inloggen/page'
import SentPage, { metadata as sentMetadata } from './inloggen/verstuurd/page'
import AdminPage, { metadata as adminMetadata } from './page'

const {
  countClubsWithoutCountry,
  countHeldChanges,
  countMatchesWithoutResult,
  countReportsToCheck,
  countWaitingDifferences,
  countWaitingFieldDifferences,
  countWaitingStatDifferences,
  findSession,
  loginLinkWorks,
  readMatchGaps,
  readPersonGaps,
  readStadiumGaps,
  requireRole,
  sessionToken,
} = vi.hoisted(() => ({
  countClubsWithoutCountry: vi.fn(),
  countHeldChanges: vi.fn(),
  countMatchesWithoutResult: vi.fn(),
  countReportsToCheck: vi.fn(),
  countWaitingDifferences: vi.fn(),
  countWaitingFieldDifferences: vi.fn(),
  countWaitingStatDifferences: vi.fn(),
  findSession: vi.fn(),
  loginLinkWorks: vi.fn(),
  readMatchGaps: vi.fn(),
  readPersonGaps: vi.fn(),
  readStadiumGaps: vi.fn(),
  requireRole: vi.fn(),
  sessionToken: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/beheer/club-country', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  countClubsWithoutCountry,
}))
vi.mock('#src/beheer/match-entries', () => ({
  countHeldChanges,
  countMatchesWithoutResult,
  countWaitingDifferences,
}))
vi.mock('#src/beheer/match-reports', () => ({ countReportsToCheck }))
vi.mock('@fansite/db/player-field-differences', () => ({ countWaitingFieldDifferences }))
vi.mock('@fansite/db/player-stat-differences', () => ({ countWaitingStatDifferences }))
vi.mock('#src/beheer/person-table', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  readPersonGaps,
}))
vi.mock('#src/beheer/quality-table', () => ({ readMatchGaps }))
vi.mock('#src/beheer/stadium-quality', () => ({ readStadiumGaps }))
vi.mock('#src/beheer/require-role', () => ({ requireRole, sessionToken }))
vi.mock('#src/beheer/sessions', () => ({ findSession, loginLinkWorks }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

beforeEach(() => {
  countClubsWithoutCountry.mockReset()
  countClubsWithoutCountry.mockResolvedValue({ europe: 0, total: 0 })
  countHeldChanges.mockReset()
  countHeldChanges.mockResolvedValue({ seasons: [], total: 0 })
  countMatchesWithoutResult.mockReset()
  countMatchesWithoutResult.mockResolvedValue(0)
  countReportsToCheck.mockReset()
  countReportsToCheck.mockResolvedValue({ seasons: [], total: 0 })
  countWaitingDifferences.mockReset()
  countWaitingDifferences.mockResolvedValue({ seasons: [], total: 0 })
  findSession.mockReset()
  loginLinkWorks.mockReset()
  readMatchGaps.mockReset()
  readMatchGaps.mockResolvedValue([])
  readPersonGaps.mockReset()
  readPersonGaps.mockResolvedValue([])
  readStadiumGaps.mockReset()
  readStadiumGaps.mockResolvedValue({ total: 0 })
  countWaitingStatDifferences.mockReset()
  countWaitingStatDifferences.mockResolvedValue(new Map())
  countWaitingFieldDifferences.mockReset()
  countWaitingFieldDifferences.mockResolvedValue(new Map())
  requireRole.mockReset()
  sessionToken.mockReset()
  sessionToken.mockResolvedValue(undefined)
})

const currentSeason = seasonOf(new Date())

/** The h1s, h2s and so on of some markup, as text. */
const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

describe('every page of the admin', () => {
  it.each([
    ['the admin', adminMetadata],
    ['the login page', loginMetadata],
    ['the page after the request', sentMetadata],
    ['the page of the link', confirmMetadata],
  ])('tells search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })
})

describe('the admin', () => {
  const links = (html: string) => html.match(/<a [^>]*>(.*?)<\/a>/g)
  const tileList = (html: string) =>
    (html.match(/<ul[^>]*aria-label="Schermen van het beheer"[\s\S]*?<\/ul>/) ?? [])[0] ?? ''

  it('shows an author the articles and his account, by his first name and role, and no button to log out', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', firstName: 'Jelle', role: 'author', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor', 'author')
    expect(html).toContain('Je bent ingelogd als Jelle (auteur).')
    // Logging out is in the bar of the admin (AdminScreens), on every page.
    expect(html).not.toContain('<button')
    expect(html).not.toContain('Uitloggen')
    expect(links(tileList(html))).toEqual([
      '<a class="hf-tile-link" href="/beheer/artikelen">Artikelen</a>',
      '<a class="hf-tile-link" href="/beheer/mijn-account">Mijn account</a>',
    ])
    expect(html).toContain('Schrijf je eigen artikelen en publiceer ze.')
    expect(countMatchesWithoutResult).not.toHaveBeenCalled()
  })

  it('shows an editor a tile for every screen but the accounts, and says the role', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', firstName: '', role: 'editor', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(html).toContain('Je bent ingelogd als jelle@example.org (redacteur).')
    expect(links(tileList(html))).toEqual([
      '<a class="hf-tile-link" href="/beheer/berichten">Berichten</a>',
      '<a class="hf-tile-link" href="/beheer/artikelen">Artikelen</a>',
      '<a class="hf-tile-link" href="/beheer/wedstrijden">Wedstrijden</a>',
      '<a class="hf-tile-link" href="/beheer/stadions">Stadions</a>',
      '<a class="hf-tile-link" href="/beheer/clubs">Clubs</a>',
      '<a class="hf-tile-link" href="/beheer/bezoek">Bezoek</a>',
      '<a class="hf-tile-link" href="/beheer/mijn-account">Mijn account</a>',
    ])
    expect(html).toContain('Vul wedstrijden in of verbeter ze.')
    expect(html).toContain('Beheer de stadions, hun namen en hun adres, en de thuisvelden van een club.')
    expect(html).toContain('Houd bij welke namen een club droeg, sinds wanneer, en in welk land hij speelt.')
  })

  it.each(['author', 'editor', 'owner'])('shows the role %s a tile Fantest while the Fantest is on', async (role) => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_FANTEST', 'on')
    requireRole.mockResolvedValue({ email: 'jelle@example.org', firstName: '', role, userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(links(tileList(html))).toContain('<a class="hf-tile-link" href="/beheer/fantest">Fantest</a>')
    vi.unstubAllEnvs()
  })

  it('shows the owner the accounts as well', async () => {
    requireRole.mockResolvedValue({ email: 'eigenaar@example.test', firstName: 'Eva', role: 'owner', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(html).toContain('Je bent ingelogd als Eva (eigenaar).')
    expect(links(tileList(html))).toContain('<a class="hf-tile-link" href="/beheer/accounts">Accounts</a>')
  })

  it('has no card and no sidebar when nothing waits', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(html).not.toContain('Te doen')
    expect(html).not.toContain('te-doen-kop')
  })

  it('puts the card Te doen in the area todo before the tiles, so it comes first on a phone', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    countMatchesWithoutResult.mockResolvedValue(1)

    const html = renderToStaticMarkup(await AdminPage())
    const section = (html.match(/<section[\s\S]*?<\/section>/) ?? [])[0] ?? ''

    expect(section).toContain('aria-labelledby="te-doen-kop"')
    expect(section).toContain('style="grid-area:todo"')
    expect(headings(section)).toEqual(['h2 Te doen'])
    expect(html).not.toContain('<aside')
    expect(html.indexOf('Te doen')).toBeLessThan(html.indexOf('Schermen van het beheer'))
    expect(html).toContain('&quot;main todo&quot;')
  })

  it('tells an editor how many differences with Wikipedia wait for a decision, and nobody else', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 1 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('1 afwijking van Wikipedia wacht op een besluit')

    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 3 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('3 afwijkingen van Wikipedia wachten op een besluit')

    countWaitingDifferences.mockResolvedValue({ seasons: [], total: 0 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('afwijking')

    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 3 })
    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    const html = renderToStaticMarkup(await AdminPage())

    expect(html).not.toContain('afwijking')
    expect(html).not.toContain('te-doen-kop')
    expect(countWaitingDifferences).toHaveBeenCalledTimes(3)
  })

  it('tells an editor how many changes of Wikipedia are held back, and nobody else', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 1 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('1 wijziging van Wikipedia wacht op een besluit')

    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 3 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('3 wijzigingen van Wikipedia wachten op een besluit')

    // Each line counts its own kind: held changes do not make a line about differences.
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('afwijking')

    countHeldChanges.mockResolvedValue({ seasons: [], total: 0 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('wijziging')

    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 3 })
    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    countHeldChanges.mockClear()
    const html = renderToStaticMarkup(await AdminPage())

    expect(html).not.toContain('wijziging')
    expect(html).not.toContain('te-doen-kop')
    expect(countHeldChanges).not.toHaveBeenCalled()
  })

  it('links the line about held changes to the choice Wikipedia wacht of the season that holds them', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    const link = async () =>
      (renderToStaticMarkup(await AdminPage()).match(
        /<a href="([^"]*)">\d+ wijzigingen? van Wikipedia wachte?n? op een besluit<\/a>/,
      ) ?? [])[1]
    const slug = currentSeason.replace('/', '-')

    countHeldChanges.mockResolvedValue({ seasons: [currentSeason, '2013/14'], total: 2 })
    expect(await link()).toBe(`/beheer/wedstrijden?seizoen=${slug}&amp;tonen=wikipedia-wacht`)

    // A season that is over: the newest one that holds a change.
    countHeldChanges.mockResolvedValue({ seasons: ['2024/25', '2013/14'], total: 2 })
    expect(await link()).toBe('/beheer/wedstrijden?seizoen=2024-25&amp;tonen=wikipedia-wacht')
  })

  it('tells an editor how many matches of the season have no result, and nobody else', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    countMatchesWithoutResult.mockResolvedValue(1)
    expect(renderToStaticMarkup(await AdminPage())).toContain('>1 wedstrijd zonder uitslag</a>')

    countMatchesWithoutResult.mockResolvedValue(4)
    const html = renderToStaticMarkup(await AdminPage())

    expect(html).toContain('>4 wedstrijden zonder uitslag</a>')
    expect(countMatchesWithoutResult).toHaveBeenLastCalledWith({}, currentSeason, expect.any(Date))
    expect(html).toContain('<a href="/beheer/wedstrijden">4 wedstrijden zonder uitslag</a>')

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    countMatchesWithoutResult.mockClear()
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('zonder uitslag')
    expect(countMatchesWithoutResult).not.toHaveBeenCalled()
  })

  it('tells an editor how many gaps the matches have, with a link to the table, and nobody else (#1304)', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('gat')

    readMatchGaps.mockResolvedValue([
      { gaps: { doelpunten: { sign: '2', total: 2 }, verslag: { sign: '?', total: 1 } }, id: 1 },
      { gaps: {}, id: 2 },
      { gaps: { uitslag: { sign: '?', total: 1 } }, id: 3 },
    ])

    const html = renderToStaticMarkup(await AdminPage())

    expect(html).toContain('<a href="/beheer/wedstrijden/kwaliteit">4 gaten in 2 wedstrijden</a>')

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    readMatchGaps.mockClear()
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('gaten')
    expect(readMatchGaps).not.toHaveBeenCalled()
  })

  it('tells an editor how many clubs have no country, with a link to the list, and nobody else (#1306)', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('zonder land')

    countClubsWithoutCountry.mockResolvedValue({ europe: 1, total: 3 })

    expect(renderToStaticMarkup(await AdminPage())).toContain(
      '<a href="/beheer/clubs/kwaliteit">3 clubs zonder land</a>',
    )

    countClubsWithoutCountry.mockResolvedValue({ europe: 0, total: 1 })

    expect(renderToStaticMarkup(await AdminPage())).toContain(
      '<a href="/beheer/clubs/kwaliteit">1 club zonder land</a>',
    )

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    countClubsWithoutCountry.mockClear()
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('zonder land')
    expect(countClubsWithoutCountry).not.toHaveBeenCalled()
  })

  it('tells an editor how many gaps the stadiums and clubs have, with a link to the list, and nobody else (#1307)', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('stadions en clubs')

    readStadiumGaps.mockResolvedValue({ total: 5 })

    expect(renderToStaticMarkup(await AdminPage())).toContain(
      '<a href="/beheer/stadions/kwaliteit">5 gaten bij stadions en clubs</a>',
    )

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    readStadiumGaps.mockClear()
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('stadions en clubs')
    expect(readStadiumGaps).not.toHaveBeenCalled()
  })

  it('tells an editor how many persons have a gap, and which player differences wait, and nobody else (#1305)', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('persoon')

    readPersonGaps.mockResolvedValue([
      { gaps: { geboren: true, land: true }, id: 1 },
      { gaps: {}, id: 2 },
      { gaps: { naam: true }, id: 3 },
    ])
    countWaitingStatDifferences.mockResolvedValue(new Map([['2024/25', 2]]))
    countWaitingFieldDifferences.mockResolvedValue(
      new Map([
        ['2023/24', 1],
        [currentSeason, 3],
      ]),
    )

    const html = renderToStaticMarkup(await AdminPage())

    expect(html).toContain('<a href="/beheer/spelers/kwaliteit/personen">3 gaten bij 2 personen</a>')
    expect(html).toContain(
      '<a href="/beheer/spelers/kwaliteit/spelerscijfers/2024-25">2 spelerscijfers verschillen en wachten op een besluit</a>',
    )
    expect(html).toContain(
      `<a href="/beheer/spelers/kwaliteit/spelersgegevens/${currentSeason.replace('/', '-')}">4 spelersgegevens verschillen en wachten op een besluit</a>`,
    )

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    readPersonGaps.mockClear()
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('persoon')
    expect(readPersonGaps).not.toHaveBeenCalled()
  })

  it('tells an editor how many reports that were klaar are no longer right, with a link to the list (#1077)', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('klop')

    const slug = currentSeason.replace('/', '-')

    countReportsToCheck.mockResolvedValue({ seasons: [currentSeason, '2024/25'], total: 1 })
    expect(renderToStaticMarkup(await AdminPage())).toContain(
      `<a href="/beheer/wedstrijden?seizoen=${slug}&amp;tonen=alles">1 verslag klopt niet</a>`,
    )

    countReportsToCheck.mockResolvedValue({ seasons: ['2024/25', '2023/24'], total: 2 })
    expect(renderToStaticMarkup(await AdminPage())).toContain(
      '<a href="/beheer/wedstrijden?seizoen=2024-25&amp;tonen=alles">2 verslagen kloppen niet</a>',
    )

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'author', userId: 2 })
    countReportsToCheck.mockClear()
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('klop')
    expect(countReportsToCheck).not.toHaveBeenCalled()
  })

  it('lists the lines of the card one under the other, the differences first', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 2 })
    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 1 })
    countMatchesWithoutResult.mockResolvedValue(3)

    const html = renderToStaticMarkup(await AdminPage())
    const section = (html.match(/<section[\s\S]*?<\/section>/) ?? [])[0] ?? ''

    expect([...section.matchAll(/<li>(.*?)<\/li>/g)].map(([, line]) => line?.replace(/<[^>]*>/g, ''))).toEqual([
      '2 afwijkingen van Wikipedia wachten op een besluit',
      '1 wijziging van Wikipedia wacht op een besluit',
      '3 wedstrijden zonder uitslag',
    ])
  })

  it('links the line about differences to the list of the changed matches of the season that holds them', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })
    const link = async () =>
      (renderToStaticMarkup(await AdminPage()).match(
        /<a href="([^"]*)">\d+ afwijkingen? van Wikipedia wachte?n? op een besluit<\/a>/,
      ) ?? [])[1]
    const slug = currentSeason.replace('/', '-')

    // The current season wins when it has some, whatever other seasons hold.
    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason, '2024/25'], total: 2 })
    expect(await link()).toBe(`/beheer/wedstrijden?seizoen=${slug}&amp;tonen=aangepast`)

    // Otherwise the newest season that has some, which is the first the count gives.
    countWaitingDifferences.mockResolvedValue({ seasons: ['2024/25', '2023/24'], total: 2 })
    expect(await link()).toBe('/beheer/wedstrijden?seizoen=2024-25&amp;tonen=aangepast')
  })

  it('shows nothing to somebody without a session', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(AdminPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })
})

describe('the login page', () => {
  const render = async (fout?: string) =>
    renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve(fout === undefined ? {} : { fout }) }))

  it('asks for an email address and nothing else: no password, no puzzle', async () => {
    const html = await render()

    expect(headings(html)).toEqual(['h1 Inloggen voor beheer'])
    expect(html.match(/<input[^>]*>/g)).toHaveLength(1)
    expect(html).toMatch(/<label[^>]*for="e-mail"[^>]*>E-mailadres<\/label>/)
    expect(html).toMatch(
      /<input[^>]*autoComplete="email"[^>]*type="email"|<input[^>]*type="email"[^>]*autoComplete="email"/i,
    )
    expect(html).toMatch(/<input[^>]*name="email"/)
    expect(html).toContain('Je hebt geen wachtwoord nodig.')
    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual(['<button type="submit">Stuur me een link</button>'])
    expect(html).not.toMatch(/captcha|recaptcha|password/i)
  })

  it('shows no error at first', async () => {
    expect(await render()).not.toContain('Er is iets mis')
  })

  it('shows a wrong address in the summary and at the field', async () => {
    const message = 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.'
    const html = await render('ongeldig')

    expect(html).toContain('Er is iets mis')
    expect(html).toContain(`<a href="#e-mail">${message}</a>`)
    expect(html).toContain('aria-invalid="true"')
    expect(html.split(message)).toHaveLength(3)
  })

  it.each([
    ['te-veel', 'Er zijn te veel links gevraagd. Probeer het over een kwartier opnieuw.'],
    ['link', 'Die link werkt niet meer. Vraag hieronder een nieuwe aan.'],
  ])('says %s in a message above the form, and does not mark the field as wrong', async (fout, message) => {
    const html = await render(fout)

    expect(html).toContain(`<p>${message}</p>`)
    expect(html).not.toContain('Er is iets mis')
    expect(html).not.toContain('aria-invalid')
    expect(html.split(message)).toHaveLength(2)
  })

  it('shows no message for an error it does not know, and does not repeat what the address says', async () => {
    const html = await render('<script>alert(1)</script>')

    expect(html).not.toContain('Er is iets mis')
    expect(html).not.toContain('alert(1)')
  })

  it('goes on to the admin for somebody who is logged in already', async () => {
    sessionToken.mockResolvedValue('token')
    findSession.mockResolvedValue({ email: 'jelle@example.org', role: 'editor', userId: 1 })

    await expect(render()).rejects.toThrow('redirect to /beheer')
  })

  it('shows the form to somebody with a cookie whose session has ended', async () => {
    sessionToken.mockResolvedValue('token')
    findSession.mockResolvedValue(undefined)

    expect(await render()).toContain('Stuur me een link')
  })
})

describe('the page after the request', () => {
  const render = async (query: Record<string, string> = {}) =>
    renderToStaticMarkup(await SentPage({ searchParams: Promise.resolve(query) }))

  it('says the same to everybody: if the address has an account, a link and a code were mailed', async () => {
    const html = await render({ ref: 'abc' })

    expect(headings(html)).toEqual(['h1 Kijk in je mail'])
    expect(html).toContain('Als dit adres een account heeft, hebben we een link en een code gemaild.')
    expect(html).toContain('De link en de code werken 15 minuten en één keer.')
    expect(html).toContain('<a href="/beheer/inloggen">Een ander adres proberen</a>')
  })

  it('has a field for the code that iOS can fill in from the mail, with a label and no error at first', async () => {
    const html = await render({ ref: 'abc' })
    const input = html.match(/<input[^>]*name="code"[^>]*>/)?.[0] ?? ''

    expect(html).toMatch(/<label[^>]*for="code"[^>]*>Code uit de mail/)
    expect(input).toContain('autoComplete="one-time-code"')
    expect(input).toContain('inputMode="numeric"')
    expect(html).toContain('Inloggen met code')
    expect(html).not.toContain('Die code werkt niet')
    expect(html).not.toContain('abc')
  })

  it('shows one error for a code that did not work, on the field and in the summary', async () => {
    const html = await render({ fout: 'code', ref: 'abc' })

    expect(html.match(/Die code werkt niet\./g)).toHaveLength(2)
    expect(html).toContain('aria-invalid="true"')
  })

  it('has no field without a reference of a request', async () => {
    expect(await render()).not.toContain('name="code"')
  })
})

describe('the page of the link', () => {
  const render = async (token?: string) =>
    renderToStaticMarkup(await ConfirmPage({ searchParams: Promise.resolve(token === undefined ? {} : { token }) }))

  it('logs in only with a button, so opening the link does not use it up', async () => {
    loginLinkWorks.mockResolvedValue(true)

    const html = await render('abc')

    expect(headings(html)).toEqual(['h1 Inloggen'])
    // The page says that the link is right and what to do now, above the button, so the extra
    // click is no surprise.
    expect(html).toContain('Deze link klopt. Kies hieronder Inloggen om binnen te komen.')
    expect(html.indexOf('Deze link klopt.')).toBeLessThan(html.indexOf('<button'))
    expect(html).not.toContain('Deze link werkt niet')
    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual(['<button type="submit">Inloggen</button>'])
    expect(html).not.toContain('abc')
    expect(loginLinkWorks).toHaveBeenCalledExactlyOnceWith({}, 'abc')
  })

  it.each([undefined, 'abc'])(
    'says the link does not work for token %j that does not work, and links to a new one',
    async (token) => {
      loginLinkWorks.mockResolvedValue(false)

      const html = await render(token)

      expect(headings(html)).toEqual(['h1 Deze link werkt niet'])
      expect(html).toContain('De link is verlopen of al gebruikt.')
      expect(html).not.toContain('Deze link klopt')
      expect(html).toContain('<a href="/beheer/inloggen">Vraag een nieuwe link aan</a>')
      expect(html).not.toContain('<button')
    },
  )

  it('does not ask the database about an address without a token', async () => {
    await render()

    expect(loginLinkWorks).not.toHaveBeenCalled()
  })
})
