import { seasonOf } from '@fansite/db/season'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ConfirmPage, { metadata as confirmMetadata } from './inloggen/bevestigen/page'
import LoginPage, { metadata as loginMetadata } from './inloggen/page'
import SentPage, { metadata as sentMetadata } from './inloggen/verstuurd/page'
import AdminPage, { metadata as adminMetadata } from './page'

const {
  countHeldChanges,
  countMatchesWithoutResult,
  countWaitingDifferences,
  findSession,
  loginLinkWorks,
  requireRole,
  sessionToken,
} = vi.hoisted(() => ({
  countHeldChanges: vi.fn(),
  countMatchesWithoutResult: vi.fn(),
  countWaitingDifferences: vi.fn(),
  findSession: vi.fn(),
  loginLinkWorks: vi.fn(),
  requireRole: vi.fn(),
  sessionToken: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/beheer/match-entries', () => ({
  countHeldChanges,
  countMatchesWithoutResult,
  countWaitingDifferences,
}))
vi.mock('#src/beheer/require-role', () => ({ requireRole, sessionToken }))
vi.mock('#src/beheer/sessions', () => ({ findSession, loginLinkWorks }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

beforeEach(() => {
  countHeldChanges.mockReset()
  countHeldChanges.mockResolvedValue({ seasons: [], total: 0 })
  countMatchesWithoutResult.mockReset()
  countMatchesWithoutResult.mockResolvedValue(0)
  countWaitingDifferences.mockReset()
  countWaitingDifferences.mockResolvedValue({ seasons: [], total: 0 })
  findSession.mockReset()
  loginLinkWorks.mockReset()
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

  it('says who is logged in with the role and shows a tile for the screen, and has no button to log out', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'moderator', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(requireRole).toHaveBeenCalledWith('beheerder', 'moderator')
    expect(headings(html)).toEqual(['h1 Beheer', expect.stringMatching(/^h2 <a[^>]*>Berichten<\/a>$/)])
    expect(html).toContain('Je bent ingelogd als jelle@example.org (moderator).')
    // Logging out is in the bar of the admin (AdminScreens), on every page.
    expect(html).not.toContain('<button')
    expect(html).not.toContain('Uitloggen')
    expect(links(html)).toEqual(['<a class="hf-tile-link" href="/beheer/berichten">Berichten</a>'])
    expect(html).toContain('Verberg berichten die niet op de site horen.')
  })

  it('shows a beheerder a tile for the articles, the matches and the visit as well, and says the role', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(html).toContain('Je bent ingelogd als jelle@example.org (beheerder).')
    expect(links(tileList(html))).toEqual([
      '<a class="hf-tile-link" href="/beheer/berichten">Berichten</a>',
      '<a class="hf-tile-link" href="/beheer/artikelen">Artikelen</a>',
      '<a class="hf-tile-link" href="/beheer/wedstrijden">Wedstrijden</a>',
      '<a class="hf-tile-link" href="/beheer/stadions">Stadions</a>',
      '<a class="hf-tile-link" href="/beheer/clubnamen">Clubnamen</a>',
      '<a class="hf-tile-link" href="/beheer/bezoek">Bezoek</a>',
    ])
    expect(html).toContain('Vul wedstrijden in of verbeter ze.')
    expect(html).toContain('Geef een club een eigen lijst van stadions, met een toelichting.')
    expect(html).toContain('Houd bij welke namen een club droeg, en sinds wanneer.')
  })

  it('has no card and no sidebar when nothing waits', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(html).not.toContain('Te doen')
    expect(html).not.toContain('<aside')
  })

  it('puts the card Te doen in the sidebar, after the main column, when something waits', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })
    countMatchesWithoutResult.mockResolvedValue(1)

    const html = renderToStaticMarkup(await AdminPage())
    const aside = (html.match(/<aside[\s\S]*<\/aside>/) ?? [])[0] ?? ''

    expect(aside).toContain('aria-label="Te doen"')
    expect(headings(aside)).toEqual(['h2 Te doen'])
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(html.slice(0, html.indexOf('<aside'))).not.toContain('Te doen')
  })

  it('tells a beheerder how many differences with Wikipedia wait for a decision, and nobody else', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })
    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 1 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('1 afwijking van Wikipedia wacht op een besluit')

    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 3 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('3 afwijkingen van Wikipedia wachten op een besluit')

    countWaitingDifferences.mockResolvedValue({ seasons: [], total: 0 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('afwijking')

    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 3 })
    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'moderator', userId: 2 })
    const html = renderToStaticMarkup(await AdminPage())

    expect(html).not.toContain('afwijking')
    expect(html).not.toContain('<aside')
    expect(countWaitingDifferences).toHaveBeenCalledTimes(3)
  })

  it('tells a beheerder how many changes of Wikipedia are held back, and nobody else', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })
    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 1 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('1 wijziging van Wikipedia wacht op een besluit')

    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 3 })
    expect(renderToStaticMarkup(await AdminPage())).toContain('3 wijzigingen van Wikipedia wachten op een besluit')

    // Each line counts its own kind: held changes do not make a line about differences.
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('afwijking')

    countHeldChanges.mockResolvedValue({ seasons: [], total: 0 })
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('wijziging')

    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 3 })
    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'moderator', userId: 2 })
    countHeldChanges.mockClear()
    const html = renderToStaticMarkup(await AdminPage())

    expect(html).not.toContain('wijziging')
    expect(html).not.toContain('<aside')
    expect(countHeldChanges).not.toHaveBeenCalled()
  })

  it('links the line about held changes to the choice Wikipedia wacht of the season that holds them', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })
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

  it('tells a beheerder how many matches of the season have no result, and nobody else', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })
    countMatchesWithoutResult.mockResolvedValue(1)
    expect(renderToStaticMarkup(await AdminPage())).toContain('>1 wedstrijd zonder uitslag</a>')

    countMatchesWithoutResult.mockResolvedValue(4)
    const html = renderToStaticMarkup(await AdminPage())

    expect(html).toContain('>4 wedstrijden zonder uitslag</a>')
    expect(countMatchesWithoutResult).toHaveBeenLastCalledWith({}, currentSeason, expect.any(Date))
    expect(html).toContain('<a href="/beheer/wedstrijden">4 wedstrijden zonder uitslag</a>')

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'moderator', userId: 2 })
    countMatchesWithoutResult.mockClear()
    expect(renderToStaticMarkup(await AdminPage())).not.toContain('zonder uitslag')
    expect(countMatchesWithoutResult).not.toHaveBeenCalled()
  })

  it('lists the lines of the card one under the other, the differences first', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })
    countWaitingDifferences.mockResolvedValue({ seasons: [currentSeason], total: 2 })
    countHeldChanges.mockResolvedValue({ seasons: ['2013/14'], total: 1 })
    countMatchesWithoutResult.mockResolvedValue(3)

    const html = renderToStaticMarkup(await AdminPage())
    const aside = (html.match(/<aside[\s\S]*<\/aside>/) ?? [])[0] ?? ''

    expect([...aside.matchAll(/<li>(.*?)<\/li>/g)].map(([, line]) => line?.replace(/<[^>]*>/g, ''))).toEqual([
      '2 afwijkingen van Wikipedia wachten op een besluit',
      '1 wijziging van Wikipedia wacht op een besluit',
      '3 wedstrijden zonder uitslag',
    ])
  })

  it('links the line about differences to the list of the changed matches of the season that holds them', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })
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
    findSession.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })

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
