import type { Handler } from './test-server.ts'

import { linkedPage, pageUrl } from './read-wikipedia.ts'
import { reply } from './test-server.ts'

/** An article as Wikipedia serves the raw text of one that is no redirect. */
export const articleText = 'Een artikel over een club. (Verzonnen tekst voor een test.)'

/**
 * Routes for every page that the texts link to, answering with an article that is no redirect,
 * so that a test of the import of the matches has the answer to the question of the importer
 * whether the article of a club is a redirect. A test that wants a redirect puts its own route
 * over these. `titles` are pages to serve that the texts do not link by that title. The routes
 * are on the path of `?action=raw`, as the importer asks for a page.
 */
export function articleRoutes(
  texts: readonly string[],
  { redirects = {}, titles = [] }: { redirects?: Record<string, string>; titles?: readonly string[] } = {},
) {
  const routes: Record<string, Handler> = {}

  for (const text of texts) {
    for (const link of text.matchAll(/\[\[[^\]]*\]\]/gu)) {
      const title = linkedPage(link[0])

      if (title !== null) {
        routes[pageUrl('', title)] = reply(200, articleTextOf(title), { 'Content-Type': 'text/x-wiki; charset=UTF-8' })
      }
    }
  }
  for (const title of titles) {
    routes[pageUrl('', title)] = reply(200, articleTextOf(title), { 'Content-Type': 'text/x-wiki; charset=UTF-8' })
  }
  for (const [title, target] of Object.entries(redirects)) {
    routes[pageUrl('', title)] = reply(200, `#REDIRECT [[${target}]]`, { 'Content-Type': 'text/x-wiki; charset=UTF-8' })
  }

  return routes
}

/**
 * The text of an article with a sort key made from its title, the family name first, as the
 * article of a person has one on Wikipedia (`Joost van Aken` has `Aken, Joost van`). A club
 * ignores it. The importer then reads a name from the key and has nothing to guess.
 */
export function articleTextOf(title: string) {
  const words = title.replace(/\s*\([^()]*\)\s*$/u, '').split(/\s+/u)
  const key = words.length === 1 ? words[0] : `${words.at(-1)}, ${words.slice(0, -1).join(' ')}`

  return `${articleText}\n{{DEFAULTSORT:${key}}}`
}
