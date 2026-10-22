import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getReleases } from '../../../releases'
import { GET } from './route'

vi.mock('../../../releases', () => ({ getReleases: vi.fn() }))

beforeEach(() => {
  vi.mocked(getReleases).mockReturnValue([{ date: '2026-10-21', sentences: ['De eerste versie.'], version: '0.1.0' }])
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the feed of Wat is er nieuw', () => {
  it('is RSS', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(GET().headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
  })

  it.each([
    ['acceptance', 'https://acc.sc.heerenveen.org'],
    ['production', 'https://sc.heerenveen.org'],
  ])('links to the site on %s, where the feed comes from', async (siteEnv, origin) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    const feed = await GET().text()

    expect(feed).toContain(`<link>${origin}/wat-is-er-nieuw</link>`)
    expect(feed).toContain(`<link>${origin}/wat-is-er-nieuw#versie-0.1.0</link>`)
  })
})
