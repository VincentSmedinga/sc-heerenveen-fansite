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
