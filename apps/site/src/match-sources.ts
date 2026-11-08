import type { PublicMatch } from '@fansite/db/queries'

/**
 * Where the matches on a page or a card come from: Wikipedia, the archive of the old fansite
 * (1990 to 2007), or both. The credit names exactly these (principle 4 of the Redactie).
 */
export type MatchSource = 'archive' | 'both' | 'wikipedia'

/**
 * The source of the matches given. A list without a match is `wikipedia`, which is what a page
 * shows before it has anything, and what the pages showed before there was an archive.
 */
export function sourceOf(matches: readonly Pick<PublicMatch, 'dataSource'>[]): MatchSource {
  const archive = matches.some((match) => match.dataSource === 'oude-fansite')
  const wikipedia = matches.some((match) => match.dataSource === 'wikipedia')

  return archive ? (wikipedia ? 'both' : 'archive') : 'wikipedia'
}

/**
 * The source of the page of a season: that of its matches, and Wikipedia as well when the page
 * has pages of Wikipedia (`pages`), such as for the table. A season that is not found is
 * Wikipedia, which is what the pages said before there was an archive.
 */
export const seasonSourceOf = (
  data: undefined | { matches: readonly Pick<PublicMatch, 'dataSource'>[]; pages: readonly unknown[] },
): MatchSource => {
  const source = data === undefined ? 'wikipedia' : sourceOf(data.matches)

  return source === 'archive' && data !== undefined && data.pages.length > 0 ? 'both' : source
}

/** The source as a sentence names it, such as in the description of a page. */
export const sourceName = (source: MatchSource) =>
  source === 'archive'
    ? 'het archief van de oude sc Heerenveen Fansite'
    : source === 'both'
      ? 'de Nederlandse Wikipedia en het archief van de oude sc Heerenveen Fansite'
      : 'de Nederlandse Wikipedia'
