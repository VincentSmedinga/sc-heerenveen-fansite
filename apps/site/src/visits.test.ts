import { NextRequest } from 'next/server'
import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pages } from './pages'
import { countVisit, notVisitors, visitOf } from './visits'

const { getArticle, isClubSlug } = vi.hoisted(() => ({ getArticle: vi.fn(), isClubSlug: vi.fn() }))

vi.mock('./articles', () => ({ getArticle }))
vi.mock('./opponents', () => ({ isClubSlug }))

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
  isClubSlug.mockReset()
  isClubSlug.mockResolvedValue(true)
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

  // The emulated browsers of the Lighthouse CLI (13.6.0) have no "Lighthouse" in their text any
  // more. The daily check (.github/workflows/lighthouse.yml) therefore sends `DNT: 1`, which is
  // what keeps its visits out of /beheer/bezoek.
  describe.each([
    [
      'the emulated phone',
      'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
    ],
    [
      'the emulated desktop',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    ],
    [
      'the real browser of the runner',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36',
    ],
  ])('a request of the Lighthouse check, %s', (_name, userAgent) => {
    it('is not counted, because the check sends DNT: 1', () => {
      expect(visitOf(request('/', { dnt: '1', 'user-agent': userAgent }))).toBeUndefined()
    })

    it('would be counted without that header, unless the text of the browser says it is a robot', () => {
      const counted = !notVisitors.test(userAgent)

      expect(visitOf(request('/', { 'user-agent': userAgent })) !== undefined).toBe(counted)
    })
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

  it('counts the page of a match as a visit to /wedstrijden, and not an address that is not one', () => {
    expect(visitOf(request('/wedstrijden/2025-26/2025-11-01-fc-twente'))).toMatchObject({ path: '/wedstrijden' })
    expect(visitOf(request('/wedstrijden/2025-27/2025-11-01-fc-twente'))).toBeUndefined()
    expect(visitOf(request('/wedstrijden/2025-26/onzin'))).toBeUndefined()
    expect(visitOf(request('/cijfers/2025-26/2025-11-01-fc-twente'))).toBeUndefined()
  })

  it('counts the page of a season of Cijfers as a visit to /cijfers', () => {
    expect(visitOf(request('/cijfers'))).toMatchObject({ path: '/cijfers' })
    expect(visitOf(request('/cijfers/2025-26'))).toMatchObject({ path: '/cijfers' })
  })

  it('counts the page Spelers, and the page of a season of it, as a visit to /spelers', () => {
    expect(visitOf(request('/spelers'))).toMatchObject({ path: '/spelers' })
    expect(visitOf(request('/spelers/2025-26'))).toMatchObject({ path: '/spelers' })
  })

  it.each([
    '/wedstrijden/2025-27',
    '/wedstrijden/kies',
    '/wedstrijden/2025-26/extra',
    '/wedstrijden/x',
    '/cijfers/2025-27',
    '/cijfers/kies',
    '/cijfers/2025-26/extra',
    '/cijfers/x',
    '/spelers/2025-27',
    '/spelers/kies',
    '/spelers/2025-26/extra',
    '/spelers/x',
  ])('does not count %s, which is not the page of a season', (path) => {
    expect(visitOf(request(path))).toBeUndefined()
  })

  it('counts an article through its slug, for the database to confirm', () => {
    expect(visitOf(request('/redactie/dit-zijn-wij'))).toMatchObject({
      article: 'dit-zijn-wij',
      path: '/redactie/dit-zijn-wij',
    })
  })

  it('counts the page of a club through its slug, for the database to confirm, under its own path', () => {
    expect(visitOf(request('/tegenstanders/ado-den-haag?competitie=eredivisie'))).toMatchObject({
      club: 'ado-den-haag',
      path: '/tegenstanders/ado-den-haag',
    })
    expect(visitOf(request('/tegenstanders'))).toMatchObject({ club: undefined })
    expect(visitOf(request('/tegenstanders/ado-den-haag/extra'))).toBeUndefined()
  })

  it('counts the address of a switch as a page, and not the request the router makes for it', () => {
    // A click on a switch (`SwitchLinks`) is a router navigation: it asks for the data of the
    // page, and any type is fine. The same address asked for as a page asks for HTML.
    const address = '/cijfers?competitie=eredivisie'

    expect(visitOf(request(address, { accept: '*/*', rsc: '1' }))).toBeUndefined()
    expect(visitOf(request(address, { accept: 'text/x-component' }))).toBeUndefined()
    expect(visitOf(request(address))).toMatchObject({ path: '/cijfers' })
  })

  it('has no link of Next.js, so a link loads a whole page that the proxy sees (the switches use the router)', () => {
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
    // The pages that are on no list on purpose: the admin, the article and the page of a club,
    // which the database confirms, the page of a season, which counts as /wedstrijden, /cijfers
    // or /spelers, and the page of a match, which counts as /wedstrijden. A slot of the layout
    // (@shortcuts) is not a page of its own.
    const withoutCount = [
      '/beheer',
      '/beheer/[...]',
      '/redactie/[slug]',
      '/cijfers/[seizoen]',
      '/spelers/[seizoen]',
      '/tegenstanders/[club]',
      '/wedstrijden/[seizoen]',
      '/wedstrijden/[seizoen]/[wedstrijd]',
    ]
    const paths = readdirSync(`${import.meta.dirname}/app`, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'page.tsx')
      .map((entry) => entry.parentPath.slice(`${import.meta.dirname}/app`.length) || '/')
      .filter((path) => !path.startsWith('/beheer') && !path.startsWith('/@') && !withoutCount.includes(path))

    expect(paths.toSorted()).toEqual(
      [
        ...pages.map(({ path }) => path),
        '/contact/verstuurd',
        '/nieuws/zoeken',
        '/spelers/zoeken',
        '/wedstrijden/zoeken',
      ].toSorted(),
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

  it('counts the page of a club that exists, and not one that does not', async () => {
    const record = vi.fn().mockResolvedValue(undefined)
    const waitUntil = vi.fn()

    countVisit(request('/tegenstanders/ado-den-haag'), waitUntil, record)
    await waitUntil.mock.calls[0]?.[0]
    isClubSlug.mockResolvedValue(false)
    countVisit(request('/tegenstanders/bestaat-niet'), waitUntil, record)
    await waitUntil.mock.calls[1]?.[0]

    expect(isClubSlug).toHaveBeenCalledTimes(2)
    expect(record).toHaveBeenCalledOnce()
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ path: '/tegenstanders/ado-den-haag' }))
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
