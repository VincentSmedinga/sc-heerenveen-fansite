import type { NextRequest } from 'next/server'

import { createVisitCounter, type Visit } from '@fansite/db/visits'
import { BlockList, isIP } from 'node:net'

import { getArticle } from './articles'
import { getDatabase } from './database'
import { reasonOf } from './errors'
import { isClubSlug } from './opponents'
import { pages } from './pages'
import { seasonFromSlug } from './seasons'

/**
 * The browser texts that are not visitors, in one place: crawlers and other bots, tools that
 * fetch a page, link previews, the checks of monitoring and of the hosting, and our own
 * importer (`scHeerenveenFansite/…`). A text that is empty is not counted either. Add a
 * pattern here when a bot shows up in the numbers.
 */
export const notVisitors =
  /bot|crawl|spider|slurp|scrape|headless|lighthouse|preview|monitor|uptime|pingdom|statuscake|site24x7|facebookexternalhit|curl\/|wget|python|java\/|go-http-client|okhttp|libwww|node|axios|whatsapp|telegram|postman|litespeed|lsnode|cpanel|plesk|scheerenveenfansite/iu

/**
 * The pages that are counted: those in `pages.ts`, the page after the contact form and the
 * search, which is no page for a search engine but is for a visitor. The path has no query, so
 * what was searched for is not part of the count. An
 * article is counted by `articlePath`, and the page of a club by `clubPath`, once the database
 * says it exists. The admin, the files,
 * `/_next` and the addresses for machines (feeds, robots.txt, sitemap.xml, the manifest) are
 * on no list, so they are not counted. A path that is on no list, such as one that doesn't
 * exist, is not counted either.
 */
const countedPaths: ReadonlySet<string> = new Set([
  ...pages.map(({ path }) => path),
  '/contact/verstuurd',
  '/nieuws/zoeken',
])

const articlePath = /^\/redactie\/([^/]+)$/u

const clubPath = /^\/statistieken\/tegenstanders\/([^/]+)$/u

const seasonPath = /^(\/wedstrijden|\/statistieken\/spelers|\/statistieken)\/([^/]+)$/u

/**
 * The path a visit is counted under. The page of a season, such as `/wedstrijden/2025-26`,
 * `/statistieken/2025-26` or `/statistieken/spelers/2025-26`, counts as a visit to
 * `/wedstrijden`, `/statistieken` or `/statistieken/spelers`: it is the same page for another
 * season, and a count per season would be a row for every address that has the shape of one.
 */
const countedPathOf = (path: string) => {
  const [, page, slug] = seasonPath.exec(path) ?? []

  return page !== undefined && seasonFromSlug(slug) !== undefined ? page : path
}

/** What a visit needs to be counted. */
export type PageVisit = {
  /** The address of the visitor, when the host gave one that is an address. */
  address: string | undefined
  /** The slug of the article when the page is one; the database has to know it. */
  article: string | undefined
  /** The slug of the club when the page is the page of a club; the database has to know it. */
  club: string | undefined
  /** The path of the page, without a query. */
  path: string
  /** The browser text. */
  userAgent: string
}

/**
 * The addresses that are no visitor: the computer itself and the networks inside a house or a
 * data centre. Next.js takes the address of the connection when the host sends no
 * `X-Forwarded-For`, and behind the host that is the host's own server, the same for everyone.
 */
const privateAddresses = new BlockList()

for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
] as const) {
  privateAddresses.addSubnet(network, prefix, 'ipv4')
}

for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
] as const) {
  privateAddresses.addSubnet(network, prefix, 'ipv6')
}

/**
 * What to count for a request, or undefined when it isn't a visit: a request that is not a
 * GET for a page of the site that asks for HTML, a prefetch, a bot, a check of the hosting, or
 * a visitor who asked not to be counted (`DNT: 1` or `Sec-GPC: 1`). Every link of the site
 * loads a whole page, so a page view is a request for HTML. Next.js hides the headers of its
 * own navigation without a page load from the proxy, and those requests accept any type.
 */
export function visitOf(request: NextRequest): PageVisit | undefined {
  const { headers } = request
  const path = countedPathOf(request.nextUrl.pathname)
  const userAgent = headers.get('user-agent') ?? ''
  const article = articlePath.exec(path)?.[1]
  const club = clubPath.exec(path)?.[1]

  if (
    request.method !== 'GET' ||
    (!countedPaths.has(path) && article === undefined && club === undefined) ||
    !(headers.get('accept') ?? '').includes('text/html') ||
    isPrefetch(headers) ||
    headers.get('dnt') === '1' ||
    headers.get('sec-gpc') === '1' ||
    userAgent === '' ||
    notVisitors.test(userAgent)
  ) {
    return undefined
  }

  return { address: addressOf(headers), article, club, path, userAgent }
}

/**
 * The address of the visitor from `X-Forwarded-For`. The host puts the visitor at the end of
 * it: whatever a visitor sends himself comes before. It is undefined when the host sends none,
 * or one that isn't a public address, and then the visitor is not counted, only the view. An
 * IPv4 address in IPv6 form (`::ffff:203.0.113.7`) is the IPv4 address, so one visitor is one
 * address.
 */
function addressOf(headers: Headers) {
  const address = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  const family = address === undefined ? 0 : isIP(address)

  if (address === undefined || family === 0 || privateAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4')) {
    return undefined
  }

  return address.replace(/^::ffff:(?=\d+\.)/iu, '')
}

/**
 * Whether the browser loads the page ahead of time, for a visitor who may not open it
 * (`Sec-Purpose` and `Purpose` are what Chrome, Safari and Firefox send, `X-Moz` is older).
 * Next.js hides its own headers for this from the proxy; the site has no `next/link`, so no
 * such request comes (see the test).
 */
function isPrefetch(headers: Headers) {
  return (
    /prefetch|prerender/iu.test(`${headers.get('purpose') ?? ''} ${headers.get('sec-purpose') ?? ''}`) ||
    headers.get('x-moz') === 'prefetch'
  )
}

/** How many visits may be waiting for the database, and how long one may take. */
const maxWaiting = 20
const maxMilliseconds = 5000

let waiting = 0
let lastLogAt = 0
let counter: ReturnType<typeof createVisitCounter> | undefined

/**
 * Counts the visit in the background, when the request is one. The page doesn't wait for it,
 * and a failure only reaches the log, without the address or the browser text. When the
 * database is slow or down, visits that cannot be sent at once are dropped instead of piling
 * up. `record` is the counter and is only given by tests.
 */
export function countVisit(
  request: NextRequest,
  waitUntil: (promise: Promise<unknown>) => void = () => undefined,
  record: (visit: Visit) => Promise<void> = (visit) => {
    counter ??= createVisitCounter(getDatabase().db)

    return counter.record(visit)
  },
) {
  try {
    const visit = visitOf(request)

    if (visit === undefined || waiting >= maxWaiting) {
      return
    }

    waiting += 1

    const counted = (async () => {
      // An article that doesn't exist, a draft and an article for later give "niet gevonden".
      if (visit.article !== undefined && (await getArticle(visit.article)) === undefined) {
        return
      }

      // A club that does not exist gives "niet gevonden", so the made-up address is no page.
      if (visit.club !== undefined && !(await isClubSlug(visit.club))) {
        return
      }

      await record({ ...visit, now: new Date() })
    })()
    let timer: ReturnType<typeof setTimeout> | undefined

    waitUntil(
      Promise.race([
        counted,
        new Promise<void>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`the database did not answer within ${maxMilliseconds} ms`)),
            maxMilliseconds,
          )
        }),
      ])
        .catch(logFailure)
        .finally(() => {
          clearTimeout(timer)
          waiting -= 1
        }),
    )
  } catch (error) {
    logFailure(error)
  }
}

/** Logs a failure, at most once a minute: a database that is down fails every visit. */
function logFailure(error: unknown) {
  if (Date.now() - lastLogAt > 60_000) {
    lastLogAt = Date.now()
    console.error(`Could not count a visit, so the page was not counted: ${reasonOf(error)}`)
  }
}
