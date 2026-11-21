import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ChangeEmailPage from './e-mailadres/page'
import MyDataPage from './gegevens/page'
import ClosedPage from './opgeheven/page'
import CloseAccountPage from './opheffen/page'
import ConfirmCloseAccountPage from './opheffen/zeker/page'
import MyAccountPage from './page'
import ChangeNamePage from './schermnaam/page'

const { changedAt, requireSupporter } = vi.hoisted(() => ({
  changedAt: { value: null as Date | null },
  requireSupporter: vi.fn(() =>
    Promise.resolve({ blocked: false, email: 'tjalle@example.org', screenName: 'Tjalle99', supporterId: 1 }),
  ),
}))

// One row of the account, whatever is asked: the choice for the rankings and the last change of
// the name.
const query = {
  from: () => query,
  where: () =>
    Promise.resolve([
      {
        changedAt: changedAt.value,
        createdAt: new Date('2026-12-03T10:00:00Z'),
        email: 'tjalle@example.org',
        inRankings: false,
        lastVisitOn: '2026-12-19',
        screenName: 'Tjalle99',
        screenNameChangedAt: null,
      },
    ]),
}

vi.mock('#src/fans/require-supporter', () => ({ requireSupporter, supporterToken: () => Promise.resolve('sessie') }))
vi.mock('#src/app/fans/mijn-account/actions', () => ({ closeMyAccount: vi.fn() }))
vi.mock('#src/database', () => ({ getDatabase: () => ({ db: { select: () => query } }) }))
vi.mock('./actions', () => ({
  changeName: vi.fn(),
  closeMyAccount: vi.fn(),
  logOut: vi.fn(),
  logOutEverywhere: vi.fn(),
  requestEmailChange: vi.fn(),
  saveRankings: vi.fn(),
}))

beforeEach(() => {
  changedAt.value = null
  vi.useFakeTimers({ now: new Date('2026-12-20T12:00:00Z'), toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const render = async (melding?: string) =>
  renderToStaticMarkup(await MyAccountPage({ searchParams: Promise.resolve(melding === undefined ? {} : { melding }) }))

describe('Mijn account', () => {
  it('has the card with the data, each with a link to change it, the switch and the card to log out', async () => {
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h2[^>]*>Jouw gegevens<\/h2>/)
    expect(html).toContain('Tjalle99')
    expect(html).toContain('Je kunt hem één keer per 30 dagen wijzigen.')
    expect(html).toContain('Alleen om in te loggen. Niemand anders ziet het.')
    expect(html).toMatch(/href="\/fans\/mijn-account\/schermnaam">Wijzigen<span[^>]*> schermnaam<\/span>/)
    expect(html).toMatch(/href="\/fans\/mijn-account\/e-mailadres">Wijzigen<span[^>]*> e-mailadres<\/span>/)
    // The choice of the account, off here, and a button to save without JavaScript.
    expect(html).toMatch(/<input[^>]*role="switch"/)
    expect(html).not.toMatch(/<input[^>]*role="switch"[^>]*checked/)
    expect(html).toContain('Uit: je speelt mee, maar je naam staat niet in de standen.')
    expect(html).toContain('>Opslaan</button>')
    expect(html).toMatch(/<section[^>]*aria-label="Uitloggen en je account"[\s\S]*hf-card-soft/)
  })

  it('says that a change was made, and only for the words it knows', async () => {
    expect(await render('schermnaam')).toContain('Je schermnaam is gewijzigd.')
    expect(await render('e-mailadres')).toContain('Je e-mailadres is gewijzigd.')
    expect(await render('iets')).not.toContain('gewijzigd.')
  })

  it('shows a blocked supporter no way to change anything', async () => {
    requireSupporter.mockResolvedValueOnce({
      blocked: true,
      email: 'tjalle@example.org',
      screenName: 'Tjalle99',
      supporterId: 1,
    })

    const html = await render()

    expect(html).not.toContain('Wijzigen')
    expect(html).not.toContain('role="switch"')
    expect(html).toContain('Uitloggen')
  })
})

describe('the page to change the name', () => {
  it('has the link back, the intro, the field with its hint and the buttons', async () => {
    const html = renderToStaticMarkup(await ChangeNamePage())

    expect(html).toMatch(/^<main[^>]*><div[^>]*><p><a href="\/fans\/mijn-account">[\s\S]*?Mijn<\/span> account<\/a>/)
    expect(html).toMatch(/<h1[^>]*>Schermnaam wijzigen<\/h1>/)
    expect(html).toContain('Je nieuwe naam staat meteen in alle standen, ook bij wat je eerder speelde.')
    expect(html).toContain('Nieuwe schermnaam')
    expect(html).toContain('Daarna kun je hem 30 dagen niet wijzigen.')
    expect(html).toContain('>Opslaan</button>')
    expect(html).toMatch(/<a[^>]*href="\/fans\/mijn-account"[^>]*>Annuleren<\/a>/)
  })

  it('says from when the name can be changed again, without the form, within 30 days', async () => {
    changedAt.value = new Date('2026-12-04T10:00:00Z')

    const html = renderToStaticMarkup(await ChangeNamePage())

    expect(html).toContain('Je wijzigde je naam op 4 december. Vanaf 3 januari kun je hem weer wijzigen.')
    expect(html).not.toContain('Opslaan')
  })
})

describe('the page to change the address', () => {
  it('says what happens, and has the field for an address and the buttons', async () => {
    const html = renderToStaticMarkup(await ChangeEmailPage())

    expect(html).toMatch(/<h1[^>]*>E-mailadres wijzigen<\/h1>/)
    expect(html).toContain('Je oude adres krijgt daarna een bericht.')
    expect(html).toMatch(/<input[^>]*autoComplete="email"|<input[^>]*autocomplete="email"/)
    expect(html).toContain('Nieuw e-mailadres')
    expect(html).toContain('>Stuur de link</button>')
    expect(html).toContain('>Annuleren</a>')
  })
})

describe('Mijn account, with the cards of #1454', () => {
  it('has the card of what was played, with the link to all the data, and the card to close', async () => {
    const html = await render()

    expect(html).toMatch(/<h2[^>]*>Wat je speelde<\/h2>/)
    expect(html).toContain('Er is nog geen spel.')
    expect(html).toMatch(/href="\/fans\/mijn-account\/gegevens">Alles wat we van je bewaren</)
    expect(html).toMatch(/<h2[^>]*>Account opheffen<\/h2>/)
    expect(html).toContain('Je naam en je e-mailadres gaan weg. Wat je speelde, blijft zonder naam in de cijfers.')
    expect(html).toMatch(/href="\/fans\/mijn-account\/opheffen">Account opheffen</)
  })

  it('has a row for each game that is on, which says when nothing was played', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_PROGNOSE', 'on')
    vi.stubEnv('FANS_FANTEST', 'on')

    const html = await render()

    expect(html).toMatch(/<dt>Prognose<\/dt><dd><p>Nog niets\.<\/p><\/dd>/)
    expect(html).not.toContain('Fantest')
  })

  it('lets a blocked supporter see the data and close the account', async () => {
    requireSupporter.mockResolvedValueOnce({
      blocked: true,
      email: 'tjalle@example.org',
      screenName: 'Tjalle99',
      supporterId: 1,
    })

    const html = await render()

    expect(html).toContain('href="/fans/mijn-account/gegevens"')
    expect(html).toContain('href="/fans/mijn-account/opheffen"')
  })
})

describe('the page of all the data', () => {
  it('shows everything the account holds, what others see, and nothing played yet', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_PROGNOSE', 'on')

    const html = renderToStaticMarkup(await MyDataPage())

    expect(html).toMatch(/<h1[^>]*>Alles wat we van je bewaren<\/h1>/)
    expect(html).toContain('Andere supporters zien alleen je schermnaam en je punten in de standen.')

    for (const [term, value] of [
      ['Schermnaam', 'Tjalle99'],
      ['E-mailadres', 'tjalle@example.org'],
      ['Gemaakt op', '3 december 2026'],
      ['Laatste bezoek', '19 december 2026'],
      ['In de standen', 'Nee'],
      ['Naam gewijzigd', 'Nooit'],
    ]) {
      expect(html).toContain(`<dt>${term}</dt><dd>${value}</dd>`)
    }

    expect(html).toMatch(/Nog niets\. <a href="\/fans\/prognose">Doe mee aan de Prognose<\/a>/)
    expect(html).toContain('Geen IP-adres, geen browser, geen echte naam: die bewaren we niet.')
    expect(html).toContain('href="/privacy"')
  })
})

describe('closing the account', () => {
  it('says what goes and what stays, before a red button that only goes on', async () => {
    const html = renderToStaticMarkup(await CloseAccountPage({ searchParams: Promise.resolve({}) }))

    expect(html).toMatch(/<h1[^>]*>Account opheffen<\/h1>/)
    expect(html).not.toContain('Dat duurde te lang')
    expect(html).toMatch(/<h2[^>]*>Dit gaat weg<\/h2>/)
    expect(html).toMatch(/<h2[^>]*>Dit blijft, zonder naam<\/h2>/)
    expect(html).toContain('Mail de redactie</a> voordat je opheft.')
    expect(html).toMatch(
      /<form[^>]*action="\/fans\/mijn-account\/opheffen\/zeker"[^>]*><button class="hf-button-danger"[^>]*>Account opheffen<\/button>/,
    )
    expect(html).toContain('>Annuleren</a>')
    // The consequences stand before the button.
    expect(html.indexOf('Dit gaat weg')).toBeLessThan(html.indexOf('hf-button-danger'))
  })

  it('says so when the confirmation took too long, with the focus on the notice', async () => {
    const html = renderToStaticMarkup(
      await CloseAccountPage({ searchParams: Promise.resolve({ melding: 'verlopen' }) }),
    )

    expect(html).toMatch(/id="melding"[^>]*tabindex="-1"/)
    expect(html).toContain('Dat duurde te lang. Je account bestaat nog. Probeer het opnieuw.')
    expect(html.indexOf('Dat duurde te lang')).toBeLessThan(html.indexOf('Dit gaat weg'))
  })

  it('asks for the confirmation with the name, a red button with a proof, and a way back', async () => {
    const html = renderToStaticMarkup(await ConfirmCloseAccountPage())

    expect(html).toMatch(/<h1[^>]*>Weet je het zeker\?<\/h1>/)
    expect(html).toContain('Je account <strong')
    expect(html).toContain('Dat kun je niet terugdraaien.')
    expect(html).toMatch(/name="gemaakt"[^>]*value="\d+"/)
    expect(html).toMatch(/name="bewijs"[^>]*value="[0-9a-f]{64}"/)
    expect(html).toContain('>Ja, hef mijn account op</button>')
    expect(html).toMatch(/action="\/fans\/mijn-account"[^>]*><button[^>]*>Nee, terug<\/button>/)
    expect(html.match(/hf-button-danger/g)).toHaveLength(1)
  })

  it('ends on a page with the focus on its heading, a way home and a way to start again', () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')

    const html = renderToStaticMarkup(ClosedPage())

    expect(html).toMatch(
      /<h1[^>]*id="opgeheven"[^>]*tabindex="-1"[^>]*>Je account is opgeheven<\/h1>|<h1[^>]*tabindex="-1"[^>]*id="opgeheven"/i,
    )
    expect(html).toContain('href="/">Naar de voorpagina')
    expect(html).toContain('href="/fans/aanmelden">Opnieuw een account maken')
  })

  it('answers not found after closing while accounts are off', () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    expect(() => ClosedPage()).toThrow()
  })
})
