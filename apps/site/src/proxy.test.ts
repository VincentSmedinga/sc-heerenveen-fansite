import { afterEach, describe, expect, it, vi } from 'vitest'

import { config, contentSecurityPolicy, proxy } from './proxy'

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

  it.each(['local', 'acceptance', 'production'])('sends the Content Security Policy on %s', (siteEnv) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(proxy().headers.get('Content-Security-Policy')).toBe(contentSecurityPolicy)
  })

  it('lets a page load from our own server only, with the inline scripts and styles of Next.js', () => {
    const directives = new Map(
      contentSecurityPolicy.split('; ').map((directive) => {
        const [name, ...sources] = directive.split(' ')

        return [name, sources.join(' ')]
      }),
    )

    expect(Object.fromEntries(directives)).toEqual({
      'base-uri': "'self'",
      'connect-src': "'self'",
      'default-src': "'self'",
      'font-src': "'self'",
      'form-action': "'self'",
      'frame-src': "'self'",
      'img-src': "'self'",
      'script-src': "'self' 'unsafe-inline'",
      'style-src': "'self' 'unsafe-inline'",
    })
  })

  it('runs for every path', () => {
    expect(config.matcher).toBe('/:path*')
  })
})
