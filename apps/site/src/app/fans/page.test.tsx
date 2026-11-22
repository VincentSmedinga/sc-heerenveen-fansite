import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FansPage from './page'

const { currentSupporter } = vi.hoisted(() => ({
  currentSupporter: vi.fn((): Promise<undefined | { createdAt: Date; screenName: string }> =>
    Promise.resolve(undefined),
  ),
}))

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

  it('has one h1, a strong card to make an account, and the three games that come, without a date', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('hf-card-strong')
    expect(html).toContain('Maak alvast een account')
    expect(html).toMatch(/<h2[^>]*>Wat komt er<\/h2>/)

    for (const game of ['Prognose', 'Uitblinker', 'Fjouwer']) {
      expect(html).toMatch(new RegExp(`<h3[^>]*>${game}</h3>`))
    }

    expect(html).not.toContain('Fantest')
    expect(html.match(/komt eraan/g)).toHaveLength(3)
  })

  it('names Fjouwer with a link only when the game is on', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    expect(await render()).not.toContain('href="/fans/fjouwer"')

    vi.stubEnv('FANS_VIER', 'on')

    const html = await render()

    expect(html).toContain('<a href="/fans/fjouwer">Naar Fjouwer</a>')
    expect(html.match(/komt eraan/g)).toHaveLength(2)
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
    expect(html.indexOf(welcome)).toBeLessThan(html.indexOf('Maak alvast een account'))
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
