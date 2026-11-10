import type { Database } from '@fansite/db/client'

import { playerListReadAt, storePlayerList } from '@fansite/db/persons'

import type { Fetcher } from './fetcher.ts'

import { linkedPage, pageUrl } from './read-wikipedia.ts'
import { printable } from './text.ts'

/** The page of the Dutch Wikipedia with the players of sc Heerenveen, of all times. */
export const playerListTitle = 'Lijst van spelers van sc Heerenveen (mannen)'

/** How long a read stays good, in milliseconds: the list changes slowly. */
export const playerListMaxAge = 24 * 60 * 60 * 1000

/**
 * Reads the list of players once, with the fetcher and the rules of the other readers, and
 * keeps its titles (`storePlayerList`). It is a check of names: it makes no player and changes
 * no name. A read that is not a day old is skipped. A page that can't be read, or has no
 * titles, leaves what the database has and gives a line that says why. Never throws.
 * Returns the lines for the log, in English.
 */
export async function importPlayerList(
  db: Database,
  fetcher: Fetcher,
  origin: string,
  clock: () => Date = () => new Date(),
): Promise<string[]> {
  try {
    const now = clock()
    const last = await playerListReadAt(db)

    if (last !== null && now.getTime() - last.getTime() < playerListMaxAge) {
      return []
    }

    const outcome = await fetcher.fetch(pageUrl(origin, playerListTitle))

    switch (outcome.kind) {
      case 'blocked-by-robots':
        return [`Player list: not read, robots.txt does not allow ${printable(outcome.url)}`]
      case 'error':
        return [`Player list: not read, ${printable(outcome.message)}`]
      case 'fetched':
        break
      case 'not-modified':
        return ['Player list: not read, the page answered 304 to a request without conditions']
      case 'wait':
        return [`Player list: not read, Wikipedia asks us to wait (${printable(outcome.url)})`]
    }

    const titles = readPlayerList(new TextDecoder('utf-8').decode(outcome.body))

    // A page that is a redirect or has changed its shape gives nothing: the old titles stay.
    if (titles.length === 0) {
      return ['Player list: not read, the page has no titles of players']
    }

    const { added, removed } = await storePlayerList(db, titles, now)

    return added === 0 && removed === 0
      ? []
      : [`Player list: ${titles.length} titles read, ${added} new, ${removed} gone`]
  } catch (error) {
    return [`Player list: not read, ${printable(error instanceof Error ? error.message : String(error))}`]
  }
}

/**
 * The titles of the players of the list, in the order of the page: the first link of each
 * item of a list, without the links in a template (`{{NL-VLAG|15}}`). The text above the
 * first heading is no player. A title appears once.
 */
export function readPlayerList(text: string): string[] {
  const titles = new Set<string>()
  const start = /^==/mu.exec(text)?.index ?? text.length

  for (const line of text.slice(start).split('\n')) {
    // The first item of a block of columns follows its template (`inhoud=* …`).
    if (!/^(?:\{\{[^*]*)?\*/u.test(line)) {
      continue
    }

    const title = linkedPage(line.replace(/\{\{[^{}]*\}\}/gu, ''))

    if (title !== null) {
      titles.add(title)
    }
  }

  return [...titles]
}
