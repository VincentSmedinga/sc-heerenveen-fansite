import { afterEach, describe, expect, it, vi } from 'vitest'

import { config, proxy } from './proxy'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('proxy', () => {
  it.each(['local', 'acceptance'])('keeps search engines out on %s', (siteEnv) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(proxy().headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })

  it('leaves the header off on production', () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect(proxy().headers.get('X-Robots-Tag')).toBeNull()
  })

  it('runs for every path', () => {
    expect(config.matcher).toBe('/:path*')
  })
})
