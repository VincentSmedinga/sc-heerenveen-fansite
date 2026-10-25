import { afterEach, describe, expect, it, vi } from 'vitest'

import robots from './robots'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('robots', () => {
  it.each(['local', 'acceptance'])('refuses everything on %s, the admin by name too', (siteEnv) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(robots()).toEqual({ rules: { disallow: ['/', '/beheer'], userAgent: '*' } })
  })

  it('allows everything on production except the admin, and points to the sitemap of production', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(robots()).toEqual({
      rules: { allow: '/', disallow: '/beheer', userAgent: '*' },
      sitemap: 'https://sc.heerenveen.org/sitemap.xml',
    })
  })

  it.each(['local', 'acceptance', 'production'])('refuses /beheer on %s', (siteEnv) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect([robots().rules].flat().flatMap((rule) => rule.disallow ?? [])).toContain('/beheer')
  })
})
