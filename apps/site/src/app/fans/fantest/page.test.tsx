import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FantestPage from './page'

const { loadArchive } = vi.hoisted(() => ({ loadArchive: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/fantest', async (importOriginal) => ({ ...(await importOriginal<object>()), loadArchive }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  loadArchive.mockResolvedValue([
    { averageTenths: 43, month: 1, questions: 10, year: 2003 },
    { averageTenths: undefined, month: 12, questions: 10, year: 2002 },
    { averageTenths: 38, month: 12, questions: 9, year: 2003 },
    { averageTenths: 41, month: 5, questions: 10, year: 2003 },
  ])
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the archive of the Fantest', () => {
  it('starts with the heading, the intro and the credit without names', async () => {
    const html = renderToStaticMarkup(await FantestPage())

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Fantest van toen')
    expect(html).toContain('Van december 2001 tot oktober 2005 had de Fansite elke maand een Fantest')
    expect(html).toContain('Speel ze na. Je score bewaren we niet.')
    expect(html).toContain('Vragen uit het archief van de Fansite, gemaakt door de toenmalige redactie.')
  })

  it('has a card for each year, the newest first, and the months of a year the newest first too', async () => {
    const html = renderToStaticMarkup(await FantestPage())

    expect(html.indexOf('>2003<')).toBeLessThan(html.indexOf('>2002<'))
    expect(html.indexOf('>December 2003<')).toBeLessThan(html.indexOf('>Mei 2003<'))
    expect(html.indexOf('>Mei 2003<')).toBeLessThan(html.indexOf('>Januari 2003<'))
    expect(html).toContain('href="/fans/fantest/2003-05"')
    expect(html).toContain('href="/fans/fantest/2002-12"')
  })

  it('says under a month how the fans of then did, and says nothing for a month with too few', async () => {
    const html = renderToStaticMarkup(await FantestPage())

    expect(html).toContain('Toen gemiddeld 4,1 van 10')
    expect(html).toContain('Toen gemiddeld 3,8 van 9')
    expect(html.match(/Toen gemiddeld/g)).toHaveLength(3)
  })

  it('holds no cookie, no form and nothing personal', async () => {
    const html = renderToStaticMarkup(await FantestPage())

    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
  })

  it('is "not found" with the Fantest off', async () => {
    vi.stubEnv('FANS_FANTEST', 'off')

    await expect(FantestPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('is "not found" with accounts off, as the rest of Fans is', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(FantestPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
