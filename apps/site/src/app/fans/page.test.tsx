import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FansPage from './page'

const { currentSupporter } = vi.hoisted(() => ({
  currentSupporter: vi.fn((): Promise<undefined | { createdAt: Date; screenName: string }> =>
    Promise.resolve(undefined),
  ),
}))

const { readFantestCard, readFjouwerCard, readPrognoseCard, readUitblinkerCard } = vi.hoisted(() => ({
  readFantestCard: vi.fn(),
  readFjouwerCard: vi.fn(),
  readPrognoseCard: vi.fn(),
  readUitblinkerCard: vi.fn(),
}))

// What a card says is tested with its reader; here the page shows the cards it gets.
vi.mock('./read-game-cards', () => ({ readFantestCard, readFjouwerCard, readPrognoseCard }))
vi.mock('./uitblinker-card', () => ({ readUitblinkerCard }))
vi.mock('#src/fans/require-supporter', () => ({ currentSupporter }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

afterEach(() => vi.unstubAllEnvs())

describe('FansPage', () => {
  it('answers "not found" while accounts are off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('has one h1, a strong card to make an account without a session, and the three games that come, without a date', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('hf-card-strong')
    expect(html).toContain('Maak alvast een account')
    expect(html).not.toContain('Je bent ingelogd als')
    expect(html).toMatch(/<h2[^>]*>Wat komt er<\/h2>/)

    for (const game of ['Prognose', 'Uitblinker', 'Fjouwer']) {
      expect(html).toMatch(new RegExp(`<h3[^>]*>${game}</h3>`))
    }

    expect(html).not.toContain('Fantest')
    expect(html.match(/komt eraan/g)).toHaveLength(3)
  })

  it('has the buttons Account maken and Inloggen, to their pages, and the links to the rules and to what we keep', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    const html = await render()

    expect(html).toMatch(/<form[^>]*action="\/fans\/aanmelden"[^>]*><button[^>]*>Account maken<\/button><\/form>/)
    expect(html).toMatch(/<form[^>]*action="\/fans\/inloggen"[^>]*><button[^>]*>Inloggen<\/button><\/form>/)
    expect(html.match(/<a /g)).toHaveLength(2)
    expect(html).toContain('<a href="/fans/spelregels">Spelregels van alle spellen</a>')
    expect(html).toContain('<a href="/privacy#account">Wat we bewaren als je een account hebt</a>')
  })

  it('counts the visit of a supporter who is logged in', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockClear()
    await render()

    expect(currentSupporter).toHaveBeenCalledOnce()
  })

  it('says "Je bent uitgelogd." above the cards after logging out, and not otherwise', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    const html = await render({ uitgelogd: '1' })

    expect(html).toContain('Je bent uitgelogd.')
    expect(html.indexOf('Je bent uitgelogd.')).toBeLessThan(html.indexOf('Maak alvast een account'))
    expect(await render()).not.toContain('uitgelogd')
  })
})

describe('FansPage, for a supporter who is logged in', () => {
  const supporter = (screenName: string, blocked = false) => ({
    blocked,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    screenName,
  })

  afterEach(() => currentSupporter.mockResolvedValue(undefined))

  it('shows no card to make an account, but the line with the screen name and the link to Mijn account', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter('Tjalle99'))
    const html = await render()

    expect(html).not.toContain('Maak alvast een account')
    expect(html).not.toContain('Account maken')
    expect(html).not.toContain('action="/fans/inloggen"')
    expect(html).toContain('Je bent ingelogd als Tjalle99. <a href="/fans/mijn-account">Mijn account</a>')
    expect(html).toMatch(/<h2[^>]*>Wat komt er<\/h2>/)
    expect(html.match(/<h1/g)).toHaveLength(1)
  })

  it('shows the line without the welcome, on a later visit', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter('Tjalle99'))

    expect(await render()).not.toContain('Welkom,')
  })

  it('puts the line under the notices and above the cards', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter('Tjalle99'))
    const html = await render({ uitgelogd: '1' })

    expect(html.indexOf('Je bent uitgelogd.')).toBeLessThan(html.indexOf('Je bent ingelogd als'))
    expect(html.indexOf('Je bent ingelogd als')).toBeLessThan(html.indexOf('Wat komt er'))
  })

  it('shows a blocked account no card either', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter('Tjalle99', true))
    const html = await render()

    expect(html).not.toContain('Maak alvast een account')
    expect(html).toContain('Je bent ingelogd als Tjalle99.')
  })

  it('never puts the screen name into the page as HTML', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter('<b>x</b>'))
    const html = await render()

    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})

describe('FansPage, after confirming a new account', () => {
  const welcome = 'Welkom, Tjalle99. Je account is klaar en je blijft op dit apparaat ingelogd.'
  const supporter = (createdAt: Date) => ({ createdAt, screenName: 'Tjalle99' })
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000)

  afterEach(() => currentSupporter.mockResolvedValue(undefined))

  it('welcomes the supporter by the screen name of the session, above the cards', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter(minutesAgo(1)))
    const html = await render({ welkom: '1' })

    expect(html).toContain(welcome)
    expect(html.indexOf(welcome)).toBeLessThan(html.indexOf('Wat komt er'))
    expect(html).not.toContain('Maak alvast een account')
  })

  it('takes the name from the session and never from the address', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter(minutesAgo(1)))

    expect(await render({ naam: 'Anders', welkom: '1' })).not.toContain('Anders')
  })

  it('shows nothing without the mark, without a session, or long after the account was made', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue(supporter(minutesAgo(1)))

    expect(await render()).not.toContain('Welkom,')

    currentSupporter.mockResolvedValue(undefined)

    expect(await render({ welkom: '1' })).not.toContain('Welkom,')

    currentSupporter.mockResolvedValue(supporter(minutesAgo(60)))

    expect(await render({ welkom: '1' })).not.toContain('Welkom,')
  })
})

/** The page as HTML, with these parameters in its address. */
async function render(searchParams: Record<string, string> = {}) {
  return renderToStaticMarkup(await FansPage({ searchParams: Promise.resolve(searchParams) }))
}

describe('FansPage, with games on', () => {
  const cardOf = (game: string, heading: string) => ({
    action: { href: `/fans/${game}`, label: `Naar ${heading}`, type: 'link' },
    game,
    heading,
    lines: [],
    tag: { text: 'Open', tone: 'open' },
  })

  beforeEach(() => {
    for (const name of ['FANS_ACCOUNTS', 'FANS_PROGNOSE', 'FANS_UITBLINKER', 'FANS_VIER', 'FANS_FANTEST']) {
      vi.stubEnv(name, 'on')
    }

    readPrognoseCard.mockResolvedValue(cardOf('prognose', 'Prognose'))
    readUitblinkerCard.mockResolvedValue(cardOf('uitblinker', 'Uitblinker'))
    readFjouwerCard.mockResolvedValue(cardOf('fjouwer', 'Fjouwer'))
    readFantestCard.mockResolvedValue(cardOf('fantest', 'Fantest'))
  })

  afterEach(() => {
    vi.resetAllMocks()
    currentSupporter.mockResolvedValue(undefined)
  })

  const headings = (html: string) => [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(([, text]) => text)

  it('shows the intro, the card to log in first and a card for each game in order, in two columns, and no "Wat komt er"', async () => {
    const html = await render()

    expect(html).toContain(
      'Voorspel de uitslag, geef de spelers een cijfer, kies de vier die jij opstelt en doe de Fantest.',
    )
    expect(headings(html)).toEqual(['Inloggen', 'Prognose', 'Uitblinker', 'Fjouwer', 'Fantest'])
    expect(html).toContain('hf-card-columns')
    expect(html).toContain('<strong>Log in om mee te doen.</strong> We mailen je een link en een code.')
    expect(html).toMatch(/name="terug"[^>]*value="\/fans"/)
    expect(html).not.toContain('action="/fans/inloggen"')
    expect(html).not.toContain('Wat komt er')
    expect(html).not.toContain('Maak alvast een account')
    expect(html).toContain('Spelregels van alle spellen')
    expect(html).toContain('Wat we bewaren als je een account hebt')
  })

  it('leaves a game that is off out of the intro and the cards, and does not name it', async () => {
    vi.stubEnv('FANS_VIER', 'off')
    vi.stubEnv('FANS_UITBLINKER', 'off')

    const html = await render()

    expect(html).toContain('Voorspel de uitslag en doe de Fantest.')
    expect(headings(html)).toEqual(['Inloggen', 'Prognose', 'Fantest'])
    expect(readFjouwerCard).not.toHaveBeenCalled()
    expect(readUitblinkerCard).not.toHaveBeenCalled()
    expect(html).not.toContain('komt eraan')
  })

  it('leaves out only the card of a game that could not be read', async () => {
    readFjouwerCard.mockResolvedValue(undefined)

    expect(headings(await render())).toEqual(['Inloggen', 'Prognose', 'Uitblinker', 'Fantest'])
  })

  it('shows a supporter the line in place of the card to log in, and gives the session to the readers', async () => {
    const supporter = { createdAt: new Date('2026-01-01'), disabledAt: null, id: 5, screenName: 'Tjalle99' }

    currentSupporter.mockResolvedValue(supporter)

    const html = await render()

    expect(html).toContain('Je bent ingelogd als Tjalle99.')
    expect(html).not.toContain('name="e-mail"')
    expect(headings(html)).toEqual(['Prognose', 'Uitblinker', 'Fjouwer', 'Fantest'])

    for (const read of [readPrognoseCard, readUitblinkerCard, readFjouwerCard, readFantestCard]) {
      expect(read).toHaveBeenCalledWith(supporter)
    }
  })
})
