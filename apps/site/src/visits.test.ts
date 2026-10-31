import { NextRequest } from 'next/server'
import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pages } from './pages'
import { countVisit, notVisitors, visitOf } from './visits'

const { getArticle } = vi.hoisted(() => ({ getArticle: vi.fn() }))

vi.mock('./articles', () => ({ getArticle }))

const firefox = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'

const address = '203.0.113.7'

/** A request of a browser that opens a page, with the headers a browser sends. */
function request(path = '/', headers: Record<string, string> = {}, method = 'GET') {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': firefox,
      'x-forwarded-for': address,
      ...headers,
    },
    method,
  })
}

beforeEach(() => {
  getArticle.mockReset()
  getArticle.mockResolvedValue({ slug: 'dit-zijn-wij' })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('visitOf', () => {
  it('counts a visit to a page, with the path without the query', () => {
    expect(visitOf(request('/nieuws/podcasts?podcast=testpodcast&pagina=2'))).toEqual({
      address,
      article: undefined,
      path: '/nieuws/podcasts',
      userAgent: firefox,
    })
    expect(visitOf(request('/?nieuws=15'))).toMatchObject({ path: '/' })
  })

  it.each(pages.map(({ path }) => path))('counts the page %s', (path) => {
    expect(visitOf(request(path))).toMatchObject({ path })
  })

  it('counts the page after the contact form', () => {
    expect(visitOf(request('/contact/verstuurd'))).toMatchObject({ path: '/contact/verstuurd' })
  })

  it('counts the search as /nieuws/zoeken, without what was searched for', () => {
    expect(visitOf(request('/nieuws/zoeken'))).toMatchObject({ path: '/nieuws/zoeken' })
    expect(JSON.stringify(visitOf(request('/nieuws/zoeken?q=klaverboer&aantal=15')))).not.toContain('klaverboer')
    expect(visitOf(request('/nieuws/zoeken?q=klaverboer&aantal=15'))).toMatchObject({ path: '/nieuws/zoeken' })
  })

  it('takes the visitor from the end of X-Forwarded-For, where the host puts it', () => {
    expect(visitOf(request('/', { 'x-forwarded-for': `198.51.100.1, ${address}` }))?.address).toBe(address)
    expect(visitOf(request('/', { 'x-forwarded-for': '2001:db8::1' }))?.address).toBe('2001:db8::1')
  })

  it('takes an IPv4 address in IPv6 form for the IPv4 address', () => {
    expect(visitOf(request('/', { 'x-forwarded-for': `::ffff:${address}` }))?.address).toBe(address)
  })

  it.each([
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    '10.1.2.3',
    '172.16.0.9',
    '192.168.1.20',
    '169.254.1.1',
    'fd12:3456::1',
    'fe80::1',
    '0.0.0.0',
  ])(
    'counts the view but not the visitor when the address is %s, the host itself or a private network',
    (forwarded) => {
      expect(visitOf(request('/', { 'x-forwarded-for': forwarded }))).toMatchObject({ address: undefined, path: '/' })
    },
  )

  it.each([undefined, 'unknown', '<script>', '203.0.113.7:8080'])(
    'counts the view but not the visitor when the address is %s',
    (forwarded) => {
      const headers = forwarded === undefined ? {} : { 'x-forwarded-for': forwarded }
      const get = new NextRequest(new URL('/', 'http://localhost:3000'), {
        headers: { accept: 'text/html', 'user-agent': firefox, ...headers },
      })

      expect(visitOf(get)).toMatchObject({ address: undefined, path: '/' })
    },
  )

  it.each([
    '/_next/static/chunks/main.js',
    '/_next/image?url=%2Fa.png',
    '/favicon.ico',
    '/share-image.png',
    '/beheer',
    '/beheer/inloggen',
    '/beheer/artikelen/12',
    '/updates/feed.xml',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
    '/bestaat-niet',
    '/privacy/extra',
    '/Privacy',
    '/redactie',
    '/redactie/a/b',
  ])('does not count %s', (path) => {
    expect(visitOf(request(path))).toBeUndefined()
  })

  it.each(['POST', 'HEAD', 'PUT'])('does not count a %s', (method) => {
    expect(visitOf(request('/', {}, method))).toBeUndefined()
  })

  it.each([
    ['purpose', 'prefetch'],
    ['sec-purpose', 'prefetch;prerender'],
    ['x-moz', 'prefetch'],
  ])('does not count a prefetch (%s: %s)', (name, value) => {
    expect(visitOf(request('/', { [name]: value }))).toBeUndefined()
  })

  it('does not count a visitor who asks not to be counted', () => {
    expect(visitOf(request('/', { dnt: '1' }))).toBeUndefined()
    expect(visitOf(request('/', { 'sec-gpc': '1' }))).toBeUndefined()
  })

  it('counts a visitor who sends DNT: 0 or Sec-GPC: 0', () => {
    expect(visitOf(request('/', { dnt: '0', 'sec-gpc': '0' }))).toMatchObject({ path: '/' })
  })

  it('does not count a request that does not ask for HTML, such as the navigation of Next.js', () => {
    expect(visitOf(request('/', { accept: '*/*' }))).toBeUndefined()
    expect(visitOf(request('/', { accept: 'image/avif,image/webp,*/*' }))).toBeUndefined()
  })

  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
    'Mozilla/5.0 (compatible; Baiduspider/2.0)',
    'Mozilla/5.0 (compatible; YandexBot/3.0)',
    'DuckDuckBot/1.1',
    'Mozilla/5.0 (Windows NT 10.0) HeadlessChrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11) Chrome-Lighthouse',
    'facebookexternalhit/1.1',
    'WhatsApp/2.23',
    'Slackbot-LinkExpanding 1.0',
    'curl/8.5.0',
    'Wget/1.21',
    'python-requests/2.31.0',
    'Go-http-client/2.0',
    'node-fetch/1.0',
    'axios/1.6.0',
    'UptimeRobot/2.0',
    'Pingdom.com_bot_version_1.4',
    'LiteSpeed Web Server health check',
    'scHeerenveenFansite/0.0.0 (+https://github.com/VincentSmedinga/sc-heerenveen-fansite)',
    '',
  ])('does not count the browser text "%s"', (userAgent) => {
    expect(visitOf(request('/', { 'user-agent': userAgent }))).toBeUndefined()
  })

  it.each([
    firefox,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  ])('counts the browser text "%s"', (userAgent) => {
    expect(notVisitors.test(userAgent)).toBe(false)
  })

  it('counts the page of a season as a visit to /wedstrijden', () => {
    expect(visitOf(request('/wedstrijden/2025-26'))).toMatchObject({ path: '/wedstrijden' })
  })

  it.each(['/wedstrijden/2025-27', '/wedstrijden/kies', '/wedstrijden/2025-26/extra', '/wedstrijden/x'])(
    'does not count %s, which is not the page of a season',
    (path) => {
      expect(visitOf(request(path))).toBeUndefined()
    },
  )

  it('counts an article through its slug, for the database to confirm', () => {
    expect(visitOf(request('/redactie/dit-zijn-wij'))).toMatchObject({
      article: 'dit-zijn-wij',
      path: '/redactie/dit-zijn-wij',
    })
  })

  it('has no link of Next.js, so every page view is a whole page load that the proxy sees', () => {
    const root = `${import.meta.dirname}/../../..`
    const uses = ['apps/site/src', 'packages/design-system/src']
      .flatMap((folder) => readdirSync(`${root}/${folder}`, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
      .filter((entry) => !entry.name.startsWith('visits.test'))
      .filter((entry) => /from 'next\/link'/u.test(readFileSync(`${entry.parentPath}/${entry.name}`, 'utf8')))
      .map((entry) => `${entry.parentPath}/${entry.name}`)

    expect(uses).toEqual([])
  })

  it('has a rule for every page of the site', () => {
    // The pages that are on no list on purpose: the admin, the article, which the database
    // confirms, and the page of a season, which counts as /wedstrijden. A slot of the layout
    // (@shortcuts) is not a page of its own.
    const withoutCount = ['/beheer', '/beheer/[...]', '/redactie/[slug]', '/wedstrijden/[seizoen]']
    const paths = readdirSync(`${import.meta.dirname}/app`, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'page.tsx')
      .map((entry) => entry.parentPath.slice(`${import.meta.dirname}/app`.length) || '/')
      .filter((path) => !path.startsWith('/beheer') && !path.startsWith('/@') && !withoutCount.includes(path))

    expect(paths.toSorted()).toEqual(
      [...pages.map(({ path }) => path), '/contact/verstuurd', '/nieuws/zoeken'].toSorted(),
    )
  })
})

describe('countVisit', () => {
  it('hands the visit to the counter, with the moment, and gives it to the server to finish', async () => {
    const record = vi.fn().mockResolvedValue(undefined)
    const waitUntil = vi.fn()

    countVisit(request('/privacy'), waitUntil, record)
    await waitUntil.mock.calls[0]?.[0]

    expect(record).toHaveBeenCalledOnce()
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ address, now: expect.any(Date), path: '/privacy' }))
  })

  it('counts nothing for a request that is not a visit', () => {
    const record = vi.fn()
    const waitUntil = vi.fn()

    countVisit(request('/beheer'), waitUntil, record)
    countVisit(request('/', { dnt: '1' }), waitUntil, record)
    countVisit(request('/', { 'user-agent': 'Googlebot/2.1' }), waitUntil, record)

    expect(record).not.toHaveBeenCalled()
    expect(waitUntil).not.toHaveBeenCalled()
  })

  it('counts an article that exists, and not one that does not', async () => {
    const record = vi.fn().mockResolvedValue(undefined)
    const waitUntil = vi.fn()

    countVisit(request('/redactie/dit-zijn-wij'), waitUntil, record)
    await waitUntil.mock.calls[0]?.[0]
    getArticle.mockResolvedValue(undefined)
    countVisit(request('/redactie/bestaat-niet'), waitUntil, record)
    await waitUntil.mock.calls[1]?.[0]

    expect(getArticle).toHaveBeenCalledTimes(2)
    expect(record).toHaveBeenCalledOnce()
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ path: '/redactie/dit-zijn-wij' }))
  })

  it('does not wait for the counter: the call returns while the database has not answered', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const record = vi.fn(() => new Promise<void>(() => undefined))
    const waitUntil = vi.fn()

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T09:00:00Z'))
    countVisit(request('/'), waitUntil, record)

    expect(record).toHaveBeenCalledOnce()
    expect(waitUntil).toHaveBeenCalledOnce()

    // Let the visit give up, so it doesn't count as waiting in the next test.
    await vi.advanceTimersByTimeAsync(5000)
    await waitUntil.mock.calls[0]?.[0]

    expect(error).toHaveBeenCalledOnce()
  })

  it('logs a database that fails, without the address or the browser text, and does not throw', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const waitUntil = vi.fn()

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T10:00:00Z'))
    countVisit(request('/wedstrijden'), waitUntil, () =>
      Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:3306')),
    )
    await waitUntil.mock.calls[0]?.[0]

    expect(error).toHaveBeenCalledOnce()

    const logged = String(error.mock.calls[0]?.[0])

    expect(logged).toContain('ECONNREFUSED')
    expect(logged).not.toContain(address)
    expect(logged).not.toContain('Firefox')
  })

  it('logs a failure at most once a minute', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const waitUntil = vi.fn()
    const fail = () => Promise.reject(new Error('Too many connections'))

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T11:00:00Z'))
    countVisit(request('/'), waitUntil, fail)
    await waitUntil.mock.calls[0]?.[0]
    countVisit(request('/'), waitUntil, fail)
    await waitUntil.mock.calls[1]?.[0]
    vi.setSystemTime(new Date('2026-10-26T11:01:30Z'))
    countVisit(request('/'), waitUntil, fail)
    await waitUntil.mock.calls[2]?.[0]

    expect(error).toHaveBeenCalledTimes(2)
  })

  it('gives up on a database that does not answer, and drops visits while 20 are waiting', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const record = vi.fn(() => new Promise<void>(() => undefined))
    const waitUntil = vi.fn()

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'))

    for (let visit = 0; visit < 25; visit++) {
      countVisit(request('/'), waitUntil, record)
    }

    expect(record).toHaveBeenCalledTimes(20)

    await vi.advanceTimersByTimeAsync(5000)
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise))

    expect(error).toHaveBeenCalledOnce()
    expect(String(error.mock.calls[0]?.[0])).toContain('did not answer')

    // The slots are free again.
    countVisit(request('/'), waitUntil, record)

    expect(record).toHaveBeenCalledTimes(21)
  })
})
