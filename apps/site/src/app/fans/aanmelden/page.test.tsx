import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SignUpPage from './page'

vi.mock('#src/fans/require-supporter', () => ({ currentSupporter: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

afterEach(() => vi.unstubAllEnvs())

describe('the page Account maken', () => {
  it('links "Wat we bewaren" to the part about accounts on the page Privacy', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')

    const html = renderToStaticMarkup(await SignUpPage({ searchParams: Promise.resolve({}) }))

    expect(html).toContain('<a href="/privacy#account">Wat we bewaren</a>')
  })
})
