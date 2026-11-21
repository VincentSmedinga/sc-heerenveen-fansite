import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ChangeEmailPage from './e-mailadres/page'
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
  where: () => Promise.resolve([{ changedAt: changedAt.value, inRankings: false }]),
}

vi.mock('#src/fans/require-supporter', () => ({ requireSupporter }))
vi.mock('#src/database', () => ({ getDatabase: () => ({ db: { select: () => query } }) }))
vi.mock('./actions', () => ({
  changeName: vi.fn(),
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
    expect(html).toMatch(/href="\/fans\/mijn-account\/schermnaam">Wijzigen<span[^>]*>, schermnaam<\/span>/)
    expect(html).toMatch(/href="\/fans\/mijn-account\/e-mailadres">Wijzigen<span[^>]*>, e-mailadres<\/span>/)
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
