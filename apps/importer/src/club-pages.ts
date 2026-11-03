import type { Database } from '@fansite/db/client'

import { knownClubPages, rememberedClubArticles, repairClubPages, unrememberedClubPages } from '@fansite/db/clubs'

import type { Fetcher } from './fetcher.ts'

import { linkedPage, pageUrl } from './read-wikipedia.ts'
import { printable } from './text.ts'

/** The most redirects the import follows from one title to the article. */
export const maxRedirects = 3

/** What came of asking Wikipedia about titles: the answers, or why there are none. */
export type PageLookup =
  | { kind: 'blocked-by-robots'; url: string }
  | { kind: 'error'; message: string }
  | { kind: 'found'; redirects: Map<string, string> }
  | { kind: 'wait'; retryAfterSeconds: null | number; url: string }

/** A redirect page starts with `#REDIRECT` or `#DOORVERWIJZING`, whatever the capitals. */
const redirectStart = /^#(?:redirect|doorverwijzing)\b/iu

/**
 * Asks about the titles of the articles of the matches that the database does not know yet
 * (`knownClubPages`), and about no other: a title that is in `clubs` or `club_pages` costs no
 * request. See `lookUpTitles`.
 */
export async function lookUpClubPages(
  db: Pick<Database, 'select'>,
  fetcher: Fetcher,
  origin: string,
  titles: readonly string[],
): Promise<PageLookup> {
  const known = await knownClubPages(db)
  const wanted = [...new Set(titles)].filter((title) => !known.has(title))

  return wanted.length === 0
    ? { kind: 'found', redirects: new Map() }
    : lookUpTitles(fetcher, origin, wanted, await rememberedClubArticles(db))
}

/**
 * Asks Wikipedia once, with `?action=raw`, about each of the titles and follows the redirects
 * to the article. It keeps nothing from the text of a page: only whether it is a redirect and
 * to what. The answer maps each title it asked about, the titles on the way too, to the title
 * of the article the redirects end in, which is the title itself when it is no redirect
 * (`createClubBook` and `repairClubPages` take it as `redirects`). A redirect to a title in
 * `articles` (`rememberedClubArticles`) ends in the article of that title, and costs no
 * request. A title is asked for at most once.
 *
 * A request that fails, a robots.txt that refuses it and an answer that is not a page give no
 * answer for any title: a club made on a guess is worse than a run that waits for the next one.
 */
export async function lookUpTitles(
  fetcher: Fetcher,
  origin: string,
  titles: readonly string[],
  articles: ReadonlyMap<string, string>,
): Promise<PageLookup> {
  const redirects = new Map<string, string>()

  for (const first of new Set(titles)) {
    if (redirects.has(first)) {
      continue
    }

    const chain: string[] = []
    let title = first
    let end: string

    for (;;) {
      chain.push(title)

      const outcome = await fetcher.fetch(pageUrl(origin, title))

      switch (outcome.kind) {
        case 'blocked-by-robots':
          return { kind: 'blocked-by-robots', url: outcome.url }
        case 'error':
          return { kind: 'error', message: `${printable(title)}: ${printable(outcome.message)}` }
        case 'fetched':
          break
        case 'not-modified':
          return {
            kind: 'error',
            message: `${printable(title)}: the page answered 304 to a request without conditions`,
          }
        case 'wait':
          return { kind: 'wait', retryAfterSeconds: outcome.retryAfterSeconds, url: outcome.url }
      }

      // A byte order mark and spaces in front are not part of the redirect.
      const text = new TextDecoder('utf-8').decode(outcome.body).trimStart()
      const marker = redirectStart.exec(text)

      if (marker === null) {
        end = title
        break
      }

      const target = linkedPage(text.slice(marker[0].length))

      if (target === null) {
        return { kind: 'error', message: `${printable(title)}: a redirect without a title to go to` }
      }
      if (chain.length > maxRedirects) {
        return { kind: 'error', message: `${printable(first)}: more than ${maxRedirects} redirects in a row` }
      }
      if (chain.includes(target)) {
        return { kind: 'error', message: `${printable(first)}: the redirects go round in a circle` }
      }

      const answered = redirects.get(target) ?? articles.get(target)

      if (answered !== undefined) {
        end = answered
        break
      }

      title = target
    }

    for (const one of chain) {
      redirects.set(one, end)
    }
  }

  return { kind: 'found', redirects }
}

/**
 * Makes the clubs right that are under a title that is a redirect, at the start of a run: the
 * title of every club that is not in `club_pages` is asked about once, and `repairClubPages`
 * merges the clubs of one article and remembers the titles. A run that has nothing to check
 * asks nothing and writes nothing. Returns the lines for the log, in English. It throws when
 * Wikipedia can't answer (the message says why) or the database fails; the caller turns that
 * into a warning.
 */
export async function repairClubPagesFromWikipedia(db: Database, fetcher: Fetcher, origin: string): Promise<string[]> {
  const titles = await unrememberedClubPages(db)

  if (titles.length === 0) {
    return []
  }

  const lookup = await lookUpTitles(fetcher, origin, titles, await rememberedClubArticles(db))

  switch (lookup.kind) {
    case 'blocked-by-robots':
      throw new Error(`club pages not checked: robots.txt does not allow ${printable(lookup.url)}`)
    case 'error':
      throw new Error(`club pages not checked: ${lookup.message}`)
    case 'wait':
      throw new Error(`club pages not checked: Wikipedia asks us to wait (${printable(lookup.url)})`)
    case 'found':
      return repairClubPages(db, lookup.redirects)
  }
}
