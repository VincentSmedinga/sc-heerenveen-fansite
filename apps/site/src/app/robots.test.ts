import { afterEach, describe, expect, it, vi } from 'vitest'

import robots from './robots'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('robots', () => {
  it.each(['local', 'acceptance'])('refuses everything on %s', (siteEnv) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(robots()).toEqual({ rules: { disallow: '/', userAgent: '*' } })
  })

  it('allows everything on production, and points to the sitemap of production', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(robots()).toEqual({
      rules: { allow: '/', userAgent: '*' },
      sitemap: 'https://sc.heerenveen.org/sitemap.xml',
    })
  })
})
