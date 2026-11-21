import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FansPage from './page'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

afterEach(() => vi.unstubAllEnvs())

describe('FansPage', () => {
  it('answers "not found" while accounts are off', () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    expect(() => FansPage()).toThrow('NEXT_NOT_FOUND')
  })

  it('has one h1, a strong card to make an account, and the three games that come, without a date', () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    const html = renderToStaticMarkup(<FansPage />)

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

  it('has the button Account maken, to the sign-up, and no link to a page that does not exist yet', () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    const html = renderToStaticMarkup(<FansPage />)

    expect(html).toMatch(/<form[^>]*action="\/fans\/aanmelden"[^>]*><button[^>]*>Account maken<\/button><\/form>/)
    expect(html).not.toMatch(/<a /)
  })
})
