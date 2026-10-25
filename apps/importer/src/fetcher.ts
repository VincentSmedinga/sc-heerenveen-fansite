import type { Response } from 'undici'

import { Agent, fetch } from 'undici'

import type { Resolve } from './address-check.ts'
import type { RobotsRule } from './robots.ts'

import rootPackage from '../../../package.json' with { type: 'json' }
import { checkedConnector, PrivateAddressError, resolveInDns } from './address-check.ts'
import { isAllowed, parseRobots } from './robots.ts'

/** The name robots.txt files know us by. It is part of the user agent. */
export const productToken = 'scHeerenveenFansite'

/** Sent with every request. The link goes to an about page once there is one (#24). */
export const userAgent = `${productToken}/${rootPackage.version} (+https://github.com/VincentSmedinga/sc-heerenveen-fansite)`

/**
 * What the fetcher allows a request. A fetcher can be given a shorter timeout, which keeps
 * tests fast.
 */
export const defaultLimits = {
  /** The most bytes of a response we read, after any decompression. */
  maxBytes: 5 * 1024 * 1024,
  maxRedirects: 5,
  /** The time one request has, from the start until the last byte of the response. */
  timeoutMs: 15_000,
}

export type ErrorReason =
  | 'http-status'
  | 'invalid-redirect'
  | 'invalid-url'
  | 'network'
  | 'private-address'
  | 'robots-unreadable'
  | 'timeout'
  | 'too-large'
  | 'too-many-redirects'

export type Fetcher = {
  /** Gets a URL, following the rules in the README. It never retries and never throws. */
  fetch: (url: string | URL, previous?: PreviousVersion) => Promise<FetchOutcome>
}

export type FetcherOptions = {
  /**
   * Finds the addresses of a host name, as `lookup` of `node:dns` does with `all: true`. A test
   * gives its own, so it asks no real DNS server. The fetcher checks the addresses it gets
   * either way.
   */
  resolve?: Resolve
  /**
   * Keeps the rules of robots.txt between runs. Without it, the fetcher reads robots.txt once
   * for as long as it lives.
   */
  robots?: RobotsStore
  /**
   * Origins the fetcher may reach although they are not on the public internet, such as `http://127.0.0.1:41234`.
   * Only for tests with a web server of their own on this computer: the import command never
   * sets this.
   */
  testOrigins?: string[]
  timeoutMs?: number
}

/**
 * What came of a request. A fetcher reports every outcome as a value instead of throwing, so an
 * adapter can't forget one. `url` is the last URL the fetcher asked for, which differs from the
 * one you gave after a redirect.
 */
export type FetchOutcome =
  | {
      /**
       * The bytes of the response, because the adapter knows what the encoding of its feed is.
       */
      body: Uint8Array
      contentType: null | string
      etag: null | string
      kind: 'fetched'
      lastModified: null | string
      url: string
    }
  | {
      kind: 'blocked-by-robots'
      url: string
    }
  | {
      kind: 'error'
      message: string
      reason: ErrorReason
      /** Only for `http-status`. */
      status?: number
      url: string
    }
  | {
      kind: 'not-modified'
      url: string
    }
  | {
      kind: 'wait'
      /**
       * How long the source wants us to wait, from `Retry-After`. Null when the source didn't
       * say.
       */
      retryAfterSeconds: null | number
      status: 429 | 503
      url: string
    }

/** What an adapter has from the previous time, so the source can say that nothing changed. */
export type PreviousVersion = {
  etag?: null | string | undefined
  lastModified?: null | string | undefined
}

/**
 * Keeps the rules of the robots.txt of an origin, such as `https://www.lc.nl`, between runs. `get` gives undefined when it
 * has none, or none that are young enough. The fetcher only keeps rules it could read: a
 * robots.txt that failed is read again next time.
 */
export type RobotsStore = {
  get: (origin: string) => Promise<RobotsRule[] | undefined>
  set: (origin: string, rules: RobotsRule[]) => Promise<void>
}

type ErrorOutcome = Extract<FetchOutcome, { kind: 'error' }>

type Failure = ErrorOutcome | Extract<FetchOutcome, { kind: 'blocked-by-robots' }>

type Robots = { kind: 'rules'; rules: RobotsRule[] } | { kind: 'unreadable'; message: string; reason: RobotsFailure }

/**
 * Why a robots.txt could not be read: the host failed to give it, or the fetcher refused the
 * address.
 */
type RobotsFailure = Extract<ErrorReason, 'private-address' | 'robots-unreadable'>

const redirectStatuses = new Set([301, 302, 303, 307, 308])

/**
 * Asks for a URL once, without following a redirect, through the agent that checks each
 * address.
 */
type Get = (url: URL, headers: Record<string, string>) => Promise<Response>

/**
 * Makes a fetcher. One fetcher reads the robots.txt of each host once, so make one per run of a
 * command and share it between adapters. With a store, it asks the store before the host, and
 * keeps what it read there.
 */
export function createFetcher({
  resolve = resolveInDns,
  robots: store,
  testOrigins = [],
  timeoutMs = defaultLimits.timeoutMs,
}: FetcherOptions = {}): Fetcher {
  const dispatcher = new Agent({ connect: checkedConnector(resolve, testOrigins) })
  const robotsByOrigin = new Map<string, Promise<Robots>>()
  const get: Get = (url, headers) =>
    fetch(url, { dispatcher, headers, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) })

  function robotsFor(url: URL) {
    let robots = robotsByOrigin.get(url.origin)
    if (robots === undefined) {
      robots = store === undefined ? loadRobots(url.origin, get, timeoutMs) : loadKeptRobots(url.origin, store)
      robotsByOrigin.set(url.origin, robots)
    }
    return robots
  }

  // The store saves requests and decides nothing: when it fails, the fetcher reads robots.txt
  // from the host, as it would without a store.
  async function loadKeptRobots(origin: string, store: RobotsStore): Promise<Robots> {
    const kept = await store.get(origin).catch(() => undefined)
    if (kept !== undefined) {
      return { kind: 'rules', rules: kept }
    }
    const robots = await loadRobots(origin, get, timeoutMs)
    if (robots.kind === 'rules') {
      await store.set(origin, robots.rules).catch(() => undefined)
    }
    return robots
  }

  async function checkRobots(url: URL): Promise<Failure | undefined> {
    const robots = await robotsFor(url)
    if (robots.kind === 'unreadable') {
      return failure(url, robots.reason, robots.message)
    }
    return isAllowed(robots.rules, url) ? undefined : { kind: 'blocked-by-robots', url: url.href }
  }

  async function read(response: Response, url: URL, askedIfModified: boolean): Promise<FetchOutcome> {
    const { status } = response

    if (status === 304 && askedIfModified) {
      await discard(response)
      return { kind: 'not-modified', url: url.href }
    }
    if (status === 429 || status === 503) {
      await discard(response)
      return {
        kind: 'wait',
        retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after')),
        status,
        url: url.href,
      }
    }
    if (!response.ok) {
      await discard(response)
      return failure(url, 'http-status', `HTTP ${status}`, status)
    }

    const body = await readBody(response, defaultLimits.maxBytes)
    if (body === undefined) {
      return failure(url, 'too-large', `The response is larger than ${defaultLimits.maxBytes} bytes`)
    }
    return {
      body,
      contentType: response.headers.get('content-type'),
      etag: response.headers.get('etag'),
      kind: 'fetched',
      lastModified: response.headers.get('last-modified'),
      url: url.href,
    }
  }

  return {
    async fetch(input, previous = {}) {
      let start: URL
      try {
        start = new URL(input)
      } catch {
        return failure(input, 'invalid-url', 'Not a URL')
      }
      const problem = problemWithUrl(start)
      if (problem !== undefined) {
        return failure(start, 'invalid-url', problem)
      }

      // Only these headers, and nothing the adapter can add: we don't pretend to be a browser.
      const headers: Record<string, string> = { 'User-Agent': userAgent }
      if (previous.etag) {
        headers['If-None-Match'] = previous.etag
      }
      if (previous.lastModified) {
        headers['If-Modified-Since'] = previous.lastModified
      }

      const followed = await follow(start, headers, get, timeoutMs, checkRobots)
      if (!('response' in followed)) {
        return followed
      }
      try {
        return await read(followed.response, followed.url, 'If-None-Match' in headers || 'If-Modified-Since' in headers)
      } catch (error) {
        return describeError(followed.url, error, timeoutMs)
      }
    },
  }
}

/** Reads `Retry-After`, which is a number of seconds or a date, as a number of seconds. */
export function parseRetryAfter(value: null | string, now: number = Date.now()): null | number {
  const trimmed = value?.trim() ?? ''
  if (/^\d+$/u.test(trimmed)) {
    const seconds = Number(trimmed)
    return Number.isSafeInteger(seconds) ? seconds : null
  }
  // Every format of an HTTP date starts with the name of a day. `Date.parse` takes more than
  // that, such as `-5`.
  const date = /^[a-z]/iu.test(trimmed) ? Date.parse(trimmed) : Number.NaN
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000))
}

/** Turns what `fetch` or reading a body threw into a failure. */
function describeError(url: URL, error: unknown, timeoutMs: number): ErrorOutcome {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return failure(url, 'timeout', `No complete response within ${timeoutMs} ms`)
  }
  // The reason of a failed connection is in the cause: `fetch failed` says nothing.
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error
  if (cause instanceof PrivateAddressError) {
    return failure(url, 'private-address', cause.message)
  }
  return failure(url, 'network', cause instanceof Error ? cause.message : String(cause))
}

/** Frees the connection of a response whose body we don't read. */
async function discard(response: Response) {
  try {
    await response.body?.cancel()
  } catch {
    // The connection is gone either way.
  }
}

function failure(url: string | URL, reason: ErrorReason, message: string, status?: number): ErrorOutcome {
  return {
    kind: 'error',
    message,
    reason,
    ...(status === undefined ? {} : { status }),
    url: withoutCredentials(url),
  }
}

/**
 * Asks for a URL and follows redirects by hand, one at a time, so every step is ours to check.
 * `check` runs before each request, the first one included, and can stop the whole thing.
 * Returns the first response that isn't a redirect.
 */
async function follow(
  start: URL,
  headers: Record<string, string>,
  get: Get,
  timeoutMs: number,
  check: (url: URL) => Failure | Promise<Failure | undefined> | undefined,
): Promise<Failure | { response: Response; url: URL }> {
  let url = start

  for (let redirects = 0; ; redirects++) {
    const stop = await check(url)
    if (stop !== undefined) {
      return stop
    }

    let response: Response
    try {
      // `get` asks with `redirect: 'manual'`, which hands us the redirect itself. No cookies
      // are stored or sent: undici's `fetch` has no cookie jar, and we set no `Cookie` header.
      response = await get(url, headers)
    } catch (error) {
      return describeError(url, error, timeoutMs)
    }
    if (!redirectStatuses.has(response.status)) {
      return { response, url }
    }

    await discard(response)
    if (redirects === defaultLimits.maxRedirects) {
      return failure(url, 'too-many-redirects', `More than ${defaultLimits.maxRedirects} redirects`)
    }
    const location = response.headers.get('location')
    if (location === null) {
      return failure(url, 'invalid-redirect', `HTTP ${response.status} without a Location header`)
    }
    let next: URL
    try {
      next = new URL(location, url)
    } catch {
      return failure(url, 'invalid-redirect', 'The Location header is not a URL')
    }
    const problem = problemWithUrl(next)
    if (problem !== undefined) {
      return failure(next, 'invalid-redirect', problem)
    }
    url = next
  }
}

/** Reads the robots.txt of an origin, as RFC 9309 says to treat each answer. */
async function loadRobots(origin: string, get: Get, timeoutMs: number): Promise<Robots> {
  const unreadable = (message: string, reason: RobotsFailure = 'robots-unreadable'): Robots => ({
    kind: 'unreadable',
    message: `robots.txt: ${message}`,
    reason,
  })
  const followed = await follow(
    new URL('/robots.txt', origin),
    { 'User-Agent': userAgent },
    get,
    timeoutMs,
    () => undefined,
  )
  if (!('response' in followed)) {
    if (followed.kind !== 'error') {
      return unreadable('blocked')
    }
    // An address the fetcher refused keeps that reason: it is not the host that failed.
    return unreadable(followed.message, followed.reason === 'private-address' ? 'private-address' : 'robots-unreadable')
  }

  const { response, url } = followed
  try {
    if (response.ok) {
      const body = await readBody(response, defaultLimits.maxBytes)
      if (body === undefined) {
        return unreadable(`larger than ${defaultLimits.maxBytes} bytes`)
      }
      return { kind: 'rules', rules: parseRobots(new TextDecoder().decode(body), productToken) }
    }

    await discard(response)
    // A 4xx means there is no robots.txt, and anything goes. A 429 is no 404: the host asks us
    // to slow down, and we can't tell what it would have said.
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      return { kind: 'rules', rules: [] }
    }
    return unreadable(`HTTP ${response.status}`)
  } catch (error) {
    return unreadable(describeError(url, error, timeoutMs).message)
  }
}

/** The problem with a URL we would not ask for, or undefined when it is fine. */
function problemWithUrl(url: URL): string | undefined {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `Only http and https are allowed, not ${url.protocol}`
  }
  if (url.username !== '' || url.password !== '') {
    return 'A URL with a username or password is not allowed'
  }
  return undefined
}

/** Reads a body, or returns undefined as soon as it is larger than `maxBytes`. */
async function readBody(response: Response, maxBytes: number): Promise<Uint8Array | undefined> {
  if (response.body === null) {
    return new Uint8Array()
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return undefined
    }
    chunks.push(value)
  }

  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

/**
 * A URL as it goes into an outcome: without a username or password, which don't belong in a
 * log.
 */
function withoutCredentials(url: string | URL): string {
  try {
    const clean = new URL(url)
    clean.username = ''
    clean.password = ''
    return clean.href
  } catch {
    return String(url)
  }
}
