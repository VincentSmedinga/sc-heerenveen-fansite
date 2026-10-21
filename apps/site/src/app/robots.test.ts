import { afterEach, describe, expect, it, vi } from 'vitest'

import robots from './robots'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('robots', () => {
  it.each(['local', 'acceptance'])('refuses everything on %s', (siteEnv) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(robots().rules).toEqual({ disallow: '/', userAgent: '*' })
  })

  it('allows everything on production', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(robots().rules).toEqual({ allow: '/', userAgent: '*' })
  })
})
