import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FansPage from './page'

const { currentSupporter } = vi.hoisted(() => ({ currentSupporter: vi.fn(() => Promise.resolve(undefined)) }))

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

  it('has the buttons Account maken and Inloggen, to their pages, and no link', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    const html = await render()

    expect(html).toMatch(/<form[^>]*action="\/fans\/aanmelden"[^>]*><button[^>]*>Account maken<\/button><\/form>/)
    expect(html).toMatch(/<form[^>]*action="\/fans\/inloggen"[^>]*><button[^>]*>Inloggen<\/button><\/form>/)
    expect(html).not.toMatch(/<a /)
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

/** The page as HTML, with these parameters in its address. */
async function render(searchParams: Record<string, string> = {}) {
  return renderToStaticMarkup(await FansPage({ searchParams: Promise.resolve(searchParams) }))
}
