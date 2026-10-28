import { type NextFetchEvent, NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { config, contentSecurityPolicy, isAdminPath, proxy as proxyOf } from './proxy'

/** The proxy's answer to a request for a path of the site. */
const proxy = (path = '/') => proxyOf(new NextRequest(new URL(path, 'http://localhost:3000')))

afterEach(() => {
  vi.restoreAllMocks()
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

  it('lets a page load from our own server only, with the inline scripts and styles of Next.js and images as data', () => {
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
      'img-src': "'self' data:",
      'script-src': "'self' 'unsafe-inline'",
      'style-src': "'self' 'unsafe-inline'",
    })
  })

  it.each(['local', 'acceptance', 'production'])(
    'keeps the admin out of search engines and caches on %s',
    (siteEnv) => {
      vi.stubEnv('SITE_ENV', siteEnv)

      for (const path of [
        '/beheer',
        '/beheer/',
        '/beheer/inloggen',
        '/beheer/inloggen/bevestigen?token=abc',
        '/beheer/ergens/diep',
        '/beheer/artikelen',
        '/beheer/artikelen/12/versies/3',
        '/beheer/artikelen/12/voorbeeld',
      ]) {
        const { headers } = proxy(path)

        expect(headers.get('X-Robots-Tag'), path).toBe('noindex, nofollow')
        expect(headers.get('Cache-Control'), path).toBe('no-store')
        expect(headers.get('Referrer-Policy'), path).toBe('same-origin')
        expect(headers.get('Content-Security-Policy'), path).toBe(contentSecurityPolicy)
      }
    },
  )

  it('leaves the rest of the site on production without those headers', () => {
    vi.stubEnv('SITE_ENV', 'production')

    for (const path of ['/', '/beheerder', '/bronnen', '/over-ons/beheer']) {
      const { headers } = proxy(path)

      expect(headers.get('X-Robots-Tag'), path).toBeNull()
      expect(headers.get('Cache-Control'), path).toBeNull()
      expect(headers.get('Referrer-Policy'), path).toBeNull()
    }
  })

  it('knows the admin by its path, and /beheerder is not under it', () => {
    expect(['/beheer', '/beheer/', '/beheer/x', '/beheerder', '/', '/x/beheer'].map(isAdminPath)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ])
  })

  it('counts a visit in the background and answers like before, also when the database does not answer', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const waitUntil = vi.fn()
    const request = new NextRequest(new URL('/privacy', 'http://localhost:3000'), {
      headers: {
        accept: 'text/html',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
        'x-forwarded-for': '203.0.113.7',
      },
    })

    // Nothing listens on port 1, so the connection is refused.
    vi.stubEnv('SITE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', 'mysql://nobody:secret@127.0.0.1:1/fansite')

    const response = proxyOf(request, { waitUntil } as unknown as NextFetchEvent)

    expect(response.headers.get('Content-Security-Policy')).toBe(contentSecurityPolicy)
    expect(waitUntil).toHaveBeenCalledOnce()
    // The counting ends without an error, and the log says what went wrong, without the
    // address of the visitor.
    await expect(waitUntil.mock.calls[0]?.[0]).resolves.toBeUndefined()
    expect(error).toHaveBeenCalledOnce()
    expect(String(error.mock.calls[0]?.[0])).not.toContain('203.0.113.7')
    error.mockRestore()
  })

  it('runs for every path', () => {
    expect(config.matcher).toBe('/:path*')
  })
})
