import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'

import type { RobotsStore } from './fetcher.ts'
import type { RobotsRule } from './robots.ts'
import type { Handler, TestServer } from './test-server.ts'

import rootPackage from '../../../package.json' with { type: 'json' }
import { createFetcher, defaultLimits, parseRetryAfter, userAgent } from './fetcher.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const servers: TestServer[] = []

/** Starts a test server that is stopped after the test. */
async function serve(routes: Record<string, Handler>, host?: string) {
  const server = await startServer(routes, host)
  servers.push(server)
  return server
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

const decode = (body: Uint8Array) => new TextDecoder().decode(body)

/** A handler that sends the headers and then never finishes. */
const stall: Handler = (_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.write('start')
}

describe('the user agent', () => {
  it('names the project, with the version of the root package.json and a link to the repository', () => {
    expect(userAgent).toBe(
      `scHeerenveenFansite/${rootPackage.version} (+https://github.com/VincentSmedinga/sc-heerenveen-fansite)`,
    )
  })

  it('goes with every request, robots.txt included, and the fetcher sends no cookies and no other identity', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })

    await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(server.paths()).toEqual(['/robots.txt', '/feed'])
    for (const request of server.requests) {
      expect(request.method).toBe('GET')
      expect(request.headers['user-agent']).toBe(userAgent)
      expect(request.headers['cookie']).toBeUndefined()
      expect(request.headers['referer']).toBeUndefined()
      expect(request.headers['origin']).toBeUndefined()
    }
  })
})

describe('a successful request', () => {
  it('returns the bytes, the type and the new ETag and Last-Modified', async () => {
    const server = await serve({
      '/feed': reply(200, 'één feed', {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        ETag: '"v2"',
        'Last-Modified': 'Wed, 21 Oct 2026 07:28:00 GMT',
      }),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome.kind).toBe('fetched')
    if (outcome.kind !== 'fetched') {
      return
    }
    expect(decode(outcome.body)).toBe('één feed')
    expect(outcome).toMatchObject({
      contentType: 'application/rss+xml; charset=utf-8',
      etag: '"v2"',
      lastModified: 'Wed, 21 Oct 2026 07:28:00 GMT',
      url: `${server.origin}/feed`,
    })
  })

  it('returns null for an ETag and Last-Modified the source did not send', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ etag: null, kind: 'fetched', lastModified: null })
  })

  it('reads a response with a gzip encoding', async () => {
    const server = await serve({ '/feed': reply(200, gzipSync('packed feed'), { 'Content-Encoding': 'gzip' }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome.kind === 'fetched' && decode(outcome.body)).toBe('packed feed')
  })

  it('accepts a URL object', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })

    const outcome = await fetcherFor(servers).fetch(new URL(`${server.origin}/feed`))

    expect(outcome.kind).toBe('fetched')
  })
})

describe('conditional requests', () => {
  it('asks with If-None-Match and If-Modified-Since, and reports a 304 as not modified, without content', async () => {
    const server = await serve({ '/feed': reply(304) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`, {
      etag: '"v1"',
      lastModified: 'Tue, 20 Oct 2026 07:28:00 GMT',
    })

    expect(outcome).toEqual({ kind: 'not-modified', url: `${server.origin}/feed` })
    const request = server.requests.find((candidate) => candidate.url === '/feed')
    expect(request?.headers['if-none-match']).toBe('"v1"')
    expect(request?.headers['if-modified-since']).toBe('Tue, 20 Oct 2026 07:28:00 GMT')
  })

  it('sends only what the adapter has', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })

    await fetcherFor(servers).fetch(`${server.origin}/feed`, { etag: '"v1"', lastModified: null })

    const request = server.requests.find((candidate) => candidate.url === '/feed')
    expect(request?.headers['if-none-match']).toBe('"v1"')
    expect(request?.headers['if-modified-since']).toBeUndefined()
  })

  it('sends nothing the first time', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })

    await fetcherFor(servers).fetch(`${server.origin}/feed`, { etag: null, lastModified: undefined })

    const request = server.requests.find((candidate) => candidate.url === '/feed')
    expect(request?.headers['if-none-match']).toBeUndefined()
    expect(request?.headers['if-modified-since']).toBeUndefined()
  })

  it('returns the content and the new ETag when the source answers 200', async () => {
    const server = await serve({ '/feed': reply(200, 'new feed', { ETag: '"v2"' }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`, { etag: '"v1"' })

    expect(outcome).toMatchObject({ etag: '"v2"', kind: 'fetched' })
  })

  it('does not take a 304 for an answer when it asked for nothing', async () => {
    const server = await serve({ '/feed': reply(304) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'http-status', status: 304 })
  })
})

describe('a source that asks us to wait', () => {
  it('reports a 429 with the seconds of Retry-After, and does not try again', async () => {
    const server = await serve({ '/feed': reply(429, 'Slow down', { 'Retry-After': '120' }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toEqual({ kind: 'wait', retryAfterSeconds: 120, status: 429, url: `${server.origin}/feed` })
    expect(server.paths()).toEqual(['/robots.txt', '/feed'])
  })

  it('reports a 503 with the date of Retry-After as seconds from now', async () => {
    const server = await serve({
      '/feed': reply(503, '', { 'Retry-After': new Date(Date.now() + 90_000).toUTCString() }),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'wait', status: 503 })
    const seconds = outcome.kind === 'wait' ? outcome.retryAfterSeconds : null
    expect(seconds).toBeGreaterThan(80)
    expect(seconds).toBeLessThanOrEqual(90)
  })

  it('reports null when the source does not say how long', async () => {
    const server = await serve({ '/feed': reply(503) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'wait', retryAfterSeconds: null, status: 503 })
  })

  describe('parseRetryAfter', () => {
    const now = Date.parse('Wed, 21 Oct 2026 07:28:00 GMT')

    it('reads seconds', () => {
      expect(parseRetryAfter('120', now)).toBe(120)
      expect(parseRetryAfter(' 0 ', now)).toBe(0)
    })

    it('reads a date as the seconds until then, rounded up', () => {
      expect(parseRetryAfter('Wed, 21 Oct 2026 07:30:00 GMT', now)).toBe(120)
      expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT', now + 500)).toBe(0)
      expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:01 GMT', now + 500)).toBe(1)
    })

    it('reads a date in the past as 0', () => {
      expect(parseRetryAfter('Wed, 21 Oct 2026 07:00:00 GMT', now)).toBe(0)
    })

    it('reads nothing it can not understand', () => {
      expect(parseRetryAfter(null, now)).toBeNull()
      expect(parseRetryAfter('', now)).toBeNull()
      expect(parseRetryAfter('soon', now)).toBeNull()
      expect(parseRetryAfter('-5', now)).toBeNull()
      expect(parseRetryAfter('9'.repeat(400), now)).toBeNull()
    })
  })
})

describe('the limits on time and size', () => {
  it('keeps the limits the issue names', () => {
    expect(defaultLimits).toEqual({ maxBytes: 5 * 1024 * 1024, maxRedirects: 5, timeoutMs: 15_000 })
  })

  it('stops a request that is not answered in time', async () => {
    const server = await serve({ '/feed': () => undefined })

    const outcome = await fetcherFor(servers, { timeoutMs: 150 }).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'timeout', url: `${server.origin}/feed` })
  })

  it('stops a response that stalls halfway', async () => {
    const server = await serve({ '/feed': stall })

    const outcome = await fetcherFor(servers, { timeoutMs: 150 }).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'timeout' })
  })

  it('reads a response of exactly the size it allows', async () => {
    const server = await serve({ '/feed': reply(200, Buffer.alloc(defaultLimits.maxBytes, 'a')) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome.kind === 'fetched' && outcome.body.byteLength).toBe(defaultLimits.maxBytes)
  })

  it('refuses a response of one byte more', async () => {
    const server = await serve({ '/feed': reply(200, Buffer.alloc(defaultLimits.maxBytes + 1, 'a')) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'too-large' })
    expect(outcome).not.toHaveProperty('body')
  })

  it('stops reading a response without a length that never ends', async () => {
    let stopped = false
    const server = await serve({
      '/feed': (_request, response) => {
        response.writeHead(200)
        const chunk = Buffer.alloc(64 * 1024, 'a')
        const send = () => {
          while (!stopped && response.write(chunk)) {
            // Fill the buffer; wait for 'drain' when it is full.
          }
          if (!stopped) {
            response.once('drain', send)
          }
        }
        response.on('close', () => {
          stopped = true
        })
        send()
      },
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'too-large' })
    await expect.poll(() => stopped).toBe(true)
  })

  it('counts the size after decompression', async () => {
    const server = await serve({
      '/feed': reply(200, gzipSync(Buffer.alloc(defaultLimits.maxBytes + 1)), { 'Content-Encoding': 'gzip' }),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'too-large' })
  })
})

describe('robots.txt', () => {
  it('does not fetch what robots.txt disallows for us', async () => {
    const server = await serve({
      '/news/feed': reply(200, 'feed'),
      '/robots.txt': reply(200, 'User-agent: *\nDisallow: /news/'),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/news/feed`)

    expect(outcome).toEqual({ kind: 'blocked-by-robots', url: `${server.origin}/news/feed` })
    expect(server.paths()).toEqual(['/robots.txt'])
  })

  it('follows the rules for scHeerenveenFansite before the rules for *', async () => {
    const server = await serve({
      '/feed': reply(200, 'feed'),
      '/robots.txt': reply(
        200,
        'User-agent: *\nDisallow: /\n\nUser-agent: scHeerenveenFansite\nAllow: /feed$\nDisallow: /',
      ),
    })

    expect((await fetcherFor(servers).fetch(`${server.origin}/feed`)).kind).toBe('fetched')
    expect((await fetcherFor(servers).fetch(`${server.origin}/other`)).kind).toBe('blocked-by-robots')
  })

  it('lets the longest rule win, and Allow win a tie', async () => {
    const server = await serve({
      '/news/feed.xml': reply(200, 'feed'),
      '/news/other': reply(200, 'other'),
      '/robots.txt': reply(
        200,
        'User-agent: *\nDisallow: /news/\nAllow: /news/feed.xml\nDisallow: /news/other\nAllow: /news/other',
      ),
    })
    const fetcher = fetcherFor(servers)

    expect((await fetcher.fetch(`${server.origin}/news/feed.xml`)).kind).toBe('fetched')
    expect((await fetcher.fetch(`${server.origin}/news/other`)).kind).toBe('fetched')
    expect((await fetcher.fetch(`${server.origin}/news/else`)).kind).toBe('blocked-by-robots')
  })

  it('allows everything when robots.txt is a 404', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })

    expect((await fetcherFor(servers).fetch(`${server.origin}/feed`)).kind).toBe('fetched')
  })

  it('allows everything for any other 4xx', async () => {
    const server = await serve({ '/feed': reply(200, 'feed'), '/robots.txt': reply(403, 'Forbidden') })

    expect((await fetcherFor(servers).fetch(`${server.origin}/feed`)).kind).toBe('fetched')
  })

  it.each([500, 502, 503, 429])('fetches nothing when robots.txt is a %i', async (status) => {
    const server = await serve({ '/feed': reply(200, 'feed'), '/robots.txt': reply(status) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'robots-unreadable' })
    expect(outcome).toHaveProperty('message', expect.stringContaining(String(status)))
    expect(server.paths()).toEqual(['/robots.txt'])
  })

  it('fetches nothing when robots.txt does not answer in time', async () => {
    const server = await serve({ '/feed': reply(200, 'feed'), '/robots.txt': () => undefined })

    const outcome = await fetcherFor(servers, { timeoutMs: 150 }).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'robots-unreadable' })
    expect(server.paths()).toEqual(['/robots.txt'])
  })

  it('fetches nothing when the connection for robots.txt fails', async () => {
    const server = await serve({})
    const { origin } = server
    await server.close()

    const outcome = await fetcherFor(servers).fetch(`${origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'robots-unreadable' })
  })

  it('fetches nothing when robots.txt is larger than we read', async () => {
    const server = await serve({
      '/feed': reply(200, 'feed'),
      '/robots.txt': reply(200, Buffer.alloc(defaultLimits.maxBytes + 1, '#')),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'robots-unreadable' })
  })

  it('follows a redirect for robots.txt', async () => {
    const server = await serve({
      '/feed': reply(200, 'feed'),
      '/robots.txt': reply(301, '', { Location: '/rules.txt' }),
      '/rules.txt': reply(200, 'User-agent: *\nDisallow: /feed'),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome.kind).toBe('blocked-by-robots')
  })

  it('fetches nothing when robots.txt redirects too often', async () => {
    const server = await serve({
      '/feed': reply(200, 'feed'),
      '/robots.txt': reply(302, '', { Location: '/robots.txt' }),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'robots-unreadable' })
    expect(server.paths().filter((path) => path === '/robots.txt')).toHaveLength(defaultLimits.maxRedirects + 1)
  })

  it('reads robots.txt of a host once for as long as the fetcher lives, also for requests at the same time', async () => {
    const server = await serve({ '/a': reply(200, 'a'), '/b': reply(200, 'b'), '/c': reply(200, 'c') })
    const fetcher = fetcherFor(servers)

    await Promise.all([fetcher.fetch(`${server.origin}/a`), fetcher.fetch(`${server.origin}/b`)])
    await fetcher.fetch(`${server.origin}/c`)

    expect(server.paths().filter((path) => path === '/robots.txt')).toHaveLength(1)

    await fetcherFor(servers).fetch(`${server.origin}/a`)

    expect(server.paths().filter((path) => path === '/robots.txt')).toHaveLength(2)
  })

  it('remembers a robots.txt that could not be read, too', async () => {
    const server = await serve({ '/feed': reply(200, 'feed'), '/robots.txt': reply(500) })
    const fetcher = fetcherFor(servers)

    await fetcher.fetch(`${server.origin}/feed`)
    await fetcher.fetch(`${server.origin}/feed`)

    expect(server.paths()).toEqual(['/robots.txt'])
  })

  describe('with a store that keeps it between runs', () => {
    /** A store in memory, in place of the database. */
    function memoryStore(kept: Record<string, RobotsRule[]> = {}) {
      return {
        get: async (origin: string) => kept[origin],
        kept,
        set: async (origin: string, rules: RobotsRule[]) => {
          kept[origin] = rules
        },
      } satisfies RobotsStore & { kept: Record<string, RobotsRule[]> }
    }

    it('takes the rules from the store, and does not ask the host', async () => {
      const server = await serve({ '/feed': reply(200, 'feed'), '/geheim': reply(200, 'geheim') })
      const robots = memoryStore({ [server.origin]: [{ allow: false, pattern: '/geheim' }] })
      const fetcher = fetcherFor(servers, { robots })

      expect(await fetcher.fetch(`${server.origin}/feed`)).toMatchObject({ kind: 'fetched' })
      expect(await fetcher.fetch(`${server.origin}/geheim`)).toMatchObject({ kind: 'blocked-by-robots' })
      expect(server.paths()).toEqual(['/feed'])
    })

    it('puts the rules it read at the host in the store', async () => {
      const server = await serve({
        '/feed': reply(200, 'feed'),
        '/robots.txt': reply(200, 'User-agent: *\nDisallow: /geheim\n'),
      })
      const robots = memoryStore()

      await fetcherFor(servers, { robots }).fetch(`${server.origin}/feed`)

      expect(robots.kept).toEqual({ [server.origin]: [{ allow: false, pattern: '/geheim' }] })
    })

    it('puts nothing in the store when robots.txt could not be read', async () => {
      const server = await serve({ '/feed': reply(200, 'feed'), '/robots.txt': reply(503) })
      const robots = memoryStore()

      await fetcherFor(servers, { robots }).fetch(`${server.origin}/feed`)

      expect(robots.kept).toEqual({})
    })

    it('reads robots.txt at the host when the store fails', async () => {
      const server = await serve({ '/feed': reply(200, 'feed') })
      const robots: RobotsStore = {
        get: () => Promise.reject(new Error('De database is weg')),
        set: () => Promise.reject(new Error('De database is weg')),
      }

      expect(await fetcherFor(servers, { robots }).fetch(`${server.origin}/feed`)).toMatchObject({ kind: 'fetched' })
      expect(server.paths()).toEqual(['/robots.txt', '/feed'])
    })
  })
})

describe('redirects', () => {
  it('follows a redirect on the same host, with a relative address', async () => {
    const server = await serve({ '/feed': reply(301, '', { Location: '/new/feed' }), '/new/feed': reply(200, 'moved') })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'fetched', url: `${server.origin}/new/feed` })
    expect(outcome.kind === 'fetched' && decode(outcome.body)).toBe('moved')
  })

  it('reads the robots.txt of another host and then follows the redirect there', async () => {
    const other = await serve({ '/feed': reply(200, 'there') }, 'localhost')
    const server = await serve({ '/feed': reply(302, '', { Location: `${other.origin}/feed` }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'fetched', url: `${other.origin}/feed` })
    expect(other.paths()).toEqual(['/robots.txt', '/feed'])
    expect(other.requests[0]?.headers['user-agent']).toBe(userAgent)
  })

  it('does not follow a redirect to a host that robots.txt closes to us', async () => {
    const other = await serve(
      { '/feed': reply(200, 'there'), '/robots.txt': reply(200, 'User-agent: *\nDisallow: /') },
      'localhost',
    )
    const server = await serve({ '/feed': reply(302, '', { Location: `${other.origin}/feed` }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toEqual({ kind: 'blocked-by-robots', url: `${other.origin}/feed` })
    expect(other.paths()).toEqual(['/robots.txt'])
  })

  it('does not follow a redirect to a host whose robots.txt it can not read', async () => {
    const other = await serve({ '/feed': reply(200, 'there'), '/robots.txt': reply(500) }, 'localhost')
    const server = await serve({ '/feed': reply(302, '', { Location: `${other.origin}/feed` }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'robots-unreadable', url: `${other.origin}/feed` })
    expect(other.paths()).toEqual(['/robots.txt'])
  })

  it('checks the path of a redirect on the same host against robots.txt', async () => {
    const server = await serve({
      '/feed': reply(302, '', { Location: '/private/feed' }),
      '/private/feed': reply(200, 'secret'),
      '/robots.txt': reply(200, 'User-agent: *\nDisallow: /private/'),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toEqual({ kind: 'blocked-by-robots', url: `${server.origin}/private/feed` })
  })

  it('follows five redirects and not six', async () => {
    const chain = (length: number) =>
      Object.fromEntries(
        Array.from({ length }, (_, index): [string, Handler] => [
          `/hop${index}`,
          index === length - 1 ? reply(200, 'end') : reply(302, '', { Location: `/hop${index + 1}` }),
        ]),
      )
    const five = await serve(chain(6))
    const six = await serve(chain(7))

    expect((await fetcherFor(servers).fetch(`${five.origin}/hop0`)).kind).toBe('fetched')
    expect(await fetcherFor(servers).fetch(`${six.origin}/hop0`)).toMatchObject({
      kind: 'error',
      reason: 'too-many-redirects',
    })
  })

  it('follows no redirect to another scheme than http or https', async () => {
    for (const location of [
      'file:///etc/passwd',
      'ftp://example.com/feed',
      'javascript:alert(1)',
      'data:text/plain,hi',
    ]) {
      const server = await serve({ '/feed': reply(302, '', { Location: location }) })

      const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

      expect(outcome, location).toMatchObject({ kind: 'error', reason: 'invalid-redirect' })
      expect(server.paths()).toEqual(['/robots.txt', '/feed'])
    }
  })

  it('follows no redirect to a URL with a password', async () => {
    const server = await serve({ '/feed': reply(302, '', { Location: 'http://user:secret@localhost/feed' }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'invalid-redirect' })
    expect(JSON.stringify(outcome)).not.toContain('secret')
  })

  it('reports a redirect without a Location as an error', async () => {
    const server = await serve({ '/feed': reply(302) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'invalid-redirect' })
  })
})

describe('addresses that are not on the public internet', () => {
  // The fetcher checks the address it connects to. A server on this computer shows that it
  // never gets that far: the server gets no request.
  const named = ['localhost', '127.0.0.1', '[::1]', '10.0.0.1', '169.254.169.254']

  it.each([...named, '0.0.0.0', '[::ffff:127.0.0.1]'])('refuses %s in the URL, and asks it nothing', async (host) => {
    const server = await serve({ '/feed': reply(200, 'feed') })
    const url = new URL(`http://${host}:${new URL(server.origin).port}/feed`)

    const outcome = await createFetcher().fetch(url)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'private-address', url: url.href })
    expect(server.requests).toEqual([])
  })

  it('says which address it refused', async () => {
    const outcome = await createFetcher().fetch('http://127.0.0.1/feed')

    expect(outcome).toEqual({
      kind: 'error',
      message: 'robots.txt: 127.0.0.1 is not on the public internet',
      reason: 'private-address',
      url: 'http://127.0.0.1/feed',
    })
  })

  it.each(named)('refuses %s after a redirect', async (host) => {
    const server = await serve({ '/feed': reply(302, '', { Location: `http://${host}/feed` }) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'private-address', url: `http://${host}/feed` })
    expect(server.paths()).toEqual(['/robots.txt', '/feed'])
  })

  it('refuses a robots.txt that redirects to such an address, and does not ask for the feed', async () => {
    const server = await serve({
      '/feed': reply(200, 'feed'),
      '/robots.txt': reply(301, '', { Location: 'http://169.254.169.254/latest/meta-data/' }),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'private-address', url: `${server.origin}/feed` })
    expect(server.paths()).toEqual(['/robots.txt'])
  })

  it.each(['127.0.0.1', '::1', '10.0.0.1', '169.254.169.254'])('refuses a name that points to %s', async (address) => {
    const resolve = async () => [{ address, family: address.includes(':') ? 6 : 4 }]

    const outcome = await createFetcher({ resolve }).fetch('http://bron.test/feed')

    expect(outcome).toEqual({
      kind: 'error',
      message: `robots.txt: bron.test points to ${address}, which is not on the public internet`,
      reason: 'private-address',
      url: 'http://bron.test/feed',
    })
  })

  it('refuses a name that points to such an address after a redirect', async () => {
    const asked: string[] = []
    const resolve = async (hostname: string) => {
      asked.push(hostname)
      return [{ address: '10.0.0.1', family: 4 }]
    }
    const server = await serve({ '/feed': reply(302, '', { Location: 'https://intern.test/feed' }) })

    const outcome = await fetcherFor(servers, { resolve }).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'private-address', url: 'https://intern.test/feed' })
    expect(asked).toEqual(['intern.test'])
  })

  it('reaches only the test servers it is given, not another port on the same computer', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })
    const other = await startServer({ '/feed': reply(200, 'feed') })

    try {
      expect((await fetcherFor([server]).fetch(`${server.origin}/feed`)).kind).toBe('fetched')
      expect(await fetcherFor([server]).fetch(`${other.origin}/feed`)).toMatchObject({ reason: 'private-address' })
      expect(other.requests).toEqual([])
    } finally {
      await other.close()
    }
  })
})

describe('cookies and consent screens', () => {
  it('never sends a cookie, also not when the source sets one', async () => {
    const cookie = { 'Set-Cookie': 'session=abc123; Path=/' }
    const server = await serve({
      '/feed': reply(302, '', { ...cookie, Location: '/real/feed' }),
      '/other': reply(200, 'other', cookie),
      '/real/feed': reply(200, 'feed', cookie),
      '/robots.txt': reply(200, 'User-agent: *\nAllow: /', cookie),
    })
    const fetcher = fetcherFor(servers)

    await fetcher.fetch(`${server.origin}/feed`)
    await fetcher.fetch(`${server.origin}/other`)
    await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(server.requests.length).toBeGreaterThanOrEqual(5)
    for (const request of server.requests) {
      expect(request.headers['cookie']).toBeUndefined()
    }
  })

  it('reports a refusal as an error, and does not try to get around it', async () => {
    const server = await serve({
      '/consent': reply(200, 'Do you accept?', { 'Set-Cookie': 'consent=pending' }),
      '/feed': reply(403, 'Please accept the cookies first'),
    })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'http-status', status: 403 })
    expect(server.paths()).toEqual(['/robots.txt', '/feed'])
  })
})

describe('errors', () => {
  it.each([400, 404, 410, 451, 500, 502])('reports a %i as an error with the status', async (status) => {
    const server = await serve({ '/feed': reply(status) })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toEqual({
      kind: 'error',
      message: `HTTP ${status}`,
      reason: 'http-status',
      status,
      url: `${server.origin}/feed`,
    })
  })

  it('reports a connection that breaks as a network error', async () => {
    const server = await serve({ '/feed': (request) => request.socket.destroy() })

    const outcome = await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(outcome).toMatchObject({ kind: 'error', reason: 'network' })
  })

  it('asks for nothing at a URL that is not http or https', async () => {
    const fetcher = fetcherFor(servers)

    for (const url of ['ftp://example.com/feed', 'file:///etc/passwd', 'not a url', '/relative']) {
      expect(await fetcher.fetch(url), url).toMatchObject({ kind: 'error', reason: 'invalid-url' })
    }
  })

  it('asks for nothing at a URL with a password, and keeps the password out of the outcome', async () => {
    const server = await serve({ '/feed': reply(200, 'feed') })

    const outcome = await fetcherFor(servers).fetch(server.origin.replace('http://', 'http://user:secret@') + '/feed')

    expect(outcome).toMatchObject({ kind: 'error', reason: 'invalid-url', url: `${server.origin}/feed` })
    expect(server.requests).toEqual([])
  })

  it('does not retry a request that failed', async () => {
    const server = await serve({ '/feed': reply(500) })

    await fetcherFor(servers).fetch(`${server.origin}/feed`)

    expect(server.paths()).toEqual(['/robots.txt', '/feed'])
  })
})
