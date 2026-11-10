import type { Database } from '@fansite/db/client'

import { type PlayerListEntry, playerListReadAt, storePlayerList } from '@fansite/db/persons'
import { isCountryCode } from '@fansite/shared/countries'

import type { Fetcher } from './fetcher.ts'

import { linkedPage, pageUrl } from './read-wikipedia.ts'
import { printable } from './text.ts'

/** The page of the Dutch Wikipedia with the players of sc Heerenveen, of all times. */
export const playerListTitle = 'Lijst van spelers van sc Heerenveen (mannen)'

/** How long a read stays good, in milliseconds: the list changes slowly. */
export const playerListMaxAge = 24 * 60 * 60 * 1000

/** What `readPlayerList` finds on the page. */
export type PlayerListRead = {
  /** The titles in the order of the page, each once, with the country of the first flag. */
  entries: PlayerListEntry[]
  /** The titles whose first flag is no country we know, with the name of the template. */
  unknownFlags: { flag: string; title: string }[]
}

/**
 * Reads the list of players once, with the fetcher and the rules of the other readers, and
 * keeps its titles (`storePlayerList`), each with the country of its first flag (#1052). It
 * is a check of names: it makes no player and changes no name. A flag that is no country we
 * know gives no country and a line with the title, never a guess. A read that is not a day
 * old is skipped. A page that can't be read, or has no titles, leaves what the database has
 * and gives a line that says why. Never throws.
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

    const { entries, unknownFlags } = readPlayerList(new TextDecoder('utf-8').decode(outcome.body))

    // A page that is a redirect or has changed its shape gives nothing: the old titles stay.
    if (entries.length === 0) {
      return ['Player list: not read, the page has no titles of players']
    }

    const { added, removed } = await storePlayerList(db, entries, now)
    const countries = entries.filter((entry) => entry.country !== null).length

    return [
      ...(added === 0 && removed === 0
        ? []
        : [`Player list: ${entries.length} titles read (${countries} with a country), ${added} new, ${removed} gone`]),
      ...(unknownFlags.length === 0
        ? []
        : [
            `Player list: ${unknownFlags.length} ${unknownFlags.length === 1 ? 'title has' : 'titles have'} a first flag that is no country we know, so no country is kept: ${printable(unknownFlags.map(({ flag, title }) => `${title} (${flag})`).join(', '))}`,
          ]),
    ]
  } catch (error) {
    return [`Player list: not read, ${printable(error instanceof Error ? error.message : String(error))}`]
  }
}

/**
 * The titles of the players of the list, in the order of the page: the first link of each
 * item of a list, without the links in a template (`{{NL-VLAG|15}}`). The text above the
 * first heading is no player. A title appears once.
 *
 * The country of a title is the code of its first flag: the first template on the line whose
 * name ends in `-VLAG` (`{{CW-VLAG|15}}{{NL-VLAG|15}}` is `CW`). A second flag never counts.
 * A first flag that is not a code of `countryCodes` (`{{YU-VLAG|15}}`, `{{EN-VLAG|15}}`) gives
 * no country and is in `unknownFlags`; a line without a flag gives no country and no warning.
 */
export function readPlayerList(text: string): PlayerListRead {
  const entries = new Map<string, null | string>()
  const unknownFlags: { flag: string; title: string }[] = []
  const start = /^==/mu.exec(text)?.index ?? text.length

  for (const line of text.slice(start).split('\n')) {
    // The first item of a block of columns follows its template (`inhoud=* …`).
    const item = /^(?:\{\{[^*]*)?\*/u.exec(line)

    if (item === null) {
      continue
    }

    const rest = line.slice(item[0].length)
    const title = linkedPage(rest.replace(/\{\{[^{}]*\}\}/gu, ''))

    if (title === null || entries.has(title)) {
      continue
    }

    const flag = /\{\{\s*([^{}|]*?-VLAG)\s*(?:\|[^{}]*)?\}\}/iu.exec(rest)?.[1]
    const code = flag?.replace(/-VLAG$/iu, '').toUpperCase()

    if (flag !== undefined && (code === undefined || !isCountryCode(code))) {
      unknownFlags.push({ flag: flag.slice(0, 40), title })
    }
    entries.set(title, code !== undefined && isCountryCode(code) ? code : null)
  }

  return { entries: [...entries].map(([title, country]) => ({ country, title })), unknownFlags }
}
