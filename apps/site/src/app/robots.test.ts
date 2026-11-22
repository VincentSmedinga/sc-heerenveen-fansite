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
      rules: { allow: '/', disallow: ['/beheer', '/fans/'], userAgent: '*' },
      sitemap: 'https://sc.heerenveen.org/sitemap.xml',
    })
  })

  it('allows the archive of the Fantest under the refused /fans/ on production, while the Fantest is on', () => {
    vi.stubEnv('SITE_ENV', 'production')
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_FANTEST', 'on')

    expect(robots().rules).toEqual({
      allow: ['/', '/fans/fantest'],
      disallow: ['/beheer', '/fans/'],
      userAgent: '*',
    })
  })

  it.each(['local', 'acceptance', 'production'])('refuses /beheer on %s', (siteEnv) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect([robots().rules].flat().flatMap((rule) => rule.disallow ?? [])).toContain('/beheer')
  })
})
